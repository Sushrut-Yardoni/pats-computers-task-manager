import React, { useState } from "react";
import { 
  Building, Plus, Search, Table, Grid, ChevronLeft, 
  Cpu, KeyRound, CalendarRange, MapPin, Layers, 
  FileSpreadsheet, HelpCircle, Eye, Info
} from "lucide-react";
import { Company, CompanyAsset } from "../types";

interface CompanySectionProps {
  companies: Company[];
  assets: CompanyAsset[];
  currentUser: any;
  onRefresh: () => Promise<void>;
}

export default function CompanySection({
  companies,
  assets,
  currentUser,
  onRefresh
}: CompanySectionProps) {
  // Navigation & View State
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "workbook">("table");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - Company
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState<"AMC" | "Non AMC">("AMC");

  // Form State - Asset
  const [assetForm, setAssetForm] = useState({
    asset: "",
    asset_id: "",
    location: "",
    department: "",
    monitor: "",
    employee_name: "",
    comp_name: "",
    model_no: "",
    configured_os: "",
    os_key: "",
    ms_office: "",
    office_key: "",
    other_app: "",
    serial: "",
    lan_ip: "",
    mac_ip: "",
    wifi_mac_ip: "",
    antivirus_key: "",
    key_val: "",
    validity: "",
    remarks: ""
  });

  // Derived Values
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const companyAssets = assets.filter(a => a.company_id === selectedCompanyId);

  // Filtered Assets based on Search
  const filteredAssets = companyAssets.filter(asset => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (asset.asset || "").toLowerCase().includes(query) ||
      (asset.asset_id || "").toLowerCase().includes(query) ||
      (asset.employee_name || "").toLowerCase().includes(query) ||
      (asset.comp_name || "").toLowerCase().includes(query) ||
      (asset.serial || "").toLowerCase().includes(query) ||
      (asset.location || "").toLowerCase().includes(query) ||
      (asset.lan_ip || "").toLowerCase().includes(query)
    );
  });

  // Filtered Companies based on Search
  const filteredCompanies = companies.filter(company => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      company.name.toLowerCase().includes(query) ||
      company.type.toLowerCase().includes(query) ||
      company.created_by.toLowerCase().includes(query)
    );
  });

  // Submit handlers
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setIsSubmitting(true);
    try {
      const creatorName = currentUser?.name || currentUser?.email_id || "System Admin";
      const resp = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName.trim(),
          type: companyType,
          created_by: creatorName
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to create company");
      }

      await onRefresh();
      setCompanyName("");
      setShowCompanyModal(false);
      alert("Company created successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;

    setIsSubmitting(true);
    try {
      const resp = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: selectedCompanyId,
          ...assetForm
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to add asset");
      }

      await onRefresh();
      // Reset form
      setAssetForm({
        asset: "",
        asset_id: "",
        location: "",
        department: "",
        monitor: "",
        employee_name: "",
        comp_name: "",
        model_no: "",
        configured_os: "",
        os_key: "",
        ms_office: "",
        office_key: "",
        other_app: "",
        serial: "",
        lan_ip: "",
        mac_ip: "",
        wifi_mac_ip: "",
        antivirus_key: "",
        key_val: "",
        validity: "",
        remarks: ""
      });
      setShowAssetModal(false);
      alert("Asset added successfully!");
    } catch (err: any) {
      alert("Error adding asset: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      {!selectedCompanyId ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
                <Building className="h-5 w-5 text-indigo-600" />
                <span>Company Directory</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Manage corporate clients, support contracts, and detailed technical asset spreadsheets.
              </p>
            </div>
            <button
              onClick={() => setShowCompanyModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Create Company</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mt-6">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies by name, support status or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 transition-all font-medium text-slate-700"
            />
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedCompanyId(null);
                  setSearchQuery("");
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer group"
                title="Back to Company List"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600 group-hover:text-slate-900" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-display font-bold text-slate-900">{selectedCompany?.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                    selectedCompany?.type === "AMC" 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {selectedCompany?.type} Contract
                  </span>
                </div>
                <p className="text-[10px] text-slate-405 font-medium mt-0.5">
                  Registered by {selectedCompany?.created_by} on {selectedCompany?.created_at ? new Date(selectedCompany.created_at).toLocaleDateString() : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Layout Mode Toggles */}
              <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex items-center">
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Compact Table View"
                >
                  <Table className="h-3.5 w-3.5" />
                  <span>Standard</span>
                </button>
                <button
                  onClick={() => setViewMode("workbook")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "workbook"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Dense Workbook Grid View"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Workbook</span>
                </button>
              </div>

              {/* Add Asset Button */}
              <button
                onClick={() => setShowAssetModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Asset</span>
              </button>
            </div>
          </div>

          {/* Asset Search */}
          <div className="relative mt-5">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets inside this company by ID, type, employee, serial, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 transition-all font-medium text-slate-700"
            />
          </div>
        </div>
      )}

      {/* Main Grid / Tables */}
      {!selectedCompanyId ? (
        // 🏢 COMPANIES LIST VIEW
        filteredCompanies.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
            <Building className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h4 className="text-sm font-bold text-slate-800">No Companies Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are no registered companies matching your search. Create a new company registry using the button above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCompanies.map(company => {
              const count = assets.filter(a => a.company_id === company.id).length;
              return (
                <div
                  key={company.id}
                  onClick={() => {
                    setSelectedCompanyId(company.id);
                    setSearchQuery("");
                  }}
                  className="bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-indigo-200 rounded-3xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Design accent */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/[0.03] to-transparent rounded-bl-3xl pointer-events-none" />

                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="bg-slate-100 group-hover:bg-indigo-50 p-3 rounded-2xl text-slate-600 group-hover:text-indigo-600 transition-colors">
                        <Building className="h-5 w-5" />
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                        company.type === "AMC" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}>
                        {company.type}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-display font-bold text-slate-800 group-hover:text-indigo-900 transition-colors leading-tight">
                        {company.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        Registered by {company.created_by}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-slate-550">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Registered Assets</span>
                    <span className="bg-slate-100 text-slate-700 text-xs font-black px-2.5 py-1 rounded-lg">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        // 🖥️ SELECTED COMPANY'S ASSETS VIEW
        filteredAssets.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
            <Cpu className="h-12 w-12 text-slate-300 mx-auto mb-4 animate-pulse" />
            <h4 className="text-sm font-bold text-slate-800">No Assets Registered</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are no assets currently logged for {selectedCompany?.name}. Click "Add Asset" to populate the database.
            </p>
          </div>
        ) : viewMode === "workbook" ? (
          // 📊 WORKBOOK FORMAT (DENSE EXCEL SPREADSHEET LOOK)
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Workbook Spreadsheet Editor Mode</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Showing {filteredAssets.length} asset records
              </div>
            </div>

            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-[11px] text-left border-collapse font-mono select-text divide-y divide-slate-150">
                <thead className="bg-slate-100 text-slate-600 uppercase font-bold tracking-wide sticky top-0">
                  <tr className="divide-x divide-slate-200">
                    <th className="px-3 py-2.5 text-slate-700 font-black">Asset</th>
                    <th className="px-3 py-2.5">Asset ID</th>
                    <th className="px-3 py-2.5">Location</th>
                    <th className="px-3 py-2.5">Department</th>
                    <th className="px-3 py-2.5">Monitor</th>
                    <th className="px-3 py-2.5">Employee</th>
                    <th className="px-3 py-2.5">Comp Name</th>
                    <th className="px-3 py-2.5">Model No.</th>
                    <th className="px-3 py-2.5">Config OS</th>
                    <th className="px-3 py-2.5">OS Key</th>
                    <th className="px-3 py-2.5">MS Office</th>
                    <th className="px-3 py-2.5">Office Key</th>
                    <th className="px-3 py-2.5">Other App</th>
                    <th className="px-3 py-2.5">Serial</th>
                    <th className="px-3 py-2.5">LAN IP</th>
                    <th className="px-3 py-2.5">MAC IP</th>
                    <th className="px-3 py-2.5">Wifi MAC</th>
                    <th className="px-3 py-2.5">Antivirus</th>
                    <th className="px-3 py-2.5">Key</th>
                    <th className="px-3 py-2.5">Validity</th>
                    <th className="px-3 py-2.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-150">
                  {filteredAssets.map((asset, idx) => (
                    <tr 
                      key={asset.id} 
                      className={`hover:bg-indigo-50/50 transition-colors divide-x divide-slate-150 ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                    >
                      <td className="px-3 py-2 font-bold text-slate-805 bg-indigo-50/10 whitespace-nowrap">{asset.asset}</td>
                      <td className="px-3 py-2 font-black text-indigo-700 whitespace-nowrap">{asset.asset_id}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asset.location || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asset.department || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asset.monitor || "-"}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">{asset.employee_name || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asset.comp_name || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asset.model_no || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asset.configured_os || "-"}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate" title={asset.os_key}>{asset.os_key || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asset.ms_office || "-"}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate" title={asset.office_key}>{asset.office_key || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asset.other_app || "-"}</td>
                      <td className="px-3 py-2 text-xs font-semibold select-all whitespace-nowrap">{asset.serial || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asset.lan_ip || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asset.mac_ip || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asset.wifi_mac_ip || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asset.antivirus_key || "-"}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate" title={asset.key_val}>{asset.key_val || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asset.validity || "-"}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={asset.remarks}>{asset.remarks || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 text-[10px] text-slate-400 font-mono">
              Note: Workbook format is designed for rapid horizontal telemetry analysis. Select any cells to copy technical product keys.
            </div>
          </div>
        ) : (
          // 📋 STANDARD CARD-BASED RICH DATA TABLE
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4">Asset Detail</th>
                    <th className="px-6 py-4">Assignment</th>
                    <th className="px-6 py-4">Network Info</th>
                    <th className="px-6 py-4">Product Keys</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredAssets.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Cpu className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="block font-bold text-slate-800 text-sm leading-tight">
                              {asset.asset}
                            </span>
                            <span className="block text-[10px] font-mono text-indigo-600 mt-0.5 font-bold">
                              ID: {asset.asset_id}
                            </span>
                            <span className="block text-[10px] text-slate-405 mt-0.5">
                              Model: {asset.model_no || "N/A"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span className="font-bold">{asset.employee_name || "Unassigned"}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Dept: {asset.department || "N/A"} | Loc: {asset.location || "N/A"}
                        </div>
                        {asset.comp_name && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            PC Name: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">{asset.comp_name}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4.5 space-y-1">
                        {asset.lan_ip && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                            <span className="font-bold text-slate-400">LAN:</span>
                            <span>{asset.lan_ip}</span>
                          </div>
                        )}
                        {asset.mac_ip && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                            <span className="font-bold text-slate-400">MAC:</span>
                            <span>{asset.mac_ip}</span>
                          </div>
                        )}
                        {asset.wifi_mac_ip && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                            <span className="font-bold text-slate-400">WIFI:</span>
                            <span>{asset.wifi_mac_ip}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4.5 space-y-1">
                        {asset.configured_os && (
                          <div className="text-[10px] text-slate-605">
                            <span className="font-bold text-slate-800">OS: </span>
                            <span>{asset.configured_os}</span>
                            {asset.os_key && <span className="block font-mono text-[9px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 mt-0.5 text-slate-500 select-all">{asset.os_key}</span>}
                          </div>
                        )}
                        {asset.ms_office && (
                          <div className="text-[10px] text-slate-605 pt-0.5">
                            <span className="font-bold text-slate-800">Office: </span>
                            <span>{asset.ms_office}</span>
                            {asset.office_key && <span className="block font-mono text-[9px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 mt-0.5 text-slate-500 select-all">{asset.office_key}</span>}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4.5 text-right">
                        <button
                          onClick={() => {
                            alert(
                              `Asset Profile Log Details:\n\n` +
                              `Asset Type: ${asset.asset}\n` +
                              `Asset ID: ${asset.asset_id}\n` +
                              `Serial Number: ${asset.serial || "N/A"}\n` +
                              `Monitor Status: ${asset.monitor || "N/A"}\n` +
                              `Other Apps: ${asset.other_app || "N/A"}\n` +
                              `Antivirus Key: ${asset.antivirus_key || "N/A"}\n` +
                              `License Key: ${asset.key_val || "N/A"}\n` +
                              `License Validity: ${asset.validity || "N/A"}\n` +
                              `Remarks: ${asset.remarks || "No remarks loaded."}`
                            );
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-[10px]"
                        >
                          Show Meta Info
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* =======================================================
          🏢 CREATING COMPANY MODAL
         ======================================================= */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 overflow-hidden shadow-xl animate-fade-in">
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4 flex items-center justify-between">
              <h4 className="font-display font-extrabold text-indigo-950 text-sm uppercase tracking-wider flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span>Register New Corporate Entity</span>
              </h4>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1.5">Company / Client Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Tech Solutions Private Limited"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1.5">Maintenance Contract (AMC Status)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCompanyType("AMC")}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      companyType === "AMC"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Annual Maintenance (AMC)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyType("Non AMC")}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      companyType === "Non AMC"
                        ? "bg-amber-50 border-amber-300 text-amber-850 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Ad-Hoc / Non-AMC
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-2.5 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  {isSubmitting ? "Creating Client..." : "Confirm Registry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          🖥️ CREATING ASSET MODAL
         ======================================================= */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 my-8 overflow-hidden shadow-xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4 flex items-center justify-between shrink-0">
              <h4 className="font-display font-extrabold text-indigo-950 text-sm uppercase tracking-wider flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                <span>Add Technical Asset to {selectedCompany?.name}</span>
              </h4>
              <button
                onClick={() => setShowAssetModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Asset */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Asset Name / Type *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Laptop, Desktop, Printer, NAS"
                    value={assetForm.asset}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, asset: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Asset ID */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Asset ID / Tag *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PATS-LAP-098"
                    value={assetForm.asset_id}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, asset_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Head Office, Mumbai"
                    value={assetForm.location}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Finance, HR, Operations"
                    value={assetForm.department}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Monitor */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Monitor Status / Specs</label>
                  <input
                    type="text"
                    placeholder="e.g. Dell 24-inch SE2422H"
                    value={assetForm.monitor}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, monitor: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Employee Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Assigned Employee Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rohan Kelkar"
                    value={assetForm.employee_name}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, employee_name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Comp Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Computer Name (PC Name)</label>
                  <input
                    type="text"
                    placeholder="e.g. ACME-MUM-LAP45"
                    value={assetForm.comp_name}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, comp_name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Model No. */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Model No.</label>
                  <input
                    type="text"
                    placeholder="e.g. HP ProBook 440 G9"
                    value={assetForm.model_no}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, model_no: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Configured OS */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Configured OS</label>
                  <input
                    type="text"
                    placeholder="e.g. Windows 11 Pro 64-bit"
                    value={assetForm.configured_os}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, configured_os: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* OS Key */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">OS Product Key</label>
                  <input
                    type="text"
                    placeholder="e.g. W269N-WFGWX-YVC9B-4J6C9-T83GX"
                    value={assetForm.os_key}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, os_key: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* MS Office */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">MS Office / MS Offica Edition</label>
                  <input
                    type="text"
                    placeholder="e.g. Office Home & Business 2021"
                    value={assetForm.ms_office}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, ms_office: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Office Key */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Office Activation Key</label>
                  <input
                    type="text"
                    placeholder="e.g. NH288-DFHWI-7928D-WUIHG-8843F"
                    value={assetForm.office_key}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, office_key: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Other App */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Other Apps Installed</label>
                  <input
                    type="text"
                    placeholder="e.g. Adobe Acrobat Reader, WinRAR"
                    value={assetForm.other_app}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, other_app: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Serial */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Serial Number (S/N)</label>
                  <input
                    type="text"
                    placeholder="e.g. 5CD1426FZ3"
                    value={assetForm.serial}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, serial: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* LAN IP */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">LAN IP Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.105"
                    value={assetForm.lan_ip}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, lan_ip: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* MAC IP */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">MAC Address (LAN)</label>
                  <input
                    type="text"
                    placeholder="e.g. E4-E7-49-12-8A-9C"
                    value={assetForm.mac_ip}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, mac_ip: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Wifi Mac IP */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Wi-Fi MAC Address</label>
                  <input
                    type="text"
                    placeholder="e.g. E4-E7-49-12-8A-9D"
                    value={assetForm.wifi_mac_ip}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, wifi_mac_ip: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Antivirus Key */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Antivirus License Key</label>
                  <input
                    type="text"
                    placeholder="e.g. K7-2026-F982-1200"
                    value={assetForm.antivirus_key}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, antivirus_key: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Key */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Other License Key</label>
                  <input
                    type="text"
                    placeholder="e.g. Any custom system license key"
                    value={assetForm.key_val}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, key_val: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Validity */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">License Validity Period</label>
                  <input
                    type="text"
                    placeholder="e.g. Valid till 31-Dec-2026"
                    value={assetForm.validity}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, validity: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Technical Remarks / Notes</label>
                <textarea
                  placeholder="Describe status of the unit, spare replacements, pending battery upgrades, etc."
                  value={assetForm.remarks}
                  rows={3}
                  onChange={(e) => setAssetForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium resize-none"
                />
              </div>

              <div className="pt-4 flex gap-2.5 justify-end border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  {isSubmitting ? "Adding Asset..." : "Register Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
