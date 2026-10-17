"""
Health check endpoint — returns 200 if the backend is alive and DB is reachable.
"""
from django.db import connection
from django.db.utils import OperationalError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import django


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    GET /api/v1/health/
    Returns system health status. Does not expose sensitive information.
    """
    db_ok = False
    try:
        connection.ensure_connection()
        db_ok = True
    except OperationalError:
        pass

    payload = {
        "status": "ok" if db_ok else "degraded",
        "version": "1.0.0",
        "django": django.__version__,
        "database": "connected" if db_ok else "unreachable",
    }

    http_status = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(payload, status=http_status)

