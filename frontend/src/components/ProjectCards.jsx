"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Download,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Calendar,
  AlertTriangle,
  Clock,
} from "lucide-react";
import RisksAndIssuesTable from "./RisksAndIssuesTable.jsx";
import ProjectDelivarablesTable from "./ProjectDelivarablesTable.jsx"; // Changed import
import ProjectTasks from "./ProjectTasks.jsx";
import ProjectDeliverables from "./ProjectDeliverables.jsx";

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-1/3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Main Component
const ProjectCards = () => {
  const [deliverables, setDeliverables] = useState([
    {
      id: "DEL-001",
      name: "Initial Project Setup & Configuration",
      duration: "15 days",
      progress: 100,
      budget: "5,000 SAR",
      invoiced: "5,000 SAR",
      start_date: "2025-01-10",
      end_date: "2025-01-25",
      scope_percentage: "100%",
      payment_percentage: "100%",
      status: "Completed",
    },
    {
      id: "DEL-002",
      name: "User Interface Design & Prototyping",
      duration: "30 days",
      progress: 75,
      budget: "12,000 SAR",
      invoiced: "8,000 SAR",
      start_date: "2025-01-26",
      end_date: "2025-02-24",
      scope_percentage: "75%",
      payment_percentage: "50%",
      status: "In Progress",
    },
    {
      id: "DEL-003",
      name: "Backend Development & API Integration",
      duration: "45 days",
      progress: 40,
      budget: "20,000 SAR",
      invoiced: "5,000 SAR",
      start_date: "2025-02-25",
      end_date: "2025-04-10",
      scope_percentage: "40%",
      payment_percentage: "25%",
      status: "In Progress",
    },
    {
      id: "DEL-004",
      name: "Testing, QA & Bug Fixing Phase",
      duration: "20 days",
      progress: 0,
      budget: "8,000 SAR",
      invoiced: "0 SAR",
      start_date: "2025-04-11",
      end_date: "2025-04-30",
      scope_percentage: "0%",
      payment_percentage: "0%",
      status: "Not Started",
    },
    {
      id: "DEL-005",
      name: "Deployment and Go-Live Activities",
      duration: "10 days",
      progress: 0,
      budget: "6,000 SAR",
      invoiced: "0 SAR",
      start_date: "2025-05-01",
      end_date: "2025-05-10",
      scope_percentage: "0%",
      payment_percentage: "0%",
      status: "Not Started",
    },
  ]);

  const deliverableColumns = [
    { columnName: "ID", dbColumn: "id" },
    { columnName: "Deliverable Name", dbColumn: "name" },
    { columnName: "Duration", dbColumn: "duration" },
    { columnName: "Progress %", dbColumn: "progress" },
    { columnName: "Budget (SAR)", dbColumn: "budget" },
    { columnName: "Invoiced (SAR)", dbColumn: "invoiced" },
    { columnName: "Start Date", dbColumn: "start_date" },
    { columnName: "End Date", dbColumn: "end_date" },
    { columnName: "Scope %", dbColumn: "scope_percentage" },
    { columnName: "Payment %", dbColumn: "payment_percentage" },
    { columnName: "Status", dbColumn: "status" },
  ];

  const [isDeliveryCompletionOpen, setDeliveryCompletionOpen] = useState(false);
  const [isDeliveryInvoiceOpen, setDeliveryInvoiceOpen] = useState(false);
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Form submitted!");
  };

  const openModal = (deliverable, modalType) => {
    setSelectedDeliverable(deliverable);
    if (modalType === "completion") setDeliveryCompletionOpen(true);
    if (modalType === "invoice") setDeliveryInvoiceOpen(true);
    if (modalType === "details") setDetailsOpen(true);
  };

  return (
    <div className="p-6">
      {/* Removed the main "Project Cards" h1 title as sections will have their own */}
      <div className="my-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">
          Project Deliverables
        </h2>
        <ProjectDelivarablesTable
          data={deliverables}
          columns={deliverableColumns}
          tableName="projectDeliverables"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <ProjectDeliverables />
        <ProjectTasks />
      </div>
      <div className="my-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">
          Risks and Issues
        </h2>
        <RisksAndIssuesTable /> {/* Assuming RisksAndIssuesTable handles its own data or uses a default */}
      </div>
    </div>
  );
};

export default ProjectCards;
