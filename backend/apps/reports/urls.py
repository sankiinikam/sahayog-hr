from django.urls import path
from .views import HRDashboardSummaryView

app_name = "reports"

urlpatterns = [
    path("summary/", HRDashboardSummaryView.as_view(), name="hr-summary"),
]
