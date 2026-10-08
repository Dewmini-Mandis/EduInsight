import os, sys, django
sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connection

with connection.cursor() as cursor:
    print("--- EXPLAIN ANALYZE COUNT ---")
    cursor.execute("""
        EXPLAIN ANALYZE
        SELECT COUNT(*) AS "__count"
        FROM "analytics_proficiencyprediction"
        INNER JOIN "students" ON ("analytics_proficiencyprediction"."student_id" = "students"."id")
        WHERE "students"."registered_by_id" = 2;
    """)
    for row in cursor.fetchall():
        print(row[0])

    print("\n--- EXPLAIN ANALYZE SELECT ---")
    cursor.execute("""
        EXPLAIN ANALYZE
        SELECT "analytics_proficiencyprediction"."id", "analytics_proficiencyprediction"."student_id",
               "analytics_proficiencyprediction"."proficiency_level", "analytics_proficiencyprediction"."confidence_score",
               "analytics_proficiencyprediction"."contributing_factors", "analytics_proficiencyprediction"."prediction_date",
               "analytics_proficiencyprediction"."is_flagged", "analytics_proficiencyprediction"."flag_reason",
               "students"."id", "students"."user_id", "students"."index_no", "students"."grade",
               "students"."class_name", "students"."class_room_id", "students"."registered_by_id",
               T4."id", T4."password", T4."last_login", T4."is_superuser", T4."username", T4."first_name",
               T4."last_name", T4."email", T4."is_staff", T4."is_active", T4."date_joined", T4."role_id",
               T4."school_id", T4."must_change_password"
        FROM "analytics_proficiencyprediction"
        INNER JOIN "students" ON ("analytics_proficiencyprediction"."student_id" = "students"."id")
        INNER JOIN "accounts_user" T4 ON ("students"."user_id" = T4."id")
        WHERE "students"."registered_by_id" = 2
        ORDER BY "analytics_proficiencyprediction"."prediction_date" DESC
        LIMIT 4;
    """)
    for row in cursor.fetchall():
        print(row[0])
