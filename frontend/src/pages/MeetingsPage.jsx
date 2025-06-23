import React, { useState , useEffect , useRef} from "react";
import { useNavigate } from "react-router-dom";
import TopHeader from "../components/TopHeader";
import ProjectMeetingSidebar from "../components/ProjectMeetingSidebar";
import MeetingNotesSection from "../components/MeetingNotesSection";
import ProjectCards from "../components/ProjectCards"; // Ensure ProjectCards is imported
import ProjectTiles from "../components/ProjectTiles"; // Ensure ProjectTiles is imported
import ProjectSelectCard from "../components/ProjectSelectCard"; // Ensure ProjectSelectCard is imported
import ProjectMeetingHeader from "../components/ProjectMeetingHeader"; // Ensure ProjectMeetingHeader is imported
import { NotebookPen, ChevronLeft, ChevronRight } from "lucide-react"; // Ensure icons are imported
import useAuthStore from "../store/authStore"; // Import the Zustand store
import axiosInstance from "../axiosInstance"; // Ensure axiosInstance is imported


const MeetingsPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false); // State for notes panel


  const [sideBarFilters , setSideBarFilters] = useState([]);
  const [activeSideBarFilter , setActiveSideBarFilter] = useState("");
  const [subFilters , setSubFilters] = useState([]);
  const [activeSubFilter , setActiveSubFilter] = useState("");
  const [projects , setProjects] = useState([]);
  const { meetingId, selectedProject, setSelectedProject, setIsMeetingPage } = useAuthStore(); // Use store
  const navigate = useNavigate();
  const subFiltersCache = useRef({});
  // const [selectedProjectId, setSelectedProjectId] = useState(null); // Remove local state


  // Mounting stage
  useEffect(()=>{
    console.log('meeting id',meetingId);
    fetchMainFilters();
    console.log("use effect is called");
    // console.log(formatDateWithWeek(new Date("2025-05-01")));
  },[]);

  // useEffect to log selectedProject when it changes (for debugging)
  useEffect(() => {
    console.log("Selected project from store:", selectedProject);
  }, [selectedProject]);


  const fetchMainFilters = async ()=>{
    const response = await axiosInstance.get('/meeting/main-filters');
    if(response)
    {
      console.log(response.data.result);
      setSideBarFilters(response.data.result);
    }
  }
  const toggleSidebar = () => setIsSidebarOpen((open) => !open);
  // Toggle function for notes panel
  const toggleNotesPanel = () => setIsNotesPanelOpen((open) => !open);

  const handleSideBarOptionClick = async (option)=>{
    setActiveSideBarFilter(option);
    console.log("the option clicked "+option );
    if(subFiltersCache.current[option])
    { 
      console.log("inside the cache");
      setSubFilters(subFiltersCache.current[option]);
    }

    const response = await axiosInstance.get(`/meeting/sub-filters/${option}`);

    if(response)
    {
      console.log(response.data.result);
      setSubFilters(response.data.result);
      subFiltersCache.current[option] = response.data.result;
    }
  }
  const handleSubOptionClick = async (option)=>{
    setActiveSubFilter(option);
    console.log("the option is"+option);
    console.log("the sidebar filter is"+activeSideBarFilter);
    const response = await axiosInstance.get(`/meeting/projects?filterType=${activeSideBarFilter}&filterValue=${option}`);
    console.log(response);
    const projects = response.data.result;
    console.log(projects);
    setProjects(projects);
    setSelectedProject(null); // Reset selected project when subfilter changes

  }

  // Handle back button click - navigate to dashboard and reset meeting state
  const handleBackToDashboard = () => {
    setIsMeetingPage(false);
    navigate('/dashboard');
  };

  // Show project select cards for any tab (for demo)
  const showProjectCards = !!activeSubFilter;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-black">
      <TopHeader />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Project Meeting Sidebar (Left Navigation) */}
        <ProjectMeetingSidebar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          activeSideBarFilter={activeSideBarFilter}
          handleSideBarOptionClick={handleSideBarOptionClick}
          categories={sideBarFilters}
        />

        {/* Main Content Area (Header + Main Section) */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Project Meeting Header */}
          <ProjectMeetingHeader
            toggleSidebar={toggleSidebar}
            subFilters={subFilters}
            activeSubFilter={activeSubFilter}
            handleSubOptionClick={handleSubOptionClick}
          />

          {/* Main Section: Show project cards for any tab (demo) */}
          {!selectedProject && projects && projects.length > 0 && (
            <div className="p-6 overflow-x-auto h-55">
              <div className="flex space-x-4 min-w-max">
                {projects.map((project) => (
                  <ProjectSelectCard
                    key={project.id}
                    project={project}
                    onSelect={() => {
                        console.log("Setting selected project:", project);
                        setSelectedProject(project);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Show ProjectCards and ProjectTiles when a project is selected */}
          {selectedProject && selectedProject.id && (
            <div className="p-6">
              <button
                className="inline-flex items-center border border-indigo-300 px-3 py-1.5 rounded-md text-blue-600 hover:bg-blue-50 mb-4"
                onClick={handleBackToDashboard}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                <span className="ml-1 font-bold text-lg">Back</span>
              </button>
              <ProjectTiles projectId={selectedProject.id} />
              <ProjectCards projectId={selectedProject.id} projectName={selectedProject.name}  phaseName={selectedProject.phase_name} />
            </div>
          )}

          {/* Project Meeting Main Section */}
          {/* <ProjectMeetingMainSection
            currentCategory={currentCategoryData}
            activeOption={activeOption}
            mainContent={<ProjectTasksSection />}
          /> */}
          {/* <ProjectTiles/>
          <ProjectCards /> */}
        </div>

        {/* Sticky Toggle for Notes Panel */}
        {!isNotesPanelOpen && selectedProject &&  (
          <button
            onClick={toggleNotesPanel}
            className="fixed right-4 bottom-4 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors z-50"
            aria-label="Open Meeting Notes"
          >
            <NotebookPen size={24} />
          </button>
        )}

        {/* Sticky Expandable Notes Panel */}
        <div
          className={`fixed right-0 top-16 bottom-0 bg-white shadow-lg transition-all duration-300 ease-in-out overflow-y-auto ${
            isNotesPanelOpen ? "w-150" : "w-0"
          }`}
        >
          <div
            className={`p-4 h-full ${isNotesPanelOpen ? "block" : "hidden"}`}
          >
            {" "}
            {/* Hide content when collapsed */}
            <button
              onClick={toggleNotesPanel}
              className="absolute top-2 left-2 text-gray-500 hover:text-gray-700"
            >
              {isNotesPanelOpen ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}{" "}
              {/* Arrow icon */}
            </button>
            {selectedProject &&
              <MeetingNotesSection 
              meetingId = {meetingId}
              projectId = {selectedProject?.id}
            />
            }
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingsPage;
