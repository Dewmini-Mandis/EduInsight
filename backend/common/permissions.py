from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class HasRole(BasePermission):
	allowed_roles = ()

	def has_permission(self, request, view):
		return (
			request.user
			and request.user.is_authenticated
			and request.user.role in self.allowed_roles
		)


class IsNationalAdmin(HasRole):
	allowed_roles = (User.ROLE_NATIONAL_ADMIN,)


class IsSchoolAdmin(HasRole):
	allowed_roles = (User.ROLE_SCHOOL_ADMIN,)


class IsTeacher(HasRole):
	allowed_roles = (User.ROLE_TEACHER,)


class IsStudent(HasRole):
	allowed_roles = (User.ROLE_STUDENT,)


class IsSystemAdmin(HasRole):
	allowed_roles = (User.ROLE_SYSTEM_ADMIN,)


class IsStaffOrSystemAdmin(BasePermission):
	def has_permission(self, request, view):
		return (
			request.user
			and request.user.is_authenticated
			and (request.user.is_staff or request.user.is_role(User.ROLE_SYSTEM_ADMIN))
		)
