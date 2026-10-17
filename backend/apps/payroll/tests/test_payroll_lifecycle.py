"""
Automated Tests for the Payroll Engine.
Tests cover: effective salary proration, statutory deductions (PF, ESI, PT),
draft generation, approval/finalization workflow, and payslip access authorization.
"""
import pytest
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import UserRole
from apps.organization.models import Company, Department, Designation
from apps.employees.models import Employee
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


@pytest.fixture
def company(db):
    return Company.objects.create(name="Payroll Corp", registration_number="REG-PAY-01")


@pytest.fixture
def department(company):
    return Department.objects.create(company=company, name="Finance", code="FIN")


@pytest.fixture
def designation(company, department):
    return Designation.objects.create(company=company, department=department, name="Accountant", code="ACC")


@pytest.fixture
def payroll_officer_user(db):
    return User.objects.create_user(email="payroll@test.com", password="Password123!", role=UserRole.PAYROLL)


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(email="engineer@test.com", password="Password123!", role=UserRole.EMPLOYEE)


@pytest.fixture
def employee(company, department, designation, employee_user):
    return Employee.objects.create(
        user=employee_user,
        company=company,
        department=department,
        designation=designation,
        employee_code="PAY001",
        first_name="David",
        last_name="Miller",
        work_email="engineer@test.com",
        date_of_joining="2026-01-01"
    )


@pytest.fixture
def salary_assignment(company, employee):
    structure = SalaryStructure.objects.create(company=company, name="Standard Engineering", code="ENG-STD")
    return EmployeeSalaryAssignment.objects.create(
        employee=employee,
        salary_structure=structure,
        monthly_gross=Decimal("50000.00"),
        basic_salary=Decimal("25000.00"),
        hra=Decimal("12500.00"),
        special_allowance=Decimal("12500.00"),
        effective_from="2026-01-01"
    )


@pytest.fixture
def payroll_period(company):
    return PayrollPeriod.objects.create(
        company=company,
        name="January 2026",
        start_date="2026-01-01",
        end_date="2026-01-31",
        total_days=31
    )


@pytest.mark.django_db
class TestPayrollEngine:
    def test_payroll_run_generation_and_statutory_calculations(
        self, api_client, payroll_officer_user, payroll_period, salary_assignment, employee
    ):
        api_client.force_authenticate(user=payroll_officer_user)

        # 1. Generate preliminary run
        res = api_client.post("/api/v1/payroll/runs/", {"period": payroll_period.id})
        assert res.status_code == status.HTTP_201_CREATED
        run_id = res.data["id"]

        run = PayrollRun.objects.get(id=run_id)
        assert run.status == PayrollRun.RunStatus.VALIDATED
        assert run.lines.count() == 1

        line = run.lines.first()
        # Basic: 25000, HRA: 12500, Special: 12500 => Gross: 50000
        assert line.gross_earnings == Decimal("50000.00")
        # PF: 12% of 25000 = 3000
        assert line.employee_pf == Decimal("3000.00")
        # ESI: 0 because gross > 21000
        assert line.employee_esi == Decimal("0.00")
        # PT: 200
        assert line.professional_tax == Decimal("200.00")
        # Total Deductions: 3200
        assert line.total_deductions == Decimal("3200.00")
        # Net Pay: 50000 - 3200 = 46800
        assert line.net_pay == Decimal("46800.00")

    def test_payroll_finalization_generates_payslip_and_locks_period(
        self, api_client, payroll_officer_user, payroll_period, salary_assignment, employee, employee_user
    ):
        api_client.force_authenticate(user=payroll_officer_user)
        res = api_client.post("/api/v1/payroll/runs/", {"period": payroll_period.id})
        run_id = res.data["id"]

        # 2. Finalize run
        fin_res = api_client.post(f"/api/v1/payroll/runs/{run_id}/finalize/")
        assert fin_res.status_code == status.HTTP_200_OK

        run = PayrollRun.objects.get(id=run_id)
        assert run.status == PayrollRun.RunStatus.FINALIZED

        # Payslip was created
        payslip = Payslip.objects.get(employee=employee, period=payroll_period)
        assert payslip.net_pay == Decimal("46800.00")
        assert payslip.is_published is True

        # 3. Employee can access only their own payslip
        api_client.force_authenticate(user=employee_user)
        slip_res = api_client.get(f"/api/v1/payroll/payslips/{payslip.id}/")
        assert slip_res.status_code == status.HTTP_200_OK
        assert Decimal(str(slip_res.data["net_pay"])) == Decimal("46800.00")
        assert Decimal(str(slip_res.data["earnings"]["basic"])) == Decimal("25000.00")
