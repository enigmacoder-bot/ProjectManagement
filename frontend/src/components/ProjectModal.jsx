import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { X, Calendar, ChevronDown, ChevronUp, Download } from "lucide-react";
import Datepicker from "react-tailwindcss-datepicker";
import { toast } from "sonner";
import useAuthStore from "../store/authStore";
import axiosInstance from "../axiosInstance";
import ProjectSchedulePlanModal from "./ProjectSchedulePlanModal";
import ProjectDocumentsModal from "./ProjectDocumentsModal";
const PORT = import.meta.env.VITE_PORT;
import axios from "axios";
const ProjectModal = ({
  onClose,
  showButtons = true,
  title = "Add a Project",
  readOnly = false,
  onProjectAdded,
}) => {
  const [activeSection, setActiveSection] = useState("all");
  const { users, projectTypes, projectPhases, setDocuments, documents } =
    useAuthStore();
  // Initialize react-hook-form
  const [departments, setDepartments] = useState([]);
  // const [initiatives, setInitiatives] = useState([]); // No longer needed - Portfolio/Initiative are readonly
  // const [portfolios, setPortfolios] = useState([]); // No longer needed - Portfolio/Initiative are readonly
  const [programs, setPrograms] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [selectedProgramDetails, setSelectedProgramDetails] = useState(null);
  
  // State for schedule plan modal
  const [showSchedulePlanModal, setShowSchedulePlanModal] = useState(false);
  const [savedProjectData, setSavedProjectData] = useState(null);
  const [scheduleUploadedSuccessfully, setScheduleUploadedSuccessfully] = useState(false);

  // State for documents modal
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [documentsUploadedSuccessfully, setDocumentsUploadedSuccessfully] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
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
      objectives: [
        { id: 1, text: "Objective One", checked: true },
        { id: 2, text: "Objective Two", checked: true },
        { id: 3, text: "Objective Three", checked: true },
        { id: 4, text: "Objective Four", checked: true },
      ],
      project_budget: "",
      approved_budget: "",
    },
  });

  // console.log("Project Modal Users:", users);

  // Watch for changes in projectType and currentPhase
  const projectType = watch("project_type_id");
  const currentPhase = watch("current_phase_id");
  const projectBudget = watch("project_budget"); // Assuming 'project_budget' is a field in your form
  const projectManager = watch("project_manager_id");
  const alternativeProjectManager = watch("alternative_project_manager_id");
  const [managerError, setManagerError] = useState("");

  useEffect(() => {
    if (
      projectManager &&
      alternativeProjectManager &&
      projectManager === alternativeProjectManager
    ) {
      setManagerError("Project Manager and Alternative Project Manager cannot be the same person");
    } else {
      setManagerError("");
    }
  }, [projectManager, alternativeProjectManager]);

  const scheduleData = [
    {
      mainPhase: "Planning",
      subPhase: "Prepare RFP",
      duration: "4 weeks",
      startDate: "5- May -23",
      endDate: "5- May -23",
    },
    {
      mainPhase: "Planning",
      subPhase: "RFP Releasing Procedures",
      duration: "4 weeks",
      startDate: "5- May -23",
      endDate: "5- May -23",
    },
    {
      mainPhase: "Bidding",
      subPhase: "Bidding Duration",
      duration: "4 weeks",
      startDate: "5- May -23",
      endDate: "5- May -23",
    },
    {
      mainPhase: "Bidding",
      subPhase: "Technical and financial evaluation",
      duration: "4 weeks",
      startDate: "5- May -23",
      endDate: "5- May -23",
    },
    {
      mainPhase: "Bidding",
      subPhase: "Contract preparation",
      duration: "4 weeks",
      startDate: "5- May -23",
      endDate: "5- May -23",
    },
    {
      mainPhase: "Before execution",
      subPhase: "Waiting period before execution starts",
      duration: "4 weeks",
      startDate: "5- May -23",
      endDate: "5- May -23",
    },
  ];

  const internalScheduleData = useMemo(
    () => [
      // Your initial schedule data or fetched data
      {
        id: 1,
        mainPhase: "Planning",
        subPhase: "Prepare scope",
        duration: "28 days",
      },
      {
        id: 4,
        mainPhase: "Execution",
        subPhase: "Execute phase",
        duration: "28 days",
      },
    ],
    [] // Empty dependency array if static, or add dependencies if dynamic
  );
  const isVendorDisabled = useMemo(() => {
    const restrictedTypes = ["Internal Project", "Proof of Concept"];
    const currentType = projectTypes.find(
      (type) => type.id.toString() === projectType?.toString()
    );
    const typeName = currentType?.name || "";

    const currentPhaseObj = projectPhases.find(
      (phase) => phase.id.toString() === currentPhase?.toString()
    );
    const phaseName = currentPhaseObj?.name || "";
    const restrictedPhases = ["Planning", "Bidding"];

    return (
      restrictedTypes.includes(typeName) || restrictedPhases.includes(phaseName)
    );
  }, [projectType, projectTypes, currentPhase, projectPhases]);

  useEffect(() => {
    if (isVendorDisabled) {
      setValue("vendor_id", "");
    }
  }, [isVendorDisabled, setValue]);

  useEffect(() => {
    const fetchPhaseDurations = async () => {
      try {
        const response = await axiosInstance.post(
          `/data-management/getPhaseDurations`
        );
        if (response.data && response.data.status === "success") {
          setPhaseDurations(response.data.data);

          // Process the data to create duration options
          const options = [];
          response.data.data.forEach((phase) => {
            const budgetDurations = phase.budget_durations;
            Object.keys(budgetDurations).forEach((budgetId) => {
              const duration = budgetDurations[budgetId].duration_weeks;
              if (duration > 0 && !options.includes(duration)) {
                options.push(duration);
              }
            });
          });

          // Sort options numerically
          options.sort((a, b) => a - b);
          setDurationOptions(options);
        }
      } catch (error) {
        console.error("Error fetching phase durations:", error);
        // toast.error("Failed to load duration options");
      }
    };

    fetchPhaseDurations();
  }, []);

  // fetch departments
  useEffect(() => {
    console.log("Project Types:", projectTypes);
    const fetchDepartments = async () => {
      try {
        const response = await axiosInstance.post(
          `/data-management/getDepartments`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (response.data && response.data.status === "success") {
          // Transform the departments data to include a checked property
          const departmentsWithChecked = response.data.result.map((dept) => ({
            id: dept.id,
            name: dept.name,
            arabic_name: dept.arabic_name,
            checked: false,
          }));
          setDepartments(departmentsWithChecked);
          console.log("Departments");
          console.log(departments);
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
        toast.error("Failed to load departments");
      }
    };

    fetchDepartments();
  }, []);

  // Fetch initiatives - No longer needed since Portfolio/Initiative are readonly
  // useEffect(() => {
  //   const fetchInitiatives = async () => {
  //     try {
  //       const response = await axiosInstance.post(
  //         `/data-management/getInitiatives`
  //       );
  //       if (response.data && response.data.status === "success") {
  //         setInitiatives(response.data.result);
  //         console.log("Initiatives loaded:", response.data.result);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching initiatives:", error);
  //       toast.error("Failed to load initiatives");
  //     }
  //   };

  //   fetchInitiatives();
  // }, []);

  // Fetch portfolios - No longer needed since Portfolio/Initiative are readonly
  // useEffect(() => {
  //   const fetchPortfolios = async () => {
  //     try {
  //       const response = await axiosInstance.post(
  //         `/data-management/getPortfolios`
  //       );
  //       if (response.data && response.data.status === "success") {
  //         setPortfolios(response.data.result);
  //         console.log("Portfolios loaded:", response.data.result);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching portfolios:", error);
  //       toast.error("Failed to load portfolios");
  //     }
  //   };

  //   fetchPortfolios();
  // }, []);

  // Fetch programs
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await axiosInstance.post(
          `/data-management/getPrograms`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (response.data && response.data.status === "success") {
          setPrograms(response.data.result);
          console.log("Programs loaded:", response.data.result);
        }
      } catch (error) {
        console.error("Error fetching programs:", error);
        toast.error("Failed to load programs");
      }
    };

    fetchPrograms();
  }, []);

  // Fetch vendors
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await axiosInstance.post(
          `/data-management/getVendors`
        );
        if (response.data && response.data.status === "success") {
          setVendors(response.data.result);
          console.log("Vendors loaded:", response.data.result);
        }
      } catch (error) {
        console.error("Error fetching vendors:", error);
        toast.error("Failed to load vendors");
      }
    };

    fetchVendors();
  }, []);

  // Fetch objectives
  useEffect(() => {
    const fetchObjectives = async () => {
      try {
        const response = await axiosInstance.post(
          `/data-management/getObjectives`
        );
        if (response.data && response.data.status === "success") {
          // Transform the objectives data to include a checked property
          const objectivesWithChecked = response.data.result.map((obj) => ({
            id: obj.id,
            text: obj.name,
            arabic_text: obj.arabic_name,
            checked: false,
          }));
          setObjectives(objectivesWithChecked);
          // Update the form's objectives state
          setValue("objectives", objectivesWithChecked);
          console.log("Objectives loaded:", objectivesWithChecked);
        }
      } catch (error) {
        console.error("Error fetching objectives:", error);
        toast.error("Failed to load objectives");
      }
    };

    fetchObjectives();
  }, [setValue]);
  // // Fetch project phases
  // useEffect(() => {
  //   const fetchProjectPhases = async () => {
  //     try {
  //       const response = await axiosInstance.post(
  //         `/data-management/getProjectPhases`
  //       );
  //       if (response.data.status === "success") {
  //         setProjectPhases(response.data.result);
  //       } else {
  //         toast.error("Failed to load project phases");
  //       }
  //     } catch (error) {
  //       console.error("Error fetching project phases:", error);
  //       toast.error("Failed to load project phases");
  //     }
  //   };

  //   fetchProjectPhases();
  // }, []);

  // // Fetch project types
  // useEffect(() => {
  //   const fetchProjectTypes = async () => {
  //     try {
  //       const response = await axiosInstance.post(`/data-management/getProjectTypes`);
  //       if (response.data.status === "success") {
  //         setProjectTypes(response.data.result);
  //       } else {
  //         toast.error("Failed to load project types");
  //       }
  //     } catch (error) {
  //       console.error("Error fetching project types:", error);
  //       toast.error("Failed to load project types");
  //     }
  //   };

  //   fetchProjectTypes();
  // }, []);

  // Function to fetch program details from the backend
  const fetchProgramDetails = async (programId) => {
    if (!programId) {
      setSelectedProgramDetails(null); // Clear details if no program is selected
      return;
    }

    try {
      const response = await axiosInstance.post(
        "/data-management/getProgramDetails",
        { program_id: programId },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data && response.data.status === "success") {
        setSelectedProgramDetails(response.data.result); // Set the fetched details
      } else {
        throw new Error(
          response.data?.message || "Failed to fetch program details"
        );
      }
    } catch (error) {
      console.error("Error fetching program details:", error);
      toast.error("Failed to load program details");
      setSelectedProgramDetails(null); // Reset on error
    }
  };

  // Watch the program_id field and fetch details when it changes
  const selectedProgramId = watch("program_id"); // Get the current value of program_id

  useEffect(() => {
    fetchProgramDetails(selectedProgramId); // Fetch details whenever programName changes
  }, [selectedProgramId]);
  useEffect(() => {
    if (selectedProgramDetails) {
      setValue("portfolio_id", selectedProgramDetails.portfolio_id || "");
      setValue("initiative_id", selectedProgramDetails.initiative_id || "");
    } else {
      setValue("portfolio_id", "");
      setValue("initiative_id", "");
    }
  }, [selectedProgramDetails, setValue]);

  useEffect(() => {
    const currentPhase = watch("current_phase_id");
    if (currentPhase) {
      // Find the phase object in projectPhases store
      const selectedPhase = projectPhases.find(
        (phase) => phase.id === parseInt(currentPhase, 10)
      );
      if (selectedPhase) {
        // Trigger document templates fetch with phase name
        getCurrentPhaseDocumentTemplates(selectedPhase.name);
      }
    }
  }, [watch("current_phase_id"), projectPhases]);

  // Sync upload status with saved project data
  useEffect(() => {
    if (savedProjectData) {
      console.log("=== Syncing upload status with saved project data ===");
      console.log("Saved project data:", savedProjectData);
      console.log("- project_schedule_uploaded:", savedProjectData.project_schedule_uploaded, "(type:", typeof savedProjectData.project_schedule_uploaded, ")");
      console.log("- project_documents_uploaded:", savedProjectData.project_documents_uploaded, "(type:", typeof savedProjectData.project_documents_uploaded, ")");
      
      // Update local state based on backend data
      const scheduleStatus = savedProjectData.project_schedule_uploaded === true;
      const documentsStatus = savedProjectData.project_documents_uploaded === true;
      
      console.log("Setting local states:");
      console.log("- scheduleUploadedSuccessfully:", scheduleStatus);
      console.log("- documentsUploadedSuccessfully:", documentsStatus);
      console.log("======================================================");
      
      setScheduleUploadedSuccessfully(scheduleStatus);
      setDocumentsUploadedSuccessfully(documentsStatus);
    }
  }, [savedProjectData]);

  const filteredProjectPhases = useMemo(() => {
    if (!projectType || !projectPhases.length) return projectPhases;

    // Find the project type name from the ID
    const selectedProjectType = projectTypes.find(
      (type) => type.id.toString() === projectType
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

  const projectManagers = useMemo(() => {
    return users.filter((user) => user.role_name === "PM");
  }, [users]);

  // Determine if category should be disabled
  const isCategoryDisabled = useMemo(() => {
    const restrictedTypes = ["Internal Project", "Proof of Concept"];
    const currentType = projectTypes.find(
      (type) => type.id.toString() === projectType?.toString()
    );
    return restrictedTypes.includes(currentType?.name || "");
  }, [projectType, projectTypes]);

  const isBudgetDisabled = useMemo(() => {
    const restrictedTypes = ["Internal Project", "Proof of Concept"];
    const currentType = projectTypes.find(
      (type) => type.id.toString() === projectType?.toString()
    );
    return restrictedTypes.includes(currentType?.name || "");
  }, [projectType, projectTypes]);

  // isBudgetRequired: Required for External/Strategic projects in all phases
  const isBudgetRequired = useMemo(() => {
    const restrictedTypes = ["Internal Project", "Proof of Concept"];
    const currentType = projectTypes.find(
      (type) => type.id.toString() === projectType?.toString()
    );
    const typeName = currentType?.name || "";

    // Required for External Project or Strategic Project, not disabled by type
    return (
      !restrictedTypes.includes(typeName) &&
      ["External Project", "Strategic Project"].includes(typeName)
    );
  }, [projectType, projectTypes]);

  // Approved budget disable logic for Internal Project and Proof of Concept and Planning/Bidding phases
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

  const getCurrentPhaseDocumentTemplates = async (phase) => {
    try {
      const result = await axiosInstance.post(
        `/data-management/getCurrentPhaseDocumentTemplates`,
        { phase }
      );
      console.log("result", result);
      setDocuments(result.data.data);
      console.log("Fetched document templates:", result.data.data);

      // Update both state and form value
      // Return the documents for debugging
      return result.data.data;
    } catch (error) {
      console.error("Error fetching document templates:", error);
      toast.error("Failed to load document templates");
      return [];
    }
  };

  const handleSaveDraft = async () => {
    await handleSubmit(
      async (data) => {
        try {
          data.approval_status = "Not initiated";
          const response = await onSubmit(data);
          
          if (response && response.data && response.data.result) {
            const projectData = response.data.result;
            console.log("Draft saved - received project data:", projectData);
            console.log("Draft saved - current_phase_id:", projectData.current_phase_id);
            setSavedProjectData(projectData);
            
            toast.success("Project saved as draft! You can now add the schedule plan and documents.");
            if (onProjectAdded) onProjectAdded();
          }
        } catch (error) {
          console.error("Error saving draft:", error);
        }
      },
      (errors) => {
        console.error("Form validation errors:", errors);
        toast.error("Please fill in all required fields correctly");
      }
    )();
  };

  const handleSaveAndSendForApproval = async () => {
    await handleSubmit(
      async (data) => {
        try {
          // Save as draft first - approval happens later after document and schedule upload
          data.approval_status = "Draft";
          const response = await onSubmit(data);

          if (response && response.data && response.data.result) {
            const projectData = response.data.result;
            console.log("Project saved - received project data:", projectData);
            console.log("Project saved - current_phase_id:", projectData.current_phase_id);
            setSavedProjectData(projectData);
            
            toast.success("Project saved successfully! You can now add the schedule plan and documents before sending for approval.");
            
            // Don't call onProjectAdded yet - only when modal is finally closed
            // We'll call it in handleFinalClose instead
            
            // Don't close the modal yet - show option to add schedule plan
          } else {
            throw new Error("No project data returned from save operation");
          }
        } catch (error) {
          console.error("Error saving project:", error);
        }
      },
      (errors) => {
        console.error("Form validation errors:", errors);
        toast.error("Please fill in all required fields correctly");
      }
    )();
  };

  const handleOpenSchedulePlan = () => {
    if (!savedProjectData || !savedProjectData.id) {
      toast.error("Please save the project first before adding a schedule plan");
      return;
    }
    
    // Debug budget value before opening modal
    const budgetValue = savedProjectData.project_budget || 
      savedProjectData.approved_project_budget || 
      (watch("project_budget") ? parseFloat(watch("project_budget")) : null) ||
      (watch("approved_budget") ? parseFloat(watch("approved_budget")) : null) ||
      10000000;
      
    console.log("Opening Schedule Plan Modal with:");
    console.log("- Project ID:", savedProjectData.id);
    console.log("- Project Budget:", budgetValue);
    console.log("- Project Type:", savedProjectData.project_type_id);
    console.log("- Saved Project Data:", savedProjectData);
    console.log("- Current Form Budget:", watch("project_budget"));
    console.log("- Current Form Approved Budget:", watch("approved_budget"));
    
    setShowSchedulePlanModal(true);
  };

  const handleSchedulePlanSave = async () => {
    setShowSchedulePlanModal(false);
    
    // Don't set local state immediately - wait for backend confirmation
    // setScheduleUploadedSuccessfully(true);
    
    // Refresh project data from backend to get updated upload status
    if (savedProjectData && savedProjectData.id) {
      try {
        const response = await axiosInstance.post('/data-management/getProject', {
          id: savedProjectData.id
        });
        
        if (response.data && response.data.status === 'success') {
          const updatedProjectData = response.data.result;
          console.log("Updated project data after schedule upload:", updatedProjectData);
          console.log("Schedule uploaded status:", updatedProjectData.project_schedule_uploaded);
          setSavedProjectData(updatedProjectData);
          
          // The useEffect will handle updating the local state based on backend data
        }
      } catch (error) {
        console.error("Error refreshing project data:", error);
      }
    }
    
    toast.success("Schedule plan saved successfully! You can now upload documents and send for approval.");
  };

  const handleOpenDocuments = () => {
    if (!savedProjectData || !savedProjectData.id) {
      toast.error("Please save the project first before uploading documents");
      return;
    }
    
    // Get current phase from saved data or fall back to form value
    const currentPhaseId = savedProjectData.current_phase_id || 
                          savedProjectData.phase_id || 
                          savedProjectData.currentPhase || 
                          watch("current_phase_id");
    
    console.log("Opening Documents Modal with:");
    console.log("- Project ID:", savedProjectData.id);
    console.log("- Project Name:", savedProjectData.name);
    console.log("- Current Phase:", currentPhaseId);
    console.log("- Saved Project Data:", savedProjectData);
    console.log("- Form Current Phase:", watch("current_phase_id"));
    
    if (!currentPhaseId) {
      toast.error("Current phase is required to load document templates");
      return;
    }
    
    setShowDocumentsModal(true);
  };

  const handleDocumentsSave = async () => {
    setShowDocumentsModal(false);
    
    // Don't set local state immediately - wait for backend confirmation
    // setDocumentsUploadedSuccessfully(true);
    
    // Refresh project data from backend to get updated upload status
    if (savedProjectData && savedProjectData.id) {
      try {
        const response = await axiosInstance.post('/data-management/getProject', {
          id: savedProjectData.id
        });
        
        if (response.data && response.data.status === 'success') {
          const updatedProjectData = response.data.result;
          console.log("Updated project data after document upload:", updatedProjectData);
          console.log("Documents uploaded status:", updatedProjectData.project_documents_uploaded);
          setSavedProjectData(updatedProjectData);
          
          // The useEffect will handle updating the local state based on backend data
        }
      } catch (error) {
        console.error("Error refreshing project data:", error);
      }
    }
    
    toast.success("Documents uploaded successfully!");
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

  const handleSendForApproval = async () => {
    if (!savedProjectData) {
      toast.error("No project data available to send for approval");
      return;
    }

    // Check if document templates exist for this project type and phase
    const currentPhaseId = savedProjectData.current_phase_id || savedProjectData.phase_id;
    const projectTypeId = savedProjectData.project_type_id;
    
    const hasDocumentTemplates = await checkDocumentTemplatesExist(currentPhaseId, projectTypeId);
    
    console.log("Pre-approval checks:", {
      scheduleUploaded: scheduleUploadedSuccessfully,
      documentsUploaded: documentsUploadedSuccessfully,
      hasDocumentTemplates,
      requiresDocuments: hasDocumentTemplates
    });

    // Modified validation: Only require documents if templates exist for this project type/phase
    const canProceedWithoutDocuments = !hasDocumentTemplates;
    const documentsRequirementMet = documentsUploadedSuccessfully || canProceedWithoutDocuments;

    if (!scheduleUploadedSuccessfully) {
      toast.error("Schedule plan must be uploaded before sending for approval");
      return;
    }

    if (!documentsRequirementMet) {
      toast.error("Project documents must be uploaded before sending for approval");
      return;
    }

    if (canProceedWithoutDocuments && !documentsUploadedSuccessfully) {
      toast.info("No document templates are configured for this project type and phase. Proceeding with schedule plan only.");
    }

    try {
      // Update the project with approval flag
      const response = await axiosInstance.post(
        `/data-management/updateProject`,
        {
          id: savedProjectData.id,
          data: {},
          approval: true
        }
      );

      if (response.data.status === "success") {
        toast.success("Project has been sent for approval successfully!");
        
        // Close the modal and refresh the project list
        setSavedProjectData(null);
        setScheduleUploadedSuccessfully(false);
        setDocumentsUploadedSuccessfully(false);
        
        // Call the onProjectAdded callback to refresh the project table
        if (onProjectAdded) {
          onProjectAdded();
        }
        
        if (onClose) onClose();
      } else {
        toast.error("Failed to send project for approval");
      }
    } catch (error) {
      console.error("Error sending project for approval:", error);
      toast.error("An error occurred while sending the project for approval");
    }
  };

  const handleFinalClose = () => {
    setSavedProjectData(null);
    setScheduleUploadedSuccessfully(false);
    setDocumentsUploadedSuccessfully(false);
    
    // Call the onProjectAdded callback to refresh the project table only when closing
    if (onProjectAdded) {
      onProjectAdded();
    }
    
    if (onClose) onClose();
  };

  const handleClearFields = () => {
    // Reset form to default values
    reset({
      name: "",
      arabic_name: "",
      description: "",
      project_type_id: "",
      current_phase_id: "",
      initiative_id: "",
      portfolio_id: "",
      program_id: "",
      programName: "",
      portfolioName: "",
      initiativeName: "",
      category: "",
      project_manager_id: "",
      alternative_project_manager_id: "",
      vendor_id: "",
      beneficiaryDepartments: [],
      objectives: [
        { id: 1, text: "Objective One", checked: true },
        { id: 2, text: "Objective Two", checked: true },
        { id: 3, text: "Objective Three", checked: true },
        { id: 4, text: "Objective Four", checked: true },
      ],
      project_budget: "",
      approved_budget: "",
      execution_start_date: {
        startDate: new Date("2025-01-21"),
        endDate: new Date("2025-01-21"),
      },
      maintenance_duration: {
        startDate: new Date("2025-01-21"),
        endDate: new Date("2025-01-21"),
      },
      internal_start_date: {
        startDate: new Date("2025-01-21"),
        endDate: new Date("2025-01-21"),
      },
      execution_duration: "4 weeks",
      documents: [
        {
          id: 1,
          name: "Business case",
          required: true,
          filename: "Business_case.doc",
          date: "5- May -23",
          uploaded: true,
        },
        {
          id: 2,
          name: "Request for Proposal",
          required: true,
          filename: "RFP_version_Final.pdf",
          date: "5- May -23",
          uploaded: true,
        },
        {
          id: 3,
          name: "Execution phase closure",
          required: true,
          filename: "",
          date: "",
          uploaded: false,
        },
        {
          id: 4,
          name: "Contract",
          required: true,
          filename: "",
          date: "",
          uploaded: false,
        },
        {
          id: 5,
          name: "Technical evaluation",
          required: false,
          filename: "",
          date: "",
          uploaded: false,
        },
        {
          id: 6,
          name: "Financial evaluation",
          required: false,
          filename: "",
          date: "",
          uploaded: false,
        },
      ],
    });

    // Clear any local state related to file uploads
    setLocalFiles([]);

    // Clear schedule table data if needed
    setScheduleTableData([]);

    setInternalScheduleDataState([]);
  };

  // Handle form submission
  const onSubmit = async (data) => {
    console.log("Form submitted:", data);
    console.log("Current Phase value:", data.current_phase_id);
    console.log("Project Type value:", data.project_type_id);

    // Validation: Project Manager and Alternative Project Manager cannot be the same
    if (data.project_manager_id && data.alternative_project_manager_id && 
        data.project_manager_id === data.alternative_project_manager_id) {
      toast.error("Project Manager and Alternative Project Manager cannot be the same person");
      return;
    }

    try {
      const selectedDepartmentIds = getSelectedDepartmentIds();
      const selectedObjectiveIds = objectives
        .filter((obj) => obj.checked)
        .map((obj) => obj.id);

      if (selectedDepartmentIds.length === 0) {
        toast.error("At least one beneficiary department must be selected");
        return;
      }
      if (selectedObjectiveIds.length === 0) {
        toast.error("At least one objective must be selected");
        return;
      }

      // Convert execution_duration to proper interval format for PostgreSQL
      let durationValue = parseInt(data.execution_duration, 10) || 0;
      let durationType = data.execution_duration_type || "weeks";
      let durationInDays = durationValue;
      if (durationType === "weeks") durationInDays = durationValue * 7;
      else if (durationType === "months") durationInDays = durationValue * 30;
      // else days, keep as is

      // Format as PostgreSQL interval: "30 days"
      const executionDurationInterval = `${durationInDays} days`;

      const projectData = {
        name: data.name,
        arabic_name: data.arabic_name,
        description: data.projectDescription,
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
        execution_duration: executionDurationInterval,
        maintenance_duration: data.maintenance_duration || null,
        approval_status: data.approval_status || "Not initiated",
      };

      console.log("Sending project data:", projectData);

      const projectResponse = await axiosInstance.post(
        `/data-management/addProject`,
        {
          data: projectData,
          userId: 1,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (projectResponse.data && projectResponse.data.status === "success") {
        const projectId = projectResponse.data.result.id;

        if (!projectId) {
          console.error(
            "No project ID in successful response:",
            projectResponse.data
          );
          throw new Error("Project ID missing from successful response");
        }

        console.log("Project saved with ID:", projectId);

        // Save beneficiary departments
        const beneficiaryResponse = await axiosInstance.post(
          `/data-management/addBeneficiaryDepartments`,
          {
            projectId,
            departmentIds: selectedDepartmentIds,
          }
        );

        if (beneficiaryResponse.data.status !== "success") {
          throw new Error(
            beneficiaryResponse.data.message ||
              "Failed to save beneficiary departments"
          );
        }

        // Save project objectives
        await axiosInstance.post(`/data-management/addProjectObjectives`, {
          projectId,
          objectiveIds: selectedObjectiveIds,
        });

        if (projectData.approval_status === "Not initiated") {
          toast.success("Project saved successfully!");
          // Don't close modal automatically - let user choose when to close
        }

        return projectResponse;
      } else {
        throw new Error(
          projectResponse.data?.message || "Failed to add project"
        );
      }
    } catch (error) {
      console.error("Project submission error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to add project";
      toast.error(errorMessage);
      throw error;
    }
  };

  // Helper function to determine which sections should be visible based on project type
  const shouldShowSection = useCallback(
    (section) => {
      // Early return if showing all sections
      if (activeSection === "all") {
        return true;
      }

      // Safely get project type name
      const currentProjectType = projectTypes.find(
        (type) => type.id.toString() === projectType?.toString()
      );
      const projectTypeName = currentProjectType?.name;

      // Define restricted categories (using both ID and name checks for redundancy)
      const isInternalOrPoC =
        ["1", "4"].includes(projectType?.toString()) ||
        ["Internal Project", "Proof of Concept"].includes(
          projectTypeName || ""
        );

      let isVisible;

      switch (section) {
        case "category":
          isVisible = !isInternalOrPoC;
          console.log("Category visibility:", {
            isInternalOrPoC,
            shouldShow: isVisible,
            reason: isInternalOrPoC
              ? "Hidden for Internal/PoC projects"
              : "Visible for other project types",
          });
          break;

        case "vendor":
          isVisible = [
            "Proof of Concept",
            "External Project",
            "Strategic Project",
          ].includes(projectTypeName || "");
          break;

        case "budget":
          isVisible =
            !isInternalOrPoC &&
            ["External Project", "Strategic Project"].includes(
              projectTypeName || ""
            );
          break;

        case "schedule":
          isVisible = ["External Project", "Strategic Project"].includes(
            projectTypeName || ""
          );
          break;

        case "internalSchedule":
          isVisible = isInternalOrPoC;
          break;

        default:
          isVisible = true;
      }

      console.log("Final visibility decision:", isVisible);
      console.groupEnd();
      return isVisible;
    },
    [projectType, currentPhase, activeSection, projectTypes]
  );

  // Toggle beneficiary department
  const toggleBeneficiaryDepartment = (deptId) => {
    const currentDepts = watch("beneficiaryDepartments");
    const updatedDepts = currentDepts.map((dept) =>
      dept.id === deptId ? { ...dept, checked: !dept.checked } : dept
    );
    setValue("beneficiaryDepartments", updatedDepts);
  };

  // Toggle objective
  const toggleObjective = (objectiveId) => {
    setObjectives((prevObjectives) =>
      prevObjectives.map((obj) =>
        obj.id === objectiveId ? { ...obj, checked: !obj.checked } : obj
      )
    );
  };

  // Function to handle department selection
  const handleDepartmentChange = (deptId) => {
    setDepartments((prevDepartments) =>
      prevDepartments.map((dept) =>
        dept.id === deptId ? { ...dept, checked: !dept.checked } : dept
      )
    );
  };

  // Function to get selected department IDs for submission
  const getSelectedDepartmentIds = () => {
    return departments.filter((dept) => dept.checked).map((dept) => dept.id);
  };

  const uploadDocuments = async (projectId, localFiles) => {
    console.log("Uploading documents for project ID:", projectId);

    if (localFiles.length === 0) {
      console.warn("No files to upload.");
      return; // Exit if there are no files to upload
    }

    // Get the current phase value from the form
    const currentPhase = watch("current_phase_id"); // Assuming you are using react-hook-form

    for (const { index, file } of localFiles) {
      if (!file) {
        console.error(`File at index ${index} is undefined.`);
        continue; // Skip this iteration if the file is not found
      }

      const formData = new FormData();
      formData.append("file", file); // Ensure this line is correct
      formData.append("project_id", projectId);
      formData.append("template_id", documents[index].id); // Ensure template_id is set
      formData.append("phase", currentPhase); // Add the current phase to FormData

      console.log("FormData before upload:", formData); // Debugging line

      const uploadResponse = await axiosInstance.post(
        `/data-management/addProjectDocument`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (uploadResponse.data && uploadResponse.data.status !== "success") {
        throw new Error(
          `Failed to upload document: ${uploadResponse.data.message}`
        );
      }
    }
  };

  // Sync upload status with saved project data
  useEffect(() => {
    if (savedProjectData) {
      console.log("Syncing upload status with saved project data:", savedProjectData);
      console.log("- project_schedule_uploaded:", savedProjectData.project_schedule_uploaded);
      console.log("- project_documents_uploaded:", savedProjectData.project_documents_uploaded);
      
      // Update local state based on backend data
      setScheduleUploadedSuccessfully(savedProjectData.project_schedule_uploaded === true);
      setDocumentsUploadedSuccessfully(savedProjectData.project_documents_uploaded === true);
    }
  }, [savedProjectData]);

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 shadow-md bg-white max-w-6xl mx-auto max-h-[90vh]">
      {/* Header - Fixed at the top */}
      <div className="flex justify-between items-center p-4 border-b bg-white sticky top-0 z-10">
        <h2 className="text-xl font-semibold">{title}</h2>
        {showButtons && (
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        )}
      </div>
      {/* Main Form - Scrollable */}
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
                placeholder=""
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
                placeholder=""
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
                errors.projectDescription ? "border-red-500" : "border-gray-300"
              } rounded h-24`}
              placeholder=""
              {...register("projectDescription", {
                required: "Project description is required",
              })}
            ></textarea>
            {errors.projectDescription && (
              <p className="text-red-500 text-xs mt-1">
                {errors.projectDescription.message}
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
                      className={`w-full p-2 border ${
                        errors.project_type_id
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded appearance-none bg-white`}
                      {...field}
                    >
                      <option value="" disabled>
                        Select Project Type
                      </option>
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
                      className={`w-full p-2 border ${
                        errors.current_phase_id
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded appearance-none bg-white`}
                      {...field}
                    >
                      <option value="" disabled>
                        Select Current Phase
                      </option>
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
              {/* Rest of the category section (e.g., Project Category radio buttons) */}
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <label
                    className={`block text-sm font-semibold mb-1 ${
                      isCategoryDisabled ? "opacity-50" : ""
                    }`}
                  >
                    Project Category{" "}
                    {isCategoryDisabled && "(Disabled for this project type)"}
                    <span className="text-red-500">*</span>
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
                            readOnly={readOnly || isCategoryDisabled}
                            type="radio"
                            className="mr-2"
                            value="Capex"
                            checked={field.value === "Capex"}
                            onChange={() => field.onChange("Capex")}
                            disabled={isCategoryDisabled}
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
                            readOnly={readOnly || isCategoryDisabled}
                            type="radio"
                            className="mr-2"
                            value="Opex"
                            checked={field.value === "Opex"}
                            onChange={() => field.onChange("Opex")}
                            disabled={isCategoryDisabled}
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
          {/* <div className="mb-6 border-t pt-4"> */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Assignee & communication</h3>
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
                      className={`w-full p-2 border ${
                        errors.project_manager_id
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded appearance-none bg-white`}
                      {...field}
                    >
                      <option disabled value="">
                        Select Project Manager
                      </option>
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
              {managerError && (
                <p className="text-red-500 text-xs mt-1">{managerError}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Beneficiary Department <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded p-2">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Beneficiary Departments
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 border rounded">
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <div key={dept.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`dept-${dept.id}`}
                            checked={dept.checked}
                            onChange={() => handleDepartmentChange(dept.id)}
                            className="mr-2"
                          />
                          <label
                            htmlFor={`dept-${dept.id}`}
                            className="text-sm text-gray-700"
                          >
                            {dept.name}{" "}
                            {dept.arabic_name ? `(${dept.arabic_name})` : ""}
                          </label>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500">
                        No departments available. Please add departments first.
                      </div>
                    )}
                  </div>
                </div>
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
                      className="w-full p-2 border border-gray-300 rounded appearance-none bg-white"
                      {...field}
                    >
                      <option value="">Select Alternative Manager</option>
                      {projectManagers.map((user) => (
                        <option
                          key={user.id}
                          value={user.id}
                          disabled={user.id === projectManager}
                        >
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
          </div>
          {shouldShowSection("vendor") && (
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label
                  className={`block text-sm font-semibold mb-1 ${
                    isVendorDisabled ? "opacity-50" : ""
                  }`}
                >
                  Vendor Name
                  {isVendorDisabled && (
                    <span>
                      {" "}
                      (Disabled for{" "}
                      {projectTypes.find(
                        (type) => type.id.toString() === projectType?.toString()
                      )?.name === "Internal Project" ||
                      projectTypes.find(
                        (type) => type.id.toString() === projectType?.toString()
                      )?.name === "Proof of Concept"
                        ? "this project type"
                        : "Planning/Bidding phase"}
                      )
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Controller
                    name="vendor_id"
                    control={control}
                    render={({ field }) => (
                      <select
                        className={`w-full p-2 border border-gray-300 rounded appearance-none bg-white ${
                          isVendorDisabled
                            ? "bg-gray-100 cursor-not-allowed"
                            : ""
                        }`}
                        {...field}
                        disabled={isVendorDisabled}
                      >
                        <option value="">Select Vendor</option>
                        {vendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.name}{" "}
                            {vendor.arabic_name
                              ? `(${vendor.arabic_name})`
                              : ""}
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
            </div>
          )}
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
                      <div
                        key={objective.id}
                        className="flex items-center mb-1"
                      >
                        <input
                          readOnly={readOnly}
                          type="checkbox"
                          id={`obj-${objective.id}`}
                          checked={objective.checked}
                          onChange={() => toggleObjective(objective.id)}
                          className="mr-2"
                        />
                        <label htmlFor={`obj-${objective.id}`}>
                          {objective.text}{" "}
                          {objective.arabic_text
                            ? `(${objective.arabic_text})`
                            : ""}
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
                      readOnly={readOnly}
                      type="text"
                      className={`w-full p-2 border ${
                        errors.project_budget
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded`}
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

          {/* Save Project Section */}
          {!savedProjectData && (
            <div className="mb-6 border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Save Project</h3>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600 mb-3">
                  Save your project to enable schedule plan upload and other features.
                </p>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={handleSaveDraft}
                  >
                    Save as draft
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    onClick={handleSaveAndSendForApproval}
                  >
                    Save project
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Plan Section */}
          <div className="mb-6 border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Schedule Plan</h3>
              {savedProjectData && (
                <span className={`text-sm px-2 py-1 rounded ${
                  scheduleUploadedSuccessfully 
                    ? "bg-green-100 text-green-800" 
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {scheduleUploadedSuccessfully ? "Uploaded" : "Not uploaded"}
                </span>
              )}
            </div>
            <div className="space-y-4">
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
                <div className={`p-4 border rounded-lg ${
                  savedProjectData 
                    ? "border-blue-200 bg-blue-50" 
                    : "border-gray-200 bg-gray-50"
                }`}>
                  <p className="text-sm text-gray-600 mb-3">
                    Add a schedule plan for this project. The project must be saved first before adding the schedule plan.
                  </p>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded ${
                      savedProjectData
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    onClick={handleOpenSchedulePlan}
                    disabled={!savedProjectData}
                  >
                    {savedProjectData ? "Upload Schedule Plan" : "Save Project First"}
                  </button>
                  {!savedProjectData && (
                    <p className="text-xs text-gray-500 mt-2">
                      Please save the project first to enable schedule plan upload
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Project Documents Section */}
          <div className="mb-6 border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Project Documents</h3>
              {savedProjectData && (
                <span className={`text-sm px-2 py-1 rounded ${
                  documentsUploadedSuccessfully 
                    ? "bg-green-100 text-green-800" 
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {documentsUploadedSuccessfully ? "Uploaded" : "Not uploaded"}
                </span>
              )}
            </div>
            <div className="space-y-4">
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
                <div className={`p-4 border rounded-lg ${
                  savedProjectData 
                    ? "border-blue-200 bg-blue-50" 
                    : "border-gray-200 bg-gray-50"
                }`}>
                  <p className="text-sm text-gray-600 mb-3">
                    Upload required documents for this project phase. The project must be saved first before uploading documents.
                  </p>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded ${
                      savedProjectData
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    onClick={handleOpenDocuments}
                    disabled={!savedProjectData}
                  >
                    {savedProjectData ? "Upload Documents" : "Save Project First"}
                  </button>
                  {!savedProjectData && (
                    <p className="text-xs text-gray-500 mt-2">
                      Please save the project first to enable document upload
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Send for Approval Section */}
          {savedProjectData && (
            <div className="mb-6 border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Send for Approval</h3>
              </div>
              <div className={`p-4 border rounded-lg ${
                scheduleUploadedSuccessfully && (documentsUploadedSuccessfully || (() => {
                  // Check if we need documents for this project type/phase
                  const currentPhaseId = savedProjectData.current_phase_id || savedProjectData.phase_id;
                  const projectTypeId = savedProjectData.project_type_id;
                  const projectType = projectTypes.find(p => String(p.id) === String(projectTypeId));
                  const isInternalProject = projectType?.name === "Internal Project" || projectType?.name === "Proof of Concept";
                  
                  // For now, assume documents may not be required for some cases
                  // The actual check will be done in handleSendForApproval
                  return true;
                })())
                  ? "border-green-200 bg-green-50" 
                  : "border-gray-200 bg-gray-50"
              }`}>
                {scheduleUploadedSuccessfully ? (
                  <div>
                    <p className="text-sm text-green-700 mb-3">
                      {documentsUploadedSuccessfully 
                        ? "Your project is ready for approval! Schedule plan and documents have been uploaded successfully."
                        : "Schedule plan uploaded successfully. Document requirements will be verified when you submit for approval."
                      }
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      onClick={handleSendForApproval}
                    >
                      Send for Approval
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">
                      Schedule plan is required to send for approval. Document requirements depend on your project type and phase.
                    </p>
                    <div className="text-xs text-gray-500 mb-3">
                      <p>Requirements:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li className={scheduleUploadedSuccessfully ? "text-green-600" : ""}>
                          {scheduleUploadedSuccessfully ? "✓" : "○"} Schedule plan uploaded (Required)
                        </li>
                        <li className={documentsUploadedSuccessfully ? "text-green-600" : "text-blue-600"}>
                          {documentsUploadedSuccessfully ? "✓" : "○"} Project documents uploaded (If applicable for your project type)
                        </li>
                      </ul>
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed"
                      disabled
                    >
                      Send for Approval
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Progress indicator after project is saved */}
          {savedProjectData && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Project Saved Successfully!
              </h3>
              <p className="text-green-700 mb-3">
                Project "{savedProjectData.name}" has been created with ID: {savedProjectData.id}
              </p>
              <div className="text-sm text-green-600">
                <p className="mb-1">Progress checklist:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li className="flex items-center">
                    <span className="text-green-600 mr-2">✓</span>
                    Project created and saved
                  </li>
                  <li className="flex items-center">
                    <span className={`mr-2 ${scheduleUploadedSuccessfully ? 'text-green-600' : 'text-gray-400'}`}>
                      {scheduleUploadedSuccessfully ? '✓' : '○'}
                    </span>
                    Add schedule plan {scheduleUploadedSuccessfully && '(completed)'}
                  </li>
                  <li className="flex items-center">
                    <span className={`mr-2 ${documentsUploadedSuccessfully ? 'text-green-600' : 'text-blue-600'}`}>
                      {documentsUploadedSuccessfully ? '✓' : '○'}
                    </span>
                    Upload project documents {documentsUploadedSuccessfully ? '(completed)' : '(if required for project type)'}
                  </li>
                  <li className="flex items-center">
                    <span className={`mr-2 ${scheduleUploadedSuccessfully ? 'text-green-600' : 'text-gray-400'}`}>
                      {scheduleUploadedSuccessfully ? '✓' : '○'}
                    </span>
                    Send for approval {scheduleUploadedSuccessfully ? '(ready)' : '(schedule plan required)'}
                  </li>
                </ul>
              </div>
            </div>
          )}
          
          {/* Form Footer */}
          {showButtons && (
            <div className="flex justify-end space-x-4 mt-6 border-t pt-4">
              {!savedProjectData ? (
                // Initial project creation - only show clear fields button
                <>
                  <button
                    type="button"
                    className="px-4 py-2 bg-red-100 text-red-900 rounded hover:bg-red-200"
                    onClick={handleClearFields}
                  >
                    Clear fields
                  </button>
                </>
              ) : (
                // After project is saved - show completion options and send for approval
                <>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    onClick={handleFinalClose}
                  >
                    Complete Later
                  </button>
                  {scheduleUploadedSuccessfully ? (
                    <button
                      type="button"
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      onClick={handleSendForApproval}
                    >
                      Send for Approval
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed"
                      disabled
                      title="Upload schedule plan first - documents are checked automatically"
                    >
                      Send for Approval
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </form>
      </div>
      
      {/* Schedule Plan Modal */}
      {showSchedulePlanModal && savedProjectData && (
        <ProjectSchedulePlanModal
          isOpen={showSchedulePlanModal}
          onClose={() => setShowSchedulePlanModal(false)}
          projectId={savedProjectData.id}
          projectName={savedProjectData.name}
          projectType={savedProjectData.project_type_id}
          projectBudget={(() => {
            // Get budget from various possible sources
            let budget = savedProjectData.project_budget || 
              savedProjectData.approved_project_budget || 
              (watch("project_budget") ? parseFloat(watch("project_budget")) : null) ||
              (watch("approved_budget") ? parseFloat(watch("approved_budget")) : null);
            
            // Ensure we have a valid positive number, use default if not
            budget = (budget && budget > 0) ? budget : 10000000;
            
            console.log("Final budget value for modal:", budget);
            return budget;
          })()}
          executionStartDate={savedProjectData.execution_start_date}
          executionDuration={savedProjectData.execution_duration}
          maintenanceDuration={savedProjectData.maintenance_duration}
          executionDurationType={savedProjectData.execution_duration_type}
          onSave={handleSchedulePlanSave}
        />
      )}

      {/* Project Documents Modal */}
      {showDocumentsModal && savedProjectData && (() => {
        // Get current phase with multiple fallbacks - prioritize current form value over saved data
        const currentPhaseId = watch("current_phase_id") || 
                              savedProjectData.current_phase_id || 
                              savedProjectData.phase_id || 
                              savedProjectData.currentPhase;
        
        console.log("Rendering ProjectDocumentsModal with currentPhase:", currentPhaseId);
        console.log("Form current_phase_id:", watch("current_phase_id"));
        console.log("Saved current_phase_id:", savedProjectData.current_phase_id);
        
        return (
          <ProjectDocumentsModal
            isOpen={showDocumentsModal}
            onClose={(hasUploads) => {
              setShowDocumentsModal(false);
              // If documents were uploaded, mark as successful
              if (hasUploads) {
                handleDocumentsSave();
              }
            }}
            projectId={savedProjectData.id}
            projectName={savedProjectData.name}
            currentPhase={currentPhaseId}
            isNewProject={true}
          />
        );
      })()}
    </div>
  );
};

export default ProjectModal;
