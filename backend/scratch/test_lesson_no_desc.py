import urllib.request
import json

# 1. Obtain token
login_url = "http://127.0.0.1:8000/api/accounts/login/"
login_data = json.dumps({"username": "admin@edu.lk", "password": "password123"}).encode("utf-8")
req_login = urllib.request.Request(login_url, data=login_data, headers={"Content-Type": "application/json"})

with urllib.request.urlopen(req_login) as resp:
    login_res = json.loads(resp.read().decode())
    token = login_res["token"]

print("Auth Token obtained successfully.")

# 2. Fetch terms
req_terms = urllib.request.Request("http://127.0.0.1:8000/api/quizzes/terms/", headers={"Authorization": f"Token {token}"})
with urllib.request.urlopen(req_terms) as resp:
    terms = json.loads(resp.read().decode())
    term_id = terms[0]["id"] if terms else 1

print(f"Using term_id: {term_id}")

# 3. Create lesson with empty description
url = "http://127.0.0.1:8000/api/quizzes/lessons/"
data = {
    "title": "Test Lesson Without Description",
    "description": "",
    "term": term_id
}

payload = json.dumps(data).encode("utf-8")
req = urllib.request.Request(url, data=payload, headers={
    "Content-Type": "application/json",
    "Authorization": f"Token {token}"
})

try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("SUCCESS! Created lesson:", res["id"], "title:", res["title"], "description:", repr(res["description"]))
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.read().decode())
except Exception as e:
    print("Error:", e)
