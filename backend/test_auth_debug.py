"""Debug script: compare /api/v1/auth/me vs /api/podcasts/list with same token."""

import requests
import json

BASE = "http://localhost:8020"  # Will try different ports

# Step 1: Login
print("=" * 60)
print("Step 1: Login")
resp = requests.post(
    f"{BASE}/api/v1/auth/login",
    json={"username": "dev@example.com", "password": "devpass123"},
)
print(f"Status: {resp.status_code}")
if resp.status_code != 200:
    print(f"Login failed: {resp.text}")
    exit(1)
data = resp.json()
token = data["data"]["access_token"]
print(f"Token (first 30 chars): {token[:30]}...")
print()

# Step 2: Access /api/v1/auth/me
print("=" * 60)
print("Step 2: GET /api/v1/auth/me")
resp = requests.get(
    f"{BASE}/api/v1/auth/me",
    headers={"Authorization": f"Bearer {token}"},
)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text[:200]}")
print()

# Step 3: Access /api/podcasts/list
print("=" * 60)
print("Step 3: GET /api/podcasts/list")
resp = requests.get(
    f"{BASE}/api/podcasts/list",
    headers={"Authorization": f"Bearer {token}"},
)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text[:200]}")
print()

# Step 4: Compare the TWO requests
print("=" * 60)
print("Step 4: Compare headers")
print(f"Authorization header (me): Bearer {token[:20]}...")
print(f"Authorization header (list): Bearer {token[:20]}...")
print("Headers are IDENTICAL")
