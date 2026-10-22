"""
Tests for Organization and Employee modules.
"""
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import UserRole
from apps.organization.models import Company, Department, Designation
from apps.employees.models import Employee

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def company(db):
    return Company.objects.create(
        name="Test Corp",
        registration_number="REG-1001",
        email="corp@test.com"
    )


@pytest.fixture
def department(company):
    return Department.objects.create(
        company=company,
        name="Engineering",
        code="ENG"
    )


@pytest.fixture
def designation(company, department):
    return Designation.objects.create(
        company=company,
        department=department,
        name="Senior Software Engineer",
        code="SSE"
    )


@pytest.fixture
def hr_user(db):
    return User.objects.create_user(
        email="hr@test.com",
        password="TestPassword@123",
        role=UserRole.HR
    )


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(
        email="dev@test.com",
        password="TestPassword@123",
        role=UserRole.EMPLOYEE
    )


@pytest.fixture
def employee(company, department, designation, employee_user):
    return Employee.objects.create(
        user=employee_user,
        company=company,
        department=department,
        designation=designation,
        employee_code="EMP001",
        first_name="Alice",
        last_name="Smith",
        work_email="alice@test.com",
        date_of_joining="2026-01-01"
    )


@pytest.mark.django_db
class TestOrganizationAPI:
    def test_hr_can_create_department(self, api_client, hr_user, company):
        api_client.force_authenticate(user=hr_user)
        response = api_client.post("/api/v1/organization/departments/", {
            "company": company.id,
            "name": "Human Resources",
            "code": "HR"
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["code"] == "HR"

    def test_employee_cannot_create_department(self, api_client, employee_user, company):
        api_client.force_authenticate(user=employee_user)
        response = api_client.post("/api/v1/organization/departments/", {
            "company": company.id,
            "name": "Human Resources",
            "code": "HR"
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestEmployeeAPI:
    def test_hr_can_create_employee(self, api_client, hr_user, company, department, designation):
        api_client.force_authenticate(user=hr_user)
        response = api_client.post("/api/v1/employees/", {
            "company": company.id,
            "department": department.id,
            "designation": designation.id,
            "employee_code": "EMP002",
            "first_name": "Bob",
            "last_name": "Jones",
            "work_email": "bob@test.com",
            "date_of_joining": "2026-02-01"
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["employee_code"] == "EMP002"

    def test_employee_can_view_own_profile(self, api_client, employee_user, employee):
        api_client.force_authenticate(user=employee_user)
        response = api_client.get(f"/api/v1/employees/{employee.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["first_name"] == "Alice"

    def test_employee_cannot_view_another_profile_directly(self, api_client, employee_user, company, department, designation):
        other_user = User.objects.create_user(email="other@test.com", password="Password123!")
        other_emp = Employee.objects.create(
            user=other_user,
            company=company,
            department=department,
            designation=designation,
            employee_code="EMP999",
            first_name="Eve",
            last_name="Hacker",
            work_email="eve@test.com",
            date_of_joining="2026-01-01"
        )
        api_client.force_authenticate(user=employee_user)
        response = api_client.get(f"/api/v1/employees/{other_emp.id}/")
        # Employee querying another employee's detailed record receives 404 because get_queryset isolates it
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_hr_can_create_employee_with_dob_id_proof_and_designation(self, api_client, hr_user, company, department):
        api_client.force_authenticate(user=hr_user)
        response = api_client.post("/api/v1/employees/", {
            "company": company.id,
            "department": department.id,
            "designation": "Operations Lead",
            "employee_code": "EMP005",
            "first_name": "Karan",
            "last_name": "Patil",
            "work_email": "karan.patil@test.com",
            "date_of_joining": "2026-03-01",
            "date_of_birth": "1995-07-15",
            "id_proof_type": "Aadhaar",
            "id_proof_number": "1234-5678-9012",
            "personal_phone": "+91 98220 99887"
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["date_of_birth"] == "1995-07-15"
        assert response.data["personal_phone"] == "+91 98220 99887"
        assert response.data["is_deleted"] is False

    def test_admin_soft_delete_and_restore_employee(self, api_client, hr_user, company, department, designation):
        emp = Employee.objects.create(
            company=company,
            department=department,
            designation=designation,
            employee_code="EMP006",
            first_name="Rohan",
            last_name="Mehta",
            work_email="rohan@test.com",
            date_of_joining="2026-01-01"
        )
        api_client.force_authenticate(user=hr_user)

        # 1. Soft delete
        del_res = api_client.delete(f"/api/v1/employees/{emp.id}/")
        assert del_res.status_code == status.HTTP_200_OK
        emp.refresh_from_db()
        assert emp.is_deleted is True
        assert emp.is_active is False
        assert emp.deleted_at is not None

        # 2. Hidden by default in listing
        list_res = api_client.get("/api/v1/employees/")
        codes = [e["employee_code"] for e in (list_res.data if isinstance(list_res.data, list) else list_res.data.get("results", []))]
        assert "EMP006" not in codes

        # 3. Shown when show_deleted=true
        deleted_list_res = api_client.get("/api/v1/employees/?show_deleted=true")
        del_codes = [e["employee_code"] for e in (deleted_list_res.data if isinstance(deleted_list_res.data, list) else deleted_list_res.data.get("results", []))]
        assert "EMP006" in del_codes

        # 4. Restore employee
        restore_res = api_client.post(f"/api/v1/employees/{emp.id}/restore/")
        assert restore_res.status_code == status.HTTP_200_OK
        emp.refresh_from_db()
        assert emp.is_deleted is False
        assert emp.is_active is True
        assert emp.deleted_at is None


