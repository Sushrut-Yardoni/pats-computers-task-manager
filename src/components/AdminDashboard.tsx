import React, { useState, useEffect } from "react";
import { 
  PlusCircle, Database, Cpu, Terminal, Layers, Users, BarChart4, Sparkles, Fuel, ChevronLeft, ChevronRight
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    <div className="flex flex-col md:flex-row gap-6 items-start min-h-[75vh]">
      {/* 🧭 Collapsible Side Navigation Panel */}
      <aside 
        className={`bg-white border border-slate-200 rounded-3xl flex flex-col transition-all duration-300 relative shrink-0 w-full md:w-auto ${
          isSidebarCollapsed ? "md:w-16" : "md:w-64"
        }`}
      >
        {/* Toggle Collapse Button */}
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute right-[-10px] top-6 h-6 w-6 hidden md:flex items-center justify-center bg-white border border-slate-200 hover:border-slate-350 rounded-full text-slate-500 hover:text-slate-850 transition-all cursor-pointer shadow-xs z-10"
          title={isSidebarCollapsed ? "Expand Sidebar Navigation" : "Collapse Sidebar Navigation"}
        >
          {isSidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        {/* Sidebar Header */}
        <div className="p-4.5 border-b border-slate-100 flex items-center gap-3 animate-fade-in">
          <div className="bg-gradient-to-tr from-indigo-50 to-blue-50 p-2.5 rounded-xl text-blue-600 shrink-0 border border-blue-100/50">
            <Terminal className="h-5 w-5 animate-pulse" />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <span className="block text-xs font-extrabold uppercase tracking-wide text-slate-805 truncate">
                Admin Control Room
              </span>
              <span className="block text-[10px] text-slate-400 font-medium">Technical Station v3</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 flex flex-row md:flex-col gap-1 w-full overflow-x-auto md:overflow-x-visible">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer relative ${
              activeTab === "tasks"
                ? "bg-blue-50 text-blue-800 border border-blue-100 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-805 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <div className="relative flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4 text-blue-650" />
              {isSidebarCollapsed && tasks.filter(t => t.status === "Pending" || t.status === "In Progress").length > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-100 text-blue-805 text-[8.5px] font-extrabold px-1 rounded-full min-w-[14px] h-[14px] flex items-center justify-center">
                  {tasks.filter(t => t.status === "Pending" || t.status === "In Progress").length}
                </span>
              )}
            </div>
            {!isSidebarCollapsed && (
              <span className="font-sans flex items-center justify-between w-full font-bold">
                <span>Tasks & Tickets</span>
                <span className="bg-blue-100/60 text-blue-805 px-1.5 py-0.5 rounded text-[9px] font-bold">
                  {tasks.length}
                </span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("employees")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "employees"
                ? "bg-indigo-50 text-indigo-805 border border-indigo-120 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-805 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <Users className="h-4 w-4 text-indigo-650 shrink-0" />
            {!isSidebarCollapsed && (
              <span className="font-sans flex items-center justify-between w-full font-bold">
                <span>Engineers Hub</span>
                <span className="bg-indigo-100/60 text-indigo-805 px-1.5 py-0.5 rounded text-[9px] font-bold">
                  {employees.length}
                </span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "reports"
                ? "bg-teal-50 text-teal-805 border border-teal-120 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-805 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <BarChart4 className="h-4 w-4 text-teal-650 shrink-0" />
            {!isSidebarCollapsed && <span className="font-sans font-bold">Telemetry Reports</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("travel")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "travel"
                ? "bg-slate-100 text-slate-800 border border-slate-205 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-850 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <Fuel className="h-4 w-4 text-emerald-650 shrink-0" />
            {!isSidebarCollapsed && <span className="font-sans font-bold">Travel & Fuel Cost</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("database")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "database"
                ? "bg-purple-50 text-purple-805 border border-purple-120 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-850 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <Database className="h-4 w-4 text-purple-605 shrink-0" />
            {!isSidebarCollapsed && <span className="font-sans font-bold">Database Tables</span>}
          </button>
        </nav>
      </aside>

      {/* 🖥️ Main Telemetry Content Area */}
      <div className="flex-1 w-full space-y-6">
        {/* Core Control banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-extrabold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
              <span>PATS Control System</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Manage support tasks, engineers, and view visual telemetry reports.</p>
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
    </div>
  );
}
