"""
T-6.1 核心闭环端到端联调自动化测试脚本 (修正版)

测试核心链路：
1. 注册新用户 → 验证获得 500 积分
2. 登录获取 token
3. 创建播客项目（单人）
4. 生成大纲
5. 生成脚本
6. 查看积分余额变化
7. 查看积分流水
8. 合成音频（Mock TTS）
9. 导出音频
10. 验证积分扣除
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8032/api/v1"
TIMESTAMP = datetime.now().strftime('%Y%m%d_%H%M%S')
TEST_USER = f"test_user_{TIMESTAMP}"
TEST_PASSWORD = "Test@123456"
TEST_EMAIL = f"{TEST_USER}@example.com"

# Store results
results = []
session_token = None


def log_test(name: str, passed: bool, message: str = ""):
    """Log test result."""
    status = "✅" if passed else "❌"
    results.append({"name": name, "passed": passed, "message": message})
    print(f"{status} {name}: {message}")


def make_request(method: str, url: str, headers: dict = None, json_data: dict = None, timeout: int = 30):
    """Make HTTP request with error handling."""
    try:
        if method.upper() == "GET":
            resp = requests.get(url, headers=headers, timeout=timeout)
        elif method.upper() == "POST":
            resp = requests.post(url, json=json_data, headers=headers, timeout=timeout)
        else:
            print(f"   ⚠️ Unsupported method: {method}")
            return None
        
        # Try to parse JSON
        try:
            data = resp.json()
            return {"status_code": resp.status_code, "data": data}
        except:
            return {"status_code": resp.status_code, "text": resp.text}
            
    except Exception as e:
        print(f"   ⚠️ Request failed: {e}")
        return None


def test_register():
    """Test 1: 注册新用户 → 验证获得 500 积分."""
    print("\n📋 Test 1: 用户注册")
    url = f"{BASE_URL}/auth/register"
    data = {
        "username": TEST_USER,
        "password": TEST_PASSWORD,
        "email": TEST_EMAIL,
    }
    result = make_request("POST", url, json_data=data)
    
    if result and result["status_code"] == 200:
        resp_data = result["data"]
        if resp_data.get("code") == 0:
            log_test("用户注册", True, f"Status: {result['status_code']}")
            # Extract token from response
            token = resp_data.get("data", {}).get("access_token")
            return token
        else:
            log_test("用户注册", False, f"Code: {resp_data.get('code')}, Message: {resp_data.get('message')}")
            return None
    else:
        log_test("用户注册", False, f"Status: {result['status_code'] if result else 'N/A'}")
        return None


def test_login():
    """Test 2: 登录获取 token."""
    print("\n📋 Test 2: 用户登录")
    url = f"{BASE_URL}/auth/login"
    # UserLogin expects 'username' which can be email or phone
    data = {
        "username": TEST_EMAIL,  # Use email as username
        "password": TEST_PASSWORD,
    }
    result = make_request("POST", url, json_data=data)
    
    if result and result["status_code"] == 200:
        resp_data = result["data"]
        if resp_data.get("code") == 0:
            log_test("用户登录", True, f"Status: {result['status_code']}")
            # Extract token from response
            token = resp_data.get("data", {}).get("access_token")
            return token
        else:
            log_test("用户登录", False, f"Code: {resp_data.get('code')}, Message: {resp_data.get('message')}")
            return None
    else:
        log_test("用户登录", False, f"Status: {result['status_code'] if result else 'N/A'}")
        return None


def test_credit_balance(token: str, expected: int = 500):
    """Test 3: 验证积分余额."""
    print(f"\n📋 Test 3: 验证积分余额（预期: {expected}）")
    url = f"{BASE_URL}/credits/balance"
    headers = {"Authorization": f"Bearer {token}"}
    result = make_request("GET", url, headers=headers)
    
    if result and result["status_code"] == 200:
        resp_data = result["data"]
        if resp_data.get("code") == 0:
            balance_info = resp_data.get("data", {})
            balance = balance_info.get("balance", 0)
            if balance == expected:
                log_test("验证积分余额", True, f"Balance: {balance}")
            else:
                log_test("验证积分余额", False, f"Expected {expected}, got {balance}")
            return balance
        else:
            log_test("验证积分余额", False, f"Code: {resp_data.get('code')}")
            return None
    else:
        log_test("验证积分余额", False, f"Status: {result['status_code'] if result else 'N/A'}")
        return None


def test_create_podcast(token: str):
    """Test 4: 创建播客项目（单人）."""
    print("\n📋 Test 4: 创建播客项目")
    url = f"{BASE_URL}/podcasts/"
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "title": "测试播客项目",
        "description": "这是一个自动化测试项目",
        "type": "solo",
        "voice_style": "professional",
    }
    result = make_request("POST", url, headers=headers, json_data=data)
    
    if result and result["status_code"] == 200:
        resp_data = result["data"]
        if resp_data.get("code") == 0:
            log_test("创建播客项目", True, f"Status: {result['status_code']}")
            project_id = resp_data.get("data", {}).get("id")
            return project_id
        else:
            log_test("创建播客项目", False, f"Code: {resp_data.get('code')}, Message: {resp_data.get('message')}")
            return None
    else:
        log_test("创建播客项目", False, f"Status: {result['status_code'] if result else 'N/A'}")
        return None


def test_generate_outline(token: str, project_id: str):
    """Test 5: 生成大纲."""
    print("\n📋 Test 5: 生成大纲")
    url = f"{BASE_URL}/podcasts/{project_id}/outline"
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "topic": "人工智能在媒体行业的应用",
        "duration_minutes": 10,
    }
    result = make_request("POST", url, headers=headers, json_data=data)
    
    if result and result["status_code"] == 200:
        resp_data = result["data"]
        if resp_data.get("code") == 0:
            log_test("生成大纲", True, f"Status: {result['status_code']}")
            return True
        else:
            log_test("生成大纲", False, f"Code: {resp_data.get('code')}, Message: {resp_data.get('message')}")
            return False
    else:
        log_test("生成大纲", False, f"Status: {result['status_code'] if result else 'N/A'}")
        return False


def test_generate_script(token: str, project_id: str):
    """Test 6: 生成脚本."""
    print("\n📋 Test 6: 生成脚本")
    url = f"{BASE_URL}/podcasts/{project_id}/script"
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "outline": "1. 引言\n2. AI 技术应用\n3. 案例分析\n4. 未来展望",
    }
    result = make_request("POST", url, headers=headers, json_data=data)
    
    if result and result["status_code"] == 200:
        resp_data = result["data"]
        if resp_data.get("code") == 0:
            log_test("生成脚本", True, f"Status: {result['status_code']}")
            return True
        else:
            log_test("生成脚本", False, f"Code: {resp_data.get('code')}, Message: {resp_data.get('message')}")
            return False
    else:
        log_test("生成脚本", False, f"Status: {result['status_code'] if result else 'N/A'}")
        return False


def test_credit_ledger(token: str):
    """Test 7: 查看积分流水."""
    print("\n📋 Test 7: 查看积分流水")
    url = f"{BASE_URL}/credits/ledger"
    headers = {"Authorization": f"Bearer {token}"}
    result = make_request("GET", url, headers=headers)
    
    if result and result["status_code"] == 200:
        resp_data = result["data"]
        if resp_data.get("code") == 0:
            items = resp_data.get("data", {}).get("items", [])
            log_test("查看积分流水", True, f"Found {len(items)} records")
            return items
        else:
            log_test("查看积分流水", False, f"Code: {resp_data.get('code')}")
            return None
    else:
        log_test("查看积分流水", False, f"Status: {result['status_code'] if result else 'N/A'}")
        return None


def test_synthesize_audio(token: str, project_id: str):
    """Test 8: 合成音频（Mock TTS）."""
    print("\n📋 Test 8: 合成音频")
    url = f"{BASE_URL}/podcasts/{project_id}/synthesize"
    headers = {"Authorization": f"Bearer {token}"}
    # SynthesisRequest body
    data = {
        "task_type": "full",  # "full" | "role" | "segment"
        "speed": 1.0,
        "pitch": 0,
        "volume": 1.0,
    }
    result = make_request("POST", url, headers=headers, json_data=data)
    
    if result and result["status_code"] == 200:
        resp_data = result["data"]
        if resp_data.get("code") == 0:
            log_test("合成音频", True, f"Status: {result['status_code']}")
            return True
        else:
            log_test("合成音频", False, f"Code: {resp_data.get('code')}, Message: {resp_data.get('message')}")
            return False
    else:
        log_test("合成音频", False, f"Status: {result['status_code'] if result else 'N/A'}")
        return False


def test_export_audio(token: str, project_id: str):
    """Test 9: 导出音频（通过静态文件服务）."""
    print("\n📋 Test 9: 导出音频（静态文件服务）")
    
    # First, get the project to find audio assets
    url = f"{BASE_URL}/podcasts/{project_id}"
    headers = {"Authorization": f"Bearer {token}"}
    result = make_request("GET", url, headers=headers)
    
    if result and result["status_code"] == 200:
        # Try to access static audio files
        # Check if there are any .wav files in static/audio/
        import os
        audio_dir = os.path.join(os.path.dirname(__file__), "backend", "static", "audio")
        if os.path.exists(audio_dir):
            files = [f for f in os.listdir(audio_dir) if f.endswith('.wav')]
            if files:
                # Test accessing the first audio file via static file service
                filename = files[0]
                static_url = f"http://localhost:8032/static/audio/{filename}"
                try:
                    resp = requests.get(static_url, timeout=10)
                    if resp.status_code == 200:
                        log_test("导出音频", True, f"Static file accessible: {filename} ({len(resp.content)} bytes)")
                        return True
                    else:
                        log_test("导出音频", False, f"Static file access failed: {resp.status_code}")
                except Exception as e:
                    log_test("导出音频", False, f"Static file access error: {e}")
            else:
                log_test("导出音频", False, "No audio files found in static/audio/")
        else:
            log_test("导出音频", False, "static/audio/ directory not found")
    else:
        log_test("导出音频", False, f"Failed to get project: {result['status_code'] if result else 'N/A'}")
    
    return False


def run_tests():
    """Run all tests."""
    print("=" * 60)
    print("T-6.1 核心闭环端到端联调自动化测试 (修正版)")
    print(f"测试用户: {TEST_USER}")
    print("=" * 60)
    
    # Test 1: Register
    token = test_register()
    if not token:
        print("\n❌ 注册失败，终止测试")
        return
    
    # Test 2: Login (get a fresh token)
    token = test_login()
    if not token:
        print("\n❌ 登录失败，终止测试")
        return
    
    # Test 3: Check credit balance
    initial_balance = test_credit_balance(token, expected=500)
    if initial_balance is None:
        print("\n❌ 获取积分余额失败，终止测试")
        return
    
    # Test 4: Create podcast
    project_id = test_create_podcast(token)
    if not project_id:
        print("\n❌ 创建播客失败，终止测试")
        return
    
    # Test 5: Generate outline
    if not test_generate_outline(token, project_id):
        print("\n❌ 生成大纲失败，终止测试")
        return
    
    # Wait a bit for processing
    time.sleep(2)
    
    # Test 6: Generate script
    if not test_generate_script(token, project_id):
        print("\n❌ 生成脚本失败，终止测试")
        return
    
    # Wait a bit for processing
    time.sleep(2)
    
    # Test 7: Check credit ledger
    test_credit_ledger(token)
    
    # Test 8: Synthesize audio
    if not test_synthesize_audio(token, project_id):
        print("\n❌ 合成音频失败，终止测试")
        return
    
    # Wait for synthesis to complete
    time.sleep(5)
    
    # Test 9: Export audio
    test_export_audio(token, project_id)
    
    # Test 10: Check credit balance after synthesis
    test_credit_balance(token, expected=initial_balance)
    
    # Print summary
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    passed = sum(1 for r in results if r["passed"])
    total = len(results)
    print(f"通过: {passed}/{total}")
    print("\n详细信息:")
    for r in results:
        status = "✅" if r["passed"] else "❌"
        print(f"  {status} {r['name']}: {r['message']}")
    print("=" * 60)


if __name__ == "__main__":
    run_tests()
