import React, { useState } from "react";
import { X, Calendar, User, ArrowRight, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Task, TaskHistoryEntry } from "../types";

interface TaskHistoryModalProps {
  task: Task;
  onClose: () => void;
}

export default function TaskHistoryModal({ task, onClose }: TaskHistoryModalProps) {
  const getChangedFields = (before: any, after: any) => {
    const changes = [];
    const fields = [
      { key: "customer_name", label: "Customer Name" },
      { key: "contact_details", label: "Contact Details" },
      { key: "problem_reported", label: "Problem Description" },
      { key: "address", label: "Location Address" },
      { key: "assigned_to", label: "Assigned To" },
      { key: "status", label: "Status" },
      { key: "remarks", label: "Remarks" },
      { key: "materials_carried", label: "Materials Carried" },
    ];

    for (const field of fields) {
      const valBefore = before[field.key];
      const valAfter = after[field.key];

      if (valBefore !== undefined && valAfter !== undefined && String(valBefore) !== String(valAfter)) {
        changes.push({
          label: field.label,
          before: valBefore === null || valBefore === "" ? "None" : String(valBefore),
          after: valAfter === null || valAfter === "" ? "None" : String(valAfter),
        });
      }
    }
    return changes;
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const historyEntries = task.history || [];

  const [expandedEntries, setExpandedEntries] = useState<Record<number, boolean>>({});

  const toggleEntry = (idx: number) => {
    setExpandedEntries(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const expandAll = () => {
    const newExpanded: Record<number, boolean> = {};
    historyEntries.forEach((_, idx) => {
      newExpanded[idx] = true;
    });
    setExpandedEntries(newExpanded);
  };

  const collapseAll = () => {
    setExpandedEntries({});
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800 font-sans">
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Task Change History - #{task.id}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                Customer: {task.customer_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/30">
          {historyEntries.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Clock className="h-6 w-6" />
              </div>
              <p className="text-slate-500 text-xs font-semibold italic">No changes have been recorded for this task yet.</p>
              <p className="text-[10px] text-slate-400">Whenever the task details or status are modified, an audit log will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Expand / Collapse Controls */}
              <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 shadow-xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  {historyEntries.length} {historyEntries.length === 1 ? "audit log" : "audit logs"} found
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer bg-blue-50/60 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg border border-blue-100"
                  >
                    Expand All
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="text-[10px] font-extrabold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer bg-slate-100/70 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg border border-slate-200"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              <div className="relative border-l-2 border-blue-100 pl-6 ml-3 space-y-5">
                {historyEntries.map((entry, idx) => {
                  const changes = getChangedFields(entry.before, entry.after);
                  const uniqueLabels = changes.map(c => c.label);
                  const isExpanded = !!expandedEntries[idx];

                  return (
                    <div key={idx} className="relative group">
                      {/* Circle timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-xs group-hover:scale-110 transition-transform" />

                      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                        {/* Clickable Header */}
                        <div
                          onClick={() => toggleEntry(idx)}
                          className="p-3.5 bg-slate-50/30 hover:bg-slate-50/70 transition-colors cursor-pointer select-none space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[10px] text-slate-500">
                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                              <User className="h-3.5 w-3.5 text-blue-500" />
                              <span>Edited by:</span>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                                {entry.edited_by}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 font-mono">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span>{formatDate(entry.timestamp)}</span>
                              </div>
                              <span className="text-slate-300 hidden sm:inline">|</span>
                              <span className="hidden sm:flex items-center gap-0.5 text-blue-600 font-extrabold text-[10px] hover:text-blue-800">
                                {isExpanded ? (
                                  <>
                                    <span>Collapse</span>
                                    <ChevronUp className="h-3 w-3" />
                                  </>
                                ) : (
                                  <>
                                    <span>Expand</span>
                                    <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 border-t border-slate-100/50 pt-2">
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mr-1">
                                Modified:
                              </span>
                              {uniqueLabels.length === 0 ? (
                                <span className="text-[9.5px] text-slate-500 font-medium italic">Saved (No changes)</span>
                              ) : (
                                uniqueLabels.map((label, lIdx) => (
                                  <span
                                    key={lIdx}
                                    className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50/60 text-blue-700 border border-blue-100/70"
                                  >
                                    {label}
                                  </span>
                                ))
                              )}
                            </div>
                            <div className="sm:hidden text-blue-600">
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Details Container */}
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-100 bg-white space-y-3 animate-fade-in">
                            {changes.length === 0 ? (
                              <p className="text-[10.5px] text-slate-500 italic">Saved without changing trackable fields.</p>
                            ) : (
                              <div className="space-y-2.5 text-xs">
                                {changes.map((change, cIdx) => (
                                  <div key={cIdx} className="space-y-1.5 bg-slate-50/70 rounded-lg p-2.5 border border-slate-100">
                                    <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">
                                      {change.label}
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center text-[10px]">
                                      <div className="sm:col-span-5 flex items-center gap-1.5 bg-red-50/70 p-1.5 rounded-lg border border-red-100 min-w-0">
                                        <span className="shrink-0 text-[8.5px] font-extrabold text-red-500 uppercase tracking-wider bg-red-100/80 px-1 py-0.5 rounded">
                                          From
                                        </span>
                                        <span className="text-red-700 line-through truncate font-medium flex-1 text-[11px]" title={change.before}>
                                          {change.before || <span className="italic opacity-60">(empty)</span>}
                                        </span>
                                      </div>
                                      <div className="sm:col-span-1 text-slate-400 flex justify-center">
                                        <ArrowRight className="h-3.5 w-3.5 rotate-90 sm:rotate-0" />
                                      </div>
                                      <div className="sm:col-span-5 flex items-center gap-1.5 bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-100 min-w-0">
                                        <span className="shrink-0 text-[8.5px] font-extrabold text-emerald-600 uppercase tracking-wider bg-emerald-100/80 px-1 py-0.5 rounded">
                                          To
                                        </span>
                                        <span className="text-emerald-800 font-semibold truncate flex-1 text-[11px]" title={change.after}>
                                          {change.after || <span className="italic opacity-60">(empty)</span>}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-extrabold text-slate-700 uppercase tracking-wide cursor-pointer transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
