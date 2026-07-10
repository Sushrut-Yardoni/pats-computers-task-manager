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
