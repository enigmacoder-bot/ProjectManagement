import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { X, Calendar, ChevronDown, ChevronUp, Download } from "lucide-react";
import Datepicker from "react-tailwindcss-datepicker";
import ProjectDocumentSection from "./ProjectDocumentSection";
import { toast } from "sonner";
import useAuthStore from "../store/authStore";
import axiosInstance from "../axiosInstance";
import SchedulePlanSection from "./SchedulePlanSection";
import InternalSchedulePlanSection from "./InternalSchedulePlanSection";
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
  const [viewMode, setViewMode] = useState("weeks");
  const { users, projectTypes, projectPhases, setDocuments, documents } =
    useAuthStore();
  // Initialize react-hook-form
  const [scheduleTableData, setScheduleTableData] = useState([]);
  const [internalScheduleDataState, setInternalScheduleDataState] = useState(
    []
  ); // For internal schedules
  const [departments, setDepartments] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [localFiles, setLocalFiles] = useState([]);
  const [durationOptions, setDurationOptions] = useState([]);
  const [phaseDurations, setPhaseDurations] = useState([]);
  const [selectedProgramDetails, setSelectedProgramDetails] = useState(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
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
    },
  });

  // console.log("Project Modal Users:", users);

  // Watch for changes in projectType and currentPhase
  const projectType = watch("projectType");
  const currentPhase = watch("currentPhase");
  const projectBudget = watch("project_budget"); // Assuming 'project_budget' is a field in your form

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

  // Fetch initiatives
  useEffect(() => {
    const fetchInitiatives = async () => {
      try {
        const response = await axiosInstance.post(
          `/data-management/getInitiatives`
        );
        if (response.data && response.data.status === "success") {
          setInitiatives(response.data.result);
          console.log("Initiatives loaded:", response.data.result);
        }
      } catch (error) {
        console.error("Error fetching initiatives:", error);
        toast.error("Failed to load initiatives");
      }
    };

    fetchInitiatives();
  }, []);

  // Fetch portfolios
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const response = await axiosInstance.post(
          `/data-management/getPortfolios`
        );
        if (response.data && response.data.status === "success") {
          setPortfolios(response.data.result);
          console.log("Portfolios loaded:", response.data.result);
        }
      } catch (error) {
        console.error("Error fetching portfolios:", error);
        toast.error("Failed to load portfolios");
      }
    };

    fetchPortfolios();
  }, []);

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

  // Watch the programName field and fetch details when it changes
  const selectedProgramId = watch("programName"); // Get the current value of programName

  useEffect(() => {
    fetchProgramDetails(selectedProgramId); // Fetch details whenever programName changes
  }, [selectedProgramId]);
  useEffect(() => {
    if (selectedProgramDetails) {
      setValue("portfolioName", selectedProgramDetails.portfolio_name || "");
      setValue("initiativeName", selectedProgramDetails.initiative_name || "");
    } else {
      setValue("portfolioName", "");
      setValue("initiativeName", "");
    }
  }, [selectedProgramDetails, setValue]);

  useEffect(() => {
    const currentPhase = watch("currentPhase");
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
  }, [watch("currentPhase"), projectPhases]);

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
  const handleScheduleChange = useCallback(
    (data) => {
      const isInternal = ["1", "4"].includes(projectType);
      if (isInternal) {
        setInternalScheduleDataState(data.schedule); // Store the full schedule array
        setValue("execution_duration", data.executionDuration); // e.g., "4"
        setValue(
          "execution_duration_type",
          data.executionDurationType || "weeks"
        );
        setValue("maintenance_duration", data.maintenanceDate); // e.g., "2025-04-04"
      } else {
        setScheduleTableData(data);
        setValue("execution_duration", data.executionDuration);
        setValue(
          "execution_duration_type",
          data.executionDurationType || "weeks"
        );
        setValue("maintenance_duration", data.maintenanceDate);
        setValue("execution_start_date", data.executionStartDate);
      }
    },
    [projectType, setValue]
  );

  const handleSaveDraft = async () => {
    await handleSubmit(
      async (data) => {
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

        try {
          const projectData = await onSubmit({
            ...data,
            approval_status: "Not initiated",
          });
          toast.success("Project saved as draft successfully!");
          onProjectAdded();
          if (onClose) onClose();
        } catch (error) {
          console.error("Error saving draft:", error);
          toast.error("Failed to save project as draft");
        }
      },
      (errors) => {
        if (errors.programName) toast.error(errors.programName.message);
        if (errors.portfolioName) toast.error(errors.portfolioName.message);
        if (errors.initiativeName) toast.error(errors.initiativeName.message);
      }
    )();
  };

  const handleSaveAndSendForApproval = async () => {
    await handleSubmit(
      async (data) => {
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

        try {
          const projectResponse = await onSubmit({
            ...data,
            approval_status: "Waiting on deputy",
          });
          const projectId = projectResponse?.data?.result?.id;
          if (!projectId) throw new Error("Project ID not found in response");

          const taskResponse = await axiosInstance.post(
            "/data-management/createProjectCreationTaskForDeputy",
            { projectId }
          );
          if (taskResponse.data && taskResponse.data.status === "success") {
            toast.success("Project saved and sent for approval successfully!");
            onProjectAdded();
            if (onClose) onClose();
          } else {
            throw new Error(
              taskResponse.data?.message || "Failed to create approval task"
            );
          }
        } catch (error) {
          console.error("Error saving and sending for approval:", error);
          toast.error(
            "Failed to save and send project for approval: " + error.message
          );
        }
      },
      (errors) => {
        if (errors.programName) toast.error(errors.programName.message);
        if (errors.portfolioName) toast.error(errors.portfolioName.message);
        if (errors.initiativeName) toast.error(errors.initiativeName.message);
      }
    )();
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

      // Convert execution_duration to days
      let durationValue = parseInt(data.execution_duration, 10) || 0;
      let durationType = data.execution_duration_type || "weeks";
      let durationInDays = durationValue;
      if (durationType === "weeks") durationInDays = durationValue * 7;
      else if (durationType === "months") durationInDays = durationValue * 30;
      // else days, keep as is

      const projectData = {
        name: data.name,
        arabic_name: data.arabic_name,
        description: data.projectDescription,
        project_type_id: parseInt(data.projectType) || null,
        current_phase_id: parseInt(data.currentPhase) || null,
        initiative_id: parseInt(data.initiativeName) || null,
        portfolio_id: parseInt(data.portfolioName) || null,
        program_id: parseInt(data.programName) || null,
        category: data.projectCategory,
        project_manager_id: parseInt(data.projectManager) || null,
        alternative_project_manager_id:
          parseInt(data.alternativeProjectManager) || null,
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
        execution_duration: durationInDays,
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

        // Upload documents
        await uploadDocuments(projectId, localFiles);
        console.log("Documents uploaded successfully");

        // Save schedule plan based on project type
        const isInternal = ["1", "4"].includes(projectType);
        if (isInternal && internalScheduleDataState.length > 0) {
          console.log("Saving internal schedule:", {
            projectId,
            schedule: internalScheduleDataState.map((phase) => ({
              phaseId: phase.id,
              durationDays: phase.durationDays,
              startDate: phase.startDate,
              endDate: phase.endDate,
            })),
            executionDuration: data.execution_duration,
            maintenanceDate: data.maintenance_duration,
          });

          const internalScheduleResponse = await axiosInstance.post(
            `/data-management/upsertInternalSchedulePlan`,
            {
              projectId,
              schedule: internalScheduleDataState.map((phase) => ({
                phaseId: phase.id,
                durationDays: phase.durationDays,
                startDate: phase.startDate,
                endDate: phase.endDate,
              })),
              executionDuration: data.execution_duration,
              maintenanceDate: data.maintenance_duration,
            }
          );

          if (
            internalScheduleResponse.data &&
            internalScheduleResponse.data.status !== "success"
          ) {
            throw new Error(
              internalScheduleResponse.data?.message ||
                "Failed to save internal schedule plan"
            );
          }
        } else if (scheduleTableData.schedule?.length > 0) {
          console.log("Saving regular schedule:", {
            projectId,
            execution_start_date: scheduleTableData.executionStartDate,
            execution_duration: `${scheduleTableData.executionDuration} weeks`,
            maintenance_duration: scheduleTableData.maintenanceDate,
            schedule: scheduleTableData.schedule.map((phase) => ({
              phaseId: phase.phaseId,
              durationDays: phase.durationDays,
              startDate: phase.startDate,
              endDate: phase.endDate,
            })),
          });

          const schedulePlanResponse = await axiosInstance.post(
            `/data-management/upsertSchedulePlan`,
            {
              projectId,
              execution_start_date: scheduleTableData.executionStartDate,
              execution_duration: `${scheduleTableData.executionDuration}`,
              maintenance_duration: scheduleTableData.maintenanceDate,
              schedule: scheduleTableData.schedule.map((phase) => ({
                phaseId: phase.phaseId,
                durationDays: phase.durationDays,
                startDate: phase.startDate,
                endDate: phase.endDate,
              })),
            }
          );

          if (
            schedulePlanResponse.data &&
            schedulePlanResponse.data.status !== "success"
          ) {
            throw new Error(
              schedulePlanResponse.data?.message ||
                "Failed to save schedule plan"
            );
          }
        }

        if (projectData.approval_status === "Not initiated") {
          toast.success("Project and schedule plan saved successfully!");
          if (onClose) onClose();
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
    const currentPhase = watch("currentPhase"); // Assuming you are using react-hook-form

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

  useEffect(() => {
    const fetchPhaseDurationsForBudget = async () => {
      if (projectBudget !== undefined && projectBudget !== null && projectBudget !== '') {
        // Ensure projectBudget is a full numeric value before sending
        const numericBudget = parseFloat(String(projectBudget).replace(/,/g, '')); // Clean up any commas if user inputs them

        if (isNaN(numericBudget)) {
          // console.log("Budget is not a valid number for fetching phases.");
          setDurationOptions([]); // Clear or handle appropriately
          return;
        }
        
        try {
          const response = await fetch(`${PORT}/data-management/getPhases`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ budget: numericBudget }), // Send full numeric budget
          });
          const data = await response.json();
          if (data.status === "success") {
            setPhaseDurations(data.data); // Assuming this state stores the fetched phase durations
            // You might need to transform this data for scheduleTableData or internalScheduleDataState
          } else {
            // console.error("Failed to fetch phase durations:", data.message);
            setPhaseDurations([]);
          }
        } catch (error) {
          // console.error("Error fetching phase durations:", error);
          setPhaseDurations([]);
        }
      } else {
        setPhaseDurations([]); // Clear durations if no budget
      }
    };

    fetchPhaseDurationsForBudget();
  }, [projectBudget, PORT]); // Re-fetch when projectBudget changes

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
        <form onSubmit={handleSubmit(onSubmit)}>
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
                  name="projectType"
                  control={control}
                  rules={{ required: "Project type is required" }}
                  render={({ field }) => (
                    <select
                      className={`w-full p-2 border ${
                        errors.projectType
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded appearance-none bg-white`}
                      {...field}
                    >
                      <option value="" disabled>
                        Select Project Type
                      </option>
                      <option value=""> </option>

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
              {errors.projectType && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.projectType.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Project Current Phase <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Controller
                  name="currentPhase"
                  control={control}
                  rules={{ required: "Current phase is required" }}
                  render={({ field }) => (
                    <select
                      className={`w-full p-2 border ${
                        errors.currentPhase
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
              {errors.currentPhase && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.currentPhase.message}
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
                      name="programName"
                      control={control}
                      rules={{ required: "Program name is required" }}
                      render={({ field }) => (
                        <select
                          className={`w-full p-2 border ${
                            errors.programName
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
                  {errors.programName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.programName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Portfolio Name
                  </label>
                  <Controller
                    name="portfolioName"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                        {...field}
                        value={field.value || ""} // Controlled by form state
                        readOnly
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Initiative Name
                  </label>
                  <Controller
                    name="initiativeName"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                        {...field}
                        value={field.value || ""} // Controlled by form state
                        readOnly
                      />
                    )}
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
                        name="projectCategory"
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
                        name="projectCategory"
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
                  {!isCategoryDisabled && errors.projectCategory && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.projectCategory.message}
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
                  name="projectManager"
                  control={control}
                  rules={{ required: "Project manager is required" }}
                  render={({ field }) => (
                    <select
                      className={`w-full p-2 border ${
                        errors.projectManager
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded appearance-none bg-white`}
                      {...field}
                    >
                      <option disabled value="">
                        Select Project Manager
                      </option>
                      <option value=""></option>
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
              {errors.projectManager && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.projectManager.message}
                </p>
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
                  name="alternativeProjectManager"
                  control={control}
                  render={({ field }) => (
                    <select
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
                      className={`block text-sm font-semibold mb-1 ${
                        isBudgetDisabled ? "opacity-50" : ""
                      }`}
                    >
                      Project Planned Budget(in AED)
                      {isBudgetRequired && !isBudgetDisabled && (
                        <span className="text-red-500"> *</span>
                      )}
                      {isBudgetDisabled && " (Disabled for this project type)"}
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
                          !isBudgetDisabled &&
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
                        isBudgetDisabled ? "opacity-50" : ""
                      }`}
                    >
                      Project Approved Budget(in AED)
                      {isBudgetDisabled && " (Disabled for this project type)"}
                    </label>
                    <input
                      readOnly={readOnly || isBudgetDisabled}
                      type="text"
                      className={`w-full p-2 border border-gray-300 rounded ${
                        isBudgetDisabled ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                      placeholder="Enter full amount. For example, 8,000,000 for 8 million."
                      {...register("approved_budget")}
                      disabled={isBudgetDisabled}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Schedule Plan */}
          {(shouldShowSection("schedule") ||
            shouldShowSection("internalSchedule")) &&
            (["1", "4"].includes(projectType) ? (
              <InternalSchedulePlanSection
                projectId={null}
                onScheduleChange={handleScheduleChange}
                internalScheduleData={internalScheduleData}
              />
            ) : (
              <SchedulePlanSection
                budget={watch("project_budget")}
                onScheduleChange={handleScheduleChange}
                projectType={watch("projectType")}
              />
            ))}
          {/* Documents Section */}
          <div className="mb-6 border-t pt-4">
            <ProjectDocumentSection
              projectPhase={watch("currentPhase")}
              formMethods={{ setValue, watch }}
              localFiles={localFiles}
              setLocalFiles={setLocalFiles}
              getCurrentPhaseDocumentTemplates={
                getCurrentPhaseDocumentTemplates
              }
            />
          </div>
          {/* Form Footer */}
          {showButtons && (
            <div className="flex justify-end space-x-4 mt-6 border-t pt-4">
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleSaveDraft}
              >
                Save as draft
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-green-100 text-green-900 rounded hover:bg-green-200"
                onClick={handleSaveAndSendForApproval}
              >
                Save and send for approval
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-100 text-red-900 rounded hover:bg-red-200"
                onClick={handleClearFields}
              >
                Clear fields
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
