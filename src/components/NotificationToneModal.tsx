import React, { useState, useEffect } from "react";
import {
  Volume2, Music, Check, Play, Pause, Smartphone, Vibrate, Sparkles, X, CheckCircle2, Radio
} from "lucide-react";
import {
  notificationManager,
  AVAILABLE_NOTIFICATION_TONES,
  AVAILABLE_VIBRATION_PATTERNS,
  NotificationTone,
  VibrationPattern
} from "../utils/notificationManager";

interface NotificationToneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToneSaved?: (tone: NotificationTone) => void;
}

export default function NotificationToneModal({
  isOpen,
  onClose,
  onToneSaved
}: NotificationToneModalProps) {
  const [selectedToneId, setSelectedToneId] = useState<string>("pats_classic");
  const [selectedVibrationId, setSelectedVibrationId] = useState<string>("classic");
  const [currentlyPlayingTone, setCurrentlyPlayingTone] = useState<string | null>(null);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedToneId(notificationManager.getSelectedTone());
      setSelectedVibrationId(notificationManager.getSelectedVibrationId());
      const standalone =
        typeof window !== "undefined" &&
        (window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as any).standalone === true);
      setIsStandalone(standalone);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePlayPreview = (toneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    notificationManager.unlockAudioEngine();
    setCurrentlyPlayingTone(toneId);
    notificationManager.playTone(toneId);

    // Reset playing state after tone duration (typically 750ms)
    setTimeout(() => {
      setCurrentlyPlayingTone((curr) => (curr === toneId ? null : curr));
    }, 850);
  };

  const handleSelectTone = (toneId: string) => {
    setSelectedToneId(toneId);
    notificationManager.setSelectedTone(toneId);
    notificationManager.playTonePreview(toneId);
  };

  const handleSelectVibration = (vibId: string) => {
    setSelectedVibrationId(vibId);
    notificationManager.setSelectedVibration(vibId);
    const pattern = AVAILABLE_VIBRATION_PATTERNS.find((v) => v.id === vibId)?.pattern;
    if (pattern) {
      notificationManager.triggerVibration(pattern);
    }
  };

  const handleSaveAndTest = () => {
    notificationManager.setSelectedTone(selectedToneId);
    notificationManager.setSelectedVibration(selectedVibrationId);

    // Trigger full combined preview
    notificationManager.playTaskChime();
    notificationManager.triggerVibration();

    setIsSavedFeedback(true);
    const tone = notificationManager.getSelectedToneDetails();
    if (onToneSaved) {
      onToneSaved(tone);
    }

    setTimeout(() => {
      setIsSavedFeedback(false);
      onClose();
    }, 1200);
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "High-Energy":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Melodic":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Urgent":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Subtle":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                  Personal Notification Tone
                </h3>
                {isStandalone && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <Smartphone className="h-3 w-3" />
                    Mobile App View
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose the alert ringtone & vibration for new tasks on this device
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

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Mobile Downloaded View Notice */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 rounded-2xl flex items-start gap-3">
            <Smartphone className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Customized Per-Device: </span>
              Your selected tone is stored locally and will play whenever a new dispatch ticket arrives or when you test notifications.
            </div>
          </div>

          {/* Tone Selection Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Volume2 className="h-4 w-4 text-blue-600" />
                Select Notification Ringtone
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Tap to select & preview</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {AVAILABLE_NOTIFICATION_TONES.map((tone) => {
                const isSelected = selectedToneId === tone.id;
                const isPlaying = currentlyPlayingTone === tone.id;

                return (
                  <div
                    key={tone.id}
                    onClick={() => handleSelectTone(tone.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-400/90 shadow-xs ring-2 ring-blue-500/20"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    {/* Left: Radio & info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={`text-sm font-bold truncate ${
                              isSelected ? "text-blue-900" : "text-slate-800"
                            }`}
                          >
                            {tone.name}
                          </h4>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(
                              tone.category
                            )}`}
                          >
                            {tone.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">
                          {tone.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Right: Play Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => handlePlayPreview(tone.id, e)}
                      className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isPlaying
                          ? "bg-blue-600 text-white shadow-xs scale-105"
                          : isSelected
                          ? "bg-blue-100 hover:bg-blue-200 text-blue-700"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      }`}
                      title={`Preview ${tone.name}`}
                    >
                      {isPlaying ? (
                        <div className="flex items-end gap-0.5 h-3.5">
                          <span className="w-0.5 h-full bg-white animate-pulse" />
                          <span className="w-0.5 h-2.5 bg-white animate-pulse delay-75" />
                          <span className="w-0.5 h-3.5 bg-white animate-pulse delay-150" />
                        </div>
                      ) : (
                        <Play className="h-4 w-4 ml-0.5 fill-current" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Companion Vibration Selector */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Vibrate className="h-4 w-4 text-blue-600" />
                Haptic Vibration Pattern
              </label>
              <span className="text-[11px] text-slate-400 font-medium">For mobile devices</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_VIBRATION_PATTERNS.map((vib) => {
                const isSelected = selectedVibrationId === vib.id;

                return (
                  <button
                    key={vib.id}
                    type="button"
                    onClick={() => handleSelectVibration(vib.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{vib.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{vib.description}</p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveAndTest}
            disabled={isSavedFeedback}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-xs font-bold text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-emerald-600"
          >
            {isSavedFeedback ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Saved & Tested!</span>
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                <span>Set as My Personal Tone</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
