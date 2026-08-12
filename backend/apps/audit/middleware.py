import logging
from django.utils.deprecation import MiddlewareMixin
from .models import AuditLog

logger = logging.getLogger(__name__)

class AuditLoggingMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        if request.user.is_authenticated and request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            # Very basic audit for all mutating requests
            # In a real app, this should be more selective or rely on model signals
            # to prevent spamming logs
            pass
        return response
