import React, { useState, useEffect, useRef } from "react";
import { Laptop, Cpu, Terminal, Users, Shield, RefreshCw, AlertCircle, Database } from "lucide-react";
import { Employee, Task, SqlLog, Company, CompanyAsset } from "./types";
import Header from "./components/Header";
import LoginScreen from "./components/LoginScreen";
import AdminDashboard from "./components/AdminDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import AccountsDashboard from "./components/AccountsDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import FloatingTaskNotification from "./components/FloatingTaskNotification";
import { notificationManager } from "./utils/notificationManager";

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sqlLogs, setSqlLogs] = useState<SqlLog[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assets, setAssets] = useState<CompanyAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Authentication session state
  const [currentUser, setCurrentUser] = useState<
    { type: "admin"; email_id?: string } | { type: "employee"; id: number; name: string; role: string; email_id?: string } | null
  >(null);

  // Focus utility trigger for the SQL console shell
  const [isSqlConsoleFocused, setIsSqlConsoleFocused] = useState(false);

  // Employee active view partition (synchronized to allow Header Settings to open Profile)
  const [employeeActiveTab, setEmployeeActiveTab] = useState<"active" | "completed" | "travel" | "profile" | "attendance" | "companies">("active");

  // Floating assigned task notification state for service engineers
  const [floatingTask, setFloatingTask] = useState<Task | null>(null);
  const seenTaskIdsRef = useRef<Set<number>>(new Set());
  const initialTaskSyncDoneRef = useRef(false);

  const [appNotice, setAppNotice] = useState<{ message: string; isError?: boolean } | null>(null);
  const showAppNotice = (message: string, isError = false) => {
    setAppNotice({ message, isError });
    setTimeout(() => setAppNotice(null), 4000);
  };

  // Fetch critical relational tables via the single unified sync endpoint
  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setDbError(null);
    try {
      const resp = await fetch("/api/sync");

      if (!resp.ok) {
        throw new Error("Relational server connection error. Make sure the backend dev server has booted up.");
      }

      const contentType = resp.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response during boot.");
      }

      const data = await resp.json();

      setEmployees(data.employees || []);
      setTasks(data.tasks || []);
      setSqlLogs(data.sqlLogs || []);
      setCompanies(data.companies || []);
      setAssets(data.assets || []);
    } catch (err: any) {
      console.warn("Connection sync note:", err?.message || err);
      setDbError(err.message || "Failed to load database. Attempting reconnect...");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Run initial fetch and configure non-blocking background polling
  useEffect(() => {
    fetchData();

    // Load active session from localStorage (helps when refining front-end edits)
    const storedSession = localStorage.getItem("pats_portal_session");
    if (storedSession) {
      try {
        setCurrentUser(JSON.parse(storedSession));
      } catch (e) {
        localStorage.removeItem("pats_portal_session");
      }
    }

    // Set up rapid syncing so Admin & Employee screens stay cohesive (6 seconds to reduce server load on Render)
    const interval = setInterval(() => {
      fetchData(true);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // Real-Time Task Assignment Detector: triggers floating notification & chime for engineers on Android mobile & desktop
  useEffect(() => {
    if (!currentUser || currentUser.type !== "employee") {
      setFloatingTask(null);
      return;
    }

    const currentEmpId = currentUser.id;
    const myTasks = tasks.filter(t => t.assigned_to === currentEmpId);

    // Initial load: populate seen IDs without triggering alarm spam
    if (!initialTaskSyncDoneRef.current) {
      if (tasks.length > 0) {
        tasks.forEach(t => seenTaskIdsRef.current.add(t.id));
        initialTaskSyncDoneRef.current = true;
      }
      return;
    }

    // Identify newly assigned task to this engineer (Pending or In Progress) that hasn't been shown
    const newlyAssigned = myTasks.find(t => 
      !seenTaskIdsRef.current.has(t.id) && 
      (t.status === "Pending" || t.status === "In Progress")
    );

    if (newlyAssigned) {
      // Mark all current tasks as seen
      tasks.forEach(t => seenTaskIdsRef.current.add(t.id));

      // Display floating in-app notification banner
      setFloatingTask(newlyAssigned);

      // Trigger system / Android native mobile push notification + chime + vibration
      notificationManager.sendSystemNotification(`New Task Assigned: ${newlyAssigned.customer_name}`, {
        body: `${newlyAssigned.problem_reported}${newlyAssigned.company_name ? ` • ${newlyAssigned.company_name}` : ""}${newlyAssigned.asset_id ? ` (Asset: ${newlyAssigned.asset_id})` : ""}`,
        taskId: newlyAssigned.id
      });
    } else {
      // Keep seen set up to date
      tasks.forEach(t => seenTaskIdsRef.current.add(t.id));
    }
  }, [tasks, currentUser]);

  // Background Web Push auto-subscription for service engineers (enables alerts even when app is closed)
  useEffect(() => {
    if (currentUser && currentUser.type === "employee") {
      notificationManager.subscribeToPushNotifications(currentUser.id).catch((err) => {
        console.warn("Auto push subscription warning:", err);
      });
    }
  }, [currentUser]);

  // Handle Android notification click / deep link navigation when opened from closed state or notification tray
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if launched from a notification URL (?taskId=123)
    const params = new URLSearchParams(window.location.search);
    const urlTaskId = params.get("taskId");
    if (urlTaskId) {
      const tId = Number(urlTaskId);
      const found = tasks.find(t => t.id === tId);
      if (found) {
        setFloatingTask(found);
        setEmployeeActiveTab("active");
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Listen for direct messages from Service Worker when clicked
    if ("serviceWorker" in navigator) {
      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === "PATS_OPEN_TASK" && event.data?.taskId) {
          const tId = Number(event.data.taskId);
          const found = tasks.find(t => t.id === tId);
          if (found) {
            setFloatingTask(found);
            setEmployeeActiveTab("active");
          }
        }
      };
      navigator.serviceWorker.addEventListener("message", messageHandler);
      return () => navigator.serviceWorker.removeEventListener("message", messageHandler);
    }
  }, [tasks]);

  const handleLogin = (user: typeof currentUser) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem("pats_portal_session", JSON.stringify(user));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("pats_portal_session");
  };

  const handleAssignTask = async (taskData: {
    customer_name: string;
    contact_details: string;
    problem_reported: string;
    assigned_to: number;
    address?: string;
    contract_type?: string;
    company_id?: number | null;
    company_name?: string | null;
    asset_id?: string | null;
  }) => {
    const resp = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData)
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Failed to assign task");
    }

    // Instantly append return to local list to provide instant response feel
    const newTask = await resp.json();
    setTasks(prev => [newTask, ...prev]);
    await fetchData(true); // Sync in background
  };

  const handleUpdateRemarks = async (taskId: number, remarks: string) => {
    const resp = await fetch(`/api/tasks/${taskId}/remark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remarks })
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Failed to update remarks");
    }

    await fetchData(true);
  };

  const handleUpdateMaterials = async (taskId: number, materials_carried: string | null) => {
    const resp = await fetch(`/api/tasks/${taskId}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materials_carried })
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Failed to update materials carrying list");
    }

    await fetchData(true);
  };

  const handleUpdateTaskDetails = async (
    taskId: number,
    taskData: { 
      customer_name: string; 
      contact_details: string; 
      problem_reported: string; 
      address?: string;
      contract_type?: string;
      company_id?: number | null;
      company_name?: string | null;
      asset_id?: string | null;
    }
  ) => {
    const resp = await fetch(`/api/tasks/${taskId}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData)
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Failed to update task details");
    }

    await fetchData(true);
  };

  const handleTogglePriority = async (taskId: number) => {
    const resp = await fetch(`/api/tasks/${taskId}/priority`, {
      method: "POST"
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Failed to toggle task priority");
    }

    await fetchData(true);
  };

  const handleUpdatePassword = async (employeeId: number, newPassword: string) => {
    const resp = await fetch(`/api/employees/${employeeId}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword })
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Failed to update password");
    }

    await fetchData(true);
  };

  const handleUpdateProfile = async (employeeId: number, profileData: Partial<Employee>) => {
    const resp = await fetch(`/api/employees/${employeeId}/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData)
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Failed to update profile details");
    }

    await fetchData(true);
  };

  const handleAcceptTask = async (taskId: number) => {
    const resp = await fetch(`/api/tasks/${taskId}/accept`, {
      method: "POST"
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Failed to accept task");
    }

    await fetchData(true); // Instantly pull fresh records
  };

  const handleFinishTask = async (taskId: number, remarks: string, km_travelled?: number) => {
    const resp = await fetch(`/api/tasks/${taskId}/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remarks, km_travelled })
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Failed to write remarks");
    }

    await fetchData(true);
  };

  const handleResetDb = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch("/api/sql/reset", { method: "POST" });
      if (!resp.ok) throw new Error("Could not reset");
      await fetchData();
      showAppNotice("Relational database restored to clean factory seed state successfully!");
    } catch (err: any) {
      showAppNotice("Error resetting database: " + err.message, true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearDb = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch("/api/sql/clear", { method: "POST" });
      if (!resp.ok) throw new Error("Could not clear database");
      await fetchData();
      showAppNotice("All tasks and engineers have been successfully removed from the database!");
    } catch (err: any) {
      showAppNotice("Error wiping database: " + err.message, true);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerScrollToSql = () => {
    setIsSqlConsoleFocused(true);
    // Smooth scroll down to interactive query box
    setTimeout(() => {
      const sqlSection = document.getElementById("execute-sql-btn");
      if (sqlSection) {
        sqlSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Background ambience overlay */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
        <div className="absolute top-[-20%] left-[-10%] w-[60rem] h-[60rem] rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute bottom-[-25%] right-[-10%] w-[50rem] h-[50rem] rounded-full bg-indigo-100/40 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header 
          currentUser={currentUser} 
          onLogout={handleLogout}
          openSqlConsole={triggerScrollToSql}
          sqlConsoleActive={isSqlConsoleFocused}
          onOpenSettings={() => setEmployeeActiveTab("profile")}
        />

        <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          {dbError && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3 text-amber-800 shadow-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <h5 className="font-bold text-xs uppercase tracking-wide">Sync Latency Warning</h5>
                <p className="text-xs mt-0.5 leading-relaxed">{dbError}</p>
                <button 
                  onClick={() => fetchData()} 
                  className="mt-2.5 px-3.5 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 text-[10px] uppercase font-extrabold tracking-widest rounded-lg border border-amber-400 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Manual Reconnect</span>
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="relative mb-4">
                <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
                <Laptop className="h-5 w-5 text-blue-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <p className="text-xs font-mono uppercase tracking-widest text-slate-400 animate-pulse text-center">
                Querying relational system tables...
              </p>
            </div>
          ) : !currentUser ? (
            // Authentication gateway selection panel
            <LoginScreen employees={employees} onLogin={handleLogin} />
          ) : currentUser.type === "admin" ? (
            // Admin control room layout view
            <AdminDashboard 
              tasks={tasks}
              employees={employees}
              companies={companies}
              assets={assets}
              onAssignTask={handleAssignTask}
              onResetDb={handleResetDb}
              onClearDb={handleClearDb}
              sqlLogs={sqlLogs}
              refreshLogs={() => fetchData(true)}
              sqlConsoleActive={isSqlConsoleFocused}
              setSqlConsoleActive={setIsSqlConsoleFocused}
              onUpdateRemarks={handleUpdateRemarks}
              onUpdateTaskDetails={handleUpdateTaskDetails}
              onTogglePriority={handleTogglePriority}
              onUpdatePassword={handleUpdatePassword}
            />
          ) : (currentUser.role.toLowerCase() === "employee" || currentUser.role.toLowerCase() === "employee dept" || currentUser.role.toLowerCase() === "accounts" || currentUser.role.toLowerCase() === "accounts dept") ? (
            <AccountsDashboard
              currentUser={currentUser}
              employees={employees}
              refreshLogs={() => fetchData(true)}
            />
          ) : currentUser.role.toLowerCase() === "manager" ? (
            <ManagerDashboard
              currentUser={currentUser}
              employees={employees}
              companies={companies}
              assets={assets}
              refreshLogs={() => fetchData(true)}
            />
          ) : (
            // Employee servicing dashboard panel
            <EmployeeDashboard 
              currentEmployee={currentUser as any}
              employees={employees}
              tasks={tasks}
              companies={companies}
              assets={assets}
              onSyncCompany={() => fetchData(true)}
              onAcceptTask={handleAcceptTask}
              onFinishTask={handleFinishTask}
              onUpdateRemarks={handleUpdateRemarks}
              onUpdatePassword={handleUpdatePassword}
              onUpdateMaterials={handleUpdateMaterials}
              onUpdateProfile={handleUpdateProfile}
              activeTab={employeeActiveTab}
              onTabChange={setEmployeeActiveTab}
              onTriggerTestNotification={() => {
                const sampleTask: Task = {
                  id: 999999,
                  customer_name: "Live Test Ticket • Sample Customer",
                  contact_details: "+91 98765 43210",
                  problem_reported: "Floating alert test: Desktop hardware inspection and network port diagnosis.",
                  assigned_to: currentUser.id,
                  status: "Pending",
                  assigned_at: new Date().toISOString(),
                  accepted_at: null,
                  finished_at: null,
                  remarks: null,
                  address: "Building B, Cyber City, Floor 3",
                  is_priority: true,
                  company_name: "Global Tech Hub",
                  asset_id: "AST-SAMPLE-101"
                };
                setFloatingTask(sampleTask);
                notificationManager.sendSystemNotification("New Task Assigned: Live Test Ticket", {
                  body: "Desktop hardware inspection and network port diagnosis.",
                  taskId: sampleTask.id
                });
              }}
            />
          )}
        </main>

        {/* 🔔 Real-Time Floating Notification Banner for Android Mobile & Web */}
        <FloatingTaskNotification
          task={floatingTask}
          onViewTask={async (task) => {
            try {
              if (task.status === "Pending") {
                await handleAcceptTask(task.id);
              }
            } catch (e) {
              console.warn("Auto accept task error:", e);
            }
            setEmployeeActiveTab("active");
            setFloatingTask(null);
          }}
          onDismiss={() => setFloatingTask(null)}
        />

        {appNotice && (
          <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border transition-all ${
            appNotice.isError 
              ? "bg-rose-900 text-white border-rose-700 shadow-rose-900/30" 
              : "bg-emerald-900 text-white border-emerald-700 shadow-emerald-900/30"
          }`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{appNotice.message}</span>
            <button 
              type="button" 
              onClick={() => setAppNotice(null)}
              className="ml-2 hover:opacity-75 cursor-pointer text-white/80"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
