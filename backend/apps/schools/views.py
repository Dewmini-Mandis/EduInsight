from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from apps.accounts.models import Role

from .models import School
from .serializers import SchoolSerializer


class SchoolViewSet(viewsets.ModelViewSet):
	serializer_class = SchoolSerializer
	permission_classes = [IsAuthenticated]
	queryset = School.objects.all()

	def get_permissions(self):
		if self.request.method in ("POST", "PATCH", "PUT", "DELETE"):
			return [IsAuthenticated()]
		return super().get_permissions()

	def perform_create(self, serializer):
		user = self.request.user
		if not user.is_role(Role.ROLE_SYSTEM_ADMIN):
			raise PermissionDenied("Only national and system admins can create schools.")
		serializer.save(created_by=user)

	def perform_update(self, serializer):
		user = self.request.user
		if not user.is_role(Role.ROLE_SYSTEM_ADMIN):
			raise PermissionDenied("Only national and system admins can update schools.")
		serializer.save()

	def perform_destroy(self, instance):
		user = self.request.user
		if not user.is_role(Role.ROLE_SYSTEM_ADMIN):
			raise PermissionDenied("Only national and system admins can delete schools.")
		instance.delete()
