import React, { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import axios from "axios";
import { addDays, format } from "date-fns";
import { toast } from "sonner";
import axiosInstance from "../axiosInstance";
import DatePicker from "react-datepicker"; // Import react-datepicker
import "react-datepicker/dist/react-datepicker.css"; // Import CSS

const PORT = import.meta.env.VITE_PORT;

const projectTypeMapping = {
  1: "Internal Project",
  2: "External Project",
  3: "Strategic Project",
  4: "Proof of Concept",
};

const SchedulePlanSection = ({
  projectId,
  budget,
  onScheduleChange,
  internalScheduleData = [],
  projectType,
}) => {
  const projectTypeValue = projectTypeMapping[projectType];
  const isInternalSchedule = ["1", "4"].includes(projectType);

  const [activeTab, setActiveTab] = useState("B. Days");
  const [phases, setPhases] = useState([]);
  const [scheduleTableData, setScheduleTableData] = useState([]);
  const [internalSchedule, setInternalSchedule] = useState([]);
  const [durationTypes, setDurationTypes] = useState({});

  const {
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      executionStartDate: null, // Default to null, updated later if needed
      executionDuration: "28 days", // Default to 4 weeks in days
      maintenanceDate: null,
    },
  });

  const executionStartDate = watch("executionStartDate");

  // Initialize internal schedule data
  useEffect(() => {
    if (isInternalSchedule && internalScheduleData.length > 0) {
      const initialInternalSchedule = internalScheduleData.map((row) => ({
        ...row,
        durationDays: convertToDays(row.duration),
        startDate: null,
        endDate: null,
      }));
      setInternalSchedule(initialInternalSchedule);
    } else if (isInternalSchedule) {
      setInternalSchedule([
        {
          id: 1,
          mainPhase: "Planning",
          subPhase: "Prepare scope",
          duration: "28 days",
          durationDays: 28,
          startDate: null,
          endDate: null,
        },
        {
          id: 2,
          mainPhase: "Execution",
          subPhase: "Execute phase",
          duration: "28 days",
          durationDays: 28,
          startDate: null,
          endDate: null,
        },
      ]);
    }
  }, [isInternalSchedule, internalScheduleData]);

  // Fetch phases with default durations based on budget
  useEffect(() => {
    const fetchPhases = async () => {
      if (!budget) return;

      try {
        const response = await axiosInstance.post(
          `/data-management/getSchedulePhases`,
          { budget }
        );
        if (response.data.status === "success") {
          setPhases(response.data.result);
          const initialSchedule = response.data.result.map((phase) => {
            const durationDays = phase.duration_days || 7;
            return {
              phaseId: phase.id,
              mainPhase: phase.main_phase,
              subPhase: phase.phase_name,
              duration: convertDuration(durationDays, activeTab),
              durationDays,
              startDate: null,
              endDate: null,
            };
          });
          setScheduleTableData(initialSchedule);
        } else {
          throw new Error("Failed to fetch phases");
        }
      } catch (error) {
        console.error("Error fetching phases:", error);
        toast.error("Failed to load phases");
        setPhases([
          {
            id: 1,
            main_phase: "Planning",
            phase_name: "Prepare RFP",
            duration_days: 7,
          },
          {
            id: 2,
            main_phase: "Planning",
            phase_name: "RFP Releasing Procedures",
            duration_days: 7,
          },
          {
            id: 3,
            main_phase: "Bidding",
            phase_name: "Bidding Duration",
            duration_days: 7,
          },
          {
            id: 4,
            main_phase: "Bidding",
            phase_name: "Technical and financial evaluation",
            duration_days: 7,
          },
          {
            id: 5,
            main_phase: "Bidding",
            phase_name: "Contract preparation",
            duration_days: 7,
          },
          {
            id: 6,
            main_phase: "Before execution",
            phase_name: "Waiting period before execution starts",
            duration_days: 7,
          },
        ]);
        setScheduleTableData([
          {
            phaseId: 1,
            mainPhase: "Planning",
            subPhase: "Prepare RFP",
            duration: "7 days",
            durationDays: 7,
            startDate: null,
            endDate: null,
          },
          {
            phaseId: 2,
            mainPhase: "Planning",
            subPhase: "RFP Releasing Procedures",
            duration: "7 days",
            durationDays: 7,
            startDate: null,
            endDate: null,
          },
          {
            phaseId: 3,
            mainPhase: "Bidding",
            subPhase: "Bidding Duration",
            duration: "7 days",
            durationDays: 7,
            startDate: null,
            endDate: null,
          },
          {
            phaseId: 4,
            mainPhase: "Bidding",
            subPhase: "Technical and financial evaluation",
            duration: "7 days",
            durationDays: 7,
            startDate: null,
            endDate: null,
          },
          {
            phaseId: 5,
            mainPhase: "Bidding",
            subPhase: "Contract preparation",
            duration: "7 days",
            durationDays: 7,
            startDate: null,
            endDate: null,
          },
          {
            phaseId: 6,
            mainPhase: "Before execution",
            subPhase: "Waiting period before execution starts",
            duration: "7 days",
            durationDays: 7,
            startDate: null,
            endDate: null,
          },
        ]);
      }
    };
    fetchPhases();
  }, [budget, activeTab]);

  // Fetch existing schedule plan for the project
  useEffect(() => {
    const fetchSchedulePlan = async () => {
      if (!projectId) return;

      try {
        const response = await axiosInstance.post(
          `/data-management/getSchedulePlan`,
          { params: { projectId } }
        );
        if (
          response.data.status === "success" &&
          response.data.result.length > 0
        ) {
          const fetchedSchedule = response.data.result.map((plan) => ({
            phaseId: plan.phase_id,
            mainPhase: plan.main_phase,
            subPhase: plan.phase_name,
            duration: convertDuration(plan.duration_days, activeTab),
            durationDays: plan.duration_days,
            startDate: plan.start_date
              ? format(new Date(plan.start_date), "dd-MMM-yyyy")
              : null,
            endDate: plan.end_date
              ? format(new Date(plan.end_date), "dd-MMM-yyyy")
              : null,
          }));
          setScheduleTableData(fetchedSchedule);

          const lastPhase = fetchedSchedule[fetchedSchedule.length - 1];
          if (lastPhase.endDate) {
            setValue("executionStartDate", new Date(lastPhase.endDate));
          }
        }
      } catch (error) {
        console.error("Error fetching schedule plan:", error);
        toast.error("Failed to load existing schedule plan");
      }
    };

    fetchSchedulePlan();
  }, [projectId, setValue, activeTab]);

  // Calculate dates based on execution start date
  useEffect(() => {
    if (!executionStartDate) {
      setScheduleTableData((prev) =>
        prev.map((phase) => ({
          ...phase,
          startDate: null,
          endDate: null,
        }))
      );
      return;
    }

    const updatedSchedule = [...scheduleTableData];
    let currentEndDate = new Date(executionStartDate);

    for (let i = updatedSchedule.length - 1; i >= 0; i--) {
      const phase = updatedSchedule[i];
      const startDate = addDuration(currentEndDate, phase.durationDays);

      updatedSchedule[i] = {
        ...phase,
        endDate: format(currentEndDate, "dd-MMM-yyyy"),
        startDate: startDate ? format(startDate, "dd-MMM-yyyy") : "N/A",
      };

      if (startDate) {
        currentEndDate = new Date(startDate);
      } else {
        for (let j = i - 1; j >= 0; j--) {
          updatedSchedule[j] = {
            ...updatedSchedule[j],
            startDate: "N/A",
            endDate: "N/A",
          };
        }
        break;
      }
    }

    setScheduleTableData(updatedSchedule);
  }, [executionStartDate]);

  // Notify parent component of schedule changes
  useEffect(() => {
    if (onScheduleChange) {
      if (isInternalSchedule) {
        onScheduleChange(internalSchedule);
      } else {
        onScheduleChange(scheduleTableData);
      }
    }
  }, [
    scheduleTableData,
    internalSchedule,
    onScheduleChange,
    isInternalSchedule,
  ]);

  const convertToDays = (durationStr) => {
    const daysMatch = durationStr.match(/(\d+)\s*days?/i);
    if (daysMatch) return parseInt(daysMatch[1], 10);
    const weeksMatch = durationStr.match(/(\d+)\s*weeks?/i);
    if (weeksMatch) return parseInt(weeksMatch[1], 10) * 7;
    const monthsMatch = durationStr.match(/(\d+)\s*months?/i);
    if (monthsMatch) return parseInt(monthsMatch[1], 10) * 30;
    return 0;
  };

  const addDuration = (date, durationDays) => {
    if (!date || durationDays <= 0) return null;
    return addDays(date, -durationDays);
  };

  // Handle internal schedule date calculations
  useEffect(() => {
    if (
      !executionStartDate ||
      !isInternalSchedule ||
      internalSchedule.length === 0
    ) {
      return;
    }

    const executionPhaseIndex = internalSchedule.findIndex(
      (phase) => phase.mainPhase === "Execution"
    );
    if (executionPhaseIndex === -1) return;

    const updatedSchedule = [...internalSchedule];
    const executionPhase = updatedSchedule[executionPhaseIndex];

    const executionEndDate = new Date(executionStartDate);
    const phaseStartDate = addDuration(
      executionEndDate,
      executionPhase.durationDays
    );

    updatedSchedule[executionPhaseIndex] = {
      ...executionPhase,
      endDate: format(executionEndDate, "dd-MMM-yyyy"),
      startDate: phaseStartDate ? format(phaseStartDate, "dd-MMM-yyyy") : null,
    };

    const planningPhaseIndex = internalSchedule.findIndex(
      (phase) => phase.mainPhase === "Planning"
    );
    if (planningPhaseIndex !== -1) {
      const planningPhase = updatedSchedule[planningPhaseIndex];
      const planningEndDate = phaseStartDate;
      const planningStartDate = addDuration(
        planningEndDate,
        planningPhase.durationDays
      );

      updatedSchedule[planningPhaseIndex] = {
        ...planningPhase,
        endDate: planningEndDate
          ? format(planningEndDate, "dd-MMM-yyyy")
          : null,
        startDate: planningStartDate
          ? format(planningStartDate, "dd-MMM-yyyy")
          : null,
      };
    }

    setInternalSchedule(updatedSchedule);
  }, [executionStartDate, isInternalSchedule, internalSchedule]);

  const handleInternalDurationChange = (id, newDuration) => {
    const durationDays = convertToDays(newDuration);
    const updatedSchedule = internalSchedule.map((phase) =>
      phase.id === id
        ? {
            ...phase,
            duration: convertDuration(durationDays, activeTab),
            durationDays,
          }
        : phase
    );
    setInternalSchedule(updatedSchedule);

    if (executionStartDate) {
      const executionPhaseIndex = updatedSchedule.findIndex(
        (phase) => phase.mainPhase === "Execution"
      );
      if (executionPhaseIndex === -1) return;

      const tempSchedule = [...updatedSchedule];
      const executionPhase = tempSchedule[executionPhaseIndex];
      const executionEndDate = new Date(executionStartDate);
      const phaseStartDate = addDuration(
        executionEndDate,
        executionPhase.durationDays
      );

      tempSchedule[executionPhaseIndex] = {
        ...executionPhase,
        endDate: format(executionEndDate, "dd-MMM-yyyy"),
        startDate: phaseStartDate
          ? format(phaseStartDate, "dd-MMM-yyyy")
          : null,
      };

      const planningPhaseIndex = tempSchedule.findIndex(
        (phase) => phase.mainPhase === "Planning"
      );
      if (planningPhaseIndex !== -1) {
        const planningPhase = tempSchedule[planningPhaseIndex];
        const planningEndDate = phaseStartDate;
        const planningStartDate = addDuration(
          planningEndDate,
          planningPhase.durationDays
        );

        tempSchedule[planningPhaseIndex] = {
          ...planningPhase,
          endDate: planningEndDate
            ? format(planningEndDate, "dd-MMM-yyyy")
            : null,
          startDate: planningStartDate
            ? format(planningStartDate, "dd-MMM-yyyy")
            : null,
        };
      }

      setInternalSchedule(tempSchedule);
    }
  };

  const handleDurationChange = (phaseId, newDuration, newType) => {
    const durationDays = convertToDays(newDuration);
    const updatedSchedule = scheduleTableData.map((phase) =>
      phase.phaseId === phaseId
        ? {
            ...phase,
            duration: convertDuration(durationDays, newType || activeTab),
            durationDays,
          }
        : phase
    );

    setDurationTypes((prevTypes) => ({ ...prevTypes, [phaseId]: newType }));

    if (executionStartDate) {
      let currentEndDate = new Date(executionStartDate);
      const tempSchedule = [...updatedSchedule];

      for (let i = tempSchedule.length - 1; i >= 0; i--) {
        const phase = tempSchedule[i];
        const startDate = addDuration(currentEndDate, phase.durationDays);

        tempSchedule[i] = {
          ...phase,
          endDate: format(currentEndDate, "dd-MMM-yyyy"),
          startDate: startDate ? format(startDate, "dd-MMM-yyyy") : "N/A",
        };

        if (startDate) {
          currentEndDate = new Date(startDate);
        } else {
          for (let j = i - 1; j >= 0; j--) {
            tempSchedule[j] = {
              ...tempSchedule[j],
              startDate: "N/A",
              endDate: "N/A",
            };
          }
          break;
        }
      }
      setScheduleTableData(tempSchedule);
    } else {
      setScheduleTableData(updatedSchedule);
    }
  };

  const convertDuration = (durationDays, targetUnit) => {
    if (durationDays <= 0) return "0 days";
    if (targetUnit === "B. Days")
      return `${durationDays} day${durationDays !== 1 ? "s" : ""}`;
    if (targetUnit === "Weeks") {
      const weeks = Math.floor(durationDays / 7);
      const remainingDays = durationDays % 7;
      return remainingDays === 0
        ? `${weeks} week${weeks !== 1 ? "s" : ""}`
        : `${weeks} week${weeks !== 1 ? "s" : ""} ${remainingDays} day${
            remainingDays !== 1 ? "s" : ""
          }`;
    }
    if (targetUnit === "Months") {
      const months = Math.floor(durationDays / 30);
      const remainingDays = durationDays % 30;
      return remainingDays === 0
        ? `${months} month${months !== 1 ? "s" : ""}`
        : `${months} month${months !== 1 ? "s" : ""} ${remainingDays} day${
            remainingDays !== 1 ? "s" : ""
          }`;
    }
    return `${durationDays} days`;
  };

  const getDurationOptions = (type) => {
    if (type === "B. Days") {
      return Array.from({ length: 90 }, (_, i) => ({
        value: `${i + 1} day${i + 1 > 1 ? "s" : ""}`,
        label: `${i + 1} day${i + 1 > 1 ? "s" : ""}`,
      }));
    } else if (type === "Weeks") {
      return Array.from({ length: 12 }, (_, i) => {
        const days = (i + 1) * 7;
        return {
          value: `${days} days`,
          label: `${i + 1} week${i + 1 > 1 ? "s" : ""}`,
        };
      });
    } else if (type === "Months") {
      return Array.from({ length: 12 }, (_, i) => {
        const days = (i + 1) * 30;
        return {
          value: `${days} days`,
          label: `${i + 1} month${i + 1 > 1 ? "s" : ""}`,
        };
      });
    }
    return Array.from({ length: 90 }, (_, i) => ({
      value: `${i + 1} day${i + 1 > 1 ? "s" : ""}`,
      label: `${i + 1} day${i + 1 > 1 ? "s" : ""}`,
    }));
  };

  const getRowColor = (mainPhase) => {
    switch (mainPhase) {
      case "Planning":
        return "bg-green-100";
      case "Bidding":
        return "bg-blue-100";
      case "Before execution":
        return "bg-orange-100";
      default:
        return "bg-white";
    }
  };

  const tabButtonStyle = (tab) =>
    `px-3 py-1 ${
      activeTab === tab ? "bg-blue-100 text-blue-800 font-medium" : ""
    }`;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const updatedSchedule = scheduleTableData.map((phase) => ({
      ...phase,
      duration: convertDuration(phase.durationDays, tab),
    }));
    setScheduleTableData(updatedSchedule);

    const updatedInternalSchedule = internalSchedule.map((phase) => ({
      ...phase,
      duration: convertDuration(phase.durationDays, tab),
    }));
    setInternalSchedule(updatedInternalSchedule);
  };

  return (
    <div className="mb-6 border-t pt-4">
      {isInternalSchedule ? (
        <div>
          <h3 className="font-semibold mb-4">Internal Project Schedule Plan</h3>
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Execution Targeted Start Date
              </label>
              <Controller
                name="executionStartDate"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <DatePicker
                    showIcon
                    selected={value || null} // Use form value or null
                    onChange={(date) => onChange(date)} // Update form state directly
                    dateFormat="dd-MMM-yyyy" // Match your display format
                    placeholderText="Select date"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                )}
              />
            </div>
          </div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 text-left">
                    Main Phase
                  </th>
                  <th className="border border-gray-300 p-2 text-left">
                    Sub Phase
                  </th>
                  <th className="border border-gray-300 p-2 text-center">
                    Duration
                  </th>
                  <th className="border border-gray-300 p-2 text-left">
                    Start Date
                  </th>
                  <th className="border border-gray-300 p-2 text-left">
                    End Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {internalSchedule.map((row, index) => (
                  <tr
                    key={index}
                    className={
                      row.mainPhase === "Planning"
                        ? "bg-green-100"
                        : row.mainPhase === "Execution"
                        ? "bg-blue-100"
                        : "bg-white"
                    }
                  >
                    <td className="border border-gray-300 p-2">
                      {row.mainPhase}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {row.subPhase}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      <div className="flex items-center justify-center">
                        <div className="relative w-24">
                          <select
                            className="w-full p-1 border border-gray-300 rounded appearance-none"
                            value={row.duration}
                            onChange={(e) =>
                              handleInternalDurationChange(
                                row.id,
                                e.target.value
                              )
                            }
                          >
                            {getDurationOptions(activeTab).map(
                              (option, idx) => (
                                <option key={idx} value={option.value}>
                                  {option.label}
                                </option>
                              )
                            )}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                            <ChevronUp size={16} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="border border-gray-300 p-2">
                      {row.startDate || "N/A"}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {row.endDate || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Schedule Plan</h3>
            <div className="flex border border-gray-300 rounded">
              {["B. Days", "Weeks", "Months"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`${tabButtonStyle(tab)} ${
                    tab === "B. Days"
                      ? "rounded-l"
                      : tab === "Months"
                      ? "rounded-r"
                      : ""
                  }`}
                  onClick={() => handleTabChange(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Execution Targeted Start Date
              </label>
              <Controller
                name="executionStartDate"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <DatePicker
                    showIcon
                    selected={value || null}
                    onChange={(date) => onChange(date)}
                    dateFormat="dd-MMM-yyyy"
                    placeholderText="Select date"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Execution Duration <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Controller
                  name="executionDuration"
                  control={control}
                  rules={{ required: "Execution duration is required" }}
                  render={({ field }) => (
                    <select
                      className={`w-full p-2 border ${
                        errors.executionDuration
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded appearance-none bg-white`}
                      {...field}
                    >
                      {getDurationOptions(activeTab).map((option, idx) => (
                        <option key={idx} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronUp size={16} />
                </div>
              </div>
              {errors.executionDuration && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.executionDuration.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Maintenance & Operation Duration{" "}
                <span className="text-red-500">*</span>
              </label>
              <Controller
                name="maintenanceDate"
                control={control}
                rules={{ required: "Maintenance date is required" }}
                render={({ field: { onChange, value } }) => (
                  <DatePicker
                    showIcon
                    selected={value || null}
                    onChange={(date) => onChange(date)}
                    dateFormat="dd-MMM-yyyy"
                    placeholderText="Select date"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                )}
              />
              {errors.maintenanceDate && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.maintenanceDate.message}
                </p>
              )}
            </div>
          </div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 text-left">
                    Main Phase
                  </th>
                  <th className="border border-gray-300 p-2 text-left">
                    Sub Phase
                  </th>
                  <th className="border border-gray-300 p-2 text-center">
                    Duration
                  </th>
                  <th className="border border-gray-300 p-2 text-left">
                    Start Date
                  </th>
                  <th className="border border-gray-300 p-2 text-left">
                    End Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {scheduleTableData.map((row, index) => (
                  <tr key={index} className={getRowColor(row.mainPhase)}>
                    <td className="border border-gray-300 p-2">
                      {row.mainPhase}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {row.subPhase}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <select
                            className="w-full p-1 border border-gray-300 rounded appearance-none"
                            value={row.duration}
                            onChange={(e) =>
                              handleDurationChange(
                                row.phaseId,
                                e.target.value,
                                durationTypes[row.phaseId] || activeTab
                              )
                            }
                          >
                            {getDurationOptions(
                              durationTypes[row.phaseId] || activeTab
                            ).map((option, idx) => (
                              <option key={idx} value={option.value}>
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
                            value={durationTypes[row.phaseId] || activeTab}
                            onChange={(e) =>
                              handleDurationChange(
                                row.phaseId,
                                row.duration,
                                e.target.value
                              )
                            }
                          >
                            {["B. Days", "Weeks", "Months"].map((type, idx) => (
                              <option key={idx} value={type}>
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
                    <td className="border border-gray-300 p-2">
                      {row.startDate || "N/A"}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {row.endDate || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePlanSection;
