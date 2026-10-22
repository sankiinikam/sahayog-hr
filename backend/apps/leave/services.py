"""
Leave Management Business Logic Services.
Handles Leave Application, Concurrency, Balance Reservation, and Approvals.
"""
from decimal import Decimal
from datetime import date
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import LeaveType, LeaveBalance, LeaveLedger, LeaveRequest
from apps.employees.models import Employee
from apps.approvals.models import ApprovalRequest, ApprovalStatus, ApprovalType


class LeaveService:
    @staticmethod
    @transaction.atomic
    def apply_leave(
        employee: Employee,
        leave_type: LeaveType,
        start_date: date,
        end_date: date,
        day_type: str,
        reason: str,
        requester_user=None,
        admin_override: bool = False,
    ) -> LeaveRequest:
        if end_date < start_date:
            raise ValidationError("End date cannot be earlier than start date.")

        # 1. Calculate requested days
        if day_type in [LeaveRequest.DayType.FIRST_HALF, LeaveRequest.DayType.SECOND_HALF]:
            days_count = Decimal("0.5")
        else:
            days_count = Decimal((end_date - start_date).days + 1)

        # 2. Check for overlapping active requests
        overlapping = LeaveRequest.objects.filter(
            employee=employee,
            approval_request__status__in=[ApprovalStatus.PENDING, ApprovalStatus.APPROVED],
            start_date__lte=end_date,
            end_date__gte=start_date
        ).exists()

        if overlapping:
            raise ValidationError("Active or approved leave request already exists overlapping these dates.")

        # 3. Check leave balance with row-locking (select_for_update)
        year = start_date.year
        balance, _ = LeaveBalance.objects.select_for_update().get_or_create(
            employee=employee,
            leave_type=leave_type,
            year=year,
            defaults={"entitled": leave_type.annual_quota}
        )

        if balance.available_balance < days_count and not admin_override:
            raise ValidationError(
                f"Insufficient leave balance. Available: {balance.available_balance}, Requested: {days_count}."
            )

        # 4. Reserve balance (increment pending_approval)
        balance.pending_approval += days_count
        balance.save()

        # 5. Determine valid requester user
        req_user = requester_user or employee.user
        if not req_user:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            req_user = User.objects.filter(is_superuser=True).first() or User.objects.first()

        # 6. Create generic ApprovalRequest
        approval_req = ApprovalRequest.objects.create(
            request_type=ApprovalType.LEAVE,
            status=ApprovalStatus.PENDING,
            requester=req_user,
            assigned_approver=employee.reporting_manager.user if (employee.reporting_manager and employee.reporting_manager.user) else None,
            requester_notes=reason
        )

        # 7. Create LeaveRequest linked to approval
        leave_request = LeaveRequest.objects.create(
            employee=employee,
            leave_type=leave_type,
            approval_request=approval_req,
            start_date=start_date,
            end_date=end_date,
            day_type=day_type,
            days_count=days_count,
            reason=reason
        )

        return leave_request

    @staticmethod
    @transaction.atomic
    def process_approval(
        leave_request: LeaveRequest,
        decision: str,
        decided_by_user,
        comments: str = ""
    ) -> LeaveRequest:
        approval_req = leave_request.approval_request
        if approval_req.status != ApprovalStatus.PENDING:
            raise ValidationError(f"This leave request is already {approval_req.status}.")

        year = leave_request.start_date.year
        balance = LeaveBalance.objects.select_for_update().get(
            employee=leave_request.employee,
            leave_type=leave_request.leave_type,
            year=year
        )

        if decision == ApprovalStatus.APPROVED:
            approval_req.status = ApprovalStatus.APPROVED
            balance.pending_approval -= leave_request.days_count
            balance.used += leave_request.days_count
            balance.save()

            # Record immutable audit ledger entry
            LeaveLedger.objects.create(
                employee=leave_request.employee,
                leave_type=leave_request.leave_type,
                transaction_type=LeaveLedger.TransactionType.DEBIT,
                amount=leave_request.days_count,
                balance_after=balance.available_balance,
                remarks=f"Leave approved from {leave_request.start_date} to {leave_request.end_date}",
                created_by=decided_by_user
            )

        elif decision == ApprovalStatus.REJECTED:
            approval_req.status = ApprovalStatus.REJECTED
            # Release reserved balance
            balance.pending_approval -= leave_request.days_count
            balance.save()

        approval_req.decided_by = decided_by_user
        approval_req.decided_at = timezone.now()
        approval_req.approver_comments = comments
        approval_req.save()

        return leave_request

