import React, { useState, useEffect } from "react";
import { Eye, X, Calendar, User, Phone, MapPin, ClipboardList, Clock, Package, AlertCircle } from "lucide-react";
import { OfflineTravel, Task } from "../types";

interface EmployeeTravelSectionProps {
  myTasks: Task[];
  employeeId: number;
  petrolPrice: number;
}

export default function EmployeeTravelSection({ myTasks, employeeId, petrolPrice }: EmployeeTravelSectionProps) {
  const [travels, setTravels] = useState<OfflineTravel[]>([]);
  const [limit, setLimit] = useState<number | "All">(5);
  const [selectedMonth, setSelectedMonth] = useState<string>("All"); // "YYYY-MM" or "All"
  
  // State for interactive pop-up task detail modal
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/offline-travels")
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setTravels(data.filter((t: OfflineTravel) => t.employee_id === employeeId));
        } else {
          setTravels([]);
        }
      })
      .catch(err => {
        console.error("Failed to query travel logs:", err);
        setTravels([]);
      });
  }, [employeeId]);

  // Extract unique months from travels list (YYYY-MM format)
  const uniqueMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    travels.forEach(t => {
      if (t.created_at) {
        const match = t.created_at.match(/^(\d{4}-\d{2})/);
        if (match) {
          monthsSet.add(match[1]);
        }
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [travels]);

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

  // Filter travels based on active selectedMonth
  const filteredTravels = React.useMemo(() => {
    return travels.filter(t => {
      if (selectedMonth === "All") return true;
      return t.created_at && t.created_at.startsWith(selectedMonth);
    });
  }, [travels, selectedMonth]);

  const totalKm = filteredTravels.reduce((sum, t) => sum + t.km_travelled, 0);
  const totalMoney = React.useMemo(() => {
    return filteredTravels.reduce((sum, t) => {
      const associatedTask = myTasks.find(task => task.id === t.task_id);
      const isRepeatCall = associatedTask?.is_repeat === true;
      if (isRepeatCall) {
        return sum; // No petrol money for repeat calls
      }
      return sum + (t.km_travelled * petrolPrice);
    }, 0);
  }, [filteredTravels, myTasks, petrolPrice]);

  // Apply row showing limits
  const displayedTravels = React.useMemo(() => {
    if (limit === "All") return filteredTravels;
    return filteredTravels.slice(0, limit);
  }, [filteredTravels, limit]);

  // Find currently selected task to view in pop-up modal
  const activeTaskDetails = myTasks.find(t => t.id === selectedTaskId);

  return (
    <div className="space-y-6">
      {/* Travelled logs section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600" />
            <h3 className="font-extrabold text-sm uppercase text-slate-800">
              Travelled Logs
            </h3>
          </div>

          {/* Month selective horizontal button list */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Select Month:</span>
            <div className="flex flex-wrap gap-1">
              <button
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
        </div>

        {/* Records quantity limit row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Records to show:</span>
            <div className="flex gap-1">
              {([5, 10, 20, "All"] as const).map(num => (
                <button
                  key={num}
                  onClick={() => setLimit(num)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                    limit === num
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
            Showing {displayedTravels.length} of {filteredTravels.length} logs {selectedMonth !== "All" && `for ${formatMonthKey(selectedMonth)}`}
          </span>
        </div>
        
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left font-sans text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 uppercase text-slate-900 font-extrabold tracking-wider">
              <tr>
                <th className="px-4 py-3">Log ID</th>
                <th className="px-4 py-3 w-1/3">Task Details</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3 text-right">Distance</th>
                <th className="px-4 py-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedTravels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500 italic">
                    No travel logs corresponding to selection.
                  </td>
                </tr>
              ) : (
                displayedTravels.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-600 font-bold">#{t.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-between">
                        <span className="font-bold text-slate-900 line-clamp-1 max-w-[150px]">
                          {t.task_name || myTasks.find(task => task.id === t.task_id)?.customer_name || `Task #${t.task_id}`}
                        </span>
                        <button
                          onClick={() => setSelectedTaskId(t.task_id)}
                          className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 italic max-w-[180px] truncate" title={t.remarks || ""}>
                      {t.remarks || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">{t.km_travelled} km</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                      {(() => {
                        const associatedTask = myTasks.find(task => task.id === t.task_id);
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

        {/* Travel totals at the end of the section */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-left">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">Total Fuel Logs Summary</span>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Calculated based on Admin petrol settings rate (₹{petrolPrice}/km)</p>
          </div>
          <div className="flex gap-4 items-center shrink-0 w-full md:w-auto justify-between md:justify-end">
            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-150 shadow-2xs text-center min-w-[110px]">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Total KMS</span>
              <span className="text-xs font-bold text-blue-700 block mt-0.5">{totalKm} km</span>
            </div>
            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-150 shadow-2xs text-center min-w-[130px]">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Petrol Money</span>
              <span className="text-xs font-bold text-emerald-700 block mt-0.5 font-mono">₹ {totalMoney.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pop-up modal overlay for Task Details */}
      {selectedTaskId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between col-span-1">
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
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-800">
              {activeTaskDetails ? (
                <div className="space-y-4">
                  
                  {/* Customer Information Cards */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3 font-sans">
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
                  <div className="space-y-1 bg-amber-50/55 border border-amber-150 p-4 rounded-2xl font-sans">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-amber-700 block">Problem Reported</span>
                    <p className="text-xs font-semibold text-slate-800 leading-relaxed mt-1">
                      {activeTaskDetails.problem_reported}
                    </p>
                  </div>

                  {/* Address */}
                  {activeTaskDetails.address && (
                    <div className="space-y-1 font-sans">
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

                        {activeTaskDetails.is_repeat && (
                          <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 text-3xs font-extrabold uppercase tracking-widest rounded-md flex items-center gap-1 text-[10px] mt-1.5 w-max">
                            🔄 Repeat Call (No Petrol Assigned)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dispatch workflow data */}
                  <div className="grid grid-cols-2 gap-3.5 text-xs font-sans">
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
                      <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 block">Assigned Engineer ID</span>
                      <span className="text-slate-800 font-extrabold mt-1.5 block">
                        #{activeTaskDetails.assigned_to || "Unassigned"}
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
                  <div className="space-y-1 font-sans">
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
