import React, { useState, useEffect } from "react";
import { 
  Clock, MapPin, Search, Calendar, User, ArrowDownCircle, ArrowUpDown, 
  Map, CheckCircle, AlertCircle, Copy, Terminal, Shield, RefreshCw
} from "lucide-react";
import { Employee } from "../types";

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_role: string;
  date: string;
  in_time: string | null;
  out_time: string | null;
  in_location_coords: string | null;
  out_location_coords: string | null;
}

interface AttendanceSectionProps {
  currentUser: { id?: number; name: string; role: string; type: "admin" | "employee" | "manager" };
  employees: Employee[];
}

export default function AttendanceSection({ currentUser, employees }: AttendanceSectionProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [errorMsg, setErrorError] = useState<string | null>(null);

  // In-App Toast
  const [attendanceToast, setAttendanceToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const showAttendanceToast = (message: string, isError = false) => {
    setAttendanceToast({ message, isError });
    setTimeout(() => setAttendanceToast(null), 3500);
  };

  // Filter States
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const isAdminOrManager = currentUser.type === "admin" || currentUser.role.toLowerCase() === "manager";

  const fetchRecords = async () => {
    setIsLoading(true);
    setErrorError(null);
    try {
      // If employee, only get their own records by default
      const url = !isAdminOrManager && currentUser.id
        ? `/api/attendance?employee_id=${currentUser.id}`
        : `/api/attendance`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      } else {
        throw new Error("Failed to fetch attendance history.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorError(err.message || "Failed to load attendance records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [currentUser.id]);

  // Determine current punch state for Employee
  const myRecords = records.filter(r => r.employee_id === currentUser.id);
  const dateStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Kolkata" });
  const todayRecord = myRecords.find(r => r.date === dateStr);
  
  // They are punched in if today has an in_time but no out_time yet
  const isPunchedIn = todayRecord ? (!!todayRecord.in_time && !todayRecord.out_time) : false;
  const latestRecord = todayRecord || (myRecords.length > 0 ? myRecords[0] : null);

  const handleResetAttendance = async () => {
    try {
      const res = await fetch("/api/attendance", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRecords([]);
        showAttendanceToast("All attendance records have been reset successfully.");
        fetchRecords();
      } else {
        throw new Error(data.error || "Failed to reset attendance records.");
      }
    } catch (err: any) {
      showAttendanceToast(err.message || "Error resetting attendance records.", true);
    }
  };

  const handlePunch = async (type: "In" | "Out") => {
    setPunching(true);
    setErrorError(null);

    const submitWithGoogleMapsGeocode = async (lat: number, lng: number, fallbackLabel: string) => {
      const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyAs8vT-YrFHu8XDuGnYccwFyOxPYRavzog";
      let coordsText = fallbackLabel;
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results[0]) {
            coordsText = `${lat.toFixed(6)}, ${lng.toFixed(6)} (${data.results[0].formatted_address})`;
          }
        }
      } catch (e) {
        console.warn("Google Maps Geocoding error:", e);
      }

      fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: currentUser.id,
          employee_name: currentUser.name,
          employee_role: currentUser.role,
          type,
          location_coords: coordsText
        })
      })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Punch transaction failed.");
        }
        return res.json();
      })
      .then(() => {
        fetchRecords();
        showAttendanceToast(`Successfully registered punch ${type === "In" ? "IN" : "OUT"} with location verification!`);
      })
      .catch((err: any) => {
        console.error(err);
        setErrorError(err.message || "Attendance logging error.");
        showAttendanceToast(err.message || "Attendance logging error.", true);
      })
      .finally(() => {
        setPunching(false);
      });
    };

    const fallbackToNetworkIP = async () => {
      try {
        const res = await fetch("/api/ip-lookup");
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data.latitude && data.longitude) {
              const lat = Number(data.latitude);
              const lng = Number(data.longitude);
              if (lat >= 5.0 && lat <= 40.0 && lng >= 65.0 && lng <= 100.0) {
                submitWithGoogleMapsGeocode(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)} (Network IP)`);
                return;
              }
            }
          }
        }
      } catch (err) {
        console.warn("Network IP lookup error, using fallback HQ location:", err);
      }
      submitWithGoogleMapsGeocode(18.520400, 73.856700, "Pune PATS HQ (Automatic Fallback)");
    };

    // Add a 1.5-second short delay to wait for a more stable GPS hardware lock
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          if (lat >= 5.0 && lat <= 40.0 && lng >= 65.0 && lng <= 100.0) {
            submitWithGoogleMapsGeocode(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)} (GPS Verified)`);
          } else {
            console.warn(`GPS coordinates (${lat}, ${lng}) out of reasonable range. Switching to Network Lookup.`);
            fallbackToNetworkIP();
          }
        },
        (error) => {
          console.warn("GPS failed, trying Network IP detection:", error.message);
          fallbackToNetworkIP();
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      fallbackToNetworkIP();
    }
  };

  // Format helpers
  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    } catch {
      return "-";
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      // Split YYYY-MM-DD
      const [year, month, day] = dateStr.split("-");
      if (year && month && day) {
        const d = new Date(Number(year), Number(month) - 1, Number(day));
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const calculateDuration = (inTime: string | null, outTime: string | null) => {
    if (!inTime) return "-";
    if (!outTime) return "Active Shift";
    try {
      const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
      if (diffMs < 0) return "-";
      const totalMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return `${hours}h ${mins}m`;
    } catch {
      return "-";
    }
  };

  // Extract clean numerical coordinates and build standard Google Maps pin query link
  const getGoogleMapsUrl = (locationCoords: string) => {
    if (!locationCoords) return "#";
    // Regex matches latitude & longitude (e.g. 12.3456, 78.9101 or 12.3456,78.9101 etc.)
    const match = locationCoords.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (match) {
      return `https://www.google.com/maps?q=${match[1]},${match[2]}`;
    }
    return `https://www.google.com/maps?q=${encodeURIComponent(locationCoords)}`;
  };

  // Filter records
  const filteredRecords = records.filter(r => {
    const matchesEmployee = !selectedEmployeeId || String(r.employee_id) === selectedEmployeeId;
    const matchesSearch = !searchQuery || 
      r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employee_role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.date.includes(searchQuery) ||
      (r.in_location_coords && r.in_location_coords.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.out_location_coords && r.out_location_coords.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesEmployee && matchesSearch;
  });


  return (
    <div className="space-y-6 text-slate-800 font-sans">
      
      {/* 🔴 PUNCH IN / OUT WIDGET FOR EMPLOYEES */}
      {!isAdminOrManager && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-50/50 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 mt-0.5">My Attendance Punch Clock</h3>
            </div>

            {/* Current State Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              {isPunchedIn ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-100 uppercase tracking-wider animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Punched In
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200 uppercase tracking-wider">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Punched Out
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-2">
            <button
              onClick={() => handlePunch("In")}
              disabled={punching || isPunchedIn}
              className={`p-5 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer shadow-3xs hover:shadow-md ${
                isPunchedIn
                  ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-800 active:scale-[0.98]"
              }`}
            >
              <ArrowDownCircle className="h-8 w-8" />
              <span className="text-sm font-extrabold uppercase tracking-wide">Punch In</span>
              <span className="text-[10px] opacity-90">Start work shift & record position</span>
            </button>

            <button
              onClick={() => handlePunch("Out")}
              disabled={punching || !isPunchedIn}
              className={`p-5 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer shadow-3xs hover:shadow-md ${
                !isPunchedIn
                  ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-rose-600 hover:bg-rose-700 text-white border-rose-800 active:scale-[0.98]"
              }`}
            >
              <ArrowUpDown className="h-8 w-8 rotate-180" />
              <span className="text-sm font-extrabold uppercase tracking-wide">Punch Out</span>
              <span className="text-[10px] opacity-90">End work shift & record position</span>
            </button>
          </div>

          {latestRecord && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-600 space-y-2.5 max-w-xl mx-auto">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-200/60 pb-1.5">Latest Day Shift Status</span>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div>Date: <strong className="text-slate-800">{formatDate(latestRecord.date)}</strong></div>
                <div className="text-right">Shift Duration: <strong className="text-slate-900 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 font-bold">{calculateDuration(latestRecord.in_time, latestRecord.out_time)}</strong></div>
                
                <div className="border-t border-slate-200/60 pt-2 col-span-2">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <div>
                      Punch In: <strong className="text-slate-800">{formatTime(latestRecord.in_time)}</strong>
                    </div>
                    {latestRecord.in_location_coords && (
                      <a 
                        href={getGoogleMapsUrl(latestRecord.in_location_coords)} 
                        target="_blank" 
                        referrerPolicy="no-referrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-mono font-bold"
                        title="Open Punch In GPS in Google Maps"
                      >
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>Map Location</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-2 col-span-2">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <div>
                      Punch Out: <strong className="text-slate-800">{formatTime(latestRecord.out_time)}</strong>
                    </div>
                    {latestRecord.out_location_coords && (
                      <a 
                        href={getGoogleMapsUrl(latestRecord.out_location_coords)} 
                        target="_blank" 
                        referrerPolicy="no-referrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-mono font-bold"
                        title="Open Punch Out GPS in Google Maps"
                      >
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>Map Location</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {latestRecord && (latestRecord.in_location_coords || latestRecord.out_location_coords) && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-w-xl mx-auto mt-4">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-rose-500 animate-bounce" />
                  <span>Google Maps Live Attendance Location</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">Google Maps Grounding</span>
              </div>
              <div className="h-48 w-full bg-slate-100 relative">
                <iframe
                  title="Attendance Google Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://www.google.com/maps/embed/v1/place?key=${(import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyAs8vT-YrFHu8XDuGnYccwFyOxPYRavzog"}&q=${encodeURIComponent(
                    latestRecord.in_location_coords || latestRecord.out_location_coords || "Pune, India"
                  )}`}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📋 ATTENDANCE LOG BOARD & CONTROL CENTER */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 uppercase">
              {isAdminOrManager ? "Attendance & Dispatch Registry" : "My Attendance Logs"}
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {isAdminOrManager && (
              <button 
                onClick={handleResetAttendance} 
                className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-rose-100 transition-colors"
                title="Reset All Attendance Records"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset All Records</span>
              </button>
            )}
            <button 
              onClick={fetchRecords} 
              className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-blue-100 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Records</span>
            </button>
          </div>
        </div>

        {/* Filters (Visible for Admins & Managers) */}
        {isAdminOrManager && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Employee Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Filter Engineer / Staff</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white text-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none cursor-pointer transition-colors"
              >
                <option value="">All Engineers & Office Boys</option>
                {employees
                  .filter(e => {
                    const r = (e.role || "").toLowerCase();
                    return !r.includes("manager") && !r.includes("admin");
                  })
                  .map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
              </select>
            </div>

            {/* Search Box */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Search Table Details</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Search name, coordinates, designation, date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white hover:border-slate-300 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* 📋 RECORDS DATA TABLE */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 italic text-xs">
            Loading attendance records...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12 text-slate-400 italic text-xs border border-dashed border-slate-200 rounded-2xl">
            No attendance logs found matching query.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  {isAdminOrManager && <th className="px-4 py-3">Staff Name</th>}
                  {isAdminOrManager && <th className="px-4 py-3">Designation</th>}
                  <th className="px-4 py-3">Punch In</th>
                  <th className="px-4 py-3">In Location</th>
                  <th className="px-4 py-3">Punch Out</th>
                  <th className="px-4 py-3">Out Location</th>
                  <th className="px-4 py-3 text-right">Worked Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                {filteredRecords.map((record) => {
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                        {formatDate(record.date)}
                      </td>
                      {isAdminOrManager && (
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {record.employee_name}
                          <span className="block text-[10px] font-normal text-slate-400 font-mono">ID: #{record.employee_id}</span>
                        </td>
                      )}
                      {isAdminOrManager && (
                        <td className="px-4 py-3 text-slate-500 font-sans">{record.employee_role}</td>
                      )}
                      
                      {/* Punch In Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {record.in_time ? (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold font-mono text-emerald-700">
                            {formatTime(record.in_time)}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">-</span>
                        )}
                      </td>
                      {/* Punch In GPS */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {record.in_location_coords ? (
                          <a 
                            href={getGoogleMapsUrl(record.in_location_coords)} 
                            target="_blank" 
                            referrerPolicy="no-referrer"
                            className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-blue-50 text-blue-600 hover:text-blue-800 border border-slate-200 hover:border-blue-200 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            title={record.in_location_coords}
                          >
                            <MapPin className="h-3.5 w-3.5 text-blue-500" />
                            <span>View Map</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Punch Out Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {record.out_time ? (
                          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold font-mono text-rose-700">
                            {formatTime(record.out_time)}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">-</span>
                        )}
                      </td>
                      {/* Punch Out GPS */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {record.out_location_coords ? (
                          <a 
                            href={getGoogleMapsUrl(record.out_location_coords)} 
                            target="_blank" 
                            referrerPolicy="no-referrer"
                            className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-blue-50 text-blue-600 hover:text-blue-800 border border-slate-200 hover:border-blue-200 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            title={record.out_location_coords}
                          >
                            <MapPin className="h-3.5 w-3.5 text-blue-500" />
                            <span>View Map</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Worked Hours */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          record.out_time 
                            ? "bg-slate-100 text-slate-800 font-mono" 
                            : "bg-amber-50 text-amber-800 ring-1 ring-amber-100 animate-pulse font-bold"
                        }`}>
                          {calculateDuration(record.in_time, record.out_time)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🔔 Floating In-App Toast Notification */}
      {attendanceToast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border transition-all animate-bounce-subtle ${
          attendanceToast.isError 
            ? "bg-rose-900 text-white border-rose-700 shadow-rose-900/30" 
            : "bg-emerald-900 text-white border-emerald-700 shadow-emerald-900/30"
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{attendanceToast.message}</span>
          <button 
            type="button" 
            onClick={() => setAttendanceToast(null)}
            className="ml-2 hover:opacity-75 cursor-pointer text-white/80"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
