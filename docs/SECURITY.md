# Security Architecture & Production Hardening Guide

## 1. Executive Summary

The HRMS platform implements defense-in-depth principles across all architectural tiers:
- **Client (Desktop/Mobile):** Context-isolated runtime, strictly sandboxed DOM, minimal bridge API exposure.
- **API Gateway & Middleware:** Rate limiting, CORS whitelist, device session tracking, non-blocking append-only audit logging.
- **Application Logic:** Server-authoritative role-based access control (RBAC), row-level access control, zero-trust endpoint design.
- **Data Persistence:** Decimal-safe financial accounting, immutable audit records, database-enforced integrity constraints.

---

## 2. Authentication & Session Management

### 2.1 JWT Token Lifecycle
- **Access Tokens:** Signed via HMAC-SHA256 with a short time-to-live (**15 minutes**).
- **Refresh Tokens:** Long-lived (**7 days**), rotated upon renewal. Revoked tokens are blacklisted.
- **Algorithm:** HS256 with cryptographically random `SECRET_KEY` pulled from environment variables.
- **Payload Sanitization:** No plaintext passwords, salt values, or PII are encoded in JWT claims.

### 2.2 Device & Session Tracking
Each login creates an active `DeviceSession` record capturing:
- Device ID / User-Agent signature
- Client IP address
- Last active timestamp
- Session revocation capability for remote administrative logout.

---

## 3. Authorization & Access Control Matrix

Server-side authorization is applied at every Django REST Framework ViewSet using `RoleBasedPermission` and explicit queryset filtering:

| Role | Organization & Settings | Employee Records | Attendance & Leave | Payroll & Compensation | Operations (Expenses/Assets) | Audit Logs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Full (CRUD) | Full (CRUD) | Full (CRUD) | Full (CRUD) | Full (CRUD) | Read Only |
| **HR** | Read / Manage | Full (CRUD) | Read / Manage | Read Only | Manage | Denied |
| **MANAGER** | Read Only | Direct Reports | Approve Subordinates | Denied | Approve Claims | Denied |
| **PAYROLL** | Read Only | Read Financials | Read Attendance | Run, Approve & Finalize | Read Expense Reimbursements | Denied |
| **EMPLOYEE** | Read Company Info | Own Profile Only | Clock In/Out, Own Leaves | Own Payslips Only | Submit Claims, View Assigned Assets | Denied |

### 3.1 Row-Level Isolation Guarantees
```python
# Enforced in all ViewSets (e.g., PayslipViewSet, AttendanceViewSet, EmployeeViewSet):
def get_queryset(self):
    user = self.request.user
    if user.role in [UserRole.ADMIN, UserRole.PAYROLL]:
        return Payslip.objects.all()
    # Regular employees can strictly only access their own payslips
    return Payslip.objects.filter(employee__user=user)
```

---

## 4. Financial & Payroll Security

1. **Zero-Floating-Point Rule:**
   - All monetary figures (`basic_salary`, `hra`, `pf_deduction`, `net_pay`, `reimbursement_amount`) use Python `Decimal` and PostgreSQL `NUMERIC(12, 2)` / `DECIMAL(12, 2)`.
   - Floating-point arithmetic (`float`) is strictly forbidden across models and calculations to eliminate rounding drift.

2. **Immutable Payroll Runs:**
   - Once a `PayrollRun` status changes to `FINALIZED`, all lines and linked `Payslip` records are locked.
   - Any salary adjustment post-finalization requires an explicit supplementary run or adjustment entry in the subsequent period.

---

## 5. Defense Against OWASP Top 10

| Vulnerability | Mitigation Strategy | Implementation |
| :--- | :--- | :--- |
| **A01: Broken Access Control** | Server-side role validation on every view; row-level query filtering; no reliance on frontend UI hidden buttons. | `RoleBasedPermission`, `get_queryset()` |
| **A02: Cryptographic Failures** | Argon2/PBKDF2 password hashing; TLS 1.3 enforced in production; secrets isolated in `.env`. | `settings.AUTH_PASSWORD_VALIDATORS` |
| **A03: Injection (SQL / Command)** | 100% parameterization via Django ORM; raw SQL strictly prohibited; typed DRF serializers. | Django ORM, Serializer validation |
| **A04: Insecure Design** | Separation of duties (e.g. Employee cannot approve own leave; Manager cannot finalize payroll). | Approval workflows in `LeaveService`, `PayrollService` |
| **A05: Security Misconfiguration** | `DEBUG=False` in production; secure headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`). | `settings.production` |
| **A06: Vulnerable Components** | Pinned dependencies in `requirements.txt` and `package.json`; automated dependency auditing. | `pip audit` / `npm audit` |
| **A07: Identification / Auth** | Generic error messages on login failure ("Invalid email or password"); rate-limited login endpoints. | `LoginView`, DRF Throttling |
| **A08: Software & Data Integrity** | Cryptographic package verification; Electron context isolation; sandbox enabled. | `preload.js`, `contextIsolation: true` |
| **A09: Security Logging & Monitoring** | Non-blocking, append-only `AuditLog` records all mutations, auth events, and critical operations. | `AuditLog` service |
| **A10: SSRF** | Outbound requests disabled or strictly validated to pre-approved corporate endpoints. | Restricted network policies |

---

## 6. Desktop Sandbox & IPC Security

In the Electron desktop shell:
1. `nodeIntegration: false` prevents renderer scripts from accessing raw Node.js system APIs.
2. `contextIsolation: true` creates a secure boundary between the browser DOM and preload bridge.
3. `sandbox: true` restricts child process creation and arbitrary native module loading.
4. Navigation is strictly limited to localhost / production bundle origins.

---

## 7. Rate Limiting & Throttling Policies

Configured in `config/settings/base.py`:
- **Anonymous Users:** 60 requests/minute (prevent brute-force attacks on `/api/v1/auth/login/`).
- **Authenticated Users:** 300 requests/minute (accommodates high-throughput dashboard interactions).
- **Attendance Punch Burst Limit:** Max 1 punch per 60 seconds per employee to prevent biometric double-firing.

