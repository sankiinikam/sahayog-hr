from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, AnnouncementViewSet

app_name = "notifications"

router = DefaultRouter()
router.register("alerts", NotificationViewSet, basename="notification")
router.register("announcements", AnnouncementViewSet, basename="announcement")

urlpatterns = router.urls
