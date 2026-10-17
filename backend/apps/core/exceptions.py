"""
Custom exception handler that produces consistent HRMS error envelopes.
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Converts DRF exceptions into a standardised error response:

    {
        "detail": "Human-readable message",
        "code": "ERROR_CODE",
        "errors": { "field_name": ["error message"] }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_payload = {
            "detail": _extract_detail(response.data),
            "code": _extract_code(response.data),
            "errors": _extract_errors(response.data),
            "status_code": response.status_code,
        }
        response.data = error_payload
    else:
        # Unhandled server error — do not expose internal details
        logger.exception("Unhandled exception in view: %s", exc)
        response = Response(
            {
                "detail": "An unexpected error occurred. Please contact support.",
                "code": "INTERNAL_SERVER_ERROR",
                "errors": {},
                "status_code": 500,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response


def _extract_detail(data) -> str:
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        # Return the first field's first message
        for key, value in data.items():
            if isinstance(value, list) and value:
                return str(value[0])
        return "Validation error"
    if isinstance(data, list) and data:
        return str(data[0])
    return str(data)


def _extract_code(data) -> str:
    if isinstance(data, dict) and "detail" in data:
        detail = data["detail"]
        if hasattr(detail, "code"):
            return detail.code.upper()
    return "ERROR"


def _extract_errors(data) -> dict:
    if isinstance(data, dict):
        errors = {}
        for key, value in data.items():
            if key == "detail":
                continue
            if isinstance(value, list):
                errors[key] = [str(v) for v in value]
            elif isinstance(value, dict):
                errors[key] = value
            else:
                errors[key] = [str(value)]
        return errors
    return {}

