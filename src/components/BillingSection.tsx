import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, Receipt, Plus, Trash2, Printer, Download, CheckCircle2, 
  Building, User, Check, X, DollarSign, Percent, ShieldCheck, Search, Clock, Laptop, ArrowRight, Eye, AlertCircle
} from "lucide-react";
import { Task } from "../types";

interface BillingSectionProps {
  tasks: Task[];
  refreshLogs: () => void;
}

interface BillItem {
  id: string;
  description: string;
  qty: number;
  discountPct: number;
  unitPrice: number;
}

interface BillRecord {
  id: string;
  invoiceNo: string;
  taskId: number;
  customerName: string;
  contactDetails: string;
  address: string;
  billType: "NB" | "GST";
  gstin?: string;
  businessName?: string;
  items: BillItem[];
  gstRate: number;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  createdAt: string;
}

export default function BillingSection({ tasks, refreshLogs }: BillingSectionProps) {
  // Only finished tasks are eligible for billing
  const finishedTasks = useMemo(() => {
    return tasks.filter(t => t.status === "Finished");
  }, [tasks]);

  const [searchQuery, setSearchQuery] = useState("");
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return finishedTasks;
    const q = searchQuery.toLowerCase();
    return finishedTasks.filter(t => 
      t.customer_name.toLowerCase().includes(q) ||
      t.problem_reported.toLowerCase().includes(q) ||
      (t.asset_id && t.asset_id.toLowerCase().includes(q)) ||
      (t.company_name && t.company_name.toLowerCase().includes(q))
    );
  }, [finishedTasks, searchQuery]);

  // Saved bills & No-bill task IDs
  const [savedBills, setSavedBills] = useState<BillRecord[]>(() => {
    try {
      const saved = localStorage.getItem("pats_saved_bills");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [noBillTaskIds, setNoBillTaskIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("pats_nobill_tasks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("pats_saved_bills", JSON.stringify(savedBills));
    } catch (e) {
      console.error(e);
    }
  }, [savedBills]);

  useEffect(() => {
    try {
      localStorage.setItem("pats_nobill_tasks", JSON.stringify(noBillTaskIds));
    } catch (e) {
      console.error(e);
    }
  }, [noBillTaskIds]);

  // Modal states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalMode, setModalMode] = useState<"choice" | "form" | "preview" | null>(null);
  const [activeBillPreview, setActiveBillPreview] = useState<BillRecord | null>(null);

  // Bill Form state
  const [customerName, setCustomerName] = useState("");
  const [contactDetails, setContactDetails] = useState("");
  const [address, setAddress] = useState("");
  const [billType, setBillType] = useState<"NB" | "GST">("NB");
  const [gstin, setGstin] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [gstRate, setGstRate] = useState<number>(18);
  const [items, setItems] = useState<BillItem[]>([
    { id: "1", description: "Repair & Diagnostic Service", qty: 1, discountPct: 0, unitPrice: 1500 }
  ]);

  const handleOpenTask = (task: Task) => {
    setSelectedTask(task);
    // Check if bill already exists for this task
    const existingBill = savedBills.find(b => b.taskId === task.id);
    if (existingBill) {
      setActiveBillPreview(existingBill);
      setModalMode("preview");
    } else {
      // Pre-fill form
      setCustomerName(task.customer_name || task.company_name || "");
      setContactDetails(task.contact_details || "");
      setAddress(task.address || "");
      setBillType("NB");
      setGstin("");
      setBusinessName(task.company_name || task.customer_name || "");
      setGstRate(18);
      setItems([
        { 
          id: String(Date.now()), 
          description: `Repair / Maintenance: ${task.problem_reported.slice(0, 60)}`, 
          qty: 1, 
          discountPct: 0, 
          unitPrice: 1500 
        }
      ]);
      setModalMode("choice");
    }
  };

  const handleNoBill = (taskId: number) => {
    if (!noBillTaskIds.includes(taskId)) {
      setNoBillTaskIds(prev => [...prev, taskId]);
    }
    setSelectedTask(null);
    setModalMode(null);
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        description: "",
        qty: 1,
        discountPct: 0,
        unitPrice: 0
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof BillItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Calculations
  const calculatedBill = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;

    items.forEach(item => {
      const itemTotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
      const disc = itemTotal * ((Number(item.discountPct) || 0) / 100);
      subtotal += itemTotal;
      totalDiscount += disc;
    });

    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const gstAmount = billType === "GST" ? taxableAmount * (gstRate / 100) : 0;
    const grandTotal = taxableAmount + gstAmount;

    return {
      subtotal,
      totalDiscount,
      taxableAmount,
      gstAmount,
      grandTotal
    };
  }, [items, billType, gstRate]);

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (!customerName.trim()) {
      alert("Please enter customer name.");
      return;
    }

    const newBill: BillRecord = {
      id: "BILL-" + Date.now(),
      invoiceNo: "INV-" + Math.floor(100000 + Math.random() * 900000),
      taskId: selectedTask.id,
      customerName: customerName.trim(),
      contactDetails: contactDetails.trim(),
      address: address.trim(),
      billType,
      gstin: billType === "GST" ? gstin.trim() : undefined,
      businessName: billType === "GST" ? businessName.trim() : undefined,
      items,
      gstRate,
      ...calculatedBill,
      createdAt: new Date().toISOString()
    };

    setSavedBills(prev => [newBill, ...prev.filter(b => b.taskId !== selectedTask.id)]);
    setActiveBillPreview(newBill);
    setModalMode("preview");
    refreshLogs();
  };

  const handlePrintBill = () => {
    const printContent = document.getElementById("printable-invoice");
    if (!printContent) {
      window.print();
      return;
    }
    const win = window.open("", "_blank", "width=800,height=600");
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>${activeBillPreview?.invoiceNo || "Invoice"}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #1e293b; background: #ffffff; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 12px; text-align: left; }
              th { background-color: #f1f5f9; font-weight: bold; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .font-mono { font-family: monospace; }
              .font-bold { font-weight: bold; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 350);
    } else {
      window.print();
    }
  };
  const handleDeleteBill = (billId: string) => {
    const updated = savedBills.filter(b => b.id !== billId);
    setSavedBills(updated);
    setActiveBillPreview(null);
    setModalMode(null);
    try {
      localStorage.setItem("pats_saved_bills", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    refreshLogs();
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Header Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Finished Tasks</p>
            <h3 className="text-2xl font-extrabold text-slate-900 font-mono mt-1">{finishedTasks.length}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Generated Bills</p>
            <h3 className="text-2xl font-extrabold text-blue-600 font-mono mt-1">{savedBills.length}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">No Bill Required</p>
            <h3 className="text-2xl font-extrabold text-slate-600 font-mono mt-1">{noBillTaskIds.length}</h3>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl border border-slate-200">
            <X className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Finished Tasks Table for Billing */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              <span>Finished Tasks & Billing Queue</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Select any finished repair ticket to generate NB or GST billing invoices.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search customer, asset ID, problem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 text-slate-800 pl-10 pr-4 py-2 rounded-2xl text-xs focus:outline-none transition-all font-medium"
            />
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 text-xs">No finished tasks available for billing</h4>
            <p className="text-[11px] text-slate-400 mt-1">Complete tasks in the Tasks & Tickets tab to queue them here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ticket #</th>
                  <th className="px-4 py-3">Customer / Company</th>
                  <th className="px-4 py-3">Asset ID</th>
                  <th className="px-4 py-3">Problem / Service</th>
                  <th className="px-4 py-3">Engineer</th>
                  <th className="px-4 py-3">Finished Date</th>
                  <th className="px-4 py-3 text-right">Billing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                {filteredTasks.map(task => {
                  const hasBill = savedBills.some(b => b.taskId === task.id);
                  const isNoBill = noBillTaskIds.includes(task.id);

                  return (
                    <tr 
                      key={task.id} 
                      onClick={() => handleOpenTask(task)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-slate-900">
                        #{task.id}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-slate-400" />
                          <span>{task.company_name || task.customer_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-indigo-600 font-bold">
                        {task.asset_id ? `#${task.asset_id}` : <span className="text-slate-400 font-normal">General</span>}
                      </td>
                      <td className="px-4 py-3.5 max-w-xs truncate text-slate-600">
                        {task.problem_reported}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                        {task.employee_name || "Assigned"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                        {task.finished_at ? new Date(task.finished_at).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        {hasBill ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border border-blue-200">
                            <Receipt className="h-3 w-3" />
                            <span>Bill Generated</span>
                          </span>
                        ) : isNoBill ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border border-slate-200">
                            <span>No Bill</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <span>Action Required</span>
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generated Bills History & Management Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span>Generated Invoices & Management</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              View, print, or delete generated bills and tax invoices.
            </p>
          </div>
          <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-xl text-xs font-mono font-bold">
            {savedBills.length} Bill(s) Saved
          </span>
        </div>

        {savedBills.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Receipt className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 text-xs">No bills generated yet</h4>
            <p className="text-[11px] text-slate-400 mt-1">Select a finished task above and click 'Make Bill' to generate an invoice.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Ticket #</th>
                  <th className="px-4 py-3">Customer / Company</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                {savedBills.map((bill: BillRecord) => (
                  <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-slate-900">
                      {bill.invoiceNo}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono text-blue-600">
                      #{bill.taskId}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-900">
                      {bill.customerName}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${
                        bill.billType === "GST" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {bill.billType === "GST" ? "GST Invoice" : "Normal Bill"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-extrabold text-emerald-600">
                      ₹ {Number(bill.grandTotal || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      {(bill as any).printed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[9px] font-bold">
                          ✓ Printed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 rounded text-[9px] font-bold">
                          Pending Print
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBillPreview(bill);
                          setModalMode("preview");
                        }}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="View & Print Bill"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBill(bill.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Delete Bill"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🧭 Modals: Choice / Form / Preview */}
      {selectedTask && modalMode === "choice" && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in select-text text-slate-800">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-emerald-600" />
            
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-sm">Ticket #{selectedTask.id} Billing Action</h3>
                  <p className="text-[10px] text-slate-400">{selectedTask.company_name || selectedTask.customer_name}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedTask(null); setModalMode(null); }}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Problem Reported</div>
                <div className="text-slate-700 font-medium">{selectedTask.problem_reported}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode("form")}
                  className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Receipt className="h-4 w-4" />
                  <span>Make Bill</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNoBill(selectedTask.id)}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  <span>No Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Make Bill Form Modal */}
      {selectedTask && modalMode === "form" && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in select-text text-slate-800">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative overflow-hidden max-h-[92vh] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 shrink-0" />
            
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-sm">Create Invoice / Bill for Ticket #{selectedTask.id}</h3>
                  <p className="text-[10px] text-slate-400">Configure bill type and itemized goods description</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedTask(null); setModalMode(null); }}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* Bill Type Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Select Bill Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBillType("NB")}
                    className={`py-2.5 px-4 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      billType === "NB"
                        ? "bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-400/20"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Receipt className="h-4 w-4 text-blue-600" />
                    <span>NB Bill (Normal / Non-GST)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillType("GST")}
                    className={`py-2.5 px-4 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      billType === "GST"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-400/20"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>GST Bill (Tax Invoice)</span>
                  </button>
                </div>
              </div>

              {/* GST Specific fields if GST Bill */}
              {billType === "GST" && (
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3 animate-fade-in">
                  <h4 className="font-extrabold text-emerald-900 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>GST & Taxpayer Details</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Business Registered Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Technologies Pvt Ltd"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">GSTIN Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 27AAAAA0000A1Z5"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">GST Rate (%)</label>
                    <select
                      value={gstRate}
                      onChange={(e) => setGstRate(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-sans focus:outline-none focus:border-emerald-500"
                    >
                      <option value={5}>5% GST (2.5% CGST + 2.5% SGST)</option>
                      <option value={12}>12% GST (6% CGST + 6% SGST)</option>
                      <option value={18}>18% GST (9% CGST + 9% SGST)</option>
                      <option value={28}>28% GST (14% CGST + 14% SGST)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Customer / Company Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Contact Details</label>
                  <input
                    type="text"
                    value={contactDetails}
                    onChange={(e) => setContactDetails(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Billing Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                  placeholder="Street address, city, state..."
                />
              </div>

              {/* Multiple Goods / Items Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">Itemized Goods & Services</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] font-extrabold uppercase transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-400">Item #{idx + 1}</span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 hover:bg-red-100 text-red-500 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-6">
                          <input
                            type="text"
                            placeholder="Good / Service Description"
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                            className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.qty}
                            onChange={(e) => handleItemChange(item.id, "qty", Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-mono"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Disc %"
                            value={item.discountPct}
                            onChange={(e) => handleItemChange(item.id, "discountPct", Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            min="0"
                            placeholder="Amount (₹)"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, "unitPrice", Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-mono font-bold text-slate-900"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculation summary preview */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-300 text-[11px]">
                    <span>Subtotal:</span>
                    <span>₹ {calculatedBill.subtotal.toFixed(2)}</span>
                  </div>
                  {calculatedBill.totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400 text-[11px]">
                      <span>Total Discount:</span>
                      <span>- ₹ {calculatedBill.totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {billType === "GST" && (
                    <div className="flex justify-between text-blue-300 text-[11px]">
                      <span>GST ({gstRate}%):</span>
                      <span>+ ₹ {calculatedBill.gstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-800 pt-1.5 flex justify-between font-bold text-sm text-emerald-400">
                    <span>Grand Total:</span>
                    <span>₹ {calculatedBill.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode("choice")}
                  className="py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold uppercase transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-colors shadow-sm"
                >
                  Generate & Save Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Print / Preview Modal */}
      {activeBillPreview && modalMode === "preview" && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in select-text text-slate-800">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-sm">Tax Invoice / Bill Statement</h3>
                  <p className="text-[10px] text-slate-400 font-mono">{activeBillPreview.invoiceNo}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintBill}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBill(activeBillPreview.id)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-colors cursor-pointer"
                  title="Delete Bill"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedTask(null); setModalMode(null); setActiveBillPreview(null); }}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Paper Layout */}
            <div className="bg-white p-6 border border-slate-200 rounded-2xl space-y-5 overflow-y-auto flex-1 font-sans text-xs">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">PATS MAINTENANCE & REPAIR SERVICES</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">Professional IT Support & Hardware AMC Management</p>
                  <p className="text-[10px] text-slate-500">Email: support@pats.co.in | Phone: +91 98765 43210</p>
                  {activeBillPreview.billType === "GST" && activeBillPreview.gstin && (
                    <p className="text-[10px] font-mono font-bold text-emerald-700 mt-1">GSTIN: {activeBillPreview.gstin}</p>
                  )}
                </div>
                <div className="text-right font-mono">
                  <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg text-[10px] font-black uppercase border border-blue-200 mb-1">
                    {activeBillPreview.billType === "GST" ? "GST Tax Invoice" : "Normal Bill (NB)"}
                  </span>
                  <p className="text-xs font-bold text-slate-900">{activeBillPreview.invoiceNo}</p>
                  <p className="text-[10px] text-slate-500">Date: {new Date(activeBillPreview.createdAt).toLocaleDateString()}</p>
                  <p className="text-[10px] text-slate-500">Ref Ticket: #{activeBillPreview.taskId}</p>
                </div>
              </div>

              {/* Bill To */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Billed To:</span>
                <h4 className="font-extrabold text-slate-900 text-sm">{activeBillPreview.customerName}</h4>
                {activeBillPreview.businessName && activeBillPreview.businessName !== activeBillPreview.customerName && (
                  <p className="text-slate-600 font-medium">Business: {activeBillPreview.businessName}</p>
                )}
                {activeBillPreview.contactDetails && <p className="text-slate-600">Contact: {activeBillPreview.contactDetails}</p>}
                {activeBillPreview.address && <p className="text-slate-600">Address: {activeBillPreview.address}</p>}
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Item Description</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Disc %</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {activeBillPreview.items.map((it, idx) => {
                      const lineTotal = it.qty * it.unitPrice;
                      const lineDisc = lineTotal * (it.discountPct / 100);
                      const finalLineAmt = lineTotal - lineDisc;
                      return (
                        <tr key={it.id}>
                          <td className="px-3 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">{it.description}</td>
                          <td className="px-3 py-2.5 text-center font-mono">{it.qty}</td>
                          <td className="px-3 py-2.5 text-right font-mono">₹ {it.unitPrice.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{it.discountPct}%</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">₹ {finalLineAmt.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹ {activeBillPreview.subtotal.toFixed(2)}</span>
                  </div>
                  {activeBillPreview.totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>- ₹ {activeBillPreview.totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {activeBillPreview.billType === "GST" && (
                    <div className="flex justify-between text-blue-600">
                      <span>GST ({activeBillPreview.gstRate}%):</span>
                      <span>+ ₹ {activeBillPreview.gstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-300 pt-2 flex justify-between font-extrabold text-sm text-slate-900">
                    <span>Grand Total:</span>
                    <span>₹ {activeBillPreview.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 flex justify-between items-end text-[10px] text-slate-400">
                <p>Computer generated invoice. No signature required.</p>
                <div className="text-right">
                  <p className="font-bold text-slate-700">Authorized Signatory</p>
                  <p className="mt-6 border-t border-slate-300 pt-1">PATS Support Desk</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
