import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  ListChecks,
  ChartPie,
  Database,
  Clock5,
  Settings,
  Calendar,
} from "lucide-react";
import useAuth from "../hooks/userAuth";
import useLanguage from "../hooks/useLanguage";
import usEnglishIcon from "../assets/usenglish.png";
import arabicIcon from "../assets/arabic.png";
import saudiIcon from "../assets/saudi.png";
const SIDEBAR_ITEMS = [
  {
    name: "tasks",
    icon: ListChecks,
    href: "/tasks",
    roles: ["PM", "PMO", "DEPUTY"],
  },
  {
    name: "dataManagement",
    icon: Database,
    href: "/data-management",
    roles: ["PMO"],
  },
  {
    name: "admin",
    icon: Settings,
    href: "/admin",
    roles: ["ADMIN"],
  },
  {
    name: "dashboard",
    icon: ChartPie,
    href: "/dashboard",
    roles: ["USER", "PMO","PM","DEPUTY"],
  },
  // {
  //   name: "meetings",
  //   icon: Calendar,
  //   href: "/meetings",
  //   roles: ["USER", "PMO"],
  // },
];

const SidebarPage = ({ isSidebarOpen, toggleSidebar }) => {
  const { t, currentLanguage, changeLanguage } = useLanguage();
  const location = useLocation();
  const { role } = useAuth();
  console.log("Role of user logged in: ", role);

  const handleToggleSidebar = () => {
    toggleSidebar();
  };

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
  };

  const filteredSidebarItems = SIDEBAR_ITEMS.filter((item) =>
    item.roles.includes(role)
  );
  console.log("items", filteredSidebarItems);

  return (
    // Remove the fixed positioning and top value to prevent overlap
    <div className="h-full ">
      <div className="absolute top-2 left-2 p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
        <button
          onClick={handleToggleSidebar}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>
      <div
        className={`h-full overflow-y-auto transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-20"
        } bg-white dark:bg-[#1D1D1D] shadow-lg`}
      >
        <div className="h-full flex flex-col justify-between">
          <nav className="mt-16 flex-grow">
            <ul className="space-y-2 font-medium">
              {filteredSidebarItems.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={`flex items-center p-2 pl-4 rounded-lg group ${
                      location.pathname === item.href
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                        : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <item.icon
                      className={`w-6 h-6 transition duration-75 ${
                        location.pathname === item.href
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                      }`}
                    />
                    <span
                      className={`ml-3 whitespace-nowrap transition-all duration-300 ${
                        isSidebarOpen
                          ? "opacity-100 max-width-[200px] transform translate-x-0"
                          : "opacity-0 max-width-0 transform -translate-x-10 pointer-events-none"
                      }`}
                      style={{
                        transitionDelay: isSidebarOpen ? "150ms" : "0ms",
                        maxWidth: isSidebarOpen ? "200px" : "0px",
                        overflow: "hidden",
                      }}
                    >
                      {t(item.name)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div
            className={`flex justify-end p-4 transition-all duration-300 ${
              isSidebarOpen ? "opacity-100" : "opacity-0 overflow-hidden"
            }`}
          >
            <button
              onClick={() => handleLanguageChange("en")}
              className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                currentLanguage === "en"
                  ? "border-blue-500"
                  : "border-transparent"
              } overflow-hidden ${isSidebarOpen ? "scale-100" : "scale-0"}`}
            >
              <img
                src={usEnglishIcon}
                alt="English"
                className="w-full h-full object-cover"
              />
            </button>
            <button
              onClick={() => handleLanguageChange("ar")}
              className={`w-10 h-10 rounded-full border-2 ml-2 transition-all duration-300 ${
                currentLanguage === "ar"
                  ? "border-blue-500"
                  : "border-transparent"
              } overflow-hidden ${isSidebarOpen ? "scale-100" : "scale-0"}`}
            >
              <img
                src={saudiIcon}
                alt="Arabic"
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarPage;
