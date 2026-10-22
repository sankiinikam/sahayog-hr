"""
Employee views and nested sub-resource management.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import (
    Employee,
    EmergencyContact,
    Address,
    EmployeeBankDetail,
    EmployeeDocument,
    EmploymentHistory,
)
from .serializers import (
    EmployeeListSerializer,
    EmployeeDetailSerializer,
    EmergencyContactSerializer,
    AddressSerializer,
    EmployeeBankDetailSerializer,
    EmployeeDocumentSerializer,
    EmploymentHistorySerializer,
)
from apps.accounts.permissions import IsAdminOrHR, IsOwnerOrHR
from apps.accounts.models import UserRole
from apps.audit.services import log_action


class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["department", "designation", "employment_status", "employment_type", "is_active", "is_deleted"]
    search_fields = ["employee_code", "first_name", "last_name", "work_email", "personal_phone"]
    ordering_fields = ["employee_code", "date_of_joining", "first_name"]

    def get_queryset(self):
        user = self.request.user
        queryset = Employee.objects.select_related("department", "designation", "company", "reporting_manager")

        # Soft delete filter for listing (detail views like restore, retrieve can access archived records)
        if self.action == "list":
            show_deleted = str(self.request.query_params.get("show_deleted", "")).lower() in ["true", "1"]
            is_del_param = self.request.query_params.get("is_deleted")
            if is_del_param is not None:
                queryset = queryset.filter(is_deleted=str(is_del_param).lower() in ["true", "1"])
            elif not show_deleted:
                queryset = queryset.filter(is_deleted=False)
        
        # If employee, they can only view active employees or their own profile
        if user.role == UserRole.EMPLOYEE:
            if self.action in ["retrieve", "me"]:
                return queryset.filter(user=user)
            # Directory listing: only active employees
            return queryset.filter(is_active=True, is_deleted=False)
            
        # Managers can see their team and active employees
        if user.role == UserRole.MANAGER:
            return queryset
            
        # Admin and HR have full access
        return queryset

    def get_serializer_class(self):
        if self.action in ["retrieve", "create", "update", "partial_update", "me"]:
            return EmployeeDetailSerializer
        return EmployeeListSerializer

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        if self.action in ["update", "partial_update"]:
            return [permissions.IsAuthenticated(), IsOwnerOrHR()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        if not data.get("company"):
            from apps.organization.models import Company
            comp = Company.objects.first()
            if not comp:
                comp = Company.objects.create(name="Sahayog Technologies Pvt. Ltd.", registration_number="SAHAYOG-001")
            data["company"] = comp.id

        # Designation name resolution
        if data.get("designation") is not None and not isinstance(data.get("designation"), int):
            from apps.organization.models import Designation, Department
            desig_val = str(data["designation"]).strip()
            if desig_val.isdigit():
                data["designation"] = int(desig_val)
            elif desig_val:
                dept = Department.objects.first()
                comp_id = data.get("company", 1)
                desig_obj, _ = Designation.objects.get_or_create(
                    company_id=comp_id,
                    name=desig_val,
                    defaults={"code": desig_val[:10].upper(), "department": dept}
                )
                data["designation"] = desig_obj.id

        # ID proof mapping
        id_num = str(data.get("id_proof_number", "")).strip()
        id_type = str(data.get("id_proof_type", "Aadhaar")).strip()
        if id_num:
            if "pan" in id_type.lower() and not data.get("pan_number"):
                data["pan_number"] = id_num
            elif not data.get("aadhaar_number"):
                data["aadhaar_number"] = id_num

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        """Soft delete: mark employee as deleted without removing historical data."""
        from django.utils import timezone
        employee = self.get_object()
        employee.is_deleted = True
        employee.is_active = False
        employee.deleted_at = timezone.now()
        employee.save(update_fields=["is_deleted", "is_active", "deleted_at"])
        log_action(
            user=self.request.user,
            action="EMPLOYEE_DELETED",
            content_type="Employee",
            object_id=employee.id,
            object_repr=str(employee),
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )
        return Response({
            "detail": f"Employee {employee.full_name} has been archived/soft-deleted.",
            "id": employee.id,
            "is_deleted": True
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="restore", permission_classes=[permissions.IsAuthenticated, IsAdminOrHR])
    def restore(self, request, pk=None):
        """Restore a soft-deleted employee back to the active directory."""
        employee = self.get_object()
        employee.is_deleted = False
        employee.is_active = True
        employee.deleted_at = None
        employee.save(update_fields=["is_deleted", "is_active", "deleted_at"])
        log_action(
            user=self.request.user,
            action="EMPLOYEE_RESTORED",
            content_type="Employee",
            object_id=employee.id,
            object_repr=str(employee),
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )
        return Response({
            "detail": f"Employee {employee.full_name} restored successfully.",
            "id": employee.id,
            "is_deleted": False,
            "is_active": True
        }, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        employee = serializer.save()
        log_action(
            user=self.request.user,
            action="EMPLOYEE_CREATED",
            content_type="Employee",
            object_id=employee.id,
            object_repr=str(employee),
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )

    def perform_update(self, serializer):
        employee = serializer.save()
        log_action(
            user=self.request.user,
            action="EMPLOYEE_UPDATED",
            content_type="Employee",
            object_id=employee.id,
            object_repr=str(employee),
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )

    @action(detail=False, methods=["get"])
    def me(self, request):
        """Fetch current employee's complete profile."""
        profile = get_object_or_404(Employee, user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="admin-profile")
    def admin_profile(self, request, pk=None):
        """Full profile for admin panel."""
        employee = self.get_object()
        from apps.organization.models import Shift
        from apps.attendance.models import AttendanceRecord
        from datetime import date, timedelta
        
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        recent_att = AttendanceRecord.objects.filter(
            employee=employee,
            attendance_date__gte=thirty_days_ago
        )
        present_count = recent_att.filter(status="PRESENT").count()
        half_day_count = recent_att.filter(status="HALF_DAY").count()
        absent_count = recent_att.filter(status="ABSENT").count()
        leave_count = recent_att.filter(status="ON_LEAVE").count()
        
        shifts = Shift.objects.filter(company=employee.company)
        shifts_data = [
            {
                "id": s.id,
                "name": s.name,
                "start_time": str(s.start_time),
                "end_time": str(s.end_time)
            }
            for s in shifts
        ]
        
        return Response({
            "id": employee.id,
            "employee_code": employee.employee_code,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "full_name": employee.full_name,
            "work_email": employee.work_email,
            "personal_email": employee.personal_email,
            "personal_phone": employee.personal_phone,
            "work_phone": employee.work_phone,
            "gender": employee.gender,
            "date_of_birth": str(employee.date_of_birth) if employee.date_of_birth else None,
            "date_of_joining": str(employee.date_of_joining),
            "employment_type": employee.employment_type,
            "employment_status": employee.employment_status,
            "blood_group": employee.blood_group,
            "department": {
                "id": employee.department.id if employee.department else None,
                "name": employee.department.name if employee.department else "",
            },
            "designation": {
                "id": employee.designation.id if employee.designation else None,
                "name": employee.designation.name if employee.designation else "",
            },
            "is_active": employee.is_active,
            "is_deleted": employee.is_deleted,
            "id_proof_type": getattr(employee, "id_proof_type", "Aadhaar"),
            "id_proof_number": getattr(employee, "id_proof_number", "") or employee.aadhaar_number or employee.pan_number or "",
            "aadhaar_number": employee.aadhaar_number,
            "pan_number": employee.pan_number,
            "photo": employee.photo or "",
            "stats_30d": {
                "present": present_count,
                "half_day": half_day_count,
                "absent": absent_count,
                "on_leave": leave_count,
            },
            "available_shifts": shifts_data,
        })

    @action(detail=True, methods=["get", "patch"], url_path="salary")
    def salary(self, request, pk=None):
        """Get or update employee salary info."""
        employee = self.get_object()
        from apps.payroll.models import EmployeeSalaryAssignment, SalaryStructure
        from datetime import date
        from decimal import Decimal

        assignment = EmployeeSalaryAssignment.objects.filter(employee=employee, is_active=True).first()

        if request.method == "GET":
            if not assignment:
                return Response({
                    "monthly_gross": 0,
                    "basic_salary": 0,
                    "hra": 0,
                    "special_allowance": 0,
                    "effective_from": None,
                })
            return Response({
                "id": assignment.id,
                "monthly_gross": float(assignment.monthly_gross),
                "basic_salary": float(assignment.basic_salary),
                "hra": float(assignment.hra),
                "special_allowance": float(assignment.special_allowance),
                "effective_from": str(assignment.effective_from),
            })

        elif request.method == "PATCH":
            monthly_gross = Decimal(str(request.data.get("monthly_gross", 0)))
            basic_salary = Decimal(str(request.data.get("basic_salary", monthly_gross * Decimal("0.5"))))
            hra = Decimal(str(request.data.get("hra", monthly_gross * Decimal("0.3"))))
            special_allowance = Decimal(str(request.data.get("special_allowance", monthly_gross - basic_salary - hra)))

            if not assignment:
                structure = SalaryStructure.objects.filter(company=employee.company).first()
                if not structure:
                    structure = SalaryStructure.objects.create(
                        company=employee.company,
                        name="Standard Structure",
                        code="STD-001",
                        is_active=True,
                    )
                assignment = EmployeeSalaryAssignment.objects.create(
                    employee=employee,
                    salary_structure=structure,
                    monthly_gross=monthly_gross,
                    basic_salary=basic_salary,
                    hra=hra,
                    special_allowance=special_allowance,
                    effective_from=date.today(),
                    is_active=True,
                )
            else:
                assignment.monthly_gross = monthly_gross
                assignment.basic_salary = basic_salary
                assignment.hra = hra
                assignment.special_allowance = special_allowance
                assignment.save()

            return Response({
                "detail": "Salary updated successfully.",
                "monthly_gross": float(assignment.monthly_gross),
                "basic_salary": float(assignment.basic_salary),
                "hra": float(assignment.hra),
                "special_allowance": float(assignment.special_allowance),
            })


    # ── Sub-resources ─────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="emergency-contacts", permission_classes=[permissions.IsAuthenticated, IsOwnerOrHR])
    def add_emergency_contact(self, request, pk=None):
        employee = self.get_object()
        serializer = EmergencyContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(employee=employee)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="addresses", permission_classes=[permissions.IsAuthenticated, IsOwnerOrHR])
    def add_address(self, request, pk=None):
        employee = self.get_object()
        serializer = AddressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(employee=employee)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="bank-details", permission_classes=[permissions.IsAuthenticated, IsAdminOrHR])
    def add_bank_detail(self, request, pk=None):
        employee = self.get_object()
        serializer = EmployeeBankDetailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(employee=employee)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
