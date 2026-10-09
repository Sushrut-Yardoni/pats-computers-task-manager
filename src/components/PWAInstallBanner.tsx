import React, { useState, useEffect } from "react";
import { Smartphone, Download, CheckCircle, Info, X, Share2, PlusSquare, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { isAppInstalledPWA } from "../utils/geolocationTracker";

interface PWAInstallBannerProps {
  compact?: boolean;
}

export default function PWAInstallBanner({ compact = false }: PWAInstallBannerProps) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check initial install status
    setIsInstalled(isAppInstalledPWA());

    // Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Capture standard PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowModal(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      setShowModal(true);
    }
  };

  if (isInstalled) {
    if (compact) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>App Installed on Phone</span>
        </div>
      );
    }
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-3.5 text-xs text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="bg-emerald-600 text-white p-2 rounded-xl shrink-0 shadow-xs">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold flex items-center gap-1.5 text-emerald-950">
              <span>App Installed on Mobile Device</span>
              <span className="bg-emerald-200/80 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                PATS Tasks Mobile
              </span>
            </div>
            <p className="text-emerald-700 text-[11px] truncate mt-0.5">
              Instant access enabled with fast loading and offline sync
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 shrink-0 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ready for Field Use</span>
        </div>
      </div>
    );
  }

  if (dismissed && compact) return null;

  return (
    <>
      {/* Banner Component */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 shadow-md border border-indigo-700/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-xl shadow-inner shrink-0 mt-0.5 sm:mt-0">
              <Smartphone className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm text-white">
                  Install PATS App on Your Phone
                </h4>
                <span className="bg-blue-500/30 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                  Recommended
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                Add to your phone's home screen for instant 1-tap access, heads-up task notifications, and offline support.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end mt-1 sm:mt-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              <span>{deferredPrompt ? "Install App Now" : "How to Install"}</span>
            </button>
            {!compact && (
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Installation Instruction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Install PATS App on Phone</h3>
                  <p className="text-xs text-blue-100">Takes less than 10 seconds to add</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-blue-900 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-blue-650 shrink-0 mt-0.5" />
                <p>
                  Installing turns this website into a standalone phone app. It launches instantly from your home screen, works in offline spots, and ensures you receive ticket alerts immediately.
                </p>
              </div>

              {isIOS ? (
                /* iOS Instructions */
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Instructions for iPhone / iPad (Safari)</span>
                  </h4>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[11px] shrink-0">1</span>
                    <p className="text-slate-700">
                      Tap the <strong>Share</strong> button <Share2 className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> at the bottom of Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[11px] shrink-0">2</span>
                    <p className="text-slate-700">
                      Scroll down and tap <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-700 mx-0.5" />.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[11px] shrink-0">3</span>
                    <p className="text-slate-700">
                      Tap <strong>"Add"</strong> in the top right. Launch PATS Tasks from your home screen.
                    </p>
                  </div>
                </div>
              ) : (
                /* Android / Chrome Instructions */
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Instructions for Android Phone (Chrome)</span>
                  </h4>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[11px] shrink-0">1</span>
                    <p className="text-slate-700">
                      Tap the <strong>3 vertical dots</strong> (⋮) in the top-right corner of Chrome.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[11px] shrink-0">2</span>
                    <p className="text-slate-700">
                      Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[11px] shrink-0">3</span>
                    <p className="text-slate-700">
                      Confirm <strong>"Install"</strong>. The app icon will appear on your phone's app list.
                    </p>
                  </div>
                </div>
              )}

              {/* Direct button if prompt is available */}
              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Tap Here to Trigger One-Click Install</span>
                </button>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold text-xs rounded-xl text-slate-700"
              >
                Close Instructions
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
