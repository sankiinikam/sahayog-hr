"""
HRMS User and role models.

Uses a custom User model extending AbstractBaseUser for full control
over authentication fields. Roles are stored in a Role model instead
of Django groups, allowing HRMS-specific semantics.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from apps.core.models import TimeStampedModel


# ──────────────────────────────────────────────────────────────────────────────
# Role constants
# ──────────────────────────────────────────────────────────────────────────────
class UserRole(models.TextChoices):
    ADMIN = "ADMIN", "System Administrator"
    HR = "HR", "HR Manager"
    MANAGER = "MANAGER", "Reporting Manager"
    PAYROLL = "PAYROLL", "Payroll Officer"
    DIRECTOR = "DIRECTOR", "Director / Authorized Approver"
    EMPLOYEE = "EMPLOYEE", "Employee"


# ──────────────────────────────────────────────────────────────────────────────
# Custom User Manager
# ──────────────────────────────────────────────────────────────────────────────
class UserManager(BaseUserManager):
    """Manager for the custom User model."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email address is required.")
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.ADMIN)
        return self.create_user(email, password, **extra_fields)


# ──────────────────────────────────────────────────────────────────────────────
# Custom User Model
# ──────────────────────────────────────────────────────────────────────────────
class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """
    HRMS User — email is the login identifier.
    Passwords are hashed via Django's built-in PBKDF2 mechanism.
    Do NOT store plain-text passwords or implement custom hashing.
    """

    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.EMPLOYEE,
        db_index=True,
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)

    # Password reset flow
    password_reset_token = models.CharField(max_length=64, blank=True, null=True)
    password_reset_token_expires = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    class Meta:
        db_table = "accounts_user"
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["email"]

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

    # ── Role helper properties ──────────────────────────────────────────────
    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN

    @property
    def is_hr(self):
        return self.role in (UserRole.HR, UserRole.ADMIN)

    @property
    def is_manager(self):
        return self.role in (UserRole.MANAGER, UserRole.HR, UserRole.ADMIN)

    @property
    def is_payroll_officer(self):
        return self.role in (UserRole.PAYROLL, UserRole.ADMIN)

    @property
    def is_director(self):
        return self.role in (UserRole.DIRECTOR, UserRole.ADMIN)

    def has_role(self, *roles):
        """Check if user has any of the given roles."""
        return self.role in roles


# ──────────────────────────────────────────────────────────────────────────────
# Device Session (Refresh Token Tracking)
# ──────────────────────────────────────────────────────────────────────────────
class DeviceSession(TimeStampedModel):
    """
    Tracks active refresh tokens per device so that logout can
    blacklist the specific token without affecting other sessions.
    """

    class DeviceType(models.TextChoices):
        DESKTOP = "DESKTOP", "Desktop"
        MOBILE = "MOBILE", "Mobile"
        WEB = "WEB", "Web Browser"
        OTHER = "OTHER", "Other"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="device_sessions",
    )
    refresh_token_jti = models.CharField(max_length=255, unique=True, db_index=True)
    device_name = models.CharField(max_length=200, blank=True)
    device_type = models.CharField(
        max_length=20,
        choices=DeviceType.choices,
        default=DeviceType.OTHER,
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "accounts_device_session"
        verbose_name = "Device Session"
        verbose_name_plural = "Device Sessions"
        indexes = [
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.device_type} ({self.refresh_token_jti[:8]}…)"

