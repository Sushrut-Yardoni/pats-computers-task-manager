import React, { useState, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { Task, Employee } from "../types";
import { BarChart4, TrendingUp, CheckCircle2, Users, Building, DollarSign, Award } from "lucide-react";

interface AnalyticsSectionProps {
  tasks: Task[];
  employees: Employee[];
}

export default function AnalyticsSection({ tasks, employees }: AnalyticsSectionProps) {
  // Load saved bills from localStorage for revenue metrics
  const savedBills = useMemo(() => {
    try {
      const saved = localStorage.getItem("pats_saved_bills");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, []);

  // 1. Total Finished Tasks by Engineer
  const finishedTasksByEngineer = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.filter(t => t.status === "Finished").forEach(t => {
      const eng = t.employee_name || "Unassigned";
      counts[eng] = (counts[eng] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, finishedTasks]) => ({ name, finishedTasks }))
      .sort((a, b) => b.finishedTasks - a.finishedTasks);
  }, [tasks]);

  // 2. Company Revenue from generated bills
  const revenueByCompany = useMemo(() => {
    const revMap: Record<string, number> = {};
    savedBills.forEach((b: any) => {
      const comp = b.businessName || b.customerName || "General";
      revMap[comp] = (revMap[comp] || 0) + Number(b.grandTotal || 0);
    });
    return Object.entries(revMap)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [savedBills]);

  // 3. Overview Statistics
  const totalFinishedTasks = tasks.filter(t => t.status === "Finished").length;
  const totalRevenue = savedBills.reduce((sum: number, b: any) => sum + Number(b.grandTotal || 0), 0);
  const activeEngineersCount = employees.filter(emp => {
    const ended = emp.ended_at ? new Date(emp.ended_at) : null;
    return !ended || isNaN(ended.getTime()) || ended > new Date();
  }).length;

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#f97316'];

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-display font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart4 className="h-5 w-5 text-blue-600 animate-pulse" />
            <span>Team Productivity & Performance Metrics</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time analytics tracking engineer finished task volume and company-wise revenue generation.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Finished Tasks</p>
            <h3 className="text-2xl font-extrabold text-slate-900 font-mono mt-1">{totalFinishedTasks}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Billed Revenue</p>
            <h3 className="text-2xl font-extrabold text-blue-600 font-mono mt-1">₹ {totalRevenue.toFixed(2)}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Active Engineers</p>
            <h3 className="text-2xl font-extrabold text-indigo-600 font-mono mt-1">{activeEngineersCount}</h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Generated Invoices</p>
            <h3 className="text-2xl font-extrabold text-amber-600 font-mono mt-1">{savedBills.length}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
            <Award className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Total Finished Tasks by Engineer */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span>Finished Tasks by Engineer</span>
            </h4>
            <span className="text-[10px] font-bold text-slate-400">Productivity Index</span>
          </div>

          <div className="h-[320px] w-full pt-2">
            {finishedTasksByEngineer.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No finished tasks recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={finishedTasksByEngineer} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tickLine={false} tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(val) => [`${val} Tasks`, 'Finished']} />
                  <Bar dataKey="finishedTasks" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={20}>
                    {finishedTasksByEngineer.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Company Revenue Breakdown */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Building className="h-4 w-4 text-emerald-600" />
              <span>Company Revenue Breakdown (₹)</span>
            </h4>
            <span className="text-[10px] font-bold text-slate-400">Financial Yield</span>
          </div>

          <div className="h-[320px] w-full pt-2">
            {revenueByCompany.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No revenue records or generated bills found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByCompany} margin={{ top: 5, right: 30, left: 20, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                  <YAxis tickLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`₹ ${Number(val).toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={28}>
                    {revenueByCompany.map((entry, index) => (
                      <Cell key={`rev-cell-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
