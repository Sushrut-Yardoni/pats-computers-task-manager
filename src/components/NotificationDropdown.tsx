import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, Check, Trash2, Volume2, ShieldCheck, X, Smartphone, Monitor, Globe, CheckCircle2, AlertTriangle, Sparkles, Music 
} from "lucide-react";
import { notificationManager, EnvironmentDiagnostics } from "../utils/notificationManager";
import NotificationToneModal from "./NotificationToneModal";
import NotificationUnblockModal from "./NotificationUnblockModal";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<EnvironmentDiagnostics | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isToneModalOpen, setIsToneModalOpen] = useState(false);
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadHistory = () => {
    setHistory(notificationManager.getHistory());
    setDiagnostics(notificationManager.getEnvironmentDiagnostics());
  };

  useEffect(() => {
    loadHistory();
    const handleUpdate = () => loadHistory();
    window.addEventListener("pats-notification-updated", handleUpdate);
    window.addEventListener("pats-permission-changed", handleUpdate);
    window.addEventListener("pats-push-status-changed", handleUpdate);
    window.addEventListener("pats-tone-changed", handleUpdate);
    return () => {
      window.removeEventListener("pats-notification-updated", handleUpdate);
      window.removeEventListener("pats-permission-changed", handleUpdate);
      window.removeEventListener("pats-push-status-changed", handleUpdate);
      window.removeEventListener("pats-tone-changed", handleUpdate);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = history.filter((h) => !h.read).length;

  const handleEnablePermissions = async () => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "denied"
    ) {
      setIsUnblockModalOpen(true);
      return;
    }
    const granted = await notificationManager.requestPermission();
    setDiagnostics(notificationManager.getEnvironmentDiagnostics());
    if (granted) {
      notificationManager.playTaskChime();
      notificationManager.triggerVibration([200, 100, 200]);
      notificationManager.sendSystemNotification("Notifications Enabled", {
        body: "Your device is now armed to receive instant alerts across Website, Desktop & Mobile views."
      });
    } else {
      if (notificationManager.getPermissionStatus() === "denied") {
        setIsUnblockModalOpen(true);
      }
    }
  };

  const handleTestNotifications = async () => {
    notificationManager.unlockAudioEngine();
    notificationManager.playTaskChime();
    notificationManager.triggerVibration([400, 150, 400, 150, 600]);

    await notificationManager.sendSystemNotification("Test Alert • PATS Service Desk", {
      body: "Melodic chime, haptic vibration, OS notification, and tab alert verified successfully!",
      isPriority: true
    });

    setTestStatus("Alert Dispatched!");
    setTimeout(() => setTestStatus(null), 3000);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          notificationManager.unlockAudioEngine();
          if (!isOpen) {
            notificationManager.markAllRead();
          }
        }}
        className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
        title="Notifications & Device Alert Health"
      >
        <Bell className="h-4 w-4 text-blue-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-extrabold text-[9px] rounded-full h-4 w-4 flex items-center justify-center shadow-sm animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-[26rem] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in text-slate-800">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                Notifications Center
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => notificationManager.clearHistory()}
                  className="text-[10px] text-slate-500 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Device & Environment Diagnostics Strip */}
          {diagnostics && (
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-100 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  {diagnostics.isStandalone ? (
                    <Smartphone className="h-3.5 w-3.5 text-blue-600" />
                  ) : diagnostics.isMobile ? (
                    <Smartphone className="h-3.5 w-3.5 text-slate-500" />
                  ) : (
                    <Monitor className="h-3.5 w-3.5 text-blue-600" />
                  )}
                  <span>{diagnostics.mode}</span>
                </span>

                {diagnostics.permission === "granted" ? (
                  <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    Alerts Active
                  </span>
                ) : diagnostics.permission === "denied" ? (
                  <button
                    type="button"
                    onClick={() => setIsUnblockModalOpen(true)}
                    className="inline-flex items-center gap-1 font-bold text-[10px] text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-98 px-2 py-0.5 rounded-md border border-rose-200 cursor-pointer transition-all shadow-2xs"
                    title="Tap to view step-by-step unblock instructions"
                  >
                    <AlertTriangle className="h-3 w-3 text-rose-600" />
                    <span>
                      {diagnostics.isStandalone ? "Disabled on Phone • Unblock" : "Blocked in Browser • Unblock"}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnablePermissions}
                    className="font-bold text-[10px] text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 cursor-pointer animate-pulse"
                  >
                    Enable Alerts
                  </button>
                )}
              </div>

              {/* Status pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[9px] text-slate-500 font-mono">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                  Chime Audio: <strong className="text-slate-700">Enabled</strong>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                  Haptics: <strong className="text-slate-700">{diagnostics.hasVibration ? "Ready" : "N/A"}</strong>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                  Web Push: <strong className="text-slate-700">{diagnostics.hasPush ? "Supported" : "Local"}</strong>
                </span>
              </div>

              {/* Personal Tone Selector Shortcut */}
              <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10px] text-slate-600 font-medium">
                  <Music className="h-3 w-3 text-blue-600" />
                  <span>Tone: <strong className="text-slate-900">{diagnostics.activeToneName}</strong></span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsToneModalOpen(true)}
                  className="text-[10px] text-blue-700 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                >
                  Change Tone →
                </button>
              </div>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {history.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-slate-400 italic">
                No recent notifications or task alerts.
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="p-3 hover:bg-slate-50 transition-colors flex items-start gap-3">
                  <div
                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      item.read ? "bg-slate-300" : "bg-blue-600 ring-4 ring-blue-100"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-slate-900 truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.body}</p>
                    <span className="block text-[9px] text-slate-400 font-mono mt-1">{item.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Test Action Strip */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleTestNotifications}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>{testStatus || "Test Sound, Vibrate & Alerts"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 🎵 Personal Notification Tone Modal */}
      <NotificationToneModal
        isOpen={isToneModalOpen}
        onClose={() => setIsToneModalOpen(false)}
        onToneSaved={() => loadHistory()}
      />

      {/* 🛡️ Unblock Instructions Modal */}
      <NotificationUnblockModal
        isOpen={isUnblockModalOpen}
        onClose={() => {
          setIsUnblockModalOpen(false);
          loadHistory();
        }}
        onUnblocked={() => loadHistory()}
      />
    </div>
  );
}
