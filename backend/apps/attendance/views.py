"""
Attendance & Leave API endpoints and ViewSets.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from .models import AttendanceRecord, AttendancePunch, AttendancePolicy, AttendanceCorrection
from .services import AttendanceService
from apps.employees.models import Employee
from apps.organization.models import Shift


def get_or_create_user_employee(user):
    emp = Employee.objects.filter(user=user).first()
    if emp:
        return emp
    from apps.organization.models import Company, Department, Designation
    comp = Company.objects.first()
    if not comp:
        comp = Company.objects.create(name="Sahayog Technologies Pvt. Ltd.", registration_number="SAHAYOG-001")
    dept = Department.objects.filter(company=comp).first()
    desig = Designation.objects.filter(company=comp).first()
    first_name = getattr(user, "first_name", "") or (user.email.split("@")[0].capitalize())
    last_name = getattr(user, "last_name", "") or "Administrator"
    code = f"EMP-{user.id:03d}"
    if Employee.objects.filter(employee_code=code).exists():
        code = f"EMP-{user.id:03d}-X"
    return Employee.objects.create(
        user=user,
        company=comp,
        department=dept,
        designation=desig,
        employee_code=code,
        first_name=first_name,
        last_name=last_name,
        work_email=user.email,
        date_of_joining="2026-01-01",
        is_active=True
    )


class AttendancePunchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        employee = get_or_create_user_employee(request.user)
        punch_type = request.data.get("punch_type")
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        device_id = request.data.get("device_id", "")
        ip_address = request.META.get("REMOTE_ADDR")

        if punch_type not in [AttendancePunch.PunchType.CHECK_IN, AttendancePunch.PunchType.CHECK_OUT]:
            return Response(
                {"detail": "Invalid punch_type. Must be 'IN' or 'OUT'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        punch = AttendanceService.record_punch(
            employee=employee,
            punch_type=punch_type,
            latitude=latitude,
            longitude=longitude,
            device_id=device_id,
            ip_address=ip_address
        )

        return Response({
            "detail": f"Successfully clocked {punch.get_punch_type_display().lower()}.",
            "punched_at": punch.punched_at,
            "status": punch.attendance_record.status
        }, status=status.HTTP_201_CREATED)


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    """Admin-facing attendance record management."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = AttendanceRecord.objects.select_related("employee", "shift")
        employee_id = self.request.query_params.get("employee_id")
        month = self.request.query_params.get("month")  # YYYY-MM
        date_from = self.request.query_params.get("date_from")  # YYYY-MM-DD
        date_to = self.request.query_params.get("date_to")  # YYYY-MM-DD

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if month:
            try:
                year, mon = month.split("-")
                queryset = queryset.filter(attendance_date__year=int(year), attendance_date__month=int(mon))
            except (ValueError, AttributeError):
                pass
        if date_from:
            queryset = queryset.filter(attendance_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(attendance_date__lte=date_to)

        # If not admin, restrict to own records
        if hasattr(self.request.user, 'role') and self.request.user.role == 'EMPLOYEE':
            emp = Employee.objects.filter(user=self.request.user).first()
            if emp:
                queryset = queryset.filter(employee=emp)
            else:
                queryset = queryset.none()
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        data = [
            {
                "id": r.id,
                "employee_id": r.employee_id,
                "attendance_date": str(r.attendance_date),
                "status": r.status,
                "first_in": str(r.first_in) if r.first_in else None,
                "last_out": str(r.last_out) if r.last_out else None,
                "worked_minutes": r.worked_minutes,
                "overtime_minutes": r.overtime_minutes,
                "is_late": r.is_late,
                "late_minutes": r.late_minutes,
                "shift_id": r.shift_id,
                "shift_name": r.shift.name if r.shift else None,
            }
            for r in queryset
        ]
        return Response({"results": data, "count": len(data)})

    def create(self, request, *args, **kwargs):
        """Admin creates or updates an attendance record for any employee on any date."""
        employee_id = request.data.get("employee_id")
        attendance_date = request.data.get("attendance_date")
        att_status = request.data.get("status", "PRESENT")
        first_in = request.data.get("first_in")
        last_out = request.data.get("last_out")
        shift_id = request.data.get("shift_id")
        raw_ot = request.data.get("overtime_minutes")
        raw_is_late = request.data.get("is_late")
        raw_late_min = request.data.get("late_minutes")

        if not employee_id or not attendance_date:
            return Response({"detail": "employee_id and attendance_date are required."},
                            status=status.HTTP_400_BAD_REQUEST)

        employee = get_object_or_404(Employee, id=employee_id)
        shift = Shift.objects.filter(id=shift_id).first() if shift_id else None

        worked_minutes = 0
        in_min = 0
        out_min = 0
        if first_in and last_out:
            try:
                in_parts = [int(p) for p in str(first_in).split(":")[:2]]
                out_parts = [int(p) for p in str(last_out).split(":")[:2]]
                in_min = in_parts[0] * 60 + in_parts[1]
                out_min = out_parts[0] * 60 + out_parts[1]
                if out_min >= in_min:
                    worked_minutes = out_min - in_min
                else:
                    worked_minutes = (24 * 60 - in_min) + out_min
            except Exception:
                worked_minutes = 0

        # Calculate overtime: 12-hr shift (720 min), threshold > 30 min extra
        if raw_ot is not None and str(raw_ot).strip() != "":
            overtime_minutes = int(raw_ot)
        elif worked_minutes > 720:
            extra = worked_minutes - 720
            overtime_minutes = extra if extra > 30 else 0
        else:
            overtime_minutes = 0

        # Late marker determination
        is_late = False
        late_minutes = 0
        if raw_is_late is not None:
            is_late = bool(raw_is_late)
            late_minutes = int(raw_late_min or 0)
        elif att_status == "LATE":
            is_late = True
            att_status = "PRESENT"
            late_minutes = int(raw_late_min or 30)
        elif first_in and att_status == "PRESENT":
            try:
                in_parts = [int(p) for p in str(first_in).split(":")[:2]]
                in_time_mins = in_parts[0] * 60 + in_parts[1]
                # Default 08:30 or 09:30 cutoff for morning shifts
                if in_time_mins > (9 * 60 + 30):
                    is_late = True
                    late_minutes = in_time_mins - (9 * 60 + 30)
            except Exception:
                pass

        try:
            record, created = AttendanceRecord.objects.update_or_create(
                employee=employee,
                attendance_date=attendance_date,
                defaults={
                    "status": att_status,
                    "first_in": first_in or None,
                    "last_out": last_out or None,
                    "shift": shift,
                    "worked_minutes": worked_minutes,
                    "overtime_minutes": overtime_minutes,
                    "is_late": is_late,
                    "late_minutes": late_minutes,
                    "is_corrected": True,
                }
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "id": record.id,
            "employee_id": record.employee_id,
            "attendance_date": str(record.attendance_date),
            "status": record.status,
            "first_in": str(record.first_in) if record.first_in else None,
            "last_out": str(record.last_out) if record.last_out else None,
            "worked_minutes": record.worked_minutes,
            "overtime_minutes": record.overtime_minutes,
            "is_late": record.is_late,
            "late_minutes": record.late_minutes,
            "shift_id": record.shift_id,
            "created": created,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="batch-mark")
    def batch_mark(self, request):
        """Batch mark attendance for multiple employees (Admin super-action)."""
        employee_ids = request.data.get("employee_ids", [])
        attendance_date = request.data.get("attendance_date")
        att_status = request.data.get("status", "PRESENT")
        first_in = request.data.get("first_in", "08:00:00" if att_status == "PRESENT" else None)
        last_out = request.data.get("last_out", "20:00:00" if att_status == "PRESENT" else None)

        if not attendance_date or not employee_ids:
            return Response({"detail": "employee_ids and attendance_date are required."}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = 0
        for emp_id in employee_ids:
            try:
                emp = Employee.objects.get(id=emp_id)
                AttendanceRecord.objects.update_or_create(
                    employee=emp,
                    attendance_date=attendance_date,
                    defaults={
                        "status": att_status,
                        "first_in": first_in,
                        "last_out": last_out,
                        "worked_minutes": 720 if att_status == "PRESENT" else 0,
                        "overtime_minutes": 0,
                        "is_late": False,
                        "late_minutes": 0,
                        "is_corrected": True,
                    }
                )
                updated_count += 1
            except Exception:
                pass

        return Response({"detail": f"Successfully marked {updated_count} employees as {att_status}."})

    def partial_update(self, request, *args, **kwargs):
        """Admin updates an existing attendance record."""
        record = self.get_object()
        att_status = request.data.get("status", record.status)
        first_in = request.data.get("first_in", record.first_in)
        last_out = request.data.get("last_out", record.last_out)
        shift_id = request.data.get("shift_id")
        raw_ot = request.data.get("overtime_minutes")

        worked_minutes = record.worked_minutes
        if first_in and last_out:
            try:
                in_parts = [int(p) for p in str(first_in).split(":")[:2]]
                out_parts = [int(p) for p in str(last_out).split(":")[:2]]
                in_min = in_parts[0] * 60 + in_parts[1]
                out_min = out_parts[0] * 60 + out_parts[1]
                if out_min >= in_min:
                    worked_minutes = out_min - in_min
                else:
                    worked_minutes = (24 * 60 - in_min) + out_min
            except Exception:
                pass

        if raw_ot is not None and str(raw_ot).strip() != "":
            overtime_minutes = int(raw_ot)
        elif worked_minutes > 720:
            extra = worked_minutes - 720
            overtime_minutes = extra if extra > 30 else 0
        else:
            overtime_minutes = 0

        record.status = att_status
        record.first_in = first_in if first_in else None
        record.last_out = last_out if last_out else None
        record.worked_minutes = worked_minutes
        record.overtime_minutes = overtime_minutes
        record.is_corrected = True
        if shift_id:
            record.shift = Shift.objects.filter(id=shift_id).first()
        record.save()

        return Response({
            "id": record.id,
            "employee_id": record.employee_id,
            "attendance_date": str(record.attendance_date),
            "status": record.status,
            "first_in": str(record.first_in) if record.first_in else None,
            "last_out": str(record.last_out) if record.last_out else None,
            "worked_minutes": record.worked_minutes,
            "overtime_minutes": record.overtime_minutes,
            "shift_id": record.shift_id,
        })

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """Returns attendance summary for an employee in a date range."""
        employee_id = request.query_params.get("employee_id")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        if not employee_id:
            return Response({"detail": "employee_id required."}, status=400)

        qs = AttendanceRecord.objects.filter(employee_id=employee_id)
        if date_from:
            qs = qs.filter(attendance_date__gte=date_from)
        if date_to:
            qs = qs.filter(attendance_date__lte=date_to)

        total = qs.count()
        present = qs.filter(status="PRESENT").count()
        half_day = qs.filter(status="HALF_DAY").count()
        absent = qs.filter(status="ABSENT").count()
        on_leave = qs.filter(status="ON_LEAVE").count()
        total_overtime = sum(r.overtime_minutes for r in qs)

        return Response({
            "total_days": total,
            "present": present,
            "half_day": half_day,
            "absent": absent,
            "on_leave": on_leave,
            "total_overtime_minutes": total_overtime,
        })
