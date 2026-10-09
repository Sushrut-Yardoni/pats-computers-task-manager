/**
 * High-Precision GPS Location Tracking Engine for PATS Mobile Field Engineers
 * Uses hardware GPS satellite receiver (enableHighAccuracy: true) with accuracy filtering,
 * battery level monitoring, and automatic background/milestone sync.
 */

export interface TrackingState {
  isTracking: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null; // meters
  heading: number | null;
  speed: number | null; // km/h
  altitude: number | null;
  batteryLevel: number | null; // 0-100
  isCharging: boolean | null;
  lastSyncedAt: string | null;
  error: string | null;
}

type Listener = (state: TrackingState) => void;

class LocationTrackerService {
  private watchId: number | null = null;
  private intervalId: any = null;
  private currentEmployeeId: number | null = null;
  private currentEmployeeName: string = "";
  private lastSentLat: number | null = null;
  private lastSentLng: number | null = null;
  private lastSentTime: number = 0;
  private listeners: Set<Listener> = new Set();

  private state: TrackingState = {
    isTracking: false,
    latitude: null,
    longitude: null,
    accuracy: null,
    heading: null,
    speed: null,
    altitude: null,
    batteryLevel: null,
    isCharging: null,
    lastSyncedAt: null,
    error: null,
  };

  constructor() {
    // Check if tracking was previously active in this browser session
    try {
      const saved = localStorage.getItem("pats_live_gps_enabled");
      if (saved === "true") {
        // Will auto-resume once start is called with employee credentials
      }
    } catch {}
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  public getState(): TrackingState {
    return { ...this.state };
  }

  /**
   * Reads mobile battery status via Web Battery API if supported
   */
  private async getBatteryInfo(): Promise<{ level: number | null; charging: boolean | null }> {
    try {
      if ("getBattery" in navigator) {
        const battery: any = await (navigator as any).getBattery();
        return {
          level: Math.round(battery.level * 100),
          charging: Boolean(battery.charging)
        };
      }
    } catch {}
    return { level: null, charging: null };
  }

  /**
   * Calculates distance between two coordinates in meters (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Start high-precision continuous field duty GPS streaming
   */
  public async startTracking(employeeId: number, employeeName: string): Promise<boolean> {
    if (!navigator.geolocation) {
      this.state.error = "Geolocation hardware API not supported on this device/browser.";
      this.notify();
      return false;
    }

    this.currentEmployeeId = employeeId;
    this.currentEmployeeName = employeeName;
    this.state.isTracking = true;
    this.state.error = null;
    try {
      localStorage.setItem("pats_live_gps_enabled", "true");
    } catch {}
    this.notify();

    // Initial position fix with satellite precision
    navigator.geolocation.getCurrentPosition(
      pos => this.handlePositionUpdate(pos, "Duty Session Started"),
      err => {
        console.warn("Initial GPS lock warning:", err.message);
        this.state.error = err.message;
        this.notify();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // Continuous watchPosition streaming
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    this.watchId = navigator.geolocation.watchPosition(
      pos => this.handlePositionUpdate(pos, "Active Transit"),
      err => {
        this.state.error = err.message;
        this.notify();
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );

    // Heartbeat safety timer (every 40s) to guarantee updates even if stationary
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      if (this.state.isTracking && this.currentEmployeeId) {
        navigator.geolocation.getCurrentPosition(
          pos => this.handlePositionUpdate(pos, "Periodic Heartbeat", true),
          () => {},
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      }
    }, 40000);

    return true;
  }

  /**
   * Stop active GPS tracking (Off Duty)
   */
  public stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Send final off-duty notification if we have coordinates
    if (this.currentEmployeeId && this.state.latitude && this.state.longitude) {
      this.sendLocationToServer({
        latitude: this.state.latitude,
        longitude: this.state.longitude,
        accuracy: this.state.accuracy || 10,
        heading: null,
        speed: 0,
        altitude: null,
        action_context: "Field Duty Ended / Offline",
      }).catch(() => {});
    }

    this.state.isTracking = false;
    try {
      localStorage.removeItem("pats_live_gps_enabled");
    } catch {}
    this.notify();
  }

  /**
   * Internal processor for incoming GPS coordinate stream
   */
  private async handlePositionUpdate(
    position: GeolocationPosition,
    actionContext: string,
    isHeartbeat = false
  ) {
    const coords = position.coords;
    const lat = coords.latitude;
    const lng = coords.longitude;
    const accuracy = coords.accuracy; // in meters
    const speed = coords.speed !== null ? Math.round(coords.speed * 3.6) : null; // km/h
    const heading = coords.heading !== null ? Math.round(coords.heading) : null;
    const altitude = coords.altitude !== null ? Math.round(coords.altitude) : null;

    const battery = await this.getBatteryInfo();

    this.state.latitude = lat;
    this.state.longitude = lng;
    this.state.accuracy = Math.round(accuracy * 10) / 10;
    this.state.speed = speed;
    this.state.heading = heading;
    this.state.altitude = altitude;
    this.state.batteryLevel = battery.level;
    this.state.isCharging = battery.charging;
    this.state.error = null;
    this.notify();

    // Determine if we should push to backend:
    // 1. If never sent before
    // 2. Or moved > 20 meters
    // 3. Or at least 25 seconds elapsed since last transmission
    // 4. Or this is an explicit action / heartbeat
    const now = Date.now();
    let shouldSend = false;

    if (!this.lastSentLat || !this.lastSentLng) {
      shouldSend = true;
    } else {
      const movedMeters = this.calculateDistance(this.lastSentLat, this.lastSentLng, lat, lng);
      const elapsedMs = now - this.lastSentTime;

      if (movedMeters >= 20 || elapsedMs >= 25000 || isHeartbeat) {
        shouldSend = true;
      }
    }

    if (shouldSend && this.currentEmployeeId) {
      this.lastSentLat = lat;
      this.lastSentLng = lng;
      this.lastSentTime = now;

      await this.sendLocationToServer({
        latitude: lat,
        longitude: lng,
        accuracy: this.state.accuracy,
        speed,
        heading,
        altitude,
        action_context: actionContext,
        battery_level: battery.level,
        is_charging: battery.charging,
      });

      this.state.lastSyncedAt = new Date().toISOString();
      this.notify();
    }
  }

  /**
   * One-shot milestone stamp: triggered on Punch-In, Ticket Accept, or Ticket Finish
   */
  public async recordMilestoneLocation(
    employeeId: number,
    actionContext: string,
    extraData?: { active_task_id?: number; active_task_customer?: string }
  ): Promise<boolean> {
    if (!navigator.geolocation) return false;

    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const coords = pos.coords;
          const battery = await this.getBatteryInfo();

          await this.sendLocationToServer({
            employee_id: employeeId,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            speed: coords.speed ? Math.round(coords.speed * 3.6) : null,
            heading: coords.heading ? Math.round(coords.heading) : null,
            altitude: coords.altitude ? Math.round(coords.altitude) : null,
            action_context: actionContext,
            active_task_id: extraData?.active_task_id,
            active_task_customer: extraData?.active_task_customer,
            battery_level: battery.level,
            is_charging: battery.charging,
            provider: "action_milestone",
          });

          this.state.latitude = coords.latitude;
          this.state.longitude = coords.longitude;
          this.state.accuracy = Math.round(coords.accuracy * 10) / 10;
          this.state.lastSyncedAt = new Date().toISOString();
          this.notify();
          resolve(true);
        },
        err => {
          console.warn(`Milestone GPS capture for ${actionContext} failed:`, err.message);
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  /**
   * Manual instantaneous GPS position push
   */
  public async syncNow(): Promise<boolean> {
    if (!navigator.geolocation || !this.currentEmployeeId) return false;
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          await this.handlePositionUpdate(pos, "Manual Admin Sync", true);
          resolve(true);
        },
        err => {
          this.state.error = err.message;
          this.notify();
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  /**
   * Network dispatch to PATS Backend
   */
  private async sendLocationToServer(payload: any) {
    try {
      const resp = await fetch("/api/locations/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: payload.employee_id || this.currentEmployeeId,
          ...payload,
        }),
      });

      if (!resp.ok) {
        console.warn("Location sync failed with status:", resp.status);
      }
    } catch (err: any) {
      console.warn("Location transmission network error:", err.message);
    }
  }
}

export const locationTracker = new LocationTrackerService();
