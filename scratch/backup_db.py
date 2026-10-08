import os
import sys
import django
import json

sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command

backup_path = os.path.abspath('backend/eduinsight_backup.json')
print(f"Creating backup at: {backup_path}")

with open(backup_path, 'w', encoding='utf-8') as f:
    call_command('dumpdata', stdout=f, indent=2)

print(f"Backup created successfully! Size: {os.path.getsize(backup_path)} bytes")
