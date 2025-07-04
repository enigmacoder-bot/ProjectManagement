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
  const [initiatives, setInitiatives] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
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

  const { users, projectTypes, projectPhases, setDocuments, documents } =
    useAuthStore();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      id: projectData?.id || "",
      name: projectData?.name || "",
      arabic_name: projectData?.arabic_name || "",
      description: projectData?.description || "",
      project_type_id: projectData?.project_type_id?.toString() || "",
      current_phase_id: projectData?.current_phase_id?.toString() || "",
      initiative_id: projectData?.initiative_id?.toString() || "",
      portfolio_id: projectData?.portfolio_id?.toString() || "",
      program_id: projectData?.program_id?.toString() || "",
      category: projectData?.category || "",
      project_manager_id: projectData?.project_manager_id?.toString() || "",
      alternative_project_manager_id:
        projectData?.alternative_project_manager_id?.toString() || "",
      vendor_id: projectData?.vendor_id?.toString() || "",
      beneficiaryDepartments: [],
      objectives: [],
      project_budget: projectData?.project_budget?.toString() || "",
      approved_budget: projectData?.approved_project_budget?.toString() || "",
      execution_start_date: {
        startDate: projectData?.execution_start_date
          ? new Date(projectData.execution_start_date)
          : null,
        endDate: projectData?.execution_start_date
          ? new Date(projectData.execution_start_date)
          : null,
      },
      execution_duration: projectData?.execution_duration
        ? parseInt(String(projectData.execution_duration).split(" ")[0])
        : "4", // Ensure execution_duration is treated as a string before split
      maintenance_duration: projectData?.maintenance_duration
        ? new Date(projectData.maintenance_duration)
        : null,
      internal_start_date: {
        startDate: projectData?.execution_start_date
          ? new Date(projectData.execution_start_date)
          : null,
        endDate: projectData?.execution_start_date
          ? new Date(projectData.execution_start_date)
          : null,
      },
    },
  });

  console.log("Project data:", projectData);

  const projectType = watch("project_type_id");
  const currentPhase = watch("current_phase_id");
  const selectedProgramId = watch("program_id");

  const projectManagers = useMemo(() => {
    return users.filter((user) => user.role_name === "PM");
  }, [users]);

  const isVendorDisabled = useMemo(() => {
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

  const isCategoryDisabled = useMemo(() => {
    const restrictedTypes = ["Internal Project", "Proof of Concept"];
    const currentType = projectTypes.find(
      (type) => type.id.toString() === projectType?.toString()
    );
    return restrictedTypes.includes(currentType?.name || "");
  }, [projectType, projectTypes]);


  // Fetch departments and beneficiary departments
  useEffect(() => {
    const fetchDepartmentsAndBeneficiaries = async () => {
      try {
        const deptResponse = await axiosInstance.post(
          `/data-management/getDepartments`
        );
        const beneficiaryResponse = await axiosInstance.post(
          `/data-management/getBeneficiaryDepartments`,
          { projectId: projectData.id }
        );

        const beneficiaryDeptIds = beneficiaryResponse.data.result || [];
        const fetchedDepartments = deptResponse.data.result.map((dept) => ({
          id: dept.id,
          name: dept.name,
          arabic_name: dept.arabic_name,
          checked: beneficiaryDeptIds.includes(dept.id),
        }));

        setDepartments(fetchedDepartments);
        setValue(
          "beneficiaryDepartments",
          fetchedDepartments
            .filter((dept) => dept.checked)
            .map((dept) => dept.id),
          { shouldDirty: false }
        );
      } catch (error) {
        console.error("Error fetching departments or beneficiaries:", error);
        toast.error("Failed to load departments or beneficiary data");
      }
    };

    if (projectData?.id) {
      fetchDepartmentsAndBeneficiaries();
    }
  }, [projectData?.id, setValue]);

  // Fetch other dropdown data
  useEffect(() => {
    const fetchInitiatives = async () => {
      const response = await axiosInstance.post(
        `/data-management/getInitiatives`
      );
      if (response.data.status === "success")
        setInitiatives(response.data.result);
    };
    fetchInitiatives();
  }, []);

  useEffect(() => {
    const fetchPortfolios = async () => {
      const response = await axiosInstance.post(
        `/data-management/getPortfolios`
      );
      if (response.data.status === "success")
        setPortfolios(response.data.result);
    };
    fetchPortfolios();
  }, []);

  useEffect(() => {
    const fetchPrograms = async () => {
      const response = await axiosInstance.post(`/data-management/getPrograms`);
      if (response.data.status === "success") setPrograms(response.data.result);
    };
    fetchPrograms();
  }, []);

  useEffect(() => {
    const fetchVendors = async () => {
      const response = await axiosInstance.post(`/data-management/getVendors`);
      if (response.data.status === "success") setVendors(response.data.result);
    };
    fetchVendors();
  }, []);

  useEffect(() => {
    const fetchObjectives = async () => {
      const response = await axiosInstance.post(
        `/data-management/getObjectives`
      );
      if (response.data.status === "success") {
        const projectObjectivesResponse = await axiosInstance.post(
          `/data-management/getProjectObjectives`,
          { projectId: projectData.id }
        );
        const projectObjectiveIds =
          projectObjectivesResponse.data.status === "success"
            ? projectObjectivesResponse.data.result.map((o) => o.id)
            : [];
        const fetchedObjectives = response.data.result.map((obj) => ({
          id: obj.id,
          text: obj.name,
          arabic_text: obj.arabic_name,
          checked: projectObjectiveIds.includes(obj.id),
        }));
        setObjectives(fetchedObjectives);
        setValue("objectives", fetchedObjectives, { shouldDirty: false });
      }
    };
    if (projectData?.id) fetchObjectives();
  }, [projectData?.id, setValue]);

  // Fetch program details
  const fetchProgramDetails = async (programId) => {
    if (!programId) {
      setSelectedProgramDetails(null);
      return;
    }
    try {
      const response = await axiosInstance.post(
        "/data-management/getProgramDetails",
        { program_id: programId }
      );
      if (response.data.status === "success") {
        setSelectedProgramDetails(response.data.result);
      }
    } catch (error) {
      console.error("Error fetching program details:", error);
      toast.error("Failed to load program details");
    }
  };

  useEffect(() => {
    fetchProgramDetails(selectedProgramId);
  }, [selectedProgramId]);

  const onSubmit = async (data, sendForApproval = false) => {
    try {
      const selectedDepartmentIds = departments
        .filter((dept) => dept.checked)
        .map((dept) => dept.id);
      if (selectedDepartmentIds.length === 0) {
        toast.error("At least one beneficiary department must be selected");
        return;
      }
      const selectedObjectiveIds = objectives
        .filter((obj) => obj.checked)
        .map((obj) => obj.id);

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
          projectId: projectData.id,
          objectiveIds: selectedObjectiveIds,
        });

        toast.success(
          sendForApproval
            ? "Project saved and sent for approval successfully!"
            : "Project updated successfully!"
        );
        onUpdate(updatedProjectData);
        onClose();
        return response;
      } else {
        throw new Error(response.data.message || "Failed to update project");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update project");
      throw error;
    }
  };

  const handleSaveAndSendForApproval = async (data) => {
    try {
      await onSubmit(data, true);
      const projectId = projectData.id;
      const taskResponse = await axiosInstance.post(
        "/data-management/createProjectCreationTaskForDeputy",
        { projectId }
      );
      if (taskResponse.data.status === "success") {
        toast.success("Project saved and sent for approval successfully!");
        onClose();
      } else {
        throw new Error("Failed to create approval task");
      }
    } catch (error) {
      console.error("Error saving and sending for approval:", error);
      toast.error("Failed to save and send project for approval");
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

  const shouldShowSection = (section) => {
    if (activeSection === "all") return true;
    switch (section) {
      case "category":
        return !["1", "4"].includes(projectType);
      case "vendor":
        return ["2", "3", "4"].includes(projectType);
      case "budget":
        if (projectType === "1") return false;
        if (["1", "2"].includes(currentPhase)) return false;
        return ["2", "3"].includes(projectType);
      default:
        return true;
    }
  };

  if (!projectData?.id) {
    return (
      <div className="flex flex-col rounded-lg border border-gray-200 shadow-md bg-white max-w-6xl mx-auto max-h-[90vh] p-4">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <p>Loading project data...</p>
      </div>
    );
  }

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
                      {projectPhases.map((phase) => (
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
                    Program Name
                  </label>
                  <div className="relative">
                    <Controller
                      name="program_id"
                      control={control}
                      render={({ field }) => (
                        <select
                          disabled={readOnly}
                          className="w-full p-2 border border-gray-300 rounded appearance-none bg-white"
                          {...field}
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
                  Beneficiary Department <span className="text-red-500">*</span>
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
                  Objectives
                </label>
                <div className="border border-gray-300 rounded p-2 max-h-40 overflow-y-auto">
                  {objectives.map((objective) => (
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
                  ))}
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
                      Project Planned Budget (In AED)
                      {isBudgetDisabled && " (Disabled for this project type)"}
                    </label>
                    <input
                      readOnly={readOnly || isBudgetDisabled}
                      type="number"
                      className={`w-full p-2 border border-gray-300 rounded ${
                        isBudgetDisabled ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                      {...register("project_budget")}
                      disabled={isBudgetDisabled}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-semibold mb-1 ${
                        isBudgetDisabled ? "opacity-50" : ""
                      }`}
                    >
                      Project Approved Budget (In AED)
                      {isBudgetDisabled && " (Disabled for this project type)"}
                    </label>
                    <input
                      readOnly={readOnly || isBudgetDisabled}
                      type="number"
                      className={`w-full p-2 border border-gray-300 rounded ${
                        isBudgetDisabled ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                      {...register("approved_budget")}
                      disabled={isBudgetDisabled}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Footer */}
          {showButtons && (
            <div className="flex justify-end space-x-4 mt-6 border-t pt-4">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update Project
              </button>
              {projectData.approval_status === "Not initiated" && (
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  onClick={handleSubmit(handleSaveAndSendForApproval)}
                >
                  Save and Send for Approval
                </button>
              )}
              {/* New update document and schedule buttons */}
              <button
                type="button"
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                onClick={() => setIsProjectDocumentsModalOpen(true)}
              >
                Update Documents
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                onClick={() => setIsProjectSchedulePlanModalOpen(true)}
              >
                Update Schedule
              </button>
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
          currentPhase={projectData.current_phase_id}
          isNewProject={false} // This is an existing project being updated
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
          executionStartDate={
            projectData.execution_start_date
              ? new Date(projectData.execution_start_date)
              : null
          }
          executionDuration={
            projectData.execution_duration
              ? parseInt(String(projectData.execution_duration).split(" ")[0], 10)
              : null
          }
          maintenanceDate={
            projectData.maintenance_duration
              ? new Date(projectData.maintenance_duration)
              : null
          }
          executionDurationType={
            projectData.execution_duration
              ? String(projectData.execution_duration).split(" ")[1]
              : 'weeks'
          }
        />
      )}
    </div>
  );
};

export default UpdateProjectModal;
