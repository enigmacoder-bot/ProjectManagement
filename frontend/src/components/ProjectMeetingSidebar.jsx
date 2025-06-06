import React, { useState } from "react";
import {
  BarChart3,
  Users,
  FolderOpen,
  GitBranch,
  Briefcase,
  Code,
  Building,
  User,
  DollarSign,
  Star,
  Menu,
} from "lucide-react";

export default function ProjectMeetingSidebar({
  activeSideBarFilter,
  setActiveSideBarFilter,
  handleSideBarOptionClick,
  isSidebarOpen,
  categories
}) {
  return (
    <div
      className={`h-screen bg-white border-r border-gray-200 transition-all duration-300 ${
        isSidebarOpen ? "w-64" : "w-0 overflow-hidden"
      }`}
    >
      <div className="p-4">
        <div className="text-sm font-medium text-gray-500 px-2 py-2 mb-4">
          Weekly Meeting No 45
        </div>
        <nav className="space-y-1">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeSideBarFilter === category.name;
            return (
              <button
                key={category.name}
                onClick={() => handleSideBarOptionClick(category.name)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4 mr-3" />
                <span>{category.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
