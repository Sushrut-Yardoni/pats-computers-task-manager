import React, { useState } from "react";
import { 
  Users, Layers, Search, Cpu, Clock, CheckCircle2, AlertCircle, Phone, Mail, X, ArrowRight, Calendar, UserCheck, ShieldAlert, Package

} from "lucide-react";
import { Task, Employee } from "../types";

interface ReportsSectionProps {
  tasks: Task[];
  employees: Employee[];
  refreshLogs: () => void;
  onResetDb: () => Promise<void>;
  onClearDb: () => Promise<void>;
}

export default function ReportsSection({
  tasks,
  employees,
  refreshLogs,
  onResetDb,
  onClearDb
}: ReportsSectionProps) {
  // GUI Search and Filters States
  const [taskQuery, setTaskQuery] = useState("");
  const [empQuery, setEmpQuery] = useState("");
  const [guiStatusFilter, setGuiStatusFilter] = useState<"All" | "Pending" | "In Progress" | "Finished">("All");

  // Limits and Month filter for double-panel directories
  const [empItemsPerPage, setEmpItemsPerPage] = useState(10);
  const [empCurrentPage, setEmpCurrentPage] = useState(1);
  const [empSelectedMonth, setEmpSelectedMonth] = useState<string>("All");

  const [taskItemsPerPage, setTaskItemsPerPage] = useState(10);
  const [taskCurrentPage, setTaskCurrentPage] = useState(1);
  const [taskSelectedMonth, setTaskSelectedMonth] = useState<string>("All");

  const uniqueTaskMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    tasks.forEach(t => {
      if (t.assigned_at) {
        const match = t.assigned_at.match(/^(\d{4}-\d{2})/);
        if (match) {
          monthsSet.add(match[1]);
        }
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [tasks]);

  const uniqueEmpMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    employees.forEach(e => {
      if (e.joined_at) {
        const match = e.joined_at.match(/^(\d{4}-\d{2})/);
        if (match) {
          monthsSet.add(match[1]);
        }
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [employees]);

  const formatMonthKey = (monthKey: string) => {
    try {
      const [year, month] = monthKey.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleString("default", { month: "long", year: "numeric" });
    } catch {
      return monthKey;
    }
  };

  // Selected Task Modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Computed counters
  const totalTasksCount = tasks.length;
  const pendingCount = tasks.filter(t => t.status === "Pending").length;
  const inProgressCount = tasks.filter(t => t.status === "In Progress").length;
  const finishedCount = tasks.filter(t => t.status === "Finished").length;

  const finishedPercentage = totalTasksCount > 0 ? Math.round((finishedCount / totalTasksCount) * 100) : 0;
  
  // Filter Employees
  const filteredEmployeesList = React.useMemo(() => {
    return employees.filter(emp => {
      const matchesQuery = emp.name.toLowerCase().includes(empQuery.toLowerCase()) || 
                           emp.role.toLowerCase().includes(empQuery.toLowerCase());
      const matchesMonth = empSelectedMonth === "All" || (emp.joined_at && emp.joined_at.startsWith(empSelectedMonth));
      return matchesQuery && matchesMonth;
    });
  }, [employees, empQuery, empSelectedMonth]);

  const empTotalPages = Math.ceil(filteredEmployeesList.length / empItemsPerPage);

  const displayedEmployeesList = React.useMemo(() => {
    const startIndex = (empCurrentPage - 1) * empItemsPerPage;
    return filteredEmployeesList.slice(startIndex, startIndex + empItemsPerPage);
  }, [filteredEmployeesList, empCurrentPage, empItemsPerPage]);

  // Reset to first page when filter changes
  React.useEffect(() => {
    setEmpCurrentPage(1);
  }, [empSelectedMonth, empQuery]);

  // New analytics data based on filtered list
  const filteredTasksList = React.useMemo(() => {
    return tasks.filter(task => {
      const matchesQuery = task.customer_name.toLowerCase().includes(taskQuery.toLowerCase()) || 
                           task.problem_reported.toLowerCase().includes(taskQuery.toLowerCase()) ||
                           (task.employee_name && task.employee_name.toLowerCase().includes(taskQuery.toLowerCase()));
      const matchesStatus = guiStatusFilter === "All" || task.status === guiStatusFilter;
      const matchesMonth = taskSelectedMonth === "All" || (task.assigned_at && task.assigned_at.startsWith(taskSelectedMonth));
      return matchesQuery && matchesStatus && matchesMonth;
    });
  }, [tasks, taskQuery, guiStatusFilter, taskSelectedMonth]);

  const tasksPerEngineer = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasksList.forEach(t => {
      const name = t.employee_name || "Unassigned";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, value: count }));
  }, [filteredTasksList]);

  const tasksByMonth = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasksList.forEach(t => {
      if (t.assigned_at) {
        const month = t.assigned_at.substring(0, 7);
        counts[month] = (counts[month] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a,b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name: formatMonthKey(name), value: count }));
  }, [filteredTasksList]);

  const taskTotalPages = Math.ceil(filteredTasksList.length / taskItemsPerPage);

  const displayedTasksList = React.useMemo(() => {
    const startIndex = (taskCurrentPage - 1) * taskItemsPerPage;
    return filteredTasksList.slice(startIndex, startIndex + taskItemsPerPage);
  }, [filteredTasksList, taskCurrentPage, taskItemsPerPage]);

  // Reset to first page when filter changes
  React.useEffect(() => {
    setTaskCurrentPage(1);
  }, [taskSelectedMonth, taskQuery, guiStatusFilter]);

  const handleOpenTask = (task: Task) => {
    setSelectedTask(task);
    setTransferTargetId("");
    setTransferSuccess(null);
    setTransferError(null);
  };

  const handleCloseTaskModal = () => {
    setSelectedTask(null);
    setTransferTargetId("");
    setTransferSuccess(null);
    setTransferError(null);
  };

  const handleTransferTaskDirect = async (e: React.FormEvent, taskId: number) => {
    e.preventDefault();
    if (!transferTargetId) {
      setTransferError("Please pick a technician for task transfer.");
      return;
    }

    setIsTransferring(true);
    setTransferSuccess(null);
    setTransferError(null);

    try {
      const resp = await fetch(`/api/tasks/${taskId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transfer_to_id: Number(transferTargetId) })
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || "Failed to transfer task.");
      }

      setTransferSuccess(data.message || "Task reassigned successfully.");
      refreshLogs();

      // Update locally rendered task references instantly
      const updatedTaskObj = tasks.find(t => t.id === taskId);
      const targetEmp = employees.find(e => e.id === Number(transferTargetId));
      if (updatedTaskObj && targetEmp) {
        setSelectedTask({
          ...updatedTaskObj,
          assigned_to: Number(transferTargetId),
          employee_name: targetEmp.name
        });
      }
    } catch (err: any) {
      console.error(err);
      setTransferError(err.message || "Relational transfer failed.");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in select-none">
      
      {/* Visual Analytics Widgets Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Widget 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Tickets Registered</span>
            <h4 className="text-2xl font-extrabold text-slate-800 mt-0.5 font-mono">{totalTasksCount}</h4>
          </div>
          <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        {/* Widget 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending Service</span>
            <h4 className="text-2xl font-extrabold text-amber-600 mt-0.5 font-mono">{pendingCount}</h4>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Widget 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Repair</span>
            <h4 className="text-2xl font-extrabold text-blue-600 mt-0.5 font-mono">{inProgressCount}</h4>
          </div>
          <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
            <Cpu className="h-5 w-5 animate-spin" style={{ animationDuration: "16s" }} />
          </div>
        </div>

        {/* Widget 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">FTE SLA Achievement</span>
            <h4 className="text-2xl font-extrabold text-emerald-600 mt-0.5 font-mono">{finishedPercentage}%</h4>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>


      {/* Progress Indicator Slider Block */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Active Resolution Workload Flow</span>
          <span className="text-xs font-mono font-bold text-slate-500">{finishedCount} of {totalTasksCount} Resolved</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
          <div 
            style={{ width: `${finishedPercentage}%` }} 
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-700" 
          />
        </div>
      </div>

      {/* Interactive System Viewer GUI Container (Replaces Sandbox) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        
        {/* GUI Title Header bar */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-blue-600" />
              <span>Interactive System Viewer</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">Relational schema directories visualizer. Click on any service task to inspect metadata and transfer engineering resources.</p>
          </div>


        </div>

        {/* Double Panel Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-slate-200 flex-1">
          
          {/* Left Panel: Active Servicing Engineers Roster (40%) */}
          <div className="xl:col-span-4 p-5 flex flex-col bg-slate-50/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Users className="h-4 w-4 text-slate-500" />
                <span>Engineers Directory ({filteredEmployeesList.length})</span>
              </span>
            </div>

            {/* Joined Month selection */}
            <div className="flex items-center gap-1.5 bg-slate-105 border border-slate-200 p-1.5 rounded-xl text-xs mb-3">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Joined:</span>
              <select
                value={empSelectedMonth}
                onChange={(e) => setEmpSelectedMonth(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 p-1 rounded-md text-[10.5px] font-extrabold focus:outline-none transition-all cursor-pointer font-sans"
              >
                <option value="All" className="font-bold">All Months</option>
                {uniqueEmpMonths.map(m => (
                  <option key={m} value={m} className="font-bold">{formatMonthKey(m)}</option>
                ))}
              </select>
            </div>

            {/* Pagination row */}
            <div className="flex flex-col gap-2 bg-slate-100/50 p-2.5 rounded-xl border border-slate-200/50 mb-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider">Per Page:</span>
                <select
                  value={empItemsPerPage}
                  onChange={(e) => {
                    setEmpItemsPerPage(Number(e.target.value));
                    setEmpCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 text-slate-800 py-0.5 px-2 rounded-lg text-[10px] font-bold focus:outline-none transition-all cursor-pointer"
                >
                  {[5, 10, 20, 50].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setEmpCurrentPage(p => Math.max(1, p - 1))}
                  disabled={empCurrentPage === 1}
                  className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-[9px] font-bold text-slate-600">
                  {empCurrentPage} / {empTotalPages || 1}
                </span>
                <button
                  onClick={() => setEmpCurrentPage(p => Math.min(empTotalPages, p + 1))}
                  disabled={empCurrentPage === empTotalPages || empTotalPages === 0}
                  className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Compact Search */}
            <div className="relative mb-4">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search engineer name or role..."
                value={empQuery}
                onChange={(e) => setEmpQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 text-slate-800 pl-9 pr-3 py-1.5 rounded-xl text-xs focus:outline-none transition-colors"
              />
            </div>

            {/* Roster Cards List */}
            <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
              {displayedEmployeesList.length === 0 ? (
                <p className="text-center italic text-slate-400 text-[10px] py-10 font-medium">No service technicians registered.</p>
              ) : (
                displayedEmployeesList.map((emp) => {
                  const isActive = !emp.ended_at;
                  const empTasks = tasks.filter(t => t.assigned_to === emp.id);
                  const activeTCount = empTasks.filter(t => t.status !== "Finished").length;

                  return (
                    <div 
                      key={emp.id} 
                      className={`p-3.5 border rounded-xl transition-all ${
                        isActive 
                          ? "bg-white border-slate-200 shadow-2xs hover:border-slate-300" 
                          : "bg-slate-100 border-slate-100 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 text-xs">{emp.name}</span>
                            <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{emp.role}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">Staff ID: #{emp.id}</p>
                        </div>

                        <div className="text-right">
                          <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[9px] font-mono font-extrabold ${
                            activeTCount > 0 
                              ? "bg-blue-50 text-blue-700 border border-blue-100" 
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {activeTCount} Active Dispatch
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Relational Tasks Registry (60%) */}
          <div className="xl:col-span-8 p-5 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Layers className="h-4 w-4 text-slate-500" />
                <span>Service Tickets Index ({filteredTasksList.length})</span>
              </span>

              {/* Status Selectors */}
              <div className="flex items-center gap-1 bg-slate-200 border border-slate-300 p-0.5 rounded-lg self-start sm:self-auto">
                {(["All", "Pending", "In Progress", "Finished"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setGuiStatusFilter(st)}
                    className={`px-2.5 py-1.5 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                      guiStatusFilter === st
                        ? "bg-white text-blue-800 shadow-md border border-slate-300"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly and Pagination controller row */}
            <div className="flex flex-col gap-2 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/50 mb-4 text-xs">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Assigned Month:</span>
                <select
                  value={taskSelectedMonth}
                  onChange={(e) => {
                    setTaskSelectedMonth(e.target.value);
                    setTaskCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 text-slate-800 p-1 rounded-md text-[10.5px] font-extrabold focus:outline-none transition-all cursor-pointer font-sans"
                >
                  <option value="All" className="font-bold">All Months</option>
                  {uniqueTaskMonths.map(m => (
                    <option key={m} value={m} className="font-bold">{formatMonthKey(m)}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider">Per Page:</span>
                <select
                  value={taskItemsPerPage}
                  onChange={(e) => {
                    setTaskItemsPerPage(Number(e.target.value));
                    setTaskCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 text-slate-800 py-0.5 px-2 rounded-lg text-[10px] font-bold focus:outline-none transition-all cursor-pointer"
                >
                  {[5, 10, 20, 50].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setTaskCurrentPage(p => Math.max(1, p - 1))}
                  disabled={taskCurrentPage === 1}
                  className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-[9px] font-bold text-slate-600">
                  {taskCurrentPage} / {taskTotalPages || 1}
                </span>
                <button
                  onClick={() => setTaskCurrentPage(p => Math.min(taskTotalPages, p + 1))}
                  disabled={taskCurrentPage === taskTotalPages || taskTotalPages === 0}
                  className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Task Search field */}
            <div className="relative mb-4">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search ticket by client, fault details, or technical engineer..."
                value={taskQuery}
                onChange={(e) => setTaskQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 text-slate-800 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-colors"
              />
            </div>

            {/* Live Relational List click on row triggers modal */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white flex-1 max-h-[380px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-[10px] md:text-xs">
                <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-slate-900 text-[10px]">ID</th>
                    <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-slate-900 text-[10px]">Customer Name</th>
                    <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-slate-900 text-[10px]">Assigned to</th>
                    <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-slate-900 text-[10px]">Status</th>
                    <th className="px-3.5 py-2.5 font-extrabold uppercase tracking-wider text-slate-900 text-[10px] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {displayedTasksList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3.5 py-12 text-center text-slate-400 italic font-sans">
                        No service tickets match criteria.
                      </td>
                    </tr>
                  ) : (
                    displayedTasksList.map((task) => {
                      const isPending = task.status === "Pending";
                      const isInProgress = task.status === "In Progress";
                      const isFinished = task.status === "Finished";

                      return (
                        <tr 
                          key={task.id} 
                          onClick={() => handleOpenTask(task)} 
                          className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                        >
                          <td className="px-3.5 py-3 font-mono text-indigo-600 font-extrabold text-[11px]">#{task.id}</td>
                          <td className="px-3.5 py-3">
                            <p className="font-extrabold text-slate-800 text-[11px]">{task.customer_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono tracking-tight">{task.contact_details.split("|")[0].trim()}</p>
                          </td>
                          <td className="px-3.5 py-3">
                            <p className="font-semibold text-slate-700">{task.employee_name || "Unassigned"}</p>
                            <p className="text-[9px] text-slate-400 font-mono">ID: {task.assigned_to}</p>
                          </td>
                          <td className="px-3.5 py-3 text-[10px]">
                            {isPending && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-200">
                                Pending
                              </span>
                            )}
                            {isInProgress && (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 ring-1 ring-blue-200 animate-pulse">
                                In Progress
                              </span>
                            )}
                            {isFinished && (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                                Finished
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-right">
                            <span className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider">
                              Inspect Task
                              <ArrowRight className="h-3 w-3" />
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-slate-400 font-mono mt-3 text-right">
              * Click any support ticket row above to trigger full diagnostic details.
            </p>
          </div>
        </div>
      </div>

      {/* Task Details Inspector Overlay Modal (Satisfies: "clicked on task the admin should able to see all details regading the task.") */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                <span className="font-mono text-xs text-blue-700 font-extrabold">
                  RELATIONAL TICKET INSPECTOR #{selectedTask.id}
                </span>
              </div>
              <button
                onClick={handleCloseTaskModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scroll area */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Client general Context cards */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-bold">Client Metadata Context</span>
                <h4 className="text-base font-extrabold text-slate-900 select-all">{selectedTask.customer_name}</h4>
                
                <div className="flex flex-col sm:flex-row gap-2 pt-2 text-xs font-sans text-slate-600">
                  <a href={`tel:${selectedTask.contact_details.split("|")[0].trim()}`} className="flex items-center gap-1.5 hover:text-blue-600 select-all">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-mono font-extrabold tracking-wider text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-200/60 shadow-xs transition-all">{selectedTask.contact_details.split("|")[0].trim()}</span>
                  </a>
                  {selectedTask.contact_details.includes("|") && (
                    <span className="hidden sm:inline text-slate-300">|</span>
                  )}
                  {selectedTask.contact_details.includes("|") && (
                    <span className="flex items-center gap-1.5 text-slate-500 select-all">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{selectedTask.contact_details.split("|")[1].trim()}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Problem description */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase font-mono">Reported Diagnosis Details</span>
                <p className="text-xs bg-slate-50 border border-slate-200 p-3.5 rounded-xl leading-relaxed text-slate-700 select-all">
                  {selectedTask.problem_reported}
                </p>
              </div>

              {/* Customer Location */}
              <div className="space-y-1 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-extrabold block">Customer Location Address</span>
                <p className="text-xs font-semibold text-slate-800 select-all">
                  {selectedTask.address || "N/A - No address details provided"}
                </p>
              </div>

              {/* Materials Carrying / Carried for the Call */}
              <div className="space-y-1.5 bg-slate-50 border border-slate-200 p-4 rounded-xl font-sans">
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-extrabold flex items-center gap-1">
                  <Package className="h-3.5 w-3.5 text-slate-500" />
                  Materials Carried for this Call
                </span>
                {selectedTask.materials_carried ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedTask.materials_carried.split(",").map((mat, i) => {
                      const trimmedMat = mat.trim();
                      if (!trimmedMat) return null;
                      return (
                        <span key={i} className="inline-flex items-center bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-lg text-[10.5px] font-bold">
                          {trimmedMat}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[10px] select-all">No materials reported carrying for this service dispatch yet.</p>
                )}
              </div>

              {/* Priority / Urgency Level */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-extrabold block">Priority / Urgency Level</span>
                  <div className="flex items-center gap-2">
                    {selectedTask.is_priority ? (
                      <span className="px-2 py-0.5 text-red-700 text-3xs font-extrabold uppercase tracking-widest rounded-md animate-pulse flex items-center gap-1 bg-red-50 border border-red-200 text-[10px]">
                        <AlertCircle className="h-3 w-3" />
                        🔥 Urgent / High-Priority
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-3xs font-extrabold uppercase tracking-widest rounded-md text-[10px]">
                        Standard Priority
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Work Remarks (if finished) */}
              {selectedTask.remarks && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase font-mono flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Technician Resolution Remarks
                  </span>
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200 text-emerald-800 text-xs rounded-xl leading-relaxed select-all font-sans">
                    {selectedTask.remarks}
                  </div>
                </div>
              )}

              {/* RDB system logs / chronology */}
              <div className="border-t border-slate-100 pt-4 space-y-2.5 font-mono text-[10px] text-slate-500">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold block">Relational Log Timestamps</span>
                
                <div className="space-y-2 text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
                    <span><strong>Task Insert Date:</strong> {new Date(selectedTask.assigned_at).toLocaleString()}</span>
                  </div>
                  {selectedTask.accepted_at && (
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full" />
                      <span><strong>Technician Accepted:</strong> {new Date(selectedTask.accepted_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedTask.finished_at && (
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
                      <span><strong>State Finalized & Closed:</strong> {new Date(selectedTask.finished_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Task Reassign or Transfer Section (Satisfies: "add transfer to task section not to removes employee section. Transfer task.") */}
              {selectedTask.status !== "Finished" && (
                <form 
                  onSubmit={(e) => handleTransferTaskDirect(e, selectedTask.id)} 
                  className="bg-blue-50/45 border border-blue-100 p-4 rounded-xl space-y-3 pt-3"
                >
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-blue-800 font-sans">
                    Transfer / Reassign Service Engineer (Direct SQL Update)
                  </label>
                  
                  <div className="flex flex-col sm:flex-row gap-2 z-20">
                    <select
                      value={transferTargetId}
                      onChange={(e) => setTransferTargetId(e.target.value)}
                      className="flex-1 bg-white border border-blue-200 focus:border-blue-500 focus:outline-none text-xs rounded-lg p-2.5 font-sans"
                      required
                    >
                      <option value="">-- Choose New Active Engineer --</option>
                      {employees
                        .filter(emp => !emp.ended_at && emp.id !== selectedTask.assigned_to)
                        .map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.role}) - ID: {emp.id}
                          </option>
                        ))
                      }
                    </select>

                     <button
                      type="submit"
                      disabled={isTransferring || !transferTargetId}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs rounded-lg transition-colors shadow-md border border-blue-800 uppercase tracking-wide cursor-pointer"
                    >
                      {isTransferring ? "Updating RDB..." : "Transfer Task"}
                    </button>
                  </div>

                  {transferSuccess && (
                    <p className="text-[10px] text-emerald-600 font-sans font-bold select-text mt-1.5">
                      ✓ {transferSuccess}
                    </p>
                  )}
                  {transferError && (
                    <p className="text-[10px] text-red-600 font-sans font-bold select-text mt-1.5">
                      ✗ {transferError}
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseTaskModal}
                className="px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 hover:text-slate-950 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
