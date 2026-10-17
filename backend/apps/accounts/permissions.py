"""
DRF permission classes for role-based access control.
All permission checks happen server-side — never rely on client-side hiding.
"""
from rest_framework.permissions import BasePermission
from .models import UserRole


class IsAdmin(BasePermission):
    """Only System Administrators."""
    message = "You must be a System Administrator to perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsAdminOrHR(BasePermission):
    """Administrators and HR Managers."""
    message = "You must be an Administrator or HR Manager to perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (UserRole.ADMIN, UserRole.HR)
        )


class IsAdminOrHROrManager(BasePermission):
    """Administrators, HR Managers, and Reporting Managers."""
    message = "You must be an Administrator, HR Manager, or Reporting Manager."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
        )


class IsPayrollOfficer(BasePermission):
    """Payroll Officers and Administrators."""
    message = "You must be a Payroll Officer or Administrator."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (UserRole.ADMIN, UserRole.PAYROLL)
        )


class IsDirectorOrAdmin(BasePermission):
    """Directors and Administrators — for final approvals."""
    message = "You must be a Director or Administrator to approve this."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (UserRole.ADMIN, UserRole.DIRECTOR)
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission: user can access only their own record,
    unless they are an admin.
    Requires the object to have a `user` or `employee.user` attribute.
    """
    message = "You do not have permission to access this record."

    def has_object_permission(self, request, view, obj):
        if request.user.role == UserRole.ADMIN:
            return True
        # Direct user ownership
        if hasattr(obj, "user"):
            return obj.user == request.user
        # Employee → user ownership
        if hasattr(obj, "employee") and hasattr(obj.employee, "user"):
            return obj.employee.user == request.user
        return False


class IsOwnerOrHR(BasePermission):
    """
    Employee can access own record; HR and Admin can access any.
    """
    message = "You do not have permission to access this record."

    def has_object_permission(self, request, view, obj):
        if request.user.role in (UserRole.ADMIN, UserRole.HR):
            return True
        if hasattr(obj, "user"):
            return obj.user == request.user
        if hasattr(obj, "employee") and hasattr(obj.employee, "user"):
            return obj.employee.user == request.user
        return False

