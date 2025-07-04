import React, { useState , useEffect } from "react";
import axiosInstance from "../axiosInstance";
import {
  MoreHorizontal,
  Plus,
  Flag,
  ChevronDown,
  X,
} from "lucide-react";
import axios from "axios";


const currentProject = "disasterRecovery"; // Can be dynamic

const allMeetingNotes = {
  disasterRecovery: {
    current: [
      { id: 1, text: "Send invitation to bidders", completed: true },
    ],
    previous: {
      "2024-05-10": [
        { id: 2, text: "Arrange another meeting with vendor", completed: true },
        { id: 3, text: "Invite business owners", completed: true },
      ],
      "2024-04-20": [
        { id: 4, text: "Finalize budget approval", completed: true },
      ],
    },
  },
};

const MeetingNotesSection = ({meetingId , projectId}) => {
  const [showModal, setShowModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [selectedMeetingDate, setSelectedMeetingDate] = useState([]);
  const [currentNotes, setCurrentNotes] = useState(
    allMeetingNotes[currentProject].current
  );
  const [currentMeetingNotes , setCurrentMeetingNotes] = useState([]);
  const [previousMeetings, setPreviousMeetings] = useState([]);
  const [selectedPreviousMeetingNotes, setSelectedPreviousMeetingNotes] = useState([]);
  const [selectedPreviousMeetingIndex, setSelectedPreviousMeetingIndex] = useState(0);


  useEffect(()=>{
    console.log("meeting id in meeting page "+meetingId);
    fetchPreviousMeetings();

  },[projectId])

  const fetchPreviousMeetings = async()=>
  {
    console.log("the project id is "+projectId);
    const response = await axiosInstance.get(`/meeting/previous-meeting-notes/${projectId}?max=10`);
    console.log("the prvious meetings //////////////////////////////////////////")
    console.log(response.data.result);
    const meetings = response.data.result;
    setPreviousMeetings(response.data.result);
    if(meetings.length > 0)
    {
      console.log("the first meeting iss/////////////////////////////////");
      console.log(meetings[0]);
      setSelectedPreviousMeetingIndex(0);
      setSelectedPreviousMeetingNotes(meetings[0].meeting_notes);
    }
  }


  const handleAddNote = async() => {
    if (!newNote.trim()) return;
    const response = await axiosInstance.post("meeting/add-meeting-notes",{
      notes : newNote,
      project_id : projectId,
      meeting_id : meetingId
    })
    console.log(response.data.result);
    setCurrentMeetingNotes((prev) => [
      ...prev,
      response.data.result[0]
    ]);
    setNewNote("");
    setShowModal(false);
  };

  const handlePreviousMeetingChange = (i)=>
  {
    console.log(previousMeetings[i]);
    console.log("index"+i);
    console.log(previousMeetings[i].name)
    setSelectedPreviousMeetingIndex(i);
    console.log("hello");
    // const meeting = previousMeetings.find(meeting=> meeting.name == meetingName);
    const meeting = previousMeetings[i];
    setSelectedPreviousMeetingNotes(meeting.meeting_notes);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 relative">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Meeting Notes</h3>

      {/* Previous Meeting Notes */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-700">Previous Meeting Notes</h4>
          <select
            className="text-sm border rounded px-2 py-1 text-gray-700 bg-white shadow-sm"
            value={selectedPreviousMeetingIndex}
            onChange={(e) => handlePreviousMeetingChange(Number(e.target.value))}
          >
            {previousMeetings.map((meeting , i) => (
              <option key={meeting.id} value={i} >
                {meeting.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {selectedPreviousMeetingNotes?.map(
            (note) => (
              <div
                key={note.id}
                className="flex items-center space-x-3 text-sm text-gray-700"
              >
                <Flag className="w-4 h-4 text-green-500" />
                <span>{note.notes}</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Current Meeting Notes */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-700">Current Meeting Notes</h4>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center text-sm text-blue-600 hover:underline"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Meeting Note
          </button>
        </div>

        <div className="space-y-3">
          {currentMeetingNotes.map((note) => (
            <div key={note.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Flag className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-700">{note.notes}</span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
          <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setShowModal(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Add Meeting Note</h3>
            <textarea
              className="w-full border rounded p-2 mb-4 text-sm"
              rows="4"
              placeholder="Write your meeting note here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="text-sm border px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingNotesSection;
