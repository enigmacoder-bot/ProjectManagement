import React, { useState } from "react";
import { Construction, Download, Upload } from "lucide-react";
import axiosInstance from "../axiosInstance";
import { supabase } from "../libs/supabase"; // Import Supabase client
import { toast } from "sonner"; // Optional: for notifications

const PORT = import.meta.env.VITE_PORT;

const phasesList = [
  "Planning phase",
  "Bidding phase",
  "Pre-execution phase",
  "Execution",
  "Closing phase",
];

const DocumentFormModal = ({ onClose }) => {
  const [selectedPhases, setSelectedPhases] = useState(
    Array(phasesList.length).fill(false)
  );
  const [data, setData] = useState({});
  const [capexSelected, setCapexSelected] = useState(false);
  const [opexSelected, setOpexSelected] = useState(false);
  const [internalSelected, setInternalSelected] = useState(false);
  const [externalSelected, setExternalSelected] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handles phase toggling (ensuring all below phases are selected when toggled on, or untoggled when toggled off)
  const handlePhaseToggle = (index) => {
    const newSelection = [...selectedPhases];
    if (!newSelection[index]) {
      // When toggling a phase ON, select all subsequent phases
      for (let i = index; i < newSelection.length; i++) {
        newSelection[i] = true;
      }
    } else {
      // When toggling a phase OFF, deselect all subsequent phases
      for (let i = index; i < newSelection.length; i++) {
        newSelection[i] = false;
      }
    }
    setSelectedPhases(newSelection);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (isLoading) return; // Prevent multiple submissions
    
    // Validate required fields
    if (!data.name || !data.arabic_name) {
      toast.error("Please fill in both English and Arabic names");
      return;
    }

    if (!data.description) {
      toast.error("Please provide a document description");
      return;
    }

    // Check if at least one phase is selected
    const hasSelectedPhase = selectedPhases.some(phase => phase);
    if (!hasSelectedPhase) {
      toast.error("Please select at least one phase");
      return;
    }

    // Check if at least one project type is selected
    if (!internalSelected && !externalSelected) {
      toast.error("Please select at least one project type (Internal or External)");
      return;
    }

    // Check if project category is selected for external projects only
    if (externalSelected && !capexSelected && !opexSelected) {
      toast.error("Please select either Capex or Opex for external projects");
      return;
    }

    setIsLoading(true);

    let payloadData = { ...data, phase: [] };
    selectedPhases.forEach((p, index) => {
      if (p === true) {
        payloadData.phase.push(phasesList[index]);
      }
    });
    
    // For internal projects, set both capex and opex to false if not applicable
    if (internalSelected && !externalSelected) {
      payloadData["is_capex"] = false;
      payloadData["is_opex"] = false;
    } else {
      payloadData["is_capex"] = capexSelected;
      payloadData["is_opex"] = opexSelected;
    }
    
    payloadData["is_internal"] = internalSelected;
    payloadData["is_external"] = externalSelected;

    try {
      // Step 1: Upload file to Supabase Storage if a file is selected
      let fileUrl = null;
      if (documentFile) {
        const fileName = `document-templates/${Date.now()}_${
          documentFile.name
        }`;
        const { error: uploadError } = await supabase.storage
          .from("templates") // Updated bucket name
          .upload(fileName, documentFile);

        if (uploadError)
          throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: urlData } = supabase.storage
          .from("templates") // Updated bucket name
          .getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;
      }

      // Step 2: Prepare payload with file URL (if applicable)
      payloadData["file_url"] = fileUrl;

      // Step 3: Send data to backend API
      const formData = new FormData();
      formData.append("data", JSON.stringify(payloadData)); // Send metadata as JSON string

      const result = await axiosInstance.post(
        `/data-management/addDocumentTemplate`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Document saved successfully:", result.data);
      toast.success("Document template added successfully!"); // Optional: Success notification
      onClose(); // Close modal on success
    } catch (e) {
      console.error("Error saving document:", e);
      toast.error("Failed to save document template."); // Optional: Error notification
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center backdrop-blur-xl z-[100]">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[60%] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="mb-4 border-b pb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Add Document</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800"
            >
              ✖
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 pr-2">
          {/* Document Name Fields - Side by Side */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Document English Name *
              </label>
              <input
                type="text"
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                name="name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-right">
                اسم الوثيقة بالعربي *
              </label>
              <input
                type="text"
                name="arabic_name"
                onChange={handleInputChange}
                className="w-full p-2 border rounded text-right"
                dir="rtl"
              />
            </div>
          </div>

          {/* Document Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">
              Document Description *
            </label>
            <textarea
              name="description"
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              rows={4}
            ></textarea>
          </div>

          {/* Two Column Layout for Phases and Categories */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Select Targeted Phases */}
            <div>
              <p className="font-semibold mb-2">Select targeted phases</p>
              {phasesList.map((phase, index) => (
                <label
                  key={phase}
                  className="flex items-center cursor-pointer mb-2"
                >
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={selectedPhases[index]}
                    onChange={() => handlePhaseToggle(index)}
                  />
                  <div
                    className={`relative w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full transition-all ${
                      selectedPhases[index] ? "peer-checked:bg-blue-600" : ""
                    }`}
                  >
                    <div
                      className={`absolute top-[2px] left-[2px] bg-white border-gray-300 border rounded-full h-5 w-5 transition-all ${
                        selectedPhases[index] ? "translate-x-full bg-white" : ""
                      }`}
                    />
                  </div>
                  <span className="ml-3 text-sm font-medium">{phase}</span>
                </label>
              ))}
            </div>

            {/* Project Categories */}
            <div>
              <p className="font-semibold mb-2">
                Select project Category availability
              </p>
              {/* Only show Capex/Opex selection if external projects are selected */}
              {externalSelected && (
                <>
                  <label className="flex items-center cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={capexSelected}
                      onChange={() => {
                        setCapexSelected(!capexSelected);
                        if (!capexSelected) {
                          setOpexSelected(false); // Deselect opex when capex is selected
                        }
                      }}
                    />
                    <div
                      className={`relative w-11 h-6 bg-gray-200 rounded-full transition-all ${
                        capexSelected ? "peer-checked:bg-blue-600" : ""
                      }`}
                    >
                      <div
                        className={`absolute top-[2px] left-[2px] bg-white border-gray-300 border rounded-full h-5 w-5 transition-all ${
                          capexSelected ? "translate-x-full bg-white" : ""
                        }`}
                      />
                    </div>
                    <span className="ml-3 text-sm font-medium">Capex projects</span>
                  </label>
                  <label className="flex items-center cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={opexSelected}
                      onChange={() => {
                        setOpexSelected(!opexSelected);
                        if (!opexSelected) {
                          setCapexSelected(false); // Deselect capex when opex is selected
                        }
                      }}
                    />
                    <div
                      className={`relative w-11 h-6 bg-gray-200 rounded-full transition-all ${
                        opexSelected ? "peer-checked:bg-blue-600" : ""
                      }`}
                    >
                      <div
                        className={`absolute top-[2px] left-[2px] bg-white border-gray-300 border rounded-full h-5 w-5 transition-all ${
                          opexSelected ? "translate-x-full bg-white" : ""
                        }`}
                      />
                    </div>
                    <span className="ml3 text-sm font-medium">Opex projects</span>
                  </label>
                </>
              )}
              
              {/* Show message for internal projects */}
              {internalSelected && !externalSelected && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Internal projects don't require Capex/Opex categorization.
                  </p>
                </div>
              )}

              {/* Document Template Section */}
              <div className="mt-6">
                <p className="font-semibold mb-2">Document template</p>
                <div className="border rounded p-3 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm">
                        {documentFile ? documentFile.name : "File name.doc"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Creation date:{" "}
                        {documentFile
                          ? new Date().toLocaleDateString()
                          : "14-Jan-25"}
                      </p>
                    </div>
                    <Download className="text-blue-600" size={20} />
                  </div>
                </div>
                <button
                  className="mt-2 bg-blue-500 text-white px-3 py-2 rounded flex items-center text-sm"
                  onClick={() => document.getElementById("file-upload").click()}
                >
                  <Upload size={16} className="mr-2" />
                  Upload new file
                </button>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>

          {/* Select Project Type Availability */}
          <div className="mb-6">
            <p className="font-semibold mb-2">
              Select project type availability
            </p>
            <label className="flex items-center cursor-pointer mb-2">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={externalSelected}
                onChange={() => setExternalSelected(!externalSelected)}
              />
              <div
                className={`relative w-11 h-6 bg-gray-200 rounded-full transition-all ${
                  externalSelected ? "peer-checked:bg-blue-600" : ""
                }`}
              >
                <div
                  className={`absolute top-[2px] left-[2px] bg-white border-gray-300 border rounded-full h-5 w-5 transition-all ${
                    externalSelected ? "translate-x-full bg-white" : ""
                  }`}
                />
              </div>
              <span className="ml-3 text-sm font-medium">
                Available for external projects
              </span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={internalSelected}
                onChange={() => setInternalSelected(!internalSelected)}
              />
              <div
                className={`relative w-11 h-6 bg-gray-200 rounded-full transition-all ${
                  internalSelected ? "peer-checked:bg-blue-600" : ""
                }`}
              >
                <div
                  className={`absolute top-[2px] left-[2px] bg-white border-gray-300 border rounded-full h-5 w-5 transition-all ${
                    internalSelected ? "translate-x-full bg-white" : ""
                  }`}
                />
              </div>
              <span className="ml-3 text-sm font-medium">
                Available for internal projects
              </span>
            </label>
          </div>
        </div>
        {/* Save Button */}
        <div className="mt-4 pt-4 border-t">
          <button
            className={`py-2 px-4 rounded w-32 flex items-center justify-center ${
              isLoading 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-blue-500 hover:bg-blue-600"
            } text-white transition-colors`}
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentFormModal;
