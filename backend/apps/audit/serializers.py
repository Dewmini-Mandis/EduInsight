from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "actor_name",
            "user_name",
            "role",
            "action",
            "entity_type",
            "entity_id",
            "description",
            "metadata",
            "timestamp",
            "ip_address",
        ]

    def get_actor_name(self, obj):
        if obj.actor_name and obj.actor_name.strip() and obj.actor_name != "System Administrator":
            return obj.actor_name
        if obj.user:
            name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return name if name else obj.user.username
        return "System Administrator"

    def get_user_name(self, obj):
        return self.get_actor_name(obj)

    def get_description(self, obj):
        desc = (obj.description or "").strip()
        action = (obj.action or "").strip().upper()
        entity = (obj.entity_type or "").strip().upper()

        if desc and not desc.startswith("UPDATED_USER") and not desc.startswith("CREATED_USER") and not desc.startswith("DELETED_USER"):
            return desc

        if action == "UPDATED_USER" or (action == "UPDATE" and entity in ["USER", "GENERAL"]):
            return "Updated user account details"
        if action == "CREATED_USER" or (action == "CREATE" and entity in ["USER", "GENERAL"]):
            return "Created new user account"
        if action == "DELETED_USER" or (action == "DELETE" and entity in ["USER", "GENERAL"]):
            return "Deleted user account"
        if action in ["LOGIN", "USER_LOGIN"]:
            return "User signed in"
        if action in ["LOGOUT", "USER_LOGOUT"]:
            return "User signed out"

        clean_act = action.replace("_USER", "").replace("_LESSON", "").replace("_SCHOOL", "").replace("_", " ").title()
        clean_ent = entity.replace("_", " ").title()
        return f"{clean_act} {clean_ent}".strip()
