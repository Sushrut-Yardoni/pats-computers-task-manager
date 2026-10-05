import React, { useState, useEffect } from "react";
import { 
<<<<<<< HEAD
  PlusCircle, Database, Cpu, Terminal, Layers, Users, BarChart4, Sparkles, Fuel, ChevronLeft, ChevronRight, LayoutDashboard, Building, Clock, Receipt
=======
  PlusCircle, Database, Cpu, Terminal, Layers, Users, BarChart4, Sparkles, Fuel, ChevronLeft, ChevronRight, LayoutDashboard, Building
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
} from "lucide-react";
import { Task, Employee, SqlLog, Company, CompanyAsset } from "../types";
import TaskManagementSection from "./TaskManagementSection";
import TodoManagementSection from "./TodoManagementSection";
import EmployeeManagementSection from "./EmployeeManagementSection";
<<<<<<< HEAD
import AttendanceSection from "./AttendanceSection";
=======
import ReportsSection from "./ReportsSection";
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
import TravelPetrolSection from "./TravelPetrolSection";
import DatabaseExplorerSection from "./DatabaseExplorerSection";
import AnalyticsSection from "./AnalyticsSection";
import CompanySection from "./CompanySection";
<<<<<<< HEAD
import BillingSection from "./BillingSection";
=======
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625

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
<<<<<<< HEAD
    contract_type?: string;
    company_id?: number | null;
    company_name?: string | null;
    asset_id?: string | null;
=======
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
  }) => Promise<void>;
  onResetDb: () => Promise<void>;
  onClearDb: () => Promise<void>;
  sqlLogs: SqlLog[];
  refreshLogs: () => void;
  sqlConsoleActive?: boolean;
  setSqlConsoleActive?: (active: boolean) => void;
  onUpdateRemarks: (taskId: number, remarks: string) => Promise<void>;
<<<<<<< HEAD
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
=======
  onUpdateTaskDetails?: (taskId: number, taskData: { customer_name: string; contact_details: string; problem_reported: string; address?: string }) => Promise<void>;
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
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
<<<<<<< HEAD
  // Master navigation state: "tasks" | "todos" | "employees" | "attendance" | "travel" | "companies" | "database" | "analytics" | "billing"
  const [activeTab, setActiveTab] = useState<"tasks" | "todos" | "employees" | "attendance" | "travel" | "companies" | "database" | "analytics" | "billing">("tasks");
=======
  // Master navigation state: "tasks" | "todos" | "employees" | "reports" | "travel" | "database" | "analytics" | "companies"
  const [activeTab, setActiveTab] = useState<"tasks" | "todos" | "employees" | "reports" | "travel" | "database" | "analytics" | "companies">("tasks");
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625

  // Synchronize active tab with the main header SQL trigger
  useEffect(() => {
    if (sqlConsoleActive) {
<<<<<<< HEAD
      setActiveTab("database");
=======
      setActiveTab("reports");
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
    }
  }, [sqlConsoleActive]);

  useEffect(() => {
<<<<<<< HEAD
    if (activeTab !== "database" && setSqlConsoleActive) {
=======
    if (activeTab !== "reports" && setSqlConsoleActive) {
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
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
<<<<<<< HEAD
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "attendance"
=======
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "reports"
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
                ? "bg-teal-50 text-teal-805 border border-teal-120 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-805 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
<<<<<<< HEAD
            <Clock className="h-4 w-4 text-teal-650 shrink-0" />
            <span className="font-sans font-bold">Attendance Hub</span>
=======
            <BarChart4 className="h-4 w-4 text-teal-650 shrink-0" />
            <span className="font-sans font-bold">Telemetry Reports</span>
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
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
<<<<<<< HEAD
            <BarChart4 className="h-4 w-4 text-amber-650 shrink-0" />
            <span className="font-sans font-bold">Performance Metrics</span>
=======
            <LayoutDashboard className="h-4 w-4 text-amber-650 shrink-0" />
            <span className="font-sans font-bold">Analytics</span>
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
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
<<<<<<< HEAD
            <Fuel className="h-4 w-4 text-emerald-600 shrink-0" />
=======
            <Fuel className="h-4 w-4 text-emerald-650 shrink-0" />
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
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
<<<<<<< HEAD

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
=======
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
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
<<<<<<< HEAD
                {activeTab === "attendance" && "Attendance Registry"}
                {activeTab === "analytics" && "Performance Metrics"}
                {activeTab === "travel" && "Travel & Fuel Cost"}
                {activeTab === "companies" && "Companies & Assets Hub"}
                {activeTab === "database" && "Database Tables"}
                {activeTab === "billing" && "Billing & Invoicing"}
=======
                {activeTab === "reports" && "Telemetry Reports"}
                {activeTab === "analytics" && "Analytics"}
                {activeTab === "travel" && "Travel & Fuel Cost"}
                {activeTab === "companies" && "Company & Asset Registry"}
                {activeTab === "database" && "Database Tables"}
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
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
<<<<<<< HEAD
            companies={companies}
            assets={assets}
=======
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
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

<<<<<<< HEAD
        {activeTab === "attendance" && (
          <AttendanceSection 
            currentUser={{ name: "Admin", role: "Admin", type: "admin" }}
            employees={employees}
=======
        {activeTab === "reports" && (
          <ReportsSection 
            tasks={tasks}
            employees={employees}
            refreshLogs={refreshLogs}
            onResetDb={onResetDb}
            onClearDb={onClearDb}
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
          />
        )}
        {activeTab === "travel" && (
          <TravelPetrolSection />
        )}
<<<<<<< HEAD
        {activeTab === "companies" && (
          <CompanySection
            companies={companies}
            assets={assets}
            employees={employees}
            currentUser={{ name: "Admin", role: "Admin", type: "admin" }}
            onRefresh={async () => {
              refreshLogs();
            }}
          />
        )}
=======
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
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
<<<<<<< HEAD
        {activeTab === "billing" && (
          <BillingSection
            tasks={tasks}
            refreshLogs={refreshLogs}
=======
        {activeTab === "companies" && (
          <CompanySection
            companies={companies}
            assets={assets}
            currentUser={{ name: "Admin Dashboard", type: "admin" }}
            onRefresh={async () => {
              refreshLogs();
            }}
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
          />
        )}
      </div>
      </div>
    </div>
  );
}
