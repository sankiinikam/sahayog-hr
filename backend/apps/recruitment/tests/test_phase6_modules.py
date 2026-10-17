"""
Tests for Phase 6 modules: Recruitment, Expenses, Notifications, and Reports.
"""
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import UserRole
from apps.organization.models import Company, Department, Designation
from apps.employees.models import Employee
from apps.recruitment.models import JobRequisition, Candidate
from apps.expenses.models import ExpenseClaim, Asset
from apps.notifications.models import Notification, Announcement

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def company(db):
    return Company.objects.create(name="Apex Enterprise", registration_number="REG-991")


@pytest.fixture
def department(company):
    return Department.objects.create(company=company, name="Talent Acquisition", code="TA")


@pytest.fixture
def designation(company, department):
    return Designation.objects.create(company=company, department=department, name="Recruiter", code="REC")


@pytest.fixture
def hr_user(db):
    return User.objects.create_user(email="recruiter@test.com", password="Password123!", role=UserRole.HR)


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(email="candidate_emp@test.com", password="Password123!", role=UserRole.EMPLOYEE)


@pytest.fixture
def employee(company, department, designation, employee_user):
    return Employee.objects.create(
        user=employee_user,
        company=company,
        department=department,
        designation=designation,
        employee_code="REC001",
        first_name="Liam",
        last_name="Staff",
        work_email="candidate_emp@test.com",
        date_of_joining="2026-01-01"
    )


@pytest.mark.django_db
class TestPhase6Modules:
    def test_job_requisition_and_candidate_pipeline(self, api_client, hr_user, company, department, designation):
        api_client.force_authenticate(user=hr_user)

        # 1. Create Job Requisition
        req_res = api_client.post("/api/v1/recruitment/requisitions/", {
            "company": company.id,
            "department": department.id,
            "designation": designation.id,
            "title": "Senior Frontend Developer",
            "vacancies": 2
        })
        assert req_res.status_code == status.HTTP_201_CREATED
        req_id = req_res.data["id"]

        # 2. Add Candidate
        cand_res = api_client.post("/api/v1/recruitment/candidates/", {
            "requisition": req_id,
            "full_name": "Jane Candidate",
            "email": "jane@applicant.com",
            "phone": "+91 9876543210",
            "stage": "APPLIED"
        })
        assert cand_res.status_code == status.HTTP_201_CREATED
        assert Candidate.objects.filter(requisition_id=req_id).count() == 1

    def test_expense_claims_and_asset_inventory(self, api_client, employee, employee_user, hr_user, company):
        # 1. Submit expense claim
        api_client.force_authenticate(user=employee_user)
        exp_res = api_client.post("/api/v1/expenses/claims/", {
            "claim_number": "EXP-2026-001",
            "title": "Client Onsite Travel",
            "total_amount": "1450.00"
        })
        assert exp_res.status_code == status.HTTP_201_CREATED

        # 2. Add company asset (HR only)
        api_client.force_authenticate(user=hr_user)
        asset_res = api_client.post("/api/v1/expenses/assets/", {
            "company": company.id,
            "asset_code": "LAP-042",
            "name": "ThinkPad T14",
            "category": "LAPTOP",
            "serial_number": "SN-99887766",
            "status": "AVAILABLE"
        })
        assert asset_res.status_code == status.HTTP_201_CREATED

    def test_notifications_and_analytics_summary(self, api_client, hr_user, employee_user):
        # 1. Create notification
        notif = Notification.objects.create(
            user=employee_user,
            title="Leave Approved",
            message="Your leave request for next Monday has been approved."
        )

        api_client.force_authenticate(user=employee_user)
        notif_res = api_client.get("/api/v1/notifications/alerts/")
        assert notif_res.status_code == status.HTTP_200_OK
        assert notif_res.data["count"] == 1

        # Mark as read
        read_res = api_client.post(f"/api/v1/notifications/alerts/{notif.id}/read/")
        assert read_res.status_code == status.HTTP_200_OK
        notif.refresh_from_db()
        assert notif.is_read is True

        # 2. View HR Dashboard Summary (HR only)
        api_client.force_authenticate(user=hr_user)
        summary_res = api_client.get("/api/v1/reports/summary/")
        assert summary_res.status_code == status.HTTP_200_OK
        assert "headcount" in summary_res.data
        assert "latest_payroll" in summary_res.data

