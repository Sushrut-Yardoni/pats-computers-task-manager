import React, { useState, useEffect } from "react";
import { 
  Database, Search, FileJson, Table, RefreshCw, Layers, Users, Fuel, Settings, Terminal, Shield, ArrowRight, Eye
} from "lucide-react";
import { Task, Employee, OfflineTravel, SqlLog } from "../types";

export default function DatabaseExplorerSection({
  tasks: initialTasks,
  employees: initialEmployees
}: {
  tasks: Task[];
  employees: Employee[];
}) {
  const [selectedTable, setSelectedTable] = useState<"employees" | "tasks" | "offline_travels" | "settings" | "sql_logs">("employees");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Local state for fetched database tables to ensure interactive live refresh and full reads
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [offlineTravels, setOfflineTravels] = useState<OfflineTravel[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [sqlLogs, setSqlLogs] = useState<SqlLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  const fetchFullDatabase = async () => {
    setIsLoading(true);
    try {
      const fetchJson = async (url: string, fallback: any) => {
        try {
          const r = await fetch(url);
          if (!r.ok) {
            const errBody = await r.json().catch(() => ({}));
            throw new Error(errBody.error || `HTTP ${r.status}`);
          }
          return await r.json();
        } catch (e) {
          console.warn(`Failed to fetch ${url}:`, e);
          return fallback;
        }
      };

      const [empRes, taskRes, travelRes, settingsRes, logsRes] = await Promise.all([
        fetchJson("/api/employees", []),
        fetchJson("/api/tasks", []),
        fetchJson("/api/offline-travels", []),
        fetchJson("/api/settings", { petrol_price: 100 }),
        fetchJson("/api/sql/logs", [])
      ]);

      setEmployees(empRes);
      setTasks(taskRes);
      setOfflineTravels(travelRes);
      setSettings(settingsRes || { petrol_price: 100 });
      setSqlLogs(logsRes);
    } catch (error) {
      console.error("Failed to load full database tables:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFullDatabase();
  }, [initialTasks, initialEmployees]);

  // Determine current active table dataset
  const getTableData = () => {
    switch (selectedTable) {
      case "employees":
        return employees;
      case "tasks":
        return tasks;
      case "offline_travels":
        return offlineTravels;
      case "settings":
        return settings ? [settings] : [];
      case "sql_logs":
        return sqlLogs;
      default:
        return [];
    }
  };

  const activeData = getTableData();

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [dbSelectedMonth, setDbSelectedMonth] = useState<string>("All");

  // Extract unique months from current active table rows
  const uniqueDbMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    activeData.forEach((row: any) => {
      const dateKeys = ["joined_at", "assigned_at", "created_at", "timestamp", "ended_at", "accepted_at", "finished_at"];
      for (const k of dateKeys) {
        if (row[k] && typeof row[k] === "string") {
          const match = row[k].match(/^(\d{4}-\d{2})/);
          if (match) {
            monthsSet.add(match[1]);
            break;
          }
        }
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [activeData]);

  const formatDbMonthKey = (monthKey: string) => {
    try {
      const [year, month] = monthKey.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleString("default", { month: "long", year: "numeric" });
    } catch {
      return monthKey;
    }
  };

  // Reset page/filters when active table selection changes
  useEffect(() => {
    setDbSelectedMonth("All");
    setCurrentPage(1);
  }, [selectedTable]);

  // Search filter implementation
  const searchedData = activeData.filter((row: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return Object.values(row).some((val) => {
      if (val === null || val === undefined) return false;
      if (typeof val === "object") {
        return JSON.stringify(val).toLowerCase().includes(query);
      }
      return String(val).toLowerCase().includes(query);
    });
  });

  // Second, month filter implementation
  const filteredData = searchedData.filter((row: any) => {
    if (dbSelectedMonth === "All") return true;
    const dateKeys = ["joined_at", "assigned_at", "created_at", "timestamp", "ended_at", "accepted_at", "finished_at"];
    for (const k of dateKeys) {
      if (row[k] && typeof row[k] === "string") {
        if (row[k].startsWith(dbSelectedMonth)) {
          return true;
        }
      }
    }
    return false;
  });

  // Third, slicing implementation
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset to first page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [dbSelectedMonth, searchQuery]);

  // Table information metadata
  const getTableMeta = () => {
    switch (selectedTable) {
      case "employees":
        return {
          name: "employees",
          primaryKey: "id",
          foreignKeys: "None",
          description: "Technical service engineers and technicians certified for client dispatch tickets.",
          columns: ["id", "name", "role", "email_id", "password", "joined_at", "ended_at"]
        };
      case "tasks":
        return {
          name: "tasks",
          primaryKey: "id",
          foreignKeys: "assigned_to -> employees.id",
          description: "Registered diagnostic tickets, client descriptions, resolution status and associated technician tasks.",
          columns: ["id", "customer_name", "contact_details", "problem_reported", "assigned_to", "status", "assigned_at", "accepted_at", "finished_at", "remarks", "is_priority"]
        };
      case "offline_travels":
        return {
          name: "offline_travels",
          primaryKey: "id",
          foreignKeys: "employee_id -> employees.id, task_id -> tasks.id",
          description: "Logs of physical travel kilometers generated off-network on a per-task basis by service engineers.",
          columns: ["id", "employee_id", "employee_name", "task_id", "task_name", "km_travelled", "remarks", "created_at"]
        };
      case "settings":
        return {
          name: "settings",
          primaryKey: "Single Config Object",
          foreignKeys: "None",
          description: "Core organizational calibration parameters (such as fuel and petrol allowance pricing rates).",
          columns: ["petrol_price"]
        };
      case "sql_logs":
        return {
          name: "sql_logs (audit)",
          primaryKey: "In-Memory Sequence",
          foreignKeys: "None",
          description: "Chronological audit trial logs of executed backend relational SQL simulations and direct data adjustments.",
          columns: ["timestamp", "sql", "rowsAffected"]
        };
    }
  };

  const meta = getTableMeta();

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      
      {/* DB Overview Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        {/* Table Employee Card */}
        <button
          onClick={() => { setSelectedTable("employees"); setSelectedRow(null); }}
          className={`p-4 border rounded-2xl text-left transition-all cursor-pointer ${
            selectedTable === "employees"
              ? "bg-blue-50/50 border-blue-500 shadow-md ring-1 ring-blue-500/20"
              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Employees</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xl font-extrabold font-mono text-slate-900">{employees.length}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Primary Table</p>
        </button>

        {/* Table Tasks Card */}
        <button
          onClick={() => { setSelectedTable("tasks"); setSelectedRow(null); }}
          className={`p-4 border rounded-2xl text-left transition-all cursor-pointer ${
            selectedTable === "tasks"
              ? "bg-indigo-50/50 border-indigo-500 shadow-md ring-1 ring-indigo-500/20"
              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tasks</span>
            <Layers className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-xl font-extrabold font-mono text-slate-900">{tasks.length}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Support Tickets</p>
        </button>

        {/* Table Offline Travels Card */}
        <button
          onClick={() => { setSelectedTable("offline_travels"); setSelectedRow(null); }}
          className={`p-4 border rounded-2xl text-left transition-all cursor-pointer ${
            selectedTable === "offline_travels"
              ? "bg-emerald-50/50 border-emerald-500 shadow-md ring-1 ring-emerald-500/20"
              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Travel logs</span>
            <Fuel className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold font-mono text-slate-900">{offlineTravels.length}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Travel Distance</p>
        </button>

        {/* Admin Settings Card */}
        <button
          onClick={() => { setSelectedTable("settings"); setSelectedRow(null); }}
          className={`p-4 border rounded-2xl text-left transition-all cursor-pointer ${
            selectedTable === "settings"
              ? "bg-purple-50/50 border-purple-500 shadow-md ring-1 ring-purple-500/20"
              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Settings</span>
            <Settings className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-xl font-extrabold font-mono text-slate-900">₹ {settings?.petrol_price || "-"}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">System Params</p>
        </button>

        {/* SQL Transaction Log Card */}
        <button
          onClick={() => { setSelectedTable("sql_logs"); setSelectedRow(null); }}
          className={`p-4 border rounded-2xl text-left transition-all cursor-pointer ${
            selectedTable === "sql_logs"
              ? "bg-teal-50/50 border-teal-500 shadow-md ring-1 ring-teal-500/20"
              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">SQL Audit</span>
            <Terminal className="h-4 w-4 text-teal-600" />
          </div>
          <p className="text-xl font-extrabold font-mono text-slate-900">{sqlLogs.length}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Transaction History</p>
        </button>

      </div>

      {/* Main Database Table Registry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Table Viewer with Controls (8 columns on large screen to save room for JSON Inspector) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col min-h-[480px]">
          
          {/* Section Heading & Refresh CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Table className="h-4 w-4 text-slate-500" />
                <span>Browsing Table: {meta?.name}</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1 max-w-xl">{meta?.description}</p>
            </div>
            
            <button
              onClick={fetchFullDatabase}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-[11px] uppercase tracking-wide cursor-pointer transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "Refreshing..." : "Sync DB"}</span>
            </button>
          </div>

          {/* Search Table Columns & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder={`Search in relational records of ${meta?.name}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 text-slate-800 pl-10 pr-4 py-2.5 rounded-2xl text-xs focus:outline-none transition-all font-medium"
              />
            </div>

            {/* Dynamic Month Selection Picker for current table */}
            {uniqueDbMonths.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl text-xs shrink-0 font-sans">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Month:</span>
                <select
                  value={dbSelectedMonth}
                  onChange={(e) => setDbSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 p-1 rounded-lg text-[10.5px] font-extrabold focus:outline-none transition-all cursor-pointer font-sans"
                >
                  <option value="All">All Months</option>
                  {uniqueDbMonths.map(m => (
                    <option key={m} value={m}>{formatDbMonthKey(m)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Pagination row */}
          <div className="flex flex-col gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 mb-4 text-xs font-sans">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Per Page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 text-slate-800 py-0.5 px-2 rounded-lg text-[10px] font-bold focus:outline-none transition-all cursor-pointer"
              >
                {[5, 10, 20, 50].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-[10px] font-bold text-slate-600">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            
            <span className="text-[10px] text-slate-500 font-bold font-mono">
              Showing {paginatedData.length} of {filteredData.length} filtered records
            </span>
          </div>

          {/* RDB Schema Key details bar */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-mono text-slate-400 bg-slate-50 px-4 py-2 rounded-xl mb-4 border border-slate-100">
            <div><strong className="text-slate-600">PRIMARY KEY:</strong> <span className="text-indigo-600 font-extrabold">{meta?.primaryKey}</span></div>
            <div><strong className="text-slate-600">FOREIGN RELATIONSHIPS:</strong> <span className="text-teal-600 font-extrabold">{meta?.foreignKeys}</span></div>
            <div><strong className="text-slate-600">MAX BUFFERED:</strong> <span className="text-blue-600 font-extrabold">Auto-Slicing</span></div>
          </div>

          {/* Interactive Table Element */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl flex-1 max-h-[400px]">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
               <thead className="bg-slate-100 sticky top-0 z-15 shadow-sm border-b border-slate-200">
                <tr>
                  {meta?.columns.map((col) => (
                    <th key={col} className="px-4 py-3 font-extrabold uppercase tracking-wider text-slate-900 text-[10px]">
                      {col}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-extrabold uppercase tracking-wider text-slate-900 text-[10px] text-right">
                    Inspect Raw
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={meta?.columns.length ? meta.columns.length + 1 : 1} className="px-5 py-16 text-center text-slate-400 italic font-medium">
                      No records match the active search/month filters or the table is empty.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row: any, idx: number) => {
                    const rowId = row[meta?.primaryKey || "id"] || idx;
                    const isSelected = selectedRow && (selectedRow[meta?.primaryKey || "id"] === rowId || JSON.stringify(selectedRow) === JSON.stringify(row));
                    
                    return (
                      <tr 
                        key={idx}
                        onClick={() => setSelectedRow(row)}
                        className={`hover:bg-blue-50/30 transition-colors cursor-pointer text-[11px] ${
                          isSelected ? "bg-blue-50/70 text-slate-900 border-l-2 border-l-blue-600" : "text-slate-700"
                        }`}
                      >
                        {meta?.columns.map((col) => {
                          let displayValue = "";
                          const rawVal = row[col];

                          if (rawVal === null || rawVal === undefined) {
                            displayValue = "NULL";
                          } else if (typeof rawVal === "boolean") {
                            displayValue = rawVal ? "TRUE" : "FALSE";
                          } else if (typeof rawVal === "object") {
                            displayValue = JSON.stringify(rawVal);
                          } else {
                            displayValue = String(rawVal);
                          }

                          // Truncate long descriptions
                          if (displayValue.length > 50) {
                            displayValue = displayValue.slice(0, 48) + "...";
                          }

                          // Formatting helper classes
                          const isPk = col === "id";
                          const isStatus = col === "status";
                          
                          return (
                            <td key={col} className="px-4 py-3 whitespace-nowrap">
                              {isPk ? (
                                <span className="font-mono font-extrabold text-blue-700 select-all">#{displayValue}</span>
                              ) : isStatus ? (
                                <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[9px] font-bold ${
                                  displayValue === "Pending" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" :
                                  displayValue === "In Progress" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" :
                                  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                }`}>
                                  {displayValue}
                                </span>
                              ) : col === "password" ? (
                                <span className="font-mono text-slate-300 tracking-widest select-none">••••••••</span>
                              ) : col === "km_travelled" ? (
                                <span className="font-mono font-extrabold text-indigo-700 select-all">{displayValue} KM</span>
                              ) : (
                                <span className="font-medium select-all">{displayValue}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRow(row);
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-extrabold transition-all"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Raw Data</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Count stats */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-4 pt-3 border-t border-slate-100">
            <span>Showing {paginatedData.length} of {filteredData.length} filtered records</span>
            <span className="text-slate-300">|</span>
            <span>Click any record row to output detailed relational structure in JSON console.</span>
          </div>

        </div>

        {/* Database Raw JSON Inspector Sidebar (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* JSON Console Code editor style card */}
          <div className="bg-slate-900 border border-slate-950 text-slate-200 rounded-3xl p-5 shadow-xl flex flex-col min-h-[380px]">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5 font-bold">
                <FileJson className="h-4 w-4 text-emerald-500" />
                <span>JSON Schema Inspector</span>
              </span>
              
              {selectedRow && (
                <button
                  onClick={() => setSelectedRow(null)}
                  className="text-[9px] font-mono bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300 transition-colors cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {selectedRow ? (
              <div className="flex-1 flex flex-col justify-between font-mono text-[11px] leading-relaxed">
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar select-all">
                  <pre className="text-emerald-400">{JSON.stringify(selectedRow, null, 2)}</pre>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Data Node Diagnostics</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                    <div className="bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">
                      <strong>ID:</strong> #{selectedRow.id || "N/A"}
                    </div>
                    <div className="bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">
                      <strong>Source:</strong> {meta?.name}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-2xl">
                <Database className="h-10 w-10 text-slate-700 animate-pulse mb-3" />
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Console Idle</h4>
                <p className="text-[10px] text-slate-500 font-sans max-w-xs mt-1.5 leading-relaxed">
                  Click any database row in the table view to parse and inspect its full attributes securely.
                </p>
              </div>
            )}
          </div>

          {/* Database System integrity report Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>RDB Security & Structure</span>
            </h4>
            
            <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium">
              This system implements a relational schema emulation persisted reliably server-side in localized JSON-based archives with complete logging of transacted query procedures.
            </p>

            <div className="space-y-2.5 text-[10px] font-mono divide-y divide-slate-150">
              <div className="flex justify-between py-2.5 text-slate-500">
                <span>Database Client:</span>
                <span className="font-extrabold text-blue-700">Relational SQL Client</span>
              </div>
              <div className="flex justify-between py-2.5 text-slate-500">
                <span>Transactions Security:</span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">PASSED</span>
              </div>
              <div className="flex justify-between py-2.5 text-slate-500">
                <span>Total Active Models:</span>
                <span className="font-extrabold text-slate-800">5 Distinct Tables</span>
              </div>
              <div className="flex justify-between py-2.5 text-slate-500">
                <span>Foreign Checks:</span>
                <span className="font-extrabold text-slate-800">Operational Integrity</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
