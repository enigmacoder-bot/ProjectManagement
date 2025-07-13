const sql = require("../database/db");
const { withRetry } = require("../middlewares/databaseHealth");

// @Description Get project high-level timeline with real progress data
// @Route site.com/data-management/getProjectTimeline
const getProjectTimeline = async (req, res) => {
  const { projectId } = req.body;

  console.log(`🔄 Timeline API called for project: ${projectId}`);

  if (!projectId) {
    return res.status(400).json({
      status: "failure",
      message: "Project ID is required",
      result: null,
    });
  }

  try {
    // Get project basic info including execution and maintenance details
    const projectInfo = await withRetry(async () => {
      return await sql`
        SELECT 
          p.id,
          p.name,
          p.execution_start_date,
          p.execution_enddate,
          p.execution_duration,
          p.maintenance_duration,
          p.current_phase_id,
          p.created_date,
          pp.name as current_phase_name,
          pp.order_position as current_phase_order
        FROM project p
        LEFT JOIN project_phase pp ON p.current_phase_id = pp.id
        WHERE p.id = ${projectId}
      `;
    });

    if (!projectInfo || projectInfo.length === 0) {
      return res.status(404).json({
        status: "failure",
        message: "Project not found",
        result: null,
      });
    }

    const project = projectInfo[0];

    // Get schedule plan for the project grouped by main phases
    const schedulePlan = await withRetry(async () => {
      return await sql`
        SELECT 
          spn.id,
          spn.phase_id,
          spn.duration_days,
          spn.start_date,
          spn.end_date,
          ph.phase_name,
          ph.phase_order,
          ph.main_phase,
          -- Normalize main phase names to match reference image expectations
          CASE 
            WHEN ph.main_phase = 'Before execution' THEN 'Before executing'
            ELSE COALESCE(ph.main_phase, ph.phase_name)
          END as mapped_phase_name
        FROM schedule_plan_new spn
        JOIN phase ph ON spn.phase_id = ph.id
        WHERE spn.project_id = ${projectId}
        ORDER BY ph.phase_order, spn.start_date
      `;
    });

    // Get deliverables progress for the project
    const deliverablesProgress = await withRetry(async () => {
      return await sql`
        SELECT 
          d.id,
          d.name,
          d.start_date,
          d.end_date,
          dp.progress_percentage,
          dp.status,
          CASE 
            WHEN d.end_date < CURRENT_DATE AND COALESCE(dp.progress_percentage, 0) < 100 THEN 'DELAYED'
            WHEN d.start_date <= CURRENT_DATE AND d.end_date >= CURRENT_DATE THEN 'IN_PROGRESS'
            WHEN COALESCE(dp.progress_percentage, 0) = 100 THEN 'COMPLETED'
            ELSE 'NOT_STARTED'
          END as calculated_status
        FROM deliverable d
        JOIN item i ON d.item_id = i.id
        LEFT JOIN deliverable_progress dp ON d.id = dp.deliverable_id
        WHERE i.project_id = ${projectId}
        ORDER BY d.start_date
      `;
    });

    // Build timeline data
    const timeline = [];
    const currentDate = new Date();

    // Define expected main phases in order
    const expectedMainPhases = ["Planning", "Bidding", "Before executing", "Executing", "Support"];

    if (schedulePlan.length > 0) {
      console.log(`📊 Found ${schedulePlan.length} schedule plan items:`, 
        schedulePlan.map(s => ({ 
          phaseName: s.phase_name, 
          mainPhase: s.main_phase, 
          mappedName: s.mapped_phase_name,
          startDate: s.start_date, 
          endDate: s.end_date 
        }))
      );
      
      // Group schedule items by main phase
      const phaseGroups = {};
      
      // Initialize all expected main phases
      expectedMainPhases.forEach((mainPhase, index) => {
        phaseGroups[mainPhase] = {
          phaseName: mainPhase,
          items: [],
          startDate: null,
          endDate: null,
          order: index + 1,
          exists: false
        };
      });

      // Group actual schedule items by main phase
      schedulePlan.forEach(item => {
        const phaseKey = item.mapped_phase_name;
        if (phaseGroups[phaseKey]) {
          phaseGroups[phaseKey].exists = true;
          phaseGroups[phaseKey].items.push(item);
          
          // Update phase date range
          if (!phaseGroups[phaseKey].startDate || item.start_date < phaseGroups[phaseKey].startDate) {
            phaseGroups[phaseKey].startDate = item.start_date;
          }
          if (!phaseGroups[phaseKey].endDate || item.end_date > phaseGroups[phaseKey].endDate) {
            phaseGroups[phaseKey].endDate = item.end_date;
          }
        }
      });

      // Convert to timeline format - first collect all phases
      const allPhases = [];
      Object.values(phaseGroups)
        .sort((a, b) => a.order - b.order)
        .forEach((phase, index) => {
          // Skip phases that don't exist in the database
          if (!phase.exists) {
            return;
          }

          const startDate = new Date(phase.startDate);
          const endDate = new Date(phase.endDate);
          const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
          
          // Calculate progress based on deliverables in this phase date range
          const phaseDeliverables = deliverablesProgress.filter(d => {
            const deliverableStart = new Date(d.start_date);
            const deliverableEnd = new Date(d.end_date);
            return (deliverableStart >= startDate && deliverableStart <= endDate) ||
                   (deliverableEnd >= startDate && deliverableEnd <= endDate) ||
                   (deliverableStart <= startDate && deliverableEnd >= endDate);
          });

          allPhases.push({
            ...phase,
            startDate,
            endDate,
            totalDays,
            phaseDeliverables,
            index
          });
        });

      // Find the single current active phase
      let currentActivePhaseIndex = -1;
      
      // First, check if current date falls within any phase date range
      for (let i = 0; i < allPhases.length; i++) {
        const phase = allPhases[i];
        if (currentDate >= phase.startDate && currentDate <= phase.endDate) {
          currentActivePhaseIndex = i;
          break;
        }
      }

      // If no phase contains current date, determine based on sequence
      if (currentActivePhaseIndex === -1) {
        if (allPhases.length > 0) {
          if (currentDate < allPhases[0].startDate) {
            // Current date is before all phases - first phase should be current
            currentActivePhaseIndex = 0;
          } else {
            // Current date is after some/all phases - find the appropriate phase
            for (let i = 0; i < allPhases.length; i++) {
              if (currentDate > allPhases[i].endDate) {
                // If this is the last phase, or if next phase hasn't started, make next phase current
                if (i === allPhases.length - 1) {
                  currentActivePhaseIndex = i; // Last phase remains current if date is past
                } else {
                  currentActivePhaseIndex = i + 1; // Next phase becomes current
                }
              } else {
                break;
              }
            }
          }
        }
      }

      console.log(`🎯 Timeline: Current active phase index: ${currentActivePhaseIndex} out of ${allPhases.length} phases (Date: ${currentDate.toISOString().split('T')[0]})`);

      // Now build timeline with correct single active phase
      allPhases.forEach((phase, index) => {
        let progress = 0;
        let status = "Not Started";

        // Determine status based on position relative to current active phase
        if (index < currentActivePhaseIndex) {
          // Phases before current active phase are completed
          progress = 100;
          status = "Completed";
        } else if (index === currentActivePhaseIndex) {
          // This is the ONLY current active phase
          if (phase.phaseDeliverables.length > 0) {
            const avgProgress = phase.phaseDeliverables.reduce((sum, d) => sum + (d.progress_percentage || 0), 0) / phase.phaseDeliverables.length;
            progress = Math.round(avgProgress);
            
            const hasDelayed = phase.phaseDeliverables.some(d => d.calculated_status === 'DELAYED');
            const allCompleted = phase.phaseDeliverables.every(d => d.calculated_status === 'COMPLETED');

            if (allCompleted && progress >= 100) {
              progress = 100;
              status = "Completed";
            } else if (hasDelayed) {
              status = "Delayed";
            } else {
              status = "In Progress";
            }
          } else {
            // Calculate time-based progress for current phase
            if (currentDate <= phase.startDate) {
              progress = 0;
              status = "Not Started";
            } else if (currentDate >= phase.endDate) {
              progress = 100;
              status = "Completed";
            } else {
              const daysPassed = Math.ceil((currentDate - phase.startDate) / (1000 * 60 * 60 * 24));
              progress = Math.min(100, Math.round((daysPassed / phase.totalDays) * 100));
              status = "In Progress";
            }
          }
        } else {
          // Phases after current active phase are not started
          progress = 0;
          status = "Not Started";
        }

        console.log(`📋 Phase ${index + 1} (${phase.phaseName}): ${status} - ${progress}% (${phase.startDate.toISOString().split('T')[0]} to ${phase.endDate.toISOString().split('T')[0]})`);

        timeline.push({
          id: `phase-${index + 1}`,
          phaseName: phase.phaseName,
          duration: `${phase.totalDays} days`,
          startDate: formatDate(phase.startDate),
          endDate: formatDate(phase.endDate),
          progress: progress,
          status: status,
          deliverableCount: phase.phaseDeliverables.length,
          order: phase.order
        });
      });
    } else {
      // Fallback: Create timeline based on project phases and execution dates
      const phases = await withRetry(async () => {
        return await sql`
          SELECT id, name, arabic_name, order_position
          FROM project_phase
          ORDER BY 
            CASE 
              WHEN order_position IS NOT NULL THEN order_position 
              ELSE id 
            END
        `;
      });

      if (phases.length > 0 && project.execution_start_date) {
        const projectStartDate = new Date(project.execution_start_date);
        const projectEndDate = project.execution_enddate ? 
          new Date(project.execution_enddate) : 
          new Date(projectStartDate.getTime() + parseDurationToDays(project.execution_duration) * 24 * 60 * 60 * 1000);

        const totalProjectDays = Math.ceil((projectEndDate - projectStartDate) / (1000 * 60 * 60 * 24));
        const daysPerPhase = Math.floor(totalProjectDays / phases.length);

        phases.forEach((phase, index) => {
          const phaseStartDate = new Date(projectStartDate.getTime() + (index * daysPerPhase * 24 * 60 * 60 * 1000));
          const phaseEndDate = index === phases.length - 1 ? 
            projectEndDate : 
            new Date(phaseStartDate.getTime() + (daysPerPhase - 1) * 24 * 60 * 60 * 1000);

          // Calculate progress based on deliverables in this phase
          const phaseDeliverables = deliverablesProgress.filter(d => {
            const deliverableStart = new Date(d.start_date);
            return deliverableStart >= phaseStartDate && deliverableStart <= phaseEndDate;
          });

          let progress = 0;
          let status = "Not Started";

          // First check if phase end date has passed - if so, mark as completed
          if (currentDate > phaseEndDate) {
            progress = 100;
            status = "Completed";
          } else if (phase.id === project.current_phase_id) {
            // This is the current phase
            if (phaseDeliverables.length > 0) {
              progress = Math.round(phaseDeliverables.reduce((sum, d) => sum + (d.progress_percentage || 0), 0) / phaseDeliverables.length);
            } else {
              // Calculate based on time elapsed
              if (currentDate >= phaseStartDate) {
                const daysPassed = Math.ceil((currentDate - phaseStartDate) / (1000 * 60 * 60 * 24));
                const phaseDays = Math.ceil((phaseEndDate - phaseStartDate) / (1000 * 60 * 60 * 24));
                progress = Math.min(100, Math.round((daysPassed / phaseDays) * 100));
              }
            }
            status = "In Progress";
          } else if (phase.order_position < (project.current_phase_order || 0)) {
            // Past phases
            progress = 100;
            status = "Completed";
          } else {
            // Future phases
            progress = 0;
            status = "Not Started";
          }

          timeline.push({
            id: `phase-${phase.id}`,
            phaseName: phase.name,
            duration: `${Math.ceil((phaseEndDate - phaseStartDate) / (1000 * 60 * 60 * 24)) + 1} days`,
            startDate: formatDate(phaseStartDate),
            endDate: formatDate(phaseEndDate),
            progress: progress,
            status: status,
            deliverableCount: phaseDeliverables.length,
            order: phase.order_position || phase.id
          });
        });
      }
    }

    // Only add calculated Executing and Support phases if they don't already exist from database
    const existingPhaseNames = timeline.map(t => t.phaseName.toLowerCase());
    const needsCalculatedPhases = !existingPhaseNames.includes('executing') || !existingPhaseNames.includes('support');
    
    if (needsCalculatedPhases) {
      console.log(`🔧 Adding calculated phases. Existing phases: ${existingPhaseNames.join(', ')}`);
      await addCalculatedPhases(timeline, project, deliverablesProgress, currentDate, existingPhaseNames);
    } else {
      console.log(`✅ All phases exist in database. Skipping calculated phases.`);
    }

    // If no timeline data could be generated, create a basic structure
    if (timeline.length === 0) {
      const basicPhases = [
        { name: "Planning", order: 1 },
        { name: "Bidding", order: 2 },
        { name: "Before executing", order: 3 },
        { name: "Executing", order: 4 },
        { name: "Support", order: 5 }
      ];

      basicPhases.forEach((phase, index) => {
        timeline.push({
          id: `phase-${index + 1}`,
          phaseName: phase.name,
          duration: "N/A",
          startDate: "N/A",
          endDate: "N/A",
          progress: phase.order <= (project.current_phase_order || 1) ? 100 : 0,
          status: phase.order < (project.current_phase_order || 1) ? "Completed" : 
                  phase.order === (project.current_phase_order || 1) ? "In Progress" : "Not Started",
          deliverableCount: 0,
          order: phase.order
        });
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Project timeline retrieved successfully",
      result: {
        projectInfo: {
          id: project.id,
          name: project.name,
          currentPhase: project.current_phase_name,
          executionStartDate: project.execution_start_date,
          executionEndDate: project.execution_enddate,
          executionDuration: project.execution_duration
        },
        timeline: timeline.sort((a, b) => a.order - b.order),
        totalDeliverables: deliverablesProgress.length,
        completedDeliverables: deliverablesProgress.filter(d => d.calculated_status === 'COMPLETED').length
      }
    });

  } catch (error) {
    console.error("Error fetching project timeline:", error);
    return res.status(500).json({
      status: "failure",
      message: "Error fetching project timeline",
      result: error.message || error,
    });
  }
};

// Helper function to format date
function formatDate(date) {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: '2-digit' 
  });
}

// Helper function to parse formatted date back to Date object
function parseFormattedDate(formattedDate) {
  if (!formattedDate || formattedDate === "N/A") return null;
  
  // Format is "DD Mon YY" (e.g., "07 Oct 25")
  const parts = formattedDate.split(' ');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0]);
  const monthMap = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  const month = monthMap[parts[1]];
  const year = `20${parts[2]}`; // Convert YY to YYYY
  
  if (!month) return null;
  
  return new Date(`${year}-${month}-${day.toString().padStart(2, '0')}`);
}

// Helper function to parse duration string to days
function parseDurationToDays(duration) {
  if (!duration) return 30; // default fallback
  
  if (typeof duration === 'string') {
    const match = duration.match(/(\d+)\s*(days?|weeks?|months?)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      
      switch (unit) {
        case 'day':
        case 'days':
          return value;
        case 'week':
        case 'weeks':
          return value * 7;
        case 'month':
        case 'months':
          return value * 30;
        default:
          return value;
      }
    }
  }
  
  return 30; // default fallback
}

// Helper function to add calculated Executing and Support phases
async function addCalculatedPhases(timeline, project, deliverablesProgress, currentDate, existingPhaseNames = []) {
  const currentOrder = Math.max(...timeline.map(t => t.order || 0), 0);
  
  // Only calculate Executing phase if it doesn't exist and execution dates are available
  if (!existingPhaseNames.includes('executing') && 
      project.execution_start_date && (project.execution_enddate || project.execution_duration)) {
    
    console.log(`📅 Adding calculated Executing phase`);
    
    // Find the latest end date from existing timeline phases
    const latestEndDate = timeline.reduce((latest, phase) => {
      if (phase.endDate && phase.endDate !== "N/A") {
        const phaseEndDate = parseFormattedDate(phase.endDate);
        return !latest || phaseEndDate > latest ? phaseEndDate : latest;
      }
      return latest;
    }, null);
    
    let executionStart, executionEnd;
    
    if (latestEndDate) {
      // Start executing phase the day after the last database phase ends
      executionStart = new Date(latestEndDate);
      executionStart.setDate(executionStart.getDate() + 1);
      console.log(`🔧 Executing phase will start after last database phase: ${executionStart.toISOString().split('T')[0]}`);
    } else {
      // Fallback to project execution start date if no database phases
      executionStart = new Date(project.execution_start_date);
      console.log(`🔧 Using project execution start date: ${executionStart.toISOString().split('T')[0]}`);
    }
    
    if (project.execution_enddate) {
      executionEnd = new Date(project.execution_enddate);
    } else if (project.execution_duration) {
      const durationDays = parseDurationToDays(project.execution_duration);
      executionEnd = new Date(executionStart.getTime() + (durationDays * 24 * 60 * 60 * 1000));
    }
    
    if (project.execution_enddate) {
      executionEnd = new Date(project.execution_enddate);
    } else if (project.execution_duration) {
      const durationDays = parseDurationToDays(project.execution_duration);
      executionEnd = new Date(executionStart.getTime() + (durationDays * 24 * 60 * 60 * 1000));
    }
    
    if (executionEnd) {
      // Calculate progress for Executing phase
      const executionDeliverables = deliverablesProgress.filter(d => {
        const deliverableStart = new Date(d.start_date);
        const deliverableEnd = new Date(d.end_date);
        return (deliverableStart >= executionStart && deliverableStart <= executionEnd) ||
               (deliverableEnd >= executionStart && deliverableEnd <= executionEnd) ||
               (deliverableStart <= executionStart && deliverableEnd >= executionEnd);
      });
      
      let executionProgress = 0;
      let executionStatus = "Not Started";
      
      if (currentDate > executionEnd) {
        executionProgress = 100;
        executionStatus = "Completed";
      } else if (currentDate >= executionStart) {
        if (executionDeliverables.length > 0) {
          executionProgress = Math.round(
            executionDeliverables.reduce((sum, d) => sum + (d.progress_percentage || 0), 0) / 
            executionDeliverables.length
          );
          
          const hasDelayed = executionDeliverables.some(d => d.calculated_status === 'DELAYED');
          const hasInProgress = executionDeliverables.some(d => d.calculated_status === 'IN_PROGRESS');
          
          if (hasDelayed) {
            executionStatus = "Delayed";
          } else if (hasInProgress || executionProgress > 0) {
            executionStatus = "In Progress";
          } else {
            executionStatus = "In Progress";
          }
        } else {
          // Calculate based on time elapsed
          const daysPassed = Math.ceil((currentDate - executionStart) / (1000 * 60 * 60 * 24));
          const totalDays = Math.ceil((executionEnd - executionStart) / (1000 * 60 * 60 * 24));
          executionProgress = Math.min(100, Math.round((daysPassed / totalDays) * 100));
          executionStatus = "In Progress";
        }
      }
      
      const totalDays = Math.ceil((executionEnd - executionStart) / (1000 * 60 * 60 * 24)) + 1;
      
      timeline.push({
        id: `executing-phase`,
        phaseName: "Executing",
        duration: `${totalDays} days`,
        startDate: formatDate(executionStart),
        endDate: formatDate(executionEnd),
        progress: executionProgress,
        status: executionStatus,
        deliverableCount: executionDeliverables.length,
        order: currentOrder + 1
      });
    }
  }
  
  // Only calculate Support phase if it doesn't exist and maintenance duration is available
  if (!existingPhaseNames.includes('support') && 
      project.maintenance_duration && project.execution_enddate) {
    
    console.log(`📅 Adding calculated Support phase`);
    const supportStart = new Date(project.execution_enddate);
    supportStart.setDate(supportStart.getDate() + 1); // Start day after execution ends
    
    const maintenanceDays = parseInt(project.maintenance_duration) || 365; // Default 1 year
    const supportEnd = new Date(supportStart.getTime() + (maintenanceDays * 24 * 60 * 60 * 1000));
    
    // Calculate progress for Support phase
    const supportDeliverables = deliverablesProgress.filter(d => {
      const deliverableStart = new Date(d.start_date);
      const deliverableEnd = new Date(d.end_date);
      return (deliverableStart >= supportStart && deliverableStart <= supportEnd) ||
             (deliverableEnd >= supportStart && deliverableEnd <= supportEnd) ||
             (deliverableStart <= supportStart && deliverableEnd >= supportEnd);
    });
    
    let supportProgress = 0;
    let supportStatus = "Not Started";
    
    if (currentDate > supportEnd) {
      supportProgress = 100;
      supportStatus = "Completed";
    } else if (currentDate >= supportStart) {
      if (supportDeliverables.length > 0) {
        supportProgress = Math.round(
          supportDeliverables.reduce((sum, d) => sum + (d.progress_percentage || 0), 0) / 
          supportDeliverables.length
        );
        
        const hasDelayed = supportDeliverables.some(d => d.calculated_status === 'DELAYED');
        const hasInProgress = supportDeliverables.some(d => d.calculated_status === 'IN_PROGRESS');
        
        if (hasDelayed) {
          supportStatus = "Delayed";
        } else if (hasInProgress || supportProgress > 0) {
          supportStatus = "In Progress";
        } else {
          supportStatus = "In Progress";
        }
      } else {
        // Calculate based on time elapsed
        const daysPassed = Math.ceil((currentDate - supportStart) / (1000 * 60 * 60 * 1000));
        supportProgress = Math.min(100, Math.round((daysPassed / maintenanceDays) * 100));
        supportStatus = "In Progress";
      }
    }
    
    timeline.push({
      id: `support-phase`,
      phaseName: "Support",
      duration: `${maintenanceDays} days`,
      startDate: formatDate(supportStart),
      endDate: formatDate(supportEnd),
      progress: supportProgress,
      status: supportStatus,
      deliverableCount: supportDeliverables.length,
      order: currentOrder + 2
    });
  }
  
  // Sort timeline by order to ensure proper sequence
  timeline.sort((a, b) => (a.order || 0) - (b.order || 0));
}

module.exports = {
  getProjectTimeline,
};
