# PATS Computer Task Manager

An intelligent full-stack tasks and dispatch management platform tailored for field engineers, computer hardware repair technicians, and administrative operators of **PATS Computers Pvt Ltd**. 

The system provides separate workspaces for administrators and field engineers under a responsive, sleek, and high-performance user interface. It combines task delegation, status tracking, travel expense logging, petrol rate adjustments, and a visual transactional SQL logging terminal for audit compliance.

---

## 🎨 Design & Theme Principles
- **Modern Clean Workspace**: Styled with extensive custom palettes built using Tailwind CSS v4, supporting clear informational density.
- **Micro-interactions & Motion**: Guided by physical motion mechanics using `@motion` for state-change transitions, page navigation, and action confirmations.
- **Architectural Transparency**: Includes a real-time Audit Log detailing behind-the-scenes relational database actions, making troubleshooting and task flows fully transparent.

---

## 🚀 Key Feature Modules

### 1. 💼 Admin Dashboard Hub
- **Queue Administration**: Create, reassign, and delegate service tickets.
- **Engineers Control**: Live overview of engineer statuses, active assignments, and contact details.
- **Reports Terminal**: Aggregated metrics on service task completion rates, fuel expenditures, and individual performer summaries.
- **System Control Panel**: Update universal variables like standard petrol prices per kilometer and reset/populate seed data instantly.

### 2. 🔧 Service Engineer Workspace (Employee Dashboard)
- **Active Task Feed**: Engineers receive task details including customer name, physical address, reported problem, and priority level.
- **Lifecycle Progression**: Change statuses from *Assigned* to *Accepted* and *Finished* with integrated remark capture.
- **Travel Fuel log**: Calculate distance travelled and submit local petrol allowance receipts tracked in real time.

### 3. 🔍 Relational SQL Console & Database Explorer
- **Interactive SQL Client**: Run custom raw SQL statements directly in the client panel to edit state or extract metrics.
- **Live Audit Trail Logs**: Track each database simulation action chronically, showing execution timestamps, complete standard queries run, and total rows affected.
- **Schema Explorer**: Inspect system schemas for internal database tables (`employees`, `tasks`, `sql_logs`, and `settings`) cleanly.

---

## 🛠️ Technical Architecture

### Core Stack
- **Frontend library**: React 19
- **Bundler & Dev Server**: Vite 6
- **Styling**: Tailwind CSS v4 with modern postprocessing engine
- **Transitions and Physics**: Motion 12
- **Iconography**: Lucide React
- **Backend API Server**: Node.js & Express 4

### Pathing and Bundling Blueprint
```
/
├── server.ts                  # Fully integrated Node Express application API proxy & static asset server
├── index.html                 # Main application client document
├── metadata.json              # Application permission configuration & registry
├── package.json               # Modular script & package directory
└── src/
    ├── App.tsx                # Client structural entryway
    ├── index.css              # Main global stylesheet utilizing @import tailwindcss
    ├── types.ts               # Shared internal relational model schemas
    └── components/            # High-performance react views
        ├── LoginScreen.tsx
        ├── Header.tsx
        ├── AdminDashboard.tsx
        ├── EmployeeDashboard.tsx
        ├── DatabaseExplorerSection.tsx
        └── ... (other design views)
```

---

## ⚙️ Development & Build Guide

### Prerequisites
Make sure you have Node.js (version 18 or above) and npm installed.

### 1. Installation
Pull down standard project dependencies:
```bash
npm install
```

### 2. Run in Development Mode
Launches the full-stack system in development. This boots up the server-side API endpoints on `server.ts` powered by `tsx` (TypeScript Execute) on **Port 3000**:
```bash
npm run dev
```
Open your browser to `http://localhost:3000` to view the running app.

### 3. Production Build & Bundling
Create an optimized production-grade file layout. This builds the static React assets into `dist/` and runs `esbuild` to compile and bundle the server into `dist/server.cjs`:
```bash
npm run build
```

### 4. Running Production Bundle
Launch the production-bundled server using raw Node execution:
```bash
npm run start
```

---

## 📂 Useful Database Administration Queries

You can execute database queries directly using the **Relational SQL Client** terminal built inside the Database Explorer section.

### View All Connected Engineers
```sql
SELECT * FROM employees;
```

### Review Completed Hardware Tasks with Remarks
```sql
SELECT id, customer_name, problem_reported, remarks 
FROM tasks 
WHERE status = 'Finished';
```

### Log Manual Re-assignment of a Task
```sql
UPDATE tasks 
SET assigned_to = 2, status = 'Assigned' 
WHERE id = 101;
```

### Truncate / Clear the Simulation Database
```sql
DELETE FROM tasks;
DELETE FROM employees;
DELETE FROM sql_logs;
```
