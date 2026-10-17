"""
Leave Views: LeaveType listing, Balance view, Leave Request creation and Manager Approvals.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from datetime import datetime
from .models import LeaveType, LeaveBalance, LeaveRequest, LeaveLedger
from .services import LeaveService
from apps.employees.models import Employee
from apps.approvals.models import ApprovalStatus
from apps.accounts.permissions import IsAdminOrHR


class LeaveTypeViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = LeaveType.objects.filter(is_active=True)

    def list(self, request, *args, **kwargs):
        data = [
            {
                "id": lt.id,
                "name": lt.name,
                "code": lt.code,
                "annual_quota": lt.annual_quota,
                "allow_half_day": lt.allow_half_day,
                "is_paid": lt.is_paid
            }
            for lt in self.get_queryset()
        ]
        return Response({"results": data, "count": len(data)})


class LeaveBalanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.attendance.views import get_or_create_user_employee
        employee = get_or_create_user_employee(request.user)
        current_year = datetime.now().year
        balances = LeaveBalance.objects.filter(employee=employee, year=current_year).select_related("leave_type")

        data = [
            {
                "leave_type_id": b.leave_type.id,
                "leave_type_name": b.leave_type.name,
                "leave_type_code": b.leave_type.code,
                "entitled": b.entitled,
                "used": b.used,
                "pending_approval": b.pending_approval,
                "available_balance": b.available_balance
            }
            for b in balances
        ]
        return Response({"year": current_year, "results": data})


class LeaveRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        emp = getattr(user, "employee_profile", None) or Employee.objects.filter(user=user).first()
        if emp:
            return LeaveRequest.objects.filter(employee=emp).select_related("leave_type", "approval_request")
        return LeaveRequest.objects.none()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        data = [
            {
                "id": r.id,
                "leave_type": r.leave_type.name,
                "days_count": r.days_count,
                "start_date": str(r.start_date),
                "end_date": str(r.end_date),
                "day_type": r.day_type,
                "reason": r.reason,
                "status": r.approval_request.status if r.approval_request else "PENDING",
            }
            for r in queryset
        ]
        return Response({"results": data, "count": len(data)})

    def retrieve(self, request, *args, **kwargs):
        r = self.get_object()
        return Response({
            "id": r.id,
            "leave_type": r.leave_type.name,
            "days_count": r.days_count,
            "start_date": str(r.start_date),
            "end_date": str(r.end_date),
            "day_type": r.day_type,
            "reason": r.reason,
            "status": r.approval_request.status if r.approval_request else "PENDING",
        })

    def create(self, request, *args, **kwargs):
        from apps.attendance.views import get_or_create_user_employee
        employee = get_or_create_user_employee(request.user)
        leave_type_id = request.data.get("leave_type")
        start_date = datetime.strptime(request.data.get("start_date"), "%Y-%m-%d").date()
        end_date = datetime.strptime(request.data.get("end_date"), "%Y-%m-%d").date()
        day_type = request.data.get("day_type", LeaveRequest.DayType.FULL_DAY)
        reason = request.data.get("reason", "")

        leave_type = get_object_or_404(LeaveType, id=leave_type_id)

        req = LeaveService.apply_leave(
            employee=employee,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            day_type=day_type,
            reason=reason
        )

        return Response({
            "id": req.id,
            "leave_type": leave_type.name,
            "days_count": req.days_count,
            "status": req.approval_request.status,
            "start_date": req.start_date,
            "end_date": req.end_date
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        leave_req = get_object_or_404(LeaveRequest, pk=pk)
        LeaveService.process_approval(
            leave_request=leave_req,
            decision=ApprovalStatus.APPROVED,
            decided_by_user=request.user,
            comments=request.data.get("comments", "")
        )
        return Response({"detail": "Leave request approved successfully."})

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        leave_req = get_object_or_404(LeaveRequest, pk=pk)
        LeaveService.process_approval(
            leave_request=leave_req,
            decision=ApprovalStatus.REJECTED,
            decided_by_user=request.user,
            comments=request.data.get("comments", "")
        )
        return Response({"detail": "Leave request rejected."})
