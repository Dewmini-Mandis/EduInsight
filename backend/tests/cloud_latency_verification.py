import os
import sys
import time
import json
import statistics
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection, reset_queries, connections
from django.conf import settings
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.accounts.models import User, Role
from apps.quizzes.views import QuizViewSet, LearningMaterialViewSet
from apps.attempts.views import QuizAttemptViewSet

def run_cloud_verification(health_checks_enabled: bool, num_samples=20):
    print(f"\n==================================================", flush=True)
    print(f"RUNNING CLOUD LATENCY VERIFICATION (CONN_HEALTH_CHECKS={health_checks_enabled})", flush=True)
    print(f"==================================================", flush=True)
    
    settings.DEBUG = True
    connection.close() # Ensure fresh start
    
    admin_user = User.objects.filter(role__role_name=Role.ROLE_SYSTEM_ADMIN).first() or User.objects.first()
    factory = APIRequestFactory()
    
    endpoints = [
        ("Quizzes List (/api/quizzes/)", QuizViewSet, "/api/quizzes/"),
        ("Learning Materials (/api/quizzes/materials/)", LearningMaterialViewSet, "/api/quizzes/materials/"),
        ("Quiz Attempts (/api/attempts/attempts/)", QuizAttemptViewSet, "/api/attempts/attempts/"),
    ]
    
    for name, viewset, url in endpoints:
        print(f"\n--- Testing Endpoint: {name} ---")
        request = factory.get(url, HTTP_HOST="localhost")
        force_authenticate(request, user=admin_user)
        view = viewset.as_view({'get': 'list'})
        
        # 1. Cold Start Measurement (close connection first)
        connection.close()
        reset_queries()
        
        t0 = time.perf_counter()
        cold_resp = view(request)
        cold_resp.render()
        t1 = time.perf_counter()
        cold_time_ms = (t1 - t0) * 1000
        cold_queries = list(connection.queries)
        print(f"Cold-Start Request Time: {cold_time_ms:.2f} ms (Queries: {len(cold_queries)})")
        
        # 2. 20 Warm Samples
        warm_times_ms = []
        sql_counts = []
        connection_times = []
        has_health_check = False
        
        # Set health check option dynamically for current DB connection
        conn = connections['default']
        conn.health_checks_enabled = health_checks_enabled
        
        for i in range(num_samples):
            reset_queries()
            
            t_conn_0 = time.perf_counter()
            conn.ensure_connection()
            t_conn_1 = time.perf_counter()
            conn_time_ms = (t_conn_1 - t_conn_0) * 1000
            connection_times.append(conn_time_ms)
            
            t_start = time.perf_counter()
            resp = view(request)
            resp.render()
            t_end = time.perf_counter()
            
            duration_ms = (t_end - t_start) * 1000
            warm_times_ms.append(duration_ms)
            
            queries = list(connection.queries)
            sql_counts.append(len(queries))
            
            # Check if SELECT 1 or ping query exists
            for q in queries:
                if "SELECT 1" in q.get('sql', '').upper() or "PING" in q.get('sql', '').upper():
                    has_health_check = True
                    
        warm_sorted = sorted(warm_times_ms)
        median_time = warm_sorted[len(warm_sorted) // 2]
        p95_index = int(0.95 * len(warm_sorted))
        p95_time = warm_sorted[p95_index]
        min_time = warm_sorted[0]
        max_time = warm_sorted[-1]
        
        avg_conn_time = sum(connection_times) / len(connection_times)
        
        print(f"Warm Samples ({num_samples} runs): {[round(t, 1) for t in warm_times_ms]}", flush=True)
        print(f"Median API Time:          {median_time:.2f} ms", flush=True)
        print(f"p95 API Time:             {p95_time:.2f} ms", flush=True)
        print(f"Min API Time:             {min_time:.2f} ms", flush=True)
        print(f"Max API Time:             {max_time:.2f} ms", flush=True)
        print(f"SQL Query Count:          {sql_counts[0]}", flush=True)
        print(f"Avg Connection Check:     {avg_conn_time:.2f} ms", flush=True)
        print(f"Health-Check Query Run:   {'YES (Extra Query)' if has_health_check else 'NO'}", flush=True)

if __name__ == "__main__":
    run_cloud_verification(health_checks_enabled=True, num_samples=20)
    run_cloud_verification(health_checks_enabled=False, num_samples=20)
