"""
Payroll Data Models.
Enforces DecimalField for financial values, effective-dated salary assignments,
payroll runs, reproducible calculation snapshots, payslips, and payment reconciliation.
"""
from django.db import models
from django.conf import settings
from decimal import Decimal
from apps.core.models import TimeStampedModel
from apps.organization.models import Company
from apps.employees.models import Employee
from apps.approvals.models import ApprovalRequest


class SalaryComponent(TimeStampedModel):
    class ComponentType(models.TextChoices):
        EARNING = "EARNING", "Earning"
        DEDUCTION = "DEDUCTION", "Deduction"

    class CalculationType(models.TextChoices):
        FLAT = "FLAT", "Flat Amount"
        PERCENTAGE = "PERCENTAGE", "Percentage of Basic"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="salary_components")
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    component_type = models.CharField(max_length=20, choices=ComponentType.choices, default=ComponentType.EARNING)
    calculation_type = models.CharField(max_length=20, choices=CalculationType.choices, default=CalculationType.FLAT)
    default_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    is_taxable = models.BooleanField(default=True)
    is_statutory = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "pr_salary_component"
        unique_together = ("company", "code")

    def __str__(self):
        return f"{self.name} ({self.code}) - {self.component_type}"


class SalaryStructure(TimeStampedModel):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="salary_structures")
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "pr_salary_structure"
        unique_together = ("company", "code")

    def __str__(self):
        return f"{self.name} ({self.code})"


class EmployeeSalaryAssignment(TimeStampedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="salary_assignments")
    salary_structure = models.ForeignKey(SalaryStructure, on_delete=models.CASCADE, related_name="assigned_employees")
    monthly_gross = models.DecimalField(max_digits=12, decimal_places=2)
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    hra = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    special_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    effective_from = models.DateField(db_index=True)
    effective_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "pr_employee_salary_assignment"
        ordering = ["-effective_from"]

    def __str__(self):
        return f"{self.employee.employee_code} - Gross: ₹{self.monthly_gross} (from {self.effective_from})"


class PayrollPeriod(TimeStampedModel):
    class PeriodStatus(models.TextChoices):
        OPEN = "OPEN", "Open"
        PROCESSING = "PROCESSING", "Processing"
        CLOSED = "CLOSED", "Closed"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="payroll_periods")
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    total_days = models.PositiveIntegerField(default=30)
    status = models.CharField(max_length=20, choices=PeriodStatus.choices, default=PeriodStatus.OPEN)

    class Meta:
        db_table = "pr_payroll_period"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.name} ({self.start_date} to {self.end_date})"


class PayrollRun(TimeStampedModel):
    class RunStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        VALIDATED = "VALIDATED", "Validated"
        APPROVED = "APPROVED", "Approved"
        FINALIZED = "FINALIZED", "Finalized"

    period = models.ForeignKey(PayrollPeriod, on_delete=models.CASCADE, related_name="payroll_runs")
    approval_request = models.OneToOneField(ApprovalRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name="payroll_run")
    status = models.CharField(max_length=20, choices=RunStatus.choices, default=RunStatus.DRAFT, db_index=True)

    prepared_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="prepared_payroll_runs")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="approved_payroll_runs")
    total_gross = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_deductions = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_net = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    finalized_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "pr_payroll_run"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payroll #{self.id} for {self.period.name} [{self.status}]"


class PayrollLine(TimeStampedModel):
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="lines")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="payroll_lines")
    salary_assignment = models.ForeignKey(EmployeeSalaryAssignment, on_delete=models.SET_NULL, null=True)

    working_days = models.PositiveIntegerField(default=30)
    paid_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("30.00"))
    lop_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))

    gross_earnings = models.DecimalField(max_digits=12, decimal_places=2)
    basic = models.DecimalField(max_digits=12, decimal_places=2)
    hra = models.DecimalField(max_digits=12, decimal_places=2)
    special_allowance = models.DecimalField(max_digits=12, decimal_places=2)

    employee_pf = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    employee_esi = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    professional_tax = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2)
    net_pay = models.DecimalField(max_digits=12, decimal_places=2)

    # Immutable calculation snapshot
    snapshot_json = models.JSONField(default=dict)

    class Meta:
        db_table = "pr_payroll_line"
        unique_together = ("payroll_run", "employee")

    def __str__(self):
        return f"{self.employee.employee_code} - Net: ₹{self.net_pay}"


class Payslip(TimeStampedModel):
    payroll_line = models.OneToOneField(PayrollLine, on_delete=models.CASCADE, related_name="payslip")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="payslips")
    period = models.ForeignKey(PayrollPeriod, on_delete=models.CASCADE, related_name="payslips")
    payslip_number = models.CharField(max_length=100, unique=True, db_index=True)
    gross_earnings = models.DecimalField(max_digits=12, decimal_places=2)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2)
    net_pay = models.DecimalField(max_digits=12, decimal_places=2)
    is_published = models.BooleanField(default=False)

    class Meta:
        db_table = "pr_payslip"
        ordering = ["-period__start_date"]

    def __str__(self):
        return f"Payslip {self.payslip_number} - {self.employee.full_name}"
