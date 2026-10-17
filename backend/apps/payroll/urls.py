from rest_framework.routers import DefaultRouter
from .views import PayrollPeriodViewSet, PayrollRunViewSet, PayslipViewSet

app_name = "payroll"

router = DefaultRouter()
router.register("periods", PayrollPeriodViewSet, basename="payroll-period")
router.register("runs", PayrollRunViewSet, basename="payroll-run")
router.register("payslips", PayslipViewSet, basename="payslip")

urlpatterns = router.urls
