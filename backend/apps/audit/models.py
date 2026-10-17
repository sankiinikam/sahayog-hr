"""
Immutable audit log model.
Records are append-only — never updated or deleted.
"""
from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """
    Immutable record of a sensitive action.
    - Never modify existing records.
    - Never expose personal or payroll data in log messages.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    # Optional link to the affected employee (different from the acting user)
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_target_logs",
    )
    action = models.CharField(max_length=100, db_index=True)
    content_type = models.CharField(max_length=100, blank=True)
    object_id = models.PositiveBigIntegerField(null=True, blank=True)
    object_repr = models.CharField(max_length=500, blank=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "audit_log"
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["content_type", "object_id"]),
        ]

    def __str__(self):
        return f"[{self.created_at}] {self.action} by {self.user}"

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("AuditLog records are immutable. Do not update them.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("AuditLog records must not be deleted.")

