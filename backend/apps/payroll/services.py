"""
Payroll Engine Calculation and Workflow Services.
Handles proration, statutory deductions (PF, ESI, Professional Tax),
reproducible line generation, approval transitions, and payslip publication.
"""
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import (
    PayrollPeriod,
    PayrollRun,
    PayrollLine,
    Payslip,
    EmployeeSalaryAssignment,
)
from apps.employees.models import Employee
from apps.approvals.models import ApprovalRequest, ApprovalStatus, ApprovalType


class PayrollService:
    @staticmethod
    def _round(value: Decimal) -> Decimal:
        return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @classmethod
    @transaction.atomic
    def generate_payroll_run(cls, period: PayrollPeriod, prepared_by_user) -> PayrollRun:
        # Check if active run already exists
        if PayrollRun.objects.filter(period=period, status__in=[PayrollRun.RunStatus.APPROVED, PayrollRun.RunStatus.FINALIZED]).exists():
            raise ValidationError("A finalized or approved payroll run already exists for this period.")

        # Create or reuse DRAFT run
        payroll_run, _ = PayrollRun.objects.get_or_create(
            period=period,
            status=PayrollRun.RunStatus.DRAFT,
            defaults={"prepared_by": prepared_by_user}
        )

        # Clear any prior unapproved draft lines
        payroll_run.lines.all().delete()

        eligible_employees = Employee.objects.filter(
            company=period.company,
            is_active=True,
            date_of_joining__lte=period.end_date
        ).select_related("company")

        total_gross = Decimal("0.00")
        total_deductions = Decimal("0.00")
        total_net = Decimal("0.00")

        for emp in eligible_employees:
            # Active salary assignment
            assignment = EmployeeSalaryAssignment.objects.filter(
                employee=emp,
                effective_from__lte=period.end_date,
                is_active=True
            ).order_by("-effective_from").first()

            if not assignment:
                continue

            working_days = period.total_days
            paid_days = Decimal(str(working_days))
            lop_days = Decimal("0.00")

            # Proration factor
            proration = paid_days / Decimal(str(working_days))

            # Earnings (prorated)
            basic = cls._round(assignment.basic_salary * proration)
            hra = cls._round(assignment.hra * proration)
            special_allowance = cls._round(assignment.special_allowance * proration)
            gross_earnings = basic + hra + special_allowance

            # Deductions
            # PF: 12% of basic (capped under standard statutory basic rules if desired)
            employee_pf = cls._round(basic * Decimal("0.12"))

            # ESI: 0.75% of gross if gross <= ₹21,000
            if gross_earnings <= Decimal("21000.00"):
                employee_esi = cls._round(gross_earnings * Decimal("0.0075"))
            else:
                employee_esi = Decimal("0.00")

            # Professional tax: standard slab ₹200 (₹0 if gross < ₹10,000)
            if gross_earnings >= Decimal("10000.00"):
                professional_tax = Decimal("200.00")
            else:
                professional_tax = Decimal("0.00")

            emp_deductions = employee_pf + employee_esi + professional_tax
            net_pay = gross_earnings - emp_deductions

            # Immutable snapshot of the calculation
            snapshot = {
                "employee_code": emp.employee_code,
                "employee_name": emp.full_name,
                "monthly_gross": str(assignment.monthly_gross),
                "basic": str(basic),
                "hra": str(hra),
                "special_allowance": str(special_allowance),
                "gross_earnings": str(gross_earnings),
                "employee_pf": str(employee_pf),
                "employee_esi": str(employee_esi),
                "professional_tax": str(professional_tax),
                "total_deductions": str(emp_deductions),
                "net_pay": str(net_pay),
                "working_days": working_days,
                "paid_days": str(paid_days),
                "lop_days": str(lop_days)
            }

            PayrollLine.objects.create(
                payroll_run=payroll_run,
                employee=emp,
                salary_assignment=assignment,
                working_days=working_days,
                paid_days=paid_days,
                lop_days=lop_days,
                gross_earnings=gross_earnings,
                basic=basic,
                hra=hra,
                special_allowance=special_allowance,
                employee_pf=employee_pf,
                employee_esi=employee_esi,
                professional_tax=professional_tax,
                total_deductions=emp_deductions,
                net_pay=net_pay,
                snapshot_json=snapshot
            )

            total_gross += gross_earnings
            total_deductions += emp_deductions
            total_net += net_pay

        payroll_run.total_gross = total_gross
        payroll_run.total_deductions = total_deductions
        payroll_run.total_net = total_net
        payroll_run.status = PayrollRun.RunStatus.VALIDATED
        payroll_run.save()

        return payroll_run

    @classmethod
    @transaction.atomic
    def finalize_payroll_run(cls, payroll_run: PayrollRun, approved_by_user) -> PayrollRun:
        if payroll_run.status == PayrollRun.RunStatus.FINALIZED:
            raise ValidationError("Payroll run is already finalized.")

        payroll_run.status = PayrollRun.RunStatus.FINALIZED
        payroll_run.approved_by = approved_by_user
        payroll_run.finalized_at = timezone.now()
        payroll_run.save()

        # Generate individual employee payslips
        for line in payroll_run.lines.select_related("employee", "payroll_run__period"):
            payslip_number = f"PS-{payroll_run.period.start_date.strftime('%Y%m')}-{line.employee.employee_code}"
            Payslip.objects.update_or_create(
                payroll_line=line,
                defaults={
                    "employee": line.employee,
                    "period": payroll_run.period,
                    "payslip_number": payslip_number,
                    "gross_earnings": line.gross_earnings,
                    "total_deductions": line.total_deductions,
                    "net_pay": line.net_pay,
                    "is_published": True
                }
            )

        # Close period
        period = payroll_run.period
        period.status = PayrollPeriod.PeriodStatus.CLOSED
        period.save()

        return payroll_run

