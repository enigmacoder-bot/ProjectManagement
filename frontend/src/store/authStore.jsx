import { create } from "zustand";

const useAuthStore = create((set) => ({
  token: localStorage.getItem("token") || null,
  role: localStorage.getItem("role") || null,
  userId: localStorage.getItem("userId") || null,
  email: localStorage.getItem("email") || null,
  users: [],
  projectTypes: [],
  projectPhases: [],
  documents: [],
  departments: [],
  roles: [],
  initiatives: [],
  meetingId: localStorage.getItem("meetingId") || null,
  selectedProject: null, // Add new state for selected project
  isMeetingPage: false, // Add new state for meeting page
  setToken: (token) => {
    set({ token });
    localStorage.setItem("token", token);
  },
  setRole: (role) => {
    set({ role });
    localStorage.setItem("role", role);
  },
  setUserId: (userId) => {
    // Add setter for userId
    set({ userId });
    localStorage.setItem("userId", userId);
  },
  setEmail: (email) => {
    // Add setter for email
    set({ email });
    localStorage.setItem("email", email);
  },
  clearToken: () => {
    set({ token: null, role: null, email: null, isMeetingPage: false });
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
  },
  setUsers: (users) => {
    set({ users });
  },
  setProjectTypes: (projectTypes) => {
    set({ projectTypes }); // Correctly stores the array of objects
  },
  setProjectPhases: (projectPhases) => {
    set({ projectPhases });
  },
  setDocuments: (documents) => {
    set({ documents });
  },
  setDepartments: (departments) => {
    set({ departments });
  },
  setRoles: (roles) => {
    set({ roles });
  },
  setInitiatives: (initiatives) => {
    set({ initiatives });
  },
    setMeetingId: (meetingId) => { // ✅ NEW
    set({ meetingId });
    localStorage.setItem("meetingId", meetingId);
  },
  setSelectedProject: (project) => { // Add setter for selected project
    set({ selectedProject: project });
  },
  setIsMeetingPage: (isMeetingPage) => { // Add setter for meeting page
    set({ isMeetingPage });
  },
  resetMeetingPage: () => { // Add function to reset meeting page flag
    set({ isMeetingPage: false });
  },
}));

export default useAuthStore;
