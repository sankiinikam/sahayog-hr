"""
Attendance Business Logic Services.
Handles Clock-in, Clock-out, Duplicates, and Late/Work-hour calculations.
"""
from datetime import datetime, date, time
from django.utils import timezone
from django.db import transaction
from rest_framework.exceptions import ValidationError
from .models import AttendanceRecord, AttendancePunch, ShiftAssignment, AttendancePolicy
from apps.employees.models import Employee


class AttendanceService:
    @staticmethod
    @transaction.atomic
    def record_punch(
        employee: Employee,
        punch_type: str,
        punched_at: datetime = None,
        latitude: float = None,
        longitude: float = None,
        device_id: str = "",
        ip_address: str = None
    ) -> AttendancePunch:
        if punched_at is None:
            punched_at = timezone.now()

        today = punched_at.date()
        punch_time = punched_at.time()

        # 1. Retrieve or create daily AttendanceRecord
        attendance_record, created = AttendanceRecord.objects.get_or_create(
            employee=employee,
            attendance_date=today,
            defaults={"status": AttendanceRecord.AttendanceStatus.MISSED_PUNCH}
        )

        # 2. Check for duplicate punch within 60 seconds
        last_punch = AttendancePunch.objects.filter(
            employee=employee,
            attendance_record=attendance_record
        ).order_by("-punched_at").first()

        if last_punch and (punched_at - last_punch.punched_at).total_seconds() < 60:
            if last_punch.punch_type == punch_type:
                raise ValidationError(f"Duplicate {punch_type} detected within 60 seconds.")

        # 3. Create raw punch event
        punch = AttendancePunch.objects.create(
            employee=employee,
            attendance_record=attendance_record,
            punch_type=punch_type,
            punched_at=punched_at,
            latitude=latitude,
            longitude=longitude,
            device_id=device_id,
            ip_address=ip_address
        )

        # 4. Update AttendanceRecord summaries
        if punch_type == AttendancePunch.PunchType.CHECK_IN:
            if not attendance_record.first_in or punch_time < attendance_record.first_in:
                attendance_record.first_in = punch_time
        elif punch_type == AttendancePunch.PunchType.CHECK_OUT:
            if not attendance_record.last_out or punch_time > attendance_record.last_out:
                attendance_record.last_out = punch_time

        # Calculate worked minutes if both first_in and last_out are present
        if attendance_record.first_in and attendance_record.last_out:
            in_dt = datetime.combine(today, attendance_record.first_in)
            out_dt = datetime.combine(today, attendance_record.last_out)
            if out_dt > in_dt:
                diff_minutes = int((out_dt - in_dt).total_seconds() / 60)
                attendance_record.worked_minutes = diff_minutes
                
                # Check against 4 hours (half day) / 8 hours (present)
                if diff_minutes >= 480:
                    attendance_record.status = AttendanceRecord.AttendanceStatus.PRESENT
                elif diff_minutes >= 240:
                    attendance_record.status = AttendanceRecord.AttendanceStatus.HALF_DAY
                else:
                    attendance_record.status = AttendanceRecord.AttendanceStatus.MISSED_PUNCH
        else:
            attendance_record.status = AttendanceRecord.AttendanceStatus.PRESENT

        attendance_record.save()
        return punch

