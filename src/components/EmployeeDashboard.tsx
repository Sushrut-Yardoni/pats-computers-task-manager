import React, { useState, useEffect } from "react";
import { 
  CheckCircle, Clock, AlertTriangle, Phone, Mail, 
  X, Cpu, Calendar, CheckSquare, MessageSquare, ArrowRight, Play, Check, Navigation, Package,
  User, ShieldAlert, ChevronLeft, ChevronRight, Menu, AlertCircle, Settings, Building,
  Shield, Laptop, Search
} from "lucide-react";
import EmployeeTravelSection from "./EmployeeTravelSection";
import { Task, Employee, Company, CompanyAsset } from "../types";
import CompanySection from "./CompanySection";
import AttendanceSection from "./AttendanceSection";

interface EmployeeDashboardProps {
  currentEmployee: { id: number; name: string; role: string };
  employees: Employee[];
  tasks: Task[];
  companies: Company[];
  assets: CompanyAsset[];
  onSyncCompany?: () => Promise<void>;
  onAcceptTask: (taskId: number) => Promise<void>;
  onFinishTask: (taskId: number, remarks: string, km_travelled?: number) => Promise<void>;
  onUpdateRemarks: (taskId: number, remarks: string) => Promise<void>;
  onUpdatePassword?: (employeeId: number, newPassword: string) => Promise<void>;
  onUpdateMaterials?: (taskId: number, materials: string | null) => Promise<void>;
  onUpdateProfile?: (employeeId: number, profileData: Partial<Employee>) => Promise<void>;
  activeTab?: "active" | "completed" | "travel" | "profile" | "attendance" | "companies";
  onTabChange?: (tab: "active" | "completed" | "travel" | "profile" | "attendance" | "companies") => void;
}

export default function EmployeeDashboard({
  currentEmployee,
  employees,
  tasks,
  companies,
  assets,
  onSyncCompany,
  onAcceptTask,
  onFinishTask,
  onUpdateRemarks,
  onUpdatePassword,
  onUpdateMaterials,
  onUpdateProfile,
  activeTab: propsActiveTab,
  onTabChange
}: EmployeeDashboardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [remarksText, setRemarksText] = useState("");
  const [kmTravelled, setKmTravelled] = useState<number | "">("");
  const [editingRemarks, setEditingRemarks] = useState("");
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [showRemarksInput, setShowRemarksInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [internalActiveTab, setInternalActiveTab] = useState<"active" | "completed" | "travel" | "profile" | "attendance" | "companies">("active");
  const activeTab = propsActiveTab !== undefined ? propsActiveTab : internalActiveTab;
  const setActiveTab = onTabChange !== undefined ? onTabChange : setInternalActiveTab;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const [empNewPassword, setEmpNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Offline Travel Log State
  const [isSubmittingOffline, setIsSubmittingOffline] = useState(false);

  // Profile Editable Details states
  const fullEmployeeInfo = employees.find(e => e.id === currentEmployee.id) || currentEmployee;

  const [profPhone, setProfPhone] = useState("");
  const [profBloodGroup, setProfBloodGroup] = useState("");
  const [profEmergencyContact, setProfEmergencyContact] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (fullEmployeeInfo) {
      setProfPhone((fullEmployeeInfo as any).phone || "");
      setProfBloodGroup((fullEmployeeInfo as any).blood_group || "");
      setProfEmergencyContact((fullEmployeeInfo as any).emergency_contact || "");
    }
  }, [
    fullEmployeeInfo.id,
    (fullEmployeeInfo as any).phone,
    (fullEmployeeInfo as any).blood_group,
    (fullEmployeeInfo as any).emergency_contact
  ]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateProfile) return;

    setProfileSaving(true);
    try {
      await onUpdateProfile(currentEmployee.id, {
        phone: profPhone.trim() || null,
        blood_group: profBloodGroup.trim() || null,
        emergency_contact: profEmergencyContact.trim() || null
      });
      alert("Your profile details have been updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to update profile details: " + (err.message || err));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleEmpPasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNewPassword.trim() || !onUpdatePassword) return;

    setIsUpdatingPassword(true);
    try {
      await onUpdatePassword(currentEmployee.id, empNewPassword.trim());
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

  // Search and AMC / Non-AMC classification filters
  const [empSearchQuery, setEmpSearchQuery] = useState("");
  const [empContractFilter, setEmpContractFilter] = useState<"All" | "AMC" | "Non AMC">("All");

  // Filtered lists
  const filteredActiveMyTasks = React.useMemo(() => {
    return activeMyTasks.filter(task => {
      if (empTaskSelectedMonth !== "All") {
        const dateStr = task.assigned_at || task.accepted_at;
        if (!dateStr || !dateStr.startsWith(empTaskSelectedMonth)) return false;
      }
      if (empContractFilter !== "All") {
        const cType = task.contract_type || "AMC";
        if (cType !== empContractFilter) return false;
      }
      if (empSearchQuery.trim()) {
        const q = empSearchQuery.toLowerCase();
        const m1 = task.customer_name?.toLowerCase().includes(q);
        const m2 = task.company_name?.toLowerCase().includes(q);
        const m3 = task.asset_id?.toLowerCase().includes(q);
        const m4 = task.problem_reported?.toLowerCase().includes(q);
        const m5 = task.address?.toLowerCase().includes(q);
        const m6 = String(task.id).includes(q);
        if (!m1 && !m2 && !m3 && !m4 && !m5 && !m6) return false;
      }
      return true;
    });
  }, [activeMyTasks, empTaskSelectedMonth, empContractFilter, empSearchQuery]);

  const filteredCompletedMyTasks = React.useMemo(() => {
    return completedMyTasks.filter(task => {
      if (empTaskSelectedMonth !== "All") {
        const dateStr = task.finished_at || task.assigned_at;
        if (!dateStr || !dateStr.startsWith(empTaskSelectedMonth)) return false;
      }
      if (empContractFilter !== "All") {
        const cType = task.contract_type || "AMC";
        if (cType !== empContractFilter) return false;
      }
      if (empSearchQuery.trim()) {
        const q = empSearchQuery.toLowerCase();
        const m1 = task.customer_name?.toLowerCase().includes(q);
        const m2 = task.company_name?.toLowerCase().includes(q);
        const m3 = task.asset_id?.toLowerCase().includes(q);
        const m4 = task.problem_reported?.toLowerCase().includes(q);
        const m5 = task.address?.toLowerCase().includes(q);
        const m6 = String(task.id).includes(q);
        if (!m1 && !m2 && !m3 && !m4 && !m5 && !m6) return false;
      }
      return true;
    });
  }, [completedMyTasks, empTaskSelectedMonth, empContractFilter, empSearchQuery]);

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

        {/* Sidebar Banner / Header */}
        <div className="p-4.5 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-50 to-indigo-50 p-2.5 rounded-xl text-blue-600 shrink-0 border border-blue-100/50">
            <Cpu className="h-5 w-5 animate-pulse" />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <span className="block text-xs font-extrabold uppercase tracking-wide text-slate-800 truncate" title={currentEmployee.name}>
                {currentEmployee.name}
              </span>
              <span className="block text-[10px] text-slate-400 font-medium truncate">Engineer ID: #{currentEmployee.id}</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 flex flex-row md:flex-col gap-1 w-full overflow-x-auto md:overflow-x-visible">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer relative ${
              activeTab === "active"
                ? "bg-blue-50 text-blue-800 border border-blue-100 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <div className="relative flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-blue-600" />
              {isSidebarCollapsed && activeMyTasks.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-100 text-blue-805 text-[8.5px] font-extrabold px-1 rounded-full min-w-[14px] h-[14px] flex items-center justify-center">
                  {activeMyTasks.length}
                </span>
              )}
            </div>
            {!isSidebarCollapsed && (
              <span className="font-sans flex items-center justify-between w-full">
                <span>Active Tickets</span>
                <span className="bg-blue-100/60 text-blue-805 px-1.5 py-0.5 rounded text-[9px] font-bold">
                  {activeMyTasks.length}
                </span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "completed"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-100 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-800 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            {!isSidebarCollapsed && (
              <span className="font-sans flex items-center justify-between w-full">
                <span>Completed History</span>
                <span className="bg-emerald-100/60 text-emerald-805 px-1.5 py-0.5 rounded text-[9px] font-bold">
                  {completedMyTasks.length}
                </span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "attendance"
                ? "bg-amber-50 text-amber-805 border border-amber-100 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-800 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <Clock className="h-4 w-4 text-amber-605 shrink-0" />
            {!isSidebarCollapsed && <span className="font-sans">Punch Attendance</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("travel")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "travel"
                ? "bg-purple-50 text-purple-800 border border-purple-100 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-800 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <Navigation className="h-4 w-4 text-purple-600 shrink-0" />
            {!isSidebarCollapsed && <span className="font-sans">Travel & Fuel Logs</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("companies")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "companies"
                ? "bg-indigo-50 text-indigo-800 border border-indigo-100 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-800 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <Building className="h-4 w-4 text-indigo-600 shrink-0" />
            {!isSidebarCollapsed && <span className="font-sans">Company Assets</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer ${
              activeTab === "profile"
                ? "bg-indigo-50 text-indigo-800 border border-indigo-100 font-extrabold shadow-2xs"
                : "text-slate-600 hover:text-slate-800 border border-transparent font-medium hover:bg-slate-50"
            }`}
          >
            <Settings className="h-4 w-4 text-indigo-650 shrink-0" />
            {!isSidebarCollapsed && <span className="font-sans">Settings</span>}
          </button>
        </nav>
      </aside>

      {/* 🖥️ Main Workspace Content Area */}
      <div className="flex-1 w-full space-y-6">
        {/* Workspace Intro Card */}
        {activeTab === "active" && (
          <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-display font-extrabold text-slate-900 select-all">
                Welcome, {currentEmployee.name}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-sans font-medium">
                Employee ID: #{currentEmployee.id}
              </p>
            </div>
          </section>
        )}

        {/* Conditional Screen Page Renders */}
        {activeTab === "profile" ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-display font-bold text-slate-800">My Professional Identity</h3>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-slate-800">
              {/* Name (Read-only) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullEmployeeInfo.name}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 text-slate-500 px-3 py-2 rounded-xl text-xs cursor-not-allowed font-medium"
                />
              </div>

              {/* Designation / Role (Read-only) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Designation</label>
                <input
                  type="text"
                  value={fullEmployeeInfo.role}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 text-slate-500 px-3 py-2 rounded-xl text-xs cursor-not-allowed font-medium"
                />
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company Email</label>
                <input
                  type="text"
                  value={(fullEmployeeInfo as any).email_id || ""}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 text-slate-500 px-3 py-2 rounded-xl text-xs cursor-not-allowed font-medium font-mono"
                />
              </div>

              {/* Phone (Editable) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-805 px-3 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none transition-all font-mono"
                />
              </div>

              {/* Blood Group (Editable) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Blood Group</label>
                <select
                  value={profBloodGroup}
                  onChange={(e) => setProfBloodGroup(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-805 px-3 py-2 rounded-xl text-xs focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              {/* Emergency Contact No. (Editable) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Emergency Contact</label>
                <input
                  type="text"
                  placeholder="e.g. Spouse / Parent Contact info"
                  value={profEmergencyContact}
                  onChange={(e) => setProfEmergencyContact(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-805 px-3 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none transition-all font-mono"
                />
              </div>


            </div>

            <div className="flex justify-end items-center pt-2 border-t border-slate-100 flex-wrap gap-2 text-slate-800">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-extrabold uppercase tracking-widest leading-none shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {profileSaving ? (
                  <div className="w-3" />
                ) : (
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                )}
                <span>{profileSaving ? "Saving..." : "Save My Details"}</span>
              </button>
            </div>
          </form>

          {/* Card 2: Portal Security Options (Satisfies: "move the Change password button on the profile page.") */}
          {onUpdatePassword && (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4 pt-5">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold uppercase text-slate-800 tracking-wide flex items-center gap-1.5 font-sans">
                    <ShieldAlert className="h-4 w-4 text-emerald-600 animate-pulse" />
                    Workstation Security & Login Details
                  </h4>
                </div>
              </div>

              <form onSubmit={handleEmpPasswordUpdate} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 min-w-0 w-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Set Secure New Password</label>
                  <input
                    type="password"
                    placeholder="Enter raw plain-text password to hash & store..."
                    value={empNewPassword}
                    onChange={(e) => setEmpNewPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-indigo-500 text-slate-800 px-3 py-2.5 rounded-xl text-xs placeholder-slate-400 focus:outline-none transition-all font-mono"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingPassword || !empNewPassword.trim()}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl text-xs font-extrabold uppercase tracking-wider leading-none transition-all h-10 shrink-0 cursor-pointer shadow-sm border border-slate-950 font-sans"
                >
                  {isUpdatingPassword ? "Encrypting SQL..." : "Update Portal Password"}
                </button>
              </form>
            </div>
          )}
        </div>
      ) : activeTab === "travel" ? (
        <EmployeeTravelSection myTasks={myTasks} employeeId={currentEmployee.id} petrolPrice={petrolPrice} />
      ) : activeTab === "attendance" ? (
        <AttendanceSection 
          currentUser={{ id: currentEmployee.id, name: currentEmployee.name, role: currentEmployee.role, type: "employee" }}
          employees={employees}
        />
      ) : activeTab === "companies" ? (
        <CompanySection
          companies={companies}
          assets={assets}
          employees={employees}
          currentUser={{ id: currentEmployee.id, name: currentEmployee.name, role: currentEmployee.role, type: "employee" }}
          onRefresh={async () => {
            if (onSyncCompany) {
              await onSyncCompany();
            }
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Search, Contract Type Filter, Month Filter and Record Limit row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-2xl text-xs animate-fade-in shadow-2xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search company, customer, asset ID, problem..."
                  value={empSearchQuery}
                  onChange={(e) => setEmpSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              {/* AMC / Non-AMC Filter buttons */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setEmpContractFilter("All")}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                    empContractFilter === "All"
                      ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setEmpContractFilter("AMC")}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    empContractFilter === "AMC"
                      ? "bg-emerald-600 text-white shadow-2xs font-extrabold"
                      : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  <Shield className="h-3 w-3" />
                  <span>AMC</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEmpContractFilter("Non AMC")}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    empContractFilter === "Non AMC"
                      ? "bg-amber-600 text-white shadow-2xs font-extrabold"
                      : "text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  <Building className="h-3 w-3" />
                  <span>Non-AMC</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-between lg:justify-end">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-xl text-xs">
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

              <div className="flex items-center gap-2">
                <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider">Limit:</span>
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
                {displayedMyTasks.length} task{displayedMyTasks.length === 1 ? "" : "s"}
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
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-1.5">
                    <span className="font-mono text-xs text-indigo-600 font-extrabold select-all">
                      #{task.id}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {task.contract_type && (
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide border ${
                          task.contract_type === "AMC"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {task.contract_type === "AMC" ? <Shield className="h-3 w-3" /> : <Building className="h-3 w-3" />}
                          {task.contract_type}
                        </span>
                      )}
                      {task.asset_id && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-mono font-bold text-indigo-700 border border-indigo-200">
                          <Laptop className="h-3 w-3" />
                          Asset: #{task.asset_id}
                        </span>
                      )}
                      {task.is_priority && (
                        <span className="inline-flex items-center rounded-md bg-rose-50 px-1.5 py-0.5 text-[8.5px] font-extrabold text-rose-700 ring-1 ring-rose-200 uppercase tracking-wide">
                          🚨 Priority
                        </span>
                      )}
                      {task.is_repeat && (
                        <span className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-[8.5px] font-extrabold text-purple-700 ring-1 ring-purple-200 uppercase tracking-wide">
                          🔄 Repeat Call
                        </span>
                      )}
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

                  {task.company_name && task.company_name !== task.customer_name && (
                    <div className="text-[10.5px] font-bold text-slate-500 flex items-center gap-1 mb-0.5">
                      <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{task.company_name}</span>
                    </div>
                  )}

                  <h3 className="font-display font-extrabold text-slate-900 text-sm select-all">
                    {task.customer_name}
                  </h3>

                  {/* Problem Description callout */}
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 font-mono block">
                      Problem Reported:
                    </span>
                    <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed select-all" title={task.problem_reported}>
                      {task.problem_reported}
                    </p>
                  </div>

                  {task.address && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px] text-slate-500 font-sans truncate">
                      <Navigation className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{task.address}</span>
                    </div>
                  )}
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
              
              {/* Client & Contract Context Banner */}
              <div className="space-y-2 bg-slate-50 p-4 border border-slate-200 rounded-xl font-sans">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-extrabold block">
                    Client Context Details
                  </span>
                  {selectedTask.contract_type && (
                    <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-md tracking-wider border flex items-center gap-1 ${
                      selectedTask.contract_type === "AMC"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-amber-50 text-amber-800 border-amber-300"
                    }`}>
                      {selectedTask.contract_type === "AMC" ? <Shield className="h-3 w-3 text-emerald-600" /> : <Building className="h-3 w-3 text-amber-600" />}
                      <span>{selectedTask.contract_type === "AMC" ? "AMC Contract Client" : "Non-AMC Direct Support"}</span>
                    </span>
                  )}
                </div>

                {selectedTask.company_name && selectedTask.company_name !== selectedTask.customer_name && (
                  <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pt-0.5">
                    <Building className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Company: <strong className="text-slate-900 font-extrabold">{selectedTask.company_name}</strong></span>
                  </div>
                )}

                <h4 className="text-base font-extrabold text-slate-900 select-all">
                  {selectedTask.customer_name}
                </h4>
                
                <div className="flex flex-col sm:flex-row gap-2 pt-1 text-xs text-slate-600 font-sans">
                  <a href={`tel:${selectedTask.contact_details.split("|")[0].trim()}`} className="flex items-center gap-1.5 hover:text-blue-600 select-all">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-mono font-extrabold tracking-wider text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-200/60 shadow-xs transition-all">{selectedTask.contact_details.split("|")[0].trim()}</span>
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

              {/* Hardware Asset Technical Specifications Card */}
              {(() => {
                const matchedAsset = selectedTask.asset_id ? (
                  assets.find(a => (selectedTask.company_id ? a.company_id === selectedTask.company_id : true) && a.asset_id?.toLowerCase() === selectedTask.asset_id?.toLowerCase()) ||
                  assets.find(a => a.asset_id?.toLowerCase() === selectedTask.asset_id?.toLowerCase())
                ) : null;

                return (
                  <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-xl p-4 space-y-3 font-sans">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                          <Laptop className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-600 font-extrabold block">Hardware Asset Assigned</span>
                          <h5 className="font-mono text-sm font-black text-indigo-950">
                            {selectedTask.asset_id ? `Asset ID: #${selectedTask.asset_id}` : "General Support Call (No Asset ID)"}
                          </h5>
                        </div>
                      </div>
                      {selectedTask.asset_id && (
                        <span className={`px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md border ${
                          (matchedAsset?.amc_status || (selectedTask.contract_type === "Non AMC" ? "Not in AMC" : "In AMC")) === "Not in AMC"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300"
                        }`}>
                          {matchedAsset?.amc_status || (selectedTask.contract_type === "Non AMC" ? "Not in AMC" : "In AMC")}
                        </span>
                      )}
                    </div>

                    {matchedAsset ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white/80 border border-indigo-100 p-3 rounded-xl">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-mono">Device Type / Model</span>
                          <p className="font-bold text-slate-800">{matchedAsset.asset || "Computer"} - {matchedAsset.model_no || matchedAsset.comp_name || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-mono">Assigned User / Employee</span>
                          <p className="font-bold text-slate-800">{matchedAsset.employee_name || "Unassigned"}</p>
                        </div>
                        {matchedAsset.location && (
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-mono">Location / Workstation Bay</span>
                            <p className="font-medium text-slate-700">{matchedAsset.location}</p>
                          </div>
                        )}
                        {matchedAsset.ip_address && (
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-mono">IP Address</span>
                            <p className="font-mono text-slate-700">{matchedAsset.ip_address}</p>
                          </div>
                        )}
                        {matchedAsset.os && (
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-mono">Operating System</span>
                            <p className="font-medium text-slate-700">{matchedAsset.os}</p>
                          </div>
                        )}
                        {(matchedAsset.config_processor || matchedAsset.config_ram) && (
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-mono">Hardware Specs</span>
                            <p className="font-medium text-slate-700">{[matchedAsset.config_processor, matchedAsset.config_ram, matchedAsset.config_storage].filter(Boolean).join(" / ")}</p>
                          </div>
                        )}
                      </div>
                    ) : selectedTask.asset_id ? (
                      <div className="bg-white/80 border border-indigo-100 p-3 rounded-xl text-xs">
                        <p className="text-slate-700 font-medium">
                          Target Hardware Tag: <strong className="font-mono text-indigo-700 font-bold select-all">#{selectedTask.asset_id}</strong>
                        </p>
                        <p className="text-[10.5px] text-slate-400 mt-0.5">Please locate and verify this hardware asset serial or tag on-site with the client.</p>
                      </div>
                    ) : (
                      <div className="bg-white/80 border border-indigo-100 p-2.5 rounded-xl text-xs text-slate-500 italic">
                        No specific hardware Asset ID was registered for this service ticket.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Problem Reported / Fault Diagnosis Card */}
              <div className="space-y-1.5 bg-red-50/40 border border-red-200/80 p-4 rounded-xl font-sans">
                <div className="flex items-center gap-1.5 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono">
                    Reported Problem / Fault Diagnosis
                  </span>
                </div>
                <p className="text-xs text-slate-800 bg-white border border-red-100 p-3.5 rounded-xl leading-relaxed select-all font-medium whitespace-pre-wrap">
                  {selectedTask.problem_reported}
                </p>
              </div>

              {/* Task Servicing Location Match */}
              <div className="space-y-1 bg-slate-50 p-4 border border-slate-200 rounded-xl font-sans">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-extrabold block">Customer Location Address</span>
                <p className="text-xs font-semibold text-slate-800 select-all">
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

                  {selectedTask.is_repeat && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl text-xs flex items-start gap-2.5 mt-2.5 select-none">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
                      <div>
                        <strong className="font-extrabold block text-amber-950 text-[10.5px] uppercase tracking-wide">⛽ No Petrol Allowed</strong>
                        <p className="text-[10px] mt-0.5 leading-relaxed font-sans font-semibold">This dispatch ticket is designated as a <strong className="text-amber-950 font-bold">Repeat Call</strong>. Please note that no petrol/fuel allocation or travel rate calculations will be assigned or reimbursed.</p>
                      </div>
                    </div>
                  )}

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

      </div>
    </div>
  );
}
