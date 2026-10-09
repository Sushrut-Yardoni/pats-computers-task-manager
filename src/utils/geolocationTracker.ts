import { EngineerLiveLocation, LocationBreadcrumb } from "../types";

// Haversine distance calculator in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert degrees to 8-point compass cardinal
export function degreesToCompass(degrees: number | null | undefined): string {
  if (degrees === null || degrees === undefined || isNaN(degrees)) return "Stationary";
  const cardinals = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];
  const index = Math.round(((degrees % 360) / 45)) % 8;
  return cardinals[index];
}

// Check if app is installed as a PWA
export function isAppInstalledPWA(): boolean {
  if (typeof window === "undefined") return false;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isIOSStandalone = (window.navigator as any).standalone === true;
  const isAndroidTWA = document.referrer.includes("android-app://");
  return Boolean(isStandalone || isIOSStandalone || isAndroidTWA);
}

// Play pleasant high-tech audio chime (muted for silent engineer experience)
export function playChime(_type: "start" | "ping" | "stop") {
  // Silent - no audible sound to engineer
}

// Reverse Geocoding with local cache
const addressCache: Record<string, string> = {};

export async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (addressCache[cacheKey]) {
    return addressCache[cacheKey];
  }

  // 1. Try Google Maps Geocoding if key is present
  const googleApiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}`, {
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results[0]) {
          const formatted = data.results[0].formatted_address;
          addressCache[cacheKey] = formatted;
          return formatted;
        }
      }
    } catch (e) {
      // Fallback to OSM
    }
  }

  // 2. OpenStreetMap Nominatim reverse geocoding
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
      headers: { "Accept-Language": "en" },
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.display_name) {
        // Build concise street & locality address
        const addr = data.address || {};
        const road = addr.road || addr.suburb || addr.neighbourhood || "";
        const city = addr.city || addr.town || addr.county || "Pune";
        const state = addr.state || "Maharashtra";
        const shortAddr = road ? `${road}, ${city}` : data.display_name.split(",").slice(0, 3).join(", ");
        addressCache[cacheKey] = shortAddr;
        return shortAddr;
      }
    }
  } catch (e) {
    // Network offline or timeout
  }

  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  addressCache[cacheKey] = fallback;
  return fallback;
}

export interface GeolocationTrackerState {
  isActive: boolean;
  status: "on-duty" | "in-transit" | "stationary" | "idle" | "off-duty";
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null; // meters
  altitude: number | null;
  heading: number | null;
  speed: number | null; // km/h
  batteryLevel: number | null;
  isCharging: boolean;
  address: string | null;
  lastPingTime: Date | null;
  totalShiftDistanceKm: number;
  shiftStartTime: Date | null;
  error: string | null;
  wakeLockActive: boolean;
  isPwaInstalled: boolean;
  totalPingsSent: number;
}

type TrackerListener = (state: GeolocationTrackerState) => void;

class HighPrecisionGeolocationTracker {
  private watchId: number | null = null;
  private intervalTimer: any = null;
  private wakeLockSentinel: any = null;
  private visibilityListenerAttached: boolean = false;
  private currentEmployeeId: number | null = null;
  private currentEmployeeName: string = "";
  private currentEmployeeRole: string = "";
  private currentTaskId: number | null = null;
  private listeners: Set<TrackerListener> = new Set();

  private state: GeolocationTrackerState = {
    isActive: false,
    status: "off-duty",
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    heading: null,
    speed: null,
    batteryLevel: null,
    isCharging: false,
    address: null,
    lastPingTime: null,
    totalShiftDistanceKm: 0,
    shiftStartTime: null,
    error: null,
    wakeLockActive: false,
    isPwaInstalled: false,
    totalPingsSent: 0
  };

  constructor() {
    if (typeof window !== "undefined") {
      this.state.isPwaInstalled = isAppInstalledPWA();
      this.initBatteryListener();
      this.initNetworkSyncListener();
    }
  }

  public subscribe(listener: TrackerListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const copy = this.getState();
    for (const listener of this.listeners) {
      listener(copy);
    }
  }

  public getState(): GeolocationTrackerState {
    return { ...this.state };
  }

  private async initBatteryListener() {
    try {
      if (typeof navigator !== "undefined" && "getBattery" in navigator) {
        const battery: any = await (navigator as any).getBattery();
        this.updateBattery(battery);
        battery.addEventListener("levelchange", () => this.updateBattery(battery));
        battery.addEventListener("chargingchange", () => this.updateBattery(battery));
      }
    } catch (e) {
      // Battery API not supported in all browsers
    }
  }

  private updateBattery(battery: any) {
    this.state.batteryLevel = Math.round(battery.level * 100);
    this.state.isCharging = Boolean(battery.charging);
    this.notify();
  }

  private async requestScreenWakeLock() {
    try {
      if ("wakeLock" in navigator && (navigator as any).wakeLock) {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
        this.state.wakeLockActive = true;
        this.wakeLockSentinel.addEventListener("release", () => {
          this.state.wakeLockActive = false;
          this.notify();
        });
        this.notify();
      }
    } catch (err) {
      console.warn("Screen wakeLock not granted:", err);
    }
  }

  private releaseScreenWakeLock() {
    try {
      if (this.wakeLockSentinel) {
        this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
        this.state.wakeLockActive = false;
        this.notify();
      }
    } catch (e) {}
  }

  private initNetworkSyncListener() {
    if (typeof window === "undefined") return;
    window.addEventListener("online", () => {
      this.flushOfflineQueue();
    });
  }

  private queueOfflinePing(pingData: any) {
    try {
      const existingStr = localStorage.getItem("pats_gps_offline_queue") || "[]";
      const queue = JSON.parse(existingStr);
      queue.push(pingData);
      // Keep max 50 points
      if (queue.length > 50) queue.shift();
      localStorage.setItem("pats_gps_offline_queue", JSON.stringify(queue));
    } catch (e) {}
  }

  private async flushOfflineQueue() {
    try {
      const existingStr = localStorage.getItem("pats_gps_offline_queue");
      if (!existingStr) return;
      const queue = JSON.parse(existingStr);
      if (!Array.isArray(queue) || queue.length === 0) return;

      for (const item of queue) {
        await fetch("/api/tracking/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        }).catch(() => {});
      }
      localStorage.removeItem("pats_gps_offline_queue");
    } catch (e) {}
  }

  public async startTracking(
    employeeId: number,
    employeeName: string,
    employeeRole: string,
    currentTaskId?: number | null
  ) {
    if (!navigator.geolocation) {
      this.state.error = "Geolocation is not supported by your device browser.";
      this.notify();
      return;
    }

    if (this.state.isActive && this.currentEmployeeId === employeeId) {
      this.currentTaskId = currentTaskId || null;
      return;
    }

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }

    this.currentEmployeeId = employeeId;
    this.currentEmployeeName = employeeName;
    this.currentEmployeeRole = employeeRole;
    this.currentTaskId = currentTaskId || null;

    this.state.isActive = true;
    this.state.status = "on-duty";
    this.state.error = null;
    this.state.shiftStartTime = new Date();
    this.state.totalShiftDistanceKm = 0;
    this.state.isPwaInstalled = isAppInstalledPWA();
    this.notify();

    await this.requestScreenWakeLock();

    // 1. High precision watchPosition options
    // Setting maximumAge to 0 forces the GPS chipset to provide fresh raw satellite readings
    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    // Immediate first acquisition
    navigator.geolocation.getCurrentPosition(
      pos => this.handlePositionUpdate(pos),
      err => this.handlePositionError(err),
      geoOptions
    );

    // Continuous watchPosition
    this.watchId = navigator.geolocation.watchPosition(
      pos => this.handlePositionUpdate(pos),
      err => this.handlePositionError(err),
      geoOptions
    );

    // Fallback heartbeat interval every 8 seconds to ensure continuous streaming
    // even if device doesn't trigger position changes while stationary
    this.intervalTimer = setInterval(() => {
      if (this.state.isActive) {
        navigator.geolocation.getCurrentPosition(
          pos => this.handlePositionUpdate(pos),
          err => console.debug("Interval GPS poll notice:", err.message),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      }
    }, 8000);

    // Re-acquire on page focus or tab visibility changes
    if (typeof window !== "undefined" && !this.visibilityListenerAttached) {
      this.visibilityListenerAttached = true;
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.state.isActive) {
          navigator.geolocation.getCurrentPosition(
            pos => this.handlePositionUpdate(pos),
            () => {},
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
          );
        }
      });
      window.addEventListener("focus", () => {
        if (this.state.isActive) {
          navigator.geolocation.getCurrentPosition(
            pos => this.handlePositionUpdate(pos),
            () => {},
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
          );
        }
      });
    }
  }

  public async stopTracking() {
    this.state.isActive = false;
    this.state.status = "off-duty";

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }

    this.releaseScreenWakeLock();
    playChime("stop");

    // Send final off-duty status ping
    if (this.currentEmployeeId) {
      fetch("/api/tracking/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: this.currentEmployeeId,
          status: "off-duty"
        })
      }).catch(() => {});
    }

    this.notify();
  }

  public setTaskId(taskId: number | null) {
    this.currentTaskId = taskId;
    if (this.state.isActive && this.state.latitude && this.state.longitude) {
      this.transmitCurrentLocation();
    }
  }

  private async handlePositionUpdate(position: GeolocationPosition) {
    const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;

    // Accumulate shift distance
    if (this.state.latitude && this.state.longitude) {
      const deltaKm = calculateDistanceKm(this.state.latitude, this.state.longitude, latitude, longitude);
      // Filter out small jitter (< 10 meters) unless moving
      if (deltaKm > 0.01) {
        this.state.totalShiftDistanceKm = Number((this.state.totalShiftDistanceKm + deltaKm).toFixed(2));
      }
    }

    // Convert speed from m/s to km/h
    const speedKmH = speed !== null && speed !== undefined ? Math.round(speed * 3.6) : 0;

    let dynamicStatus: "on-duty" | "in-transit" | "stationary" = "on-duty";
    if (speedKmH > 4) {
      dynamicStatus = "in-transit";
    } else if (speedKmH <= 1.5) {
      dynamicStatus = "stationary";
    }

    this.state.latitude = Number(latitude.toFixed(6));
    this.state.longitude = Number(longitude.toFixed(6));
    this.state.accuracy = Number(accuracy.toFixed(1));
    this.state.altitude = altitude ? Number(altitude.toFixed(1)) : null;
    this.state.heading = heading ? Number(heading.toFixed(1)) : null;
    this.state.speed = speedKmH;
    this.state.status = dynamicStatus;
    this.state.error = null;

    // Asynchronously resolve human-readable address
    reverseGeocodeCoords(latitude, longitude).then(addr => {
      this.state.address = addr;
      this.notify();
    });

    this.notify();

    // Transmit telemetry to server
    await this.transmitCurrentLocation();
  }

  private handlePositionError(error: GeolocationPositionError) {
    let msg = "GPS location error occurred.";
    switch (error.code) {
      case error.PERMISSION_DENIED:
        msg = "GPS location permission was denied. Please allow location access in your phone settings.";
        break;
      case error.POSITION_UNAVAILABLE:
        msg = "GPS satellite signal unavailable. Please ensure Location / GPS is turned ON.";
        break;
      case error.TIMEOUT:
        msg = "GPS satellite acquisition timed out. Re-acquiring lock...";
        break;
    }
    this.state.error = msg;
    this.notify();
  }

  public async transmitCurrentLocation(): Promise<boolean> {
    if (!this.currentEmployeeId || this.state.latitude === null || this.state.longitude === null) {
      return false;
    }

    const payload = {
      employee_id: this.currentEmployeeId,
      employee_name: this.currentEmployeeName,
      employee_role: this.currentEmployeeRole,
      latitude: this.state.latitude,
      longitude: this.state.longitude,
      accuracy: this.state.accuracy ?? 10,
      altitude: this.state.altitude,
      heading: this.state.heading,
      speed: this.state.speed,
      battery_level: this.state.batteryLevel,
      is_charging: this.state.isCharging,
      status: this.state.status,
      device_type: this.state.isPwaInstalled ? "installed_pwa" : "mobile_browser",
      is_pwa_installed: this.state.isPwaInstalled,
      address: this.state.address || undefined,
      current_task_id: this.currentTaskId
    };

    try {
      const res = await fetch("/api/tracking/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        this.state.lastPingTime = new Date();
        this.state.totalPingsSent += 1;
        this.notify();
        return true;
      } else {
        this.queueOfflinePing(payload);
        return false;
      }
    } catch (err) {
      // Network drop: store in offline queue
      this.queueOfflinePing(payload);
      return false;
    }
  }
}

export const geolocationTracker = new HighPrecisionGeolocationTracker();
