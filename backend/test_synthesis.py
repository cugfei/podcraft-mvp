import requests
import json

# 1. Login
print("=== 1. Login ===")
login_data = {"username": "testuser2", "password": "testpass123"}
r = requests.post("http://localhost:8005/api/v1/auth/login", json=login_data)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    token = r.json()["data"]["access_token"]
    print(f"Token obtained: {token[:20]}...")
else:
    print(f"Login failed: {r.text}")
    exit(1)

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

# 2. Create podcast project
print("\n=== 2. Create Podcast Project ===")
project_data = {
    "title": "测试合成播客",
    "mode": "solo",
    "style": "professional",
    "target_duration": 300
}
r = requests.post("http://localhost:8005/api/v1/podcasts/", json=project_data, headers=headers)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    project_id = r.json()["data"]["id"]
    print(f"Project created: {project_id}")
else:
    print(f"Create failed: {r.text}")
    exit(1)

# 3. Generate outline
print("\n=== 3. Generate Outline ===")
outline_data = {"prompt": "介绍人工智能在播客制作中的应用"}
r = requests.post(f"http://localhost:8005/api/v1/podcasts/{project_id}/outline", json=outline_data, headers=headers)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    print("Outline generated successfully")
else:
    print(f"Outline failed: {r.text}")

# 4. Generate script
print("\n=== 4. Generate Script ===")
script_data = {"regenerate": False}
r = requests.post(f"http://localhost:8005/api/v1/podcasts/{project_id}/script", json=script_data, headers=headers, timeout=60)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    print("Script generated successfully")
else:
    print(f"Script failed: {r.text}")

# 5. Start synthesis task (T-4.6)
print("\n=== 5. Start Synthesis Task (T-4.6) ===")
synthesis_data = {"task_type": "full"}
print("Starting synthesis (this may take a while)...")
r = requests.post(f"http://localhost:8005/api/v1/podcasts/{project_id}/synthesize", json=synthesis_data, headers=headers, timeout=120)
print(f"Status: {r.status_code}")
print(json.dumps(r.json(), ensure_ascii=False, indent=2))

if r.status_code == 200:
    task_id = r.json()["data"]["task_id"]
    print(f"\nTask created: {task_id}")
    
    # 6. Query task status
    print("\n=== 6. Query Task Status ===")
    r = requests.get(f"http://localhost:8005/api/v1/podcasts/synthesis-tasks/{task_id}", headers=headers)
    print(f"Status: {r.status_code}")
    print(json.dumps(r.json(), ensure_ascii=False, indent=2))
    
    # 7. List all tasks
    print("\n=== 7. List All Tasks ===")
    r = requests.get(f"http://localhost:8005/api/v1/podcasts/synthesis-tasks", headers=headers)
    print(f"Status: {r.status_code}")
    print(json.dumps(r.json(), ensure_ascii=False, indent=2))
else:
    print(f"Synthesis failed: {r.text}")

print("\n=== Test Complete ===")
