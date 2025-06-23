import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { X, Edit } from "lucide-react";
import TableData from "../components/TableData";
import axiosInstance from "../axiosInstance";
import UpdateDynamicForm from "./UpdateDynamicForm";
import Pagination from "./Pagination";
import useAuthStore from "../store/authStore";

const sampleRisks = [
  {
    id: "R-101",
    caseName: "Login Timeout Issue",
    type: "Issue",
    createdBy: "Alex",
    creationDate: "2025-06-01",
    owner: "Taylor",
    severity: "High",
    status: "Open",
  },
  {
    id: "R-102",
    caseName: "Payment Gateway Delay",
    type: "Risk",
    createdBy: "Jordan",
    creationDate: "2025-06-05",
    owner: "Morgan",
    severity: "Medium",
    status: "Closed",
  },
];

const columnSetting = [
  { columnName: "Case Name", dbColumn: "name", isVisible: true, isInput: false, type: "text" },
  { columnName: "Type", dbColumn: "type", isVisible: true, isInput: false },
  { columnName: "Creation Date", dbColumn: "created_date", isVisible: true, isInput: false },
  { columnName: "Due Date", dbColumn: "due_date", isVisible: true, isInput: false },
  { columnName: "Status", dbColumn: "status", isVisible: true, isInput: false },
  { columnName: "Response Plan", dbColumn: "comments", isVisible: true, isInput: false },
]

const AddRiskModal = ({ onClose, deliverables , projectName, projectPhases ,addRisk }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: {
      riskName: "",
      deliverableId: "",
      projectId: "",
      phaseName: "",
      responsePlan: "",
    },
  });
  const [linkToProject, setLinkToProject] = useState(false);
  const [projects, setProjects] = useState([]);

  // Placeholder: Fetch projects. Replace with your actual data fetching logic.
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Example: const response = await axiosInstance.get("/projects");
        // setProjects(response.data.result || []);
        setProjects([
          { id: "proj-1", name: "Project Alpha" },
          { id: "proj-2", name: "Project Beta" },
          { id: "proj-3", name: "Project Gamma" },
        ]);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
    fetchProjects();
  }, []);

  const onSubmitRisk = (data) => {
    console.log("Form data before processing:", data);
    const submissionData = { ...data };
    if (linkToProject) {
      delete submissionData.deliverableId;
    } else {
      delete submissionData.projectId;
    }
    console.log("Processed form data for submission:", submissionData);
    addRisk(submissionData);
    // onSaveRisk(submissionData); // Call your actual save function
    onClose();
  };

  const handleToggleChange = () => {
    const newLinkToProject = !linkToProject;
    setLinkToProject(newLinkToProject);
    if (newLinkToProject) {
      setValue("deliverableId", "");
    } else {
      setValue("projectId", "");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6 relative shadow-lg">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-semibold mb-4">Add Risk</h2>

        <form onSubmit={handleSubmit(onSubmitRisk)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Risk Name</label>
            <input
              type="text"
              {...register("riskName", { required: "Risk name is required" })}
              className="w-full border rounded px-3 py-2 text-sm bg-gray-50"
              placeholder="Enter risk name"
            />
            {errors.riskName && (
              <p className="text-red-500 text-xs mt-1">{errors.riskName.message}</p>
            )}
          </div>

          <div className="my-4">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={linkToProject}
                onChange={handleToggleChange}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
              <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                {linkToProject ? "Link to Project" : "Link to Deliverable"}
              </span>
            </label>
          </div>

          {!linkToProject ? (
            <div>
              <label className="block text-sm font-medium mb-1">Deliverable name</label>
              <select
                {...register("deliverableId", {
                  required: !linkToProject ? "Deliverable is required" : false,
                })}
                className="w-full border rounded px-3 py-2 text-sm bg-gray-50"
              >
                <option value="">Select Deliverable</option>
                {deliverables &&
                  deliverables.map((deliverable) => (
                    <option key={deliverable.id} value={deliverable.id}>
                      {deliverable.name}
                    </option>
                  ))}
              </select>
              {errors.deliverableId && (
                <p className="text-red-500 text-xs mt-1">{errors.deliverableId.message}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">
                Project name
              </label>
              <select
                {...register("projectId", {
                  required: linkToProject ? "Project is required" : false,
                })}
                className="w-full border rounded px-3 py-2 text-sm bg-gray-50"
                value={projectName}
              >
                <option value={projectName} selected>{projectName}</option>
                {/* {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))} */}
              </select>
              {errors.projectId && (
                <p className="text-red-500 text-xs mt-1">{errors.projectId.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Phase name</label>
            <select
              {...register("phaseName", { required: "Phase name is required" })}
              className="w-full border rounded px-3 py-2 text-sm bg-gray-50"
              defaultValue=""
            >
              <option value="" disabled>Select Phase</option>
              <option value="1">Planning</option>
              <option value="2">Bidding</option>
              <option value="3">Pre-execution</option>
              <option value="4">Execution</option>
            </select>
            {errors.phaseName && (
              <p className="text-red-500 text-xs mt-1">{errors.phaseName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Response Plan</label>
            <textarea
              {...register("responsePlan", { required: "Response plan is required" })}
              className="w-full border rounded px-3 py-2 text-sm bg-gray-50"
              rows={3}
              placeholder="Enter response plan"
            />
            {errors.responsePlan && (
              <p className="text-red-500 text-xs mt-1">{errors.responsePlan.message}</p>
            )}
          </div>

          <div className="flex justify-start gap-4 mt-6">
            <button
              type="button"
              className="bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium px-6 py-2 rounded"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-6 py-2 rounded"
            >
              Save Risk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RisksAndIssuesTable = ({ risks, onEdit, onAdd, isLoading, projectName, deliverables, addRisk, projectId }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [tableData, setTableData] = useState(sampleRisks); // Should probably use the `risks` prop or fetch
  const [projectPhases, setProjectPhases] = useState([]); // If phases need to be managed internally
  const [pagination , setPagination] = useState([]);
  const { isMeetingPage } = useAuthStore();
  let page = 1 ;
  let limit = 5;
  let sortType = "due_date";
  let sortOrder = "ASC";
  
  // Note: The `projectId` used in the useEffect below is not defined in this component's scope.
  // It should likely be passed as a prop if it's different from `projectName`.
  // Also, `setProjectPhases` is called, but `projectPhases` is a prop. This might be an issue.
  // Hardcoded project phases for now
  const hardcodedPhases = [
    { id: 'planning', name: 'Planning' },
    { id: 'bidding', name: 'Bidding' },
    { id: 'pre-execution', name: 'Pre-execution' },
    { id: 'execution', name: 'Execution' },
  ];

  const fetchRiskAndIssues = async (id) => {
    if (!id) return; // Add a guard clause to prevent calling with undefined id
    const response =await  axiosInstance.get(`/project-card/risk?projectid=${id}&page=${page}&limit=${limit}&sortType=${sortType}&sortOrder=${sortOrder}`);
    console.log("risks and issues");
    console.log(response);
    setTableData(response.data.result);
    setPagination(response.data.pagination);
  }

  const reFetchRiskAndIssues = async (NavigatePage) =>{
    page =NavigatePage;
    fetchRiskAndIssues(projectId);
  }

  useEffect(()=>{
    if (projectId) { // Add a check to ensure projectId is defined
      fetchRiskAndIssues(projectId);

    }
  },[projectId]);


  // Renamed this function from addRisk to handleRiskSubmission to avoid conflict with addRisk prop
  const handleRiskSubmission = async (data) => {
    console.log("form data is ");
    console.log(data);
    let linkedToType = "";
    let linkedToId = "";
    
    if (data.hasOwnProperty("deliverableId") && data.deliverableId) {
      linkedToType = 'deliverable';
      linkedToId = data.deliverableId;
    } else if (data.hasOwnProperty("projectId") && data.projectId) {
      linkedToType = 'project';
      linkedToId = projectId;
    } else {
      // Handle cases where neither is available if necessary, or ensure one is always present
      console.error("Risk must be linked to either a deliverable or a project.");
      return; // Or throw an error
    }

    const payload = {
      riskName: data.riskName,
      comments: data.responsePlan,
      phaseId: data.phaseName, // Ensure this phaseId is valid
      linkedToType,
      linkedToId,
      // status: data.status || 'Open', // Example: Default status if not provided
      // severity: data.severity || 'Medium', // Example: Default severity
      // createdBy: 'currentUserId', // Example: Add user info
      // creationDate: new Date().toISOString().split('T')[0], // Example: Add creation date
      // owner: data.owner || 'defaultOwner' // Example: Add owner
    };

    try {
      const response = await axiosInstance.post("/project-card/risk", payload);
      console.log(response); // Corrected from console.log(Response)
      // Optionally, refresh the risks list here or call a prop function to do so
      // e.g., if `addRisk` prop was meant to refresh/notify parent: addRisk(response.data.result);
      // Or, if you have a local fetch function: fetchRiskAndIssues(projectId); (ensure projectId is available)
      setTableData((e)=>{
        return [...e , ...response.data.result];
      })

      
    } catch (error) {
      console.error("Error adding risk:", error.response?.data || error.message);
    }
  };

  const sortTableData = (column, order) => {
    sortType = column;
    sortOrder = order;
    console.log(sortType+"--"+sortOrder);
    fetchRiskAndIssues(projectId);
  };

  const getData = async () => {
    return sampleRisks;
  };

  // Handler for opening the edit modal with selected risk
  const handleEdit = (risk) => {
    setSelectedRisk(risk);
    setShowEditModal(true);
  };
  // Handler for updating a risk (submit from UpdateDynamicForm)
  const handleUpdateRisk = (updatedData) => {
    // Implement your update logic here (API call, state update, etc.)
    console.log("Updated risk data:", updatedData);
    setShowEditModal(false);
    setSelectedRisk(null);
    // Optionally update tableData or refetch
    // fetchRiskAndIssues(projectId);
  };

  return (
    <div>
      {!isMeetingPage && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
          >
            + Add Risk
          </button>
        </div>
      )}

      <TableData
        getData={null} // or your fetch function
        tableData={tableData}
        tableName="risks"
        setTableData={setTableData}
        showDate={false}
        showActionButtons={!isMeetingPage}
        sortTableData={sortTableData}
        columnSetting={columnSetting}
        onEdit={handleEdit}
      />
      {isAddModalOpen && (
        <AddRiskModal
          onClose={() => setIsAddModalOpen(false)}
          deliverables={deliverables}
          projectName={projectName}
          projectPhases={projectPhases}
          addRisk={handleRiskSubmission}
        />
      )}      {showEditModal && selectedRisk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 relative shadow-lg">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              onClick={() => setShowEditModal(false)}
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-semibold mb-4">Edit Risk</h2>
            {/* <UpdateDynamicForm
              title=""
              onSubmit={handleUpdateRisk}
              isEmbedded={true}
              data={selectedRisk}
              tableName="risks"
            /> */}
          </div>
        </div>
      )}
      <Pagination pagination={pagination} getPageData={reFetchRiskAndIssues} />
    </div>
    
  );
};

export default RisksAndIssuesTable;