const sql = require("../database/db");

//  @Description retrieve any table data
//  @Route site.com/data-management//data
const getData = async (req, res) => {
  let { tableName, userId, page = 1, limit = 4 } = req.body;
  console.log("Table Name", tableName);
  console.log("userId", userId);

  if (tableName == "document") {
    tableName = "document_template";
  }
  if (!tableName || !userId) {
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
    // Get paginated data
    if (tableName === "portfolio") {
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
      LIMIT ${limit} OFFSET ${offset}`;
    } else if (tableName === "objective") {
      result = await sql`
      SELECT ${sql(tableName)}.*, project.name AS belongs_to
      FROM ${sql(tableName)}
      LEFT JOIN users ON ${sql(tableName)}.project_id = project.id
      LIMIT ${limit} OFFSET ${offset}`;
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
  const {
    tableName,
    filters = {}, // Default to empty object if not provided
    page = 1,
    limit = 7, // Updated to match your query log (LIMIT 7)
    sort = {}, // Default to empty object if not provided
    dateFilter,
  } = req.body;

  if (!tableName) {
    return res.status(400).json({
      status: "failure",
      message: "Required field missing: tableName",
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

    // Handle date filtering
    if (dateFilter) {
      const dateColumn = "created_at"; // Adjust to your actual date column
      let startDate, endDate;
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      switch (dateFilter) {
        case "Today":
          startDate = new Date(today);
          startDate.setHours(0, 0, 0, 0);
          whereConditions.push(
            `"${dateColumn}" >= $${whereConditions.length + 1}`
          );
          queryParams.push(startDate.toISOString());
          whereConditions.push(
            `"${dateColumn}" <= $${whereConditions.length + 1}`
          );
          queryParams.push(today.toISOString());
          break;
        case "thisWeek":
          startDate = new Date(today);
          const dayOfWeek = startDate.getDay();
          const diff = dayOfWeek <= 1 ? dayOfWeek + 6 : dayOfWeek - 1;
          startDate.setDate(today.getDate() - diff);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          whereConditions.push(
            `"${dateColumn}" >= $${whereConditions.length + 1}`
          );
          queryParams.push(startDate.toISOString());
          whereConditions.push(
            `"${dateColumn}" <= $${whereConditions.length + 1}`
          );
          queryParams.push(endDate.toISOString());
          break;
        case "This Month":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          whereConditions.push(
            `"${dateColumn}" >= $${whereConditions.length + 1}`
          );
          queryParams.push(startDate.toISOString());
          whereConditions.push(
            `"${dateColumn}" <= $${whereConditions.length + 1}`
          );
          queryParams.push(today.toISOString());
          break;
        case "last2months":
          startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          startDate.setHours(0, 0, 0, 0);
          whereConditions.push(
            `"${dateColumn}" >= $${whereConditions.length + 1}`
          );
          queryParams.push(startDate.toISOString());
          whereConditions.push(
            `"${dateColumn}" <= $${whereConditions.length + 1}`
          );
          queryParams.push(today.toISOString());
          break;
        case "Last 3 Months":
          startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
          startDate.setHours(0, 0, 0, 0);
          whereConditions.push(
            `"${dateColumn}" >= $${whereConditions.length + 1}`
          );
          queryParams.push(startDate.toISOString());
          whereConditions.push(
            `"${dateColumn}" <= $${whereConditions.length + 1}`
          );
          queryParams.push(today.toISOString());
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
      } else {
        console.log("No valid sort parameters provided; skipping ORDER BY");
      }
    } else {
      console.log("Sort parameter is empty or invalid; skipping ORDER BY");
    }

    // Build the base query
    let queryText = `SELECT * FROM "${tableName}"`;

    // Add WHERE clause if we have conditions
    if (whereConditions.length > 0) {
      queryText += ` WHERE ${whereConditions.join(" AND ")}`;
    }

    // Add ORDER BY
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
    const countQueryParams = queryParams.slice(0, -2);
    const countResult = await sql.unsafe(countQueryText, countQueryParams);
    const totalCount = parseInt(countResult[0].count);

    res.status(200).json({
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
    res.status(500).json({
      status: "failure",
      message: "Error in retrieving filtered data",
      result: e.message,
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
      SELECT id, first_name, family_name, email 
      FROM users 
      ORDER BY first_name, family_name
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

module.exports = {
  getData,
  getSetting,
  getFilteredData,
  getUsers,
  upsertTableSetting,
};
