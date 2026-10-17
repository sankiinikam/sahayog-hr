"""
Generic Approval Workflow Models.
Used across Leave, Attendance Corrections, Salary Revisions, Expenses, etc.
"""
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


class ApprovalStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PENDING = "PENDING", "Pending Approval"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    NEEDS_REVISION = "NEEDS_REVISION", "Needs Revision"
    CANCELLED = "CANCELLED", "Cancelled"


class ApprovalType(models.TextChoices):
    LEAVE = "LEAVE", "Leave Request"
    ATTENDANCE_CORRECTION = "ATTENDANCE_CORRECTION", "Attendance Correction"
    EXPENSE = "EXPENSE", "Expense Claim"
    SALARY_REVISION = "SALARY_REVISION", "Salary Revision"
    EXIT = "EXIT", "Resignation / Exit"


class ApprovalRequest(TimeStampedModel):
    request_type = models.CharField(max_length=50, choices=ApprovalType.choices)
    status = models.CharField(max_length=30, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING, db_index=True)

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submitted_approval_requests"
    )
    assigned_approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_approval_requests"
    )
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="decided_approval_requests"
    )

    requester_notes = models.TextField(blank=True)
    approver_comments = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "wf_approval_request"
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.get_request_type_display()} #{self.id} - {self.status} ({self.requester.email})"
