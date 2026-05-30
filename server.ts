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

// Database File Path
const DB_FILE = path.join(process.cwd(), "pats_database.json");

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

if (isSupabaseConfigured) {
  console.log("✅ Supabase is initialized. Active Live Connection Point:", supabaseUrl);
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
  km_travelled?: number;
  materials_carried?: string | null;
}

interface OfflineTravel {
  id: number;
  employee_id: number;
  task_id: number;
  km_travelled: number;
  remarks: string | null;
  created_at: string;
}

interface DatabaseSchema {
  employees: Employee[];
  tasks: Task[];
  offline_travels?: OfflineTravel[];
  nextTaskId: number;
  nextOfflineTravelId?: number;
  settings?: {
    petrol_price: number;
  };
}

function initDb(): DatabaseSchema {
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
            emp.joined_at = (emp as any).joined_at || "2025-01-15";
            if ((emp as any).email) {
              delete (emp as any).email;
            }
            updated = true;
          }
          if (updated) migrated = true;
          return emp;
        });
      }
      if (migrated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        console.log("Database employees migrated with clean access credentials and joining date successfully.");
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
    nextOfflineTravelId: 2,
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
    settings: {
      petrol_price: 100
    }
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));

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
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// REST Backend Endpoints 

// Unified login validation endpoint with credential checking
app.post("/api/login", async (req, res) => {
  const { email_id, password } = req.body;

  if (!email_id || !password) {
    return res.status(400).json({ error: "Email ID and password are required" });
  }

  const queryAdmin = `SELECT * FROM administrators WHERE email_id = '${email_id.replace(/'/g, "''")}' AND password = '${password.replace(/'/g, "''")}';`;
  const queryEmp = `SELECT * FROM employees WHERE email_id = '${email_id.replace(/'/g, "''")}' AND password = '${password.replace(/'/g, "''")}';`;

  // Check hardcoded admin credentials
  const isAdmin = (
    email_id.toLowerCase() === "admin@pats.co.in" || 
    email_id.toLowerCase() === "shrikant@pats.co.in" || 
    email_id.toLowerCase() === "shrikant b@pats.co.in"
  ) && password === "admin123";

  if (isAdmin) {
    logSQL(queryAdmin, 1);
    return res.json({
      user: { type: "admin", email_id: "shrikant@pats.co.in" },
      message: "Admin authentication successful (relational credentials match)."
    });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: employees, error } = await supabase
        .from("employees")
        .select("*")
        .ilike("email_id", email_id.trim())
        .eq("password", password.trim());

      if (error) throw error;

      if (employees && employees.length > 0) {
        const employee = employees[0];
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
    const employee = db.employees.find(
      e => e.email_id?.toLowerCase() === email_id.toLowerCase() && e.password === password
    );

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
  logSQL(`SELECT * FROM users WHERE email_id = '${email_id.replace(/'/g, "''")}' AND password = '${password.replace(/'/g, "''")}' LIMIT 1;`, 0);
  
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

// Get list of employees
app.get("/api/employees", async (req, res) => {
  const sql = "SELECT * FROM employees ORDER BY name ASC;";
  
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: employees, error } = await supabase.from("employees").select("*").order("name", { ascending: true });
      if (error) throw error;
      logSQL(sql, employees.length);
      return res.json(employees);
    } catch (e: any) {
      console.error("Failed to query employees from Supabase:", e);
    }
  }

  logSQL(sql, db.employees.length);
  res.json(db.employees);
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

// Admin updates task details
app.post("/api/tasks/:id/update", async (req, res) => {
  const taskId = Number(req.params.id);
  const { customer_name, contact_details, problem_reported, address } = req.body;

  if (!customer_name || !contact_details || !problem_reported) {
    return res.status(400).json({ error: "Customer name, contact details and problem reported are required." });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: task, error: fetchErr } = await supabase.from("tasks").select("*").eq("id", taskId).single();
      if (fetchErr || !task) {
        return res.status(404).json({ error: "Task not found." });
      }

      if (task.status === "Finished") {
        return res.status(400).json({ error: "Once a task is finished, the details cannot be updated." });
      }

      await supabase.from("tasks").update({
        customer_name,
        contact_details,
        problem_reported,
        address: address || ""
      }).eq("id", taskId);

      const query = `UPDATE tasks \nSET customer_name = '${customer_name.replace(/'/g, "''")}', contact_details = '${contact_details.replace(/'/g, "''")}', problem_reported = '${problem_reported.replace(/'/g, "''")}', address = '${(address || "").replace(/'/g, "''")}' \nWHERE id = ${taskId};`;
      logSQL(query, 1);

      const { data: employee } = await supabase.from("employees").select("name").eq("id", task.assigned_to).single();

      task.customer_name = customer_name;
      task.contact_details = contact_details;
      task.problem_reported = problem_reported;
      task.address = address || "";

      res.json({
        message: "Task details updated successfully.",
        task: {
          ...task,
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
    if (task.status === "Finished") {
      return res.status(400).json({ error: "Once a task is finished, the details cannot be updated." });
    }

    task.customer_name = customer_name;
    task.contact_details = contact_details;
    task.problem_reported = problem_reported;
    task.address = address || "";
    saveDb();

    const query = `UPDATE tasks \nSET customer_name = '${customer_name.replace(/'/g, "''")}', contact_details = '${contact_details.replace(/'/g, "''")}', problem_reported = '${problem_reported.replace(/'/g, "''")}', address = '${(address || "").replace(/'/g, "''")}' \nWHERE id = ${taskId};`;
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
    { id: 101, name: "Rahul Sharma", role: "Desktop Engineer", joined_at: "2025-01-15T09:00:00+00", email_id: "rahul@pats.co.in", password: "pats@101", ended_at: null },
    { id: 102, name: "Sneha Patel", role: "Network Specialist", joined_at: "2025-01-15T10:15:00+00", email_id: "sneha@pats.co.in", password: "pats@102", ended_at: null },
    { id: 103, name: "David Miller", role: "System Administrator", joined_at: "2025-01-15T08:30:00+00", email_id: "david@pats.co.in", password: "pats@103", ended_at: null },
    { id: 104, name: "Anjali Rao", role: "Software Support Expert", joined_at: "2025-01-15T11:00:00+00", email_id: "anjali@pats.co.in", password: "pats@104", ended_at: null }
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
      await supabase.from("sql_logs").delete().neq("id", 0);
      await supabase.from("offline_travels").delete().neq("id", 0);
      await supabase.from("tasks").delete().neq("id", 0);
      await supabase.from("employees").delete().neq("id", 0);

      logSQL("DELETE FROM tasks;\nDELETE FROM employees;\nDELETE FROM sql_logs;", 0);

      return res.json({
        message: "All tasks, engineers, and logs have been successfully removed from your Supabase database.",
        data: { employees: [], tasks: [] }
      });
    } catch (e: any) {
      return res.status(500).json({ error: translateSupabaseError(e, "database") });
    }
  } else {
    db.employees = [];
    db.tasks = [];
    db.nextTaskId = 1001;
    saveDb();
    logSQL("DELETE FROM tasks;\nDELETE FROM employees;", 0);
    res.json({ message: "All tasks and engineers have been successfully removed from the database.", data: db });
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

startServer();
