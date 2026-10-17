# HRMS System Architecture

> **Version:** 1.0.0 | **Date:** 2026-10-17 | **Status:** Active

---

## 1. System Overview

The HRMS is a three-tier, API-first system built around a central Django backend. A Windows
desktop application (Electron + React + TypeScript) serves administrators, HR, payroll officers,
and managers. A mobile application (Flutter) serves employees and managers on Android and iOS.
Both clients communicate exclusively through a versioned REST API; they share no separate
databases.

```
┌──────────────────────┐      HTTPS/REST      ┌───────────────────────────────┐
│   Desktop Client     │ ◄──────────────────► │                               │
│  Electron + React    │                       │     Django REST Backend       │
│  TypeScript          │      HTTPS/REST       │     Python 3.11               │
│                      │ ◄──────────────────► │     Django 4.x + DRF          │
│   Mobile Client      │                       │     PostgreSQL 16             │
│   Flutter / Dart     │                       │                               │
└──────────────────────┘                       └───────────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Backend language | Python | 3.11 | Via py launcher on Windows |
| Web framework | Django | 4.2 LTS | Upgraded from 3.2 in venv |
| API layer | Django REST Framework | 3.15 | |
| Database | PostgreSQL | 16 | Running as Windows service |
| Auth tokens | djangorestframework-simplejwt | 5.x | Access + Refresh tokens |
| API schema | drf-spectacular | 0.27 | OpenAPI 3.1 |
| CORS | django-cors-headers | 4.x | |
| Environment | django-environ | 0.11 | .env file management |
| Desktop shell | Electron | 32 | Context isolation ON, nodeIntegration OFF |
| Desktop UI | React + TypeScript | 18 / 5.x | |
| Desktop build | electron-builder | Latest | NSIS Windows installer |
| Mobile | Flutter | Latest stable | |
| Mobile lang | Dart | 3.x | |
| Mobile auth storage | flutter_secure_storage | 9.x | Keystore / Keychain |

---

## 3. Project Structure

```
hrms/
├── backend/                    # Django project root
│   ├── config/                 # Django settings, urls, wsgi, asgi
│   ├── apps/
│   │   ├── accounts/           # User, roles, JWT auth
│   │   ├── organization/       # Company, dept, designation, shift, location
│   │   ├── employees/          # Employee lifecycle, contracts, documents
│   │   ├── recruitment/        # Job requisitions, candidates, interviews
│   │   ├── onboarding/         # Onboarding tasks and checklists
│   │   ├── attendance/         # Punches, records, corrections, policies
│   │   ├── leave/              # Types, policies, balances, requests
│   │   ├── payroll/            # Salary, payroll runs, payslips
│   │   ├── approvals/          # Generic approval workflow engine
│   │   ├── performance/        # Reviews and goals
│   │   ├── expenses/           # Expense claims and items
│   │   ├── assets/             # Asset catalog and assignments
│   │   ├── offboarding/        # Exit records, checklists
│   │   ├── notifications/      # In-app notification store
│   │   ├── reports/            # Report views and export logic
│   │   └── audit/              # Immutable audit log
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
│
├── desktop/                    # Electron + React + TypeScript
│   ├── src/
│   │   ├── main/               # Electron main process
│   │   ├── preload/            # Restricted preload bridge
│   │   └── renderer/           # React app
│   │       ├── features/       # Feature-based modules
│   │       ├── shared/         # Design system, components, hooks
│   │       └── store/          # State management
│   ├── package.json
│   └── electron-builder.yml
│
├── mobile/                     # Flutter app
│   ├── lib/
│   │   ├── core/               # DI, routing, theme, network client
│   │   ├── features/           # Auth, attendance, leave, payslips, etc.
│   │   └── shared/             # Widgets, utils, constants
│   ├── test/
│   └── pubspec.yaml
│
├── docs/
│   ├── ARCHITECTURE.md         # This file
│   ├── DEVELOPMENT_PLAN.md
│   ├── ERD.md
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_DESIGN.md
│   ├── SECURITY.md
│   ├── DEPLOYMENT.md
│   └── TESTING.md
│
├── scripts/                    # Dev utility scripts
├── .env.example
├── .gitignore
├── README.md
└── TASKS.md
```

---

## 4. Authentication & Authorization

### Token Flow (JWT)

```
Client                              Backend
  │                                   │
  │── POST /api/v1/auth/login/ ──────►│
  │◄─ { access, refresh } ───────────│
  │                                   │
  │── GET /api/v1/... (Bearer access)►│
  │                                   │  access expires (15 min default)
  │── POST /api/v1/auth/refresh/ ────►│
  │◄─ { access } ────────────────────│
```

### Role-Based Access Control

Roles are stored as a custom `Role` model and linked to Django's permission groups.
Permission checks are enforced in DRF permission classes — never only hidden in the frontend.

| Role | Code | Key Permissions |
|------|------|----------------|
| System Administrator | `ADMIN` | Full system config, user management |
| HR Manager | `HR` | Employee CRUD, leave policies, onboarding |
| Reporting Manager | `MANAGER` | Team view, leave approval, attendance review |
| Payroll Officer | `PAYROLL` | Salary structures, payroll runs, payslips |
| Director / Approver | `DIRECTOR` | Final approvals, salary revision approval |
| Employee | `EMPLOYEE` | Own profile, attendance, leave, payslips |

Record-level isolation: employees can access only their own records unless their role
explicitly grants broader access. Object-level permission checks are applied in views.

---

## 5. API Design Conventions

- Base path: `/api/v1/`
- Authentication: `Authorization: Bearer <access_token>`
- Pagination: cursor or page-based, consistent envelope
- Response envelope:
  ```json
  { "count": 100, "next": "...", "previous": "...", "results": [...] }
  ```
- Error envelope:
  ```json
  { "detail": "...", "code": "VALIDATION_ERROR", "errors": { "field": ["msg"] } }
  ```
- Versioned: future breaking changes go to `/api/v2/`

---

## 6. Approval Workflow Engine

A generic `ApprovalRequest` model links to any business entity via a GenericForeignKey.
States: `DRAFT → PENDING → APPROVED | REJECTED | NEEDS_REVISION | CANCELLED`

Used by: leave requests, attendance corrections, salary revisions, expense claims,
payroll runs, resignation requests.

Atomicity: approval + business-record state change happen inside a single database
transaction. A notification failure never reverses the transaction.

---

## 7. Payroll Engine

```
Create Period → Determine Eligible Employees
     → Load Salary Structures (effective-dated)
     → Collect Attendance / Leave Data
     → Apply Earnings (basic, HRA, allowances, bonuses)
     → Apply Deductions (PF, ESI, PT, TDS, advances)
     → Generate PayrollLine per employee
     → Validate & Flag Exceptions
     → Authorize Review
     → APPROVE & FINALIZE (immutable snapshot)
     → Generate Payslips
     → Record Payment Instructions
     → Reconcile Payments
     → Close Period
```

Finalized payroll is immutable. Corrections require an authorized adjustment entry.

---

## 8. Synchronization Model

- Server is the single source of truth.
- Both clients use the same API — no separate sync protocol.
- Optimistic locking via `updated_at` timestamp or `version` integer on critical records.
- Idempotency keys on write operations that may be retried.
- Mobile is online-first in Phase 1; offline queue structure reserved for Phase 4+.

---

## 9. Security Architecture

- HTTPS mandatory in production (Django `SECURE_SSL_REDIRECT=True`).
- Django `SECRET_KEY`, DB credentials, and all secrets via environment variables only.
- JWT short-lived access tokens (15 min) + refresh tokens (7 days).
- DRF permission classes enforce authorization server-side.
- Electron: `contextIsolation: true`, `nodeIntegration: false`, CSP headers.
- Flutter: `flutter_secure_storage` for token persistence.
- File uploads: extension whitelist, size limit, stored outside web root.
- Audit log: immutable append-only table for sensitive operations.
- Rate limiting on auth endpoints via `django-ratelimit`.

---

## 10. Design Decisions & Assumptions

| Decision | Choice | Reason |
|----------|--------|--------|
| ORM | Django ORM | Consistency with migrations and admin |
| Auth | JWT (simplejwt) | Stateless, works for both desktop and mobile |
| Task queue | Django signals + DB for now; Celery if needed | Avoid premature infra complexity |
| Money | `DecimalField(max_digits=12, decimal_places=2)` | No float arithmetic |
| Soft deletes | `is_active` + `deactivated_at` on employees | Preserve history |
| Payroll snapshot | Snapshot payload stored as JSONB on `PayrollLine` | Reproducible even after salary change |
| India statutory | Configurable, not hardcoded | Rules vary by state and eligibility |
| Flutter target | Android first; iOS structure ready | iOS requires macOS build machine |
| Push notifications | In-app only in Phase 1; FCM in Phase 6 | Avoid premature credential dependency |

