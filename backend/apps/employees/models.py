"""
Employee models: Employee, EmploymentHistory, EmergencyContact, Address, EmployeeBankDetail, EmployeeDocument.
"""
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel, SoftDeleteModel
from apps.organization.models import Company, Department, Designation, WorkLocation


class Employee(TimeStampedModel, SoftDeleteModel):
    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        OTHER = "OTHER", "Other"

    class EmploymentType(models.TextChoices):
        FULL_TIME = "FULL_TIME", "Full Time"
        PART_TIME = "PART_TIME", "Part Time"
        CONTRACT = "CONTRACT", "Contract"
        INTERN = "INTERN", "Intern"

    class EmploymentStatus(models.TextChoices):
        PROBATION = "PROBATION", "Probation"
        CONFIRMED = "CONFIRMED", "Confirmed"
        NOTICE_PERIOD = "NOTICE_PERIOD", "Notice Period"
        TERMINATED = "TERMINATED", "Terminated"
        RESIGNED = "RESIGNED", "Resigned"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_profile"
    )
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="employees")
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name="employees")
    designation = models.ForeignKey(Designation, on_delete=models.SET_NULL, null=True, related_name="employees")
    reporting_manager = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="direct_reports")
    work_location = models.ForeignKey(WorkLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name="employees")

    employee_code = models.CharField(max_length=50, unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=20, choices=Gender.choices, default=Gender.MALE)
    date_of_birth = models.DateField(null=True, blank=True)
    date_of_joining = models.DateField(db_index=True)

    employment_type = models.CharField(max_length=30, choices=EmploymentType.choices, default=EmploymentType.FULL_TIME)
    employment_status = models.CharField(max_length=30, choices=EmploymentStatus.choices, default=EmploymentStatus.PROBATION)
    probation_end_date = models.DateField(null=True, blank=True)
    confirmation_date = models.DateField(null=True, blank=True)

    personal_email = models.EmailField(blank=True)
    work_email = models.EmailField(unique=True, db_index=True)
    personal_phone = models.CharField(max_length=20, blank=True)
    work_phone = models.CharField(max_length=20, blank=True)

    blood_group = models.CharField(max_length=10, blank=True)
    pan_number = models.CharField(max_length=20, blank=True)
    aadhaar_number = models.CharField(max_length=20, blank=True)
    uan_number = models.CharField(max_length=30, blank=True)
    esi_number = models.CharField(max_length=30, blank=True)
    photo = models.TextField(blank=True, default="")

    class Meta:
        db_table = "emp_employee"
        ordering = ["employee_code"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_code})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


class EmergencyContact(TimeStampedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="emergency_contacts")
    name = models.CharField(max_length=150)
    relationship = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        db_table = "emp_emergency_contact"


class Address(TimeStampedModel):
    class AddressType(models.TextChoices):
        CURRENT = "CURRENT", "Current Address"
        PERMANENT = "PERMANENT", "Permanent Address"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="addresses")
    address_type = models.CharField(max_length=20, choices=AddressType.choices, default=AddressType.CURRENT)
    line1 = models.CharField(max_length=255)
    line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default="India")
    postal_code = models.CharField(max_length=20)
    is_current = models.BooleanField(default=True)

    class Meta:
        db_table = "emp_address"


class EmployeeBankDetail(TimeStampedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="bank_details")
    account_holder_name = models.CharField(max_length=150)
    account_number = models.CharField(max_length=50)
    bank_name = models.CharField(max_length=150)
    branch_name = models.CharField(max_length=150, blank=True)
    ifsc_code = models.CharField(max_length=20)
    account_type = models.CharField(max_length=50, default="SAVINGS")
    is_primary = models.BooleanField(default=True)

    class Meta:
        db_table = "emp_bank_detail"


class EmployeeDocument(TimeStampedModel):
    class DocumentType(models.TextChoices):
        ID_PROOF = "ID_PROOF", "Identity Proof"
        ADDRESS_PROOF = "ADDRESS_PROOF", "Address Proof"
        RESUME = "RESUME", "Resume"
        OFFER_LETTER = "OFFER_LETTER", "Offer Letter"
        CONTRACT = "CONTRACT", "Employment Contract"
        CERTIFICATE = "CERTIFICATE", "Educational/Training Certificate"
        OTHER = "OTHER", "Other"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=30, choices=DocumentType.choices, default=DocumentType.OTHER)
    document_name = models.CharField(max_length=200)
    document_number = models.CharField(max_length=100, blank=True)
    file_path = models.FileField(upload_to="employee_docs/%Y/%m/")
    is_verified = models.BooleanField(default=False)

    class Meta:
        db_table = "emp_document"


class EmploymentHistory(TimeStampedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="employment_history")
    change_type = models.CharField(max_length=100)
    old_designation = models.CharField(max_length=150, blank=True)
    new_designation = models.CharField(max_length=150, blank=True)
    old_department = models.CharField(max_length=150, blank=True)
    new_department = models.CharField(max_length=150, blank=True)
    effective_date = models.DateField()
    reason = models.TextField(blank=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = "emp_employment_history"
        ordering = ["-effective_date"]
