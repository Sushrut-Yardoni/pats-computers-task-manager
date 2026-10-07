import React, { useEffect, useState } from "react";
import { Bell, AlertCircle, ArrowRight, X, Building2, Laptop, MapPin } from "lucide-react";
import { Task } from "../types";
import { notificationManager } from "../utils/notificationManager";

interface FloatingTaskNotificationProps {
  task: Task | null;
  onViewTask: (task: Task) => void;
  onDismiss: () => void;
}

export default function FloatingTaskNotification({
  task,
  onViewTask,
  onDismiss
}: FloatingTaskNotificationProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!task) return;

    // Trigger refined alert chime and haptic feedback
    notificationManager.playTaskChime();
    notificationManager.triggerVibration([200, 100, 200]);

    setProgress(100);
    const duration = 12000; // 12 seconds auto-dismiss
    const intervalTime = 100;
    const decrement = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      if (isPaused) return;
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [task, onDismiss, isPaused]);

  if (!task) return null;

  return (
    <aside
      aria-label="New Task Notification"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[300] w-[94vw] max-w-lg animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-250 shadow-2xl shadow-slate-900/15 p-4 text-slate-800">
        <div className="flex items-start gap-3">
          {/* Professional Bell Icon Container */}
          <div className="shrink-0 mt-0.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <Bell className="h-5 w-5 stroke-[2.2]" />
            </div>
          </div>

          {/* Ticket Information */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
                New Task #{task.id}
              </span>
              {task.is_priority && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  High Priority
                </span>
              )}
              {task.contract_type && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {task.contract_type}
                </span>
              )}
            </div>

            <h4 className="font-bold text-sm text-slate-900 truncate">
              {task.customer_name}
            </h4>

            <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
              {task.problem_reported}
            </p>

            {(task.company_name || task.asset_id || task.address) && (
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                {task.company_name && (
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <Building2 className="h-3 w-3 text-slate-400" />
                    <span className="truncate max-w-[150px]">{task.company_name}</span>
                  </span>
                )}
                {task.asset_id && (
                  <span className="flex items-center gap-1 font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                    <Laptop className="h-3 w-3 text-slate-400" />
                    <span>{task.asset_id}</span>
                  </span>
                )}
                {task.address && (
                  <span className="flex items-center gap-1 truncate max-w-[180px]">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{task.address}</span>
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onViewTask(task)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-semibold py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <span>Open Ticket</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={onDismiss}
                className="bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 text-xs font-medium py-2 px-3.5 rounded-xl transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Dismiss Icon */}
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Minimal Understated Progress Indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
          <div
            className="h-full bg-blue-600 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
