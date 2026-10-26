import React, { useState, useEffect } from "react";
import { 
  X, 
  Boxes, 
  Search, 
  Check, 
  AlertCircle, 
  Loader2 
} from "lucide-react";
import { SoftwareGroup, SoftwareItem, SoftwareGroupItem } from "../types";

interface SoftwareGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (group: SoftwareGroup) => void;
  editingGroup?: SoftwareGroup | null;
  availableSoftwares: SoftwareItem[];
  currentUser: { name: string; role: string };
}

export default function SoftwareGroupModal({
  isOpen,
  onClose,
  onSaved,
  editingGroup,
  availableSoftwares,
  currentUser
}: SoftwareGroupModalProps) {
  const [name, setName] = useState("");
  const [selectedSoftwareIds, setSelectedSoftwareIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingGroup) {
      setName(editingGroup.name || "");
      setSelectedSoftwareIds((editingGroup.items || []).map(it => it.software_id));
    } else {
      setName("");
      setSelectedSoftwareIds([]);
    }
    setSearchQuery("");
    setError(null);
  }, [editingGroup, isOpen]);

  if (!isOpen) return null;

  const toggleSoftware = (id: number) => {
    setSelectedSoftwareIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredSoftwares = availableSoftwares.filter(s => {
    if (!searchQuery.trim()) return true;
    return s.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter group name.");
      return;
    }

    if (selectedSoftwareIds.length === 0) {
      setError("Please select at least one software.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const itemsPayload: SoftwareGroupItem[] = selectedSoftwareIds.map(id => ({
        software_id: id,
        is_mandatory: true
      }));

      const payload = {
        name: name.trim(),
        description: "",
        target_profile: "Standard Workstation",
        items: itemsPayload,
        created_by: currentUser.name,
        created_by_role: currentUser.role
      };

      const url = editingGroup ? `/api/software-groups/${editingGroup.id}` : "/api/software-groups";
      const method = editingGroup ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Request failed with status ${res.status}`);
      }

      const saved: SoftwareGroup = await res.json();
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
              <Boxes className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingGroup ? "Edit Software Group" : "Create Software Group"}
              </h3>
              <p className="text-[11px] text-slate-500">
                Bundle softwares so engineers can download all in 1 ZIP
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

          {/* Group Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Workstation Kit, Accounts Bundle"
              required
              autoFocus
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-indigo-600"
            />
          </div>

          {/* Select Softwares */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700">
                Choose Softwares ({selectedSoftwareIds.length} selected)
              </label>
            </div>

            {/* Filter Search */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-indigo-600"
              />
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {filteredSoftwares.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs">
                  No software found in repository.
                </div>
              ) : (
                filteredSoftwares.map((s) => {
                  const isSelected = selectedSoftwareIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleSoftware(s.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected 
                          ? "bg-indigo-50/70 border-indigo-200" 
                          : "bg-slate-50 border-slate-200/70 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className="font-bold text-slate-800 truncate">
                          {s.name}
                        </span>
                      </div>
                      {s.license_key && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-mono shrink-0">
                          Key included
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
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
              className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{editingGroup ? "Save" : "Create Group"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
