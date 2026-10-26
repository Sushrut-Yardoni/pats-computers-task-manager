// PATS Real-Time Sound, Vibration, Tab Alert, App Badge and Mobile Web Push Notification Manager
// Designed for 100% reliability across Website View, Desktop View, and Mobile Downloaded View (PWA)
// Includes full Personal Notification Tone selection & customization for mobile & desktop
import {
  saveAudioToStorage,
  loadAudioFromStorage,
  deleteAudioFromStorage,
  StoredAudioTone
} from './audioStorage';

export interface NotificationTone {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: 'Classic' | 'High-Energy' | 'Melodic' | 'Urgent' | 'Subtle';
  badgeColor: string;
  durationLabel: string;
}

export interface VibrationPattern {
  id: string;
  name: string;
  description: string;
  pattern: number[];
}

export const AVAILABLE_NOTIFICATION_TONES: NotificationTone[] = [
  {
    id: 'pats_classic',
    name: 'PATS Classic Bell',
    tagline: 'Dual-tone melodic chime (D5 → A5)',
    description: 'Crisp, professional alert tailored for service operations.',
    category: 'Classic',
    badgeColor: 'blue',
    durationLabel: '0.6s'
  },
  {
    id: 'digital_pulse',
    name: 'Digital Dispatch Pulse',
    tagline: 'Fast techno double-beep (880Hz → 1320Hz)',
    description: 'Punchy staccato chirp designed to cut through loud field environments.',
    category: 'High-Energy',
    badgeColor: 'indigo',
    durationLabel: '0.3s'
  },
  {
    id: 'gentle_marimba',
    name: 'Soft Marimba Chime',
    tagline: 'Warm ascending wooden arpeggio (C5 → E5 → G5)',
    description: 'Pleasant, friendly alert ideal for office desks and customer sites.',
    category: 'Melodic',
    badgeColor: 'emerald',
    durationLabel: '0.7s'
  },
  {
    id: 'urgent_radar',
    name: 'Priority Radar Ping',
    tagline: 'High-urgency sonar sweep (1046Hz → 1318Hz)',
    description: 'Unmistakable radar alert when immediate technician dispatch is required.',
    category: 'Urgent',
    badgeColor: 'rose',
    durationLabel: '0.5s'
  },
  {
    id: 'crystal_harmony',
    name: 'Crystal Tri-Tone',
    tagline: 'Shimmering 3-note chord (F#5 → A#5 → C#6)',
    description: 'Modern smartphone-style premium acoustic chime with lush decay.',
    category: 'Melodic',
    badgeColor: 'purple',
    durationLabel: '0.7s'
  },
  {
    id: 'subtle_tap',
    name: 'Minimal Wood Knock',
    tagline: 'Discreet organic acoustic knock',
    description: 'Low-profile subtle double-tap for meetings and quiet spaces.',
    category: 'Subtle',
    badgeColor: 'amber',
    durationLabel: '0.2s'
  }
];

export const AVAILABLE_VIBRATION_PATTERNS: VibrationPattern[] = [
  {
    id: 'classic',
    name: 'Standard Dispatch Buzz',
    description: 'Dual buzz with trailing alert vibration',
    pattern: [400, 150, 400, 150, 600]
  },
  {
    id: 'double_pulse',
    name: 'Quick Double Tap',
    description: 'Short, tactile two-beat haptic pulse',
    pattern: [200, 100, 200]
  },
  {
    id: 'urgent_beacon',
    name: 'Urgent Triple Pulse',
    description: 'High-impact triple alert for critical field tickets',
    pattern: [500, 100, 500, 100, 700]
  },
  {
    id: 'subtle_tick',
    name: 'Subtle Haptic Click',
    description: 'Discreet single haptic tap',
    pattern: [120, 80, 120]
  }
];

function generateToneWavDataUri(toneId: string): string {
  try {
    if (typeof window === 'undefined') return '';
    const sampleRate = 22050;
    let duration = 0.6;
    if (toneId === 'crystal_harmony' || toneId === 'gentle_marimba') duration = 0.75;
    else if (toneId === 'subtle_tap') duration = 0.35;
    else if (toneId === 'digital_pulse') duration = 0.35;

    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF Header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let s = 0;

      if (toneId === 'digital_pulse') {
        if (t < 0.08) {
          s += Math.sin(2 * Math.PI * 880 * t) * 0.45 * Math.sin((t / 0.08) * Math.PI);
        } else if (t >= 0.12 && t < 0.22) {
          const t2 = t - 0.12;
          s += Math.sin(2 * Math.PI * 1320 * t) * 0.5 * Math.sin((t2 / 0.10) * Math.PI);
        }
      } else if (toneId === 'gentle_marimba') {
        const e1 = Math.max(0, 1 - t / 0.35);
        s += Math.sin(2 * Math.PI * 523.25 * t) * 0.4 * e1;
        if (t > 0.08) {
          const e2 = Math.max(0, 1 - (t - 0.08) / 0.35);
          s += Math.sin(2 * Math.PI * 659.25 * t) * 0.38 * e2;
        }
        if (t > 0.16) {
          const e3 = Math.max(0, 1 - (t - 0.16) / 0.5);
          s += Math.sin(2 * Math.PI * 783.99 * t) * 0.35 * e3;
        }
      } else if (toneId === 'urgent_radar') {
        if (t < 0.18) {
          const f = 1046.5 - (t / 0.18) * 160;
          s += Math.sin(2 * Math.PI * f * t) * 0.5 * Math.sin((t / 0.18) * Math.PI);
        } else if (t >= 0.18 && t < 0.45) {
          const t2 = t - 0.18;
          const f = 1318.5 - (t2 / 0.27) * 120;
          s += Math.sin(2 * Math.PI * f * t) * 0.5 * Math.sin((t2 / 0.27) * Math.PI);
        }
      } else if (toneId === 'crystal_harmony') {
        const e1 = Math.max(0, 1 - t / 0.4);
        s += Math.sin(2 * Math.PI * 739.99 * t) * 0.35 * e1;
        if (t > 0.10) {
          const e2 = Math.max(0, 1 - (t - 0.10) / 0.45);
          s += Math.sin(2 * Math.PI * 932.33 * t) * 0.35 * e2;
        }
        if (t > 0.20) {
          const e3 = Math.max(0, 1 - (t - 0.20) / 0.6);
          s += Math.sin(2 * Math.PI * 1108.73 * t) * 0.4 * e3;
        }
      } else if (toneId === 'subtle_tap') {
        if (t < 0.06) {
          const f = 350 - (t / 0.06) * 230;
          s += Math.sin(2 * Math.PI * f * t) * 0.5 * Math.sin((t / 0.06) * Math.PI);
        } else if (t >= 0.09 && t < 0.16) {
          const t2 = t - 0.09;
          const f = 480 - (t2 / 0.07) * 330;
          s += Math.sin(2 * Math.PI * f * t) * 0.5 * Math.sin((t2 / 0.07) * Math.PI);
        }
      } else {
        // 'pats_classic'
        if (t < 0.18) {
          const env1 = Math.sin((t / 0.18) * Math.PI * 0.5) * (1 - t / 0.55);
          s += Math.sin(2 * Math.PI * 587.33 * t) * 0.45 * env1;
        } else {
          const t2 = t - 0.15;
          const env2 = Math.max(0, 1 - (t2 / 0.4));
          s += Math.sin(2 * Math.PI * 880.0 * t) * 0.42 * env2;
          s += Math.sin(2 * Math.PI * 1174.66 * t) * 0.18 * (env2 * env2);
        }
      }

      const clamped = Math.max(-1, Math.min(1, s));
      view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF, true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:audio/wav;base64,${window.btoa(binary)}`;
  } catch (e) {
    return '';
  }
}

export interface EnvironmentDiagnostics {
  mode: 'Mobile Downloaded View (PWA)' | 'Desktop Downloaded View (PWA)' | 'Mobile Website View' | 'Desktop Website View';
  isStandalone: boolean;
  isMobile: boolean;
  permission: NotificationPermission | 'unsupported';
  permissionLabel: string;
  isBlocked: boolean;
  hasServiceWorker: boolean;
  hasPush: boolean;
  hasVibration: boolean;
  isAudioUnlocked: boolean;
  badgeSupported: boolean;
  activeTone: string;
  activeToneName: string;
  hasCustomTone: boolean;
  customToneName: string | null;
  customToneDuration?: string | null;
}

class NotificationManager {
  private audioCtx: AudioContext | null = null;
  private isAudioUnlocked = false;
  private fallbackAudio: HTMLAudioElement | null = null;
  private titleInterval: any = null;
  private originalDocumentTitle = '';
  private originalFaviconHref = '/favicon.png';
  private alertFaviconDataUri = '';
  private selectedToneId: string = 'pats_classic';
  private selectedVibrationId: string = 'classic';
  private customToneName: string | null = null;
  private customToneDataUri: string | null = null;
  private customToneSize: string | null = null;
  private customToneDuration: string | null = null;
  private wavCache: Map<string, string> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.originalDocumentTitle = document.title;
      this.initFaviconTracking();

      // Synchronous quick load from localStorage
      try {
        this.customToneName = localStorage.getItem('pats_custom_tone_name');
        this.customToneDataUri = localStorage.getItem('pats_custom_tone_data');
        this.customToneSize = localStorage.getItem('pats_custom_tone_size');
        this.customToneDuration = localStorage.getItem('pats_custom_tone_duration');

        const storedTone = localStorage.getItem('pats_selected_tone');
        if (storedTone === 'custom') {
          this.selectedToneId = 'custom';
        } else if (storedTone && AVAILABLE_NOTIFICATION_TONES.some((t) => t.id === storedTone)) {
          this.selectedToneId = storedTone;
        }

        const storedVibration = localStorage.getItem('pats_selected_vibration');
        if (storedVibration && AVAILABLE_VIBRATION_PATTERNS.some((v) => v.id === storedVibration)) {
          this.selectedVibrationId = storedVibration;
        }
      } catch {}

      // Asynchronous deep load from IndexedDB (preserves large audio files from device)
      this.initCustomTone();

      // Pre-generate fallback HTML5 audio element
      const initialAudioSrc =
        this.selectedToneId === 'custom' && this.customToneDataUri
          ? this.customToneDataUri
          : this.getToneWavDataUri(this.selectedToneId);

      if (initialAudioSrc) {
        try {
          this.fallbackAudio = new Audio(initialAudioSrc);
          this.fallbackAudio.preload = 'auto';
        } catch (e) {
          console.warn('Audio element preload note:', e);
        }
      }

      // Unlock sound on any initial interaction (click, touch, pointer, key, focus)
      const unlockAudio = () => {
        this.unlockAudioEngine();
      };

      const unlockEvents = ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown', 'focus'];
      unlockEvents.forEach((evt) => window.addEventListener(evt, unlockAudio, { passive: true, once: false }));

      // Clean up tab title/favicon when user switches back to active window
      window.addEventListener('focus', () => {
        this.stopTabAlerts();
        this.broadcastPermissionCheck();
      });

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.stopTabAlerts();
          this.broadcastPermissionCheck();
        }
      });

      // Continuous permission monitoring (detects when user unblocks in Android app info or browser settings)
      if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
        try {
          navigator.permissions.query({ name: 'notifications' as PermissionName }).then((status) => {
            status.onchange = () => {
              window.dispatchEvent(
                new CustomEvent('pats-permission-changed', { detail: { permission: status.state } })
              );
            };
          }).catch(() => {});
        } catch {}
      }
    }
  }

  // Broadcast current permission check across UI
  public broadcastPermissionCheck() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      window.dispatchEvent(
        new CustomEvent('pats-permission-changed', { detail: { permission: Notification.permission } })
      );
    }
  }

  // Pre-generate alert-badged favicon for desktop & website view tab bars
  private initFaviconTracking() {
    try {
      if (typeof document === 'undefined') return;
      const faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (faviconLink && faviconLink.href) {
        this.originalFaviconHref = faviconLink.href;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, 32, 32);
          ctx.beginPath();
          ctx.arc(24, 8, 7, 0, 2 * Math.PI);
          ctx.fillStyle = '#dc2626';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          this.alertFaviconDataUri = canvas.toDataURL('image/png');
        } catch {}
      };
      img.src = '/favicon.png';
    } catch {}
  }

  // Official unlock for Web Audio and HTML5 Audio engines on mobile & desktop
  public unlockAudioEngine() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      if (this.audioCtx && !this.isAudioUnlocked) {
        try {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          gain.gain.value = 0.0001;
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.02);
        } catch {}
      }

      if (this.fallbackAudio) {
        this.fallbackAudio.load();
      }

      this.isAudioUnlocked = true;
    } catch (e) {
      console.warn('Audio unlock note:', e);
    }
  }

  // Tone management APIs
  // Asynchronously load custom device tone from IndexedDB
  private async initCustomTone() {
    try {
      const stored = await loadAudioFromStorage();
      if (stored && stored.dataUri) {
        this.customToneName = stored.name;
        this.customToneDataUri = stored.dataUri;
        this.customToneSize = stored.size;
        this.customToneDuration = stored.duration || null;

        const activeTone = localStorage.getItem('pats_selected_tone');
        if (activeTone === 'custom' || !activeTone) {
          this.selectedToneId = 'custom';
        }

        if (this.fallbackAudio) {
          this.fallbackAudio.src = stored.dataUri;
          this.fallbackAudio.load();
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('pats-tone-changed', {
              detail: { toneId: 'custom', name: stored.name, custom: true }
            })
          );
        }
      }
    } catch (e) {
      console.warn('Custom tone init note:', e);
    }
  }

  // Device context detection helpers
  public isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }

  public isMobile(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  public getPermissionStatusLabel(): {
    label: string;
    isBlocked: boolean;
    canPrompt: boolean;
    helperText: string;
  } {
    const status = this.getPermissionStatus();
    const standalone = this.isStandalone();
    const mobile = this.isMobile();

    if (status === 'granted') {
      return {
        label: 'Alerts Fully Active',
        isBlocked: false,
        canPrompt: false,
        helperText: 'Real-time chimes, vibrations and push alerts enabled.'
      };
    }

    if (status === 'denied') {
      return {
        label: standalone || mobile ? 'Disabled in Phone Settings' : 'Blocked in Browser Settings',
        isBlocked: true,
        canPrompt: false,
        helperText: standalone || mobile
          ? 'Notifications blocked by phone app settings. Tap to unblock.'
          : 'Notifications blocked by browser. Tap padlock in address bar to allow.'
      };
    }

    return {
      label: 'Permission Required',
      isBlocked: false,
      canPrompt: true,
      helperText: 'Enable notifications to get heads-up alerts when new tasks are assigned.'
    };
  }

  // Tone management APIs
  public getSelectedTone(): string {
    return this.selectedToneId;
  }

  public getSelectedToneDetails(): NotificationTone {
    if (this.selectedToneId === 'custom' && this.customToneDataUri) {
      return {
        id: 'custom',
        name: this.customToneName || 'Device Custom Audio',
        tagline: 'Custom sound loaded from this device',
        description: 'Personal audio file selected from your phone or computer.',
        category: 'Custom' as any,
        badgeColor: 'teal',
        durationLabel: this.customToneDuration || this.customToneSize || 'Device File'
      };
    }
    return (
      AVAILABLE_NOTIFICATION_TONES.find((t) => t.id === this.selectedToneId) || AVAILABLE_NOTIFICATION_TONES[0]
    );
  }

  public getCustomTone(): { name: string; dataUri: string; size: string; duration?: string } | null {
    if (this.customToneDataUri && this.customToneName) {
      return {
        name: this.customToneName,
        dataUri: this.customToneDataUri,
        size: this.customToneSize || '',
        duration: this.customToneDuration || ''
      };
    }
    return null;
  }

  public async setCustomTone(
    name: string,
    dataUri: string,
    size: string = '',
    duration: string = ''
  ): Promise<boolean> {
    try {
      this.customToneName = name;
      this.customToneDataUri = dataUri;
      this.customToneSize = size;
      this.customToneDuration = duration;
      this.selectedToneId = 'custom';

      // Persist into IndexedDB (supports up to 20MB audio files from phone/PC)
      await saveAudioToStorage({
        id: 'custom',
        name,
        dataUri,
        size,
        duration,
        updatedAt: Date.now()
      });

      if (this.fallbackAudio) {
        this.fallbackAudio.src = dataUri;
        this.fallbackAudio.load();
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pats-tone-changed', {
            detail: { toneId: 'custom', name, custom: true }
          })
        );
      }
      return true;
    } catch (e) {
      console.warn('Failed to store custom tone:', e);
      return false;
    }
  }

  public async removeCustomTone() {
    this.customToneName = null;
    this.customToneDataUri = null;
    this.customToneSize = null;
    this.customToneDuration = null;

    await deleteAudioFromStorage();

    if (this.selectedToneId === 'custom') {
      this.setSelectedTone('pats_classic');
    } else {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pats-tone-changed', {
            detail: { toneId: this.selectedToneId }
          })
        );
      }
    }
  }

  public setSelectedTone(toneId: string) {
    if (toneId === 'custom' && this.customToneDataUri) {
      this.selectedToneId = 'custom';
      try {
        localStorage.setItem('pats_selected_tone', 'custom');
      } catch {}

      if (this.fallbackAudio) {
        try {
          this.fallbackAudio.src = this.customToneDataUri;
          this.fallbackAudio.load();
        } catch {}
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pats-tone-changed', {
            detail: { toneId: 'custom', name: this.customToneName, custom: true }
          })
        );
      }
      return;
    }

    const valid = AVAILABLE_NOTIFICATION_TONES.find((t) => t.id === toneId);
    if (!valid) return;

    this.selectedToneId = toneId;
    try {
      localStorage.setItem('pats_selected_tone', toneId);
    } catch {}

    const wavUri = this.getToneWavDataUri(toneId);
    if (this.fallbackAudio && wavUri) {
      try {
        this.fallbackAudio.src = wavUri;
        this.fallbackAudio.load();
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pats-tone-changed', { detail: { toneId, tone: valid } }));
    }
  }

  public getSelectedVibrationPattern(): number[] {
    const v = AVAILABLE_VIBRATION_PATTERNS.find((item) => item.id === this.selectedVibrationId);
    return v ? v.pattern : AVAILABLE_VIBRATION_PATTERNS[0].pattern;
  }

  public getSelectedVibrationId(): string {
    return this.selectedVibrationId;
  }

  public setSelectedVibration(vibrationId: string) {
    const valid = AVAILABLE_VIBRATION_PATTERNS.find((item) => item.id === vibrationId);
    if (!valid) return;

    this.selectedVibrationId = vibrationId;
    try {
      localStorage.setItem('pats_selected_vibration', vibrationId);
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pats-vibration-changed', { detail: { vibrationId, vibration: valid } })
      );
    }
  }

  // Cached WAV data URI retrieval
  public getToneWavDataUri(toneId: string): string {
    if (this.wavCache.has(toneId)) {
      return this.wavCache.get(toneId)!;
    }
    const uri = generateToneWavDataUri(toneId);
    if (uri) {
      this.wavCache.set(toneId, uri);
    }
    return uri;
  }

  // Play a specific tone with real-time Web Audio API synthesis
  private playWebAudioTone(toneId: string): boolean {
    try {
      this.unlockAudioEngine();
      if (!this.audioCtx || this.audioCtx.state !== 'running') return false;

      const now = this.audioCtx.currentTime;

      if (toneId === 'digital_pulse') {
        const osc1 = this.audioCtx.createOscillator();
        const gain1 = this.audioCtx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.3, now + 0.01);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc1.connect(gain1);
        gain1.connect(this.audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.09);

        const osc2 = this.audioCtx.createOscillator();
        const gain2 = this.audioCtx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1320, now + 0.12);
        gain2.gain.setValueAtTime(0, now + 0.12);
        gain2.gain.linearRampToValueAtTime(0.35, now + 0.13);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
        osc2.connect(gain2);
        gain2.connect(this.audioCtx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.24);
        return true;
      }

      if (toneId === 'gentle_marimba') {
        const notes = [
          { freq: 523.25, time: 0, dur: 0.35, gain: 0.4 },
          { freq: 659.25, time: 0.09, dur: 0.35, gain: 0.38 },
          { freq: 783.99, time: 0.18, dur: 0.5, gain: 0.35 }
        ];
        notes.forEach(({ freq, time, dur, gain }) => {
          const osc = this.audioCtx!.createOscillator();
          const g = this.audioCtx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + time);
          g.gain.setValueAtTime(0, now + time);
          g.gain.linearRampToValueAtTime(gain, now + time + 0.015);
          g.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
          osc.connect(g);
          g.connect(this.audioCtx!.destination);
          osc.start(now + time);
          osc.stop(now + time + dur + 0.05);
        });
        return true;
      }

      if (toneId === 'urgent_radar') {
        const osc1 = this.audioCtx.createOscillator();
        const g1 = this.audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1046.5, now);
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.18);
        g1.gain.setValueAtTime(0, now);
        g1.gain.linearRampToValueAtTime(0.45, now + 0.02);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc1.connect(g1);
        g1.connect(this.audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.2);

        const osc2 = this.audioCtx.createOscillator();
        const g2 = this.audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.5, now + 0.18);
        osc2.frequency.exponentialRampToValueAtTime(1174, now + 0.42);
        g2.gain.setValueAtTime(0, now + 0.18);
        g2.gain.linearRampToValueAtTime(0.5, now + 0.2);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc2.connect(g2);
        g2.connect(this.audioCtx.destination);
        osc2.start(now + 0.18);
        osc2.stop(now + 0.46);
        return true;
      }

      if (toneId === 'crystal_harmony') {
        const notes = [
          { freq: 739.99, time: 0, dur: 0.4, gain: 0.35 },
          { freq: 932.33, time: 0.1, dur: 0.45, gain: 0.35 },
          { freq: 1108.73, time: 0.2, dur: 0.6, gain: 0.4 }
        ];
        notes.forEach(({ freq, time, dur, gain }) => {
          const osc = this.audioCtx!.createOscillator();
          const g = this.audioCtx!.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + time);
          g.gain.setValueAtTime(0, now + time);
          g.gain.linearRampToValueAtTime(gain, now + time + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
          osc.connect(g);
          g.connect(this.audioCtx!.destination);
          osc.start(now + time);
          osc.stop(now + time + dur + 0.05);
        });
        return true;
      }

      if (toneId === 'subtle_tap') {
        const taps = [
          { f1: 350, f2: 120, time: 0, dur: 0.06 },
          { f1: 480, f2: 150, time: 0.09, dur: 0.07 }
        ];
        taps.forEach(({ f1, f2, time, dur }) => {
          const osc = this.audioCtx!.createOscillator();
          const g = this.audioCtx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f1, now + time);
          osc.frequency.exponentialRampToValueAtTime(f2, now + time + dur);
          g.gain.setValueAtTime(0, now + time);
          g.gain.linearRampToValueAtTime(0.4, now + time + 0.008);
          g.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
          osc.connect(g);
          g.connect(this.audioCtx!.destination);
          osc.start(now + time);
          osc.stop(now + time + dur + 0.02);
        });
        return true;
      }

      // Default: pats_classic
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.16);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.45, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);

      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28);

      gain2.gain.setValueAtTime(0, now + 0.1);
      gain2.gain.linearRampToValueAtTime(0.3, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.6);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.7);
      return true;
    } catch {
      return false;
    }
  }

  // Play a specific tone or the user's personal selected tone
  public playTone(toneId?: string) {
    const targetTone = toneId || this.selectedToneId;

    if (targetTone === 'custom') {
      if (this.customToneDataUri) {
        try {
          const audio = new Audio(this.customToneDataUri);
          audio.currentTime = 0;
          audio.play().catch((e) => {
            console.warn('Custom tone play note:', e);
          });
          return;
        } catch (err) {
          console.warn('Custom audio playback error:', err);
        }
      }
    }

    let played = this.playWebAudioTone(targetTone);

    // Fallback via HTML5 Audio element
    if (!played) {
      try {
        const wavUri = this.getToneWavDataUri(targetTone);
        if (wavUri) {
          const audio = new Audio(wavUri);
          audio.currentTime = 0;
          audio.play().catch((e) => {
            console.warn('Fallback tone play note:', e);
          });
        }
      } catch (err) {
        console.warn('Tone playback note:', err);
      }
    }
  }

  // Play the user's personal task chime
  public playTaskChime() {
    this.playTone(this.selectedToneId);
  }

  // Preview a tone and trigger a quick preview haptic
  public playTonePreview(toneId: string) {
    this.unlockAudioEngine();
    this.playTone(toneId);
    this.triggerVibration([100, 50, 100]);
  }

  // Trigger tactile mobile haptic vibration using the selected pattern
  public triggerVibration(pattern?: number[]) {
    try {
      const activePattern = pattern || this.getSelectedVibrationPattern();
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        navigator.vibrate(activePattern);
      }
    } catch (e) {
      console.warn('Haptic vibration note:', e);
    }
  }

  // Flash browser tab title and favicon badge when user is in another tab or minimized
  public flashTabTitle(alertMessage: string) {
    if (typeof document === 'undefined') return;

    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
    }

    this.originalDocumentTitle = document.title.replace(/^\(\d+\)\s*🔔\s*/, '');
    let toggle = false;

    const faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;

    this.titleInterval = setInterval(() => {
      if (!document.hidden) {
        this.stopTabAlerts();
        return;
      }
      document.title = toggle ? `(1) 🔔 ${alertMessage}` : this.originalDocumentTitle;

      if (faviconLink && this.alertFaviconDataUri) {
        faviconLink.href = toggle ? this.alertFaviconDataUri : this.originalFaviconHref;
      }

      toggle = !toggle;
    }, 850);
  }

  public stopTabAlerts() {
    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
    }
    if (typeof document !== 'undefined') {
      if (this.originalDocumentTitle) {
        document.title = this.originalDocumentTitle;
      }
      const faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (faviconLink && this.originalFaviconHref) {
        faviconLink.href = this.originalFaviconHref;
      }
    }
  }

  // Update OS Application Badge on Desktop Taskbar / Mobile Downloaded PWA App Icon
  public updateAppBadge(count: number) {
    try {
      if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
        if (count > 0) {
          (navigator as any).setAppBadge(count).catch(() => {});
        } else {
          (navigator as any).clearAppBadge().catch(() => {});
        }
      }
    } catch {}
  }

  public clearAppBadge() {
    this.updateAppBadge(0);
  }

  // Check current browser notification permission status
  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  // Request notification permission from user with automatic push registration
  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      this.unlockAudioEngine();
      const permission = await Notification.requestPermission();
      window.dispatchEvent(new CustomEvent('pats-permission-changed', { detail: { permission } }));
      return permission === 'granted';
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return false;
    }
  }

  // Safe, non-blocking acquisition of active ServiceWorker registration
  private async getActiveRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
    try {
      const directReg = await Promise.race([
        navigator.serviceWorker.getRegistration(),
        new Promise<null>((res) => setTimeout(() => res(null), 400))
      ]);
      if (directReg && directReg.showNotification) return directReg;

      const readyReg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((res) => setTimeout(() => res(null), 1000))
      ]);
      return readyReg && readyReg.showNotification ? readyReg : null;
    } catch {
      return null;
    }
  }

  // Send system-level / Android heads-up floating notification across all platforms
  public async sendSystemNotification(
    title: string,
    options: {
      body: string;
      taskId?: number;
      tag?: string;
      isPriority?: boolean;
      requireInteraction?: boolean;
      silent?: boolean;
    }
  ) {
    // 1. Audio chime + Haptic vibration (uses personal selected tone & vibration)
    this.playTaskChime();
    this.triggerVibration(
      options.isPriority ? [500, 150, 500, 150, 800] : this.getSelectedVibrationPattern()
    );

    // 2. Flash browser tab title & favicon badge if window is backgrounded
    this.flashTabTitle(title);

    // 3. Record in local notification history log
    this.recordNotification(title, options.body, options.tag || (options.taskId ? 'task' : 'alert'));

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
      vibrate: options.isPriority ? [500, 150, 500, 150, 800] : this.getSelectedVibrationPattern(),
      tag: options.tag || (options.taskId ? `pats-task-${options.taskId}` : `pats-${Date.now()}`),
      renotify: true,
      requireInteraction: options.requireInteraction ?? true,
      silent: options.silent ?? false,
      timestamp: Date.now(),
      data: {
        taskId: options.taskId,
        url: options.taskId ? `/?taskId=${options.taskId}&action=open` : '/',
        isPriority: options.isPriority
      },
      actions: [
        { action: 'open_task', title: 'Open Ticket' },
        { action: 'dismiss_task', title: 'Dismiss' }
      ]
    };

    // 4. Prefer ServiceWorker showNotification
    let delivered = false;
    if ('serviceWorker' in navigator) {
      try {
        const registration = await this.getActiveRegistration();
        if (registration && registration.showNotification) {
          await registration.showNotification(title, notifOptions);
          delivered = true;
        } else if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            options: notifOptions
          });
          delivered = true;
        }
      } catch (err) {
        console.warn('SW notification delivery note:', err);
      }
    }

    // 5. Desktop browser tab fallback
    if (!delivered) {
      try {
        const n = new Notification(title, notifOptions);
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch (e) {
        console.warn('Standard Notification fallback note:', e);
      }
    }
  }

  // Notification History Management
  public getHistory(): Array<{ id: string; title: string; body: string; time: string; read: boolean; type?: string }> {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem('pats_notification_history');
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public recordNotification(title: string, body: string, type: string = 'alert') {
    if (typeof window === 'undefined') return;
    try {
      const history = this.getHistory();
      const newItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title,
        body,
        time:
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
          ' • ' +
          new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
        read: false,
        type
      };
      history.unshift(newItem);
      if (history.length > 40) history.pop();
      localStorage.setItem('pats_notification_history', JSON.stringify(history));
      window.dispatchEvent(new CustomEvent('pats-notification-updated', { detail: newItem }));

      const unreadCount = history.filter((h) => !h.read).length;
      this.updateAppBadge(unreadCount);
    } catch (e) {
      console.warn('Failed to record notification history:', e);
    }
  }

  public markAllRead() {
    if (typeof window === 'undefined') return;
    try {
      const history = this.getHistory().map((n) => ({ ...n, read: true }));
      localStorage.setItem('pats_notification_history', JSON.stringify(history));
      window.dispatchEvent(new CustomEvent('pats-notification-updated'));
      this.clearAppBadge();
    } catch {}
  }

  public clearHistory() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('pats_notification_history');
      window.dispatchEvent(new CustomEvent('pats-notification-updated'));
      this.clearAppBadge();
    } catch {}
  }

  // Subscribe to background Web Push notifications
  public async subscribeToPushNotifications(employeeId: number): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('PushManager not supported on this device/browser');
      return false;
    }

    try {
      if (Notification.permission !== 'granted') {
        return false;
      }

      const keyResp = await fetch('/api/push/vapid-public-key');
      if (!keyResp.ok) return false;
      const { publicKey } = await keyResp.json();
      if (!publicKey) return false;

      const registration = (await this.getActiveRegistration()) || (await navigator.serviceWorker.ready);
      if (!registration || !registration.pushManager) return false;

      let subscription = await registration.pushManager.getSubscription();
      const convertedVapidKey = this.urlBase64ToUint8Array(publicKey);

      if (!subscription) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
        } catch (subErr: any) {
          console.warn('Push subscription negotiation retry:', subErr);
          const oldSub = await registration.pushManager.getSubscription();
          if (oldSub) {
            await oldSub.unsubscribe().catch(() => {});
          }
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
        }
      }

      if (!subscription) return false;

      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const viewMode = isStandalone
        ? isMobile
          ? 'Mobile Downloaded App (PWA)'
          : 'Desktop Downloaded App (PWA)'
        : isMobile
        ? 'Mobile Website View'
        : 'Desktop Website View';

      const saveResp = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          subscription: subscription.toJSON(),
          device_info: `${viewMode} • ${navigator.userAgent.slice(0, 90)}`
        })
      });

      if (saveResp.ok) {
        localStorage.setItem('pats_push_subscribed', 'true');
        window.dispatchEvent(new CustomEvent('pats-push-status-changed', { detail: { subscribed: true } }));
        console.log(`[PWA Push] Registered background notification for ${viewMode} (Engineer #${employeeId})`);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Push subscription warning:', err);
      return false;
    }
  }

  public async isPushSubscribed(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }
    try {
      const registration = (await this.getActiveRegistration()) || (await navigator.serviceWorker.ready);
      if (!registration || !registration.pushManager) return false;
      const sub = await registration.pushManager.getSubscription();
      return !!sub;
    } catch {
      return false;
    }
  }

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

  // Diagnostic helper to inspect all notification engines
  public getEnvironmentDiagnostics(): EnvironmentDiagnostics {
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const hasNotification = typeof window !== 'undefined' && 'Notification' in window;
    const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    const hasPush = typeof window !== 'undefined' && 'PushManager' in window;
    const hasVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator;
    const badgeSupported = typeof navigator !== 'undefined' && 'setAppBadge' in navigator;
    const permission = hasNotification ? Notification.permission : 'unsupported';
    const activeTone = this.getSelectedTone();
    const activeToneDetails = this.getSelectedToneDetails();

    const permInfo = this.getPermissionStatusLabel();

    return {
      mode: isStandalone
        ? isMobile
          ? 'Mobile Downloaded View (PWA)'
          : 'Desktop Downloaded View (PWA)'
        : isMobile
        ? 'Mobile Website View'
        : 'Desktop Website View',
      isStandalone,
      isMobile,
      permission,
      permissionLabel: permInfo.label,
      isBlocked: permInfo.isBlocked,
      hasServiceWorker,
      hasPush,
      hasVibration,
      isAudioUnlocked: this.isAudioUnlocked,
      badgeSupported,
      activeTone,
      activeToneName: activeToneDetails.name,
      hasCustomTone: !!(this.customToneDataUri && this.customToneName),
      customToneName: this.customToneName,
      customToneDuration: this.customToneDuration
    };
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const notificationManager = new NotificationManager();
