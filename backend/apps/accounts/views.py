"""
Authentication views — login, logout, refresh, me, password reset.
Rate limiting applied on auth endpoints.
"""
import logging
from django.contrib.auth import get_user_model
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import DeviceSession
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    AdminUserCreateSerializer,
    AdminUserSerializer,
    DeviceSessionSerializer,
)
from .services import (
    logout_device_session,
    initiate_password_reset,
    confirm_password_reset,
)
from .permissions import IsAdmin
from apps.audit.services import log_action

logger = logging.getLogger(__name__)
User = get_user_model()


# ──────────────────────────────────────────────────────────────────────────────
# Login
# ──────────────────────────────────────────────────────────────────────────────
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class LoginView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/
    Returns access + refresh JWT tokens along with basic user info.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.get(email=request.data.get("email"))
            log_action(
                user=user,
                action="AUTH_LOGIN",
                ip_address=_get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )
        return response


# ──────────────────────────────────────────────────────────────────────────────
# Logout
# ──────────────────────────────────────────────────────────────────────────────
class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklists the provided refresh token and marks device session inactive.
    Body: { "refresh": "<refresh_token>" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token_str = request.data.get("refresh")
        if not refresh_token_str:
            return Response(
                {"detail": "refresh token is required.", "code": "MISSING_TOKEN"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token_str)
            jti = token.get("jti")
            logout_device_session(jti)
            token.blacklist()
            log_action(
                user=request.user,
                action="AUTH_LOGOUT",
                ip_address=_get_client_ip(request),
            )
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        except TokenError as e:
            return Response(
                {"detail": str(e), "code": "INVALID_TOKEN"},
                status=status.HTTP_400_BAD_REQUEST,
            )


# ──────────────────────────────────────────────────────────────────────────────
# Token Refresh
# ──────────────────────────────────────────────────────────────────────────────
@method_decorator(
    ratelimit(key="ip", rate="30/m", method="POST", block=True),
    name="dispatch",
)
class TokenRefreshAPIView(TokenRefreshView):
    """
    POST /api/v1/auth/refresh/
    Refreshes the access token using a valid refresh token.
    """
    permission_classes = [AllowAny]


# ──────────────────────────────────────────────────────────────────────────────
# Current User Profile
# ──────────────────────────────────────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """
    GET /api/v1/auth/me/
    Returns the currently authenticated user's profile.
    Never returns password or sensitive auth fields.
    """
    serializer = UserProfileSerializer(request.user)
    return Response(serializer.data)


# ──────────────────────────────────────────────────────────────────────────────
# Password Change
# ──────────────────────────────────────────────────────────────────────────────
class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/
    Allows authenticated users to change their own password.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(
            user=request.user,
            action="AUTH_PASSWORD_CHANGED",
            ip_address=_get_client_ip(request),
        )
        return Response({"detail": "Password changed successfully."})


# ──────────────────────────────────────────────────────────────────────────────
# Password Reset (Request)
# ──────────────────────────────────────────────────────────────────────────────
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class PasswordResetRequestView(APIView):
    """
    POST /api/v1/auth/password-reset/
    Sends a password reset email.
    Always returns 200 to prevent account enumeration.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        initiate_password_reset(serializer.validated_data["email"])
        return Response(
            {
                "detail": (
                    "If an account with that email exists, "
                    "a password reset link has been sent."
                )
            }
        )


# ──────────────────────────────────────────────────────────────────────────────
# Password Reset (Confirm)
# ──────────────────────────────────────────────────────────────────────────────
class PasswordResetConfirmView(APIView):
    """
    POST /api/v1/auth/password-reset/confirm/
    Completes password reset using the emailed token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        success = confirm_password_reset(
            serializer.validated_data["token"],
            serializer.validated_data["new_password"],
        )
        if not success:
            return Response(
                {"detail": "Invalid or expired reset token.", "code": "INVALID_TOKEN"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Password has been reset successfully."})


# ──────────────────────────────────────────────────────────────────────────────
# Active Sessions (for current user)
# ──────────────────────────────────────────────────────────────────────────────
class MySessionsView(APIView):
    """
    GET /api/v1/auth/sessions/
    Returns the active device sessions for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = DeviceSession.objects.filter(
            user=request.user, is_active=True
        ).order_by("-created_at")
        serializer = DeviceSessionSerializer(sessions, many=True)
        return Response(serializer.data)


# ──────────────────────────────────────────────────────────────────────────────
# Admin User Management
# ──────────────────────────────────────────────────────────────────────────────
class UserListCreateView(APIView):
    """
    GET  /api/v1/auth/users/   — Admin: list all users
    POST /api/v1/auth/users/   — Admin: create a new user
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        users = User.objects.all().order_by("email")
        serializer = AdminUserSerializer(users, many=True)
        return Response({"results": serializer.data, "count": users.count()})

    def post(self, request):
        serializer = AdminUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_action(
            user=request.user,
            action="USER_CREATED",
            ip_address=_get_client_ip(request),
            object_repr=user.email,
        )
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    """
    GET   /api/v1/auth/users/{id}/  — Admin: get user
    PATCH /api/v1/auth/users/{id}/  — Admin: update user role or active status
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({"detail": "Not found.", "code": "NOT_FOUND"}, status=404)
        return Response(AdminUserSerializer(user).data)

    def patch(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({"detail": "Not found.", "code": "NOT_FOUND"}, status=404)
        # Only allow updating role and is_active via this endpoint
        allowed_fields = {"role", "is_active", "first_name", "last_name"}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        serializer = AdminUserSerializer(user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(
            user=request.user,
            action="USER_UPDATED",
            ip_address=_get_client_ip(request),
            object_repr=user.email,
        )
        return Response(serializer.data)


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────
def _get_client_ip(request) -> str:
    """Extract real client IP, respecting X-Forwarded-For if present."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")

