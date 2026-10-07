import React, { useState, useEffect } from "react";
import { Cpu, LogOut, Bell, BellOff, Settings } from "lucide-react";
import { notificationManager } from "../utils/notificationManager";

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
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await notificationManager.requestPermission();
    setNotifStatus(granted ? "granted" : "denied");
    if (granted) {
      notificationManager.playTaskChime();
      notificationManager.triggerVibration([150, 80, 150]);
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
              {/* Notification Permission Quick Action for Engineers */}
              {currentUser.type === "employee" && notifStatus !== "granted" && (
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
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
                      Engineer: <strong className="text-slate-900 font-semibold">{currentUser.name}</strong>
                    </span>
                  )}
                </span>
              </div>

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
