"""
Leave Models: LeaveType, LeavePolicy, LeaveBalance, LeaveLedger, LeaveRequest.
"""
from django.db import models
from django.conf import settings
from decimal import Decimal
from apps.core.models import TimeStampedModel
from apps.organization.models import Company
from apps.employees.models import Employee
from apps.approvals.models import ApprovalRequest


class LeaveType(TimeStampedModel):
    class AccrualFrequency(models.TextChoices):
        MONTHLY = "MONTHLY", "Monthly"
        QUARTERLY = "QUARTERLY", "Quarterly"
        YEARLY = "YEARLY", "Yearly"
        NONE = "NONE", "No Accrual"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="leave_types")
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    accrual_frequency = models.CharField(max_length=20, choices=AccrualFrequency.choices, default=AccrualFrequency.MONTHLY)
    annual_quota = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("12.0"))
    carry_forward_max = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.0"))
    allow_half_day = models.BooleanField(default=True)
    is_paid = models.BooleanField(default=True)
    requires_approval = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "lve_leave_type"
        unique_together = ("company", "code")

    def __str__(self):
        return f"{self.name} ({self.code})"


class LeaveBalance(TimeStampedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leave_balances")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name="employee_balances")
    year = models.PositiveIntegerField(db_index=True)

    entitled = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.0"))
    carried_forward = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.0"))
    used = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.0"))
    pending_approval = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.0"))

    class Meta:
        db_table = "lve_leave_balance"
        unique_together = ("employee", "leave_type", "year")

    @property
    def available_balance(self) -> Decimal:
        return (Decimal(str(self.entitled)) + Decimal(str(self.carried_forward))) - (Decimal(str(self.used)) + Decimal(str(self.pending_approval)))

    def __str__(self):
        return f"{self.employee.employee_code} - {self.leave_type.code} ({self.year}): Avail {self.available_balance}"


class LeaveLedger(TimeStampedModel):
    class TransactionType(models.TextChoices):
        ACCRUAL = "ACCRUAL", "Accrual"
        DEBIT = "DEBIT", "Leave Taken (Debit)"
        CREDIT = "CREDIT", "Leave Cancelled (Credit)"
        ADJUSTMENT = "ADJUSTMENT", "Manual Adjustment"
        CARRY_FORWARD = "CARRY_FORWARD", "Carry Forward"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leave_ledger_entries")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    transaction_type = models.CharField(max_length=30, choices=TransactionType.choices)
    amount = models.DecimalField(max_digits=5, decimal_places=2)
    balance_after = models.DecimalField(max_digits=5, decimal_places=2)
    remarks = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = "lve_leave_ledger"
        ordering = ["-created_at"]


class LeaveRequest(TimeStampedModel):
    class DayType(models.TextChoices):
        FULL_DAY = "FULL", "Full Day"
        FIRST_HALF = "FIRST_HALF", "First Half"
        SECOND_HALF = "SECOND_HALF", "Second Half"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name="requests")
    approval_request = models.OneToOneField(ApprovalRequest, on_delete=models.CASCADE, related_name="leave_request")

    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    day_type = models.CharField(max_length=20, choices=DayType.choices, default=DayType.FULL_DAY)
    days_count = models.DecimalField(max_digits=4, decimal_places=2)
    reason = models.TextField()

    class Meta:
        db_table = "lve_leave_request"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.employee.employee_code} Leave: {self.start_date} to {self.end_date} ({self.days_count} days)"
