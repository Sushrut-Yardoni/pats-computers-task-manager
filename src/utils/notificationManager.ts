// PATS Real-Time Sound, Vibration and Mobile Push Notification Manager

class NotificationManager {
  private audioCtx: AudioContext | null = null;
  private isAudioUnlocked = false;

  constructor() {
    // Unlock AudioContext on first user interaction
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.initAudio();
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('click', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    }
  }

  private initAudio() {
    if (this.isAudioUnlocked && this.audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        this.isAudioUnlocked = true;
      }
    } catch (e) {
      console.warn('AudioContext initialization failed:', e);
    }
  }

  // Play a crisp, pleasant dual-tone chime for task assignments
  public playTaskChime() {
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Primary tone
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.35, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);

      // Secondary harmonic shimmer
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6

      gain2.gain.setValueAtTime(0, now + 0.1);
      gain2.gain.linearRampToValueAtTime(0.2, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.65);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.75);
    } catch (err) {
      console.warn('Could not play notification audio:', err);
    }
  }

  // Trigger mobile haptic vibration
  public triggerVibration(pattern: number[] = [250, 100, 250, 100, 400]) {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      console.warn('Haptic vibration not supported or disabled:', e);
    }
  }

  // Check current browser notification permission
  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  // Request notification permission from user
  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return false;
    }
  }

  // Send system level / Android mobile floating notification
  public async sendSystemNotification(title: string, options: {
    body: string;
    taskId?: number;
    tag?: string;
    requireInteraction?: boolean;
  }) {
    // 1. Always play audio and vibrate
    this.playTaskChime();
    this.triggerVibration();

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    const notifOptions: any = {
      body: options.body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      vibrate: [300, 100, 300, 100, 300],
      tag: options.tag || (options.taskId ? `task-${options.taskId}` : `pats-${Date.now()}`),
      renotify: true,
      requireInteraction: options.requireInteraction ?? true,
      data: {
        taskId: options.taskId,
        url: '/'
      }
    };

    try {
      // Prefer service worker showNotification (essential for Android PWA floating notification)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, notifOptions);
          return;
        }
      }

      // Fallback to standard web notification
      const n = new Notification(title, notifOptions);
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (err) {
      console.warn('Service worker notification dispatch fallback:', err);
      try {
        new Notification(title, notifOptions);
      } catch (e) {
        console.warn('System notification error:', e);
      }
    }
  }

  // Subscribe to background Web Push notifications so device receives alerts even when app is closed
  public async subscribeToPushNotifications(employeeId: number): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('PushManager not supported on this device/browser');
      return false;
    }

    try {
      // 1. Ensure permission is granted
      const perm = await this.requestPermission();
      if (!perm) return false;

      // 2. Fetch VAPID public key from server
      const keyResp = await fetch('/api/push/vapid-public-key');
      if (!keyResp.ok) {
        console.warn('Failed to fetch VAPID public key');
        return false;
      }
      const { publicKey } = await keyResp.json();
      if (!publicKey) return false;

      // 3. Register push subscription with browser/FCM
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const convertedVapidKey = this.urlBase64ToUint8Array(publicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }

      // 4. Send subscription to server
      const saveResp = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          subscription: subscription.toJSON(),
          device_info: `${navigator.userAgent} (${window.innerWidth}x${window.innerHeight})`
        })
      });

      if (saveResp.ok) {
        console.log(`[PWA Push] Registered background notification for engineer ${employeeId}`);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to subscribe device for background push:', err);
      return false;
    }
  }

  // Check if push is currently subscribed
  public async isPushSubscribed(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      return !!sub;
    } catch {
      return false;
    }
  }

  // Send a server test push to verify background reception
  public async triggerServerPushTest(employeeId: number): Promise<{ success: boolean; message: string }> {
    try {
      const resp = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId })
      });
      const data = await resp.json();
      return { success: resp.ok, message: data.message || data.error };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error triggering test push' };
    }
  }

  // Helper to convert base64 VAPID key to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const notificationManager = new NotificationManager();
