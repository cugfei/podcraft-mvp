# PodCraft API 文档

> **Base URL**: `http://localhost:8032`  
> **API Prefix**: `/api/v1`  
> **Protocol**: HTTP/HTTPS  
> **Auth**: Bearer Token (JWT)

---

## 目录

1. [概述](#1-概述)
2. [认证机制](#2-认证机制)
3. [认证模块](#3-认证模块)
4. [播客项目管理](#4-播客项目管理)
5. [脚本管理](#5-脚本管理)
6. [分段管理](#6-分段管理)
7. [积分系统](#7-积分系统)
8. [订单/充值](#8-订单充值)
9. [语音/角色](#9-语音角色)
10. [上传/音频资源](#10-上传音频资源)
11. [合成任务](#11-合成任务)
12. [管理员功能](#12-管理员功能)
13. [分析统计](#13-分析统计)
14. [健康检查](#14-健康检查)
15. [错误码](#15-错误码)

---

## 1. 概述

### 1.1 统一响应格式

所有 API 响应遵循统一格式：

```json
{
  "code": 0,
  "data": {},
  "message": "success"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | Integer | 业务状态码（`0` = 成功） |
| `data` | Object | 响应数据（可为 `null`） |
| `message` | String | 提示信息 |

### 1.2 认证方式

大多数 API 需要在请求头中携带 Bearer Token：

```
Authorization: Bearer <access_token>
```

### 1.3 分页参数

列表接口支持分页，使用以下查询参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `skip` | Integer | `0` | 跳过记录数 |
| `limit` | Integer | `20` | 返回记录数（最大 `100`） |
| `page` | Integer | `1` | 页码（部分接口） |
| `page_size` | Integer | `20` | 每页记录数 |

---

## 2. 认证机制

### 2.1 获取 Access Token

注册或登录后，从响应中提取 `access_token` 和 `refresh_token`：

```json
{
  "code": 0,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user_id": "uuid-here",
    "email": "user@example.com",
    "nickname": "user"
  },
  "message": "ok"
}
```

### 2.2 刷新 Token

当 `access_token` 过期时，使用 `refresh_token` 获取新的 `access_token`（见 [POST /auth/refresh](#33-刷新-token)）。

### 2.3 Token 过期时间

- **Access Token**: 1440 分钟（24 小时）
- **Refresh Token**: 30 天（可配置）

---

## 3. 认证模块

**Base Path**: `/api/v1/auth`

### 3.1 用户注册

**Endpoint**: `POST /api/v1/auth/register`  
**Auth Required**: ❌ No  
**Description**: 注册新用户，注册即送 500 积分。

#### Request Body

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | String | 条件必填 | 邮箱（与 `phone` 二选一） |
| `phone` | String | 条件必填 | 手机号（与 `email` 二选一） |
| `password` | String | ✅ | 密码（至少 6 位） |
| `nickname` | String | ❌ | 昵称（可选，默认使用邮箱前缀） |

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456",
    "nickname": "测试用户"
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "nickname": "测试用户"
  },
  "message": "ok"
}
```

#### Error Responses

| HTTP Status | Code | Message |
|-------------|------|---------|
| 409 | - | "Email already registered" |
| 409 | - | "Phone already registered" |
| 400 | - | "Email or phone is required" |

---

### 3.2 用户登录

**Endpoint**: `POST /api/v1/auth/login`  
**Auth Required**: ❌ No  
**Description**: 使用邮箱或手机号 + 密码登录。

#### Request Body

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | String | ✅ | 邮箱或手机号 |
| `password` | String | ✅ | 密码 |

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test@example.com",
    "password": "123456"
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "nickname": "测试用户"
  },
  "message": "ok"
}
```

#### Error Responses

| HTTP Status | Code | Message |
|-------------|------|---------|
| 401 | - | "Invalid credentials" |
| 403 | - | "Account is disabled" |

---

### 3.3 刷新 Token

**Endpoint**: `POST /api/v1/auth/refresh`  
**Auth Required**: ❌ No（使用 Refresh Token）  
**Description**: 使用 Refresh Token 获取新的 Access Token。

#### Request Body

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `refresh_token` | String | ✅ | Refresh Token |

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  },
  "message": "ok"
}
```

#### Error Responses

| HTTP Status | Code | Message |
|-------------|------|---------|
| 401 | - | "Invalid refresh token" |
| 401 | - | "Refresh token is required" |

---

### 3.4 获取当前用户信息

**Endpoint**: `GET /api/v1/auth/me`  
**Auth Required**: ✅ Yes  
**Description**: 获取当前认证用户的信息。

#### Example Request

```bash
curl -X GET <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "phone": null,
    "nickname": "测试用户",
    "role": "user",
    "status": "active",
    "created_at": "2026-05-25T12:00:00"
  },
  "message": "ok"
}
```

#### Error Responses

| HTTP Status | Code | Message |
|-------------|------|---------|
| 401 | - | "Not authenticated" |
| 401 | - | "Invalid or expired token" |
| 403 | - | "User account is disabled" |

---

## 4. 播客项目管理

**Base Path**: `/api/v1/podcasts`

### 4.1 获取播客项目列表

**Endpoint**: `GET /api/v1/podcasts/list`  
**Auth Required**: ✅ Yes  
**Description**: 获取当前用户的播客项目列表（分页）。

#### Query Parameters

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `status` | String | ❌ | `null` | 按状态过滤（`draft` / `ready_to_synthesize` / `synthesis_done` / `published`） |
| `skip` | Integer | ❌ | `0` | 跳过记录数 |
| `limit` | Integer | ❌ | `20` | 返回记录数（最大 `100`） |

#### Example Request

```bash
curl -X GET "<SIGNED_URL_REMOVED>" \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "我的第一个播客",
        "mode": "solo",
        "style": "professional",
        "target_duration": 600,
        "status": "draft",
        "created_at": "2026-05-25T12:00:00",
        "updated_at": "2026-05-25T12:30:00",
        "script": {...},
        "roles": [...],
        "final_audio_asset": null
      }
    ],
    "total": 1,
    "skip": 0,
    "limit": 20
  },
  "message": "ok"
}
```

---

### 4.2 创建播客项目

**Endpoint**: `POST /api/v1/podcasts/`  
**Auth Required**: ✅ Yes  
**Description**: 创建新的播客项目（自动创建脚本和默认角色）。

#### Request Body

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `title` | String | ✅ | - | 项目标题 |
| `mode` | String | ❌ | `"solo"` | 模式（`solo` = 独播，`duo` = 对话） |
| `style` | String | ❌ | `"professional"` | 风格（`professional` / `casual` / `humorous`） |
| `target_duration` | Integer | ❌ | `null` | 目标时长（秒） |

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的第一个播客",
    "mode": "duo",
    "style": "casual",
    "target_duration": 600
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "我的第一个播客",
    "mode": "duo",
    "style": "casual",
    "target_duration": 600,
    "status": "draft",
    "created_at": "2026-05-25T12:00:00",
    "updated_at": "2026-05-25T12:00:00"
  },
  "message": "ok"
}
```

**Note**: 创建项目后，系统会自动：
1. 创建脚本（Script）
2. 创建默认角色（`solo` 模式创建 1 个角色，`duo` 模式创建 2 个角色）

---

### 4.3 获取播客项目详情

**Endpoint**: `GET /api/v1/podcasts/{project_id}`  
**Auth Required**: ✅ Yes  
**Description**: 获取指定播客项目的详细信息（包含脚本、角色、分段）。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_id` | String (UUID) | ✅ | 播客项目 ID |

#### Example Request

```bash
curl -X GET <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "我的第一个播客",
    "mode": "duo",
    "style": "casual",
    "target_duration": 600,
    "status": "draft",
    "created_at": "2026-05-25T12:00:00",
    "updated_at": "2026-05-25T12:30:00",
    "script": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "project_id": "660e8400-e29b-41d4-a716-446655440001",
      "outline": "第一章：引言\n第二章：主体\n第三章：总结",
      "script_content": "【主持人】大家好，欢迎收听...\n【嘉宾】谢谢邀请...",
      "status": "draft"
    },
    "roles": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "role_key": "host",
        "name": "主持人",
        "persona": "",
        "voice_id": "voice-001",
        "speed": 1.0,
        "pitch": 0.0,
        "volume": 1.0,
        "color": "#10b981"
      },
      {
        "id": "880e8400-e29b-41d4-a716-446655440004",
        "role_key": "guest",
        "name": "嘉宾",
        "persona": "",
        "voice_id": "voice-002",
        "speed": 1.0,
        "pitch": 0.0,
        "volume": 1.0,
        "color": "#3b82f6"
      }
    ],
    "final_audio_asset": null
  },
  "message": "ok"
}
```

---

### 4.4 更新播客项目

**Endpoint**: `PUT /api/v1/podcasts/{project_id}`  
**Auth Required**: ✅ Yes  
**Description**: 更新播客项目信息。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_id` | String (UUID) | ✅ | 播客项目 ID |

#### Request Body

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | String | ❌ | 项目标题 |
| `mode` | String | ❌ | 模式（`solo` / `duo`） |
| `style` | String | ❌ | 风格（`professional` / `casual` / `humorous`） |
| `target_duration` | Integer | ❌ | 目标时长（秒） |
| `status` | String | ❌ | 状态（`draft` / `ready_to_synthesize` / `synthesis_done` / `published`） |

#### Example Request

```bash
curl -X PUT <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题",
    "status": "ready_to_synthesize"
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "title": "更新后的标题",
    ...
    "status": "ready_to_synthesize"
  },
  "message": "ok"
}
```

---

### 4.5 删除播客项目

**Endpoint**: `DELETE /api/v1/podcasts/{project_id}`  
**Auth Required**: ✅ Yes  
**Description**: 删除指定的播客项目（级联删除脚本、角色、分段）。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_id` | String (UUID) | ✅ | 播客项目 ID |

#### Example Request

```bash
curl -X DELETE <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": null,
  "message": "deleted"
}
```

---

### 4.6 更新脚本

**Endpoint**: `PUT /api/v1/podcasts/{project_id}/script`  
**Auth Required**: ✅ Yes  
**Description**: 更新播客项目的脚本（大纲或完整内容）。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_id` | String (UUID) | ✅ | 播客项目 ID |

#### Request Body

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `outline` | String | ❌ | 脚本大纲（支持 Markdown） |
| `script_content` | String | ❌ | 完整脚本内容（如果提供，状态自动变为 `edited`） |

#### Example Request

```bash
curl -X PUT <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "outline": "第一章：引言\n- 欢迎语\n- 主题介绍\n\n第二章：主体\n- 核心内容\n\n第三章：总结\n- 回顾要点\n- 结束语",
    "script_content": "【主持人】大家好，欢迎收听本期播客...\n\n【嘉宾】谢谢邀请，很高兴来到这里..."
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "project_id": "660e8400-e29b-41d4-a716-446655440001",
    "outline": "第一章：引言\n...",
    "script_content": "【主持人】大家好...\n\n【嘉宾】谢谢邀请...",
    "status": "edited"
  },
  "message": "ok"
}
```

---

### 4.7 重建完整音频

**Endpoint**: `POST /api/v1/podcasts/{project_id}/rebuild-audio`  
**Auth Required**: ✅ Yes  
**Description**: 将所有已合成的分段音频拼接为完整播客音频。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_id` | String (UUID) | ✅ | 播客项目 ID |

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440005",
    "url": "/static/audio/full_660e8400-e29b-41d4-a716-446655440001.wav",
    "duration_ms": 582000,
    "file_size": 20350000
  },
  "message": "rebuilt"
}
```

#### Error Responses

| HTTP Status | Message |
|-------------|---------|
| 400 | "No completed segments with audio" |
| 400 | "No audio files found" |

---

### 4.8 更改角色语音

**Endpoint**: `POST /api/v1/podcasts/roles/{role_id}/change-voice`  
**Auth Required**: ✅ Yes  
**Description**: 更改角色的音色，并将该角色的所有分段标记为 `draft`（需要重新合成）。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `role_id` | String (UUID) | ✅ | 角色 ID |

#### Request Body

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `voice_id` | String | ✅ | - | 新的语音 ID |
| `speed` | Float | ❌ | `1.0` | 语速（0.5 ~ 2.0） |
| `pitch` | Float | ❌ | `0.0` | 音调（-10.0 ~ 10.0） |
| `volume` | Float | ❌ | `1.0` | 音量（0.0 ~ 2.0） |

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "voice_id": "voice-002",
    "speed": 1.2,
    "pitch": 2.0,
    "volume": 1.0
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "role_key": "host",
    "name": "主持人",
    "persona": "",
    "voice_id": "voice-002",
    "speed": 1.2,
    "pitch": 2.0,
    "volume": 1.0,
    "color": "#10b981"
  },
  "message": "voice changed, segments marked draft"
}
```

---

### 4.9 启动播客合成任务

**Endpoint**: `POST /api/v1/podcasts/{podcast_id}/synthesize`  
**Auth Required**: ✅ Yes  
**Description**: 启动 TTS 合成任务（Mock 模式或真实 TTS）。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `podcast_id` | String (UUID) | ✅ | 播客项目 ID |

#### Request Body

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `task_type` | String | ❌ | `"full"` | 任务类型（`full` = 全量合成，`role` = 按角色合成，`segment` = 按分段合成） |
| `voice_id` | String | ❌ | `null` | 指定语音 ID（仅 `role` 或 `segment` 模式） |
| `speed` | Float | ❌ | `1.0` | 语速（0.5 ~ 2.0） |
| `pitch` | Integer | ❌ | `0` | 音调（-10 ~ 10） |
| `volume` | Float | ❌ | `1.0` | 音量（0.0 ~ 2.0） |

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "full"
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "task_id": "aa0e8400-e29b-41d4-a716-446655440006",
    "status": "pending",
    "total_segments": 10,
    "completed_segments": 0
  },
  "message": "synthesis task created"
}
```

#### Error Responses

| HTTP Status | Message |
|-------------|---------|
| 400 | "Project not ready for synthesis (status=...)" |

---

## 5. 脚本管理

**Base Path**: `/api/v1/podcasts`

（脚本管理接口已包含在 [4.6 更新脚本](#46-更新脚本) 中）

### 5.1 获取脚本详情

**Endpoint**: `GET /api/v1/podcasts/{podcast_id}/script`  
**Auth Required**: ✅ Yes  
**Description**: 获取指定播客项目的脚本详情。

#### Example Request

```bash
curl -X GET <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "project_id": "660e8400-e29b-41d4-a716-446655440001",
    "outline": "第一章：引言\n...",
    "script_content": "【主持人】大家好...\n\n【嘉宾】谢谢邀请...",
    "status": "edited",
    "segments": [...]
  },
  "message": "ok"
}
```

---

## 6. 分段管理

**Base Path**: `/api/v1/segments`

### 6.1 获取分段列表

**Endpoint**: `GET /api/v1/segments/podcasts/{project_id}/segments`  
**Auth Required**: ✅ Yes  
**Description**: 获取指定播客项目的所有分段。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_id` | String (UUID) | ✅ | 播客项目 ID |

#### Example Request

```bash
curl -X GET <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440007",
      "script_id": "770e8400-e29b-41d4-a716-446655440002",
      "role_id": "880e8400-e29b-41d4-a716-446655440003",
      "sort_order": 1,
      "text": "大家好，欢迎收听本期播客。",
      "emotion": "neutral",
      "pause_after_ms": 500,
      "status": "draft",
      "error_message": null,
      "role": {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "name": "主持人",
        "color": "#10b981"
      },
      "audio_asset": null
    }
  ],
  "message": "ok"
}
```

---

### 6.2 创建分段

**Endpoint**: `POST /api/v1/segments/podcasts/{project_id}/segments`  
**Auth Required**: ✅ Yes  
**Description**: 为播客项目创建新的分段。

#### Request Body

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `role_key` | String | ❌ | 角色 Key（`host` / `guest`，不提供则使用默认角色） |
| `text` | String | ✅ | 分段文本（将用于 TTS 合成） |
| `emotion` | String | ❌ | 情感（`neutral` / `happy` / `sad` / `angry` / `surprised` / `calm`） |
| `pause_after_ms` | Integer | ❌ | 分段后暂停时间（毫秒） |

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role_key": "host",
    "text": "大家好，欢迎收听本期播客。",
    "emotion": "happy",
    "pause_after_ms": 500
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440007",
    "script_id": "770e8400-e29b-41d4-a716-446655440002",
    "role_id": "880e8400-e29b-41d4-a716-446655440003",
    "sort_order": 1,
    "text": "大家好，欢迎收听本期播客。",
    "emotion": "happy",
    "pause_after_ms": 500,
    "status": "draft",
    "error_message": null
  },
  "message": "ok"
}
```

---

### 6.3 更新分段

**Endpoint**: `PUT /api/v1/segments/segments/{segment_id}`  
**Auth Required**: ✅ Yes  
**Description**: 更新指定分段的信息。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `segment_id` | String (UUID) | ✅ | 分段 ID |

#### Request Body

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | String | ❌ | 分段文本 |
| `emotion` | String | ❌ | 情感 |
| `pause_after_ms` | Integer | ❌ | 分段后暂停时间（毫秒） |
| `sort_order` | Integer | ❌ | 排序顺序 |

#### Example Request

```bash
curl -X PUT <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "大家好，我是主持人，欢迎收听本期播客。",
    "emotion": "neutral",
    "pause_after_ms": 1000
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440007",
    "text": "大家好，我是主持人，欢迎收听本期播客。",
    "emotion": "neutral",
    "pause_after_ms": 1000,
    "status": "draft"
  },
  "message": "ok"
}
```

---

### 6.4 删除分段

**Endpoint**: `DELETE /api/v1/segments/segments/{segment_id}`  
**Auth Required**: ✅ Yes  
**Description**: 删除指定的分段。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `segment_id` | String (UUID) | ✅ | 分段 ID |

#### Example Request

```bash
curl -X DELETE <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": null,
  "message": "deleted"
}
```

---

### 6.5 重排序分段

**Endpoint**: `POST /api/v1/segments/podcasts/{project_id}/segments/reorder`  
**Auth Required**: ✅ Yes  
**Description**: 重新排列分段的顺序。

#### Request Body

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `segment_ids` | Array[String] | ✅ | 分段 ID 列表（按期望顺序排列） |

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "segment_ids": [
      "bb0e8400-e29b-41d4-a716-446655440007",
      "bb0e8400-e29b-41d4-a716-446655440008",
      "bb0e8400-e29b-41d4-a716-446655440009"
    ]
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": [
    {"id": "bb0e8400-...", "sort_order": 1, ...},
    {"id": "bb0e8400-...", "sort_order": 2, ...},
    {"id": "bb0e8400-...", "sort_order": 3, ...}
  ],
  "message": "ok"
}
```

---

### 6.6 合成单个分段（预览）

**Endpoint**: `POST /api/v1/segments/segments/{segment_id}/synthesize`  
**Auth Required**: ✅ Yes  
**Description**: 合成单个分段（用于预览或单独合成）。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `segment_id` | String (UUID) | ✅ | 分段 ID |

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "status": "synthesizing"
  },
  "message": "ok"
}
```

---

## 7. 积分系统

**Base Path**: `/api/v1/credits`

### 7.1 获取积分余额

**Endpoint**: `GET /api/v1/credits/balance`  
**Auth Required**: ✅ Yes  
**Description**: 获取当前用户的积分余额。

#### Example Request

```bash
curl -X GET <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "balance": 500,
    "frozen": 0,
    "available": 500,
    "total_recharged": 0,
    "total_consumed": 0
  },
  "message": "ok"
}
```

---

### 7.2 获取积分交易记录

**Endpoint**: `GET /api/v1/credits/ledger`  
**Auth Required**: ✅ Yes  
**Description**: 获取当前用户的积分交易记录（分页）。

#### Query Parameters

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `type` | String | ❌ | `null` | 交易类型（`grant` = 赠送，`charge` = 充值，`freeze` = 冻结，`deduct` = 消费，`refund` = 退款，`adjust` = 管理员调整） |
| `page` | Integer | ❌ | `1` | 页码 |
| `page_size` | Integer | ❌ | `20` | 每页记录数 |

#### Example Request

```bash
curl -X GET "<SIGNED_URL_REMOVED>" \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "cc0e8400-e29b-41d4-a716-446655440010",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "type": "grant",
        "amount": 500,
        "balance_after": 500,
        "reference_type": "register",
        "reference_id": null,
        "description": "注册赠送",
        "created_at": "2026-05-25T12:00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20
  },
  "message": "ok"
}
```

---

### 7.3 检查每日登录奖励状态

**Endpoint**: `GET /api/v1/credits/daily-grant-status`  
**Auth Required**: ✅ Yes  
**Description**: 检查当前用户今日是否已领取登录奖励（50 积分）。

#### Example Request

```bash
curl -X GET <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "daily_login_granted": false
  },
  "message": "ok"
}
```

---

### 7.4 领取每日登录奖励

**Endpoint**: `POST /api/v1/credits/daily-grant`  
**Auth Required**: ✅ Yes  
**Description**: 领取每日登录奖励（50 积分，每天限领一次）。

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "granted": 50,
    "balance": 550,
    "message": "Daily login grant claimed"
  },
  "message": "ok"
}
```

#### Error Responses

| HTTP Status | Message |
|-------------|---------|
| 400 | "Daily grant already claimed today" |

---

## 8. 订单/充值

**Base Path**: `/api/v1/orders`

### 8.1 获取积分套餐列表

**Endpoint**: `GET /api/v1/orders/plans`  
**Auth Required**: ❌ No  
**Description**: 获取可用的积分充值套餐列表。

#### Example Request

```bash
curl -X GET <SIGNED_URL_REMOVED>
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "trial",
        "name": "试用套餐",
        "price": 0,
        "credits": 100
      },
      {
        "id": "starter",
        "name": "入门套餐",
        "price": 9900,
        "credits": 1000
      },
      {
        "id": "pro",
        "name": "专业套餐",
        "price": 39900,
        "credits": 5000
      }
    ]
  },
  "message": "ok"
}
```

---

### 8.2 创建订单

**Endpoint**: `POST /api/v1/orders/create`  
**Auth Required**: ✅ Yes  
**Description**: 创建积分充值订单（MVP 阶段仅支持充值卡）。

#### Request Body

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `plan_id` | String | ✅ | - | 套餐 ID（`trial` / `starter` / `pro` / `premium` / `enterprise`） |
| `payment_method` | String | ❌ | `"card_key"` | 支付方式（`card_key` = 充值卡，预留 `alipay` / `wechat`） |

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "starter",
    "payment_method": "card_key"
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "id": "dd0e8400-e29b-41d4-a716-446655440011",
    "plan_id": "starter",
    "amount": 9900,
    "credits_granted": 1000,
    "payment_method": "card_key",
    "payment_status": "pending",
    "created_at": "2026-05-25T12:00:00"
  },
  "message": "ok"
}
```

---

### 8.3 使用充值卡充值

**Endpoint**: `POST /api/v1/orders/verify-card`  
**Auth Required**: ✅ Yes  
**Description**: 使用充值卡密钥充值积分（MVP 阶段使用硬编码密钥）。

#### Request Body

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `card_key` | String | ✅ | 充值卡密钥（8 ~ 64 字符） |

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "card_key": "PODCRAFT-DEMO-0001"
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "credits_granted": 500,
    "balance": 1000,
    "message": "Card recharged successfully"
  },
  "message": "ok"
}
```

#### Valid Card Keys (MVP)

| 充值卡密钥 | 积分 |
|-----------|------|
| `PODCRAFT-DEMO-0001` | 500 |
| `PODCRAFT-DEMO-0002` | 1000 |
| `PODCRAFT-DEMO-0003` | 5000 |

#### Error Responses

| HTTP Status | Message |
|-------------|---------|
| 400 | "Invalid card key" |

---

### 8.4 获取订单列表

**Endpoint**: `GET /api/v1/orders/list`  
**Auth Required**: ✅ Yes  
**Description**: 获取当前用户的订单列表（分页）。

#### Query Parameters

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `status` | String | ❌ | `null` | 订单状态（`pending` / `paid` / `failed`） |
| `skip` | Integer | ❌ | `0` | 跳过记录数 |
| `limit` | Integer | ❌ | `20` | 返回记录数 |

#### Example Request

```bash
curl -X GET <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "items": [...],
    "total": 1,
    "skip": 0,
    "limit": 20
  },
  "message": "ok"
}
```

---

### 8.5 获取订单详情

**Endpoint**: `GET /api/v1/orders/{order_id}`  
**Auth Required**: ✅ Yes  
**Description**: 获取指定订单的详细信息。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `order_id` | String (UUID) | ✅ | 订单 ID |

---

## 9. 语音/角色

**Base Path**: `/api/v1/voices`

### 9.1 获取语音列表

**Endpoint**: `GET /api/v1/voices`  
**Auth Required**: ❌ No  
**Description**: 获取可用的 TTS 语音列表（支持筛选）。

#### Query Parameters

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `language` | String | ❌ | `null` | 语言筛选（如 `zh-CN` / `en-US`） |
| `gender` | String | ❌ | `null` | 性别筛选（`male` / `female`） |

#### Example Request

```bash
curl -X GET "<SIGNED_URL_REMOVED>"
```

#### Example Response

```json
{
  "code": 0,
  "data": [
    {
      "id": "voice-001",
      "name": "晓晓（女声）",
      "provider": "minimax",
      "gender": "female",
      "language": "zh-CN",
      "accent": "mandarin",
      "preview_text": "你好，我是晓晓。"
    },
    {
      "id": "voice-002",
      "name": "云云（男声）",
      "provider": "minimax",
      "gender": "male",
      "language": "zh-CN",
      "accent": "mandarin",
      "preview_text": "你好，我是云云。"
    }
  ],
  "message": "ok"
}
```

---

### 9.2 预览语音

**Endpoint**: `POST /api/v1/voices/preview`  
**Auth Required**: ❌ No（可选认证）  
**Description**: 生成指定语音的预览音频（不扣除积分）。

#### Request Body

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `voice_id` | String | ✅ | - | 语音 ID |
| `text` | String | ❌ | `"你好，这是一段测试语音。"` | 预览文本 |

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "Content-Type: application/json" \
  -d '{
    "voice_id": "voice-001",
    "text": "大家好，我是 AI 播客主持人。"
  }'
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "audio_url": "/static/audio/preview_voice-001_1716600000.wav",
    "voice_id": "voice-001",
    "text": "大家好，我是 AI 播客主持人。"
  },
  "message": "ok"
}
```

---

### 9.3 获取语音支持的情感列表

**Endpoint**: `GET /api/v1/voices/{voice_id}/emotions`  
**Auth Required**: ❌ No  
**Description**: 获取指定语音支持的情感风格列表。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `voice_id` | String | ✅ | 语音 ID |

#### Example Request

```bash
curl -X GET <SIGNED_URL_REMOVED>
```

#### Example Response

```json
{
  "code": 0,
  "data": [
    {"value": "neutral", "label": "自动（中性）"},
    {"value": "happy", "label": "开心"},
    {"value": "sad", "label": "悲伤"},
    {"value": "angry", "label": "愤怒"},
    {"value": "surprised", "label": "惊讶"},
    {"value": "calm", "label": "平静"}
  ],
  "message": "ok"
}
```

---

## 10. 上传/音频资源

**Base Path**: `/api/v1/upload`

### 10.1 上传音频文件

**Endpoint**: `POST /api/v1/upload/audio`  
**Auth Required**: ✅ Yes  
**Description**: 上传音频文件（参考音频、背景音乐等）。

#### Request Body

`multipart/form-data` 格式，包含 `file` 字段。

#### Example Request

```bash
curl -X POST <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>" \
  -F "file=@/path/to/audio.wav"
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "id": "ee0e8400-e29b-41d4-a716-446655440012",
    "filename": "audio.wav",
    "file_path": "/static/audio/ee0e8400-e29b-41d4-a716-446655440012.wav"
  },
  "message": "ok"
}
```

---

### 10.2 获取音频资源

**Endpoint**: `GET /api/v1/upload/audio/{asset_id}`  
**Auth Required**: ✅ Yes  
**Description**: 获取指定音频资源的详细信息。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `asset_id` | String (UUID) | ✅ | 音频资源 ID |

---

### 10.3 删除音频资源

**Endpoint**: `DELETE /api/v1/upload/audio/{asset_id}`  
**Auth Required**: ✅ Yes  
**Description**: 删除指定的音频资源。

---

## 11. 合成任务

**Base Path**: `/api/v1/synthesis`

### 11.1 获取合成任务状态

**Endpoint**: `GET /api/v1/synthesis/synthesis-tasks/{task_id}`  
**Auth Required**: ✅ Yes  
**Description**: 获取指定合成任务的状态和进度。

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | String (UUID) | ✅ | 合成任务 ID |

#### Example Request

```bash
curl -X GET <SIGNED_URL_REMOVED> \
  -H "<SECRET_REMOVED> <access_token>"
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440006",
    "project_id": "660e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "full",
    "status": "processing",
    "total_segments": 10,
    "completed_segments": 5,
    "error_message": null,
    "created_at": "2026-05-25T12:00:00",
    "updated_at": "2026-05-25T12:05:00"
  },
  "message": "ok"
}
```

---

### 11.2 获取合成任务列表

**Endpoint**: `GET /api/v1/synthesis/synthesis-tasks`  
**Auth Required**: ✅ Yes  
**Description**: 获取当前用户的合成任务列表（分页）。

#### Query Parameters

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `status` | String | ❌ | `null` | 任务状态（`pending` / `processing` / `completed` / `failed`） |
| `skip` | Integer | ❌ | `0` | 跳过记录数 |
| `limit` | Integer | ❌ | `20` | 返回记录数 |

---

## 12. 管理员功能

**Base Path**: `/api/v1/admin`

> ⚠️ **注意**：所有管理员接口要求用户角色为 `admin`，否则返回 `403 Forbidden`。

### 12.1 用户管理

#### 12.1.1 获取用户列表

**Endpoint**: `GET /api/v1/admin/users`  
**Auth Required**: ✅ Yes（Admin）  

#### Query Parameters

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `q` | String | ❌ | `""` | 搜索关键词（邮箱/昵称） |
| `status` | String | ❌ | `""` | 用户状态（`active` / `disabled`） |
| `skip` | Integer | ❌ | `0` | 跳过记录数 |
| `limit` | Integer | ❌ | `20` | 返回记录数 |

#### 12.1.2 调整用户积分

**Endpoint**: `POST /api/v1/admin/credits/adjust`  
**Auth Required**: ✅ Yes（Admin）  

#### Request Body

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | String (UUID) | ✅ | 用户 ID |
| `amount` | Integer | ✅ | 调整数量（正数为增加，负数为减少） |
| `reason` | String | ❌ | `"admin_adjust"` | 调整原因 |

#### 12.1.3 禁用用户

**Endpoint**: `PATCH /api/v1/admin/users/{user_id}/disable`  
**Auth Required**: ✅ Yes（Admin）  

#### 12.1.4 启用用户

**Endpoint**: `PATCH /api/v1/admin/users/{user_id}/enable`  
**Auth Required**: ✅ Yes（Admin）  

---

### 12.2 播客项目管理

#### 12.2.1 获取所有播客项目

**Endpoint**: `GET /api/v1/admin/podcasts`  
**Auth Required**: ✅ Yes（Admin）  

#### 12.2.2 删除播客项目

**Endpoint**: `DELETE /api/v1/admin/podcasts/{project_id}`  
**Auth Required**: ✅ Yes（Admin）  

---

### 12.3 合成任务管理

#### 12.3.1 获取所有合成任务

**Endpoint**: `GET /api/v1/admin/synthesis-tasks`  
**Auth Required**: ✅ Yes（Admin）  

---

### 12.4 语音预设管理

#### 12.4.1 获取所有语音预设

**Endpoint**: `GET /api/v1/admin/voices`  
**Auth Required**: ✅ Yes（Admin）  

#### 12.4.2 创建语音预设

**Endpoint**: `POST /api/v1/admin/voices`  
**Auth Required**: ✅ Yes（Admin）  

#### 12.4.3 更新语音预设

**Endpoint**: `PATCH /api/v1/admin/voices/{voice_id}`  
**Auth Required**: ✅ Yes（Admin）  

#### 12.4.4 删除语音预设

**Endpoint**: `DELETE /api/v1/admin/voices/{voice_id}`  
**Auth Required**: ✅ Yes（Admin）  

---

### 12.5 提供商配置管理

#### 12.5.1 获取提供商配置

**Endpoint**: `GET /api/v1/admin/providers`  
**Auth Required**: ✅ Yes（Admin）  

#### 12.5.2 更新提供商配置

**Endpoint**: `PATCH /api/v1/admin/providers`  
**Auth Required**: ✅ Yes（Admin）  

---

### 12.6 积分套餐管理

#### 12.6.1 获取所有积分套餐

**Endpoint**: `GET /api/v1/admin/plans`  
**Auth Required**: ✅ Yes（Admin）  

#### 12.6.2 创建积分套餐

**Endpoint**: `POST /api/v1/admin/plans`  
**Auth Required**: ✅ Yes（Admin）  

#### 12.6.3 更新积分套餐

**Endpoint**: `PATCH /api/v1/admin/plans/{plan_id}`  
**Auth Required**: ✅ Yes（Admin）  

#### 12.6.4 删除积分套餐

**Endpoint**: `DELETE /api/v1/admin/plans/{plan_id}`  
**Auth Required**: ✅ Yes（Admin）  

---

## 13. 分析统计

**Base Path**: `/api/v1/analytics`

### 13.1 记录用户行为

**Endpoint**: `POST /api/v1/analytics/track`  
**Auth Required**: ❌ No（可选认证）  
**Description**: 记录用户行为事件（用于分析）。

#### Request Body

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `event_type` | String | ✅ | 事件类型（如 `page_view` / `button_click` / `synthesis_start`） |
| `event_data` | Object | ❌ | 事件附加数据 |

---

### 13.2 获取我的事件记录

**Endpoint**: `GET /api/v1/analytics/my-events`  
**Auth Required**: ✅ Yes  
**Description**: 获取当前用户的事件记录（分页）。

---

### 13.3 获取我的活动记录

**Endpoint**: `GET /api/v1/analytics/my-activity`  
**Auth Required**: ✅ Yes  
**Description**: 获取当前用户的活动记录（分页）。

---

### 13.4 管理员统计接口

> ⚠️ **注意**：以下接口要求管理员权限。

#### 13.4.1 获取所有事件记录

**Endpoint**: `GET /api/v1/analytics/admin/events`  
**Auth Required**: ✅ Yes（Admin）  

#### 13.4.2 获取统计摘要

**Endpoint**: `GET /api/v1/analytics/admin/stats`  
**Auth Required**: ✅ Yes（Admin）  

#### 13.4.3 获取管理员仪表盘数据

**Endpoint**: `GET /api/v1/analytics/admin/dashboard`  
**Auth Required**: ✅ Yes（Admin）  

---

## 14. 健康检查

### 14.1 健康检查

**Endpoint**: `GET /api/health`  
**Auth Required**: ❌ No  
**Description**: 检查后端 API 是否正常运行。

#### Example Request

```bash
curl <SIGNED_URL_REMOVED>
```

#### Example Response

```json
{
  "code": 0,
  "data": {
    "status": "ok"
  },
  "message": "ok"
}
```

---

## 15. 错误码

### 15.1 HTTP Status Codes

| HTTP Status | 说明 |
|-------------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未认证（Token 缺失或无效） |
| 403 | 无权限（账号被禁用或角色不足） |
| 404 | 资源不存在 |
| 409 | 冲突（如邮箱已被注册） |
| 422 | 请求体验证失败（Pydantic） |
| 500 | 服务器内部错误 |

---

### 15.2 业务错误码

> **注意**：PodCraft API 使用 HTTP Status Code 表示错误类型，并在响应体中提供详细错误信息。统一响应格式中的 `code` 字段通常为 `0`（成功）或非 `0`（业务错误，具体值由业务逻辑定义）。

#### 常见错误消息

| 错误消息 | 说明 |
|---------|------|
| `"Not authenticated"` | 请求未携带 Token |
| `"Invalid or expired token"` | Token 无效或已过期 |
| `"Invalid credentials"` | 邮箱/密码错误 |
| `"Email already registered"` | 邮箱已被注册 |
| `"Phone already registered"` | 手机号已被注册 |
| `"Account is disabled"` | 账号被禁用 |
| `"No completed segments with audio"` | 没有已合成的分段 |
| `"Invalid card key"` | 充值卡密钥无效 |
| `"Daily grant already claimed today"` | 今日已领取登录奖励 |

---

## 16. 附录

### 16.1 项目状态枚举

#### 播客项目状态

| 状态 | 说明 |
|------|------|
| `draft` | 草稿（编辑中） |
| `ready_to_synthesize` | 准备合成（脚本已编辑完成） |
| `synthesis_done` | 合成完成 |
| `published` | 已发布 |

#### 分段状态

| 状态 | 说明 |
|------|------|
| `draft` | 草稿（需要重新合成） |
| `synthesizing` | 合成中 |
| `completed` | 合成完成 |
| `failed` | 合成失败 |

#### 合成任务状态

| 状态 | 说明 |
|------|------|
| `pending` | 等待中 |
| `processing` | 处理中 |
| `completed` | 已完成 |
| `failed` | 失败 |

---

### 16.2 积分交易类型枚举

| 类型 | 说明 |
|------|------|
| `grant` | 系统赠送（如注册赠送、每日登录奖励） |
| `charge` | 充值（通过订单） |
| `freeze` | 冻结（待消费） |
| `deduct` | 消费（如 TTS 合成扣除） |
| `refund` | 退款 |
| `adjust` | 管理员调整 |

---

### 16.3 角色模式枚举

| 模式 | 说明 | 默认角色 |
|------|------|---------|
| `solo` | 独播（单个主持人） | 1 个角色（`host`） |
| `duo` | 对话（主持人与嘉宾） | 2 个角色（`host` + `guest`） |

---

### 16.4 联系方式

- **GitHub Issues**: [报告 Bug / 提出功能请求](https://github.com/cugfei/podcraft-mvp/issues)
- **维护者**: cugfei

---

**最后更新**: 2026-05-27
