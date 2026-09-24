# blindarea Production - Media Production Management & Employee Attendance System

A lightweight, secure, and production-ready **Media Production Management + Employee Attendance System** tailored for YouTube, Instagram, and Facebook multi-channel media operations.

Built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, and **MongoDB Atlas**, optimized for high speed, low-cost hosting (Vercel + MongoDB Atlas Free/Serverless), and intuitive mobile-first crew workflows.

---

## 🌟 Key Highlights

- **Dual-Engine Architecture**: Clean separation between **Office Attendance** (presence & geolocation shifts) and **Work Sessions** (project-level active time logging).
- **Multi-Channel Broadcast Hub**: YouTube, Instagram, and Facebook channel & series catalog management.
- **Master Content Pipeline**: Comprehensive production lifecycle tracking (`IDEA` $\to$ `SCRIPTING` $\to$ `SHOOTING` $\to$ `POST_PRODUCTION` $\to$ `REVIEW` $\to$ `PUBLISHED`).
- **Multi-Format Deliverables**: Manage 16:9 full-length episodes, 9:16 vertical Shorts/Reels, thumbnails, and community posts.
- **24 Production Task Stages**: Dedicated workflows for Video Editors, DOPs/Cinematographers, Scriptwriters, VFX/Thumbnail Artists, and SEO Specialists.
- **Hierarchical Planning**: Daily task queues, weekly sprint coordination, and monthly channel targets.
- **Production-Grade Security**: Argon2id password hashing, HTTP-only secure JWT cookies, rate limiting, and 4-tier Role-Based Access Control (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `EMPLOYEE`).

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ or 20+
- MongoDB Atlas cluster URI (or local MongoDB 6.0+)

### 2. Environment Configuration
Create `.env.local` in the project root:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.wu4kcx5.mongodb.net/attendance_db
JWT_SECRET=production_super_secure_jwt_secret_key_32chars_min
NEXT_PUBLIC_APP_NAME="blindarea Production"
NEXT_PUBLIC_COMPANY_NAME="blindarea Production"
NODE_ENV=development
```

### 3. Install & Seed Production Database

```bash
# Install dependencies
npm install

# Seed default channels, series, projects, deliverables, tasks, and users
npm run seed:prod
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Seeded Credentials (Password: `Admin@123`)

| Role | Username | Full Name | Designation |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin` | Anand | Studio Executive Director |
| **Admin** | `admin` | Operations Admin | Operations Manager |
| **Manager** | `producer_mike` | Mike Ross | Senior Video Producer |
| **Manager** | `creative_sarah`| Sarah Connor | Creative Director |
| **Employee** | `editor_alex` | Alex Rivera | Lead Video Editor |
| **Employee** | `dop_raj` | Raj Malhotra | Cinematographer (DOP) |
| **Employee** | `writer_emma` | Emma Watson | Tech Scriptwriter |
| **Employee** | `designer_leo` | Leo Vance | Thumbnail & VFX Artist |

---

## 📱 Application Modules

### For Crew & Editors (`/dashboard`)
1. **Live Attendance Clock**: One-click check-in with GPS geolocation tracking, break controls, and check-out.
2. **Active Work Session**: Select currently active video project to track editing or shooting hours without interrupting daily attendance.
3. **Daily Work Queue**: View tasks and focus goals dispatched by managers.
4. **Task Board (`/tasks`)**: Update editing status, request reviews, and view due dates.
5. **Leave Portal (`/leaves`)**: Apply for casual/sick leave and monitor approval status.

### For Managers & Admins (`/admin`)
1. **Executive Dashboard (`/admin/dashboard`)**: Live attendance roster, active work session timers, and production volume metrics.
2. **Channel & Series Manager (`/admin/channels`)**: Multi-channel broadcast properties and episodic playlists.
3. **Master Content Projects (`/admin/projects`)**: Production project pipelines with deliverables & task breakdowns.
4. **Task Dispatcher (`/admin/tasks`)**: Task assignment across editorial, camera, and design crew.
5. **Planning Center (`/admin/planning`)**: Daily dispatch queues, weekly sprints, and monthly video target setting.
6. **Release Calendar (`/admin/calendar`)**: Scheduled broadcast calendar across YouTube, Instagram, and Facebook.
7. **Attendance & Corrections (`/admin/attendance`)**: Employee timesheets, session logs, GPS map coordinates, and correction review.
8. **Leave Management (`/admin/leaves`)**: One-click leave approvals.
9. **Crew Roster (`/admin/employees`)**: User management, roles, and credential resets.
10. **Audit Logs (`/admin/audit-logs`)**: Complete tamper-evident audit trail of system events.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict mode)
- **Database**: MongoDB with Mongoose ODM
- **Styling**: Tailwind CSS + Glassmorphic Dark Design System
- **Testing**: Vitest (Unit & Integration tests)
- **Hashing**: `@node-rs/argon2`
- **Session Tokens**: `jose` (HS256 signed JWTs)

---

## 🧪 Testing

Run test suite:
```bash
npm run test
```

Run TypeScript verification:
```bash
npm run type-check
```
