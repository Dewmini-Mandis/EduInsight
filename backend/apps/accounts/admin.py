from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Role, User


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("role_name",)
    search_fields = ("role_name",)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("EduInsight", {"fields": ("role", "school")}),
    )
    list_display = UserAdmin.list_display + ("role", "school")
    list_filter = UserAdmin.list_filter + ("role",)
