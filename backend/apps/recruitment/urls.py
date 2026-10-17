from rest_framework.routers import DefaultRouter
from .views import JobRequisitionViewSet, CandidateViewSet, OnboardingTaskViewSet

app_name = "recruitment"

router = DefaultRouter()
router.register("requisitions", JobRequisitionViewSet, basename="requisition")
router.register("candidates", CandidateViewSet, basename="candidate")
router.register("onboarding", OnboardingTaskViewSet, basename="onboarding")

urlpatterns = router.urls
