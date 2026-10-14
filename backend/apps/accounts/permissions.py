from rest_framework.permissions import BasePermission

from .models import Role


class IsSystemAdmin(BasePermission):
	def has_permission(self, request, view):
		return (
			request.user
			and request.user.is_authenticated
			and request.user.is_role(Role.ROLE_SYSTEM_ADMIN)
		)
