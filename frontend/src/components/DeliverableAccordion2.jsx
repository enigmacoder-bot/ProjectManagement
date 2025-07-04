import React, { useState, useEffect } from "react";
import { Disclosure, Transition } from "@headlessui/react";
import axiosInstance from "../axiosInstance";
import { toast } from "sonner";
import { formatCurrency, formatAmount, parseCurrency, convertToFullAmount, formatAmountForInput, parseInputAmount } from "../utils/currencyUtils";

// Helper function to convert deliverable amount from database format to full amount
const convertDeliverableAmountToFullAmount = (amount) => {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return 0;
  
  // If the amount is small (typically <= 100), assume it's in millions format
  if (numericAmount > 0 && numericAmount <= 100) {
    return numericAmount * 1000000;
  }
  return numericAmount;
};

// Helper function to convert full amount back to database storage format for deliverables
const convertFullAmountToDeliverableAmount = (fullAmount) => {
  const numericAmount = parseFloat(fullAmount);
  if (isNaN(numericAmount)) return 0;
  
  // If the amount is >= 1 million, convert to millions format for storage
  if (numericAmount >= 1000000) {
    return numericAmount / 1000000;
  }
  return numericAmount;
};

// Helper function to convert item unit_amount from database format to full amount
const convertItemUnitAmountToFullAmount = (unitAmount) => {
  const numericAmount = parseFloat(unitAmount);
  if (isNaN(numericAmount)) return 0;
  
  // If the unit amount is small (typically <= 100), assume it's in millions format
  if (numericAmount > 0 && numericAmount <= 100) {
    return numericAmount * 1000000;
  }
  return numericAmount;
};

// Helper function to format duration properly
const formatDuration = (duration) => {
  if (!duration) return "0 days";
  
  const numericDuration = parseFloat(duration);
  if (isNaN(numericDuration)) return "0 days";
  
  // If duration is already formatted with days, return as is
  if (typeof duration === 'string' && duration.includes('day')) {
    return duration;
  }
  
  // If duration is less than 1 month or exactly 1 month, show in days for clarity
  if (numericDuration <= 1) {
    const days = Math.round(numericDuration * 30.436875); // More accurate days per month
    return `${days} days`;
  }
  
  // For durations >= 1 month, we have options:
  
  // Option 1: For whole months, show as "X months"
  if (numericDuration % 1 === 0) {
    return `${Math.round(numericDuration)} months`;
  } 
  
  // Option 2: For smaller fractional months (< 2), show in days for better understanding
  else if (numericDuration < 2) {
    const days = Math.round(numericDuration * 30.436875);
    return `${days} days`;
  }
  
  // Option 3: For larger durations with fractions, show in a more understandable format
  else {
    // Convert to days if it's clearer (especially for values like 1.2 months)
    const days = Math.round(numericDuration * 30.436875);
    
    // If close to a whole number of months, round to months
    if (Math.abs(numericDuration - Math.round(numericDuration)) < 0.1) {
      return `${Math.round(numericDuration)} months`;
    } 
    // Otherwise show days if that's more intuitive
    else if (days <= 60) {
      return `${days} days`;
    }
    // For longer durations, show months with days
    else {
      const wholeMonths = Math.floor(numericDuration);
      const remainingDays = Math.round((numericDuration - wholeMonths) * 30.436875);
      return `${wholeMonths} months, ${remainingDays} days`;
    }
  }
};

const PORT = import.meta.env.VITE_PORT;

const DeliverablesAccordion2 = ({ project, closeAccordion }) => {
  let projectId = project?.related_entity_id;
  console.log("the project id is ", projectId);
  console.log("the project is ", project);
  // Initialize items as empty array instead of undefined
  const [items, setItems] = useState([]);
  const [projectDocuments, setProjectDocuments] = useState([]);
  const [projectDetails, setProjectDetails] = useState({});
  const [openIndex, setOpenIndex] = useState(-1);
  const [changes, setChanges] = useState({
    newDeliverables: [],
    updatedDeliverables: [],
    deletedDeliverables: [],
  });

  const fetchProjectandVendorDetails = async () => {
    try {
      const { data } = await axiosInstance.post(
        `/pm/getProjectDetailsWithVendor`,
        {
          projectId: projectId,
        }
      );
      console.log("project details");
      console.log(data.result.result);
      setProjectDetails(data.result);
      // setDocuments(data.data);
    } catch (err) {
      setError(err.message);
      console.error("Fetch error:", err);
    }
  };
  useEffect(() => {
    console.log("the project id is ", projectId);
    // console.log("the project phase is ", projectPhase);
    const fetchItemsWithDeliverables = async () => {
      try {        const response = await axiosInstance.post(
          `/pm/items-with-deliverables`,
          {
            projectId,
          }
        );
        console.log("items with deliverables");
        console.log(response);
        
        // Format the deliverable amounts for display and convert from database format
        const formattedItems = response.data.map(item => ({
          ...item,
          // Convert item unit_amount from database format to full amount for display
          unit_amount: convertItemUnitAmountToFullAmount(item.unit_amount),
          // Calculate total using converted unit_amount
          total: parseFloat(item.quantity || 0) * convertItemUnitAmountToFullAmount(item.unit_amount),
          deliverables: item.deliverables ? item.deliverables.map(deliverable => ({
            ...deliverable,
            // Convert deliverable amount from database format to full amount for calculations
            amount: convertDeliverableAmountToFullAmount(deliverable.amount || 0),
          })) : []
        }));
        
        setItems(formattedItems);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };

    fetchItemsWithDeliverables();
    fetchProjectandVendorDetails();
  }, [projectId]);

  // Calculate total duration for an item's deliverables
  const calculateItemTotalDuration = (deliverables) => {
    if (!deliverables || deliverables.length === 0) return 0;

    let totalDays = 0;
    
    deliverables.forEach(deliverable => {
      if (deliverable.duration) {
        if (typeof deliverable.duration === 'string' && deliverable.duration.includes('day')) {
          // Extract days from "X days" format
          const match = deliverable.duration.match(/(\d+)/);
          totalDays += match ? parseInt(match[1], 10) : 0;
        } else {
          // Convert months to days
          const months = parseFloat(deliverable.duration) || 0;
          totalDays += months * 30.436875; // Convert months to days
        }
      }
    });
    
    // Return days if less than 30 days total
    if (totalDays <= 30) {
      return `${Math.round(totalDays)} days`;
    }
    
    // Otherwise return in months
    return (totalDays / 30.436875).toFixed(1);
  };

  // Calculate total duration across all items
  const calculateTotalProjectDuration = () => {
    if (!items || items.length === 0) return 0;

    let totalDays = 0;
    
    items.forEach((item) => {
      if (item.deliverables && item.deliverables.length > 0) {
        item.deliverables.forEach((deliverable) => {
          if (deliverable.duration) {
            if (typeof deliverable.duration === 'string' && deliverable.duration.includes('day')) {
              // Extract days from "X days" format
              const match = deliverable.duration.match(/(\d+)/);
              totalDays += match ? parseInt(match[1], 10) : 0;
            } else {
              // Convert months to days
              const months = parseFloat(deliverable.duration) || 0;
              totalDays += months * 30.436875; // Convert months to days
            }
          }
        });
      }
    });
    
    // Return days if less than 30 days total
    if (totalDays <= 30) {
      return `${Math.round(totalDays)} days`;
    }
    
    // Otherwise return in months
    return (totalDays / 30.436875).toFixed(1);
  };

  const convertToMonths = (duration) => {
    if (!duration) return 0;

    const durationStr = String(duration).toLowerCase(); // Normalize input and ensure it's a string
    let totalDays = 0;

    if (durationStr.includes("day")) {
      // Extract the numeric part from strings like "30 days"
      const match = durationStr.match(/(\d+)/);
      totalDays = match ? parseInt(match[1], 10) : 0;
    } else if (durationStr.includes("week")) {
      // Extract the numeric part from strings like "4 weeks"
      const match = durationStr.match(/(\d+)/);
      const weeks = match ? parseInt(match[1], 10) : 0;
      totalDays = weeks * 7; // Convert weeks to days
    } else if (durationStr.includes("month")) {
      // Extract the numeric part from strings like "2 months"
      const match = durationStr.match(/(\d+(\.\d+)?)/);
      const months = match ? parseFloat(match[1]) : 0;
      return months.toFixed(1); // Already in months, just format it
    } else if (!isNaN(parseFloat(durationStr))) {
      // If it's just a number, assume it's already in months
      return parseFloat(durationStr).toFixed(1);
    }

    // Use the more accurate days per month value
    return (totalDays / 30.436875).toFixed(1); // Convert to months using average days per month
  };

  // Better function to format project duration
  const formatProjectDuration = (duration) => {
    if (!duration) return "0";

    // Handle if duration is already a number (assuming months)
    if (typeof duration === 'number') {
      if (duration < 1) {
        // Convert small durations to days
        const days = Math.round(duration * 30.436875);
        return `${days} days`;
      }
      return duration % 1 === 0 ? `${Math.round(duration)} months` : `${duration.toFixed(1)} months`;
    }

    const durationStr = String(duration).toLowerCase(); // Normalize input
    
    // If it's already formatted with "months", return as is
    if (durationStr.includes("month")) {
      return durationStr;
    }
    
    // If it's just a number as string, assume it's months
    if (!isNaN(parseFloat(durationStr)) && !/[a-z]/.test(durationStr)) {
      const months = parseFloat(durationStr);
      if (months < 1) {
        const days = Math.round(months * 30.436875);
        return `${days} days`;
      }
      return months % 1 === 0 ? `${Math.round(months)} months` : `${months.toFixed(1)} months`;
    }
    
    let totalDays = 0;

    if (durationStr.includes("day")) {
      const match = durationStr.match(/(\d+)/);
      totalDays = match ? parseInt(match[1], 10) : 0;
    } else if (durationStr.includes("week")) {
      const match = durationStr.match(/(\d+)/);
      const weeks = match ? parseInt(match[1], 10) : 0;
      totalDays = weeks * 7; // Convert weeks to days
    }

    // If less than 30 days, show in days
    if (totalDays < 30) {
      return `${totalDays} days`;
    }
    
    // If more than 30 days, show in months with appropriate format
    const months = totalDays / 30.436875;
    if (months % 1 === 0) {
      return `${Math.round(months)} months`;
    } else {
      return `${months.toFixed(1)} months`;
    }
  };

  const handleDeliverableChange = (
    itemIndex,
    deliverableIndex,
    field,
    value
  ) => {
    setItems((prev) => {
      const updatedItems = [...prev];
      const deliverable =
        updatedItems[itemIndex].deliverables[deliverableIndex];

      // Update the field value
      deliverable[field] = value;

      // Calculate duration if start_date or end_date changes
      if (field === "start_date" || field === "end_date") {
        const startDate = deliverable.start_date;
        const endDate = deliverable.end_date;

        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);

          if (end >= start) {
            // Calculate total days (inclusive)
            const timeDiff = end.getTime() - start.getTime();
            const totalDays = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;

            // Store duration in days if less than 30 days
            if (totalDays <= 30) {
              // Store as a string with "days" for clarity
              deliverable.duration = `${totalDays} days`;
            } else {
              // For longer durations, convert to months
              const averageDaysPerMonth = 30.436875; // 365.25/12
              const durationMonths = totalDays / averageDaysPerMonth;
              deliverable.duration = durationMonths.toFixed(1);
            }
            
            // Log to help debug duration calculations
            console.log(`Duration calculated: ${totalDays} days = ${deliverable.duration}`);
          } else {
            deliverable.duration = ""; // Invalid date range
          }
        } else {
          deliverable.duration = ""; // Missing dates
        }
      }

      // Track changes for existing deliverables
      if (
        deliverable.id &&
        !changes.updatedDeliverables.includes(deliverable.id)
      ) {
        setTimeout(() => {
          setChanges((prevChanges) => ({
            ...prevChanges,
            updatedDeliverables: [
              ...prevChanges.updatedDeliverables,
              deliverable.id,
            ],
          }));
        }, 0);
      }

      return updatedItems;
    });
  };

  // Fixed function to add only one deliverable
  const addDeliverable = (itemIndex) => {
    // Generate a temporary unique ID for this new deliverable
    const tempId = Date.now().toString();

    const newDeliverable = {
      id: null,
      tempId: tempId, // Add a temporary ID to track this item
      name: "",
      amount: "",
      start_date: "",
      end_date: "",
      duration: "",
      status: "new",
      item_id: items[itemIndex].id,
    };

    // Update items and changes separately to avoid race conditions
    setItems((prev) => {
      const updatedItems = JSON.parse(JSON.stringify(prev)); // Deep clone
      updatedItems[itemIndex].deliverables.push(newDeliverable);
      return updatedItems;
    });

    // We'll track new deliverables separately from the item state
    setTimeout(() => {
      setChanges((prevChanges) => ({
        ...prevChanges,
        newDeliverables: [...prevChanges.newDeliverables, newDeliverable],
      }));
    }, 0);
  };

  // Fixed deleteDeliverable function
  const deleteDeliverable = (itemIndex, deliverableIndex) => {
    console.log("the item index is ", itemIndex);
    console.log("the deliverable index is ", deliverableIndex);

    // Get a reference to the deliverable being deleted
    const deliverableToDelete = items[itemIndex].deliverables[deliverableIndex];
    console.log("the deleted item is ", deliverableToDelete);

    // First update the items state to remove the deliverable
    setItems((prev) => {
      const updatedItems = JSON.parse(JSON.stringify(prev)); // Deep clone
      updatedItems[itemIndex].deliverables.splice(deliverableIndex, 1);
      return updatedItems;
    });

    // Then update changes state if needed
    if (deliverableToDelete.id) {
      // If it has an ID, add it to deletedDeliverables
      setTimeout(() => {
        setChanges((prevChanges) => ({
          ...prevChanges,
          deletedDeliverables: [
            ...prevChanges.deletedDeliverables,
            deliverableToDelete.id,
          ],
        }));
      }, 0);
    } else {
      // If it doesn't have an ID, remove it from newDeliverables
      setTimeout(() => {
        setChanges((prevChanges) => ({
          ...prevChanges,
          newDeliverables: prevChanges.newDeliverables.filter(
            (d) => d.tempId !== deliverableToDelete.tempId
          ),
        }));
      }, 0);
    }
  };

  const validateDurations = () => {
    const totalDuration = calculateTotalProjectDuration();
    
    // Convert both durations to days for comparison
    let totalDurationDays;
    if (typeof totalDuration === 'string' && totalDuration.includes('day')) {
      // If already in days format
      const match = totalDuration.match(/(\d+)/);
      totalDurationDays = match ? parseInt(match[1], 10) : 0;
    } else {
      // If in months format
      totalDurationDays = parseFloat(totalDuration) * 30.436875;
    }
    
    // Parse project execution duration to get days
    let projectDurationDays;
    if (typeof projectDetails.execution_duration === 'string') {
      if (projectDetails.execution_duration.includes('day')) {
        // Already in days
        const match = projectDetails.execution_duration.match(/(\d+)/);
        projectDurationDays = match ? parseInt(match[1], 10) : 0;
      } else if (projectDetails.execution_duration.includes('week')) {
        // Convert weeks to days
        const match = projectDetails.execution_duration.match(/(\d+)/);
        const weeks = match ? parseInt(match[1], 10) : 0;
        projectDurationDays = weeks * 7;
      } else if (projectDetails.execution_duration.includes('month')) {
        // Convert months to days
        const match = projectDetails.execution_duration.match(/(\d+(\.\d+)?)/);
        const months = match ? parseFloat(match[1]) : 0;
        projectDurationDays = months * 30.436875;
      } else {
        // Try to parse as a number representing months
        projectDurationDays = parseFloat(projectDetails.execution_duration) * 30.436875;
      }
    } else {
      // If it's a number directly (assume months)
      projectDurationDays = parseFloat(projectDetails.execution_duration) * 30.436875;
    }
    
    // Format both for display
    const totalDurationFormatted = formatDuration(totalDuration);
    const projectDurationFormatted = formatProjectDuration(projectDetails.execution_duration);

    // Allow a small tolerance for comparison (2 days or ~5% of project duration)
    const tolerance = Math.max(2, projectDurationDays * 0.05);
    
    if (Math.abs(totalDurationDays - projectDurationDays) > tolerance) {
      toast.error(
        `Total deliverable duration (${totalDurationFormatted}) doesn't match project execution duration (${projectDurationFormatted})`
      );
      return false;
    }
    return true;
  };
  const handleSave = async () => {
    try {
      // Validate durations before saving
      if (!validateDurations()) {
        return;
      }

      const payload = {
        newDeliverables: items.flatMap((item) =>
          item.deliverables
            .filter((d) => d.status === "new")
            .map(
              ({ name, amount, start_date, end_date, duration, item_id }) => ({
                name,
                amount: convertFullAmountToDeliverableAmount(typeof amount === 'string' ? parseInputAmount(amount) : amount || 0),
                start_date,
                end_date,
                duration,
                item_id,
              })
            )
        ),
        updatedDeliverables: items.flatMap((item) =>
          item.deliverables
            .filter((d) => changes.updatedDeliverables.includes(d.id))
            .map(({ id, name, amount, start_date, end_date, duration }) => ({
              id,
              name,
              amount: convertFullAmountToDeliverableAmount(typeof amount === 'string' ? parseInputAmount(amount) : amount || 0),
              start_date,
              end_date,
              duration,
            }))
        ),
        deletedDeliverables: changes.deletedDeliverables,
      };

      console.log("Saving payload:", payload);

      await axiosInstance.post(`/pm/${projectId}/save-deliverables`, payload);

      setChanges({
        newDeliverables: [],
        updatedDeliverables: [],
        deletedDeliverables: [],
      });

      toast.success("Deliverables saved successfully!");
      closeAccordion();
    } catch (error) {
      console.error("Error saving deliverables:", error.message);
      toast.error("Error saving deliverables");
    }
  };

  const handleSaveandMarkComplete = async () => {
    try {
      // Validate durations before saving
      if (!validateDurations()) {
        return;
      }      const payload = {
        newDeliverables: items.flatMap((item) =>
          item.deliverables
            .filter((d) => d.status === "new")
            .map(
              ({ name, amount, start_date, end_date, duration, item_id }) => ({
                name,
                amount: convertFullAmountToDeliverableAmount(typeof amount === 'string' ? parseInputAmount(amount) : amount || 0),
                start_date,
                end_date,
                duration,
                item_id,
              })
            )
        ),
        updatedDeliverables: items.flatMap((item) =>
          item.deliverables
            .filter((d) => changes.updatedDeliverables.includes(d.id))
            .map(({ id, name, amount, start_date, end_date, duration }) => ({
              id,
              name,
              amount: convertFullAmountToDeliverableAmount(typeof amount === 'string' ? parseInputAmount(amount) : amount || 0),
              start_date,
              end_date,
              duration,
            }))
        ),
        deletedDeliverables: changes.deletedDeliverables,
      };

      console.log("Saving payload:", payload);

      await axiosInstance.post(`/pm/${projectId}/save-deliverables`, payload);

      const response = await axiosInstance.post(
        `/data-management/updateTaskStatusToDone`,
        {
          taskId: project.id,
        }
      );

      setChanges({
        newDeliverables: [],
        updatedDeliverables: [],
        deletedDeliverables: [],
      });

      toast.success("Deliverables saved successfully!");
      closeAccordion();
    } catch (error) {
      console.error("Error saving deliverables:", error.message);
      toast.error("Error saving deliverables");
    }
  };

  const isSaveDisabled =
    changes.newDeliverables.length === 0 &&
    changes.updatedDeliverables.length === 0 &&
    changes.deletedDeliverables.length === 0;

  return (
    <div className="w-full  mx-auto p-4 bg-white rounded-lg shadow-lg">
      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">
          Project Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Project Name */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Project Name</p>
            <p className="font-semibold">{projectDetails.name}</p>
          </div>

          {/* Vendor Name */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Vendor Name</p>
            <p className="font-semibold">
              {projectDetails.vendor_name || "N/A"}
            </p>
          </div>

          {/* Execution Start Date */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Execution Start</p>
            <p className="font-semibold">
              {projectDetails.execution_start_date
                ? new Date(
                    projectDetails.execution_start_date
                  ).toLocaleDateString()
                : "N/A"}
            </p>
          </div>

          {/* Execution End Date - Needs calculation */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Execution End</p>
            <p className="font-semibold">
              {projectDetails.execution_start_date &&
              projectDetails.execution_duration
                ? new Date(
                    new Date(projectDetails.execution_start_date).getTime() +
                      parseInt(projectDetails.execution_duration) *
                        24 *
                        60 *
                        60 *
                        1000
                  ).toLocaleDateString()
                : "N/A"}
            </p>
          </div>

          {/* Execution Duration */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">
              Execution Duration
            </p>
            <p className="font-semibold">
              {projectDetails.execution_duration || "N/A"}
            </p>
          </div>

          {/* Project Type */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Project Type</p>
            <p className="font-semibold">
              {projectDetails.project_type_id || "N/A"}
            </p>
          </div>

          {/* Approved Budget */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Approved Budget</p>
            <p className="font-semibold">
              ${projectDetails.approved_project_budget || "0"}
            </p>
          </div>

          {/* Operation Start Date - Add your actual field name if different */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Operation Start</p>
            <p className="font-semibold">
              {/* Add your actual operation start date field here */}
              {projectDetails.operation_start_date
                ? new Date(
                    projectDetails.operation_start_date
                  ).toLocaleDateString()
                : "N/A"}
            </p>
          </div>

          {/* Operation End Date - Needs calculation */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Operation End</p>
            <p className="font-semibold">
              {/* Add your actual operation duration field here */}
              {projectDetails.operation_start_date &&
              projectDetails.operation_duration
                ? new Date(
                    new Date(projectDetails.operation_start_date).getTime() +
                      parseInt(projectDetails.operation_duration) *
                        24 *
                        60 *
                        60 *
                        1000
                  ).toLocaleDateString()
                : "N/A"}
            </p>
          </div>

          {/* Operation Duration - Add your actual field name if different */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">
              Operation Duration
            </p>
            <p className="font-semibold">
              {projectDetails.operation_duration || "N/A"}
            </p>
          </div>
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">
        Project Deliverables
      </h2>
      <div>
        {projectDocuments.map((e) => {
          return (
            <div>
              <a href={e.document_url} target="_blank">
                {e.document_name}
              </a>
            </div>
          );
        })}
      </div>
      <div className="space-y-1">
        {(Array.isArray(items) ? items : []).map((item, itemIndex) => (
          <Disclosure key={item.id || itemIndex}>
            {({ open }) => (
              <div className="mb-4 border rounded-lg overflow-hidden shadow-sm">
                <Disclosure.Button
                  className="flex justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
                  onClick={() => setOpenIndex(open ? -1 : itemIndex)}
                >
                  <span className="font-medium text-gray-800">{item.name}</span>
                  <span className="text-gray-500 text-xl">
                    {open ? "−" : "+"}
                  </span>
                </Disclosure.Button>

                <Transition
                  show={open}
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <Disclosure.Panel className="px-6 pt-5 pb-4 bg-white">
                    <div className="grid grid-cols-2 gap-4 mb-6 text-gray-700 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <p>
                          <span className="font-medium">Unit:</span> {item.unit}
                        </p>
                        <p>
                          <span className="font-medium">Quantity:</span>{" "}
                          {item.quantity}
                        </p>
                      </div>
                      <div>                        <p>
                          <span className="font-medium">Unit Amount:</span>{" "}
                          {formatCurrency(item.unit_amount, 'SAR', false)}
                        </p>
                        <p>
                          <span className="font-medium">Total:</span>{" "}
                          {formatCurrency(item.total)}
                        </p>
                        <p>
                          <span className="font-medium">Type:</span> {item.type}
                        </p>
                      </div>
                    </div>

                    <h3 className="font-medium text-lg mb-3 text-gray-700">
                      Deliverables
                    </h3>                    <div className="space-y-4">
                      {item.deliverables && item.deliverables.length > 0 && (
                        <div className="flex gap-4 items-center p-2 bg-gray-100 rounded-lg font-medium text-sm text-gray-600">
                          <div className="flex-1">Deliverable Name</div>
                          <div className="flex-1">Amount</div>
                          <div className="flex-1">Start Date</div>
                          <div className="flex-1">End Date</div>
                          <div className="flex-1">Duration</div>
                          <div className="w-12 text-center">Action</div>
                        </div>
                      )}
                      {item.deliverables && item.deliverables.length > 0 ? (
                        item.deliverables.map(
                          (deliverable, deliverableIndex) => (
                            <div
                              key={
                                deliverable.id ||
                                deliverable.tempId ||
                                deliverableIndex
                              }
                              className="flex gap-4 items-center p-3 bg-gray-50 rounded-lg"
                            >                              <input
                                type="text"
                                value={deliverable.name || ""}
                                onChange={(e) =>
                                  handleDeliverableChange(
                                    itemIndex,
                                    deliverableIndex,
                                    "name",
                                    e.target.value
                                  )
                                }
                                className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter deliverable name"
                                title="Deliverable Name"
                              />                              <input
                                type="text"
                                value={formatAmountForInput(deliverable.amount) || ""}
                                onChange={(e) =>
                                  handleDeliverableChange(
                                    itemIndex,
                                    deliverableIndex,
                                    "amount",
                                    parseInputAmount(e.target.value)
                                  )
                                }
                                className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter amount"
                                title="Amount"
                              />
                              <input
                                type="date"
                                value={deliverable.start_date || ""}
                                onChange={(e) =>
                                  handleDeliverableChange(
                                    itemIndex,
                                    deliverableIndex,
                                    "start_date",
                                    e.target.value
                                  )
                                }
                                className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Start Date"
                              />
                              <input
                                type="date"
                                value={deliverable.end_date || ""}
                                onChange={(e) =>
                                  handleDeliverableChange(
                                    itemIndex,
                                    deliverableIndex,
                                    "end_date",
                                    e.target.value
                                  )
                                }
                                className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="End Date"
                              />
                              <input
                                type="text"
                                value={formatDuration(deliverable.duration)}
                                disabled={true}
                                className="flex-1 border rounded-md px-3 py-2 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Duration (calculated automatically)"
                              />                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  deleteDeliverable(
                                    itemIndex,
                                    deliverableIndex
                                  );
                                }}
                                className="text-red-600 hover:text-red-800 px-3 py-2 transition-colors rounded-md hover:bg-red-50 w-12 flex justify-center"
                                title="Delete deliverable"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          )
                        )
                      ) : (
                        <p className="text-gray-500 italic">
                          No deliverables added yet.
                        </p>
                      )}
                      {Number(item.deliverables.length) <
                        Number(item.quantity) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            addDeliverable(itemIndex);
                          }}
                          className="flex items-center text-blue-600 hover:text-blue-800 px-4 py-2 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Add Deliverable
                        </button>
                      )}

                      {/* Display total duration for this item */}
                      {item.deliverables && item.deliverables.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="font-medium text-blue-800">
                            Total Duration for {item.name}:{" "}
                            <span className="font-bold">
                              {formatDuration(calculateItemTotalDuration(item.deliverables))}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </Disclosure.Panel>
                </Transition>
              </div>
            )}
          </Disclosure>
        ))}
      </div>

      {/* Display total project duration */}
      {items.length > 0 && (
        <div className="my-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="font-medium text-blue-800">
            Total Duration for Test: <span className="font-bold">
              {formatDuration(calculateTotalProjectDuration())}
            </span>
            {projectDetails.execution_duration && (
              <span className="ml-2">
                {Math.abs(parseFloat(calculateTotalProjectDuration()) - parseFloat(convertToMonths(projectDetails.execution_duration))) <= 0.1 ? (
                  <span className="text-green-600">
                    (Matches project execution duration)
                  </span>
                ) : (
                  <span className="text-red-600">
                    (Doesn't match project execution duration:{" "}
                    {formatProjectDuration(projectDetails.execution_duration)})
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          className={`px-6 py-2 rounded-md text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
            isSaveDisabled
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
          disabled={isSaveDisabled}
        >
          Save All Changes
        </button>
        <button
          onClick={handleSaveandMarkComplete}
          className={`ml-4 px-6 py-2 rounded-md text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500  bg-green-600 hover:bg-green-700`}
        >
          Save and Mark as Completed
        </button>
      </div>
    </div>
  );
};

export default DeliverablesAccordion2;
