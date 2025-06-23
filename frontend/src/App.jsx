import React from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import UsersPage from "./pages/UsersPage";
import LoginPage from "./pages/LoginPage";
import SidebarPage from "./pages/SidebarPage";
import DataSection from "./pages/DataSection";
import DataManagementPage from "./pages/DataManagementPage";
import DashboardPage from "./pages/DashboardPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import ProjectTimeLineSettings from "./pages/ProjectTimelineSettings";
import Expected from "./pages/Expected";
import UserAccordion from "./components/UserAccordion";
import BoqTaskAccordion from "./components/BoqTaskAccordion";
import DeliverablesAccordion from "./components/DeliverableAccordion";
import ProjectModal from "./components/ProjectModal";
import TasksAccordion from "./components/TasksAccordion";
import { Toaster } from "sonner";
import PMPage from "./pages/PMPage";
import AdminPage from "./pages/AdminPage";
import SchedulePlanSection from "./components/SchedulePlanSection";
import SchedulePlan from "./components/SchedulePlan";
import HomePage from "./pages/PMOPage";
import PMOPage from "./pages/PMOPage";
import DashboardContainerPage from "./pages/DashboardContainerPage";
import MeetingsPage from "./pages/MeetingsPage";

const App = () => {
  return (
    <div>
      <Toaster position="top-center" richColors />
      <Outlet />
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
      {
        path: "/home",
        element: (
          <ProtectedRoute
            allowedRoles={["PM", "PMO", "DEPUTY", "ADMIN", "USER"]}
          >
            <HomePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/tasks",
        element: (
          <ProtectedRoute allowedRoles={["PM", "PMO", "DEPUTY"]}>
            <PMPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/data-management",
        element: (
          <ProtectedRoute allowedRoles={["PMO", "DEPUTY"]}>
            <PMOPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute allowedRoles={["USER", "PMO","PM","DEPUTY"]}>
            <DashboardContainerPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/meetings",
        element: (
          <ProtectedRoute allowedRoles={["USER", "PMO","DEPUTY"]}>
            <MeetingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/activities",
        element: (
          <ProtectedRoute allowedRoles={["PMO", "ADMIN"]}>
            <ActivitiesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/expected",
        element: <Expected />,
      },
      {
        path: "/phase",
        element: <ProjectTimeLineSettings />,
      },
      {
        path: "project",
        element: <ProjectModal />,
      },
      {
        path: "/admin",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/boq",
        element: <BoqTaskAccordion />,
      },
      {
        path: "deli",
        element: <DeliverablesAccordion />,
      },
      {
        path: "sc",
        element: <SchedulePlan />,
      },
      {
        path: "plan",
        element: <SchedulePlanSection />,
      },
    ],
  },
]);

export default App;
