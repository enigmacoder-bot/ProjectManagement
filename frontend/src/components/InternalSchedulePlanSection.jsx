import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { addDays, format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axiosInstance from "../axiosInstance";
import { toast } from "sonner";

const InternalSchedulePlanSection = ({
  onScheduleChange,
  internalScheduleData = [],
  projectId,
}) => {
  const [internalSchedule, setInternalSchedule] = useState([]);
  const [activeTab] = useState("B. Days");
  const prevScheduleRef = useRef([]); // To track previous schedule and avoid infinite loops

  const { control, watch, setValue } = useForm({
    defaultValues: {
      executionStartDate: null,
    },
  });

  const executionStartDate = watch("executionStartDate");

  // Utility functions
  const convertToDays = useCallback((durationStr) => {
    const daysMatch = durationStr.match(/(\d+)\s*days?/i);
    if (daysMatch) return parseInt(daysMatch[1], 10);
    const weeksMatch = durationStr.match(/(\d+)\s*weeks?/i);
    if (weeksMatch) return parseInt(weeksMatch[1], 10) * 7;
    const monthsMatch = durationStr.match(/(\d+)\s*months?/i);
    if (monthsMatch) return parseInt(monthsMatch[1], 10) * 30;
    return 0;
  }, []);

  const convertDuration = useCallback((durationDays) => {
    if (durationDays <= 0) return "0 days";
    return `${durationDays} day${durationDays !== 1 ? "s" : ""}`;
  }, []);

  // Default internal schedule data
  const defaultInternalSchedule = useCallback(
    () => [
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
        id: 4,
        mainPhase: "Execution",
        subPhase: "Execute phase",
        duration: "28 days",
        durationDays: 28,
        startDate: null,
        endDate: null,
      },
    ],
    []
  );

  // Fetch internal schedule data
  useEffect(() => {
    const fetchInternalSchedule = async () => {
      if (!projectId) {
        setInternalSchedule(defaultInternalSchedule());
        return;
      }

      try {
        const response = await axiosInstance.post(
          `/data-management/getSchedulePlan`,
          { projectId }
        );

        if (response.data.status === "success" && response.data.result) {
          const fetchedData = response.data.result
            .filter((phase) => [1, 4].includes(phase.phase_id))
            .map((phase) => ({
              id: phase.phase_id,
              mainPhase: phase.main_phase,
              subPhase: phase.phase_name,
              duration: `${phase.duration_days} days`,
              durationDays: phase.duration_days,
              startDate: phase.start_date
                ? format(new Date(phase.start_date), "yyyy-MM-dd")
                : null,
              endDate: phase.end_date
                ? format(new Date(phase.end_date), "yyyy-MM-dd")
                : null,
            }));

          const mergedSchedule = defaultInternalSchedule().map(
            (defaultPhase) => {
              const fetchedPhase = fetchedData.find(
                (p) => p.id === defaultPhase.id
              );
              return fetchedPhase || defaultPhase;
            }
          );

          setInternalSchedule(mergedSchedule);
          prevScheduleRef.current = mergedSchedule;

          const executionPhase = fetchedData.find((p) => p.id === 4);
          if (executionPhase?.startDate) {
            setValue("executionStartDate", new Date(executionPhase.startDate));
          }
        } else {
          setInternalSchedule(defaultInternalSchedule());
          prevScheduleRef.current = defaultInternalSchedule();
        }
      } catch (error) {
        console.error("Error fetching internal schedule data:", error);
        toast.error("Failed to load internal schedule data");
        setInternalSchedule(defaultInternalSchedule());
        prevScheduleRef.current = defaultInternalSchedule();
      }
    };

    fetchInternalSchedule();
  }, [projectId, defaultInternalSchedule, setValue]);

  // Handle date calculations
  useEffect(() => {
    if (!executionStartDate) {
      setInternalSchedule((prev) =>
        prev.map((phase) => ({
          ...phase,
          startDate: null,
          endDate: null,
        }))
      );
      return;
    }

    setInternalSchedule((prev) => {
      const planningPhase = prev.find((p) => p.id === 1);
      const executionPhase = prev.find((p) => p.id === 4);

      if (!planningPhase || !executionPhase) return prev;

      const executionStart = new Date(executionStartDate);
      const executionEnd = addDays(executionStart, executionPhase.durationDays);
      const planningEnd = executionStart;
      const planningStart = addDays(planningEnd, -planningPhase.durationDays);

      const newSchedule = [...prev];
      newSchedule[prev.findIndex((p) => p.id === 1)] = {
        ...planningPhase,
        startDate: format(planningStart, "dd-MMM-yyyy"),
        endDate: format(planningEnd, "dd-MMM-yyyy"),
      };
      newSchedule[prev.findIndex((p) => p.id === 4)] = {
        ...executionPhase,
        startDate: format(executionStart, "dd-MMM-yyyy"),
        endDate: format(executionEnd, "dd-MMM-yyyy"),
      };

      // Only update if dates have changed to avoid infinite loop
      const prevDates = prevScheduleRef.current;
      const datesChanged =
        prevDates.length !== newSchedule.length ||
        prevDates.some(
          (phase, i) =>
            phase.startDate !== newSchedule[i].startDate ||
            phase.endDate !== newSchedule[i].endDate
        );

      if (!datesChanged) return prev;

      prevScheduleRef.current = newSchedule;
      return newSchedule;
    });
  }, [executionStartDate]); // Removed internalSchedule from dependencies

  // Notify parent of changes
  useEffect(() => {
    if (onScheduleChange) {
      onScheduleChange(internalSchedule);
    }
  }, [internalSchedule, onScheduleChange]);

  const handleInternalDurationChange = useCallback(
    (id, newDuration) => {
      const durationDays = convertToDays(newDuration);
      setInternalSchedule((prev) => {
        const updatedSchedule = prev.map((phase) =>
          phase.id === id
            ? {
                ...phase,
                duration: convertDuration(durationDays),
                durationDays,
              }
            : phase
        );
        prevScheduleRef.current = updatedSchedule; // Update ref to reflect new durations
        return updatedSchedule;
      });
    },
    [convertToDays, convertDuration]
  );

  const getDurationOptions = () => {
    return Array.from({ length: 90 }, (_, i) => ({
      value: `${i + 1} days`,
      label: `${i + 1} day${i + 1 > 1 ? "s" : ""}`,
    }));
  };

  return (
    <div className="mb-6 border-t pt-4">
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
                selected={value || null}
                onChange={onChange}
                dateFormat="dd-MMM-yyyy"
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
              <th className="border border-gray-300 p-2 text-left">End Date</th>
            </tr>
          </thead>
          <tbody>
            {internalSchedule.map((row) => (
              <tr
                key={row.id}
                className={
                  row.mainPhase === "Planning" ? "bg-green-100" : "bg-blue-100"
                }
              >
                <td className="border border-gray-300 p-2">{row.mainPhase}</td>
                <td className="border border-gray-300 p-2">{row.subPhase}</td>
                <td className="border border-gray-300 p-2 text-center">
                  <div className="relative w-24">
                    <select
                      className="w-full p-1 border border-gray-300 rounded appearance-none"
                      value={row.duration}
                      onChange={(e) =>
                        handleInternalDurationChange(row.id, e.target.value)
                      }
                    >
                      {getDurationOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDown size={16} />
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
  );
};

export default InternalSchedulePlanSection;
