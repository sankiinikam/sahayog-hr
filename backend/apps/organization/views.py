"""
Views for Organization API endpoints.
"""
from rest_framework import viewsets, permissions
from .models import Company, Department, Designation, WorkLocation, Shift, Holiday
from .serializers import (
    CompanySerializer,
    DepartmentSerializer,
    DesignationSerializer,
    WorkLocationSerializer,
    ShiftSerializer,
    HolidaySerializer,
)
from apps.accounts.permissions import IsAdminOrHR


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        if not Company.objects.exists():
            Company.objects.create(
                name="Sahayog Technologies Pvt. Ltd.",
                registration_number="U72900MH2026PTC123456",
                city="Pune",
                state="Maharashtra",
                country="India",
                currency_code="INR",
            )
        return super().list(request, *args, **kwargs)


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related("company").all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["company", "is_active"]
    search_fields = ["name", "code"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated()]


class DesignationViewSet(viewsets.ModelViewSet):
    queryset = Designation.objects.select_related("company", "department").all()
    serializer_class = DesignationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["company", "department", "is_active"]
    search_fields = ["name", "code", "grade"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated()]



class WorkLocationViewSet(viewsets.ModelViewSet):
    queryset = WorkLocation.objects.all()
    serializer_class = WorkLocationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrHR]


class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrHR]


class HolidayViewSet(viewsets.ModelViewSet):
    queryset = Holiday.objects.all().order_by("holiday_date")
    serializer_class = HolidaySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["company", "holiday_type", "is_optional"]
