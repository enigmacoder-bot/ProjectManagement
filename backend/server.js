require("dotenv").config();
const express = require("express");
const cors = require("cors");
const errorHandler = require("./middlewares/errorHandler");
const { testDatabaseConnection } = require("./middlewares/databaseHealth");
const cronJob = require("./services/cronJob");
const multer = require("multer");

// Configure multer with memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Validate environment and database connection on startup
async function validateStartup() {
  console.log("🚀 Starting Project Management Server...");
  console.log("=========================================");
  
  // Check database connection
  console.log("🔍 Checking database connection...");
  const dbHealthy = await testDatabaseConnection();
  
  if (!dbHealthy) {
    console.error("❌ Database connection failed. Exiting...");
    process.exit(1);
  }
  
  console.log("✅ Startup validation completed successfully!");
  return true;
}

const app = express();
console.log('Environment PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
const port = process.env.PORT || 4001; // Use Render's assigned port or fallback to 4001

// Configure CORS to handle credentials properly
const corsOptions = {
  origin: [
    'https://project-management-mfog.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin'
  ]
};

app.use(cors(corsOptions));

// Handle preflight for all routes
app.options('*', cors(corsOptions));

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Origin:', req.headers.origin);
  console.log('User-Agent:', req.headers['user-agent']);
  if (req.method === 'OPTIONS') {
    console.log('Preflight request detected');
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS test endpoint
app.get('/test-cors', (req, res) => {
  res.json({ 
    message: 'CORS is working!', 
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

app.use("/auth", require("./routes/authRoute"));
app.use("/admin", require("./routes/adminRoute"));
app.use("/db", require("./routes/tempdbConfigRoute"));
app.use("/data-management", require("./routes/dataManagementRoute"));
app.use("/pm", require("./routes/pmRoute"));
app.use("/tasks", require("./routes/tasksRoute"));
app.use("/deputy", require("./routes/deputyRoute"));
app.use("/meeting", require("./routes/meetingRoute"));
app.use("/project-card",require("./routes/projectCardRoute"));
app.use("/deliverables", require("./routes/deliverablesRoute")); // Added this line

app.post(
  "/data-management/addProjectDocument",
  upload.single("file"),
  require("./controllers/documentController").addProjectDocument
);

app.use(errorHandler);

// Add health check route
app.use("/health", require("./routes/healthRoute"));

// Start server with validation
async function startServer() {
  try {
    await validateStartup();
    
    app.listen(port, (req, res) => {
      console.log(`✅ App listening at port ${port}`);
      console.log(`🔗 Health check available at: http://localhost:${port}/health/health`);
      cronJob();
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

process.on("SIGINT", () => {
  console.log("Shutting down server gracefully...");
  app.close(() => {
    console.log("Server closed. Exiting process...");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("Process terminated.");
  app.close(() => process.exit(0));
});
