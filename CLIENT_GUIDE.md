# Blindarea Production - AMS (Attendance & Media Production Management System)
## 📖 Client User Manual & Operating Guide

Welcome to the **Blindarea Production AMS** documentation. This enterprise web application unites **Media Production Pipeline Management** (YouTube, Instagram, Facebook content), **Real-Time Employee Attendance & Duty Tracking**, **Task Assignment & Deliverable Review**, **HR & Leave Management**, and **Automated Payroll & Salary Processing**.

---

## 📑 Table of Contents
1. [System Architecture & Roles](#1-user-roles--access-matrix)
2. [Getting Started & Login](#2-getting-started--login)
3. [For Employees & Crew Members](#3-employee--crew-guide)
   - [3.1 Daily Attendance & Check-In/Check-Out](#31-daily-attendance--break-tracking)
   - [3.2 Daily Work Plan & Daily Reports](#32-daily-work-plan--eod-reporting)
   - [3.3 My Tasks & Submitting Deliverable Output Links](#33-my-tasks--submitting-output-links)
   - [3.4 Applying for Leaves & Tracking Balance](#34-leaves--time-off)
   - [3.5 Payslips & Salary Loans](#35-payslips--salary-advances)
4. [For Managers & Project Leads](#4-manager--lead-guide)
   - [4.1 Project & Content Pipeline Management](#41-project--content-pipeline)
   - [4.2 Creating & Managing Multi-Format Deliverables](#42-multi-format-deliverables--output-links)
   - [4.3 Task Delegation & Crew Assignment](#43-task-delegation--crew-assignment)
   - [4.4 Content Release Calendar](#44-content-release-calendar)
5. [For System Administrators](#5-administrator-guide)
   - [5.1 Executive Dashboard & Production Metrics](#51-executive-dashboard)
   - [5.2 Employee Onboarding & HCM Management](#52-employee-onboarding--directory)
   - [5.3 Attendance Monitoring & Regularization](#53-attendance-monitoring)
   - [5.4 Payroll Execution & Salary Slips Generation](#54-payroll-processing--salary-slips)
   - [5.5 System Settings & Channels Configuration](#55-system-settings--channels)
   - [5.6 Compliance Exports & Audit Logs](#56-compliance-reports--audit-trail)
6. [Frequently Asked Questions & Troubleshooting](#6-faq--troubleshooting)

---

## 1. User Roles & Access Matrix

| Feature / Module | 👤 Employee / Crew | 👔 Manager / Lead | 👑 Admin / Owner |
| :--- | :---: | :---: | :---: |
| **Attendance Check-In / Break / Check-Out** | ✅ | ✅ | ✅ |
| **Daily Plan & Task Submissions** | ✅ | ✅ | ✅ |
| **Deliverable Output Link Attachments** | ✅ (Assigned) | ✅ | ✅ |
| **View Own Payslips & Apply Leaves** | ✅ | ✅ | ✅ |
| **Create Projects & Deliverables** | ❌ | ✅ | ✅ |
| **Assign Tasks & Review Output** | ❌ | ✅ | ✅ |
| **Content Release Calendar** | View Only | ✅ | ✅ |
| **Approve Leaves & Offboarding** | ❌ | ✅ | ✅ |
| **Employee Directory & Salary Setup** | ❌ | ❌ | ✅ |
| **Run Monthly Payroll & Tax Engine** | ❌ | ❌ | ✅ |
| **Audit Logs & System Settings** | ❌ | ❌ | ✅ |

---

## 2. Getting Started & Login

1. **Access the Portal**: Navigate to your instance URL (e.g., `http://localhost:3000` or production domain).
2. **Sign In**: Enter your **Employee ID / Username / Email** and **Password**.
3. **Role-Based Routing**:
   - **Admins** land directly on the **Executive Command Center** (`/admin/dashboard`).
   - **Managers** land on the **Production Pipeline** (`/admin/projects`).
   - **Employees** land on their personal **Duty & Work Station** (`/dashboard` or `/tasks`).
4. **First-Time Login**: If your temporary password was issued by HR, you will be prompted to set a secure password upon initial sign-in.

---

## 3. Employee & Crew Guide

### 3.1 Daily Attendance & Break Tracking
- **Check In**: Click the green **"Check In"** button upon starting your shift. The system timestamps your arrival and verifies office location.
- **Taking a Break**: Click **"Start Break"** (e.g. Lunch / Tea). Click **"End Break"** upon returning. All break intervals are calculated automatically.
- **Check Out**: Click **"Check Out"** at the conclusion of your shift. Total daily working minutes are logged toward your payroll.

### 3.2 Daily Work Plan & EOD Reporting
- At the start of each morning, open the **Daily Plan** widget.
- List your targeted video edits, thumbnail assets, scripts, or sound design goals.
- Check off items as you complete them throughout the day.

### 3.3 My Tasks & Submitting Output Links
1. Navigate to **"My Assigned Work"** (`/tasks`).
2. Click on the task you are actively working on (e.g. *Episode 14 Video Editing*).
3. Change status from `TODO` $\to$ `IN_PROGRESS` $\to$ `IN_REVIEW`.
4. **Attaching Deliverables / Output**:
   - Paste your **Google Drive folder link** (for raw cuts, project files, or B-roll).
   - Paste your **Google Doc / Script link** (for script drafts or revision notes).
   - Paste your **Master Output Asset URL** (Dropbox / Frame.io / S3 render).
   - Add any cut notes or reviewer remarks in the **Notes** box.
5. Click **"Submit Task"**. Your manager and admin will receive an instant notification to review the output.

### 3.4 Leaves & Time-Off
1. Navigate to **"Leaves"** (`/leaves`).
2. View your remaining balance for **Casual Leave**, **Sick Leave**, and **Earned Leave**.
3. Click **"Apply for Leave"**, select date range and reason, and submit for Manager/Admin review.

### 3.5 Payslips & Salary Advances
1. Navigate to **"My Profile & Salary"**.
2. View past monthly salary disbursements and download itemized PDF payslips.
3. Request **Salary Advances / Loans** when needed with auto-repayment schedules.

---

## 4. Manager & Lead Guide

### 4.1 Project & Content Pipeline
1. Navigate to **"Projects"** (`/admin/projects`).
2. Click **"+ New Project"** to create a master video production.
3. Choose the associated **Channel** (e.g., *Main YouTube Channel*, *Hindi Shorts Channel*) and optional **Series**.
4. Set the **Production Stage**:
   - `IDEA` $\to$ `RESEARCH` $\to$ `SCRIPTING` $\to$ `PRE_PRODUCTION` $\to$ `SHOOTING` $\to$ `POST_PRODUCTION` $\to$ `REVIEW` $\to$ `READY_FOR_RELEASE` $\to$ `PUBLISHED`.
5. Assign a **Crew Lead** responsible for driving the project to completion.

### 4.2 Multi-Format Deliverables & Output Links
Each Project produces one or more output formats (Longform video, YouTube Shorts, Instagram Reels, Facebook Video, Community Posts).

1. Open the project detail page (`/admin/projects/[id]`).
2. In the **Deliverables** column on the left:
   - Click **"+ Add Output"** to define a new deliverable (Platform, Format, Aspect Ratio, Target Duration).
   - Provide the **Google Drive Link**, **Google Doc Link**, or **Output File URL**.
3. **Reviewing Deliverables**:
   - Click **"Open"** on the green **Google Drive** or blue **Doc / Script** badge to review files directly in Google Drive/Docs.
   - Click the **"Copy"** button to copy any link to your clipboard.
   - Click **"Links & Details"** (`Edit3`) to attach updated render links or revision notes.
   - Change deliverable status to `READY_FOR_REVIEW`, `APPROVED`, or `PUBLISHED`.

### 4.3 Task Delegation & Crew Assignment
1. On the project page, click **"+ Add Task"** in the **Production Tasks** column.
2. Select task type (*Scriptwriting*, *Studio Shoot*, *Video Editing*, *Thumbnail Design*, *Sound Design*, *SEO Metadata*).
3. Assign the crew member and specify estimated completion minutes.
4. When the crew member finishes work, their submitted output links will appear right on the task card for instant QA.

### 4.4 Content Release Calendar
1. Navigate to **"Content Calendar"** (`/admin/calendar`).
2. View all scheduled video releases across the month filtered by Channel or Platform.
3. Click on any scheduled release card:
   - Access **Google Drive**, **Doc / Script**, **Output Asset**, and **Live Video URL** badges.
   - Use **"Edit Links"** to update asset links on the fly without leaving the calendar.
   - Change release status (`APPROVED` $\to$ `SCHEDULED` $\to$ `PUBLISHED`).

---

## 5. Administrator Guide

### 5.1 Executive Dashboard
- Real-time attendance counters (Present, On Break, On Leave, Absent).
- Production throughput metrics: active projects, pending reviews, scheduled vs. published videos.
- 7-day and 30-day velocity trends.

### 5.2 Employee Onboarding & Directory
1. Navigate to **"HCM & Directory"** (`/admin/hcm` or `/admin/employees`).
2. Click **"+ Add Employee"** to register new crew members.
3. Configure role (`EMPLOYEE`, `MANAGER`, `ADMIN`), department (*Video Editing*, *Production*, *Animation*, *Scriptwriting*), and base salary structures.
4. Manage document verification (ID proofs, employment contracts) and asset clearance upon offboarding.

### 5.3 Attendance Monitoring
- Inspect real-time check-ins and break durations across the entire team.
- Regularize missed check-outs or manual attendance adjustments.

### 5.4 Payroll Processing & Salary Slips
1. Navigate to **"Payroll"** (`/admin/payroll`).
2. Run automated monthly payroll engine:
   - Automatically calculates **Payable Days**, **Loss of Pay (LOP)** deductions from unapproved absences.
   - Computes **HRA**, **Allowances**, and **TDS / Tax Deductions**.
   - Incorporates approved **Salary Loan EMIs**.
3. Lock payroll run and disburse itemized salary slips.

### 5.5 System Settings & Channels Configuration
1. Navigate to **"Channels"** (`/admin/channels`) to manage media properties (YouTube channels, Instagram handles, Facebook pages).
2. Configure series, branding tags, and default aspect ratios.
3. Configure office geo-coordinates for attendance verification under **"Settings"** (`/admin/settings`).

### 5.6 Compliance Reports & Audit Trail
- Download compliance-ready CSV reports for attendance, project output, and payroll.
- Review **Audit Logs** (`/admin/audit-logs`) to monitor all system security and permission changes.

---

## 6. FAQ & Troubleshooting

#### Q: Where do I find the Google Drive link submitted by my editor?
**A**: Open the project page at `/admin/projects/[id]`. In both the **Deliverables** and **Production Tasks** sections, click the green **"Google Drive"** badge. You can also click the same link directly in `/admin/calendar` or `/admin/tasks`.

#### Q: How do I attach multiple Google Drive / Doc links to a deliverable?
**A**: Click the **"Links & Details"** button on any deliverable card. You can provide distinct URLs for your **Google Drive Folder**, **Google Doc / Script**, **Master Output File**, and **Live Published URL**.

#### Q: What if an employee forgets to check out?
**A**: An Administrator or Manager can open the Attendance management tab and manually regularize the check-out timestamp.

#### Q: How to restart the application locally?
- Run `npm run dev:frontend` for the Next.js frontend on `http://localhost:3000`.
- Run `npm run dev:backend` for the Express API backend on `http://localhost:5000`.
