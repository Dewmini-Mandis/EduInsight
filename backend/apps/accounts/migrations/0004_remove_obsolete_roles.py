from django.db import migrations

def migrate_obsolete_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    User = apps.get_model("accounts", "User")

    # Get or create the SYSTEM_ADMIN role
    system_admin_role, _ = Role.objects.get_or_create(role_name="SYSTEM_ADMIN")

    # Reassign National Admins and School Admins to System Admin
    obsolete_role_names = ["NATIONAL_ADMIN", "SCHOOL_ADMIN"]
    obsolete_roles = Role.objects.filter(role_name__in=obsolete_role_names)

    if obsolete_roles.exists():
        # Update users pointing to obsolete roles
        User.objects.filter(role__in=obsolete_roles).update(role=system_admin_role)

        # Safely delete the obsolete role rows
        obsolete_roles.delete()

def rollback_obsolete_roles(apps, schema_editor):
    # In rollback, we can recreate the roles, but users stay as system admins
    Role = apps.get_model("accounts", "Role")
    Role.objects.get_or_create(role_name="NATIONAL_ADMIN")
    Role.objects.get_or_create(role_name="SCHOOL_ADMIN")

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_alter_role_role_name'),
    ]

    operations = [
        migrations.RunPython(migrate_obsolete_roles, rollback_obsolete_roles),
    ]
