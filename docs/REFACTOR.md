# PromptGen 全量重构设计文档
# Next.js + TypeScript + shadcn/ui + Zod + PostgreSQL

**文档版本**: 1.0.0
**创建日期**: 2025-11-15
**最后更新**: 2025-11-15
**作者**: Claude + Sam Wong
**状态**: 规划阶段

---

## 目录

1. [重构背景与目标](#1-重构背景与目标)
2. [技术栈选型](#2-技术栈选型)
3. [架构设计](#3-架构设计)
4. [数据库设计](#4-数据库设计)
5. [API设计](#5-api设计)
6. [核心业务逻辑迁移](#6-核心业务逻辑迁移)
7. [前端组件架构](#7-前端组件架构)
8. [异步任务处理](#8-异步任务处理)
9. [部署架构](#9-部署架构)
10. [迁移计划](#10-迁移计划)
11. [风险评估与缓解](#11-风险评估与缓解)
12. [附录](#12-附录)

---

## 1. 重构背景与目标

### 1.1 当前系统痛点

#### 技术债务
- **8,412行无类型JavaScript**: 维护成本高，重构风险大
- **11个分散的CSS文件**: 缺乏统一设计系统，样式重复
- **文件系统存储**: 105+ records, 210+ prompts，并发访问无事务保障
- **手动DOM操作**: 复杂交互逻辑难以维护
- **无自动化测试**: 前端零测试覆盖，后端仅64%通过率

#### 扩展性限制
- **硬编码配置**: 虽然Phase 2已动态化，但仍有改进空间
- **单体应用**: Flask无法水平扩展
- **本地存储**: 图片存储无CDN加速，跨区域访问慢

#### 开发效率
- **类型安全缺失**: 运行时错误频发
- **状态管理混乱**: 全局变量污染，状态难以追踪
- **调试困难**: 无Source Map，错误栈难以定位

### 1.2 重构目标

#### 核心目标
1. **100%类型安全**: TypeScript覆盖所有代码
2. **现代化UI**: shadcn/ui组件库，响应式设计
3. **性能优化**: 数据库索引 + CDN + 代码分割
4. **可测试性**: 单元测试 + 集成测试 + E2E测试覆盖率 > 80%
5. **可维护性**: 模块化架构，清晰的代码组织

#### 业务目标
1. **功能完整性**: 100%保留现有功能
2. **输出一致性**: Template Engine与Python版本输出完全一致
3. **用户体验**: 更快的响应速度，更流畅的交互
4. **扩展性**: 支持未来新功能快速迭代

---

## 2. 技术栈选型

### 2.1 决策总结

| 维度 | 现有技术 | 新技术 | 理由 |
|------|---------|--------|------|
| **后端框架** | Flask (Python) | Next.js 15 App Router | 全栈TypeScript，Serverless友好，丰富生态 |
| **数据库** | JSON文件 | PostgreSQL + Prisma ORM | 关系型数据库，强类型ORM，支持复杂查询 |
| **前端框架** | Vanilla JS | React 19 + Next.js | 组件化，状态管理，丰富生态 |
| **UI组件库** | 自定义CSS | shadcn/ui + Tailwind CSS | 现代化设计，可定制，轻量级 |
| **验证** | JSON Schema | Zod | TypeScript-first，与Prisma无缝集成 |
| **异步任务** | Flask后台线程 | Next.js Server Actions + 轮询 | 简化架构，无需额外队列 |
| **图片存储** | 本地文件系统 | 本地 + nginx静态服务 | 平滑迁移，未来可扩展至S3 |
| **AI Providers** | Python SDK | 直接REST API封装 | 减少依赖，完全控制 |
| **部署** | 无 | Vercel + 自托管nginx | Serverless主应用 + 长时间任务隔离 |
| **测试** | pytest (64%通过) | Vitest + Playwright | 全栈测试覆盖 |

### 2.2 核心依赖

#### 生产依赖
```json
{
  "next": "^15.0.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "@prisma/client": "^6.0.0",
  "zod": "^3.23.0",
  "@radix-ui/react-*": "^1.1.0",  // shadcn/ui 依赖
  "tailwindcss": "^3.4.0",
  "sharp": "^0.33.0",              // 图片处理
  "date-fns": "^3.0.0",
  "@google/generative-ai": "^0.21.0", // Gemini API (可选官方SDK)
  "axios": "^1.7.0"                // HTTP客户端
}
```

#### 开发依赖
```json
{
  "typescript": "^5.6.0",
  "prisma": "^6.0.0",
  "@types/node": "^22.0.0",
  "@types/react": "^19.0.0",
  "vitest": "^2.0.0",
  "playwright": "^1.48.0",
  "eslint": "^9.0.0",
  "prettier": "^3.3.0"
}
```

### 2.3 技术栈对比

#### Flask vs Next.js

| 特性 | Flask | Next.js |
|------|-------|---------|
| **语言** | Python | TypeScript/JavaScript |
| **类型安全** | ❌ 动态类型 | ✅ 静态类型 |
| **性能** | 中等（WSGI/ASGI） | 高（V8引擎 + Edge Runtime） |
| **前后端分离** | ❌ 需要CORS | ✅ 同源，无CORS |
| **Serverless** | ⚠️ 需适配 | ✅ 原生支持 |
| **开发体验** | 简单直接 | HMR + Fast Refresh，开发体验极佳 |
| **生态系统** | 成熟但老旧 | 现代化，社区活跃 |

#### shadcn/ui vs Material UI

| 特性 | Material UI | shadcn/ui |
|------|-------------|-----------|
| **包大小** | ~500KB | ~50KB（按需） |
| **定制性** | ⚠️ 主题覆盖复杂 | ✅ 源码级定制 |
| **设计风格** | Material Design | Tailwind + Radix UI |
| **依赖管理** | npm包 | 复制到项目（无依赖） |
| **学习曲线** | 陡峭 | 平缓 |

---

## 3. 架构设计

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         用户浏览器                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Next.js Frontend (React + shadcn/ui + Tailwind)     │  │
│  │  - Dashboard页面                                      │  │
│  │  - 库管理UI                                           │  │
│  │  - Prompt生成UI                                       │  │
│  │  - 模板编辑器                                         │  │
│  └────────────────┬────────────────────────────────────┘  │
└───────────────────┼────────────────────────────────────────┘
                    │ HTTP/HTTPS
┌───────────────────┼────────────────────────────────────────┐
│                   ▼                                         │
│         Next.js Server (Vercel)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes (/api/*)                                 │  │
│  │  - Server Actions                                    │  │
│  │  - Route Handlers                                    │  │
│  └────────────┬──────────────────────────────────┬──────┘  │
│               │                                  │         │
│    ┌──────────▼──────────┐          ┌───────────▼──────┐  │
│    │  Business Logic     │          │   AI Providers   │  │
│    │  (/src/lib/)        │          │   (REST API)     │  │
│    │  - Template Engine  │          │   - Gemini       │  │
│    │  - Prompt Generator │          │   - ByteDance    │  │
│    │  - Combo Manager    │          └──────────────────┘  │
│    │  - Sync Manager     │                               │
│    └──────────┬──────────┘                               │
│               │                                           │
└───────────────┼───────────────────────────────────────────┘
                │ Prisma Client
┌───────────────▼───────────────────────────────────────────┐
│           PostgreSQL Database                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Tables: Library, Record, Template, Prompt, Image    │  │
│  │  Indexes: Composite indexes on frequently queried    │  │
│  │           fields (library_ids, image_id)             │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
                    │ File I/O
┌───────────────────▼───────────────────────────────────────┐
│         自托管 nginx 图片服务器 (VPS)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /public/images/{image_id}/                          │  │
│  │  - v1_main.png, v1_diff.png                          │  │
│  │  - v1_final_{en,fr,ja,ko,de,es,zh}.png               │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### 3.2 目录结构设计

```
promptgen-next/
├── prisma/
│   ├── schema.prisma              # Prisma Schema定义
│   ├── migrations/                # 数据库迁移文件
│   └── seed.ts                    # 种子数据（6个库JSON）
│
├── src/
│   ├── app/                       # Next.js 15 App Router
│   │   ├── (dashboard)/          # 路由组（共享布局）
│   │   │   ├── layout.tsx        # Dashboard布局
│   │   │   ├── page.tsx          # 主页（Dashboard）
│   │   │   ├── libraries/        # 库管理页面
│   │   │   │   ├── page.tsx      # 库列表
│   │   │   │   ├── [name]/       # 动态路由
│   │   │   │   │   └── page.tsx  # 库详情（CRUD）
│   │   │   │   └── loading.tsx   # 加载状态
│   │   │   ├── prompts/          # Prompt生成页面
│   │   │   │   ├── page.tsx      # 主图生成
│   │   │   │   └── diff/         # Diff生成
│   │   │   │       └── page.tsx
│   │   │   ├── images/           # 图片管理页面
│   │   │   │   ├── page.tsx      # 图片列表
│   │   │   │   └── [id]/         # 图片详情
│   │   │   │       └── page.tsx
│   │   │   ├── templates/        # 模板编辑器
│   │   │   │   ├── page.tsx      # 模板列表
│   │   │   │   ├── [id]/edit/    # 模板编辑
│   │   │   │   │   └── page.tsx
│   │   │   │   └── new/          # 新建模板
│   │   │   │       └── page.tsx
│   │   │   └── sync/             # 同步管理页面
│   │   │       └── page.tsx
│   │   ├── api/                  # API Routes
│   │   │   ├── libraries/
│   │   │   │   ├── route.ts                    # GET/POST /api/libraries
│   │   │   │   ├── [name]/route.ts             # GET/PUT/DELETE /api/libraries/:name
│   │   │   │   ├── [name]/[id]/route.ts        # 单条目操作
│   │   │   │   └── config/route.ts             # GET /api/libraries/config
│   │   │   ├── generate/
│   │   │   │   ├── main/route.ts               # POST /api/generate/main
│   │   │   │   ├── diff/route.ts               # POST /api/generate/diff
│   │   │   │   └── batch/route.ts              # POST /api/generate/batch
│   │   │   ├── images/
│   │   │   │   ├── generate/
│   │   │   │   │   ├── single/route.ts
│   │   │   │   │   └── batch/route.ts
│   │   │   │   ├── stitch/route.ts
│   │   │   │   └── stats/route.ts
│   │   │   ├── templates/
│   │   │   │   ├── route.ts                    # CRUD
│   │   │   │   ├── preview/route.ts
│   │   │   │   ├── validate/route.ts
│   │   │   │   └── variables/route.ts
│   │   │   ├── sync/
│   │   │   │   ├── check/route.ts
│   │   │   │   ├── repair/route.ts
│   │   │   │   └── repair-all/route.ts
│   │   │   ├── providers/
│   │   │   │   ├── status/route.ts
│   │   │   │   └── stats/route.ts
│   │   │   └── health/route.ts
│   │   ├── layout.tsx            # 根布局
│   │   └── globals.css           # 全局样式
│   │
│   ├── components/               # React组件
│   │   ├── ui/                  # shadcn/ui组件（自动生成）
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── toast.tsx
│   │   ├── library/             # 库管理组件
│   │   │   ├── LibraryList.tsx
│   │   │   ├── LibraryForm.tsx
│   │   │   ├── LibraryFilter.tsx
│   │   │   └── LibraryPreview.tsx
│   │   ├── prompt/              # Prompt生成组件
│   │   │   ├── MainPromptForm.tsx
│   │   │   ├── DiffPromptForm.tsx
│   │   │   ├── PromptPreview.tsx
│   │   │   └── BatchPromptModal.tsx
│   │   ├── image/               # 图片组件
│   │   │   ├── ImageGallery.tsx
│   │   │   ├── ImageCard.tsx
│   │   │   ├── BatchImageModal.tsx
│   │   │   └── ImageStitcher.tsx
│   │   ├── template/            # 模板编辑器组件
│   │   │   ├── TemplateEditor.tsx     # Monaco/CodeMirror集成
│   │   │   ├── TemplatePreview.tsx
│   │   │   ├── VariableAutocomplete.tsx
│   │   │   └── TemplateSidebar.tsx
│   │   ├── sync/                # 同步管理组件
│   │   │   ├── SyncDashboard.tsx
│   │   │   ├── SyncCheckList.tsx
│   │   │   └── RepairModal.tsx
│   │   └── shared/              # 共享组件
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── Toaster.tsx
│   │
│   ├── lib/                      # 核心业务逻辑
│   │   ├── db/                  # 数据库客户端
│   │   │   ├── prisma.ts        # Prisma单例
│   │   │   └── seed.ts          # 数据库种子
│   │   ├── engines/             # Template引擎
│   │   │   ├── template-engine.ts         # 主图Template引擎
│   │   │   ├── diff-template-engine.ts    # Diff Template引擎
│   │   │   ├── parser.ts                  # 模板解析器
│   │   │   └── filters.ts                 # 过滤器（join等）
│   │   ├── providers/           # AI Providers
│   │   │   ├── base.ts                    # Provider接口
│   │   │   ├── gemini.ts                  # Gemini Provider
│   │   │   ├── bytedance.ts               # ByteDance Provider
│   │   │   ├── provider-manager.ts        # Provider管理器（Fallback）
│   │   │   └── types.ts                   # Provider类型定义
│   │   ├── generators/          # 生成器
│   │   │   ├── prompt-generator.ts        # 主图Prompt生成器（7模块）
│   │   │   ├── diff-prompt-generator.ts   # Diff Prompt生成器
│   │   │   ├── image-generator.ts         # 图片生成器（3轮）
│   │   │   ├── combo-manager.ts           # 组合枚举器
│   │   │   └── batch-generator.ts         # 批量生成协调器
│   │   ├── sync/                # 同步管理
│   │   │   ├── sync-manager.ts            # 同步检查与修复
│   │   │   ├── checkers/                  # 8种检查器
│   │   │   │   ├── library-config-checker.ts
│   │   │   │   ├── invalid-refs-checker.ts
│   │   │   │   ├── prompt-sync-checker.ts
│   │   │   │   ├── image-sync-checker.ts
│   │   │   │   ├── combo-status-checker.ts
│   │   │   │   ├── field-integrity-checker.ts
│   │   │   │   └── orphan-checker.ts
│   │   │   └── repairers/                 # 修复器
│   │   │       └── auto-repairer.ts
│   │   ├── stitcher/            # 图片拼接
│   │   │   ├── image-stitcher.ts          # 拼接主逻辑（sharp）
│   │   │   ├── text-overlay.ts            # 多语言文字叠加
│   │   │   └── languages.ts               # 7种语言配置
│   │   └── utils/               # 工具函数
│   │       ├── id-generator.ts            # Image ID生成/解析
│   │       ├── file-manager.ts            # 文件操作封装
│   │       ├── cache.ts                   # LRU缓存实现
│   │       ├── errors.ts                  # 错误类定义
│   │       └── logger.ts                  # 日志工具
│   │
│   ├── schemas/                  # Zod验证Schema
│   │   ├── library.schema.ts              # 库相关Schema
│   │   ├── prompt.schema.ts               # Prompt Schema
│   │   ├── image.schema.ts                # Image Schema
│   │   ├── template.schema.ts             # Template Schema
│   │   └── api.schema.ts                  # API请求/响应Schema
│   │
│   ├── types/                    # TypeScript类型定义
│   │   ├── library.types.ts
│   │   ├── prompt.types.ts
│   │   ├── image.types.ts
│   │   ├── template.types.ts
│   │   ├── provider.types.ts
│   │   └── api.types.ts
│   │
│   ├── config/                   # 配置文件
│   │   ├── library-config.ts              # 库配置元数据
│   │   ├── languages.ts                   # 多语言配置
│   │   └── constants.ts                   # 全局常量
│   │
│   └── middleware.ts             # Next.js中间件（可选）
│
├── public/
│   └── images/                   # 静态图片（生成的图片在生产环境存储在nginx）
│
├── tests/                        # 测试文件
│   ├── unit/                    # 单元测试
│   │   ├── engines/
│   │   │   ├── template-engine.test.ts
│   │   │   └── diff-template-engine.test.ts
│   │   ├── generators/
│   │   │   ├── prompt-generator.test.ts
│   │   │   └── combo-manager.test.ts
│   │   ├── providers/
│   │   │   └── provider-manager.test.ts
│   │   └── utils/
│   │       └── id-generator.test.ts
│   ├── integration/             # 集成测试
│   │   ├── api/
│   │   │   ├── libraries.test.ts
│   │   │   ├── generate.test.ts
│   │   │   └── images.test.ts
│   │   └── db/
│   │       └── prisma.test.ts
│   └── e2e/                     # E2E测试（Playwright）
│       ├── library-management.spec.ts
│       ├── prompt-generation.spec.ts
│       └── image-generation.spec.ts
│
├── scripts/                      # 脚本
│   ├── migrate-libraries.ts              # 迁移6个库JSON到数据库
│   ├── seed-database.ts                  # 数据库种子脚本
│   └── test-consistency.ts               # 测试Template Engine输出一致性
│
├── docs/refactor/                # 重构文档
│   ├── REFACTOR.md               # 本文档
│   ├── REFRACTOR_TODO.md         # 任务清单
│   ├── DATABASE_SCHEMA.md        # 数据库Schema详细设计
│   └── API_MAPPING.md            # API端点映射表
│
├── .env.example                  # 环境变量示例
├── .env.local                    # 本地环境变量
├── next.config.ts                # Next.js配置
├── tsconfig.json                 # TypeScript配置
├── tailwind.config.ts            # Tailwind CSS配置
├── components.json               # shadcn/ui配置
├── vitest.config.ts              # Vitest配置
├── playwright.config.ts          # Playwright配置
├── package.json                  # 依赖管理
└── README.md                     # 项目说明
```

### 3.3 模块职责划分

#### App Router层（`src/app/`）
- **职责**: 页面路由、数据获取（Server Components）、客户端交互
- **特点**:
  - Server Components默认（减少客户端bundle）
  - 仅交互组件使用`'use client'`指令
  - 数据获取直接在组件内（无需getServerSideProps）

#### API Routes层（`src/app/api/`）
- **职责**: RESTful API端点，业务逻辑调度
- **特点**:
  - 每个`route.ts`导出HTTP方法（GET, POST, PUT, DELETE）
  - 使用Zod验证请求体
  - 调用`lib/`层业务逻辑
  - 统一错误处理

#### 业务逻辑层（`src/lib/`）
- **职责**: 核心业务逻辑，与框架无关
- **特点**:
  - 纯TypeScript类/函数
  - 可独立测试
  - 不依赖Next.js特定API

#### 数据访问层（`src/lib/db/`）
- **职责**: 数据库交互，Prisma Client封装
- **特点**:
  - Prisma单例模式
  - 连接池管理
  - 事务支持

---

## 4. 数据库设计

### 4.1 核心表设计

详细Schema请参考 **`DATABASE_SCHEMA.md`**，这里仅展示关键表：

#### Library表（库配置）
```prisma
model Library {
  id          String   @id @default(cuid())
  name        String   @unique  // character, pose, scene, theme, style, decorative_props
  displayName String   // 人物, 姿态, 场景, 主题, 画风, 装饰小物
  entries     Json     // 库条目JSON数组
  schema      Json?    // JSON Schema定义
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([name])
}
```

#### Record表（生成记录）
```prisma
model Record {
  id              String   @id @default(cuid())
  imageId         String   @unique  // betty_turnback_living_halloween_retro50s_0001
  libraryIds      Json     // {"character": "char_betty_v1", "pose": ...}

  // Outfit状态
  outfitMinorState Json    // [{"element": "鞋子", "current_color": "红色"}]
  usedDecorations  Json    // {"from_theme": [...], "from_scene": [...]}

  // 关联
  prompts         Prompt[]
  variants        ImageVariant[]

  // Provider信息
  providerUsed    String?
  providerAttempts Json    // [{provider, success, error, attempted_at}]

  // 状态
  promptGenerated Boolean  @default(false)
  imageGenerated  Boolean  @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([imageId])
  @@index([promptGenerated, imageGenerated])
}
```

#### Prompt表（Prompt文本）
```prisma
model Prompt {
  id         String   @id @default(cuid())
  recordId   String
  record     Record   @relation(fields: [recordId], references: [id], onDelete: Cascade)

  type       PromptType  // MAIN, DIFF
  promptCn   String   @db.Text
  promptEn   String   @db.Text

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([recordId, type])
}

enum PromptType {
  MAIN
  DIFF
}
```

#### ImageVariant表（图片版本）
```prisma
model ImageVariant {
  id              String   @id @default(cuid())
  recordId        String
  record          Record   @relation(fields: [recordId], references: [id], onDelete: Cascade)

  version         Int      // 1, 2, 3...
  imageMainPath   String?
  imageDiffPath   String?
  finalImages     Json?    // {"en": "path", "fr": "path", ...}

  generatedAt     DateTime @default(now())

  @@unique([recordId, version])
  @@index([recordId])
}
```

#### Template表（模板）
```prisma
model Template {
  id          String   @id @default(cuid())
  name        String
  description String?
  type        TemplateType  // SYSTEM, USER
  category    TemplateCategory  // MAIN, DIFF
  content     String   @db.Text

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([type, category])
}

enum TemplateType {
  SYSTEM
  USER
}

enum TemplateCategory {
  MAIN
  DIFF
}
```

### 4.2 数据迁移策略

#### 迁移范围（Clean Slate）
1. **完整迁移**:
   - 6个库JSON文件 → `Library`表（`entries`字段存储JSON）
   - 系统模板 → `Template`表

2. **不迁移**（从零开始）:
   - `records/*.json` → 不迁移
   - `prompts/*.txt` → 不迁移
   - `images/` → 保留文件，但数据库无历史记录

#### 迁移脚本（`scripts/migrate-libraries.ts`）
```typescript
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

const LIBRARY_CONFIGS = [
  { name: 'character', displayName: '人物', file: 'character.json' },
  { name: 'pose', displayName: '姿态', file: 'pose.json' },
  { name: 'scene', displayName: '场景', file: 'scene.json' },
  { name: 'theme', displayName: '主题', file: 'theme.json' },
  { name: 'style', displayName: '画风', file: 'style.json' },
  { name: 'decorative_props', displayName: '装饰小物', file: 'decorative_props.json' }
];

async function migrateLibraries() {
  for (const config of LIBRARY_CONFIGS) {
    const filePath = path.join(__dirname, '../../data', config.file);
    const jsonData = await fs.readFile(filePath, 'utf-8');
    const entries = JSON.parse(jsonData);

    await prisma.library.upsert({
      where: { name: config.name },
      update: { entries, displayName: config.displayName },
      create: {
        name: config.name,
        displayName: config.displayName,
        entries
      }
    });

    console.log(`✅ Migrated ${config.name} (${Object.keys(entries).length} entries)`);
  }
}

migrateLibraries()
  .then(() => prisma.$disconnect())
  .catch(console.error);
```

---

## 5. API设计

### 5.1 API端点映射

详细映射请参考 **`API_MAPPING.md`**，这里列出核心端点：

#### 库管理（6个端点）

| Flask端点 | Next.js端点 | HTTP方法 | 说明 |
|-----------|-------------|----------|------|
| `GET /api/libraries/<name>` | `GET /api/libraries/[name]` | GET | 获取库条目列表 |
| `POST /api/libraries/<name>` | `POST /api/libraries/[name]` | POST | 添加库条目 |
| `PUT /api/libraries/<name>/<id>` | `PUT /api/libraries/[name]/[id]` | PUT | 更新库条目 |
| `DELETE /api/libraries/<name>/<id>` | `DELETE /api/libraries/[name]/[id]` | DELETE | 删除库条目 |
| `GET /api/libraries/config` | `GET /api/libraries/config` | GET | 获取库配置元数据 |
| `GET /api/libraries/<name>/template` | `GET /api/libraries/[name]/template` | GET | 获取新条目模板 |

#### Prompt生成（8个端点）

| Flask端点 | Next.js端点 | HTTP方法 | 说明 |
|-----------|-------------|----------|------|
| `POST /api/generate/main` | `POST /api/generate/main` | POST | 生成主图Prompt |
| `POST /api/generate/diff` | `POST /api/generate/diff` | POST | 生成Diff Prompt |
| `POST /api/generate/diff/custom` | `POST /api/generate/diff/custom` | POST | 自定义Diff生成 |
| `POST /api/generate/batch` | `POST /api/generate/batch` | POST | 批量Prompt生成 |
| `GET /api/generate/batch/progress` | `GET /api/generate/batch/progress` | GET | 批量生成进度 |

### 5.2 API设计原则

#### 请求/响应格式统一

**成功响应**:
```typescript
{
  success: true,
  data: { ... },
  message?: string
}
```

**错误响应**:
```typescript
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR',
    message: string,
    details?: any
  }
}
```

#### Zod验证示例

```typescript
// src/schemas/api.schema.ts
import { z } from 'zod';

export const GenerateMainRequestSchema = z.object({
  library_ids: z.object({
    character: z.string(),
    pose: z.string(),
    scene: z.string(),
    theme: z.string(),
    style: z.string()
  }),
  template_id: z.string().optional()
});

export type GenerateMainRequest = z.infer<typeof GenerateMainRequestSchema>;

// 在API Route中使用
import { NextRequest, NextResponse } from 'next/server';
import { GenerateMainRequestSchema } from '@/schemas/api.schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = GenerateMainRequestSchema.parse(body);

    // 业务逻辑...

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors
        }
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    }, { status: 500 });
  }
}
```

---

## 6. 核心业务逻辑迁移

### 6.1 Template Engine迁移

#### 原Python实现关键逻辑
```python
# src/template_engine.py
class TemplateEngine:
    def render_template(self, template: str, library_selections: dict, seed: int = None):
        # 1. 解析{{}}占位符
        # 2. 处理@module:xxx
        # 3. 处理library.field
        # 4. 应用过滤器（|join）
        # 5. 返回渲染后字符串
```

#### 新TypeScript实现设计

```typescript
// src/lib/engines/template-engine.ts
import { TemplateParser } from './parser';
import { applyFilters } from './filters';
import { loadLibraryEntry } from '@/lib/db/library-loader';

export class TemplateEngine {
  private parser: TemplateParser;

  constructor() {
    this.parser = new TemplateParser();
  }

  /**
   * 渲染模板
   * @param template 模板字符串
   * @param librarySelections 库选择 { character: 'char_betty_v1', ... }
   * @param seed 随机种子（用于测试一致性）
   */
  async renderTemplate(
    template: string,
    librarySelections: Record<string, string>,
    seed?: number
  ): Promise<string> {
    // 1. 解析模板，提取占位符
    const tokens = this.parser.parse(template);

    // 2. 加载库数据
    const libraryData = await this.loadLibraryData(librarySelections);

    // 3. 构建变量上下文
    const context = this.buildContext(libraryData, seed);

    // 4. 渲染每个token
    let result = template;
    for (const token of tokens) {
      const value = await this.resolveToken(token, context, seed);
      result = result.replace(token.raw, value);
    }

    return result;
  }

  private async resolveToken(
    token: Token,
    context: Context,
    seed?: number
  ): Promise<string> {
    if (token.type === 'module') {
      // {{@module:character}}
      return this.resolveModule(token.moduleName, context, seed);
    } else if (token.type === 'field') {
      // {{character.name}}
      return this.resolveField(token.path, context);
    }
    return '';
  }

  private resolveModule(
    moduleName: string,
    context: Context,
    seed?: number
  ): string {
    // 调用7个模块构建器之一
    switch (moduleName) {
      case 'character':
        return this.buildCharacterModule(context.character, seed);
      case 'pose':
        return this.buildPoseModule(context.pose, seed);
      // ... 其他5个模块
      default:
        throw new Error(`Unknown module: ${moduleName}`);
    }
  }

  private buildCharacterModule(character: any, seed?: number): string {
    // 与Python prompt_generator.py build_character_module() 逻辑一致
    const parts: string[] = [];
    parts.push(`**角色外貌核心**: ${character.appearance_core}`);
    parts.push(`**主要服装**: ${character.outfit_major}`);
    // ... 其他部分
    return parts.join('\n');
  }

  private resolveField(path: string, context: Context): string {
    // 解析路径如 "character.name"
    const [libraryName, fieldName] = path.split('.');
    const value = context[libraryName]?.[fieldName];

    if (Array.isArray(value)) {
      return value.join(', ');  // 默认逗号分隔
    }
    return String(value || '');
  }

  // ... 其他辅助方法
}
```

#### 过滤器实现

```typescript
// src/lib/engines/filters.ts

/**
 * 应用过滤器（如 |join:', '）
 */
export function applyFilters(value: any, filterChain: string): string {
  const filters = parseFilterChain(filterChain);  // 解析 "join:', '"

  let result = value;
  for (const filter of filters) {
    result = applyFilter(result, filter);
  }

  return String(result);
}

function applyFilter(value: any, filter: Filter): any {
  switch (filter.name) {
    case 'join':
      if (Array.isArray(value)) {
        const separator = filter.args[0] || ', ';
        return value.join(separator);
      }
      return value;

    case 'upper':
      return String(value).toUpperCase();

    case 'lower':
      return String(value).toLowerCase();

    default:
      return value;
  }
}
```

### 6.2 Diff Template Engine迁移

```typescript
// src/lib/engines/diff-template-engine.ts
import { TemplateEngine } from './template-engine';

export class DiffTemplateEngine extends TemplateEngine {
  /**
   * 渲染Diff模板（45个变量，7个命名空间）
   */
  async renderDiffTemplate(
    template: string,
    imageId: string,
    newLibrarySelections: Partial<Record<string, string>>,
    seed?: number
  ): Promise<string> {
    // 1. 加载原记录
    const record = await prisma.record.findUnique({
      where: { imageId },
      include: { prompts: true }
    });

    if (!record) {
      throw new Error(`Record not found: ${imageId}`);
    }

    // 2. 加载新库数据
    const newLibraryData = await this.loadLibraryData(newLibrarySelections);

    // 3. 构建7个命名空间
    const context = {
      main: this.buildMainContext(record),                     // main.*
      outfit_state: this.extractOutfitState(record),          // outfit_state.*
      new_outfit_state: this.generateNewOutfitState(record),  // new_outfit_state.*
      color_changes: this.computeColorChanges(record),        // color_changes.*
      decorations: this.extractDecorations(record),           // decorations.*
      new_decorations: this.generateNewDecorations(seed),     // new_decorations.*
      all_decorations: []                                     // all_decorations.*
    };

    // 合并 decorations
    context.all_decorations = [
      ...context.decorations.from_theme,
      ...context.decorations.from_scene,
      ...context.new_decorations.from_theme,
      ...context.new_decorations.from_scene
    ];

    // 4. 渲染模板
    return super.renderTemplate(template, context, seed);
  }

  private computeColorChanges(record: any): any[] {
    // 生成 "从红色改为蓝色" 格式
    const oldState = record.outfitMinorState;
    const newState = this.generateNewOutfitState(record);

    return newState.map((item: any, index: number) => ({
      element: item.element,
      from_color: oldState[index].current_color,
      to_color: item.new_color,
      formatted: `从${oldState[index].current_color}改为${item.new_color}`
    }));
  }

  // ... 其他辅助方法
}
```

### 6.3 Provider Manager迁移

```typescript
// src/lib/providers/provider-manager.ts
import { GeminiProvider } from './gemini';
import { BytedanceProvider } from './bytedance';
import { IImageProvider, ProviderConfig } from './types';

export class ProviderManager {
  private providers: Map<string, IImageProvider>;
  private fallbackChain: string[];

  constructor(config: ProviderConfig) {
    this.providers = new Map();
    this.fallbackChain = config.providers.split(',');  // "gemini,bytedance"

    // 初始化Providers
    if (this.fallbackChain.includes('gemini')) {
      this.providers.set('gemini', new GeminiProvider(config.geminiApiKey));
    }
    if (this.fallbackChain.includes('bytedance')) {
      this.providers.set('bytedance', new BytedanceProvider(config.bytedanceApiKey));
    }
  }

  /**
   * 生成图片（带Fallback）
   */
  async generateWithFallback(
    prompt: string,
    contextImage?: Buffer
  ): Promise<{ image: Buffer; provider: string }> {
    const errors: Array<{ provider: string; error: any }> = [];

    for (const providerName of this.fallbackChain) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        console.log(`Trying provider: ${providerName}`);
        const image = await provider.generate(prompt, contextImage);

        // 成功，记录统计
        await this.recordSuccess(providerName);

        return { image, provider: providerName };
      } catch (error) {
        console.error(`Provider ${providerName} failed:`, error);
        errors.push({ provider: providerName, error });

        // 记录失败
        await this.recordFailure(providerName, error);
      }
    }

    // 所有Provider都失败
    throw new Error(
      `All providers failed: ${errors.map(e => `${e.provider}: ${e.error.message}`).join('; ')}`
    );
  }

  /**
   * 健康检查
   */
  async checkHealth(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }

  // 统计方法
  private async recordSuccess(provider: string) {
    // 写入数据库或Redis
  }

  private async recordFailure(provider: string, error: any) {
    // 写入数据库或Redis
  }
}
```

#### Provider接口定义

```typescript
// src/lib/providers/types.ts
export interface IImageProvider {
  /**
   * 生成图片
   * @param prompt Prompt文本
   * @param contextImage 上下文图片（用于Diff生成）
   * @returns 图片Buffer
   */
  generate(prompt: string, contextImage?: Buffer): Promise<Buffer>;

  /**
   * 健康检查
   */
  healthCheck(): Promise<boolean>;
}

export interface ProviderConfig {
  providers: string;         // "gemini,bytedance"
  geminiApiKey?: string;
  geminiModel?: string;
  bytedanceApiKey?: string;
  bytedanceModel?: string;
}
```

#### Gemini Provider实现

```typescript
// src/lib/providers/gemini.ts
import axios from 'axios';
import { IImageProvider } from './types';

export class GeminiProvider implements IImageProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string, model = 'gemini-2.5-flash-image') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(prompt: string, contextImage?: Buffer): Promise<Buffer> {
    const endpoint = `${this.baseUrl}/models/${this.model}:generateContent`;

    const payload: any = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ]
    };

    // 如果有上下文图片（Diff生成），添加到请求
    if (contextImage) {
      payload.contents[0].parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: contextImage.toString('base64')
        }
      });
    }

    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      timeout: 60000  // 60秒超时
    });

    // 解析响应，提取图片数据
    const imageData = response.data.candidates[0].content.parts[0].inline_data.data;
    return Buffer.from(imageData, 'base64');
  }

  async healthCheck(): Promise<boolean> {
    try {
      // 发送简单请求测试API key有效性
      const testPrompt = 'A simple test';
      await this.generate(testPrompt);
      return true;
    } catch {
      return false;
    }
  }
}
```

### 6.4 Image Generator迁移（3轮生成）

```typescript
// src/lib/generators/image-generator.ts
import { ProviderManager } from '@/lib/providers/provider-manager';
import { ImageStitcher } from '@/lib/stitcher/image-stitcher';
import { prisma } from '@/lib/db/prisma';
import fs from 'fs/promises';
import path from 'path';

export class ImageGenerator {
  private providerManager: ProviderManager;
  private stitcher: ImageStitcher;

  constructor(providerManager: ProviderManager) {
    this.providerManager = providerManager;
    this.stitcher = new ImageStitcher();
  }

  /**
   * 3轮生成流程
   */
  async generateThreeRounds(
    imageId: string,
    languageIds: number[] = [1, 2, 3, 4, 5, 6, 7]  // 默认7种语言
  ): Promise<void> {
    // 1. 加载记录和Prompts
    const record = await prisma.record.findUnique({
      where: { imageId },
      include: { prompts: true }
    });

    if (!record) {
      throw new Error(`Record not found: ${imageId}`);
    }

    const mainPrompt = record.prompts.find(p => p.type === 'MAIN');
    const diffPrompt = record.prompts.find(p => p.type === 'DIFF');

    if (!mainPrompt || !diffPrompt) {
      throw new Error('Prompts not generated');
    }

    // 确定版本号
    const version = (record.variants?.length || 0) + 1;
    const imageDir = path.join(process.cwd(), 'public', 'images', imageId);
    await fs.mkdir(imageDir, { recursive: true });

    try {
      // Round 1: 生成主图
      console.log(`[Round 1] Generating main image for ${imageId}...`);
      const { image: mainImage, provider } = await this.providerManager.generateWithFallback(
        mainPrompt.promptEn
      );

      const mainPath = path.join(imageDir, `v${version}_main.png`);
      await fs.writeFile(mainPath, mainImage);
      console.log(`✅ Main image saved: ${mainPath}`);

      // Round 2: 生成对比图（强制使用相同Provider）
      console.log(`[Round 2] Generating diff image with ${provider}...`);
      const diffImage = await this.generateDiffWithSameProvider(
        diffPrompt.promptEn,
        mainImage,
        provider
      );

      const diffPath = path.join(imageDir, `v${version}_diff.png`);
      await fs.writeFile(diffPath, diffImage);
      console.log(`✅ Diff image saved: ${diffPath}`);

      // Round 3: 拼接最终图（7种语言）
      console.log(`[Round 3] Stitching final images...`);
      const finalImages: Record<string, string> = {};

      for (const langId of languageIds) {
        const finalPath = await this.stitcher.stitch({
          mainImagePath: mainPath,
          diffImagePath: diffPath,
          outputPath: path.join(imageDir, `v${version}_final_${this.getLangCode(langId)}.png`),
          languageId: langId
        });

        finalImages[this.getLangCode(langId)] = finalPath;
      }

      console.log(`✅ All ${languageIds.length} language variants generated`);

      // 更新数据库
      await prisma.imageVariant.create({
        data: {
          recordId: record.id,
          version,
          imageMainPath: mainPath,
          imageDiffPath: diffPath,
          finalImages
        }
      });

      await prisma.record.update({
        where: { id: record.id },
        data: {
          imageGenerated: true,
          providerUsed: provider
        }
      });

      console.log(`✅ 3-round generation complete for ${imageId}`);

    } catch (error) {
      // 记录失败
      await this.recordProviderAttempt(record.id, error);
      throw error;
    }
  }

  private async generateDiffWithSameProvider(
    prompt: string,
    mainImage: Buffer,
    providerName: string
  ): Promise<Buffer> {
    const provider = this.providerManager.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not available`);
    }

    return provider.generate(prompt, mainImage);
  }

  private getLangCode(langId: number): string {
    const codes = ['en', 'fr', 'ja', 'ko', 'de', 'es', 'zh'];
    return codes[langId - 1] || 'en';
  }

  private async recordProviderAttempt(recordId: string, error: any) {
    // 记录失败尝试到providerAttempts字段
  }
}
```

---

## 7. 前端组件架构

### 7.1 shadcn/ui集成

#### 初始化shadcn/ui

```bash
npx shadcn@latest init
```

**配置文件** (`components.json`):
```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

#### 安装常用组件

```bash
npx shadcn@latest add button card dialog form input select table tabs toast
npx shadcn@latest add dropdown-menu popover separator switch textarea
npx shadcn@latest add accordion alert badge checkbox label progress
```

### 7.2 核心页面组件

#### Dashboard主页

```typescript
// src/app/(dashboard)/page.tsx
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecordList } from '@/components/record/RecordList';
import { StatsOverview } from '@/components/shared/StatsOverview';

export default async function DashboardPage() {
  // Server Component，直接查询数据库
  const stats = await getStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">PromptGen Dashboard</h1>

      {/* 统计卡片 */}
      <StatsOverview stats={stats} />

      {/* 选项卡 */}
      <Tabs defaultValue="records" className="w-full">
        <TabsList>
          <TabsTrigger value="records">生成记录</TabsTrigger>
          <TabsTrigger value="pending">待生成</TabsTrigger>
          <TabsTrigger value="failed">失败</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <Suspense fallback={<div>Loading...</div>}>
            <RecordList filter="all" />
          </Suspense>
        </TabsContent>

        <TabsContent value="pending">
          <Suspense fallback={<div>Loading...</div>}>
            <RecordList filter="pending" />
          </Suspense>
        </TabsContent>

        <TabsContent value="failed">
          <Suspense fallback={<div>Loading...</div>}>
            <RecordList filter="failed" />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function getStats() {
  // 直接查询Prisma（Server Component特权）
  const totalRecords = await prisma.record.count();
  const generatedImages = await prisma.record.count({
    where: { imageGenerated: true }
  });
  const pendingPrompts = await prisma.record.count({
    where: { promptGenerated: false }
  });

  return { totalRecords, generatedImages, pendingPrompts };
}
```

#### 库管理页面

```typescript
// src/app/(dashboard)/libraries/[name]/page.tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { LibraryList } from '@/components/library/LibraryList';
import { LibraryForm } from '@/components/library/LibraryForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export default function LibraryPage() {
  const params = useParams();
  const libraryName = params.name as string;
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold capitalize">{libraryName} 库管理</h1>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>➕ 新增条目</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <LibraryForm
              libraryName={libraryName}
              onSuccess={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <LibraryList libraryName={libraryName} />
    </div>
  );
}
```

#### 动态库表单组件

```typescript
// src/components/library/LibraryForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface LibraryFormProps {
  libraryName: string;
  initialData?: any;
  onSuccess?: () => void;
}

export function LibraryForm({ libraryName, initialData, onSuccess }: LibraryFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // 动态获取Schema
  const schema = useLibrarySchema(libraryName);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {}
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/libraries/${libraryName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to save');

      toast({
        title: '成功',
        description: '库条目已保存'
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: '错误',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 动态生成表单字段 */}
        <DynamicFields schema={schema} form={form} />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? '保存中...' : '💾 保存'}
        </Button>
      </form>
    </Form>
  );
}
```

### 7.3 模板编辑器集成Monaco Editor

```typescript
// src/components/template/TemplateEditor.tsx
'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

// 动态导入Monaco Editor（避免SSR错误）
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface TemplateEditorProps {
  initialContent?: string;
  category: 'MAIN' | 'DIFF';
  onSave?: (content: string) => void;
}

export function TemplateEditor({ initialContent, category, onSave }: TemplateEditorProps) {
  const [content, setContent] = useState(initialContent || '');
  const [variables, setVariables] = useState<Variable[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // 加载变量列表（用于自动补全）
    fetch(`/api/templates/${category === 'MAIN' ? 'variables' : 'diff/variables'}`)
      .then(res => res.json())
      .then(data => setVariables(data.variables));
  }, [category]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // 注册自动补全
    monaco.languages.registerCompletionItemProvider('plaintext', {
      triggerCharacters: ['{'],
      provideCompletionItems: (model: any, position: any) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        // 检测 {{
        if (textUntilPosition.endsWith('{{')) {
          return {
            suggestions: variables.map(v => ({
              label: v.name,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: v.name,
              documentation: v.description
            }))
          };
        }

        return { suggestions: [] };
      }
    });
  };

  const handleSave = async () => {
    try {
      // 验证模板
      const response = await fetch('/api/templates/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, category })
      });

      const result = await response.json();

      if (!result.valid) {
        toast({
          title: '验证失败',
          description: result.errors.join(', '),
          variant: 'destructive'
        });
        return;
      }

      onSave?.(content);
      toast({ title: '保存成功' });
    } catch (error) {
      toast({
        title: '错误',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 border rounded-md overflow-hidden">
        <MonacoEditor
          height="500px"
          language="plaintext"
          theme="vs-dark"
          value={content}
          onChange={(value) => setContent(value || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on'
          }}
        />
      </div>

      <div className="mt-4 flex justify-end space-x-2">
        <Button variant="outline" onClick={handleValidate}>
          ✓ 验证
        </Button>
        <Button onClick={handleSave}>
          💾 保存
        </Button>
      </div>
    </div>
  );
}
```

---

## 8. 异步任务处理

### 8.1 设计方案

由于选择**不引入外部队列**（BullMQ/Inngest），采用以下方案：

#### 方案1: Server Actions + 数据库状态追踪

```typescript
// src/app/api/images/generate/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerator } from '@/lib/generators/image-generator';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  const { imageIds, languageIds } = await request.json();

  // 创建批次记录
  const batch = await prisma.imageBatch.create({
    data: {
      totalImages: imageIds.length,
      status: 'PENDING',
      imageIds
    }
  });

  // 异步执行（不阻塞响应）
  processBatch(batch.id, imageIds, languageIds).catch(console.error);

  // 立即返回批次ID
  return NextResponse.json({
    success: true,
    data: { batchId: batch.id }
  });
}

async function processBatch(
  batchId: string,
  imageIds: string[],
  languageIds: number[]
) {
  const generator = new ImageGenerator(providerManager);
  let completed = 0;
  let failed = 0;

  for (const imageId of imageIds) {
    try {
      await generator.generateThreeRounds(imageId, languageIds);
      completed++;
    } catch (error) {
      console.error(`Failed to generate ${imageId}:`, error);
      failed++;
    }

    // 更新进度
    await prisma.imageBatch.update({
      where: { id: batchId },
      data: {
        completed,
        failed,
        status: completed + failed === imageIds.length ? 'COMPLETED' : 'IN_PROGRESS'
      }
    });
  }
}
```

#### 方案2: 前端轮询进度

```typescript
// src/app/(dashboard)/images/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';

export function BatchImageGeneration() {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const startGeneration = async (imageIds: string[]) => {
    const response = await fetch('/api/images/generate/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageIds, languageIds: [1, 2, 3, 4, 5, 6, 7] })
    });

    const { data } = await response.json();
    setBatchId(data.batchId);
  };

  useEffect(() => {
    if (!batchId) return;

    const interval = setInterval(async () => {
      const response = await fetch(`/api/images/generate/batch/${batchId}/progress`);
      const { data } = await response.json();

      setProgress({
        completed: data.completed,
        total: data.totalImages
      });

      if (data.status === 'COMPLETED') {
        clearInterval(interval);
      }
    }, 2000);  // 每2秒轮询

    return () => clearInterval(interval);
  }, [batchId]);

  return (
    <div>
      {batchId && (
        <div className="space-y-2">
          <Progress value={(progress.completed / progress.total) * 100} />
          <p className="text-sm text-muted-foreground">
            {progress.completed} / {progress.total} 已完成
          </p>
        </div>
      )}
    </div>
  );
}
```

### 8.2 Vercel部署注意事项

#### Serverless函数限制
- **免费计划**: 10秒超时
- **Pro计划**: 60秒超时
- **Enterprise**: 300秒超时

#### 应对策略
1. **短任务**: Prompt生成（<10秒） → Vercel Serverless
2. **长任务**: 图片生成（2-5分钟） → 自托管nginx服务器

#### 混合部署架构

```
┌─────────────────────────────────────────┐
│  Vercel (Next.js主应用)                  │
│  - 前端页面                              │
│  - API Routes（短任务）                   │
│  - Prompt生成API                         │
│  - 库管理API                             │
└──────────────┬──────────────────────────┘
               │ HTTP请求
┌──────────────▼──────────────────────────┐
│  自托管VPS (nginx + Node.js)             │
│  - 图片生成Worker                        │
│  - 图片静态服务（/images/*）              │
│  - 长时间任务队列                         │
└─────────────────────────────────────────┘
```

#### Vercel环境变量配置

```env
# .env.local (开发环境)
DATABASE_URL="postgresql://user:password@localhost:5432/promptgen"
GEMINI_API_KEY="your_gemini_key"
BYTEDANCE_API_KEY="your_bytedance_key"
IMAGE_WORKER_URL="http://localhost:3001"  # 本地Worker

# Vercel环境变量（生产环境）
DATABASE_URL="postgresql://user:password@db.supabase.co:5432/postgres"
IMAGE_WORKER_URL="https://your-vps.com:3001"  # VPS Worker
```

---

## 9. 部署架构

### 9.1 Vercel部署配置

#### `vercel.json` 配置

```json
{
  "buildCommand": "prisma generate && next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["hkg1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "GEMINI_API_KEY": "@gemini-api-key",
    "BYTEDANCE_API_KEY": "@bytedance-api-key",
    "IMAGE_WORKER_URL": "@image-worker-url"
  }
}
```

#### 部署步骤

```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 登录Vercel
vercel login

# 3. 链接项目
vercel link

# 4. 配置环境变量
vercel env add DATABASE_URL production
vercel env add GEMINI_API_KEY production
vercel env add BYTEDANCE_API_KEY production
vercel env add IMAGE_WORKER_URL production

# 5. 部署
vercel --prod
```

### 9.2 自托管nginx服务器配置

#### Docker Compose配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./images:/usr/share/nginx/html/images
      - ./ssl:/etc/nginx/ssl
    restart: unless-stopped

  image-worker:
    build: ./image-worker
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - BYTEDANCE_API_KEY=${BYTEDANCE_API_KEY}
    volumes:
      - ./images:/app/public/images
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: promptgen
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: promptgen_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

#### nginx配置

```nginx
# nginx.conf
http {
    # 静态图片服务
    server {
        listen 80;
        server_name images.promptgen.com;

        location /images/ {
            root /usr/share/nginx/html;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # 反向代理到Image Worker
    server {
        listen 80;
        server_name worker.promptgen.com;

        location / {
            proxy_pass http://image-worker:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 300s;  # 5分钟超时
        }
    }
}
```

### 9.3 数据库部署（Supabase推荐）

#### Supabase设置

1. **创建项目**: https://supabase.com/dashboard
2. **获取连接字符串**:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
3. **运行迁移**:
   ```bash
   npx prisma migrate deploy
   ```

#### 备选方案：自托管PostgreSQL

```yaml
# docker-compose.yml (上面已包含)
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: promptgen
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: promptgen_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
```

---

## 10. 迁移计划

### 10.1 时间线（8-10周）

详细任务清单请参考 **`REFRACTOR_TODO.md`**，这里展示高层次时间线：

#### Week 1-2: Phase 0-1（项目初始化 + 数据层）
- [ ] Next.js项目搭建
- [ ] shadcn/ui安装与配置
- [ ] Prisma Schema设计与迁移
- [ ] Zod Schema定义
- [ ] 迁移6个库JSON到数据库

#### Week 3-4: Phase 2（核心API）
- [ ] 库管理API（6个端点）
- [ ] Prompt生成API（8个端点）
- [ ] Template Engine迁移（TypeScript）
- [ ] Diff Template Engine迁移

#### Week 5: Phase 3（UI层）
- [ ] Dashboard主页
- [ ] 库管理UI（shadcn组件）
- [ ] Prompt生成UI
- [ ] 模板编辑器（Monaco Editor）

#### Week 6-7: Phase 4（图片生成）
- [ ] AI Provider封装（Gemini + ByteDance）
- [ ] Provider Manager（Fallback）
- [ ] Image Generator（3轮生成）
- [ ] 图片拼接（sharp库）
- [ ] 批量生成

#### Week 8: Phase 5（高级功能）
- [ ] 同步管理系统
- [ ] 批量生成UI
- [ ] 错误管理

#### Week 9-10: Phase 6（测试与部署）
- [ ] 单元测试（Vitest）
- [ ] E2E测试（Playwright）
- [ ] Vercel部署
- [ ] nginx服务器配置
- [ ] 性能优化

### 10.2 并行任务策略

**可并行开发**:
- Phase 2 API + Phase 3 UI（前后端分离）
- Provider封装 + Template Engine迁移（独立模块）

**串行依赖**:
- Phase 1必须先于Phase 2（数据层是基础）
- Phase 4依赖Phase 2（Prompt必须先生成）

---

## 11. 风险评估与缓解

### 11.1 技术风险

| 风险 | 严重性 | 概率 | 缓解措施 |
|------|--------|------|---------|
| **Template Engine输出不一致** | 高 | 中 | 1. 编写snapshot测试<br>2. 相同随机种子对比<br>3. 单元测试覆盖每个模块 |
| **Vercel Serverless超时** | 高 | 高 | 1. 图片生成独立到VPS<br>2. 使用Pro计划（60秒）<br>3. 任务分片 |
| **数据库迁移失败** | 中 | 低 | 1. 备份原JSON文件<br>2. 分阶段迁移<br>3. 回滚脚本 |
| **AI Provider API变更** | 中 | 中 | 1. 版本锁定<br>2. 接口抽象层<br>3. 错误日志 |
| **图片存储扩展性** | 低 | 中 | 1. nginx缓存<br>2. 预留S3迁移接口 |

### 11.2 业务风险

| 风险 | 严重性 | 概率 | 缓解措施 |
|------|--------|------|---------|
| **功能缺失** | 高 | 低 | 1. 详细功能清单<br>2. 用户验收测试<br>3. Feature parity检查 |
| **学习曲线陡峭** | 中 | 中 | 1. 渐进式重构<br>2. 文档完善<br>3. 代码注释 |
| **性能退化** | 中 | 低 | 1. 性能基准测试<br>2. 数据库索引优化<br>3. CDN加速 |

### 11.3 测试策略

#### 输出一致性测试（最关键）

```typescript
// tests/unit/engines/template-engine.test.ts
import { describe, it, expect } from 'vitest';
import { TemplateEngine } from '@/lib/engines/template-engine';
import { readFileSync } from 'fs';

describe('TemplateEngine Output Consistency', () => {
  const engine = new TemplateEngine();

  // 从旧系统加载快照
  const pythonSnapshots = JSON.parse(
    readFileSync('tests/fixtures/python-snapshots.json', 'utf-8')
  );

  it('should match Python output for main template with seed 42', async () => {
    const template = readFileSync('schemes/system/template_default_v1.txt', 'utf-8');
    const librarySelections = {
      character: 'char_betty_v1',
      pose: 'pose_turn_back_smile_v1',
      scene: 'scene_living_sofa_v1',
      theme: 'theme_halloween_v1',
      style: 'style_retro1950_flat_v1'
    };

    const result = await engine.renderTemplate(template, librarySelections, 42);

    // 与Python快照对比
    expect(result).toBe(pythonSnapshots.betty_turnback_living_halloween_seed42);
  });

  // 测试100个随机种子
  it('should match Python output for 100 random seeds', async () => {
    for (let seed = 0; seed < 100; seed++) {
      const result = await engine.renderTemplate(template, librarySelections, seed);
      expect(result).toBe(pythonSnapshots[`seed_${seed}`]);
    }
  });
});
```

#### E2E测试示例

```typescript
// tests/e2e/library-management.spec.ts
import { test, expect } from '@playwright/test';

test('complete library management flow', async ({ page }) => {
  // 1. 访问库管理页面
  await page.goto('/libraries/character');

  // 2. 点击新增按钮
  await page.click('text=➕ 新增条目');

  // 3. 填写表单
  await page.fill('input[name="id"]', 'char_test_v1');
  await page.fill('input[name="name"]', 'Test Character');
  await page.fill('textarea[name="appearance_core"]', '测试角色');

  // 4. 提交
  await page.click('button:has-text("💾 保存")');

  // 5. 验证Toast通知
  await expect(page.locator('.toast')).toContainText('成功');

  // 6. 验证表格中出现新条目
  await expect(page.locator('table')).toContainText('char_test_v1');
});
```

---

## 12. 附录

### 12.1 参考资源

#### 官方文档
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Zod Documentation](https://zod.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)

#### 社区资源
- [Next.js Examples](https://github.com/vercel/next.js/tree/canary/examples)
- [Prisma Examples](https://github.com/prisma/prisma-examples)
- [shadcn/ui Examples](https://github.com/shadcn/ui/tree/main/apps/www/app)

### 12.2 关键决策记录

| 决策 | 理由 | 日期 |
|------|------|------|
| 选择PostgreSQL而非MongoDB | 需要强类型约束和复杂查询 | 2025-11-15 |
| 选择shadcn/ui而非Material UI | 更轻量，源码级定制 | 2025-11-15 |
| 不使用外部队列（BullMQ/Inngest） | 简化架构，当前规模不需要 | 2025-11-15 |
| 全量重写而非增量迁移 | 代码库不大，一次性重构更清晰 | 2025-11-15 |
| Clean Slate数据迁移 | 旧数据质量不高，从零开始更简单 | 2025-11-15 |
| 混合部署（Vercel + VPS） | Serverless优势 + 长任务需求兼顾 | 2025-11-15 |

### 12.3 术语表

| 术语 | 定义 |
|------|------|
| **Server Component** | Next.js默认组件类型，服务端渲染，无客户端JavaScript |
| **Server Action** | Next.js服务端函数，可直接在组件中调用 |
| **Route Handler** | Next.js API路由处理函数（`route.ts`） |
| **Prisma Schema** | 数据库模型定义文件（`schema.prisma`） |
| **Zod Schema** | TypeScript运行时验证Schema |
| **shadcn/ui** | 无依赖React组件库，基于Radix UI + Tailwind |
| **Image ID** | 生成记录唯一标识符（如`betty_turnback_living_halloween_retro50s_0001`） |
| **Provider** | AI图片生成服务提供商（Gemini, ByteDance） |
| **Fallback Chain** | Provider失败时的备用顺序 |
| **3-Round Generation** | 主图→对比图→拼接的三轮生成流程 |

---

## 文档更新记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| 1.0.0 | 2025-11-15 | 初始版本 | Claude + Sam Wong |

---

**下一步行动**: 参考 [`REFRACTOR_TODO.md`](./REFRACTOR_TODO.md) 开始实施Phase 0。
