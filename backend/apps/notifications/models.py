"""
In-App Notifications and Broadcast Announcements Models.
"""
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.organization.models import Company


class Notification(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    link = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "ntf_notification"
        ordering = ["-created_at"]

    def __str__(self):
        return f"To {self.user.email}: {self.title}"


class Announcement(TimeStampedModel):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="announcements")
    title = models.CharField(max_length=200)
    content = models.TextField()
    published_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    is_pinned = models.BooleanField(default=False)

    class Meta:
        db_table = "ntf_announcement"
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self):
        return self.title
