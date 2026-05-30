import React, { useState, useEffect } from "react";
import { 
  CheckCircle, Clock, AlertTriangle, Phone, Mail, 
  X, Cpu, Calendar, CheckSquare, MessageSquare, ArrowRight, Play, Check, Navigation, Package
} from "lucide-react";
import EmployeeTravelSection from "./EmployeeTravelSection";
import { Task, Employee } from "../types";

interface EmployeeDashboardProps {
  currentEmployee: { id: number; name: string; role: string };
  tasks: Task[];
  onAcceptTask: (taskId: number) => Promise<void>;
  onFinishTask: (taskId: number, remarks: string, km_travelled?: number) => Promise<void>;
  onUpdateRemarks: (taskId: number, remarks: string) => Promise<void>;
  onUpdatePassword?: (employeeId: number, newPassword: string) => Promise<void>;
  onUpdateMaterials?: (taskId: number, materials: string | null) => Promise<void>;
}

export default function EmployeeDashboard({
  currentEmployee,
  tasks,
  onAcceptTask,
  onFinishTask,
  onUpdateRemarks,
  onUpdatePassword,
  onUpdateMaterials
}: EmployeeDashboardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [remarksText, setRemarksText] = useState("");
  const [kmTravelled, setKmTravelled] = useState<number | "">("");
  const [editingRemarks, setEditingRemarks] = useState("");
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [showRemarksInput, setShowRemarksInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab ] = useState<"active" | "completed" | "travel">("active");
  const [petrolPrice, setPetrolPrice] = useState(100);
  
  // Custom materials logging states
  const [materialInput, setMaterialInput] = useState("");
  const [savingMaterials, setSavingMaterials] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return r.json();
      })
      .then(d => {
        setPetrolPrice(d?.petrol_price || 100);
      })
      .catch(err => {
        console.error("Failed to query settings:", err);
        setPetrolPrice(100);
      });
  }, []);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [empNewPassword, setEmpNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Offline Travel Log State
  const [isSubmittingOffline, setIsSubmittingOffline] = useState(false);

  const handleEmpPasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNewPassword.trim() || !onUpdatePassword) return;

    setIsUpdatingPassword(true);
    try {
      await onUpdatePassword(currentEmployee.id, empNewPassword.trim());
      setShowPasswordModal(false);
      setEmpNewPassword("");
      alert("Your password has been updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Keep records strictly belonging to current logged in Employee
  const myTasks = tasks.filter(t => t.assigned_to === currentEmployee.id);
  
  // Filter by status tab
  const activeMyTasks = myTasks.filter(t => t.status === "Pending" || t.status === "In Progress");
  const completedMyTasks = myTasks.filter(t => t.status === "Finished");

  // Limits and Month filtering support for employee's own tasks
  const [empTaskLimit, setEmpTaskLimit] = useState<number | "All">(10);
  const [empTaskSelectedMonth, setEmpTaskSelectedMonth] = useState<string>("All");

  const uniqueEmpTaskMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    myTasks.forEach(task => {
      const dateStr = task.assigned_at || task.accepted_at || task.finished_at;
      if (dateStr) {
        const match = dateStr.match(/^(\d{4}-\d{2})/);
        if (match) {
          monthsSet.add(match[1]);
        }
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [myTasks]);

  const formatEmpMonthKey = (monthKey: string) => {
    try {
      const [year, month] = monthKey.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleString("default", { month: "long", year: "numeric" });
    } catch {
      return monthKey;
    }
  };

  // Filtered lists
  const filteredActiveMyTasks = React.useMemo(() => {
    return activeMyTasks.filter(task => {
      if (empTaskSelectedMonth === "All") return true;
      const dateStr = task.assigned_at || task.accepted_at;
      return dateStr && dateStr.startsWith(empTaskSelectedMonth);
    });
  }, [activeMyTasks, empTaskSelectedMonth]);

  const filteredCompletedMyTasks = React.useMemo(() => {
    return completedMyTasks.filter(task => {
      if (empTaskSelectedMonth === "All") return true;
      const dateStr = task.finished_at || task.assigned_at;
      return dateStr && dateStr.startsWith(empTaskSelectedMonth);
    });
  }, [completedMyTasks, empTaskSelectedMonth]);

  const displayedMyTasks = React.useMemo(() => {
    const currentList = activeTab === "active" ? filteredActiveMyTasks : filteredCompletedMyTasks;
    if (empTaskLimit === "All") return currentList;
    return currentList.slice(0, Number(empTaskLimit));
  }, [activeTab, filteredActiveMyTasks, filteredCompletedMyTasks, empTaskLimit]);

  const handleOpenTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setRemarksText("");
    setKmTravelled("");
    setEditingRemarks(task.remarks || "");
    setShowRemarksInput(false);
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
    setRemarksText("");
    setKmTravelled("");
    setEditingRemarks("");
    setShowRemarksInput(false);
  };

  const handleSaveRemarks = async () => {
    if (!selectedTask || !onUpdateRemarks) return;

    setSavingRemarks(true);
    try {
      await onUpdateRemarks(selectedTask.id, editingRemarks.trim());
      setSelectedTask(prev => prev ? { ...prev, remarks: editingRemarks.trim() || null } : null);
      alert("Relational task remarks updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update remarks.");
    } finally {
      setSavingRemarks(false);
    }
  };

  const handleUpdateCarriedMaterials = async (newMaterials: string) => {
    if (!selectedTask || !onUpdateMaterials) return;
    setSavingMaterials(true);
    try {
      await onUpdateMaterials(selectedTask.id, newMaterials.trim() || null);
      setSelectedTask(prev => prev ? { ...prev, materials_carried: newMaterials.trim() || null } : null);
      setMaterialInput("");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update carrying materials.");
    } finally {
      setSavingMaterials(false);
    }
  };

  const handleAccept = async (taskId: number) => {
    try {
      await onAcceptTask(taskId);
      // Synchronize modal state with updated local task values
      const updatedTask = tasks.find(t => t.id === taskId);
      if (updatedTask) {
        setSelectedTask({ ...updatedTask, status: "In Progress", accepted_at: new Date().toISOString() });
      } else {
        handleCloseModal();
      }
    } catch (err) {
      console.error(err);
      alert("Error accepting task");
    }
  };

  const handleFinishCompletion = async (e: React.FormEvent, taskId: number) => {
    e.preventDefault();
    if (!remarksText || remarksText.trim() === "") {
      alert("Please enter a resolution remark explaining the fix.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onFinishTask(taskId, remarksText, kmTravelled === "" ? undefined : kmTravelled);
      handleCloseModal();
    } catch (err) {
      console.error(err);
      alert("Failed to submit remarks and close ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in py-4 text-slate-800">
      
      {/* Employee Intro card */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase bg-blue-50 text-blue-700 px-2.5 py-1 rounded border border-blue-100 font-bold">
              Active Dispatch Board
            </span>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-display font-extrabold text-slate-900 select-all">
                Welcome, {currentEmployee.name}
              </h2>
              {onUpdatePassword && (
                <button
                  type="button"
                  onClick={() => {
                    setEmpNewPassword("");
                    setShowPasswordModal(true);
                  }}
                  className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold tracking-wide uppercase rounded-lg border border-slate-300 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  Change Password
                </button>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1 font-sans font-medium">
              SPECIALIZATION: <strong className="text-blue-700 font-mono">{currentEmployee.role}</strong> (STAFF ID: #{currentEmployee.id})
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl border border-slate-300">
              <button
                 onClick={() => setActiveTab("active")}
                 className={`px-4 py-2 rounded-lg text-xs font-extrabold tracking-wide transition-all uppercase flex items-center gap-1.5 ${
                   activeTab === "active"
                     ? "bg-white text-blue-800 border border-slate-300 shadow-md"
                     : "text-slate-600 hover:text-slate-900"
                 }`}
               >
                 <Clock className="h-3.5 w-3.5" />
                 <span>Assigned ({activeMyTasks.length})</span>
               </button>
               <button
                 onClick={() => setActiveTab("completed")}
                 className={`px-4 py-2 rounded-lg text-xs font-extrabold tracking-wide transition-all uppercase flex items-center gap-1.5 ${
                   activeTab === "completed"
                     ? "bg-white text-emerald-700 border border-slate-300 shadow-md"
                     : "text-slate-600 hover:text-slate-900"
                 }`}
               >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Resolved ({completedMyTasks.length})</span>
              </button>
              <button
                 onClick={() => setActiveTab("travel")}
                 className={`px-4 py-2 rounded-lg text-xs font-extrabold tracking-wide transition-all uppercase flex items-center gap-1.5 ${
                   activeTab === "travel"
                     ? "bg-white text-purple-700 border border-slate-300 shadow-md"
                     : "text-slate-600 hover:text-slate-900"
                 }`}
               >
                <Navigation className="h-3.5 w-3.5" />
                <span>Travel Logs</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {activeTab === "travel" ? (
        <EmployeeTravelSection myTasks={myTasks} employeeId={currentEmployee.id} petrolPrice={petrolPrice} />
      ) : (
        <div className="space-y-4">
          {/* Month Filter and Record Limit row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-2xl text-xs animate-fade-in shadow-2xs">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-xl text-xs shrink-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Month:</span>
              <select
                value={empTaskSelectedMonth}
                onChange={(e) => setEmpTaskSelectedMonth(e.target.value)}
                className="bg-white border border-slate-200 text-slate-805 p-1 rounded-md text-[10.5px] font-extrabold focus:outline-none transition-all cursor-pointer font-sans"
              >
                <option value="All" className="font-bold">All Months</option>
                {uniqueEmpTaskMonths.map(m => (
                  <option key={m} value={m} className="font-bold">{formatEmpMonthKey(m)}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider">Show Limit:</span>
                <div className="flex gap-1">
                  {([5, 10, 20, "All"] as const).map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setEmpTaskLimit(num)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer border ${
                        empTaskLimit === num
                          ? "bg-slate-800 border-slate-800 text-white shadow-2xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-bold font-mono">
                Showing {displayedMyTasks.length} tasks
              </span>
            </div>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedMyTasks.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-sans italic text-sm font-medium">
              No service tickets matched for this dispatch section/month range.
            </div>
          ) : (
            displayedMyTasks.map((task) => {
            const isPending = task.status === "Pending";
            const isInProgress = task.status === "In Progress";
            const isFinished = task.status === "Finished";

            return (
              <div
                key={task.id}
                onClick={() => handleOpenTaskDetails(task)}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-500/50 hover:bg-slate-50/10 transition-all shadow-xs cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-1 bg-slate-100 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-indigo-500 transition-all" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs text-indigo-600 font-extrabold select-all">
                      #{task.id}
                    </span>
                    <div>
                      {isPending && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-200 uppercase tracking-wider">
                          New assigned
                        </span>
                      )}
                      {isInProgress && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[9px] font-bold text-blue-700 ring-1 ring-blue-200 uppercase tracking-wider animate-pulse">
                          In Progress
                        </span>
                      )}
                      {isFinished && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-200 uppercase tracking-wider">
                          Finished
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-display font-extrabold text-slate-900 text-sm select-all">
                    {task.customer_name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono select-all mt-1">
                    {task.contact_details.split("|")[0].trim()}
                  </p>
                  
                  <p className="text-xs text-slate-600 font-sans mt-3 line-clamp-3 select-all leading-relaxed">
                    {task.problem_reported}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span className="flex items-center gap-1 select-all">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {new Date(task.assigned_at).toLocaleDateString()}
                  </span>
                  <span className="text-blue-600 group-hover:text-blue-800 font-sans font-bold hover:underline flex items-center gap-0.5">
                    Inspect Ticket
                    <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </section>
        </div>
      )}


      {/* Task Diagnostic Detail Overlay Pop-up Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-text text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                <span className="font-mono text-xs text-blue-700 font-extrabold select-all">
                  SERVICING LOG #{selectedTask.id}
                </span>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Scroll */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Client General Metadata Context banner */}
              <div className="space-y-1 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-extrabold block">Client Context Details</p>
                <h4 className="text-base font-extrabold text-slate-900 select-all">
                  {selectedTask.customer_name}
                </h4>
                
                <div className="flex flex-col sm:flex-row gap-2 pt-1 text-xs text-slate-600 font-sans">
                  <a href={`tel:${selectedTask.contact_details.split("|")[0].trim()}`} className="flex items-center gap-1.5 hover:text-blue-600 select-all">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedTask.contact_details.split("|")[0].trim()}</span>
                  </a>
                  {selectedTask.contact_details.includes("|") && (
                    <span className="hidden sm:inline text-slate-300">|</span>
                  )}
                  {selectedTask.contact_details.includes("|") && (
                    <span className="flex items-center gap-1.5 select-all text-slate-500">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{selectedTask.contact_details.split("|")[1].trim()}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Problem Description */}
              <div className="space-y-1">
                <h5 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-mono">
                  Fault / Problem Diagnosis
                </h5>
                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed select-all">
                  {selectedTask.problem_reported}
                </p>
              </div>

              {/* Task Servicing Location Match */}
              <div className="space-y-1 bg-slate-50 p-4 border border-slate-200 rounded-xl font-sans">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-extrabold block">Customer Location Address</span>
                <p className="text-xs font-semibold text-slate-800">
                  {selectedTask.address || "N/A - No dispatch address was provided."}
                </p>
              </div>

              {/* Materials Carried for the Call */}
              <div className="space-y-2.5 bg-slate-50 p-4 border border-slate-200 rounded-xl font-sans">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] text-slate-500 font-mono uppercase tracking-widest font-bold flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-slate-500" />
                    Materials Carrying for this Call
                  </h5>
                  {selectedTask.materials_carried && (
                    <span className="text-[9px] font-mono text-slate-400 font-bold">
                      {selectedTask.materials_carried.split(",").filter(Boolean).length} logged
                    </span>
                  )}
                </div>

                {/* List of current materials */}
                {selectedTask.materials_carried ? (
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {selectedTask.materials_carried.split(",").map((mat, i) => {
                      const trimmedMat = mat.trim();
                      if (!trimmedMat) return null;
                      return (
                        <span key={i} className="inline-flex items-center gap-1 bg-blue-50/70 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-lg text-xs font-bold font-sans">
                          {trimmedMat}
                          <button 
                            type="button" 
                            onClick={() => {
                              const currentList = selectedTask.materials_carried?.split(",") || [];
                              const newList = currentList.filter((_, idx) => idx !== i).map(m => m.trim()).filter(Boolean).join(", ");
                              handleUpdateCarriedMaterials(newList);
                            }}
                            className="text-blue-400 hover:text-blue-700 font-extrabold text-[12px] ml-1 px-0.5 rounded cursor-pointer transition-colors"
                            title="Remove material"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[10.5px]">No materials carried logged yet. Add any spare parts, cables, or diagnostic tools you are carrying for this dispatch.</p>
                )}

                {/* Form to add material */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    id="material_input_field"
                    placeholder="e.g. Cat6 Cable, RAM (8GB)..."
                    value={materialInput}
                    onChange={(e) => setMaterialInput(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 text-slate-800 px-3 py-1.5 rounded-xl text-xs placeholder-slate-400 focus:outline-none transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!materialInput.trim()) return;
                        const current = selectedTask.materials_carried ? selectedTask.materials_carried + ", " + materialInput.trim() : materialInput.trim();
                        handleUpdateCarriedMaterials(current);
                      }
                    }}
                  />
                  <button
                    type="button"
                    id="add_material_btn_id"
                    onClick={() => {
                      if (!materialInput.trim()) return;
                      const current = selectedTask.materials_carried ? selectedTask.materials_carried + ", " + materialInput.trim() : materialInput.trim();
                      handleUpdateCarriedMaterials(current);
                    }}
                    disabled={savingMaterials || !materialInput.trim()}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all shadow-2xs cursor-pointer"
                  >
                    {savingMaterials ? "Saving..." : "Add Material"}
                  </button>
                </div>
              </div>

              {/* Service Remarks Section (Editable only AFTER task is finished to correct mistakes) */}
              {selectedTask.status === "Finished" ? (
                <div className="space-y-1.5 bg-slate-50 p-4 border border-slate-200 rounded-xl font-sans text-xs">
                  <h5 className="text-[10px] text-slate-500 font-mono uppercase tracking-widest font-bold flex items-center gap-1">
                    <MessageSquare className="h-4 w-4 text-indigo-600" />
                    Service Log Remarks (Edit to correct submit mistake)
                  </h5>
                  <textarea
                    value={editingRemarks}
                    onChange={(e) => setEditingRemarks(e.target.value)}
                    placeholder="Enter or update resolving remarks..."
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 text-slate-800 p-2.5 rounded-xl text-xs placeholder-slate-400 focus:outline-none transition-colors h-20 resize-none font-sans"
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleSaveRemarks}
                      disabled={savingRemarks}
                      className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      {savingRemarks ? "Saving..." : "Update Remark"}
                    </button>
                  </div>
                </div>
              ) : selectedTask.remarks ? (
                <div className="space-y-1.5 bg-slate-50 p-4 border border-slate-200 rounded-xl font-sans text-xs">
                  <h5 className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-bold flex items-center gap-1">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    Service Log Remarks (Read-Only)
                  </h5>
                  <p className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-sans select-all whitespace-pre-wrap">
                    {selectedTask.remarks}
                  </p>
                </div>
              ) : null}

              {/* Lifecycle Progress Status */}
              <div className="border-t border-slate-200 pt-4 space-y-2.5 font-mono text-[10px] text-slate-500">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold block">Relational Logs</span>
                <div className="space-y-2 text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
                    <span><strong>Assigned to Dispatch:</strong> {new Date(selectedTask.assigned_at).toLocaleString()}</span>
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
                      <span><strong>Task Completed & Closed:</strong> {new Date(selectedTask.finished_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Write remarks resolution form list */}
              {showRemarksInput && selectedTask.status === "In Progress" && (
                <form
                  onSubmit={(e) => handleFinishCompletion(e, selectedTask.id)}
                  className="space-y-3.5 pt-4 border-t border-slate-200 bg-slate-50 p-4 rounded-xl text-xs font-sans"
                >
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                    Completion & Remedial Remarks
                  </label>
                  <textarea
                    placeholder="Describe parts replaced, diagnostics run, or service tests performed to close ticket (e.g., Motherboard capacitor replaced successfully)..."
                    value={remarksText}
                    onChange={(e) => setRemarksText(e.target.value)}
                    rows={3}
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-500 text-slate-800 p-3 rounded-lg text-xs placeholder-slate-400 focus:outline-none transition-colors resize-none"
                    required
                  />

                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mt-2">
                    Distance Travelled (KM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="E.g. 15"
                    value={kmTravelled}
                    onChange={(e) => setKmTravelled(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-500 text-slate-800 p-3 rounded-lg text-xs placeholder-slate-400 focus:outline-none transition-colors"
                  />

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRemarksInput(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !remarksText.trim()}
                      className="px-4 py-1.5 rounded-lg text-white font-extrabold bg-emerald-700 hover:bg-emerald-800 text-xs transition-colors flex items-center gap-1.5 border border-emerald-800 shadow-md uppercase tracking-wider cursor-pointer"
                    >
                      {isSubmitting ? "Locking SQL..." : "Close & Complete Asset Repair"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer Controls */}
            {!showRemarksInput && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Back to Dashboard
                </button>

                {/* Accept Button -> Finish Button States */}
                {selectedTask.status === "Pending" && (
                  <button
                    type="button"
                    onClick={() => handleAccept(selectedTask.id)}
                    className="px-5 py-2 rounded-xl text-white font-extrabold bg-blue-700 hover:bg-blue-800 text-xs shadow-md flex items-center gap-1.5 transition-all border border-blue-800 uppercase tracking-wider cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Accept Service Ticket</span>
                  </button>
                )}

                {selectedTask.status === "In Progress" && (
                  <button
                    type="button"
                    onClick={() => setShowRemarksInput(true)}
                    className="px-5 py-2 rounded-xl text-white font-extrabold bg-emerald-700 hover:bg-emerald-800 text-xs shadow-md flex items-center gap-1.5 transition-all border border-emerald-800 uppercase tracking-wider cursor-pointer"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>Mark Finished</span>
                  </button>
                )}
                
                {selectedTask.status === "Finished" && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-xl font-bold font-sans">
                    <CheckSquare className="h-4 w-4" />
                    Ticket Resolved & SQL Locked
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔑 Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-2xl" />
            
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide flex items-center gap-1.5">
                <span>Update Your Password</span>
              </h4>
              <p className="text-xs text-slate-500 font-sans">
                Set a secure new password for your technical engineer portal login.
              </p>
            </div>

            <form onSubmit={handleEmpPasswordUpdate} className="space-y-3 pt-1">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                  New Password
                </label>
                <input
                  type="text"
                  placeholder="Enter secure new password"
                  value={empNewPassword}
                  onChange={(e) => setEmpNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors font-mono"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-extrabold text-slate-700 transition-colors shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="flex-1 py-2 px-3 rounded-xl text-white font-extrabold text-xs bg-blue-700 hover:bg-blue-800 transition-all border border-blue-800 active:scale-95 uppercase tracking-wide shadow-md cursor-pointer"
                >
                  {isUpdatingPassword ? "Saving..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
