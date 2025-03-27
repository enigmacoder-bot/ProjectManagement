import React, { useState, useEffect, useMemo, Suspense } from "react";
import axiosInstance from "../axiosInstance";
import { X, Users, Plus } from "lucide-react"; // Added Plus icon
import { Calendar, ChevronDown, ChevronUp, Download } from "lucide-react";
import useAuthStore from "../store/authStore";
import useLanguage from "../hooks/useLanguage";

import Pagination from "../components/Pagination";
import { toast } from "sonner";

// IMPORTING CHILDREN COMPONENTS
import TableData from "../components/TableData";
import TableConfig from "../components/TableConfig";
import TableConfigFilter from "../components/TableConfigFilter";
import StackTable from "../components/StackTable";
import DynamicForm from "../components/DynamicForm";
import DocumentFormModal from "../components/DocumentFormModal";
import DataManagementTabs from "../components/DataManagementTabs";
import ProjectModal from "../components/ProjectModal";
import Loader from "../components/Loader";
// import DataSection from "./DataSection";
const DataSection = React.lazy(() => import("./DataSection"));
const PORT = import.meta.env.VITE_PORT;

let tablefilters = {};
let sortClause = {};
let dateFilter = null;
let page = 1;

const DataManagementPage = () => {
  const { t } = useLanguage();
  const { users, setUsers, projectTypes, setProjectTypes, setProjectPhases } =
    useAuthStore();
  const [activeTab, setActiveTab] = useState("initiatives");
  const processedCategory = useMemo(
    () => (activeTab === "team" ? "users" : activeTab.replace(/s$/, "")),
    [activeTab]
  );

  const [columnSetting, setColumnSetting] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [showDate, setShowDate] = useState(false);
  const [pagination, setPagination] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [initiatives, setInitiatives] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Get users from auth store

  let originalTableData = [];
  // Fetch users when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axiosInstance.get(`/data-management/users`);
        if (response.data.status === "success") {
          setUsers(response.data.result);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
      }
    };

    fetchUsers();
  }, [setUsers]);

  useEffect(() => {
    const fetchProjectPhases = async () => {
      try {
        const response = await axiosInstance.post(
          `/data-management/getProjectPhases`
        );
        if (response.data.status === "success") {
          setProjectPhases(response.data.result);
        } else {
          toast.error("Failed to load project phases");
        }
      } catch (error) {
        console.error("Error fetching project phases:", error);
        toast.error("Failed to load project phases");
      }
    };

    fetchProjectPhases();
  }, []);

  useEffect(() => {
    const fetchProjectTypes = async () => {
      try {
        const response = await axiosInstance.post(
          `/data-management/getProjectTypes`
        );
        if (response.data.status === "success") {
          setProjectTypes(response.data.result);
          console.log("Project Types:", response.data.result);
        } else {
          toast.error("Failed to load project types");
        }
      } catch (error) {
        console.error("Error fetching project types:", error);
        toast.error("Failed to load project types");
      }
    };

    fetchProjectTypes();
  }, []);

  // Fetch initiatives when component mounts
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

  // Fetch portfolios when component mounts
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

  // Form field definitions for different tabs
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
        name: "name",
        label: "Portfolio English Name",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
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
          users && users.length > 0
            ? users.map((user) => ({
                value: user.id.toString(),
                label: `${user.first_name} ${user.family_name || ""}`,
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
    objective: [
      {
        name: "objectiveEnglishName",
        label: "Objective English Name",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "objectiveArabicName",
        label: "اسم الهدف بالعربي",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "descriptionEnglish",
        label: "Description in English",
        type: "textarea",
        required: true,
        columnSpan: 2,
      },
      {
        name: "descriptionArabic",
        label: "الوصف بالعربي",
        type: "textarea",
        required: true,
        columnSpan: 2,
      },
    ],
    program: [
      {
        name: "programEnglish",
        label: "Program English Name",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "programArabic",
        label: "اسم البرنامج بالعربي",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "programManager",
        label: "Program Manager",
        type: "select",
        required: true,
        columnSpan: 1,
        options:
          users && users.length > 0
            ? users.map((user) => ({
                value: user.id.toString(),
                label: `${user.first_name} ${user.family_name || ""}`,
              }))
            : [],
      },
      {
        name: "portfolio_id",
        label: "Portfolio",
        type: "select",
        required: true,
        columnSpan: 1,
        options:
          portfolios && portfolios.length > 0
            ? portfolios.map((portfolio) => ({
                value: portfolio.id.toString(),
                label: portfolio.name,
              }))
            : [],
      },
      {
        name: "descriptionEnglish",
        label: "Description in English",
        type: "textarea",
        required: true,
        columnSpan: 2,
      },
      {
        name: "descriptionArabic",
        label: "الوصف بالعربي",
        type: "textarea",
        required: true,
        columnSpan: 2,
      },
    ],
    department: [
      {
        name: "name",
        label: "Department English Name",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "arabic_name",
        label: "اسم الإدارة بالعربي",
        type: "text",
        required: true,
        columnSpan: 1,
      },
    ],
    vendor: [
      {
        name: "vendorEnglish",
        label: "Vendor English Name",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "vendorArabic",
        label: "اسم المورد بالعربي",
        type: "text",
        required: true,
        columnSpan: 1,
      },
    ],
    member: [
      {
        name: "firstNameEnglish",
        label: "First Name in English",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "firstNameArabic",
        label: "الاسم الأول للمستخدم بالعربي",
        type: "text",
        required: true,
        columnSpan: 1,
        className: "text-right",
      },
      {
        name: "familyNameEnglish",
        label: "Family Name in English",
        type: "text",
        required: true,
        columnSpan: 1,
      },
      {
        name: "familyNameArabic",
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
        options: ["HR", "Engineering", "Marketing"],
      },
      {
        name: "role",
        label: "User Role",
        type: "select",
        required: true,
        columnSpan: 1,
        options: ["Admin", "Program Manager", "User"],
      },
    ],
  });
  // Reset state when tab changes
  useEffect(() => {
    tablefilters = {};
    sortClause = {};
    dateFilter = null;
    page = 1;
    // setTableData([]);
    // setPagination({});
    // setColumnSetting([]);
    setShowForm(false);
    setShowDocumentForm(false);
    // Get data for the selected tab
    //
  }, [activeTab]);

  useEffect(() => {
    console.log("Component Mounted!");

    return () => {
      console.log("Component Unmounted!");
    };
  }, []);
  // Function to get singular form of tab name
  const getSingularTabName = () => {
    // Special cases for tabs with irregular singular forms
    if (activeTab === "members") {
      return "users";
    } else if (activeTab === "portfolios") {
      return "portfolio";
    } else if (activeTab === "activities") {
      return "activity";
    } else if (activeTab === "companies") {
      return "company";
    } else if (activeTab === "team") {
      return "userss";
    } else if (activeTab === "programs") {
      return "program";
    } else if (activeTab === "documents") {
      return "document";
    }

    // Regular case - remove 's' from the end
    return activeTab.endsWith("s") ? activeTab.slice(0, -1) : activeTab;
  };

  // Handle project addition
  const handleProjectAdded = () => {
    setRefreshTrigger((prev) => prev + 1); // Trigger refresh
    setShowProjectModal(false); // Close modal
  };

  // Handle add button click - now opens the appropriate form
  const handleAddButtonClick = () => {
    if (activeTab === "documents") {
      setShowDocumentForm(true);
    } else if (activeTab === "projects") {
      setShowProjectModal(true);
    } else {
      setShowForm(true);
    }
  };
  // Handle form submission
  const handleFormSubmit = async (data) => {
    console.log(`${getSingularTabName()} Data:`, data);
    try {
      let endpoint = "";
      if (activeTab === "portfolios") {
        endpoint = "addportfolio";
      } else if (activeTab === "initiatives") {
        endpoint = "addInitiative";
      } else {
        endpoint = `add${getSingularTabName()}`;
      }
      if (activeTab === "portfolios" && data.portfolioManager) {
        data.portfolioManager = parseInt(data.portfolioManager, 10);
      }
      const result = await axiosInstance.post(`/data-management/${endpoint}`, {
        data: { ...data },
        userId: 1,
      });
      console.log("Form submission result:", result);
      if (result.data.status === "success") {
        toast.success(`${getSingularTabName()} added successfully!`);
        await getData(); // Ensure it completes before closing the form
        setRefreshTrigger((prev) => prev + 1);
        setShowForm(false);
      }
    } catch (e) {
      console.log("Error submitting form:", e);
      toast.error(
        `Failed to add ${getSingularTabName()}: ${
          e.response?.data?.message || e.message
        }`
      );
    }
  };
  async function getSetting() {
    console.log("Singular table name", getSingularTabName());
    try {
      const result = await axiosInstance.post(`/data-management/setting`, {
        tableName: getSingularTabName(),
        userId: 1,
      });
      console.log("setting", result);
      console.log("Table setting");
      console.log(result.data.result[0].setting.setting);
      const data = result.data.result[0].setting.setting;
      setColumnSetting((state) => data);
    } catch (e) {
      console.log(e);
    }
  }
  async function getData() {
    try {
      const result = await axiosInstance.post(`/data-management/data`, {
        tableName: getSingularTabName(), // Remove 's' from the end to get singular form
        userId: 1,
      });
      console.log("the data");
      console.log(result);
      originalTableData = result.data.result;
      setTableData((state) => result.data.result);
      setPagination((state) => result.data.pagination);
    } catch (e) {
      console.log(e);
    }
  }
  async function getFilteredData() {
    try {
      const result = await axiosInstance.post(`/data-management/filtereddata`, {
        tableName: activeTab.slice(0, -1), // Remove 's' from the end to get singular form
        userId: 1,
        filters: tablefilters,
        sort: sortClause,
        dateFilter,
        page,
      });
      console.log(result);
      setTableData((state) => result.data.result);
      setPagination((state) => result.data.pagination);
    } catch (e) {
      console.log("there was an error");
      console.log(e);
    }
  }
  async function filterTable(filters) {
    if (Object.keys(filters) == 0) {
      tablefilters = {};
    } else {
      tablefilters = { ...tablefilters, ...filters };
    }
    await getFilteredData();
  }
  async function filterTableBasedonSearchTerm(searchTerm) {
    console.log(tablefilters);
    tablefilters.searchTerm = searchTerm;
    console.log(tablefilters);
    await getFilteredData();
  }
  async function sortTableData(dbColumn, order) {
    console.log(dbColumn, order);
    console.log(tablefilters);
    sortClause = {};
    sortClause[dbColumn] = order;
    await getFilteredData();
  }
  async function filterBasedOnDays(input) {
    console.log(tablefilters);
    dateFilter = input;
    getFilteredData();
  }
  async function getPageData(NavigatePage) {
    page = NavigatePage;
    await getFilteredData();
  }

  function updateShowDateFunctionality() {
    setShowDate((state) => !state);
  }

  // Add the button rendering code here
  const renderAddButton = () => (
    <button
      onClick={handleAddButtonClick}
      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
    >
      <Plus className="w-4 h-4 mr-2" />
      {t("addNew")} {t(processedCategory)}
    </button>
  );

  return (
    <div className="container mx-auto px-4 py-0">
      {/* <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {t("dataManagement")}
        </h1>
      </div> */}

      <DataManagementTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        renderAddButton={activeTab !== "documents" ? renderAddButton : null}
      />

      <div className="flex-1 overflow-auto relative z-10 p-5 h-full">
        {/* Add button row */}
        {/* <div className="flex justify-between items-center mb-4">
          <div></div> 
          <div className="flex space-x-2">
            {activeTab !== "documents" && renderAddButton()}
          </div>
        </div> */}

        {/* Dynamic Form Modal */}
        {showForm && (
          <div className="fixed inset-0 flex justify-center items-center  bg-black/45 backdrop-blur-sm z-50">
            <div className="max-w-3xl bg-white dark:bg-black p-6 rounded-lg shadow-lg w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Add {getSingularTabName()}
                </h2>
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
                title={`Add ${getSingularTabName()}`}
                fields={getFormFields()[getSingularTabName()] || []}
                onSubmit={handleFormSubmit}
                isEmbedded={true}
              />
            </div>
          </div>
        )}
        {/* Document Form Modal */}
        {showDocumentForm && (
          <DocumentFormModal onClose={() => setShowDocumentForm(false)} />
        )}

        {/* Project Modal */}
        {showProjectModal && (
          <div className="fixed inset-0 flex justify-center items-start bg-black bg-opacity-50 z-50 overflow-y-auto p-4">
            <div className="my-4 mx-auto w-full max-w-6xl">
              <div className="relative">
                <button
                  onClick={() => setShowProjectModal(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
                >
                  <X size={24} />
                </button>
                <ProjectModal
                  onClose={() => setShowProjectModal(false)}
                  onProjectAdded={handleProjectAdded}
                />
              </div>
            </div>
          </div>
        )}

        {/* <TableConfigFilter
          filterTable={filterTable}
          filterBasedOnDays={filterBasedOnDays}
          updateShowDateFunctionality={updateShowDateFunctionality}
          showDate={showDate}
          columnSetting={columnSetting}
          filterTableBasedonSearchTerm={filterTableBasedonSearchTerm}
          setColumnSetting={setColumnSetting}
        ></TableConfigFilter>

        <div className="overflow-x-auto">
          <TableData
            tableData={tableData}
            showDate={showDate}
            sortTableData={sortTableData}
            columnSetting={columnSetting}
          ></TableData>
        </div>
        <Pagination pagination={pagination} getPageData={getPageData} /> */}
        <Suspense fallback={<Loader />}>
          <DataSection
            key={processedCategory}
            tableName={processedCategory}
            getData={getData}
            refreshTrigger={refreshTrigger}
          />
        </Suspense>
        <style jsx global>{`
          .resizer {
            position: absolute;
            right: 0;
            top: 0;
            height: 100%;
            width: 5px;
            background: rgba(0, 0, 0, 0.1);
            cursor: col-resize;
            user-select: none;
            touch-action: none;
          }

          .resizer.isResizing {
            background: rgba(0, 0, 0, 0.3);
          }
        `}</style>
      </div>
    </div>
  );
};

export default DataManagementPage;
