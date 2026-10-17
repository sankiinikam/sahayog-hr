# ERD — HRMS Entity Relationship Diagram

> **Version:** 1.0.0 | **Date:** 2026-10-17

---

## Mermaid ERD

```mermaid
erDiagram

    %% ── ORGANIZATION ────────────────────────────────────────────
    Company {
        int id PK
        string name
        string registration_number UK
        string pan_number
        string gst_number
        string address
        string city
        string state
        string country
        string postal_code
        string phone
        string email
        string website
        string logo
        string currency_code
        string financial_year_start
        bool   is_active
        datetime created_at
        datetime updated_at
    }

    Department {
        int id PK
        int company_id FK
        int parent_id FK
        string name
        string code UK
        bool is_active
        datetime created_at
        datetime updated_at
    }

    Designation {
        int id PK
        int company_id FK
        int department_id FK
        string name
        string code UK
        string grade
        bool is_active
        datetime created_at
        datetime updated_at
    }

    WorkLocation {
        int id PK
        int company_id FK
        string name
        string address
        bool allows_remote
        bool geofence_enabled
        decimal latitude
        decimal longitude
        decimal radius_meters
        bool is_active
        datetime created_at
    }

    Holiday {
        int id PK
        int company_id FK
        string name
        date   holiday_date
        string holiday_type
        bool   is_optional
        datetime created_at
    }

    Shift {
        int id PK
        int company_id FK
        string name
        time   start_time
        time   end_time
        bool   is_night_shift
        int    grace_minutes
        int    working_hours_per_day
        bool   is_active
        datetime created_at
    }

    CompanyPolicy {
        int id PK
        int company_id FK
        string policy_type
        json   policy_data
        date   effective_from
        date   effective_to
        bool   is_active
        datetime created_at
    }

    %% ── AUTHENTICATION ───────────────────────────────────────────
    User {
        int id PK
        string username UK
        string email UK
        string password_hash
        bool is_active
        bool is_staff
        datetime date_joined
        datetime last_login
    }

    UserProfile {
        int id PK
        int user_id FK
        int employee_id FK
        string role
        datetime created_at
        datetime updated_at
    }

    DeviceSession {
        int id PK
        int user_id FK
        string refresh_token_jti UK
        string device_name
        string device_type
        string ip_address
        datetime created_at
        datetime expires_at
        bool is_active
    }

    %% ── EMPLOYEE LIFECYCLE ──────────────────────────────────────
    Employee {
        int id PK
        int user_id FK
        int company_id FK
        int department_id FK
        int designation_id FK
        int reporting_manager_id FK
        int work_location_id FK
        string employee_code UK
        string first_name
        string last_name
        string gender
        date   date_of_birth
        date   date_of_joining
        string employment_type
        string employment_status
        date   probation_end_date
        date   confirmation_date
        string personal_email
        string work_email UK
        string personal_phone
        string work_phone
        string nationality
        string marital_status
        string blood_group
        string aadhaar_number
        string pan_number
        string uan_number
        string esi_number
        string profile_photo
        bool   is_active
        datetime deactivated_at
        datetime created_at
        datetime updated_at
    }

    EmploymentHistory {
        int id PK
        int employee_id FK
        string change_type
        string old_designation
        string new_designation
        string old_department
        string new_department
        string old_employment_type
        string new_employment_type
        date   effective_date
        string reason
        int    changed_by_id FK
        datetime created_at
    }

    EmploymentContract {
        int id PK
        int employee_id FK
        string contract_type
        date   start_date
        date   end_date
        string document_path
        string status
        datetime created_at
        datetime updated_at
    }

    EmployeeDocument {
        int id PK
        int employee_id FK
        string document_type
        string document_name
        string document_number
        date   issue_date
        date   expiry_date
        string file_path
        bool   verified
        datetime created_at
    }

    EmergencyContact {
        int id PK
        int employee_id FK
        string name
        string relationship
        string phone
        string email
        string address
        bool   is_primary
        datetime created_at
    }

    EmployeeBankDetail {
        int id PK
        int employee_id FK
        string account_holder_name
        string account_number
        string bank_name
        string branch_name
        string ifsc_code
        string account_type
        bool   is_primary
        datetime created_at
        datetime updated_at
    }

    Address {
        int id PK
        int employee_id FK
        string address_type
        string line1
        string line2
        string city
        string state
        string country
        string postal_code
        bool   is_current
        datetime created_at
    }

    %% ── RECRUITMENT ─────────────────────────────────────────────
    JobRequisition {
        int id PK
        int company_id FK
        int department_id FK
        int designation_id FK
        int requested_by_id FK
        int approved_by_id FK
        string title
        string status
        int    vacancies
        string job_type
        date   required_by
        text   description
        datetime created_at
        datetime updated_at
    }

    Candidate {
        int id PK
        int requisition_id FK
        string full_name
        string email UK
        string phone
        string current_company
        string current_designation
        int    total_experience_months
        decimal expected_ctc
        string resume_path
        string status
        string source
        datetime applied_at
        datetime updated_at
    }

    Interview {
        int id PK
        int candidate_id FK
        int interviewer_id FK
        int round_number
        string interview_type
        datetime scheduled_at
        string   venue
        string   status
        int      rating
        text     feedback
        datetime created_at
    }

    Offer {
        int id PK
        int candidate_id FK
        int requisition_id FK
        decimal offered_ctc
        date    joining_date
        string  status
        date    offer_valid_until
        string  offer_letter_path
        datetime created_at
        datetime updated_at
    }

    %% ── ONBOARDING ──────────────────────────────────────────────
    OnboardingTask {
        int id PK
        int employee_id FK
        int assigned_to_id FK
        string title
        string description
        string category
        string status
        date   due_date
        datetime completed_at
        datetime created_at
    }

    %% ── ATTENDANCE ──────────────────────────────────────────────
    ShiftAssignment {
        int id PK
        int employee_id FK
        int shift_id FK
        date effective_from
        date effective_to
        datetime created_at
    }

    AttendanceRecord {
        int id PK
        int employee_id FK
        int shift_id FK
        date   attendance_date
        string status
        time   first_in
        time   last_out
        int    worked_minutes
        int    overtime_minutes
        bool   is_late
        int    late_minutes
        bool   is_corrected
        int    correction_id FK
        datetime created_at
        datetime updated_at
    }

    AttendancePunch {
        int id PK
        int employee_id FK
        int attendance_record_id FK
        string punch_type
        datetime punched_at
        datetime server_received_at
        string device_id
        string source
        decimal latitude
        decimal longitude
        string ip_address
        datetime created_at
    }

    AttendanceCorrection {
        int id PK
        int employee_id FK
        int attendance_record_id FK
        int approval_request_id FK
        date   correction_date
        string original_status
        string requested_status
        time   original_in
        time   original_out
        time   corrected_in
        time   corrected_out
        text   reason
        string status
        int    reviewed_by_id FK
        datetime reviewed_at
        datetime created_at
    }

    AttendancePolicy {
        int id PK
        int company_id FK
        string policy_name
        int    min_working_hours
        int    late_grace_minutes
        bool   allow_overtime
        bool   auto_approve_correction
        json   policy_data
        bool   is_active
        datetime created_at
    }

    %% ── LEAVE ───────────────────────────────────────────────────
    LeaveType {
        int id PK
        int company_id FK
        string name
        string code UK
        string accrual_frequency
        decimal accrual_amount
        int    max_balance
        int    max_consecutive_days
        bool   allow_half_day
        bool   requires_approval
        bool   is_paid
        bool   is_active
        datetime created_at
    }

    LeavePolicy {
        int id PK
        int company_id FK
        int leave_type_id FK
        string employment_type
        decimal annual_entitlement
        bool   carry_forward_allowed
        int    max_carry_forward_days
        bool   encashable
        json   policy_data
        datetime created_at
        datetime updated_at
    }

    LeaveBalance {
        int id PK
        int employee_id FK
        int leave_type_id FK
        int year
        decimal entitlement
        decimal used
        decimal carried_forward
        decimal adjustments
        decimal balance
        datetime updated_at
    }

    LeaveLedger {
        int id PK
        int employee_id FK
        int leave_type_id FK
        int leave_request_id FK
        string transaction_type
        decimal credit
        decimal debit
        decimal balance_after
        string reference
        string notes
        int    created_by_id FK
        datetime created_at
    }

    LeaveRequest {
        int id PK
        int employee_id FK
        int leave_type_id FK
        int approval_request_id FK
        date   start_date
        date   end_date
        string day_type
        decimal total_days
        text   reason
        string status
        int    approved_by_id FK
        datetime approved_at
        datetime cancelled_at
        datetime created_at
        datetime updated_at
    }

    %% ── PAYROLL ─────────────────────────────────────────────────
    SalaryComponent {
        int id PK
        int company_id FK
        string name
        string code UK
        string component_type
        string calculation_type
        decimal value
        bool   is_taxable
        bool   is_pf_applicable
        bool   is_active
        datetime created_at
    }

    SalaryStructure {
        int id PK
        int company_id FK
        string name
        string code UK
        decimal gross_amount
        json   component_breakdown
        bool   is_active
        datetime created_at
        datetime updated_at
    }

    EmployeeSalaryAssignment {
        int id PK
        int employee_id FK
        int salary_structure_id FK
        decimal gross_amount
        json   component_values
        date   effective_from
        date   effective_to
        string status
        int    approved_by_id FK
        datetime created_at
        datetime updated_at
    }

    SalaryRevision {
        int id PK
        int employee_id FK
        int old_assignment_id FK
        int new_assignment_id FK
        int approval_request_id FK
        string revision_type
        decimal old_gross
        decimal new_gross
        decimal change_percentage
        text   reason
        date   effective_date
        string status
        datetime created_at
    }

    PayrollPeriod {
        int id PK
        int company_id FK
        string name
        date   start_date
        date   end_date
        string status
        int    created_by_id FK
        datetime created_at
        datetime updated_at
    }

    PayrollRun {
        int id PK
        int period_id FK
        string status
        int    prepared_by_id FK
        int    reviewed_by_id FK
        int    approved_by_id FK
        datetime prepared_at
        datetime reviewed_at
        datetime approved_at
        datetime finalized_at
        text   notes
        datetime created_at
        datetime updated_at
    }

    PayrollLine {
        int id PK
        int run_id FK
        int employee_id FK
        int salary_assignment_id FK
        decimal gross_earnings
        decimal total_deductions
        decimal net_pay
        decimal employer_pf
        decimal employer_esi
        int    paid_days
        int    lop_days
        json   earnings_snapshot
        json   deductions_snapshot
        json   calculation_metadata
        string status
        datetime created_at
    }

    Payslip {
        int id PK
        int payroll_line_id FK
        int employee_id FK
        int period_id FK
        string payslip_number UK
        decimal gross_earnings
        decimal total_deductions
        decimal net_pay
        string status
        string pdf_path
        datetime published_at
        datetime created_at
    }

    PaymentRecord {
        int id PK
        int payslip_id FK
        string payment_mode
        string bank_account_number
        string ifsc_code
        decimal amount
        string status
        string transaction_reference
        datetime payment_date
        text   failure_reason
        datetime created_at
        datetime updated_at
    }

    PayrollAdjustment {
        int id PK
        int payroll_run_id FK
        int employee_id FK
        string adjustment_type
        string component_code
        decimal amount
        text   reason
        int    approved_by_id FK
        datetime created_at
    }

    %% ── APPROVALS ───────────────────────────────────────────────
    ApprovalRequest {
        int id PK
        string content_type
        int    object_id
        string request_type
        string status
        int    requester_id FK
        int    approver_id FK
        int    fallback_approver_id FK
        text   requester_notes
        text   approver_comments
        datetime submitted_at
        datetime decided_at
        datetime created_at
        datetime updated_at
    }

    %% ── PERFORMANCE ─────────────────────────────────────────────
    PerformanceReview {
        int id PK
        int employee_id FK
        int reviewer_id FK
        string review_period
        date   review_date
        int    overall_rating
        text   strengths
        text   areas_for_improvement
        text   comments
        string status
        datetime created_at
        datetime updated_at
    }

    PerformanceGoal {
        int id PK
        int employee_id FK
        int review_id FK
        string title
        text   description
        string metric
        decimal target_value
        decimal achieved_value
        date   due_date
        string status
        datetime created_at
        datetime updated_at
    }

    %% ── EXPENSES ────────────────────────────────────────────────
    ExpenseClaim {
        int id PK
        int employee_id FK
        int approval_request_id FK
        string claim_number UK
        string title
        date   claim_period_start
        date   claim_period_end
        decimal total_amount
        string status
        int    approved_by_id FK
        datetime created_at
        datetime updated_at
    }

    ExpenseItem {
        int id PK
        int claim_id FK
        string category
        string description
        date   expense_date
        decimal amount
        string receipt_path
        bool   is_reimbursable
        datetime created_at
    }

    %% ── ASSETS ──────────────────────────────────────────────────
    Asset {
        int id PK
        int company_id FK
        string name
        string asset_code UK
        string category
        string serial_number
        date   purchase_date
        decimal purchase_value
        string condition
        string status
        datetime created_at
        datetime updated_at
    }

    AssetAssignment {
        int id PK
        int asset_id FK
        int employee_id FK
        date   assigned_date
        date   returned_date
        string condition_at_assignment
        string condition_at_return
        string status
        text   notes
        datetime created_at
        datetime updated_at
    }

    %% ── OFFBOARDING ─────────────────────────────────────────────
    ExitRecord {
        int id PK
        int employee_id FK
        int approval_request_id FK
        string resignation_type
        date   resignation_date
        date   last_working_date
        text   reason
        string status
        int    approved_by_id FK
        datetime created_at
        datetime updated_at
    }

    ExitChecklistItem {
        int id PK
        int exit_record_id FK
        int assigned_to_id FK
        string title
        string category
        string status
        datetime completed_at
        datetime created_at
    }

    %% ── NOTIFICATIONS & AUDIT ───────────────────────────────────
    Notification {
        int id PK
        int user_id FK
        string notification_type
        string title
        text   message
        string content_type
        int    object_id
        bool   is_read
        datetime read_at
        datetime created_at
    }

    Announcement {
        int id PK
        int company_id FK
        int created_by_id FK
        string title
        text   body
        string audience_role
        datetime publish_at
        datetime expires_at
        datetime created_at
    }

    AuditLog {
        int id PK
        int user_id FK
        int employee_id FK
        string action
        string content_type
        int    object_id
        json   old_values
        json   new_values
        string ip_address
        string user_agent
        datetime created_at
    }

    %% ── RELATIONSHIPS ───────────────────────────────────────────

    Company ||--o{ Department : "has"
    Company ||--o{ Designation : "has"
    Company ||--o{ WorkLocation : "has"
    Company ||--o{ Holiday : "has"
    Company ||--o{ Shift : "has"
    Company ||--o{ CompanyPolicy : "has"
    Company ||--o{ Employee : "employs"
    Company ||--o{ LeaveType : "defines"
    Company ||--o{ SalaryComponent : "defines"
    Company ||--o{ SalaryStructure : "defines"
    Company ||--o{ PayrollPeriod : "manages"

    Department ||--o{ Department : "parent of"
    Department ||--o{ Employee : "contains"
    Designation ||--o{ Employee : "classifies"

    User ||--|| UserProfile : "extends"
    User ||--|| Employee : "is"
    User ||--o{ DeviceSession : "has"

    Employee ||--o{ EmploymentHistory : "has"
    Employee ||--o{ EmploymentContract : "has"
    Employee ||--o{ EmployeeDocument : "has"
    Employee ||--o{ EmergencyContact : "has"
    Employee ||--o{ EmployeeBankDetail : "has"
    Employee ||--o{ Address : "has"
    Employee ||--o{ ShiftAssignment : "assigned"
    Employee ||--o{ AttendanceRecord : "generates"
    Employee ||--o{ AttendancePunch : "makes"
    Employee ||--o{ AttendanceCorrection : "submits"
    Employee ||--o{ LeaveBalance : "holds"
    Employee ||--o{ LeaveLedger : "has ledger"
    Employee ||--o{ LeaveRequest : "submits"
    Employee ||--o{ EmployeeSalaryAssignment : "has"
    Employee ||--o{ SalaryRevision : "receives"
    Employee ||--o{ PayrollLine : "included in"
    Employee ||--o{ Payslip : "receives"
    Employee ||--o{ OnboardingTask : "completes"
    Employee ||--o{ ExitRecord : "has"
    Employee ||--o{ PerformanceReview : "reviewed in"
    Employee ||--o{ PerformanceGoal : "has"
    Employee ||--o{ ExpenseClaim : "submits"
    Employee ||--o{ AssetAssignment : "receives"

    Shift ||--o{ ShiftAssignment : "used in"
    AttendanceRecord ||--o{ AttendancePunch : "has"
    AttendanceCorrection ||--|| ApprovalRequest : "linked to"

    LeaveType ||--o{ LeavePolicy : "has policy"
    LeaveType ||--o{ LeaveBalance : "tracked in"
    LeaveType ||--o{ LeaveLedger : "recorded in"
    LeaveType ||--o{ LeaveRequest : "requested as"
    LeaveRequest ||--|| ApprovalRequest : "linked to"

    SalaryStructure ||--o{ EmployeeSalaryAssignment : "used in"
    SalaryRevision ||--|| ApprovalRequest : "linked to"
    PayrollPeriod ||--o{ PayrollRun : "has"
    PayrollRun ||--o{ PayrollLine : "contains"
    PayrollRun ||--o{ PayrollAdjustment : "has"
    PayrollLine ||--|| Payslip : "generates"
    Payslip ||--o{ PaymentRecord : "paid via"

    ExpenseClaim ||--o{ ExpenseItem : "contains"
    ExpenseClaim ||--|| ApprovalRequest : "linked to"

    Asset ||--o{ AssetAssignment : "assigned via"
    ExitRecord ||--|| ApprovalRequest : "linked to"
    ExitRecord ||--o{ ExitChecklistItem : "has"

    JobRequisition ||--o{ Candidate : "attracts"
    Candidate ||--o{ Interview : "has"
    Candidate ||--|| Offer : "receives"

    User ||--o{ Notification : "receives"
    User ||--o{ AuditLog : "generates"
```

---

## Table Glossary

| Table | Purpose |
|-------|---------|
| `Company` | Root tenant; all records scope to this |
| `Department` | Hierarchical org chart nodes |
| `Designation` | Job titles with grade level |
| `WorkLocation` | Office/remote locations with optional geofence |
| `Holiday` | Company-wide or optional holidays |
| `Shift` | Working hour templates |
| `CompanyPolicy` | JSON-serialized configurable policies |
| `User` | Django auth user (credentials) |
| `UserProfile` | Role assignment and employee link |
| `DeviceSession` | Refresh token tracking for logout/revoke |
| `Employee` | Core lifecycle record; soft-deleted on exit |
| `EmploymentHistory` | Effective-dated log of role/dept changes |
| `EmploymentContract` | Contract documents and validity |
| `EmployeeDocument` | ID proofs, certificates, etc. |
| `EmergencyContact` | Next of kin details |
| `EmployeeBankDetail` | Bank account for salary payment |
| `Address` | Current and permanent addresses |
| `AttendanceRecord` | Computed daily attendance summary |
| `AttendancePunch` | Raw clock-in/out events with location |
| `AttendanceCorrection` | Pending/approved correction requests |
| `AttendancePolicy` | Company rules for late, OT, etc. |
| `LeaveType` | Casual, sick, earned, etc. definitions |
| `LeavePolicy` | Per employment-type entitlement rules |
| `LeaveBalance` | Running balance per employee per year |
| `LeaveLedger` | Immutable transaction log of balance changes |
| `LeaveRequest` | Employee leave application |
| `SalaryComponent` | Basic, HRA, PF, ESI building blocks |
| `SalaryStructure` | Template grouping components |
| `EmployeeSalaryAssignment` | Effective-dated assignment of structure to employee |
| `SalaryRevision` | Change history for compensation |
| `PayrollPeriod` | Month/period definition |
| `PayrollRun` | Execution of payroll for a period |
| `PayrollLine` | Per-employee computed result with snapshot |
| `Payslip` | Employee-visible payslip |
| `PaymentRecord` | Bank transfer instruction and result |
| `PayrollAdjustment` | Authorized mid-run corrections |
| `ApprovalRequest` | Generic approval entity (GFK) |
| `PerformanceReview` | Annual/cycle reviews |
| `PerformanceGoal` | Individual targets and actuals |
| `ExpenseClaim` | Reimbursement claim header |
| `ExpenseItem` | Line items under a claim |
| `Asset` | Company asset catalog |
| `AssetAssignment` | Asset → employee allocation record |
| `ExitRecord` | Resignation or termination record |
| `ExitChecklistItem` | Clearance tasks (IT, finance, etc.) |
| `JobRequisition` | Hiring request |
| `Candidate` | Applicant record |
| `Interview` | Interview rounds and feedback |
| `Offer` | Job offer letter tracking |
| `OnboardingTask` | New-joiner task checklist |
| `Notification` | In-app notification per user |
| `Announcement` | Company-wide broadcast |
| `AuditLog` | Immutable log of sensitive operations |

