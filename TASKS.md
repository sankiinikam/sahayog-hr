# HRMS — Task Tracker

> Last updated: 2026-10-17

---

## Legend
- ✅ Done
- 🔄 In Progress
- ⏳ Pending
- ❌ Blocked
- 🧪 Needs Testing

---

## Phase 0 — Workspace Inspection & Planning

| # | Task | Status | Notes |
|---|------|--------|-------|
| 0.1 | Inspect environment (Python, Node, PostgreSQL, Flutter) | ✅ | |
| 0.2 | Create docs/ARCHITECTURE.md | ✅ | |
| 0.3 | Create docs/ERD.md | ✅ | |
| 0.4 | Create docs/DEVELOPMENT_PLAN.md | ✅ | |
| 0.5 | Create TASKS.md | ✅ | This file |
| 0.6 | Create .gitignore | 🔄 | |
| 0.7 | Create README.md | 🔄 | |
| 0.8 | Create .env.example | 🔄 | |

---

## Phase 1 — Backend Foundation

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | Create Python venv at `backend/venv/` | ✅ | Python 3.11.5 |
| 1.2 | Install requirements (Django 4.2, DRF, simplejwt, etc.) | ✅ | 45+ packages installed |
| 1.3 | Create Django project `config` in `backend/` | ✅ | |
| 1.4 | Split settings: base / development / production | ✅ | |
| 1.5 | Configure django-environ for .env loading | ✅ | |
| 1.6 | Database setup (PostgreSQL ready / SQLite active fallback) | ✅ | Migrations verified |
| 1.7 | Create `accounts` app | ✅ | |
| 1.8 | Custom User model extending AbstractBaseUser | ✅ | |
| 1.9 | UserProfile + Role models | ✅ | Role enum & helpers |
| 1.10 | DeviceSession model for refresh token tracking | ✅ | |
| 1.11 | JWT auth endpoints (login, logout, refresh, me) | ✅ | Fully tested |
| 1.12 | Password reset & change endpoints | ✅ | Anti-enumeration tested |
| 1.13 | Role-based DRF permission classes | ✅ | Server-side enforced |
| 1.14 | Health check endpoint `/api/v1/health/` | ✅ | Tested |
| 1.15 | OpenAPI schema via drf-spectacular | ✅ | Schema configured |
| 1.16 | Initial migrations | ✅ | Applied cleanly |
| 1.17 | Seed superuser script | ✅ | admin@hrms.local created |
| 1.18 | Auth tests (27 test cases) | ✅ | 27/27 passing |
| 1.19 | Run server verification | ✅ | System checks clean |
| 1.20 | Create `audit` app with AuditLog model | ✅ | Append-only immutable log |
| 1.21 | Create `approvals` app with ApprovalRequest stub | ✅ | Stub ready |
| 1.22 | Create `notifications` app | ✅ | Stub ready |

---

## Phase 2 — Desktop & Mobile Foundations

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Scaffold Electron + React + TS in `desktop/` | ✅ | Vite + TS + React 19 + Electron 44 |
| 2.2 | Configure secure Electron main process | ✅ | `contextIsolation: true`, `nodeIntegration: false` |
| 2.3 | Build restricted preload bridge | ✅ | Exposes safe `desktopApi` only |
| 2.4 | CSS design tokens & layout system | ✅ | Built professional HR suite shell |
| 2.5 | Login screen UI | ✅ | Connected with credentials display |
| 2.6 | Connect desktop login to API | ✅ | Axios + automatic JWT interceptor |
| 2.7 | Session storage & automatic token refresh | ✅ | Handled on 401 via `/api/v1/auth/refresh/` |
| 2.8 | App shell: sidebar + topbar + routing | ✅ | Modular sidebar navigation ready |
| 2.9 | Flutter SDK installation | ⏳ | Mobile setup ready once Flutter SDK is configured |
| 2.10 | Create Flutter project in `mobile/` | ⏳ | Feature-first structure planned |

---

## Phase 3 — Employee Management

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | Company, Department, Designation models + migrations | ✅ | All migrations applied |
| 3.2 | Employee model + migrations | ✅ | Complete lifecycle model |
| 3.3 | Employee CRUD API | ✅ | ViewSets with search/filters |
| 3.4 | Role-restricted employee permissions | ✅ | Strict row-level isolation |
| 3.5 | EmergencyContact sub-resource API | ✅ | Tested |
| 3.6 | Address sub-resource API | ✅ | Tested |
| 3.7 | EmployeeBankDetail API (restricted) | ✅ | Admin/HR restricted |
| 3.8 | EmployeeDocument upload and metadata | ✅ | Tested |
| 3.9 | Audit logging on employee changes | ✅ | Automated trigger in perform_create/update |
| 3.10 | Employment history API | ✅ | Tested |
| 3.11 | Employee directory desktop screen | ✅ | Search, refresh, live table |
| 3.12 | Employee profile desktop screen | ✅ | Profile view integrated |
| 3.13 | Employee create/edit form with validation | ✅ | Onboarding modal implemented |
| 3.14 | Employee tests (CRUD, isolation, role) | ✅ | All 5 automated tests passing |

---

## Phase 4 — Attendance & Leave

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | Shift + ShiftAssignment models | ✅ | Full schema implemented |
| 4.2 | AttendancePolicy model | ✅ | Late grace, OT, geofence rules |
| 4.3 | AttendancePunch + AttendanceRecord models | ✅ | Raw GPS punches & daily computed logs |
| 4.4 | Check-in / check-out API with validation | ✅ | Tested (duplicate & transition checks) |
| 4.5 | AttendanceCorrection + approval flow | ✅ | Linked to generic ApprovalRequest |
| 4.6 | LeaveType + LeavePolicy models | ✅ | Quotas, half-day, accrual |
| 4.7 | LeaveBalance + LeaveLedger models | ✅ | Immutable balance ledger & Decimal safety |
| 4.8 | LeaveRequest API | ✅ | Tested |
| 4.9 | Leave approval workflow | ✅ | Multi-tier atomic approvals |
| 4.10 | Balance service (debit/credit & reservation) | ✅ | Concurrency-safe (`select_for_update`) |
| 4.11 | Duplicate punch test | ✅ | Tested via pytest |
| 4.12 | Concurrent leave request test | ✅ | Overlapping requests blocked |
| 4.13 | Attendance desktop screens | ✅ | Live punch in/out and daily history |
| 4.14 | Leave management desktop screens | ✅ | Quota cards, apply modal, request history |
| 4.15 | Mobile check-in/out screen | ⏳ | Blocked by Flutter |
| 4.16 | Mobile leave screens | ⏳ | Blocked by Flutter |

---

## Phase 5 — Payroll

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | SalaryComponent + SalaryStructure models | ✅ | DecimalField precision & statutory flags |
| 5.2 | EmployeeSalaryAssignment (effective-dated) | ✅ | History tracking & ordering |
| 5.3 | PayrollPeriod + PayrollRun + PayrollLine models | ✅ | Stored calculation JSON snapshots |
| 5.4 | Payslip + PaymentRecord models | ✅ | Payslip numbers & publication status |
| 5.5 | Payroll calculation service | ✅ | Proration, rounding, net pay computations |
| 5.6 | Statutory placeholder calculations (PF/ESI/PT/TDS) | ✅ | Verified Indian statutory rules |
| 5.7 | Payroll approval workflow | ✅ | Multi-tier review and finalization |
| 5.8 | Payslip PDF generation / Print preview | ✅ | Printable payslip modal in Desktop UI |
| 5.9 | Payroll calculation accuracy tests | ✅ | Tested via pytest |
| 5.10 | Payslip authorization test | ✅ | Strict employee record isolation verified |
| 5.11 | Desktop payroll screens | ✅ | Fully integrated with printable slip modal |
| 5.12 | Mobile payslip screens | ⏳ | Blocked by Flutter |

---

## Phase 6 — Remaining Modules

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6.1 | Recruitment API + desktop | ✅ | JobRequisitions & Candidate pipeline |
| 6.2 | Onboarding tasks API + desktop | ✅ | Onboarding task checklist |
| 6.3 | Performance review schema | ✅ | Schema ready |
| 6.4 | Expense claims API + desktop | ✅ | Submissions & itemization |
| 6.5 | Asset management API + desktop | ✅ | Hardware / serial inventory |
| 6.6 | Employee exit / offboarding workflow | ✅ | Linked to generic ApprovalRequest |
| 6.7 | In-app notification system | ✅ | Real-time alerts & mark-as-read |
| 6.8 | Announcements | ✅ | Pinned broadcast system |
| 6.9 | Reports & Analytics API | ✅ | Headcount & payroll summary aggregations |

---

## Phase 7 — Production Hardening

| # | Task | Status | Notes |
|---|------|--------|-------|
| 7.1 | End-to-end acceptance test scenario | ✅ | 12-step master lifecycle test passed |
| 7.2 | Security audit (OWASP top 10) | ✅ | Documented in docs/SECURITY.md |
| 7.3 | Rate limiting validation | ✅ | DRF Throttles & punch burst protection verified |
| 7.4 | Desktop Windows standalone package build | ✅ | Built via electron-builder into release/win-unpacked/ |
| 7.5 | Android APK/AAB build | ⏳ | Mobile architecture documented; blocked by Flutter SDK on host |
| 7.6 | Deployment documentation | ✅ | Created comprehensive docs/DEPLOYMENT.md |
| 7.7 | Backup + restore test | ✅ | Created and verified scripts/backup_db.py |
| 7.8 | Database constraint review | ✅ | Verified Decimal precision, cascade protections & indices |

---

## Blockers

| # | Blocker | Impact | Resolution |
|---|---------|--------|------------|
| B1 | Flutter SDK not installed | Mobile development blocked | Install Flutter SDK manually |
| B2 | psql not on system PATH | Minor | Use explicit path or set PATH permanently |

