import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  Building, Plus, Search, User, CalendarRange, Edit3, Eye, FileSpreadsheet, 
  X, Check, Laptop, Shield, Network, RefreshCw, Cpu, Layers, 
  HardDrive, Key, AlertCircle, Tag, ArrowRight, UserCheck, Users, Printer, Monitor,
  Trash2, FileText, Lock, Upload, FileUp, CheckCircle, CheckCircle2, Sparkles
} from "lucide-react";
import { Company, CompanyAsset, Employee } from "../types";

interface CompanySectionProps {
  key?: React.Key;
  companies: Company[];
  assets?: CompanyAsset[];
  employees?: Employee[];
  currentUser: any;
  defaultScopeFilter?: "all" | "my";
  onRefresh: () => Promise<void>;
}

export default function CompanySection({
  companies,
  assets = [],
  employees = [],
  currentUser,
  defaultScopeFilter,
  onRefresh
}: CompanySectionProps) {
  // Determine user permissions
  const isAdmin = currentUser?.type === "admin";
  const userRole = (currentUser?.role || "").toLowerCase();
  const isManager = userRole.includes("manager");
  const isAdminOrManager = isAdmin || isManager;
  const currentEmployeeId = currentUser?.id;

  // Helper to verify if current user can MANAGE (create, edit, delete) assets for a company:
  // Admins & Managers can manage all. Engineers can ONLY manage assets for companies allocated to them.
  const canManageCompanyAssets = (company?: Company | null) => {
    if (isAdminOrManager) return true;
    if (!company) return false;
    return Number(company.allocated_engineer_id) === Number(currentEmployeeId);
  };

  // Helper to verify if current user can VIEW assets for a given company:
  // ALL engineers and admins can view any company's assets (including other engineers' assets)!
  const canAccessCompanyAssets = (_company?: Company | null) => true;
  const canViewCompanyAssets = (_company?: Company | null) => true;

  // Local optimistic state for instant UI response
  const [localExtraCompanies, setLocalExtraCompanies] = useState<Company[]>([]);
  const [localAssetOverrides, setLocalAssetOverrides] = useState<Map<number, CompanyAsset>>(new Map());
  const [localCreatedAssets, setLocalCreatedAssets] = useState<CompanyAsset[]>([]);
  const [localDeletedAssetIds, setLocalDeletedAssetIds] = useState<Set<number>>(new Set());

  // Effective assets combining prop assets + local optimistic edits
  const effectiveAssets = useMemo(() => {
    const list: CompanyAsset[] = [];
    const seenIds = new Set<number>();

    // 1. Process props assets with any local edits or deletions
    assets.forEach(a => {
      if (localDeletedAssetIds.has(a.id)) return;
      const overridden = localAssetOverrides.get(a.id) || a;
      list.push(overridden);
      seenIds.add(a.id);
    });

    // 2. Add locally created assets that might not be in prop yet
    localCreatedAssets.forEach(ca => {
      if (!localDeletedAssetIds.has(ca.id) && !seenIds.has(ca.id)) {
        list.push(localAssetOverrides.get(ca.id) || ca);
        seenIds.add(ca.id);
      }
    });

    return list;
  }, [assets, localAssetOverrides, localCreatedAssets, localDeletedAssetIds]);

  // Combined all companies
  const allCompanies = useMemo(() => {
    const existingIds = new Set(companies.map(c => Number(c.id)));
    const combined = [...companies];
    localExtraCompanies.forEach(lc => {
      if (!existingIds.has(Number(lc.id))) {
        combined.push(lc);
      }
    });
    return combined;
  }, [companies, localExtraCompanies]);

  // Filter companies visible to this user
  // Default to "my" (My Allocated Companies) for engineers, and "all" for administrators/managers
  const [scopeFilter, setScopeFilter] = useState<"all" | "my">(defaultScopeFilter || (!isAdminOrManager ? "my" : "all"));

  // Keep "My Allocated Companies" as default whenever engineer opens or interacts with company assets
  useEffect(() => {
    if (!isAdminOrManager) {
      setScopeFilter("my");
    }
  }, [isAdminOrManager, currentEmployeeId, defaultScopeFilter]);

  const visibleCompanies = useMemo(() => {
    if (isAdminOrManager || scopeFilter === "all") {
      return allCompanies;
    }
    return allCompanies.filter(c => 
      Number(c.allocated_engineer_id) === Number(currentEmployeeId)
    );
  }, [allCompanies, isAdminOrManager, scopeFilter, currentEmployeeId]);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return visibleCompanies;
    const query = searchQuery.toLowerCase();
    return visibleCompanies.filter(company => {
      const nameMatch = company.name.toLowerCase().includes(query);
      const typeMatch = company.type.toLowerCase().includes(query);
      const engMatch = company.allocated_engineer_name?.toLowerCase().includes(query);
      const creatorMatch = company.created_by?.toLowerCase().includes(query);
      return nameMatch || typeMatch || engMatch || creatorMatch;
    });
  }, [visibleCompanies, searchQuery]);

  // Company Modal State
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState<"AMC" | "Non AMC">("AMC");
  const [companyAllocatedEngineerId, setCompanyAllocatedEngineerId] = useState<number | "">(
    !isAdminOrManager && currentEmployeeId ? currentEmployeeId : ""
  );
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);

  // Excel Bulk Upload State
  const [uploadModal, setUploadModal] = useState<{
    company: Company;
    fileName: string;
    parsedAssets: Partial<CompanyAsset>[];
    updateCount: number;
    createCount: number;
  } | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // Asset Form Modal State
  const [assetModal, setAssetModal] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    company: Company;
    assetToEdit?: CompanyAsset;
  } | null>(null);

  // Form fields for Asset
  const initialAssetForm = {
    location: "",
    asset_id: "",
    asset: "Desktop",
    employee_name: "",
    comp_name: "",
    model_no: "",
    serial_no: "",
    config_processor: "",
    config_ram: "",
    config_storage: "",
    monitor: "",
    monitor_serial_no: "",
    os: "",
    os_key: "",
    os_type: "",
    office: "",
    office_key: "",
    office_type: "",
    lan_mac: "",
    wan_mac: "",
    ip_address: "",
    antivirus: "",
    antivirus_key: "",
    validity: "",
    status: "In Use",
    amc_status: "In AMC" as "In AMC" | "Not in AMC"
  };
  const [assetForm, setAssetForm] = useState(initialAssetForm);
  const [isSubmittingAsset, setIsSubmittingAsset] = useState(false);
  const [assetFormError, setAssetFormError] = useState<string | null>(null);

  // Excel Sheet View State
  const [viewingCompanyForExcel, setViewingCompanyForExcel] = useState<Company | null>(null);
  const [excelSearchQuery, setExcelSearchQuery] = useState("");
  const [activeExcelTab, setActiveExcelTab] = useState<"systems" | "printers">("systems");

  // Re-allocation Modal / State for Admin & Manager
  const [reallocatingCompany, setReallocatingCompany] = useState<Company | null>(null);
  const [newEngineerId, setNewEngineerId] = useState<number | "">("");
  const [isReallocating, setIsReallocating] = useState(false);

  // Refresh helper
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Submit handler - Create Company
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setIsSubmittingCompany(true);
    try {
      const creatorName = currentUser?.name || currentUser?.email_id || (isAdmin ? "Admin Manager" : "Service Engineer");
      
      // If engineer adds company, default allocation to them
      const allocatedId = isAdminOrManager 
        ? (companyAllocatedEngineerId || null) 
        : (currentEmployeeId || null);

      const resp = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName.trim(),
          type: companyType,
          created_by: creatorName,
          allocated_engineer_id: allocatedId
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to create company");
      }

      const newComp: Company = await resp.json();
      setLocalExtraCompanies(prev => [newComp, ...prev]);
      await onRefresh();
      setCompanyName("");
      setCompanyType("AMC");
      setCompanyAllocatedEngineerId(!isAdminOrManager && currentEmployeeId ? currentEmployeeId : "");
      setShowCompanyModal(false);
      showToast(`Company "${newComp.name}" successfully registered!`);
    } catch (err: any) {
      showToast("Error: " + err.message, true);
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  // Open Add Asset Modal
  const openAddAssetModal = (company: Company) => {
    if (!canManageCompanyAssets(company)) {
      showToast(`Read-only access: You can only view other engineers' assets and cannot add records to this company.`, true);
      return;
    }
    const isPrinterTab = activeExcelTab === "printers";
    setAssetForm({
      ...initialAssetForm,
      asset: isPrinterTab ? "Printer" : "Desktop",
      amc_status: "In AMC"
    });
    setAssetFormError(null);
    setAssetModal({
      isOpen: true,
      mode: "add",
      company
    });
  };

  // Open Edit Asset Modal
  const openEditAssetModal = (company: Company, asset: CompanyAsset) => {
    if (!canManageCompanyAssets(company)) {
      showToast(`Read-only access: You can only view other engineers' assets and cannot edit them.`, true);
      return;
    }
    setAssetForm({
      location: asset.location || "",
      asset_id: asset.asset_id || "",
      asset: asset.asset || "Desktop",
      employee_name: asset.employee_name || "",
      comp_name: asset.comp_name || "",
      model_no: asset.model_no || (asset as any).model || "",
      serial_no: asset.serial_no || (asset as any).serial || "",
      config_processor: asset.config_processor || (asset as any).processor || "",
      config_ram: asset.config_ram || (asset as any).ram || "",
      config_storage: asset.config_storage || (asset as any).storage || "",
      monitor: asset.monitor || (asset as any).monitor_model || "",
      monitor_serial_no: asset.monitor_serial_no || (asset as any).monitor_serial || "",
      os: asset.os || (asset as any).configured_os || "",
      os_key: asset.os_key || "",
      os_type: asset.os_type || "",
      office: asset.office || (asset as any).ms_office || "",
      office_key: asset.office_key || "",
      office_type: asset.office_type || "",
      lan_mac: asset.lan_mac || (asset as any).mac_ip || "",
      wan_mac: asset.wan_mac || (asset as any).wifi_mac_ip || "",
      ip_address: asset.ip_address || (asset as any).lan_ip || "",
      antivirus: asset.antivirus || "",
      antivirus_key: asset.antivirus_key || "",
      validity: asset.validity || "",
      status: asset.status || "In Use",
      amc_status: (asset.amc_status === "Not in AMC" ? "Not in AMC" : "In AMC") as "In AMC" | "Not in AMC"
    });
    setAssetFormError(null);
    setAssetModal({
      isOpen: true,
      mode: "edit",
      company,
      assetToEdit: asset
    });
  };

  // Submit handler - Add or Edit Asset
  const handleSubmitAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetModal) return;
    if (!canManageCompanyAssets(assetModal.company)) {
      showToast("Read-only access: You can only view other engineers' assets and cannot edit or add records.", true);
      return;
    }

    // Validate essential field: ASSET ID
    if (!assetForm.asset_id.trim()) {
      setAssetFormError("Asset ID is required (e.g. AST-101)");
      return;
    }

    setAssetFormError(null);
    setIsSubmittingAsset(true);

    try {
      if (assetModal.mode === "add") {
        const resp = await fetch(`/api/companies/${assetModal.company.id}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...assetForm,
            company_id: assetModal.company.id,
            current_employee_id: currentEmployeeId,
            is_admin: isAdminOrManager
          })
        });

        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || "Failed to create asset");
        }
        const createdAsset = await resp.json();
        setLocalCreatedAssets(prev => [createdAsset, ...prev]);
        showToast("Asset added successfully!");
      } else if (assetModal.mode === "edit" && assetModal.assetToEdit) {
        const resp = await fetch(`/api/assets/${assetModal.assetToEdit.id}/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...assetForm,
            company_id: assetModal.company.id,
            current_employee_id: currentEmployeeId,
            is_admin: isAdminOrManager
          })
        });

        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || "Failed to update asset");
        }
        const updatedAsset = await resp.json();
        setLocalAssetOverrides(prev => {
          const next = new Map(prev);
          next.set(updatedAsset.id, updatedAsset);
          return next;
        });
        showToast("Asset updated successfully!");
      }

      setAssetModal(null);
      await onRefresh();
    } catch (err: any) {
      showToast("Error: " + err.message, true);
    } finally {
      setIsSubmittingAsset(false);
    }
  };

  // Submit handler - Reallocate Engineer
  const handleReallocateEngineer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reallocatingCompany) return;

    setIsReallocating(true);
    try {
      const resp = await fetch(`/api/companies/${reallocatingCompany.id}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allocated_engineer_id: newEngineerId || null
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to reallocate engineer");
      }

      await onRefresh();
      setReallocatingCompany(null);
      showToast("Engineer allocation updated successfully!");
    } catch (err: any) {
      showToast("Error: " + err.message, true);
    } finally {
      setIsReallocating(false);
    }
  };

  // Delete a specific asset (available to everyone who can view the asset sheet)
  const [assetToDelete, setAssetToDelete] = useState<CompanyAsset | null>(null);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDeleteAsset = (asset: CompanyAsset) => {
    const targetComp = viewingCompanyForExcel || companies.find(c => c.id === asset.company_id);
    if (!canManageCompanyAssets(targetComp)) {
      showToast("Read-only access: You can only view other engineers' assets and cannot remove them.", true);
      return;
    }
    setAssetToDelete(asset);
  };

  const confirmDeleteSingleAsset = async () => {
    if (!assetToDelete) return;
    const targetComp = viewingCompanyForExcel || companies.find(c => c.id === assetToDelete.company_id);
    if (!canManageCompanyAssets(targetComp)) {
      showToast("Read-only access: You cannot remove another engineer's asset.", true);
      setAssetToDelete(null);
      return;
    }
    setIsDeletingAsset(true);
    try {
      let resp = await fetch(`/api/assets/${assetToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_employee_id: currentEmployeeId,
          is_admin: isAdminOrManager
        })
      });
      if (!resp.ok) {
        resp = await fetch(`/api/assets/${assetToDelete.id}/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current_employee_id: currentEmployeeId,
            is_admin: isAdminOrManager
          })
        });
      }
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete asset");
      }

      setLocalDeletedAssetIds(prev => new Set(prev).add(assetToDelete.id));
      if (assetModal?.assetToEdit?.id === assetToDelete.id) {
        setAssetModal(null);
      }
      const deletedId = assetToDelete.asset_id;
      setAssetToDelete(null);
      await onRefresh();
      showToast(`Asset "${deletedId}" was successfully deleted.`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete asset", true);
    } finally {
      setIsDeletingAsset(false);
    }
  };

  // Delete FULL COMPANY from records (Admin & Manager only)
  const [companyToDeleteRecord, setCompanyToDeleteRecord] = useState<Company | null>(null);
  const [deleteCompanyConfirmText, setDeleteCompanyConfirmText] = useState("");
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);

  const handleDeleteCompany = (company: Company) => {
    if (!isAdminOrManager) {
      showToast("Only Administrators can delete company records.", true);
      return;
    }
    setCompanyToDeleteRecord(company);
    setDeleteCompanyConfirmText("");
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDeleteRecord) return;
    if (deleteCompanyConfirmText.trim().toUpperCase() !== "DELETE") {
      showToast("Please type 'DELETE' to confirm.", true);
      return;
    }
    setIsDeletingCompany(true);
    try {
      let resp = await fetch(`/api/companies/${companyToDeleteRecord.id}`, {
        method: "DELETE"
      });
      if (!resp.ok) {
        resp = await fetch(`/api/companies/${companyToDeleteRecord.id}/delete`, {
          method: "POST"
        });
      }
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete company");
      }

      const coName = companyToDeleteRecord.name;
      // Close Excel view if viewing this company
      if (viewingCompanyForExcel?.id === companyToDeleteRecord.id) {
        setViewingCompanyForExcel(null);
      }
      setCompanyToDeleteRecord(null);
      setDeleteCompanyConfirmText("");
      await onRefresh();
      showToast(`Company "${coName}" and all associated assets were permanently deleted.`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete company", true);
    } finally {
      setIsDeletingCompany(false);
    }
  };

  // Assets belonging to viewing company (In AMC first, In Use assets arranged ascending as per asset id)
  const companyAssets = useMemo(() => {
    if (!viewingCompanyForExcel) return [];
    const matched = effectiveAssets.filter(a => Number(a.company_id) === Number(viewingCompanyForExcel.id));
    return [...matched].sort((a, b) => {
      // 1. In AMC first, Not in AMC at the end of the sheet
      const aIsNonAmc = a.amc_status === "Not in AMC" ? 1 : 0;
      const bIsNonAmc = b.amc_status === "Not in AMC" ? 1 : 0;
      if (aIsNonAmc !== bIsNonAmc) {
        return aIsNonAmc - bIsNonAmc;
      }

      // 2. In Use assets arranged first
      const aIsInUse = (a.status || "In Use") === "In Use" ? 0 : 1;
      const bIsInUse = (b.status || "In Use") === "In Use" ? 0 : 1;
      if (aIsInUse !== bIsInUse) {
        return aIsInUse - bIsInUse;
      }

      // 3. Ascending order as per asset id (natural alphanumeric collation e.g. AST-1, AST-2, AST-10)
      if (a.asset_id && b.asset_id) {
        const cmp = a.asset_id.localeCompare(b.asset_id, undefined, { numeric: true, sensitivity: "base" });
        if (cmp !== 0) return cmp;
      }
      return a.id - b.id;
    });
  }, [effectiveAssets, viewingCompanyForExcel]);

  // Separate sheets for IT Systems vs Printers
  const systemAssets = useMemo(() => {
    return companyAssets.filter(a => a.asset !== "Printer");
  }, [companyAssets]);

  const printerAssets = useMemo(() => {
    return companyAssets.filter(a => a.asset === "Printer");
  }, [companyAssets]);

  const assetTypeCounts = useMemo(() => {
    if (!viewingCompanyForExcel) return {};
    const matched = effectiveAssets.filter(a => a.company_id === viewingCompanyForExcel.id);
    const counts: Record<string, number> = {};
    matched.forEach(a => {
      const typeName = a.asset || "Other";
      counts[typeName] = (counts[typeName] || 0) + 1;
    });
    return counts;
  }, [effectiveAssets, viewingCompanyForExcel]);

  const currentSheetAssets = useMemo(() => {
    return activeExcelTab === "printers" ? printerAssets : systemAssets;
  }, [activeExcelTab, printerAssets, systemAssets]);

  // For printer sheet: identify which optional columns have data entered
  const printerDynamicColumns = useMemo(() => {
    const hasData = (field: keyof CompanyAsset) => {
      return printerAssets.some(p => {
        const val = p[field];
        return val !== undefined && val !== null && String(val).trim() !== "" && String(val).trim() !== "-" && String(val).trim() !== "N/A";
      });
    };

    return {
      hasSerial: hasData("serial_no"),
      hasIp: hasData("ip_address"),
      hasEmployee: hasData("employee_name"),
      hasCompName: hasData("comp_name"),
      hasLanMac: hasData("lan_mac"),
      hasWanMac: hasData("wan_mac"),
      hasStatus: hasData("status"),
      hasConfig: printerAssets.some(p => (p.config_processor?.trim() && p.config_processor !== "N/A") || (p.config_ram?.trim() && p.config_ram !== "N/A") || (p.config_storage?.trim() && p.config_storage !== "N/A")),
      hasMonitor: hasData("monitor"),
      hasMonitorSerial: hasData("monitor_serial_no"),
      hasOs: printerAssets.some(p => p.os?.trim() && p.os !== "N/A"),
      hasOffice: printerAssets.some(p => p.office?.trim() && p.office !== "N/A"),
      hasAntivirus: hasData("antivirus")
    };
  }, [printerAssets]);

  // Filtered assets for current sheet search
  const filteredCurrentSheetAssets = useMemo(() => {
    if (!excelSearchQuery.trim()) return currentSheetAssets;
    const query = excelSearchQuery.toLowerCase();
    return currentSheetAssets.filter(a => {
      return (
        a.asset_id.toLowerCase().includes(query) ||
        a.location.toLowerCase().includes(query) ||
        (a.employee_name && a.employee_name.toLowerCase().includes(query)) ||
        (a.comp_name && a.comp_name.toLowerCase().includes(query)) ||
        a.model_no.toLowerCase().includes(query) ||
        (a.ip_address && a.ip_address.toLowerCase().includes(query)) ||
        (a.serial_no && a.serial_no.toLowerCase().includes(query)) ||
        (a.monitor && a.monitor.toLowerCase().includes(query)) ||
        (a.monitor_serial_no && a.monitor_serial_no.toLowerCase().includes(query)) ||
        (a.amc_status && a.amc_status.toLowerCase().includes(query)) ||
        (a.os && a.os.toLowerCase().includes(query)) ||
        (a.office && a.office.toLowerCase().includes(query))
      );
    });
  }, [currentSheetAssets, excelSearchQuery]);

  // Excel (.xlsx) Exporter with rich formatting and multiple sheets
  const handleExportExcel = () => {
    if (!viewingCompanyForExcel || !canAccessCompanyAssets(viewingCompanyForExcel)) return;
    try {
      const wb = XLSX.utils.book_new();

      // Systems data rows
      const sysRows = systemAssets.map((a, idx) => ({
        "#": idx + 1,
        "LOCATION": a.location || "",
        "ASSET ID": a.asset_id || "",
        "ASSET TYPE": a.asset || "Desktop",
        "AMC STATUS": a.amc_status || "In AMC",
        "EMPLOYEE NAME": a.employee_name || "",
        "COMP NAME": a.comp_name || "",
        "MAKE/MODEL": a.model_no || "",
        "SERIAL NO.": a.serial_no || "",
        "CONFIG PROCESSOR": a.config_processor || "",
        "CONFIG RAM": a.config_ram || "",
        "CONFIG STORAGE": a.config_storage || "",
        "MONITOR": a.monitor || "",
        "MONITOR SERIAL NO.": a.monitor_serial_no || "",
        "OS": a.os || "",
        "OS KEY": a.os_key || "",
        "OS TYPE": a.os_type || "",
        "OFFICE": a.office || "",
        "OFFICE KEY": a.office_key || "",
        "OFFICE TYPE": a.office_type || "",
        "LAN MAC": a.lan_mac || "",
        "WAN MAC": a.wan_mac || "",
        "IP ADDRESS": a.ip_address || "",
        "ANTIVIRUS": a.antivirus || "",
        "ANTIVIRUS KEY": a.antivirus_key || "",
        "VALIDITY": a.validity || "",
        "STATUS": a.status || "In Use"
      }));

      // Printers data rows
      const prnRows = printerAssets.map((a, idx) => ({
        "#": idx + 1,
        "LOCATION": a.location || "",
        "ASSET ID": a.asset_id || "",
        "ASSET TYPE": a.asset || "Printer",
        "AMC STATUS": a.amc_status || "In AMC",
        "MAKE/MODEL": a.model_no || "",
        "SERIAL NO.": a.serial_no || "",
        "IP ADDRESS": a.ip_address || "",
        "ASSIGNED TO / USER": a.employee_name || "",
        "DEVICE NAME": a.comp_name || "",
        "LAN MAC": a.lan_mac || "",
        "WAN MAC": a.wan_mac || "",
        "STATUS": a.status || "In Use",
        "CONFIG": [a.config_processor, a.config_ram, a.config_storage].filter(Boolean).join(" / "),
        "MONITOR": a.monitor || "",
        "MONITOR SERIAL NO.": a.monitor_serial_no || "",
        "OS / DRIVER": a.os || "",
        "OFFICE": a.office || "",
        "ANTIVIRUS": a.antivirus || ""
      }));

      // Default blank templates if 0 records so the exported sheet is structured
      const fallbackSys = [{
        "#": 1,
        "LOCATION": "",
        "ASSET ID": "",
        "ASSET TYPE": "Desktop",
        "AMC STATUS": "In AMC",
        "EMPLOYEE NAME": "",
        "COMP NAME": "",
        "MAKE/MODEL": "",
        "SERIAL NO.": "",
        "CONFIG PROCESSOR": "",
        "CONFIG RAM": "",
        "CONFIG STORAGE": "",
        "MONITOR": "",
        "MONITOR SERIAL NO.": "",
        "OS": "",
        "OS KEY": "",
        "OS TYPE": "",
        "OFFICE": "",
        "OFFICE KEY": "",
        "OFFICE TYPE": "",
        "LAN MAC": "",
        "WAN MAC": "",
        "IP ADDRESS": "",
        "ANTIVIRUS": "",
        "ANTIVIRUS KEY": "",
        "VALIDITY": "",
        "STATUS": "In Use"
      }];

      const fallbackPrn = [{
        "#": 1,
        "LOCATION": "",
        "ASSET ID": "",
        "ASSET TYPE": "Printer",
        "AMC STATUS": "In AMC",
        "MAKE/MODEL": "",
        "SERIAL NO.": "",
        "IP ADDRESS": "",
        "ASSIGNED TO / USER": "",
        "DEVICE NAME": "",
        "LAN MAC": "",
        "WAN MAC": "",
        "STATUS": "In Use",
        "CONFIG": "",
        "MONITOR": "",
        "MONITOR SERIAL NO.": "",
        "OS / DRIVER": "",
        "OFFICE": "",
        "ANTIVIRUS": ""
      }];

      const wsSys = XLSX.utils.json_to_sheet(sysRows.length > 0 ? sysRows : fallbackSys);
      const wsPrn = XLSX.utils.json_to_sheet(prnRows.length > 0 ? prnRows : fallbackPrn);

      wsSys['!cols'] = [
        { wch: 6 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
        { wch: 20 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 18 },
        { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 16 },
        { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
        { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
        { wch: 14 }, { wch: 12 }
      ];

      wsPrn['!cols'] = [
        { wch: 6 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
        { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 16 },
        { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 14 },
        { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
      ];

      XLSX.utils.book_append_sheet(wb, wsSys, "IT Systems");
      XLSX.utils.book_append_sheet(wb, wsPrn, "Printers");

      const cleanName = viewingCompanyForExcel.name.replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `${cleanName}_Assets_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast("Excel spreadsheet downloaded successfully!");
    } catch (err: any) {
      console.error("Excel generation error:", err);
      showToast("Failed to download Excel file: " + (err.message || err), true);
    }
  };

  // 📥 Excel Bulk File Upload & Automatic Asset Sync Handler
  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetCompany: Company) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canManageCompanyAssets(targetCompany)) {
      showToast("Read-only access: You can only view other engineers' assets and cannot update them.", true);
      e.target.value = "";
      return;
    }

    try {
      showToast("Parsing Excel file...");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      const parsedList: Partial<CompanyAsset>[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        for (const row of rows) {
          const normalized: Record<string, any> = {};
          for (const key of Object.keys(row)) {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
            normalized[cleanKey] = String(row[key] ?? "").trim();
          }

          // Identify asset identifier
          const asset_id = normalized["assetid"] || normalized["id"] || normalized["tag"] || normalized["assettag"] || normalized["astid"] || normalized["tagno"] || normalized["assetno"] || "";
          const model_no = normalized["makemodel"] || normalized["printermakemodel"] || normalized["model"] || normalized["modelno"] || normalized["make"] || normalized["brand"] || "";
          const serial_no = normalized["serialnumber"] || normalized["serialno"] || normalized["serial"] || normalized["sn"] || "";
          const comp_name = normalized["devicecompname"] || normalized["devicename"] || normalized["networkname"] || normalized["compname"] || normalized["computername"] || normalized["hostname"] || "";

          // Skip completely empty rows
          if (!asset_id && !model_no && !serial_no && !comp_name) continue;

          // Determine asset type
          const explicitType = normalized["assettype"] || normalized["asset"] || normalized["devicetype"] || normalized["type"] || normalized["category"] || "";
          let assetType = "Desktop";
          if (explicitType) {
            assetType = explicitType;
          } else if (sheetName.toLowerCase().includes("printer") || model_no.toLowerCase().includes("printer") || model_no.toLowerCase().includes("hp laser") || model_no.toLowerCase().includes("epson") || model_no.toLowerCase().includes("canon")) {
            assetType = "Printer";
          } else if (model_no.toLowerCase().includes("laptop") || comp_name.toLowerCase().includes("laptop")) {
            assetType = "Laptop";
          } else if (model_no.toLowerCase().includes("server") || comp_name.toLowerCase().includes("server")) {
            assetType = "Server";
          } else if (model_no.toLowerCase().includes("mac") || model_no.toLowerCase().includes("imac")) {
            assetType = "All-in-One";
          }

          // Handle Configuration
          let proc = normalized["configprocessor"] || normalized["processor"] || normalized["cpu"] || "";
          let ram = normalized["configram"] || normalized["ram"] || normalized["memory"] || "";
          let storage = normalized["configstorage"] || normalized["storage"] || normalized["hdd"] || normalized["ssd"] || "";
          const combinedConfig = normalized["configcpuramstorage"] || normalized["config"] || normalized["configdriver"] || "";
          if (combinedConfig && (!proc || !ram || !storage)) {
            const parts = combinedConfig.split(/[/,]/).map((s: string) => s.trim());
            if (parts.length >= 3) {
              if (!proc) proc = parts[0];
              if (!ram) ram = parts[1];
              if (!storage) storage = parts.slice(2).join(" ");
            } else if (!proc) {
              proc = combinedConfig;
            }
          }

          // Contract / AMC status
          const amcRaw = normalized["amcstatus"] || normalized["contractstatus"] || normalized["contract"] || "";
          let amc_status: "In AMC" | "Not in AMC" = "In AMC";
          if (amcRaw.toLowerCase().includes("not") || amcRaw.toLowerCase().includes("non")) {
            amc_status = "Not in AMC";
          }

          parsedList.push({
            location: normalized["location"] || normalized["site"] || normalized["branch"] || normalized["floor"] || targetCompany.name || "Main Location",
            asset_id: (asset_id || "").trim(),
            asset: assetType,
            employee_name: normalized["employeeuser"] || normalized["employeename"] || normalized["assignedtouser"] || normalized["assigneduser"] || normalized["user"] || normalized["employee"] || "",
            comp_name: comp_name,
            model_no: model_no || "Standard",
            serial_no: (serial_no || "").trim(),
            config_processor: proc,
            config_ram: ram,
            config_storage: storage,
            monitor: normalized["monitormake"] || normalized["monitor"] || "",
            monitor_serial_no: normalized["monitorserial"] || normalized["monitorserialno"] || "",
            os: normalized["operatingsystem"] || normalized["osdriver"] || normalized["os"] || normalized["supportedos"] || "",
            os_key: normalized["oslicensekey"] || normalized["oskey"] || "",
            os_type: normalized["ostypebit"] || normalized["ostype"] || "",
            office: normalized["msoffice"] || normalized["office"] || "",
            office_key: normalized["officekey"] || "",
            office_type: normalized["officetype"] || "",
            lan_mac: normalized["lanmacaddress"] || normalized["lanmac"] || "",
            wan_mac: normalized["wifimacaddress"] || normalized["wanmac"] || normalized["wifimac"] || "",
            ip_address: normalized["ipaddress"] || normalized["ip"] || "",
            antivirus: normalized["antivirus"] || normalized["av"] || "",
            antivirus_key: normalized["avlicensekey"] || normalized["key"] || normalized["antiviruskey"] || "",
            validity: normalized["avvalidity"] || normalized["validity"] || "",
            status: normalized["status"] || normalized["assetstatus"] || "In Use",
            amc_status: amc_status
          });
        }
      }

      if (parsedList.length === 0) {
        showToast("No valid asset records found in this Excel sheet. Please verify column headers.", true);
        e.target.value = "";
        return;
      }

      // Calculate updates vs new adds
      const currentCompanyAssets = effectiveAssets.filter(a => Number(a.company_id) === Number(targetCompany.id));
      let updates = 0;
      let creates = 0;

      for (const item of parsedList) {
        const itemAssetId = (item.asset_id || "").trim().toLowerCase();
        const itemSerial = (item.serial_no || "").trim().toLowerCase();
        const exists = currentCompanyAssets.some(a => 
          (itemAssetId && a.asset_id && a.asset_id.trim().toLowerCase() === itemAssetId) ||
          (itemSerial && a.serial_no && a.serial_no.trim().toLowerCase() === itemSerial)
        );
        if (exists) {
          updates++;
        } else {
          creates++;
        }
      }

      setUploadModal({
        company: targetCompany,
        fileName: file.name,
        parsedAssets: parsedList,
        updateCount: updates,
        createCount: creates
      });

    } catch (err: any) {
      console.error("Excel parse error:", err);
      showToast("Failed to parse Excel file: " + (err.message || err), true);
    } finally {
      e.target.value = "";
    }
  };

  // Submit bulk update to backend
  const handleConfirmUpload = async () => {
    if (!uploadModal) return;
    setIsProcessingUpload(true);
    try {
      const resp = await fetch(`/api/companies/${uploadModal.company.id}/assets/bulk-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: uploadModal.parsedAssets,
          current_employee_id: currentEmployeeId,
          is_admin: isAdminOrManager
        })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update assets from Excel");
      }

      const result = await resp.json();

      // Immediately sync local state overrides & created assets so the view updates instantly
      if (result.assets && Array.isArray(result.assets)) {
        setLocalAssetOverrides(prev => {
          const next = new Map(prev);
          result.assets.forEach((a: CompanyAsset) => next.set(a.id, a));
          return next;
        });
        setLocalCreatedAssets(prev => {
          const incomingIds = new Set(result.assets.map((a: CompanyAsset) => a.id));
          return [...result.assets, ...prev.filter(a => !incomingIds.has(a.id))];
        });
      }

      await onRefresh();

      showToast(`Success! ${result.updatedCount} asset(s) updated and ${result.createdCount} new asset(s) created for ${uploadModal.company.name}.`);

      // Auto-open this company in the spreadsheet viewer so the engineer immediately sees their updated assets!
      setViewingCompanyForExcel(uploadModal.company);
      setUploadModal(null);
    } catch (err: any) {
      showToast(err.message || "Failed to update assets from Excel", true);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* 🌟 Header & Controls Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Building className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-display font-extrabold text-slate-900">
                Companies & Assets Hub
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh records from database"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => {
                setCompanyName("");
                setCompanyType("AMC");
                setCompanyAllocatedEngineerId(!isAdminOrManager && currentEmployeeId ? currentEmployeeId : "");
                setShowCompanyModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Company</span>
            </button>
          </div>
        </div>

        {/* Scope Toggle & Search Input Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5">
          {!isAdminOrManager ? (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200">
              <button
                type="button"
                onClick={() => setScopeFilter("my")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  scopeFilter === "my"
                    ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Allocated Companies ({allCompanies.filter(c => Number(c.allocated_engineer_id) === Number(currentEmployeeId)).length})
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  scopeFilter === "all"
                    ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Companies Directory ({allCompanies.length})
              </button>
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-500">
              Full Administrator & Manager Access • All Company Assets Visible
            </div>
          )}

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies, contract type, or allocated engineer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* 🏢 Companies Table View */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Registered Companies ({filteredCompanies.length})
            </h4>
          </div>
        </div>

        {filteredCompanies.length === 0 ? (
          <div className="p-12 text-center">
            <Building className="h-12 w-12 text-slate-300 mx-auto mb-3 animate-pulse" />
            <h4 className="text-sm font-bold text-slate-800">No Companies Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery 
                ? "No companies matched your search criteria." 
                : isAdminOrManager 
                  ? "No companies registered yet. Click 'Add Company' to register the first client." 
                  : "You have no companies allocated to you currently. You can register a new company using the button above."
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Company Name</th>
                  <th className="px-4 py-3">Contract Type</th>
                  <th className="px-4 py-3">Allocated Engineer</th>
                  <th className="px-4 py-3 text-center">Total Assets</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                {filteredCompanies.map((company, index) => {
                  const companyAssetCount = effectiveAssets.filter(a => Number(a.company_id) === Number(company.id)).length;
                  const isAllocatedToMe = Number(company.allocated_engineer_id) === Number(currentEmployeeId);
                  const canAccessAssets = canAccessCompanyAssets(company);

                  return (
                    <tr key={company.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-400 font-bold">
                        #{index + 1}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-slate-400" />
                          <span>{company.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${
                          company.type === "AMC"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {company.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {company.type === "Non AMC" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Users className="h-3 w-3 text-amber-600" />
                              <span>All Engineers</span>
                              {company.allocated_engineer_name && (
                                <span className="text-[10px] text-amber-700 font-normal">({company.allocated_engineer_name})</span>
                              )}
                            </span>
                          ) : company.allocated_engineer_name ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              isAllocatedToMe
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}>
                              <User className="h-3 w-3" />
                              <span>{company.allocated_engineer_name}</span>
                              {isAllocatedToMe && <span className="text-[9px] bg-blue-200/80 text-blue-800 px-1 rounded font-bold">You</span>}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                          )}

                          {isAdminOrManager && (
                            <button
                              type="button"
                              onClick={() => {
                                setReallocatingCompany(company);
                                setNewEngineerId(company.allocated_engineer_id || "");
                              }}
                              className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold underline cursor-pointer ml-1"
                              title="Reallocate to different engineer"
                            >
                              Change
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          <Laptop className="h-3 w-3 text-slate-500" />
                          <span>{companyAssetCount}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Add Asset Option: Only if user can manage this company */}
                          {canManageCompanyAssets(company) && (
                            <>
                              <button
                                type="button"
                                onClick={() => openAddAssetModal(company)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-indigo-200/60 shadow-2xs active:scale-95"
                              >
                                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                                <span>Add Asset</span>
                              </button>

                              <label
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer border border-emerald-200/80 shadow-2xs active:scale-95"
                                title="Upload Excel file to automatically update or add company assets"
                              >
                                <Upload className="h-3.5 w-3.5 text-emerald-700" />
                                <span className="hidden sm:inline">Upload Excel</span>
                                <input
                                  type="file"
                                  accept=".xlsx, .xls"
                                  onChange={(e) => handleExcelFileUpload(e, company)}
                                  className="hidden"
                                />
                              </label>
                            </>
                          )}

                          {/* View Asset Table Option: AVAILABLE FOR ALL COMPANIES */}
                          <button
                            type="button"
                            onClick={() => {
                              setViewingCompanyForExcel(company);
                              setExcelSearchQuery("");
                              setActiveExcelTab("systems");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            <span>View Asset Table</span>
                          </button>

                          {/* Admin Only: Delete Full Company From Records */}
                          {isAdminOrManager && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCompany(company)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                              title="Admin Only: Permanently delete this company and all its assets from records"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">Delete Company</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🏢 MODAL: Register New Company */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-indigo-600" />
                <h4 className="font-extrabold text-sm uppercase text-slate-900 tracking-wide">
                  Register New Client Company
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCompanyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4 pt-1">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">
                  Company Registered Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 transition-all text-slate-800"
                  placeholder="e.g. Tata Motors Pune, Infosys Phase 2"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">
                  Contract Status *
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setCompanyType("AMC")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      companyType === "AMC"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    AMC (Annual Maintenance)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyType("Non AMC")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      companyType === "Non AMC"
                        ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    Non AMC (Ad-hoc)
                  </button>
                </div>
              </div>

              {/* Allocated Engineer selection */}
              {isAdminOrManager ? (
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">
                    Allocated Service Engineer
                  </label>
                  <select
                    value={companyAllocatedEngineerId}
                    onChange={(e) => setCompanyAllocatedEngineerId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 transition-all text-slate-800 cursor-pointer"
                  >
                    <option value="">-- Unassigned / Assign Later --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role}) - ID #{emp.id}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Only the allocated engineer, along with Admin and Manager, can view and edit this company's assets.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-900 text-xs">
                  <p className="font-bold flex items-center gap-1">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    <span>{companyType === "Non AMC" ? "Open Visibility" : "Automatic Allocation"}</span>
                  </p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    {companyType === "Non AMC"
                      ? "Non AMC companies and their assets are open and visible to all service engineers."
                      : `This AMC company will be allocated to your engineer profile (${currentUser.name}).`}
                  </p>
                </div>
              )}

              <div className="flex gap-2.5 justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCompany || !companyName.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-colors uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCompany ? "Registering..." : "Save Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 💻 MODAL: Add / Edit Company Asset */}
      {assetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-[70] animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Laptop className="h-5 w-5 text-indigo-600" />
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {assetModal.mode === "add" ? "Add Company Asset" : "Edit Asset Details"}
                  </h4>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    {assetModal.company.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Fields with <span className="text-rose-500 font-bold">*</span> are mandatory as per IT compliance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssetModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSubmitAsset} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
              {assetFormError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{assetFormError}</span>
                </div>
              )}

              {/* Printer mode notification */}
              {assetForm.asset === "Printer" && (
                <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3.5 rounded-2xl text-xs flex items-center gap-2.5 shadow-2xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>
                    <strong>Printer device selected:</strong> Only <strong>Location</strong>, <strong>Asset ID</strong>, and <strong>Make/Model</strong> are mandatory. Processor, RAM, Storage, OS, and Office fields are optional.
                  </span>
                </div>
              )}

              {/* Group 1: General Asset & User Identifiers */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 border-b border-indigo-100 pb-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  <span>1. Asset Identity & User Assignment</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Location <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pune Hinjewadi, Floor 3"
                      value={assetForm.location}
                      onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Asset ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AST-10492"
                      value={assetForm.asset_id}
                      onChange={(e) => setAssetForm({ ...assetForm, asset_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono font-bold text-indigo-700 focus:outline-none focus:bg-white focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Asset Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={assetForm.asset}
                      onChange={(e) => setAssetForm({ ...assetForm, asset: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                      required
                    >
                      <option value="Server">Server</option>
                      <option value="Laptop">Laptop</option>
                      <option value="Desktop">Desktop</option>
                      <option value="All-in-One">All-in-One</option>
                      <option value="Printer">Printer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Make / Model <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HP LaserJet Pro M404dn / Dell 3420"
                      value={assetForm.model_no}
                      onChange={(e) => setAssetForm({ ...assetForm, model_no: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      AMC Status <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={assetForm.amc_status}
                      onChange={(e) => setAssetForm({ ...assetForm, amc_status: e.target.value as any })}
                      className={`w-full border px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer ${
                        assetForm.amc_status === "In AMC"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-amber-50 text-amber-900 border-amber-300"
                      }`}
                      required
                    >
                      <option value="In AMC">In AMC</option>
                      <option value="Not in AMC">Not in AMC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Employee Name (User)
                    </label>
                    <input
                      type="text"
                      placeholder={assetForm.asset === "Printer" ? "Optional / Shared Printer" : "e.g. Anand Kulkarni"}
                      value={assetForm.employee_name}
                      onChange={(e) => setAssetForm({ ...assetForm, employee_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Comp / Device Name
                    </label>
                    <input
                      type="text"
                      placeholder={assetForm.asset === "Printer" ? "e.g. PRINTER-HR-01" : "e.g. DESKTOP-PATS-04"}
                      value={assetForm.comp_name}
                      onChange={(e) => setAssetForm({ ...assetForm, comp_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Serial No. (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CN-0G7D2P-1234"
                      value={assetForm.serial_no}
                      onChange={(e) => setAssetForm({ ...assetForm, serial_no: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Status
                    </label>
                    <select
                      value={assetForm.status}
                      onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="In Use">In Use</option>
                      <option value="Spare">Spare</option>
                      <option value="In Repair">In Repair</option>
                      <option value="Decommissioned">Decommissioned</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Group 2: Hardware Configuration */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 flex items-center justify-between border-b border-indigo-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5" />
                    <span>2. Hardware Configuration (Processor, RAM, Storage) {assetForm.asset !== "Printer" && <span className="text-rose-500">*</span>}</span>
                  </div>
                  {assetForm.asset === "Printer" && (
                    <span className="text-[10px] text-slate-400 font-normal lowercase">(optional for printer)</span>
                  )}
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Processor
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Intel Core i5 11th Gen / Ryzen 5"
                      value={assetForm.config_processor}
                      onChange={(e) => setAssetForm({ ...assetForm, config_processor: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      RAM Capacity
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 16 GB DDR4"
                      value={assetForm.config_ram}
                      onChange={(e) => setAssetForm({ ...assetForm, config_ram: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Storage Type & Size
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 512 GB NVMe SSD"
                      value={assetForm.config_storage}
                      onChange={(e) => setAssetForm({ ...assetForm, config_storage: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Monitor & Monitor Serial No. fields after Config */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Monitor (Model / Size)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dell 24-inch FHD / HP P22v"
                      value={assetForm.monitor || ""}
                      onChange={(e) => setAssetForm({ ...assetForm, monitor: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Monitor Serial No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CN-0V2Y9F-74261-XXX"
                      value={assetForm.monitor_serial_no || ""}
                      onChange={(e) => setAssetForm({ ...assetForm, monitor_serial_no: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Operating System & Office Productivity */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 flex items-center justify-between border-b border-indigo-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5" />
                    <span>3. OS & Office Suite Licenses {assetForm.asset !== "Printer" && <span className="text-rose-500">*</span>}</span>
                  </div>
                  {assetForm.asset === "Printer" && (
                    <span className="text-[10px] text-slate-400 font-normal lowercase">(optional for printer)</span>
                  )}
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Operating System
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Windows 11 Pro"
                      value={assetForm.os}
                      onChange={(e) => setAssetForm({ ...assetForm, os: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      OS Key (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. XXXXX-XXXXX-XXXXX"
                      value={assetForm.os_key}
                      onChange={(e) => setAssetForm({ ...assetForm, os_key: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      OS Type (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 64-bit / OEM / Retail"
                      value={assetForm.os_type}
                      onChange={(e) => setAssetForm({ ...assetForm, os_type: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Office Suite
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MS Office 2021 / Office 365"
                      value={assetForm.office}
                      onChange={(e) => setAssetForm({ ...assetForm, office: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Office Key (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. YYYYY-YYYYY-YYYYY"
                      value={assetForm.office_key}
                      onChange={(e) => setAssetForm({ ...assetForm, office_key: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Office Type (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Home & Business / Pro Plus"
                      value={assetForm.office_type}
                      onChange={(e) => setAssetForm({ ...assetForm, office_type: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Group 4: Network & Antivirus */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 border-b border-indigo-100 pb-1.5">
                  <Network className="h-3.5 w-3.5" />
                  <span>4. Network & Security Details</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      IP Address <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder={assetForm.asset === "Printer" ? "e.g. 192.168.1.200 (optional)" : "e.g. 192.168.1.150 (optional)"}
                      value={assetForm.ip_address}
                      onChange={(e) => setAssetForm({ ...assetForm, ip_address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      LAN MAC Address (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 00:1A:2B:3C:4D:5E"
                      value={assetForm.lan_mac}
                      onChange={(e) => setAssetForm({ ...assetForm, lan_mac: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      WAN MAC Address (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 70:85:C2:55:6A:11"
                      value={assetForm.wan_mac}
                      onChange={(e) => setAssetForm({ ...assetForm, wan_mac: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Antivirus Software (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kaspersky / Quick Heal / Defender"
                      value={assetForm.antivirus}
                      onChange={(e) => setAssetForm({ ...assetForm, antivirus: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Antivirus / Software Key (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AV-KEY-9988-77"
                      value={assetForm.antivirus_key}
                      onChange={(e) => setAssetForm({ ...assetForm, antivirus_key: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Validity / Warranty Date (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-12-31"
                      value={assetForm.validity}
                      onChange={(e) => setAssetForm({ ...assetForm, validity: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <div>
                  {assetModal.mode === "edit" && assetModal.assetToEdit && canManageCompanyAssets(assetModal.company) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAsset(assetModal.assetToEdit!)}
                      disabled={isDeletingAsset}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all uppercase tracking-wide cursor-pointer flex items-center gap-1.5 border border-rose-200"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{isDeletingAsset ? "Deleting..." : "Delete Asset"}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAssetModal(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAsset}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    <span>{isSubmittingAsset ? "Saving..." : assetModal.mode === "add" ? "Save Asset" : "Update Asset"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📊 EXCEL SHEET VIEW MODAL */}
      {viewingCompanyForExcel && canAccessCompanyAssets(viewingCompanyForExcel) && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-300 w-full max-w-[98vw] xl:max-w-7xl h-[92vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Excel Header Toolbar */}
            <div className="bg-[#107c41] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                      <span>{viewingCompanyForExcel.name} — Asset Sheet</span>
                    </h3>
                    <span className="bg-white/25 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {viewingCompanyForExcel.type}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-100 mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span>Allocated Engineer: <strong>{viewingCompanyForExcel.allocated_engineer_name || "Unassigned"}</strong></span>
                    <span className="text-emerald-300">|</span>
                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                      <span className="opacity-95">Assets:</span>
                      {Object.keys(assetTypeCounts).length === 0 ? (
                        <span className="bg-white/20 px-2 py-0.5 rounded font-mono font-bold text-white text-[10px]">0 Assets</span>
                      ) : (
                        Object.entries(assetTypeCounts).map(([type, count]) => (
                          <span key={type} className="inline-flex items-center gap-1 bg-white/25 px-2 py-0.5 rounded-md font-mono font-bold text-white text-[10px]">
                            {type}: {count}
                          </span>
                        ))
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search in sheet..."
                    value={excelSearchQuery}
                    onChange={(e) => setExcelSearchQuery(e.target.value)}
                    className="bg-white text-slate-800 pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none w-36 sm:w-48 font-medium shadow-inner"
                  />
                </div>

                {/* Add Asset button: Only if user can manage this company */}
                {canManageCompanyAssets(viewingCompanyForExcel) ? (
                  <button
                    type="button"
                    onClick={() => openAddAssetModal(viewingCompanyForExcel)}
                    className="bg-white text-[#107c41] hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Add Asset</span>
                  </button>
                ) : (
                  <span className="bg-white/20 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-white/30" title={`Allocated to ${viewingCompanyForExcel.allocated_engineer_name || 'another engineer'} (Read-Only)`}>
                    <Eye className="h-3.5 w-3.5" />
                    <span>Read-Only View</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="bg-white text-[#107c41] hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border border-emerald-200"
                  title="Download complete company inventory as formatted Excel workbook (.xlsx)"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#107c41]" />
                  <span>Download Excel</span>
                </button>

                {/* Upload Excel Button: Only if user can manage this company */}
                {canManageCompanyAssets(viewingCompanyForExcel) && (
                  <label
                    className="bg-white text-[#107c41] hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border border-emerald-200 active:scale-95"
                    title="Upload an updated Excel spreadsheet to automatically update current assets"
                  >
                    <Upload className="h-3.5 w-3.5 text-[#107c41]" />
                    <span>Upload Excel</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={(e) => handleExcelFileUpload(e, viewingCompanyForExcel)}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Admin Only: Permanently Delete Company */}
                {isAdminOrManager && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCompany(viewingCompanyForExcel)}
                    disabled={isDeletingCompany}
                    className="bg-rose-900 hover:bg-rose-950 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border border-rose-800 disabled:opacity-50"
                    title="Admin Only: Permanently delete this company and all its assets from records"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Company</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewingCompanyForExcel(null)}
                  className="bg-black/20 hover:bg-black/30 text-white p-1.5 rounded-lg transition-colors cursor-pointer ml-1"
                  title="Close spreadsheet view"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 📑 Excel Sheet Tabs Bar (Workbook Navigation) */}
            <div className="bg-[#0e6334] px-4 pt-1 flex items-center gap-1.5 border-t border-emerald-700/60 select-none overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveExcelTab("systems")}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl flex items-center gap-2 transition-all cursor-pointer ${
                  activeExcelTab === "systems"
                    ? "bg-white text-slate-800 shadow-md border-t-2 border-emerald-600"
                    : "text-emerald-100 hover:bg-emerald-800/80 hover:text-white"
                }`}
              >
                <Monitor className="h-3.5 w-3.5 text-emerald-600" />
                <span>IT Systems & Computers</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  activeExcelTab === "systems" ? "bg-emerald-100 text-emerald-800" : "bg-emerald-950/40 text-emerald-200"
                }`}>
                  {systemAssets.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveExcelTab("printers")}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl flex items-center gap-2 transition-all cursor-pointer ${
                  activeExcelTab === "printers"
                    ? "bg-white text-slate-800 shadow-md border-t-2 border-amber-600"
                    : "text-emerald-100 hover:bg-emerald-800/80 hover:text-white"
                }`}
              >
                <Printer className="h-3.5 w-3.5 text-amber-600" />
                <span>Printers Sheet</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  activeExcelTab === "printers" ? "bg-amber-100 text-amber-900" : "bg-emerald-950/40 text-emerald-200"
                }`}>
                  {printerAssets.length}
                </span>
              </button>
            </div>



            {/* Excel Sheet Scrollable Grid */}
            <div className="flex-1 overflow-auto bg-slate-200/50 p-2">
              <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden inline-block min-w-full">
                <table className="table-auto w-max min-w-full border-collapse text-left text-xs font-sans">
                  {/* Excel Column Headers (Letters) */}
                  <thead className="bg-[#f3f2f1] text-[#323130] text-[10px] font-mono border-b border-slate-300 select-none">
                    {activeExcelTab === "printers" ? (
                      <tr>
                        <th className="border-r border-slate-300 px-2 py-1.5 text-center bg-[#e1dfdd] w-12 sticky left-0 z-20 font-bold whitespace-nowrap">#</th>
                        <th className="border-r border-slate-300 px-2 py-1.5 bg-[#e1dfdd] text-center w-28 sticky left-12 z-20 font-bold whitespace-nowrap">ACTIONS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">LOCATION</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">ASSET ID</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">ASSET TYPE</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold bg-[#e1dfdd] text-center whitespace-nowrap">AMC STATUS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">MAKE/MODEL</th>
                        {printerDynamicColumns.hasSerial && <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">SERIAL NO.</th>}
                        {printerDynamicColumns.hasIp && <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">IP ADDRESS</th>}
                        {printerDynamicColumns.hasEmployee && <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">ASSIGNED TO / USER</th>}
                        {printerDynamicColumns.hasCompName && <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">DEVICE NAME</th>}
                        {printerDynamicColumns.hasLanMac && <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">LAN MAC</th>}
                        {printerDynamicColumns.hasWanMac && <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">WIFI MAC</th>}
                        {printerDynamicColumns.hasStatus && <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">STATUS</th>}
                        {printerDynamicColumns.hasConfig && <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">CONFIG</th>}
                        {printerDynamicColumns.hasMonitor && <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">MONITOR</th>}
                        {printerDynamicColumns.hasMonitorSerial && <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">MONITOR SERIAL NO.</th>}
                        {printerDynamicColumns.hasOs && <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">OS / DRIVER</th>}
                        {printerDynamicColumns.hasOffice && <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">OFFICE</th>}
                        {printerDynamicColumns.hasAntivirus && <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">ANTIVIRUS</th>}
                      </tr>
                    ) : (
                      <tr>
                        <th className="border-r border-slate-300 px-2 py-1.5 text-center bg-[#e1dfdd] w-12 sticky left-0 z-20 font-bold whitespace-nowrap">#</th>
                        <th className="border-r border-slate-300 px-2 py-1.5 bg-[#e1dfdd] text-center w-28 sticky left-12 z-20 font-bold whitespace-nowrap">ACTIONS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">LOCATION</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">ASSET ID</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">ASSET TYPE</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold bg-[#e1dfdd] text-center whitespace-nowrap">AMC STATUS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">EMPLOYEE NAME</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">COMP NAME</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">MAKE/MODEL</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">SERIAL NO.</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">CONFIG (CPU / RAM / STORAGE)</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">MONITOR</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">MONITOR SERIAL NO.</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">OS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">OS KEY</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">OS TYPE</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">OFFICE</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">OFFICE KEY</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">OFFICE TYPE</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">LAN MAC</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">WAN MAC</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">IP ADDRESS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">ANTIVIRUS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">KEY</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold whitespace-nowrap">VALIDITY</th>
                        <th className="px-3 py-1.5 font-bold whitespace-nowrap">STATUS</th>
                      </tr>
                    )}
                  </thead>

                  {/* Excel Sheet Body Data */}
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {filteredCurrentSheetAssets.length === 0 ? (
                      <tr>
                        <td 
                          colSpan={
                            activeExcelTab === "printers"
                              ? 7 + 
                                (printerDynamicColumns.hasSerial ? 1 : 0) +
                                (printerDynamicColumns.hasIp ? 1 : 0) +
                                (printerDynamicColumns.hasEmployee ? 1 : 0) +
                                (printerDynamicColumns.hasCompName ? 1 : 0) +
                                (printerDynamicColumns.hasLanMac ? 1 : 0) +
                                (printerDynamicColumns.hasWanMac ? 1 : 0) +
                                (printerDynamicColumns.hasStatus ? 1 : 0) +
                                (printerDynamicColumns.hasConfig ? 1 : 0) +
                                (printerDynamicColumns.hasMonitor ? 1 : 0) +
                                (printerDynamicColumns.hasMonitorSerial ? 1 : 0) +
                                (printerDynamicColumns.hasOs ? 1 : 0) +
                                (printerDynamicColumns.hasOffice ? 1 : 0) +
                                (printerDynamicColumns.hasAntivirus ? 1 : 0)
                              : 26
                          } 
                          className="p-8 text-center text-slate-400 font-sans italic bg-white"
                        >
                          {activeExcelTab === "printers"
                            ? "No printer records registered for this company yet. Click '+ Add Asset' and select 'Printer' to add one."
                            : "No computer/system records registered for this company yet."}
                        </td>
                      </tr>
                    ) : activeExcelTab === "printers" ? (
                      // 🖨️ PRINTERS SHEET ROWS (Only Location, Asset ID, Asset Type, AMC Status, Make/Model + dynamic populated columns)
                      filteredCurrentSheetAssets.map((asset, index) => (
                        <tr 
                          key={asset.id} 
                          className={`transition-colors group ${
                            asset.amc_status === "Not in AMC" 
                              ? "bg-amber-50/50 hover:bg-amber-100/70" 
                              : "hover:bg-blue-50/60"
                          }`}
                        >
                          {/* Row Number */}
                          <td className="border-r border-slate-300 px-2 py-2 text-center bg-[#f3f2f1] font-bold text-slate-500 sticky left-0 z-10 select-none">
                            {index + 1}
                          </td>

                          {/* Action - Edit / Delete Asset buttons: Only if canManageCompanyAssets */}
                          <td className="border-r border-slate-300 px-2 py-2 text-center bg-white sticky left-10 z-10 whitespace-nowrap">
                            {canManageCompanyAssets(viewingCompanyForExcel) ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditAssetModal(viewingCompanyForExcel, asset)}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-sans font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Edit this printer row"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAsset(asset)}
                                  disabled={isDeletingAsset}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-sans font-bold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Delete this printer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-sans font-semibold inline-flex items-center gap-1" title="Read-only: Asset allocated to another engineer">
                                <Eye className="h-3 w-3 text-slate-400" />
                                <span>View Only</span>
                              </span>
                            )}
                          </td>

                          {/* Core mandatory fields */}
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-800">
                            {asset.location}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap font-bold text-indigo-700 bg-indigo-50/20">
                            {asset.asset_id}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-800 font-sans font-semibold">
                            <span className="inline-flex items-center gap-1">
                              <Printer className="h-3.5 w-3.5 text-amber-600" />
                              <span>{asset.asset}</span>
                            </span>
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase tracking-wide border ${
                              asset.amc_status === "Not in AMC"
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }`}>
                              {asset.amc_status || "In AMC"}
                            </span>
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-800 font-sans font-semibold">
                            {asset.model_no}
                          </td>

                          {/* Conditional Columns only if data is entered */}
                          {printerDynamicColumns.hasSerial && (
                            <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-600">
                              {asset.serial_no || "-"}
                            </td>
                          )}
                          {printerDynamicColumns.hasIp && (
                            <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap font-bold text-blue-700 bg-blue-50/20">
                              {asset.ip_address || "-"}
                            </td>
                          )}
                          {printerDynamicColumns.hasEmployee && (
                            <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-800 font-sans font-medium">
                              {asset.employee_name || "-"}
                            </td>
                          )}
                          {printerDynamicColumns.hasCompName && (
                            <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-700 font-semibold">
                              {asset.comp_name || "-"}
                            </td>
                          )}
                          {printerDynamicColumns.hasLanMac && (
                            <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-600 font-mono text-[10px]">
                              {asset.lan_mac || "-"}
                            </td>
                          )}
                          {printerDynamicColumns.hasWanMac && (
                            <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-600 font-mono text-[10px]">
                              {asset.wan_mac || "-"}
                            </td>
                          )}
                          {printerDynamicColumns.hasStatus && (
                            <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-700">
                              {asset.status || "In Use"}
                            </td>
                          )}
                          {printerDynamicColumns.hasConfig && (
                            <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-600">
                              {[asset.config_processor, asset.config_ram, asset.config_storage].filter(Boolean).join(" / ") || "-"}
                            </td>
                          )}
                          {printerDynamicColumns.hasMonitor && (
                            <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-800 font-sans">
                              {asset.monitor || "-"}
                            </td>
                          )}
                          {printerDynamicColumns.hasMonitorSerial && (
                            <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                              {asset.monitor_serial_no || "-"}
                            </td>
                          )}
                          {printerDynamicColumns.hasOs && (
                            <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-700">
                              {asset.os || "-"}
                            </td>
                          )}
                          {printerDynamicColumns.hasOffice && (
                            <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-700">
                              {asset.office || "-"}
                            </td>
                          )}
                          {printerDynamicColumns.hasAntivirus && (
                            <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-700">
                              {asset.antivirus || "-"}
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      // 💻 SYSTEMS SHEET ROWS (Desktops, Laptops, Servers, All-in-One)
                      filteredCurrentSheetAssets.map((asset, index) => (
                        <tr 
                          key={asset.id} 
                          className={`transition-colors group ${
                            asset.amc_status === "Not in AMC" 
                              ? "bg-amber-50/50 hover:bg-amber-100/70" 
                              : "hover:bg-blue-50/60"
                          }`}
                        >
                          {/* Row Number */}
                          <td className="border-r border-slate-300 px-2 py-2 text-center bg-[#f3f2f1] font-bold text-slate-500 sticky left-0 z-10 select-none">
                            {index + 1}
                          </td>

                          {/* Action - Edit / Delete Asset buttons: Only if canManageCompanyAssets */}
                          <td className="border-r border-slate-300 px-2 py-2 text-center bg-white sticky left-10 z-10 whitespace-nowrap">
                            {canManageCompanyAssets(viewingCompanyForExcel) ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditAssetModal(viewingCompanyForExcel, asset)}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-sans font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Edit this asset row"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAsset(asset)}
                                  disabled={isDeletingAsset}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-sans font-bold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Delete this asset"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-sans font-semibold inline-flex items-center gap-1" title="Read-only: Asset allocated to another engineer">
                                <Eye className="h-3 w-3 text-slate-400" />
                                <span>View Only</span>
                              </span>
                            )}
                          </td>

                          {/* Data cells */}
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-800">
                            {asset.location}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap font-bold text-indigo-700 bg-indigo-50/20">
                            {asset.asset_id}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-800 font-sans font-semibold">
                            {asset.asset}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase tracking-wide border ${
                              asset.amc_status === "Not in AMC"
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }`}>
                              {asset.amc_status || "In AMC"}
                            </span>
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-800 font-sans font-medium">
                            {asset.employee_name}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-700 font-semibold">
                            {asset.comp_name}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-800">
                            {asset.model_no}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-600">
                            {asset.serial_no || "-"}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-800 bg-amber-50/20">
                            <span className="font-sans font-semibold">{asset.config_processor}</span>, {asset.config_ram}, {asset.config_storage}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-800 font-sans">
                            {asset.monitor || "-"}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                            {asset.monitor_serial_no || "-"}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-800 font-sans">
                            {asset.os}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                            {asset.os_key || "-"}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-600 text-[10.5px]">
                            {asset.os_type || "-"}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-800 font-sans">
                            {asset.office}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                            {asset.office_key || "-"}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-600 text-[10.5px]">
                            {asset.office_type || "-"}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-600 font-mono text-[10px]">
                            {asset.lan_mac || "-"}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-600 font-mono text-[10px]">
                            {asset.wan_mac || "-"}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap font-bold text-blue-700 bg-blue-50/20">
                            {asset.ip_address}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-700 font-sans">
                            {asset.antivirus || "-"}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                            {asset.antivirus_key || "-"}
                          </td>
                          <td className="border-r border-slate-200 px-3 py-2 whitespace-nowrap text-slate-600">
                            {asset.validity || "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                              asset.status === "In Use" 
                                ? "bg-emerald-100 text-emerald-800" 
                                : asset.status === "In Repair"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-slate-100 text-slate-700"
                            }`}>
                              {asset.status || "In Use"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔄 MODAL: Reallocate Engineer (Admin & Manager) */}
      {reallocatingCompany && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                <h4 className="font-extrabold text-sm uppercase text-slate-900">
                  Reallocate Engineer
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setReallocatingCompany(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-700">{reallocatingCompany.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Current Engineer: <strong>{reallocatingCompany.allocated_engineer_name || "Unassigned"}</strong>
              </p>
            </div>

            <form onSubmit={handleReallocateEngineer} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">
                  Select New Allocated Engineer *
                </label>
                <select
                  value={newEngineerId}
                  onChange={(e) => setNewEngineerId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 transition-all text-slate-800 cursor-pointer"
                  required
                >
                  <option value="">-- Choose an Engineer --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role}) - ID #{emp.id}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                  Notice: Once reallocated, the previous engineer will no longer be able to see this company or its asset records. The newly selected engineer will immediately gain access to view and edit all asset data.
                </p>
              </div>

              <div className="flex gap-2.5 justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setReallocatingCompany(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReallocating}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {isReallocating ? "Updating..." : "Save Allocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔔 Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border transition-all ${
          toastMessage.isError 
            ? "bg-rose-900 text-white border-rose-700 shadow-rose-900/30" 
            : "bg-emerald-900 text-white border-emerald-700 shadow-emerald-900/30"
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{toastMessage.text}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:opacity-75 cursor-pointer text-white/80"
          >
            ✕
          </button>
        </div>
      )}

      {/* ⚠️ MODAL: Delete Single Asset Confirmation */}
      {assetToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[90] animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Delete Asset Confirmation
                </h4>
                <p className="text-xs text-slate-500">
                  This record will be permanently deleted.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Asset ID:</span>
                <span className="font-bold text-indigo-700">{assetToDelete.asset_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Asset Type:</span>
                <span className="font-semibold text-slate-800">{assetToDelete.asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Make / Model:</span>
                <span className="font-semibold text-slate-800">{assetToDelete.model_no || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location:</span>
                <span className="text-slate-700">{assetToDelete.location || "-"}</span>
              </div>
              {assetToDelete.employee_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">User / Employee:</span>
                  <span className="text-slate-700">{assetToDelete.employee_name}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete this asset? This cannot be undone.
            </p>

            <div className="flex gap-2.5 justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                disabled={isDeletingAsset}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSingleAsset}
                disabled={isDeletingAsset}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeletingAsset ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL: Delete Full Company Record Confirmation (Admin Only) */}
      {companyToDeleteRecord && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-[95] animate-fade-in text-slate-800">
          <div className="bg-white border-2 border-rose-300 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-black text-rose-950 text-base">
                  Delete Company From Records
                </h4>
                <p className="text-xs text-rose-600 font-medium">
                  Admin Action: Permanently erase company & inventory
                </p>
              </div>
            </div>

            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between items-center pb-1 border-b border-rose-100">
                <span className="text-slate-600 font-medium">Company Name:</span>
                <span className="font-extrabold text-slate-900 text-sm">{companyToDeleteRecord.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Contract Type:</span>
                <span className="font-bold text-slate-800">{companyToDeleteRecord.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Allocated Engineer:</span>
                <span className="font-semibold text-slate-800">{companyToDeleteRecord.allocated_engineer_name || "Unassigned"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Associated Assets:</span>
                <span className="font-mono font-bold text-rose-700">
                  {effectiveAssets.filter(a => Number(a.company_id) === Number(companyToDeleteRecord.id)).length} asset record(s) will be erased
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ⚠️ <strong>Warning:</strong> Deleting this company will remove the client profile and all associated workstation & printer records completely.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Type <span className="text-rose-600 font-mono font-extrabold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                placeholder="Type DELETE here..."
                value={deleteCompanyConfirmText}
                onChange={(e) => setDeleteCompanyConfirmText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none focus:bg-white focus:border-rose-500 uppercase tracking-wider text-slate-900"
                autoFocus
              />
            </div>

            <div className="flex gap-2.5 justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setCompanyToDeleteRecord(null);
                  setDeleteCompanyConfirmText("");
                }}
                disabled={isDeletingCompany}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCompany}
                disabled={isDeletingCompany || deleteCompanyConfirmText.trim().toUpperCase() !== "DELETE"}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-md disabled:opacity-40 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeletingCompany ? "Deleting Company..." : "Permanently Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📊 MODAL: Excel Bulk Upload & Automatic Update Preview */}
      {uploadModal && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 z-[98] animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4 relative max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <FileUp className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span>Auto-Update Assets from Excel</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold">
                      Ready to Sync
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target Company: <strong className="text-slate-800">{uploadModal.company.name}</strong> • File: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-700">{uploadModal.fileName}</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadModal(null)}
                disabled={isProcessingUpload}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Impact Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black font-mono text-emerald-900">{uploadModal.updateCount}</span>
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Current Assets Updated</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                    Existing assets matched by Asset ID or Serial No will automatically update with new configurations, OS, IP, user assignment, etc.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-blue-500/20 text-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Plus className="h-4 w-4 stroke-[3]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black font-mono text-blue-900">{uploadModal.createCount}</span>
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">New Assets Added</span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                    New devices listed in the spreadsheet will be automatically registered under this company inventory.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview of Parsed Assets */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                  Data Preview ({uploadModal.parsedAssets.length} Total Records Found)
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Showing first {Math.min(5, uploadModal.parsedAssets.length)} rows
                </span>
              </div>
              <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-44 bg-slate-50/50">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-100/80 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Asset ID</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Make / Model</th>
                      <th className="px-3 py-2">Assigned User</th>
                      <th className="px-3 py-2">IP Address</th>
                      <th className="px-3 py-2">Contract</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white font-mono text-[11px]">
                    {uploadModal.parsedAssets.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-bold text-indigo-700">{row.asset_id || "-"}</td>
                        <td className="px-3 py-2 text-slate-700">{row.asset || "Desktop"}</td>
                        <td className="px-3 py-2 text-slate-700">{row.model_no || "-"}</td>
                        <td className="px-3 py-2 text-slate-800 font-sans font-medium">{row.employee_name || "-"}</td>
                        <td className="px-3 py-2 text-blue-700">{row.ip_address || "-"}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            row.amc_status === "Not in AMC" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {row.amc_status || "In AMC"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUploadModal(null)}
                disabled={isProcessingUpload}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={isProcessingUpload}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {isProcessingUpload ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Updating Assets...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Apply & Update Assets ({uploadModal.parsedAssets.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
