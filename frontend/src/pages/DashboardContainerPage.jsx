import React, { useState, useEffect } from "react";
import TopHeader from "../components/TopHeader";
import SidebarPage from "./SidebarPage";
import ProjectCards from "../components/ProjectCards";
import DashboardPage from "./DashboardPage";
import Accordion from "../components/Accordion";
import ProjectTiles from "../components/ProjectTiles";
import ProjectSelectCard from "../components/ProjectSelectCard";
import useAuthStore from "../store/authStore";
import axiosInstance from "../axiosInstance";

const DashboardContainerPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("projectCards");
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { userId,role } = useAuthStore();
  console.log("User ID from auth store dashboard:", userId);
  const toggleSidebar = () => setIsSidebarOpen((open) => !open);

  // Fetch projects based on logged-in user ID
  useEffect(() => {
    const fetchProjects = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log("Fetching projects for userId:", userId, "role:", role);
        const response = await axiosInstance.get(`/project-card/projects/${userId}?role=${role}`);
        
        console.log("Raw API response:", response.data);
        
        if (response.data && response.data.status === "success") {
          const projects = response.data.result || [];
          console.log("Projects received:", projects);
          
          // Debug each project's deliverable data
          projects.forEach((project, index) => {
            console.log(`Project ${index + 1} (${project.name || 'Unnamed'}):`, {
              completedDeliverables: project.completedDeliverables,
              totalDeliverables: project.totalDeliverables,
              progress: project.progress,
              health: project.health,
              allFields: Object.keys(project)
            });
          });
          
          setProjects(projects);
          setError(null);
        } else {
          setError("Failed to load projects");
          setProjects([]);
        }
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError(err.response?.data?.message || "Failed to load projects");
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [userId]);

  const tabs = [
    { id: "projectCards", label: "Project Cards" },
    { id: "dashboard", label: "Dashboard" },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-black">
      <TopHeader />
      <div className="flex flex-1 overflow-hidden relative">
        <SidebarPage
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-auto p-4">          <Accordion title="Dashboard" defaultOpen={true} className="mb-4">
            {/* Project Select Cards - global to accordion */}
            {!selectedProject && (
              <div className="p-6">
                {loading && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading projects...</p>
                  </div>
                )}
                {error && (
                  <div className="text-center py-8">
                    <p className="text-red-500">Error: {error}</p>
                  </div>
                )}
                {!loading && !error && projects.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No projects found.</p>
                  </div>
                )}
                {!loading && !error && projects.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {projects.map((project) => (
                      <ProjectSelectCard
                        key={project.id}
                        project={project}
                        onSelect={() => setSelectedProject(project)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Tab Navigation - Consistent with DataManagementTabs */}
            <div className="w-full max-w-8xl mx-auto">
              <div className="text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:text-gray-400 dark:border-gray-700">
                <ul className="flex items-center -mb-px">
                  {tabs.map((tab) => (
                    <li key={tab.id} className="me-2">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab(tab.id);
                        }}
                        className={`inline-block p-4 border-b-2 rounded-t-lg ${
                          activeTab === tab.id
                            ? "text-blue-600 border-blue-600 dark:text-blue-500 dark:border-blue-500"
                            : "border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300"
                        }`}
                        aria-current={activeTab === tab.id ? "page" : undefined}
                      >
                        {tab.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Tab Content */}
            <div>              {selectedProject && (
                <div className="mb-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold">{selectedProject.name || selectedProject.title}</h2>
                    <button
                      className="inline-flex items-center border border-indigo-300 px-3 py-1.5 rounded-md text-blue-600 hover:bg-blue-50 mb-4"
                      onClick={() => setSelectedProject(null)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="h-6 w-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M7 16l-4-4m0 0l4-4m-4 4h18"
                        />
                      </svg>
                      <span className="ml-1 font-bold text-lg">Back</span>
                    </button>
                  </div>
                </div>
              )}
              {selectedProject && activeTab === "projectCards" && (
                <>
                  <ProjectTiles project={selectedProject} projectId={selectedProject.id} />
                  <ProjectCards projectId={selectedProject.id} projectName={selectedProject.name} phaseName={selectedProject.phase_name} />
                </>
              )}
              {selectedProject && activeTab === "dashboard" && (
                <DashboardPage project={selectedProject} />
              )}
              {!selectedProject && (
                <div className="text-center text-gray-400 py-12 text-lg">
                  Select a project to view details.
                </div>
              )}
            </div>
          </Accordion>
        </main>
      </div>
    </div>
  );
};

export default DashboardContainerPage;
