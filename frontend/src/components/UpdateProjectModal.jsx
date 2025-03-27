import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import Datepicker from "react-tailwindcss-datepicker";
import UpdateProjectDocumentSection from "./UpdateProjectDocumentSection";
import { toast } from "sonner";
import useAuthStore from "../store/authStore";
import UpdateSchedulePlanSection from "./UpdateSchedulePlanSection";
import axiosInstance from "../axiosInstance";

const UpdateProjectModal = ({
  onClose,
  projectData,
  onUpdate,
  showButtons = true,
  title = "Update Project",
  readOnly = false,
}) => {
  const [activeSection, setActiveSection] = useState("all");
  const [scheduleTableData, setScheduleTableData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [localFiles, setLocalFiles] = useState([]);
  const [selectedProgramDetails, setSelectedProgramDetails] = useState(null);

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
      planned_budget: projectData?.project_budget?.toString() || "",
      approved_budget: projectData?.approved_project_budget?.toString() || "",
      execution_start_date: {
        startDate: projectData?.execution_start_date
          ? new Date(projectData.execution_start_date)
          : new Date(),
        endDate: projectData?.execution_start_date
          ? new Date(projectData.execution_start_date)
          : new Date(),
      },
      execution_duration: projectData?.execution_duration || "4 weeks",
      maintenance_duration: {
        startDate: projectData?.maintenance_duration
          ? new Date(projectData.maintenance_duration)
          : new Date(),
        endDate: projectData?.maintenance_duration
          ? new Date(projectData.maintenance_duration)
          : new Date(),
      },
      internal_start_date: {
        startDate: projectData?.execution_start_date
          ? new Date(projectData.execution_start_date)
          : new Date(),
        endDate: projectData?.execution_start_date
          ? new Date(projectData.execution_start_date)
          : new Date(),
      },
      documents: projectData?.documents || [],
    },
  });

  const projectType = watch("project_type_id");
  const currentPhase = watch("current_phase_id");
  const selectedProgramId = watch("program_id");

  // Fetch departments and beneficiary departments
  useEffect(() => {
    const fetchDepartmentsAndBeneficiaries = async () => {
      try {
        // Fetch all departments
        const deptResponse = await axiosInstance.post(
          `/data-management/getDepartments`
        );
        if (deptResponse.data.status !== "success") {
          throw new Error("Failed to fetch departments");
        }

        // Fetch current beneficiary departments for this project
        const beneficiaryResponse = await axiosInstance.post(
          `/data-management/getBeneficiaryDepartments`,
          { projectId: projectData.id }
        );
        if (beneficiaryResponse.data.status !== "success") {
          throw new Error("Failed to fetch beneficiary departments");
        }

        const beneficiaryDeptIds = beneficiaryResponse.data.result; // Array of department IDs

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
            .map((dept) => dept.id)
        ); // Set form value to array of checked IDs
      } catch (error) {
        console.error("Error fetching departments or beneficiaries:", error);
        toast.error("Failed to load departments or beneficiary data");
      }
    };

    if (projectData?.id) {
      fetchDepartmentsAndBeneficiaries();
    }
  }, [projectData?.id, setValue]);

  // Fetch initiatives
  useEffect(() => {
    const fetchInitiatives = async () => {
      try {
        const response = await axiosInstance.post(
          `/data-management/getInitiatives`
        );
        if (response.data.status === "success") {
          setInitiatives(response.data.result);
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
        if (response.data.status === "success") {
          setPortfolios(response.data.result);
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
          `/data-management/getPrograms`
        );
        if (response.data.status === "success") {
          setPrograms(response.data.result);
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
        if (response.data.status === "success") {
          setVendors(response.data.result);
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
        if (response.data.status === "success") {
          const fetchedObjectives = response.data.result.map((obj) => ({
            id: obj.id,
            text: obj.name,
            arabic_text: obj.arabic_name,
            checked:
              projectData?.objectives?.some((o) => o.id === obj.id) || false,
          }));
          setObjectives(fetchedObjectives);
          setValue("objectives", fetchedObjectives);
        }
      } catch (error) {
        console.error("Error fetching objectives:", error);
        toast.error("Failed to load objectives");
      }
    };
    fetchObjectives();
  }, [projectData?.objectives, setValue]);

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

  // Fetch documents based on current phase
  useEffect(() => {
    if (currentPhase) {
      const selectedPhase = projectPhases.find(
        (phase) => phase.id === parseInt(currentPhase, 10)
      );
      if (selectedPhase) {
        getCurrentPhaseDocumentTemplates(selectedPhase.name);
      }
    }
  }, [currentPhase, projectPhases]);

  const getCurrentPhaseDocumentTemplates = async (phase) => {
    try {
      const result = await axiosInstance.post(
        `/data-management/getCurrentPhaseDocumentTemplates`,
        { phase }
      );
      setDocuments(result.data.data);
      return result.data.data;
    } catch (error) {
      console.error("Error fetching document templates:", error);
      toast.error("Failed to load document templates");
      return [];
    }
  };

  const handleScheduleChange = (data) => {
    setScheduleTableData(data);
  };

  const onSubmit = async (data) => {
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
        project_budget: data.planned_budget
          ? parseFloat(data.planned_budget)
          : null,
        approved_project_budget: data.approved_budget
          ? parseFloat(data.approved_budget)
          : null,
        execution_start_date: data.execution_start_date?.startDate || null,
        execution_duration: data.execution_duration || null,
        maintenance_duration: data.maintenance_duration?.startDate || null,
      };

      const response = await axiosInstance.post(
        `/data-management/updateProject`,
        { id: projectData.id, data: updatedProjectData }
      );

      if (response.data.status === "success") {
        // Update beneficiary departments
        await axiosInstance.post(`/data-management/addBeneficiaryDepartments`, {
          projectId: projectData.id,
          departmentIds: selectedDepartmentIds,
        });

        // Upload documents if any
        if (localFiles.length > 0) {
          await uploadDocuments(projectData.id, localFiles);
        }

        // Update schedule if changed
        if (scheduleTableData.length > 0) {
          await axiosInstance.post(`/data-management/upsertSchedulePlan`, {
            projectId: projectData.id,
            schedule: scheduleTableData.map((phase) => ({
              phaseId: phase.phaseId,
              durationDays: phase.durationDays,
              startDate: phase.startDate,
              endDate: phase.endDate,
            })),
          });
        }

        toast.success("Project updated successfully!");
        onUpdate(updatedProjectData);
        onClose();
      } else {
        throw new Error(response.data.message || "Failed to update project");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update project");
    }
  };

  const shouldShowSection = (section) => {
    if (activeSection === "all") return true;
    switch (section) {
      case "category":
        return !["1", "4"].includes(projectType); // Internal (1), PoC (4)
      case "vendor":
        return ["2", "3", "4"].includes(projectType); // External (2), Strategic (3), PoC (4)
      case "budget":
        if (projectType === "1") return false; // Internal
        if (["1", "2"].includes(currentPhase)) return false; // Planning, Bidding
        return ["2", "3"].includes(projectType); // External, Strategic
      case "schedule":
        return ["2", "3"].includes(projectType); // External, Strategic
      case "internalSchedule":
        return ["1", "4"].includes(projectType); // Internal, PoC
      default:
        return true;
    }
  };

  const handleDepartmentChange = (deptId) => {
    setDepartments((prev) =>
      prev.map((dept) =>
        dept.id === deptId ? { ...dept, checked: !dept.checked } : dept
      )
    );
    // Update form value with array of checked department IDs
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

  const uploadDocuments = async (projectId, localFiles) => {
    for (const { index, file } of localFiles) {
      if (!file) continue;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("project_id", projectId);
      formData.append("template_id", documents[index].id);
      formData.append(
        "phase",
        projectPhases.find((p) => p.id === parseInt(currentPhase))?.name ||
          "Unknown"
      );

      const response = await axiosInstance.post(
        `/data-management/addProjectDocument`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response.data.status !== "success") {
        throw new Error(`Failed to upload document: ${response.data.message}`);
      }
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
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <X size={20} />
          </button>
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
                  <label className="block text-sm font-semibold mb-1">
                    Project Category <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <Controller
                        name="category"
                        control={control}
                        rules={{ required: "Project category is required" }}
                        render={({ field }) => (
                          <input
                            disabled={readOnly}
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
                    <label className="flex items-center">
                      <Controller
                        name="category"
                        control={control}
                        render={({ field }) => (
                          <input
                            disabled={readOnly}
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
                  {errors.category && (
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
                        {users.map((user) => (
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
                        {users.map((user) => (
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
                  <label className="block text-sm font-semibold mb-1">
                    Vendor Name
                  </label>
                  <div className="relative">
                    <Controller
                      name="vendor_id"
                      control={control}
                      render={({ field }) => (
                        <select
                          disabled={readOnly}
                          className="w-full p-2 border border-gray-300 rounded appearance-none bg-white"
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
                    <label className="block text-sm font-semibold mb-1">
                      Project Planned Budget
                    </label>
                    <input
                      readOnly={readOnly}
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded"
                      {...register("planned_budget")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Project Approved Budget
                    </label>
                    <input
                      readOnly={readOnly}
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded"
                      {...register("approved_budget")}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Plan */}
          {(shouldShowSection("schedule") ||
            shouldShowSection("internalSchedule")) && (
            <UpdateSchedulePlanSection
              projectId={projectData.id}
              budget={watch("approved_budget")}
              onScheduleChange={handleScheduleChange}
              projectData={projectData}
              projectType={projectType}
            />
          )}

          {/* Documents Section */}
          <div className="mb-6 border-t pt-4">
            <UpdateProjectDocumentSection
              projectId={projectData.id}
              projectPhaseId={currentPhase}
              phaseName={
                projectPhases.find((p) => p.id === parseInt(currentPhase))?.name
              }
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
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default UpdateProjectModal;
