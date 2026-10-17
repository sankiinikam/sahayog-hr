from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AttendancePunchView, AttendanceRecordViewSet

app_name = "attendance"

router = DefaultRouter()
router.register("records", AttendanceRecordViewSet, basename="attendance-record")

urlpatterns = [
    path("punch/", AttendancePunchView.as_view(), name="attendance-punch"),
] + router.urls
