import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { X, ChevronDown, ChevronUp, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import useAuthStore from "../store/authStore";
import axiosInstance from "../axiosInstance";
import ProjectDocumentsModal from "./ProjectDocumentsModal";
import ProjectSchedulePlanModal from "./ProjectSchedulePlanModal";

const UpdateProjectModal = ({
  onClose,
  projectData,
  onUpdate,
  showButtons = true,
  title = "Update Project",
  readOnly = false,
}) => {
  const [activeSection, setActiveSection] = useState("all");
  const [departments, setDepartments] = useState([]);
  // const [initiatives, setInitiatives] = useState([]); // No longer needed - Portfolio/Initiative are readonly
  // const [portfolios, setPortfolios] = useState([]); // No longer needed - Portfolio/Initiative are readonly
  const [programs, setPrograms] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [selectedProgramDetails, setSelectedProgramDetails] = useState(null);
  // State for document and schedule modals
  const [isProjectDocumentsModalOpen, setIsProjectDocumentsModalOpen] =
    useState(false);
  const [isProjectSchedulePlanModalOpen, setIsProjectSchedulePlanModalOpen] =
    useState(false);
  // Add placeholder states/functions to satisfy legacy schedule reset logic
  const [scheduleTableData, setScheduleTableData] = useState([]);
  const [internalScheduleDataState, setInternalScheduleDataState] = useState([]);
  const internalScheduleData = [];
  // Add states for upload tracking
  const [documentsUploadedSuccessfully, setDocumentsUploadedSuccessfully] = useState(
    projectData?.project_documents_uploaded === true
  );
  const [scheduleUploadedSuccessfully, setScheduleUploadedSuccessfully] = useState(
    projectData?.project_schedule_uploaded === true
  );
  
  // State to track document template existence for approval requirements
  const [hasDocumentTemplates, setHasDocumentTemplates] = useState(true); // Default to true to avoid hiding documents initially
  
  // Debug initial upload state
  console.log("🏁 Initial upload state:", {
    projectData_documents: projectData?.project_documents_uploaded,
    projectData_schedule: projectData?.project_schedule_uploaded,
    documentsUploadedSuccessfully: projectData?.project_documents_uploaded === true,
    scheduleUploadedSuccessfully: projectData?.project_schedule_uploaded === true
  });
  // State to track approval task status
  const [approvalTaskExists, setApprovalTaskExists] = useState(false);
  const [approvalTaskInfo, setApprovalTaskInfo] = useState(null);
  // State to track if documents/schedule need refresh
  const [documentsRefreshTrigger, setDocumentsRefreshTrigger] = useState(0);
  const [scheduleRefreshTrigger, setScheduleRefreshTrigger] = useState(0);
  // State to track data loading status
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataLoadedFlags, setDataLoadedFlags] = useState({
    departments: false,
    objectives: false,
    programs: false,
    initiatives: false,
    portfolios: false,
    vendors: false
  });

  const { users, projectTypes, projectPhases, setDocuments, documents } =
    useAuthStore();

  // Helper function to parse PostgreSQL interval strings
  const parseExecutionDuration = useCallback((durationStr) => {
    if (!durationStr) return { duration: 4, type: 'weeks' };
    
    const str = String(durationStr).toLowerCase().trim();
    console.log("🔧 Parsing execution duration:", str);
    
    // Handle PostgreSQL interval formats like "21 days", "4 weeks", "00:01:10"
    if (str.includes('day')) {
      const match = str.match(/(\d+)\s*days?/);
      const days = match ? parseInt(match[1]) : 4;
      return { duration: days, type: 'days' };
    } else if (str.includes('week')) {
      const match = str.match(/(\d+)\s*weeks?/);
      const weeks = match ? parseInt(match[1]) : 4;
      return { duration: weeks, type: 'weeks' };
    } else if (str.includes('month')) {
      const match = str.match(/(\d+)\s*months?/);
      const months = match ? parseInt(match[1]) : 4;
      return { duration: months, type: 'months' };
    } else if (str.includes(':')) {
      // Handle time format like "00:01:10" - convert to days (this seems like bad data)
      console.warn("⚠️ Found time interval format, converting to default:", str);
      return { duration: 4, type: 'weeks' };
    } else {
      // Try to parse as "number type" format like "4 weeks"
      const parts = str.split(' ');
      if (parts.length >= 2) {
        const duration = parseInt(parts[0]) || 4;
        const type = parts[1].toLowerCase();
        if (type.includes('day')) return { duration, type: 'days' };
        if (type.includes('week')) return { duration, type: 'weeks' };
        if (type.includes('month')) return { duration, type: 'months' };
      }
      
      // Fallback: try to parse as just a number
      const numericValue = parseInt(str);
      if (!isNaN(numericValue)) {
        return { duration: numericValue, type: 'weeks' };
      }
    }
    
    // Ultimate fallback
    console.warn("⚠️ Could not parse execution duration, using default:", str);
    return { duration: 4, type: 'weeks' };
  }, []);

  // Helper function to get form default values
  const getFormDefaultValues = useCallback((data) => {
    console.log("🔧 Creating form default values from:", data);
    
    if (!data) {
      console.log("⚠️ No data provided, using empty defaults");
      return {
        id: "",
        name: "",
        arabic_name: "",
        description: "",
        project_type_id: "",
        current_phase_id: "",
        initiative_id: "",
        portfolio_id: "",
        program_id: "",
        category: "",
        project_manager_id: "",
        alternative_project_manager_id: "",
        vendor_id: "",
        beneficiaryDepartments: [],
        objectives: [],
        project_budget: "",
        approved_budget: "",
        execution_start_date: {
          startDate: null,
          endDate: null,
        },
        execution_duration: 4,
        maintenance_duration: 30,
        internal_start_date: {
          startDate: null,
          endDate: null,
        },
      };
    }

    // Process execution duration using the new parser
    const { duration: executionDuration } = parseExecutionDuration(data.execution_duration);

    // Process maintenance duration
    let maintenanceDuration = 30;
    if (data.maintenance_duration) {
      maintenanceDuration = parseInt(String(data.maintenance_duration)) || 30;
    }

    // Process dates safely
    const executionStartDate = data.execution_start_date 
      ? new Date(data.execution_start_date) 
      : null;
    const internalStartDate = data.internal_start_date 
      ? new Date(data.internal_start_date) 
      : null;

    const formValues = {
      id: data.id || "",
      name: data.name || "",
      arabic_name: data.arabic_name || "",
      description: data.description || "",
      project_type_id: data.project_type_id?.toString() || "",
      current_phase_id: data.current_phase_id?.toString() || "",
      initiative_id: data.initiative_id?.toString() || "",
      portfolio_id: data.portfolio_id?.toString() || "",
      program_id: data.program_id?.toString() || "",
      category: data.category || "",
      project_manager_id: data.project_manager_id?.toString() || "",
      alternative_project_manager_id: data.alternative_project_manager_id?.toString() || "",
      vendor_id: data.vendor_id?.toString() || "",
      beneficiaryDepartments: [],
      objectives: [],
      project_budget: data.project_budget?.toString() || "",
      approved_budget: data.approved_project_budget?.toString() || "",
      execution_start_date: {
        startDate: executionStartDate,
        endDate: executionStartDate,
      },
      execution_duration: executionDuration,
      maintenance_duration: maintenanceDuration,
      internal_start_date: {
        startDate: internalStartDate,
        endDate: internalStartDate,
      },
    };

    console.log("✅ Form default values created:", formValues);
    return formValues;
  }, [parseExecutionDuration]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: getFormDefaultValues(projectData),
  });

  // Reset form when projectData changes
  useEffect(() => {
    if (projectData) {
      console.log("🔄 Resetting form with projectData:", projectData);
      const formData = getFormDefaultValues(projectData);
      reset(formData);
      
      // Sync upload status with projectData changes
      console.log("🔄 Syncing upload status with projectData:", {
        project_documents_uploaded: projectData.project_documents_uploaded,
        project_schedule_uploaded: projectData.project_schedule_uploaded
      });
      
      setDocumentsUploadedSuccessfully(projectData.project_documents_uploaded === true);
      setScheduleUploadedSuccessfully(projectData.project_schedule_uploaded === true);
    }
  }, [projectData, reset, getFormDefaultValues]);

  // Debug effect to track form values
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name && type === 'change') {
        console.log(`📝 Form field changed: ${name} =`, value[name]);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Additional debug effect to log all form values when they change
  useEffect(() => {
    if (projectData?.id) {
      const currentValues = watch();
      console.log("📊 Current form values:", currentValues);
    }
  }, [projectData?.id, watch]);

  const projectType = watch("project_type_id");
  const currentPhase = watch("current_phase_id");
  const selectedProgramId = watch("program_id");

  const projectManagers = useMemo(() => {
    return users.filter((user) => user.role_name === "PM");
  }, [users]);

  // Add filtered project phases similar to ProjectModal
  const filteredProjectPhases = useMemo(() => {
    if (!projectType || !projectPhases.length) return projectPhases;

    // Find the project type name from the ID - standardize comparison
    const selectedProjectType = projectTypes.find(
      (type) => type.id.toString() === projectType?.toString()
    );

    // If it's "Internal Project" or "Proof of Concept", filter phases
    if (
      selectedProjectType &&
      ["Internal Project", "Proof of Concept"].includes(
        selectedProjectType.name
      )
    ) {
      return projectPhases.filter((phase) =>
        ["Planning", "Execution", "Closed"].includes(phase.name)
      );
    }

    // Otherwise, return all phases
    return projectPhases;
  }, [projectType, projectPhases, projectTypes]);

  const isVendorDisabled = useMemo(() => {
    const restrictedTypes = ["Internal Project", "Proof of Concept"];
    const currentType = projectTypes.find(
      (type) => type.id.toString() === projectType?.toString()
    );
    const isInPlanningBiddingPhase = ["1", "2"].includes(currentPhase);
    return restrictedTypes.includes(currentType?.name || "") || isInPlanningBiddingPhase;
  }, [projectType, projectTypes, currentPhase]);

  const isBudgetDisabled = useMemo(() => {
    const restrictedTypes = ["Internal Project", "Proof of Concept"];
    const currentType = projectTypes.find(
      (type) => type.id.toString() === projectType?.toString()
    );
    return restrictedTypes.includes(currentType?.name || "");
  }, [projectType, projectTypes]);

  const isApprovedBudgetDisabled = useMemo(() => {
    const restrictedTypes = ["Internal Project", "Proof of Concept"];
    const currentType = projectTypes.find(
      (type) => type.id.toString() === projectType?.toString()
    );
    
    // Check if project type is restricted (Internal Project or Proof of Concept)
    const isRestrictedType = restrictedTypes.includes(currentType?.name || "");
    
    // Check if current phase is Planning or Bidding
    const currentPhaseObj = projectPhases.find(
      (phase) => phase.id.toString() === currentPhase?.toString()
    );
    const isPlanningOrBiddingPhase = ["Planning", "Bidding"].includes(currentPhaseObj?.name || "");
    
    return isRestrictedType || isPlanningOrBiddingPhase;
  }, [projectType, projectTypes, currentPhase, projectPhases]);

  const isCategoryDisabled = useMemo(() => {
    const restrictedTypes = ["Internal Project", "Proof of Concept"];
    const currentType = projectTypes.find(
      (type) => type.id.toString() === projectType?.toString()
    );
    return restrictedTypes.includes(currentType?.name || "");
  }, [projectType, projectTypes]);

  const isBudgetRequired = useMemo(() => {
    const currentType = projectTypes.find(
      (type) => type.id.toString() === projectType?.toString()
    );
    return !["Internal Project", "Proof of Concept"].includes(currentType?.name || "");
  }, [projectType, projectTypes]);

  // Helper function to determine if beneficiary departments are required
  const isBeneficiaryDepartmentRequired = useMemo(() => {
    const currentType = projectTypes.find(
      (type) => type.id.toString() === projectType?.toString()
    );
    return !["Internal Project", "Proof of Concept"].includes(currentType?.name || "");
  }, [projectType, projectTypes]);


  // Fetch departments and beneficiary departments
  useEffect(() => {
    const fetchDepartmentsAndBeneficiaries = async () => {
      if (!projectData?.id) return;
      
      try {
        console.log("🏢 Fetching departments and beneficiaries for project:", projectData.id);
        
        const [deptResponse, beneficiaryResponse] = await Promise.all([
          axiosInstance.post(`/data-management/getDepartments`),
          axiosInstance.post(`/data-management/getBeneficiaryDepartments`, { 
            projectId: projectData.id 
          })
        ]);

        if (deptResponse.data.status === "success") {
          const beneficiaryDeptIds = beneficiaryResponse.data.result || [];
          const fetchedDepartments = deptResponse.data.result.map((dept) => ({
            id: dept.id,
            name: dept.name,
            arabic_name: dept.arabic_name,
            checked: beneficiaryDeptIds.includes(dept.id),
          }));

          console.log("🏢 Setting departments:", fetchedDepartments);
          setDepartments(fetchedDepartments);
          
          const selectedDepartmentIds = fetchedDepartments
            .filter((dept) => dept.checked)
            .map((dept) => dept.id);
            
          setValue("beneficiaryDepartments", selectedDepartmentIds, { 
            shouldDirty: false,
            shouldValidate: false 
          });
          
          console.log("🏢 Set beneficiary departments:", selectedDepartmentIds);
          
          // Mark departments as loaded
          setDataLoadedFlags(prev => ({ ...prev, departments: true }));
        }
      } catch (error) {
        console.error("❌ Error fetching departments or beneficiaries:", error);
        toast.error("Failed to load departments or beneficiary data");
        setDataLoadedFlags(prev => ({ ...prev, departments: true })); // Mark as loaded even on error
      }
    };

    fetchDepartmentsAndBeneficiaries();
  }, [projectData?.id, setValue]);

  // Fetch other dropdown data - Initiatives and Portfolios no longer needed since they're readonly
  useEffect(() => {
    // Mark initiatives as loaded since we don't need to fetch them anymore
    setDataLoadedFlags(prev => ({ ...prev, initiatives: true }));
    // const fetchInitiatives = async () => {
    //   try {
    //     const response = await axiosInstance.post(`/data-management/getInitiatives`);
    //     if (response.data.status === "success") {
    //       setInitiatives(response.data.result);
    //     }
    //     setDataLoadedFlags(prev => ({ ...prev, initiatives: true }));
    //   } catch (error) {
    //     console.error("❌ Error fetching initiatives:", error);
    //     setDataLoadedFlags(prev => ({ ...prev, initiatives: true }));
    //   }
    // };
    // fetchInitiatives();
  }, []);

  useEffect(() => {
    // Mark portfolios as loaded since we don't need to fetch them anymore
    setDataLoadedFlags(prev => ({ ...prev, portfolios: true }));
    // const fetchPortfolios = async () => {
    //   try {
    //     const response = await axiosInstance.post(`/data-management/getPortfolios`);
    //     if (response.data.status === "success") {
    //       setPortfolios(response.data.result);
    //     }
    //     setDataLoadedFlags(prev => ({ ...prev, portfolios: true }));
    //   } catch (error) {
    //     console.error("❌ Error fetching portfolios:", error);
    //     setDataLoadedFlags(prev => ({ ...prev, portfolios: true }));
    //   }
    // };
    // fetchPortfolios();
  }, []);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await axiosInstance.post(`/data-management/getPrograms`);
        if (response.data.status === "success") {
          setPrograms(response.data.result);
        }
        setDataLoadedFlags(prev => ({ ...prev, programs: true }));
      } catch (error) {
        console.error("❌ Error fetching programs:", error);
        setDataLoadedFlags(prev => ({ ...prev, programs: true }));
      }
    };
    fetchPrograms();
  }, []);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await axiosInstance.post(`/data-management/getVendors`);
        if (response.data.status === "success") {
          setVendors(response.data.result);
        }
        setDataLoadedFlags(prev => ({ ...prev, vendors: true }));
      } catch (error) {
        console.error("❌ Error fetching vendors:", error);
        setDataLoadedFlags(prev => ({ ...prev, vendors: true }));
      }
    };
    fetchVendors();
  }, []);

  useEffect(() => {
    const fetchObjectives = async () => {
      if (!projectData?.id) return;
      
      try {
        console.log("🎯 Fetching objectives for project:", projectData.id);
        
        const [objectivesResponse, projectObjectivesResponse] = await Promise.all([
          axiosInstance.post(`/data-management/getObjectives`),
          axiosInstance.post(`/data-management/getProjectObjectives`, { 
            projectId: projectData.id 
          })
        ]);
        
        if (objectivesResponse.data.status === "success") {
          const projectObjectiveIds = projectObjectivesResponse.data.status === "success"
            ? projectObjectivesResponse.data.result.map((o) => o.id)
            : [];
            
          const fetchedObjectives = objectivesResponse.data.result.map((obj) => ({
            id: obj.id,
            text: obj.name,
            arabic_text: obj.arabic_name,
            checked: projectObjectiveIds.includes(obj.id),
          }));
          
          console.log("🎯 Setting objectives:", fetchedObjectives);
          setObjectives(fetchedObjectives);
          setValue("objectives", fetchedObjectives, { 
            shouldDirty: false,
            shouldValidate: false 
          });
          
          console.log("🎯 Set project objectives:", projectObjectiveIds);
        }
        
        setDataLoadedFlags(prev => ({ ...prev, objectives: true }));
      } catch (error) {
        console.error("❌ Error fetching objectives:", error);
        toast.error("Failed to load objectives");
        setDataLoadedFlags(prev => ({ ...prev, objectives: true }));
      }
    };
    
    fetchObjectives();
  }, [projectData?.id, setValue]);

  // Fetch program details
  const fetchProgramDetails = async (programId) => {
    if (!programId) {
      setSelectedProgramDetails(null);
      return;
    }
    try {
      console.log("📋 Fetching program details for ID:", programId);
      const response = await axiosInstance.post(
        "/data-management/getProgramDetails",
        { program_id: programId }
      );
      if (response.data.status === "success") {
        console.log("📋 Program details fetched:", response.data.result);
        setSelectedProgramDetails(response.data.result);
      }
    } catch (error) {
      console.error("❌ Error fetching program details:", error);
      toast.error("Failed to load program details");
    }
  };

  useEffect(() => {
    if (selectedProgramId) {
      fetchProgramDetails(selectedProgramId);
    }
  }, [selectedProgramId]);

  // Sync program details with form when they're loaded
  useEffect(() => {
    if (selectedProgramDetails) {
      console.log("📋 Syncing program details to form:", selectedProgramDetails);
      if (selectedProgramDetails.initiative_id) {
        setValue("initiative_id", selectedProgramDetails.initiative_id.toString(), {
          shouldDirty: false,
          shouldValidate: false
        });
      }
      if (selectedProgramDetails.portfolio_id) {
        setValue("portfolio_id", selectedProgramDetails.portfolio_id.toString(), {
          shouldDirty: false,
          shouldValidate: false
        });
      }
    }
  }, [selectedProgramDetails, setValue]);
  // Effect to check upload status and approval task status
  useEffect(() => {
    const checkUploadAndApprovalStatus = async () => {
      if (!projectData?.id) return;
      
      console.log("📡 Checking upload and approval status for project:", projectData.id);
      
      try {
        // Check upload status
        const uploadResponse = await axiosInstance.post('/data-management/getProject', {
          id: parseInt(projectData.id)
        });
        
        if (uploadResponse.data.status === 'success') {
          const project = uploadResponse.data.result;
          const docUploaded = project.project_documents_uploaded === true;
          const schedUploaded = project.project_schedule_uploaded === true;
          
          console.log("📊 Upload status from database:", {
            project_documents_uploaded: project.project_documents_uploaded,
            project_schedule_uploaded: project.project_schedule_uploaded,
            docUploadedBool: docUploaded,
            schedUploadedBool: schedUploaded
          });
          
          setDocumentsUploadedSuccessfully(docUploaded);
          setScheduleUploadedSuccessfully(schedUploaded);
        } else {
          console.error("❌ Failed to get project upload status:", uploadResponse.data);
          // Fallback: Check if the project data already has upload info
          if (projectData.project_documents_uploaded !== undefined) {
            console.log("📋 Using fallback upload status from projectData");
            setDocumentsUploadedSuccessfully(projectData.project_documents_uploaded === true);
            setScheduleUploadedSuccessfully(projectData.project_schedule_uploaded === true);
          }
        }

        // Check approval task status
        const taskResponse = await axiosInstance.post('/data-management/checkProjectApprovalTaskExists', {
          projectId: parseInt(projectData.id)
        });
        
        if (taskResponse.data.status === 'success') {
          console.log("✅ Approval task check result:", taskResponse.data.result);
          setApprovalTaskExists(taskResponse.data.result.exists);
          setApprovalTaskInfo(taskResponse.data.result.task);
        } else {
          console.error("❌ Failed to check approval task status:", taskResponse.data);
          // Default to no approval task if API fails
          setApprovalTaskExists(false);
          setApprovalTaskInfo(null);
        }
      } catch (error) {
        console.error("❌ Error checking upload and approval status:", error);
        
        // Fallback: Use projectData for upload status if API fails
        if (projectData?.project_documents_uploaded !== undefined) {
          console.log("📋 Using fallback upload status from projectData due to API error");
          setDocumentsUploadedSuccessfully(projectData.project_documents_uploaded === true);
          setScheduleUploadedSuccessfully(projectData.project_schedule_uploaded === true);
        }
        
        // Default to no approval task if check fails
        setApprovalTaskExists(false);
        setApprovalTaskInfo(null);
      }
    };
    
    checkUploadAndApprovalStatus();
  }, [projectData?.id, documentsRefreshTrigger, scheduleRefreshTrigger]);

  // Effect to check document template existence for conditional approval requirements
  useEffect(() => {
    const checkDocumentTemplates = async () => {
      if (!projectData?.current_phase_id || !projectData?.project_type_id) {
        console.log("⚠️ Missing phase or project type for template check");
        return;
      }

      try {
        console.log("🔍 Checking document templates existence for UI...");
        const templatesExist = await checkDocumentTemplatesExist(
          projectData.current_phase_id, 
          projectData.project_type_id
        );
        setHasDocumentTemplates(templatesExist);
        console.log("📋 Document templates check result for UI:", { templatesExist });
      } catch (error) {
        console.error("❌ Error checking document templates for UI:", error);
        // Default to true to avoid hiding document requirements on error
        setHasDocumentTemplates(true);
      }
    };

    checkDocumentTemplates();
  }, [projectData?.current_phase_id, projectData?.project_type_id]);

  const onSubmit = async (data, sendForApproval = false) => {
    console.log("🚀 onSubmit called with:", { 
      sendForApproval, 
      sendForApprovalType: typeof sendForApproval,
      sendForApprovalValue: sendForApproval,
      data: data.name 
    });
    
    try {
      const selectedDepartmentIds = departments
        .filter((dept) => dept.checked)
        .map((dept) => dept.id);
      
      // Only require beneficiary departments for non-Internal/non-PoC projects
      if (isBeneficiaryDepartmentRequired && selectedDepartmentIds.length === 0) {
        toast.error("At least one beneficiary department must be selected");
        return;
      }
      
      const selectedObjectiveIds = objectives
        .filter((obj) => obj.checked)
        .map((obj) => obj.id);
      if (selectedObjectiveIds.length === 0) {
        toast.error("At least one objective must be selected");
        return;
      }

      const updatedProjectData = {
        id: data.id,
        name: data.name,
        arabic_name: data.arabic_name,
        description: data.description,
        project_type_id: parseInt(data.project_type_id) || null,
        current_phase_id: parseInt(data.current_phase_id) || null,
        initiative_id: parseInt(data.initiative_id) || null,
        portfolio_id: parseInt(data.portfolio_id) || null,
        program_id: parseInt(data.program_id) || null,
        category: data.category,
        project_manager_id: parseInt(data.project_manager_id) || null,
        alternative_project_manager_id:
          parseInt(data.alternative_project_manager_id) || null,
        vendor_id: parseInt(data.vendor_id) || null,
        beneficiary_departments: selectedDepartmentIds,
        objectives: selectedObjectiveIds,
        project_budget: data.project_budget
          ? parseFloat(data.project_budget)
          : null,
        approved_project_budget: data.approved_budget
          ? parseFloat(data.approved_budget)
          : null,
        execution_start_date: data.execution_start_date?.startDate || null,
        execution_duration: data.execution_duration || null,
        maintenance_duration: data.maintenance_duration || null,
        approval_status: sendForApproval
          ? "Waiting on deputy"
          : projectData.approval_status,
      };

      const response = await axiosInstance.post(
        `/data-management/updateProject`,
        { id: projectData.id, data: updatedProjectData }
      );

      if (response.data.status === "success") {
        await axiosInstance.post(`/data-management/addBeneficiaryDepartments`, {
          projectId: projectData.id,
          departmentIds: selectedDepartmentIds,
        });

        await axiosInstance.post(`/data-management/updateProjectObjectives`, {
          id: projectData.id,
          objective_ids: selectedObjectiveIds,
        });

        toast.success(
          sendForApproval
            ? "Project saved and sent for approval successfully!"
            : "Project updated successfully!"
        );
        console.log("✅ Toast shown:", sendForApproval ? "approval" : "update");
        onUpdate(updatedProjectData);
        
        // Only close modal if sending for approval
        if (sendForApproval) {
          onClose();
        }
        return response;
      } else {
        throw new Error(response.data.message || "Failed to update project");
      }
    } catch (error) {
      console.error("Update error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      
      // Provide more specific error messages
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message || "Invalid request data";
        toast.error(`Update failed: ${errorMessage}`);
      } else if (error.response?.status === 500) {
        toast.error("Server error occurred while updating project");
      } else {
        toast.error(error.message || "Failed to update project");
      }
      
      throw error;
    }
  };

  const handleSaveAndSendForApproval = async (data) => {
    try {
      console.log("Starting save and send for approval process...");
      console.log("Project data:", projectData);
      console.log("Form data:", data);

      // Check if approval task already exists
      if (approvalTaskExists) {
        toast.error("Project has already been sent for approval and is pending review.");
        return;
      }

      // First check if documents and schedule plan are uploaded
      const isValidForApproval = await checkProjectReadyForApproval();
      if (!isValidForApproval) {
        console.log("Project not ready for approval, stopping process");
        return; // Error messages are already shown in the check function
      }

      console.log("Project validated, proceeding with approval");

      // If validation passes, proceed with approval
      await onSubmit(data, true);
      
      console.log("Project updated successfully, creating deputy task...");
      
      const projectId = projectData.id;
      if (!projectId) {
        throw new Error("Project ID is missing");
      }

      const taskResponse = await axiosInstance.post(
        "/data-management/createProjectCreationTaskForDeputy",
        { projectId: parseInt(projectId) }
      );
      
      console.log("Task creation response:", taskResponse.data);
      
      if (taskResponse.data.status === "success") {
        toast.success("Project saved and sent for approval successfully!");
        // Refresh the approval task status
        setApprovalTaskExists(true);
        onClose();
      } else if (taskResponse.data.result?.already_sent) {
        toast.warning("Project approval task already exists.");
        setApprovalTaskExists(true);
      } else {
        throw new Error("Failed to create approval task: " + (taskResponse.data.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error saving and sending for approval:", error);
      console.error("Error response:", error.response?.data);
      
      // Handle specific error cases
      if (error.response?.data?.result?.already_sent) {
        toast.warning("Project has already been sent for approval.");
        setApprovalTaskExists(true);
        return;
      }
      
      // Provide more specific error messages
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message || "Invalid request data. Please check all fields and try again.";
        toast.error(errorMessage);
      } else if (error.response?.status === 500) {
        toast.error("Server error. Please try again later.");
      } else {
        toast.error(`Failed to save and send project for approval: ${error.message}`);
      }
    }
  };

  // Function to check if document templates exist for the current project phase and type
  const checkDocumentTemplatesExist = async (phaseId, projectTypeId) => {
    try {
      // Get current phase name
      const phase = projectPhases.find(p => String(p.id) === String(phaseId));
      if (!phase) {
        console.error("Phase not found for ID:", phaseId);
        return false;
      }

      // Get project type name
      const projectType = projectTypes.find(p => String(p.id) === String(projectTypeId));
      if (!projectType) {
        console.error("Project type not found for ID:", projectTypeId);
        return false;
      }

      console.log("Checking document templates for:", {
        phase: phase.name,
        projectType: projectType.name
      });

      // Fetch document templates for this phase
      const response = await axiosInstance.post(
        "/data-management/getCurrentPhaseDocumentTemplates",
        { phase: phase.name }
      );

      if (response.data.status === "success" && response.data.data) {
        const templates = response.data.data || [];
        
        // Filter templates based on project type
        const filteredTemplates = templates.filter(template => {
          const isInternalProject = projectType.name === "Internal Project" || projectType.name === "Proof of Concept";
          
          if (isInternalProject) {
            // For internal projects, only include templates that allow internal projects
            return template.is_internal === true;
          } else {
            // For external projects, include templates that allow external projects
            return template.is_external === true;
          }
        });

        console.log("Document templates check result:", {
          totalTemplates: templates.length,
          filteredTemplates: filteredTemplates.length,
          hasTemplates: filteredTemplates.length > 0
        });

        return filteredTemplates.length > 0;
      }

      return false;
    } catch (error) {
      console.error("Error checking document templates:", error);
      return false;
    }
  };

  const checkProjectReadyForApproval = async () => {
    try {
      // Validate that we have a valid project ID
      if (!projectData?.id) {
        console.error("No project ID available:", projectData);
        toast.error("Invalid project data. Please refresh and try again.");
        return false;
      }

      console.log("Checking project readiness for projectId:", projectData.id);

      // Get the current project data to check upload flags
      const projectResponse = await axiosInstance.post(
        '/data-management/getProject',
        { id: parseInt(projectData.id) }
      );

      if (projectResponse.data.status !== 'success') {
        console.error("Failed to fetch project data:", projectResponse.data);
        toast.error("Failed to fetch project data. Please try again.");
        return false;
      }

      const currentProject = projectResponse.data.result;
      console.log("Current project data:", currentProject);

      const hasSchedulePlan = currentProject.project_schedule_uploaded === true;
      const hasDocuments = currentProject.project_documents_uploaded === true;

      // Check if document templates exist for this project type and phase
      const currentPhaseId = currentProject.current_phase_id || projectData.current_phase_id;
      const projectTypeId = currentProject.project_type_id || projectData.project_type_id;
      
      const hasDocumentTemplates = await checkDocumentTemplatesExist(currentPhaseId, projectTypeId);
      
      console.log("Validation results:", { 
        hasDocuments, 
        hasSchedulePlan, 
        hasDocumentTemplates,
        documentsRequired: hasDocumentTemplates
      });

      // Modified validation: Only require documents if templates exist for this project type/phase
      const documentsRequirementMet = hasDocuments || !hasDocumentTemplates;

      // Check if requirements are met
      if (!hasSchedulePlan) {
        toast.error("Cannot send for approval: schedule plan must be uploaded first.");
        return false;
      }

      if (!documentsRequirementMet) {
        toast.error("Cannot send for approval: project documents must be uploaded first.");
        return false;
      }

      // Show informative message if proceeding without documents
      if (!hasDocumentTemplates && !hasDocuments) {
        console.log("No document templates found for this project type and phase. Proceeding with schedule plan only.");
      }

      return true;

    } catch (error) {
      console.error("Error checking project readiness:", error);
      console.error("Error details:", error.response?.data || error.message);
      toast.error("Unable to verify project readiness. Please try again.");
      return false;
    }
  };

  const handleDepartmentChange = (deptId) => {
    setDepartments((prev) =>
      prev.map((dept) =>
        dept.id === deptId ? { ...dept, checked: !dept.checked } : dept
      )
    );
    const updatedCheckedIds = departments
      .map((dept) =>
        dept.id === deptId ? { ...dept, checked: !dept.checked } : dept
      )
      .filter((dept) => dept.checked)
      .map((dept) => dept.id);
    setValue("beneficiaryDepartments", updatedCheckedIds);
  };

  const toggleObjective = (objectiveId) => {
    setObjectives((prev) =>
      prev.map((obj) =>
        obj.id === objectiveId ? { ...obj, checked: !obj.checked } : obj
      )
    );
  };

  // Handlers for document and schedule modals
  const handleOpenDocuments = () => {
    setIsProjectDocumentsModalOpen(true);
  };

  // Replace handleOpenSchedulePlan to save project details before opening schedule plan
  const handleOpenSchedulePlan = () => {
    console.log("🔄 Opening schedule plan modal");
    console.log("📊 Project data for schedule modal:", {
      id: projectData?.id,
      name: projectData?.name,
      execution_start_date: projectData?.execution_start_date,
      execution_duration: projectData?.execution_duration,
      maintenance_duration: projectData?.maintenance_duration,
      project_type_id: projectData?.project_type_id
    });
    
    // Parse and log the execution duration
    const parsed = parseExecutionDuration(projectData?.execution_duration);
    console.log("🔧 Parsed execution duration:", parsed);
    
    setIsProjectSchedulePlanModalOpen(true);
  };

  const handleDocumentsSave = () => {
    setDocumentsRefreshTrigger(prev => prev + 1);
    toast.success("Documents updated successfully!");
  };

  const handleSchedulePlanSave = () => {
    setScheduleRefreshTrigger(prev => prev + 1);
    toast.success("Schedule plan updated successfully!");
  };

  const shouldShowSection = (section) => {
    if (activeSection === "all") return true;
    
    // Get the current project type name
    const currentType = projectTypes.find(
      (type) => type.id.toString() === projectType?.toString()
    );
    const isInternalOrPoC = ["Internal Project", "Proof of Concept"].includes(currentType?.name || "");
    
    switch (section) {
      case "category":
        return !isInternalOrPoC;
      case "vendor":
        return !isInternalOrPoC;
      case "budget":
        return !isInternalOrPoC;
      default:
        return true;
    }
  };

  // Helper function to determine if project can be sent for approval
  const canSendForApproval = useMemo(() => {
    const allowedStatuses = ["Not initiated", "Draft", "Rejected"];
    const result = allowedStatuses.includes(projectData?.approval_status);
    
    // Enhanced debug logging
    console.log("🔍 Approval Status Check:", {
      projectApprovalStatus: projectData?.approval_status,
      allowedStatuses,
      canSendForApproval: result,
      documentsUploaded: documentsUploadedSuccessfully,
      scheduleUploaded: scheduleUploadedSuccessfully,
      approvalTaskExists: approvalTaskExists,
      finalButtonEnabled: result && !approvalTaskExists && documentsUploadedSuccessfully && scheduleUploadedSuccessfully,
      // Add explanation for why button is disabled
      disabledReason: !result ? `Status "${projectData?.approval_status}" not in allowed list` : 
                     approvalTaskExists ? "Approval task already exists" :
                     !documentsUploadedSuccessfully ? "Documents not uploaded" :
                     !scheduleUploadedSuccessfully ? "Schedule not uploaded" : "Should be enabled"
    });
    
    return result;
  }, [projectData?.approval_status, documentsUploadedSuccessfully, scheduleUploadedSuccessfully, approvalTaskExists]);

  // Helper function to get approval status display info
  const getApprovalStatusInfo = useMemo(() => {
    const status = projectData?.approval_status;
    
    switch (status) {
      case "Waiting on deputy":
        return {
          color: "yellow",
          message: "Project is pending deputy approval",
          canEdit: false
        };
      case "Approved":
        return {
          color: "green", 
          message: "Project has been approved",
          canEdit: false
        };
      case "Rejected":
        return {
          color: "red",
          message: "Project was rejected and needs revision",
          canEdit: true
        };
      case "Draft":
      case "Not initiated":
      default:
        return {
          color: "blue",
          message: "Project is in draft mode",
          canEdit: true
        };
    }
  }, [projectData?.approval_status]);

  // Update loading flags when data is fetched
  useEffect(() => {
    const allDataLoaded = Object.values(dataLoadedFlags).every(flag => flag === true);
    if (allDataLoaded && projectData?.id) {
      setIsDataLoading(false);
      console.log("✅ All data loaded, form ready to render");
    }
  }, [dataLoadedFlags, projectData?.id]);

  if (!projectData?.id || isDataLoading) {
    console.log("⚠️ No project data available or data is still loading, showing loading state");
    return (
      <div className="flex flex-col rounded-lg border border-gray-200 shadow-md bg-white max-w-6xl mx-auto max-h-[90vh] p-4">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">
              {!projectData?.id ? "Loading project data..." : "Loading form data..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  console.log("✅ Rendering UpdateProjectModal with projectData:", projectData);

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 shadow-md bg-white max-w-6xl mx-auto max-h-[90vh]">
      <div className="flex justify-between items-center p-4 border-b bg-white sticky top-0 z-10">
        <h2 className="text-xl font-semibold">{title}</h2>
        {showButtons && (
          <div className="flex items-center space-x-2">
            <button
              className="text-green-500 hover:text-green-700"
              onClick={() => setIsProjectDocumentsModalOpen(true)}
              title="Manage Project Documents"
            >
              <FileText size={20} />
            </button>
            <button
              className="text-purple-500 hover:text-purple-700"
              onClick={() => setIsProjectSchedulePlanModalOpen(true)}
              title="Manage Schedule Plan"
            >
              <Calendar size={20} />
            </button>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={(e) => e.preventDefault()}>
          {/* Project Information */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Project English Name <span className="text-red-500">*</span>
              </label>
              <input
                readOnly={readOnly}
                type="text"
                className={`w-full p-2 border ${
                  errors.name ? "border-red-500" : "border-gray-300"
                } rounded`}
                {...register("name", {
                  required: "Project English name is required",
                })}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="text-right">
              <label className="block text-sm font-semibold mb-1 text-right">
                <span className="text-red-500">*</span> اسم المشروع بالعربي
              </label>
              <input
                readOnly={readOnly}
                type="text"
                className={`w-full p-2 border ${
                  errors.arabic_name ? "border-red-500" : "border-gray-300"
                } rounded text-right`}
                {...register("arabic_name", {
                  required: "Project Arabic name is required",
                })}
              />
              {errors.arabic_name && (
                <p className="text-red-500 text-xs mt-1 text-right">
                  {errors.arabic_name.message}
                </p>
              )}
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-1">
              Project Description <span className="text-red-500">*</span>
            </label>
            <textarea
              readOnly={readOnly}
              className={`w-full p-2 border ${
                errors.description ? "border-red-500" : "border-gray-300"
              } rounded h-24`}
              {...register("description", {
                required: "Project description is required",
              })}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">
                {errors.description.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Project Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Controller
                  name="project_type_id"
                  control={control}
                  rules={{ required: "Project type is required" }}
                  render={({ field }) => (
                    <select
                      disabled={readOnly}
                      className={`w-full p-2 border ${
                        errors.project_type_id
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded appearance-none bg-white`}
                      {...field}
                    >
                      <option value="">Select Project Type</option>
                      {projectTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown size={16} />
                </div>
              </div>
              {errors.project_type_id && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.project_type_id.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Project Current Phase <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Controller
                  name="current_phase_id"
                  control={control}
                  rules={{ required: "Current phase is required" }}
                  render={({ field }) => (
                    <select
                      disabled={readOnly}
                      className={`w-full p-2 border ${
                        errors.current_phase_id
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded appearance-none bg-white`}
                      {...field}
                    >
                      <option value="">Select Current Phase</option>
                      {filteredProjectPhases.map((phase) => (
                        <option key={phase.id} value={phase.id}>
                          {phase.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown size={16} />
                </div>
              </div>
              {errors.current_phase_id && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.current_phase_id.message}
                </p>
              )}
            </div>
          </div>

          {/* Project Categories */}
          {shouldShowSection("category") && (
            <div className="mb-6">
              <h3 className="font-semibold mb-4">Project Categories</h3>
              <div className="grid grid-cols-3 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Program Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Controller
                      name="program_id"
                      control={control}
                      rules={{ required: "Program name is required" }}
                      render={({ field }) => (
                        <select
                          disabled={readOnly}
                          className={`w-full p-2 border ${
                            errors.program_id
                              ? "border-red-500"
                              : "border-gray-300"
                          } rounded appearance-none bg-white`}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            fetchProgramDetails(e.target.value);
                          }}
                        >
                          <option value="">Select Program</option>
                          {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                              {program.name}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                  {errors.program_id && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.program_id.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Portfolio Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                    value={selectedProgramDetails?.portfolio_name || ""}
                    readOnly
                  />
                  {/* Hidden field for portfolio_id */}
                  <input
                    type="hidden"
                    {...register("portfolio_id")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Initiative Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                    value={selectedProgramDetails?.initiative_name || ""}
                    readOnly
                  />
                  {/* Hidden field for initiative_id */}
                  <input
                    type="hidden"
                    {...register("initiative_id")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <label
                    className={`block text-sm font-semibold mb-1 ${
                      isCategoryDisabled ? "opacity-50" : ""
                    }`}
                  >
                    Project Category{" "}
                    {isCategoryDisabled && "(Disabled for this project type)"}
                    {!isCategoryDisabled && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <div className="flex items-center space-x-6">
                    <label
                      className={`flex items-center ${
                        isCategoryDisabled ? "opacity-50" : ""
                      }`}
                    >
                      <Controller
                        name="category"
                        control={control}
                        rules={{
                          required:
                            !isCategoryDisabled &&
                            "Project category is required",
                        }}
                        render={({ field }) => (
                          <input
                            disabled={readOnly || isCategoryDisabled}
                            type="radio"
                            className="mr-2"
                            value="Capex"
                            checked={field.value === "Capex"}
                            onChange={() => field.onChange("Capex")}
                          />
                        )}
                      />
                      <span>Capex</span>
                    </label>
                    <label
                      className={`flex items-center ${
                        isCategoryDisabled ? "opacity-50" : ""
                      }`}
                    >
                      <Controller
                        name="category"
                        control={control}
                        render={({ field }) => (
                          <input
                            disabled={readOnly || isCategoryDisabled}
                            type="radio"
                            className="mr-2"
                            value="Opex"
                            checked={field.value === "Opex"}
                            onChange={() => field.onChange("Opex")}
                          />
                        )}
                      />
                      <span>Opex</span>
                    </label>
                  </div>
                  {!isCategoryDisabled && errors.category && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.category.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Assignee & Communication */}
          <div className="mb-6 border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Assignee & Communication</h3>
              <button type="button">
                <ChevronUp size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Project Manager <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Controller
                    name="project_manager_id"
                    control={control}
                    rules={{ required: "Project manager is required" }}
                    render={({ field }) => (
                      <select
                        disabled={readOnly}
                        className={`w-full p-2 border ${
                          errors.project_manager_id
                            ? "border-red-500"
                            : "border-gray-300"
                        } rounded appearance-none bg-white`}
                        {...field}
                      >
                        <option value="">Select Project Manager</option>
                        {projectManagers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.first_name} {user.family_name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
                {errors.project_manager_id && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.project_manager_id.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Beneficiary Department 
                  {isBeneficiaryDepartmentRequired ? 
                    <span className="text-red-500"> *</span> : 
                    " (Optional for this project type)"
                  }
                </label>
                <div className="border border-gray-300 rounded p-2 max-h-40 overflow-y-auto">
                  {departments.map((dept) => (
                    <div key={dept.id} className="flex items-center mb-1">
                      <input
                        disabled={readOnly}
                        type="checkbox"
                        id={`dept-${dept.id}`}
                        checked={dept.checked}
                        onChange={() => handleDepartmentChange(dept.id)}
                        className="mr-2"
                      />
                      <label htmlFor={`dept-${dept.id}`} className="text-sm">
                        {dept.name}{" "}
                        {dept.arabic_name && `(${dept.arabic_name})`}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Alternative Project Manager
                </label>
                <div className="relative">
                  <Controller
                    name="alternative_project_manager_id"
                    control={control}
                    render={({ field }) => (
                      <select
                        disabled={readOnly}
                        className="w-full p-2 border border-gray-300 rounded appearance-none bg-white"
                        {...field}
                      >
                        <option value="">Select Alternative Manager</option>
                        {projectManagers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.first_name} {user.family_name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
              {shouldShowSection("vendor") && (
                <div>
                  <label
                    className={`block text-sm font-semibold mb-1 ${
                      isVendorDisabled ? "opacity-50" : ""
                    }`}
                  >
                    Vendor Name
                    {isVendorDisabled && " (Disabled for this project type)"}
                  </label>
                  <div className="relative">
                    <Controller
                      name="vendor_id"
                      control={control}
                      render={({ field }) => (
                        <select
                          disabled={readOnly || isVendorDisabled}
                          className={`w-full p-2 border border-gray-300 rounded appearance-none bg-white ${
                            isVendorDisabled
                              ? "bg-gray-100 cursor-not-allowed"
                              : ""
                          }`}
                          {...field}
                        >
                          <option value="">Select Vendor</option>
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.name}{" "}
                              {vendor.arabic_name && `(${vendor.arabic_name})`}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Objectives and Budget */}
          <div className="mb-6 border-t pt-4">
            <h3 className="font-semibold mb-4">Objectives and Budget</h3>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Objectives <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded p-2 max-h-40 overflow-y-auto">
                  {objectives.length > 0 ? (
                    objectives.map((objective) => (
                      <div key={objective.id} className="flex items-center mb-1">
                        <input
                          disabled={readOnly}
                          type="checkbox"
                          id={`obj-${objective.id}`}
                          checked={objective.checked}
                          onChange={() => toggleObjective(objective.id)}
                          className="mr-2"
                        />
                        <label htmlFor={`obj-${objective.id}`}>
                          {objective.text}{" "}
                          {objective.arabic_text && `(${objective.arabic_text})`}
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500">
                      No objectives available. Please add objectives first.
                    </div>
                  )}
                </div>
              </div>
              {shouldShowSection("budget") && (
                <div>
                  <div className="mb-4">
                    <label
                      className="block text-sm font-semibold mb-1"
                    >
                      Project Planned Budget(in SAR)
                      {isBudgetRequired && (
                        <span className="text-red-500"> *</span>
                      )}
                    </label>
                    <input
                      readOnly={readOnly || isBudgetDisabled}
                      type="text"
                      className={`w-full p-2 border ${
                        errors.project_budget
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded ${
                        isBudgetDisabled ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                      placeholder="Enter full amount. For example, 8,000,000 for 8 million."
                      {...register("project_budget", {
                        required:
                          isBudgetRequired &&
                          "Project planned budget is required",
                        pattern: {
                          value: /^\d+(\.\d+)?$/,
                          message:
                            "Please enter a valid number (e.g., 10 or 10.5)",
                        },
                      })}
                      disabled={isBudgetDisabled}
                    />
                    {errors.project_budget && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.project_budget.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-semibold mb-1 ${
                        isApprovedBudgetDisabled ? "opacity-50" : ""
                      }`}
                    >
                      Project Approved Budget(in SAR)
                      {isApprovedBudgetDisabled && " (Disabled)"}
                    </label>
                    <input
                      readOnly={readOnly || isApprovedBudgetDisabled}
                      type="text"
                      className={`w-full p-2 border border-gray-300 rounded ${
                        isApprovedBudgetDisabled ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                      placeholder="Enter full amount. For example, 8,000,000 for 8 million."
                      {...register("approved_budget")}
                      disabled={isApprovedBudgetDisabled}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Update Project Button */}
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={handleSubmit((data) => onSubmit(data, false))}
            >
              Update Project
            </button>
          </div>

          {/* Upload Status and Actions */}
          <div className="mb-6 border-t pt-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Schedule Plan Status */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Schedule Plan</h3>
                  <span className={`text-sm px-2 py-1 rounded ${
                    scheduleUploadedSuccessfully 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {scheduleUploadedSuccessfully ? "Uploaded" : "Not uploaded"}
                  </span>
                </div>
                {scheduleUploadedSuccessfully ? (
                  <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                    <div className="flex items-center mb-2">
                      <span className="text-green-600 font-medium">✓ Schedule Plan Uploaded Successfully</span>
                    </div>
                    <p className="text-sm text-green-600 mb-3">
                      The schedule plan has been saved for this project.
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={handleOpenSchedulePlan}
                    >
                      Edit Schedule Plan
                    </button>
                  </div>
                ) : (
                  <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-3">
                      Add a schedule plan for this project.
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={handleOpenSchedulePlan}
                    >
                      Upload Schedule Plan
                    </button>
                  </div>
                )}
              </div>

              {/* Documents Status */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Project Documents</h3>
                  <span className={`text-sm px-2 py-1 rounded ${
                    documentsUploadedSuccessfully 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {documentsUploadedSuccessfully ? "Uploaded" : "Not uploaded"}
                  </span>
                </div>
                {documentsUploadedSuccessfully ? (
                  <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                    <div className="flex items-center mb-2">
                      <span className="text-green-600 font-medium">✓ Project Documents Uploaded Successfully</span>
                    </div>
                    <p className="text-sm text-green-600 mb-3">
                      Required documents have been uploaded for this project.
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={handleOpenDocuments}
                    >
                      Manage Documents
                    </button>
                  </div>
                ) : (
                  <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-3">
                      Upload required documents for this project phase.
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={handleOpenDocuments}
                    >
                      Upload Documents
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Send for Approval Section */}
          {canSendForApproval && (
            <div className="mb-6 border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Project Approval Status</h3>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  getApprovalStatusInfo.color === "yellow" ? "bg-yellow-100 text-yellow-800" :
                  getApprovalStatusInfo.color === "green" ? "bg-green-100 text-green-800" :
                  getApprovalStatusInfo.color === "red" ? "bg-red-100 text-red-800" :
                  "bg-blue-100 text-blue-800"
                }`}>
                  {projectData?.approval_status || "Draft"}
                </div>
              </div>
              
              {projectData?.approval_status === "Rejected" && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <p className="text-sm font-medium text-red-800">
                      Project Rejected
                    </p>
                  </div>
                  <p className="text-sm text-red-700">
                    This project was rejected and needs revision before it can be resubmitted for approval.
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                {approvalTaskExists ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <p className="text-sm font-medium text-yellow-800">
                        Project Already Sent for Approval
                      </p>
                    </div>
                    <p className="text-sm text-yellow-700 mb-2">
                      This project has already been sent for approval and is currently pending review.
                    </p>
                    {approvalTaskInfo && (
                      <div className="text-xs text-yellow-600 bg-yellow-100 p-2 rounded">
                        <p><strong>Task assigned to:</strong> {approvalTaskInfo.assigned_to_name || 'Deputy'}</p>
                        <p><strong>Due date:</strong> {new Date(approvalTaskInfo.due_date).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> {approvalTaskInfo.status}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <p className="text-sm font-medium text-blue-800">
                        Approval Requirements
                      </p>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      Complete the requirements below to enable approval submission.
                    </p>
                    <div className="text-xs text-gray-500">
                      <p className="mb-2">Requirements:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li className={scheduleUploadedSuccessfully ? "text-green-600" : "text-gray-500"}>
                          {scheduleUploadedSuccessfully ? "✓" : "○"} Schedule plan uploaded (required)
                        </li>
                        {hasDocumentTemplates ? (
                          <li className={documentsUploadedSuccessfully ? "text-green-600" : "text-gray-500"}>
                            {documentsUploadedSuccessfully ? "✓" : "○"} Project documents uploaded (required)
                          </li>
                        ) : (
                          <li className="text-blue-600">
                            ℹ No document templates configured for this project type/phase - documents not required
                          </li>
                        )}
                      </ul>
                      {((hasDocumentTemplates && documentsUploadedSuccessfully) || !hasDocumentTemplates) && scheduleUploadedSuccessfully && (
                        <p className="text-green-600 mt-2 font-medium">
                          ✓ All requirements met - Use "Send for Approval" button below to submit
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Footer */}
          {showButtons && (
            <div className="flex justify-between items-center mt-6 border-t pt-4">
              <div className="flex space-x-4">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  onClick={onClose}
                >
                  Cancel
                </button>
              </div>
              
              {/* Send for Approval Button - Always visible but enabled/disabled based on requirements */}
              <div className="flex items-center space-x-4">
                {/* Determine button state and styling */}
                {(() => {
                  // Documents are required only if templates exist
                  const documentsRequirementMet = !hasDocumentTemplates || documentsUploadedSuccessfully;
                  const isEnabled = canSendForApproval && !approvalTaskExists && documentsRequirementMet && scheduleUploadedSuccessfully;
                  
                  // Debug the button state
                  console.log("🔘 Send for Approval Button State:", {
                    canSendForApproval,
                    approvalTaskExists,
                    hasDocumentTemplates,
                    documentsUploadedSuccessfully,
                    documentsRequirementMet,
                    scheduleUploadedSuccessfully,
                    isEnabled
                  });
                  
                  const getDisabledReason = () => {
                    if (!canSendForApproval) {
                      return `Project status "${projectData?.approval_status}" cannot be sent for approval. Allowed statuses: Not initiated, Draft, Rejected`;
                    }
                    if (approvalTaskExists) {
                      return "Project is already submitted for approval";
                    }
                    if (!scheduleUploadedSuccessfully && !documentsRequirementMet) {
                      if (hasDocumentTemplates) {
                        return "Upload required documents and schedule plan before sending for approval";
                      } else {
                        return "Upload schedule plan before sending for approval";
                      }
                    }
                    if (!documentsRequirementMet && hasDocumentTemplates) {
                      return "Upload required project documents before sending for approval";
                    }
                    if (!scheduleUploadedSuccessfully) {
                      return "Upload schedule plan before sending for approval";
                    }
                    return "";
                  };

                  const buttonText = projectData?.approval_status === "Rejected" ? "Resubmit for Approval" : "Send for Approval";
                  const disabledReason = getDisabledReason();

                  return (
                    <button
                      type="button"
                      className={`px-6 py-2 rounded transition-colors font-medium ${
                        isEnabled
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                      onClick={isEnabled ? handleSubmit(handleSaveAndSendForApproval) : undefined}
                      disabled={!isEnabled}
                      title={isEnabled ? "Save changes and send project for deputy approval" : disabledReason}
                    >
                      {buttonText}
                    </button>
                  );
                })()}
              </div>
            </div>
          )}
        </form>
      </div>
      {/* Project Documents Modal */}
      {isProjectDocumentsModalOpen && (
        <ProjectDocumentsModal
          isOpen={isProjectDocumentsModalOpen}
          onClose={() => setIsProjectDocumentsModalOpen(false)}
          projectId={projectData.id}
          projectName={projectData.name}
          currentPhase={watch("current_phase_id") || projectData.current_phase_id}
          isNewProject={false} // This is an existing project being updated
          onSave={handleDocumentsSave}
        />
      )}
      {/* Project Schedule Plan Modal */}
      {isProjectSchedulePlanModalOpen && (
        <ProjectSchedulePlanModal
          isOpen={isProjectSchedulePlanModalOpen}
          onClose={() => setIsProjectSchedulePlanModalOpen(false)}
          projectId={projectData.id}
          projectName={projectData.name}
          projectType={projectData.project_type_id}
          projectBudget={projectData.project_budget}
          executionStartDate={(() => {
            const startDate = projectData?.execution_start_date
              ? new Date(projectData.execution_start_date)
              : null;
            console.log("🔧 Parsed execution start date for modal props:", startDate);
            console.log("📊 Raw execution_start_date value:", projectData?.execution_start_date);
            console.log("📊 Is valid date:", startDate && !isNaN(startDate.getTime()));
            return startDate;
          })()}
          executionDuration={(() => {
            const parsed = parseExecutionDuration(projectData?.execution_duration);
            console.log("🔧 Parsed execution duration for modal props:", parsed);
            console.log("📊 Raw execution_duration value:", projectData?.execution_duration);
            console.log("📊 Type of execution_duration:", typeof projectData?.execution_duration);
            return parsed.duration;
          })()}
          maintenanceDuration={(() => {
            const maintenance = projectData?.maintenance_duration
              ? parseInt(String(projectData.maintenance_duration), 10)
              : 30;
            console.log("🔧 Parsed maintenance duration for modal props:", maintenance);
            console.log("📊 Raw maintenance_duration value:", projectData?.maintenance_duration);
            return maintenance;
          })()}
          executionDurationType={(() => {
            const parsed = parseExecutionDuration(projectData?.execution_duration);
            console.log("🔧 Parsed execution duration type for modal props:", parsed.type);
            return parsed.type;
          })()}
          onSave={handleSchedulePlanSave}
        />
      )}
    </div>
  );
};

export default UpdateProjectModal;
