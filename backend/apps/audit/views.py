"""
Audit log views — admin/HR only.
"""
from rest_framework import serializers
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import AuditLog
from apps.accounts.permissions import IsAdminOrHR
from apps.core.pagination import LargeResultsSetPagination


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    target_email = serializers.EmailField(source="target_user.email", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user_email",
            "target_email",
            "action",
            "content_type",
            "object_id",
            "object_repr",
            "ip_address",
            "notes",
            "created_at",
        ]


class AuditLogListView(ListAPIView):
    """
    GET /api/v1/audit/
    Returns paginated audit log. Admin and HR Manager access only.
    Sensitive field values (old_values, new_values) are excluded from
    this listing endpoint to prevent bulk data exposure.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHR]
    pagination_class = LargeResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["action", "content_type"]
    search_fields = ["action", "object_repr", "user__email"]
    ordering_fields = ["created_at", "action"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return AuditLog.objects.select_related("user", "target_user").all()

