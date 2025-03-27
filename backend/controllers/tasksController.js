const sql = require("../database/db");

const getTasks = async (req, res) => {
  console.log("get tasks is called");
  let { userId, page = 1, limit = 4 } = req.body;
  console.log("the userId", userId);
  if (!userId) {
    return res.status(400).json({
      status: "failure",
      message: "Required field missing",
      result: null,
    });
  }

  try {
    const offset = (page - 1) * limit;

    const result = await sql`
      SELECT tasks.*, 
             project.name AS project_name,
             project.project_budget  AS project_budget,
             project.approved_project_budget AS approved_project_budget,
             users.first_name, 
             users.family_name, 
             users.arabic_first_name, 
             users.arabic_family_name
      FROM tasks 
      LEFT JOIN project ON tasks.related_entity_id = project.id 
      LEFT JOIN users ON tasks.assigned_to = users.id
      WHERE tasks.assigned_to = ${userId} 
      LIMIT ${limit} OFFSET ${offset}`;

    const countResult = await sql`
      SELECT COUNT(*) AS totalCount,
             COUNT(CASE WHEN status = 'Open' THEN 1 END) AS openTasksCount,
             COUNT(CASE WHEN status = 'Delayed' THEN 1 END) AS closedTasksCount
      FROM tasks 
      WHERE assigned_to = ${userId}`;
    console.log("count result is");
    console.log(countResult);
    res.status(200).json({
      status: "success",
      message: "Tasks retrieved successfully",
      result: result,
      openTasksCount: parseInt(countResult[0].opentaskscount, 10),
      closedTasksCount: parseInt(countResult[0].closedtaskscount, 10),
      pagination: {
        total: parseInt(countResult[0].totalcount, 10),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(parseInt(countResult[0].totalcount, 10) / limit),
      },
    });
  } catch (e) {
    res.status(500).json({
      status: "failure",
      message: "Internal server error",
      result: e.message,
    });
  }
};

const filterTasks = async (req, res) => {
  const {
    userId,
    filters = {},
    project_name,
    getAllTasks = false,
    taskStatus,
    dateFilter,
    sort: sortClause,
    page = 1,
    limit = 10,
  } = req.body;

  if (!userId) {
    return res.status(400).json({
      status: "failure",
      message: "userId is required",
      result: null,
    });
  }

  try {
    let whereConditions = [];
    let queryParams = [];

    if (!getAllTasks) {
      whereConditions.push(
        `tasks.assigned_to = $${whereConditions.length + 1}`
      );
      queryParams.push(userId);
    }

    Object.entries(filters).forEach(([column, value]) => {
      if (value && typeof value === "string" && value.trim() !== "") {
        whereConditions.push(
          `tasks.${column} = $${whereConditions.length + 1}`
        );
        queryParams.push(value.trim());
      }
    });

    if (project_name && project_name.trim() !== "") {
      whereConditions.push(`project.name = $${whereConditions.length + 1}`);
      queryParams.push(project_name.trim());
    }

    if (taskStatus && taskStatus.trim() !== "" && taskStatus != "Open") {
      whereConditions.push(`tasks.status = $${whereConditions.length + 1}`);
      queryParams.push(taskStatus.trim());
    }

    let queryText = `
        SELECT tasks.*, 
               project.name AS project_name, 
               project.project_budget  AS project_budget,
               project.approved_project_budget AS approved_project_budget,
               users.first_name, 
               users.family_name, 
               users.arabic_first_name, 
               users.arabic_family_name
        FROM tasks
        LEFT JOIN project ON tasks.related_entity_id = project.id
        LEFT JOIN users ON tasks.assigned_to = users.id
      `;

    if (whereConditions.length > 0) {
      queryText += ` WHERE ${whereConditions.join(" AND ")}`;
    }

    if (sortClause && typeof sortClause === "object") {
      const validColumns = ["created_date", "due_date", "priority"];
      const sortStatements = [];

      Object.entries(sortClause).forEach(([column, direction]) => {
        if (
          validColumns.includes(column) &&
          ["ASC", "DESC"].includes(direction.toUpperCase())
        ) {
          sortStatements.push(`tasks.${column} ${direction.toUpperCase()}`);
        }
      });

      if (sortStatements.length > 0) {
        queryText += ` ORDER BY ${sortStatements.join(", ")}`;
      }
    }

    const offset = (page - 1) * limit;
    queryText += ` LIMIT $${queryParams.length + 1} OFFSET $${
      queryParams.length + 2
    }`;
    queryParams.push(limit, offset);

    const result = await sql.unsafe(queryText, queryParams);

    let countQuery = `
        SELECT COUNT(*) AS totalCount,
               COUNT(CASE WHEN status = 'Open' THEN 1 END) AS openTasksCount,
               COUNT(CASE WHEN status = 'Delayed' THEN 1 END) AS closedTasksCount
        FROM tasks
        LEFT JOIN project ON tasks.related_entity_id = project.id
        LEFT JOIN users ON tasks.assigned_to = users.id
        ${
          whereConditions.length > 0
            ? `WHERE ${whereConditions.join(" AND ")}`
            : ""
        }
      `;

    const totalResult = await sql.unsafe(countQuery, queryParams.slice(0, -2));
    console.log(totalResult);
    res.json({
      status: "success",
      result: result,
      openTasksCount: parseInt(totalResult[0].opentaskscount, 10),
      closedTasksCount: parseInt(totalResult[0].closedtaskscount, 10),
      pagination: {
        total: parseInt(totalResult[0].totalcount, 10),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(parseInt(totalResult[0].totalcount, 10) / limit),
      },
    });
  } catch (error) {
    console.error("Error filtering tasks:", error);
    res.status(500).json({
      status: "failure",
      message: "Error filtering tasks",
      result: error.message,
    });
  }
};

module.exports = { getTasks, filterTasks };
