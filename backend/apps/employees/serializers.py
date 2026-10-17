"""
Serializers for Employee models.
"""
from rest_framework import serializers
from .models import (
    Employee,
    EmergencyContact,
    Address,
    EmployeeBankDetail,
    EmployeeDocument,
    EmploymentHistory,
)


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = "__all__"
        read_only_fields = ["employee"]


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = "__all__"
        read_only_fields = ["employee"]


class EmployeeBankDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeBankDetail
        fields = "__all__"
        read_only_fields = ["employee"]


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDocument
        fields = "__all__"
        read_only_fields = ["employee"]


class EmploymentHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmploymentHistory
        fields = "__all__"
        read_only_fields = ["employee", "changed_by"]


class EmployeeListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    designation_name = serializers.CharField(source="designation.name", read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_code",
            "first_name",
            "last_name",
            "full_name",
            "work_email",
            "department",
            "department_name",
            "designation",
            "designation_name",
            "employment_type",
            "employment_status",
            "date_of_joining",
            "is_active",
            "photo",
        ]


class EmployeeDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    designation_name = serializers.CharField(source="designation.name", read_only=True)
    reporting_manager_name = serializers.CharField(source="reporting_manager.full_name", read_only=True)
    emergency_contacts = EmergencyContactSerializer(many=True, read_only=True)
    addresses = AddressSerializer(many=True, read_only=True)
    bank_details = EmployeeBankDetailSerializer(many=True, read_only=True)
    documents = EmployeeDocumentSerializer(many=True, read_only=True)
    employment_history = EmploymentHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Employee
        fields = "__all__"

