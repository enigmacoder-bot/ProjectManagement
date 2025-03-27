const express = require("express");
const multer = require("multer");

// Define storage
const storage = multer.memoryStorage(); // Store file in memory buffer

const upload = multer({ storage: storage });
const router = express.Router();
const {
  getData,
  getSetting,
  getFilteredData,
  getUsers,
  upsertTableSetting,
} = require("../controllers/dataManagementController");
const {
  addInitiative,
  updateInitiative,
  deleteInitiative,
  getInitiatives,
} = require("../controllers/initiativeController");

const {
  addPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolios,
} = require("../controllers/portfolioController");

const {
  addProgram,
  updateProgram,
  deleteProgram,
  getPrograms,
  getProgramDetails,
} = require("../controllers/programController");

const {
  createDocumentTemplate,
  getProjectPhaseDocuments,
  getCurrentPhaseDocumentTemplates,
} = require("../controllers/documentTemplateController");

const {
  addProject,
  updateProject,
  deleteProject,
  getProjectById,
  updateProjectApprovalbyDeputy,
  getProjectPhases,
  getProjectPhase,
  getProjectTypes,
  addBeneficiaryDepartments,
  getBeneficiaryDepartments,
} = require("../controllers/projectController");
const {
  getSchedulePlan,
  upsertSchedulePlan,
  getSchedulePhases,
} = require("../controllers/schedulePlanController");

const {
  addDepartment,

  getDepartments,
} = require("../controllers/departmentController");

const {
  getPhaseDurations,
  getPhaseDurationsByBudget,
} = require("../database/dbConfig");
const { addVendor, getVendors } = require("../controllers/vendorController");
const {
  addObjective,
  getObjectives,
} = require("../controllers/objectiveController");

const {
  getInitiativeWithAllRelatedData,
  getPortfolioWithAllRelatedData,
  getProgramWithAllRelatedData,
  getProjectWithAllRelatedData,
  getUserRelatedEntities,
} = require("../controllers/accordionDataController");
const {
  addProjectDocument,
  getProjectDocuments,
  deleteProjectDocument,
} = require("../controllers/documentController");
const {
  createProjectCreationTaskForDeputy,
} = require("../controllers/taskCreationController");

router.post("/setting", getSetting);
router.post("/data", getData);
router.post("/filtereddata", getFilteredData);
router.post("/upsertTableSetting", upsertTableSetting);

router.post("/addInitiative", addInitiative);
router.post("/updateInitiative", updateInitiative);
router.post("/deleteInitiative", deleteInitiative);
router.post("/getInitiatives", getInitiatives);

router.post("/addPortfolio", addPortfolio);
router.post("/updatePortfolio", updatePortfolio);
router.post("/deletePortfolio", deletePortfolio);
router.post("/getPortfolios", getPortfolios);

router.post("/addprogram", addProgram);
router.post("/updateProgram", updateProgram);
router.post("/deleteProgram", deleteProgram);
router.post("/getPrograms", getPrograms);

router.post(
  "/addDocumentTemplate",
  upload.single("file"),
  createDocumentTemplate
);
router.post(
  "/getCurrentPhaseDocumentTemplates",
  getCurrentPhaseDocumentTemplates
);

router.get("/users", getUsers);

router.post("/addProject", addProject);
router.post("/updateProject", updateProject);
router.post("/deleteProject", deleteProject);
router.post("/getProject", getProjectById);

router.post("/getPhaseDurationsByBudget", getPhaseDurationsByBudget);
router.post("/updateProjectApproval", updateProjectApprovalbyDeputy);

router.post("/upsertSchedulePlan", upsertSchedulePlan);

router.post("/getInitiativeWithRelatedData", getInitiativeWithAllRelatedData);
router.post("/getPortfolioWithRelatedData", getPortfolioWithAllRelatedData);
router.post("/getProgramWithRelatedData", getProgramWithAllRelatedData);
router.post("/getProjectWithRelatedData", getProgramWithAllRelatedData);
router.post("/getUserRelatedEntities", getUserRelatedEntities);

router.post("/adddepartment", addDepartment);
router.post("/getDepartments", getDepartments);

router.post("/addvendor", addVendor);
router.post("/getVendors", getVendors);

router.post("/addobjective", addObjective);
router.post("/getObjectives", getObjectives);
router.post("/getProjectDocuments", getProjectDocuments);
//router.post("/addProjectDocument",addProjectDocument);
router.post("/getProjectPhases", getProjectPhases);
router.post("/getProjectPhase", getProjectPhase);
router.post("/getProjectTypes", getProjectTypes);

router.post("/deleteProjectDocument", deleteProjectDocument);
router.post("/getSchedulePhases", getSchedulePhases);
router.post("/getPhaseDurations", getPhaseDurations);

router.post("/getSchedulePlan", getSchedulePlan);

router.post("/addBeneficiaryDepartments", addBeneficiaryDepartments);
router.post("/getBeneficiaryDepartments", getBeneficiaryDepartments);

router.post(
  "/createProjectCreationTaskForDeputy",
  createProjectCreationTaskForDeputy
);

router.post("/getProgramDetails", getProgramDetails);
module.exports = router;
