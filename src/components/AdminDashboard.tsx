import React, { useState, useEffect } from "react";
import { 
  PlusCircle, Database, Cpu, Terminal, Layers, Users, BarChart4, Sparkles, Fuel, ChevronLeft, ChevronRight, LayoutDashboard, Building, Clock, Receipt, Navigation
} from "lucide-react";
import { Task, Employee, SqlLog, Company, CompanyAsset } from "../types";
import TaskManagementSection from "./TaskManagementSection";
import TodoManagementSection from "./TodoManagementSection";
import EmployeeManagementSection from "./EmployeeManagementSection";
import AttendanceSection from "./AttendanceSection";
import AdminTrackingSection from "./AdminTrackingSection";
import TravelPetrolSection from "./TravelPetrolSection";
import DatabaseExplorerSection from "./DatabaseExplorerSection";
import AnalyticsSection from "./AnalyticsSection";
import CompanySection from "./CompanySection";
import BillingSection from "./BillingSection";

interface AdminDashboardProps {
  tasks: Task[];
  employees: Employee[];
  companies: Company[];
  assets: CompanyAsset[];
  onAssignTask: (taskData: {
    customer_name: string;
    contact_details: string;
    problem_reported: string;
    assigned_to: number;
    address?: string;
    contract_type?: string;
    company_id?: number | null;
    company_name?: string | null;
    asset_id?: string | null;
  }) => Promise<void>;
  onResetDb: () => Promise<void>;
  onClearDb: () => Promise<void>;
  sqlLogs: SqlLog[];
  refreshLogs: () => Promise<void> | void;
  sqlConsoleActive?: boolean;
  setSqlConsoleActive?: (active: boolean) => void;
  onUpdateRemarks: (taskId: number, remarks: string) => Promise<void>;
  onUpdateTaskDetails?: (taskId: number, taskData: { 
    customer_name: string; 
    contact_details: string; 
    problem_reported: string; 
    address?: string;
    contract_type?: string;
    company_id?: number | null;
    company_name?: string | null;
    asset_id?: string | null;
  }) => Promise<void>;
  onTogglePriority?: (taskId: number) => Promise<void>;
  onUpdatePassword?: (employeeId: number, newPassword: string) => Promise<void>;
}

export default function AdminDashboard({ 
  tasks, 
  employees, 
  companies,
  assets,
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
  // Master navigation state: "tasks" | "todos" | "employees" | "attendance" | "tracking" | "travel" | "companies" | "database" | "analytics" | "billing"
  const [activeTab, setActiveTab] = useState<"tasks" | "todos" | "employees" | "attendance" | "tracking" | "travel" | "companies" | "database" | "analytics" | "billing">("tasks");

  // Synchronize active tab with the main header SQL trigger
  useEffect(() => {
    if (sqlConsoleActive) {
      setActiveTab("database");
    }
  }, [sqlConsoleActive]);

  useEffect(() => {
    if (activeTab !== "database" && setSqlConsoleActive) {
      setSqlConsoleActive(false);
    }
  }, [activeTab, setSqlConsoleActive]);

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start min-h-[75vh]">
      {/* 🧭 Static Side Navigation Panel */}
      <aside 
        className="bg-white border border-slate-200 rounded-3xl flex flex-col transition-all duration-300 relative shrink-0 w-full md:w-64"
      >
        {/* Sidebar Header */}
        <div className="p-4.5 border-b border-slate-100 flex items-center gap-3 animate-fade-in">
          <div className="bg-gradient-to-tr from-indigo-50 to-blue-50 p-2.5 rounded-xl text-blue-600 shrink-0 border border-blue-100/50">
            <Terminal className="h-5 w-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-extrabold uppercase tracking-wide text-slate-805 truncate">
              Admin Control Room
            </span>
          </div>
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
            </div>
            <span className="font-sans flex items-center justify-between w-full font-bold">
              <span>Tasks & Tickets</span>
              <span className="bg-blue-100/60 text-blue-805 px-1.5 py-0.5 rounded text-[9px] font-bold">
                {tasks.filter(t => t.status === "Pending").length}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("todos")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "todos"
                ? "bg-blue-50 text-blue-800 border border-blue-100 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-805 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 text-slate-550 shrink-0" />
            <span className="font-sans flex items-center justify-between w-full font-bold">
              <span>To-Do Checklist</span>
            </span>
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
            <span className="font-sans flex items-center justify-between w-full font-bold">
              <span>Engineers Hub</span>
              <span className="bg-indigo-100/60 text-indigo-805 px-1.5 py-0.5 rounded text-[9px] font-bold">
                {employees.filter(emp => {
                  const endedDate = emp.ended_at ? new Date(emp.ended_at) : null;
                  return !endedDate || isNaN(endedDate.getTime()) || endedDate > new Date();
                }).length}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "attendance"
                ? "bg-teal-50 text-teal-805 border border-teal-120 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-805 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <Clock className="h-4 w-4 text-teal-650 shrink-0" />
            <span className="font-sans font-bold">Attendance Hub</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tracking")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "tracking"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-805 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <div className="relative flex items-center justify-center shrink-0">
              <Navigation className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            </div>
            <span className="font-sans flex items-center justify-between w-full font-bold">
              <span>Live GPS Tracker</span>
              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-bold">
                Live
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "analytics"
                ? "bg-amber-50 text-amber-805 border border-amber-120 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-805 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <BarChart4 className="h-4 w-4 text-amber-650 shrink-0" />
            <span className="font-sans font-bold">Performance Metrics</span>
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
            <Fuel className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-sans font-bold">Travel & Fuel Cost</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("companies")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "companies"
                ? "bg-indigo-50 text-indigo-805 border border-indigo-120 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-850 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <Building className="h-4 w-4 text-indigo-650 shrink-0" />
            <span className="font-sans font-bold">Company Assets</span>
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
            <span className="font-sans font-bold">Database Tables</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("billing")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "billing"
                ? "bg-blue-50 text-blue-800 border border-blue-120 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-850 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <Receipt className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="font-sans flex items-center justify-between w-full font-bold">
              <span>Billing</span>
              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-bold">
                {tasks.filter(t => t.status === "Finished").length}
              </span>
            </span>
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
              <span>
                {activeTab === "tasks" && "Tasks & Tickets"}
                {activeTab === "todos" && "To-Do Checklist"}
                {activeTab === "employees" && "Engineers Hub"}
                {activeTab === "attendance" && "Attendance Registry"}
                {activeTab === "tracking" && "Live Engineer GPS Tracker"}
                {activeTab === "analytics" && "Performance Metrics"}
                {activeTab === "travel" && "Travel & Fuel Cost"}
                {activeTab === "companies" && "Companies & Assets Hub"}
                {activeTab === "database" && "Database Tables"}
                {activeTab === "billing" && "Billing & Invoicing"}
              </span>
            </h2>
          </div>
        </div>

        {/* Pages Render Selection */}
        <div className="mt-4">
        {activeTab === "tasks" && (
          <TaskManagementSection 
            tasks={tasks}
            employees={employees}
            companies={companies}
            assets={assets}
            onAssignTask={onAssignTask}
            refreshLogs={refreshLogs}
            onUpdateRemarks={onUpdateRemarks}
            onUpdateTaskDetails={onUpdateTaskDetails}
            onTogglePriority={onTogglePriority}
          />
        )}

        {activeTab === "todos" && (
          <TodoManagementSection 
            employees={employees}
            refreshLogs={refreshLogs}
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

        {activeTab === "attendance" && (
          <AttendanceSection 
            currentUser={{ name: "Admin", role: "Admin", type: "admin" }}
            employees={employees}
          />
        )}
        {activeTab === "tracking" && (
          <AdminTrackingSection 
            employees={employees}
            tasks={tasks}
          />
        )}
        {activeTab === "travel" && (
          <TravelPetrolSection />
        )}
        {activeTab === "companies" && (
          <CompanySection
            companies={companies}
            assets={assets}
            employees={employees}
            currentUser={{ name: "Admin", role: "Admin", type: "admin" }}
            onRefresh={async () => {
              await refreshLogs();
            }}
          />
        )}
        {activeTab === "database" && (
          <DatabaseExplorerSection 
            tasks={tasks}
            employees={employees}
          />
        )}
        {activeTab === "analytics" && (
          <AnalyticsSection
            tasks={tasks}
            employees={employees}
          />
        )}
        {activeTab === "billing" && (
          <BillingSection
            tasks={tasks}
            refreshLogs={refreshLogs}
          />
        )}
      </div>
      </div>
    </div>
  );
}
