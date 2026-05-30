import React, { useState, useEffect } from "react";
import { 
  PlusCircle, Database, Cpu, Terminal, Layers, Users, BarChart4, Sparkles, Fuel 
} from "lucide-react";
import { Task, Employee, SqlLog } from "../types";
import TaskManagementSection from "./TaskManagementSection";
import EmployeeManagementSection from "./EmployeeManagementSection";
import ReportsSection from "./ReportsSection";
import TravelPetrolSection from "./TravelPetrolSection";
import DatabaseExplorerSection from "./DatabaseExplorerSection";

interface AdminDashboardProps {
  tasks: Task[];
  employees: Employee[];
  onAssignTask: (taskData: {
    customer_name: string;
    contact_details: string;
    problem_reported: string;
    assigned_to: number;
    address?: string;
  }) => Promise<void>;
  onResetDb: () => Promise<void>;
  onClearDb: () => Promise<void>;
  sqlLogs: SqlLog[];
  refreshLogs: () => void;
  sqlConsoleActive?: boolean;
  setSqlConsoleActive?: (active: boolean) => void;
  onUpdateRemarks: (taskId: number, remarks: string) => Promise<void>;
  onUpdateTaskDetails?: (taskId: number, taskData: { customer_name: string; contact_details: string; problem_reported: string; address?: string }) => Promise<void>;
  onTogglePriority?: (taskId: number) => Promise<void>;
  onUpdatePassword?: (employeeId: number, newPassword: string) => Promise<void>;
}

export default function AdminDashboard({ 
  tasks, 
  employees, 
  onAssignTask, 
  onResetDb,
  onClearDb,
  sqlLogs,
  refreshLogs,
  sqlConsoleActive = false,
  setSqlConsoleActive,
  onUpdateRemarks,
  onUpdateTaskDetails,
  onTogglePriority,
  onUpdatePassword
}: AdminDashboardProps) {
  // Master navigation state: "tasks" | "employees" | "reports" | "travel" | "database"
  const [activeTab, setActiveTab] = useState<"tasks" | "employees" | "reports" | "travel" | "database">("tasks");

  // Synchronize active tab with the main header SQL trigger
  useEffect(() => {
    if (sqlConsoleActive) {
      setActiveTab("reports");
    }
  }, [sqlConsoleActive]);

  useEffect(() => {
    if (activeTab !== "reports" && setSqlConsoleActive) {
      setSqlConsoleActive(false);
    }
  }, [activeTab, setSqlConsoleActive]);

  return (
    <div className="space-y-6 animate-fade-in py-2">
      
      {/* 🧭 Master Dashboard Multi-Screen Section Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-display font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
            <span>Admin Control Room</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Manage support tasks, engineers, and view visual telemetry reports.</p>
        </div>

        {/* Dynamic section tabs selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200 border border-slate-300 rounded-2xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
              activeTab === "tasks"
                ? "bg-white border border-slate-300 text-blue-800 font-extrabold shadow-md"
                : "text-slate-600 hover:text-slate-900 border border-transparent font-bold"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Tasks & Tickets</span>
          </button>

          <button
            onClick={() => setActiveTab("employees")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
              activeTab === "employees"
                ? "bg-white border border-slate-300 text-indigo-800 font-extrabold shadow-md"
                : "text-slate-600 hover:text-slate-900 border border-transparent font-bold"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Service Engineers Hub</span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
              activeTab === "reports"
                ? "bg-white border border-slate-300 text-teal-800 font-extrabold shadow-md"
                : "text-slate-600 hover:text-slate-900 border border-transparent font-bold"
            }`}
          >
            <BarChart4 className="h-4 w-4" />
            <span>System Viewer GUI</span>
          </button>
          
          <button
            onClick={() => setActiveTab("travel")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
              activeTab === "travel"
                ? "bg-white border border-emerald-300 text-emerald-800 font-extrabold shadow-md"
                : "text-slate-600 hover:text-emerald-800 border border-transparent font-bold ml-1"
            }`}
          >
            <Fuel className="h-4 w-4" />
            <span>Travel & Petrol Logs</span>
          </button>

          <button
            onClick={() => setActiveTab("database")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
              activeTab === "database"
                ? "bg-white border border-blue-300 text-blue-800 font-extrabold shadow-md"
                : "text-slate-600 hover:text-slate-900 border border-transparent font-bold ml-1"
            }`}
          >
            <Database className="h-4 w-4 text-blue-600" />
            <span>Database & Data</span>
          </button>
        </div>
      </div>

      {/* Pages Render Selection */}
      <div className="mt-4">
        {activeTab === "tasks" && (
          <TaskManagementSection 
            tasks={tasks}
            employees={employees}
            onAssignTask={onAssignTask}
            refreshLogs={refreshLogs}
            onUpdateRemarks={onUpdateRemarks}
            onUpdateTaskDetails={onUpdateTaskDetails}
            onTogglePriority={onTogglePriority}
          />
        )}

        {activeTab === "employees" && (
          <EmployeeManagementSection 
            employees={employees}
            tasks={tasks}
            refreshLogs={refreshLogs}
            onUpdatePassword={onUpdatePassword}
          />
        )}

        {activeTab === "reports" && (
          <ReportsSection 
            tasks={tasks}
            employees={employees}
            refreshLogs={refreshLogs}
            onResetDb={onResetDb}
            onClearDb={onClearDb}
          />
        )}
        {activeTab === "travel" && (
          <TravelPetrolSection />
        )}
        {activeTab === "database" && (
          <DatabaseExplorerSection 
            tasks={tasks}
            employees={employees}
          />
        )}
      </div>
    </div>
  );
}
