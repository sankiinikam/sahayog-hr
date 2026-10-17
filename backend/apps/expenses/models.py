"""
Expenses and Company Assets Models.
ExpenseClaim, ExpenseItem, Asset, AssetAssignment.
"""
from django.db import models
from django.conf import settings
from decimal import Decimal
from apps.core.models import TimeStampedModel
from apps.organization.models import Company
from apps.employees.models import Employee
from apps.approvals.models import ApprovalRequest


class ExpenseClaim(TimeStampedModel):
    class ClaimStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"
        APPROVED = "APPROVED", "Approved"
        REIMBURSED = "REIMBURSED", "Reimbursed"
        REJECTED = "REJECTED", "Rejected"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="expense_claims")
    approval_request = models.OneToOneField(ApprovalRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name="expense_claim")
    claim_number = models.CharField(max_length=100, unique=True, db_index=True)
    title = models.CharField(max_length=200)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=20, choices=ClaimStatus.choices, default=ClaimStatus.SUBMITTED)

    class Meta:
        db_table = "exp_expense_claim"

    def __str__(self):
        return f"{self.claim_number} - {self.title} (₹{self.total_amount})"


class ExpenseItem(TimeStampedModel):
    class ExpenseCategory(models.TextChoices):
        TRAVEL = "TRAVEL", "Travel & Commute"
        MEALS = "MEALS", "Food & Meals"
        HOTEL = "HOTEL", "Accommodation"
        EQUIPMENT = "EQUIPMENT", "Hardware / Office Supplies"
        OTHER = "OTHER", "Other"

    claim = models.ForeignKey(ExpenseClaim, on_delete=models.CASCADE, related_name="items")
    category = models.CharField(max_length=30, choices=ExpenseCategory.choices, default=ExpenseCategory.TRAVEL)
    expense_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    merchant = models.CharField(max_length=150, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "exp_expense_item"


class Asset(TimeStampedModel):
    class AssetCategory(models.TextChoices):
        LAPTOP = "LAPTOP", "Laptop"
        MOBILE = "MOBILE", "Mobile Device"
        MONITOR = "MONITOR", "Monitor / Display"
        ACCESSORY = "ACCESSORY", "Peripherals"
        OTHER = "OTHER", "Other"

    class AssetStatus(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        ASSIGNED = "ASSIGNED", "Assigned"
        MAINTENANCE = "MAINTENANCE", "In Maintenance"
        RETIRED = "RETIRED", "Retired"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="assets")
    asset_code = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=30, choices=AssetCategory.choices, default=AssetCategory.LAPTOP)
    serial_number = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=AssetStatus.choices, default=AssetStatus.AVAILABLE)
    purchase_date = models.DateField(null=True, blank=True)
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        db_table = "ast_asset"

    def __str__(self):
        return f"{self.name} [{self.asset_code}] - {self.status}"


class AssetAssignment(TimeStampedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="assignment_history")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="assigned_assets")
    assigned_date = models.DateField()
    returned_date = models.DateField(null=True, blank=True)
    condition_notes = models.TextField(blank=True)

    class Meta:
        db_table = "ast_asset_assignment"
