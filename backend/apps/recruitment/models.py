"""
Recruitment and Onboarding Domain Models.
JobRequisition, Candidate, Interview, Offer, OnboardingTask.
"""
from django.db import models
from django.conf import settings
from decimal import Decimal
from apps.core.models import TimeStampedModel
from apps.organization.models import Company, Department, Designation
from apps.employees.models import Employee


class JobRequisition(TimeStampedModel):
    class RequisitionStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        OPEN = "OPEN", "Open"
        FILLED = "FILLED", "Filled"
        CANCELLED = "CANCELLED", "Cancelled"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="job_requisitions")
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="job_requisitions")
    designation = models.ForeignKey(Designation, on_delete=models.CASCADE, related_name="job_requisitions")
    title = models.CharField(max_length=200)
    vacancies = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=RequisitionStatus.choices, default=RequisitionStatus.OPEN)
    min_experience_years = models.PositiveIntegerField(default=0)
    target_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "rec_job_requisition"

    def __str__(self):
        return f"{self.title} ({self.vacancies} open)"


class Candidate(TimeStampedModel):
    class Stage(models.TextChoices):
        APPLIED = "APPLIED", "Applied"
        SCREENING = "SCREENING", "Screening"
        INTERVIEW = "INTERVIEW", "Interview"
        OFFERED = "OFFERED", "Offered"
        HIRED = "HIRED", "Hired"
        REJECTED = "REJECTED", "Rejected"

    requisition = models.ForeignKey(JobRequisition, on_delete=models.CASCADE, related_name="candidates")
    full_name = models.CharField(max_length=150)
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=20)
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.APPLIED, db_index=True)
    current_company = models.CharField(max_length=150, blank=True)
    expected_ctc = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    notice_period_days = models.PositiveIntegerField(default=30)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "rec_candidate"
        unique_together = ("requisition", "email")

    def __str__(self):
        return f"{self.full_name} [{self.stage}]"


class Interview(TimeStampedModel):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="interviews")
    interviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    round_name = models.CharField(max_length=100, default="Technical Round 1")
    scheduled_at = models.DateTimeField()
    feedback = models.TextField(blank=True)
    rating = models.PositiveIntegerField(null=True, blank=True)  # 1 to 5
    passed = models.BooleanField(null=True, blank=True)

    class Meta:
        db_table = "rec_interview"

    def __str__(self):
        return f"{self.candidate.full_name} - {self.round_name}"


class OnboardingTask(TimeStampedModel):
    class TaskStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="onboarding_tasks")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=100, default="IT Setup")  # IT Setup, Documentation, Orientation
    status = models.CharField(max_length=20, choices=TaskStatus.choices, default=TaskStatus.PENDING)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "onb_onboarding_task"

    def __str__(self):
        return f"{self.employee.employee_code}: {self.title} [{self.status}]"
