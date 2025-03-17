const sql = require("../database/db");

//  @Description add new Department
//  @Route site.com/data-management/addDepartment
const addDepartment = async (req, res) => {
  // Check if data exists in the request body
  console.log('Department Body',req.body);
  
  // Handle both formats: direct properties or nested under data
  let departmentData = {};
  
  if (req.body.data && typeof req.body.data === "object") {
    // Format: { data: { name: "...", arabic_name: "..." } }
    departmentData = req.body.data;
  } else if (req.body.departmentEnglish || req.body.departmentArabic) {
    // Format: { departmentEnglish: "...", departmentArabic: "..." }
    departmentData = {
      name: req.body.departmentEnglish,
      arabic_name: req.body.departmentArabic
    };
  } else {
    return res.status(400).json({
      status: "failure",
      message: "Data missing or invalid format",
      result: null,
    });
  }

  // Make sure we have at least some data to insert
  if (Object.keys(departmentData).length === 0) {
    return res.status(400).json({
      status: "failure",
      message: "No data fields provided for insertion",
      result: null,
    });
  }

  try {
    // Extract column names and values from the data object
    const columns = Object.keys(departmentData);
    const values = Object.values(departmentData);

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

    // Build parameterized query
    const placeholders = columns.map((_, index) => `$${index + 1}`);

    const queryText = `
        INSERT INTO department (${columns.map((col) => `"${col}"`).join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING *
      `;

    // Execute the query
    const result = await sql.unsafe(queryText, values);

    // Return success response with the newly created department
    return res.status(201).json({
      status: "success",
      message: "Department added successfully",
      result: result[0] || result,
    });
  } catch (error) {
    console.error("Error adding department:", error);

    // Handle unique constraint violations or other specific errors
    if (error.code === "23505") {
      // PostgreSQL unique violation code
      return res.status(409).json({
        status: "failure",
        message: "Department with this identifier already exists",
        result: error.detail || error,
      });
    }

    // Handle other errors
    return res.status(500).json({
      status: "failure",
      message: "Error adding department",
      result: error.message || error,
    });
  }
};

const getDepartments = async (req, res) => {
    try {
      const departments = await sql`SELECT * FROM department;`;
      return res.status(200).json({
        status: "success",
        message: "Departments fetched successfully",
        result: departments,
      });
    } catch (error) {
      console.error("Error fetching departments:", error);
      return res.status(500).json({
        status: "failure",
        message: "Error fetching departments",
        result: error.message || error,
      });
    }
  };

module.exports = { addDepartment, getDepartments };
