"""
Recruitment and Onboarding API endpoints.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import JobRequisition, Candidate, Interview, OnboardingTask
from .serializers import (
    JobRequisitionSerializer,
    CandidateSerializer,
    InterviewSerializer,
    OnboardingTaskSerializer,
)
from apps.accounts.permissions import IsAdminOrHR


class JobRequisitionViewSet(viewsets.ModelViewSet):
    queryset = JobRequisition.objects.select_related("company", "department", "designation").all()
    serializer_class = JobRequisitionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrHR]

    def list(self, request, *args, **kwargs):
        data = [
            {
                "id": r.id,
                "title": r.title,
                "department": r.department.name,
                "designation": r.designation.name,
                "vacancies": r.vacancies,
                "status": r.status,
                "candidates_count": r.candidates.count()
            }
            for r in self.get_queryset()
        ]
        return Response({"results": data, "count": len(data)})


class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.select_related("requisition").all()
    serializer_class = CandidateSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrHR]
    filterset_fields = ["requisition", "stage"]

    def list(self, request, *args, **kwargs):
        data = [
            {
                "id": c.id,
                "full_name": c.full_name,
                "email": c.email,
                "phone": c.phone,
                "stage": c.stage,
                "requisition_title": c.requisition.title,
                "expected_ctc": str(c.expected_ctc)
            }
            for c in self.get_queryset()
        ]
        return Response({"results": data, "count": len(data)})


class OnboardingTaskViewSet(viewsets.ModelViewSet):
    queryset = OnboardingTask.objects.select_related("employee", "assigned_to").all()
    serializer_class = OnboardingTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        tasks = self.get_queryset()
        data = [
            {
                "id": t.id,
                "employee_code": t.employee.employee_code,
                "employee_name": t.employee.full_name,
                "title": t.title,
                "category": t.category,
                "status": t.status,
                "due_date": t.due_date
            }
            for t in tasks
        ]
        return Response({"results": data, "count": len(data)})
