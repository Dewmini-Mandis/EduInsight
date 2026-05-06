from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("EduInsight", {"fields": ("role", "school_id")}),
    )
    list_display = UserAdmin.list_display + ("role", "school_id")
    list_filter = UserAdmin.list_filter + ("role",)
