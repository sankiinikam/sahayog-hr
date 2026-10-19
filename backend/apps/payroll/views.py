"""
Payroll API Views: Periods, Structure assignments, Execution runs, and Payslips.
"""
import csv
from django.http import HttpResponse
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
        data = []
        for ps in queryset:
            emp = ps.employee
            bank = emp.bank_details.filter(is_primary=True).first()
            data.append({
                "id": ps.id,
                "payslip_number": ps.payslip_number,
                "period": ps.period.name,
                "employee_code": emp.employee_code,
                "employee_name": emp.full_name,
                "employee_phone": emp.personal_phone or emp.work_phone or "",
                "employee_email": emp.work_email or "",
                "account_number": bank.account_number if bank else "",
                "ifsc_code": bank.ifsc_code if bank else "",
                "bank_name": bank.bank_name if bank else "",
                "gross_earnings": ps.gross_earnings,
                "total_deductions": ps.total_deductions,
                "net_pay": ps.net_pay,
                "published_at": ps.created_at
            })
        return Response({"results": data, "count": len(data)})

    def retrieve(self, request, *args, **kwargs):
        ps = self.get_object()
        line = ps.payroll_line
        emp = ps.employee
        bank = emp.bank_details.filter(is_primary=True).first()
        return Response({
            "id": ps.id,
            "payslip_number": ps.payslip_number,
            "period": ps.period.name,
            "employee": {
                "name": emp.full_name,
                "code": emp.employee_code,
                "department": emp.department.name if emp.department else "—",
                "designation": emp.designation.name if emp.designation else "—",
                "pan": emp.pan_number or "—",
                "uan": emp.uan_number or "—",
                "phone": emp.personal_phone or emp.work_phone or "",
                "email": emp.work_email or "",
                "account_number": bank.account_number if bank else "—",
                "ifsc_code": bank.ifsc_code if bank else "—",
                "bank_name": bank.bank_name if bank else "—",
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

    @action(detail=False, methods=["get"], url_path="bank-payout-csv")
    def bank_payout_csv(self, request):
        """Generates a downloadable CSV batch file formatted for Corporate NetBanking transfers."""
        queryset = self.get_queryset()
        bank_format = request.query_params.get("format", "NEFT").upper()
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="Sahayog_Bank_Payout_{bank_format}.csv"'
        writer = csv.writer(response)

        if bank_format == "HDFC":
            writer.writerow([
                "Transaction Type", "Beneficiary Code", "Beneficiary Account Number", "Instrument Amount",
                "Beneficiary Name", "Drawee Location", "Print Location", "Beneficiary Email", "Payment Date"
            ])
            for ps in queryset:
                emp = ps.employee
                bank = emp.bank_details.filter(is_primary=True).first()
                acc = bank.account_number if bank else f"50100{ps.id:07d}"
                writer.writerow([
                    "NEFT", emp.employee_code, acc, ps.net_pay, emp.full_name,
                    "MUMBAI", "MUMBAI", emp.work_email, ps.created_at.strftime("%d/%m/%Y")
                ])
        elif bank_format == "ICICI":
            writer.writerow([
                "Debit Account No", "Beneficiary Name", "Beneficiary Account No", "IFSC Code",
                "Amount", "Currency", "Customer Reference", "Payment Date", "Remarks"
            ])
            for ps in queryset:
                emp = ps.employee
                bank = emp.bank_details.filter(is_primary=True).first()
                acc = bank.account_number if bank else f"002401{ps.id:06d}"
                ifsc = bank.ifsc_code if bank else "ICIC0000024"
                writer.writerow([
                    "002405001234", emp.full_name, acc, ifsc, ps.net_pay,
                    "INR", emp.employee_code, ps.created_at.strftime("%d/%m/%Y"), f"Salary {ps.period.name}"
                ])
        else:
            # Standard Corporate NEFT / RTGS batch format
            writer.writerow([
                "Sr No", "Employee Code", "Beneficiary Name", "Account Number", "IFSC Code",
                "Amount (INR)", "Payment Date", "Remarks / Narration", "Mobile Number", "Email"
            ])
            for idx, ps in enumerate(queryset, start=1):
                emp = ps.employee
                bank = emp.bank_details.filter(is_primary=True).first()
                acc = bank.account_number if bank else f"50100{ps.id:07d}"
                ifsc = bank.ifsc_code if bank else "HDFC0001234"
                writer.writerow([
                    idx, emp.employee_code, emp.full_name, acc, ifsc,
                    ps.net_pay, ps.created_at.strftime("%d/%m/%Y"),
                    f"Salary Disbursal {ps.period.name}",
                    emp.personal_phone or emp.work_phone or "", emp.work_email or ""
                ])

        return response
