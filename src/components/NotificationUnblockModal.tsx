import React, { useState, useEffect } from "react";
import {
  ShieldAlert, Smartphone, Monitor, Globe, CheckCircle2, RefreshCw, X, AlertTriangle, ArrowRight, ExternalLink, Settings, Bell, BellRing
} from "lucide-react";
import { notificationManager } from "../utils/notificationManager";

interface NotificationUnblockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnblocked?: () => void;
}

export default function NotificationUnblockModal({
  isOpen,
  onClose,
  onUnblocked
}: NotificationUnblockModalProps) {
  const [activeTab, setActiveTab] = useState<"android_pwa" | "android_chrome" | "ios" | "desktop">("android_pwa");
  const [isChecking, setIsChecking] = useState(false);
  const [unblockedSuccess, setUnblockedSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUnblockedSuccess(false);
      setStatusMessage(null);

      // Auto-detect environment
      const standalone =
        typeof window !== "undefined" &&
        (window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as any).standalone === true);
      setIsStandalone(standalone);

      const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
      const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (standalone && isAndroid) {
        setActiveTab("android_pwa");
      } else if (isAndroid) {
        setActiveTab("android_chrome");
      } else if (isIOS) {
        setActiveTab("ios");
      } else {
        setActiveTab("desktop");
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRecheckPermission = async () => {
    setIsChecking(true);
    setStatusMessage("Querying device permissions...");

    // Try requesting permission via user gesture
    await notificationManager.requestPermission().catch(() => {});

    // Check actual permission status
    const currentStatus = notificationManager.getPermissionStatus();
    notificationManager.broadcastPermissionCheck();

    setTimeout(() => {
      setIsChecking(false);
      if (currentStatus === "granted") {
        setUnblockedSuccess(true);
        setStatusMessage("Permissions detected! Notifications are now fully active.");
        notificationManager.playTaskChime();
        notificationManager.triggerVibration([200, 100, 200]);
        if (onUnblocked) onUnblocked();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusMessage(
          isStandalone
            ? "Still disabled in Phone Settings. Please enable notifications in App Info (ⓘ), then tap Re-check."
            : "Still blocked by device. Please follow the steps below in your phone/browser settings, then tap Re-check."
        );
      }
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-rose-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                  {isStandalone ? "Enable Notifications on Your Phone" : "Unblock Device Notifications"}
                </h3>
              </div>
              <p className="text-xs text-rose-800 font-medium mt-0.5">
                {isStandalone
                  ? "Notifications are currently disabled in your phone's app settings"
                  : "Notifications are currently blocked by system or browser settings"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Platform Selection Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/80 px-2 pt-2 gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("android_pwa")}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === "android_pwa"
                ? "bg-white text-blue-600 border-blue-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Android Downloaded App</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("android_chrome")}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === "android_chrome"
                ? "bg-white text-blue-600 border-blue-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Android Chrome</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ios")}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === "ios"
                ? "bg-white text-blue-600 border-blue-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>iPhone / iPad</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("desktop")}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === "desktop"
                ? "bg-white text-blue-600 border-blue-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>Desktop</span>
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {unblockedSuccess ? (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-in zoom-in-95">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-sm text-emerald-900">
                Notifications Successfully Unblocked!
              </h4>
              <p className="text-xs text-emerald-700">
                Your device will now receive real-time chimes, vibrations, and floating task dispatch alerts.
              </p>
            </div>
          ) : (
            <>
              {/* Tab 1: Android PWA (Installed App) */}
              {activeTab === "android_pwa" && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
                    <Smartphone className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">Why did it show blocked on mobile?</strong>
                      Android 13+ and installed PWAs require system notification permission enabled in phone Settings. Follow these 3 easy steps:
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                        1
                      </span>
                      <div>
                        <strong className="text-slate-900 block font-sans">Open Phone App Settings</strong>
                        <p className="text-slate-600 mt-0.5">
                          On your phone's home screen, <strong>long-press the PATS Tasks app icon</strong> $\rightarrow$ tap <strong>App Info (ⓘ)</strong>. (Or go to phone <strong>Settings → Apps → PATS Tasks</strong>).
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                        2
                      </span>
                      <div>
                        <strong className="text-slate-900 block font-sans">Enable Notifications</strong>
                        <p className="text-slate-600 mt-0.5">
                          Tap <strong>Notifications</strong> $\rightarrow$ switch <strong>Allow all notifications</strong> to <strong>ON</strong>. Ensure <strong>Pop on screen / Heads-up</strong> is also toggled ON.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                        3
                      </span>
                      <div>
                        <strong className="text-slate-900 block font-sans">Return & Re-Check</strong>
                        <p className="text-slate-600 mt-0.5">
                          Switch back to this app and tap the blue <strong>"Re-Check Permission Now"</strong> button below!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Android Chrome */}
              {activeTab === "android_chrome" && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                        1
                      </span>
                      <div>
                        <strong className="text-slate-900 block">Tap Lock Icon in Chrome URL bar</strong>
                        <p className="text-slate-600 mt-0.5">
                          Tap the <strong>padlock icon 🔒</strong> (or tune settings icon) on the left of the address bar at the top of Chrome.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                        2
                      </span>
                      <div>
                        <strong className="text-slate-900 block">Allow Notifications</strong>
                        <p className="text-slate-600 mt-0.5">
                          Tap <strong>Permissions</strong> $\rightarrow$ <strong>Notifications</strong> $\rightarrow$ Select <strong>Allow</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                        3
                      </span>
                      <div>
                        <strong className="text-slate-900 block">Tap Re-check</strong>
                        <p className="text-slate-600 mt-0.5">
                          Tap the <strong>Re-Check Permission Now</strong> button below to activate instant alerts.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: iOS (iPhone / iPad) */}
              {activeTab === "ios" && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                        1
                      </span>
                      <div>
                        <strong className="text-slate-900 block">Open iPhone Settings</strong>
                        <p className="text-slate-600 mt-0.5">
                          Go to your iPhone/iPad <strong>Settings app</strong> $\rightarrow$ tap <strong>Notifications</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                        2
                      </span>
                      <div>
                        <strong className="text-slate-900 block">Find PATS Tasks / Safari</strong>
                        <p className="text-slate-600 mt-0.5">
                          Scroll to find <strong>PATS Tasks</strong> (or Safari) and toggle <strong>Allow Notifications</strong> to <strong>ON</strong>. Ensure Banners & Sounds are enabled.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Desktop */}
              {activeTab === "desktop" && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                        1
                      </span>
                      <div>
                        <strong className="text-slate-900 block">Click Padlock 🔒 in URL Bar</strong>
                        <p className="text-slate-600 mt-0.5">
                          Click the <strong>padlock icon 🔒</strong> immediately to the left of the website URL in Chrome, Edge, or Brave.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                        2
                      </span>
                      <div>
                        <strong className="text-slate-900 block">Toggle Notifications to "Allow"</strong>
                        <p className="text-slate-600 mt-0.5">
                          Change the Notifications permission dropdown from "Block" to <strong>"Allow"</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Message */}
              {statusMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    statusMessage.includes("Still blocked")
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-blue-50 text-blue-800 border border-blue-200"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>

          {!unblockedSuccess && (
            <button
              type="button"
              onClick={handleRecheckPermission}
              disabled={isChecking}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-xs font-bold text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
              <span>{isChecking ? "Checking Status..." : "Re-Check Permission Now"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
