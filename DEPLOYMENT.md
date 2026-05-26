# PodCraft 部署文档

本文档描述如何使用 Docker 部署 PodCraft 到生产环境。

## 1. 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- （可选）PostgreSQL 14+（如果使用 PostgreSQL 替代 SQLite）
- （可选）域名 + SSL 证书

## 2. 快速开始

### 2.1 克隆代码

```bash
git clone https://github.com/your-org/podcraft.git
cd podcraft
```

### 2.2 配置环境变量

```bash
# 后端
cp backend/.env.example backend/.env
# 编辑 backend/.env，修改 SECRET_KEY、数据库密码等

# 前端
cp frontend/.env.example frontend/.env.local
# 编辑 frontend/.env.local，配置 API URL
```

**重要**：生产环境必须修改 `SECRET_KEY`！

生成强密钥：
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2.3 使用 Docker Compose 部署

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 2.4 访问应用

- 前端：http://localhost（或配置的域名）
- 后端 API 文档：http://localhost/api/v1/docs

## 3. 服务说明

Docker Compose 编排以下服务：

| 服务 | 描述 | 端口 |
|------|------|------|
| `redis` | Celery 任务队列 | 6379 |
| `backend` | FastAPI 后端 API | 8000 |
| `frontend` | Next.js 前端 | 3000 |
| `celery_worker` | Celery Worker 进程 | - |
| `celery_beat` | Celery Beat 定时任务 | - |
| `nginx` | Nginx 反向代理 | 80/443 |

## 4. 环境变量详解

### 4.1 后端（`backend/.env`）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | 数据库连接 URL | `sqlite:///./dev.db` |
| `SECRET_KEY` | JWT 密钥（**必须修改**） | `change-me-in-production` |
| `CORS_ORIGINS` | 允许的 CORS 来源（逗号分隔，无空格） | `http://localhost:3000` |
| `REDIS_URL` | Redis 连接 URL | `redis://localhost:6379/0` |
| `DEBUG` | 调试模式 | `true` |
| `TTS_PROVIDER_PRIMARY` | TTS 主提供商 | `minimax` |

### 4.2 前端（`frontend/.env.local`）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NEXT_PUBLIC_API_URL` | 后端 API URL（无尾部斜杠） | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_BASE_URL` | WebSocket URL | `ws://localhost:8000` |

## 5. 生产环境检查清单

部署前检查：

- [ ] `SECRET_KEY` 已修改为强密钥
- [ ] `DEBUG=false`
- [ ] 数据库使用 PostgreSQL（生产推荐）
- [ ] Redis 已配置密码
- [ ] CORS_ORIGINS 已设置为正确的域名
- [ ] SSL 证书已配置（Nginx）
- [ ] 环境变量文件已添加到 `.gitignore`
- [ ] 日志文件路径已配置且磁盘空间充足
- [ ] Celery Worker 和 Beat 正常运行
- [ ] 定时任务（音频清理）已启用

## 6. 使用 PostgreSQL（推荐生产环境）

取消 `docker-compose.yml` 中 PostgreSQL 服务的注释，并修改：

```yaml
# 后端环境变量
DATABASE_URL=postgresql://${DB_USER:-podcraft}:${DB_PASSWORD:-podcraft123}@postgres:5432/${DB_NAME:-podcraft}
```

创建 `.env` 文件配置数据库密码：

```bash
# .env
DB_USER=podcraft
DB_PASSWORD=your-strong-password-here
DB_NAME=podcraft
```

## 7. 故障排查

### 7.1 后端无法启动

```bash
# 查看后端日志
docker-compose logs backend

# 常见原因：
# - SECRET_KEY 未设置或太短
# - 数据库连接有问题
# - Redis 未启动
```

### 7.2 前端无法连接后端

```bash
# 检查前端环境变量
docker-compose exec frontend printenv | grep NEXT_PUBLIC

# 检查后端 CORS 配置
docker-compose exec backend printenv | grep CORS
```

### 7.3 Celery 任务不执行

```bash
# 查看 Celery Worker 日志
docker-compose logs celery_worker

# 检查 Redis 连接
docker-compose exec redis redis-cli ping
```

### 7.4 音频文件无法访问

```bash
# 检查静态文件卷
docker-compose exec backend ls -la /app/static/audio/

# 检查 Nginx 静态文件配置
docker-compose exec nginx cat /etc/nginx/nginx.conf
```

## 8. 升级流程

### 8.1 升级到新版本

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建镜像
docker-compose up -d --build

# 3. 运行数据库迁移（如果有）
docker-compose exec backend alembic upgrade head

# 4. 重启服务
docker-compose restart
```

### 8.2 回滚到旧版本

```bash
# 1. 切换到旧版本
git checkout <old-commit>

# 2. 重新构建并启动
docker-compose up -d --build
```

## 9. 性能优化

### 9.1 后端

- 增加 uvicorn worker 数量：`--workers 4`（根据 CPU 核心数调整）
- 启用数据库连接池
- 使用 Redis 缓存热点数据

### 9.2 前端

- 启用 Next.js 静态生成（适合静态页面）
- 配置 CDN 加速静态资源
- 启用 Gzip 压缩（Nginx）

### 9.3 Celery

- 增加 Celery Worker 并发数：`-c 4`
- 根据任务类型拆分队列

## 10. 备份策略

### 10.1 数据库备份

```bash
# SQLite
cp backend/dev.db backend/dev.db.backup

# PostgreSQL
docker-compose exec postgres pg_dump -U podcraft podcraft > backup.sql
```

### 10.2 音频文件备份

```bash
# 备份静态文件
tar -czf audio_backup_$(date +%Y%m%d).tar.gz backend/static/audio/
```

## 11. 监控与告警

- 使用 `docker stats` 查看资源使用
- 配置日志聚合（ELK/Loki）
- 配置 APM（如 Sentry）
- 设置健康检查告警

---

**最后更新**: 2026-05-26
