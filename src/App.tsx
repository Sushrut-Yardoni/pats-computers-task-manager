import React, { useState, useEffect } from "react";
import { Laptop, Cpu, Terminal, Users, Shield, RefreshCw, AlertCircle, Database } from "lucide-react";
import { Employee, Task, SqlLog, Company, CompanyAsset } from "./types";
import Header from "./components/Header";
import LoginScreen from "./components/LoginScreen";
import AdminDashboard from "./components/AdminDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import AccountsDashboard from "./components/AccountsDashboard";
import ManagerDashboard from "./components/ManagerDashboard";

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
  const [employeeActiveTab, setEmployeeActiveTab] = useState<"active" | "completed" | "travel" | "profile">("active");

  // Fetch critical relational tables via the single unified sync endpoint
  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setDbError(null);
    try {
      const resp = await fetch("/api/sync");

      if (!resp.ok) {
        throw new Error("Relational server connection error. Make sure the backend dev server has booted up.");
      }

      const data = await resp.json();

      setEmployees(data.employees || []);
      setTasks(data.tasks || []);
      setSqlLogs(data.sqlLogs || []);
      setCompanies(data.companies || []);
      setAssets(data.assets || []);
    } catch (err: any) {
      console.error(err);
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
    taskData: { customer_name: string; contact_details: string; problem_reported: string; address?: string }
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
      alert("Relational database restored to clean factory seed state successfully!");
    } catch (err: any) {
      alert("Error resetting database: " + err.message);
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
      alert("All tasks and engineers have been successfully removed from the database!");
    } catch (err: any) {
      alert("Error wiping database: " + err.message);
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
            />
          )}
        </main>
      </div>
    </div>
  );
}
