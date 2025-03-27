const sql = require("../database/db");

//  @Description add new Program
//  @Route site.com/data-management/addprogram
const addProgram = async (req, res) => {
  // Check if data exists in the request body
  console.log("program body", req.body);

  if (!req.body || !req.body.data || typeof req.body.data !== "object") {
    return res.status(400).json({
      status: "failure",
      message: "Data missing or invalid format",
      result: null,
    });
  }

  // Flatten and process the data object from the request body
  const data = { ...req.body.data };

  // Remove userId from data as it's not a column in the program table
  if (data.userId) {
    delete data.userId;
  }

  // Map form field names to database column names
  const fieldMappings = {
    programEnglish: "name",
    programArabic: "arabic_name",
    programManager: "program_manager",
    descriptionEnglish: "description",
    descriptionArabic: "arabic_description",
  };

  Object.keys(fieldMappings).forEach((formField) => {
    if (data[formField]) {
      data[fieldMappings[formField]] = data[formField];
      delete data[formField];
    }
  });

  // Ensure numeric fields are parsed correctly
  if (data.program_manager) {
    data.program_manager = parseInt(data.program_manager, 10);
  }
  if (data.portfolio_id) {
    data.portfolio_id = parseInt(data.portfolio_id, 10);
  }

  console.log("Processed data:", data);

  // Make sure we have at least some data to insert
  if (Object.keys(data).length === 0) {
    return res.status(400).json({
      status: "failure",
      message: "No data fields provided for insertion",
      result: null,
    });
  }

  try {
    // Define allowed columns for program table
    const validColumns = [
      "name",
      "arabic_name",
      "program_manager",
      "portfolio_id",
      "description",
      "arabic_description",
    ];

    // Extract column names and values from the data object
    const columns = Object.keys(data);
    const values = Object.values(data);

    // Validate column names and values
    for (const column of columns) {
      if (!validColumns.includes(column)) {
        return res.status(400).json({
          status: "failure",
          message: `Invalid column name: ${column}. Allowed columns: ${validColumns.join(
            ", "
          )}`,
          result: null,
        });
      }

      // Additional validation for portfolio_id
      if (column === "portfolio_id") {
        if (!Number.isInteger(data[column])) {
          return res.status(400).json({
            status: "failure",
            message: "portfolio_id must be an integer",
            result: null,
          });
        }
        // Optional: Check if portfolio exists
        const portfolioCheck = await sql`
          SELECT id FROM portfolio WHERE id = ${data[column]}
        `;
        if (portfolioCheck.length === 0) {
          return res.status(400).json({
            status: "failure",
            message: `Portfolio with id ${data[column]} does not exist`,
            result: null,
          });
        }
      }

      // Validation for program_manager
      if (column === "program_manager") {
        if (!Number.isInteger(data[column])) {
          return res.status(400).json({
            status: "failure",
            message: "program_manager must be an integer",
            result: null,
          });
        }
      }
    }

    // Build parameterized query
    const placeholders = columns.map((_, index) => `$${index + 1}`);

    const queryText = `
      INSERT INTO program (${columns.map((col) => `"${col}"`).join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *
    `;

    // Execute the query
    const result = await sql.unsafe(queryText, values);

    // Return success response with the newly created program
    return res.status(201).json({
      status: "success",
      message: "Program added successfully",
      result: result[0] || result,
    });
  } catch (error) {
    console.error("Error adding program:", error);

    // Handle unique constraint violations
    if (error.code === "23505") {
      return res.status(409).json({
        status: "failure",
        message: "Program with this identifier already exists",
        result: error.detail || error,
      });
    }

    // Handle foreign key constraint violations
    if (error.code === "23503") {
      const detail = error.detail || "";
      if (detail.includes("program_manager")) {
        return res.status(400).json({
          status: "failure",
          message: "Referenced program manager does not exist",
          result: detail,
        });
      }
      if (detail.includes("portfolio_id")) {
        return res.status(400).json({
          status: "failure",
          message: "Referenced portfolio does not exist",
          result: detail,
        });
      }
    }

    // Handle other errors
    return res.status(500).json({
      status: "failure",
      message: "Error adding program",
      result: error.message || error,
    });
  }
};

//  @Description update existing program
//  @Route site.com/data-management/updateprogram
const updateProgram = async (req, res) => {
  // Check if id and data exist in the request body
  if (
    !req.body ||
    !req.body.id ||
    !req.body.data ||
    typeof req.body.data !== "object"
  ) {
    return res.status(400).json({
      status: "failure",
      message: "Required fields missing: id and data object are required",
      result: null,
    });
  }

  const { id, data } = req.body;

  // Make sure we have at least some data to update
  if (Object.keys(data).length === 0) {
    return res.status(400).json({
      status: "failure",
      message: "No data fields provided for update",
      result: null,
    });
  }

  try {
    // Validate that id is numeric
    if (isNaN(id)) {
      return res.status(400).json({
        status: "failure",
        message: "Invalid id format: must be a number",
        result: null,
      });
    }

    // Extract column names and values from the data object
    const columns = Object.keys(data);
    const values = Object.values(data);

    // Validate column names to prevent SQL injection
    for (const column of columns) {
      if (!/^[a-zA-Z0-9_]+$/.test(column)) {
        return res.status(400).json({
          status: "failure",
          message: `Invalid column name: ${column}`,
          result: null,
        });
      }
    }

    // Build the SET part of the query with parameterized values
    const setClause = columns
      .map((col, index) => `"${col}" = $${index + 1}`)
      .join(", ");

    // Add the id parameter at the end
    values.push(id);
    const idPlaceholder = `$${values.length}`;

    // Build the complete query
    const queryText = `
        UPDATE program
        SET ${setClause}
        WHERE id = ${idPlaceholder}
        RETURNING *
      `;

    // Execute the query
    const result = await sql.unsafe(queryText, values);

    // Check if any row was updated
    if (!result || result.length === 0) {
      return res.status(404).json({
        status: "failure",
        message: `Program with id ${id} not found`,
        result: null,
      });
    }

    // Return success response with the updated program
    return res.status(200).json({
      status: "success",
      message: "Program updated successfully",
      result: result[0] || result,
    });
  } catch (error) {
    console.error("Error updating program:", error);

    // Handle unique constraint violations
    if (error.code === "23505") {
      // PostgreSQL unique violation code
      return res.status(409).json({
        status: "failure",
        message: "Update violates unique constraint",
        result: error.detail || error,
      });
    }

    // Handle foreign key constraint violations
    if (error.code === "23503") {
      // PostgreSQL foreign key violation code
      return res.status(409).json({
        status: "failure",
        message: "Referenced program manager does not exist",
        result: error.detail || error,
      });
    }

    // Handle other errors
    return res.status(500).json({
      status: "failure",
      message: "Error updating program",
      result: error.message || error,
    });
  }
};

//  @Description delete existing program
//  @Route site.com/data-management/deleteprogram
const deleteProgram = async (req, res) => {
  // Check if id exists in the request body
  if (!req.body || !req.body.id) {
    return res.status(400).json({
      status: "failure",
      message: "Required field missing: id is required",
      result: null,
    });
  }

  const { id } = req.body;

  try {
    // Validate that id is numeric
    if (isNaN(id)) {
      return res.status(400).json({
        status: "failure",
        message: "Invalid id format: must be a number",
        result: null,
      });
    }

    // Build the query with parameterized id
    const queryText = `
        DELETE FROM program
        WHERE id = $1
        RETURNING id
      `;

    // Execute the query
    const result = await sql.unsafe(queryText, [id]);

    // Check if any row was deleted
    if (!result || result.length === 0) {
      return res.status(404).json({
        status: "failure",
        message: `Program with id ${id} not found`,
        result: null,
      });
    }

    // Return success response
    return res.status(200).json({
      status: "success",
      message: "Program deleted successfully",
      result: { id: result[0].id },
    });
  } catch (error) {
    console.error("Error deleting program:", error);

    // Handle foreign key constraint violations
    if (error.code === "23503") {
      // PostgreSQL foreign key violation code
      return res.status(409).json({
        status: "failure",
        message:
          "Cannot delete this program because it's referenced by other records",
        result: error.detail || error,
      });
    }

    // Handle other errors
    return res.status(500).json({
      status: "failure",
      message: "Error deleting program",
      result: error.message || error,
    });
  }
};

//  @Description get all programs
//  @Route site.com/data-management/programs
const getPrograms = async (req, res) => {
  try {
    // Build the query to get all programs
    const queryText = `
      SELECT p.*, u.first_name, u.family_name, pf.name as portfolio_name
      FROM program p
      LEFT JOIN users u ON p.program_manager = u.id
      LEFT JOIN portfolio pf ON p.portfolio_id = pf.id
      ORDER BY p.id DESC
    `;

    // Execute the query
    const result = await sql.unsafe(queryText);

    // Return success response with all programs
    return res.status(200).json({
      status: "success",
      message: "Programs retrieved successfully",
      result: result,
    });
  } catch (error) {
    console.error("Error retrieving programs:", error);

    // Handle other errors
    return res.status(500).json({
      status: "failure",
      message: "Error retrieving programs",
      result: error.message || error,
    });
  }
};

// @Description Get details of a specific program including linked portfolio and initiative
// @Route POST site.com/data-management/getProgramDetails
const getProgramDetails = async (req, res) => {
  // Check if program_id is provided in the request body
  if (!req.body || !req.body.program_id) {
    return res.status(400).json({
      status: "failure",
      message: "Program ID is required",
      result: null,
    });
  }

  const { program_id } = req.body;

  try {
    // Build the query to get program details with portfolio and initiative
    const queryText = `
      SELECT 
        p.id AS program_id,
        p.name AS program_name,
        p.arabic_name AS program_arabic_name,
        p.portfolio_id,
        port.name AS portfolio_name,
        port.arabic_name AS portfolio_arabic_name,
        port.initiative_id,
        i.name AS initiative_name,
        i.arabic_name AS initiative_arabic_name
      FROM program p
      LEFT JOIN portfolio port ON p.portfolio_id = port.id
      LEFT JOIN initiative i ON port.initiative_id = i.id
      WHERE p.id = ${program_id}
    `;

    // Execute the query using sql.unsafe
    const result = await sql.unsafe(queryText);

    if (result.length === 0) {
      return res.status(404).json({
        status: "failure",
        message: `Program with ID ${program_id} not found`,
        result: null,
      });
    }

    // Return success response with program details
    return res.status(200).json({
      status: "success",
      message: "Program details retrieved successfully",
      result: result[0], // Return the first (and only) row
    });
  } catch (error) {
    console.error("Error fetching program details:", error);
    return res.status(500).json({
      status: "failure",
      message: "Error fetching program details",
      result: error.message || error,
    });
  }
};

module.exports = {
  addProgram,
  updateProgram,
  deleteProgram,
  getPrograms,
  getProgramDetails,
};
