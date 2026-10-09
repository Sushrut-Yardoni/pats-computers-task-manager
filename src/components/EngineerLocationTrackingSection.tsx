import React, { useState, useEffect, useMemo } from "react";
import { 
  Navigation, Radio, MapPin, Satellite, Battery, BatteryCharging, 
  RefreshCw, ExternalLink, Clock, ShieldCheck, AlertCircle, Compass, 
  Search, Eye, Calendar, Layers, Activity, Car, CheckCircle2, ChevronRight, X
} from "lucide-react";
import { Employee } from "../types";

export interface LiveEngineerLocation {
  employee_id: number;
  employee_name: string;
  employee_role: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  altitude?: number | null;
  battery_level: number | null;
  is_charging: boolean | null;
  status: "active" | "recent" | "idle" | "offline";
  last_seen_relative: string;
  updated_at: string | null;
  active_task_id: number | null;
  active_task_customer: string | null;
  action_context: string | null;
  is_moving?: boolean;
}

export interface LocationBreadcrumb {
  id: number;
  employee_id: number;
  employee_name: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  action_context: string;
  address?: string | null;
  created_at: string;
}

interface EngineerLocationTrackingSectionProps {
  employees: Employee[];
}

export default function EngineerLocationTrackingSection({
  employees
}: EngineerLocationTrackingSectionProps) {
  const [locations, setLocations] = useState<LiveEngineerLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "moving" | "offline">("all");

  // Breadcrumbs Modal state
  const [selectedHistoryEngineer, setSelectedHistoryEngineer] = useState<LiveEngineerLocation | null>(null);
  const [historyLogs, setHistoryLogs] = useState<LocationBreadcrumb[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Fetch live locations from backend
  const fetchLiveLocations = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const resp = await fetch("/api/locations/live");
      if (resp.ok) {
        const data = await resp.json();
        setLocations(data.locations || []);
        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.warn("Failed to fetch live engineer locations:", err);
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveLocations();
  }, []);

  // Periodic polling every 15s when autoRefresh is enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLiveLocations(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Load breadcrumbs history for selected engineer
  const handleOpenHistory = async (engineer: LiveEngineerLocation) => {
    setSelectedHistoryEngineer(engineer);
    setIsLoadingHistory(true);
    try {
      const resp = await fetch(`/api/locations/history/${engineer.employee_id}?date=${selectedHistoryDate}`);
      if (resp.ok) {
        const data = await resp.json();
        setHistoryLogs(data.breadcrumbs || []);
      } else {
        setHistoryLogs([]);
      }
    } catch {
      setHistoryLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDateChange = async (dateStr: string) => {
    setSelectedHistoryDate(dateStr);
    if (!selectedHistoryEngineer) return;
    setIsLoadingHistory(true);
    try {
      const resp = await fetch(`/api/locations/history/${selectedHistoryEngineer.employee_id}?date=${dateStr}`);
      if (resp.ok) {
        const data = await resp.json();
        setHistoryLogs(data.breadcrumbs || []);
      }
    } catch {
      setHistoryLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Filtered engineers list
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      const matchesSearch = 
        loc.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.employee_role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (loc.active_task_customer && loc.active_task_customer.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === "active") {
        return loc.status === "active";
      }
      if (statusFilter === "moving") {
        return loc.status === "active" && (loc.speed || 0) > 3;
      }
      if (statusFilter === "offline") {
        return loc.status === "offline" || loc.status === "idle";
      }

      return true;
    });
  }, [locations, searchQuery, statusFilter]);

  // Calculated stats
  const totalCount = locations.length;
  const liveActiveCount = locations.filter(l => l.status === "active").length;
  const movingCount = locations.filter(l => l.status === "active" && (l.speed || 0) > 3).length;
  const stationaryCount = liveActiveCount - movingCount;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* 📡 Header & Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100/80 shadow-2xs">
              <Satellite className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Field Engineer GPS Live Radar</span>
                <span className="bg-emerald-500/15 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Sub-10m Precision
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Real-time satellite coordinates & mobile telemetry streamed from engineers' installed web app
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              autoRefresh 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs" 
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-ping" : "bg-slate-400"}`} />
            <span>{autoRefresh ? "Auto-Radar (15s)" : "Auto-Radar Paused"}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchLiveLocations(true)}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Pinging..." : "Refresh Signals"}</span>
          </button>
        </div>
      </div>

      {/* 📊 KPI Telemetry Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Field Fleet</span>
            <Radio className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{totalCount}</p>
          <span className="text-[11px] font-semibold text-slate-500 mt-0.5 block">Total active engineers</span>
        </div>

        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Transmitting Live</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-emerald-700 font-mono">{liveActiveCount}</p>
          <span className="text-[11px] font-semibold text-emerald-600 mt-0.5 block">Live GPS satellite lock</span>
        </div>

        <div className="bg-white border border-blue-200/80 rounded-2xl p-4 shadow-2xs bg-blue-50/20">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">In Transit</span>
            <Car className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 font-mono">{movingCount}</p>
          <span className="text-[11px] font-semibold text-blue-600 mt-0.5 block">En route ({'>'}3 km/h)</span>
        </div>

        <div className="bg-white border border-indigo-200/80 rounded-2xl p-4 shadow-2xs bg-indigo-50/20">
          <div className="flex items-center justify-between text-indigo-700 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">At Client Site</span>
            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-700 font-mono">{stationaryCount >= 0 ? stationaryCount : 0}</p>
          <span className="text-[11px] font-semibold text-indigo-600 mt-0.5 block">Stationary servicing</span>
        </div>
      </div>

      {/* 🔍 Search and Status Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "all" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Fleet ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "active" ? "bg-white text-emerald-700 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Live Active ({liveActiveCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("moving")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "moving" ? "bg-white text-blue-700 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Moving ({movingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("offline")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "offline" ? "bg-white text-slate-700 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Offline / Standby ({totalCount - liveActiveCount})
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search engineer, role, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2 rounded-2xl text-xs focus:outline-none focus:border-blue-500 font-medium text-slate-800 shadow-2xs"
          />
        </div>
      </div>

      {/* 🧭 Engineer Live Tracking Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredLocations.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-3xl p-12 text-center">
            <Radio className="h-10 w-10 text-slate-300 mx-auto mb-3 animate-pulse" />
            <h4 className="text-sm font-bold text-slate-800">No Engineer GPS Signals Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchQuery 
                ? "No engineers matched your search filter." 
                : "Engineers will appear here once they log into the app on their phone with GPS location enabled."}
            </p>
          </div>
        ) : (
          filteredLocations.map((engineer) => {
            const hasCoords = engineer.latitude !== null && engineer.longitude !== null;
            const isLive = engineer.status === "active";
            const googleMapsUrl = hasCoords 
              ? `https://www.google.com/maps/search/?api=1&query=${engineer.latitude},${engineer.longitude}` 
              : "#";

            return (
              <div 
                key={engineer.employee_id}
                className={`bg-white border rounded-3xl p-5 shadow-xs transition-all relative overflow-hidden flex flex-col justify-between ${
                  isLive 
                    ? "border-emerald-200 ring-2 ring-emerald-500/10 hover:shadow-md" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Status Indicator Banner Accent */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                  isLive 
                    ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" 
                    : "bg-slate-200"
                }`} />

                <div>
                  {/* Top Bar: Engineer Name, Role & Status Tag */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm ${
                        isLive 
                          ? "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300" 
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {engineer.employee_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-snug">
                          {engineer.employee_name}
                        </h4>
                        <span className="text-[11px] font-medium text-slate-500 block">
                          {engineer.employee_role} • #{engineer.employee_id}
                        </span>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                      isLive 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      <span>{isLive ? "Live GPS" : engineer.status}</span>
                    </span>
                  </div>

                  {/* Active Assigned Ticket */}
                  {engineer.active_task_customer && (
                    <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl p-2.5 mb-3 flex items-center gap-2 text-xs">
                      <Layers className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 block">
                          Current Assigned Call
                        </span>
                        <p className="font-bold text-slate-900 truncate">
                          #{engineer.active_task_id} • {engineer.active_task_customer}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Coordinates & Accuracy Details */}
                  {hasCoords ? (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5 font-mono text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase text-slate-400">
                          <MapPin className="h-3.5 w-3.5 text-blue-600" />
                          <span>Exact Coordinates</span>
                        </span>
                        <span className="text-slate-900 font-bold select-all">
                          {engineer.latitude?.toFixed(5)}°, {engineer.longitude?.toFixed(5)}°
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                        <div>
                          <span className="text-[9px] font-sans font-bold uppercase text-slate-400 block">GPS Precision</span>
                          <span className="font-bold text-emerald-700">
                            ±{engineer.accuracy ? engineer.accuracy : "5.0"}m (Hardware)
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-sans font-bold uppercase text-slate-400 block">Movement Speed</span>
                          <span className="font-bold text-slate-900">
                            {engineer.speed && engineer.speed > 0 ? `${engineer.speed} km/h` : "Stationary (0 km/h)"}
                          </span>
                        </div>
                      </div>

                      {/* Battery & Transit Telemetry */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          {engineer.is_charging ? (
                            <BatteryCharging className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Battery className="h-3.5 w-3.5 text-slate-500" />
                          )}
                          <span className="font-semibold">
                            {engineer.battery_level !== null ? `${engineer.battery_level}% Battery` : "Battery: N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">{engineer.last_seen_relative}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-400">
                      <Compass className="h-6 w-6 mx-auto mb-1 text-slate-300" />
                      <span>No GPS signal received yet</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Will lock once app is opened on mobile phone
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center gap-2 pt-4 mt-3 border-t border-slate-100">
                  {hasCoords ? (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 px-3 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Google Maps</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex-1 bg-slate-100 text-slate-400 rounded-xl py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1 cursor-not-allowed"
                    >
                      <span>Location Pending</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenHistory(engineer)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2 px-3 text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                    title="View route trail history for this engineer"
                  >
                    <Activity className="h-3.5 w-3.5 text-slate-500" />
                    <span>Trail History</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 📜 MODAL: Engineer Route Trail History */}
      {selectedHistoryEngineer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <h4 className="font-black text-sm sm:text-base text-slate-900">
                    GPS Breadcrumbs Route Trail: {selectedHistoryEngineer.employee_name}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Chronological satellite coordinates recorded during field duties
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHistoryEngineer(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Date Toolbar */}
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-600">Select Date:</span>
                <input
                  type="date"
                  value={selectedHistoryDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                />
              </div>

              <span className="text-xs font-bold text-slate-500 font-mono">
                {historyLogs.length} breadcrumb points recorded
              </span>
            </div>

            {/* Breadcrumb List Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {isLoadingHistory ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                  <span>Loading route trail breadcrumbs...</span>
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <span className="font-bold text-slate-600 block">No route breadcrumbs recorded for this date</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Location breadcrumbs are stored automatically as the engineer moves with the app open.
                  </p>
                </div>
              ) : (
                historyLogs.map((log, idx) => {
                  const gMapLink = `https://www.google.com/maps/search/?api=1&query=${log.latitude},${log.longitude}`;
                  const timeFormatted = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                  return (
                    <div 
                      key={log.id || idx}
                      className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:bg-white hover:border-blue-200 transition-all text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-mono font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 font-mono">{timeFormatted}</span>
                            <span className="bg-slate-200/80 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {log.action_context || "Transit Fix"}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500 select-all block mt-0.5">
                            {log.latitude.toFixed(6)}°, {log.longitude.toFixed(6)}° (Precision: ±{log.accuracy?.toFixed(1) || "5.0"}m)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {log.speed && log.speed > 0 ? (
                          <span className="font-mono font-bold text-blue-700 text-[11px]">
                            {log.speed} km/h
                          </span>
                        ) : null}

                        <a
                          href={gMapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Map Point</span>
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
