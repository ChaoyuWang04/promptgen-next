# PromptGen

这是我全栈开发练手项目之一：一个“提示词生成 + 图像生成 + 多语言拼接”的端到端系统。项目基于可复用数据库（Library）与模板引擎生成 Prompt，再通过多家 AI Provider 生成图片并拼接多语言成品。

## 核心功能

- 库管理：动态库（character/pose/scene/theme/style 等）配置、JSON 导入导出、模板化创建
- 模板系统：MAIN/DIFF 模板编辑、校验、预览渲染、变量提示
- Prompt 生成：主提示词与差分提示词自动生成
- 图像生成：三阶段流程（MAIN → DIFF → 7 语言拼接）
- 组合管理：组合策略生成、预览、批量删除、进度跟踪
- 批处理：批量生成与队列处理（BullMQ + Redis）
- 监控与修复：健康检查、同步校验、自动修复

## 技术栈

- Next.js 16 (App Router + Turbopack)
- TypeScript 5.6 (strict)
- Prisma 6 + PostgreSQL 16 (Docker)
- Redis + BullMQ
- TanStack Query 5
- Tailwind CSS 3.4 + shadcn/ui
- Zod 3.23+
- Vitest 2.1 + Playwright 1.48

## 快速开始

```bash
# 安装依赖
just install

# 启动数据库与 Redis
just docker-up

# 本地开发
just dev
```

打开页面：`http://localhost:3000`

## 环境变量

复制 `.env.example` 并填写：

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash-image
BYTEDANCE_API_KEY=...
BYTEDANCE_MODEL=doubao-seedream-4-0-250828
IMAGE_PROVIDERS=gemini,bytedance
```

## 常用命令

```bash
just dev          # 开发服务器
just build        # 生产构建
just test         # 全量测试
just lint         # ESLint
just type-check   # TS 类型检查
just format       # Prettier 格式化
```

数据库相关：

```bash
just docker-up
just db-status
just db-diff "desc"
just db-apply
just prisma-generate
```

## 主要模块概览

- `/libraries`：库与条目管理
- `/templates`：模板编辑与校验
- `/prompts`：MAIN/DIFF Prompt 生成
- `/combinations`：组合策略与批处理
- `/status`：健康与监控

## 项目结构

```
src/
  app/            # App Router + API 路由
  components/     # UI 组件与特性组件
  hooks/          # 自定义 Hooks
  lib/            # 业务逻辑与生成器
  schemas/        # Zod 校验
prisma/           # Prisma schema 与迁移
atlas/            # Atlas SQL 迁移
docs/             # 项目文档
```

## 参考文档

- 产品与功能：`docs/prd.md`
- 架构与实现：`docs/backend.md`、`docs/frontend.md`
- API 列表：`docs/api.md`
- 数据库：`docs/database.md`
- 技术选型：`docs/trd.md`
