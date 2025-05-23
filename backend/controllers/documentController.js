const sql = require("../database/db");
const supabase = require("../database/supabase"); // Import the initialized Supabase client

// @Description Add a new project document reference
// @Route site.com/data-management/addProjectDocument
const addProjectDocument = async (req, res) => {
  console.log("inside the add project document");
  const { project_id, template_id, phase } = req.body;
  const file = req.file; // This should be populated by multer

  console.log("Received file:", file);
  console.log("Request body:", req.body); // Debugging line

  // Check if the file and required fields are present
  if (!file) {
    return res.status(400).json({
      status: "failure",
      message: "No file uploaded.",
    });
  }

  if (!project_id || !template_id || !phase) {
    return res.status(400).json({
      status: "failure",
      message: "Project ID, Template ID, and Phase are required.",
    });
  }

  try {
    // Upload the file to Supabase storage
    const { data, error } = await supabase.storage
      .from("project-documents")
      .upload(`projects/${project_id}/${file.originalname}`, file.buffer);

    console.log("Supabase upload response:", { data, error }); // Log the response

    if (error) {
      console.error("Error uploading file:", error);
      return res.status(500).json({
        status: "failure",
        message: "Failed to upload document",
        result: error.message || error,
      });
    }

    // Save the document metadata to the database
    const documentData = {
      project_id,
      template_id,
      phase,
      file_url: data.fullPath, // Use fullPath or data.path for the file URL
      uploaded_at: new Date(),
      document_name: file.originalname, // Use document_name instead of original_name
    };

    console.log("Document data to be inserted:", documentData); // Log document data

    // Ensure all required fields are defined before insertion
    if (
      !documentData.project_id ||
      !documentData.template_id ||
      !documentData.file_url ||
      !documentData.phase ||
      !documentData.document_name
    ) {
      return res.status(400).json({
        status: "failure",
        message: "Missing required document data.",
      });
    }

    const result = await sql`
      INSERT INTO project_documents (project_id, template_id, phase, file_url, uploaded_at, document_name)
      VALUES (${documentData.project_id}, ${documentData.template_id}, ${documentData.phase}, ${documentData.file_url}, ${documentData.uploaded_at}, ${documentData.document_name})
      RETURNING *;
    `;

    return res.status(201).json({
      status: "success",
      message: "Document uploaded successfully",
      result: result[0],
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return res.status(500).json({
      status: "failure",
      message: "Error uploading document",
      result: error.message || error,
    });
  }
};

// @Description Get all documents linked to a project by project ID
// @Route site.com/data-management/getProjectDocuments
const getProjectDocuments = async (req, res) => {
  // Check if project_id exists in the request body
  if (!req.body || !req.body.project_id) {
    return res.status(400).json({
      status: "failure",
      message: "Required field missing: project_id is required",
      result: null,
    });
  }

  const { project_id } = req.body;

  try {
    // Validate that project_id is numeric
    if (isNaN(project_id)) {
      return res.status(400).json({
        status: "failure",
        message: "Invalid project_id format: must be a number",
        result: null,
      });
    }

    // Query to get documents linked to the project
    const queryText = `
      SELECT * FROM project_documents
      WHERE project_id = $1
    `;

    const result = await sql.unsafe(queryText, [project_id]);

    // Check if any documents were found
    if (!result || result.length === 0) {
      return res.status(404).json({
        status: "failure",
        message: `No documents found for project with id ${project_id}`,
        result: null,
      });
    }

    // Return success response with the documents
    return res.status(200).json({
      status: "success",
      message: "Documents retrieved successfully",
      result: result,
    });
  } catch (error) {
    console.error("Error retrieving project documents:", error);
    return res.status(500).json({
      status: "failure",
      message: "Error retrieving project documents",
      result: error.message || error,
    });
  }
};

// @Description Delete a project document
// @Route site.com/data-management/deleteProjectDocument
const deleteProjectDocument = async (req, res) => {
  const { project_id, document_id } = req.body;

  // Check if required fields are present
  if (!project_id || !document_id) {
    return res.status(400).json({
      status: "failure",
      message: "Project ID and Document ID are required.",
    });
  }

  try {
    // First, get the document details to find the file path
    const documentQuery = await sql`
      SELECT * FROM project_documents
      WHERE id = ${document_id} AND project_id = ${project_id}
    `;

    if (!documentQuery || documentQuery.length === 0) {
      return res.status(404).json({
        status: "failure",
        message: "Document not found",
      });
    }

    const document = documentQuery[0];

    // Delete the file from Supabase storage if file_url exists
    if (document.file_url) {
      // Extract the path from the full URL or path
      const filePath = document.file_url.includes("/")
        ? document.file_url.split("/").slice(1).join("/") // Remove bucket name if present
        : document.file_url;

      const { error } = await supabase.storage
        .from("project-documents")
        .remove([filePath]);

      if (error) {
        console.error("Error deleting file from storage:", error);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete the document record from the database
    const result = await sql`
      DELETE FROM project_documents
      WHERE id = ${document_id} AND project_id = ${project_id}
      RETURNING id;
    `;

    if (!result || result.length === 0) {
      return res.status(500).json({
        status: "failure",
        message: "Failed to delete document from database",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Document deleted successfully",
      result: { id: document_id },
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    return res.status(500).json({
      status: "failure",
      message: "Error deleting document",
      result: error.message || error,
    });
  }
};

module.exports = {
  addProjectDocument,
  getProjectDocuments,
  deleteProjectDocument,
};
