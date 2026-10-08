import urllib.request
import json

# 1. Login
login_url = "http://127.0.0.1:8000/api/accounts/login/"
login_data = json.dumps({"username": "admin@edu.lk", "password": "password123"}).encode("utf-8")
req_login = urllib.request.Request(login_url, data=login_data, headers={"Content-Type": "application/json"})

with urllib.request.urlopen(req_login) as resp:
    token = json.loads(resp.read().decode())["token"]

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Token {token}"
}

# 2. Get Lessons
req_lessons = urllib.request.Request("http://127.0.0.1:8000/api/quizzes/lessons/", headers=headers)
with urllib.request.urlopen(req_lessons) as resp:
    lessons = json.loads(resp.read().decode())
    lesson_list = lessons if isinstance(lessons, list) else lessons.get("results", [])

if not lesson_list:
    print("No lessons found to test.")
    exit(0)

test_lesson = lesson_list[0]
lesson_id = test_lesson["id"]
print(f"Testing edit on Lesson ID {lesson_id}: {test_lesson['title']}")

# 3. Update lesson and add a new skill
update_url = f"http://127.0.0.1:8000/api/quizzes/lessons/{lesson_id}/"
new_skill_name = f"Test Skill {lesson_id}"
update_payload = {
    "title": test_lesson["title"],
    "description": test_lesson.get("description", ""),
    "term": test_lesson["term"],
    "skills": [
        {"name": new_skill_name}
    ]
}

req_update = urllib.request.Request(update_url, data=json.dumps(update_payload).encode(), headers=headers, method="PUT")
with urllib.request.urlopen(req_update) as resp:
    updated_lesson = json.loads(resp.read().decode())
    print("Updated Lesson Response ID:", updated_lesson["id"])

# 4. Fetch skills for this lesson to confirm persistence
req_skills = urllib.request.Request(f"http://127.0.0.1:8000/api/quizzes/skills/?lesson={lesson_id}", headers=headers)
with urllib.request.urlopen(req_skills) as resp:
    skills = json.loads(resp.read().decode())
    skill_names = [s["name"] for s in (skills if isinstance(skills, list) else skills.get("results", []))]
    print("Persisted Skills for Lesson:", skill_names)
    assert new_skill_name in skill_names, "Skill was not persisted!"

print("VERIFICATION SUCCESSFUL!")
