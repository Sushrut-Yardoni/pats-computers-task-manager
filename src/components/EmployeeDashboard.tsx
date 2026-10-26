import React, { useState, useEffect } from "react";
import { 
  CheckCircle, Clock, AlertTriangle, Phone, Mail, 
  X, Cpu, Calendar, CheckSquare, MessageSquare, ArrowRight, Play, Check, Navigation, Package, FileArchive,
  User, ShieldAlert, ChevronLeft, ChevronRight, Menu, AlertCircle, Settings, Building,
  Shield, Laptop, Search, Bell, BellRing, Smartphone, Volume2, CheckCircle2, ShieldCheck, Music, Lock,
  Network
} from "lucide-react";
import EmployeeTravelSection from "./EmployeeTravelSection";
import { Task, Employee, Company, CompanyAsset, NetworkDiagramData } from "../types";
import CompanySection from "./CompanySection";
import { notificationManager } from "../utils/notificationManager";
import { extractCleanPhoneNumber, getCleanTelUri, extractSecondaryContact } from "../utils/phoneUtils";
import NotificationToneModal from "./NotificationToneModal";
import NotificationUnblockModal from "./NotificationUnblockModal";
import EngineerSoftwareKitModal from "./EngineerSoftwareKitModal";
import NetworkDiagramBuilder from "./NetworkDiagramBuilder";

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
  activeTab?: "active" | "completed" | "travel" | "profile" | "companies";
  onTabChange?: (tab: "active" | "completed" | "travel" | "profile" | "companies") => void;
  onTriggerTestNotification?: () => void;
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
  onTabChange,
  onTriggerTestNotification
}: EmployeeDashboardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [remarksText, setRemarksText] = useState("");
  const [kmTravelled, setKmTravelled] = useState<number | "">("");
  const [editingRemarks, setEditingRemarks] = useState("");
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [showRemarksInput, setShowRemarksInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [empDashToast, setEmpDashToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const showEmpDashToast = (message: string, isError = false) => {
    setEmpDashToast({ message, isError });
    setTimeout(() => setEmpDashToast(null), 3500);
  };

  // Android Mobile Floating Notification Permission State
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [dismissedNotifBanner, setDismissedNotifBanner] = useState<boolean>(false);
  const [isToneModalOpen, setIsToneModalOpen] = useState<boolean>(false);
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState<boolean>(false);
  const [isSoftwareKitOpen, setIsSoftwareKitOpen] = useState<boolean>(false);
  const [diagramModalCompany, setDiagramModalCompany] = useState<Company | null>(null);
  const [selectedToneDetails, setSelectedToneDetails] = useState(
    notificationManager.getSelectedToneDetails()
  );

  const handleSaveDiagramForCompany = async (data: { diagram_data: NetworkDiagramData; image_data?: string; notes?: string }) => {
    if (!diagramModalCompany) return;
    const payload: any = {
      diagram_data: data.diagram_data,
      notes: data.notes !== undefined ? data.notes : (diagramModalCompany.network_diagram_notes || null),
      updated_by: `${currentEmployee?.name || "Field Engineer"} (Field Engineer)`
    };
    if (data.image_data) {
      payload.image_data = data.image_data;
      payload.image_name = `${diagramModalCompany.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_topology.png`;
    }
    const resp = await fetch(`/api/companies/${diagramModalCompany.id}/network-diagram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save network diagram");
    }
    const updatedComp: Company = await resp.json();
    setDiagramModalCompany(updatedComp);
    showEmpDashToast(`Network topology saved for "${updatedComp.name}"!`);
    if (onSyncCompany) {
      await onSyncCompany();
    }
  };

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
    const onToneUpdate = () => {
      setSelectedToneDetails(notificationManager.getSelectedToneDetails());
    };
    const onPermChange = (e: any) => {
      const p =
        e.detail?.permission ||
        (typeof window !== "undefined" && "Notification" in window
          ? Notification.permission
          : "default");
      setNotifPermission(p);
      if (p === "granted") {
        notificationManager.subscribeToPushNotifications(currentEmployee.id);
      }
    };
    window.addEventListener("pats-tone-changed", onToneUpdate);
    window.addEventListener("pats-permission-changed", onPermChange);
    return () => {
      window.removeEventListener("pats-tone-changed", onToneUpdate);
      window.removeEventListener("pats-permission-changed", onPermChange);
    };
  }, [currentEmployee.id]);

  const handleRequestNotif = async () => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "denied"
    ) {
      setIsUnblockModalOpen(true);
      return;
    }
    const granted = await notificationManager.requestPermission();
    const currentPerm = notificationManager.getPermissionStatus();
    setNotifPermission(
      currentPerm === "granted" ? "granted" : currentPerm === "denied" ? "denied" : "default"
    );
    if (granted) {
      // Auto subscribe device for background push
      await notificationManager.subscribeToPushNotifications(currentEmployee.id);
      showEmpDashToast("Floating Mobile Notifications enabled successfully!");
      if (onTriggerTestNotification) {
        onTriggerTestNotification();
      }
    } else {
      if (currentPerm === "denied") {
        setIsUnblockModalOpen(true);
        showEmpDashToast(
          isStandalone
            ? "Notifications disabled in phone settings. Tap to unblock."
            : "Notification permission was blocked. Tap to view unblock steps.",
          true
        );
      }
    }
  };

  // Background Push Test & Older Android Guide States
  const [isTestingServerPush, setIsTestingServerPush] = useState(false);
  const [showOlderAndroidGuide, setShowOlderAndroidGuide] = useState(false);

  const handleServerPushTest = async () => {
    setIsTestingServerPush(true);
    try {
      await notificationManager.subscribeToPushNotifications(currentEmployee.id);
      const res = await notificationManager.triggerServerPushTest(currentEmployee.id);
      if (res.success) {
        showEmpDashToast("Push notification dispatched! Lock your screen or switch apps to verify.", false);
      } else {
        showEmpDashToast("Push test warning: " + res.message, true);
      }
    } catch (err: any) {
      showEmpDashToast("Push test failed: " + err.message, true);
    } finally {
      setIsTestingServerPush(false);
    }
  };

  const [internalActiveTab, setInternalActiveTab] = useState<"active" | "completed" | "travel" | "profile" | "companies">("active");
  const activeTab = propsActiveTab !== undefined ? propsActiveTab : internalActiveTab;
  const setActiveTab = onTabChange !== undefined ? onTabChange : setInternalActiveTab;
  const [companySectionKey, setCompanySectionKey] = useState(0);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [petrolPrice, setPetrolPrice] = useState(100);
  
  // Custom materials logging states
  const [materialInput, setMaterialInput] = useState("");
  const [savingMaterials, setSavingMaterials] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(async r => {
        if (!r.ok) return { petrol_price: 100 };
        const contentType = r.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return r.json();
        }
        return { petrol_price: 100 };
      })
      .then(d => {
        setPetrolPrice(d?.petrol_price || 100);
      })
      .catch(err => {
        console.warn("Using default settings value:", err);
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
      showEmpDashToast("Your profile details have been updated successfully!");
    } catch (err: any) {
      console.error(err);
      showEmpDashToast("Failed to update profile details: " + (err.message || err), true);
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
      showEmpDashToast("Your password has been updated successfully!");
    } catch (err: any) {
      console.error(err);
      showEmpDashToast(err.message || "Failed to update password", true);
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
        const isPending = task.status === "Pending" || !task.accepted_at;
        if (isPending) {
          const mComp = (task.company_name || task.customer_name || "").toLowerCase().includes(q);
          const mId = String(task.id).includes(q);
          if (!mComp && !mId) return false;
        } else {
          const m1 = task.customer_name?.toLowerCase().includes(q);
          const m2 = task.company_name?.toLowerCase().includes(q);
          const m3 = task.asset_id?.toLowerCase().includes(q);
          const m4 = task.problem_reported?.toLowerCase().includes(q);
          const m5 = task.address?.toLowerCase().includes(q);
          const m6 = String(task.id).includes(q);
          if (!m1 && !m2 && !m3 && !m4 && !m5 && !m6) return false;
        }
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
      showEmpDashToast("Relational task remarks updated successfully!");
    } catch (err: any) {
      console.error(err);
      showEmpDashToast(err.message || "Failed to update remarks.", true);
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
      showEmpDashToast("Materials updated successfully!");
    } catch (err: any) {
      console.error(err);
      showEmpDashToast(err.message || "Failed to update carrying materials.", true);
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
      } else if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, status: "In Progress", accepted_at: new Date().toISOString() } : null);
      } else {
        handleCloseModal();
      }
      showEmpDashToast("Task accepted and started!");
    } catch (err) {
      console.error(err);
      showEmpDashToast("Error accepting task", true);
    }
  };

  const handleFinishCompletion = async (e: React.FormEvent, taskId: number) => {
    e.preventDefault();
    if (!remarksText || remarksText.trim() === "") {
      showEmpDashToast("Please enter a resolution remark explaining the fix.", true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onFinishTask(taskId, remarksText, kmTravelled === "" ? undefined : kmTravelled);
      handleCloseModal();
      showEmpDashToast("Task completed and logged successfully!");
    } catch (err) {
      console.error(err);
      showEmpDashToast("Failed to submit remarks and close ticket.", true);
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
            onClick={() => {
              setActiveTab("companies");
              setCompanySectionKey(k => k + 1);
            }}
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
            onClick={() => setIsSoftwareKitOpen(true)}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all w-full shrink-0 cursor-pointer text-slate-600 hover:text-slate-800 border border-transparent font-medium hover:bg-slate-50"
            title="Open Software & Provisioning Kit"
          >
            <Package className="h-4 w-4 text-teal-600 shrink-0" />
            {!isSidebarCollapsed && <span className="font-sans font-bold">Software Kit</span>}
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSoftwareKitOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all shrink-0"
                title="Download software groups in ZIP or get license keys"
              >
                <FileArchive className="h-4 w-4" />
                <span>Software Kit (Download ZIP)</span>
              </button>
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
                    <ShieldAlert className="h-4 w-4 text-emerald-600" />
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

          {/* Card 3: Mobile, Desktop & Website Notifications Preferences */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-800">
                  Real-Time Alerts & Notification Engine
                </h4>
              </div>
              {notifPermission === "granted" ? (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Alerts Fully Active
                </span>
              ) : notifPermission === "denied" ? (
                <button
                  type="button"
                  onClick={() => setIsUnblockModalOpen(true)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-98 text-rose-700 border border-rose-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="Tap to view step-by-step unblock instructions"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                  <span>
                    {isStandalone
                      ? "Disabled in Phone Settings • Tap to Unblock"
                      : "Blocked in Browser • Tap to Unblock"}
                  </span>
                </button>
              ) : (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                  Permission Required
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              PATS provides synchronized alerts across <strong>Website view</strong>, <strong>Desktop view</strong>, and <strong>Mobile device downloaded view (PWA)</strong>. When tasks are assigned or transferred to you, your device plays a melodic chime, triggers high-impact vibration, flashes the browser tab, and delivers heads-up floating push notifications even when your device is locked.
            </p>

            {/* Diagnostics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="block text-[10px] text-slate-400 font-mono uppercase">Audio Engine</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Volume2 className="h-3 w-3 text-blue-600" />
                  Melodic Chime Ready
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="block text-[10px] text-slate-400 font-mono uppercase">Haptics</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Smartphone className="h-3 w-3 text-emerald-600" />
                  Vibration Active
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="block text-[10px] text-slate-400 font-mono uppercase">Background Push</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <BellRing className="h-3 w-3 text-indigo-600" />
                  FCM / Web Push
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="block text-[10px] text-slate-400 font-mono uppercase">App Badges</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="h-3 w-3 text-purple-600" />
                  OS Taskbar / Dock
                </span>
              </div>
            </div>

            {/* Personal Notification Tone Selector Bar for Mobile Download View & Desktop */}
            <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Music className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">
                      Personal Tone: {selectedToneDetails.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                      {selectedToneDetails.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {selectedToneDetails.tagline} • Mobile Downloaded App & Browser
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    notificationManager.unlockAudioEngine();
                    notificationManager.playTaskChime();
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Listen to active tone"
                >
                  <Volume2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsToneModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Music className="h-3.5 w-3.5" />
                  <span>Choose Right Tone</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {notifPermission === "denied" ? (
                <button
                  type="button"
                  onClick={() => setIsUnblockModalOpen(true)}
                  className="bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>
                    {isStandalone ? "Unblock in Phone Settings" : "Unblock Browser Notifications"}
                  </span>
                </button>
              ) : notifPermission !== "granted" ? (
                <button
                  type="button"
                  onClick={handleRequestNotif}
                  className="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>Enable System Notifications</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      notificationManager.unlockAudioEngine();
                      notificationManager.playTaskChime();
                      notificationManager.triggerVibration([400, 150, 400, 150, 600]);
                      if (onTriggerTestNotification) {
                        onTriggerTestNotification();
                      }
                      showEmpDashToast("Local notification, chime, and vibration triggered!");
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    title="Tests sound, vibration, tab alert, and in-app banner"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Test Local Alerts & Chime</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleServerPushTest}
                    disabled={isTestingServerPush}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    title="Sends a background push to verify delivery when phone screen is locked"
                  >
                    <BellRing className="h-3.5 w-3.5 text-blue-600" />
                    <span>{isTestingServerPush ? "Sending Server Push..." : "Test Background Device Push"}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setShowOlderAndroidGuide(!showOlderAndroidGuide)}
                className="text-blue-600 hover:text-blue-700 text-xs font-medium cursor-pointer py-2 hover:underline ml-auto"
              >
                {showOlderAndroidGuide ? "Hide device setup guide" : "Device notification optimization guide →"}
              </button>
            </div>

            {/* Expandable Device Setup Guide */}
            {showOlderAndroidGuide && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 text-xs text-slate-600 animate-in fade-in">
                <h5 className="font-semibold text-slate-800">
                  Device Setup & Background Delivery Guide (Mobile PWA, Desktop & Web)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-800 mb-1">1. Android Battery Optimization</p>
                    <p className="text-[11px] leading-relaxed">
                      Go to phone <strong>Settings → Apps → PATS Tasks (or Chrome) → Battery</strong> and select <strong>Unrestricted</strong> so Android doesn't put background push delivery to sleep.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-800 mb-1">2. Floating & Heads-up Banners</p>
                    <p className="text-[11px] leading-relaxed">
                      In <strong>App Info → Notifications</strong>, verify that <strong>Allow notifications</strong> and <strong>Pop on screen / Heads-up</strong> are toggled ON.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-800 mb-1">3. Desktop & Downloaded View</p>
                    <p className="text-[11px] leading-relaxed">
                      On Desktop (Chrome, Edge, Mac), verify Windows Focus Assist or Mac Do Not Disturb allows browser banners. For iPhone/iPad, use <strong>Share → Add to Home Screen</strong> to enable Push Notifications.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "travel" ? (
        <EmployeeTravelSection myTasks={myTasks} employeeId={currentEmployee.id} petrolPrice={petrolPrice} />

      ) : activeTab === "companies" ? (
        <CompanySection
          key={`engineer-company-section-${companySectionKey}`}
          companies={companies}
          assets={assets}
          employees={employees}
          currentUser={{ id: currentEmployee.id, name: currentEmployee.name, role: currentEmployee.role, type: "employee" }}
          defaultScopeFilter="my"
          onRefresh={async () => {
            if (onSyncCompany) {
              await onSyncCompany();
            }
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Polite, non-intrusive notification prompt if permission is pending */}
          {!dismissedNotifBanner && notifPermission !== "granted" && (
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 flex items-center justify-between gap-3 text-slate-800 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Bell className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="truncate">Enable device notifications to receive floating alerts whenever tasks are assigned to you.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRequestNotif}
                  className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Enable
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedNotifBanner(true)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
                  title="Dismiss banner"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

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
            const isPending = task.status === "Pending" || !task.accepted_at;
            const isInProgress = task.status === "In Progress";
            const isFinished = task.status === "Finished";

            // If task is not yet accepted, engineer sees ONLY the company name
            if (isPending) {
              return (
                <div
                  key={task.id}
                  onClick={() => handleOpenTaskDetails(task)}
                  className="bg-white border-2 border-amber-200/80 hover:border-blue-500 rounded-2xl p-5 hover:bg-slate-50/20 transition-all shadow-xs cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-1 bg-amber-400 group-hover:bg-blue-600 transition-all" />
                  
                  <div>
                    <div className="flex items-center justify-between mb-3.5 flex-wrap gap-1.5">
                      <span className="font-mono text-xs text-indigo-600 font-extrabold select-all">
                        #{task.id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-200 uppercase tracking-wider">
                          Pending Acceptance
                        </span>
                      </div>
                    </div>

                    {/* Display ONLY company name until accepted */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-extrabold text-blue-600 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                        <Building className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>Company</span>
                      </div>
                      <h3 className="font-display font-black text-slate-900 text-base leading-snug">
                        {task.company_name || task.customer_name || "Assigned Company"}
                      </h3>
                    </div>

                    {/* Locked notice for Engineer */}
                    <div className="mt-3.5 p-3.5 bg-blue-50/60 border border-blue-200/70 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[11px]">
                        <Lock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>Details Locked Until Accepted</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                        Accept this task to unlock customer contact person, phone number, site address, and reported problem.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1 select-all">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(task.assigned_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccept(task.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-[10.5px] shadow-sm flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Accept Task</span>
                      </button>
                      <span className="text-blue-600 group-hover:text-blue-800 font-sans font-bold hover:underline flex items-center gap-0.5 text-xs">
                        Inspect
                        <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

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
              
              {/* Task Details - If pending acceptance, engineer sees ONLY the company name */}
              {(selectedTask.status === "Pending" || !selectedTask.accepted_at) ? (
                <>
                  {/* Company Details Only Banner */}
                  <div className="space-y-3 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50 p-5 border border-blue-200/80 rounded-2xl font-sans">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] text-blue-700 font-mono uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                        <Building className="h-4 w-4 text-blue-600 shrink-0" />
                        Company Details
                      </span>
                      <span className="px-2.5 py-0.5 text-[9.5px] font-black uppercase rounded-md tracking-wider border flex items-center gap-1 bg-amber-50 text-amber-800 border-amber-300">
                        <Lock className="h-3 w-3 text-amber-600" />
                        Awaiting Technician Acceptance
                      </span>
                    </div>

                    <div className="pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">Assigned Company</span>
                      <h4 className="text-xl font-black text-slate-900 select-all mt-0.5">
                        {selectedTask.company_name || selectedTask.customer_name || "Assigned Company"}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-blue-200/60 flex items-center gap-2 text-xs text-slate-600">
                      <Lock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span className="text-[11px] font-medium leading-relaxed">
                        Customer contact person name, phone number, and email will be revealed immediately once you accept this ticket.
                      </span>
                    </div>
                  </div>

                  {/* Hardware Asset Privacy Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 font-sans">
                    <div className="p-2 bg-slate-100 text-slate-500 rounded-lg shrink-0">
                      <Lock className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-extrabold block">Hardware Asset Assigned</span>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        Target hardware model, specifications, device bay location, and IP address unlock upon accepting.
                      </p>
                    </div>
                  </div>

                  {/* Problem Diagnosis Privacy Card */}
                  <div className="space-y-1.5 bg-amber-50/50 border border-amber-200/80 p-4 rounded-xl font-sans">
                    <div className="flex items-center gap-1.5 text-amber-800">
                      <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono">
                        Reported Problem / Fault Diagnosis
                      </span>
                    </div>
                    <p className="text-xs text-amber-900/80 bg-white/90 border border-amber-200/60 p-3.5 rounded-xl leading-relaxed italic">
                      Problem description and fault diagnostics are hidden until task acceptance. Accept this ticket to view the reported problem and prepare required materials.
                    </p>
                  </div>

                  {/* Location Address Privacy Card */}
                  <div className="space-y-1 bg-slate-50 p-4 border border-slate-200 rounded-xl font-sans">
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-extrabold block">Customer Location Address</span>
                    <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                      <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="italic">Full dispatch address and navigation guidance will unlock after you accept this ticket.</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                      {extractCleanPhoneNumber(selectedTask.contact_details) && (
                        <a href={getCleanTelUri(selectedTask.contact_details)} className="flex items-center gap-1.5 hover:text-blue-600 select-all">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono font-extrabold tracking-wider text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-200/60 shadow-xs transition-all">
                            {extractCleanPhoneNumber(selectedTask.contact_details)}
                          </span>
                        </a>
                      )}
                      {extractSecondaryContact(selectedTask.contact_details) && (
                        <>
                          <span className="hidden sm:inline text-slate-300">|</span>
                          <span className="flex items-center gap-1.5 select-all text-slate-500">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span>{extractSecondaryContact(selectedTask.contact_details)}</span>
                          </span>
                        </>
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

                  {/* 🌐 Network Topology & Infrastructure Card */}
                  {(() => {
                    const matchedCompany = (selectedTask.company_id
                      ? companies.find(c => c.id === selectedTask.company_id)
                      : null) || companies.find(c => 
                        (c.name && selectedTask.company_name && c.name.trim().toLowerCase() === selectedTask.company_name.trim().toLowerCase()) ||
                        (c.name && selectedTask.customer_name && c.name.trim().toLowerCase() === selectedTask.customer_name.trim().toLowerCase())
                      );

                    if (!matchedCompany) return null;

                    const nodeCount = matchedCompany.network_diagram_data?.nodes?.length || 0;
                    const hasDiagram = !!matchedCompany.network_diagram_url || nodeCount > 0;

                    return (
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white space-y-3 font-sans shadow-md">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-600/30 border border-blue-500/40 text-blue-400 rounded-xl">
                              <Network className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="text-[9px] font-mono uppercase tracking-widest text-blue-400 font-extrabold block">
                                Network Topology & Architecture
                              </span>
                              <h5 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                                <span>{matchedCompany.name}</span>
                                {nodeCount > 0 ? (
                                  <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md">
                                    {nodeCount} Components Mapped
                                  </span>
                                ) : hasDiagram ? (
                                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                                    Diagram Active
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                    No Diagram Yet
                                  </span>
                                )}
                              </h5>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setDiagramModalCompany(matchedCompany)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <Network className="h-3.5 w-3.5" />
                            <span>{hasDiagram ? "Open Topology Builder" : "+ Build Topology Diagram"}</span>
                          </button>
                        </div>

                        {matchedCompany.network_diagram_notes && (
                          <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 text-[11px] font-mono text-slate-300 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap">
                            {matchedCompany.network_diagram_notes}
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
                </>
              )}

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
                {(selectedTask.status === "Pending" || !selectedTask.accepted_at) && (
                  <button
                    type="button"
                    onClick={() => handleAccept(selectedTask.id)}
                    className="px-6 py-2.5 rounded-xl text-white font-extrabold bg-blue-600 hover:bg-blue-700 active:scale-95 text-xs shadow-md flex items-center gap-2 transition-all border border-blue-700 uppercase tracking-wider cursor-pointer"
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

      {/* 🔔 Floating In-App Toast Notification */}
      {empDashToast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border transition-all animate-bounce-subtle ${
          empDashToast.isError 
            ? "bg-rose-900 text-white border-rose-700 shadow-rose-900/30" 
            : "bg-emerald-900 text-white border-emerald-700 shadow-emerald-900/30"
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{empDashToast.message}</span>
          <button 
            type="button" 
            onClick={() => setEmpDashToast(null)}
            className="ml-2 hover:opacity-75 cursor-pointer text-white/80"
          >
            ✕
          </button>
        </div>
      )}

      {/* 🎵 Personal Notification Tone Modal */}
      <NotificationToneModal
        isOpen={isToneModalOpen}
        onClose={() => setIsToneModalOpen(false)}
        onToneSaved={(tone) => {
          setSelectedToneDetails(tone);
          showEmpDashToast(`Personal notification tone set to "${tone.name}"!`);
        }}
      />

      {/* 🛡️ Notification Unblock Instructions Modal for Phone & Browser */}
      <NotificationUnblockModal
        isOpen={isUnblockModalOpen}
        onClose={() => setIsUnblockModalOpen(false)}
        onUnblocked={() => {
          setNotifPermission("granted");
          notificationManager.subscribeToPushNotifications(currentEmployee.id);
          showEmpDashToast("Device notifications unblocked and fully active!");
        }}
      />

      {/* 📦 IT Provisioning Kit Modal for Field Engineers */}
      <EngineerSoftwareKitModal
        isOpen={isSoftwareKitOpen}
        onClose={() => setIsSoftwareKitOpen(false)}
      />

      {/* 🌐 Network Topology & Diagram Builder Modal */}
      {diagramModalCompany && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-7xl h-[92vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col relative">
            <NetworkDiagramBuilder
              company={diagramModalCompany}
              currentUser={{ name: currentEmployee.name, role: currentEmployee.role, id: currentEmployee.id }}
              onSaveDiagram={handleSaveDiagramForCompany}
              onClose={() => setDiagramModalCompany(null)}
              readOnly={false}
            />
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
