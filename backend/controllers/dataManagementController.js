const sql = require("../database/db");

//  @Description retrieve any table data
//  @Route site.com/data-management//data
const getData = async (req, res) => {
  let { tableName, userId, page = 1, limit = 4 } = req.body;
  console.log("Table Name", tableName);
  console.log("userId", userId);

  if (tableName === "user") {
    tableName = "users";
  }
  if (tableName === "document") {
    tableName = "document_template";
  }
  if (!tableName) {
    return res.status(400).json({
      status: "failure",
      message: "Required field missing: tableName, userId",
      result: null,
    });
  }

  try {
    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({
        status: "failure",
        message: "Invalid table name",
        result: null,
      });
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    let result = null;

    if (tableName === "users") {
      result = await sql`
      SELECT users.*
      FROM users
      JOIN role ON users.role_id = role.id
      WHERE LOWER(role.name) NOT IN ('deputy', 'admin','pmo')
      LIMIT ${limit} OFFSET ${offset}
`;
    } else if (tableName === "portfolio") {
      result = await sql`
        SELECT ${sql(tableName)}.*, users.first_name AS portfolio_manager_name
        FROM ${sql(tableName)}
        LEFT JOIN users ON ${sql(tableName)}.portfolio_manager = users.id
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (tableName === "program") {
      result = await sql`
        SELECT ${sql(tableName)}.*, users.first_name AS program_manager_name
        FROM ${sql(tableName)}
        LEFT JOIN users ON ${sql(tableName)}.program_manager = users.id
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (tableName === "objective") {
      result = await sql`
        SELECT ${sql(tableName)}.*, project.name AS belongs_to
        FROM ${sql(tableName)}
        LEFT JOIN project ON ${sql(tableName)}.project_id = project.id
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (tableName === "project") {
      result = await sql`
        SELECT ${sql(tableName)}.*, users.first_name AS project_manager_name
        FROM ${sql(tableName)}
        LEFT JOIN users ON ${sql(tableName)}.project_manager_id = users.id
        ORDER BY ${sql(tableName)}.created_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      result = await sql`
        SELECT * FROM ${sql(tableName)}
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) FROM ${sql(tableName)}
    `;

    const totalCount = parseInt(countResult[0].count);

    return res.status(200).json({
      status: "success",
      message: "",
      result,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      status: "failure",
      message: "Error in retrieving table data",
      result: e,
    });
  }
};

// @Description retrieve filtered Table data (sorting, ordering, filtering table records)
// @Route site.com/data-management/filtereddata
const getFilteredData = async (req, res) => {
  let {
    tableName,
    filters = {}, // Default to empty object if not provided
    page = 1,
    limit = 7, // Updated to match your query log (LIMIT 7)
    sort = {}, // Default to empty object if not provided
    dateFilter,
    customDateRangeOption,
  } = req.body;
  console.log("the filters applied are");
  console.log(filters);
  if (!tableName) {
    return res.status(400).json({
      status: "failure",
      message: "Required field missing: tableName",
      result: null,
    });
  }
  if (tableName === "user") {
    tableName = "users";
  }
  if (tableName === "document") {
    tableName = "document_template";
  }

  try {
    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({
        status: "failure",
        message: "Invalid table name",
        result: null,
      });
    }

    // Build where conditions
    let whereConditions = [];
    let queryParams = [];

    // Handle search term separately
    if (filters.searchTerm && filters.searchTerm.trim() !== "") {
      whereConditions.push(`"name" ILIKE $${whereConditions.length + 1}`);
      queryParams.push(`%${filters.searchTerm}%`);
    }

    // Handle other filters
    Object.entries(filters).forEach(([column, value]) => {
      if (
        column !== "searchTerm" &&
        value &&
        typeof value === "string" &&
        value.trim() !== "" &&
        /^[a-zA-Z0-9_]+$/.test(column) // Validate column name
      ) {
        whereConditions.push(`"${column}" = $${whereConditions.length + 1}`);
        queryParams.push(value);
      }
    });
    console.log("the tablename is " + tableName);
    
    // Handle date filtering
    if (dateFilter) {
      const dateColumn =
        tableName === "initiative" ? "created_at" : "created_date";

      // Helper function to format dates as YYYY-MM-DD
      const formatDate = (date) =>
        [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");

      const today = new Date();

      switch (dateFilter) {
        case "Today":
          const todayDateStr = formatDate(today);
          whereConditions.push(
            `"${dateColumn}" = $${whereConditions.length + 1}`
          );
          queryParams.push(todayDateStr);
          break;

        case "thisWeek":
          const startOfWeek = new Date(today);
          const dayOfWeek = startOfWeek.getDay();
          const diff = dayOfWeek <= 1 ? dayOfWeek + 6 : dayOfWeek - 1;
          startOfWeek.setDate(today.getDate() - diff);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);

          whereConditions.push(
            `"${dateColumn}" BETWEEN $${whereConditions.length + 1} AND $${
              whereConditions.length + 2
            }`
          );
          queryParams.push(formatDate(startOfWeek), formatDate(endOfWeek));
          break;

        case "This Month":
          const startOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );
          const endOfMonth = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
          );

          whereConditions.push(
            `"${dateColumn}" BETWEEN $${whereConditions.length + 1} AND $${
              whereConditions.length + 2
            }`
          );
          queryParams.push(formatDate(startOfMonth), formatDate(endOfMonth));
          break;

        case "last2months":
          const startOfTwoMonthsAgo = new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            1
          );
          const endOfCurrentMonth = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
          );

          whereConditions.push(
            `"${dateColumn}" BETWEEN $${whereConditions.length + 1} AND $${
              whereConditions.length + 2
            }`
          );
          queryParams.push(
            formatDate(startOfTwoMonthsAgo),
            formatDate(endOfCurrentMonth)
          );
          break;

        case "Last 3 Months":
          const startOfThreeMonthsAgo = new Date(
            today.getFullYear(),
            today.getMonth() - 2,
            1
          );
          const endOfCurrentMonthForThree = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
          );

          whereConditions.push(
            `"${dateColumn}" BETWEEN $${whereConditions.length + 1} AND $${
              whereConditions.length + 2
            }`
          );
          queryParams.push(
            formatDate(startOfThreeMonthsAgo),
            formatDate(endOfCurrentMonthForThree)
          );
          break;

        case "custom":
          if (!customDateRangeOption?.start || !customDateRangeOption?.end) {
            return res.status(400).json({
              status: "failure",
              message: "Missing custom date range parameters",
              result: null,
            });
          }

          const startDateStr = customDateRangeOption.start;
          const endDateStr = customDateRangeOption.end;

          // Validate date format
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(startDateStr) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)
          ) {
            return res.status(400).json({
              status: "failure",
              message: "Invalid date format. Use YYYY-MM-DD",
              result: null,
            });
          }

          whereConditions.push(
            `"${dateColumn}" BETWEEN $${whereConditions.length + 1} AND $${
              whereConditions.length + 2
            }`
          );
          queryParams.push(startDateStr, endDateStr);
          break;

        case "all":
        default:
          break;
      }
    }

    // Pagination
    const offset = (page - 1) * limit;

    // Sorting - Enhanced validation
    let orderByClause = "";
    if (sort && typeof sort === "object" && Object.keys(sort).length > 0) {
      const validDirections = ["ASC", "DESC", "asc", "desc"];
      const sortParts = [];

      Object.entries(sort).forEach(([column, direction]) => {
        // Ensure column is defined and valid, and direction is valid
        if (
          column &&
          column !== "undefined" &&
          /^[a-zA-Z0-9_]+$/.test(column) &&
          direction &&
          direction !== "undefined" &&
          validDirections.includes(String(direction).toUpperCase())
        ) {
          sortParts.push(`"${column}" ${String(direction).toUpperCase()}`);
        } else {
          console.warn(
            `Invalid sort parameter: column=${column}, direction=${direction}`
          );
        }
      });

      if (sortParts.length > 0) {
        orderByClause = `ORDER BY ${sortParts.join(", ")}`;
      } else if (tableName === "project") {
        // Default sort for projects by created_date DESC
        orderByClause = `ORDER BY "created_date" DESC`;
      }
    } else if (tableName === "project") {
      // Default sort for projects by created_date DESC
      orderByClause = `ORDER BY "created_date" DESC`;
    }

    // Build the base query
    let queryText = `SELECT * FROM "${tableName}"`;

    // Add WHERE clause if we have conditions
    if (whereConditions.length > 0) {
      queryText += ` WHERE ${whereConditions.join(" AND ")}`;
    }

    // Add ORDER BY if we have a sort clause
    if (orderByClause) {
      queryText += ` ${orderByClause}`;
    }

    // Add LIMIT and OFFSET
    queryText += ` LIMIT $${queryParams.length + 1} OFFSET $${
      queryParams.length + 2
    }`;
    queryParams.push(limit, offset);

    console.log("Generated Query:", queryText);
    console.log("Query Parameters:", queryParams);

    // Execute the query
    const result = await sql.unsafe(queryText, queryParams);

    // Get total count for pagination
    let countQueryText = `SELECT COUNT(*) FROM "${tableName}"`;
    if (whereConditions.length > 0) {
      countQueryText += ` WHERE ${whereConditions.join(" AND ")}`;
    }
    const countQueryParams = queryParams.slice(0, -2); // Remove limit and offset params
    const countResult = await sql.unsafe(countQueryText, countQueryParams);
    const totalCount = parseInt(countResult[0].count);

    return res.status(200).json({
      status: "success",
      message: "",
      result,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (e) {
    console.error("Error in getFilteredData:", e);
    return res.status(500).json({
      status: "failure",
      message: "Error in filtering data",
      result: e.message || e,
    });
  }
};

//  @Description retrieve table setting (order,volumn visibility)
//  @Route site.com/data-management/setting
const getSetting = async (req, res) => {
  if (!req.body.tableName || !req.body.userId) {
    res.status(400);
    res.json({
      status: "failure",
      message: "Required field missing:tableName, userId",
      result: null,
    });
    return;
  }
  try {
    const result = await sql`SELECT * FROM "user_table_settings" 
          WHERE (("user_id" =${req.body.userId}) OR ("user_id" IS NULL AND "is_default" = TRUE))   AND table_name = ${req.body.tableName};
        `;

    let finalResult = null;

    if (result.length === 2) {
      // Return the record with user_id if two records are found
      finalResult = result.find((record) => record.user_id !== null);
    } else if (result.length === 1) {
      // If only one record is found, return that
      finalResult = result[0];
    }

    res.status(200);
    console.log(result);
    console.log(finalResult);
    res.json({ status: "success", message: "", result: [finalResult] });
  } catch (e) {
    res.status(500);
    res.json({
      status: "failure",
      message: "Error in retrieving table setting",
      result: e,
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const result = await sql`
      SELECT 
        users.id, 
        users.first_name, 
        users.family_name, 
        users.email,
        users.is_program_manager,
        role.name as role_name,
        role.arabic_name as role_arabic_name
      FROM users
      LEFT JOIN role ON users.role_id = role.id
      ORDER BY users.first_name, users.family_name
    `;

    res.status(200).json({
      status: "success",
      message: "Users retrieved successfully",
      result,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      status: "failure",
      message: "Error retrieving users",
      error: e.message,
    });
  }
};

const getRoles = async (req, res) => {
  try {
    const result = await sql`
      SELECT id, name, arabic_name 
      FROM role 
      ORDER BY name
    `;

    res.status(200).json({
      status: "success",
      message: "Roles retrieved successfully",
      result,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      status: "failure",
      message: "Error retrieving roles",
      error: e.message,
    });
  }
};

const addUser = async (req, res) => {
  try {
    const {
      first_name,
      arabic_first_name,
      family_name,
      arabic_family_name,
      email,
      password,
      department,
      role,
      is_program_manager,
    } = req.body.data;
    console.log(req.body);
    let result = null;
    // Insert user into the database
    if (is_program_manager) {
      if (department) {
        result = await sql`
          INSERT INTO users (
            first_name, arabic_first_name, family_name, arabic_family_name, 
            email, password, department_id, role_id , is_program_manager
          ) 
          VALUES (
            ${first_name}, ${arabic_first_name}, ${family_name}, ${arabic_family_name}, 
            ${email}, ${password}, ${department}, ${role} , ${is_program_manager}
          ) 
          RETURNING id, first_name, family_name, email, department_id, role_id , is_program_manager
        `;
      } else {
        result = await sql`
          INSERT INTO users (
            first_name, arabic_first_name, family_name, arabic_family_name, 
            email, password, role_id , is_program_manager
          ) 
          VALUES (
            ${first_name}, ${arabic_first_name}, ${family_name}, ${arabic_family_name}, 
            ${email}, ${password}, ${role} , ${is_program_manager}
          ) 
          RETURNING id, first_name, family_name, email, department_id, role_id , is_program_manager
        `;
      }
    } else {
      if (department) {
        result = await sql`
          INSERT INTO users (
            first_name, arabic_first_name, family_name, arabic_family_name, 
            email, password, department_id, role_id
          ) 
          VALUES (
            ${first_name}, ${arabic_first_name}, ${family_name}, ${arabic_family_name}, 
            ${email}, ${password}, ${department}, ${role}
          ) 
          RETURNING id, first_name, family_name, email, department_id, role_id
        `;
      } else {
        result = await sql`
          INSERT INTO users (
            first_name, arabic_first_name, family_name, arabic_family_name, 
            email, password,  role_id
          ) 
          VALUES (
            ${first_name}, ${arabic_first_name}, ${family_name}, ${arabic_family_name}, 
            ${email}, ${password},  ${role}
          ) 
          RETURNING id, first_name, family_name, email, department_id, role_id
        `;
      }
    }

    res.status(201).json({
      status: "success",
      message: "User added successfully",
      user: result[0],
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      status: "failure",
      message: "Error adding user",
      error: e.message,
    });
  }
};

const upsertTableSetting = async (req, res) => {
  const { user_id, table_name, setting } = req.body;

  if (!table_name || !setting) {
    return res.status(400).json({
      status: "failure",
      message: "Missing required fields: table_name, setting",
    });
  }

  try {
    // Check if the record already exists
    const existingRecord = await sql`
      SELECT id FROM user_table_settings 
      WHERE user_id = ${user_id} 
      AND table_name = ${table_name}
    `;

    let result;

    if (existingRecord.length > 0) {
      // Record exists → UPDATE
      result = await sql`
        UPDATE user_table_settings 
        SET setting = ${sql.json(setting)}
        WHERE user_id = ${user_id} AND table_name = ${table_name}
        RETURNING *;
      `;
    } else {
      // Record does not exist → INSERT
      result = await sql`
        INSERT INTO user_table_settings (user_id, table_name, setting, is_default)
        VALUES (${user_id}, ${table_name}, ${sql.json(setting)} , FALSE)
        RETURNING *;
      `;
    }

    res.status(200).json({
      status: "success",
      message: "Table setting saved successfully",
      result,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      status: "failure",
      message: "Error saving table setting",
      error: e.message,
    });
  }
};

const deleteUser = async (req, res) => {
  if (!req.body || !req.body.id) {
    return res.status(400).json({
      status: "failure",
      message: "Required field missing: id is required",
      result: null,
    });
  }

  const { id } = req.body;

  try {
    if (isNaN(id)) {
      return res.status(400).json({
        status: "failure",
        message: "Invalid id format: must be a number",
        result: null,
      });
    }

    const queryText = `DELETE FROM users WHERE id = $1 RETURNING id`;
    const result = await sql.unsafe(queryText, [id]);

    if (!result || result.length === 0) {
      return res.status(404).json({
        status: "failure",
        message: `User with id ${id} not found`,
        result: null,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "User deleted successfully",
      result: { id: result[0].id },
    });
  } catch (error) {
    console.error("Error deleting user:", error); // Added logging for diagnostics
    if (error.code === "23503") {
      return res.status(409).json({
        status: "failure",
        message:
          "Cannot delete this user because it's referenced by other records",
        result: error.detail || error,
      });
    }
    return res.status(500).json({
      status: "failure",
      message: "Error deleting user",
      result: error.message || error,
    });
  }
};

const updateUser = async (req, res) => {
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
        UPDATE users
        SET ${setClause}
        WHERE id = ${idPlaceholder}
        RETURNING *
      `;
    console.log(queryText);
    console.log(values);
    // Execute the query
    const result = await sql.unsafe(queryText, values);

    // Check if any row was updated
    if (!result || result.length === 0) {
      return res.status(404).json({
        status: "failure",
        message: `Initiative with id ${id} not found`,
        result: null,
      });
    }

    // Return success response with the updated initiative
    return res.status(200).json({
      status: "success",
      message: "Initiative updated successfully",
      result: result[0] || result,
    });
  } catch (error) {
    console.error("Error updating initiative:", error);

    // Handle unique constraint violations
    if (error.code === "23505") {
      // PostgreSQL unique violation code
      return res.status(409).json({
        status: "failure",
        message: "Update violates unique constraint",
        result: error.detail || error,
      });
    }

    // Handle other errors
    return res.status(500).json({
      status: "failure",
      message: "Error updating initiative",
      result: error.message || error,
    });
  }
};

module.exports = {
  getData,
  getSetting,
  getFilteredData,
  getUsers,
  getRoles,
  addUser,
  updateUser,
  deleteUser,
  upsertTableSetting,
  getFilteredData,
};
