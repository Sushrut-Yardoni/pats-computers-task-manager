export interface Employee {
  id: number;
  name: string;
  role: string;
  joined_at: string;
  ended_at?: string | null;
  email_id?: string;
  password?: string;
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
  km_travelled?: number;
  materials_carried?: string | null;
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
