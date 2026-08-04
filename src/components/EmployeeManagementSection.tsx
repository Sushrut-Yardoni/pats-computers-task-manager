import React, { useState } from "react";
import { Users, UserCheck, AlertTriangle, ShieldCheck, Trash2, X } from "lucide-react";
import { Employee, Task } from "../types";

interface EmployeeManagementSectionProps {
  employees: Employee[];
  tasks: Task[];
  refreshLogs: () => void;
  onUpdatePassword?: (employeeId: number, newPassword: string) => Promise<void>;
}

export default function EmployeeManagementSection({
  employees,
  tasks,
  refreshLogs,
  onUpdatePassword
}: EmployeeManagementSectionProps) {
  // Registering form modal state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("");
  const [newEmpJoinedAt, setNewEmpJoinedAt] = useState(new Date().toISOString().split("T")[0]);
  const [isRegisteringEmp, setIsRegisteringEmp] = useState(false);
  const [empSuccess, setEmpSuccess] = useState(false);

  // Decommission confirmation state (no task transfer is included here per constraint)
  const [decommissionTarget, setDecommissionTarget] = useState<Employee | null>(null);
  const [isDecommissioning, setIsDecommissioning] = useState(false);

  // Promote confirmation state
  const [promoteTarget, setPromoteTarget] = useState<Employee | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);

  // Password modification state
  const [changePasswordTarget, setChangePasswordTarget] = useState<Employee | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Role assignment modification state
  const [changeRoleTarget, setChangeRoleTarget] = useState<Employee | null>(null);
  const [selectedRoleType, setSelectedRoleType] = useState<string>("Admin");
  const [customRoleValue, setCustomRoleValue] = useState<string>("");
  const [isChangingRole, setIsChangingRole] = useState(false);

  // Popup details modal state
  const [selectedEmpDetails, setSelectedEmpDetails] = useState<Employee | null>(null);

  // Limits and Month filtering
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState<string>("All");

  const uniqueMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    employees.forEach(emp => {
      if (emp.joined_at) {
        const match = emp.joined_at.match(/^(\d{4}-\d{2})/);
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

  const filteredEmployees = React.useMemo(() => {
    return employees
      .filter(emp => {
        const endedDate = emp.ended_at ? new Date(emp.ended_at) : null;
        if (endedDate && !isNaN(endedDate.getTime()) && endedDate <= new Date()) return false;
        if (selectedMonth === "All") return true;
        return emp.joined_at && emp.joined_at.startsWith(selectedMonth);
      })
      .sort((a, b) => a.id - b.id);
  }, [employees, selectedMonth]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const displayedEmployees = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  // Reset to first page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth]);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePasswordTarget || !newPasswordValue.trim() || !onUpdatePassword) return;

    setIsChangingPassword(true);
    try {
      await onUpdatePassword(changePasswordTarget.id, newPasswordValue.trim());
      setChangePasswordTarget(null);
      setNewPasswordValue("");
      alert(`Password for ${changePasswordTarget.name} has been updated successfully!`);
      refreshLogs();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update engineer password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleOpenAssignRole = (emp: Employee) => {
    setChangeRoleTarget(emp);
    const predefined = ["Admin", "Employee", "Manager", "Desktop Engineer", "Network Specialist", "Software Support Expert"];
    if (predefined.includes(emp.role)) {
      setSelectedRoleType(emp.role);
      setCustomRoleValue("");
    } else {
      setSelectedRoleType("Custom");
      setCustomRoleValue(emp.role);
    }
  };

  const handleChangeRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeRoleTarget) return;

    let finalRole = selectedRoleType;
    if (selectedRoleType === "Custom") {
      if (!customRoleValue.trim()) {
        alert("Please specify a custom role title.");
        return;
      }
      finalRole = customRoleValue.trim();
    }

    setIsChangingRole(true);
    try {
      const resp = await fetch(`/api/employees/${changeRoleTarget.id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: finalRole })
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to assign role.");
      }

      setChangeRoleTarget(null);
      setSelectedRoleType("Admin");
      setCustomRoleValue("");
      alert(`Role for ${changeRoleTarget.name} has been updated to "${finalRole}" successfully!`);
      refreshLogs();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update employee role.");
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleRegisterEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpRole.trim() || !newEmpJoinedAt.trim()) {
      alert("Please fill in all engineer details.");
      return;
    }

    setIsRegisteringEmp(true);
    setEmpSuccess(false);

    try {
      const resp = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEmpName.trim(),
          role: newEmpRole.trim(),
          joined_at: newEmpJoinedAt.trim()
        })
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to register engineer");
      }

      setNewEmpName("");
      setNewEmpRole("");
      setNewEmpJoinedAt(new Date().toISOString().split("T")[0]);
      setEmpSuccess(true);
      setTimeout(() => {
        setEmpSuccess(false);
        setIsRegisterModalOpen(false);
      }, 2000);
      
      refreshLogs();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to initialize new technical staff.");
    } finally {
      setIsRegisteringEmp(false);
    }
  };

  const handleConfirmDecommission = async () => {
    if (!decommissionTarget) return;

    setIsDecommissioning(true);
    try {
      const resp = await fetch(`/api/employees/${decommissionTarget.id}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Strictly remove only the selected engineer, send null for task transfer destination
        body: JSON.stringify({
          transfer_to_id: null
        })
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to remove engineer");
      }

      setDecommissionTarget(null);
      refreshLogs();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error decommissioning engineer");
    } finally {
      setIsDecommissioning(false);
    }
  };

  const handleConfirmPromotion = async () => {
    if (!promoteTarget) return;

    setIsPromoting(true);
    try {
      const resp = await fetch(`/api/employees/${promoteTarget.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to promote engineer");
      }

      setPromoteTarget(null);
      refreshLogs();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error promoting engineer");
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in relative text-slate-800">
      
      {/* Register button */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => setIsRegisterModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md border border-indigo-800 active:scale-[0.98] uppercase tracking-wide cursor-pointer transition-all w-max"
        >
          <Users className="h-4 w-4" />
          Register New Engineer
        </button>
      </div>
      {/* 🛡️ Promote Confirmation Dialog */}
      {promoteTarget && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in select-text text-slate-800">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-2xl" />
            
            <div className="flex items-start gap-3">
              <div className="bg-blue-50 p-2 rounded-xl text-blue-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                  Promote to Administrator
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-sans mt-1">
                  Are you absolutely sure you want to promote <strong className="text-slate-900 font-bold">{promoteTarget.name}</strong> (Staff ID: #{promoteTarget.id}) to an <strong className="text-blue-700 font-bold">Administrator</strong>? 
                </p>
                <p className="text-[10px] text-blue-600 font-semibold bg-blue-50/50 p-2 rounded border border-blue-100 leading-normal mt-2.5">
                  * This will grant them administrative privileges. They will be able to log in with their existing email id (<strong className="font-mono">{promoteTarget.email_id || promoteTarget.name.toLowerCase().split(" ")[0] + "@pats.co.in"}</strong>) and password to access the full admin dashboard.
                </p>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPromoteTarget(null)}
                className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-extrabold text-slate-700 transition-colors shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPromoting}
                onClick={handleConfirmPromotion}
                className="flex-1 py-2 px-3 rounded-xl text-white font-extrabold text-xs bg-blue-700 hover:bg-blue-800 transition-all border border-blue-800 active:scale-95 uppercase tracking-wide shadow-md cursor-pointer"
              >
                {isPromoting ? "Promoting..." : "Promote to Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ Decommission Confirmation Dialog (Satisfies: "admin should able to remove oly selected engineer") */}
      {decommissionTarget && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in select-text text-slate-800">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500 rounded-t-2xl" />
            
            <div className="flex items-start gap-3">
              <div className="bg-red-50 p-2 rounded-xl text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                  Decommission Engineer
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-sans mt-1">
                  Are you absolutely sure you want to decommission <strong className="text-slate-900 font-bold">{decommissionTarget.name}</strong> (Staff ID: #{decommissionTarget.id})? 
                </p>
                <p className="text-[10px] text-rose-600 font-semibold bg-rose-50/50 p-2 rounded border border-rose-100 leading-normal mt-2.5">
                  * Warning: This operation strictly decommissions the selected employee, setting their ending date as today. Any future assignments will exclude them. Unassigned tasks can be managed under the Tasks section.
                </p>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDecommissionTarget(null)}
                className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-extrabold text-slate-700 transition-colors shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDecommissioning}
                onClick={handleConfirmDecommission}
                className="flex-1 py-2 px-3 rounded-xl text-white font-extrabold text-xs bg-red-700 hover:bg-red-800 transition-all border border-red-800 active:scale-95 uppercase tracking-wide shadow-md cursor-pointer"
              >
                {isDecommissioning ? "Removing..." : "Decommission Engineer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛡️ Change Role Modal */}
      {changeRoleTarget && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in select-text text-slate-800">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-2xl" />
            
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide flex items-center gap-1.5">
                <span>Assign Access Role</span>
              </h4>
              <p className="text-xs text-slate-500 font-sans">
                Update the role for <strong className="text-slate-800 font-bold">{changeRoleTarget.name}</strong> (Staff ID: #{changeRoleTarget.id}) to grant them appropriate dashboard privileges.
              </p>
            </div>

            <form onSubmit={handleChangeRoleSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                  Select Predefined Role / Access Level
                </label>
                <select
                  value={selectedRoleType}
                  onChange={(e) => {
                    setSelectedRoleType(e.target.value);
                    if (e.target.value !== "Custom") {
                      setCustomRoleValue("");
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 text-slate-800 px-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all font-sans"
                >
                  <option value="Admin">Admin (Accesses Admin Dashboard)</option>
                  <option value="Employee">Employee (Accesses Employee Dashboard)</option>
                  <option value="Manager">Manager (Accesses Manager Dashboard)</option>
                  <option value="Desktop Engineer">Desktop Engineer (Accesses Service Portal)</option>
                  <option value="Network Specialist">Network Specialist (Accesses Service Portal)</option>
                  <option value="Software Support Expert">Software Support Expert (Accesses Service Portal)</option>
                  <option value="Custom">Custom Role...</option>
                </select>
              </div>

              {selectedRoleType === "Custom" && (
                <div className="animate-fade-in">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                    Custom Role Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Helpdesk Coordinator"
                    value={customRoleValue}
                    onChange={(e) => setCustomRoleValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 text-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors"
                    required
                  />
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setChangeRoleTarget(null);
                    setSelectedRoleType("Admin");
                    setCustomRoleValue("");
                  }}
                  className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-extrabold text-slate-700 transition-colors shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingRole}
                  className="flex-1 py-2 px-3 rounded-xl text-white font-extrabold text-xs bg-indigo-700 hover:bg-indigo-800 transition-all border border-indigo-800 active:scale-95 uppercase tracking-wide shadow-md cursor-pointer"
                >
                  {isChangingRole ? "Updating..." : "Assign Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔑 Change Password Modal */}
      {changePasswordTarget && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in select-text text-slate-800">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-2xl" />
            
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide flex items-center gap-1.5">
                <span>Update Engineer Password</span>
              </h4>
              <p className="text-xs text-slate-500 font-sans">
                Set a custom password for <strong className="text-slate-800 font-bold">{changePasswordTarget.name}</strong> (Staff ID: #{changePasswordTarget.id}) to override their current credentials.
              </p>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                  New Access Password
                </label>
                <input
                  type="text"
                  placeholder="e.g. securePass123"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors font-mono"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setChangePasswordTarget(null)}
                  className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-extrabold text-slate-700 transition-colors shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1 py-2 px-3 rounded-xl text-white font-extrabold text-xs bg-indigo-700 hover:bg-indigo-800 transition-all border border-indigo-800 active:scale-95 uppercase tracking-wide shadow-md cursor-pointer"
                >
                  {isChangingPassword ? "Saving..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📋 Specialist Details Modal (Interactive Profile view for admins) */}
      {selectedEmpDetails && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in select-text text-slate-800">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            {/* Top design strip */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500" />
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold select-all">
                    Staff ID #{selectedEmpDetails.id}
                  </span>
                  {selectedEmpDetails.ended_at ? (
                    <span className="text-[10px] font-mono uppercase bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100 font-bold">
                      Decommissioned
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-bold">
                      Active specialist
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-display font-extrabold text-slate-900 select-all leading-tight">
                  {selectedEmpDetails.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Role: <span className="text-indigo-600 font-bold">{selectedEmpDetails.role}</span>
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => setSelectedEmpDetails(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label="Close details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Grid block for profile fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                
                {/* Email Identifier */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Company Email Address</span>
                  <span className="text-xs text-slate-800 font-mono select-all break-all block font-semibold">
                    {selectedEmpDetails.email_id || "-"}
                  </span>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">System Password</span>
                  <span className="text-xs text-indigo-700 bg-indigo-50/40 px-1.5 py-0.5 rounded border border-indigo-100/50 font-mono select-all inline-block font-bold">
                    {selectedEmpDetails.password || "-"}
                  </span>
                </div>

                {/* Contact phone number */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Contact Phone</span>
                  <span className="text-xs text-blue-700 font-mono select-all font-extrabold tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block">
                    {selectedEmpDetails.phone || "-"}
                  </span>
                </div>

                {/* Blood Group */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Blood Group</span>
                  <span className="text-xs text-slate-800 select-all font-bold block">
                    {selectedEmpDetails.blood_group || "-"}
                  </span>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Emergency Contact info</span>
                  <span className="text-xs text-blue-700 font-mono select-all font-extrabold tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block">
                    {selectedEmpDetails.emergency_contact || "-"}
                  </span>
                </div>

                {/* Joined Date */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Joined Date</span>
                  <span className="text-xs text-slate-600 font-mono select-all block">
                    {selectedEmpDetails.joined_at || "-"}
                  </span>
                </div>

                {/* Exit Date */}
                {selectedEmpDetails.ended_at && (
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Exit Date</span>
                    <span className="text-xs text-red-600 font-mono select-all block font-bold">
                      {selectedEmpDetails.ended_at}
                    </span>
                  </div>
                )}
              </div>

              {/* Technical Certifications / Skills */}
              <div className="border-t border-slate-100 pt-4 space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Specializations & Certifications</span>
                {selectedEmpDetails.skills ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedEmpDetails.skills.split(",").map((sk, index) => {
                      const skill = sk.trim();
                      if (!skill) return null;
                      return (
                        <span key={index} className="text-[10px] font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg">
                          {skill}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 block italic">
                    -
                  </span>
                )}
              </div>

              {/* Professional Experience */}
              <div className="border-t border-slate-100 pt-4 space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Professional Experience Details</span>
                <p className="text-xs text-slate-800 leading-relaxed select-all">
                  {selectedEmpDetails.experience || "-"}
                </p>
              </div>

              {/* Residential Address */}
              <div className="border-t border-slate-100 pt-4 space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none font-sans">Employee Residential Address</span>
                <p className="text-xs text-slate-800 leading-relaxed select-all whitespace-pre-line">
                  {selectedEmpDetails.address || "-"}
                </p>
              </div>

              {/* Internal notes / availability */}
              <div className="border-t border-slate-100 pt-4 space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none font-sans">Bio / Dispatch Notes</span>
                <p className="text-xs text-slate-808 leading-relaxed select-all whitespace-pre-line font-medium">
                  {selectedEmpDetails.notes || "-"}
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmpDetails(null)}
                className="py-2 px-5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 transition-all active:scale-95 cursor-pointer shadow-xs uppercase tracking-wider"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registering Form Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in select-text text-slate-800">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl" />
            <div className="flex items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-display font-extrabold text-slate-900 text-sm">Register Engineer</h3>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterEmployee} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anand Kumar"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Specialization / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Network Specialist"
                  value={newEmpRole}
                  onChange={(e) => setNewEmpRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Date of Joining
                </label>
                <input
                  type="date"
                  value={newEmpJoinedAt}
                  onChange={(e) => setNewEmpJoinedAt(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors font-mono"
                  required
                />
              </div>

              {empSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[10px] font-medium leading-relaxed">
                  Engineer registered successfully! Database index updated with secure portal login key.
                </div>
              )}

              <button
                type="submit"
                disabled={isRegisteringEmp}
                className="w-full py-2.5 px-3 rounded-xl text-white font-extrabold text-xs bg-indigo-700 hover:bg-indigo-800 transition-all flex items-center justify-center gap-1.5 shadow-md border border-indigo-800 active:scale-[0.98] uppercase tracking-wide cursor-pointer"
              >
                <UserCheck className="h-4 w-4" />
                <span>{isRegisteringEmp ? "Invoking SQL INSERT..." : "Register Engineer"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Roster visual data grid view */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="border-b border-slate-100 pb-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-extrabold text-slate-900 text-sm">Professional Engineers Directory</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Joined Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-705 p-1.5 rounded-xl text-[11px] font-extrabold focus:outline-none transition-all"
            >
              <option value="All" className="font-bold">All Months</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m} className="font-bold">{formatMonthKey(m)}</option>
              ))}
            </select>
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
            Showing {displayedEmployees.length} of {filteredEmployees.length} records
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="min-w-full divide-y divide-slate-100 text-left text-[11px] md:text-xs">
             <thead className="bg-slate-100 font-sans text-slate-900 border-b border-slate-200">
              <tr>
                <th className="px-2.5 py-2 text-[9px] font-extrabold uppercase tracking-wider">ID</th>
                <th className="px-2.5 py-2 text-[9px] font-extrabold uppercase tracking-wider">Engineer Identity</th>
                <th className="px-2.5 py-2 text-[9px] font-extrabold uppercase tracking-wider">Email</th>
                <th className="px-2.5 py-2 text-[9px] font-extrabold uppercase tracking-wider">Password</th>
                <th className="px-2.5 py-2 text-[9px] font-extrabold uppercase tracking-wider">Status / Exits</th>
                <th className="px-2.5 py-2 text-right text-[9px] font-extrabold uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-10 text-center text-slate-400 italic font-sans font-medium">
                    No matching technical specialists found for this month range.
                  </td>
                </tr>
              ) : (
                displayedEmployees.map((emp) => {
                  const isDecomm = !!emp.ended_at;

                  return (
                    <tr key={emp.id} className={`hover:bg-slate-50/40 transition-colors ${isDecomm ? 'opacity-40 bg-red-50/5' : ''}`}>
                    <td className="px-2.5 py-2 text-[10px] font-extrabold text-indigo-600 font-mono">#{emp.id}</td>
                    <td className="px-2.5 py-2">
                      <button
                        type="button"
                        onClick={() => setSelectedEmpDetails(emp)}
                        className="text-left font-bold text-indigo-700 hover:text-indigo-900 hover:underline leading-tight select-all focus:outline-none transition-all cursor-pointer font-sans block"
                        title="Click to view complete details"
                      >
                        {emp.name}
                      </button>
                      <p className="text-[9px] text-slate-400 select-all font-medium mt-0.5">{emp.role}</p>
                    </td>
                    <td className="px-2.5 py-2 font-mono text-[10px] text-slate-600 select-all font-medium break-all">{emp.email_id || "N/A"}</td>
                    <td className="px-2.5 py-2">
                      <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100/60 font-bold select-all">{emp.password || "N/A"}</span>
                    </td>
                    <td className="px-2.5 py-2 text-[10px]">
                      {isDecomm ? (
                        <div className="flex flex-col leading-none">
                          <span className="text-red-605 text-red-600 text-[8px] uppercase font-bold tracking-wider font-mono">Removed</span>
                          <span className="text-[8px] text-red-400 font-mono mt-0.5">{emp.ended_at}</span>
                        </div>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 text-[8px] font-bold tracking-wide uppercase font-mono">Active</span>
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-right">
                      {!isDecomm ? (
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenAssignRole(emp)}
                            className="px-1.5 py-0.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-[8.5px] font-bold rounded border border-blue-200 transition-all active:scale-95 flex items-center gap-0.5 cursor-pointer"
                            title="Assign access role / dashboard level"
                          >
                            <ShieldCheck className="h-2.5 w-2.5" />
                            <span>Role</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setChangePasswordTarget(emp);
                              setNewPasswordValue("");
                            }}
                            className="px-1.5 py-0.5 bg-slate-50 text-slate-700 hover:bg-slate-100 text-[8.5px] font-bold rounded border border-slate-200 transition-all active:scale-95 cursor-pointer"
                            title="Update password"
                          >
                            Password
                          </button>
                          <button
                            type="button"
                            onClick={() => setDecommissionTarget(emp)}
                            className="px-1.5 py-0.5 bg-red-50 text-red-605 text-red-600 hover:bg-red-100 text-[8.5px] font-bold rounded border border-red-200 transition-all active:scale-95 cursor-pointer"
                            title="Decommission engineer"
                          >
                            Exit
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[8px] font-bold uppercase tracking-wider font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">Inactive</span>
                      )}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
