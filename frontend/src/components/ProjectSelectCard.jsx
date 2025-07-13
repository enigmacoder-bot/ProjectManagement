import React from "react";
import { Clock, AlertTriangle, CheckCircle, Clock as ClockIcon, Info, TrendingUp, Calendar, GitPullRequest, Zap } from "lucide-react";
import Tooltip from "./Tooltip";

// Project card for dashboard page selection
export default function ProjectSelectCard({ project, onSelect }) {
  // Extract progress data from project (provided by backend)
  const {
    progress = 0,           // Overall progress based on deliverables
    timeProgress = 0,       // Time-based progress (0-100)
    health = 'unknown',     // Project health: 'good', 'warning', 'danger', 'unknown'
    completedDeliverables = 0,
    totalDeliverables = 0,
    lastUpdated
  } = project;

  // Enhanced debug logging to see what values we're getting
  React.useEffect(() => {
    console.log(`ProjectSelectCard Debug - ${project.name || 'Unnamed'}:`, {
      progress,
      timeProgress,
      health,
      completedDeliverables,
      totalDeliverables,
      // Check for alternate field names in case backend uses different naming
      alt_completedDeliverables: project.completed_deliverables,
      alt_totalDeliverables: project.total_deliverables,
      alt_completedTasks: project.completed_tasks,
      alt_totalTasks: project.total_tasks,
      rawProject: project
    });
  }, [project, progress, timeProgress, completedDeliverables, totalDeliverables]);

  // Determine colors based on project health
  const getStatusColors = () => {
    switch (health.toLowerCase()) {
      case 'danger':
        return {
          border: 'border-red-500',
          progressBar: 'bg-red-500',
          text: 'text-red-600',
          bg: 'bg-red-50',
          icon: <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
        };
      case 'warning':
        return {
          border: 'border-yellow-400',
          progressBar: 'bg-yellow-400',
          text: 'text-yellow-600',
          bg: 'bg-yellow-50',
          icon: <ClockIcon className="w-4 h-4 text-yellow-500 mr-1" />
        };
      case 'good':
        return {
          border: 'border-green-500',
          progressBar: 'bg-green-500',
          text: 'text-green-600',
          bg: 'bg-green-50',
          icon: <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
        };
      default:
        return {
          border: 'border-gray-300',
          progressBar: 'bg-gray-400',
          text: 'text-gray-600',
          bg: 'bg-gray-50',
          icon: <ClockIcon className="w-4 h-4 text-gray-400 mr-1" />
        };
    }
  };

  const statusColors = getStatusColors();
  // Fallback for phase data when backend provides snake_case fields
  const currentPhaseData = project.currentPhase
    ? project.currentPhase
    : project.current_phase_name
    ? { name: project.current_phase_name, progress: project.current_phase_progress }
    : null;

  // Format budget if it exists
  const formatBudget = (budget) => {
    if (!budget) return "N/A";
    return `${Number(budget).toLocaleString()} SAR`;
  };

  // Calculate last updated time
  const getLastUpdated = () => {
    if (lastUpdated) {
      const updatedDate = new Date(lastUpdated);
      const now = new Date();
      const diffTime = Math.abs(now - updatedDate);
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffMinutes < 60) {
        return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      } else {
        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
      }
    }
    return "Recently";
  };

  // Format progress text
  const formatProgress = (value) => {
    return Math.round(value) + "%";
  };

  return (
    <button
      className={`w-full h-full text-left bg-white rounded-lg border ${statusColors.border} p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between`}
      onClick={() => onSelect(project)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-sm line-clamp-2 flex-1">
          {project.name || project.title || "Unnamed Project"}
        </h3>
        <div className="flex items-center ml-2">
          {statusColors.icon}
        </div>
      </div>
      
      <div className="text-lg font-bold mb-3">{formatBudget(project.project_budget || project.budget)}</div>
      
      {/* Progress Bars */}
      <div className="mt-4 space-y-3">
        {/* Progress vs Time */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center text-gray-600">
            <TrendingUp className="w-3 h-3 mr-1" />
            <span>Progress</span>
          </div>
          <div className="flex items-center">
            <span className={`font-medium ${statusColors.text}`}>
              {formatProgress(progress)}
            </span>
            <span className="mx-1">/</span>
            <span className="text-gray-500">{formatProgress(timeProgress)}</span>
            {project.healthScore !== undefined && (
              <Tooltip content={`Health Score: ${project.healthScore}%`}>
                <div className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                  {project.healthScore}%
                </div>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Progress Bar with dual indicators */}
        <div className="relative w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          {/* Time Progress (background) */}
          <div 
            className="absolute top-0 left-0 h-full bg-blue-100"
            style={{ width: `${Math.min(100, Math.max(0, timeProgress))}%` }}
          ></div>
          
          {/* Actual Progress (foreground) */}
          <div 
            className={`absolute top-0 left-0 h-full ${statusColors.progressBar} transition-all duration-300`}
            style={{ 
              width: `${Math.min(100, Math.max(0, progress))}%`,
              opacity: 0.9,
              minWidth: progress > 0 ? '2px' : '0px' // Ensure small progress is visible
            }}
          ></div>
          
          {/* Debug indicator - remove in production */}
          {progress > 0 && (
            <div className="absolute top-0 right-0 text-xs text-gray-600 bg-white px-1 rounded" style={{fontSize: '9px'}}>
              {progress}%
            </div>
          )}
        </div>

        {/* Current Phase */}
        {currentPhaseData && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1 text-gray-500" />
                <span>Current Phase</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium">{currentPhaseData.name}</span>
                <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
                  {currentPhaseData.progress}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div 
                className="h-full rounded-full bg-blue-400"
                style={{ width: `${Math.min(100, Math.max(0, currentPhaseData.progress))}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Deliverables and Last Updated */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className={`px-2 py-1 rounded-full ${statusColors.bg} ${statusColors.text}`}>
          {completedDeliverables} completed of {totalDeliverables} deliverables
        </span>
        <span className="text-gray-500 flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {getLastUpdated()}
        </span>
      </div>
    </button>
  );
}
