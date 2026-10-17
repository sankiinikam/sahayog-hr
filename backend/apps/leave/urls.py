from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import LeaveTypeViewSet, LeaveBalanceView, LeaveRequestViewSet

app_name = "leave"

router = DefaultRouter()
router.register("types", LeaveTypeViewSet, basename="leave-type")
router.register("requests", LeaveRequestViewSet, basename="leave-request")

urlpatterns = [
    path("balances/", LeaveBalanceView.as_view(), name="leave-balances"),
] + router.urls
