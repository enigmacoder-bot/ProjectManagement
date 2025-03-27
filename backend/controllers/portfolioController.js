const sql = require("../database/db");

//  @Description add new Portfolio
//  @Route site.com/data-management/addportfolio
const addPortfolio = async (req, res) => {
  // Check if data exists in the request body
  if (!req.body || !req.body.data || typeof req.body.data !== "object") {
    return res.status(400).json({
      status: "failure",
      message: "Data missing or invalid format",
      result: null,
    });
  }

  const { data } = req.body;

  // Make sure we have at least some data to insert
  if (Object.keys(data).length === 0) {
    return res.status(400).json({
      status: "failure",
      message: "No data fields provided for insertion",
      result: null,
    });
  }

  try {
    // Extract column names and values from the data object
    const columns = Object.keys(data);
    const values = Object.values(data);

    // Define allowed columns for portfolio table
    const validColumns = [
      "name",
      "arabic_name",
      "portfolio_manager",
      "initiative_id",
      "description",
      "arabic_description",
    ];

    // Validate column names
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
      // Additional validation for initiative_id
      if (column === "initiative_id") {
        if (!Number.isInteger(Number(data[column]))) {
          return res.status(400).json({
            status: "failure",
            message: "initiative_id must be an integer",
            result: null,
          });
        }
        // Optional: Check if initiative exists
        const initiativeCheck = await sql`
          SELECT id FROM initiative WHERE id = ${data[column]}
        `;
        if (initiativeCheck.length === 0) {
          return res.status(400).json({
            status: "failure",
            message: `Initiative with id ${data[column]} does not exist`,
            result: null,
          });
        }
      }
      // Validation for portfolio_manager
      if (column === "portfolio_manager") {
        if (!Number.isInteger(Number(data[column]))) {
          return res.status(400).json({
            status: "failure",
            message: "portfolio_manager must be an integer",
            result: null,
          });
        }
      }
    }

    // Build parameterized query
    const placeholders = columns.map((_, index) => `$${index + 1}`);

    const queryText = `
      INSERT INTO portfolio (${columns.map((col) => `"${col}"`).join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *
    `;

    // Execute the query
    const result = await sql.unsafe(queryText, values);

    // Return success response with the newly created portfolio
    return res.status(201).json({
      status: "success",
      message: "Portfolio added successfully",
      result: result[0] || result,
    });
  } catch (error) {
    console.error("Error adding portfolio:", error);

    // Handle unique constraint violations
    if (error.code === "23505") {
      return res.status(409).json({
        status: "failure",
        message: "Portfolio with this identifier already exists",
        result: error.detail || error,
      });
    }

    // Handle foreign key constraint violations
    if (error.code === "23503") {
      const detail = error.detail || "";
      if (detail.includes("portfolio_manager")) {
        return res.status(400).json({
          status: "failure",
          message: "Referenced portfolio manager does not exist",
          result: detail,
        });
      }
      if (detail.includes("initiative_id")) {
        return res.status(400).json({
          status: "failure",
          message: "Referenced initiative does not exist",
          result: detail,
        });
      }
    }

    // Handle other errors
    return res.status(500).json({
      status: "failure",
      message: "Error adding portfolio",
      result: error.message || error,
    });
  }
};

//  @Description update existing portfolio
//  @Route site.com/data-management/updateportfolio
const updatePortfolio = async (req, res) => {
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
        UPDATE portfolio
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
        message: `Portfolio with id ${id} not found`,
        result: null,
      });
    }

    // Return success response with the updated portfolio
    return res.status(200).json({
      status: "success",
      message: "Portfolio updated successfully",
      result: result[0] || result,
    });
  } catch (error) {
    console.error("Error updating portfolio:", error);

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
        message: "Referenced portfolio manager does not exist",
        result: error.detail || error,
      });
    }

    // Handle other errors
    return res.status(500).json({
      status: "failure",
      message: "Error updating portfolio",
      result: error.message || error,
    });
  }
};

//  @Description delete existing portfolio
//  @Route site.com/data-management/deleteportfolio
const deletePortfolio = async (req, res) => {
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
        DELETE FROM portfolio
        WHERE id = $1
        RETURNING id
      `;

    // Execute the query
    const result = await sql.unsafe(queryText, [id]);

    // Check if any row was deleted
    if (!result || result.length === 0) {
      return res.status(404).json({
        status: "failure",
        message: `Portfolio with id ${id} not found`,
        result: null,
      });
    }

    // Return success response
    return res.status(200).json({
      status: "success",
      message: "Portfolio deleted successfully",
      result: { id: result[0].id },
    });
  } catch (error) {
    console.error("Error deleting portfolio:", error);

    // Handle foreign key constraint violations
    if (error.code === "23503") {
      // PostgreSQL foreign key violation code
      return res.status(409).json({
        status: "failure",
        message:
          "Cannot delete this portfolio because it's referenced by other records",
        result: error.detail || error,
      });
    }

    // Handle other errors
    return res.status(500).json({
      status: "failure",
      message: "Error deleting portfolio",
      result: error.message || error,
    });
  }
};

//  @Description get all portfolios
//  @Route site.com/data-management/portfolios
const getPortfolios = async (req, res) => {
  try {
    // Build the query to get all portfolios
    const queryText = `
      SELECT p.*, u.first_name, u.family_name 
      FROM portfolio p
      LEFT JOIN users u ON p.portfolio_manager = u.id
      ORDER BY p.id DESC
    `;

    // Execute the query
    const result = await sql.unsafe(queryText);

    // Return success response with all portfolios
    return res.status(200).json({
      status: "success",
      message: "Portfolios retrieved successfully",
      result: result,
    });
  } catch (error) {
    console.error("Error retrieving portfolios:", error);

    // Handle other errors
    return res.status(500).json({
      status: "failure",
      message: "Error retrieving portfolios",
      result: error.message || error,
    });
  }
};

module.exports = {
  addPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolios,
};
