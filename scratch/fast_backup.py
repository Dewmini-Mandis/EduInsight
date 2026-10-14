import os
import sys
import django
import json

sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.apps import apps
from django.core import serializers

output_file = os.path.abspath('backend/eduinsight_backup_fast.json')
all_objects = []

print("Starting backup...", flush=True)
for model in apps.get_models():
    try:
        model_name = model._meta.label
        count = model.objects.count()
        if count > 0:
            print(f"Dumping {model_name} ({count} objects)...", flush=True)
            qs = model.objects.all()
            data = json.loads(serializers.serialize('json', qs))
            all_objects.extend(data)
    except Exception as e:
        print(f"Skipping model {model}: {e}", flush=True)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(all_objects, f, indent=2)

print(f"BACKUP SUCCESSFUL! File: {output_file}, Total objects: {len(all_objects)}, File size: {os.path.getsize(output_file)} bytes", flush=True)
