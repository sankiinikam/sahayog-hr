from rest_framework.routers import DefaultRouter
from .views import ExpenseClaimViewSet, AssetViewSet

app_name = "expenses"

router = DefaultRouter()
router.register("claims", ExpenseClaimViewSet, basename="expense-claim")
router.register("assets", AssetViewSet, basename="asset")

urlpatterns = router.urls
