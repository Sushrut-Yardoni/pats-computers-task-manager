# Software Repository & IT Provisioning Groups

Enable Admin and Service Head users to upload installer packages, register cloud download links, and compose standard IT provisioning software groups that field engineers can access and deploy during on-site customer service visits.

> [!IMPORTANT]
> **User Review & Confirmed Decisions**
> 
> The following architectural decisions were confirmed through interactive clarification:
> - **Upload & Storage Support**: Dual support for direct binary installer files (EXE, MSI, ZIP, DMG, APK, scripts) up to 50MB and cloud download URLs (Google Drive, OneDrive, Dropbox, vendor CDN) with license keys and installation notes.
> - **Grouping Model**: Standard IT Provisioning Profiles (e.g., Standard Client Workstation, Executive Suite, Accounts & Billing Pack, Antivirus & Security Suite, Developer Toolkit) tailored for quick deployment during engineer service visits.
> - **Access & Permissions**: Admin and Service Head maintain full CRUD management and upload privileges, while field Engineers have dedicated read, search, license copy, and single-click download access directly from their service portal and ticket details.

---

## 1. Overview & Core Concept

### What It Does
This feature introduces a centralized **Software & Provisioning Hub** into the PATS enterprise service platform. Admin and Service Head staff can catalog enterprise software, upload local installers or attach external mirrors, store license keys and silent install commands, and group them into **Provisioning Profiles**. When engineers visit clients for AMC maintenance, workstation deployment, or troubleshooting, they can instantly look up the required profile, download all installers, view license keys, and track installation status.

### Target Audience & Persona
- **Service Head & Admin**: Maintain the organization's official software library, curate standardized bundles for clients and workstation types, update versions, and enforce software licensing compliance.
- **Field Engineers & Technicians**: Access curated software kits on mobile or laptop during service visits without searching across fragmented cloud drives or thumbdrives.

### Key Value
- Eliminates reliance on lost USB drives and unvetted download links.
- Ensures consistent workstation configurations across AMC client sites.
- Accelerates on-site ticket resolution by having verified installation files, license keys, and commands readily accessible in one unified portal.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ADMIN & SERVICE HEAD FLOW                       │
│                                                                        │
│  [Software Hub Tab] ──► [Catalog Grid / Table]                         │
│           │                     │                                      │
│           ├─► "Upload Software" ┴─► File/URL + Metadata + License Key  │
│           │                                                            │
│           └─► "New Software Group" ──► Select Items ──► Save Profile   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Available to
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          FIELD ENGINEER FLOW                           │
│                                                                        │
│  [Employee Portal / Task View] ──► [Software & Provisioning Kit]       │
│                                           │                            │
│  [Quick Search / Filter] ◄────────────────┘                            │
│           │                                                            │
│           ├─► One-Click Installer Download / Mirror Link               │
│           ├─► Copy License Key & Silent Install Commands               │
│           └─► Mark Installed for Current Workstation / Ticket          │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Software Hub Navigation**:
   - Both Admin and Service Head sidebars receive a dedicated **Software Hub** navigation tab with active count indicators.
   - The view features a segmented view switcher: **Provisioning Groups** (profiles view) and **All Software Library** (itemized repository).

2. **Uploading & Adding Software**:
   - A modal allows uploading a local installer file (drag & drop with progress feedback) OR toggling to an external mirror/cloud URL.
   - Fields include: Software Name, Version, Category (Antivirus, Productivity, OS & Drivers, Browsers, Utilities, Remote Support, Accounting), Architecture (Windows 64-bit, 32-bit, macOS, Linux, Multi-platform), File Size, License / Product Key (masked with quick reveal/copy), and Silent Install Command or Notes.

3. **Creating & Managing Provisioning Groups**:
   - Service Heads and Admins can build named bundles (e.g. *"Standard AMC Workstation Kit"*, *"Tally & Accounting Stack"*, *"Executive Laptop Setup"*).
   - Multi-select interface with search, allowing drag or toggle selection of softwares.
   - Option to mark individual items in a group as *Mandatory* or *Optional*.

4. **Engineer Access Experience**:
   - In the Engineer Dashboard, a quick drawer / tab titled **Software Kit** enables engineers to search by client need, select a provisioning group, download all files or specific packages, copy license keys in one tap, and inspect setup guidelines without needing administrative privileges.

### Visual Identity & Theme
- Following `frontend-design` and `3_saas_dashboard.md` guidelines:
  - **Zero-Pill Discipline**: Metadata (version, size, category, platform) is displayed as clean unboxed typographic metadata with subtle interpuncts (`Windows · v14.2 · 45 MB · Antivirus`), never rounded candy capsules.
  - **Typography**: Clean hierarchy with tabular figures for file sizes and version numbers (`font-mono tabular-nums`).
  - **Palette**: Slate/indigo corporate palette adhering to the existing PATS design system (teal/blue primary actions, neutral borders, WCAG AA compliance).
  - **Surface Structure**: Single-elevation flat panels with hairline borders (`border border-slate-200 dark:border-slate-800`), avoiding nested card sandwiches.
  - **Interactive States**: Clean search filters, empty states with clear calls to action, upload drop-zones with clear drag-and-drop feedback.

---

## 3. Key Product Decisions & Trade-Offs

- **Storage Architecture: Hybrid Disk + URL Mirrors**:
  - *Chosen Approach*: Binary installers uploaded directly are stored on the server filesystem under `public/uploads/softwares/` and registered with metadata in `pats_database.json`. For large ISOs or third-party proprietary installers, external cloud URLs (OneDrive, Drive, vendor links) are supported seamlessly.
  - *Why*: Allows rapid deployment of lightweight utility scripts, batch files, remote assistance clients, and standard tools without exceeding server memory, while accommodating heavy installations through verified cloud mirrors.
  - *Trade-off*: Server upload endpoint configured with 50MB payload limit to preserve responsive server performance in dev and preview containers.

- **Role Authorization Model**:
  - *Chosen Approach*: Strict role gating. Admin and Service Head roles have write/update/delete capabilities on softwares and software groups. Engineers have read, search, license copy, and download access.
  - *Why*: Prevents accidental deletion or modification of baseline enterprise standards while providing field technicians instant access.

- **Association with Tasks & Companies**:
  - *Chosen Approach*: Software groups can optionally be linked to Company Asset records or Task tickets as standard provisioning checklists.
  - *Why*: Enables engineers opening a task for an AMC company to immediately see the assigned software bundle for that workstation type.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT ARCHITECTURE                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   AdminDashboard.tsx              ServiceHeadDashboard.tsx             │
│          │                                  │                          │
│          ▼                                  ▼                          │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │               SoftwareHubSection.tsx                          │    │
│   │  ┌─────────────────────────┐  ┌────────────────────────────┐  │    │
│   │  │ SoftwareGroupsList.tsx  │  │ SoftwareCatalogTable.tsx   │  │    │
│   │  └─────────────────────────┘  └────────────────────────────┘  │    │
│   │  ┌─────────────────────────┐  ┌────────────────────────────┐  │    │
│   │  │ SoftwareGroupModal.tsx  │  │ SoftwareUploadModal.tsx    │  │    │
│   │  └─────────────────────────┘  └────────────────────────────┘  │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                        │
│   EmployeeDashboard.tsx ──► EngineerSoftwareKitModal.tsx               │
│                                                                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          SERVER & PERSISTENCE                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Express Server (server.ts)                                            │
│   ├── GET  /api/softwares                (List all softwares)          │
│   ├── POST /api/softwares                (Create / upload software)    │
│   ├── PUT  /api/softwares/:id            (Update software & licenses)  │
│   ├── DEL  /api/softwares/:id            (Delete software entry)       │
│   ├── GET  /api/softwares/:id/download   (Serve installer binary)      │
│   ├── GET  /api/software-groups          (List provisioning groups)    │
│   ├── POST /api/software-groups          (Create provisioning group)   │
│   ├── PUT  /api/software-groups/:id      (Update group & items)        │
│   └── DEL  /api/software-groups/:id      (Delete provisioning group)   │
│                                                                        │
│  Data Stores:                                                          │
│   ├── Database: pats_database.json (schema: softwares, software_groups)│
│   └── Filesystem: public/uploads/softwares/ (installer binaries)       │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model Definitions (`src/types.ts`)

```typescript
export interface SoftwareItem {
  id: number;
  name: string;
  version: string;
  category: "Antivirus" | "Productivity" | "OS & Drivers" | "Browsers" | "Utilities" | "Remote Support" | "Accounting" | "Other";
  platform: "Windows" | "macOS" | "Linux" | "Android" | "All";
  description?: string;
  storage_type: "file" | "url";
  file_url?: string; // Relative path or external mirror URL
  file_name?: string;
  file_size?: string; // Formatted e.g. "42.5 MB"
  license_key?: string;
  silent_install_command?: string;
  installation_notes?: string;
  created_by: string;
  created_by_role: string;
  created_at: string;
  updated_at: string;
}

export interface SoftwareGroupItem {
  software_id: number;
  is_mandatory: boolean;
  notes?: string;
}

export interface SoftwareGroup {
  id: number;
  name: string;
  description: string;
  target_profile: "Standard Workstation" | "Executive / Laptop" | "Accounting & Finance" | "Design & CAD" | "Development" | "Retail / POS" | "Custom";
  items: SoftwareGroupItem[];
  created_by: string;
  created_by_role: string;
  created_at: string;
  updated_at: string;
}
```

### Implementation Steps

1. **Types & Database Schema**:
   - Add `SoftwareItem`, `SoftwareGroup`, and `SoftwareGroupItem` interfaces to `src/types.ts`.
   - Update `server.ts` `DatabaseSchema` to include `softwares: SoftwareItem[]` and `software_groups: SoftwareGroup[]` with seed presets (Standard Office, Chrome/Firefox, AnyDesk/TeamViewer, Essential Antivirus).

2. **Server Endpoints & File Upload Handling**:
   - Configure Express request body limit (`50mb`) and static route for `/uploads/softwares`.
   - Implement RESTful endpoints for CRUD on `/api/softwares` and `/api/software-groups`.
   - Provide file download streaming handler with correct `Content-Disposition`.

3. **Software Hub Component (`SoftwareHubSection.tsx`)**:
   - Build dual-tab view: Provisioning Profiles and Software Repository.
   - Search bar, category filter, platform filter, and quick stats (Total Softwares, Provisioning Profiles, Storage Used).
   - Action triggers for "Upload Software" and "Create Software Group".

4. **Creation & Edit Modals**:
   - `SoftwareUploadModal.tsx`: Form for binary upload or external URL, category picker, license key visibility toggle, install command field.
   - `SoftwareGroupModal.tsx`: Provisioning bundle composer with search, multi-selection, mandatory/optional flags, and description.

5. **Integration with Admin & Service Head Dashboards**:
   - Add `software` tab button with `Package` or `Boxes` icon in both `AdminDashboard.tsx` and `ServiceHeadDashboard.tsx` sidebars.
   - Render `SoftwareHubSection` with current user context and permissions.

6. **Engineer Access in Employee Portal (`EmployeeDashboard.tsx`)**:
   - Add a "Software & Provisioning Kit" button / modal in the Engineer view, allowing field engineers to browse provisioning groups, copy license keys, and download installers while working on assigned tickets.
