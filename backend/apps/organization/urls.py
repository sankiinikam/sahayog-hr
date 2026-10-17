"""
Organization URL routing.
"""
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet,
    DepartmentViewSet,
    DesignationViewSet,
    WorkLocationViewSet,
    ShiftViewSet,
    HolidayViewSet,
)

app_name = "organization"

router = DefaultRouter()
router.register("companies", CompanyViewSet, basename="company")
router.register("departments", DepartmentViewSet, basename="department")
router.register("designations", DesignationViewSet, basename="designation")
router.register("locations", WorkLocationViewSet, basename="location")
router.register("shifts", ShiftViewSet, basename="shift")
router.register("holidays", HolidayViewSet, basename="holiday")

urlpatterns = router.urls
