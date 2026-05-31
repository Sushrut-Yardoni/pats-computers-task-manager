import React, { useState } from "react";
import { Shield, Users, ArrowRight, Laptop, KeyRound, Lock, UserCheck } from "lucide-react";
import { Employee } from "../types";

interface LoginScreenProps {
  employees: Employee[];
  onLogin: (user: any) => void;
}

export default function LoginScreen({ employees, onLogin }: LoginScreenProps) {
  const [email_id, setEmailId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email_id.trim() || !password.trim()) {
      setErrorMsg("Please fill in both email id and password fields.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const resp = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_id: email_id.trim(), password })
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || "Authentication check failed.");
      }

      // Login success
      onLogin(data.user);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Invalid credentials. Retrying query...");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto my-6 p-1 animate-fade-in text-slate-800">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-blue-50 border border-blue-100 mb-3 shadow-inner">
          <Laptop className="h-8 w-8 text-blue-600 animate-pulse" />
        </div>
        <h2 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">
          PATS COMPUTERS
        </h2>
        <p className="text-xs text-indigo-600 font-extrabold tracking-widest uppercase mt-1">
          Service Portal
        </p>
        <p className="text-xs text-slate-500 mt-2 font-semibold tracking-wide">
          Relational Task Dispatch Desk & Engineer Servicing Hub
        </p>
      </div>

      {/* Portal Login Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
        
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
          <Users className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base">
              System Access
            </h3>
            <p className="text-xs text-slate-500 font-sans font-medium">
              Credentials verified against relational user tables
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 font-sans">
              Email ID
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <UserCheck className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="e.g. rahul@pats.co.in"
                value={email_id}
                onChange={(e) => {
                  setEmailId(e.target.value);
                  setErrorMsg("");
                }}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-400 focus:border-blue-500 text-slate-800 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 font-sans">
              Access Passcode Token
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <KeyRound className="h-4 w-4" />
              </span>
              <input
                type="password"
                placeholder="Enter passcode"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg("");
                }}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-400 focus:border-blue-500 text-slate-800 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                required
              />
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-[10px] text-red-700 font-mono flex items-center gap-1.5 leading-relaxed font-semibold">
              <span className="h-1.5 w-1.5 bg-red-600 rounded-full animate-ping" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl font-extrabold text-xs bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center gap-2 shadow-md transition-all border border-blue-800 uppercase tracking-wider active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <span>Validating credentials with SQLite index...</span>
              </span>
            ) : (
              <>
                <span>Sign In & Authorize Session</span>
                <ArrowRight className="h-4 w-4 animate-pulse" />
              </>
            )}
          </button>
        </form>


      </div>
    </div>
  );
}
