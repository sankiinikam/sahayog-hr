# HRMS Development Plan

> **Version:** 1.0.0 | **Started:** 2026-10-17

---

## Environment Summary

| Item | Status | Detail |
|------|--------|--------|
| Python | ✅ Available | 3.11.5 via `py` launcher |
| Node.js | ✅ Available | v24.14.1 |
| npm | ✅ Available | 11.11.0 |
| Git | ✅ Available | 2.56.0 |
| PostgreSQL | ✅ Available | 16.15, service Running |
| Flutter | ❌ Not found | Install Flutter SDK — Phase 2 |
| Django | ✅ Available | 3.2 (will upgrade to 4.2 in venv) |
| DRF | ❌ Not installed | Will install in venv |
| psql on PATH | ⚠️ Not on PATH | Binary at `C:\...\PostgreSQL\16\bin\` |

**Mitigation for PATH issues:** All commands in this project use explicit paths or a
project-level `activate.ps1` script that sets PATH correctly.

---

## Phase 0 — Workspace Inspection & Planning ✅

- [x] Inspect environment
- [x] Document tool availability
- [x] Create ARCHITECTURE.md
- [x] Create ERD.md
- [x] Create DEVELOPMENT_PLAN.md (this file)
- [x] Create TASKS.md
- [ ] Create .gitignore
- [ ] Create README.md

---

## Phase 1 — Project Foundation (Backend) 🔄 IN PROGRESS

**Goal:** Working Django backend with authentication, roles, health check, and tests.

### Steps

1. Create Python virtual environment at `backend/venv/`
2. Install dependencies: Django 4.2, DRF, simplejwt, cors-headers, environ,
   drf-spectacular, psycopg2-binary, django-ratelimit, Pillow, pytest-django
3. Create Django project `config/` inside `backend/`
4. Create Django apps: `accounts`, `organization`, `employees`, `audit`, `approvals`, `notifications`
5. Configure settings (base / dev / prod split)
6. Configure PostgreSQL database connection via .env
7. Create `hrms_dev` PostgreSQL database
8. Implement `User` + `UserProfile` + `Role` models
9. Implement JWT auth endpoints (login, logout, refresh, me, password-reset)
10. Implement role-based permission classes
11. Add health check endpoint
12. Run initial migrations
13. Create superuser seed script
14. Write auth tests
15. Verify backend starts

### Exit Criteria

- `py manage.py runserver` starts without errors
- `/api/v1/health/` returns 200
- `/api/v1/auth/login/` returns JWT tokens
- All auth tests pass

---

## Phase 2 — Desktop & Mobile Foundations

**Goal:** Both clients connect to Django auth API.

### Desktop (Electron + React + TypeScript)

1. `npm create electron-vite` scaffold in `desktop/`
2. Configure TypeScript, React, Tailwind CSS
3. Secure Electron config (contextIsolation, no nodeIntegration)
4. Implement restricted preload bridge
5. Build login screen UI
6. Connect to `/api/v1/auth/login/`
7. Implement token storage (OS keychain via `keytar`)
8. Implement session refresh + expiry handling
9. Build app shell: sidebar, top bar, routes
10. Error state + loading state components

### Mobile (Flutter)

1. `flutter create mobile` in `mobile/`
2. Set up project structure: `core/`, `features/`, `shared/`
3. Configure `dio` + `retrofit` for API calls
4. Configure `flutter_secure_storage` for token persistence
5. Build login screen
6. Connect to same `/api/v1/auth/login/`
7. Implement token refresh + logout
8. Build home shell with bottom navigation

### Exit Criteria

- Desktop login screen connects to Django and receives tokens
- Mobile login screen connects to Django and receives tokens
- Both handle expired token with re-authentication

---

## Phase 3 — Employee Management

**Goal:** Full employee directory and profile in both clients.

### Backend

1. Employee, Department, Designation, Company models + migrations
2. Employee CRUD API with role-based permissions
3. Document upload with validation
4. EmergencyContact, Address, BankDetail sub-resources
5. Audit logging on employee changes
6. Tests: CRUD, isolation, role access

### Desktop

1. Employee directory with search, filter, pagination
2. Employee profile view with all sub-sections
3. Create / edit employee form with validation
4. Document list and secure download
5. Employment history timeline

### Mobile

1. My profile screen
2. Profile correction request form

### Exit Criteria

- HR can create, view, edit employees via API
- Employee cannot view another employee's record
- Audit log records all changes

---

## Phase 4 — Attendance & Leave

**Goal:** Attendance recording and leave workflow end-to-end.

### Backend

1. Shift, ShiftAssignment, AttendancePolicy models
2. AttendancePunch + AttendanceRecord models
3. AttendanceCorrection + approval flow
4. LeaveType, LeavePolicy, LeaveBalance, LeaveLedger, LeaveRequest models
5. Leave approval workflow using ApprovalRequest engine
6. Balance calculation service
7. Tests: duplicate punch, concurrent leave, balance integrity

### Desktop

1. Attendance admin views
2. Attendance correction review
3. Leave policy management
4. Leave request management (HR/Manager approval)

### Mobile

1. Check-in / check-out screen
2. Daily/monthly attendance view
3. Leave balance screen
4. Leave request submission and status
5. Manager: pending leave approvals

### Exit Criteria

- Employees can check in/out; duplicates rejected
- Leave requests go through approval → balance updates
- Concurrent requests do not double-deduct balance

---

## Phase 5 — Payroll

**Goal:** End-to-end payroll calculation, approval, payslip generation.

### Backend

1. SalaryComponent, SalaryStructure, EmployeeSalaryAssignment models
2. PayrollPeriod, PayrollRun, PayrollLine, Payslip models
3. Payroll calculation service
4. Statutory calculation placeholders (PF, ESI, PT, TDS) — configurable
5. Payroll approval workflow
6. Payslip generation (PDF via WeasyPrint/ReportLab)
7. Tests: calculation accuracy, duplicate prevention, finalization

### Desktop

1. Salary structure management
2. Payroll period management
3. Payroll run dashboard
4. Payslip list with download

### Mobile

1. My payslips screen
2. Payslip detail view

---

## Phase 6 — Remaining HR Modules

- Recruitment pipeline
- Onboarding checklists
- Performance reviews
- Expense claims
- Asset management
- Employee exit / offboarding
- In-app notifications
- Reports & CSV/PDF exports
- Announcements

---

## Phase 7 — Production Hardening

- Security audit
- End-to-end test scenario (per spec §18)
- Database constraint review
- Rate limiting validation
- Desktop build (Windows NSIS installer)
- Android APK / AAB build
- Deployment documentation
- Backup and restore test

---

## Technology Defaults Chosen

| Decision | Default | Can Override |
|----------|---------|-------------|
| Django version | 4.2 LTS | No (LTS) |
| Auth | JWT (simplejwt) | Yes, set in .env |
| Access token TTL | 15 minutes | Yes |
| Refresh token TTL | 7 days | Yes |
| Currency | INR | Per-company setting |
| PF rate (employee) | 12% of Basic | Configurable |
| ESI threshold | ₹21,000 gross | Configurable |
| Working days | Mon-Sat | Per-shift config |
| Leave year | April-March | Configurable |
| Late grace | 15 min | Per attendance policy |

