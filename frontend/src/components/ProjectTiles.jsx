import React, { useState , useEffect} from "react";
import { motion, AnimatePresence } from "motion/react";
import axiosInstance from "../axiosInstance";
import {
  Target,
  Puzzle,
  Users,
  Briefcase,
  User,
  Calendar,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";
import useAuthStore from "../store/authStore"; 
import axios from "axios";
const ProjectTiles = ({ project , projectId }) => {
  // console.log('selected project data:', project);
  // // let {selectedProject } = useAuthStore();
  // console.log('selected project data from store in project tiles', selectedProject);
  const [isExpanded, setIsExpanded] = useState(false);
  const [projectData ,setProjectData] = useState({
    id: ``,
    title:``,
    type:   ``,
    category: ``,
    initiative: "",
    portfolio: "",
    altProjectManager: "",
    vendor: "",
    program: "",
    mainBusinessOwner: "",
    creationDate: "",
    plannedBudget: "0 SAR",
    plannedInvoices: "0 SAR",
    plannedInvoicesPercentage: "0%",
    deliverables: "0",
    partiallyDelayed: "0",
    delayed: "0",
    onPlan: "0",
    notStarted: "0",
    completed: "0",
    invoiced: "0 SAR",
    delayedInvoices: "0 SAR",
    delayedInvoicesPercentage: "0%",
    schedulePerformanceIndex: "0",
    scheduleVariance: "",
    actualCompletion: "",
    actualCompletionPercentage: "",
    plannedCompletion: "",
    executionStartDate: "",
    executionEndDate: "",
    duration: "",
    maintenanceStartDate: "",
    maintenanceEndDate: "",
    maintenanceDuration: "",
  })
  // if(selectedProject==null || selectedProject === undefined){
  //   //dummy 
  //   selectedProject={
  //     ...project,
  //     category:"Capex",
  //     project_type:"External",
  //   }
  // } 
  const fetchProjectAndRelatedDetails = async ()=>{
    const response = await axiosInstance.get(`/project-card/project-details/${projectId}`);
    const data = response.data.result;    console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
    console.log(data);
    const dataObject = {
    id: data?.id,
    title: data?.name,
    type:   data?.project_type_name,
    category: data?.category,
    initiative: data.initiative_name,
    portfolio: data.portfolio_name,
    altProjectManager: `${(data.alt_project_manager_first_name || '') + ' ' + (data.alt_project_manager_family_name || '')}`.trim(),
    vendor: data.vendor_name,
    program: data.program_name,
    mainBusinessOwner: "",
    creationDate: data?.created_date ? data.created_date.split('T')[0] : "",
    plannedBudget: `${data.project_budget || data.approved_project_budget || 0} SAR`,
    plannedInvoices: `${data.plannedInvoices || 0} SAR`,
    plannedInvoicesPercentage: `${data.plannedInvoicesPercentage || 0}%`,
    deliverables: data.total || 0,
    partiallyDelayed: data.partialDelayed || 0,
    delayed: data.delayed || 0,
    onPlan: data.onPlan || 0,
    notStarted: data.notStarted || 0,
    completed: data.completed || 0,
    invoiced: `${data.totalInvoiced || data.total_invoiced || 0} SAR`,
    delayedInvoices: `${data.delayedInvoices || 0} SAR`,    delayedInvoicesPercentage: `${data.delayedInvoicesPercentage || 0}%`,
    schedulePerformanceIndex: data.schedulePerformanceIndex || "0.00",
    scheduleVariance: `${data.scheduleVariance || 0}%`,
    actualCompletion: `${data.actualCompletion || 0}%`,
    actualCompletionPercentage: "",
    plannedCompletion: `${data.plannedCompletion || 0}%`,
    executionStartDate: data.execution_start_date ? data.execution_start_date.split('T')[0] : "",
    executionEndDate: data.execution_start_date && data.execution_duration ? 
      new Date(new Date(data.execution_start_date).setDate(new Date(data.execution_start_date).getDate() + parseInt(data.execution_duration))).toISOString().split('T')[0] : "",
    duration: data.execution_duration || "",
  }
  setProjectData(dataObject);

  }
  useEffect(() => {
    fetchProjectAndRelatedDetails();
  }, [projectId, project])
  // Sample data matching the reference
  // const projectData = {
  //   id: `${selectedProject.id}`,
  //   title:`${selectedProject.name}`,
  //   type:   `${selectedProject.project_type}`,
  //   category: `${selectedProject.category}`,
  //   initiative: "Enhance customer experience",
  //   portfolio: "Portfolio number sixteen",
  //   altProjectManager: "Abdulaziz Hawara",
  //   vendor: "PwC",
  //   program: "Programmed projects now",
  //   mainBusinessOwner: "Information Technology",
  //   creationDate: "25-MAY-2025",
  //   plannedBudget: "1,500,000 SAR",
  //   plannedInvoices: "900,000 SAR",
  //   plannedInvoicesPercentage: "60%",
  //   deliverables: "8",
  //   partiallyDelayed: "1",
  //   delayed: "1",
  //   onPlan: "3",
  //   notStarted: "1",
  //   completed: "2",
  //   invoiced: "500,000 SAR",
  //   delayedInvoices: "100,000 SAR",
  //   delayedInvoicesPercentage: "6%",
  //   schedulePerformanceIndex: ".78",
  //   scheduleVariance: "75,000 SAR",
  //   actualCompletion: "45%",
  //   actualCompletionPercentage: "10%",
  //   plannedCompletion: "55%",
  //   executionStartDate: "18-Aug-2024",
  //   executionEndDate: "18-Aug-2024",
  //   duration: "7 months",
  //   maintenanceStartDate: "18-Aug-2024",
  //   maintenanceEndDate: "18-Aug-2024",
  //   maintenanceDuration: "7 months",
  // };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const topInfoData = [
    { icon: Target, label: "TYPE", value: projectData.type },
    { icon: Puzzle, label: "CATEGORY", value: projectData.category },
    { icon: Users, label: "INITIATIVE", value: projectData.initiative },
    { icon: Briefcase, label: "PORTFOLIO", value: projectData.portfolio },
    { icon: User, label: "ALT. PROJECT MANAGER", value: projectData.altProjectManager },
    { icon: Briefcase, label: "VENDOR NAME", value: projectData.vendor },
    { icon: User, label: "PROJECT MANAGER", value: projectData.altProjectManager },
    { icon: Puzzle, label: "PROGRAM", value: projectData.program },
    { icon: Briefcase, label: "MAIN BUSINESS OWNER", value: projectData.mainBusinessOwner },
    { icon: Calendar, label: "CREATION DATE", value: projectData.creationDate },
  ];

  const fixedStats = [
    { icon: DollarSign, label: "Budget", value: projectData.plannedBudget, className: "bg-gray-50" },
    { icon: FileText, label: "Planned invoices", value: projectData.plannedInvoices, subValue: projectData.plannedInvoicesPercentage, className: "bg-gray-50" },
    { icon: FileText, label: "Deliverables", value: projectData.deliverables, className: "bg-gray-50" },
    { icon: AlertTriangle, label: "Partially Delayed", value: projectData.partiallyDelayed, className: "bg-yellow-50", iconColor: "text-yellow-600" },
    { icon: CheckCircle, label: "On Plan", value: projectData.onPlan, className: "bg-green-50", iconColor: "text-green-600" },
    { icon: DollarSign, label: "Invoiced", value: projectData.invoiced, className: "bg-gray-50" },
    { icon: FileText, label: "Delayed invoices", value: projectData.delayedInvoices, subValue: projectData.delayedInvoicesPercentage, className: "bg-gray-50" },
    { icon: CheckCircle, label: "Completed", value: projectData.completed, className: "bg-blue-50", iconColor: "text-blue-600" },
    { icon: XCircle, label: "Delayed", value: projectData.delayed, className: "bg-red-50", iconColor: "text-red-600" },
    { icon: Clock, label: "Not started", value: projectData.notStarted, className: "bg-gray-50" },
  ];

  const performanceIndices = [
    { label: "SPI", value: projectData.schedulePerformanceIndex, bgColor: "bg-red-300" },
    { label: "SV", value: projectData.scheduleVariance, bgColor: "bg-gray-50 text-gray-900 border" },
    { label: "ACTUAL COMPLETION", value: projectData.actualCompletion, subValue: projectData.actualCompletionPercentage, bgColor: "bg-gray-50 text-gray-900 border" },
    { label: "PLANNED COMPLETION", value: projectData.plannedCompletion, bgColor: "bg-gray-50 text-gray-900 border" },
  ];

  const dateInfo = [
    { label: "EXECUTION START DATE", value: projectData.executionStartDate },
    { label: "EXECUTION END DATE", value: projectData.executionEndDate },
    { label: "Duration", value: projectData.duration },
    // { label: "Maintenance and operation", value: projectData.maintenanceStartDate },
    // { label: "Maintenance and operation", value: projectData.maintenanceEndDate },
    // { label: "Duration", value: projectData.maintenanceDuration },
  ];

  const getStatTileStyles = (stat) => {
    // Defaults (dark mode compatible)
    let cardBg = "bg-gray-50 dark:bg-slate-800";
    let cardBorder = "border-gray-200 dark:border-slate-700";
    let iconContainerBg = "bg-gray-100 dark:bg-slate-700";
    let iconFg = stat.iconColor || "text-gray-600 dark:text-gray-400";

    if (stat.bgColor) { // For performanceIndices items
        iconFg = "text-gray-800 dark:text-gray-100"; // Text color for these tiles
        if (stat.bgColor.includes("bg-red-300")) {
            cardBg = "bg-red-300 dark:bg-red-700";
            cardBorder = "border-red-500 dark:border-red-800";
            iconFg = "text-white dark:text-gray-200"; // Override for dark red bg
        } else if (stat.bgColor.includes("bg-gray-50")) {
            cardBg = "bg-gray-50 dark:bg-slate-800";
            cardBorder = "border-gray-200 dark:border-slate-700";
            // iconFg remains as default text-gray-800 dark:text-gray-100 for gray bg
        }
        // Note: performanceIndices items usually don't have icons, so iconContainerBg isn't critical.
    } else { // For fixedStats items
        // Use stat.className for card background, ensuring dark mode compatibility
        if (stat.className) {
            if (stat.className.includes("yellow")) cardBg = "bg-yellow-50 dark:bg-yellow-800/30";
            else if (stat.className.includes("green")) cardBg = "bg-green-50 dark:bg-green-800/30";
            else if (stat.className.includes("red")) cardBg = "bg-red-50 dark:bg-red-800/30";
            else if (stat.className.includes("blue")) cardBg = "bg-blue-50 dark:bg-blue-800/30";
            else if (stat.className.includes("gray")) cardBg = "bg-gray-50 dark:bg-slate-800";
            else cardBg = stat.className; // Fallback
        }

        if (stat.iconColor) {
            const color = stat.iconColor.split('-')[1]; // "yellow", "green", etc.
            iconContainerBg = `bg-${color}-100 dark:bg-${color}-500/20`;
            cardBorder = `border-${color}-200 dark:border-${color}-500/40`;
            iconFg = `${stat.iconColor} dark:text-${color}-400`; // Ensure dark mode for icon color
        } else if (stat.className && !stat.className.includes("gray")) {
            // For items with a specific className bg but no iconColor (e.g. a custom colored tile)
            const baseColor = stat.className.split('-')[1];
            if (baseColor) {
                 cardBorder = `border-${baseColor}-200 dark:border-${baseColor}-700`;
            }
        }
        // If it's a default gray item (className includes "gray" or no specific colors), defaults are mostly fine.
        // iconFg is already set using stat.iconColor or default.
    }

    return {
        cardBgClassName: cardBg,
        cardBorderClassName: cardBorder,
        iconContainerBgClassName: iconContainerBg,
        iconFgClassName: iconFg,
    };
  };

  const StyledInfoTile = ({ icon: Icon, label, value }) => {
    const cardBgClassName = "bg-gray-50 dark:bg-slate-800";
    const cardBorderClassName = "border-gray-200 dark:border-slate-700";
    const iconContainerBgClassName = "bg-gray-100 dark:bg-slate-700";
    const iconFgClassName = "text-gray-500 dark:text-gray-400";

    return (
      <motion.div
        className={`rounded-lg border ${cardBorderClassName} ${cardBgClassName} p-3 shadow-sm`}
        variants={cardVariants}
      >
        <div className="flex items-start space-x-2">
          {Icon && (
            <div className={`${iconContainerBgClassName} p-1.5 rounded-md`}>
              <Icon className={`w-4 h-4 ${iconFgClassName}`} />
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{label}</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{value}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  const StyledStatTile = ({ icon: Icon, label, value, subValue, cardBgClassName, cardBorderClassName, iconContainerBgClassName, iconFgClassName }) => (
    <motion.div
      className={`rounded-lg border ${cardBorderClassName} ${cardBgClassName} p-4 shadow-sm`}
      variants={cardVariants}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {Icon && (
            <div className={`${iconContainerBgClassName} p-2 rounded-md`}>
              <Icon className={`w-5 h-5 ${iconFgClassName}`} />
            </div>
          )}
          <div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300 text-sm leading-tight">{label}</h3>
            <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{value}</p>
            {subValue && <p className="text-xs text-gray-500 dark:text-gray-400">{subValue}</p>}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      className="border rounded-lg shadow-sm bg-white p-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div
        className="flex justify-between items-start mb-6"
        variants={cardVariants}
      >
        <h2 className="text-xl font-medium text-gray-900">
          P_{projectData.id}: {projectData.title}
        </h2>
        <motion.button
          className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
          transition={{ duration: 0.2 }}
        >
          <MoreHorizontal className="w-5 h-5" />
        </motion.button>
      </motion.div>

      {/* Collapsible Info Grid - 5 columns */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.3 },
            }}
            style={{ overflow: "hidden" }}
          >
            <motion.div
              className="grid grid-cols-5 gap-4 mb-6"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05,
                    delayChildren: 0.1,
                  },
                },
              }}
              initial="hidden"
              animate="visible"
            >
              {topInfoData.map((item, index) => (
                <StyledInfoTile
                  key={index}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapse/Expand button */}
      <motion.div className="flex justify-center mb-6" variants={cardVariants}>
        <motion.button
          className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded border hover:bg-gray-200"
          onClick={() => setIsExpanded(!isExpanded)}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 0 : 180 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <ChevronUp className="w-4 h-4 text-gray-500" />
          </motion.div>
        </motion.button>
      </motion.div>

      {/* Fixed Stats Grid - All fixedStats items are rendered here.
          The grid `lg:grid-cols-5` will wrap items to new rows as needed.
        */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {fixedStats.map((stat, index) => {
          const styles = getStatTileStyles(stat);
          return (
            <StyledStatTile
              key={`fixed-${index}`}
              icon={stat.icon} // Pass the icon component itself
              label={stat.label}
              value={stat.value}
              subValue={stat.subValue}
              cardBgClassName={styles.cardBgClassName}
              cardBorderClassName={styles.cardBorderClassName}
              iconContainerBgClassName={styles.iconContainerBgClassName}
              iconFgClassName={styles.iconFgClassName}
            />
          );
        })}
      </motion.div>

      {/* Performance Indices Tiles (SPI, SV, Actual Completion, Planned Completion) */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {performanceIndices.map((item, index) => {
          const styles = getStatTileStyles(item);
          return (
            <StyledStatTile
              key={`perf-${index}`}
              // No icon for performanceIndices, StyledStatTile should handle Icon being undefined or null
              label={item.label}
              value={item.value}
              subValue={item.subValue}
              cardBgClassName={styles.cardBgClassName}
              cardBorderClassName={styles.cardBorderClassName}
              iconContainerBgClassName={styles.iconContainerBgClassName}
              iconFgClassName={styles.iconFgClassName}
            />
          );
        })}
      </motion.div>
      
      {/* Date Information */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05,
              delayChildren: 0.1,
            },
          },
        }}
        initial="hidden"
        animate="visible"
      >
        {dateInfo.map((item, index) => (
          // Using StyledInfoTile for dateInfo as they are simpler key-value pairs without complex styling needs like stats
          // StyledInfoTile also handles cases where an icon might not be present.
          <StyledInfoTile
            key={`date-${index}`}
            // icon={item.icon} // dateInfo items don't have icons defined in the provided data
            label={item.label}
            value={item.value}
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

const AnimatedInfoCard = ({ icon: Icon, label, value, delay }) => {
  return (
    <motion.div
      className="bg-gray-50 border rounded-lg p-4 cursor-pointer"
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.9 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            delay: delay,
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1],
          },
        },
      }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="flex items-center space-x-2 mb-2">
        <motion.div transition={{ duration: 0.2 }}>
          <Icon className="w-5 h-5 text-gray-500" />
        </motion.div>
        <span className="text-xs text-gray-500 font-medium uppercase">{label}</span>
      </div>
      <motion.p
        className="text-sm font-medium text-gray-900"
        transition={{ duration: 0.2 }}
      >
        {value}
      </motion.p>
    </motion.div>
  );
};

const AnimatedStatCard = ({
  icon: Icon,
  label,
  value,
  subValue,
  className = "bg-gray-50",
  iconColor = "text-gray-600",
}) => {
  return (
    <motion.div
      className={`${className} border rounded-lg p-4 cursor-pointer`}
      variants={{
        hidden: { opacity: 0, scale: 0.8, y: 20 },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: {
            duration: 0.5,
            ease: [0.4, 0, 0.2, 1],
          },
        },
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="flex items-center space-x-2 mb-2">
        <motion.div transition={{ duration: 0.2 }}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </motion.div>
        <span className="text-xs text-gray-600 font-medium">{label}</span>
      </div>
      <motion.p
        className="text-sm font-medium text-gray-900"
        transition={{ duration: 0.2 }}
      >
        {value}
      </motion.p>
      {subValue && (
        <motion.p
          className="text-xs text-gray-500 mt-1"
          initial={{ opacity: 0.7 }}
          transition={{ duration: 0.2 }}
        >
          {subValue}
        </motion.p>
      )}
    </motion.div>
  );
};

export default ProjectTiles;