import React, { useState, useEffect } from "react";
import { Fuel, Save, Navigation, Eye, X, Calendar, User, Phone, MapPin, ClipboardList, Clock, Package, AlertCircle } from "lucide-react";
import { OfflineTravel, Task, Employee } from "../types";

export default function TravelPetrolSection() {
  const [petrolPrice, setPetrolPrice] = useState<number>(100);
  const [isSaving, setIsSaving] = useState(false);
  const [offlineTravels, setOfflineTravels] = useState<OfflineTravel[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Custom Filters for Month, Record Limits, and individual Employees
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState<string>("All"); // "YYYY-MM" or "All"
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "All">("All");
  
  // State for interactive pop-up task detail modal
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  useEffect(() => {
    const fetchJson = async (url: string, fallback: any) => {
      try {
        const r = await fetch(url);
        if (!r.ok) {
          const errBody = await r.json().catch(() => ({}));
          throw new Error(errBody.error || `HTTP ${r.status}`);
        }
        return await r.json();
      } catch (e) {
        console.warn(`Failed to fetch ${url}:`, e);
        return fallback;
      }
    };

    Promise.all([
      fetchJson("/api/settings", { petrol_price: 100 }),
      fetchJson("/api/offline-travels", []),
      fetchJson("/api/tasks", []),
      fetchJson("/api/employees", [])
    ]).then(([settingsData, offlineData, tasksData, employeesData]) => {
      setPetrolPrice(settingsData.petrol_price || 100);
      setOfflineTravels(offlineData);
      setTasks(tasksData);
      setEmployees(employeesData);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petrol_price: petrolPrice })
      });
    } catch(err) {
      console.error(err);
    }
    setIsSaving(false);
  };

  // Extract unique months from travels list (YYYY-MM format)
  const uniqueMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    offlineTravels.forEach(t => {
      if (t.created_at) {
        const match = t.created_at.match(/^(\d{4}-\d{2})/);
        if (match) {
          monthsSet.add(match[1]);
        }
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [offlineTravels]);

  // Format month key "YYYY-MM" to readable "Month Name YYYY"
  const formatMonthKey = (monthKey: string) => {
    try {
      const [year, month] = monthKey.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleString("default", { month: "long", year: "numeric" });
    } catch {
      return monthKey;
    }
  };

  // Filter travels based on month and employee selections
  const filteredTravels = React.useMemo(() => {
    return offlineTravels.filter(t => {
      // Month selector match
      const matchesMonth = selectedMonth === "All" || (t.created_at && t.created_at.startsWith(selectedMonth));
      // Employee selector match
      const matchesEmployee = selectedEmployeeId === "All" || t.employee_id === Number(selectedEmployeeId);
      return matchesMonth && matchesEmployee;
    });
  }, [offlineTravels, selectedMonth, selectedEmployeeId]);

  const totalKmAll = filteredTravels.reduce((sum, t) => sum + t.km_travelled, 0);
  const totalMoneyAll = React.useMemo(() => {
    return filteredTravels.reduce((sum, t) => {
      const associatedTask = tasks.find(task => task.id === t.task_id);
      const isRepeatCall = associatedTask?.is_repeat === true;
      if (isRepeatCall) {
        return sum; // No petrol money for repeat calls
      }
      return sum + (t.km_travelled * petrolPrice);
    }, 0);
  }, [filteredTravels, tasks, petrolPrice]);

  const totalPages = Math.ceil(filteredTravels.length / itemsPerPage);

  // Apply row limit
  const displayedTravels = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTravels.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTravels, currentPage, itemsPerPage]);

  // Reset to first page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedEmployeeId]);

  const activeTaskDetails = tasks.find(t => t.id === selectedTaskId);

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading travel logs...</div>;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-100 p-2.5 rounded-xl">
          <Fuel className="h-5 w-5 text-emerald-700" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Travel & Petrol Logistics</h2>
          <p className="text-xs text-slate-500 font-medium">Manage petrol rates and view unified travel logs.</p>
        </div>
      </div>

      <div className="flex items-end gap-3 bg-slate-50 p-5 rounded-xl border border-slate-200 w-full md:w-1/2">
        <div className="flex-1 space-y-1">
          <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Global Petrol Price (₹/km)</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">₹</span>
            <input
              type="number"
              value={petrolPrice}
              onChange={(e) => setPetrolPrice(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 text-sm font-bold text-slate-800 rounded-lg pl-8 pr-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Update"}
        </button>
      </div>

      {/* Employees travel log */}
      <div className="space-y-4 pt-4 border-t border-slate-150">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-2">
          <h3 className="font-extrabold text-sm uppercase text-slate-800 flex items-center gap-2">
            <Navigation className="h-4 w-4 text-purple-600" />
            Employees Travel Log
          </h3>

          {/* Row with Month selective buttons & Employee dropdown */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full xl:w-auto">
            {/* Months Selector Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Month:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedMonth("All")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer border ${
                    selectedMonth === "All"
                      ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  All Months
                </button>
                {uniqueMonths.map(monthKey => (
                  <button
                    type="button"
                    key={monthKey}
                    onClick={() => setSelectedMonth(monthKey)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer border ${
                      selectedMonth === monthKey
                        ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {formatMonthKey(monthKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Engineer Filter Selector */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">Engineer:</span>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value === "All" ? "All" : Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 w-full sm:w-[170px]"
              >
                <option value="All">All Engineers (Combined)</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} (ID #{emp.id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pagination row */}
        <div className="flex flex-col gap-2 bg-slate-50/55 p-3 rounded-xl border border-slate-100 mb-4 text-xs">
          <div className="flex items-center justify-between gap-2">
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
          
          <div className="flex items-center justify-between gap-2">
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
            Showing {displayedTravels.length} of {filteredTravels.length} total matched records
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold text-slate-900 uppercase tracking-wider">
                <th className="px-4 py-3">Log ID</th>
                <th className="px-4 py-3">Engineer</th>
                <th className="px-4 py-3 w-1/3">Task Details</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3 text-right">Distance</th>
                <th className="px-4 py-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayedTravels.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500 italic">No travel recorded matching filters.</td>
                </tr>
              ) : (
                displayedTravels.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-600 font-bold">#{t.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{t.employee_name || `Engineer #${t.employee_id}`}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-between">
                        <span className="font-bold text-slate-900 line-clamp-1 max-w-[200px]">
                          {t.task_name || `Task #${t.task_id}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedTaskId(t.task_id)}
                          className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 italic max-w-[200px] truncate" title={t.remarks || ""}>
                      {t.remarks || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">{t.km_travelled} km</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                      {(() => {
                        const associatedTask = tasks.find(task => task.id === t.task_id);
                        const isRepeatCall = associatedTask?.is_repeat === true;
                        if (isRepeatCall) {
                          return (
                            <span className="inline-block text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-sans font-bold" title="Zero petrol allowance allocated for Repeat Calls">
                              Without Petrol
                            </span>
                          );
                        }
                        return `₹ ${(t.km_travelled * petrolPrice).toFixed(2)}`;
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Grand Totals of all technicians */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 mt-4">
          <div className="text-left">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
              {selectedEmployeeId === "All" ? "Consolidated Company Logistics Reimbursement" : `Logistics Reimbursement for ${employees.find(e => e.id === selectedEmployeeId)?.name || "Selected Engineer"}`}
            </span>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              {selectedMonth === "All" ? "Accumulated across all dates" : `Specifically for ${formatMonthKey(selectedMonth)}`} (₹{petrolPrice}/km)
            </p>
          </div>
          <div className="flex gap-4 items-center shrink-0 w-full md:w-auto justify-between md:justify-end">
            <div className="bg-white px-5 py-3 rounded-xl border border-slate-150 shadow-2xs text-center min-w-[120px]">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Grand Total KMS</span>
              <span className="text-sm font-extrabold text-blue-700 block mt-0.5">{totalKmAll} km</span>
            </div>
            <div className="bg-white px-5 py-3 rounded-xl border border-slate-150 shadow-2xs text-center min-w-[140px]">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Petrol Money</span>
              <span className="text-sm font-extrabold text-emerald-700 block mt-0.5 font-mono">₹ {totalMoneyAll.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pop-up modal overlay for Task Details */}
      {selectedTaskId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                  Task #{selectedTaskId} Information
                </h3>
              </div>
              <button
                onClick={() => setSelectedTaskId(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {activeTaskDetails ? (
                <div className="space-y-4">
                  
                  {/* Customer Information Cards */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 block">Customer Information</span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-slate-500 font-semibold block">Customer Name</span>
                        <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {activeTaskDetails.customer_name}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-500 font-semibold block">Contact Details</span>
                        <div className="font-extrabold text-slate-800 flex items-center gap-1.5 font-mono">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono font-extrabold tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/60 shadow-xs">{activeTaskDetails.contact_details.split("|")[0].trim()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Problem reported card */}
                  <div className="space-y-1 bg-amber-50/55 border border-amber-150 p-4 rounded-2xl">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-amber-700 block">Problem Reported</span>
                    <p className="text-xs font-semibold text-slate-800 leading-relaxed mt-1">
                      {activeTaskDetails.problem_reported}
                    </p>
                  </div>

                  {/* Address */}
                  {activeTaskDetails.address && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 block">Service Location Address</span>
                      <div className="text-xs font-semibold text-slate-700 flex items-start gap-1.5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-150">
                        <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <span>{activeTaskDetails.address}</span>
                      </div>
                    </div>
                  )}

                  {/* Materials Carrying / Carried for the Call */}
                  <div className="space-y-1.5 bg-slate-50 border border-slate-200 p-4 rounded-xl font-sans text-left">
                    <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-extrabold flex items-center gap-1">
                      <Package className="h-3.5 w-3.5 text-slate-500" />
                      Materials Carried for this Call
                    </span>
                    {activeTaskDetails.materials_carried ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {activeTaskDetails.materials_carried.split(",").map((mat, i) => {
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
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-extrabold block">Priority / Urgency Level</span>
                      <div className="flex items-center gap-2">
                        {activeTaskDetails.is_priority ? (
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

                  {/* Dispatch workflow data */}
                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 block">Ticket Status</span>
                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[9px] font-bold mt-1.5 ${
                        activeTaskDetails.status === "Pending" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" :
                        activeTaskDetails.status === "In Progress" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" :
                        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      }`}>
                        {activeTaskDetails.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 block">Assigned Engineer</span>
                      <span className="text-slate-800 font-extrabold mt-1.5 block">
                        {activeTaskDetails.employee_name || "Unassigned"}
                      </span>
                    </div>
                  </div>

                  {/* Date Logs */}
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50 text-[11px] font-semibold text-slate-500 space-y-1 pb-2">
                    {activeTaskDetails.assigned_at && (
                      <div className="flex justify-between">
                        <span>Assigned At:</span>
                        <span className="font-mono text-slate-700">{new Date(activeTaskDetails.assigned_at).toLocaleString()}</span>
                      </div>
                    )}
                    {activeTaskDetails.accepted_at && (
                      <div className="flex justify-between">
                        <span>Accepted At:</span>
                        <span className="font-mono text-slate-700">{new Date(activeTaskDetails.accepted_at).toLocaleString()}</span>
                      </div>
                    )}
                    {activeTaskDetails.finished_at && (
                      <div className="flex justify-between">
                        <span>Finished At:</span>
                        <span className="font-mono text-slate-700">{new Date(activeTaskDetails.finished_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Technician comments / Remarks section of the task */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 block">Technician Resolution Comments</span>
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 italic">
                      {activeTaskDetails.remarks || "No completion remarks provided yet."}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 italic text-xs">
                  We couldn't retrieve information for this specific task. Please verify if it exists.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedTaskId(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Close Ticket View
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
