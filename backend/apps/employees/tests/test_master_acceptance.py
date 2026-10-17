"""
Master End-to-End Acceptance Test Scenario.
Implements the 12-step verification workflow defined in Specification Section 18:
1. Creates a company, department, and designation.
2. Creates an employee and assigns a reporting manager.
3. Configures a shift.
4. Records attendance.
5. Submits and approves leave.
6. Creates a salary structure.
7. Generates a preliminary payroll run.
8. Validates and approves payroll.
9. Generates a payslip.
10. Verifies that the employee can access only their own payslip.
11. Records an employee exit/deactivation.
12. Verifies that historical records remain accessible to authorized roles.
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import UserRole
from apps.organization.models import Company, Department, Designation, Shift
from apps.employees.models import Employee
from apps.attendance.models import AttendancePunch, AttendanceRecord
from apps.leave.models import LeaveType, LeaveBalance, LeaveRequest
from apps.payroll.models import (
    SalaryStructure,
    EmployeeSalaryAssignment,
    PayrollPeriod,
    PayrollRun,
    Payslip,
)

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestMasterEndToEndLifecycle:
    def test_complete_employee_lifecycle_workflow(self, api_client):
        # ──────────────────────────────────────────────────────────────────────
        # 1. Create Organization Structure
        # ──────────────────────────────────────────────────────────────────────
        company = Company.objects.create(name="Omega Global Technologies", registration_number="REG-OMEGA-01")
        department = Department.objects.create(company=company, name="Platform Engineering", code="PE")
        designation = Designation.objects.create(company=company, department=department, name="Staff Engineer", code="SE")

        admin_user = User.objects.create_superuser(
            email="superadmin@omega.com", password="Password123!", first_name="Super", last_name="Admin"
        )
        manager_user = User.objects.create_user(
            email="manager@omega.com", password="Password123!", role=UserRole.MANAGER, first_name="Marcus", last_name="Director"
        )
        employee_user = User.objects.create_user(
            email="alice@omega.com", password="Password123!", role=UserRole.EMPLOYEE, first_name="Alice", last_name="Dev"
        )

        # ──────────────────────────────────────────────────────────────────────
        # 2. Onboard Manager and Employee
        # ──────────────────────────────────────────────────────────────────────
        manager = Employee.objects.create(
            user=manager_user,
            company=company,
            department=department,
            designation=designation,
            employee_code="MGR-001",
            first_name="Marcus",
            last_name="Director",
            work_email="manager@omega.com",
            date_of_joining="2025-01-01"
        )

        employee = Employee.objects.create(
            user=employee_user,
            company=company,
            department=department,
            designation=designation,
            reporting_manager=manager,
            employee_code="EMP-101",
            first_name="Alice",
            last_name="Dev",
            work_email="alice@omega.com",
            date_of_joining="2026-01-01"
        )
        assert employee.reporting_manager == manager

        # ──────────────────────────────────────────────────────────────────────
        # 3. Configure Shift
        # ──────────────────────────────────────────────────────────────────────
        shift = Shift.objects.create(
            company=company,
            name="General Morning Shift",
            start_time="09:00:00",
            end_time="17:00:00",
            grace_minutes=15,
            working_hours_per_day=8
        )
        assert shift.working_hours_per_day == 8

        # ──────────────────────────────────────────────────────────────────────
        # 4. Record Attendance (Clock In & Clock Out)
        # ──────────────────────────────────────────────────────────────────────
        api_client.force_authenticate(user=employee_user)
        punch_in = api_client.post("/api/v1/attendance/punch/", {"punch_type": "IN"})
        assert punch_in.status_code == status.HTTP_201_CREATED

        punch_out = api_client.post("/api/v1/attendance/punch/", {"punch_type": "OUT"})
        assert punch_out.status_code == status.HTTP_201_CREATED

        today_record = AttendanceRecord.objects.filter(employee=employee).order_by("-attendance_date").first()
        assert today_record is not None
        assert today_record.first_in is not None
        assert today_record.last_out is not None

        # ──────────────────────────────────────────────────────────────────────
        # 5. Submit and Approve Leave Request
        # ──────────────────────────────────────────────────────────────────────
        leave_type = LeaveType.objects.create(
            company=company,
            name="Earned Leave",
            code="EL",
            annual_quota=Decimal("15.00")
        )

        leave_start = (date.today() + timedelta(days=2)).isoformat()
        leave_end = (date.today() + timedelta(days=3)).isoformat()

        # Employee applies for 2 days leave
        l_res = api_client.post("/api/v1/leave/requests/", {
            "leave_type": leave_type.id,
            "start_date": leave_start,
            "end_date": leave_end,
            "reason": "Personal time off"
        })
        assert l_res.status_code == status.HTTP_201_CREATED
        leave_id = l_res.data["id"]

        # Manager approves
        api_client.force_authenticate(user=manager_user)
        app_res = api_client.post(f"/api/v1/leave/requests/{leave_id}/approve/", {"comments": "Approved."})
        assert app_res.status_code == status.HTTP_200_OK

        # Verify balance deduction
        bal = LeaveBalance.objects.get(employee=employee, leave_type=leave_type, year=date.today().year)
        assert bal.used == Decimal("2.00")
        assert bal.available_balance == Decimal("13.00")

        # ──────────────────────────────────────────────────────────────────────
        # 6. Create Salary Structure & Effective Assignment
        # ──────────────────────────────────────────────────────────────────────
        structure = SalaryStructure.objects.create(company=company, name="Staff Tech Grade 1", code="STG-01")
        salary_assign = EmployeeSalaryAssignment.objects.create(
            employee=employee,
            salary_structure=structure,
            monthly_gross=Decimal("60000.00"),
            basic_salary=Decimal("30000.00"),
            hra=Decimal("15000.00"),
            special_allowance=Decimal("15000.00"),
            effective_from="2026-01-01"
        )
        assert salary_assign.monthly_gross == Decimal("60000.00")

        # ──────────────────────────────────────────────────────────────────────
        # 7. Generate Preliminary Payroll Run
        # ──────────────────────────────────────────────────────────────────────
        payroll_period = PayrollPeriod.objects.create(
            company=company,
            name="January 2026 Run",
            start_date="2026-01-01",
            end_date="2026-01-31",
            total_days=31
        )

        payroll_officer = User.objects.create_user(email="officer@omega.com", password="Password123!", role=UserRole.PAYROLL)
        api_client.force_authenticate(user=payroll_officer)

        pr_res = api_client.post("/api/v1/payroll/runs/", {"period": payroll_period.id})
        assert pr_res.status_code == status.HTTP_201_CREATED
        run_id = pr_res.data["id"]

        # ──────────────────────────────────────────────────────────────────────
        # 8 & 9. Validate, Approve and Finalize Payroll -> Generate Payslip
        # ──────────────────────────────────────────────────────────────────────
        fin_res = api_client.post(f"/api/v1/payroll/runs/{run_id}/finalize/")
        assert fin_res.status_code == status.HTTP_200_OK

        run = PayrollRun.objects.get(id=run_id)
        assert run.status == PayrollRun.RunStatus.FINALIZED

        # Basic: 30000. PF (12%): 3600. PT: 200. Total Deductions: 3800. Net: 56200.
        payslip = Payslip.objects.get(employee=employee, period=payroll_period)
        assert payslip.gross_earnings == Decimal("60000.00")
        assert payslip.total_deductions == Decimal("3800.00")
        assert payslip.net_pay == Decimal("56200.00")
        assert payslip.is_published is True

        # ──────────────────────────────────────────────────────────────────────
        # 10. Record-Level Isolation: Employee accesses ONLY their own payslip
        # ──────────────────────────────────────────────────────────────────────
        api_client.force_authenticate(user=employee_user)
        own_slip_res = api_client.get(f"/api/v1/payroll/payslips/{payslip.id}/")
        assert own_slip_res.status_code == status.HTTP_200_OK
        assert Decimal(str(own_slip_res.data["net_pay"])) == Decimal("56200.00")

        # Other employee trying to access this payslip is denied
        other_user = User.objects.create_user(email="intruder@omega.com", password="Password123!", role=UserRole.EMPLOYEE)
        other_emp = Employee.objects.create(
            user=other_user,
            company=company,
            department=department,
            designation=designation,
            employee_code="EMP-999",
            first_name="Intruder",
            last_name="Test",
            work_email="intruder@omega.com",
            date_of_joining="2026-01-01"
        )
        api_client.force_authenticate(user=other_user)
        unauth_slip = api_client.get(f"/api/v1/payroll/payslips/{payslip.id}/")
        assert unauth_slip.status_code == status.HTTP_404_NOT_FOUND

        # ──────────────────────────────────────────────────────────────────────
        # 11 & 12. Employee Exit / Deactivation & Historical Data Preservation
        # ──────────────────────────────────────────────────────────────────────
        api_client.force_authenticate(user=admin_user)
        employee.deactivate()
        assert employee.is_active is False
        assert employee.deactivated_at is not None

        # Verify historical records remain fully preserved and queryable
        assert AttendanceRecord.objects.filter(employee=employee).count() > 0
        assert LeaveRequest.objects.filter(employee=employee).count() > 0
        assert Payslip.objects.filter(employee=employee).count() > 0
        assert EmployeeSalaryAssignment.objects.filter(employee=employee).count() > 0

        # Admin can still retrieve employee profile and history
        emp_detail = api_client.get(f"/api/v1/employees/{employee.id}/")
        assert emp_detail.status_code == status.HTTP_200_OK
        assert emp_detail.data["is_active"] is False
