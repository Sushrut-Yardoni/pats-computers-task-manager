export interface Employee {
  id: number;
  name: string;
  role: string;
  joined_at: string;
  ended_at?: string | null;
  email_id?: string;
  password?: string;
  phone?: string | null;
  skills?: string | null;
  experience?: string | null;
  blood_group?: string | null;
  emergency_contact?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface TaskHistoryEntry {
  timestamp: string;
  edited_by: string;
  before: {
    customer_name: string;
    contact_details: string;
    problem_reported: string;
    address?: string;
    assigned_to?: number;
    employee_name?: string;
    remarks?: string | null;
    materials_carried?: string | null;
    status?: string;
    contract_type?: string;
    company_id?: number | null;
    company_name?: string | null;
    asset_id?: string | null;
  };
  after: {
    customer_name: string;
    contact_details: string;
    problem_reported: string;
    address?: string;
    assigned_to?: number;
    employee_name?: string;
    remarks?: string | null;
    materials_carried?: string | null;
    status?: string;
    contract_type?: string;
    company_id?: number | null;
    company_name?: string | null;
    asset_id?: string | null;
  };
}

export interface Task {
  id: number;
  customer_name: string;
  contact_details: string;
  problem_reported: string;
  assigned_to: number;
  status: "Pending" | "In Progress" | "Finished";
  assigned_at: string;
  accepted_at: string | null;
  finished_at: string | null;
  remarks: string | null;
  employee_name?: string; // Client-side enhancement from server JOIN
  address?: string; // Optional address for task location
  is_priority?: boolean; // Set a task as priority/urgent
  is_repeat?: boolean; // Set a task as a Repeat call
  km_travelled?: number;
  materials_carried?: string | null;
  history?: TaskHistoryEntry[];
  contract_type?: "AMC" | "Non AMC" | string;
  company_id?: number | null;
  company_name?: string | null;
  asset_id?: string | null;
}

export interface TodoTaskHistoryEntry {
  timestamp: string;
  edited_by: string;
  before: {
    title: string;
    description: string;
    status: string;
    remarks?: string | null;
  };
  after: {
    title: string;
    description: string;
    status: string;
    remarks?: string | null;
  };
  rawChanges?: string[];
}

export interface TodoTask {
  id: number;
  title: string;
  description: string;
  status: "Assigned" | "Finished";
  created_at: string;
  created_by_name: string;
  created_by_role: string;
  remarks?: string | null;
  history?: TodoTaskHistoryEntry[];
}

export interface DeletedTodoTask extends TodoTask {
  deleted_at: string;
  deleted_by: string;
}

export interface SqlLog {
  timestamp: string;
  sql: string;
  rowsAffected: number;
}

export interface OfflineTravel {
  id: number;
  employee_id: number;
  employee_name?: string;
  task_id: number;
  task_name?: string;
  km_travelled: number;
  remarks: string | null;
  created_at: string;
}

export interface Company {
  id: number;
  name: string;
  type: "AMC" | "Non AMC";
  created_at: string;
  by_user?: string; // Backwards compatible optional property
  created_by: string;
  allocated_engineer_id?: number | null;
  allocated_engineer_name?: string | null;
}

export interface CompanyAsset {
  id: number;
  company_id: number;
  location: string;
  asset_id: string;
  asset: string;
  employee_name: string;
  comp_name: string;
  model_no: string; // Make/Model
  serial_no?: string;
  config_processor: string;
  config_ram: string;
  config_storage: string;
  monitor?: string;
  monitor_serial_no?: string;
  os: string;
  os_key?: string;
  os_type?: string;
  office: string;
  office_key?: string;
  office_type?: string;
  lan_mac?: string;
  wan_mac?: string;
  ip_address?: string;
  antivirus?: string;
  antivirus_key?: string;
  validity?: string;
  status?: string;
  amc_status?: "In AMC" | "Not in AMC";
  created_at?: string;
}

export function isTargetMatch(targetRaw: string, userNameRaw: string, userEmailRaw?: string): boolean {
  if (!targetRaw || !userNameRaw) return false;

  const target = targetRaw.trim().toLowerCase();
  const userName = userNameRaw.trim().toLowerCase();
  const userEmail = userEmailRaw ? userEmailRaw.trim().toLowerCase() : "";

  if (!target || !userName) return false;

  // 1. Exact match
  if (target === userName) return true;

  // 2. Email match
  if (userEmail) {
    if (target === userEmail) return true;
    const emailPrefix = userEmail.split("@")[0];
    if (target === emailPrefix) return true;
  }

  // 3. Initials match (e.g., "Sus Yardoni" -> "sy", "Saket Shaligram" -> "ss")
  const nameWords = userName.split(/\s+/).filter(Boolean);
  if (nameWords.length >= 2) {
    const initials = nameWords.map(w => w[0]).join("");
    if (target === initials) return true;
  }

  // 4. Word-level exact match (e.g. target "saket" matches "saket shaligram")
  if (nameWords.some(w => w === target)) return true;

  // 5. Substring match for longer search tokens (min 3 chars to prevent false matches)
  if (target.length >= 3 && userName.includes(target)) return true;
  if (userName.length >= 3 && target.includes(userName)) return true;

  return false;
}

