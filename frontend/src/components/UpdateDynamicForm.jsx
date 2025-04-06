import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import useAuthStore from "../store/authStore";

const UpdateDynamicForm = ({
  title,
  onSubmit,
  isEmbedded = true,
  viewData = false,
  data,
  tableName,
  users = [],
  portfolios = [],
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pmRole, setPmRole] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: data || {},
  });

  let {
    users: storeUsers,
    portfolios: storePortfolios,
    departments,
    roles,
    initiatives,
  } = useAuthStore();
  const finalUsers = users.length > 0 ? users : storeUsers;
  const finalPortfolios = portfolios.length > 0 ? portfolios : storePortfolios;

  const getFormFields = () => ({
    initiative: [
      {
        name: "name",
        label: "Initiative English Name",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "arabic_name",
        label: "اسم المبادرة بالعربي",
        type: "text",
        required: true,
        columnSpan: 1,
        className: "text-right",
      },
      {
        name: "description",
        label: "Description in English",
        type: "textarea",
        required: true,
        columnSpan: 2,
      },
      {
        name: "arabic_description",
        label: "الوصف بالعربي",
        type: "textarea",
        required: true,
        columnSpan: 2,
        className: "text-right",
      },
    ],
    portfolio: [
      {
        dbName: "name",
        name: "name",
        label: "Portfolio English Name",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        dbName: "arabic_name",
        name: "arabic_name",
        label: "اسم المحفظة بالعربي",
        type: "text",
        required: true,
        columnSpan: 1,
        className: "text-right",
      },
      {
        name: "portfolio_manager",
        label: "Portfolio Manager",
        type: "select",
        required: true,
        columnSpan: 1,
        options:
          finalUsers && finalUsers.length > 0
            ? finalUsers
                .filter(
                  (user) =>
                    user.role_name?.toUpperCase() === "PORTFOLIO MANAGER"
                )
                .map((user) => ({
                  value: user.id.toString(),
                  label: `${user.first_name} ${user.family_name || ""}`,
                }))
            : [],
      },
      {
        name: "initiative_id",
        label: "Initiative",
        type: "select",
        required: true,
        columnSpan: 1,
        options:
          initiatives && initiatives.length > 0
            ? initiatives.map((initiative) => ({
                value: initiative.id.toString(),
                label: `${initiative.name} ${
                  initiative.arabic_name ? `(${initiative.arabic_name})` : ""
                }`,
              }))
            : [],
      },
      {
        name: "description",
        label: "Description in English",
        type: "textarea",
        required: true,
        columnSpan: 2,
      },
      {
        name: "arabic_description",
        label: "الوصف بالعربي",
        type: "textarea",
        required: true,
        columnSpan: 2,
        className: "text-right",
      },
    ],
    program: [
      {
        name: "name",
        label: "Program English Name",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "arabic_name",
        label: "اسم البرنامج بالعربي",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "program_manager",
        label: "Program Manager",
        type: "select",
        required: true,
        columnSpan: 1,
        options:
          finalUsers && finalUsers.length > 0
            ? finalUsers
                .filter(
                  (user) =>
                    user.role_name?.toUpperCase() === "PROGRAM MANAGER" ||
                    user.is_program_manager
                )
                .map((user) => ({
                  value: user.id.toString(),
                  label: `${user.first_name} ${user.family_name || ""}`,
                }))
            : [],
      },
    ],
    department: [
      {
        dbName: "name",
        name: "name",
        label: "Department English Name",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        dbName: "arabic_name",
        name: "arabic_name",
        label: "اسم الإدارة بالعربي",
        type: "text",
        required: true,
        columnSpan: 1,
      },
    ],
    users: [
      {
        name: "first_name",
        label: "First Name in English",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "arabic_first_name",
        label: "الاسم الأول للمستخدم بالعربي",
        type: "text",
        required: true,
        columnSpan: 1,
        className: "text-right",
      },
      {
        name: "family_name",
        label: "Family Name in English",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "arabic_family_name",
        label: "اسم العائلة للمستخدم بالعربي",
        type: "text",
        required: true,
        columnSpan: 1,
        className: "text-right",
      },
      {
        name: "email",
        label: "Email Address",
        type: "email",
        required: true,
        columnSpan: 1,
      },
      {
        name: "password",
        label: "Password",
        type: "password",
        required: true,
        columnSpan: 1,
      },
      {
        name: "rewritePassword",
        label: "Re-write Password",
        type: "password",
        required: true,
        columnSpan: 1,
        className: "col-start-2",
      },
      {
        name: "department",
        label: "User Department",
        type: "select",
        required: true,
        columnSpan: 1,
        options:
          departments && departments.length > 0
            ? departments.map((dept) => ({
                value: dept.id.toString(),
                label: dept.name,
              }))
            : [],
      },
      {
        name: "role",
        label: "User Role",
        type: "select",
        required: true,
        columnSpan: 1,
        options:
          roles && roles.length > 0
            ? roles.map((role) => ({
                value: role.id.toString(),
                label: role.name,
              }))
            : [],
      },
      {
        name: "is_program_manager",
        label: "",
        type: "checkbox",
        required: false,
        columnSpan: 1,
      },
    ],
    project: [
      {
        name: "name",
        label: "Project English Name",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "arabic_name",
        label: "اسم المشروع بالعربي",
        type: "text",
        required: true,
        columnSpan: 1,
        className: "text-right",
      },
      {
        name: "description",
        label: "Description in English",
        type: "textarea",
        required: true,
        columnSpan: 2,
      },
      {
        name: "arabic_description",
        label: "الوصف بالعربي",
        type: "textarea",
        required: true,
        columnSpan: 2,
        className: "text-right",
      },
    ],
    vendor: [
      {
        name: "name",
        label: "vendor name",
        type: "text",
        required: true,
        columnSpan: 1,
        className: "text-left",
      },
      {
        name: "arabic_name",
        label: "vendor arabic name",
        type: "text",
        required: true,
        columnSpan: 1,
        className: "text-right",
      },
    ],
    objective: [
      {
        name: "name",
        label: "vendor name",
        type: "text",
        required: true,
        columnSpan: 1,
        className: "text-left",
      },
      {
        name: "arabic_name",
        label: "arabic name",
        type: "text",
        required: true,
        columnSpan: 1,
        className: "text-left",
      },
    ],
  });

  useEffect(() => {
    if (data) {
      const fields = getFormFields()[tableName] || [];
      const fieldNames = fields.map((field) => field.name);
      const filteredData = { id: data.id };

      fieldNames.forEach((name) => {
        if (tableName === "users") {
          if (name === "department") {
            filteredData[name] = data.department_id?.toString() || "";
          } else if (name === "role") {
            filteredData[name] = data.role_id?.toString() || "";
          } else {
            filteredData[name] = data[name] || "";
          }
        } else {
          filteredData[name] = data[name] || "";
        }
      });

      console.log("Form initialized with:", filteredData);
      reset(filteredData);
    }
  }, [data, reset, tableName]);
  const changeHandler = (e) => {
    const { name, value } = e.target;
    console.log(`${name} changed to:`, value);

    if (name === "role") {
      console.log("Role selected:", value);
      const selectedText = e.target.options[e.target.selectedIndex].text;
      console.log("selected text", selectedText);
      if (selectedText == "PM") {
        setPmRole(true);
      } else {
        setPmRole(false);
      }
      // Do something with the value
    }
  };
  const handleFormSubmit = async (data, isUpdate = false) => {
    console.log(
      `${isUpdate ? "Update" : "Add"} ${getSingularTabName()} Data:`,
      data
    );
    try {
      let endpoint = "";
      if (activeTab === "portfolios") {
        endpoint = isUpdate ? "updateportfolio" : "addportfolio";
      } else if (activeTab === "initiatives") {
        endpoint = isUpdate ? "updateInitiative" : "addInitiative";
      } else if (activeTab === "team") {
        endpoint = isUpdate ? "updateUser" : "addUser";
      } else {
        endpoint = `${isUpdate ? "update" : "add"}${getSingularTabName()}`;
      }

      if (activeTab === "portfolios") {
        if (data.portfolio_manager) {
          data.portfolio_manager = parseInt(data.portfolio_manager, 10);
        }
        if (data.initiative_id) {
          data.initiative_id = parseInt(data.initiative_id, 10);
        }
      }

      const result = await axiosInstance.post(`/data-management/${endpoint}`, {
        data: { ...data },
        userId: 1,
      });
      console.log("Form submission result:", result);

      if (result.data.status === "success") {
        toast.success(
          `${getSingularTabName()} ${
            isUpdate ? "updated" : "added"
          } successfully!`
        );
        if (activeTab === "initiatives" && !isUpdate && result.data.result) {
          const newInitiative = result.data.result;
          setInitiatives([...initiatives, newInitiative]);
        }
        await getData();
        setRefreshTrigger((prev) => prev + 1);
        setShowForm(false);
        if (isUpdate) setShowEditForm(false); // Close edit form if updating
      }
    } catch (e) {
      console.log("Error submitting form:", e);
      toast.error(
        `Failed to ${isUpdate ? "update" : "add"} ${getSingularTabName()}: ${
          e.response?.data?.message || e.message
        }`
      );
    }
  };
  const handleEditFormSubmit = async (data) => {
    await handleFormSubmit(data, true); // Pass true to indicate an update
  };
  const renderInput = (field, index) => {
    const { name, label, type, required, className, options, columnSpan } =
      field;

    return (
      <div
        key={index}
        className={`${columnSpan === 2 ? "col-span-2" : ""} ${className || ""}`}
      >
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </label>
        {type === "select" ? (
          <select
            {...register(name, { required })}
            onChange={(e) => {
              register("role").onChange(e); // This ensures React Hook Form gets the update
              changeHandler(e);
            }}
            className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            defaultValue={data?.[name] || ""}
          >
            <option value="">Select</option>
            {options?.map((option, i) => {
              const isRoleDisabled =
                name === "role" &&
                ["DEPUTY", "PMO", "ADMIN"].includes(option.label.toUpperCase());

              return (
                <option
                  key={i}
                  value={option.value}
                  hidden={isRoleDisabled}
                  className={
                    isRoleDisabled ? "bg-gray-100 dark:bg-gray-600" : ""
                  }
                >
                  {option.label}
                </option>
              );
            })}
          </select>
        ) : type === "textarea" ? (
          <textarea
            {...register(name, { required })}
            className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            rows={4}
          />
        ) : type === "checkbox" ? (
          <div className="mt-1">
            <label className="inline-flex items-center w-full cursor-pointer">
              <input
                type="checkbox"
                disabled={!pmRole}
                {...register(name, { required })}
                className="sr-only peer"
              />
              <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-500 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
              <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                set as program manager
              </span>
            </label>
          </div>
        ) : (
          <input
            type={type}
            {...register(name, { required })}
            className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        )}
        {errors[name] && (
          <span className="text-red-500 text-sm">{label} is required</span>
        )}
      </div>
    );
  };

  const formContent = (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="grid grid-cols-2 gap-4 p-4 bg-white dark:bg-gray-800 shadow-md rounded-md w-full"
    >
      {getFormFields()[tableName]?.map((field, index) =>
        renderInput(field, index)
      )}
      <div className="col-span-2 flex justify-center mt-4">
        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition"
        >
          Save
        </button>
      </div>
    </form>
  );

  // Rest of the component (viewContent and modal logic) remains the same as before
  // [Previous viewContent and modal rendering logic here...]

  return (
    <>
      {isEmbedded ? (
        viewData ? (
          <div className="grid grid-cols-2 gap-4 p-4 bg-white dark:bg-gray-800 shadow-md rounded-md w-full">
            {getFormFields()[tableName]?.map(
              ({ name, label, className, columnSpan }, index) => (
                <div
                  key={index}
                  className={`${columnSpan === 2 ? "col-span-2" : ""} ${
                    className || ""
                  }`}
                >
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {label}
                  </label>
                  <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-900 dark:text-white w-full">
                    {name === "department"
                      ? departments.find(
                          (dept) =>
                            dept.id.toString() ===
                            data?.department_id?.toString()
                        )?.name || "N/A"
                      : name === "role"
                      ? roles.find(
                          (role) =>
                            role.id.toString() === data?.role_id?.toString()
                        )?.name || "N/A"
                      : data?.[name] || "N/A"}
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          formContent
        )
      ) : (
        <>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
          >
            Open Form
          </button>
          {isModalOpen && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-opacity-70 flex justify-center items-center">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-2xl">
                <h2 className="text-lg font-bold mb-4 dark:text-white">
                  {title || "Update Form"}
                </h2>
                {formContent}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="mt-4 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition w-full"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default UpdateDynamicForm;
