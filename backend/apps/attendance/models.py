"""
Attendance Models: ShiftAssignment, AttendancePolicy, AttendanceRecord, AttendancePunch, AttendanceCorrection.
"""
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.organization.models import Company, Shift
from apps.employees.models import Employee
from apps.approvals.models import ApprovalRequest


class AttendancePolicy(TimeStampedModel):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="attendance_policies")
    name = models.CharField(max_length=150)
    min_working_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8.0)
    half_day_hours = models.DecimalField(max_digits=4, decimal_places=2, default=4.0)
    late_grace_minutes = models.PositiveIntegerField(default=15)
    allow_overtime = models.BooleanField(default=False)
    overtime_min_minutes = models.PositiveIntegerField(default=60)
    geofence_strict = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "att_attendance_policy"

    def __str__(self):
        return f"{self.name} ({self.company.name})"


class ShiftAssignment(TimeStampedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="shift_assignments")
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name="assigned_employees")
    effective_from = models.DateField(db_index=True)
    effective_to = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "att_shift_assignment"

    def __str__(self):
        return f"{self.employee.full_name} -> {self.shift.name} ({self.effective_from})"


class AttendanceRecord(TimeStampedModel):
    class AttendanceStatus(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"
        HALF_DAY = "HALF_DAY", "Half Day"
        ON_LEAVE = "ON_LEAVE", "On Leave"
        HOLIDAY = "HOLIDAY", "Holiday"
        WEEK_OFF = "WEEK_OFF", "Week Off"
        MISSED_PUNCH = "MISSED_PUNCH", "Missed Punch"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendance_records")
    shift = models.ForeignKey(Shift, on_delete=models.SET_NULL, null=True, blank=True)
    attendance_date = models.DateField(db_index=True)

    status = models.CharField(max_length=30, choices=AttendanceStatus.choices, default=AttendanceStatus.ABSENT, db_index=True)
    first_in = models.TimeField(null=True, blank=True)
    last_out = models.TimeField(null=True, blank=True)
    worked_minutes = models.PositiveIntegerField(default=0)
    overtime_minutes = models.PositiveIntegerField(default=0)
    late_minutes = models.PositiveIntegerField(default=0)
    is_late = models.BooleanField(default=False)
    is_corrected = models.BooleanField(default=False)

    class Meta:
        db_table = "att_attendance_record"
        unique_together = ("employee", "attendance_date")
        ordering = ["-attendance_date"]

    def __str__(self):
        return f"{self.employee.employee_code} - {self.attendance_date} ({self.status})"


class AttendancePunch(TimeStampedModel):
    class PunchType(models.TextChoices):
        CHECK_IN = "IN", "Check In"
        CHECK_OUT = "OUT", "Check Out"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="punches")
    attendance_record = models.ForeignKey(AttendanceRecord, on_delete=models.CASCADE, related_name="punches")
    punch_type = models.CharField(max_length=10, choices=PunchType.choices)
    punched_at = models.DateTimeField(db_index=True)
    server_received_at = models.DateTimeField(auto_now_add=True)

    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    device_id = models.CharField(max_length=150, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "att_attendance_punch"
        ordering = ["punched_at"]

    def __str__(self):
        return f"{self.employee.employee_code} {self.punch_type} @ {self.punched_at}"


class AttendanceCorrection(TimeStampedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendance_corrections")
    attendance_record = models.ForeignKey(AttendanceRecord, on_delete=models.CASCADE, related_name="corrections")
    approval_request = models.OneToOneField(ApprovalRequest, on_delete=models.CASCADE, related_name="attendance_correction")

    correction_date = models.DateField()
    original_in = models.TimeField(null=True, blank=True)
    original_out = models.TimeField(null=True, blank=True)
    requested_in = models.TimeField()
    requested_out = models.TimeField()
    reason = models.TextField()

    class Meta:
        db_table = "att_attendance_correction"

    def __str__(self):
        return f"Correction for {self.employee.employee_code} on {self.correction_date}"
