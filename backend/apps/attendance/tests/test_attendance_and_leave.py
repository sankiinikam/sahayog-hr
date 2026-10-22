"""
Automated Tests for Attendance and Leave Business Logic.
Tests cover: duplicate punch prevention, valid check-in/out transitions,
leave balance deduction, concurrent request overlap, and approval flows.
"""
import pytest
from datetime import date, timedelta
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.accounts.models import UserRole
from apps.organization.models import Company, Department, Designation
from apps.employees.models import Employee
from apps.attendance.models import AttendancePunch, AttendanceRecord
from apps.leave.models import LeaveType, LeaveBalance, LeaveRequest
from apps.approvals.models import ApprovalStatus

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def company(db):
    return Company.objects.create(name="TechHR Corp", registration_number="REG-7771")


@pytest.fixture
def department(company):
    return Department.objects.create(company=company, name="Core Product", code="CP")


@pytest.fixture
def designation(company, department):
    return Designation.objects.create(company=company, department=department, name="Lead Engineer", code="LE")


@pytest.fixture
def manager_user(db):
    return User.objects.create_user(email="manager@test.com", password="Password123!", role=UserRole.MANAGER)


@pytest.fixture
def manager_employee(company, department, designation, manager_user):
    return Employee.objects.create(
        user=manager_user,
        company=company,
        department=department,
        designation=designation,
        employee_code="MGR001",
        first_name="Marcus",
        last_name="Boss",
        work_email="manager@test.com",
        date_of_joining="2025-01-01"
    )


@pytest.fixture
def emp_user(db):
    return User.objects.create_user(email="staff@test.com", password="Password123!", role=UserRole.EMPLOYEE)


@pytest.fixture
def employee(company, department, designation, manager_employee, emp_user):
    return Employee.objects.create(
        user=emp_user,
        company=company,
        department=department,
        designation=designation,
        reporting_manager=manager_employee,
        employee_code="EMP500",
        first_name="Sam",
        last_name="Worker",
        work_email="staff@test.com",
        date_of_joining="2026-01-01"
    )


@pytest.fixture
def leave_type(company):
    return LeaveType.objects.create(
        company=company,
        name="Casual Leave",
        code="CL",
        annual_quota=12.0
    )


@pytest.mark.django_db
class TestAttendanceEngine:
    def test_clock_in_and_duplicate_prevention(self, api_client, employee, emp_user):
        api_client.force_authenticate(user=emp_user)

        # 1. First Clock-in
        res1 = api_client.post("/api/v1/attendance/punch/", {"punch_type": "IN"})
        assert res1.status_code == status.HTTP_201_CREATED
        assert AttendancePunch.objects.filter(employee=employee, punch_type="IN").count() == 1

        # 2. Immediate Duplicate Clock-in within 60s should be rejected with 400
        res2 = api_client.post("/api/v1/attendance/punch/", {"punch_type": "IN"})
        assert res2.status_code == status.HTTP_400_BAD_REQUEST

    def test_clock_in_and_clock_out_calculates_work_day(self, api_client, employee, emp_user):
        api_client.force_authenticate(user=emp_user)
        api_client.post("/api/v1/attendance/punch/", {"punch_type": "IN"})
        res_out = api_client.post("/api/v1/attendance/punch/", {"punch_type": "OUT"})
        assert res_out.status_code == status.HTTP_201_CREATED

        record = AttendanceRecord.objects.get(employee=employee, attendance_date=timezone.now().date())
        assert record.first_in is not None
        assert record.last_out is not None

    def test_attendance_late_marker_and_batch_mark(self, api_client, manager_user, employee):
        api_client.force_authenticate(user=manager_user)
        test_date = "2026-10-22"

        # 1. Test marking with late flag
        res = api_client.post("/api/v1/attendance/records/", {
            "employee_id": employee.id,
            "attendance_date": test_date,
            "status": "PRESENT",
            "first_in": "09:45:00",
            "last_out": "20:00:00",
            "is_late": True,
            "late_minutes": 45
        })
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["is_late"] is True
        assert res.data["late_minutes"] == 45

        # 2. Test batch marking
        batch_res = api_client.post("/api/v1/attendance/records/batch-mark/", {
            "employee_ids": [employee.id],
            "attendance_date": "2026-10-23",
            "status": "PRESENT"
        })
        assert batch_res.status_code == status.HTTP_200_OK
        rec2 = AttendanceRecord.objects.get(employee=employee, attendance_date="2026-10-23")
        assert rec2.status == "PRESENT"



@pytest.mark.django_db
class TestLeaveEngine:
    def test_leave_application_and_approval_flow(self, api_client, employee, emp_user, manager_user, leave_type):
        api_client.force_authenticate(user=emp_user)

        start = (date.today() + timedelta(days=2)).isoformat()
        end = (date.today() + timedelta(days=3)).isoformat()

        # 1. Submit leave request (2 days)
        res = api_client.post("/api/v1/leave/requests/", {
            "leave_type": leave_type.id,
            "start_date": start,
            "end_date": end,
            "reason": "Personal errands"
        })
        assert res.status_code == status.HTTP_201_CREATED
        req_id = res.data["id"]

        # Check balance reserved
        bal = LeaveBalance.objects.get(employee=employee, leave_type=leave_type, year=date.today().year)
        assert bal.pending_approval == 2.0
        assert bal.available_balance == 10.0

        # 2. Manager approves leave
        api_client.force_authenticate(user=manager_user)
        app_res = api_client.post(f"/api/v1/leave/requests/{req_id}/approve/", {"comments": "Approved. Enjoy."})
        assert app_res.status_code == status.HTTP_200_OK

        # Balance finalized (used: 2.0, pending: 0.0, available: 10.0)
        bal.refresh_from_db()
        assert bal.used == 2.0
        assert bal.pending_approval == 0.0
        assert bal.available_balance == 10.0

    def test_overlapping_leave_rejected(self, api_client, employee, emp_user, leave_type):
        api_client.force_authenticate(user=emp_user)
        start = (date.today() + timedelta(days=5)).isoformat()
        end = (date.today() + timedelta(days=7)).isoformat()

        # 1. First request
        api_client.post("/api/v1/leave/requests/", {
            "leave_type": leave_type.id,
            "start_date": start,
            "end_date": end,
            "reason": "Trip"
        })

        # 2. Second overlapping request
        overlap_res = api_client.post("/api/v1/leave/requests/", {
            "leave_type": leave_type.id,
            "start_date": start,
            "end_date": end,
            "reason": "Conflict trip"
        })
        assert overlap_res.status_code == status.HTTP_400_BAD_REQUEST

    def test_admin_can_view_all_leave_requests_and_record_for_employee(self, api_client, employee, admin_user, leave_type):
        api_client.force_authenticate(user=admin_user)
        start = (date.today() + timedelta(days=10)).isoformat()
        end = (date.today() + timedelta(days=11)).isoformat()

        # Admin logs leave on behalf of a worker with auto_approve
        res = api_client.post("/api/v1/leave/requests/", {
            "employee_id": employee.id,
            "leave_type": leave_type.id,
            "start_date": start,
            "end_date": end,
            "reason": "Factory worker sick leave",
            "auto_approve": True
        })
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["status"] == "APPROVED"
        assert res.data["employee_id"] == employee.id

        # Admin lists all requests
        list_res = api_client.get("/api/v1/leave/requests/")
        assert list_res.status_code == status.HTTP_200_OK
        results = list_res.data.get("results", [])
        assert any(r["employee_id"] == employee.id for r in results)

