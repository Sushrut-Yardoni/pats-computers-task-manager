import React, { useState } from "react";
import { 
  Layers, Fuel, Building, Sparkles, UserCheck, Clock, CheckCircle2, ShieldCheck, AlertCircle, Users, Package
} from "lucide-react";
import { Task, Employee, Company, CompanyAsset } from "../types";
import TaskManagementSection from "./TaskManagementSection";
import EmployeeManagementSection from "./EmployeeManagementSection";
import TravelPetrolSection from "./TravelPetrolSection";
import CompanySection from "./CompanySection";
import SoftwareHubSection from "./SoftwareHubSection";

interface ServiceHeadDashboardProps {
  currentUser: { id: number; name: string; role: string; email_id?: string };
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
  refreshLogs: () => Promise<void> | void;
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

export default function ServiceHeadDashboard({
  currentUser,
  tasks,
  employees,
  companies,
  assets,
  onAssignTask,
  refreshLogs,
  onUpdateRemarks,
  onUpdateTaskDetails,
  onTogglePriority,
  onUpdatePassword
}: ServiceHeadDashboardProps) {
  const [activeTab, setActiveTab] = useState<"tasks" | "employees" | "travel" | "companies" | "software">("tasks");

  const pendingTasksCount = tasks.filter(t => t.status === "Pending").length;
  const inProgressTasksCount = tasks.filter(t => t.status === "In Progress").length;
  const finishedTasksCount = tasks.filter(t => t.status === "Finished").length;
  const activeEngineersCount = employees.filter(emp => {
    const endedDate = emp.ended_at ? new Date(emp.ended_at) : null;
    return !endedDate || isNaN(endedDate.getTime()) || endedDate > new Date();
  }).length;

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start min-h-[75vh]">
      {/* 🧭 Static Side Navigation Panel */}
      <aside 
        className="bg-white border border-slate-200 rounded-3xl flex flex-col transition-all duration-300 relative shrink-0 w-full md:w-64 shadow-xs"
      >
        {/* Sidebar Header */}
        <div className="p-4.5 border-b border-slate-100 flex items-center gap-3 animate-fade-in">
          <div className="bg-gradient-to-tr from-teal-50 to-emerald-50 p-2.5 rounded-xl text-teal-700 shrink-0 border border-teal-100/60">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-extrabold uppercase tracking-wide text-slate-800 truncate">
              Service Head Desk
            </span>
            <span className="block text-[10px] text-teal-600 font-semibold truncate">
              {currentUser.name}
            </span>
          </div>
        </div>

        {/* Navigation Items (Task Assign, Engineers Hub, Travel/Petrol, Company Assets, Billing) */}
        <nav className="p-3 flex flex-row md:flex-col gap-1 w-full overflow-x-auto md:overflow-x-visible">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "tasks"
                ? "bg-teal-50 text-teal-800 border border-teal-200 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <div className="relative flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4 text-teal-600" />
            </div>
            <span className="font-sans flex items-center justify-between w-full font-bold">
              <span>Tasks & Tickets</span>
              {pendingTasksCount > 0 && (
                <span className="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded text-[9px] font-bold">
                  {pendingTasksCount}
                </span>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("employees")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "employees"
                ? "bg-indigo-50 text-indigo-800 border border-indigo-200 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <Users className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="font-sans flex items-center justify-between w-full font-bold">
              <span>Engineers Hub</span>
              <span className="bg-indigo-100/60 text-indigo-800 px-1.5 py-0.5 rounded text-[9px] font-bold">
                {activeEngineersCount}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("travel")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "travel"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border border-transparent font-medium hover:bg-slate-50"
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
                ? "bg-blue-50 text-blue-800 border border-blue-200 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <Building className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="font-sans flex items-center justify-between w-full font-bold">
              <span>Company Assets</span>
              <span className="bg-blue-100/60 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-bold">
                {companies.length}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("software")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "software"
                ? "bg-teal-50 text-teal-800 border border-teal-200 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <Package className="h-4 w-4 text-teal-600 shrink-0" />
            <span className="font-sans font-bold">Software Hub</span>
          </button>
        </nav>
      </aside>

      {/* 🖥️ Main Telemetry Content Area */}
      <div className="flex-1 w-full space-y-6">
        {/* Core Control banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">

            <h2 className="text-xl font-display font-extrabold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <Sparkles className="h-5 w-5 text-teal-600 animate-pulse" />
              <span>
                {activeTab === "tasks" && "Tasks & Ticket Dispatch"}
                {activeTab === "employees" && "Engineers Hub & Technical Staff"}
                {activeTab === "travel" && "Travel & Fuel Reimbursement Desk"}
                {activeTab === "companies" && "Company Workstations & Asset Inventory"}
                {activeTab === "software" && "Software Hub & Provisioning"}
              </span>
            </h2>


          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-4 text-xs font-sans text-slate-600 flex-wrap sm:flex-nowrap">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Pending</span>
              <span className="font-extrabold text-slate-900 text-sm">{pendingTasksCount}</span>
            </div>
            <div className="h-7 w-px bg-slate-200 hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">In Progress</span>
              <span className="font-extrabold text-slate-900 text-sm">{inProgressTasksCount}</span>
            </div>
            <div className="h-7 w-px bg-slate-200 hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Engineers</span>
              <span className="font-extrabold text-slate-900 text-sm">{activeEngineersCount}</span>
            </div>
            <div className="h-7 w-px bg-slate-200 hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Companies</span>
              <span className="font-extrabold text-slate-900 text-sm">{companies.length}</span>
            </div>
            <div className="h-7 w-px bg-slate-200 hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Resolved</span>
              <span className="font-extrabold text-slate-900 text-sm">{finishedTasksCount}</span>
            </div>
          </div>
        </div>

        {/* Active Section Content */}
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

          {activeTab === "employees" && (
            <EmployeeManagementSection 
              employees={employees}
              tasks={tasks}
              refreshLogs={refreshLogs}
              onUpdatePassword={onUpdatePassword}
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
              currentUser={{ 
                name: currentUser.name, 
                role: currentUser.role, 
                type: "employee", 
                id: currentUser.id 
              }}
              onRefresh={async () => {
                await refreshLogs();
              }}
            />
          )}

          {activeTab === "software" && (
            <SoftwareHubSection
              currentUser={{ name: currentUser.name, role: currentUser.role }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
