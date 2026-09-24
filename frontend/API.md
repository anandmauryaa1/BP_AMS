# API Reference & Endpoints

All REST APIs follow consistent JSON response wrappers:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message"
}
```

---

## 1. Authentication & Session

| Endpoint | Method | Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/auth/login` | `POST` | Public | Rate-limited username/password login; sets HTTP-only auth cookie |
| `/api/auth/logout` | `POST` | Authenticated | Clears auth session cookie |
| `/api/auth/me` | `GET` | Authenticated | Returns current authenticated user profile & active shift status |
| `/api/auth/change-password` | `POST` | Authenticated | Updates user password with Argon2id hash |

---

## 2. Attendance & Physical Presence

| Endpoint | Method | Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/attendance/today` | `GET` | Authenticated | Current day's shift status, session durations, and break history |
| `/api/attendance/check-in` | `POST` | Authenticated | Shift check-in with GPS coordinates (`latitude`, `longitude`) |
| `/api/attendance/check-out` | `POST` | Authenticated | Shift check-out (auto-terminates active work sessions) |
| `/api/attendance/break/start` | `POST` | Authenticated | Begins employee rest break |
| `/api/attendance/break/end` | `POST` | Authenticated | Ends rest break and resumes work shift |
| `/api/attendance/history` | `GET` | Authenticated | Monthly timesheet history with total calculated minutes |
| `/api/attendance/correction` | `POST` | Authenticated | Submits attendance correction request |

---

## 3. Work Sessions (Project Time Tracking)

| Endpoint | Method | Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/work-sessions/current` | `GET` | Authenticated | Returns currently active project timer and elapsed seconds |
| `/api/work-sessions/start` | `POST` | Authenticated | Starts work session on a project (`projectId`, `notes`) |
| `/api/work-sessions/switch` | `POST` | Authenticated | Closes prior session and begins new project session |
| `/api/work-sessions/end` | `POST` | Authenticated | Ends active work session |

---

## 4. Channels & Content Series

| Endpoint | Method | Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/channels` | `GET` | Authenticated | List all active YouTube, Instagram, Facebook broadcast channels |
| `/api/channels` | `POST` | Manager / Admin | Create new broadcast channel |
| `/api/channels/[id]` | `PATCH` | Manager / Admin | Update channel metadata |
| `/api/series` | `GET` | Authenticated | List content series (optional `?channelId=...` filter) |
| `/api/series` | `POST` | Manager / Admin | Create new content series playlist |

---

## 5. Master Content Projects & Deliverables

| Endpoint | Method | Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/projects` | `GET` | Authenticated | List master projects with filters (`status`, `channelId`, `priority`) |
| `/api/projects` | `POST` | Manager / Admin | Create new master project |
| `/api/projects/[id]` | `GET` | Authenticated | Retrieve project details, channel links, and lead assignee |
| `/api/projects/[id]` | `PATCH` | Authenticated | Update pipeline stage (`status`) or metadata |
| `/api/deliverables` | `GET` | Authenticated | List deliverables (`?projectId=...`, `?platform=...`) |
| `/api/deliverables` | `POST` | Manager / Admin | Add multi-platform output (Full video, Short, Reel) |
| `/api/deliverables/[id]` | `PATCH` | Authenticated | Update deliverable status or scheduled release date |

---

## 6. Tasks & Planning

| Endpoint | Method | Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/tasks` | `GET` | Authenticated | List tasks (`?assigneeId=...`, `?projectId=...`, `?status=...`) |
| `/api/tasks` | `POST` | Manager / Admin | Create production task |
| `/api/tasks/[id]` | `PATCH` | Authenticated | Update task stage or completion status |
| `/api/plans/daily` | `GET` | Authenticated | Get daily work queues for date (`?date=YYYY-MM-DD`) |
| `/api/plans/daily` | `POST` | Manager / Admin | Dispatch daily task queue and focus goal to employee |
| `/api/plans/monthly` | `GET` | Authenticated | Retrieve monthly channel video & short targets |
| `/api/plans/monthly` | `POST` | Manager / Admin | Set channel monthly volume goals |

---

## 7. Leaves & Administration

| Endpoint | Method | Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/leaves` | `GET` | Authenticated | List leave requests |
| `/api/leaves` | `POST` | Authenticated | Submit leave application |
| `/api/leaves/[id]` | `PATCH` | Manager / Admin | Approve or reject leave request |
| `/api/admin/employees` | `GET` | Admin / Super Admin | List all studio employees, designations, and roles |
| `/api/admin/employees` | `POST` | Admin / Super Admin | Register new employee |
| `/api/admin/employees/[id]/reset-password` | `POST` | Admin / Super Admin | Admin password reset |
| `/api/admin/reports` | `GET` | Admin / Super Admin | Production volume stats and attendance hours analytics |
| `/api/admin/audit-logs` | `GET` | Admin / Super Admin | Read audit event history |
