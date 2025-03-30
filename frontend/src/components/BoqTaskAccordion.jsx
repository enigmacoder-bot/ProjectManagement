import React, { useEffect, useState, useMemo } from "react";
import axiosInstance from "../axiosInstance";
import { FileText } from "lucide-react";

const BoqTaskAccordion = ({
  parentId = null,
  projectBudget = 0,
  project,
  isReadable = false,
}) => {
  // State management
  const [items, setItems] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [projectDetails, setProjectDetails] = useState({});
  const [deletions, setDeletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log("Received project", project);

  // Derived calculations
  const { totalExecution, totalOperation, totalProjectCost, isOverBudget } =
    useMemo(() => {
      const exec = items.reduce(
        (sum, item) =>
          item.type === "Execution"
            ? sum + item.quantity * item.unit_amount
            : sum,
        0
      );
      const oper = items.reduce(
        (sum, item) =>
          item.type === "Operation"
            ? sum + item.quantity * item.unit_amount
            : sum,
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
      });
      setItems(
        data.result?.map((item) => ({
          ...item,
          id: item.id.toString(),
          total: (item.quantity * item.unit_amount).toFixed(2),
        })) || []
      );
    } catch (err) {
      setError(err.message);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };
  const fetchDocuments = async () => {
    try {
      const { data } = await axiosInstance.post(`/pm/getProjectDocuments`, {
        projectId: parentId,
      });
      console.log("project documents");
      console.log(data);
      setDocuments(data.data);
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
      console.log("project details");
      console.log(data.result.result);
      setProjectDetails(data.result);
      // setDocuments(data.data);
    } catch (err) {
      setError(err.message);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("***********************");
    console.log(projectDetails);
  }, [projectDetails]);
  useEffect(() => {
    console.log("the parent id is " + parentId);
    console.log("the project budget is " + projectBudget);
    fetchItems();
    fetchDocuments();
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
          const updatedItem = {
            ...item,
            [field]: value,
            // Automatically calculate total when quantity or unit_amount changes
            total:
              field === "quantity" || field === "unit_amount"
                ? (
                    parseFloat(
                      field === "quantity" ? value : item.quantity || 0
                    ) *
                    parseFloat(
                      field === "unit_amount" ? value : item.unit_amount || 0
                    )
                  ).toFixed(2)
                : item.total,
          };
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
      let newItems = items.filter((item) =>
        item.id.toString().startsWith("temp-")
      );
      newItems = newItems.map((e) => {
        return { ...e, project_id: Number(parentId) };
      });
      const updates = items.filter(
        (item) => !item.id.toString().startsWith("temp-")
      );

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

      await fetchItems();
      setDeletions([]);
    } catch (err) {
      console.error("Save error:", err);
      console.log(err.message);
      alert("Error saving data. Please try again.");
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
        alert("BOQ saved and sent for approval successfully!");
      } else {
        throw new Error(
          response.data.message || "Failed to create schedule plan task"
        );
      }
    } catch (err) {
      console.error("Error sending for approval:", err);
      alert("Error sending BOQ for approval: " + err.message);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-white p-6 rounded-lg shadow-md">
        <div className="col-span-4">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Project Documents
          </h2>
        </div>
        {documents.map((document) => (
          <div
            key={document.id}
            className="p-4 border rounded-lg mb-4 bg-white dark:bg-gray-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <FileText
                    className="mr-2 text-green-600 dark:text-green-400"
                    size={16}
                  />
                  <a
                    href={document.document_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {document.document_name.split("/").pop()}{" "}
                    {/* Show filename */}
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mb-6 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div className="p-3 bg-blue-50 rounded-md">
            <span className="font-semibold">Execution Cost:</span> $
            {totalExecution.toFixed(2)}
          </div>
          <div className="p-3 bg-green-50 rounded-md">
            <span className="font-semibold">Operation Cost:</span> $
            {totalOperation.toFixed(2)}
          </div>
        </div>

        <div
          className={`p-4 rounded-md ${
            isOverBudget
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Project Budget</p>
              <p>${projectBudget}</p>
            </div>
            <div>
              <p className="font-medium">Total Cost</p>
              <p>${totalProjectCost.toFixed(2)}</p>
            </div>
          </div>
          {isOverBudget && (
            <p className="mt-2 font-semibold">
              ⚠️ Exceeds budget by $
              {(totalProjectCost - projectBudget).toFixed(2)}
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
                    <option value="Operation">Operation</option>
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
