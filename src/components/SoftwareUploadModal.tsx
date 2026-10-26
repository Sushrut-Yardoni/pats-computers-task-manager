import React, { useState, useEffect } from "react";
import { 
  X, 
  Upload, 
  Link as LinkIcon, 
  FileCode, 
  Key, 
  AlertCircle, 
  Check, 
  Loader2 
} from "lucide-react";
import { SoftwareItem } from "../types";

interface SoftwareUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (software: SoftwareItem) => void;
  editingSoftware?: SoftwareItem | null;
  currentUser: { name: string; role: string };
}

export default function SoftwareUploadModal({
  isOpen,
  onClose,
  onSaved,
  editingSoftware,
  currentUser
}: SoftwareUploadModalProps) {
  const [name, setName] = useState("");
  const [storageType, setStorageType] = useState<"file" | "url">("url");
  const [fileUrl, setFileUrl] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [notes, setNotes] = useState("");

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUri, setFileDataUri] = useState<string>("");
  const [fileNameStr, setFileNameStr] = useState<string>("");
  const [fileSizeStr, setFileSizeStr] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingSoftware) {
      setName(editingSoftware.name || "");
      setStorageType(editingSoftware.storage_type || "url");
      setFileUrl(editingSoftware.file_url || "");
      setLicenseKey(editingSoftware.license_key || "");
      setNotes(editingSoftware.installation_notes || "");
      setFileNameStr(editingSoftware.file_name || "");
      setFileSizeStr(editingSoftware.file_size || "");
      setSelectedFile(null);
      setFileDataUri("");
    } else {
      setName("");
      setStorageType("url");
      setFileUrl("");
      setLicenseKey("");
      setNotes("");
      setSelectedFile(null);
      setFileDataUri("");
      setFileSizeStr("");
      setFileNameStr("");
    }
    setError(null);
  }, [editingSoftware, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setError("File exceeds 100MB limit. For larger installers, choose 'Download Link / URL'.");
      return;
    }

    setSelectedFile(file);
    setFileNameStr(file.name);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setFileSizeStr(file.size > 1024 * 1024 ? `${sizeMb} MB` : `${Math.round(file.size / 1024)} KB`);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter software name.");
      return;
    }

    if (storageType === "url" && !fileUrl.trim()) {
      setError("Please enter download link.");
      return;
    }

    if (storageType === "file" && !editingSoftware && !selectedFile) {
      setError("Please choose a file to upload.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let uploadedMeta: { file_url: string; file_name: string; original_file_name: string; file_size: string } | null = null;

      // 1. Direct Binary Streaming Upload if new file is selected
      if (storageType === "file" && selectedFile) {
        const uploadRes = await fetch(`/api/softwares/upload-binary?fileName=${encodeURIComponent(selectedFile.name)}`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: selectedFile
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || `Binary upload failed with HTTP ${uploadRes.status}`);
        }

        uploadedMeta = await uploadRes.json();
      }

      // 2. Prepare payload
      const payload: any = {
        name: name.trim(),
        version: "latest",
        category: "Utilities & Tools",
        platform: "Windows",
        storage_type: storageType,
        license_key: licenseKey.trim() || undefined,
        installation_notes: notes.trim() || undefined,
        created_by: currentUser.name,
        created_by_role: currentUser.role
      };

      if (storageType === "url") {
        let suggestedName = `${name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}.exe`;
        try {
          const parsed = new URL(fileUrl.trim());
          const lastPart = parsed.pathname.split("/").filter(Boolean).pop();
          if (lastPart && lastPart.includes(".")) {
            suggestedName = decodeURIComponent(lastPart);
          }
        } catch {
          // ignore url parse
        }
        const resolvedName = fileNameStr.trim() || suggestedName;
        payload.file_url = fileUrl.trim();
        payload.file_name = resolvedName;
        payload.original_file_name = resolvedName;
        payload.file_size = "Direct Link";
      } else {
        if (uploadedMeta) {
          payload.file_url = uploadedMeta.file_url;
          payload.file_name = uploadedMeta.file_name;
          payload.original_file_name = uploadedMeta.original_file_name || selectedFile?.name;
          payload.file_size = uploadedMeta.file_size;
        } else if (editingSoftware) {
          payload.file_url = editingSoftware.file_url;
          payload.file_name = editingSoftware.file_name;
          payload.original_file_name = editingSoftware.original_file_name || editingSoftware.file_name;
          payload.file_size = editingSoftware.file_size;
        }
      }

      const url = editingSoftware ? `/api/softwares/${editingSoftware.id}` : "/api/softwares";
      const method = editingSoftware ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Request failed with status ${res.status}`);
      }

      const saved: SoftwareItem = await res.json();
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save software.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-100 text-teal-700">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingSoftware ? "Edit Software" : "Add Software"}
              </h3>
              <p className="text-[11px] text-slate-500">
                Upload an installer or enter a download link
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Software Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Software Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Google Chrome, AnyDesk, Tally, Quick Heal"
              required
              autoFocus
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-teal-600"
            />
          </div>

          {/* 2. Choose Delivery: File or Link */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Installer Source</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setStorageType("url")}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  storageType === "url"
                    ? "bg-white text-teal-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>Download Link / URL</span>
              </button>
              <button
                type="button"
                onClick={() => setStorageType("file")}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  storageType === "file"
                    ? "bg-white text-teal-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload File (.exe/.zip)</span>
              </button>
            </div>
          </div>

          {storageType === "url" ? (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Download Link <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://... or Google Drive link"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-teal-600"
              />
            </div>
          ) : (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Select Installer File
              </label>
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors text-center">
                <input
                  type="file"
                  id="simple-software-file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".exe,.msi,.zip,.dmg,.pkg,.apk,.bat"
                />
                <label
                  htmlFor="simple-software-file"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                >
                  <FileCode className="h-6 w-6 text-teal-600" />
                  <span className="font-bold text-teal-700 hover:underline">
                    {fileNameStr ? "Change file" : "Choose installer file"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Supports EXE, MSI, ZIP, DMG, APK (Up to 100MB)
                  </span>
                </label>
                {fileNameStr && (
                  <div className="mt-2 text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{fileNameStr}</span>
                    {fileSizeStr && <span className="text-slate-400 font-mono">({fileSizeStr})</span>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Optional License Key */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Key className="h-3.5 w-3.5 text-amber-600" />
              <span>License / Activation Key (Optional)</span>
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="e.g. XXXX-XXXX-XXXX"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-teal-600 font-mono"
            />
          </div>

          {/* 4. Optional Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Notes for Engineer (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Run as Administrator, restart after install"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-teal-600"
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{editingSoftware ? "Save" : "Add Software"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
