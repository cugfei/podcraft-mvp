# PodCraft - AI播客创作平台

AI驱动的播客创作与管理平台，支持文本转播客、多角色配音、智能编辑等功能。

## 项目结构

```
tts/
├── frontend/           # Next.js 14 前端项目
├── backend/            # FastAPI 后端项目
└── README.md
```

## 技术栈

### 前端
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- MUI (Material UI)

### 后端
- FastAPI
- SQLAlchemy 2.0
- PostgreSQL (生产) / SQLite (开发)
- Alembic (数据库迁移)
- Pydantic v2

## 快速开始

### 前置条件

- Node.js >= 18
- pnpm (前端包管理器)
- Python 3.9.2

### 后端启动

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

# 6. 初始化数据库
alembic upgrade head

# 7. 启动开发服务器
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

后端启动后访问：
- API: http://localhost:8000
- 健康检查: http://localhost:8000/api/health
- API 文档: http://localhost:8000/docs

### 前端启动

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
pnpm install

# 3. 复制环境变量配置
cp .env.example .env

# 4. 启动开发服务器
pnpm dev
```

前端启动后访问: http://localhost:3000

## 环境变量

### 后端 (.env)

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| DATABASE_URL | 数据库连接字符串 | sqlite:///./dev.db |
| CORS_ORIGINS | CORS 允许的源 | http://localhost:3000 |
| APP_NAME | 应用名称 | PodCraft API |
| DEBUG | 调试模式 | true |
| SECRET_KEY | 密钥（生产环境务必修改） | change-me-in-production |

### 前端 (.env)

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NEXT_PUBLIC_API_URL | 后端 API 地址 | http://localhost:8000 |

## 开发说明

- 前端使用 App Router（不使用 Pages Router）
- 后端使用 SQLite 作为开发数据库（dev.db），生产环境切换为 PostgreSQL
- 数据库迁移使用 Alembic，生成迁移：`alembic revision --autogenerate -m "描述"`
