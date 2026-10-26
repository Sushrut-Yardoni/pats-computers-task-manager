import React, { useState, useEffect } from "react";
import { 
  Package, 
  Boxes, 
  Upload, 
  Plus, 
  Search, 
  Download, 
  Key, 
  Trash2, 
  Edit3, 
  Check, 
  Copy, 
  FileArchive, 
  RefreshCw, 
  FileCode,
  ExternalLink,
  Loader2
} from "lucide-react";
import { SoftwareItem, SoftwareGroup } from "../types";
import SoftwareUploadModal from "./SoftwareUploadModal";
import SoftwareGroupModal from "./SoftwareGroupModal";
import { downloadSoftwareFile } from "../utils/fileDownloader";

interface SoftwareHubSectionProps {
  currentUser: { name: string; role: string };
}

export default function SoftwareHubSection({ currentUser }: SoftwareHubSectionProps) {
  const [softwares, setSoftwares] = useState<SoftwareItem[]>([]);
  const [groups, setGroups] = useState<SoftwareGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"groups" | "all">("groups");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingSoftware, setEditingSoftware] = useState<SoftwareItem | null>(null);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SoftwareGroup | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const copyToClipboard = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied ${label}`);
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
      showToast(`Downloaded ${cleanName}`);
    } catch (err: any) {
      showToast(err.message || "Failed to download software");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadGroupZip = async (group: SoftwareGroup) => {
    const cleanName = `${group.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_Software_Group.zip`;
    setDownloadingId(`grp-${group.id}`);
    try {
      await downloadSoftwareFile(`/api/software-groups/${group.id}/download-zip`, cleanName);
      showToast(`Downloaded ${group.name} ZIP package`);
    } catch (err: any) {
      showToast(err.message || "Failed to download ZIP");
    } finally {
      setDownloadingId(null);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [softRes, grpRes] = await Promise.all([
        fetch("/api/softwares"),
        fetch("/api/software-groups")
      ]);

      if (softRes.ok) {
        const softData = await softRes.json();
        setSoftwares(softData);
      }
      if (grpRes.ok) {
        const grpData = await grpRes.json();
        setGroups(grpData);
      }
    } catch (err) {
      console.error("Failed to load software repository:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ type: "software" | "group"; id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    setIsDeleting(true);

    try {
      if (deleteConfirmTarget.type === "software") {
        const res = await fetch(`/api/softwares/${deleteConfirmTarget.id}`, { method: "DELETE" });
        if (res.ok) {
          setSoftwares(prev => prev.filter(s => s.id !== deleteConfirmTarget.id));
          fetchData();
          showToast(`'${deleteConfirmTarget.name}' deleted`);
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.error || "Failed to delete software");
        }
      } else {
        const res = await fetch(`/api/software-groups/${deleteConfirmTarget.id}`, { method: "DELETE" });
        if (res.ok) {
          setGroups(prev => prev.filter(g => g.id !== deleteConfirmTarget.id));
          showToast(`Software group '${deleteConfirmTarget.name}' deleted`);
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.error || "Failed to delete group");
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error deleting item");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmTarget(null);
    }
  };

  const softwareMap = new Map<number, SoftwareItem>();
  softwares.forEach(s => softwareMap.set(s.id, s));

  // Filtered lists
  const filteredGroups = groups.filter(g => 
    !searchQuery.trim() || g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSoftwares = softwares.filter(s => 
    !searchQuery.trim() || s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-sans border border-slate-700 animate-fade-in">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Clean Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            <span>Software Hub</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload installers and create groups for 1-click ZIP bundle downloads
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setEditingSoftware(null);
              setIsUploadModalOpen(true);
            }}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Add Software</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingGroup(null);
              setIsGroupModalOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Group</span>
          </button>

          <button
            type="button"
            onClick={fetchData}
            title="Refresh"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-teal-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Simple View Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 bg-slate-100 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("groups")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "groups"
                ? "bg-white text-indigo-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            <span>Software Groups ({groups.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-white text-teal-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>All Softwares ({softwares.length})</span>
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick search..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-teal-600"
          />
        </div>
      </div>

      {/* 1. GROUPS TAB */}
      {activeTab === "groups" && (
        <div className="space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl p-6">
              <Boxes className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <h4 className="font-bold text-slate-800 text-sm">No Software Groups Yet</h4>
              <p className="text-xs text-slate-500 mt-1">
                Create a group of softwares so engineers can download all installers in a single ZIP.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingGroup(null);
                  setIsGroupModalOpen(true);
                }}
                className="mt-3 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Group</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGroups.map((group) => {
                const groupSoftwares = group.items
                  .map(it => softwareMap.get(it.software_id))
                  .filter(Boolean) as SoftwareItem[];

                return (
                  <div
                    key={group.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between transition-all"
                  >
                    <div>
                      {/* Group Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">
                            {group.name}
                          </h3>
                          <span className="text-[11px] text-slate-500">
                            {groupSoftwares.length} software packages
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroup(group);
                              setIsGroupModalOpen(true);
                            }}
                            title="Edit Group"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmTarget({ type: "group", id: group.id, name: group.name })}
                            title="Delete Group"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Primary Direct ZIP Download Button */}
                      <button
                        type="button"
                        onClick={() => handleDownloadGroupZip(group)}
                        disabled={downloadingId === `grp-${group.id}`}
                        className="mt-3 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all disabled:opacity-60"
                      >
                        {downloadingId === `grp-${group.id}` ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Downloading ZIP...</span>
                          </>
                        ) : (
                          <>
                            <FileArchive className="h-4 w-4" />
                            <span>Download Group (ZIP)</span>
                          </>
                        )}
                      </button>

                      {/* Softwares list */}
                      <div className="mt-3 divide-y divide-slate-100 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-xs">
                        {groupSoftwares.map((sw) => (
                          <div key={sw.id} className="py-1.5 flex items-center justify-between gap-2 first:pt-0 last:pb-0">
                            <span className="font-semibold text-slate-800 truncate">
                              {sw.name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {sw.license_key && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(sw.license_key!, `k-${group.id}-${sw.id}`, "License Key")}
                                  className="p-1 rounded text-amber-700 hover:bg-amber-100/60 cursor-pointer text-[10px] font-mono flex items-center gap-1"
                                  title="Copy license key"
                                >
                                  {copiedId === `k-${group.id}-${sw.id}` ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Key className="h-3 w-3" />
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDownloadSingle(sw)}
                                disabled={downloadingId === `sw-${sw.id}`}
                                title={sw.storage_type === "url" ? "Open vendor download link" : "Download installer file"}
                                className="p-1 rounded text-teal-700 hover:bg-teal-100/60 cursor-pointer disabled:opacity-50"
                              >
                                {downloadingId === `sw-${sw.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-teal-700" />
                                ) : sw.storage_type === "url" ? (
                                  <ExternalLink className="h-3 w-3" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. ALL SOFTWARES TAB */}
      {activeTab === "all" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {filteredSoftwares.length === 0 ? (
            <div className="py-12 text-center p-6 text-slate-500 text-xs">
              No software found. Click &quot;Add Software&quot; above to add one.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs font-sans">
              {filteredSoftwares.map((sw) => (
                <div key={sw.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 shrink-0">
                      <FileCode className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {sw.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{sw.storage_type === "file" ? "Uploaded File" : "Download Link"}</span>
                        {sw.file_size && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{sw.file_size}</span>
                          </>
                        )}
                        {sw.installation_notes && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate text-slate-600">{sw.installation_notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sw.license_key && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(sw.license_key!, `l-${sw.id}`, "License Key")}
                        className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                        title="Copy Key"
                      >
                        {copiedId === `l-${sw.id}` ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Key className="h-3 w-3" />
                        )}
                        <span>{sw.license_key}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDownloadSingle(sw)}
                      disabled={downloadingId === `sw-${sw.id}`}
                      className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 transition-colors cursor-pointer inline-flex items-center disabled:opacity-50"
                      title={sw.storage_type === "url" ? "Open vendor download link" : "Download installer file"}
                    >
                      {downloadingId === `sw-${sw.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-700" />
                      ) : sw.storage_type === "url" ? (
                        <ExternalLink className="h-3.5 w-3.5" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingSoftware(sw);
                        setIsUploadModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmTarget({ type: "software", id: sw.id, name: sw.name })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 cursor-pointer transition-colors"
                      title="Delete Software"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <SoftwareUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setEditingSoftware(null);
        }}
        onSaved={(saved) => {
          setSoftwares(prev => {
            const idx = prev.findIndex(s => s.id === saved.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = saved;
              return copy;
            }
            return [...prev, saved];
          });
          showToast(`Saved '${saved.name}'`);
        }}
        editingSoftware={editingSoftware}
        currentUser={currentUser}
      />

      <SoftwareGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setEditingGroup(null);
        }}
        onSaved={(saved) => {
          setGroups(prev => {
            const idx = prev.findIndex(g => g.id === saved.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = saved;
              return copy;
            }
            return [...prev, saved];
          });
          showToast(`Group '${saved.name}' saved`);
        }}
        editingGroup={editingGroup}
        availableSoftwares={softwares}
        currentUser={currentUser}
      />

      {/* In-App Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm">
                  Delete {deleteConfirmTarget.type === "software" ? "Software" : "Software Group"}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Are you sure you want to remove <span className="font-bold text-slate-800">"{deleteConfirmTarget.name}"</span>?
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              {deleteConfirmTarget.type === "software"
                ? "This will remove the software from the library and any groups containing it."
                : "This will delete the group bundle. Individual software packages will remain in the library."}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
