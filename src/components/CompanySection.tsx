<<<<<<< HEAD
import React, { useState, useMemo } from "react";
import { 
  Building, Plus, Search, User, CalendarRange, Edit3, Eye, FileSpreadsheet, 
  Download, X, Check, Laptop, Shield, Network, RefreshCw, Cpu, Layers, 
  HardDrive, Key, AlertCircle, Tag, ArrowRight, UserCheck, Users, Printer, Monitor,
  Trash2
} from "lucide-react";
import { Company, CompanyAsset, Employee } from "../types";

interface CompanySectionProps {
  companies: Company[];
  assets?: CompanyAsset[];
  employees?: Employee[];
=======
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
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
  currentUser: any;
  onRefresh: () => Promise<void>;
}

export default function CompanySection({
  companies,
<<<<<<< HEAD
  assets = [],
  employees = [],
  currentUser,
  onRefresh
}: CompanySectionProps) {
  // Determine user permissions
  const isAdmin = currentUser?.type === "admin";
  const userRole = (currentUser?.role || "").toLowerCase();
  const isManager = userRole.includes("manager");
  const isAdminOrManager = isAdmin || isManager;
  const currentEmployeeId = currentUser?.id;

  // Filter companies visible to this user
  // Engineers see:
  // 1. All Non AMC companies (open to all engineers)
  // 2. AMC companies allocated specifically to them
  // Admin & Manager see all companies
  const visibleCompanies = useMemo(() => {
    if (isAdminOrManager) {
      return companies;
    }
    return companies.filter(c => c.type === "Non AMC" || c.allocated_engineer_id === currentEmployeeId);
  }, [companies, isAdminOrManager, currentEmployeeId]);

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
=======
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
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

<<<<<<< HEAD
    setIsSubmittingCompany(true);
    try {
      const creatorName = currentUser?.name || currentUser?.email_id || (isAdmin ? "Admin Manager" : "Service Engineer");
      
      // If engineer adds company, default allocation to them
      const allocatedId = isAdminOrManager 
        ? (companyAllocatedEngineerId || null) 
        : (currentEmployeeId || null);

=======
    setIsSubmitting(true);
    try {
      const creatorName = currentUser?.name || currentUser?.email_id || "System Admin";
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
      const resp = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName.trim(),
          type: companyType,
<<<<<<< HEAD
          created_by: creatorName,
          allocated_engineer_id: allocatedId
=======
          created_by: creatorName
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to create company");
      }

      await onRefresh();
      setCompanyName("");
<<<<<<< HEAD
      setCompanyType("AMC");
      setCompanyAllocatedEngineerId(!isAdminOrManager && currentEmployeeId ? currentEmployeeId : "");
      setShowCompanyModal(false);
      alert("Company successfully registered!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  // Open Add Asset Modal
  const openAddAssetModal = (company: Company) => {
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

    const isPrinter = assetForm.asset === "Printer";

    // Validate mandatory fields:
    // If printer: LOCATION, ASSET ID, MAKE/MODEL
    // If other: LOCATION, ASSET ID, ASSET, EMPLOYEE NAME, COMP NAME, MAKE/MODEL, CONFIG, OS, OFFICE, IP ADDRESS
    const missing: string[] = [];
    if (!assetForm.location.trim()) missing.push("LOCATION");
    if (!assetForm.asset_id.trim()) missing.push("ASSET ID");
    if (!assetForm.model_no.trim()) missing.push("MAKE/MODEL");

    if (!isPrinter) {
      if (!assetForm.asset.trim()) missing.push("ASSET TYPE");
      if (!assetForm.employee_name.trim()) missing.push("EMPLOYEE NAME");
      if (!assetForm.comp_name.trim()) missing.push("COMP NAME");
      if (!assetForm.config_processor.trim() || !assetForm.config_ram.trim() || !assetForm.config_storage.trim()) {
        missing.push("CONFIG (Processor, RAM & Storage)");
      }
      if (!assetForm.os.trim()) missing.push("OS");
      if (!assetForm.office.trim()) missing.push("OFFICE");
      if (!assetForm.ip_address.trim()) missing.push("IP ADDRESS");
    }

    if (missing.length > 0) {
      setAssetFormError(`Mandatory fields required: ${missing.join(", ")}`);
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
            company_id: assetModal.company.id
          })
        });

        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || "Failed to create asset");
        }
        alert("Asset added successfully!");
      } else if (assetModal.mode === "edit" && assetModal.assetToEdit) {
        const resp = await fetch(`/api/assets/${assetModal.assetToEdit.id}/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...assetForm,
            company_id: assetModal.company.id
          })
        });

        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || "Failed to update asset");
        }
        alert("Asset updated successfully!");
      }

      await onRefresh();
      setAssetModal(null);
    } catch (err: any) {
      alert("Error: " + err.message);
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
=======
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
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
<<<<<<< HEAD
        throw new Error(err.error || "Failed to reallocate engineer");
      }

      await onRefresh();
      setReallocatingCompany(null);
      alert("Engineer allocation updated successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
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
    setAssetToDelete(asset);
  };

  const confirmDeleteSingleAsset = async () => {
    if (!assetToDelete) return;
    setIsDeletingAsset(true);
    try {
      let resp = await fetch(`/api/assets/${assetToDelete.id}`, {
        method: "DELETE"
      });
      if (!resp.ok) {
        resp = await fetch(`/api/assets/${assetToDelete.id}/delete`, {
          method: "POST"
        });
      }
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete asset");
      }

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

  // Assets belonging to viewing company (In AMC first, Not in AMC at the end of the sheet)
  const companyAssets = useMemo(() => {
    if (!viewingCompanyForExcel) return [];
    const matched = assets.filter(a => a.company_id === viewingCompanyForExcel.id);
    return [...matched].sort((a, b) => {
      const aIsNonAmc = a.amc_status === "Not in AMC" ? 1 : 0;
      const bIsNonAmc = b.amc_status === "Not in AMC" ? 1 : 0;
      if (aIsNonAmc !== bIsNonAmc) {
        return aIsNonAmc - bIsNonAmc;
      }
      return a.id - b.id;
    });
  }, [assets, viewingCompanyForExcel]);

  // Separate sheets for IT Systems vs Printers
  const systemAssets = useMemo(() => {
    return companyAssets.filter(a => a.asset !== "Printer");
  }, [companyAssets]);

  const printerAssets = useMemo(() => {
    return companyAssets.filter(a => a.asset === "Printer");
  }, [companyAssets]);

  const assetTypeCounts = useMemo(() => {
    if (!viewingCompanyForExcel) return {};
    const matched = assets.filter(a => a.company_id === viewingCompanyForExcel.id);
    const counts: Record<string, number> = {};
    matched.forEach(a => {
      const typeName = a.asset || "Other";
      counts[typeName] = (counts[typeName] || 0) + 1;
    });
    return counts;
  }, [assets, viewingCompanyForExcel]);

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
        (a.amc_status && a.amc_status.toLowerCase().includes(query)) ||
        (a.os && a.os.toLowerCase().includes(query)) ||
        (a.office && a.office.toLowerCase().includes(query))
      );
    });
  }, [currentSheetAssets, excelSearchQuery]);

  // CSV Exporter for active sheet
  const handleExportCsv = () => {
    if (!viewingCompanyForExcel || currentSheetAssets.length === 0) {
      alert(`No ${activeExcelTab === "printers" ? "printer" : "system"} records available to export.`);
      return;
    }

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return "";
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let headers: string[] = [];
    let rows: string[] = [];

    if (activeExcelTab === "printers") {
      // Dynamic printer headers based on entered data
      headers = [
        "ID",
        "LOCATION",
        "ASSET ID",
        "ASSET TYPE",
        "AMC STATUS",
        "MAKE/MODEL"
      ];
      if (printerDynamicColumns.hasSerial) headers.push("SERIAL NO.");
      if (printerDynamicColumns.hasIp) headers.push("IP ADDRESS");
      if (printerDynamicColumns.hasEmployee) headers.push("ASSIGNED TO / USER");
      if (printerDynamicColumns.hasCompName) headers.push("DEVICE NAME");
      if (printerDynamicColumns.hasLanMac) headers.push("LAN MAC");
      if (printerDynamicColumns.hasWanMac) headers.push("WIFI MAC");
      if (printerDynamicColumns.hasStatus) headers.push("STATUS");
      if (printerDynamicColumns.hasConfig) headers.push("CONFIG");
      if (printerDynamicColumns.hasOs) headers.push("OS / DRIVER");
      if (printerDynamicColumns.hasOffice) headers.push("OFFICE");
      if (printerDynamicColumns.hasAntivirus) headers.push("ANTIVIRUS");

      rows = printerAssets.map(a => {
        const row = [
          a.id,
          escapeCsv(a.location),
          escapeCsv(a.asset_id),
          escapeCsv(a.asset),
          escapeCsv(a.amc_status || "In AMC"),
          escapeCsv(a.model_no)
        ];
        if (printerDynamicColumns.hasSerial) row.push(escapeCsv(a.serial_no || ""));
        if (printerDynamicColumns.hasIp) row.push(escapeCsv(a.ip_address || ""));
        if (printerDynamicColumns.hasEmployee) row.push(escapeCsv(a.employee_name || ""));
        if (printerDynamicColumns.hasCompName) row.push(escapeCsv(a.comp_name || ""));
        if (printerDynamicColumns.hasLanMac) row.push(escapeCsv(a.lan_mac || ""));
        if (printerDynamicColumns.hasWanMac) row.push(escapeCsv(a.wan_mac || ""));
        if (printerDynamicColumns.hasStatus) row.push(escapeCsv(a.status || ""));
        if (printerDynamicColumns.hasConfig) row.push(escapeCsv([a.config_processor, a.config_ram, a.config_storage].filter(Boolean).join(" / ")));
        if (printerDynamicColumns.hasOs) row.push(escapeCsv(a.os || ""));
        if (printerDynamicColumns.hasOffice) row.push(escapeCsv(a.office || ""));
        if (printerDynamicColumns.hasAntivirus) row.push(escapeCsv(a.antivirus || ""));
        return row.join(",");
      });
    } else {
      headers = [
        "ID",
        "LOCATION",
        "ASSET ID",
        "ASSET TYPE",
        "AMC STATUS",
        "EMPLOYEE NAME",
        "COMP NAME",
        "MAKE/MODEL",
        "SERIAL NO.",
        "PROCESSOR",
        "RAM",
        "STORAGE",
        "OS",
        "OS KEY",
        "OS TYPE",
        "OFFICE",
        "OFFICE KEY",
        "OFFICE TYPE",
        "LAN MAC",
        "WAN MAC",
        "IP ADDRESS",
        "ANTIVIRUS",
        "KEY",
        "VALIDITY",
        "STATUS"
      ];

      rows = systemAssets.map(a => [
        a.id,
        escapeCsv(a.location),
        escapeCsv(a.asset_id),
        escapeCsv(a.asset),
        escapeCsv(a.amc_status || "In AMC"),
        escapeCsv(a.employee_name),
        escapeCsv(a.comp_name),
        escapeCsv(a.model_no),
        escapeCsv(a.serial_no || ""),
        escapeCsv(a.config_processor),
        escapeCsv(a.config_ram),
        escapeCsv(a.config_storage),
        escapeCsv(a.os),
        escapeCsv(a.os_key || ""),
        escapeCsv(a.os_type || ""),
        escapeCsv(a.office),
        escapeCsv(a.office_key || ""),
        escapeCsv(a.office_type || ""),
        escapeCsv(a.lan_mac || ""),
        escapeCsv(a.wan_mac || ""),
        escapeCsv(a.ip_address),
        escapeCsv(a.antivirus || ""),
        escapeCsv(a.antivirus_key || ""),
        escapeCsv(a.validity || ""),
        escapeCsv(a.status || "")
      ].join(","));
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const suffix = activeExcelTab === "printers" ? "Printers" : "Systems";
    link.setAttribute("download", `${viewingCompanyForExcel.name.replace(/[^a-z0-9]/gi, "_")}_${suffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

        {/* Search Input Bar */}
        <div className="relative mt-5">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company name, contract type (AMC / Non AMC), or allocated engineer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-800"
          />
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
                  {isAdminOrManager && <th className="px-4 py-3">Allocated Engineer</th>}
                  <th className="px-4 py-3 text-center">Total Assets</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                {filteredCompanies.map((company, index) => {
                  const companyAssetCount = assets.filter(a => a.company_id === company.id).length;
                  const isAllocatedToMe = company.allocated_engineer_id === currentEmployeeId;

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
                      {isAdminOrManager && (
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
                      )}

                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          <Laptop className="h-3 w-3 text-slate-500" />
                          <span>{companyAssetCount}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Add Asset Option */}
                          <button
                            type="button"
                            onClick={() => openAddAssetModal(company)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-indigo-200/60 shadow-2xs active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>Add Asset</span>
                          </button>

                          {/* View Asset Table Option */}
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
=======
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
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
                />
              </div>

              <div>
<<<<<<< HEAD
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
=======
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
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyType("Non AMC")}
<<<<<<< HEAD
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      companyType === "Non AMC"
                        ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    Non AMC (Ad-hoc)
=======
                    className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      companyType === "Non AMC"
                        ? "bg-amber-50 border-amber-300 text-amber-850 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Ad-Hoc / Non-AMC
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
                  </button>
                </div>
              </div>

<<<<<<< HEAD
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
=======
              <div className="pt-4 flex gap-2.5 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
                >
                  Cancel
                </button>
                <button
                  type="submit"
<<<<<<< HEAD
                  disabled={isSubmittingCompany || !companyName.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-colors uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCompany ? "Registering..." : "Save Company"}
=======
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  {isSubmitting ? "Creating Client..." : "Confirm Registry"}
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

<<<<<<< HEAD
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
                      Employee Name (User) {assetForm.asset !== "Printer" && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder={assetForm.asset === "Printer" ? "Optional / Shared Printer" : "e.g. Anand Kulkarni"}
                      value={assetForm.employee_name}
                      onChange={(e) => setAssetForm({ ...assetForm, employee_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                      required={assetForm.asset !== "Printer"}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Comp / Device Name {assetForm.asset !== "Printer" && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder={assetForm.asset === "Printer" ? "e.g. PRINTER-HR-01" : "e.g. DESKTOP-PATS-04"}
                      value={assetForm.comp_name}
                      onChange={(e) => setAssetForm({ ...assetForm, comp_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:bg-white focus:border-indigo-500"
                      required={assetForm.asset !== "Printer"}
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
                      Processor {assetForm.asset !== "Printer" && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder={assetForm.asset === "Printer" ? "N/A" : "e.g. Intel Core i5 11th Gen / Ryzen 5"}
                      value={assetForm.config_processor}
                      onChange={(e) => setAssetForm({ ...assetForm, config_processor: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                      required={assetForm.asset !== "Printer"}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      RAM Capacity {assetForm.asset !== "Printer" && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder={assetForm.asset === "Printer" ? "N/A" : "e.g. 16 GB DDR4"}
                      value={assetForm.config_ram}
                      onChange={(e) => setAssetForm({ ...assetForm, config_ram: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                      required={assetForm.asset !== "Printer"}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Storage Type & Size {assetForm.asset !== "Printer" && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder={assetForm.asset === "Printer" ? "N/A" : "e.g. 512 GB NVMe SSD"}
                      value={assetForm.config_storage}
                      onChange={(e) => setAssetForm({ ...assetForm, config_storage: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                      required={assetForm.asset !== "Printer"}
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
                      Operating System {assetForm.asset !== "Printer" && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder={assetForm.asset === "Printer" ? "N/A" : "e.g. Windows 11 Pro"}
                      value={assetForm.os}
                      onChange={(e) => setAssetForm({ ...assetForm, os: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                      required={assetForm.asset !== "Printer"}
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
                      Office Suite {assetForm.asset !== "Printer" && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder={assetForm.asset === "Printer" ? "N/A" : "e.g. MS Office 2021 / Office 365"}
                      value={assetForm.office}
                      onChange={(e) => setAssetForm({ ...assetForm, office: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                      required={assetForm.asset !== "Printer"}
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
                      IP Address {assetForm.asset !== "Printer" && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder={assetForm.asset === "Printer" ? "e.g. 192.168.1.200 (optional if USB)" : "e.g. 192.168.1.150"}
                      value={assetForm.ip_address}
                      onChange={(e) => setAssetForm({ ...assetForm, ip_address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none focus:bg-white focus:border-indigo-500"
                      required={assetForm.asset !== "Printer"}
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
                  {assetModal.mode === "edit" && assetModal.assetToEdit && (
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
      {viewingCompanyForExcel && (
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

                <button
                  type="button"
                  onClick={() => openAddAssetModal(viewingCompanyForExcel)}
                  className="bg-white text-[#107c41] hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Add Asset</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm border border-emerald-700"
                  title="Export this company's assets to CSV/Excel file"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </button>

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
                <table className="border-collapse text-left text-xs font-sans min-w-full">
                  {/* Excel Column Headers (Letters) */}
                  <thead className="bg-[#f3f2f1] text-[#323130] text-[10px] font-mono border-b border-slate-300 select-none">
                    {activeExcelTab === "printers" ? (
                      <tr>
                        <th className="border-r border-slate-300 px-2 py-1.5 text-center bg-[#e1dfdd] w-10 sticky left-0 z-20 font-bold">#</th>
                        <th className="border-r border-slate-300 px-2 py-1.5 bg-[#e1dfdd] text-center w-28 sticky left-10 z-20 font-bold">ACTIONS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">LOCATION</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">ASSET ID</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">ASSET TYPE</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold bg-[#e1dfdd] text-center">AMC STATUS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">MAKE/MODEL</th>
                        {printerDynamicColumns.hasSerial && <th className="border-r border-slate-300 px-3 py-1.5 font-bold">SERIAL NO.</th>}
                        {printerDynamicColumns.hasIp && <th className="border-r border-slate-300 px-3 py-1.5 font-bold">IP ADDRESS</th>}
                        {printerDynamicColumns.hasEmployee && <th className="border-r border-slate-300 px-3 py-1.5 font-bold">ASSIGNED TO / USER</th>}
                        {printerDynamicColumns.hasCompName && <th className="border-r border-slate-300 px-3 py-1.5 font-bold">DEVICE NAME</th>}
                        {printerDynamicColumns.hasLanMac && <th className="border-r border-slate-300 px-3 py-1.5 font-bold">LAN MAC</th>}
                        {printerDynamicColumns.hasWanMac && <th className="border-r border-slate-300 px-3 py-1.5 font-bold">WIFI MAC</th>}
                        {printerDynamicColumns.hasStatus && <th className="border-r border-slate-300 px-3 py-1.5 font-bold">STATUS</th>}
                        {printerDynamicColumns.hasConfig && <th className="border-r border-slate-300 px-3 py-1.5 font-bold">CONFIG</th>}
                        {printerDynamicColumns.hasOs && <th className="border-r border-slate-300 px-3 py-1.5 font-bold">OS / DRIVER</th>}
                        {printerDynamicColumns.hasOffice && <th className="border-r border-slate-300 px-3 py-1.5 font-bold">OFFICE</th>}
                        {printerDynamicColumns.hasAntivirus && <th className="border-r border-slate-300 px-3 py-1.5 font-bold">ANTIVIRUS</th>}
                      </tr>
                    ) : (
                      <tr>
                        <th className="border-r border-slate-300 px-2 py-1.5 text-center bg-[#e1dfdd] w-10 sticky left-0 z-20 font-bold">#</th>
                        <th className="border-r border-slate-300 px-2 py-1.5 bg-[#e1dfdd] text-center w-28 sticky left-10 z-20 font-bold">ACTIONS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">LOCATION</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">ASSET ID</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">ASSET TYPE</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold bg-[#e1dfdd] text-center">AMC STATUS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">EMPLOYEE NAME</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">COMP NAME</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">MAKE/MODEL</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">SERIAL NO.</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">CONFIG (CPU / RAM / STORAGE)</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">OS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">OS KEY</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">OS TYPE</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">OFFICE</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">OFFICE KEY</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">OFFICE TYPE</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">LAN MAC</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">WAN MAC</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">IP ADDRESS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">ANTIVIRUS</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">KEY</th>
                        <th className="border-r border-slate-300 px-3 py-1.5 font-bold">VALIDITY</th>
                        <th className="px-3 py-1.5 font-bold">STATUS</th>
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
                                (printerDynamicColumns.hasOs ? 1 : 0) +
                                (printerDynamicColumns.hasOffice ? 1 : 0) +
                                (printerDynamicColumns.hasAntivirus ? 1 : 0)
                              : 24
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

                          {/* Action - Edit / Delete Asset buttons */}
                          <td className="border-r border-slate-300 px-2 py-2 text-center bg-white sticky left-10 z-10 whitespace-nowrap">
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

                          {/* Action - Edit / Delete Asset buttons */}
                          <td className="border-r border-slate-300 px-2 py-2 text-center bg-white sticky left-10 z-10 whitespace-nowrap">
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
=======
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
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
                >
                  Cancel
                </button>
                <button
                  type="submit"
<<<<<<< HEAD
                  disabled={isReallocating}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {isReallocating ? "Updating..." : "Save Allocation"}
=======
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  {isSubmitting ? "Adding Asset..." : "Register Asset"}
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
<<<<<<< HEAD

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
                  {assets.filter(a => a.company_id === companyToDeleteRecord.id).length} asset record(s) will be erased
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
=======
>>>>>>> 581f8e293bea64a3203b0cf8d0acd18732017625
    </div>
  );
}
