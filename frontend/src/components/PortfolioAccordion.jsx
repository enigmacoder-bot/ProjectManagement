import React, { useState, useEffect } from "react";
import axiosInstance from "../axiosInstance";
import UpdateDynamicForm from "./UpdateDynamicForm";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  FolderOpen,
  Archive,
  FileText,
  Loader,
} from "lucide-react";

function PortfolioAccordion({ data, title }) {
  const [portfolioData, setPortfolioData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    portfolio: true,
    programs: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const getRelatedRecords = async () => {
    if (!data?.id) {
      setError("No portfolio ID provided");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await axiosInstance.post(
        "/data-management/getPortfolioWithRelatedData",
        { portfolioId: data.id }
      );

      const fetchedData = result.data?.result;

      // Map projects to their respective programs
      const enrichedPrograms = fetchedData.programs.map((program) => ({
        ...program,
        projects: fetchedData.projects.filter(
          (project) => project.program_id === program.id
        ),
      }));

      console.log("Processed Data:", {
        programs: enrichedPrograms,
        projects: fetchedData.projects,
      });

      setPortfolioData({
        ...fetchedData,
        programs: enrichedPrograms,
      });

      // Initialize all programs as expanded
      const programStates = {};
      enrichedPrograms.forEach((program) => {
        programStates[program.id] = true;
      });

      setExpandedSections((prev) => ({
        ...prev,
        programs: programStates,
      }));
    } catch (e) {
      console.error("API Error:", e);
      setError(e.message || "Failed to load portfolio structure");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getRelatedRecords();
  }, [data?.id]);

  const toggleSection = (section, id = null) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: id
        ? {
            ...prev[section],
            [id]: !prev[section][id],
          }
        : !prev[section],
    }));
  };

  const renderProjects = (projects) => {
    if (!projects?.length)
      return (
        <div className="text-sm text-gray-500 dark:text-gray-400 ml-4">
          No projects found
        </div>
      );

    return projects.map((project) => (
      <div
        key={project.id}
        className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1 ml-4"
      >
        <FileText
          className="mr-2 text-green-600 dark:text-green-400"
          size={16}
        />
        {project.name || `Project ${project.id}`}
        <span className="text-xs ml-2 text-gray-400">
          (Program ID: {project.program_id})
        </span>
      </div>
    ));
  };

  const renderPrograms = () => {
    if (!portfolioData?.programs?.length)
      return (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No programs found in this portfolio
        </div>
      );

    return portfolioData.programs.map((program) => (
      <div key={program.id} className="mb-2">
        <div
          className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 cursor-pointer rounded-md"
          onClick={() => toggleSection("programs", program.id)}
        >
          {expandedSections.programs[program.id] ? (
            <ChevronDown size={18} className="dark:text-gray-200" />
          ) : (
            <ChevronRight size={18} className="dark:text-gray-200" />
          )}
          <Archive
            className="ml-2 text-purple-600 dark:text-purple-400"
            size={18}
          />
          <h4 className="font-medium ml-2 dark:text-gray-200">
            {program.name || `Program ${program.id}`}
            <span className="text-sm ml-2 text-gray-400">
              ({program.projects?.length || 0} projects)
            </span>
          </h4>
        </div>

        {expandedSections.programs[program.id] && (
          <div className="ml-6 mt-2">
            <h5 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
              Projects
            </h5>
            {renderProjects(program.projects)}
          </div>
        )}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader className="animate-spin mr-2" size={24} />
        <span>Loading portfolio structure...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        <p>Error: {error}</p>
        <button
          onClick={getRelatedRecords}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  if (!portfolioData) {
    return (
      <div className="text-center py-4">
        No portfolio data available. Try refreshing the page.
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Initiative Section */}
      {portfolioData.initiative && (
        <div className="border-b dark:border-gray-700">
          <div className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/30">
            <Layers
              className="mr-2 text-blue-600 dark:text-blue-400"
              size={20}
            />
            <h2 className="text-lg font-semibold dark:text-gray-200">
              Initiative:{" "}
              {portfolioData.initiative.name ||
                `ID: ${portfolioData.initiative.id}`}
            </h2>
          </div>
        </div>
      )}

      {/* Portfolio Section */}
      <div className="border-b dark:border-gray-700">
        <div
          className="flex items-center p-4 bg-amber-50 dark:bg-amber-900/30 cursor-pointer"
          onClick={() => toggleSection("portfolio")}
        >
          {expandedSections.portfolio ? (
            <ChevronDown size={20} className="dark:text-gray-200" />
          ) : (
            <ChevronRight size={20} className="dark:text-gray-200" />
          )}
          <FolderOpen
            className="ml-2 text-amber-600 dark:text-amber-400"
            size={20}
          />
          <h2 className="text-lg font-semibold ml-2 dark:text-gray-200">
            {title ||
              `Portfolio: ${
                portfolioData.portfolio.name ||
                `ID: ${portfolioData.portfolio.id}`
              }`}
          </h2>
        </div>

        {expandedSections.portfolio && (
          <div className="p-4">
            <UpdateDynamicForm
              isEmbedded={true}
              title=""
              tableName="portfolio"
              data={portfolioData.portfolio}
              viewData={true}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Programs Section */}
      <div className="ml-6 p-4">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Programs ({portfolioData.programs?.length || 0})
        </h3>
        {renderPrograms()}
      </div>
    </div>
  );
}

export default PortfolioAccordion;
