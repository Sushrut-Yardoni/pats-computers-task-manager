import React, { useState } from "react";
import { 
  PlusCircle, Search, Cpu, Clock, CheckCircle2, ShieldCheck, Layers, Phone, Mail, X, ArrowRight, Calendar, BookmarkCheck, AlertCircle, Package, Trash2
} from "lucide-react";
import { Task, Employee } from "../types";

interface TaskManagementSectionProps {
  tasks: Task[];
  employees: Employee[];
  onAssignTask: (taskData: {
    customer_name: string;
    contact_details: string;
    problem_reported: string;
    assigned_to: number;
    address?: string;
  }) => Promise<void>;
  refreshLogs: () => void;
  onUpdateRemarks?: (taskId: number, remarks: string) => Promise<void>;
  onUpdateTaskDetails?: (taskId: number, taskData: { customer_name: string; contact_details: string; problem_reported: string; address?: string }) => Promise<void>;
  onTogglePriority?: (taskId: number) => Promise<void>;
}

export default function TaskManagementSection({
  tasks,
  employees,
  onAssignTask,
  refreshLogs,
  onUpdateRemarks,
  onUpdateTaskDetails,
  onTogglePriority
}: TaskManagementSectionProps) {
  // Local task assigner Form states
  const [customerName, setCustomerName] = useState("");
  const [contactDetails, setContactDetails] = useState("");
  const [address, setAddress] = useState("");
  const [problemReported, setProblemReported] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // Local querying and filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "In Progress" | "Finished">("All");

  // Limits and Month filter for Tasks table
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState<string>("All");

  const uniqueMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    tasks.forEach(task => {
      if (task.assigned_at) {
        const match = task.assigned_at.match(/^(\d{4}-\d{2})/);
        if (match) {
          monthsSet.add(match[1]);
        }
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [tasks]);

  const formatMonthKey = (monthKey: string) => {
    try {
      const [year, month] = monthKey.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleString("default", { month: "long", year: "numeric" });
    } catch {
      return monthKey;
    }
  };

  // Computed counters
  const totalCount = tasks.length;
  const pendingCount = tasks.filter(t => t.status === "Pending").length;
  const activeCount = tasks.filter(t => t.status === "In Progress").length;
  const finishedCount = tasks.filter(t => t.status === "Finished").length;

  // Filter tasks list locally
  const filteredTasks = React.useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = 
        task.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.problem_reported.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.employee_name && task.employee_name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      const matchesMonth = selectedMonth === "All" || (task.assigned_at && task.assigned_at.startsWith(selectedMonth));

      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [tasks, searchQuery, statusFilter, selectedMonth]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

  const displayedTasks = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTasks, currentPage, itemsPerPage]);

  // Reset to first page when filter/search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedMonth]);

  // Selected Task Inspector Dialog Modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAssignRepairModalOpen, setIsAssignRepairModalOpen] = useState(false);
  const [editingRemarks, setEditingRemarks] = useState("");
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  // States for updating task/customer details
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editContactDetails, setEditContactDetails] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editProblemReported, setEditProblemReported] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // Admin delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // States for re-assigning task as a Repeat call
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignSuccess, setReassignSuccess] = useState<string | null>(null);
  const [reassignError, setReassignError] = useState<string | null>(null);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !problemReported.trim() || !assignedTo) {
      alert("Please fill in all details and select an active service engineer.");
      return;
    }

    setIsAssigning(true);
    setFormSuccess(false);
    try {
      await onAssignTask({
        customer_name: customerName.trim(),
        contact_details: contactDetails.trim() || "N/A",
        problem_reported: problemReported.trim(),
        assigned_to: Number(assignedTo),
        address: address.trim() || ""
      });
      
      // Reset form controls
      setCustomerName("");
      setContactDetails("");
      setProblemReported("");
      setAssignedTo("");
      setAddress("");
      setFormSuccess(true);
      setTimeout(() => {
        setFormSuccess(false);
        setIsAssignRepairModalOpen(false);
      }, 2000);
      refreshLogs();
    } catch (err) {
      console.error(err);
      alert("Failed to record task in relational DB index.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleOpenTaskInspector = (task: Task) => {
    setSelectedTask(task);
    setEditingRemarks(task.remarks || "");
    setTransferTargetId("");
    setTransferSuccess(null);
    setTransferError(null);
    setReassignSuccess(null);
    setReassignError(null);
    setEditCustomerName(task.customer_name);
    setEditContactDetails(task.contact_details);
    setEditAddress(task.address || "");
    setEditProblemReported(task.problem_reported);
    setIsEditingDetails(false);
  };

  const handleCloseInspector = () => {
    setSelectedTask(null);
    setEditingRemarks("");
    setTransferTargetId("");
    setTransferSuccess(null);
    setTransferError(null);
    setReassignSuccess(null);
    setReassignError(null);
    setIsEditingDetails(false);
    setIsConfirmingDelete(false);
    setDeleteError(null);
  };

  const handleDeleteTask = async (taskId: number) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const resp = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE"
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to delete task.");
      }

      setIsConfirmingDelete(false);
      handleCloseInspector();
      refreshLogs();
    } catch (err: any) {
      setDeleteError(err.message || "Deletion failed.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!selectedTask || !onUpdateTaskDetails) return;
    if (!editCustomerName.trim() || !editContactDetails.trim() || !editProblemReported.trim()) {
      alert("Fields (Customer Name, Contact details, Problem description) are required.");
      return;
    }

    setSavingDetails(true);
    try {
      await onUpdateTaskDetails(selectedTask.id, {
        customer_name: editCustomerName.trim(),
        contact_details: editContactDetails.trim(),
        problem_reported: editProblemReported.trim(),
        address: editAddress.trim()
      });
      setSelectedTask(prev => prev ? {
        ...prev,
        customer_name: editCustomerName.trim(),
        contact_details: editContactDetails.trim(),
        problem_reported: editProblemReported.trim(),
        address: editAddress.trim()
      } : null);
      setIsEditingDetails(false);
      alert("Task details updated successfully!");
      refreshLogs();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update details.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSaveRemarks = async () => {
    if (!selectedTask || !onUpdateRemarks) return;

    setSavingRemarks(true);
    try {
      await onUpdateRemarks(selectedTask.id, editingRemarks.trim());
      setSelectedTask(prev => prev ? { ...prev, remarks: editingRemarks.trim() || null } : null);
      alert("Relational task remarks updated successfully!");
      refreshLogs();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update remarks.");
    } finally {
      setSavingRemarks(false);
    }
  };

  const handleTogglePriorityClick = async () => {
    if (!selectedTask || !onTogglePriority) return;
    try {
      await onTogglePriority(selectedTask.id);
      setSelectedTask(prev => prev ? { ...prev, is_priority: !prev.is_priority } : null);
      refreshLogs();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to toggle priority status.");
    }
  };

  const handleTransferTaskDirect = async (e: React.FormEvent, taskId: number) => {
    e.preventDefault();
    if (!transferTargetId) {
      setTransferError("Please pick an engineer for task transfer.");
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

      // Instantly update local modal render reference
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
      setTransferError(err.message || "Transfer operation failed.");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleReassignTaskRepeat = async (e: React.FormEvent, taskId: number) => {
    e.preventDefault();
    if (!selectedTask) return;

    setIsReassigning(true);
    setReassignSuccess(null);
    setReassignError(null);

    const targetEmpId = selectedTask.assigned_to;

    try {
      const resp = await fetch(`/api/tasks/${taskId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reassign_to_id: targetEmpId })
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || "Failed to re-assign task as Repeat call.");
      }

      setReassignSuccess(data.message || "A new repeat task has been created successfully.");
      refreshLogs();

      // Ensure the active modal doesn't falsely show the old task as the new one
      // We'll just leave the old task visible as its original state or close the modal if needed.
    } catch (err: any) {
      console.error(err);
      setReassignError(err.message || "Reassignment failed.");
    } finally {
      setIsReassigning(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Assign repair ticket button */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => setIsAssignRepairModalOpen(true)}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md border border-blue-900 active:scale-[0.98] uppercase tracking-wide cursor-pointer transition-all w-max"
        >
          <PlusCircle className="h-4 w-4" />
          Assign Repair Ticket
        </button>
      </div>

      {/* Mini telemetry boards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Pending Support</span>
            <p className="text-xl font-bold text-amber-600 font-mono mt-0.5">{pendingCount}</p>
          </div>
          <Clock className="h-4 w-4 text-amber-600" />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">In Progress</span>
            <p className="text-xl font-bold text-blue-600 font-mono mt-0.5">{activeCount}</p>
          </div>
          <Cpu className="h-4 w-4 text-blue-600 animate-spin" style={{ animationDuration: "14s" }} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Resolved Repairs</span>
            <p className="text-xl font-bold text-emerald-600 font-mono mt-0.5">{finishedCount}</p>
          </div>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* Registering Form Modal */}
        {isAssignRepairModalOpen && (
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in select-text text-slate-800">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl" />
              <div className="flex items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-display font-extrabold text-slate-900 text-sm">Assign Repair Ticket</h3>
                <button
                  type="button"
                  onClick={() => setIsAssignRepairModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                    Customer Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Chandra"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-400 focus:border-blue-500 text-slate-800 px-3 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                    Contact Details <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 99000 12345 (Optional)"
                    value={contactDetails}
                    onChange={(e) => setContactDetails(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-400 focus:border-blue-500 text-slate-800 px-3 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                    Customer Location Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MG Road, Ashok Nagar, Bengaluru"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-400 focus:border-blue-500 text-slate-800 px-3 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                    Problem Reported
                  </label>
                  <textarea
                    placeholder="Provide description of support request..."
                    value={problemReported}
                    onChange={(e) => setProblemReported(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-400 focus:border-blue-500 text-slate-800 px-3 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none transition-colors resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Assign Engineer
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 text-slate-800 px-3 py-2.5 rounded-xl text-xs focus:outline-none transition-colors"
                    required
                  >
                    <option value="" className="text-slate-400">
                      -- Select Service Engineer --
                    </option>
                    {[...employees].filter(emp => !emp.ended_at).sort((a, b) => a.id - b.id).map((emp) => (
                      <option key={emp.id} value={emp.id} className="text-slate-700">
                        {emp.name} ({emp.role}) - ID: {emp.id}
                      </option>
                    ))}
                  </select>
                </div>

                {formSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[10px] animate-pulse">
                    Ticket registered! Constraint check approved in relational state.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAssigning}
                  className="w-full py-2.5 px-3 rounded-xl text-white font-extrabold text-xs bg-blue-700 hover:bg-blue-800 transition-all flex items-center justify-center gap-1.5 shadow-md border border-blue-900 active:scale-95 uppercase tracking-wide cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>{isAssigning ? "Posting relational insert..." : "Assign & Dispatch Ticket"}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tickets visual data grid view (Clicking any row triggers inspector modal) */}
        <div className="col-span-12 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-slate-200 pb-3 mb-4 text-xs">
            <div className="flex items-center gap-4">
              <h3 className="font-display font-extrabold text-slate-900 text-sm">Active Service Tickets Directory</h3>
            </div>


            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Dynamic Month selection */}
              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 p-1.5 rounded-xl text-xs shrink-0">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 p-1 rounded-md text-[10.5px] font-extrabold focus:outline-none transition-all cursor-pointer"
                >
                  <option value="All" className="font-bold">All Months</option>
                  {uniqueMonths.map(m => (
                    <option key={m} value={m} className="font-bold">{formatMonthKey(m)}</option>
                  ))}
                </select>
              </div>

              {/* Search query input */}
              <div className="relative flex-1 sm:w-44">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-500 text-slate-800 pl-8 pr-3 py-1.5 rounded-xl text-[11px] placeholder-slate-400 focus:outline-none transition-colors font-sans"
                />
              </div>

              {/* Status filter selector */}
              <div className="flex items-center gap-1 bg-slate-200 border border-slate-300 p-0.5 rounded-lg text-xs">
                {(["All", "Pending", "In Progress", "Finished"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-2.5 py-1.5 rounded-md text-[10px] font-extrabold tracking-tight transition-all pb-1.5 pt-1.5 ${
                      statusFilter === filter
                        ? "bg-white text-blue-800 shadow-md border border-slate-300"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pagination row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 mb-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Per Page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 text-slate-800 py-0.5 px-2 rounded-lg text-[10px] font-bold focus:outline-none transition-all cursor-pointer"
              >
                {[5, 10, 20, 50].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-[10px] font-bold text-slate-600">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            
            <span className="text-[10px] text-slate-500 font-bold font-mono">
              Showing {displayedTasks.length} of {filteredTasks.length} tickets
            </span>
          </div>

          {/* Table display */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="min-w-full divide-y divide-slate-100 select-text text-[10px] md:text-xs">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 text-left text-[9px] font-extrabold uppercase tracking-wider text-slate-900">ID</th>
                  <th className="px-3.5 py-2.5 text-left text-[9px] font-extrabold uppercase tracking-wider text-slate-900">Customer Details</th>
                  <th className="px-3.5 py-2.5 text-left text-[9px] font-extrabold uppercase tracking-wider text-slate-900">Fault Description</th>
                  <th className="px-3.5 py-2.5 text-left text-[9px] font-extrabold uppercase tracking-wider text-slate-900">Assigned Engineer</th>
                  <th className="px-3.5 py-2.5 text-left text-[9px] font-extrabold uppercase tracking-wider text-slate-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3.5 py-10 text-center text-slate-400 italic font-sans font-medium">
                      No matching service tickets found for your filter preferences.
                    </td>
                  </tr>
                ) : (
                  displayedTasks.map((task) => (
                    <tr 
                      key={task.id} 
                      onClick={() => handleOpenTaskInspector(task)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                      title="Click to view details and transfer this support agent task"
                    >
                      <td className="px-3.5 py-3 text-[10px] font-mono text-indigo-600 font-extrabold text-[11px]">#{task.id}</td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-extrabold text-slate-800 select-all text-[11.5px]">{task.customer_name}</p>
                          {task.is_priority && (
                            <span className="px-1.5 py-0.5 bg-red-50 border border-red-200 text-red-700 text-[8px] font-extrabold uppercase rounded-md tracking-wider">
                              🔥 Urgent
                            </span>
                          )}
                          {task.is_repeat && (
                            <span className="px-1.5 py-0.5 bg-purple-50 border border-purple-100 text-purple-700 text-[8px] font-extrabold uppercase rounded-md tracking-wider">
                              🔄 Repeat Call
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5 select-all">{task.contact_details.split("|")[0]}</p>
                      </td>
                      <td className="px-3.5 py-3 max-w-xs truncate font-medium text-slate-600 select-all" title={task.problem_reported}>
                        {task.problem_reported}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded bg-blue-50 text-blue-700 text-[9px] font-bold flex items-center justify-center uppercase font-sans border border-blue-100">
                            {task.employee_name ? task.employee_name.split(" ").map(w => w[0]).join("") : "U"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 select-all text-[10px]">{task.employee_name}</p>
                            <p className="text-[8px] text-slate-400 font-mono font-medium">ID: {task.assigned_to}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-[10px]">
                        {task.status === "Pending" && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-200">
                            Pending
                          </span>
                        )}
                        {task.status === "In Progress" && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 ring-1 ring-blue-100 animate-pulse">
                            In Progress
                          </span>
                        )}
                        {task.status === "Finished" && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                            Finished
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Visually Detailed Task Inspector Card Dialog Overlay Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                <span className="font-mono text-xs text-blue-700 font-extrabold">
                  RELATIONAL TICKET INSPECTOR #{selectedTask.id}
                </span>
              </div>
              <button
                onClick={handleCloseInspector}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal scroll contents */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Notice for finished task details read-only status */}
              {selectedTask.status === "Finished" && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Finalized support tickets are locked. Details cannot be edited.</span>
                </div>
              )}

              {isEditingDetails ? (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5 text-xs">
                  <span className="text-[10px] text-blue-700 font-mono uppercase tracking-widest font-extrabold block">Edit Ticket Details</span>
                  
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Customer Full Name</label>
                    <input
                      type="text"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors font-sans"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Contact Details</label>
                    <input
                      type="text"
                      value={editContactDetails}
                      onChange={(e) => setEditContactDetails(e.target.value)}
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors font-sans"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Customer Location Address</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Problem Reported</label>
                    <textarea
                      value={editProblemReported}
                      onChange={(e) => setEditProblemReported(e.target.value)}
                      rows={3}
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors resize-none font-sans"
                      required
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditCustomerName(selectedTask.customer_name);
                        setEditContactDetails(selectedTask.contact_details);
                        setEditAddress(selectedTask.address || "");
                        setEditProblemReported(selectedTask.problem_reported);
                        setIsEditingDetails(false);
                      }}
                      className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-bold uppercase transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDetails}
                      disabled={savingDetails}
                      className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors"
                    >
                      {savingDetails ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Client Context Information card */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1 relative">
                    {selectedTask.status !== "Finished" && (
                      <button
                        onClick={() => setIsEditingDetails(true)}
                        className="absolute top-3.5 right-3.5 px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-400 text-slate-700 text-[10px] font-black tracking-tight rounded-lg transition-colors cursor-pointer"
                      >
                        Edit Details
                      </button>
                    )}
                    <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-extrabold block">Client Support Profile</span>
                    <h4 className="text-base font-extrabold text-slate-900 select-all">{selectedTask.customer_name}</h4>
                    
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 text-xs text-slate-600 font-sans">
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

                  {/* Problem diagnosis */}
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
                </>
              )}

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

              {/* Priority & Urgency State Panel */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-extrabold block">Priority / Urgency Level</span>
                  <div className="flex items-center gap-2">
                    {selectedTask.is_priority ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-3xs font-extrabold uppercase tracking-widest rounded-md animate-pulse flex items-center gap-1 bg-red-50 border border-red-200 text-[10px]">
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
                {onTogglePriority && selectedTask.status !== "Finished" && (
                  <button
                    onClick={handleTogglePriorityClick}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all tracking-wider ${
                      selectedTask.is_priority
                        ? "bg-slate-200 hover:bg-slate-200 text-slate-700 border border-slate-300"
                        : "bg-red-600 hover:bg-red-700 text-white shadow-2xs"
                    } cursor-pointer`}
                  >
                    {selectedTask.is_priority ? "Mark Standard" : "Set Priority/Urgent"}
                  </button>
                )}
              </div>

              {/* Editable remarks - Only editable AFTER finishing the task */}
              {selectedTask.status === "Finished" ? (
                <div className="space-y-1.5 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs font-sans">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest font-bold flex items-center gap-1">
                    <BookmarkCheck className="h-3.5 w-3.5 text-blue-600" />
                    Task Resolution Remarks (Edit to correct submit mistake)
                  </span>
                  <textarea
                    value={editingRemarks}
                    onChange={(e) => setEditingRemarks(e.target.value)}
                    placeholder="Enter or update resolving remarks..."
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 text-slate-800 p-2.5 rounded-xl text-xs placeholder-slate-400 focus:outline-none transition-colors h-20 resize-none"
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleSaveRemarks}
                      disabled={savingRemarks}
                      className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      {savingRemarks ? "Saving..." : "Update Remark"}
                    </button>
                  </div>
                </div>
              ) : selectedTask.remarks ? (
                <div className="space-y-1.5 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs font-sans">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest font-bold flex items-center gap-1">
                    <BookmarkCheck className="h-3.5 w-3.5 text-slate-400" />
                    Task Resolution Remarks (Read-Only)
                  </span>
                  <p className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 select-all font-sans whitespace-pre-wrap">
                    {selectedTask.remarks}
                  </p>
                </div>
              ) : null}

              {/* Event timestamps logs */}
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

              {/* Transfer/Reassign Support Form inside inspector (Satisfies: "add transfer to task section not to remove employee section. Transfer task.") */}
              {selectedTask.status !== "Finished" && (
                <form 
                  onSubmit={(e) => handleTransferTaskDirect(e, selectedTask.id)} 
                  className="bg-blue-50/45 border border-blue-100 p-4 rounded-xl space-y-3 pt-3"
                >
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-blue-800 font-sans">
                    Transfer / Reassign Engineer (Direct SQL Update)
                  </label>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={transferTargetId}
                      onChange={(e) => setTransferTargetId(e.target.value)}
                      className="flex-1 bg-white border border-blue-200 focus:border-blue-500 focus:outline-none text-xs rounded-lg p-2.5 font-sans"
                      required
                    >
                      <option value="">-- Choose New Technical Engineer --</option>
                      {[...employees]
                        .filter(emp => !emp.ended_at && emp.id !== selectedTask.assigned_to)
                        .sort((a, b) => a.id - b.id)
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
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs rounded-lg transition-colors shadow-md border border-blue-900 uppercase tracking-wider cursor-pointer"
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

              {/* Reassign Task (Set as Repeat Call) */}
              <form 
                onSubmit={(e) => handleReassignTaskRepeat(e, selectedTask.id)} 
                className="bg-purple-50/45 border border-purple-100 p-4 rounded-xl space-y-3 pt-3 mt-4"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-purple-800 font-sans">
                    Re-assign Task (Reset Status status as Repeat Call)
                  </span>
                  <span className="text-[8px] bg-purple-100 text-purple-700 border border-purple-200 uppercase px-1 rounded font-bold font-mono">
                    Admin Option Only
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-sans">
                  This action resets the task status to <strong className="text-amber-700">Pending</strong>, clears any completed remarks/materials, and flags it as a <strong className="text-purple-700">🔄 Repeat Call</strong>.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    disabled={isReassigning}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs rounded-lg transition-colors shadow-md border border-purple-900 uppercase tracking-wider cursor-pointer w-full text-center"
                  >
                    {isReassigning ? "Updating RDB..." : "Reassign as Repeat (Same Engineer)"}
                  </button>
                </div>

                {reassignSuccess && (
                  <p className="text-[10px] text-emerald-600 font-sans font-bold select-text mt-1.5">
                    ✓ {reassignSuccess}
                  </p>
                )}
                {reassignError && (
                  <p className="text-[10px] text-red-600 font-sans font-bold select-text mt-1.5">
                    ✗ {reassignError}
                  </p>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-2 justify-between items-center w-full">
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 w-full sm:w-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Task</span>
                </button>
              </div>
              <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                <button
                  type="button"
                  onClick={handleCloseInspector}
                  className="px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 hover:text-slate-950 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isConfirmingDelete && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-51 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative flex flex-col p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-red-600">
              <Trash2 className="h-6 w-6" />
              <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-tight">Delete Service Ticket?</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed select-text">
              Are you absolutely sure you want to permanently delete service ticket <strong>#{selectedTask.id}</strong> for <strong>{selectedTask.customer_name}</strong>? This action is irreversible.
            </p>

            {deleteError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px] font-medium leading-relaxed select-text">
                ✗ {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setIsConfirmingDelete(false);
                  setDeleteError(null);
                }}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
