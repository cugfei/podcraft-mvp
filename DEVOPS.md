# PodCraft DevOps 自动化指南

本文档说明 PodCraft 的 Docker 配置与 CI/CD 自动化流程。

## 1. Docker 配置

### 1.1 后端 Dockerfile（多阶段构建）

```
backend/Dockerfile
├── Stage 1 (builder)  - 安装系统依赖 + Python 依赖
└── Stage 2 (runtime)  - 仅运行时常量，镜像更小
```

**优化点**:
- 多阶段构建：最终镜像不包含构建工具
- 非 root 用户运行（安全加固）
- Healthcheck 使用 Python（不依赖 curl）
- 支持 `WORKERS` 环境变量动态调整 worker 数

### 1.2 前端 Dockerfile（多阶段构建）

```
frontend/Dockerfile
├── Stage 1 (builder)  - pnpm install + pnpm run build
└── Stage 2 (runtime) - Next.js standalone 模式
```

**优化点**:
- 使用 `pnpm`（更快 + 更省空间）
- Next.js standalone 模式（无需安装依赖即可运行）
- 非 root 用户运行
- Healthcheck 使用 Node.js（不依赖 curl）

### 1.3 docker-compose.yml

**生产配置**:
- `redis` - 任务队列（健康检测 + 自动重启）
- `backend` - FastAPI 后端（等待 redis 健康）
- `frontend` - Next.js 前端（等待 backend 健康）
- `celery_worker` - Celery Worker（处理异步任务）
- `celery_beat` - Celery Beat（定时任务，如音频清理）
- `nginx` - 反向代理（SSL 终止 + 静态文件）

**开发覆盖** (`docker-compose.override.yml`):
- 代码挂载（热重载）
- `--reload` 模式（后端）/`pnpm run dev`（前端）
- `profiles: [production-only]` 禁用 nginx（开发时直连）

## 2. CI/CD 自动化流程

### 2.1 CI 工作流 (`.github/workflows/ci.yml`)

**触发条件**: Push 到 `main`/`develop`，或 PR 到这些分支

**流程**:
```
1. Backend Tests
   ├── 设置 Python 3.11
   ├── 缓存 pip 依赖
   ├── 运行 pytest + coverage
   └── 上传 coverage 到 Codecov

2. Frontend Tests & Lint
   ├── 设置 Node.js 20
   ├── 缓存 pnpm store
   ├── pnpm run lint
   ├── pnpm exec tsc --noEmit
   └── pnpm test

3. Backend Docker Build (needs: backend-test)
   └── docker buildx build --platform linux/amd64,linux/arm64

4. Frontend Docker Build (needs: frontend-test)
   └── docker buildx build --platform linux/amd64,linux/arm64

5. Security Scan (needs: backend-build, frontend-build)
   ├── Trivy 漏洞扫描（文件系统）
   └── 上传 SARIF 到 GitHub Security
```

### 2.2 CD 工作流 (`.github/workflows/cd.yml`)

**触发条件**: Push 到 `main`，或推送 `v*` tag，或手动触发

**流程**:
```
1. Build & Push Docker Images
   ├── 登录 GHCR (GitHub Container Registry)
   ├── Set up Docker Buildx (多架构构建)
   ├── Build & Push backend image
   │   └── ghcr.io/YOUR-ORG/podcraft/backend:main
   ├── Build & Push frontend image
   │   └── ghcr.io/YOUR-ORG/podcraft/frontend:main
   └── 缓存 layers 到 GitHub Actions Cache

2. Deploy to Staging (needs: build-and-push)
   ├── SSH 到 Staging 服务器
   ├── git pull 拉取最新代码
   ├── docker compose pull 拉取最新镜像
   ├── docker compose up -d 重启服务
   └── Health check (curl -f https://staging.podcraft.example.com/api/v1/health)

3. Deploy to Production (needs: build-and-push, deploy-staging)
   ├── SSH 到 Production 服务器
   ├── git pull 拉取最新代码
   ├── docker compose pull 拉取最新镜像
   ├── docker compose up -d 重启服务
   ├── Health check
   └── 如果是 tag 触发，创建 GitHub Release
```

## 3. 快速开始

### 3.1 本地开发

```bash
# 1. 启动所有服务（开发模式，热重载）
docker compose up -d

# 2. 查看日志
docker compose logs -f

# 3. 停止服务
docker compose down

# 4. 重新构建镜像
docker compose up -d --build
```

### 3.2 生产部署

```bash
# 1. 在生产服务器上克隆代码
git clone https://github.com/YOUR-ORG/podcraft.git
cd podcraft

# 2. 配置环境变量
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# 编辑 .env 文件，设置 SECRET_KEY 等

# 3. 启动服务
docker compose up -d

# 4. 查看运行状态
docker compose ps

# 5. 查看日志
docker compose logs -f
```

### 3.3 使用 GitHub Container Registry

```bash
# 1. 登录 GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 2. 拉取镜像
docker pull ghcr.io/YOUR-ORG/podcraft/backend:main
docker pull ghcr.io/YOUR-ORG/podcraft/frontend:main

# 3. 运行镜像
docker run -d -p 8000:8000 ghcr.io/YOUR-ORG/podcraft/backend:main
docker run -d -p 3000:3000 ghcr.io/YOUR-ORG/podcraft/frontend:main
```

## 4. 环境变量

### 4.1 后端 (`.env`)

| 变量 | 必填 | 说明 |
|------|------|------|
| `SECRET_KEY` | ✅ | JWT 密钥（**生产必须修改**） |
| `DATABASE_URL` | ✅ | 数据库连接 URL |
| `REDIS_URL` | ✅ | Redis 连接 URL |
| `CORS_ORIGINS` | ✅ | 允许的 CORS 来源（逗号分隔） |
| `DEBUG` | ❌ | 调试模式（生产设为 `false`） |

### 4.2 前端 (`.env.local`)

| 变量 | 必填 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_API_URL` | ✅ | 后端 API URL |
| `NEXT_PUBLIC_WS_BASE_URL` | ❌ | WebSocket URL |

## 5. GitHub Secrets 配置

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：

### 5.1 CI Secrets

| Secret 名称 | 说明 |
|-------------|------|
| `GITHUB_TOKEN` | 自动生成（无需手动添加） |

### 5.2 CD Secrets

| Secret 名称 | 说明 |
|-------------|------|
| `STAGING_HOST` | Staging 服务器 IP/域名 |
| `STAGING_USER` | Staging 服务器用户名 |
| `STAGING_SSH_KEY` | Staging 服务器 SSH 私钥 |
| `PRODUCTION_HOST` | Production 服务器 IP/域名 |
| `PRODUCTION_USER` | Production 服务器用户名 |
| `PRODUCTION_SSH_KEY` | Production 服务器 SSH 私钥 |

## 6. 生产环境检查清单

部署前检查：

- [ ] `SECRET_KEY` 已修改为强密钥（≥32 字符）
- [ ] `DEBUG=false`
- [ ] 数据库使用 PostgreSQL（生产推荐）
- [ ] Redis 已配置密码
- [ ] CORS_ORIGINS 已设置为正确的域名
- [ ] SSL 证书已配置（Nginx）
- [ ] 环境变量文件已添加到 `.gitignore`
- [ ] 日志文件路径已配置且磁盘空间充足
- [ ] Celery Worker 和 Beat 正常运行
- [ ] 定时任务（音频清理）已启用
- [ ] GitHub Secrets 已配置（CD 工作流）

## 7. 故障排查

### 7.1 CI 失败

```bash
# 查看 GitHub Actions 日志
# https://github.com/YOUR-ORG/podcraft/actions

# 常见原因：
# - 依赖版本冲突
# - 测试失败
# - Lint 错误
# - 类型检查错误
```

### 7.2 CD 失败

```bash
# 查看 GitHub Actions 日志
# https://github.com/YOUR-ORG/podcraft/actions

# 常见原因：
# - SSH 连接失败（检查 Secrets）
# - 服务器磁盘空间不足
# - 端口已被占用
# - 环境变量未配置
```

### 7.3 Docker 容器无法启动

```bash
# 查看容器日志
docker compose logs backend
docker compose logs frontend

# 进入容器调试
docker compose exec backend sh
docker compose exec frontend sh

# 检查健康状态
docker inspect --format='{{json .State.Health}}' podcraft_backend
```

## 8. 性能优化

### 8.1 后端

- 增加 uvicorn worker 数：`WORKERS=4`（根据 CPU 核心数调整）
- 启用数据库连接池
- 使用 Redis 缓存热点数据

### 8.2 前端

- 启用 Next.js 静态生成（适合静态页面）
- 配置 CDN 加速静态资源
- 启用 Gzip 压缩（Nginx）

### 8.3 Celery

- 增加 Celery Worker 并发数：`-c 4`
- 根据任务类型拆分队列

## 9. 监控与告警

- 使用 `docker stats` 查看资源使用
- 配置日志聚合（ELK/Loki）
- 配置 APM（如 Sentry）
- 设置健康检查告警

---

**最后更新**: 2026-05-27
