import React, { useState, useEffect } from "react";
import AdminTabs from "../components/AdminTabs";
import MainRoles from "../components/MainRoles";
import ProjectTimelineSettings from "./ProjectTimelineSettings";
import Expected from "../pages/Expected";
import DynamicForm from "../components/DynamicForm";
import axiosInstance from "../axiosInstance";
import { toast } from "sonner";
import Loader from "../components/Loader";
import AddUserModal from "../components/AddUserModal"; // Import AddUserModal

const SystemSettingsPage = () => {
  const [activeTab, setActiveTab] = useState("roles");
  // const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false); // State for modal
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get(`/data-management/users`);
      if (response.data.status === "success") {
        setUsers(response.data.result);
        console.log(response.data.result);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axiosInstance.post(
          `/data-management/getDepartments`
        );
        if (response.data.status === "success") {
          setDepartments(response.data.result);
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };
    fetchDepartments();
    fetchUsers();
  }, []);
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await axiosInstance.post(`/data-management/getRoles`);
        if (response.data.status === "success") {
          setRoles(response.data.result);
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    };
    fetchRoles();
  }, []);
  const getFormFields = () => ({
    user: [
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
        required: false,
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
            ? roles
                .filter((role) => {
                  // List of roles with maximum 1 allowed user
                  const singleInstanceRoles = ["DEPUTY", "PMO", "ADMIN"];

                  // Check if this role is restricted AND already exists in users
                  if (singleInstanceRoles.includes(role.name)) {
                    return !users.some((user) => user.role_name === role.name);
                  }

                  // Always show non-restricted roles
                  return true;
                })
                .map((role) => ({
                  value: role.id.toString(),
                  label: role.name,
                }))
            : [],
      },
      {
        name: "is_program_manager",
        type: "checkbox",
        required: false,
        columnSpan: 1,
      },
    ],
  });
  const getTabContent = () => {
    switch (activeTab) {
      case "roles":
        return <MainRoles onAddUser={() => setShowForm(true)} />; // Pass handler to MainRoles
      case "schedule":
        return <ProjectTimelineSettings />;
      case "activities":
        return <Expected />;
      default:
        return null;
    }
  };
  const handleFormSubmit = async (data) => {
    try {
      let endpoint = "addUser";
      const result = await axiosInstance.post(`/data-management/${endpoint}`, {
        data: { ...data },
        userId: 1,
      });
      console.log("Form submission result:", result);
      if (result.data.status === "success") {
        toast.success(`user added successfully!`);
        //await getData(); // Ensure it completes before closing the form
        setShowForm(false);
      }
    } catch (e) {
      console.log("Error submitting form:", e);
      toast.error(
        `Failed to add User}: ${e.response?.data?.message || e.message}`
      );
    }
  };

  return (
    <>
      <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-4">{getTabContent()}</div>
      {/* <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        refreshUsers={() => console.log("Refresh users")} // Placeholder for refresh logic
      /> */}
      {showForm && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/50 backdrop-blur-sm z-50">
          <div className="max-w-3xl bg-white dark:bg-black p-6 rounded-lg shadow-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add User</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <DynamicForm
              title={`Add User`}
              fields={getFormFields()["user"] || []}
              onSubmit={handleFormSubmit}
              isEmbedded={true}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default SystemSettingsPage;
