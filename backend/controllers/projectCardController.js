const sql = require("../database/db");

const getProjectDetails = async (req, res) => {
  const { projectid } = req.params;

  try {
    const result = await sql`
      SELECT 
        p.*, 
        pr.name AS program_name,
        pf.name AS portfolio_name,
        i.name AS initiative_name,
        u.first_name AS alt_project_manager_first_name,
        u.family_name AS alt_project_manager_family_name,
        v.name AS vendor_name,
        pt.name AS project_type_name,
        pp.name AS project_phase_name
      FROM 
        project p
      LEFT JOIN 
        program pr ON pr.id = p.program_id
      LEFT JOIN 
        portfolio pf ON pf.id = pr.portfolio_id
      LEFT JOIN 
        initiative i ON i.id = pf.initiative_id
      LEFT JOIN 
        users u ON u.id = p.alternative_project_manager_id
      LEFT JOIN 
        vendor v ON v.id = p.vendor_id
      LEFT JOIN 
        project_type pt ON pt.id = p.project_type_id
      LEFT JOIN 
        project_phase pp ON pp.id = p.current_phase_id
      WHERE 
        p.id = ${projectid};    `;

    const deliverableResult = await sql`
      SELECT 
        d.id,
        d.name,
        d.start_date,
        d.end_date,
        d.duration,
        d.amount AS contract_amount,
        COALESCE(dp.scope_percentage, 0) AS scope_pct,
        COALESCE(dp.progress_percentage, 0) AS progress_percentage,
        GREATEST((CURRENT_DATE - d.end_date), 0) AS days_overdue,
        CASE 
          WHEN COALESCE(dp.progress_percentage, 0) >= 100 OR COALESCE(dp.scope_percentage, 0) >= 100 THEN 'COMPLETED'
          WHEN CURRENT_DATE > d.end_date AND COALESCE(dp.progress_percentage, 0) < 100 THEN 'DELAYED'
          WHEN COALESCE(dp.progress_percentage, 0) > 0 OR COALESCE(dp.scope_percentage, 0) > 0 THEN 'IN_PROGRESS'
          ELSE 'NOT_STARTED'
        END AS dashboard_status
      FROM deliverable d
      LEFT JOIN item i ON i.id = d.item_id  
      LEFT JOIN deliverable_progress dp ON dp.deliverable_id = d.id
      WHERE i.project_id = ${projectid};
    `;    // Get aggregated invoice data for project totals
    const paymentSummary = await sql`
      SELECT 
        SUM(COALESCE(dph.invoice_amount, 0)) AS total_invoiced,
        SUM(CASE WHEN dph.status = 'DELAYED' THEN COALESCE(dph.invoice_amount, 0) ELSE 0 END) AS delayed_invoices_amount
      FROM project p
      JOIN item i ON i.project_id = p.id
      JOIN deliverable d ON d.item_id = i.id
      LEFT JOIN deliverable_payment_history dph ON dph.deliverable_id = d.id
      WHERE p.id = ${projectid} AND dph.invoice_amount IS NOT NULL;
    `;

    let total = 0, completed = 0, delayed = 0, partialDelayed = 0 , notStarted = 0 , onPlan = 0;
    let totalPlannedInvoices = 0, totalInvoiced = 0, totalDelayedInvoices = 0;
    let totalProgress = 0, totalExpectedProgress = 0, validProgressCount = 0;
    const today = new Date();
    
    // Calculate deliverable statistics using the actual progress data
    for (const row of deliverableResult) {
      total++;
      console.log('Deliverable data:', row);
      const { dashboard_status, scope_pct, progress_percentage, contract_amount } = row;
      
      // Use the maximum of scope_pct and progress_percentage for the most accurate progress
      const actualProgress = Math.max(parseFloat(scope_pct || 0), parseFloat(progress_percentage || 0));
      
      // Add to planned invoices total (all deliverables amounts)
      totalPlannedInvoices += parseFloat(contract_amount || 0);
      
      // Count by status from the dashboard view
      switch (dashboard_status) {
        case 'COMPLETED':
          completed++;
          totalProgress += 100;
          totalExpectedProgress += 100;
          validProgressCount++;
          break;
        case 'DELAYED':
          delayed++;
          totalProgress += actualProgress;
          // For delayed items, expected progress should be 100%
          totalExpectedProgress += 100;
          validProgressCount++;
          break;
        case 'NOT_STARTED':
          notStarted++;
          break;
        default:
          // IN_PROGRESS or other statuses
          totalProgress += actualProgress;
          
          // Calculate expected progress based on time elapsed
          const start = new Date(row.start_date);
          const end = new Date(row.end_date);
          const totalDays = (end - start) / (1000 * 60 * 60 * 24) + 1;
          const elapsedDays = (today - start) / (1000 * 60 * 60 * 24) + 1;
          const expected = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
          
          totalExpectedProgress += expected;
          validProgressCount++;
          
          // Determine if on plan or partially delayed
          if (actualProgress >= expected) {
            onPlan++;
          } else {
            partialDelayed++;
          }
          break;
      }
    }

    console.log('Progress calculation summary:', {
      total,
      validProgressCount,
      totalProgress,
      totalExpectedProgress,
      averageProgress: validProgressCount > 0 ? totalProgress / validProgressCount : 0
    });

    // Calculate payment statistics
    if (paymentSummary.length > 0) {
      const payment = paymentSummary[0];
      totalInvoiced = parseFloat(payment.total_invoiced || 0);
      totalDelayedInvoices = parseFloat(payment.delayed_invoices_amount || 0);
    }// Calculate percentages
    const plannedInvoicesPercentage = totalPlannedInvoices > 0 ? 
      Math.round((totalInvoiced / totalPlannedInvoices) * 100) : 0;
    const delayedInvoicesPercentage = totalInvoiced > 0 ? 
      Math.round((totalDelayedInvoices / totalInvoiced) * 100) : 0;

    // Calculate schedule performance metrics
    const actualCompletion = validProgressCount > 0 ? 
      Math.round(totalProgress / validProgressCount) : 0;
    const plannedCompletion = validProgressCount > 0 ? 
      Math.round(totalExpectedProgress / validProgressCount) : 0;
    const schedulePerformanceIndex = plannedCompletion > 0 ? 
      (actualCompletion / plannedCompletion).toFixed(2) : "0.00";
    const scheduleVariance = actualCompletion - plannedCompletion;

    const finalResponse = { 
      ...result[0], 
      total, 
      notStarted, 
      completed, 
      partialDelayed, 
      onPlan, 
      delayed,
      plannedInvoices: totalPlannedInvoices,
      plannedInvoicesPercentage: plannedInvoicesPercentage,
      totalInvoiced: totalInvoiced,
      delayedInvoices: totalDelayedInvoices,
      delayedInvoicesPercentage: delayedInvoicesPercentage,
      actualCompletion: actualCompletion,
      plannedCompletion: plannedCompletion,
      schedulePerformanceIndex: schedulePerformanceIndex,
      scheduleVariance: scheduleVariance
    };
    
    res.status(200).json({
      status: "success",
      message: "Successfully retrieved project details with linked hierarchy",
      result:finalResponse
    });
  } catch (e) {
    console.error("Error fetching project details:", e);
    res.status(500).json({
      status: "failure",
      message: "Failed to get Project Details",
      result: e,
    });
  }
};




const getProjectsBasedOnUserId = async(req,res)=>{
  const {userId} = req.params;
  const {role} = req.query;
  try {
    let projects = [];
    
    // Get all projects based on user role
    if (role === 'DEPUTY' || role === 'PMO') {
      projects = await sql`
        SELECT * FROM project
      `;
    } else {
      projects = await sql`
        SELECT * FROM project
        WHERE project_manager_id = ${userId} OR alternative_project_manager_id = ${userId}
      `;
    }

    // Calculate progress for each project
    const projectsWithProgress = await Promise.all(projects.map(async (project) => {
      try {
        // Get project phases if available (project_phase table contains global phases, not project-specific)
        const phases = await sql`
          SELECT * FROM project_phase 
          ORDER BY order_position ASC
        `;

        // Get all deliverables for the project with their status and scope percentage
        const deliverables = await sql`
          SELECT 
            d.*,
            COALESCE(dp.scope_percentage, 0) as scope_pct,
            COALESCE(dp.progress_percentage, 0) as progress_percentage,
            d.status as deliverable_status,
            d.start_date as deliverable_start_date,
            d.end_date as deliverable_end_date,
            dp.status as progress_status
          FROM deliverable d
          JOIN item i ON d.item_id = i.id
          LEFT JOIN deliverable_progress dp ON d.id = dp.deliverable_id
          WHERE i.project_id = ${project.id}
        `;

        // Calculate progress by phase
        const phaseProgress = phases.map(phase => {
          const phaseDeliverables = deliverables.filter(d => d.phase_id === phase.id);
          let phaseWeight = 0;
          let phaseProgressSum = 0;
          
          phaseDeliverables.forEach(deliverable => {
            const weight = 1; // Equal weight for all deliverables in phase
            phaseWeight += weight;
            
            let progress = 0;
            if (deliverable.deliverable_status === 'COMPLETED') {
              progress = 100;
            } else if (deliverable.deliverable_status === 'IN_PROGRESS') {
              progress = Math.min(100, Math.max(0, parseFloat(deliverable.scope_pct) || 0));
            }
            
            phaseProgressSum += (progress * weight);
          });
          
          return {
            phaseId: phase.id,
            phaseName: phase.name,
            progress: phaseWeight > 0 ? Math.round(phaseProgressSum / phaseWeight) : 0,
            weight: phaseWeight,
            startDate: phase.start_date,
            endDate: phase.end_date
          };
        });

        const now = new Date();
        
        // Calculate overall progress based on average of all deliverables
        let totalProgress = 0;
        let completedDeliverables = 0;
        let totalDeliverables = deliverables.length;
        let onTimeDeliverables = 0;
        let delayedDeliverables = 0;

        console.log(`\n=== PROGRESS CALCULATION DEBUG for Project ${project.id} ===`);
        console.log(`Total deliverables: ${totalDeliverables}`);

        // Count completed and on-time deliverables, sum up progress
        deliverables.forEach((deliverable, index) => {
          let progress = 0;
          const status = (deliverable.deliverable_status || deliverable.status || deliverable.progress_status || '').toUpperCase();
          const scopePct = parseFloat(deliverable.scope_pct) || 0;
          const progressPct = parseFloat(deliverable.progress_percentage) || 0;
          
          // Use the highest available progress value
          const maxProgress = Math.max(scopePct, progressPct);
          
          console.log(`Deliverable ${index + 1}:`);
          console.log(`  Name: ${deliverable.name || 'N/A'}`);
          console.log(`  Status: "${deliverable.deliverable_status}" | Progress Status: "${deliverable.progress_status}"`);
          console.log(`  Scope %: ${deliverable.scope_pct} | Progress %: ${deliverable.progress_percentage}`);
          console.log(`  Max Progress: ${maxProgress}`);
          console.log(`  Normalized Status: "${status}"`);
          
          // More flexible status checking with fallback to progress percentage
          if (status === 'COMPLETED' || status === 'COMPLETE' || maxProgress === 100) {
            progress = 100;
            completedDeliverables++;
            // Check if completed on time
            if (deliverable.deliverable_end_date && new Date(deliverable.deliverable_end_date) >= now) {
              onTimeDeliverables++;
            } else {
              delayedDeliverables++;
            }
            console.log(`  → Treated as COMPLETED (100%)`);
          } else if (status === 'IN_PROGRESS' || status === 'IN PROGRESS' || status === 'INPROGRESS' || maxProgress > 0) {
            progress = Math.min(100, Math.max(0, maxProgress));
            // Check if in progress but past due
            if (deliverable.deliverable_end_date && new Date(deliverable.deliverable_end_date) < now) {
              delayedDeliverables++;
            }
            console.log(`  → Treated as IN_PROGRESS (${progress}%)`);
          } else if ((status === 'NOT_STARTED' || status === 'NOT STARTED' || status === 'NOTSTARTED' || !status) && 
                    deliverable.deliverable_start_date && 
                    new Date(deliverable.deliverable_start_date) < now) {
            // Not started but should have started
            delayedDeliverables++;
            progress = 0;
            console.log(`  → Treated as DELAYED NOT_STARTED (0%)`);
          } else {
            progress = maxProgress; // Use the progress percentage even if status is unclear
            console.log(`  → Using progress percentage (${progress}%)`);
          }
          
          totalProgress += progress;
          console.log(`  → Adding ${progress}% to total. Running total: ${totalProgress}`);
        });

        // Calculate overall progress as simple average of all deliverables
        const overallProgress = totalDeliverables > 0 
          ? Math.round(totalProgress / totalDeliverables) 
          : 0;

        console.log(`Final calculation: ${totalProgress} / ${totalDeliverables} = ${overallProgress}%`);
        console.log(`=== END DEBUG ===\n`);

        // Calculate time-based progress if project has start and end dates
        let timeProgress = 0;
        //const now = new Date();
        
        // Try to use execution dates first, then fall back to project dates
        let projectStart = null;
        let projectEnd = null;
        
        if (project.execution_start_date && project.execution_enddate) {
          projectStart = new Date(project.execution_start_date);
          projectEnd = new Date(project.execution_enddate);
        } else if (project.execution_start_date && project.execution_duration) {
          projectStart = new Date(project.execution_start_date);
          // Parse execution_duration to calculate end date
          let durationDays = 0;
          if (typeof project.execution_duration === 'string') {
            const durationStr = project.execution_duration.toLowerCase();
            if (durationStr.includes('week')) {
              const weeks = parseInt(durationStr, 10) || 0;
              durationDays = weeks * 7;
            } else if (durationStr.includes('month')) {
              const months = parseInt(durationStr, 10) || 0;
              durationDays = months * 30;
            } else if (durationStr.includes('day')) {
              durationDays = parseInt(durationStr, 10) || 0;
            } else {
              // Assume it's in weeks if no unit specified
              durationDays = (parseInt(durationStr, 10) || 0) * 7;
            }
          } else if (typeof project.execution_duration === 'number') {
            // Assume days if it's a number
            durationDays = project.execution_duration;
          }
          
          if (durationDays > 0) {
            projectEnd = new Date(projectStart.getTime() + durationDays * 24 * 60 * 60 * 1000);
          }
        } else if (project.start_date && project.end_date) {
          projectStart = new Date(project.start_date);
          projectEnd = new Date(project.end_date);
        }
        
        if (projectStart && projectEnd) {
          const totalDuration = projectEnd - projectStart;
          const elapsedDuration = now - projectStart;
          
          if (totalDuration > 0) {
            timeProgress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
          }
        }

        // Calculate phase-based timeline progress
        let phaseTimeProgress = 0;
        if (phases.length > 0) {
          const currentPhase = phases.find(phase => 
            (!phase.start_date || new Date(phase.start_date) <= now) && 
            (!phase.end_date || new Date(phase.end_date) >= now)
          ) || phases[0];
          
          if (currentPhase.start_date && currentPhase.end_date) {
            const phaseStart = new Date(currentPhase.start_date);
            const phaseEnd = new Date(currentPhase.end_date);
            const phaseDuration = phaseEnd - phaseStart;
            const elapsedPhaseTime = now - phaseStart;
            
            if (phaseDuration > 0) {
              phaseTimeProgress = Math.min(100, Math.max(0, (elapsedPhaseTime / phaseDuration) * 100));
            }
          }
        }

        // Calculate health status with multiple factors
        let healthScore = 0;
        const maxScore = 10;
        
        // 1. Progress vs Time (40% weight)
        const progressVsTime = overallProgress / Math.max(timeProgress, 1);
        healthScore += Math.min(4, progressVsTime * 4);
        
        // 2. Deliverable on-time rate (30% weight)
        const onTimeRate = totalDeliverables > 0 
          ? (onTimeDeliverables / totalDeliverables) * 3 
          : 3; // Default to full score if no deliverables
        healthScore += onTimeDeliverables === 0 ? 3 : onTimeRate;
        
        // 3. Phase progress vs phase time (30% weight)
        const avgPhaseProgress = phaseProgress.length > 0
          ? phaseProgress.reduce((sum, phase) => sum + phase.progress, 0) / phaseProgress.length
          : 0;
        const phaseTimeRatio = phaseTimeProgress > 0 
          ? Math.min(1, avgPhaseProgress / phaseTimeProgress) 
          : 1;
        healthScore += phaseTimeRatio * 3;
        
        // Determine health status based on score (0-10)
        let health;
        if (healthScore >= 8) {
          health = 'good';
        } else if (healthScore >= 5) {
          health = 'warning';
        } else {
          health = 'danger';
        }

        // Calculate phase-based metrics
        const currentPhase = phases.find(phase => 
          (!phase.start_date || new Date(phase.start_date) <= now) && 
          (!phase.end_date || new Date(phase.end_date) >= now)
        ) || (phases.length > 0 ? phases[0] : null);

        return {
          ...project,
          // Progress metrics
          progress: overallProgress,
          timeProgress: Math.round(timeProgress),
          phaseTimeProgress: Math.round(phaseTimeProgress),
          health,
          healthScore: Math.round((healthScore / maxScore) * 100), // Convert to percentage
          
          // Deliverable metrics
          completedDeliverables,
          totalDeliverables,
          onTimeDeliverables,
          delayedDeliverables,
          deliverableOnTimeRate: totalDeliverables > 0 
            ? Math.round((onTimeDeliverables / totalDeliverables) * 100) 
            : 100,
            
          // Phase information
          currentPhase: currentPhase ? {
            id: currentPhase.id,
            name: currentPhase.name,
            progress: phaseProgress.find(p => p.phaseId === currentPhase.id)?.progress || 0,
            startDate: currentPhase.start_date,
            endDate: currentPhase.end_date
          } : null,
          
          // Timestamps
          lastUpdated: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
          
          // Additional metrics
          isOnTrack: health === 'good',
          needsAttention: health === 'danger',
          
          // Raw metrics for debugging
          _metrics: {
            progressVsTime,
            phaseTimeRatio,
            avgPhaseProgress: Math.round(avgPhaseProgress),
            phaseCount: phases.length,
            deliverableCount: deliverables.length
          }
        };
      } catch (error) {
        console.error(`Error calculating progress for project ${project.id}:`, error);
        return {
          ...project,
          progress: 0,
          timeProgress: 0,
          health: 'unknown',
          completedDeliverables: 0,
          totalDeliverables: 0,
          lastUpdated: new Date().toISOString()
        };
      }
    }));

    res.status(200).json({
      status: "success",
      message: "Successfully retrieved projects with progress",
      result: projectsWithProgress
    });
  } catch (e) {
    console.error("Error in getProjectsBasedOnUserId:", e);
    res.status(500).json({
      status: "failure",
      message: "Failed to get projects based on user id",
      result: e.message
    });
  }
};

const getProjectDeliverables = async(req,res)=>{
    const {projectid} = req.params;
    try{
        const result = await sql `
            SELECT 
                *
            FROM
                deliverable d
            WHERE
                d.item_id IN ( SELECT id FROM item WHERE project_id = ${projectid})
        `
        res.status(200).json({
            status:"success",
            message:"Successfully retrieved project deliverables",
            result
        })
    }
    catch(e)
    {
        res.status(500).json({
            status:"failure",
            message:"failed to get project deliverables",
            result:e
        })
    }
}

const getPreviousMeetingNotes = async (req, res) => {
  const { projectId } = req.params;
  const { max = 5 } = req.query;

  try {
    const result = await sql`
      SELECT 
        m.id AS meeting_id,
        m.name,
        m.started_at,
        COALESCE(
          json_agg(
            json_build_object(
              'name', n.notes
            )
          ) FILTER (WHERE n.id IS NOT NULL AND n.project_id = ${projectId}),
          '[]'
        ) AS meeting_notes
      FROM (
        SELECT *
        FROM meeting
        ORDER BY started_at DESC
        LIMIT ${max}
      ) m
      LEFT JOIN meeting_notes n ON n.meeting_id = m.id
      GROUP BY m.id, m.name, m.started_at
      ORDER BY m.started_at DESC;
    `;
    console.log(result)
    res.status(200).json({
      status: "success",
      message: "Latest 5 meetings with notes (if any) for the project",
      result,
    });
  } catch (e) {
    console.error("Error fetching meeting notes:", e);
    res.status(500).json({
      status: "failure",
      message: "Failed to get previous meeting notes",
      result: e,
    });
  }
};

const getProjectTasksGroupedByWeek = async (req, res) => {
 const {projectid} = req.params;
  try {
    const today = new Date().toISOString().split("T")[0]; // format: YYYY-MM-DD

    const result = await sql`
      SELECT * FROM (
        SELECT
          w.id ,
          w.name,
          w.start_date,
          w.end_date,
          COALESCE(
            json_agg(
              json_build_object(
                'id', t.id,
                'name', t.notes,
                'created_date', t.created_date,
                'project_id', t.project_id
              )
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'
          ) AS project_tasks
        FROM project_task_weeks w
        LEFT JOIN project_tasks t ON w.id = t.project_task_weeks_id AND t.project_id =${projectid}
        WHERE w.start_date <= ${today}
        GROUP BY w.id, w.name, w.start_date, w.end_date
        ORDER BY w.start_date DESC
      ) AS grouped_tasks
      ORDER BY start_date DESC;
    `;

    res.status(200).json({
      status: "success",
      message: "Retrieved project tasks grouped by current and previous weeks",
      result
    });

  } catch (e) {
    res.status(500).json({
      status: "failure",
      message: "Failed to fetch project tasks grouped by weeks",
      result: e.message
    });
  }
};

const createNextWeekProjectTask = async(req,res)=>{
    const {notes , projectId , userId} = req.body;
    console.log(notes);
    console.log(projectId);
    console.log(userId);
    const nextWeekStartDate = getWeekStartDate();
    console.log("next week start date is "+nextWeekStartDate);

    try{
        let nextWeekRecord = await sql `
            SELECT
                *
            FROM
                project_task_weeks
            WHERE
                start_date = ${nextWeekStartDate}
            ORDER BY start_date DESC
            LIMIT 1
        `;
        // create new project_task_week for next week
        if(nextWeekRecord.length === 0)
        {
            console.log("inside if condition");
            const weekStart = new Date(nextWeekStartDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            const weekName = generateWeekName(weekStart); // e.g. "June 2025 W4 (20–26)"
            const weekNumber = getWeekOfMonth(weekStart); // e.g. 4
            const month = weekStart.getMonth() + 1;
            const year = weekStart.getFullYear();
            console.log("week start :"+weekStart+" week end :"+weekEnd);
            console.log("weekName :"+weekName+"\nweekNumber:"+weekNumber+" month :"+month+" year:"+year);

            try{
                nextWeekRecord = await sql `
                    INSERT INTO project_task_weeks(name, created_date, start_date, end_date, week, month, year)
                    VALUES(${weekName},${new Date().toISOString().split("T")[0]},${weekStart.toISOString().split("T")[0]},${weekEnd.toISOString().split("T")[0]},${weekNumber},${month},${year})
                    RETURNING *
                `;
            }
            catch(e)
            {
                res.status(500).json({
                    status:"failure",
                    message:"Error creating new project_task_weeks record",
                    result:e
                })
            }
        }
        console.log(nextWeekRecord);
        try{
            const result = await sql `
                INSERT INTO project_tasks(notes,created_date,project_id,user_id,project_task_weeks_id)
                VALUES(${notes}, ${new Date().toISOString().split("T")[0]}, ${projectId}, ${userId}, ${nextWeekRecord[0].id})
                RETURNING id , notes as name
            `

            res.status(201).json({
                status:"success",
                message:"Successfully inserted project tasks",
                result
            })
        }
        catch(e)
        {
            console.log(e);
            res.status(500).json({
                status:"failure",
                message:'Failed to create project task',
                result :e
            })
        }
    }
    catch(e)
    {
        res.status(500).json({
            status:"failure",
            message:"Error in creating task",
            result : e
        })
    }

}

const getNextWeekProjectTasks = async(req,res)=>{
    const {projectId} = req.params;
    const today = new Date().toISOString().split('T')[0];
    console.log(today);
    try{
        const result = await sql   `
            SELECT 
                id,
                notes AS name
            FROM
                project_tasks pt
            WHERE 
                pt.project_id = ${projectId} AND
                pt.project_task_weeks_id IN
                (
                    SELECT 
                        id
                    FROM
                        project_task_weeks
                    WHERE 
                        start_date > ${today} 
                )
        `
        res.status(200).json({
            status:"success",
            message:"successfully retrieved next week project tasks",
            result
        })
    }
    catch(e)
    {
        res.status(500).json({
            status:"failure",
            message:"Failed to retrieve next week project tasks",
            result : e
        })
    }
}

const deleteNextWeekProjectTask = async(req,res)=>{
    const {id} = req.params;
    try{
        const result = await sql `
            DELETE FROM 
                project_tasks
            WHERE
                id=${id}
        `
        res.status(200).json({
            status:'success',
            message:"successFully deleted project task",
            result:null
        })
    }
    catch(e)
    {
        res.status(500).json({
            status:"failure",
            message:"failed to delete the project task",
            result:e
        })
    }
}

const getProjectPhaseNames = async(req,res)=>{
    try{
        const result = await sql `
            SELECT 
                id, name
            FROM
                project_phase
        `
        res.status(200).json({
            status:'success',
            message:"Successfully retrieved project phase",
            result 
        })
    }
    catch(e)
    {
        res.status(500).json({
            status:"failure",
            message:"Failed to retrieve project phases",
            result:e,
        })
    }
}

const  getProjectDocumentsGrouped = async(req,res) => {
  const {projectId} = req.params;
  const result = await sql`
    SELECT 
      dt.phase[1] AS project_phase,
      json_agg(pd.*) AS documents
    FROM 
      project_documents pd
    JOIN 
      document_template dt ON dt.id = pd.template_id
    WHERE 
      pd.project_id = ${projectId}
    GROUP BY 
      dt.phase[1]
    ORDER BY 
      dt.phase[1];
  `;

  // Step 1: grouped result
  const grouped = result;

  // Step 2: flatten all docs and include their phase
  const all = grouped.flatMap(group =>
    group.documents.map(doc => ({
      ...doc,
      phase: group.project_phase
    }))
  );

  res.status(200).json({
    status:"success",
    message:"Successfully retrieved the project documents",
    result :{all  ,grouped}
  })
}
const getProjectDocuments = async (req, res) => {
  const { projectId } = req.params;
  const {
    page = 1,
    limit = 10,
    searchTerm = "",
    sortType = "updated_at",
    sortOrder = "DESC"
  } = req.query;

  const offset = (page - 1) * limit;
  const trimmedSearch = searchTerm.trim();

  // Safe allowed values
  const allowedSortColumns = ["updated_at", "created_at", "name", "template_name", "project_phase"];
  const allowedSortOrder = ["ASC", "DESC"];
  const sortBy = allowedSortColumns.includes(sortType) ? sortType : "updated_at";
  const sortDir = allowedSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : "DESC";
  console.log("sort Direction "+sortDir)
  // Search condition
  const searchCondition = trimmedSearch
    ? sql`AND (
        dt.name ILIKE ${trimmedSearch + '%'} OR
        dt.phase[1]::text ILIKE ${ trimmedSearch + '%'} OR
        pd.document_name ILIKE ${ trimmedSearch + '%'} OR
        pd.updated_at::text ILIKE ${ trimmedSearch + '%'}
      )`
    : sql``;

  try {
    const documents = await sql`
      SELECT 
        pd.*,
        dt.name AS template_name,
        dt.phase[1] AS project_phase,
        dt.document_url AS document_url
      FROM 
        project_documents pd
      JOIN 
        document_template dt ON dt.id = pd.template_id
      WHERE 
        pd.project_id = ${projectId}
        ${searchCondition}
      ORDER BY 
        ${sql([sortBy])} ${sql.unsafe(sortDir)}
      LIMIT ${limit}
      OFFSET ${offset};
    `;

    const totalResult = await sql`
      SELECT COUNT(*) 
      FROM project_documents pd
      JOIN document_template dt ON dt.id = pd.template_id
      WHERE 
        pd.project_id = ${projectId}
        ${searchCondition};
    `;
    const total = Number(totalResult[0].count);

    res.status(200).json({
      status: "success",
      message: "Successfully retrieved project documents",
      result: documents,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (err) {
    console.error("Error fetching project documents:", err);
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      result: { ...err }
    });
  }
};



// const getProjectDocumentsOverview = async (req, res) => {
//   const { projectId } = req.params;

//   const result = await sql`
//     WITH project_phases AS (
//       SELECT unnest(ARRAY['Planning phase', 'Bidding phase', 'Pre-execution phase', 'Execution phase','Maintenance and operation phase','Closed phase']) AS phase
//     )
//     SELECT 
//       pp.phase AS project_phase,
//       COUNT(pd.id) AS document_count
//     FROM 
//       project_phases pp
//     LEFT JOIN 
//       document_template dt 
//         ON dt.phase[1] = pp.phase
//     LEFT JOIN 
//       project_documents pd 
//         ON pd.template_id = dt.id 
//         AND pd.project_id = ${projectId}
//     GROUP BY 
//       pp.phase
//     ORDER BY 
//       pp.phase;
//   `;

//   res.status(200).json({
//     status: "success",
//     message: "Successfully retrieved document overview by phase",
//     result
//   });
// };

// HELPER FUNCTIONS

const getProjectDocumentsOverview = async (req, res) => {
  const { projectId } = req.params;

  const result = await sql`
    WITH project_phases AS (
    SELECT unnest(ARRAY['Planning phase', 'Bidding phase', 'Pre-execution phase', 'Execution phase','Maintenance and operation phase','Closed phase']) AS phase
    ),
    templates_with_phase AS (
    SELECT dt.id, dt.name, dt.phase[1] AS phase
    FROM document_template dt
    ),
    documents_per_template AS (
    SELECT * FROM project_documents WHERE project_id = ${projectId}
    )
    SELECT 
    pp.phase AS project_phase,
    COUNT(t.id) AS total_templates,
    COUNT(d.id) AS submitted_documents,
    COUNT(t.id) - COUNT(d.id) AS missing_documents,
    json_agg(
        CASE 
        WHEN d.id IS NULL THEN json_build_object('template_id', t.id, 'template_name', t.name)
        ELSE NULL
        END
    ) FILTER (WHERE d.id IS NULL) AS missing_templates
    FROM 
    project_phases pp
    LEFT JOIN 
    templates_with_phase t ON t.phase = pp.phase
    LEFT JOIN 
    documents_per_template d ON d.template_id = t.id
    GROUP BY 
    pp.phase
  `;

  res.status(200).json({
    status: "success",
    message: "Successfully retrieved document overview by phase",
    result
  });
};

const getWeekStartDate = ()=>{
    const weekStartIndex = 1;
    const today = new Date();
    const currentDayIndex = today.getDay(); // 0-sunday 1-monday

    let daysToNextWeekStart = (7-currentDayIndex+weekStartIndex)% 7;
    if(daysToNextWeekStart === 0) daysToNextWeekStart = 7;


    const nextWeekStart = new Date(today);
    nextWeekStart.setDate(today.getDate() + daysToNextWeekStart);

    return nextWeekStart.toISOString().split("T")[0];
}
function generateWeekName(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const monthName = startDate.toLocaleString('default', { month: 'long' });
  const year = startDate.getFullYear();
  const weekNumber = getWeekOfMonth(startDate);

  const start = startDate.getDate();
  const end = endDate.getDate();

  return `${monthName} ${year} W${weekNumber} (${start}-${end})`;
}

function getWeekOfMonth(date) {
  const day = date.getDate();
  const startDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return Math.ceil((day + startDay) / 7);
}




module.exports = {getProjectDetails,getProjectDeliverables , getPreviousMeetingNotes , createNextWeekProjectTask, getProjectTasksGroupedByWeek, getNextWeekProjectTasks, deleteNextWeekProjectTask , getProjectPhaseNames, getProjectDocumentsGrouped , getProjectDocumentsOverview , getProjectsBasedOnUserId , getProjectDocuments};





