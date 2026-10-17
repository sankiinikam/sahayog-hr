"""
HR Reports & Analytics API.
Generates Headcount summary, Attendance stats, and Payroll summaries.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Count, Sum
from apps.employees.models import Employee
from apps.attendance.models import AttendanceRecord
from apps.payroll.models import PayrollRun
from apps.accounts.permissions import IsAdminOrHR


class HRDashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrHR]

    def get(self, request):
        total_employees = Employee.objects.count()
        active_employees = Employee.objects.filter(is_active=True).count()
        department_counts = Employee.objects.values("department__name").annotate(count=Count("id"))

        # Payroll summary
        latest_payroll = PayrollRun.objects.filter(status=PayrollRun.RunStatus.FINALIZED).order_by("-finalized_at").first()

        return Response({
            "headcount": {
                "total": total_employees,
                "active": active_employees,
                "inactive": total_employees - active_employees
            },
            "by_department": department_counts,
            "latest_payroll": {
                "period": latest_payroll.period.name if latest_payroll else "None",
                "total_disbursed": str(latest_payroll.total_net) if latest_payroll else "0.00",
                "employees_paid": latest_payroll.lines.count() if latest_payroll else 0
            }
        })
