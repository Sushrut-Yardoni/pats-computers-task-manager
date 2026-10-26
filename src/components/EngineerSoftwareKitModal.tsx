import React, { useState, useEffect } from "react";
import { 
  X, 
  Package, 
  Boxes, 
  Download, 
  Key, 
  Search, 
  Check, 
  Copy, 
  FileArchive, 
  FileCode,
  Info,
  ExternalLink,
  Loader2
} from "lucide-react";
import { SoftwareItem, SoftwareGroup } from "../types";
import { downloadSoftwareFile } from "../utils/fileDownloader";

interface EngineerSoftwareKitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EngineerSoftwareKitModal({
  isOpen,
  onClose
}: EngineerSoftwareKitModalProps) {
  const [softwares, setSoftwares] = useState<SoftwareItem[]>([]);
  const [groups, setGroups] = useState<SoftwareGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      Promise.all([
        fetch("/api/softwares").then(r => r.json()),
        fetch("/api/software-groups").then(r => r.json())
      ])
        .then(([softData, grpData]) => {
          if (Array.isArray(softData)) setSoftwares(softData);
          if (Array.isArray(grpData)) {
            setGroups(grpData);
            if (grpData.length > 0 && !selectedGroupId) {
              setSelectedGroupId(String(grpData[0].id));
            }
          }
        })
        .catch(err => console.error("Error loading kit:", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleDownloadSingle = async (sw: SoftwareItem) => {
    if (sw.storage_type === "url" && sw.file_url) {
      window.open(sw.file_url, "_blank", "noopener,noreferrer");
      return;
    }
    const cleanName = sw.original_file_name || (sw.file_name ? sw.file_name.replace(/^\d{10,}_/, "") : `${sw.name}.exe`);
    setDownloadingId(`sw-${sw.id}`);
    try {
      await downloadSoftwareFile(`/api/softwares/${sw.id}/download`, cleanName);
    } catch (err: any) {
      console.error("Download failed:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadGroupZip = async (group: SoftwareGroup) => {
    const cleanName = `${group.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_Software_Group.zip`;
    setDownloadingId(`grp-${group.id}`);
    try {
      await downloadSoftwareFile(`/api/software-groups/${group.id}/download-zip`, cleanName);
    } catch (err: any) {
      console.error("ZIP download failed:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const softwareMap = new Map<number, SoftwareItem>();
  softwares.forEach(s => softwareMap.set(s.id, s));

  const activeGroup = groups.find(g => String(g.id) === selectedGroupId);

  let displayedItems: SoftwareItem[] = [];
  if (selectedGroupId === "all") {
    displayedItems = softwares;
  } else if (activeGroup) {
    displayedItems = activeGroup.items
      .map(it => softwareMap.get(it.software_id))
      .filter(Boolean) as SoftwareItem[];
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayedItems = displayedItems.filter(s => 
      s.name.toLowerCase().includes(q) || (s.installation_notes && s.installation_notes.toLowerCase().includes(q))
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-100 text-teal-700">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Software Kit for Engineers
              </h3>
              <p className="text-[11px] text-slate-500">
                Download full software group in ZIP or get single installers and license keys
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

        {/* Group Selector & ZIP Download Action Bar */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-3">
          {/* Quick Group Tabs */}
          {groups.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {groups.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroupId(String(g.id))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedGroupId === String(g.id)
                      ? "bg-teal-700 text-white shadow-2xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <Boxes className="h-3.5 w-3.5" />
                  <span>{g.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedGroupId === String(g.id) ? "bg-teal-800 text-teal-100" : "bg-slate-200 text-slate-600"
                  }`}>
                    {g.items.length}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedGroupId("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedGroupId === "all"
                    ? "bg-teal-700 text-white shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>All Softwares ({softwares.length})</span>
              </button>
            </div>
          )}

          {/* Active Group Download Banner */}
          {activeGroup && selectedGroupId !== "all" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-teal-900 text-xs">📦 {activeGroup.name}</span>
                  <span className="text-[10px] bg-teal-200/70 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                    {activeGroup.items.length} softwares included
                  </span>
                </div>
                <p className="text-[11px] text-teal-700 mt-0.5">
                  Downloads all installers + license keys list in a single .zip file
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadGroupZip(activeGroup)}
                disabled={downloadingId === `grp-${activeGroup.id}`}
                className="px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 disabled:opacity-60"
              >
                {downloadingId === `grp-${activeGroup.id}` ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Downloading ZIP...</span>
                  </>
                ) : (
                  <>
                    <FileArchive className="h-4 w-4" />
                    <span>Download Entire Group (ZIP)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Quick search input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search software..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-teal-600"
            />
          </div>
        </div>

        {/* Softwares list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs font-sans">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Loading software packages...
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
              No softwares found in this group.
            </div>
          ) : (
            displayedItems.map((sw) => (
              <div
                key={sw.id}
                className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 shrink-0">
                    <FileCode className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">
                      {sw.name}
                    </div>
                    {sw.installation_notes && (
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {sw.installation_notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {/* License Key Quick Copy */}
                  {sw.license_key && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sw.license_key!, `kit-k-${sw.id}`)}
                      className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-800 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy Key"
                    >
                      {copiedId === `kit-k-${sw.id}` ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Key className="h-3 w-3" />
                          <span>{sw.license_key}</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Single Download */}
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(sw)}
                    disabled={downloadingId === `sw-${sw.id}`}
                    className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                    title={sw.storage_type === "url" ? "Open vendor download link" : "Download installer file"}
                  >
                    {downloadingId === `sw-${sw.id}` ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Downloading...</span>
                      </>
                    ) : sw.storage_type === "url" ? (
                      <>
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open Link</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50">
          <span className="text-slate-500">
            {displayedItems.length} software packages
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
