import os
import sys
import django

sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from apps.accounts.models import Role
from apps.quizzes.models import QuizLevel, DifficultyLevel, AcademicTerm

print("Recreating required default lookup/reference data...")

# 1. Roles
roles = [Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER, Role.ROLE_STUDENT]
for r in roles:
    role, created = Role.objects.get_or_create(role_name=r)
    print(f"Role: {role.role_name} (Created: {created})")

# 2. Quiz Levels
levels = [
    ("Beginner", 1),
    ("Intermediate", 2),
    ("Advanced", 3)
]
for name, order in levels:
    lvl, created = QuizLevel.objects.get_or_create(name=name, defaults={"order": order})
    print(f"QuizLevel: {lvl.name} (Created: {created})")

# 3. Difficulty Levels
diffs = [
    ("Easy", 1),
    ("Medium", 2),
    ("Hard", 3)
]
for d, order in diffs:
    diff, created = DifficultyLevel.objects.get_or_create(name=d, defaults={"order": order})
    print(f"DifficultyLevel: {diff.name} (Created: {created})")

# 4. Academic Terms
terms = ["Term 1", "Term 2", "Term 3"]
for t in terms:
    term, created = AcademicTerm.objects.get_or_create(name=t)
    print(f"AcademicTerm: {term.name} (Created: {created})")

# 5. Reset PostgreSQL Sequences
print("\nResetting PostgreSQL auto-increment sequences...")
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public';
    """)
    seqs = cursor.fetchall()
    for seq in seqs:
        seq_name = seq[0]
        try:
            cursor.execute(f"ALTER SEQUENCE {seq_name} RESTART WITH 1;")
        except Exception as e:
            pass

print("REQUIRED REFERENCE SEED DATA RESTORED & SEQUENCES RESET SUCCESSFULLY!")
