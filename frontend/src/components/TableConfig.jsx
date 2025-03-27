import React, { useState } from "react";
import { Zap, Users, ShoppingBag, BarChart2 } from "lucide-react";

const TableConfig = ({
  children,
  updateALLorMyTaskRetreival,
  openTaskCount,
  delayedTaskCount,
  updateOpenorClosedTaskRetreival,
}) => {
  const [selectedTaskFilter, setSelectedTaskFilter] = useState("open");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] =
    useState("Me");

  function radioButtonChangeHandler(value) {
    setSelectedDepartmentFilter(value);
    updateALLorMyTaskRetreival(value);
  }

  function OpenOrClosedTaskChangeHandler(value) {
    setSelectedTaskFilter(value);
    updateOpenorClosedTaskRetreival(value);
  }

  return (
    <>
      <div className="max-w-7xl py-5 px-5 lg:px-0 xl:px-0">
        {/* STATS */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className={`backdrop-blur-md overflow-hidden shadow-lg rounded-xl border ${
              selectedTaskFilter === "open"
                ? "border-blue-400"
                : "border-gray-200"
            } bg-gray-900/10 dark:bg-gray-100/10`}
            whileHover={{
              y: -5,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
            onClick={() => OpenOrClosedTaskChangeHandler("Open")}
          >
            <div className="px-4 py-5 sm:p-6 cursor-pointer">
              <span className="flex items-center text-sm font-medium text-black dark:text-white">
                <div
                  className="p-2 rounded-full mr-2"
                  style={{ backgroundColor: "#c1e5f5" }}
                >
                  <Users size={20} style={{ color: "#000000" }} />
                </div>
                Open Tasks
              </span>
              <p className="mt-1 text-3xl font-semibold dark:text-white">
                {openTaskCount}
              </p>
            </div>
          </div>
          <div
            className={`backdrop-blur-md overflow-hidden shadow-lg rounded-xl border ${
              selectedTaskFilter === "closed"
                ? "border-blue-400"
                : "border-gray-200"
            } bg-gray-900/10 dark:bg-gray-100/10`}
            whileHover={{
              y: -5,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
            onClick={() => OpenOrClosedTaskChangeHandler("closed")}
          >
            <div className="px-4 py-5 sm:p-6 cursor-pointer">
              <span className="flex items-center text-sm font-medium text-black dark:text-white">
                <div
                  className="p-2 rounded-full mr-2"
                  style={{ backgroundColor: "#e7704b" }}
                >
                  <Users size={20} style={{ color: "#000000" }} />
                </div>
                Delayed Tasks
              </span>
              <p className="mt-1 text-3xl font-semibold dark:text-white">
                {delayedTaskCount}
              </p>
            </div>
          </div>
        </div>
      </div>
      {children}
      <div className="relative flex-1 overflow-x-auto mb-5">
        <div className="flex">
          <div className="flex items-center me-4">
            <label className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">
              Show only
            </label>
          </div>
          <div
            className="flex items-center me-4"
            onClick={() => radioButtonChangeHandler("Me")}
          >
            <input
              id="inline-radio"
              type="radio"
              value=""
              name="inline-radio-group"
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              checked={selectedDepartmentFilter === "Me"}
              onChange={() => {}}
            />
            <label
              htmlFor="inline-radio"
              className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
            >
              My Tasks
            </label>
          </div>
          <div
            className="flex items-center me-4"
            onClick={() => radioButtonChangeHandler("Department")}
          >
            <input
              id="inline-2-radio"
              type="radio"
              value=""
              name="inline-radio-group"
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              checked={selectedDepartmentFilter === "Department"}
              onChange={() => {}}
            />
            <label
              htmlFor="inline-2-radio"
              className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
            >
              All Departments
            </label>
          </div>
        </div>
      </div>
    </>
  );
};

export default TableConfig;
