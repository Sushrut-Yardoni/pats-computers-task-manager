import React, { useState, useEffect } from "react";
import { 
  PlusCircle, Search, Clock, CheckCircle2, ListFilter, X, Plus, User, Edit3, CheckSquare, Trash2, AlertCircle, Eye
} from "lucide-react";
import { TodoTask, Employee, DeletedTodoTask } from "../types";
import TodoHistoryModal from "./TodoHistoryModal";

interface TodoManagementSectionProps {
  employees: Employee[];
  refreshLogs: () => void;
}

export default function TodoManagementSection({
  employees,
  refreshLogs
}: TodoManagementSectionProps) {
  const [todos, setTodos] = useState<TodoTask[]>([]);
  const [deletedTodos, setDeletedTodos] = useState<DeletedTodoTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"todo" | "finished" | "deleted">("todo");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccountsUser, setSelectedAccountsUser] = useState("");

  const accountsUsers = Array.from(new Set([
    ...employees.filter(emp => emp.role.toLowerCase() === "accounts" || emp.role.toLowerCase().includes("accounts")).map(emp => emp.name),
    ...todos.filter(todo => todo.created_by_role?.toLowerCase() === "accounts" || todo.created_by_role?.toLowerCase().includes("accounts")).map(todo => todo.created_by_name)
  ])).sort();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoTask | null>(null);
  const [historyTodo, setHistoryTodo] = useState<TodoTask | null>(null);
  const [finishingTodo, setFinishingTodo] = useState<TodoTask | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<TodoTask | null>(null);
  const [viewingTodo, setViewingTodo] = useState<TodoTask | null>(null);

  // Form State - Add
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAccountsUser, setTargetAccountsUser] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - Edit
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<"Assigned" | "Finished">("Assigned");
  const [editRemarks, setEditRemarks] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Form State - Quick Finish
  const [finishRemarks, setFinishRemarks] = useState("");
  const [isFinishingSubmitting, setIsFinishingSubmitting] = useState(false);

  // Delete State
  const [isDeletingSubmitting, setIsDeletingSubmitting] = useState(false);

  const fetchTodos = async () => {
    setIsLoading(true);
    try {
      const [todosRes, deletedRes] = await Promise.all([
        fetch("/api/todos"),
        fetch("/api/todos/deleted")
      ]);
      if (todosRes.ok) {
        const data = await todosRes.ok ? await todosRes.json() : [];
        setTodos(data);
      }
      if (deletedRes.ok) {
        const deletedData = await deletedRes.json();
        setDeletedTodos(deletedData);
      }
    } catch (err) {
      console.error("Failed to fetch to-do tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert("Please enter both title and description.");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalRole = targetAccountsUser ? `Admin|for:${targetAccountsUser}` : "Admin";
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          created_by_name: "System Admin",
          created_by_role: finalRole
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create to-do task.");
      }

      setTitle("");
      setDescription("");
      setTargetAccountsUser("");
      setIsAddModalOpen(false);
      fetchTodos();
      refreshLogs();
    } catch (err: any) {
      alert(err.message || "Failed to create To-Do task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (todo: TodoTask) => {
    setEditingTodo(todo);
    setEditTitle(todo.title);
    setEditDescription(todo.description);
    setEditStatus(todo.status);
    setEditRemarks(todo.remarks || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodo) return;

    if (!editTitle.trim() || !editDescription.trim()) {
      alert("Title and description are required.");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/todos/${editingTodo.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          status: editStatus,
          remarks: editStatus === "Finished" ? (editRemarks.trim() || "Completed") : null,
          edited_by: "System Admin"
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update To-Do task.");
      }

      setEditingTodo(null);
      fetchTodos();
      refreshLogs();
    } catch (err: any) {
      alert(err.message || "Failed to update task.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickFinishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finishingTodo) return;

    setIsFinishingSubmitting(true);
    try {
      const res = await fetch(`/api/todos/${finishingTodo.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Finished",
          remarks: finishRemarks.trim() || "Completed by Admin",
          edited_by: "System Admin"
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to complete To-Do task.");
      }

      setFinishingTodo(null);
      setFinishRemarks("");
      fetchTodos();
      refreshLogs();
    } catch (err: any) {
      alert(err.message || "Failed to finish task.");
    } finally {
      setIsFinishingSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingTodo) return;

    setIsDeletingSubmitting(true);
    try {
      const deletedBy = "System Admin";
      const res = await fetch(`/api/todos/${deletingTodo.id}?deleted_by=${encodeURIComponent(deletedBy)}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete To-Do task.");
      }

      setDeletingTodo(null);
      fetchTodos();
      refreshLogs();
    } catch (err: any) {
      alert(err.message || "Failed to delete task.");
    } finally {
      setIsDeletingSubmitting(false);
    }
  };

  // Filters
  const filteredTodos = todos.filter(todo => {
    const isTodo = todo.status !== "Finished";
    const matchesTab = activeTab === "todo" ? isTodo : !isTodo;
    
    const matchesSearch = 
      todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.created_by_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(todo.id).includes(searchQuery);

    const matchesAccountsUser = !selectedAccountsUser || 
      todo.created_by_name.toLowerCase() === selectedAccountsUser.toLowerCase();

    return matchesTab && matchesSearch && matchesAccountsUser;
  });

  const filteredDeletedTodos = deletedTodos.filter(todo => {
    const matchesSearch = 
      todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.created_by_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (todo.deleted_by || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(todo.id).includes(searchQuery);

    const matchesAccountsUser = !selectedAccountsUser || 
      todo.created_by_name.toLowerCase() === selectedAccountsUser.toLowerCase();

    return matchesSearch && matchesAccountsUser;
  });

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in font-sans">
      
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Assigned To-Do Tasks</span>
            <p className="text-xl font-bold text-indigo-700 font-mono mt-0.5">{todos.filter(t => t.status === "Assigned").length}</p>
          </div>
          <ListFilter className="h-5 w-5 text-indigo-500" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Finished To-Do Tasks</span>
            <p className="text-xl font-bold text-emerald-600 font-mono mt-0.5">
              {todos.filter(t => t.status === "Finished").length}
            </p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Deleted To-Do Tasks</span>
            <p className="text-xl font-bold text-red-600 font-mono mt-0.5">
              {deletedTodos.length}
            </p>
          </div>
          <Trash2 className="h-5 w-5 text-red-500" />
        </div>
      </div>

      {/* Control panel for task list */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2">
          
          {/* Tabs */}
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200 w-max gap-1">
            <button
              onClick={() => setActiveTab("todo")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
                activeTab === "todo" 
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200" 
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Active To-Dos</span>
            </button>
            <button
              onClick={() => setActiveTab("finished")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
                activeTab === "finished" 
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200" 
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Task History / Finished</span>
            </button>
            <button
              onClick={() => setActiveTab("deleted")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
                activeTab === "deleted" 
                  ? "bg-white text-red-700 shadow-xs border border-slate-200" 
                  : "text-slate-500 hover:text-slate-905"
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Deleted Tasks</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Create ticket button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xs border border-blue-900 active:scale-[0.98] uppercase tracking-wide cursor-pointer transition-all shrink-0"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add To-Do Task
            </button>
          </div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col md:flex-row gap-2">
          {/* Search box */}
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by ID, title, description, or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white hover:border-slate-300 focus:border-blue-500 pl-9 pr-3 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none transition-all font-sans"
            />
          </div>

          {/* Accounts User Filter Dropdown */}
          <div className="flex items-center gap-2 min-w-[240px]">
            <span className="text-xs text-slate-500 font-medium shrink-0">Filter Accounts User:</span>
            <select
              value={selectedAccountsUser}
              onChange={(e) => setSelectedAccountsUser(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 py-2 px-3 rounded-xl text-xs text-slate-700 font-medium focus:outline-none transition-all cursor-pointer"
            >
              <option value="">All Creators</option>
              {accountsUsers.length === 0 ? (
                <option disabled>No Accounts users found</option>
              ) : (
                accountsUsers.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Tasks List - Card View */}
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl text-center py-12 text-slate-400 italic text-xs shadow-xs">
            Loading To-Do checklist tasks...
          </div>
        ) : (activeTab === "deleted" ? filteredDeletedTodos : filteredTodos).length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 italic text-xs shadow-xs">
            No To-Do tasks found matching your query.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
            {(activeTab === "deleted" ? filteredDeletedTodos : filteredTodos).map(todo => (
              <div 
                key={todo.id} 
                onClick={() => setViewingTodo(todo)}
                className={`bg-white border rounded-xl shadow-3xs hover:shadow-sm transition-all duration-200 flex flex-col overflow-hidden cursor-pointer relative group ${
                  activeTab === "deleted" ? "border-red-100 hover:border-red-400" : "border-slate-200 hover:border-indigo-400"
                }`}
              >
                {/* Accent status line at top of card */}
                <div className={`h-1 w-full ${
                  activeTab === "deleted" ? "bg-red-500" : todo.status === "Finished" ? "bg-emerald-500" : "bg-amber-500"
                }`} />

                <div className="p-3.5 flex-grow flex flex-col justify-between space-y-3">
                  {/* Card Header: ID & Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-extrabold text-indigo-600 text-xs">#{todo.id}</span>
                    <div>
                      {activeTab === "deleted" ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.2 text-[8px] font-extrabold text-red-700 ring-1 ring-red-100 uppercase tracking-wide">
                          Deleted
                        </span>
                      ) : todo.status === "Assigned" ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.2 text-[8px] font-extrabold text-amber-700 ring-1 ring-amber-100 uppercase tracking-wide">
                          Assigned
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.2 text-[8px] font-extrabold text-emerald-700 ring-1 ring-emerald-100 uppercase tracking-wide">
                          Finished
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title and Description */}
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-800 text-[12.5px] leading-snug group-hover:text-indigo-700 transition-colors line-clamp-1">{todo.title}</h4>
                    <p className="text-[10.5px] text-slate-500 font-normal leading-relaxed line-clamp-2 break-words">
                      {todo.description}
                    </p>
                  </div>

                  {/* Deletion details if activeTab is deleted */}
                  {activeTab === "deleted" && (
                    <div className="bg-red-50/40 border border-red-100/30 rounded-lg p-2 text-[9px] text-slate-600 space-y-0.5">
                      <div className="truncate">Deleted by: <strong className="text-red-700">{(todo as any).deleted_by || "Manager"}</strong></div>
                      <div className="truncate">Deleted at: <strong className="text-slate-700">{(todo as any).deleted_at ? formatDate((todo as any).deleted_at) : "N/A"}</strong></div>
                    </div>
                  )}

                  {/* Resolution remarks if finished (smaller) */}
                  {activeTab === "finished" && todo.remarks && (
                    <div className="bg-emerald-50/40 border border-emerald-100/40 rounded-lg p-2 text-[10px] text-slate-600 italic truncate">
                      {todo.remarks}
                    </div>
                  )}

                  {/* Metadata: Creator and Date (highly compact) */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-medium truncate max-w-[110px]" title={todo.created_by_role && todo.created_by_role.includes('|for:') ? `For ${todo.created_by_role.split('|for:')[1]}` : undefined}>
                      By <strong className="text-slate-600 font-bold">{todo.created_by_name}</strong>
                      {todo.created_by_role && todo.created_by_role.includes('|for:') && (
                        <span className="ml-1 text-[8px] bg-indigo-50 text-indigo-600 font-extrabold px-1 py-0.5 rounded border border-indigo-100 uppercase">
                          ➔ {todo.created_by_role.split('|for:')[1].split(' ')[0]}
                        </span>
                      )}
                    </span>
                    <span className="font-mono">{formatDate(todo.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add To-Do Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm uppercase">Add To-Do Checklist Task</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTodo} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">To-Do Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Audit daily fuel expenses"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 px-3 py-2 rounded-xl focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Display to Accounts User (Optional)</label>
                <select
                  value={targetAccountsUser}
                  onChange={(e) => setTargetAccountsUser(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-blue-300 focus:border-blue-500 px-3 py-2 rounded-xl focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="">All Accounts Users</option>
                  {employees
                    .filter(emp => emp.role.toLowerCase() === "accounts" || emp.role.toLowerCase().includes("accounts"))
                    .map(emp => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">If specified, only this accounts user, plus managers and admins, can see this task.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Task Description</label>
                <textarea
                  placeholder="Describe the objective, guidelines or steps to complete..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 px-3 py-2 rounded-xl focus:outline-none transition-colors resize-none"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2 px-4 bg-white border border-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest shadow-xs border border-blue-900 transition-all cursor-pointer"
                >
                  {isSubmitting ? "Creating..." : "Save To-Do"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit To-Do Modal */}
      {editingTodo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm uppercase">Edit To-Do details</h3>
              </div>
              <button
                onClick={() => setEditingTodo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">To-Do Task Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white hover:border-slate-300 focus:border-blue-500 px-3 py-2 rounded-xl focus:outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Task Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white hover:border-slate-300 focus:border-blue-500 px-3 py-2 rounded-xl focus:outline-none transition-all resize-none disabled:opacity-70 disabled:cursor-not-allowed"
                  required
                  disabled={editStatus === "Finished"}
                />
                {editStatus === "Finished" && (
                  <p className="text-[10px] text-amber-600 font-medium mt-1">
                    Description cannot be edited while status is Finished. Change status to Assigned first to unlock editing.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white hover:border-slate-300 focus:border-blue-500 px-3 py-2.5 rounded-xl focus:outline-none transition-all"
                  >
                    <option value="Assigned">Assigned</option>
                    <option value="Finished">Finished</option>
                  </select>
                </div>
              </div>

              {editStatus === "Finished" && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Resolution Remarks</label>
                  <textarea
                    placeholder="Enter details on what was completed..."
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white hover:border-slate-300 focus:border-indigo-500 px-3 py-2 rounded-xl focus:outline-none transition-all resize-none"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTodo(null)}
                  className="py-2 px-4 bg-white border border-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="py-2.5 px-5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest shadow-xs border border-blue-900 transition-all cursor-pointer"
                >
                  {isUpdating ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Finish Modal */}
      {finishingTodo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-sm uppercase">Mark Finished - #{finishingTodo.id}</h3>
              </div>
              <button
                onClick={() => setFinishingTodo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickFinishSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl">
                You are marking the task <strong>{finishingTodo.title}</strong> as completed. This action will be tracked in the change logs.
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Resolution Remarks</label>
                <textarea
                  placeholder="Describe what was done to complete this task..."
                  value={finishRemarks}
                  onChange={(e) => setFinishRemarks(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white hover:border-slate-300 focus:border-blue-500 px-3 py-2 rounded-xl focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFinishingTodo(null)}
                  className="py-2 px-4 bg-white border border-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFinishingSubmitting}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest shadow-xs border border-emerald-800 transition-all cursor-pointer"
                >
                  {isFinishingSubmitting ? "Completing..." : "Complete Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete To-Do Modal */}
      {deletingTodo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                <h3 className="font-extrabold text-slate-900 text-sm uppercase">Delete To-Do Task</h3>
              </div>
              <button
                onClick={() => setDeletingTodo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-red-50 border border-red-100 text-red-800 rounded-xl space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Warning: Irreversible Action
                </div>
                <p className="leading-relaxed mt-1 text-[11px]">
                  You are permanently deleting To-Do checklist item <strong>#{deletingTodo.id}</strong>. This cannot be undone.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingTodo(null)}
                  className="py-2 px-4 bg-white border border-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  No, Keep Task
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={isDeletingSubmitting}
                  className="py-2.5 px-5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest shadow-xs border border-red-800 transition-all cursor-pointer"
                >
                  {isDeletingSubmitting ? "Deleting..." : "Yes, Delete Task"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task History Modal popup */}
      {historyTodo && (
        <TodoHistoryModal
          todo={historyTodo}
          onClose={() => setHistoryTodo(null)}
        />
      )}

      {/* Detailed View Modal */}
      {viewingTodo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative flex flex-col animate-scale-up">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${
                  viewingTodo.status === "Finished" ? "bg-emerald-500" : "bg-amber-500"
                }`} />
                <span className="font-mono font-extrabold text-indigo-600 text-xs">TASK DETAILS - #{viewingTodo.id}</span>
              </div>
              <button
                onClick={() => setViewingTodo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Task Title</span>
                  <div>
                    {viewingTodo.status === "Assigned" && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[9px] font-extrabold text-amber-700 ring-1 ring-amber-200 uppercase tracking-wide">
                        Assigned
                      </span>
                    )}
                    {viewingTodo.status === "Finished" && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-extrabold text-emerald-700 ring-1 ring-emerald-200 uppercase tracking-wide">
                        Finished
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{viewingTodo.title}</h3>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Description</span>
                <p className="text-[11.5px] text-slate-600 font-normal leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100 max-h-48 overflow-y-auto">
                  {viewingTodo.description}
                </p>
              </div>

              {viewingTodo.status === "Finished" && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Resolution Remarks</span>
                  <p className="text-[11px] text-slate-700 italic break-words">
                    {viewingTodo.remarks || "No remarks provided"}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Assigned By</span>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-blue-50 border border-blue-100 flex items-center justify-center font-extrabold text-blue-600 text-[10px]">
                      {viewingTodo.created_by_name ? viewingTodo.created_by_name.charAt(0) : "S"}
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block text-[11px] leading-none mb-0.5">{viewingTodo.created_by_name}</span>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                          {viewingTodo.created_by_role ? viewingTodo.created_by_role.split('|')[0] : ""}
                        </span>
                        {viewingTodo.created_by_role && viewingTodo.created_by_role.includes('|for:') && (
                          <span className="text-[8px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md px-1.5 py-0.5 uppercase tracking-wider leading-none">
                            For: {viewingTodo.created_by_role.split('|for:')[1]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Date Created</span>
                  <span className="font-semibold text-slate-700 text-xs block mt-1">{formatDate(viewingTodo.created_at)}</span>
                </div>
              </div>

              {activeTab === "deleted" ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 space-y-1 text-[11px] text-slate-700 w-full animate-fade-in">
                  <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block">Deletion Archive Details</span>
                  <p className="leading-normal text-slate-500 italic">
                    This task has been archived.
                  </p>
                  <p className="leading-normal pt-1.5 border-t border-red-100">
                    Deleted by: <strong className="text-red-950 font-bold">{(viewingTodo as any).deleted_by || "System Admin"}</strong>
                  </p>
                  <p className="leading-normal">
                    Deleted at: <strong className="text-slate-800">{(viewingTodo as any).deleted_at ? formatDate((viewingTodo as any).deleted_at) : "N/A"}</strong>
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100 w-full">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Edit button */}
                    <button
                      onClick={() => {
                        handleOpenEdit(viewingTodo);
                        setViewingTodo(null);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl border border-slate-200 hover:border-blue-200 transition-all font-bold text-[9px] uppercase tracking-wide cursor-pointer shadow-3xs"
                      title="Edit task details"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>

                    {/* Quick finish action for pending/in progress tasks */}
                    {viewingTodo.status !== "Finished" && (
                      <button
                        onClick={() => {
                          setFinishingTodo(viewingTodo);
                          setViewingTodo(null);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl border border-slate-200 hover:border-emerald-200 transition-all font-bold text-[9px] uppercase tracking-wide cursor-pointer shadow-3xs"
                        title="Mark resolved"
                      >
                        <CheckSquare className="h-3 w-3" />
                        <span>Mark Finish</span>
                      </button>
                    )}

                    {/* Task History audit log button */}
                    <button
                      onClick={() => {
                        setHistoryTodo(viewingTodo);
                        setViewingTodo(null);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-700 rounded-xl border border-slate-200 hover:border-indigo-200 transition-all font-bold text-[9px] uppercase tracking-wide cursor-pointer shadow-3xs"
                      title="View history logs"
                    >
                      <span>History</span>
                    </button>
                  </div>

                  {/* DELETE BUTTON - ALLOWED FOR ADMIN */}
                  <button
                    onClick={() => {
                      setDeletingTodo(viewingTodo);
                      setViewingTodo(null);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 rounded-xl border border-slate-200 hover:border-red-100 transition-all font-bold text-[9px] uppercase tracking-wide cursor-pointer shadow-3xs"
                    title="Delete To-Do completely"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
