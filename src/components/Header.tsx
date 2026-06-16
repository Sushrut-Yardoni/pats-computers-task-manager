import React from "react";
import { Laptop, Cpu, User, LogOut, Terminal, Settings } from "lucide-react";

interface HeaderProps {
  currentUser: { type: "admin"; email_id?: string } | { type: "employee"; id: number; name: string; role: string } | null;
  onLogout: () => void;
  openSqlConsole: () => void;
  sqlConsoleActive: boolean;
  onOpenSettings?: () => void;
}

export default function Header({ currentUser, onLogout, openSqlConsole, sqlConsoleActive, onOpenSettings }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 p-2.5 rounded-xl text-white shadow-md shadow-blue-500/10">
            <Cpu className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg text-slate-800 tracking-tight flex items-center gap-1">
                PATS <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent inline-block">COMPUTERS</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans tracking-wide">Enterprise Service Desk</p>
          </div>
        </div>

        {/* Right: Actions and Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {currentUser && (
            <>
              {/* Show role banner */}
              <div className="hidden md:flex items-center gap-2.5 bg-slate-100 border border-slate-200 rounded-full py-1.5 px-4 animate-fade-in">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-slate-700 font-sans font-medium">
                  {currentUser.type === "admin" ? (
                    <span className="text-blue-600 font-extrabold uppercase tracking-wider text-[10px]">{currentUser.email_id || "admin@pats.co.in"}</span>
                  ) : (
                    <span>
                      Engineer: <strong className="text-blue-700 text-xs">{currentUser.name}</strong>
                    </span>
                  )}
                </span>
              </div>

               {/* Log Out button */}
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 text-xs font-sans font-bold transition-all shadow-2xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}


        </div>
      </div>
    </header>
  );
}
