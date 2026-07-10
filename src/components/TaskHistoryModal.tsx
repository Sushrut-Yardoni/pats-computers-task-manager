import React from "react";
import { X, Calendar, User, ArrowRight, Clock } from "lucide-react";
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/30">
          {historyEntries.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Clock className="h-6 w-6" />
              </div>
              <p className="text-slate-500 text-xs font-semibold italic">No changes have been recorded for this task yet.</p>
              <p className="text-[10px] text-slate-400">Whenever the task details or status are modified, an audit log will appear here.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-blue-100 pl-6 ml-3 space-y-6">
              {historyEntries.map((entry, idx) => {
                const changes = getChangedFields(entry.before, entry.after);
                return (
                  <div key={idx} className="relative group">
                    {/* Circle timeline dot */}
                    <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-xs group-hover:scale-110 transition-transform" />

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                      {/* Meta information row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[10px] text-slate-500 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                          <User className="h-3.5 w-3.5 text-blue-500" />
                          <span>Edited by:</span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                            {entry.edited_by}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-mono">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatDate(entry.timestamp)}</span>
                        </div>
                      </div>

                      {/* Changed details */}
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
                  </div>
                );
              })}
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
