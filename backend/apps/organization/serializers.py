"""
Serializers for Organization models.
"""
from rest_framework import serializers
from .models import Company, Department, Designation, WorkLocation, Shift, Holiday


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = "__all__"


class DepartmentSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    sub_departments_count = serializers.IntegerField(source="sub_departments.count", read_only=True)

    class Meta:
        model = Department
        fields = ["id", "company", "company_name", "parent", "name", "code", "is_active", "sub_departments_count", "created_at"]


class DesignationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Designation
        fields = ["id", "company", "department", "department_name", "name", "code", "grade", "is_active", "created_at"]


class WorkLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkLocation
        fields = "__all__"


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = "__all__"


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = "__all__"

