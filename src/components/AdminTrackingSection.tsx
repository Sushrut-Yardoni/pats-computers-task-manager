import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { 
  Navigation, MapPin, Radio, Shield, Battery, BatteryCharging, 
  Compass, Gauge, Clock, RefreshCw, Smartphone, Search, Filter, 
  ExternalLink, Phone, MessageSquare, Play, Pause, ChevronRight, 
  Layers, Eye, AlertCircle, CheckCircle2, User, Sparkles, Trash2, HelpCircle
} from "lucide-react";
import { EngineerLiveLocation, LocationBreadcrumb, Task, Employee } from "../types";
import { degreesToCompass, calculateDistanceKm } from "../utils/geolocationTracker";
import { getCleanTelUri } from "../utils/phoneUtils";

interface AdminTrackingSectionProps {
  employees: Employee[];
  tasks: Task[];
}

export default function AdminTrackingSection({ employees, tasks }: AdminTrackingSectionProps) {
  const [engineers, setEngineers] = useState<EngineerLiveLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedEngineerId, setSelectedEngineerId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "moving" | "stationary" | "off-duty">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tileLayerType, setTileLayerType] = useState<"streets" | "light" | "satellite">("streets");
  
  // Breadcrumb Trail state
  const [showingTrailId, setShowingTrailId] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<LocationBreadcrumb[]>([]);
  const [loadingTrail, setLoadingTrail] = useState(false);

  // Simulation controls
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [simTargetEmpId, setSimTargetEmpId] = useState<number>(102);

  // Map DOM reference & leaflet instances
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const accuracyCirclesLayerRef = useRef<L.LayerGroup | null>(null);
  const trailLayerRef = useRef<L.LayerGroup | null>(null);
  const taskPinsLayerRef = useRef<L.LayerGroup | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. Fetch live coordinates from server
  const fetchLiveLocations = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/tracking/live");
      if (res.ok) {
        const data: EngineerLiveLocation[] = await res.json();
        setEngineers(data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error("Failed to load live tracking:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveLocations();
    // Live polling every 4 seconds
    const interval = setInterval(() => {
      fetchLiveLocations(true);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // 2. Fetch breadcrumb trail for an engineer
  const loadTrailForEngineer = async (empId: number) => {
    setLoadingTrail(true);
    setShowingTrailId(empId);
    try {
      const res = await fetch(`/api/tracking/history?employee_id=${empId}`);
      if (res.ok) {
        const trailData: LocationBreadcrumb[] = await res.json();
        setBreadcrumbs(trailData);
        if (trailData.length === 0) {
          showToast("No breadcrumb history logged today for this engineer yet.");
        }
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setLoadingTrail(false);
    }
  };

  const clearTrailView = () => {
    setShowingTrailId(null);
    setBreadcrumbs([]);
  };

  // 3. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Pune, Maharashtra
      const map = L.map(mapContainerRef.current, {
        center: [18.5204, 73.8567],
        zoom: 13,
        zoomControl: true
      });

      // Layer groups
      const accuracyGroup = L.layerGroup().addTo(map);
      const trailGroup = L.layerGroup().addTo(map);
      const taskPinsGroup = L.layerGroup().addTo(map);
      const markersGroup = L.layerGroup().addTo(map);

      accuracyCirclesLayerRef.current = accuracyGroup;
      trailLayerRef.current = trailGroup;
      taskPinsLayerRef.current = taskPinsGroup;
      markersLayerRef.current = markersGroup;

      mapInstanceRef.current = map;
    }

    // Tile layers switcher
    if (mapInstanceRef.current) {
      if (tileLayerRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      }

      let tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      let tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

      if (tileLayerType === "light") {
        tileUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
        tileAttribution = '&copy; <a href="https://carto.com/">CARTO</a>';
      } else if (tileLayerType === "satellite") {
        tileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
        tileAttribution = "&copy; Esri &mdash; Earthstar Geographics";
      }

      const newTile = L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: tileAttribution
      });
      newTile.addTo(mapInstanceRef.current);
      tileLayerRef.current = newTile;
    }

    return () => {
      // Cleanup on unmount handled gracefully
    };
  }, [tileLayerType]);

  // 4. Update markers & accuracy circles on map whenever engineers state updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const accuracyGroup = accuracyCirclesLayerRef.current;
    const taskPinsGroup = taskPinsLayerRef.current;

    if (!map || !markersGroup || !accuracyGroup || !taskPinsGroup) return;

    markersGroup.clearLayers();
    accuracyGroup.clearLayers();
    taskPinsGroup.clearLayers();

    const activeBounds: L.LatLngExpression[] = [];

    // A. Render Customer Task Pins
    const activeTasks = tasks.filter(t => (t.status === "In Progress" || t.status === "Pending") && t.address);
    // Rough coordinates mapping for known tasks if needed, or if task address has keywords
    activeTasks.forEach(task => {
      // Seed slight offset around Pune for known addresses
      const taskHash = ((task.id * 31) % 100) / 1000;
      const taskLat = 18.5204 + (taskHash * 0.05) - 0.02;
      const taskLng = 73.8567 + (taskHash * 0.04) - 0.015;

      const customerIconHtml = `
        <div style="
          background: #3b82f6; 
          color: white; 
          width: 28px; 
          height: 28px; 
          border-radius: 9999px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: 800; 
          font-size: 11px;
          border: 2px solid white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
        ">
          🏢
        </div>
      `;

      const cMarker = L.marker([taskLat, taskLng], {
        icon: L.divIcon({
          className: "custom-customer-pin",
          html: customerIconHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })
      });

      cMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4; min-width: 200px;">
          <div style="font-weight: 800; color: #1e3a8a; font-size: 13px;">${task.customer_name}</div>
          <div style="color: #475569; margin-top: 2px;">${task.problem_reported}</div>
          <div style="color: #64748b; margin-top: 4px; font-size: 11px;">📍 ${task.address || "Pune Customer Site"}</div>
          <div style="margin-top: 6px; font-weight: 700; color: #0284c7;">Status: ${task.status}</div>
        </div>
      `);

      taskPinsGroup.addLayer(cMarker);
    });

    // B. Render Engineer Markers & High Accuracy Rings
    engineers.forEach(eng => {
      const lat = eng.latitude;
      const lng = eng.longitude;
      if (!lat || !lng) return;

      activeBounds.push([lat, lng]);

      const isSelected = selectedEngineerId === eng.employee_id;
      const isMoving = eng.status === "in-transit" || (eng.speed && eng.speed > 3);
      const isStationary = eng.status === "stationary" || (eng.status === "on-duty" && (!eng.speed || eng.speed <= 3));
      const isOffDuty = eng.status === "off-duty";

      // Color coding
      let statusColor = "#10b981"; // emerald
      let statusBg = "rgba(16, 185, 129, 0.15)";
      let badgeLabel = "Moving";

      if (isStationary) {
        statusColor = "#f59e0b"; // amber
        statusBg = "rgba(245, 158, 11, 0.15)";
        badgeLabel = "At Site";
      } else if (isOffDuty) {
        statusColor = "#64748b"; // slate
        statusBg = "rgba(100, 116, 139, 0.12)";
        badgeLabel = "Off Duty";
      }

      // 1. High-Precision Accuracy Circle
      // The radius in meters represents the exact hardware GPS accuracy
      const accuracyRadius = Math.max(3, eng.accuracy || 10);
      const accuracyCircle = L.circle([lat, lng], {
        radius: accuracyRadius,
        color: statusColor,
        weight: isSelected ? 2 : 1,
        opacity: 0.8,
        fillColor: statusColor,
        fillOpacity: isSelected ? 0.25 : 0.12,
        dashArray: isOffDuty ? "4, 4" : undefined
      });

      accuracyCircle.bindTooltip(`GPS Accuracy: ±${accuracyRadius} meters`, {
        permanent: false,
        direction: "top"
      });

      accuracyGroup.addLayer(accuracyCircle);

      // 2. Custom Marker Icon
      const initials = eng.employee_name
        .split(" ")
        .map(n => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

      const headingDeg = eng.heading ?? 0;
      const isPWA = eng.is_pwa_installed || eng.device_type === "installed_pwa";

      const markerHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <!-- Heading direction arrow if moving -->
          ${isMoving && eng.heading !== null ? `
            <div style="
              position: absolute;
              top: -8px;
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-bottom: 9px solid ${statusColor};
              transform: rotate(${headingDeg}deg);
              transform-origin: center 18px;
              z-index: 10;
            "></div>
          ` : ""}

          <!-- Engineer avatar circle -->
          <div style="
            width: ${isSelected ? "38px" : "32px"};
            height: ${isSelected ? "38px" : "32px"};
            border-radius: 9999px;
            background: white;
            border: 3px solid ${statusColor};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: ${isSelected ? "13px" : "11px"};
            color: #0f172a;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            transition: all 0.2s ease;
            position: relative;
          ">
            ${initials}

            <!-- Installed Phone App badge indicator -->
            ${isPWA ? `
              <div style="
                position: absolute;
                bottom: -3px;
                right: -3px;
                width: 12px;
                height: 12px;
                background: #2563eb;
                border: 2px solid white;
                border-radius: 9999px;
                display: flex;
                align-items: center;
                justify-content: center;
              " title="App Installed on Phone">
              </div>
            ` : ""}
          </div>

          <!-- Name label pill -->
          <div style="
            background: rgba(15, 23, 42, 0.9);
            color: white;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 6px;
            margin-top: 3px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>${eng.employee_name.split(" ")[0]}</span>
            ${eng.speed ? `<span style="color: #38bdf8;">${eng.speed}km/h</span>` : ""}
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: "engineer-custom-marker",
          html: markerHtml,
          iconSize: [44, 48],
          iconAnchor: [22, 24]
        })
      });

      // Rich Popup
      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4; min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
            <div>
              <strong style="font-size: 14px; color: #0f172a;">${eng.employee_name}</strong>
              <div style="font-size: 11px; color: #64748b;">${eng.employee_role}</div>
            </div>
            <span style="
              background: ${statusBg}; 
              color: ${statusColor}; 
              font-weight: 800; 
              font-size: 10px; 
              padding: 2px 6px; 
              border-radius: 9999px;
            ">
              ${badgeLabel}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <div style="background: #f8fafc; padding: 4px 6px; border-radius: 6px;">
              <span style="color: #64748b; font-size: 10px; display: block;">GPS Precision</span>
              <strong style="color: #047857; font-size: 11px;">±${eng.accuracy} meters</strong>
            </div>
            <div style="background: #f8fafc; padding: 4px 6px; border-radius: 6px;">
              <span style="color: #64748b; font-size: 10px; display: block;">Speed</span>
              <strong style="font-size: 11px;">${eng.speed !== null ? `${eng.speed} km/h` : "0 km/h"}</strong>
            </div>
          </div>

          <div style="margin-bottom: 6px; font-size: 11px; color: #334155;">
            <strong>📍 Location:</strong> ${eng.address || `${eng.latitude}, ${eng.longitude}`}
          </div>

          ${eng.current_task_title ? `
            <div style="margin-bottom: 8px; padding: 6px; background: #eff6ff; border-radius: 6px; font-size: 11px; color: #1e40af;">
              <strong>🎯 Assigned Call:</strong> ${eng.current_task_title}
            </div>
          ` : ""}

          <div style="display: flex; items-center; justify-content: space-between; font-size: 10px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 6px;">
            <span>${isPWA ? "📱 Installed Phone App" : "🌐 Web Browser"}</span>
            <span>${eng.battery_level !== null ? `🔋 ${eng.battery_level}%` : ""}</span>
          </div>
        </div>
      `);

      marker.on("click", () => {
        setSelectedEngineerId(eng.employee_id);
      });

      markersGroup.addLayer(marker);
    });
  }, [engineers, selectedEngineerId, tasks]);

  // 5. Render Breadcrumb Path Polyline if trail is loaded
  useEffect(() => {
    const map = mapInstanceRef.current;
    const trailGroup = trailLayerRef.current;
    if (!map || !trailGroup) return;

    trailGroup.clearLayers();

    if (breadcrumbs.length > 1) {
      const latlngs: L.LatLngExpression[] = breadcrumbs.map(b => [b.latitude, b.longitude]);

      // Route path line
      const routePolyline = L.polyline(latlngs, {
        color: "#2563eb",
        weight: 4,
        opacity: 0.85,
        smoothFactor: 1
      });
      trailGroup.addLayer(routePolyline);

      // Start marker
      const startPoint = breadcrumbs[0];
      const startMarker = L.circleMarker([startPoint.latitude, startPoint.longitude], {
        radius: 6,
        color: "#16a34a",
        fillColor: "#22c55e",
        fillOpacity: 1,
        weight: 2
      }).bindPopup(`<b>Route Start:</b> ${new Date(startPoint.timestamp).toLocaleTimeString()}`);
      trailGroup.addLayer(startMarker);

      // Intermediate numbered waypoints
      breadcrumbs.slice(1, -1).forEach((pt, idx) => {
        // Sample every 4th point to avoid clutter
        if (idx % 4 === 0) {
          const ptMarker = L.circleMarker([pt.latitude, pt.longitude], {
            radius: 4,
            color: "#3b82f6",
            fillColor: "#93c5fd",
            fillOpacity: 0.8,
            weight: 1.5
          }).bindPopup(`<b>Ping:</b> ${new Date(pt.timestamp).toLocaleTimeString()}<br/>Speed: ${pt.speed || 0} km/h`);
          trailGroup.addLayer(ptMarker);
        }
      });

      // Fit map to trail
      map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
    }
  }, [breadcrumbs]);

  // 6. Center map on selected engineer
  const handleSelectEngineer = (eng: EngineerLiveLocation) => {
    setSelectedEngineerId(eng.employee_id);
    if (mapInstanceRef.current && eng.latitude && eng.longitude) {
      mapInstanceRef.current.flyTo([eng.latitude, eng.longitude], 16, {
        duration: 1.2
      });
    }
  };

  const handleFitAllEngineers = () => {
    if (!mapInstanceRef.current) return;
    const validCoords = engineers
      .filter(e => e.latitude && e.longitude)
      .map(e => [e.latitude, e.longitude] as L.LatLngExpression);
    
    if (validCoords.length > 0) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(validCoords), { padding: [50, 50] });
    }
  };

  // 7. Simulation Step Handler
  const handleRunSimulationStep = async () => {
    try {
      const res = await fetch("/api/tracking/simulate-engineer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: simTargetEmpId,
          step: simStep
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSimStep(data.next_step);
        showToast(data.message);
        fetchLiveLocations(true);
      }
    } catch (e) {
      console.error("Simulation error:", e);
    }
  };

  // Filtered engineers list
  const filteredEngineers = engineers.filter(eng => {
    // Status filter
    if (filterStatus === "active" && (eng.status === "off-duty" || eng.status === "idle")) return false;
    if (filterStatus === "moving" && (eng.status !== "in-transit" && (!eng.speed || eng.speed < 4))) return false;
    if (filterStatus === "stationary" && (eng.status !== "stationary" && eng.status !== "on-duty")) return false;
    if (filterStatus === "off-duty" && eng.status !== "off-duty") return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = eng.employee_name.toLowerCase().includes(q);
      const matchRole = eng.employee_role.toLowerCase().includes(q);
      const matchTask = eng.current_task_title?.toLowerCase().includes(q);
      const matchAddr = eng.address?.toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchTask && !matchAddr) return false;
    }

    return true;
  });

  // Fleet stats
  const totalFleet = engineers.length;
  const onDutyCount = engineers.filter(e => e.status !== "off-duty").length;
  const movingCount = engineers.filter(e => e.status === "in-transit" || (e.speed && e.speed > 4)).length;
  const avgAccuracy = engineers.length > 0 
    ? (engineers.reduce((acc, curr) => acc + (curr.accuracy || 10), 0) / engineers.length).toFixed(1)
    : "3.5";

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 🚀 Fleet Tracking Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-400">
                <Navigation className="w-5 h-5 animate-pulse" />
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                Live Engineer GPS Fleet Radar
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Real-Time Satellite Stream
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Track precise field locations, GPS hardware precision rings (±3m satellite accuracy), movement speed, heading azimuth, and phone battery level for all service engineers.
            </p>
          </div>

          {/* Quick Metrics Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
              <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">Fleet Total</span>
              <span className="text-lg font-black text-white">{totalFleet}</span>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-md rounded-2xl p-3 border border-emerald-400/20 text-center">
              <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">On-Duty</span>
              <span className="text-lg font-black text-emerald-300">{onDutyCount}</span>
            </div>
            <div className="bg-sky-500/20 backdrop-blur-md rounded-2xl p-3 border border-sky-400/20 text-center">
              <span className="text-[10px] text-sky-300 font-bold block uppercase tracking-wider">In-Transit</span>
              <span className="text-lg font-black text-sky-300">{movingCount}</span>
            </div>
            <div className="bg-amber-500/20 backdrop-blur-md rounded-2xl p-3 border border-amber-400/20 text-center">
              <span className="text-[10px] text-amber-300 font-bold block uppercase tracking-wider">Avg Accuracy</span>
              <span className="text-lg font-black text-amber-300">±{avgAccuracy}m</span>
            </div>
          </div>
        </div>

        {/* Live Simulation Testing Bar */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white">Interactive Fleet Simulation:</span>
            <span className="hidden sm:inline text-slate-300">Test real-time tracking updates along Pune service corridors</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={simTargetEmpId}
              onChange={e => setSimTargetEmpId(Number(e.target.value))}
              aria-label="Select engineer for route simulation"
              className="bg-white/15 border border-white/20 text-white rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none"
            >
              {engineers.map(e => (
                <option key={e.employee_id} value={e.employee_id} className="bg-slate-900 text-white">
                  {e.employee_name} ({e.employee_role})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleRunSimulationStep}
              className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Simulate Next GPS Ping</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md flex items-center justify-between animate-fade-in">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Map + Side Deck Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Live Interactive Map (7 or 8 columns) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col relative">
          {/* Map Controls Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Pune Field Operations Map</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-[11px] text-slate-500">
                Auto-syncing every 4s ({lastRefreshed.toLocaleTimeString()})
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Tile Switcher */}
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTileLayerType("streets")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    tileLayerType === "streets" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Streets
                </button>
                <button
                  type="button"
                  onClick={() => setTileLayerType("light")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    tileLayerType === "light" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Clean
                </button>
                <button
                  type="button"
                  onClick={() => setTileLayerType("satellite")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    tileLayerType === "satellite" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Satellite
                </button>
              </div>

              {/* Fit All Button */}
              <button
                type="button"
                onClick={handleFitAllEngineers}
                className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Layers className="w-3 h-3 text-slate-500" />
                <span>Fit All</span>
              </button>

              {/* Force Refresh */}
              <button
                type="button"
                onClick={() => fetchLiveLocations(false)}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] shadow-2xs cursor-pointer"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Active Trail Banner if showing trail */}
          {showingTrailId && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  Viewing Today's Route Trail for <strong>{engineers.find(e => e.employee_id === showingTrailId)?.employee_name}</strong>
                  ({breadcrumbs.length} recorded waypoints)
                </span>
              </div>
              <button
                type="button"
                onClick={clearTrailView}
                className="text-xs text-blue-700 hover:text-blue-950 font-bold underline cursor-pointer"
              >
                Clear Trail
              </button>
            </div>
          )}

          {/* Map Canvas Container */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-[520px] sm:h-[600px] z-0 bg-slate-100"
            style={{ minHeight: "520px" }}
          />

          {/* Map Legend Overlay */}
          <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Moving In-Transit</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Stationary At Site</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span>Off-Duty</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full border border-emerald-500 bg-emerald-100" />
                <span>Accuracy Radius (Meters)</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 text-white text-[8px] flex items-center justify-center font-bold">🏢</span>
                <span>Customer Site</span>
              </span>
            </div>

            <span className="text-slate-400 text-[10px]">
              Translucent circle = satellite GPS confidence zone (±meters)
            </span>
          </div>
        </div>

        {/* Right Side: Engineer Telemetry Cards & Filter Deck (4 columns) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search & Filter Header */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>Engineer Field Roster</span>
              </h3>
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {filteredEngineers.length} Active
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search engineer, client ticket, area..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-colors cursor-pointer ${
                  filterStatus === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({engineers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("active")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-colors cursor-pointer ${
                  filterStatus === "active" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                On-Duty ({onDutyCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("moving")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-colors cursor-pointer ${
                  filterStatus === "moving" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Moving ({movingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("off-duty")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-colors cursor-pointer ${
                  filterStatus === "off-duty" ? "bg-slate-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Off-Duty
              </button>
            </div>
          </div>

          {/* Engineers Scrollable Card Deck */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredEngineers.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                No engineers matching current filters.
              </div>
            ) : (
              filteredEngineers.map(eng => {
                const isSelected = selectedEngineerId === eng.employee_id;
                const isMoving = eng.status === "in-transit" || (eng.speed && eng.speed > 3);
                const isStationary = eng.status === "stationary" || (eng.status === "on-duty" && (!eng.speed || eng.speed <= 3));
                const isPWA = eng.is_pwa_installed || eng.device_type === "installed_pwa";

                return (
                  <div
                    key={eng.employee_id}
                    onClick={() => handleSelectEngineer(eng)}
                    className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                          isMoving 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : isStationary
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}>
                          {eng.employee_name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate flex items-center gap-1.5">
                            <span>{eng.employee_name}</span>
                            {isPWA && (
                              <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-1.5 py-0.2 rounded-md" title="Installed Phone App (Hardware GPS Lock)">
                                📱 Phone App
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate">{eng.employee_role}</p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                        isMoving
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : isStationary
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {isMoving ? "● Moving" : isStationary ? "● At Site" : "Off-Duty"}
                      </span>
                    </div>

                    {/* Telemetry Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Accuracy</span>
                        <span className="font-extrabold text-emerald-700 text-[11px]">
                          ±{eng.accuracy} m
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Speed</span>
                        <span className="font-extrabold text-slate-800 text-[11px]">
                          {eng.speed ? `${eng.speed} km/h` : "0 km/h"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Battery</span>
                        <span className="font-extrabold text-slate-800 text-[11px] flex items-center gap-1">
                          {eng.battery_level !== null ? `${eng.battery_level}%` : "--"}
                          {eng.is_charging && <BatteryCharging className="w-3 h-3 text-emerald-600" />}
                        </span>
                      </div>
                    </div>

                    {/* Location Address */}
                    <div className="mt-2 text-[11px] text-slate-600 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <span className="truncate">{eng.address || `${eng.latitude}, ${eng.longitude}`}</span>
                    </div>

                    {/* Assigned Ticket Callout */}
                    {eng.current_task_title && (
                      <div className="mt-2 p-2 bg-blue-50/80 rounded-xl text-[11px] text-blue-900 border border-blue-200/50">
                        <strong className="text-blue-950 block text-[10px] uppercase font-bold tracking-wide">
                          Active Ticket Destination:
                        </strong>
                        <div className="truncate font-semibold">{eng.current_task_title}</div>
                      </div>
                    )}

                    {/* Quick Action Footer */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        {eng.phone && (
                          <a
                            href={getCleanTelUri(eng.phone)}
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="Call Engineer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <a
                          href={`https://www.google.com/maps?q=${eng.latitude},${eng.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                          title="Open in Google Maps"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          loadTrailForEngineer(eng.employee_id);
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>View Route Trail</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
