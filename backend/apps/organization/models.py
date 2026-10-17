"""
Organization models: Company, Department, Designation, WorkLocation, Shift, Holiday, CompanyPolicy.
"""
from django.db import models
from apps.core.models import TimeStampedModel, SoftDeleteModel


class Company(TimeStampedModel, SoftDeleteModel):
    name = models.CharField(max_length=200)
    registration_number = models.CharField(max_length=100, unique=True)
    pan_number = models.CharField(max_length=20, blank=True)
    gst_number = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default="India")
    postal_code = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    currency_code = models.CharField(max_length=10, default="INR")
    financial_year_start = models.CharField(max_length=20, default="April")

    class Meta:
        db_table = "org_company"
        verbose_name_plural = "Companies"

    def __str__(self):
        return self.name


class Department(TimeStampedModel, SoftDeleteModel):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="departments")
    parent = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="sub_departments")
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)

    class Meta:
        db_table = "org_department"
        unique_together = ("company", "code")

    def __str__(self):
        return f"{self.name} ({self.code})"


class Designation(TimeStampedModel, SoftDeleteModel):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="designations")
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="designations")
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)
    grade = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = "org_designation"
        unique_together = ("company", "code")

    def __str__(self):
        return f"{self.name} ({self.code})"


class WorkLocation(TimeStampedModel, SoftDeleteModel):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="locations")
    name = models.CharField(max_length=150)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    allows_remote = models.BooleanField(default=False)
    geofence_enabled = models.BooleanField(default=False)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    radius_meters = models.DecimalField(max_digits=6, decimal_places=2, default=100.0)

    class Meta:
        db_table = "org_work_location"

    def __str__(self):
        return self.name


class Shift(TimeStampedModel, SoftDeleteModel):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="shifts")
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_night_shift = models.BooleanField(default=False)
    grace_minutes = models.PositiveIntegerField(default=15)
    working_hours_per_day = models.PositiveIntegerField(default=8)

    class Meta:
        db_table = "org_shift"

    def __str__(self):
        return f"{self.name} ({self.start_time} - {self.end_time})"


class Holiday(TimeStampedModel):
    class HolidayType(models.TextChoices):
        PUBLIC = "PUBLIC", "Public Holiday"
        COMPANY = "COMPANY", "Company Holiday"
        OPTIONAL = "OPTIONAL", "Optional Holiday"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="holidays")
    name = models.CharField(max_length=150)
    holiday_date = models.DateField(db_index=True)
    holiday_type = models.CharField(max_length=20, choices=HolidayType.choices, default=HolidayType.PUBLIC)
    is_optional = models.BooleanField(default=False)

    class Meta:
        db_table = "org_holiday"
        unique_together = ("company", "holiday_date")

    def __str__(self):
        return f"{self.name} on {self.holiday_date}"
