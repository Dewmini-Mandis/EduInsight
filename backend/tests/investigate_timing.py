import os
import sys
import time
import cProfile
import pstats
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection, reset_queries
from django.conf import settings
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.accounts.models import User, Role
from apps.quizzes.views import QuizViewSet, LearningMaterialViewSet
from apps.attempts.views import QuizAttemptViewSet
from apps.quizzes.models import Quiz

def measure_endpoint_details(name, viewset_class, url_path):
    print(f"\n==========================================")
    print(f"INVESTIGATING ENDPOINT: {name} ({url_path})")
    print(f"==========================================")
    
    # 1. User & View Setup
    admin_user = User.objects.filter(role__role_name=Role.ROLE_SYSTEM_ADMIN).first()
    if not admin_user:
        admin_user = User.objects.first()
        
    factory = APIRequestFactory()
    request = factory.get(url_path, HTTP_HOST="localhost")
    force_authenticate(request, user=admin_user)
    
    view = viewset_class.as_view({'get': 'list'})
    
    # Warmup call
    reset_queries()
    _ = view(request)
    
    # Sample timing over 5 runs
    timings_ms = []
    sql_query_counts = []
    sql_total_times_ms = []
    payload_sizes = []
    
    for i in range(5):
        reset_queries()
        settings.DEBUG = True
        
        t0 = time.perf_counter()
        response = view(request)
        response.render()
        t1 = time.perf_counter()
        
        duration_ms = (t1 - t0) * 1000
        timings_ms.append(duration_ms)
        
        queries = connection.queries
        sql_query_counts.append(len(queries))
        total_sql_time = sum(float(q.get('time', 0)) for q in queries) * 1000
        sql_total_times_ms.append(total_sql_time)
        
        payload_sizes.append(len(response.content))
        
    timings_ms.sort()
    sql_total_times_ms.sort()
    
    median_total = timings_ms[2]
    p95_total = timings_ms[4]
    median_sql = sql_total_times_ms[2]
    
    print(f"Samples (Total View ms): {[round(t, 2) for t in timings_ms]}")
    print(f"Median Total View Time: {median_total:.2f} ms")
    print(f"p95 Total View Time:    {p95_total:.2f} ms")
    print(f"SQL Query Count:        {sql_query_counts[0]}")
    print(f"Median Total SQL Time:  {median_sql:.2f} ms")
    print(f"Payload Size:           {payload_sizes[0]} bytes")
    
    # Breakdown of Slowest SQL Queries
    print("\n--- TOP 5 SLOWEST SQL QUERIES ---")
    queries_sorted = sorted(connection.queries, key=lambda q: float(q.get('time', 0)), reverse=True)
    for idx, q in enumerate(queries_sorted[:5], 1):
        q_time_ms = float(q.get('time', 0)) * 1000
        sql_text = q.get('sql', '')[:120].replace('\n', ' ')
        print(f"{idx}. [{q_time_ms:.2f} ms] {sql_text}...")

    # EXPLAIN ANALYZE on top query
    if queries_sorted:
        top_sql = queries_sorted[0].get('sql')
        if top_sql and ("SELECT" in top_sql or "select" in top_sql):
            print("\n--- EXPLAIN (ANALYZE, BUFFERS) FOR SLOWEST QUERY ---")
            try:
                with connection.cursor() as cursor:
                    cursor.execute(f"EXPLAIN (ANALYZE, BUFFERS) {top_sql}")
                    explain_res = cursor.fetchall()
                    for line in explain_res[:10]:
                        print("  ", line[0])
            except Exception as e:
                print(f"  Explain skipped: {e}")

    # Verify Pagination Stability across pages
    print("\n--- PAGINATION STABILITY VERIFICATION ---")
    page1_req = factory.get(url_path + "?page=1", HTTP_HOST="localhost")
    page2_req = factory.get(url_path + "?page=2", HTTP_HOST="localhost")
    force_authenticate(page1_req, user=admin_user)
    force_authenticate(page2_req, user=admin_user)
    
    r1 = view(page1_req).render()
    r2 = view(page2_req).render()
    
    import json
    data1 = json.loads(r1.content)
    data2 = json.loads(r2.content)
    
    res1_ids = [item['id'] for item in data1.get('results', []) if 'id' in item]
    res2_ids = [item['id'] for item in data2.get('results', []) if 'id' in item]
    
    overlap = set(res1_ids).intersection(set(res2_ids))
    print(f"Page 1 Item Count: {len(res1_ids)} | Page 2 Item Count: {len(res2_ids)}")
    print(f"Overlap Count between Page 1 and Page 2: {len(overlap)}")
    if len(overlap) == 0:
        print("PASS: Pagination returns non-duplicated, stable results across pages.")
    else:
        print(f"FAIL: Duplicate items found in pagination overlap: {overlap}")

if __name__ == "__main__":
    measure_endpoint_details("Quizzes List", QuizViewSet, "/api/quizzes/")
    measure_endpoint_details("Learning Materials List", LearningMaterialViewSet, "/api/quizzes/materials/")
    measure_endpoint_details("Quiz Attempts List", QuizAttemptViewSet, "/api/attempts/attempts/")
