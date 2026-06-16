import React, { useState, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { Task, Employee } from "../types";

interface AnalyticsSectionProps {
  tasks: Task[];
  employees: Employee[];
}

export default function AnalyticsSection({ tasks, employees }: AnalyticsSectionProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("All");
  const [selectedEngineer, setSelectedEngineer] = useState<string>("All");

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const monthMatch = selectedMonth === "All" || (t.assigned_at?.substring(0, 7) === selectedMonth);
      const engMatch = selectedEngineer === "All" || (t.employee_name === selectedEngineer);
      return monthMatch && engMatch;
    });
  }, [tasks, selectedMonth, selectedEngineer]);

  const uniqueMonths = useMemo(() => {
    const months = new Set(tasks.map(t => t.assigned_at?.substring(0, 7)).filter(Boolean) as string[]);
    return ["All", ...Array.from(months).sort().reverse()];
  }, [tasks]);

  const uniqueEngineers = useMemo(() => {
    const engs = new Set(tasks.map(t => t.employee_name || "Unassigned"));
    return ["All", ...Array.from(engs).sort()];
  }, [tasks]);
  
  // Data processing based on filteredTasks
  const totalTasks = filteredTasks.length;
  const pendingCount = filteredTasks.filter(t => t.status === "Pending").length;
  const inProgressCount = filteredTasks.filter(t => t.status === "In Progress").length;
  const finishedCount = filteredTasks.filter(t => t.status === "Finished").length;

  const priorityTasks = filteredTasks.filter(t => t.is_priority);
  const standardTasks = filteredTasks.filter(t => !t.is_priority);

  const tasksPerEngineer = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasks.forEach(t => {
      const name = t.employee_name || "Unassigned";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, value: count }));
  }, [filteredTasks]);

  const tasksByMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasks.forEach(t => {
      if (t.assigned_at) {
        const month = t.assigned_at.substring(0, 7);
        counts[month] = (counts[month] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, value: count }));
  }, [filteredTasks]);

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-extrabold text-slate-900">Operations Analytics Dashboard</h2>
        
        {/* Slicers */}
        <div className="flex gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Month</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg py-1.5 px-3 bg-white"
            >
              {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Engineer</label>
            <select 
              value={selectedEngineer} 
              onChange={(e) => setSelectedEngineer(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg py-1.5 px-3 bg-white"
            >
              {uniqueEngineers.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Total Tasks</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalTasks}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">Pending</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">In Progress</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{inProgressCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Finished</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{finishedCount}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Status Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-tight mb-4">Task Status Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: "Pending", value: pendingCount, color: "#f59e0b" },
                  { name: "In Progress", value: inProgressCount, color: "#2563eb" },
                  { name: "Finished", value: finishedCount, color: "#10b981" }
                ]}
                innerRadius={70}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {[ { color: "#f59e0b" }, { color: "#2563eb" }, { color: "#10b981" } ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 2. Task Volume Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-tight mb-4">Task Volume by Status</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: "Pending", value: pendingCount },
              { name: "In Progress", value: inProgressCount },
              { name: "Finished", value: finishedCount }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 3. Tasks per Engineer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-tight mb-4">Workload per Engineer</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tasksPerEngineer} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} fontSize={10} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 4. Task Trend Line */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-tight mb-4">Service Requests Trend</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={tasksByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 5. Priority Area Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-tight mb-4">Priority vs Standard Requests</h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={[
              { name: "Priority", value: priorityTasks.length },
              { name: "Standard", value: standardTasks.length }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#fecaca" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 6. Employee Distribution by Role (Example Data) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-tight mb-4">Team Composition (Roles)</h4>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                    { name: "Admin", value: employees.filter(e => e.role === "Admin").length },
                    { name: "Service Eng.", value: employees.filter(e => e.role.includes("Service Engineer")).length },
                    { name: "Office Boy", value: employees.filter(e => e.role === "Office Boy").length },
                ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
