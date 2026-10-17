"""
Authentication service layer.
Business logic lives here, not in views or serializers.
"""
import secrets
import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

from .models import DeviceSession

logger = logging.getLogger(__name__)
User = get_user_model()


def create_token_pair(user, device_info: dict = None) -> dict:
    """
    Generate JWT access + refresh token pair and record device session.
    Returns a dict with 'access', 'refresh', and 'user' keys.
    """
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token

    if device_info:
        _record_device_session(user, refresh, device_info)

    return {
        "access": str(access),
        "refresh": str(refresh),
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


def _record_device_session(user, refresh_token, device_info: dict):
    """Record or update a device session for this refresh token."""
    try:
        from django.conf import settings as s
        ttl = s.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
        DeviceSession.objects.get_or_create(
            refresh_token_jti=str(refresh_token["jti"]),
            defaults={
                "user": user,
                "device_name": device_info.get("device_name", ""),
                "device_type": device_info.get("device_type", DeviceSession.DeviceType.OTHER),
                "ip_address": device_info.get("ip_address"),
                "user_agent": device_info.get("user_agent", ""),
                "expires_at": timezone.now() + ttl,
            },
        )
    except Exception:
        logger.warning("Failed to record device session", exc_info=True)


def logout_device_session(jti: str):
    """Mark the device session as inactive on logout."""
    DeviceSession.objects.filter(refresh_token_jti=jti, is_active=True).update(
        is_active=False
    )


def initiate_password_reset(email: str):
    """
    Generate a secure password reset token and send it by email.
    Always returns success to prevent account enumeration.
    """
    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        logger.info("Password reset requested for unknown email (not disclosed to caller)")
        return  # Silent return — do not reveal account existence

    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.password_reset_token_expires = timezone.now() + timedelta(hours=2)
    user.save(update_fields=["password_reset_token", "password_reset_token_expires"])

    reset_url = f"http://localhost:5173/auth/reset-password?token={token}"  # Dev URL

    try:
        send_mail(
            subject="HRMS Password Reset",
            message=(
                f"Hello {user.first_name},\n\n"
                f"Click the link below to reset your password:\n{reset_url}\n\n"
                "This link expires in 2 hours.\n\n"
                "If you did not request this, please ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Failed to send password reset email to %s", user.email)


def confirm_password_reset(token: str, new_password: str) -> bool:
    """
    Validate token and set new password.
    Returns True on success, False on invalid/expired token.
    """
    try:
        user = User.objects.get(
            password_reset_token=token,
            password_reset_token_expires__gt=timezone.now(),
            is_active=True,
        )
    except User.DoesNotExist:
        return False

    user.set_password(new_password)
    user.password_reset_token = None
    user.password_reset_token_expires = None
    user.save(update_fields=["password", "password_reset_token", "password_reset_token_expires"])
    return True

