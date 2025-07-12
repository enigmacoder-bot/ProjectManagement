import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import axiosInstance from "../axiosInstance";
import { FileText, Download } from "lucide-react";
import { formatCurrency, formatAmount, parseCurrency, convertToFullAmount, formatAmountForInput, parseInputAmount } from "../utils/currencyUtils";
import ProjectDocuments from "./ProjectDocuments";

// Helper function to parse duration values (handles PostgreSQL intervals and numbers)
const parseDurationDays = (duration) => {
  if (!duration) return null;
  
  // If it's already a number, return it
  if (typeof duration === 'number') return duration;
  
  // If it's a string, try to parse it
  if (typeof duration === 'string') {
    // Handle PostgreSQL interval format like "30 days" or "4 weeks"
    const match = duration.match(/(\d+)\s*(day|week|month|year)s?/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      
      switch (unit) {
        case 'day':
          return value;
        case 'week':
          return value * 7;
        case 'month':
          return value * 30; // approximate
        case 'year':
          return value * 365; // approximate
        default:
          return value;
      }
    }
    
    // Try to parse as plain number
    const numValue = parseInt(duration);
    if (!isNaN(numValue)) return numValue;
  }
  
  return null;
};

// Helper function to safely calculate date with duration
const calculateEndDate = (startDate, durationValue) => {
  if (!startDate || !durationValue) return null;
  
  const parsedDuration = parseDurationDays(durationValue);
  if (!parsedDuration) return null;
  
  try {
    return new Date(
      new Date(startDate).getTime() + 
      parsedDuration * 24 * 60 * 60 * 1000
    ).toLocaleDateString();
  } catch (error) {
    console.error('Error calculating end date:', error);
    return null;
  }
};

// Helper function to convert item unit_amount from database format to full amount
const convertItemUnitAmountToFullAmount = (unitAmount) => {
  const numericAmount = parseFloat(unitAmount);
  if (isNaN(numericAmount)) return 0;
  
  // No conversion needed - return the value as-is since we want direct number input
  return numericAmount;
};

// Helper function to convert full amount back to database storage format
const convertFullAmountToItemUnitAmount = (fullAmount) => {
  const numericAmount = parseFloat(fullAmount);
  if (isNaN(numericAmount)) return 0;
  
  // No conversion needed - store the value as-is since we want direct number input
  return numericAmount;
};

const BoqTaskAccordion = ({
  parentId = null,
  projectBudget = 0,
  project,
  isReadable = false,
  closeAccordion,
}) => {
  // State management
  const [items, setItems] = useState([]);
  const [projectDetails, setProjectDetails] = useState({});
  const [deletions, setDeletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log("Received project", project);
  // Derived calculations
  const { totalExecution, totalOperation, totalProjectCost, isOverBudget } =
    useMemo(() => {
      const exec = items.reduce(
        (sum, item) => {
          if (item.type === "Execution") {
            const quantity = parseInputAmount(item.quantity);
            const unitAmount = parseInputAmount(item.unit_amount);
            // Convert from database format to full amount for calculation
            const fullUnitAmount = convertItemUnitAmountToFullAmount(unitAmount);
            return sum + quantity * fullUnitAmount;
          }
          return sum;
        },
        0
      );
      const oper = items.reduce(
        (sum, item) => {
          if (item.type === "Operation") {
            const quantity = parseInputAmount(item.quantity);
            const unitAmount = parseInputAmount(item.unit_amount);
            // Convert from database format to full amount for calculation
            const fullUnitAmount = convertItemUnitAmountToFullAmount(unitAmount);
            return sum + quantity * fullUnitAmount;
          }
          return sum;
        },
        0
      );
      const total = exec + oper;
      return {
        totalExecution: exec,
        totalOperation: oper,
        totalProjectCost: total,
        isOverBudget: total > projectBudget,
      };
    }, [items, projectBudget]);

  // Data fetching
  const fetchItems = async () => {
    try {
      const { data } = await axiosInstance.post(`/pm/getItems`, {
        projectId: parentId,
      });      setItems(
        data.result?.map((item) => ({
          ...item,
          id: item.id.toString(),
          total: formatAmount(parseInputAmount(item.quantity) * convertItemUnitAmountToFullAmount(parseInputAmount(item.unit_amount))),
          quantity: formatAmountForInput(item.quantity),
          unit_amount: formatAmountForInput(item.unit_amount),
        })) || []
      );
    } catch (err) {
      setError(err.message);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };
  const fetchProjectandVendorDetails = async () => {
    try {
      const { data } = await axiosInstance.post(
        `/pm/getProjectDetailsWithVendor`,
        {
          projectId: parentId,
        }
      );
      console.log("project details response:", data);
      console.log("project details result:", data.result);
      
      // Set the correct nested result
      setProjectDetails(data.result);
      
    } catch (err) {
      setError(err.message);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("***********************");
    console.log("Project Details:", projectDetails);
    console.log("Execution Duration:", projectDetails.execution_duration, typeof projectDetails.execution_duration);
    console.log("Maintenance Duration:", projectDetails.maintenance_duration, typeof projectDetails.maintenance_duration);
    console.log("Project Type Name:", projectDetails.project_type_name);
  }, [projectDetails]);
  useEffect(() => {
    console.log("the parent id is " + parentId);
    console.log("the project budget is " + projectBudget);
    fetchItems();
    fetchProjectandVendorDetails();
  }, [parentId]);

  // Row operations
  const handleAddRow = () => {
    if (isReadable) return;
    const newItem = {
      id: `temp-${Date.now()}`,
      name: "",
      unit: "",
      quantity: "",
      unit_amount: "",
      type: "Execution",
      total: "",
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleDeleteRow = (id) => {
    if (isReadable) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (!id.toString().startsWith("temp-")) {
      setDeletions((prev) => [...prev, id]);
    }
  };
  const handleChange = (index, field, value) => {
    if (isReadable) return;
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          let updatedValue = value;
          
          // Handle numeric fields with proper formatting
          if (field === "quantity" || field === "unit_amount") {
            // Parse the input value to get clean number
            const cleanValue = parseInputAmount(value);
            updatedValue = formatAmountForInput(cleanValue);
          }
          
          const updatedItem = {
            ...item,
            [field]: updatedValue,
          };
          
          // Automatically calculate total when quantity or unit_amount changes
          if (field === "quantity" || field === "unit_amount") {
            const quantity = parseInputAmount(field === "quantity" ? updatedValue : item.quantity || 0);
            const unitAmount = parseInputAmount(field === "unit_amount" ? updatedValue : item.unit_amount || 0);
            // Convert from database format to full amount for calculation
            const fullUnitAmount = convertItemUnitAmountToFullAmount(unitAmount);
            updatedItem.total = formatAmount(quantity * fullUnitAmount);
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Save handler
  const handleSave = async () => {
    if (isReadable) return;
    try {
      if (totalProjectCost > projectBudget) {
        console.log("the project cost exceeds project budget");
        toast.error("Total cost exceeds project budget");
        return;
      }      let newItems = items.filter((item) =>
        item.id.toString().startsWith("temp-")
      );
      newItems = newItems.map((e) => {
        const unitAmount = parseInputAmount(e.unit_amount);
        // Convert back to database storage format
        const dbUnitAmount = convertFullAmountToItemUnitAmount(unitAmount);
        return { 
          ...e, 
          project_id: Number(parentId),
          quantity: parseInputAmount(e.quantity),
          unit_amount: dbUnitAmount
        };
      });
      const updates = items.filter(
        (item) => !item.id.toString().startsWith("temp-")
      ).map((item) => {
        const unitAmount = parseInputAmount(item.unit_amount);
        // Convert back to database storage format
        const dbUnitAmount = convertFullAmountToItemUnitAmount(unitAmount);
        return {
          ...item,
          quantity: parseInputAmount(item.quantity),
          unit_amount: dbUnitAmount
        };
      });

      const payload = {
        newItems: newItems.map(({ id, total, ...rest }) => rest),
        updates: updates.map(({ total, ...rest }) => rest),
        deletions,
      };
      console.log("Payload", payload);

      const { data } = await axiosInstance.post(`/pm/saveItems`, {
        projectId: parentId,
        ...payload,
      });
      console.log("Save result:", data);
      toast.success("Boq Uploaded successfully");
      await fetchItems();
      setDeletions([]);
      closeAccordion();
    } catch (err) {
      console.error("Save error:", err);
      console.log(err.message);
      toast.error("Error saving data. Please try again.");
    }
  };

  // Send for Approval handler
  const handleSendForApproval = async () => {
    if (isReadable) return;
    try {
      await handleSave();
      console.log("Parent Id", parentId);
      const response = await axiosInstance.post(
        `/tasks/createBoqApprovalTaskForPMO`,
        { projectId: parentId },
        { headers: { "Content-Type": "application/json" } }
      );
      if (response.data.status === "success") {
        const response = await axiosInstance.post(
          `/data-management/updateTaskStatusToDone`,
          {
            taskId: project.id,
          }
        );
        console.log("Schedule plan task created successfully:", response.data);
        toast.success("BOQ saved and sent for approval successfully!");
      } else {
        throw new Error(
          response.data.message || "Failed to create schedule plan task"
        );
      }
    } catch (err) {
      console.error("Error sending for approval:", err);
      toast.error("Error sending BOQ for approval: ");
    }
  };

  // Loading and error states
  if (loading) return <div className="p-4 text-center">Loading items...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 bg-gray-100 rounded-lg shadow-md">
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
              {calculateEndDate(projectDetails.execution_start_date, projectDetails.execution_duration) || "N/A"}
            </p>
          </div>

          {/* Execution Duration */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">
              Execution Duration
            </p>
            <p className="font-semibold">
              {projectDetails.execution_duration 
                ? (() => {
                    const durationInDays = parseDurationDays(projectDetails.execution_duration);
                    return durationInDays ? `${durationInDays} days` : projectDetails.execution_duration;
                  })()
                : "N/A"}
            </p>
          </div>

          {/* Project Type */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Project Type</p>
            <p className="font-semibold">
              {projectDetails.project_type_name || "N/A"}
            </p>
          </div>          {/* Approved Budget */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Approved Budget</p>
            <p className="font-semibold">
              {formatCurrency(projectDetails.approved_project_budget || 0)}
            </p>
          </div>

          {/* Maintenance Start Date - Calculated from execution end date */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Maintenance Start</p>
            <p className="font-semibold">
              {calculateEndDate(projectDetails.execution_start_date, projectDetails.execution_duration) || "N/A"}
            </p>
          </div>

          {/* Maintenance End Date - Calculated from maintenance start + maintenance duration */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Maintenance End</p>
            <p className="font-semibold">
              {(() => {
                const maintenanceStart = calculateEndDate(projectDetails.execution_start_date, projectDetails.execution_duration);
                if (!maintenanceStart || !projectDetails.maintenance_duration) return "N/A";
                
                const maintenanceDays = parseDurationDays(projectDetails.maintenance_duration);
                if (!maintenanceDays) return "N/A";
                
                try {
                  // Parse the maintenance start date back to Date object for calculation
                  const maintenanceStartDate = new Date(projectDetails.execution_start_date);
                  const executionDays = parseDurationDays(projectDetails.execution_duration);
                  
                  const maintenanceEndDate = new Date(
                    maintenanceStartDate.getTime() + 
                    (executionDays + maintenanceDays) * 24 * 60 * 60 * 1000
                  );
                  
                  return maintenanceEndDate.toLocaleDateString();
                } catch (error) {
                  console.error('Error calculating maintenance end date:', error);
                  return "N/A";
                }
              })()}
            </p>
          </div>

          {/* Maintenance Duration */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">
              Maintenance Duration
            </p>
            <p className="font-semibold">
              {projectDetails.maintenance_duration 
                ? (() => {
                    const durationInDays = parseDurationDays(projectDetails.maintenance_duration);
                    return durationInDays ? `${durationInDays} days` : projectDetails.maintenance_duration;
                  })()
                : "N/A"}
            </p>
          </div>
        </div>
      </div>
      {/* Project Documents Section - Using ProjectDocuments Component */}
      <div className="mb-8">
        <ProjectDocuments 
          projectId={parentId} 
          phaseName={projectDetails.phase_name || project?.phase_name || "Planning"} 
          className="bg-white rounded-lg shadow-md"
        />
      </div>
      <div className="mb-6 space-y-4">        <div className="flex gap-4 flex-wrap">
          <div className="p-3 bg-blue-50 rounded-md">
            <span className="font-semibold">Execution Cost:</span> {formatCurrency(totalExecution)}
          </div>
          <div className="p-3 bg-green-50 rounded-md">
            <span className="font-semibold">Maintenance Cost:</span> {formatCurrency(totalOperation)}
          </div>
        </div>

        <div
          className={`p-4 rounded-md ${
            isOverBudget
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Project Budget</p>
              <p>{formatCurrency(projectBudget)}</p>
            </div>
            <div>
              <p className="font-medium">Total Cost</p>
              <p>{formatCurrency(totalProjectCost)}</p>
            </div>
          </div>
          {isOverBudget && (
            <p className="mt-2 font-semibold">
              ⚠️ Exceeds budget by {formatCurrency(totalProjectCost - projectBudget)}
            </p>
          )}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Name",
                "Unit",
                "Quantity",
                "Unit Amount",
                "Total",
                "Type",
                "Actions",
              ].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr key={item.id}>
                {["name", "unit", "quantity", "unit_amount"].map((field) => (
                  <td key={field} className="px-4 py-2">
                    <input
                      value={item[field]}
                      onChange={(e) =>
                        handleChange(index, field, e.target.value)
                      }
                      className="w-full border rounded px-2 py-1"
                      readOnly={isReadable}
                    />
                  </td>
                ))}
                {/* Total Field - Read Only */}
                <td className="px-4 py-2">
                  <input
                    value={item.total || ""}
                    readOnly
                    className="w-full border rounded px-2 py-1 bg-gray-100"
                  />
                </td>
                {/* Type Field */}
                <td className="px-4 py-2">
                  <select
                    value={item.type}
                    onChange={(e) =>
                      handleChange(index, "type", e.target.value)
                    }
                    className="w-full border rounded px-2 py-1"
                    disabled={isReadable}
                  >
                    <option value="Execution">Execution</option>
                    <option value="Operation">Maintenance</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  {!isReadable && (
                    <button
                      onClick={() => handleDeleteRow(item.id)}
                      className="text-red-600 hover:text-red-800"
                      disabled={isReadable}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isReadable && (
        <div className="mt-6 flex gap-4">
          <button
            onClick={handleAddRow}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Item
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save Changes
          </button>
          <button
            onClick={handleSendForApproval}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Send for Approval
          </button>
        </div>
      )}
    </div>
  );
};

export default BoqTaskAccordion;
