import React, { useState, useEffect, useRef } from "react";
import {
  Volume2, Music, Check, Play, Smartphone, Vibrate, X, CheckCircle2, Upload, Trash2, RefreshCw, AlertCircle, FileAudio, Sparkles
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
  const [customTone, setCustomTone] = useState<{
    name: string;
    dataUri: string;
    size: string;
    duration?: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedToneId(notificationManager.getSelectedTone());
      setSelectedVibrationId(notificationManager.getSelectedVibrationId());
      setCustomTone(notificationManager.getCustomTone());
      setUploadError(null);

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

    // Reset playing state after tone duration (typically 800ms)
    setTimeout(() => {
      setCurrentlyPlayingTone((curr) => (curr === toneId ? null : curr));
    }, 1100);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Support audio files up to 15MB backed by IndexedDB storage
    if (file.size > 15 * 1024 * 1024) {
      setUploadError("The selected audio file is over 15MB. Please choose a sound clip or ringtone under 15MB.");
      return;
    }

    setIsUploading(true);
    const sizeFormatted =
      file.size < 1024 * 1024
        ? `${Math.round(file.size / 1024)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    const cleanName = file.name.replace(/\.[^/.]+$/, "");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUri = event.target?.result as string;
      if (dataUri) {
        // Measure duration if possible
        let durationFormatted = "";
        try {
          const tempAudio = new Audio(dataUri);
          await new Promise<void>((res) => {
            tempAudio.onloadedmetadata = () => {
              if (tempAudio.duration && isFinite(tempAudio.duration)) {
                durationFormatted =
                  tempAudio.duration < 60
                    ? `${tempAudio.duration.toFixed(1)}s`
                    : `${Math.floor(tempAudio.duration / 60)}m ${Math.floor(tempAudio.duration % 60)}s`;
              }
              res();
            };
            tempAudio.onerror = () => res();
            setTimeout(res, 600);
          });
        } catch {}

        await notificationManager.setCustomTone(cleanName, dataUri, sizeFormatted, durationFormatted);
        setCustomTone({ name: cleanName, dataUri, size: sizeFormatted, duration: durationFormatted });
        setSelectedToneId("custom");
        setIsUploading(false);

        // Immediate audio preview of uploaded file
        notificationManager.unlockAudioEngine();
        notificationManager.playTone("custom");
        notificationManager.triggerVibration([200, 100, 200]);
      }
    };

    reader.onerror = () => {
      setIsUploading(false);
      setUploadError("Could not read audio file. Please try another audio format (MP3, WAV, OGG, M4A).");
    };

    reader.readAsDataURL(file);
    // Reset file input value so user can upload the same filename if updated
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveCustomTone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationManager.removeCustomTone();
    setCustomTone(null);
    setSelectedToneId("pats_classic");
    notificationManager.setSelectedTone("pats_classic");
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
      case "Custom":
        return "bg-teal-50 text-teal-700 border-teal-200";
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
                Select built-in ringtones or choose your own audio file from your device
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
          {/* Section 1: Device Sound Picker (User can select sound from phone/device) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-teal-600" />
                Select Sound from Device
              </label>
              <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                MP3, WAV, M4A, OGG
              </span>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm,.flac"
              className="hidden"
            />

            {/* Active Custom Sound Card if already chosen */}
            {customTone ? (
              <div
                onClick={() => handleSelectTone("custom")}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedToneId === "custom"
                    ? "bg-teal-50/90 border-teal-400 shadow-xs ring-2 ring-teal-500/20"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        selectedToneId === "custom"
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {selectedToneId === "custom" && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-sm font-bold truncate ${
                          selectedToneId === "custom" ? "text-teal-950" : "text-slate-800"
                        }`}
                      >
                        {customTone.name}
                      </h4>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md border bg-teal-50 text-teal-700 border-teal-200">
                        Device File
                      </span>
                      {customTone.duration && (
                        <span className="text-[10px] font-mono text-teal-700 font-semibold bg-teal-100/60 px-1.5 py-0.5 rounded">
                          {customTone.duration}
                        </span>
                      )}
                      {customTone.size && (
                        <span className="text-[10px] font-mono text-slate-400 font-semibold">
                          {customTone.size}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">
                      Loaded directly from your device storage
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Play preview */}
                  <button
                    type="button"
                    onClick={(e) => handlePlayPreview("custom", e)}
                    className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      currentlyPlayingTone === "custom"
                        ? "bg-teal-600 text-white shadow-xs scale-105"
                        : "bg-teal-100 hover:bg-teal-200 text-teal-800"
                    }`}
                    title="Preview device sound"
                  >
                    {currentlyPlayingTone === "custom" ? (
                      <div className="flex items-end gap-0.5 h-3.5">
                        <span className="w-0.5 h-full bg-white animate-pulse" />
                        <span className="w-0.5 h-2 bg-white animate-pulse delay-75" />
                        <span className="w-0.5 h-3 bg-white animate-pulse delay-150" />
                      </div>
                    ) : (
                      <Play className="h-4 w-4 ml-0.5 fill-current" />
                    )}
                  </button>

                  {/* Replace */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Choose a different audio file"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={handleRemoveCustomTone}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove custom tone"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 border-2 border-dashed border-teal-200 hover:border-teal-400 bg-teal-50/40 hover:bg-teal-50/80 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 text-slate-700 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 group-hover:bg-teal-200 text-teal-700 flex items-center justify-center transition-colors">
                    <FileAudio className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-teal-900 transition-colors">
                      {isUploading ? "Uploading audio file..." : "Choose Audio File from Your Phone / PC"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Select your favorite custom ringtone, chime, or voice alert file
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-teal-600 group-hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-2xs shrink-0 flex items-center gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Browse Device</span>
                </button>
              </div>
            )}

            {uploadError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-1.5 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Section 2: Built-in Alert Ringtones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Volume2 className="h-4 w-4 text-blue-600" />
                Standard Dispatch Ringtones
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Tap to preview & select</span>
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

          {/* Section 3: Companion Vibration Selector */}
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
