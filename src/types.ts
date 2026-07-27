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
  created_by: string;
}

export interface CompanyAsset {
  id: number;
  company_id: number;
  asset: string;
  asset_id: string;
  location: string;
  department: string;
  monitor: string;
  employee_name: string;
  comp_name: string;
  model_no: string;
  configured_os: string;
  os_key: string;
  ms_office: string;
  office_key: string;
  other_app: string;
  serial: string;
  lan_ip: string;
  mac_ip: string;
  wifi_mac_ip: string;
  antivirus_key: string;
  key_val: string;
  validity: string;
  remarks: string;
  created_at: string;
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

