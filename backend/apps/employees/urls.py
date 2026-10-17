"""
Employee URLs.
"""
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet

app_name = "employees"

router = DefaultRouter()
router.register("", EmployeeViewSet, basename="employee")

urlpatterns = router.urls
