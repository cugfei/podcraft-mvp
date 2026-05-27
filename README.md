# PodCraft - AI 播客创作平台

AI 驱动的播客创作与管理平台，支持文本转播客、多角色配音、智能编辑等功能。

## 📊 项目状态

- **当前版本**: v0.1.0
- **开发进度**: Phase 6 完成 (MVP 核心功能已完成)
- **最新修复**: 登录/注册按钮无反应问题 (CORS 配置 + 错误处理)
- **GitHub 仓库**: [cugfei/podcraft-mvp](https://github.com/cugfei/podcraft-mvp)

## 项目结构

```
tts/
├── frontend/                # Next.js 14 前端项目
│   ├── src/
│   │   ├── app/          # App Router 页面
│   │   ├── components/   # 可复用组件
│   │   ├── context/      # React Context (Auth)
│   │   ├── lib/          # API 工具函数
│   │   └── styles/      # 全局样式
│   ├── public/           # 静态资源
│   ├── .env.local        # 环境变量 (git ignored)
│   └── package.json
├── backend/                 # FastAPI 后端项目
│   ├── app/
│   │   ├── api/v1/      # API 路由 (v1)
│   │   ├── models/       # SQLAlchemy 模型
│   │   ├── schemas/      # Pydantic  schemas
│   │   ├── services/     # 业务逻辑层
│   │   └── main.py      # FastAPI 入口
│   ├── alembic/          # 数据库迁移
│   ├── storage/           # 文件存储
│   ├── .env              # 环境变量 (git ignored)
│   └── requirements.txt
├── nginx/                  # Nginx 配置 (生产部署)
├── .github/               # GitHub Actions CI/CD
├── docker-compose.yml     # Docker 服务编排
├── DEPLOYMENT.md         # 部署指南
├── DEVOPS.md             # DevOps 自动化指南
└── README.md
```

## 技术栈

### 前端
- **框架**: Next.js 14 (App Router)
- **UI 库**: Material UI (MUI) + Tailwind CSS
- **状态管理**: React Context (AuthContext)
- **HTTP 客户端**: Fetch API (自定义 api.ts 封装)
- **类型检查**: TypeScript 5

### 后端
- **框架**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy 2.0
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **数据库迁移**: Alembic
- **数据验证**: Pydantic v2
- **认证**: JWT (access token + refresh token)
- **任务队列**: Celery + Redis
- **TTS 引擎**: MiniMax API + Edge TTS

### DevOps
- **容器化**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **代码质量**: pytest + Jest + ESLint + TypeScript
- **安全扫描**: Trivy + GitHub Security

## 快速开始

### 前置条件

- **Node.js** >= 18 (推荐 20+)
- **pnpm** (前端包管理器)
- **Python** >= 3.9.2 (推荐 3.11+)
- **Redis** (Celery 任务队列)
- **Git**

### 1. 克隆项目

```bash
git clone https://github.com/cugfei/podcraft-mvp.git
cd podcraft-mvp
```

### 2. 后端启动

```bash
# 1. 进入后端目录
cd backend

# 2. 创建虚拟环境（如尚未创建）
python -m venv .venv

# 3. 激活虚拟环境
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

# 4. 安装依赖
pip install -r requirements.txt

# 5. 复制环境变量配置
cp .env.example .env
# 或手动创建 .env 文件，参考以下配置

# 6. 初始化数据库
alembic upgrade head

# 7. 启动开发服务器（热重载）
uvicorn app.main:app --reload --host 0.0.0.0 --port 8032
```

**后端启动成功标志**:
```
INFO:     Uvicorn running on http://0.0.0.0:8032 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

**后端访问地址**:
- API 基础地址: <ADDRESS_REMOVED>
- 健康检查: <ADDRESS_REMOVED>
- API 文档 (Swagger UI): <ADDRESS_REMOVED>

### 3. 前端启动

```bash
# 1. 打开新终端，进入前端目录
cd frontend

# 2. 安装依赖
pnpm install

# 3. 复制环境变量配置
cp .env.local.example .env.local
# 或手动创建 .env.local 文件，参考以下配置

# 4. 启动开发服务器
pnpm dev
```

**前端启动成功标志**:
```
 ✓ Ready in 13.4s
 - Local:        <ADDRESS_REMOVED>
```

**注意**: 如果端口 3000 被占用，Next.js 会自动尝试 3001、3002 等。请根据终端输出访问正确的地址。

**前端访问地址** (可能的端口):
- <ADDRESS_REMOVED>
- <ADDRESS_REMOVED>
- <ADDRESS_REMOVED>

### 4. 验证运行

1. **后端健康检查**:
   ```bash
   curl <SIGNED_URL_REMOVED>
   # 预期输出: {"code":0,"data":{"status":"ok"},"message":"ok"}
   ```

2. **前端访问**:
   打开浏览器，访问 `http://localhost:3000` (或终端显示的端口)

3. **注册/登录测试**:
   - 访问 `/register` 页面，注册新账号（注册即送 500 积分）
   - 访问 `/login` 页面，使用注册的账号登录

## 环境变量配置

### 后端 (`backend/.env`)

```bash
# 数据库 (SQLite 用于开发，PostgreSQL 用于生产)
DATABASE_URL=sqlite:///./dev.db

# Redis (Celery 任务队列)
REDIS_URL=redis://localhost:6379/0

# 存储路径
STORAGE_PATH=storage

# CORS (允许的前端源，逗号分隔)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3002,http://127.0.0.1:3002

# 应用配置
APP_NAME=PodCraft API
APP_VERSION=0.1.0
DEBUG=True

# 安全 (生产环境务必修改！)
SECRET_KEY=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# TTS 提供商配置 (MiniMax)
TTS_PROVIDER_PRIMARY=minimax
TTS_MINIMAX_API_KEY=your-minimax-api-key-here
TTS_MINIMAX_API_BASE=https://api.minimax.chat
TTS_MINIMAX_MAX_QPS=10
TTS_EDGETTS_ENABLED=True
```

### 前端 (`frontend/.env.local`)

```bash
# 后端 API 地址 (根据后端实际运行端口调整)
NEXT_PUBLIC_API_URL=http://localhost:8032
```

## 常见问题排查

### 1. 前端登录/注册按钮点击无反应

**原因**: 后端 CORS 配置不包含前端实际运行端口。

**解决**:
- 检查前端实际运行端口 (终端输出)
- 更新 `backend/.env` 中的 `CORS_ORIGINS`，添加前端的 URL
- 重启后端服务器

**示例**:
```bash
# 如果前端运行在 <ADDRESS_REMOVED>
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

### 2. 端口已被占用

**后端**: 修改 `--port` 参数
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8033
```

**前端**: Next.js 会自动尝试下一个可用端口 (3000 → 3001 → 3002 → ...)

### 3. 数据库连接失败

**SQLite (开发)**:
- 检查 `backend/dev.db` 文件是否存在
- 运行 `alembic upgrade head` 创建表

**PostgreSQL (生产)**:
- 检查 `DATABASE_URL` 环境变量
- 确保数据库已创建并且可连接

### 4. Redis 连接失败

- 确保 Redis 服务器正在运行:
  ```bash
  redis-cli ping
  # 预期输出: PONG
  ```
- 检查 `REDIS_URL` 环境变量

## Docker 部署

### 快速部署 (Docker Compose)

```bash
# 1. 构建并启动所有服务
docker-compose up -d --build

# 2. 查看服务状态
docker-compose ps

# 3. 查看日志
docker-compose logs -f [service_name]

# 4. 停止所有服务
docker-compose down
```

### 服务说明

| 服务名 | 说明 | 端口 |
|--------|------|------|
| **redis** | Redis 缓存/任务队列 | 6379 |
| **backend** | FastAPI 后端 | 8032 |
| **frontend** | Next.js 前端 (Nginx) | 3000 |
| **celery_worker** | Celery 任务执行器 | - |
| **celery_beat** | Celery 定时任务 | - |
| **nginx** | Nginx 反向代理 (生产) | 80/443 |

### 生产部署

详细部署步骤请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## CI/CD 自动化

### GitHub Actions 工作流

#### 1. CI 工作流 (`.github/workflows/ci.yml`)

**触发条件**: Push 或 Pull Request 到 `main` 或 `develop` 分支

**执行步骤**:
1. **后端测试**: pytest + coverage + Codecov
2. **前端测试**: lint + type check + test
3. **Docker 镜像构建**: 多架构 (amd64/arm64)
4. **安全扫描**: Trivy + GitHub Security

#### 2. CD 工作流 (`.github/workflows/cd.yml`)

**触发条件**:
- Push 到 `main` 分支
- 创建 Tag (如 `v0.1.0`)
- 手动触发 (workflow_dispatch)

**执行步骤**:
1. **构建并推送镜像**: 到 GitHub Container Registry (GHCR)
2. **自动部署**: 到 Staging 环境
3. **手动审批后部署**: 到 Production 环境

### 配置 GitHub Secrets

在 https://github.com/cugfei/podcraft-mvp/settings/secrets/actions 添加以下 Secrets:

| Secret 名 | 说明 | 示例 |
|-----------|------|------|
| `STAGING_HOST` | Staging 服务器地址 | `staging.example.com` |
| `STAGING_USER` | Staging 服务器用户名 | `deploy` |
| `STAGING_SSH_KEY` | Staging 服务器 SSH 私钥 | `-----BEGIN...` |
| `PRODUCTION_HOST` | Production 服务器地址 | `prod.example.com` |
| `PRODUCTION_USER` | Production 服务器用户名 | `deploy` |
| `PRODUCTION_SSH_KEY` | Production 服务器 SSH 私钥 | `-----BEGIN...` |

详细配置说明请参考 [DEVOPS.md](./DEVOPS.md)。

## 开发说明

### 代码规范

- **前端**: ESLint + Prettier + TypeScript 严格模式
- **后端**: flake8 + Black + isort + mypy (可选)

### 数据库迁移

```bash
# 1. 修改模型 (backend/app/models/xxx.py)
# 2. 生成迁移文件
alembic revision --autogenerate -m "描述本次迁移"

# 3. 检查生成的迁移文件 (backend/alembic/versions/xxx.py)
# 4. 执行迁移
alembic upgrade head

# 5. 回滚迁移 (如遇问题)
alembic downgrade -1
```

### API 规范

- **基础路径**: `/api/v1`
- **响应格式**:
  ```json
  {
    "code": 0,
    "data": {},
    "message": "success"
  }
  ```
- **认证**: Bearer Token (Authorization: Bearer <token>)
- **分页**: `skip` + `limit` 参数

### 前端目录规范

- **页面**: `frontend/src/app/[page]/page.tsx` (App Router)
- **组件**: `frontend/src/components/[ComponentName]/index.tsx`
- **API 调用**: `frontend/src/lib/api.ts`
- **类型定义**: 在 `api.ts` 或组件文件内

## 已完成功能 (Phase 1-6)

### Phase 1: 项目初始化 ✅
- [x] T-1.1 项目初始化与基础配置
- [x] T-1.2 数据库模型设计与 Alembic 配置

### Phase 2: 用户认证与积分系统 ✅
- [x] T-2.1 用户注册与登录 API
- [x] T-2.2 JWT 认证中间件
- [x] T-2.3 积分系统基础设计
- [x] T-2.4 积分充值与消费 API

### Phase 3: 播客项目管理 ✅
- [x] T-3.1 播客项目 CRUD API
- [x] T-3.2 项目列表与分页查询
- [x] T-3.3 角色与配音设计
- [x] T-3.4 脚本大纲生成与编辑
- [x] T-3.5 脚本内容生成与编辑
- [x] T-3.6 脚本分段与角色分配
- [x] T-3.7 文本转语音 (TTS) 合成
- [x] T-3.8 音频拼接与最终导出

### Phase 4: 前端基础页面 ✅
- [x] T-4.1 前端项目初始化
- [x] T-4.2 首页与导航栏
- [x] T-4.3 登录与注册页面
- [x] T-4.4 播客项目列表页
- [x] T-4.5 播客编辑器页面
- [x] T-4.6 积分充值与消费记录页面
- [x] T-4.7 个人中心页面
- [x] T-4.8 全局状态管理 (AuthContext)
- [x] T-4.9 管理员后台基础框架

### Phase 5: 高级功能 ✅
- [x] T-5.1 多角色配音支持
- [x] T-5.2 批量 TTS 合成
- [x] T-5.3 音频预览与下载
- [x] T-5.4 项目模板与克隆
- [x] T-5.5 积分套餐与支付集成

### Phase 6: 测试与优化 ✅
- [x] T-6.1 单元测试与集成测试
- [x] T-6.2 错误处理与边界场景覆盖
- [x] T-6.3 移动端适配与响应式优化
- [x] T-6.4 Docker 部署与生产环境配置

### DevOps 自动化 ✅
- [x] Docker 配置审查与修复
- [x] GitHub Actions CI/CD 工作流
- [x] 代码质量检查与自动化测试
- [x] 安全扫描与漏洞检测

## 待开发功能 (Phase 7+)

### Phase 7: 性能优化与安全加固
- [ ] 数据库查询优化 (N+1 问题)
- [ ] Redis 缓存策略
- [ ] API 速率限制
- [ ] HTTPS/SSL 配置
- [ ] SQL 注入/XSS 防护审计

### Phase 8: 高级功能
- [ ] 实时协作编辑
- [ ] AI 辅助脚本生成 (LLM 集成)
- [ ] 多语言支持
- [ ] 音频后期处理 (降噪、混音)
- [ ] 发布到播客平台 (RSS/Apple Podcasts/Spotify)

## API 文档

启动后端后访问: <SIGNED_URL_REMOVED>

### 主要 API 端点

#### 认证 (`/api/v1/auth`)
- `POST /login` - 登录
- `POST /register` - 注册
- `POST /refresh` - 刷新 Token
- `GET /me` - 获取当前用户信息

#### 播客项目 (`/api/v1/podcasts`)
- `GET /list` - 获取项目列表 (分页)
- `POST /` - 创建新项目
- `GET /{project_id}` - 获取项目详情
- `PUT /{project_id}` - 更新项目
- `DELETE /{project_id}` - 删除项目

#### 脚本 (`/api/v1/podcasts/{project_id}/script`)
- `PUT /` - 更新脚本 (大纲/内容)

#### 分段 (`/api/v1/podcasts/{project_id}/segments`)
- `GET /` - 获取分段列表
- `POST /` - 创建分段
- `PUT /{segment_id}` - 更新分段
- `DELETE /{segment_id}` - 删除分段
- `POST /reorder` - 重排序分段

#### 积分 (`/api/v1/credits`)
- `GET /balance` - 获取积分余额
- `GET /ledger` - 获取积分交易记录
- `GET /daily-grant-status` - 检查每日登录奖励状态
- `POST /daily-grant` - 领取每日登录奖励 (50 积分)

#### 订单 (`/api/v1/orders`)
- `GET /plans` - 获取积分套餐列表
- `POST /verify-card` - 使用充值卡充值

## 贡献指南

### 提交代码

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature-name

# 2. 提交代码
git add .
git commit -m "feat: 添加某某功能"

# 3. 推送分支
git push origin feature/your-feature-name

# 4. 创建 Pull Request
# 访问 https://github.com/cugfei/podcraft-mvp/pull/new
```

### Commit Message 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/):

- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式 (不影响功能)
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具/依赖更新

**示例**:
```bash
feat: 添加用户头像上传功能
fix: 修复登录页面按钮无反应问题
docs: 更新 README 中的环境变量说明
```

## 许可证

MIT License (待定)

## 联系方式

- **GitHub Issues**: [报告 Bug / 提出功能请求](https://github.com/cugfei/podcraft-mvp/issues)
- **维护者**: cugfei

---

**最后更新**: 2026-05-27

**最近修复**:
- ✅ 修复登录/注册按钮无反应问题 (CORS 配置 + 错误处理)
- ✅ 添加 `getCreditBalance` 导入到 AuthContext
- ✅ 完善前端错误提示显示
- ✅ 更新 CORS 配置，支持多个前端端口 (3000/3001/3002)
