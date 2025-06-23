import React, { useState, useEffect } from "react";
import { Plus, ChevronRight, Trash2 } from "lucide-react";
import axiosInstance from "../axiosInstance";
import axios from "axios";
import useAuthStore from "../store/authStore";

const initialTasks = {
  completed: [
    { id: "1", title: "Conducted the review meeting with the client", completed: true },
    { id: "2", title: "Shared the business requirement document for review to the business team", completed: true },
    { id: "3", title: "Shared the quality check document with contract department", completed: true },
  ],
  planned: [
    { id: "4", name: "Conducted the review meeting with the client" },
    { id: "5", name: "Shared the business requirement document for review to the business team" },
    { id: "6", name: "Shared the quality check document with contract department" },
  ],
  previous: [
    { id: "7", title: "Conducted the review meeting with the client" },
    { id: "8", title: "Shared the business requirement document for review to the business team" },
  ],
};

export default function ProjectTasks({ projectId }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [newTask, setNewTask] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [previousMeetings, setPreviousMeetings] = useState([]);
  const [selectedMeetingIndex, setSelectedMeetingIndex] = useState(0);
  const [selectedMeetingNotes, setSelectedMeetingNotes] = useState([]);
  const [previousWeekTasks, setPreviousWeekTasks] = useState([]);
  const [selectedTaskWeek, setSelectedTaskWeek] = useState("");
  const [selectedTaskWeekIndex, setSelectedTaskWeekIndex] = useState(0)
  const [selectedTaskWeekLists, setSelectedTaskWeekLists] = useState([]);
  const [nextWeekTasks, setNextWeekTasks] = useState([]);
  const { userId, role, isMeetingPage } = useAuthStore();
  console.log("user id in project tasks", userId);
  console.log("role in project tasks", role);

  const fetchPreviousMeetingNotes = async () => {
    const response = await axiosInstance.get(`/project-card/meeting-notes/${projectId}`);
    console.log("meeting notes in project task");
    console.log(response.data.result);
    setPreviousMeetings(response.data.result);
    setSelectedMeetingIndex(0);
    setSelectedMeetingNotes(response.data.result[0].meeting_notes);
  };

  const fetchPreviousTasks = async () => {
    const response = await axiosInstance.get(`/project-card/project-tasks/${projectId}`);
    console.log("the previous meeting notes are");
    console.log(response);
    setPreviousWeekTasks(response.data.result);
    setSelectedTaskWeekIndex(0);
    setSelectedTaskWeekLists(response.data.result[0].project_tasks);
  };

  const fetchNextWeekTasks = async () => {
    const response = await axiosInstance.get(`/project-card/next-week-task/${projectId}`);
    console.log("the next week tasks are");
    console.log(response);
    setNextWeekTasks(response.data.result);
  };

  const deleteNextWeekTask = async (id) => {
    const response = await axiosInstance.delete(`/project-card/next-week-task/${id}`);
    if (response.status === 200) {
      setNextWeekTasks((e) => e.filter((task) => task.id !== id));
    }
  };

  useEffect(() => {
    fetchPreviousMeetingNotes();
    fetchPreviousTasks();
    fetchNextWeekTasks();
  }, [projectId]);

  const handlePreviousMeetingChange = (i) => {
    setSelectedMeetingIndex(i)
    const meeting = previousMeetings[i];
    console.log(meeting);
    setSelectedMeetingNotes(meeting.meeting_notes);
  };

  const handlePreviousTaskWeekChange = (i) => {
    setSelectedTaskWeekIndex(i);  
    const weeklytasks = previousWeekTasks[i];
    console.log("selected tasks"+weeklytasks);
    setSelectedTaskWeekLists(weeklytasks.project_tasks);
  };

  const addTask = async () => {
    if (newTask.trim()) {
      console.log("new tasks:" + newTask);
      console.log("project Id " + projectId);
      const result = await axiosInstance.post("/project-card/next-week-task", {
        notes: newTask.trim(),
        projectId,
        userId: 25,
      });
      if (result.status === 201) {
        console.log("***success");
        console.log([...nextWeekTasks, ...result.data.result]);
        setNextWeekTasks((e) => {
          return [...e, ...result.data.result];
        });
      }
      setNewTask("");
      setShowAddTask(false);
      console.log(result);
    }
  };

  const TaskList = ({ records, title, showFilter = false, filterOptions, selectedFilterOption, onChangeHandler }) => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-gray-900 mb-3">{title}</h3>
        {showFilter && (
          <select
            className="text-sm border rounded px-2 py-1 text-gray-700 bg-white shadow-sm"
            value={selectedFilterOption}
            onChange={(e) => onChangeHandler(Number(e.target.value))}
          >
            {filterOptions.map((option, i) => (
              <option key={i} value={i}>
                {option.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="space-y-2">
        {records &&
          records.map((task) => (
            <div key={task.id} className="flex items-start gap-2 text-sm text-gray-700">
              <ChevronRight className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
              <span>{task.name}</span>
              {title === "Planned tasks for next week" && !isMeetingPage && (
                <button
                  onClick={() => deleteNextWeekTask(task.id)}
                  className="ml-auto text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border h-[600px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
        {!isMeetingPage && (
          <button
            onClick={() => setShowAddTask(!showAddTask)}
            className="flex items-center gap-2 text-sm px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        )}
      </div>

      {!isMeetingPage && showAddTask && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter new task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            />
            <button
              onClick={addTask}
              className="text-sm px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddTask(false);
                setNewTask("");
              }}
              className="text-sm px-3 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6 overflow-y-auto flex-1 pr-2 
                   scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 
                   hover:scrollbar-thumb-gray-400"
           style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
        <TaskList
          title="Previous Meeting Notes"
          showFilter={true}
          onChangeHandler={handlePreviousMeetingChange}
          selectedFilterOption={selectedMeetingIndex}
          filterOptions={previousMeetings}
          records={selectedMeetingNotes}
        />
        <TaskList
          title="Previous tasks"
          showFilter={true}
          onChangeHandler={handlePreviousTaskWeekChange}
          selectedFilterOption={selectedTaskWeekIndex}
          filterOptions={previousWeekTasks}
          records={selectedTaskWeekLists}
        />
        <TaskList
          records={nextWeekTasks}
          title="Planned tasks for next week"
        />
      </div>
    </div>
  );
}

