"""
Payroll API Views: Periods, Structure assignments, Execution runs, and Payslips.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import (
    SalaryStructure,
    EmployeeSalaryAssignment,
    PayrollPeriod,
    PayrollRun,
    PayrollLine,
    Payslip,
)
from .services import PayrollService
from apps.accounts.permissions import IsPayrollOfficer


class PayrollPeriodViewSet(viewsets.ModelViewSet):
    queryset = PayrollPeriod.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsPayrollOfficer]

    def list(self, request, *args, **kwargs):
        periods = self.get_queryset()
        data = [
            {
                "id": p.id,
                "name": p.name,
                "start_date": p.start_date,
                "end_date": p.end_date,
                "status": p.status
            }
            for p in periods
        ]
        return Response({"results": data, "count": len(data)})


class PayrollRunViewSet(viewsets.ModelViewSet):
    queryset = PayrollRun.objects.select_related("period", "prepared_by", "approved_by").all()
    permission_classes = [permissions.IsAuthenticated, IsPayrollOfficer]

    def create(self, request, *args, **kwargs):
        period_id = request.data.get("period")
        period = get_object_or_404(PayrollPeriod, id=period_id)
        run = PayrollService.generate_payroll_run(period=period, prepared_by_user=request.user)

        return Response({
            "id": run.id,
            "period": run.period.name,
            "status": run.status,
            "total_gross": run.total_gross,
            "total_deductions": run.total_deductions,
            "total_net": run.total_net,
            "lines_count": run.lines.count()
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="finalize")
    def finalize(self, request, pk=None):
        run = self.get_object()
        finalized_run = PayrollService.finalize_payroll_run(payroll_run=run, approved_by_user=request.user)
        return Response({
            "detail": f"Payroll #{finalized_run.id} finalized successfully. Payslips generated.",
            "status": finalized_run.status,
            "finalized_at": finalized_run.finalized_at
        })


class PayslipViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Payslip.objects.select_related("employee", "period", "payroll_line")
        # Employees can only access their own payslips
        if hasattr(user, "employee_profile"):
            return queryset.filter(employee=user.employee_profile, is_published=True)
        # Payroll officer / Admin can view all
        if user.is_payroll_officer or user.is_admin:
            return queryset
        return Payslip.objects.none()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        data = [
            {
                "id": ps.id,
                "payslip_number": ps.payslip_number,
                "period": ps.period.name,
                "employee_code": ps.employee.employee_code,
                "employee_name": ps.employee.full_name,
                "gross_earnings": ps.gross_earnings,
                "total_deductions": ps.total_deductions,
                "net_pay": ps.net_pay,
                "published_at": ps.created_at
            }
            for ps in queryset
        ]
        return Response({"results": data, "count": len(data)})

    def retrieve(self, request, *args, **kwargs):
        ps = self.get_object()
        line = ps.payroll_line
        return Response({
            "id": ps.id,
            "payslip_number": ps.payslip_number,
            "period": ps.period.name,
            "employee": {
                "name": ps.employee.full_name,
                "code": ps.employee.employee_code,
                "department": ps.employee.department.name if ps.employee.department else "—",
                "designation": ps.employee.designation.name if ps.employee.designation else "—",
                "pan": ps.employee.pan_number,
                "uan": ps.employee.uan_number
            },
            "earnings": {
                "basic": line.basic,
                "hra": line.hra,
                "special_allowance": line.special_allowance,
                "total_gross": line.gross_earnings
            },
            "deductions": {
                "pf": line.employee_pf,
                "esi": line.employee_esi,
                "professional_tax": line.professional_tax,
                "total_deductions": line.total_deductions
            },
            "net_pay": line.net_pay,
            "days": {
                "working_days": line.working_days,
                "paid_days": line.paid_days,
                "lop_days": line.lop_days
            }
        })
