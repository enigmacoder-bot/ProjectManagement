import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  LayoutGrid,
  Users,
  Sun,
  Moon,
  LogOut,
  X,
} from "lucide-react";
import logo from "../assets/rakias-logo.png";
import userPicture from "../assets/userlogo.png";
import useAuthStore from "../store/authStore";
import axiosInstance from "../axiosInstance";

const TopHeader = () => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { email, role, setMeetingId, setIsMeetingPage } = useAuthStore();

  const profileRef = useRef(null);
  const appsRef = useRef(null);

  const handleClickOutside = (event) => {
    if (profileRef.current && !profileRef.current.contains(event.target)) {
      setIsProfileOpen(false);
    }
    if (appsRef.current && !appsRef.current.contains(event.target)) {
      setIsAppsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    }
  }, []);

  const handleProfileClick = () => {
    setIsProfileOpen(!isProfileOpen);
    setIsAppsOpen(false); // Close other dropdowns
  };

  const handleAppsClick = () => {
    setIsAppsOpen(!isAppsOpen);
    setIsProfileOpen(false); // Close other dropdowns
  };

  const closeAppsMenu = () => {
    setIsAppsOpen(false);
  };

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    }
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsProfileOpen(false);
    setIsMeetingPage(false); // Reset meeting page flag on logout
    navigate("/");
  };

  const handleMeetingRequestClick = async() => {
    const response = await axiosInstance.post("/meeting/meeting",{
      name : formatDateWithWeek(new Date()),
      user_id :22
    })
    console.log("the meeting id is");
    console.log(response.data.result[0].id);
    console.log(response.status);
    if(response.status == '201')
    {
      setMeetingId(response.data.result[0].id);
      setIsMeetingPage(true); // Set meeting page flag to true
      navigate("/meetings");
      closeAppsMenu();
    }
  };
  function formatDateWithWeek(date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const dayName = days[date.getDay()];
  const day = date.getDate();
  const monthName = months[date.getMonth()];
  const yearShort = date.getFullYear().toString().slice(-2);
  const week = getWeekOfMonth(date);

  return `${dayName} ${day} ${monthName} ${yearShort} (W${week})`;
}

  // Helper: calculate which week of the month
  function getWeekOfMonth(date) {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfWeek = startOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const adjustedDate = date.getDate() + dayOfWeek;
    return Math.ceil(adjustedDate / 7);
  }

  return (
    <header className="antialiased">
      <nav className="bg-white border-gray-200 px-4 lg:px-6 py-2.5 dark:bg-[#1D1D1D]">
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex justify-start items-center">
            {/* Logo */}
            <a href="#" className="flex mr-4">
              <img
                src={logo} // Use the imported logo variable
                className="mr-3 h-10"
                alt="Rakais Logo"
              />
              <span className="self-center text-3xl font-semibold whitespace-nowrap dark:text-white">
                Rakais
              </span>
            </a>
          </div>

          <div className="flex items-center lg:order-2">
            {/* User Role */}
            <span className="mr-3 font-bold text-gray-600 dark:text-gray-400">
              {role}
            </span>

            {/* Notifications */}
            <button
              type="button"
              className="p-2 mr-1 text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
            >
              <span className="sr-only">View notifications</span>
              <Bell className="w-6 h-6" />
            </button>

            {/* Apps */}
            <div className="relative" ref={appsRef}>
              <button
                type="button"
                className="p-2 text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
                onClick={handleAppsClick}
              >
                <span className="sr-only">Quick Services</span>
                <LayoutGrid className="w-6 h-6" />
              </button>

              {/* Quick Services Dropdown - Updated to match the second image */}
              {isAppsOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="apps-menu-button"
                >
                  <div className="p-4" role="none">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        Quick services
                      </h3>
                      <button
                        onClick={closeAppsMenu}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div
                        className="border rounded-md p-3 flex flex-col items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                        onClick={handleMeetingRequestClick} // Added onClick handler
                      >
                        <Users className="w-8 h-8 mb-2 text-gray-700 dark:text-gray-300" />
                        <span className="text-xs text-center font-medium text-gray-800 dark:text-gray-300">
                          Meeting Request
                        </span>
                      </div>

                      <div className="border rounded-md p-3 flex flex-col items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                        {/* Empty service slot */}
                      </div>

                      <div className="border rounded-md p-3 flex flex-col items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                        {/* Empty service slot */}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              className="p-2 text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
              onClick={toggleDarkMode}
            >
              <span className="sr-only">Enable Dark Mode</span>
              {isDarkMode ? (
                <Sun className="w-6 h-6" />
              ) : (
                <Moon className="w-6 h-6" />
              )}
            </button>

            {/* User Menu */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                className="flex mx-3 text-sm bg-gray-800 rounded-full md:mr-0 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
                id="user-menu-button"
                onClick={handleProfileClick}
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
              >
                <span className="sr-only">Open user menu</span>
                <img
                  className="w-10 h-8 rounded-full"
                  src={userPicture}
                  alt="user photo"
                />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                >
                  <div className="py-3 px-4">
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                      {email}
                    </span>
                  </div>
                  <ul
                    className="py-1 text-gray-500 dark:text-gray-400"
                    aria-labelledby="dropdown"
                  >
                    <li>
                      <a
                        href="#"
                        className="block py-2 px-4 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-400 dark:hover:text-white"
                      >
                        Account settings
                      </a>
                    </li>
                  </ul>
                  <ul
                    className="py-1 text-gray-500 dark:text-gray-400"
                    aria-labelledby="dropdown"
                  ></ul>
                  <ul
                    className="py-1 text-gray-500 dark:text-gray-400"
                    aria-labelledby="dropdown"
                  >
                    <li>
                      <a
                        href="#"
                        className="block py-2 px-4 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                        onClick={(e) => {
                          e.preventDefault();
                          handleLogout();
                        }}
                      >
                        <LogOut className="mr-2 w-5 h-5 text-gray-400" />
                        Sign out
                      </a>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default TopHeader;
