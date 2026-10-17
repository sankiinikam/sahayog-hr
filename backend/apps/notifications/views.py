"""
In-App Notifications and Announcement Views.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification, Announcement


class NotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        notifications = self.get_queryset()
        data = [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "created_at": n.created_at
            }
            for n in notifications
        ]
        return Response({"results": data, "count": len(data)})

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response({"detail": "Notification marked as read."})


class AnnouncementViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Announcement.objects.all()

    def list(self, request, *args, **kwargs):
        announcements = self.get_queryset()
        data = [
            {
                "id": a.id,
                "title": a.title,
                "content": a.content,
                "is_pinned": a.is_pinned,
                "created_at": a.created_at
            }
            for a in announcements
        ]
        return Response({"results": data, "count": len(data)})
