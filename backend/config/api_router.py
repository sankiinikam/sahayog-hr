"""
HRMS API Router — all /api/v1/ routes assembled here.
"""
from django.urls import path, include

urlpatterns = [
    # Health check
    path("health/", include("apps.core.urls")),

    # Authentication
    path("auth/", include("apps.accounts.urls")),

    # Organization
    path("organization/", include("apps.organization.urls")),

    # Employees
    path("employees/", include("apps.employees.urls")),

    # Attendance
    path("attendance/", include("apps.attendance.urls")),

    # Leave
    path("leave/", include("apps.leave.urls")),

    # Payroll
    path("payroll/", include("apps.payroll.urls")),

    # Approvals
    path("approvals/", include("apps.approvals.urls")),

    # Recruitment & Onboarding
    path("recruitment/", include("apps.recruitment.urls")),

    # Expenses & Assets
    path("expenses/", include("apps.expenses.urls")),

    # Notifications
    path("notifications/", include("apps.notifications.urls")),

    # Reports
    path("reports/", include("apps.reports.urls")),

    # Audit (admin/hr only)
    path("audit/", include("apps.audit.urls")),
]

