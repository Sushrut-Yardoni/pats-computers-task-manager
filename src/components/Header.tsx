import React, { useState, useEffect } from "react";
import { Cpu, LogOut, Bell, BellOff, Settings } from "lucide-react";
import { notificationManager } from "../utils/notificationManager";
import NotificationDropdown from "./NotificationDropdown";

interface HeaderProps {
  currentUser: { type: "admin"; email_id?: string } | { type: "employee"; id: number; name: string; role: string } | null;
  onLogout: () => void;
  openSqlConsole: () => void;
  sqlConsoleActive: boolean;
  onOpenSettings?: () => void;
}

export default function Header({ currentUser, onLogout, openSqlConsole, sqlConsoleActive, onOpenSettings }: HeaderProps) {
  const [notifStatus, setNotifStatus] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifStatus(Notification.permission);
    }
    const updatePerm = () => {
      if (typeof window !== "undefined" && "Notification" in window) {
        setNotifStatus(Notification.permission);
      }
    };
    window.addEventListener("pats-permission-changed", updatePerm);
    return () => window.removeEventListener("pats-permission-changed", updatePerm);
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await notificationManager.requestPermission();
    setNotifStatus(granted ? "granted" : "denied");
    if (granted) {
      notificationManager.playTaskChime();
      notificationManager.triggerVibration([200, 100, 200]);
      notificationManager.sendSystemNotification("Notifications Enabled", {
        body: "You will now receive high-priority desktop, website, and mobile alerts for task assignments and updates."
      });
      if (currentUser && currentUser.type === "employee") {
        notificationManager.subscribeToPushNotifications(currentUser.id).catch(() => {});
      }
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 p-2 rounded-xl text-white shadow-xs">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-base sm:text-lg text-slate-800 tracking-tight flex items-center gap-1">
                PATS <span className="text-blue-600">COMPUTERS</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans tracking-wide">Enterprise Service Desk</p>
          </div>
        </div>

        {/* Right: Actions and Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {currentUser && (
            <>
              {/* Notification Permission Quick Action */}
              {notifStatus !== "granted" && (
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/90 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors shadow-2xs cursor-pointer animate-pulse"
                  title="Enable notifications to receive instant alerts when tasks are assigned"
                >
                  <Bell className="h-3.5 w-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Enable Alerts</span>
                </button>
              )}

              {/* Show role banner */}
              <div className="hidden md:flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full py-1 px-3.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-700 font-sans font-medium">
                  {currentUser.type === "admin" ? (
                    <span className="text-blue-600 font-bold uppercase tracking-wider text-[10px]">{currentUser.email_id || "admin@pats.co.in"}</span>
                  ) : (
                    <span>
                      {currentUser.role || "Staff"}: <strong className="text-slate-900 font-semibold">{currentUser.name}</strong>
                    </span>
                  )}
                </span>
              </div>

              {/* Notification Center Dropdown */}
              <NotificationDropdown />

              {/* Log Out button */}
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
