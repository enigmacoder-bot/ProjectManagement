import React, { useState, useEffect, useCallback } from "react";
import { X, Save, Calendar, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "../axiosInstance";
import { useForm, Controller } from "react-hook-form";
import Datepicker from "react-tailwindcss-datepicker";
import {
  addDays,
  format,
  isValid,
  parseISO,
  subDays,
} from "date-fns";

const ProjectSchedulePlanModal = ({ 
  isOpen, 
  onClose, 
  projectId, 
  projectName,
  projectType,
  projectBudget,
  executionStartDate: initialStartDate,
  executionDuration: initialDuration,
  maintenanceDate: initialMaintenanceDate,
  executionDurationType: initialDurationType,
  onSave
}) => {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("B. Days");
  const [phases, setPhases] = useState([]);
  const [durationTypes, setDurationTypes] = useState({});
  const [totalDurationUnit, setTotalDurationUnit] = useState("days");

  const isInternalSchedule = ["1", "4"].includes(projectType?.toString());

  const {
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
    register,
  } = useForm({
    defaultValues: {
      executionStartDate: initialStartDate || null,
      executionDuration: initialDuration ? String(initialDuration) : "4",
      maintenanceDate: initialMaintenanceDate || null,
      execution_duration_type: initialDurationType || "weeks"
    }
  });

  const executionStartDate = watch("executionStartDate");
  const executionDuration = watch("executionDuration");
  const maintenanceDate = watch("maintenanceDate");
  const executionDurationType = watch("execution_duration_type");

  const totalDurationDays = React.useMemo(() => {
    if (
      executionStartDate &&
      maintenanceDate &&
      isValid(new Date(executionStartDate)) &&
      isValid(new Date(maintenanceDate))
    ) {
      const diffTime = Math.abs(
        new Date(maintenanceDate) - new Date(executionStartDate)
      );
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays + 1; // Inclusive of start and end date
    }
    return 0;
  }, [executionStartDate, maintenanceDate]);

  const getTotalDurationDisplay = () => {
    if (totalDurationUnit === "days") {
      return `${totalDurationDays} day${totalDurationDays !== 1 ? "s" : ""}`;
    }
    if (totalDurationUnit === "weeks") {
      const weeks = (totalDurationDays / 7).toFixed(1);
      return `${weeks} week${weeks !== "1.0" ? "s" : ""}`;
    }
    if (totalDurationUnit === "months") {
      const months = (totalDurationDays / 30.44).toFixed(1);
      return `${months} month${months !== "1.0" ? "s" : ""}`;
    }
    return `${totalDurationDays} days`;
  };

  const subtractDays = (date, days) => {
    if (!date || !isValid(date)) return null;
    return subDays(new Date(date), days);
  };

  const convertToDays = useCallback((durationStr, currentUnit) => {
    if (!durationStr) return 0;

    const daysMatch = durationStr.match(/(\d+)\s*days?/i);
    if (daysMatch) return parseInt(daysMatch[1], 10);

    const weeksMatch = durationStr.match(/(\d+)\s*weeks?/i);
    if (weeksMatch) return parseInt(weeksMatch[1], 10) * 7;

    const monthsMatch = durationStr.match(/(\d+)\s*months?/i);
    if (monthsMatch) return parseInt(monthsMatch[1], 10) * 30;

    return 0;
  }, []);

  const convertDuration = useCallback((durationDays, targetUnit) => {
    if (durationDays <= 0) return "0 days";
    if (targetUnit === "B. Days") {
      return `${durationDays} day${durationDays !== 1 ? "s" : ""}`;
    } else if (targetUnit === "Weeks") {
      const weeks = Math.round(durationDays / 7);
      return `${weeks} week${weeks !== 1 ? "s" : ""}`;
    } else if (targetUnit === "Months") {
      const months = Math.round(durationDays / 30);
      return `${months} month${months !== 1 ? "s" : ""}`;
    }
    return `${durationDays} days`;
  }, []);

  const getDurationOptions = (type) => {
    if (type === "B. Days") {
      return Array.from({ length: 90 }, (_, i) => {
        const days = i + 1;
        return {
          value: `${days} day${days > 1 ? "s" : ""}`,
          label: `${days} day${days > 1 ? "s" : ""}`,
        };
      });
    } else if (type === "Weeks") {
      return Array.from({ length: 12 }, (_, i) => {
        const weeks = i + 1;
        return {
          value: `${weeks} week${weeks > 1 ? "s" : ""}`,
          label: `${weeks} week${weeks > 1 ? "s" : ""}`,
        };
      });
    } else if (type === "Months") {
      return Array.from({ length: 12 }, (_, i) => {
        const months = i + 1;
        return {
          value: `${months} month${months > 1 ? "s" : ""}`,
          label: `${months} month${months > 1 ? "s" : ""}`,
        };
      });
    }
    return [];
  };

  const handleDurationChange = useCallback(
    (phaseId, newDuration, newType) => {
      const currentUnit = durationTypes[phaseId] || activeTab;
      const updatedType = newType || currentUnit;
      const durationDays = convertToDays(newDuration, updatedType);

      setDurationTypes((prevTypes) => ({
        ...prevTypes,
        [phaseId]: updatedType,
      }));

      const updatedDuration = convertDuration(durationDays, updatedType);

      const updatedSchedule = scheduleData.map((phase) =>
        (phase.phaseId || phase.phase_id) === phaseId
          ? { ...phase, duration: updatedDuration, durationDays }
          : phase
      );
      setScheduleData(updatedSchedule);
    },
    [convertToDays, convertDuration, activeTab, scheduleData, durationTypes]
  );

  useEffect(() => {
    if (isOpen && projectId) {
      if (isInternalSchedule) {
        loadInternalSchedule();
      } else {
        loadExternalSchedule();
      }
    }
  }, [isOpen, projectId, isInternalSchedule]);

  useEffect(() => {
    if (
      !executionStartDate ||
      !isValid(new Date(executionStartDate)) ||
      scheduleData.length === 0
    ) {
      return;
    }

    const reversedSchedule = [...scheduleData].reverse();
    let nextPhaseStartDate = new Date(executionStartDate);

    const updatedScheduleReversed = reversedSchedule.map((row) => {
      const durationDays = row.durationDays || 0;
      const endDate = subDays(nextPhaseStartDate, 0); // Corrected: No gap
      const startDate = subDays(
        endDate,
        durationDays > 0 ? durationDays - 1 : 0
      );

      nextPhaseStartDate = startDate;

      return {
        ...row,
        startDate: startDate,
        endDate: endDate,
      };
    });

    const updatedSchedule = updatedScheduleReversed.reverse();

    if (JSON.stringify(updatedSchedule) !== JSON.stringify(scheduleData)) {
      setScheduleData(updatedSchedule);
    }
  }, [
    executionStartDate,
    JSON.stringify(scheduleData.map((s) => s.durationDays)),
  ]);

  const loadInternalSchedule = async () => {
    setLoading(true);
    try {
      // Load existing internal schedule
      const response = await axiosInstance.post(
        "/data-management/getInternalSchedulePlan",
        { projectId }
      );

      if (response.data.status === "success") {
        const scheduleResult = response.data.result;
        setScheduleData(scheduleResult);
        
        // Set form values
        if (response.data.execution_duration) {
          setValue("executionDuration", response.data.execution_duration.split(" ")[0]);
          setValue("execution_duration_type", response.data.execution_duration.split(" ")[1] || "weeks");
        }
        if (response.data.maintenance_date) {
          setValue("maintenanceDate", new Date(response.data.maintenance_date));
        }
      } else {
        // Initialize default internal schedule
        setScheduleData([
          {
            phase_id: 1,
            main_phase: "Planning",
            phase_name: "Prepare scope",
            duration_days: 28,
            start_date: null,
            end_date: null
          },
          {
            phase_id: 4,
            main_phase: "Execution", 
            phase_name: "Execute phase",
            duration_days: 28,
            start_date: null,
            end_date: null
          }
        ]);
      }
    } catch (error) {
      console.error("Error loading internal schedule:", error);
      toast.error("Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  };

  const loadExternalSchedule = async () => {
    setLoading(true);
    try {
      const budgetValue = parseFloat(projectBudget) || 0;
      const phasesResponse = await axiosInstance.post(
        "/data-management/getSchedulePhases",
        { budget: budgetValue }
      );

      let schedule = [];
      if (phasesResponse.data.status === "success") {
        const phases = phasesResponse.data.result;
        setPhases(phases);
        schedule = phases.map((phase) => ({
          phaseId: phase.id,
          mainPhase: phase.main_phase,
          subPhase: phase.phase_name,
          duration: `${phase.duration_days || 7} days`,
          durationDays: phase.duration_days || 7,
          startDate: null,
          endDate: null,
        }));
      } else {
        toast.error(phasesResponse.data.message || "Failed to fetch phases.");
      }

      const scheduleResponse = await axiosInstance.post(
        "/data-management/getSchedulePlan",
        { projectId }
      );

      if (
        scheduleResponse.data.status === "success" &&
        scheduleResponse.data.result.length > 0
      ) {
        const existingSchedule = scheduleResponse.data.result.map((plan) => ({
          phaseId: plan.phase_id,
          mainPhase: plan.main_phase,
          subPhase: plan.phase_name,
          duration: `${plan.duration_days} days`,
          durationDays: plan.duration_days,
          startDate: plan.start_date ? new Date(plan.start_date) : null,
          endDate: plan.end_date ? new Date(plan.end_date) : null,
        }));
        setScheduleData(existingSchedule);
      } else if (schedule.length > 0) {
        setScheduleData(schedule);
      }
    } catch (error) {
      console.error("Error loading external schedule:", error);
      toast.error("Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData) => {
    if (scheduleData.length === 0) {
      toast.error("No schedule data to save");
      return;
    }

    setSaving(true);
    try {
      if (isInternalSchedule) {
        // Save internal schedule
        const response = await axiosInstance.post(
          "/data-management/upsertInternalSchedulePlan",
          {
            projectId,
            schedule: scheduleData.map(phase => ({
              phaseId: phase.phase_id,
              durationDays: phase.duration_days,
              startDate: phase.start_date ? phase.start_date.toISOString().split('T')[0] : null,
              endDate: phase.end_date ? phase.end_date.toISOString().split('T')[0] : null
            })),
            executionDuration: `${executionDuration} ${executionDurationType}`,
            maintenanceDate: maintenanceDate ? maintenanceDate.toISOString().split('T')[0] : null
          }
        );

        if (response.data.status === "success") {
          toast.success("Internal schedule plan saved successfully!");
          onClose();
        } else {
          throw new Error(response.data.message || "Failed to save schedule");
        }
      } else {
        // Save external schedule
        const response = await axiosInstance.post(
          "/data-management/upsertSchedulePlan",
          {
            projectId,
            schedule: scheduleData.map(phase => ({
              phaseId: phase.phaseId,
              durationDays: phase.durationDays,
              startDate: phase.startDate ? phase.startDate.toISOString().split('T')[0] : null,
              endDate: phase.endDate ? phase.endDate.toISOString().split('T')[0] : null
            })),
            execution_duration: `${executionDuration} ${executionDurationType}`,
            maintenance_duration: maintenanceDate ? maintenanceDate.toISOString().split('T')[0] : null,
            execution_start_date: executionStartDate ? executionStartDate.toISOString().split('T')[0] : null
          }
        );

        if (response.data.status === "success") {
          toast.success("Schedule plan saved successfully!");
          onClose();
        } else {
          throw new Error(response.data.message || "Failed to save schedule");
        }
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error("Failed to save schedule: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getRowColor = (mainPhase) => {
    switch (mainPhase) {
      case "Planning":
        return "bg-green-50";
      case "Bidding":
        return "bg-blue-50";
      case "Before execution":
        return "bg-yellow-50";
      default:
        return "bg-white";
    }
  };

  useEffect(() => {
    if (isOpen) {
      console.log('ProjectSchedulePlanModal opened with initial values:', { initialStartDate, initialDuration, initialMaintenanceDate, initialDurationType });
      // Use form setValue instead of direct state setters
      setValue("executionStartDate", initialStartDate || '');
      setValue("executionDuration", initialDuration?.toString() || '');
      setValue("maintenanceDate", initialMaintenanceDate || '');
      setValue("execution_duration_type", initialDurationType || 'weeks');
    }
  }, [isOpen, initialStartDate, initialDuration, initialMaintenanceDate, initialDurationType, setValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">
              {isInternalSchedule ? "Internal" : "External"} Project Schedule
              Plan
            </h2>
            <p className="text-gray-600">
              Configure schedule for: {projectName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Execution Start Date <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="executionStartDate"
                  control={control}
                  rules={{ required: "Execution start date is required" }}
                  render={({ field }) => (
                    <Datepicker
                      value={
                        field.value
                          ? { startDate: field.value, endDate: field.value }
                          : null
                      }
                      onChange={(newValue) =>
                        field.onChange(newValue?.startDate)
                      }
                      useRange={false}
                      asSingle={true}
                      placeholder="Select start date"
                      inputClassName="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                />
                {errors.executionStartDate && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.executionStartDate.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Execution Duration <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    className={`w-full p-2 border ${
                      errors.executionDuration
                        ? "border-red-500"
                        : "border-gray-300"
                    } rounded`}
                    placeholder="Enter duration"
                    {...register("executionDuration", {
                      required: "Execution duration is required",
                    })}
                  />
                  <select
                    className="p-2 border border-gray-300 rounded"
                    {...register("execution_duration_type")}
                    defaultValue="weeks"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
                {errors.executionDuration && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.executionDuration.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Maintenance Date
                </label>
                <Controller
                  name="maintenanceDate"
                  control={control}
                  render={({ field }) => (
                    <Datepicker
                      value={
                        field.value
                          ? { startDate: field.value, endDate: field.value }
                          : null
                      }
                      onChange={(newValue) =>
                        field.onChange(newValue?.startDate)
                      }
                      useRange={false}
                      asSingle={true}
                      placeholder="Select maintenance date"
                      inputClassName="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Total Completion Duration
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                    value={getTotalDurationDisplay()}
                    readOnly
                    tabIndex={-1}
                  />
                  <select
                    className="p-2 border border-gray-300 rounded"
                    value={totalDurationUnit}
                    onChange={(e) => setTotalDurationUnit(e.target.value)}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-3 text-left">Main Phase</th>
                    <th className="border p-3 text-left">Sub Phase</th>
                    <th className="border p-3 text-center">Duration</th>
                    <th className="border p-3 text-left">Start Date</th>
                    <th className="border p-3 text-left">End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleData.map((phase, index) => (
                    <tr
                      key={index}
                      className={getRowColor(phase.main_phase || phase.mainPhase)}
                    >
                      <td className="border p-3 font-medium">
                        {phase.main_phase || phase.mainPhase}
                      </td>
                      <td className="border p-3">
                        {phase.phase_name || phase.subPhase}
                      </td>
                      <td className="border p-3">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <select
                              className="w-full p-1 border border-gray-300 rounded appearance-none"
                              value={phase.duration}
                              onChange={(e) =>
                                handleDurationChange(
                                  phase.phase_id || phase.phaseId,
                                  e.target.value,
                                  durationTypes[
                                    phase.phase_id || phase.phaseId
                                  ] || activeTab
                                )
                              }
                            >
                              {getDurationOptions(
                                durationTypes[
                                  phase.phase_id || phase.phaseId
                                ] || activeTab
                              ).map((option) => (
                                <option
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                              <ChevronUp size={16} />
                            </div>
                          </div>
                          <div className="relative flex-1">
                            <select
                              className="w-full p-1 border border-gray-300 rounded appearance-none"
                              value={
                                durationTypes[
                                  phase.phase_id || phase.phaseId
                                ] || activeTab
                              }
                              onChange={(e) =>
                                handleDurationChange(
                                  phase.phase_id || phase.phaseId,
                                  phase.duration,
                                  e.target.value
                                )
                              }
                            >
                              {["B. Days", "Weeks", "Months"].map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                              <ChevronUp size={16} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="border p-3">
                        {(phase.start_date || phase.startDate) &&
                        isValid(new Date(phase.start_date || phase.startDate))
                          ? format(
                              new Date(phase.start_date || phase.startDate),
                              "dd-MMM-yyyy"
                            )
                          : "-"}
                      </td>
                      <td className="border p-3">
                        {(phase.end_date || phase.endDate) &&
                        isValid(new Date(phase.end_date || phase.endDate))
                          ? format(
                              new Date(phase.end_date || phase.endDate),
                              "dd-MMM-yyyy"
                            )
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <Save size={16} />
                )}
                {saving ? "Saving..." : "Save Schedule"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProjectSchedulePlanModal;
