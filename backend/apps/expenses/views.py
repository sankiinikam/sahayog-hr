"""
Expense Claims and Asset Management API endpoints.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import ExpenseClaim, ExpenseItem, Asset, AssetAssignment
from .serializers import (
    ExpenseClaimSerializer,
    ExpenseItemSerializer,
    AssetSerializer,
    AssetAssignmentSerializer,
)
from apps.employees.models import Employee
from apps.accounts.permissions import IsAdminOrHR


class ExpenseClaimViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseClaimSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        employee = getattr(self.request.user, "employee_profile", None)
        serializer.save(employee=employee)

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, "employee_profile"):
            return ExpenseClaim.objects.filter(employee=user.employee_profile)
        if user.is_admin or user.is_hr:
            return ExpenseClaim.objects.all()
        return ExpenseClaim.objects.none()

    def list(self, request, *args, **kwargs):
        claims = self.get_queryset()
        data = [
            {
                "id": c.id,
                "claim_number": c.claim_number,
                "title": c.title,
                "total_amount": str(c.total_amount),
                "status": c.status,
                "items_count": c.items.count()
            }
            for c in claims
        ]
        return Response({"results": data, "count": len(data)})


class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.select_related("company").all()
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrHR]
    filterset_fields = ["category", "status"]

    def list(self, request, *args, **kwargs):
        assets = self.get_queryset()
        data = [
            {
                "id": a.id,
                "asset_code": a.asset_code,
                "name": a.name,
                "category": a.category,
                "serial_number": a.serial_number,
                "status": a.status
            }
            for a in assets
        ]
        return Response({"results": data, "count": len(data)})
