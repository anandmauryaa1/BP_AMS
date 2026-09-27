# blindarea Production - Media Production Management & Employee Attendance System (BP_AMS)

A lightweight, secure, enterprise-grade **Media Production Management + Employee Attendance System** tailored for YouTube, Instagram, and Facebook multi-channel media studio operations.

---

## 📁 Monorepo Structure

`
BP_AMS/
├── frontend/             # Next.js 14 App Router + Tailwind CSS Web Client
│   ├── src/              # Pages, components, mobile-responsive layouts
│   ├── .env.example      # Frontend environment variables template
│   └── package.json
├── backend/              # Node.js Express + MongoDB API Service (Standard JavaScript)
│   ├── server.js         # Main Express HTTP server entry point
│   ├── routes/           # RESTful API route modules
│   ├── models/           # Mongoose schemas & data models
│   ├── middleware/       # JWT auth & RBAC middleware
│   ├── services/         # Business logic, analytics, notifications
│   ├── utils/            # Helper utilities
│   ├── scripts/          # Database seeding & clean scripts
│   ├── .env.example      # Backend environment variables template
│   └── package.json
├── package.json          # Root monorepo scripts
└── README.md
`

---

## 🌟 Key Features

1. **Dual-Engine Architecture**: Clean separation between physical shift attendance (geolocation, check-in, check-out, breaks) and cognitive work sessions (project-level active editing/filming time).
2. **Multi-Channel Media Pipeline**: YouTube, Instagram, Facebook channel tracking across full production cycles (IDEA $\to$ SCRIPTING $\to$ SHOOTING $\to$ POST_PRODUCTION $\to$ REVIEW $\to$ PUBLISHED).
3. **Mobile-First Experience**: High-speed touch-optimized card layout for shift check-ins, break management, leave tracking, and task execution with safe-area insets.
4. **Production-Grade Security**: Argon2id password hashing, HTTP-only secure JWT cookies, rate limiting, and 4-tier Role-Based Access Control (SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE).
5. **Modern Corporate Communication**: Clear, polite, professional notifications and centralized error handling with ISO timestamps.

---

## 🚀 Quick Setup

### 1. Backend Setup
`ash
cd backend
cp .env.example .env
npm install
npm run build
npm run dev
`

### 2. Frontend Setup
`ash
cd frontend
cp .env.example .env.local
npm install
npm run build
npm run dev
`
