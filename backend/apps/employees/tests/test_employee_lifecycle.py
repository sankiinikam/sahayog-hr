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

