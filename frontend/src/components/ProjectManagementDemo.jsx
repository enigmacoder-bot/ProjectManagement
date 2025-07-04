import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "../axiosInstance";
import TableData from "./TableData";
import ProjectModal from "./ProjectModal";

// Demo component to showcase the new project management workflow
const ProjectManagementDemo = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Column settings for the project table
  const columnSetting = [
    { columnName: "ID", dbColumn: "id", isVisible: true, width: 80 },
    { columnName: "Project Name", dbColumn: "name", isVisible: true, width: 200 },
    { columnName: "Type", dbColumn: "project_type_name", isVisible: true, width: 120 },
    { columnName: "Phase", dbColumn: "project_phase_name", isVisible: true, width: 150 },
    { columnName: "Budget", dbColumn: "project_budget", isVisible: true, width: 120 },
    { columnName: "Manager", dbColumn: "project_manager_name", isVisible: true, width: 150 },
    { columnName: "Start Date", dbColumn: "execution_start_date", isVisible: true, width: 120 },
    { columnName: "Status", dbColumn: "approval_status", isVisible: true, width: 120 },
  ];

  // Fetch projects data
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.post("/data-management/data", {
        tableName: "project",
        page: 1,
        limit: 10
      });

      if (response.data.status === "success") {
        setProjects(response.data.result);
      } else {
        toast.error("Failed to fetch projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchProjects();
  }, [refreshTrigger]);

  // Handle project creation
  const handleProjectAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowProjectModal(false);
    toast.success("Project created successfully! You can now manage documents and schedule plan from the project list.");
  };

  const handleDeleteProject = async (projectId) => {
    try {
      const response = await axiosInstance.post("/data-management/deleteproject", {
        id: projectId
      });

      if (response.data.status === "success") {
        toast.success("Project deleted successfully");
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error("Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
            <p className="text-gray-600 mt-1">
              Create projects and manage their documents and schedule plans separately
            </p>
          </div>
          <button
            onClick={() => setShowProjectModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Project
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">New Workflow:</h3>
          <ol className="list-decimal list-inside text-blue-800 space-y-1">
            <li>Click "Add Project" to create a new project (documents and schedule plan sections removed)</li>
            <li>After creating a project, use the action buttons in the project list:</li>
            <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
              <li><span className="inline-flex items-center"><span className="w-4 h-4 bg-green-500 rounded mr-2"></span></span> <strong>Green Document Icon:</strong> Manage project documents</li>
              <li><span className="inline-flex items-center"><span className="w-4 h-4 bg-purple-500 rounded mr-2"></span></span> <strong>Purple Calendar Icon:</strong> Manage schedule plan</li>
            </ul>
          </ol>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Projects</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading projects...</p>
          </div>
        ) : (
          <TableData
            tableData={projects}
            tableName="project"
            setTableData={setProjects}
            showDate={false}
            columnSetting={columnSetting}
            showActionButtons={true}
            sortTableData={() => {}} // Placeholder
            getData={fetchProjects}
          />
        )}
      </div>

      {/* Project Creation Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/50 z-50">
          <div className="relative">
            <ProjectModal
              onClose={() => setShowProjectModal(false)}
              onProjectAdded={handleProjectAdded}
              title="Create New Project"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagementDemo;
