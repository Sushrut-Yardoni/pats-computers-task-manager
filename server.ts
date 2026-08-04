import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load Environment Variables (.env)
dotenv.config();

const app = express();
const PORT = 3000;
app.use(express.json());

// Custom CORS middleware to allow cross-origin requests from mobile applications or external previews
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Database File Path
const IS_VERCEL = !!process.env.VERCEL;
const BUNDLED_DB_FILE = path.join(process.cwd(), "pats_database.json");
const DB_FILE = IS_VERCEL 
  ? path.join("/tmp", "pats_database.json") 
  : BUNDLED_DB_FILE;

// Define Supabase Live Connection Client
let supabaseUrl = process.env.SUPABASE_URL || "";
if (supabaseUrl.endsWith("/rest/v1/")) {
  supabaseUrl = supabaseUrl.replace("/rest/v1/", "");
}
if (supabaseUrl.endsWith("/rest/v1")) {
  supabaseUrl = supabaseUrl.replace("/rest/v1", "");
}
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

if (isSupabaseConfigured && supabase) {
  console.log("✅ Supabase is initialized. Active Live Connection Point:", supabaseUrl);
  // Startup migration: replace role = Accounts with Employee in Supabase also.
  (async () => {
    try {
      console.log("🔄 Running background database update for Supabase: 'Accounts' -> 'Employee'...");
      
      // 1. Update employees with role 'Accounts' or 'Accounts Dept' to 'Employee'
      const { data: empsToUpdate, error: selectErr } = await supabase
        .from("employees")
        .select("id, role")
        .or("role.eq.Accounts,role.eq.Accounts Dept");

      if (selectErr) {
        console.warn("⚠️ Unable to fetch employees for role migration (it's normal if table doesn't exist yet):", selectErr.message);
      } else if (empsToUpdate && empsToUpdate.length > 0) {
        const { error: updateErr } = await supabase
          .from("employees")
          .update({ role: "Employee" })
          .or("role.eq.Accounts,role.eq.Accounts Dept");

        if (updateErr) {
          console.error("❌ Failed to update employee roles in Supabase:", updateErr.message);
        } else {
          console.log(`✅ Successfully updated ${empsToUpdate.length} employee role(s) to 'Employee' in Supabase.`);
        }
      }

      // 2. Update created_by_role in todo table
      const { data: todosToUpdate, error: selectTodoErr } = await supabase
        .from("todo")
        .select("id, created_by_role");

      if (selectTodoErr) {
        console.warn("⚠️ Unable to fetch todos for role migration (it's normal if table doesn't exist yet):", selectTodoErr.message);
      } else if (todosToUpdate && todosToUpdate.length > 0) {
        let updatedCount = 0;
        for (const t of todosToUpdate) {
          if (t.created_by_role && t.created_by_role.includes("Accounts")) {
            const newRole = t.created_by_role.replace(/Accounts/g, "Employee");
            const { error: updateTodoErr } = await supabase
              .from("todo")
              .update({ created_by_role: newRole })
              .eq("id", t.id);
            if (!updateTodoErr) {
              updatedCount++;
            }
          }
        }
        if (updatedCount > 0) {
          console.log(`✅ Successfully updated ${updatedCount} todo task(s) created_by_role to use 'Employee' in Supabase.`);
        }
      }
    } catch (err: any) {
      console.error("❌ Error in Supabase startup role migration:", err?.message || err);
    }
  })();
} else {
  console.log("⚠️ Supabase parameters missing from .env, falling back onto local pats_database.json");
}

// System SQL Logs to show in Admin SQL Console
interface SqlLog {
  timestamp: string;
  sql: string;
  rowsAffected: number;
}

const sqlLogs: SqlLog[] = [];

// Helper to gracefully translate Supabase RLS and policy errors to highly helpful human prompts
function translateSupabaseError(err: any, tableName: string): string {
  const msg = err?.message || String(err);
  if (msg.includes("row-level security") || msg.includes("policy") || msg.includes("RLS")) {
    return `Supabase Row-Level Security (RLS) is active on the '${tableName}' table. Please run "ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;" in your Supabase SQL Editor to allow public anonymous database transactions.`;
  }
  return msg;
}

// Seed database structured as flat tables (Relational Database simulation)
interface Employee {
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

interface TaskHistoryEntry {
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

interface Task {
  id: number;
  customer_name: string;
  contact_details: string;
  problem_reported: string;
  assigned_to: number; // Foreign Key pointing to Employee.id
  status: "Pending" | "In Progress" | "Finished";
  assigned_at: string;
  accepted_at: string | null;
  finished_at: string | null;
  remarks: string | null;
  address?: string;
  is_priority?: boolean;
  is_repeat?: boolean;
  km_travelled?: number;
  materials_carried?: string | null;
  history?: TaskHistoryEntry[];
}

interface OfflineTravel {
  id: number;
  employee_id: number;
  task_id: number;
  km_travelled: number;
  remarks: string | null;
  created_at: string;
}

interface TodoTaskHistoryEntry {
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
}

interface TodoTask {
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

interface DeletedTodoTask extends TodoTask {
  deleted_at: string;
  deleted_by: string;
}

interface Company {
  id: number;
  name: string;
  type: "AMC" | "Non AMC";
  created_at: string;
  created_by: string;
}

interface CompanyAsset {
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

interface DatabaseSchema {
  employees: Employee[];
  tasks: Task[];
  offline_travels?: OfflineTravel[];
  todos?: TodoTask[];
  deletedTodos?: DeletedTodoTask[];
  companies?: Company[];
  assets?: CompanyAsset[];
  nextTaskId: number;
  nextTodoId?: number;
  nextOfflineTravelId?: number;
  nextCompanyId?: number;
  nextAssetId?: number;
  settings?: {
    petrol_price: number;
  };
}

function initDb(): DatabaseSchema {
  // If running on Vercel, copy the bundled DB_FILE to /tmp/pats_database.json if it doesn't exist yet
  if (IS_VERCEL && !fs.existsSync(DB_FILE)) {
    try {
      if (fs.existsSync(BUNDLED_DB_FILE)) {
        fs.copyFileSync(BUNDLED_DB_FILE, DB_FILE);
        console.log("📋 Copied bundled database template onto writable /tmp filesystem successfully.");
      } else {
        console.log("📋 Bundled database not found, initializing fresh structure inside /tmp.");
      }
    } catch (err: any) {
      console.error("⚠️ Failed to copy bundled database file to /tmp:", err?.message || err);
    }
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data: DatabaseSchema = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      let migrated = false;
      if (!data.settings) {
        data.settings = { petrol_price: 100 };
        migrated = true;
      }
      if (!data.offline_travels) {
        data.offline_travels = [];
        migrated = true;
      }
      // Migrate missing travel logs from completed tasks if any
      if (Array.isArray(data.tasks)) {
        data.tasks.forEach(task => {
          if (task.status === "Finished" && (task.km_travelled || 0) > 0) {
            const hasTravel = data.offline_travels!.some(ot => ot.task_id === task.id);
            if (!hasTravel) {
              const nextId = data.nextOfflineTravelId || (data.offline_travels!.length > 0 ? Math.max(...data.offline_travels!.map(ot => ot.id)) + 1 : 1);
              data.offline_travels!.push({
                id: nextId,
                employee_id: task.assigned_to,
                task_id: task.id,
                km_travelled: task.km_travelled!,
                remarks: `Completion: ${task.remarks || ""}`,
                created_at: task.finished_at || new Date().toISOString()
              });
              data.nextOfflineTravelId = nextId + 1;
              migrated = true;
            }
          }
        });
      }
      if (typeof data.nextOfflineTravelId !== "number") {
        data.nextOfflineTravelId = data.offline_travels!.length > 0 ? Math.max(...data.offline_travels!.map(ot => ot.id)) + 1 : 1;
        migrated = true;
      }
      if (Array.isArray(data.employees)) {
        data.employees = data.employees.map(emp => {
          let updated = false;
          if (!emp.email_id) {
            emp.email_id = emp.name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/(^_|_$)/g, "") + "@pats.co.in";
            updated = true;
          }
          if (!emp.password) {
            emp.password = `pats@${emp.id}`;
            updated = true;
          }
          if (!emp.joined_at) {
            emp.joined_at = "2025-01-15";
            if ((emp as any).email) {
              delete (emp as any).email;
            }
            updated = true;
          }
          if (emp.joined_at.includes("T")) {
            emp.joined_at = emp.joined_at.split("T")[0];
            updated = true;
          }
          if (emp.ended_at && emp.ended_at.includes("T")) {
            emp.ended_at = emp.ended_at.split("T")[0];
            updated = true;
          }
          if (emp.role === "Accounts" || emp.role === "Accounts Dept") {
            emp.role = "Employee";
            updated = true;
          }
          if (updated) migrated = true;
          return emp;
        });
      }
      if (!data.todos) {
        data.todos = [];
        migrated = true;
      } else if (Array.isArray(data.todos)) {
        data.todos = data.todos.map(t => {
          if (t.created_by_role && t.created_by_role.includes("Accounts")) {
            t.created_by_role = t.created_by_role.replace(/Accounts/g, "Employee");
            migrated = true;
          }
          return t;
        });
      }
      if (!data.deletedTodos) {
        data.deletedTodos = [];
        migrated = true;
      }
      if (typeof data.nextTodoId !== "number") {
        data.nextTodoId = data.todos.length > 0 ? Math.max(...data.todos.map(t => t.id)) + 1 : 101;
        migrated = true;
      }
      if (!data.companies) {
        data.companies = [];
        migrated = true;
      }
      if (typeof data.nextCompanyId !== "number") {
        data.nextCompanyId = data.companies.length > 0 ? Math.max(...data.companies.map(c => c.id)) + 1 : 1;
        migrated = true;
      }
      if (!data.assets) {
        data.assets = [];
        migrated = true;
      }
      if (typeof data.nextAssetId !== "number") {
        data.nextAssetId = data.assets.length > 0 ? Math.max(...data.assets.map(a => a.id)) + 1 : 1;
        migrated = true;
      }
      if (migrated) {
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
          console.log("Database employees and todos migrated with clean credentials successfully.");
        } catch (writeErr: any) {
          console.error("⚠️ Failed to write migrated database to filesystem:", writeErr?.message || writeErr);
        }
      }
      return data;
    } catch (e) {
      console.error("Failed to parse database, re-initializing", e);
    }
  }

  const initialData: DatabaseSchema = {
    employees: [
      { id: 101, name: "Rahul Sharma", role: "Desktop Engineer", joined_at: "2025-01-15", email_id: "rahul@pats.co.in", password: "pats@101" },
      { id: 102, name: "Sneha Patel", role: "Network Specialist", joined_at: "2025-01-15", email_id: "sneha@pats.co.in", password: "pats@102" },
      { id: 103, name: "David Miller", role: "System Administrator", joined_at: "2025-01-15", email_id: "david@pats.co.in", password: "pats@103" },
      { id: 104, name: "Anjali Rao", role: "Software Support Expert", joined_at: "2025-01-15", email_id: "anjali@pats.co.in", password: "pats@104" }
    ],
    tasks: [
      {
        id: 1001,
        customer_name: "Amitabh Mehra",
        contact_details: "+91 98765 43210 | amitabh@outlook.com",
        problem_reported: "Blue Screen of Death (BSOD) occurring repeatedly on boot. Hard drive diagnostics required.",
        assigned_to: 101,
        status: "Finished",
        assigned_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        accepted_at: new Date(Date.now() - 47 * 3600 * 1000).toISOString(),
        finished_at: new Date(Date.now() - 45 * 3600 * 1000).toISOString(),
        remarks: "Replaced faulty RAM stick (DDR4 8GB). Cleaned the internal CPU dusting. System booted successfully under bench stress test.",
        address: "Flat 202, Royal Enclave, New Friends Colony, New Delhi",
        is_priority: false,
        km_travelled: 14.5,
        materials_carried: "RAM (8GB DDR4), Anti-Static Wrist Strap"
      },
      {
        id: 1002,
        customer_name: "Clarissa Fernandes",
        contact_details: "+91 87654 32109 | clarissa.f@yahoo.com",
        problem_reported: "Office network router configuration issues. Employees cannot access the shared file server over Wi-Fi.",
        assigned_to: 102,
        status: "In Progress",
        assigned_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        accepted_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
        finished_at: null,
        remarks: null,
        address: "Building 4B, Cyber City, Phase-2, Gurugram",
        is_priority: false,
        km_travelled: 0,
        materials_carried: "Cat6 Ethernet RJ45 Cables, Cisco Console Cable"
      },
      {
        id: 1003,
        customer_name: "Vikram Malhotra",
        contact_details: "+91 76543 21098 | v_malhotra@gmail.com",
        problem_reported: "Noisy SMPS fan and motherboard showing dry capacitor signs. Liquid cooling system refill needed.",
        assigned_to: 103,
        status: "Pending",
        assigned_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        accepted_at: null,
        finished_at: null,
        remarks: null,
        address: "Sector 15, Block B, House 441, Noida",
        is_priority: true,
        km_travelled: 0,
        materials_carried: "Spare PSU (650W Corsair), Thermal Paste, Screwdriver Toolkit"
      }
    ],
    nextTaskId: 1004,
    nextTodoId: 101,
    nextOfflineTravelId: 2,
    todos: [
      {
        id: 101,
        title: "Reconcile June fuel allowance slips",
        description: "Reconcile petrol allowance slips submitted by Nilesh Yadav and Rahul Sharma with Google Maps estimates.",
        status: "Assigned",
        created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        created_by_name: "Meera Sen",
        created_by_role: "Employee",
        remarks: null,
        history: []
      },
      {
        id: 102,
        title: "Audit motherboard stock level in storage",
        description: "Count available LGA1700 and AM4 motherboards in the main warehouse cupboard.",
        status: "Assigned",
        created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        created_by_name: "Amit Kapur",
        created_by_role: "Manager",
        remarks: null,
        history: []
      }
    ],
    offline_travels: [
      {
        id: 1,
        employee_id: 101,
        task_id: 1001,
        km_travelled: 14.5,
        remarks: "Completion: Replaced faulty RAM stick (DDR4 8GB). Cleaned the internal CPU dusting. System booted successfully under bench stress test.",
        created_at: new Date(Date.now() - 45 * 3600 * 1000).toISOString()
      }
    ],
    deletedTodos: [],
    companies: [],
    assets: [],
    nextCompanyId: 1,
    nextAssetId: 1,
    settings: {
      petrol_price: 100
    }
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  } catch (writeErr: any) {
    console.error("⚠️ Failed to write initial seed database to filesystem:", writeErr?.message || writeErr);
  }

  // Log schema creation
  logSQL(
    `CREATE TABLE employees (\n  id INT PRIMARY KEY,\n  name VARCHAR(100),\n  role VARCHAR(100),\n  joined_at VARCHAR(100),\n  ended_at VARCHAR(100) NULL,\n  email_id VARCHAR(50),\n  password VARCHAR(50)\n);\n\nCREATE TABLE tasks (\n  id INT PRIMARY KEY,\n  customer_name VARCHAR(255),\n  contact_details VARCHAR(255),\n  problem_reported TEXT,\n  assigned_to INT,\n  status VARCHAR(50),\n  assigned_at TIMESTAMP,\n  accepted_at TIMESTAMP NULL,\n  finished_at TIMESTAMP NULL,\n  remarks TEXT NULL,\n  FOREIGN KEY (assigned_to) REFERENCES employees(id)\n);`,
    4
  );

  return initialData;
}

// Log execution as an audit log (synchronously updates in-memory list, asynchronously inserts into Supabase sql_logs)
function logSQL(sql: string, rowsAffected: number = 0) {
  const timestampStr = new Date().toLocaleTimeString();
  const isoStr = new Date().toISOString();
  
  sqlLogs.push({
    timestamp: timestampStr,
    sql,
    rowsAffected
  });
  console.log(`[SQL EXEC]: ${sql.replace(/\n/g, " ")} | Rows Affected: ${rowsAffected}`);

  if (isSupabaseConfigured && supabase) {
    (async () => {
      try {
        const { error } = await supabase.from("sql_logs").insert({
          timestamp: isoStr,
          sql,
          rows_affected: rowsAffected
        });
        if (error) {
          console.warn("⚠️ Could not write to sql_logs table in Supabase. Ensure you've run the table DDL inside Supabase's SQL Editor:", error.message);
        }
      } catch (err: any) {
        console.warn("⚠️ Ambient Supabase background error logging connection:", err?.message || err);
      }
    })();
  }
}

const db = initDb();

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (writeErr: any) {
    console.error("⚠️ Failed to write database state update to filesystem:", writeErr?.message || writeErr);
  }
}

// REST Backend Endpoints 

// Unified login validation endpoint with credential checking
app.post("/api/login", async (req, res) => {
  const { email_id, password } = req.body;

  if (!email_id || !password) {
    return res.status(400).json({ error: "Email ID and password are required" });
  }

  const email_id_clean = email_id.trim();
  const password_clean = password.trim();

  const queryAdmin = `SELECT * FROM administrators WHERE email_id = '${email_id_clean.replace(/'/g, "''")}' AND password = '${password_clean.replace(/'/g, "''")}';`;
  const queryEmp = `SELECT * FROM employees WHERE email_id = '${email_id_clean.replace(/'/g, "''")}' AND password = '${password_clean.replace(/'/g, "''")}';`;

  // Check hardcoded admin credentials
  const isAdmin = (
    email_id_clean.toLowerCase() === "admin@pats.co.in"
  ) && password_clean === "admin123";

  if (isAdmin) {
    logSQL(queryAdmin, 1);
    return res.json({
      user: { type: "admin", email_id: "admin@pats.co.in" },
      message: "Admin authentication successful (relational credentials match)."
    });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: employees, error } = await supabase
        .from("employees")
        .select("*")
        .ilike("email_id", email_id_clean)
        .eq("password", password_clean);

      if (error) throw error;

      if (employees && employees.length > 0) {
        const employee = employees[0];
        const endedDate = employee.ended_at ? new Date(employee.ended_at) : null;
        if (endedDate && !isNaN(endedDate.getTime()) && endedDate <= new Date()) {
          return res.status(401).json({ error: "Access denied. Account is deactivated." });
        }
        logSQL(queryEmp, 1);
        const isAdminRole = employee.role === "Admin" || employee.role === "System Administrator" || employee.role === "Admin Engineer";
        return res.json({
          user: {
            type: isAdminRole ? "admin" : "employee",
            id: employee.id,
            name: employee.name,
            role: employee.role,
            email_id: employee.email_id
          },
          message: `${isAdminRole ? "Admin" : "Employee"} authentication successful (relational credentials match).`
        });
      }
    } catch (e: any) {
      console.error("Supabase login direct failure:", e);
    }
  } else {
    // Local memory search
    const employee = db.employees.find(e => {
      const matches = e.email_id?.toLowerCase() === email_id_clean.toLowerCase() && e.password === password_clean;
      if (!matches) return false;
      const endedDate = e.ended_at ? new Date(e.ended_at) : null;
      if (endedDate && !isNaN(endedDate.getTime()) && endedDate <= new Date()) return false;
      return true;
    });

    if (employee) {
      logSQL(queryEmp, 1);
      const isAdminRole = employee.role === "Admin" || employee.role === "System Administrator" || employee.role === "Admin Engineer";
      return res.json({
        user: {
          type: isAdminRole ? "admin" : "employee",
          id: employee.id,
          name: employee.name,
          role: employee.role,
          email_id: employee.email_id
        },
        message: `${isAdminRole ? "Admin" : "Employee"} authentication successful (relational credentials match).`
      });
    }
  }

  // Audit failed check
  logSQL(`SELECT * FROM users WHERE email_id = '${email_id_clean.replace(/'/g, "''")}' AND password = '${password_clean.replace(/'/g, "''")}' LIMIT 1;`, 0);
  
  return res.status(401).json({
    error: "Invalid email ID or password. Check credentials registry."
  });
});

// Add a new technician & generate credentials
app.post("/api/employees", async (req, res) => {
  const { name, role, joined_at } = req.body;

  if (!name || !role || !joined_at) {
    return res.status(400).json({ error: "Missing required employee fields" });
  }

  // Schema formatting
  const email_id = name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/(^_|_$)/g, "") + "@pats.co.in";

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: employees } = await supabase.from("employees").select("id");
      const newId = employees && employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 101;
      const password = `pats@${newId}`;

      const { data: newEmployee, error } = await supabase
        .from("employees")
        .insert({
          id: newId,
          name,
          role,
          joined_at,
          ended_at: null,
          email_id,
          password
        })
        .select()
        .single();

      if (error) throw error;

      const query = `INSERT INTO employees (id, name, role, joined_at, ended_at, email_id, password)\nVALUES (${newId}, '${name.replace(/'/g, "''")}', '${role.replace(/'/g, "''")}', '${joined_at}', NULL, '${email_id}', '${password}');`;
      logSQL(query, 1);

      return res.json(newEmployee);
    } catch (e: any) {
      return res.status(500).json({ error: translateSupabaseError(e, "employees") });
    }
  } else {
    const newId = db.employees.length > 0 ? Math.max(...db.employees.map(e => e.id)) + 1 : 101;
    const password = `pats@${newId}`;

    const newEmployee: Employee = {
      id: newId,
      name,
      role,
      joined_at,
      ended_at: null,
      email_id,
      password
    };

    db.employees.push(newEmployee);
    saveDb();

    const query = `INSERT INTO employees (id, name, role, joined_at, ended_at, email_id, password)\nVALUES (${newId}, '${name.replace(/'/g, "''")}', '${role.replace(/'/g, "''")}', '${joined_at}', NULL, '${email_id}', '${password}');`;
    logSQL(query, 1);

    res.json(newEmployee);
  }
});

// Remove an engineer & set their ending date
app.post("/api/employees/:id/remove", async (req, res) => {
  const empId = Number(req.params.id);
  const { transfer_to_id } = req.body;
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: employee, error: empErr } = await supabase.from("employees").select("*").eq("id", empId).single();
      if (empErr || !employee) {
        return res.status(404).json({ error: "Employee/Engineer not found in relational query." });
      }

      await supabase.from("employees").update({ ended_at: today }).eq("id", empId);

      let transferredCount = 0;
      if (transfer_to_id) {
        const targetId = Number(transfer_to_id);
        const { data: targetEmployee } = await supabase.from("employees").select("*").eq("id", targetId).is("ended_at", null).single();
        if (!targetEmployee) {
          return res.status(400).json({ error: "Selected active lead engineer for transfer is not found or is inactive." });
        }

        // Search unfinished tasks
        const { data: unfinishedTasks } = await supabase.from("tasks").select("id").eq("assigned_to", empId).neq("status", "Finished");
        transferredCount = unfinishedTasks ? unfinishedTasks.length : 0;

        await supabase.from("tasks")
          .update({ assigned_to: targetId })
          .eq("assigned_to", empId)
          .neq("status", "Finished");

        if (transferredCount > 0) {
          const sqlTransfer = `UPDATE tasks \nSET assigned_to = ${targetId} \nWHERE assigned_to = ${empId} AND status != 'Finished';`;
          logSQL(sqlTransfer, transferredCount);
        }
      }

      const sql = `UPDATE employees \nSET ended_at = '${today}' \nWHERE id = ${empId};`;
      logSQL(sql, 1);

      employee.ended_at = today;
      res.json({
        message: `Engineer successfully removed. Relational table ending date is registered. ${transferredCount} task(s) transferred to engineer ${transfer_to_id}.`,
        employee,
        transferredCount
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to remove engineer inside Supabase" });
    }
  } else {
    const employee = db.employees.find(e => e.id === empId);

    if (!employee) {
      return res.status(404).json({ error: "Employee/Engineer not found in relational query." });
    }

    employee.ended_at = today;

    let transferredCount = 0;
    if (transfer_to_id) {
      const targetId = Number(transfer_to_id);
      const targetEmployee = db.employees.find(e => e.id === targetId && !e.ended_at);
      if (!targetEmployee) {
        return res.status(400).json({ error: "Selected active lead engineer for transfer is not found or is inactive." });
      }

      // Reassign any tasks not in "Finished" state
      db.tasks.forEach(task => {
        if (task.assigned_to === empId && task.status !== "Finished") {
          task.assigned_to = targetId;
          transferredCount++;
        }
      });

      if (transferredCount > 0) {
        const sqlTransfer = `UPDATE tasks \nSET assigned_to = ${targetId} \nWHERE assigned_to = ${empId} AND status != 'Finished';`;
        logSQL(sqlTransfer, transferredCount);
      }
    }

    saveDb();

    const sql = `UPDATE employees \nSET ended_at = '${today}' \nWHERE id = ${empId};`;
    logSQL(sql, 1);

    res.json({
      message: `Engineer successfully removed. Relational table ending date is registered. ${transferredCount} task(s) transferred to engineer ${transfer_to_id}.`,
      employee,
      transferredCount
    });
  }
});

// Promote an engineer to Admin role
app.post("/api/employees/:id/promote", async (req, res) => {
  const empId = Number(req.params.id);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: employee, error } = await supabase.from("employees").select("*").eq("id", empId).single();
      if (error || !employee) {
        return res.status(404).json({ error: "Employee/Engineer not found in relational query." });
      }

      await supabase.from("employees").update({ role: "Admin" }).eq("id", empId);
      
      const sql = `UPDATE employees \nSET role = 'Admin' \nWHERE id = ${empId};`;
      logSQL(sql, 1);

      employee.role = "Admin";
      res.json({
        message: `Engineer ${employee.name} promoted to Admin role successfully.`,
        employee
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to promote employee in Supabase." });
    }
  } else {
    const employee = db.employees.find(e => e.id === empId);

    if (!employee) {
      return res.status(404).json({ error: "Employee/Engineer not found in relational query." });
    }

    employee.role = "Admin";
    saveDb();

    const sql = `UPDATE employees \nSET role = 'Admin' \nWHERE id = ${empId};`;
    logSQL(sql, 1);

    res.json({
      message: `Engineer ${employee.name} promoted to Admin role successfully.`,
      employee
    });
  }
});

// Update employee role
app.post("/api/employees/:id/role", async (req, res) => {
  const empId = Number(req.params.id);
  const { role } = req.body;

  if (!role || role.trim().length === 0) {
    return res.status(400).json({ error: "Role cannot be empty" });
  }

  const roleClean = role.trim();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: employee, error } = await supabase.from("employees").select("*").eq("id", empId).single();
      if (error || !employee) {
        return res.status(404).json({ error: "Employee/Engineer not found in relational query." });
      }

      await supabase.from("employees").update({ role: roleClean }).eq("id", empId);

      const query = `UPDATE employees \nSET role = '${roleClean.replace(/'/g, "''")}' \nWHERE id = ${empId};`;
      logSQL(query, 1);

      employee.role = roleClean;
      res.json({
        message: `Employee ${employee.name} role updated to ${roleClean} successfully.`,
        employee
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to update employee role in Supabase." });
    }
  } else {
    const employee = db.employees.find(e => e.id === empId);

    if (!employee) {
      return res.status(404).json({ error: "Employee/Engineer not found in relational query." });
    }

    employee.role = roleClean;
    saveDb();

    const query = `UPDATE employees \nSET role = '${roleClean.replace(/'/g, "''")}' \nWHERE id = ${empId};`;
    logSQL(query, 1);

    res.json({
      message: `Employee ${employee.name} role updated to ${roleClean} successfully.`,
      employee
    });
  }
});

// Update employee password
app.post("/api/employees/:id/password", async (req, res) => {
  const empId = Number(req.params.id);
  const { password } = req.body;

  if (!password || password.trim().length === 0) {
    return res.status(400).json({ error: "Password cannot be empty" });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: employee, error } = await supabase.from("employees").select("*").eq("id", empId).single();
      if (error || !employee) {
        return res.status(404).json({ error: "Employee/Engineer not found." });
      }

      await supabase.from("employees").update({ password }).eq("id", empId);

      const query = `UPDATE employees \nSET password = '${password.replace(/'/g, "''")}' \nWHERE id = ${empId};`;
      logSQL(query, 1);

      res.json({
        message: "Password updated successfully",
        employee: {
          id: employee.id,
          name: employee.name,
          email_id: employee.email_id,
          role: employee.role
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to update password." });
    }
  } else {
    const empIndex = db.employees.findIndex(e => e.id === empId);
    if (empIndex === -1) {
      return res.status(404).json({ error: "Employee/Engineer not found" });
    }

    const emp = db.employees[empIndex];
    emp.password = password;
    saveDb();

    const query = `UPDATE employees \nSET password = '${password.replace(/'/g, "''")}' \nWHERE id = ${empId};`;
    logSQL(query, 1);

    res.json({
      message: "Password updated successfully",
      employee: {
        id: emp.id,
        name: emp.name,
        email_id: emp.email_id,
        role: emp.role
      }
    });
  }
});

// Update employee details profile
app.post("/api/employees/:id/profile", async (req, res) => {
  const empId = Number(req.params.id);
  const { phone, skills, experience, blood_group, emergency_contact, address, notes } = req.body;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: employee, error: selectErr } = await supabase.from("employees").select("*").eq("id", empId).single();
      if (selectErr || !employee) {
        return res.status(404).json({ error: "Employee/Engineer not found." });
      }

      const updateFields: any = {};
      if (phone !== undefined) updateFields.phone = phone || null;
      if (skills !== undefined) updateFields.skills = skills || null;
      if (experience !== undefined) updateFields.experience = experience || null;
      if (blood_group !== undefined) updateFields.blood_group = blood_group || null;
      if (emergency_contact !== undefined) updateFields.emergency_contact = emergency_contact || null;
      if (address !== undefined) updateFields.address = address || null;
      if (notes !== undefined) updateFields.notes = notes || null;

      let supabaseError = null;
      if (Object.keys(updateFields).length > 0) {
        const { error: updateErr } = await supabase.from("employees").update(updateFields).eq("id", empId);
        if (updateErr) {
          throw new Error("Supabase Schema Error: Could not update profile fields. Please ensure you have added the new columns (phone, skills, experience, blood_group, emergency_contact, address, notes) to your Supabase 'employees' table. Error: " + updateErr.message);
        }
      }

      // Also ensure we cache/save it locally so it works flawlessly either way in AI Studio sandbox!
      const empIndex = db.employees.findIndex(e => e.id === empId);
      if (empIndex !== -1) {
        const emp = db.employees[empIndex];
        if (phone !== undefined) emp.phone = phone || null;
        if (skills !== undefined) emp.skills = skills || null;
        if (experience !== undefined) emp.experience = experience || null;
        if (blood_group !== undefined) emp.blood_group = blood_group || null;
        if (emergency_contact !== undefined) emp.emergency_contact = emergency_contact || null;
        if (address !== undefined) emp.address = address || null;
        if (notes !== undefined) emp.notes = notes || null;
        saveDb();
      }

      const query = `UPDATE employees \nSET phone = '${(phone || "").replace(/'/g, "''")}', skills = '${(skills || "").replace(/'/g, "''")}' \nWHERE id = ${empId};`;
      logSQL(query, 1);

      return res.json({
        message: "Profile details updated successfully",
        supabase_error: supabaseError,
        employee: {
          ...employee,
          ...updateFields
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to update profile details." });
    }
  } else {
    // Local DB update
    const empIndex = db.employees.findIndex(e => e.id === empId);
    if (empIndex === -1) {
      return res.status(404).json({ error: "Employee/Engineer not found" });
    }

    const emp = db.employees[empIndex];
    if (phone !== undefined) emp.phone = phone || null;
    if (skills !== undefined) emp.skills = skills || null;
    if (experience !== undefined) emp.experience = experience || null;
    if (blood_group !== undefined) emp.blood_group = blood_group || null;
    if (emergency_contact !== undefined) emp.emergency_contact = emergency_contact || null;
    if (address !== undefined) emp.address = address || null;
    if (notes !== undefined) emp.notes = notes || null;
    saveDb();

    const query = `UPDATE employees \nSET phone = '${(phone || "").replace(/'/g, "''")}', skills = '${(skills || "").replace(/'/g, "''")}', experience = '${(experience || "").replace(/'/g, "''")}', blood_group = '${(blood_group || "").replace(/'/g, "''")}', emergency_contact = '${(emergency_contact || "").replace(/'/g, "''")}', address = '${(address || "").replace(/'/g, "''")}', notes = '${(notes || "").replace(/'/g, "''")}' \nWHERE id = ${empId};`;
    logSQL(query, 1);

    return res.json({
      message: "Profile details updated successfully",
      employee: emp
    });
  }
});

// Unified State Synchronizer (Aggregates employees, tasks, and logs into a single rapid fetch roundtrip to bypass multiple connection latency)
app.get("/api/sync", async (req, res) => {
  let employeesList: Employee[] = [];
  let tasksList: any[] = [];
  let mappedLogs: SqlLog[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const [empRes, taskRes, logRes] = await Promise.all([
        supabase.from("employees").select("*").order("name", { ascending: true }),
        supabase.from("tasks").select("*").order("id", { ascending: false }),
        supabase.from("sql_logs").select("*").order("id", { ascending: false })
      ]);

      if (empRes.error) throw empRes.error;
      if (taskRes.error) throw taskRes.error;

      const rawEmployees = empRes.data || [];
      employeesList = rawEmployees.map(emp => ({
        ...emp,
        joined_at: emp.joined_at ? emp.joined_at.split("T")[0] : null,
        ended_at: emp.ended_at ? emp.ended_at.split("T")[0] : null
      }));
      const rawTasks = taskRes.data || [];
      tasksList = rawTasks.map(task => {
        const emp = employeesList.find(e => e.id === task.assigned_to);
        return {
          ...task,
          employee_name: emp ? emp.name : "Unassigned"
        };
      });

      if (!logRes.error && logRes.data && logRes.data.length > 0) {
        mappedLogs = logRes.data.map(l => ({
          timestamp: l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
          sql: l.sql,
          rowsAffected: l.rows_affected !== undefined ? l.rows_affected : l.rowsAffected || 0
        }));
      } else {
        mappedLogs = sqlLogs;
      }

      let companiesList: Company[] = [];
      let assetsList: CompanyAsset[] = [];
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: cos } = await supabase.from("companies").select("*").order("id", { ascending: true });
          companiesList = cos || [];
        } else {
          companiesList = db.companies || [];
        }
      } catch (err) {
        companiesList = db.companies || [];
      }
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: ast } = await supabase.from("assets").select("*").order("id", { ascending: true });
          assetsList = ast || [];
        } else {
          assetsList = db.assets || [];
        }
      } catch (err) {
        assetsList = db.assets || [];
      }

      logSQL("SELECT * FROM employees; SELECT * FROM tasks; SELECT * FROM sql_logs; -- (Unified Live Connection Sync)", employeesList.length + tasksList.length + mappedLogs.length);

      return res.json({
        employees: employeesList,
        tasks: tasksList,
        sqlLogs: mappedLogs,
        companies: companiesList,
        assets: assetsList
      });
    } catch (e: any) {
      console.error("Failed to sync from Supabase, falling back to local memory DB:", e);
    }
  }

  // Backup Local Memory Database Sync
  const cleanEmployees = db.employees.map(emp => ({
    ...emp,
    joined_at: emp.joined_at ? emp.joined_at.split("T")[0] : null,
    ended_at: emp.ended_at ? emp.ended_at.split("T")[0] : null
  }));

  const tasksWithEmployees = db.tasks.map(task => {
    const emp = cleanEmployees.find(e => e.id === task.assigned_to);
    return {
      ...task,
      employee_name: emp ? emp.name : "Unassigned"
    };
  });

  logSQL("SELECT * FROM employees; SELECT * FROM tasks; -- (Unified Local Cache Sync)", cleanEmployees.length + tasksWithEmployees.length);

  return res.json({
    employees: cleanEmployees,
    tasks: tasksWithEmployees,
    sqlLogs: sqlLogs,
    companies: db.companies || [],
    assets: db.assets || []
  });
});

// Create a new company
app.post("/api/companies", async (req, res) => {
  const { name, type, created_by } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: "Company name and type (AMC / Non AMC) are required." });
  }

  const nextId = db.nextCompanyId || 1;
  const newCompany = {
    id: nextId,
    name,
    type: type === "AMC" ? ("AMC" as const) : ("Non AMC" as const),
    created_by: created_by || "System",
    created_at: new Date().toISOString()
  };

  if (!db.companies) db.companies = [];
  db.companies.push(newCompany);
  db.nextCompanyId = nextId + 1;
  saveDb();

  // Log SQL
  logSQL(`INSERT INTO companies (id, name, type, created_by, created_at) VALUES (${nextId}, '${name}', '${type}', '${created_by || "System"}', NOW());`, 1);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("companies").insert([newCompany]);
    } catch (e) {
      console.warn("Could not insert company to Supabase:", e);
    }
  }

  res.status(201).json(newCompany);
});

// Create a new asset under a company
app.post("/api/assets", async (req, res) => {
  const {
    company_id,
    asset,
    asset_id,
    location,
    department,
    monitor,
    employee_name,
    comp_name,
    model_no,
    configured_os,
    os_key,
    ms_office,
    office_key,
    other_app,
    serial,
    lan_ip,
    mac_ip,
    wifi_mac_ip,
    antivirus_key,
    key_val,
    validity,
    remarks
  } = req.body;

  if (!company_id) {
    return res.status(400).json({ error: "company_id is required." });
  }

  const nextId = db.nextAssetId || 1;
  const newAsset = {
    id: nextId,
    company_id: Number(company_id),
    asset: asset || "",
    asset_id: asset_id || "",
    location: location || "",
    department: department || "",
    monitor: monitor || "",
    employee_name: employee_name || "",
    comp_name: comp_name || "",
    model_no: model_no || "",
    configured_os: configured_os || "",
    os_key: os_key || "",
    ms_office: ms_office || "",
    office_key: office_key || "",
    other_app: other_app || "",
    serial: serial || "",
    lan_ip: lan_ip || "",
    mac_ip: mac_ip || "",
    wifi_mac_ip: wifi_mac_ip || "",
    antivirus_key: antivirus_key || "",
    key_val: key_val || "",
    validity: validity || "",
    remarks: remarks || "",
    created_at: new Date().toISOString()
  };

  if (!db.assets) db.assets = [];
  db.assets.push(newAsset);
  db.nextAssetId = nextId + 1;
  saveDb();

  // Log SQL
  logSQL(`INSERT INTO assets (id, company_id, asset, asset_id, serial, location, department) VALUES (${nextId}, ${company_id}, '${asset || ""}', '${asset_id || ""}', '${serial || ""}', '${location || ""}', '${department || ""}');`, 1);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("assets").insert([newAsset]);
    } catch (e) {
      console.warn("Could not insert asset to Supabase:", e);
    }
  }

  res.status(201).json(newAsset);
});

// Get list of employees
app.get("/api/employees", async (req, res) => {
  const sql = "SELECT * FROM employees ORDER BY name ASC;";
  
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: employees, error } = await supabase.from("employees").select("*").order("name", { ascending: true });
      if (error) throw error;
      const cleanEmps = (employees || []).map(emp => ({
        ...emp,
        joined_at: emp.joined_at ? emp.joined_at.split("T")[0] : null,
        ended_at: emp.ended_at ? emp.ended_at.split("T")[0] : null
      }));
      logSQL(sql, cleanEmps.length);
      return res.json(cleanEmps);
    } catch (e: any) {
      console.error("Failed to query employees from Supabase:", e);
    }
  }

  const cleanLocal = (db.employees || []).map(emp => ({
    ...emp,
    joined_at: emp.joined_at ? emp.joined_at.split("T")[0] : null,
    ended_at: emp.ended_at ? emp.ended_at.split("T")[0] : null
  }));

  logSQL(sql, cleanLocal.length);
  res.json(cleanLocal);
});

// Logs fetcher (queries live from Supabase if configured, falling back onto memory server logs)
app.get("/api/sql/logs", async (req, res) => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("sql_logs").select("*").order("id", { ascending: false });
      if (!error && data && data.length > 0) {
        const mappedLogs = data.map(l => ({
          timestamp: l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
          sql: l.sql,
          rowsAffected: l.rows_affected !== undefined ? l.rows_affected : l.rowsAffected || 0
        }));
        return res.json(mappedLogs);
      }
    } catch (err: any) {
      console.warn("⚠️ sql_logs table is not available inside Supabase yet:", err.message);
    }
  }
  res.json(sqlLogs);
});

// Get tasks (includes simple relation JOIN to fetch employee name)
app.get("/api/tasks", async (req, res) => {
  const sql = `SELECT tasks.*, employees.name as employee_name FROM tasks LEFT JOIN employees ON tasks.assigned_to = employees.id ORDER BY tasks.id DESC;`;
  
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: tasks, error: taskErr } = await supabase.from("tasks").select("*").order("id", { ascending: false });
      const { data: employees } = await supabase.from("employees").select("id, name");

      if (taskErr) throw taskErr;

      const tasksWithEmployees = (tasks || []).map(task => {
        const emp = employees?.find(e => e.id === task.assigned_to);
        return {
          ...task,
          employee_name: emp ? emp.name : "Unassigned"
        };
      });

      logSQL(sql, tasksWithEmployees.length);
      return res.json(tasksWithEmployees);
    } catch (e: any) {
      console.error("Failed to query tasks from Supabase:", e);
    }
  }

  const tasksWithEmployees = db.tasks.map(task => {
    const emp = db.employees.find(e => e.id === task.assigned_to);
    return {
      ...task,
      employee_name: emp ? emp.name : "Unassigned"
    };
  });

  logSQL(sql, tasksWithEmployees.length);
  res.json(tasksWithEmployees);
});

// Admin assigns task
app.post("/api/tasks", async (req, res) => {
  const { customer_name, contact_details, problem_reported, assigned_to, address } = req.body;

  if (!customer_name || !contact_details || !problem_reported || !assigned_to) {
    return res.status(400).json({ error: "Missing required task fields" });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: tasks } = await supabase.from("tasks").select("id");
      const newId = tasks && tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1001;

      const newTask: Task = {
        id: newId,
        customer_name,
        contact_details,
        problem_reported,
        assigned_to: Number(assigned_to),
        status: "Pending",
        assigned_at: new Date().toISOString(),
        accepted_at: null,
        finished_at: null,
        remarks: null,
        address: address || ""
      };

      const { error: insertErr } = await supabase.from("tasks").insert(newTask);
      if (insertErr) throw insertErr;

      const query = `INSERT INTO tasks (id, customer_name, contact_details, problem_reported, assigned_to, status, assigned_at, address)\nVALUES (${newId}, '${customer_name.replace(/'/g, "''")}', '${contact_details.replace(/'/g, "''")}', '${problem_reported.replace(/'/g, "''")}', ${assigned_to}, 'Pending', '${newTask.assigned_at}', '${(address || "").replace(/'/g, "''")}');`;
      logSQL(query, 1);

      const { data: employee } = await supabase.from("employees").select("name").eq("id", assigned_to).single();

      return res.json({
        ...newTask,
        employee_name: employee ? employee.name : "Unassigned"
      });
    } catch (e: any) {
      return res.status(400).json({ error: e.message || "Failed to create task inside Supabase." });
    }
  } else {
    const newId = db.nextTaskId++;
    const newTask: Task = {
      id: newId,
      customer_name,
      contact_details,
      problem_reported,
      assigned_to: Number(assigned_to),
      status: "Pending",
      assigned_at: new Date().toISOString(),
      accepted_at: null,
      finished_at: null,
      remarks: null,
      address: address || ""
    };

    db.tasks.unshift(newTask);
    saveDb();

    const query = `INSERT INTO tasks (id, customer_name, contact_details, problem_reported, assigned_to, status, assigned_at, address)\nVALUES (${newId}, '${customer_name.replace(/'/g, "''")}', '${contact_details.replace(/'/g, "''")}', '${problem_reported.replace(/'/g, "''")}', ${assigned_to}, 'Pending', '${newTask.assigned_at}', '${(address || "").replace(/'/g, "''")}');`;
    logSQL(query, 1);

    const emp = db.employees.find(e => e.id === newTask.assigned_to);
    res.json({
      ...newTask,
      employee_name: emp ? emp.name : "Unassigned"
    });
  }
});

// Employee accepts a task
app.post("/api/tasks/:id/accept", async (req, res) => {
  const taskId = Number(req.params.id);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: task, error: fetchErr } = await supabase.from("tasks").select("*").eq("id", taskId).single();
      if (fetchErr || !task) {
        return res.status(404).json({ error: "Task not found." });
      }

      if (task.status !== "Pending") {
        return res.status(400).json({ error: "Only pending tasks can be accepted" });
      }

      const now = new Date().toISOString();
      await supabase.from("tasks").update({ status: "In Progress", accepted_at: now }).eq("id", taskId);

      const query = `UPDATE tasks\nSET status = 'In Progress', accepted_at = '${now}'\nWHERE id = ${taskId};`;
      logSQL(query, 1);

      const { data: employee } = await supabase.from("employees").select("name").eq("id", task.assigned_to).single();

      task.status = "In Progress";
      task.accepted_at = now;
      res.json({
        ...task,
        employee_name: employee ? employee.name : "Unassigned"
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to update action inside Supabase." });
    }
  } else {
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = db.tasks[taskIndex];
    if (task.status !== "Pending") {
      return res.status(400).json({ error: "Only pending tasks can be accepted" });
    }

    const now = new Date().toISOString();
    task.status = "In Progress";
    task.accepted_at = now;
    saveDb();

    const query = `UPDATE tasks\nSET status = 'In Progress', accepted_at = '${now}'\nWHERE id = ${taskId};`;
    logSQL(query, 1);

    const emp = db.employees.find(e => e.id === task.assigned_to);
    res.json({
      ...task,
      employee_name: emp ? emp.name : "Unassigned"
    });
  }
});

// Employee finishes a task (inserts travel logs dynamic tracking)
app.post("/api/tasks/:id/finish", async (req, res) => {
  const taskId = Number(req.params.id);
  const { remarks, km_travelled } = req.body;

  if (!remarks || remarks.trim() === "") {
    return res.status(400).json({ error: "Remarks are required to complete a task" });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: task, error: fetchErr } = await supabase.from("tasks").select("*").eq("id", taskId).single();
      if (fetchErr || !task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (task.status !== "In Progress") {
        return res.status(400).json({ error: "Only accepted/in-progress tasks can be finished" });
      }

      const now = new Date().toISOString();
      const kmNum = km_travelled !== undefined ? (Number(km_travelled) || 0) : 0;

      await supabase.from("tasks").update({
        status: "Finished",
        finished_at: now,
        remarks: remarks,
        km_travelled: kmNum
      }).eq("id", taskId);

      if (kmNum > 0) {
        const { data: existingTravel } = await supabase.from("offline_travels").select("id").eq("task_id", taskId);
        if (!existingTravel || existingTravel.length === 0) {
          const travel = {
            employee_id: task.assigned_to,
            task_id: taskId,
            km_travelled: kmNum,
            remarks: `Completion: ${remarks.split("\n")[0].slice(0, 100)}`,
            created_at: now
          };
          await supabase.from("offline_travels").insert(travel);

          const travelQuery = `INSERT INTO offline_travels (employee_id, task_id, km_travelled, remarks, created_at)\nVALUES (${task.assigned_to}, ${taskId}, ${kmNum}, 'Completion: ${(remarks||"").split("\n")[0].slice(0, 100).replace(/'/g, "''")}', '${now}');`;
          logSQL(travelQuery, 1);
        }
      }

      const query = `UPDATE tasks\nSET status = 'Finished', finished_at = '${now}', remarks = '${remarks.replace(/'/g, "''")}'${km_travelled !== undefined ? `, km_travelled = ${kmNum}` : ''}\nWHERE id = ${taskId};`;
      logSQL(query, 1);

      const { data: employee } = await supabase.from("employees").select("name").eq("id", task.assigned_to).single();

      task.status = "Finished";
      task.finished_at = now;
      task.remarks = remarks;
      task.km_travelled = kmNum;

      res.json({
        ...task,
        employee_name: employee ? employee.name : "Unassigned"
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to complete task in Supabase." });
    }
  } else {
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = db.tasks[taskIndex];
    if (task.status !== "In Progress") {
      return res.status(400).json({ error: "Only accepted/in-progress tasks can be finished" });
    }

    const now = new Date().toISOString();
    task.status = "Finished";
    task.finished_at = now;
    task.remarks = remarks;
    if (km_travelled !== undefined) {
      const kmNum = Number(km_travelled) || 0;
      task.km_travelled = kmNum;
      if (kmNum > 0) {
        if (!db.offline_travels) db.offline_travels = [];
        const isAlreadyLogged = db.offline_travels.some(t => t.task_id === taskId);
        if (!isAlreadyLogged) {
          const newOfflineTravelId = db.nextOfflineTravelId || 1;
          db.nextOfflineTravelId = newOfflineTravelId + 1;
          const newTravel: OfflineTravel = {
            id: newOfflineTravelId,
            employee_id: task.assigned_to,
            task_id: taskId,
            km_travelled: kmNum,
            remarks: `Completion: ${remarks.split("\n")[0].slice(0, 100)}`,
            created_at: now
          };
          db.offline_travels.push(newTravel);

          const travelQuery = `INSERT INTO offline_travels (id, employee_id, task_id, km_travelled, remarks, created_at)\nVALUES (${newOfflineTravelId}, ${task.assigned_to}, ${taskId}, ${kmNum}, 'Completion: ${(remarks||"").split("\n")[0].slice(0, 100).replace(/'/g, "''")}', '${now}');`;
          logSQL(travelQuery, 1);
        }
      }
    }
    saveDb();

    const query = `UPDATE tasks\nSET status = 'Finished', finished_at = '${now}', remarks = '${remarks.replace(/'/g, "''")}'${km_travelled !== undefined ? `, km_travelled = ${task.km_travelled}` : ''}\nWHERE id = ${taskId};`;
    logSQL(query, 1);

    const emp = db.employees.find(e => e.id === task.assigned_to);
    res.json({
      ...task,
      employee_name: emp ? emp.name : "Unassigned"
    });
  }
});

// Admin or Employee updates the remarks of any task
app.post("/api/tasks/:id/remark", async (req, res) => {
  const taskId = Number(req.params.id);
  const { remarks } = req.body;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: task, error: fetchErr } = await supabase.from("tasks").select("*").eq("id", taskId).single();
      if (fetchErr || !task) {
        return res.status(404).json({ error: "Task not found." });
      }

      await supabase.from("tasks").update({ remarks: remarks || null }).eq("id", taskId);

      const query = `UPDATE tasks \nSET remarks = '${(remarks || "").replace(/'/g, "''")}' \nWHERE id = ${taskId};`;
      logSQL(query, 1);

      const { data: employee } = await supabase.from("employees").select("name").eq("id", task.assigned_to).single();

      task.remarks = remarks || null;
      res.json({
        message: `Remarks updated successfully.`,
        task: {
          ...task,
          employee_name: employee ? employee.name : "Unassigned"
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to update remarks." });
    }
  } else {
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found." });
    }

    const task = db.tasks[taskIndex];
    task.remarks = remarks || null;
    saveDb();

    const query = `UPDATE tasks \nSET remarks = '${(remarks || "").replace(/'/g, "''")}' \nWHERE id = ${taskId};`;
    logSQL(query, 1);

    const emp = db.employees.find(e => e.id === task.assigned_to);
    res.json({
      message: `Remarks updated successfully.`,
      task: {
        ...task,
        employee_name: emp ? emp.name : "Unassigned"
      }
    });
  }
});

// Admin toggles priority status for a task
app.post("/api/tasks/:id/priority", async (req, res) => {
  const taskId = Number(req.params.id);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: task, error: fetchErr } = await supabase.from("tasks").select("*").eq("id", taskId).single();
      if (fetchErr || !task) {
        return res.status(404).json({ error: "Task not found." });
      }

      const nextPriority = !task.is_priority;
      await supabase.from("tasks").update({ is_priority: nextPriority }).eq("id", taskId);

      const query = `UPDATE tasks \nSET is_priority = ${nextPriority ? 1 : 0} \nWHERE id = ${taskId};`;
      logSQL(query, 1);

      const { data: employee } = await supabase.from("employees").select("name").eq("id", task.assigned_to).single();

      task.is_priority = nextPriority;
      res.json({
        message: `Task priority state toggled.`,
        task: {
          ...task,
          employee_name: employee ? employee.name : "Unassigned"
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to toggle priority status." });
    }
  } else {
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found." });
    }

    const task = db.tasks[taskIndex];
    task.is_priority = !task.is_priority;
    saveDb();

    const query = `UPDATE tasks \nSET is_priority = ${task.is_priority ? 1 : 0} \nWHERE id = ${taskId};`;
    logSQL(query, 1);

    const emp = db.employees.find(e => e.id === task.assigned_to);
    res.json({
      message: `Task priority state toggled.`,
      task: {
        ...task,
        employee_name: emp ? emp.name : "Unassigned"
      }
    });
  }
});

// Admin transfers or reassigns a task directly
app.post("/api/tasks/:id/transfer", async (req, res) => {
  const taskId = Number(req.params.id);
  const { transfer_to_id } = req.body;

  if (!transfer_to_id) {
    return res.status(400).json({ error: "Target engineer ID is required for task transfer." });
  }

  const targetId = Number(transfer_to_id);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: task, error: fetchErr } = await supabase.from("tasks").select("*").eq("id", taskId).single();
      if (fetchErr || !task) {
        return res.status(404).json({ error: "Task not found." });
      }

      const { data: targetEmployee, error: empErr } = await supabase.from("employees").select("*").eq("id", targetId).is("ended_at", null).single();
      if (empErr || !targetEmployee) {
        return res.status(400).json({ error: "Selected active engineer for transfer is not found or is inactive." });
      }

      const previousEmpId = task.assigned_to;
      await supabase.from("tasks").update({ assigned_to: targetId }).eq("id", taskId);

      const query = `UPDATE tasks \nSET assigned_to = ${targetId} \nWHERE id = ${taskId};`;
      logSQL(query, 1);

      task.assigned_to = targetId;
      res.json({
        message: `Task #${taskId} successfully transferred from Engineer ID #${previousEmpId} to ID #${targetId} (${targetEmployee.name}).`,
        task: {
          ...task,
          employee_name: targetEmployee.name
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to transfer task." });
    }
  } else {
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found." });
    }

    const task = db.tasks[taskIndex];
    const targetEmployee = db.employees.find(e => e.id === targetId && !e.ended_at);
    if (!targetEmployee) {
      return res.status(400).json({ error: "Selected active engineer for transfer is not found or is inactive." });
    }

    const previousEmpId = task.assigned_to;
    task.assigned_to = targetId;
    saveDb();

    const query = `UPDATE tasks \nSET assigned_to = ${targetId} \nWHERE id = ${taskId};`;
    logSQL(query, 1);

    const emp = db.employees.find(e => e.id === task.assigned_to);
    res.json({
      message: `Task #${taskId} successfully transferred from Engineer ID #${previousEmpId} to ID #${targetId} (${emp?.name}).`,
      task: {
        ...task,
        employee_name: emp ? emp.name : "Unassigned"
      }
    });
  }
});

// Admin re-assigns task with Repeat call status
app.post("/api/tasks/:id/reassign", async (req, res) => {
  const taskId = Number(req.params.id);
  const { reassign_to_id } = req.body;

  if (!reassign_to_id) {
    return res.status(400).json({ error: "Service specialist ID is required for reassignment." });
  }

  const targetId = Number(reassign_to_id);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: task, error: fetchErr } = await supabase.from("tasks").select("*").eq("id", taskId).single();
      if (fetchErr || !task) {
        return res.status(404).json({ error: "Task not found." });
      }

      const { data: targetEmployee, error: empErr } = await supabase.from("employees").select("*").eq("id", targetId).is("ended_at", null).single();
      if (empErr || !targetEmployee) {
        return res.status(400).json({ error: "Selected active specialist is not found or is inactive." });
      }

      const { data: allTasks } = await supabase.from("tasks").select("id");
      const newId = allTasks && allTasks.length > 0 ? Math.max(...allTasks.map(t => t.id)) + 1 : 1001;
      
      const newTask: Task = {
        id: newId,
        customer_name: task.customer_name,
        contact_details: task.contact_details,
        problem_reported: task.problem_reported,
        address: task.address || "",
        assigned_to: targetId,
        status: "Pending",
        assigned_at: new Date().toISOString(),
        accepted_at: null,
        finished_at: null,
        remarks: null,
        is_priority: task.is_priority || false,
        km_travelled: 0,
        materials_carried: null,
        is_repeat: true
      };

      const { error: insertErr } = await supabase.from("tasks").insert(newTask);

      if (insertErr) {
        return res.status(400).json({ error: "Supabase Insert Error: " + insertErr.message });
      }

      const query = `INSERT INTO tasks (id, customer_name, contact_details, problem_reported, assigned_to, status, assigned_at, address)\nVALUES (${newId}, '${newTask.customer_name.replace(/'/g, "''")}', '${newTask.contact_details.replace(/'/g, "''")}', '${newTask.problem_reported.replace(/'/g, "''")}', ${targetId}, 'Pending', '${newTask.assigned_at}', '${newTask.address.replace(/'/g, "''")}');`;
      logSQL(query, 1);

      res.json({
        message: `A new repeat task #${newId} has been created and assigned to Specialist ID #${targetId} (${targetEmployee.name}).`,
        task: {
          ...newTask,
          employee_name: targetEmployee.name
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to re-assign task." });
    }
  } else {
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found." });
    }

    const task = db.tasks[taskIndex];
    const targetEmployee = db.employees.find(e => e.id === targetId && !e.ended_at);
    if (!targetEmployee) {
      return res.status(400).json({ error: "Selected active specialist is not found or is inactive." });
    }

    const newId = db.tasks.length > 0 ? Math.max(...db.tasks.map(t => t.id)) + 1 : 1001;
    
    const newTask: Task = {
      id: newId,
      customer_name: task.customer_name,
      contact_details: task.contact_details,
      problem_reported: task.problem_reported,
      address: task.address || "",
      assigned_to: targetId,
      status: "Pending",
      assigned_at: new Date().toISOString(),
      accepted_at: null,
      finished_at: null,
      remarks: null,
      is_priority: task.is_priority || false,
      km_travelled: 0,
      materials_carried: undefined,
      is_repeat: true
    };

    db.tasks.push(newTask);
    saveDb();

    const query = `INSERT INTO tasks (id, customer_name, contact_details, problem_reported, assigned_to, status, assigned_at, address)\nVALUES (${newId}, '${newTask.customer_name.replace(/'/g, "''")}', '${newTask.contact_details.replace(/'/g, "''")}', '${newTask.problem_reported.replace(/'/g, "''")}', ${targetId}, 'Pending', '${newTask.assigned_at}', '${newTask.address.replace(/'/g, "''")}');`;
    logSQL(query, 1);

    res.json({
      message: `A new repeat task #${newId} has been created and assigned to Specialist ID #${targetId} (${targetEmployee.name}).`,
      task: {
        ...newTask,
        employee_name: targetEmployee.name
      }
    });
  }
});

// Admin/Manager/Employee updates task details and records history
app.post("/api/tasks/:id/update", async (req, res) => {
  const taskId = Number(req.params.id);
  const { 
    customer_name, 
    contact_details, 
    problem_reported, 
    address, 
    assigned_to, 
    status, 
    remarks, 
    materials_carried, 
    edited_by 
  } = req.body;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: task, error: fetchErr } = await supabase.from("tasks").select("*").eq("id", taskId).single();
      if (fetchErr || !task) {
        return res.status(404).json({ error: "Task not found." });
      }

      const beforeState = {
        customer_name: task.customer_name,
        contact_details: task.contact_details,
        problem_reported: task.problem_reported,
        address: task.address || "",
        assigned_to: task.assigned_to,
        status: task.status,
        remarks: task.remarks,
        materials_carried: task.materials_carried
      };

      const updatedFields: any = {
        customer_name: customer_name !== undefined ? customer_name : task.customer_name,
        contact_details: contact_details !== undefined ? contact_details : task.contact_details,
        problem_reported: problem_reported !== undefined ? problem_reported : task.problem_reported,
        address: address !== undefined ? address : (task.address || ""),
        assigned_to: assigned_to !== undefined ? Number(assigned_to) : task.assigned_to,
        status: status !== undefined ? status : task.status,
        remarks: remarks !== undefined ? remarks : task.remarks,
        materials_carried: materials_carried !== undefined ? materials_carried : task.materials_carried
      };

      // Construct history if edited_by is provided
      const historyEntry = edited_by ? {
        timestamp: new Date().toISOString(),
        edited_by,
        before: beforeState,
        after: updatedFields
      } : null;

      let historyArray = [];
      try {
        historyArray = Array.isArray(task.history) ? task.history : (typeof task.history === "string" ? JSON.parse(task.history) : []);
      } catch (e) {
        historyArray = [];
      }
      if (historyEntry) {
        historyArray.push(historyEntry);
      }

      updatedFields.history = JSON.stringify(historyArray);

      // Omit the non-existent history column when updating the tasks table on Supabase
      const supabaseFields = { ...updatedFields };
      delete supabaseFields.history;

      const { error: updateErr } = await supabase.from("tasks").update(supabaseFields).eq("id", taskId);
      if (updateErr) throw updateErr;

      const query = `UPDATE tasks \nSET customer_name = '${(updatedFields.customer_name).replace(/'/g, "''")}', contact_details = '${(updatedFields.contact_details).replace(/'/g, "''")}', status = '${updatedFields.status}' \nWHERE id = ${taskId};`;
      logSQL(query, 1);

      const { data: employee } = await supabase.from("employees").select("name").eq("id", updatedFields.assigned_to).single();

      res.json({
        message: "Task details updated successfully.",
        task: {
          ...task,
          ...updatedFields,
          history: historyArray,
          employee_name: employee ? employee.name : "Unassigned"
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to update task details." });
    }
  } else {
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found." });
    }

    const task = db.tasks[taskIndex];

    const beforeState = {
      customer_name: task.customer_name,
      contact_details: task.contact_details,
      problem_reported: task.problem_reported,
      address: task.address || "",
      assigned_to: task.assigned_to,
      status: task.status,
      remarks: task.remarks,
      materials_carried: task.materials_carried
    };

    const updatedFields = {
      customer_name: customer_name !== undefined ? customer_name : task.customer_name,
      contact_details: contact_details !== undefined ? contact_details : task.contact_details,
      problem_reported: problem_reported !== undefined ? problem_reported : task.problem_reported,
      address: address !== undefined ? address : (task.address || ""),
      assigned_to: assigned_to !== undefined ? Number(assigned_to) : task.assigned_to,
      status: status !== undefined ? status : task.status,
      remarks: remarks !== undefined ? remarks : task.remarks,
      materials_carried: materials_carried !== undefined ? materials_carried : task.materials_carried
    };

    // Construct history if edited_by is provided
    const historyEntry = edited_by ? {
      timestamp: new Date().toISOString(),
      edited_by,
      before: beforeState,
      after: updatedFields
    } : null;

    task.history = task.history || [];
    if (historyEntry) {
      task.history.push(historyEntry);
    }

    // Apply updates
    Object.assign(task, updatedFields);
    saveDb();

    const query = `UPDATE tasks \nSET customer_name = '${task.customer_name.replace(/'/g, "''")}', contact_details = '${task.contact_details.replace(/'/g, "''")}', problem_reported = '${task.problem_reported.replace(/'/g, "''")}', address = '${(task.address || "").replace(/'/g, "''")}', status = '${task.status}' \nWHERE id = ${taskId};`;
    logSQL(query, 1);

    const emp = db.employees.find(e => e.id === task.assigned_to);
    res.json({
      message: "Task details updated successfully.",
      task: {
        ...task,
        employee_name: emp ? emp.name : "Unassigned"
      }
    });
  }
});

// Admin/Manager deletes a task
app.delete("/api/tasks/:id", async (req, res) => {
  const taskId = Number(req.params.id);

  if (isSupabaseConfigured && supabase) {
    try {
      // First delete dependent offline travels to avoid foreign key violations
      const { error: travelErr } = await supabase.from("offline_travels").delete().eq("task_id", taskId);
      if (travelErr) {
        console.warn("Could not delete from offline_travels for task:", taskId, travelErr.message);
      }

      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      
      const query = `DELETE FROM tasks WHERE id = ${taskId};`;
      logSQL(query, 1);
      res.json({ success: true, message: `Task #${taskId} successfully deleted.` });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to delete task from Supabase." });
    }
  } else {
    // Delete from offline_travels in local db as well
    if (db.offline_travels) {
      db.offline_travels = db.offline_travels.filter(ot => ot.task_id !== taskId);
    }
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found." });
    }
    db.tasks.splice(taskIndex, 1);
    saveDb();

    const query = `DELETE FROM tasks WHERE id = ${taskId};`;
    logSQL(query, 1);
    res.json({ success: true, message: `Task #${taskId} successfully deleted.` });
  }
});

// Update/add materials carrying for a task
app.post("/api/tasks/:id/materials", async (req, res) => {
  const taskId = Number(req.params.id);
  const { materials_carried } = req.body;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: task, error: fetchErr } = await supabase.from("tasks").select("*").eq("id", taskId).single();
      if (fetchErr || !task) {
        return res.status(404).json({ error: "Task not found." });
      }

      await supabase.from("tasks").update({ materials_carried: materials_carried || null }).eq("id", taskId);

      const query = `UPDATE tasks \nSET materials_carried = '${(materials_carried || "").replace(/'/g, "''")}' \nWHERE id = ${taskId};`;
      logSQL(query, 1);

      const { data: employee } = await supabase.from("employees").select("name").eq("id", task.assigned_to).single();

      task.materials_carried = materials_carried || null;
      res.json({
        message: "Materials carried updated successfully.",
        task: {
          ...task,
          employee_name: employee ? employee.name : "Unassigned"
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to update materials." });
    }
  } else {
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found." });
    }

    const task = db.tasks[taskIndex];
    task.materials_carried = materials_carried || null;
    saveDb();

    const query = `UPDATE tasks \nSET materials_carried = '${(materials_carried || "").replace(/'/g, "''")}' \nWHERE id = ${taskId};`;
    logSQL(query, 1);

    const emp = db.employees.find(e => e.id === task.assigned_to);
    res.json({
      message: "Materials carried updated successfully.",
      task: {
        ...task,
        employee_name: emp ? emp.name : "Unassigned"
      }
    });
  }
});

// FETCH ALL TODOS
app.get("/api/todos", async (req, res) => {
  const query = "SELECT * FROM todo ORDER BY created_at DESC;";
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: todos, error } = await supabase.from("todo").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      const { data: historyRows } = await supabase.from("todos_history").select("*").order("modified_at", { ascending: false });
      const { data: emps } = await supabase.from("employees").select("*");
      const employees = emps || [];

      const formattedTodos = (todos || []).map(todo => {
        const todoHistory = (historyRows || [])
          .filter(h => h.todo_id === todo.id)
          .map(h => {
            const modifier = employees.find(e => e.id === h.modified_by);
            const edited_by = modifier ? modifier.name : (h.modified_by_name || "System Admin");

            let before = {};
            let after = {};
            let rawChanges: string[] = [];

            let parsedChanges: any = null;
            if (h.changes) {
              if (typeof h.changes === 'string') {
                try {
                  parsedChanges = JSON.parse(h.changes);
                } catch (e) {
                  parsedChanges = h.changes;
                }
              } else {
                parsedChanges = h.changes;
              }
            }

            if (parsedChanges) {
              if (parsedChanges.before || parsedChanges.after) {
                before = parsedChanges.before || {};
                after = parsedChanges.after || {};
              } else if (Array.isArray(parsedChanges)) {
                rawChanges = parsedChanges.map(c => String(c));
              } else if (typeof parsedChanges === 'string') {
                rawChanges = [parsedChanges];
              } else {
                before = parsedChanges;
              }
            }

            return {
              timestamp: h.modified_at,
              edited_by,
              before,
              after,
              rawChanges
            };
          });

        // Lookup employee creator details based on integer created_by
        const creator = employees.find(e => e.id === todo.created_by);
        const created_by_name = creator ? creator.name : (todo.created_by_name || "System Admin");
        const savedPriority = todo.priority || "";
        const created_by_role = (savedPriority.includes("|for:") || savedPriority === "Admin" || savedPriority === "Manager" || savedPriority.startsWith("Accounts") || savedPriority.startsWith("Employee"))
          ? savedPriority
          : (creator ? creator.role : "Employee");

        return {
          id: todo.id,
          title: todo.title,
          description: todo.details || "",
          priority: todo.priority || "low",
          status: todo.status ? (todo.status.toLowerCase() === "finished" || todo.status.toLowerCase() === "completed" ? "Finished" : todo.status.toLowerCase() === "deleted" ? "Deleted" : "Assigned") : "Assigned",
          created_at: todo.created_at,
          created_by_name,
          created_by_role,
          remarks: todo.remarks || null,
          history: todoHistory
        };
      }).filter(todo => todo.status !== "Deleted");

      logSQL(query, formattedTodos.length);
      return res.json(formattedTodos);
    } catch (e: any) {
      console.error("Failed to fetch todos from Supabase:", e);
    }
  }

  const todos = db.todos || [];
  logSQL(query, todos.length);
  res.json(todos);
});

// REORDER TODOS
app.post("/api/todos/reorder", async (req, res) => {
  const { orderedIds, updatedTodo } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: "Invalid orderedIds array" });
  }

  try {
    if (db.todos && Array.isArray(db.todos)) {
      if (updatedTodo && updatedTodo.id && updatedTodo.created_by_role) {
        const item = db.todos.find(t => t.id === updatedTodo.id);
        if (item) {
          item.created_by_role = updatedTodo.created_by_role;
        }
      }

      const idMap = new Map<number, number>();
      orderedIds.forEach((id, index) => idMap.set(Number(id), index));

      db.todos.sort((a, b) => {
        const idxA = idMap.has(a.id) ? idMap.get(a.id)! : 999999;
        const idxB = idMap.has(b.id) ? idMap.get(b.id)! : 999999;
        return idxA - idxB;
      });

      saveDb();
    }

    if (isSupabaseConfigured && supabase && updatedTodo && updatedTodo.id && updatedTodo.created_by_role) {
      await supabase
        .from("todo")
        .update({ priority: updatedTodo.created_by_role })
        .eq("id", updatedTodo.id);
    }

    return res.json({ message: "To-Dos reordered successfully." });
  } catch (err: any) {
    console.error("Failed to reorder todos:", err);
    return res.status(500).json({ error: "Failed to reorder todos" });
  }
});

// CREATE A NEW TODO
app.post("/api/todos", async (req, res) => {
  const { title, description, created_by_name, created_by_role } = req.body;

  if (!title || !description || !created_by_name || !created_by_role) {
    return res.status(400).json({ error: "Missing required fields for todo task." });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: emps } = await supabase.from("employees").select("*");
      const employees = emps || [];
      const creator = employees.find(e => e.name.toLowerCase() === created_by_name.toLowerCase());
      const created_by = creator ? creator.id : null;

      const { data: allTodos } = await supabase.from("todo").select("id");
      const maxId = allTodos && allTodos.length > 0 ? Math.max(...allTodos.map(t => t.id)) : 100;
      const nextId = maxId + 1;

      const newTodoData = {
        id: nextId,
        title,
        details: description,
        priority: created_by_role, // Save the role with assignment target in priority column
        status: "Assigned",
        created_by,
        created_at: new Date().toISOString()
      };

      const { data: insertedRows, error: insertErr } = await supabase
        .from("todo")
        .insert(newTodoData)
        .select();
      if (insertErr) throw insertErr;

      const insertedTodo = insertedRows && insertedRows[0];
      if (!insertedTodo) throw new Error("No data returned from insert.");

      const query = `INSERT INTO todo (id, title, details, priority, status, created_at, created_by)\nVALUES (${nextId}, '${title.replace(/'/g, "''")}', '${description.replace(/'/g, "''")}', '${created_by_role}', 'Assigned', '${newTodoData.created_at}', ${created_by || 'NULL'});`;
      logSQL(query, 1);

      return res.json({
        message: "To-Do task created successfully.",
        todo: {
          id: insertedTodo.id,
          title: insertedTodo.title,
          description: insertedTodo.details || "",
          status: insertedTodo.status,
          created_at: insertedTodo.created_at,
          created_by_name: creator ? creator.name : "System Admin",
          created_by_role: created_by_role,
          remarks: insertedTodo.remarks || null,
          history: []
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to create to-do in Supabase." });
    }
  }

  const nextId = db.nextTodoId || (db.todos && db.todos.length > 0 ? Math.max(...db.todos.map(t => t.id)) + 1 : 101);
  db.nextTodoId = nextId + 1;

  const newTodo: TodoTask = {
    id: nextId,
    title,
    description,
    status: "Assigned",
    created_at: new Date().toISOString(),
    created_by_name,
    created_by_role,
    remarks: null,
    history: []
  };

  db.todos = db.todos || [];
  db.todos.push(newTodo);
  saveDb();

  const query = `INSERT INTO todos (id, title, description, status, created_at, created_by_name, created_by_role)\nVALUES (${nextId}, '${title.replace(/'/g, "''")}', '${description.replace(/'/g, "''")}', 'Assigned', '${newTodo.created_at}', '${created_by_name.replace(/'/g, "''")}', '${created_by_role}');`;
  logSQL(query, 1);

  res.json({ message: "To-Do task created successfully.", todo: newTodo });
});

// UPDATE A TODO AND RECORD HISTORY
app.post("/api/todos/:id/update", async (req, res) => {
  const todoIdParam = req.params.id;
  const { title, description, status, remarks, edited_by, created_by_role: new_created_by_role } = req.body;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: todo, error: fetchErr } = await supabase.from("todo").select("*").eq("id", todoIdParam).single();
      if (fetchErr || !todo) {
        return res.status(404).json({ error: "To-Do task not found in Supabase." });
      }

      const beforeState = {
        title: todo.title,
        description: todo.details || "",
        status: todo.status ? (todo.status.toLowerCase() === "finished" || todo.status.toLowerCase() === "completed" ? "Finished" : "Assigned") : "Assigned",
        remarks: todo.remarks || null
      };

      const originalStatus = beforeState.status;
      const isOriginallyFinished = originalStatus === "Finished";
      const isChangingStatus = status !== undefined && status !== originalStatus;
      
      if (isOriginallyFinished && isChangingStatus) {
        const isManagerOrAdmin = edited_by && (edited_by.includes("Manager") || edited_by.includes("Admin"));
        if (!isManagerOrAdmin) {
          return res.status(403).json({ error: "Only Managers and Admins can change the status of finished To-Do tasks." });
        }
      }

      const isEditingDescription = description !== undefined && description !== beforeState.description;
      const targetStatus = status !== undefined ? status : originalStatus;
      
      if (targetStatus === "Finished" && isEditingDescription) {
        return res.status(403).json({ error: "Description cannot be edited while status is Finished. Change status to Assigned first." });
      }

      const updatedFields: any = {
        title: title !== undefined ? title : todo.title,
        details: description !== undefined ? description : todo.details,
        status: status !== undefined ? status : todo.status,
        remarks: remarks !== undefined ? remarks : todo.remarks,
        updated_at: new Date().toISOString()
      };

      if (new_created_by_role !== undefined) {
        updatedFields.priority = new_created_by_role;
      }

      const hasChanges = 
        beforeState.title !== updatedFields.title ||
        beforeState.description !== (description !== undefined ? description : beforeState.description) ||
        beforeState.status !== updatedFields.status ||
        beforeState.remarks !== updatedFields.remarks;

      const { data: emps } = await supabase.from("employees").select("*");
      const employees = emps || [];

      let modified_by: number | null = null;
      if (edited_by) {
        const cleanEditorName = edited_by.split(" (")[0].trim();
        const foundEmp = employees.find(e => e.name.toLowerCase() === cleanEditorName.toLowerCase());
        if (foundEmp) {
          modified_by = foundEmp.id;
        }
      }

      if (edited_by && hasChanges) {
        const { data: allHistory } = await supabase.from("todos_history").select("id");
        const maxHistId = allHistory && allHistory.length > 0 ? Math.max(...allHistory.map(h => h.id)) : 0;
        const nextHistId = maxHistId + 1;

        const historyEntryData = {
          id: nextHistId,
          todo_id: todoIdParam,
          modified_by,
          modified_by_name: edited_by,
          modified_at: new Date().toISOString(),
          changes: {
            before: beforeState,
            after: {
              title: updatedFields.title,
              description: description !== undefined ? description : beforeState.description,
              status: updatedFields.status,
              remarks: updatedFields.remarks
            }
          }
        };

        const { error: histInsertErr } = await supabase.from("todos_history").insert(historyEntryData);
        if (histInsertErr) {
          console.warn("⚠️ Failed to write to todos_history table in Supabase:", histInsertErr.message);
        }
      }

      const { error: updateErr } = await supabase.from("todo").update(updatedFields).eq("id", todoIdParam);
      if (updateErr) throw updateErr;

      const query = `UPDATE todo\nSET title = '${updatedFields.title.replace(/'/g, "''")}', details = '${updatedFields.details.replace(/'/g, "''")}', status = '${updatedFields.status}', remarks = '${(updatedFields.remarks || "").replace(/'/g, "''")}'\nWHERE id = '${todoIdParam}';`;
      logSQL(query, 1);

      const { data: updatedHistoryRows } = await supabase
        .from("todos_history")
        .select("*")
        .eq("todo_id", todoIdParam)
        .order("modified_at", { ascending: false });

      const finalHistory = (updatedHistoryRows || []).map(h => {
        const modifier = employees.find(e => e.id === h.modified_by);
        const ed_by = modifier ? modifier.name : (h.modified_by_name || "System Admin");

        let before = {};
        let after = {};
        let rawChanges: string[] = [];

        let parsedChanges: any = null;
        if (h.changes) {
          if (typeof h.changes === 'string') {
            try {
              parsedChanges = JSON.parse(h.changes);
            } catch (e) {
              parsedChanges = h.changes;
            }
          } else {
            parsedChanges = h.changes;
          }
        }

        if (parsedChanges) {
          if (parsedChanges.before || parsedChanges.after) {
            before = parsedChanges.before || {};
            after = parsedChanges.after || {};
          } else if (Array.isArray(parsedChanges)) {
            rawChanges = parsedChanges.map(c => String(c));
          } else if (typeof parsedChanges === 'string') {
            rawChanges = [parsedChanges];
          } else {
            before = parsedChanges;
          }
        }

        return {
          timestamp: h.modified_at,
          edited_by: ed_by,
          before,
          after,
          rawChanges
        };
      });

      // Look up employee creator details based on integer created_by
      const creator = employees.find(e => e.id === todo.created_by);
      const created_by_name = creator ? creator.name : "System Admin";
      const savedPriority = todo.priority || "";
      const created_by_role = (savedPriority.includes("|for:") || savedPriority === "Admin" || savedPriority === "Manager" || savedPriority === "Accounts" || savedPriority === "Accounts Dept" || savedPriority === "Employee")
        ? savedPriority
        : (creator ? creator.role : "Admin");

      return res.json({
        message: "To-Do task updated successfully.",
        todo: {
          id: todo.id,
          title: updatedFields.title,
          description: description !== undefined ? description : beforeState.description,
          status: updatedFields.status,
          remarks: updatedFields.remarks,
          created_at: todo.created_at,
          created_by_name,
          created_by_role,
          history: finalHistory
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to update To-Do in Supabase." });
    }
  }

  const todoId = isNaN(Number(todoIdParam)) ? todoIdParam : Number(todoIdParam);
  const todos = db.todos || [];
  const todoIndex = todos.findIndex(t => t.id === todoId);
  if (todoIndex === -1) {
    return res.status(404).json({ error: "To-Do task not found." });
  }

  const todo = todos[todoIndex];

  const beforeState = {
    title: todo.title,
    description: todo.description,
    status: todo.status ? (todo.status.toLowerCase() === "finished" || todo.status.toLowerCase() === "completed" ? "Finished" : "Assigned") : "Assigned",
    remarks: todo.remarks || null
  };

  const originalStatus = beforeState.status;
  const isOriginallyFinished = originalStatus === "Finished";
  const isChangingStatus = status !== undefined && status !== originalStatus;
  
  if (isOriginallyFinished && isChangingStatus) {
    const isManagerOrAdmin = edited_by && (edited_by.includes("Manager") || edited_by.includes("Admin"));
    if (!isManagerOrAdmin) {
      return res.status(403).json({ error: "Only Managers and Admins can change the status of finished To-Do tasks." });
    }
  }

  const isEditingDescription = description !== undefined && description !== beforeState.description;
  const targetStatus = status !== undefined ? status : originalStatus;
  
  if (targetStatus === "Finished" && isEditingDescription) {
    return res.status(403).json({ error: "Description cannot be edited while status is Finished. Change status to Assigned first." });
  }

  const updatedFields: any = {
    title: title !== undefined ? title : todo.title,
    description: description !== undefined ? description : todo.description,
    status: status !== undefined ? status : todo.status,
    remarks: remarks !== undefined ? remarks : todo.remarks
  };

  if (new_created_by_role !== undefined) {
    updatedFields.created_by_role = new_created_by_role;
  }

  const hasChanges = 
    beforeState.title !== updatedFields.title ||
    beforeState.description !== updatedFields.description ||
    beforeState.status !== updatedFields.status ||
    beforeState.remarks !== updatedFields.remarks;

  if (edited_by && hasChanges) {
    const historyEntry: TodoTaskHistoryEntry = {
      timestamp: new Date().toISOString(),
      edited_by,
      before: beforeState,
      after: updatedFields
    };
    todo.history = todo.history || [];
    todo.history.push(historyEntry);
  }

  Object.assign(todo, updatedFields);
  saveDb();

  const query = `UPDATE todos\nSET title = '${todo.title.replace(/'/g, "''")}', description = '${todo.description.replace(/'/g, "''")}', status = '${todo.status}', remarks = '${(todo.remarks || "").replace(/'/g, "''")}'\nWHERE id = ${todoId};`;
  logSQL(query, 1);

  res.json({ message: "To-Do task updated successfully.", todo });
});

// DELETE A TODO
app.delete("/api/todos/:id", async (req, res) => {
  const todoIdParam = req.params.id;
  const deletedBy = req.query.deleted_by || req.body.deleted_by || "Manager";

  let todoItemToArchive: any = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.from("todo").select("*").eq("id", todoIdParam).single();
      if (data) {
        todoItemToArchive = {
          id: data.id,
          title: data.title || data.details || "Untitled",
          description: data.description || data.details || "",
          status: data.status || "Assigned",
          created_at: data.created_at || new Date().toISOString(),
          created_by_name: data.created_by_name || "System Admin",
          created_by_role: data.created_by_role || "Employee",
          remarks: data.remarks || ""
        };
      }
    } catch (err) {
      console.warn("Failed to pre-fetch todo for archiving:", err);
    }

    try {
      const { error } = await supabase.from("todo").delete().eq("id", todoIdParam);
      if (error) throw error;

      if (todoItemToArchive) {
        db.deletedTodos = db.deletedTodos || [];
        db.deletedTodos.push({
          ...todoItemToArchive,
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy
        });
        saveDb();
      }

      const query = `DELETE FROM todo WHERE id = '${todoIdParam}';`;
      logSQL(query, 1);

      return res.json({ success: true, message: `To-Do task #${todoIdParam} successfully deleted and archived.` });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to delete To-Do in Supabase." });
    }
  }

  const todoId = isNaN(Number(todoIdParam)) ? todoIdParam : Number(todoIdParam);
  const todos = db.todos || [];
  const todoIndex = todos.findIndex(t => t.id === todoId);
  if (todoIndex === -1) {
    return res.status(404).json({ error: "To-Do task not found." });
  }

  todoItemToArchive = todos[todoIndex];
  if (todoItemToArchive) {
    db.deletedTodos = db.deletedTodos || [];
    db.deletedTodos.push({
      ...todoItemToArchive,
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy
    });
  }

  todos.splice(todoIndex, 1);
  saveDb();

  const query = `DELETE FROM todos WHERE id = ${todoId};`;
  logSQL(query, 1);

  res.json({ success: true, message: `To-Do task #${todoId} successfully deleted and archived.` });
});

// FETCH DELETED TODOS
app.get("/api/todos/deleted", (req, res) => {
  const deletedTodos = db.deletedTodos || [];
  res.json(deletedTodos);
});

// Fetch Offline travels
app.get("/api/offline-travels", async (req, res) => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: travels, error: travelErr } = await supabase.from("offline_travels").select("*").order("id", { ascending: false });
      const { data: employees } = await supabase.from("employees").select("id, name");
      const { data: tasks } = await supabase.from("tasks").select("id, customer_name");

      if (travelErr) throw travelErr;

      const travelsWithTaskInfo = (travels || []).map(travel => {
        const emp = employees?.find(e => e.id === travel.employee_id);
        const task = tasks?.find(t => t.id === travel.task_id);
        return {
          ...travel,
          employee_name: emp ? emp.name : "Unknown",
          task_name: task ? task.customer_name : "Unknown Task"
        };
      });

      return res.json(travelsWithTaskInfo);
    } catch (e: any) {
      console.error("Failed to query travel logs from Supabase:", e);
    }
  }

  const travelsWithTaskInfo = (db.offline_travels || []).map(travel => {
    const emp = db.employees.find(e => e.id === travel.employee_id);
    const task = db.tasks.find(t => t.id === travel.task_id);
    return {
      ...travel,
      employee_name: emp ? emp.name : "Unknown",
      task_name: task ? task.customer_name : "Unknown Task"
    };
  }).sort((a, b) => b.id - a.id);
  
  res.json(travelsWithTaskInfo);
});

// Log travel sequence
app.post("/api/offline-travels", async (req, res) => {
  const { employee_id, task_id, km_travelled, remarks } = req.body;
  if (!employee_id || !task_id || km_travelled === undefined) {
    return res.status(400).json({ error: "Missing required fields for travel logging." });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const travel = {
        employee_id: Number(employee_id),
        task_id: Number(task_id),
        km_travelled: Number(km_travelled),
        remarks: remarks || null,
        created_at: new Date().toISOString()
      };

      const { data: insertedTravel, error: insertError } = await supabase
        .from("offline_travels")
        .insert(travel)
        .select()
        .single();

      if (insertError) throw insertError;

      const query = `INSERT INTO offline_travels (employee_id, task_id, km_travelled, remarks, created_at)\nVALUES (${employee_id}, ${task_id}, ${km_travelled}, '${(remarks||"").replace(/'/g, "''")}', '${travel.created_at}');`;
      logSQL(query, 1);

      const { data: employee } = await supabase.from("employees").select("name").eq("id", employee_id).single();
      const { data: task } = await supabase.from("tasks").select("customer_name").eq("id", task_id).single();

      return res.json({
        ...insertedTravel,
        employee_name: employee ? employee.name : "Unknown",
        task_name: task ? task.customer_name : "Unknown Task"
      });
    } catch (e: any) {
      return res.status(500).json({ error: translateSupabaseError(e, "offline_travels") });
    }
  } else {
    const newId = db.nextOfflineTravelId || 1;
    db.nextOfflineTravelId = newId + 1;
    
    const travel: OfflineTravel = {
      id: newId,
      employee_id: Number(employee_id),
      task_id: Number(task_id),
      km_travelled: Number(km_travelled),
      remarks: remarks || null,
      created_at: new Date().toISOString()
    };

    if (!db.offline_travels) db.offline_travels = [];
    db.offline_travels.push(travel);
    saveDb();

    const query = `INSERT INTO offline_travels (id, employee_id, task_id, km_travelled, remarks, created_at)\nVALUES (${newId}, ${employee_id}, ${task_id}, ${km_travelled}, '${(remarks||"").replace(/'/g, "''")}', '${travel.created_at}');`;
    logSQL(query, 1);

    const emp = db.employees.find(e => e.id === travel.employee_id);
    const task = db.tasks.find(t => t.id === travel.task_id);

    res.json({
      ...travel,
      employee_name: emp ? emp.name : "Unknown",
      task_name: task ? task.customer_name : "Unknown Task"
    });
  }
});

// Settings configuration
app.get("/api/settings", async (req, res) => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("settings").select("*").eq("key", "petrol_price").single();
      if (!error && data) {
        return res.json({ petrol_price: Number(data.value || 100) });
      }
    } catch (e: any) {
      console.warn("⚠️ settings table row not found or unconfigured inside Supabase, utilizing fallback value.");
    }
  }
  res.json(db.settings || { petrol_price: 100 });
});

app.post("/api/settings", async (req, res) => {
  const { petrol_price } = req.body;
  
  if (petrol_price !== undefined) {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("settings").upsert({ key: "petrol_price", value: String(petrol_price) });
        logSQL(`UPDATE settings\nSET petrol_price = ${petrol_price};`, 1);
        return res.json({ petrol_price: Number(petrol_price) });
      } catch (e: any) {
        return res.status(500).json({ error: "Failed to persist core settings parameters inside Supabase." });
      }
    } else {
      db.settings = { ...db.settings, petrol_price: Number(petrol_price) };
      saveDb();
      logSQL(`UPDATE settings\nSET petrol_price = ${petrol_price};`, 1);
    }
  }

  res.json(db.settings);
});

// Custom raw SQL engine endpoint (interprets basic SELECT statements, mimics SQL response format)
app.post("/api/sql/execute", async (req, res) => {
  let { query } = req.body;
  
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Empty query string" });
  }

  // Sanitize and normalize space
  query = query.trim().replace(/;+$/, "").replace(/\s+/g, " ");
  
  const normalized = query.toLowerCase();

  // Return structure matching relational queries
  try {
    if (isSupabaseConfigured && supabase) {
      const { data: employees } = await supabase.from("employees").select("*");
      const { data: tasks } = await supabase.from("tasks").select("*");

      if (normalized === "show tables" || normalized === "show schemas" || normalized === "help") {
        logSQL(query, 1);
        return res.json({
          columns: ["table_name", "row_count", "description"],
          rows: [
            { table_name: "employees", row_count: employees?.length || 0, description: "System engineers and technical experts in Supabase" },
            { table_name: "tasks", row_count: tasks?.length || 0, description: "Customer complaints and service tickets in Supabase" }
          ],
          message: "Available tables successfully described."
        });
      }

      if (normalized.startsWith("describe ") || normalized.startsWith("desc ")) {
        const table = normalized.split(" ")[1];
        logSQL(query, 1);
        if (table === "employees") {
          return res.json({
            columns: ["Field", "Type", "Null", "Key", "Default"],
            rows: [
              { Field: "id", Type: "INT", Null: "NO", Key: "PRI", Default: "NULL" },
              { Field: "name", Type: "VARCHAR(100)", Null: "NO", Key: "", Default: "NULL" },
              { Field: "role", Type: "VARCHAR(100)", Null: "NO", Key: "", Default: "NULL" },
              { Field: "joined_at", Type: "TIMESTAMP", Null: "NO", Key: "", Default: "CURRENT_TIMESTAMP" },
              { Field: "ended_at", Type: "TIMESTAMP", Null: "YES", Key: "", Default: "NULL" },
              { Field: "email_id", Type: "VARCHAR(100)", Null: "NO", Key: "UNI", Default: "NULL" },
              { Field: "password", Type: "VARCHAR(100)", Null: "NO", Key: "", Default: "NULL" }
            ]
          });
        } else if (table === "tasks") {
          return res.json({
            columns: ["Field", "Type", "Null", "Key", "Default"],
            rows: [
              { Field: "id", Type: "INT", Null: "NO", Key: "PRI", Default: "NULL" },
              { Field: "customer_name", Type: "VARCHAR(255)", Null: "NO", Key: "", Default: "NULL" },
              { Field: "contact_details", Type: "VARCHAR(255)", Null: "NO", Key: "", Default: "NULL" },
              { Field: "problem_reported", Type: "TEXT", Null: "NO", Key: "", Default: "NULL" },
              { Field: "assigned_to", Type: "INT", Null: "NO", Key: "MUL (FK)", Default: "NULL" },
              { Field: "status", Type: "VARCHAR(50)", Null: "NO", Key: "", Default: "'Pending'" },
              { Field: "assigned_at", Type: "TIMESTAMP", Null: "NO", Key: "", Default: "CURRENT_TIMESTAMP" },
              { Field: "accepted_at", Type: "TIMESTAMP", Null: "YES", Key: "", Default: "NULL" },
              { Field: "finished_at", Type: "TIMESTAMP", Null: "YES", Key: "", Default: "NULL" },
              { Field: "remarks", Type: "TEXT", Null: "YES", Key: "", Default: "NULL" }
            ]
          });
        } else {
          return res.status(404).json({ error: `Table '${table}' does not exist.` });
        }
      }

      if (normalized === "select * from employees") {
        logSQL(query, employees?.length || 0);
        return res.json({
          columns: ["id", "name", "role", "joined_at", "ended_at", "email_id", "password"],
          rows: employees || []
        });
      }

      if (normalized === "select * from tasks") {
        logSQL(query, tasks?.length || 0);
        return res.json({
          columns: ["id", "customer_name", "contact_details", "problem_reported", "assigned_to", "status", "assigned_at", "remarks"],
          rows: tasks || []
        });
      }

      if (
        normalized.includes("join") &&
        normalized.includes("tasks") &&
        normalized.includes("employees")
      ) {
        const joinedData = (tasks || []).map(t => {
          const emp = (employees || []).find(e => e.id === t.assigned_to);
          return {
            task_id: t.id,
            customer: t.customer_name,
            problem: t.problem_reported.slice(0, 30) + (t.problem_reported.length > 30 ? "..." : ""),
            status: t.status,
            engineer: emp ? emp.name : "None",
            role: emp ? emp.role : "None"
          };
        });

        logSQL(query, joinedData.length);
        return res.json({
          columns: ["task_id", "customer", "problem", "status", "engineer", "role"],
          rows: joinedData
        });
      }

      if (normalized.startsWith("select * from tasks where ")) {
        const clause = normalized.replace("select * from tasks where ", "").trim();
        let filtered = [...(tasks || [])];
        
        if (clause === "status = 'pending'") {
          filtered = (tasks || []).filter(t => t.status?.toLowerCase() === "pending");
        } else if (clause === "status = 'in progress'") {
          filtered = (tasks || []).filter(t => t.status?.toLowerCase() === "in progress");
        } else if (clause === "status = 'finished'") {
          filtered = (tasks || []).filter(t => t.status?.toLowerCase() === "finished");
        } else if (clause.startsWith("assigned_to =")) {
          const empId = Number(clause.split("=")[1].trim());
          filtered = (tasks || []).filter(t => t.assigned_to === empId);
        } else {
          throw new Error("Complex WHERE clauses not supported in this educational emulator. Try e.g. status = 'Pending'");
        }

        logSQL(query, filtered.length);
        return res.json({
          columns: ["id", "customer_name", "contact_details", "problem_reported", "assigned_to", "status"],
          rows: filtered
        });
      }
    } else {
      // Local fallback emulator
      if (normalized === "show tables" || normalized === "show schemas" || normalized === "help") {
        logSQL(query, 1);
        return res.json({
          columns: ["table_name", "row_count", "description"],
          rows: [
            { table_name: "employees", row_count: db.employees.length, description: "System engineers and technical experts" },
            { table_name: "tasks", row_count: db.tasks.length, description: "Customer complaints and service tickets" }
          ],
          message: "Available tables successfully described."
        });
      }

      if (normalized.startsWith("describe ") || normalized.startsWith("desc ")) {
        const table = normalized.split(" ")[1];
        logSQL(query, 1);
        if (table === "employees") {
          return res.json({
            columns: ["Field", "Type", "Null", "Key", "Default"],
            rows: [
              { Field: "id", Type: "INT", Null: "NO", Key: "PRI", Default: "NULL" },
              { Field: "name", Type: "VARCHAR(100)", Null: "NO", Key: "", Default: "NULL" },
              { Field: "role", Type: "VARCHAR(100)", Null: "NO", Key: "", Default: "NULL" },
              { Field: "joined_at", Type: "VARCHAR(100)", Null: "NO", Key: "", Default: "NULL" },
              { Field: "ended_at", Type: "VARCHAR(100)", Null: "YES", Key: "", Default: "NULL" },
              { Field: "email_id", Type: "VARCHAR(50)", Null: "NO", Key: "", Default: "NULL" },
              { Field: "password", Type: "VARCHAR(50)", Null: "NO", Key: "", Default: "NULL" }
            ]
          });
        } else if (table === "tasks") {
          return res.json({
            columns: ["Field", "Type", "Null", "Key", "Default"],
            rows: [
              { Field: "id", Type: "INT", Null: "NO", Key: "PRI", Default: "NULL" },
              { Field: "customer_name", Type: "VARCHAR(255)", Null: "NO", Key: "", Default: "NULL" },
              { Field: "contact_details", Type: "VARCHAR(255)", Null: "NO", Key: "", Default: "NULL" },
              { Field: "problem_reported", Type: "TEXT", Null: "NO", Key: "", Default: "NULL" },
              { Field: "assigned_to", Type: "INT", Null: "NO", Key: "MUL (FK)", Default: "NULL" },
              { Field: "status", Type: "VARCHAR(50)", Null: "NO", Key: "", Default: "'Pending'" },
              { Field: "assigned_at", Type: "TIMESTAMP", Null: "NO", Key: "", Default: "CURRENT_TIMESTAMP" },
              { Field: "accepted_at", Type: "TIMESTAMP", Null: "YES", Key: "", Default: "NULL" },
              { Field: "finished_at", Type: "TIMESTAMP", Null: "YES", Key: "", Default: "NULL" },
              { Field: "remarks", Type: "TEXT", Null: "YES", Key: "", Default: "NULL" }
            ]
          });
        } else {
          return res.status(404).json({ error: `Table '${table}' does not exist.` });
        }
      }

      if (normalized === "select * from employees") {
        logSQL(query, db.employees.length);
        return res.json({
          columns: ["id", "name", "role", "joined_at", "ended_at", "email_id", "password"],
          rows: db.employees
        });
      }

      if (normalized === "select * from tasks") {
        logSQL(query, db.tasks.length);
        return res.json({
          columns: ["id", "customer_name", "contact_details", "problem_reported", "assigned_to", "status", "assigned_at", "remarks"],
          rows: db.tasks
        });
      }

      if (
        normalized.includes("join") &&
        normalized.includes("tasks") &&
        normalized.includes("employees")
      ) {
        const joinedData = db.tasks.map(t => {
          const emp = db.employees.find(e => e.id === t.assigned_to);
          return {
            task_id: t.id,
            customer: t.customer_name,
            problem: t.problem_reported.slice(0, 30) + (t.problem_reported.length > 30 ? "..." : ""),
            status: t.status,
            engineer: emp ? emp.name : "None",
            role: emp ? emp.role : "None"
          };
        });

        logSQL(query, joinedData.length);
        return res.json({
          columns: ["task_id", "customer", "problem", "status", "engineer", "role"],
          rows: joinedData
        });
      }

      if (normalized.startsWith("select * from tasks where ")) {
        const clause = normalized.replace("select * from tasks where ", "").trim();
        let filtered = [...db.tasks];
        
        if (clause === "status = 'pending'") {
          filtered = db.tasks.filter(t => t.status === "Pending");
        } else if (clause === "status = 'in progress'") {
          filtered = db.tasks.filter(t => t.status === "In Progress");
        } else if (clause === "status = 'finished'") {
          filtered = db.tasks.filter(t => t.status === "Finished");
        } else if (clause.startsWith("assigned_to =")) {
          const empId = Number(clause.split("=")[1].trim());
          filtered = db.tasks.filter(t => t.assigned_to === empId);
        } else {
          throw new Error("Complex WHERE clauses not supported in this educational emulator. Try e.g. status = 'Pending'");
        }

        logSQL(query, filtered.length);
        return res.json({
          columns: ["id", "customer_name", "contact_details", "problem_reported", "assigned_to", "status"],
          rows: filtered
        });
      }
    }

    throw new Error(
      "Your query is well-formed, but this active environment supports structured relational reads (e.g., SELECT * FROM tasks, SELECT * FROM employees, SHOW TABLES, or tasks JOIN employees)."
    );

  } catch (err: any) {
    res.status(400).json({
      error: err.message || "Failed to execute SQL query check syntax."
    });
  }
});

// Reset backend database (Clears structures and completely seeds standard datasets)
app.post("/api/sql/reset", async (req, res) => {
  const initialEmployeesData = [
    { id: 101, name: "Rahul Sharma", role: "Desktop Engineer", joined_at: "2025-01-15", email_id: "rahul@pats.co.in", password: "pats@101", ended_at: null },
    { id: 102, name: "Sneha Patel", role: "Network Specialist", joined_at: "2025-01-15", email_id: "sneha@pats.co.in", password: "pats@102", ended_at: null },
    { id: 103, name: "David Miller", role: "System Administrator", joined_at: "2025-01-15", email_id: "david@pats.co.in", password: "pats@103", ended_at: null },
    { id: 104, name: "Anjali Rao", role: "Software Support Expert", joined_at: "2025-01-15", email_id: "anjali@pats.co.in", password: "pats@104", ended_at: null }
  ];

  const initialTasksData = [
    {
      id: 1001,
      customer_name: "Amitabh Mehra",
      contact_details: "+91 98765 43210 | amitabh@outlook.com",
      problem_reported: "Blue Screen of Death (BSOD) occurring repeatedly on boot. Hard drive diagnostics required.",
      assigned_to: 101,
      status: "Finished" as const,
      assigned_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      accepted_at: new Date(Date.now() - 47 * 3600 * 1000).toISOString(),
      finished_at: new Date(Date.now() - 45 * 3600 * 1000).toISOString(),
      remarks: "Replaced faulty RAM stick (DDR4 8GB). Cleaned the internal CPU dusting. System booted successfully under bench stress test.",
      address: "Flat 202, Royal Enclave, New Friends Colony, New Delhi",
      is_priority: false,
      km_travelled: 14.5,
      materials_carried: "RAM (8GB DDR4), Anti-Static Wrist Strap"
    },
    {
      id: 1002,
      customer_name: "Clarissa Fernandes",
      contact_details: "+91 87654 32109 | clarissa.f@yahoo.com",
      problem_reported: "Office network router configuration issues. Employees cannot access the shared file server over Wi-Fi.",
      assigned_to: 102,
      status: "In Progress" as const,
      assigned_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      accepted_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      finished_at: null,
      remarks: null,
      address: "Building 4B, Cyber City, Phase-2, Gurugram",
      is_priority: false,
      km_travelled: 0,
      materials_carried: "Cat6 Ethernet RJ45 Cables, Cisco Console Cable"
    },
    {
      id: 1003,
      customer_name: "Vikram Malhotra",
      contact_details: "+91 76543 21098 | v_malhotra@gmail.com",
      problem_reported: "Noisy SMPS fan and motherboard showing dry capacitor signs. Liquid cooling system refill needed.",
      assigned_to: 103,
      status: "Pending" as const,
      assigned_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      accepted_at: null,
      finished_at: null,
      remarks: null,
      address: "Sector 15, Block B, House 441, Noida",
      is_priority: true,
      km_travelled: 0,
      materials_carried: "Spare PSU (650W Corsair), Thermal Paste, Screwdriver Toolkit"
    }
  ];

  if (isSupabaseConfigured && supabase) {
    try {
      // Clear database tables securely
      await supabase.from("sql_logs").delete().neq("id", 0);
      await supabase.from("offline_travels").delete().neq("id", 0);
      await supabase.from("tasks").delete().neq("id", 0);
      await supabase.from("employees").delete().neq("id", 0);
      await supabase.from("settings").delete().neq("key", "");

      // re-seed values
      await supabase.from("employees").insert(initialEmployeesData);
      await supabase.from("tasks").insert(initialTasksData);
      await supabase.from("settings").insert({ key: "petrol_price", value: "100" });

      // Create an initial completed task travel log
      await supabase.from("offline_travels").insert([
        {
          employee_id: 101,
          task_id: 1001,
          km_travelled: 14.5,
          remarks: "Completion: Replaced faulty RAM stick (DDR4 8GB). Cleaned the internal CPU dusting. System booted successfully under bench stress test.",
          created_at: new Date(Date.now() - 45 * 3600 * 1000).toISOString()
        }
      ]);

      const resetMessage = "RESET DATABASE; -- Supabase schema fully cleared & seed parameters successfully re-populated.";
      logSQL(resetMessage, 1);

      return res.json({
        message: "Supabase database tables successfully reloaded and seeded.",
        data: {
          employees: initialEmployeesData,
          tasks: initialTasksData,
          settings: { petrol_price: 100 }
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: translateSupabaseError(e, "employees/tasks/settings") });
    }
  } else {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
    const schema = initDb();
    res.json({ message: "Database tables completely reloaded and seeded successfully.", data: schema });
  }
});

// Clear all employees and tasks from database
app.post("/api/sql/clear", async (req, res) => {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("sql_logs").delete().not("id", "is", null);
      await supabase.from("offline_travels").delete().not("id", "is", null);
      await supabase.from("tasks").delete().not("id", "is", null);
      await supabase.from("employees").delete().not("id", "is", null);
      await supabase.from("todos_history").delete().not("id", "is", null);
      await supabase.from("todo").delete().not("id", "is", null);

      logSQL("DELETE FROM tasks;\nDELETE FROM employees;\nDELETE FROM sql_logs;\nDELETE FROM todos_history;\nDELETE FROM todo;", 0);

      return res.json({
        message: "All tasks, engineers, logs, and to-dos have been successfully removed from your Supabase database.",
        data: { employees: [], tasks: [] }
      });
    } catch (e: any) {
      return res.status(500).json({ error: translateSupabaseError(e, "database") });
    }
  } else {
    db.employees = [];
    db.tasks = [];
    db.todos = [];
    db.nextTaskId = 1001;
    db.nextTodoId = 101;
    saveDb();
    logSQL("DELETE FROM tasks;\nDELETE FROM employees;\nDELETE FROM todos;", 0);
    res.json({ message: "All tasks, engineers, and to-do tasks have been successfully removed from the database.", data: db });
  }
});

// Vite server integrations
async function startServer() {
  // Vite developer middleware
  if (process.env.DISABLE_HMR === "true" || process.env.NODE_ENV === "production") {
    // Serves static production files
    const distPath = path.join(process.cwd(), "dist");
    
    // Fallback if compilation has not completed yet
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      // Dev mode fallback if dist folder is absent
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    }
  } else {
    // Normal dev server mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PATS Server running successfully!`);
    console.log(`  > Local:   http://localhost:${PORT}`);
    console.log(`  > Network: http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
