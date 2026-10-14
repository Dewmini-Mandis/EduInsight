import time
import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

def do_http_get(url, token=None):
    req = urllib.request.Request(url)
    if token:
        req.add_header("Authorization", f"Token {token}")
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
            elapsed = (time.perf_counter() - t0) * 1000
            return resp.status, elapsed, len(content)
    except urllib.error.HTTPError as e:
        elapsed = (time.perf_counter() - t0) * 1000
        content = e.read()
        return e.code, elapsed, len(content)
    except Exception as e:
        elapsed = (time.perf_counter() - t0) * 1000
        return 500, elapsed, 0

def test_flow():
    import os, sys, django
    sys.path.insert(0, ".")
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    django.setup()
    from apps.accounts.models import User
    from rest_framework.authtoken.models import Token
    
    u = User.objects.filter(role__role_name="STUDENT").first()
    tok, _ = Token.objects.get_or_create(user=u)
    student_token = tok.key
    teacher_u = User.objects.filter(role__role_name="TEACHER").first()
    t_tok, _ = Token.objects.get_or_create(user=teacher_u)
    teacher_token = t_tok.key
    admin_u = User.objects.filter(role__role_name="SYSTEM_ADMIN").first() or User.objects.filter(is_superuser=True).first()
    a_tok, _ = Token.objects.get_or_create(user=admin_u)
    admin_token = a_tok.key
        
    print(f"Student: {student_token[:10]}... | Teacher: {teacher_token[:10]}... | Admin: {admin_token[:10]}...")
    
    endpoints_to_test = [
        # Student pages
        ("Student Me", f"{BASE_URL}/api/accounts/me/", student_token),
        ("Student Terms", f"{BASE_URL}/api/quizzes/terms/", student_token),
        ("Student Lessons", f"{BASE_URL}/api/quizzes/lessons/", student_token),
        ("Student Quizzes", f"{BASE_URL}/api/quizzes/", student_token),
        ("Student Lesson 1 Quizzes", f"{BASE_URL}/api/quizzes/lessons/1/student_quizzes/", student_token),
        ("Student Attempts List", f"{BASE_URL}/api/attempts/attempts/", student_token),
        ("Student Lesson Progress", f"{BASE_URL}/api/attempts/lesson-progress/", student_token),
        ("Student Content Progress", f"{BASE_URL}/api/attempts/content-progress/", student_token),
        ("Student Recommendations", f"{BASE_URL}/api/recommendations/recommendations/", student_token),
        
        # Teacher pages
        ("Teacher Me", f"{BASE_URL}/api/accounts/me/", teacher_token),
        ("Teacher Overview", f"{BASE_URL}/api/analytics/overview/", teacher_token),
        ("Teacher Risk", f"{BASE_URL}/api/analytics/risk/", teacher_token),
        ("Teacher Proficiency", f"{BASE_URL}/api/analytics/proficiency/", teacher_token),
        ("Teacher Classrooms", f"{BASE_URL}/api/classes/classrooms/", teacher_token),
        ("Teacher Quizzes", f"{BASE_URL}/api/quizzes/", teacher_token),
        ("Teacher Materials", f"{BASE_URL}/api/quizzes/materials/", teacher_token),
        
        # Admin pages
        ("Admin Me", f"{BASE_URL}/api/accounts/me/", admin_token),
        ("Admin All Users", f"{BASE_URL}/api/accounts/users/", admin_token),
        ("Admin Teachers", f"{BASE_URL}/api/accounts/users/?role=TEACHER", admin_token),
        ("Admin Students", f"{BASE_URL}/api/accounts/users/?role=STUDENT", admin_token),
        ("Admin Assignments", f"{BASE_URL}/api/classes/teacher-assignments/", admin_token),
        ("Admin Access Requests", f"{BASE_URL}/api/classes/access-requests/", admin_token),
        ("Admin Audit Logs", f"{BASE_URL}/api/audit/activities/", admin_token),
    ]
    
    print("\n" + "=" * 95)
    print(f"{'ENDPOINT TESTED':<35} | {'HTTP STATUS':<12} | {'ROUNDTRIP (ms)':<15} | {'SIZE (bytes)':<12}")
    print("=" * 95)
    
    results = []
    for label, url, tok in endpoints_to_test:
        status, elapsed, size = do_http_get(url, tok)
        print(f"{label:<35} | {status:<12} | {elapsed:<15.1f} | {size:<12}")
        results.append((label, status, elapsed, size))
        
    print("=" * 95)
    fast_count = len([x for x in results if x[2] < 500])
    sub_sec = len([x for x in results if x[2] < 1000])
    total = len(results)
    print(f"Summary: {fast_count}/{total} (< 500ms) | {sub_sec}/{total} (< 1000ms)")

if __name__ == "__main__":
    test_flow()
