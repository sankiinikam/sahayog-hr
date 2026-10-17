"""
Authentication API tests.
Tests cover: login, logout, token refresh, me endpoint,
password change, permission enforcement, and role-based access.
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from apps.accounts.models import UserRole

User = get_user_model()


# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────
@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        email="admin@test.com",
        password="TestAdmin@123",
        first_name="Admin",
        last_name="User",
    )


@pytest.fixture
def hr_user(db):
    return User.objects.create_user(
        email="hr@test.com",
        password="TestHR@123",
        first_name="HR",
        last_name="Manager",
        role=UserRole.HR,
    )


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(
        email="employee@test.com",
        password="TestEmp@123",
        first_name="John",
        last_name="Doe",
        role=UserRole.EMPLOYEE,
    )


@pytest.fixture
def authenticated_client(api_client, employee_user):
    """APIClient authenticated as a basic employee."""
    api_client.force_authenticate(user=employee_user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """APIClient authenticated as admin."""
    api_client.force_authenticate(user=admin_user)
    return api_client


# ──────────────────────────────────────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────────────────────────────────────
@pytest.mark.auth
class TestHealthCheck:
    def test_health_check_returns_200(self, api_client, db):
        url = "/api/v1/health/"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] in ("ok", "degraded")
        assert "version" in response.data
        assert "django" in response.data

    def test_health_check_no_auth_required(self, api_client, db):
        """Health check must be publicly accessible."""
        url = "/api/v1/health/"
        response = api_client.get(url)
        assert response.status_code != status.HTTP_401_UNAUTHORIZED


# ──────────────────────────────────────────────────────────────────────────────
# Login
# ──────────────────────────────────────────────────────────────────────────────
@pytest.mark.auth
class TestLogin:
    url = "/api/v1/auth/login/"

    def test_login_success(self, api_client, employee_user):
        response = api_client.post(
            self.url,
            {"email": "employee@test.com", "password": "TestEmp@123"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert "user" in response.data
        assert response.data["user"]["email"] == "employee@test.com"
        assert response.data["user"]["role"] == UserRole.EMPLOYEE

    def test_login_wrong_password(self, api_client, employee_user):
        response = api_client.post(
            self.url,
            {"email": "employee@test.com", "password": "WrongPassword!"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_unknown_email(self, api_client, db):
        response = api_client.post(
            self.url,
            {"email": "nobody@test.com", "password": "SomePassword!"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_missing_fields(self, api_client):
        response = api_client.post(self.url, {"email": "employee@test.com"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_inactive_user(self, api_client, employee_user):
        employee_user.is_active = False
        employee_user.save()
        response = api_client.post(
            self.url,
            {"email": "employee@test.com", "password": "TestEmp@123"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_response_has_no_password(self, api_client, employee_user):
        """Password must never appear in any login response."""
        response = api_client.post(
            self.url,
            {"email": "employee@test.com", "password": "TestEmp@123"},
        )
        assert response.status_code == status.HTTP_200_OK
        response_str = str(response.data)
        assert "password" not in response_str.lower()


# ──────────────────────────────────────────────────────────────────────────────
# Me Endpoint
# ──────────────────────────────────────────────────────────────────────────────
@pytest.mark.auth
class TestMe:
    url = "/api/v1/auth/me/"

    def test_me_authenticated(self, authenticated_client, employee_user):
        response = authenticated_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == employee_user.email
        assert response.data["role"] == UserRole.EMPLOYEE

    def test_me_unauthenticated(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_no_password_in_response(self, authenticated_client):
        response = authenticated_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert "password" not in response.data


# ──────────────────────────────────────────────────────────────────────────────
# Password Change
# ──────────────────────────────────────────────────────────────────────────────
@pytest.mark.auth
class TestChangePassword:
    url = "/api/v1/auth/change-password/"

    def test_change_password_success(self, authenticated_client, employee_user):
        response = authenticated_client.post(
            self.url,
            {
                "current_password": "TestEmp@123",
                "new_password": "NewPass@456",
                "confirm_new_password": "NewPass@456",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        employee_user.refresh_from_db()
        assert employee_user.check_password("NewPass@456")

    def test_change_password_wrong_current(self, authenticated_client):
        response = authenticated_client.post(
            self.url,
            {
                "current_password": "WrongCurrent!",
                "new_password": "NewPass@456",
                "confirm_new_password": "NewPass@456",
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_change_password_mismatch(self, authenticated_client):
        response = authenticated_client.post(
            self.url,
            {
                "current_password": "TestEmp@123",
                "new_password": "NewPass@456",
                "confirm_new_password": "Different@789",
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_change_password_unauthenticated(self, api_client):
        response = api_client.post(
            self.url,
            {
                "current_password": "TestEmp@123",
                "new_password": "NewPass@456",
                "confirm_new_password": "NewPass@456",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ──────────────────────────────────────────────────────────────────────────────
# Password Reset
# ──────────────────────────────────────────────────────────────────────────────
@pytest.mark.auth
class TestPasswordReset:
    request_url = "/api/v1/auth/password-reset/"
    confirm_url = "/api/v1/auth/password-reset/confirm/"

    def test_reset_request_always_200(self, api_client, db):
        """Must not reveal whether account exists."""
        response = api_client.post(
            self.request_url, {"email": "nobody@nonexistent.com"}
        )
        assert response.status_code == status.HTTP_200_OK

    def test_reset_request_existing_email_also_200(self, api_client, employee_user):
        response = api_client.post(
            self.request_url, {"email": employee_user.email}
        )
        assert response.status_code == status.HTTP_200_OK

    def test_reset_confirm_invalid_token(self, api_client, db):
        response = api_client.post(
            self.confirm_url,
            {
                "token": "invalid-token-xyz",
                "new_password": "NewPass@789",
                "confirm_new_password": "NewPass@789",
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reset_confirm_valid_token(self, api_client, employee_user):
        """Full reset flow: request token → confirm → verify password changed."""
        import secrets
        from django.utils import timezone
        from datetime import timedelta

        token = secrets.token_urlsafe(32)
        employee_user.password_reset_token = token
        employee_user.password_reset_token_expires = timezone.now() + timedelta(hours=1)
        employee_user.save()

        response = api_client.post(
            self.confirm_url,
            {
                "token": token,
                "new_password": "ResetPass@999",
                "confirm_new_password": "ResetPass@999",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        employee_user.refresh_from_db()
        assert employee_user.check_password("ResetPass@999")
        assert employee_user.password_reset_token is None


# ──────────────────────────────────────────────────────────────────────────────
# Role-Based Access Control
# ──────────────────────────────────────────────────────────────────────────────
@pytest.mark.auth
class TestRoleBasedAccess:
    user_list_url = "/api/v1/auth/users/"

    def test_admin_can_list_users(self, admin_client):
        response = admin_client.get(self.user_list_url)
        assert response.status_code == status.HTTP_200_OK

    def test_employee_cannot_list_users(self, authenticated_client):
        """Employees must NOT be able to list all users."""
        response = authenticated_client.get(self.user_list_url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_hr_cannot_list_users(self, api_client, hr_user):
        """HR role cannot list users (admin-only action)."""
        api_client.force_authenticate(user=hr_user)
        response = api_client.get(self.user_list_url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_create_user(self, admin_client):
        response = admin_client.post(
            self.user_list_url,
            {
                "email": "newuser@test.com",
                "first_name": "New",
                "last_name": "User",
                "role": UserRole.EMPLOYEE,
                "password": "NewUser@123",
            },
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["email"] == "newuser@test.com"
        assert "password" not in response.data

    def test_unauthenticated_cannot_access_users(self, api_client):
        response = api_client.get(self.user_list_url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ──────────────────────────────────────────────────────────────────────────────
# Audit Log
# ──────────────────────────────────────────────────────────────────────────────
@pytest.mark.auth
class TestAuditLog:
    audit_url = "/api/v1/audit/"

    def test_admin_can_view_audit_log(self, admin_client):
        response = admin_client.get(self.audit_url)
        assert response.status_code == status.HTTP_200_OK

    def test_employee_cannot_view_audit_log(self, authenticated_client):
        response = authenticated_client.get(self.audit_url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_login_creates_audit_entry(self, api_client, employee_user):
        from apps.audit.models import AuditLog
        initial_count = AuditLog.objects.filter(action="AUTH_LOGIN").count()
        api_client.post(
            "/api/v1/auth/login/",
            {"email": "employee@test.com", "password": "TestEmp@123"},
        )
        assert AuditLog.objects.filter(action="AUTH_LOGIN").count() > initial_count

