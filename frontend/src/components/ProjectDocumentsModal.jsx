import React, { useState, useEffect } from "react";
import { X, Upload, Download, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "../axiosInstance";
import useAuthStore from "../store/authStore";
import { getViewableDocumentUrl, getDownloadableDocumentUrl } from "../utils/supabaseUtils";

const ProjectDocumentsModal = ({ 
  isOpen, 
  onClose, 
  projectId, 
  projectName,
  currentPhase,
  isNewProject = false // Add isNewProject prop with default value of false
}) => {
  const [documents, setDocuments] = useState([]);
  const [localFiles, setLocalFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [deletingIndex, setDeletingIndex] = useState(null);

  const { projectPhases } = useAuthStore();

  // Add console logs to debug fetching existing documents
  useEffect(() => {
    if (isOpen && projectId && currentPhase) {
      console.log('ProjectDocumentsModal opened with:', { projectId, currentPhase, isNewProject });
      const load = async () => {
        await fetchDocumentTemplates();
        
        // Only fetch existing documents if this is not a new project
        if (!isNewProject) {
          await fetchProjectDocuments();
        }
      };
      load();
    }
  }, [isOpen, projectId, currentPhase, isNewProject]);

  const fetchDocumentTemplates = async () => {
    setLoading(true);
    console.log('Fetching document templates for projectId and phase:', { projectId, currentPhase });
    try {
      // Get current phase name
      const phase = projectPhases.find(p => p.id === currentPhase);
      if (!phase) {
        toast.error("Invalid project phase");
        return;
      }

      const response = await axiosInstance.post(
        "/data-management/getCurrentPhaseDocumentTemplates",
        { phase: phase.name }
      );
      console.log('Received templates response:', response.data);

      if (response.data.status === "success") {
        setDocuments(response.data.data.map(doc => ({
          id: doc.id,
          name: doc.name,
          arabic_name: doc.arabic_name,
          isrequired: doc.isrequired,
          file: null,
          filename: null,
          date: null,
          uploaded: false,
          fileUrl: null,
          documentId: null
        })));
      }
    } catch (error) {
      console.error("Error fetching document templates:", error);
      toast.error("Failed to load document templates");
    } finally {
      setLoading(false);
    }
  };

  // Fetch already uploaded project documents
  const fetchProjectDocuments = async () => {
    // Skip fetching documents if this is a new project
    if (isNewProject) {
      console.log('New project - skipping document fetch');
      return;
    }
    
    console.log('Fetching existing project documents for projectId:', projectId);
    try {
      const response = await axiosInstance.post(
        '/data-management/getProjectDocuments',
        { project_id: projectId }
      );
      console.log('Received existing documents response:', response.data);
      
      // For existing projects, check if documents were found
      if (response.data.status === 'success' && Array.isArray(response.data.result)) {
        const existing = response.data.result;
        setDocuments(prevDocs => prevDocs.map(doc => {
          const match = existing.find(d => d.template_id === doc.id);
          if (match) {
            return {
              ...doc,
              filename: match.document_name,
              date: new Date(match.uploaded_at).toLocaleDateString(),
              uploaded: true,
              fileUrl: match.file_url,
              documentId: match.id
            };
          }
          return doc;
        }));
      }
    } catch (error) {
      console.error('Error fetching existing project documents:', error);
      
      // Only show error toast if this is not a new project and it's not a 404 (no documents found)
      if (!error.response || error.response.status !== 404) {
        toast.error('Failed to load existing project documents');
      }
    }
  };

  const handleUpload = async (index, file) => {
    if (!file) {
      toast.error("No file selected for upload.");
      return;
    }

    setUploadingIndex(index);
    
    try {
      // If there's an existing document, delete it first
      if (documents[index].uploaded && documents[index].documentId) {
        await handleDeleteDocument(index, true);
      }
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("project_id", projectId);
      formData.append("template_id", documents[index].id);
      formData.append("phase", projectPhases.find(p => p.id === currentPhase)?.name || "");

      const response = await axiosInstance.post(
        "/data-management/addProjectDocument",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.status === "success") {
        const newDocs = [...documents];
        newDocs[index].file = file;
        newDocs[index].filename = file.name;
        newDocs[index].date = new Date().toLocaleDateString();
        newDocs[index].uploaded = true;
        newDocs[index].fileUrl = response.data.result.file_url;
        newDocs[index].documentId = response.data.result.id;
        setDocuments(newDocs);
        
        toast.success("Document uploaded successfully!");
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document: " + error.message);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleDeleteDocument = async (index, isReplacement = false) => {
    if (!documents[index].documentId) {
      toast.error("No document ID found.");
      return;
    }

    if (!isReplacement) {
      setDeletingIndex(index);
    }
    
    try {
      const response = await axiosInstance.post(
        "/data-management/deleteProjectDocument",
        {
          project_id: projectId,
          document_id: documents[index].documentId
        }
      );

      if (response.data.status === "success") {
        if (!isReplacement) {
          const newDocs = [...documents];
          newDocs[index].file = null;
          newDocs[index].filename = null;
          newDocs[index].date = null;
          newDocs[index].uploaded = false;
          newDocs[index].fileUrl = null;
          newDocs[index].documentId = null;
          setDocuments(newDocs);
          toast.success("Document deleted successfully!");
        }
      } else {
        throw new Error(response.data.message || "Delete failed");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      if (!isReplacement) {
        toast.error("Failed to delete document: " + error.message);
      }
    } finally {
      if (!isReplacement) {
        setDeletingIndex(null);
      }
    }
  };

  const handleViewDocument = (fileUrl) => {
    if (!fileUrl) {
      toast.error("No document URL available.");
      return;
    }

    try {
      // Use the specialized utility function for viewable URLs
      const viewUrl = getViewableDocumentUrl(fileUrl);
      
      console.log('Opening document URL:', viewUrl);
      
      // Open the document in a new tab
      window.open(viewUrl, '_blank');
    } catch (error) {
      console.error('Error opening document:', error);
      toast.error('Failed to open document. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Project Documents</h2>
            <p className="text-gray-600">Upload documents for: {projectName}</p>
            {isNewProject && (
              <p className="text-blue-600 text-sm mt-1">
                Initial document setup for new project
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Document Name</th>
                  <th className="border p-3 text-left">Arabic Name</th>
                  <th className="border p-3 text-left">Required</th>
                  <th className="border p-3 text-left">File Name</th>
                  <th className="border p-3 text-left">Upload Date</th>
                  <th className="border p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border p-3">{doc.name}</td>
                    <td className="border p-3">{doc.arabic_name || "-"}</td>
                    <td className="border p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        doc.isrequired ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.isrequired ? "Required" : "Optional"}
                      </span>
                    </td>
                    <td className="border p-3">
                      {doc.filename || "-"}
                    </td>
                    <td className="border p-3">{doc.date || "-"}</td>
                    <td className="border p-3">
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleUpload(index, e.target.files[0])}
                            disabled={uploadingIndex === index || deletingIndex === index}
                          />
                          {uploadingIndex === index ? (
                            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          ) : (
                            <Upload 
                              className="text-blue-500 hover:text-blue-700 transition-colors" 
                              size={20} 
                              title="Upload new document"
                            />
                          )}
                        </label>
                        {doc.uploaded && (
                          <>
                            {deletingIndex === index ? (
                              <div className="animate-spin h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full"></div>
                            ) : (
                              <button
                                onClick={() => handleDeleteDocument(index)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                                title="Delete document"
                              >
                                <Trash2 size={20} />
                              </button>
                            )}
                            <button 
                              onClick={() => handleViewDocument(doc.fileUrl)}
                              className="text-green-500 hover:text-green-700 transition-colors"
                              title="View document"
                            >
                              <Eye size={20} />
                            </button>
                            <a 
                              href={doc.fileUrl ? getDownloadableDocumentUrl(doc.fileUrl) : '#'}
                              download={doc.filename}
                              className="text-blue-500 hover:text-blue-700 transition-colors"
                              title="Download document"
                              onClick={(e) => {
                                if (!doc.fileUrl) {
                                  e.preventDefault();
                                  toast.error("No document URL available.");
                                }
                                // Add console log to debug download URL
                                console.log('Download URL:', getDownloadableDocumentUrl(doc.fileUrl));
                              }}
                            >
                              <Download size={20} />
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectDocumentsModal;
