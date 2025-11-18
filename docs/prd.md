# PromptGen 全量重构设计文档
# Next.js + TypeScript + shadcn/ui + Zod + PostgreSQL

**文档版本**: 1.3.0
**创建日期**: 2025-11-15
**最后更新**: 2025-11-18
**作者**: Claude + Sam Wong
**状态**: 实施中（71%完成 - Phase 5 Complete）

---

## 目录

1. [当前实施状态](#1-当前实施状态)
2. [重构背景与目标](#2-重构背景与目标)
3. [技术栈选型](#3-技术栈选型)
4. [架构设计](#4-架构设计)
5. [数据库设计](#5-数据库设计)
6. [API设计](#6-api设计)
7. [系统架构概述](#7-系统架构概述)
8. [迁移计划](#8-迁移计划)
9. [风险评估与缓解](#9-风险评估与缓解)
10. [附录](#10-附录)

---

## 1. 当前实施状态

> **最后更新**: 2025-11-18
> **总体进度**: 71% (Phase 0-5 完成)
> **当前阶段**: Phase 5 Complete ✅
> **下一步**: Phase 6 - 测试与部署

### 1.1 进度概览

| Phase | 阶段名称 | 预计时长 | 状态 | 完成日期 |
|-------|---------|---------|------|----------|
| **Phase 0** | 项目初始化 | 2-3天 | ✅ **完成** | 2025-11-16 |
| **Phase 1** | 数据层设计 | 1周 | ✅ **完成** | 2025-11-16 |
| **Phase 2** | 核心API | 1.5周 | ✅ **完成** | 2025-11-16 |
| **Phase 3** | UI层 | 1周 | ✅ **完成** | 2025-11-16 |
| **Phase 4** | 图片生成 | 1.5周 | ✅ **完成** | 2025-11-18 |
| **Phase 5** | 高级功能 | 1周 | ✅ **完成** | 2025-11-18 |
| **Phase 6** | 测试与部署 | 1.5周 | ⬜ **待开始** | - |

**详细任务追踪**: 参见 [todo.md](./todo.md)

### 1.2 技术栈实际版本

| 技术 | 版本 | 状态 |
|------|------|------|
| **Next.js** | 16.0.3 | ✅ Up-to-date |
| **React** | 19.2.0 | ✅ 最新稳定版 |
| **TypeScript** | 5.6.3 | ✅ 严格模式 |
| **Prisma** | 6.0.0 | ✅ 含PostgreSQL |
| **shadcn/ui** | Latest | ✅ 22组件已安装 |
| **Tailwind CSS** | 3.4.15 | ✅ CSS变量系统 |
| **PostgreSQL** | 16-alpine | ✅ Docker运行中 |
| **Vitest** | 2.1.6 | ✅ 单元测试框架 |
| **Playwright** | 1.48.2 | ✅ E2E测试框架 |

### 1.3 已完成组件

#### Phase 0: 项目初始化 ✅
**完成日期**: 2025-11-16
**关键成果**:
- Next.js 16.0.3项目搭建（使用Turbopack）
- 所有依赖配置且版本up-to-date
- 开发服务器运行 (http://localhost:3000, 374ms启动)
- **质量优化**:
  - ✅ 修复`next.config.ts`: 移除deprecated `images.domains`，迁移至`remotePatterns`
  - ✅ 添加Favicon系统: `/public/favicon.svg` + `/src/app/icon.tsx`
  - ✅ 修复ESLint 9 flat config语法
  - ✅ 清理lockfile冲突（删除父目录yarn.lock）
  - ✅ 零critical warnings（仅HMR connected message）

#### Phase 1: 数据层 ✅
**完成日期**: 2025-11-16
**关键成果**:
- **Prisma Schema**: 7个模型，4个enum，170行代码
  - 模型: Library, LibraryEntry, Record, Prompt, ImageVariant, Template, ImageBatch
  - Enum: LibraryType, PromptType, ImageStatus, TemplateType
- **数据库迁移**:
  - 6个库已迁移（character, pose, scene, theme, style, decorative_props）
  - 14个library entries
  - 2个system templates
- **Zod Schema**: 5个验证文件，~500行代码
- **验证脚本**: 数据库连接、迁移验证通过

#### Phase 2: 核心API ✅
**完成日期**: 2025-11-16
**代码量**: 27文件，~4,526 LOC
**关键成果**:
- **18个API端点**（100%功能测试通过）:
  - 库管理: 6个端点（list/get/create/update/delete/list-entries）
  - Prompt生成: 3个端点（generate-main/diff/batch）
  - Template管理: 5个端点（list/get/create/update/delete）
  - 工具: 4个端点（health/library-config/generate-id/parse-id）
- **Template Engine**:
  - 7个预定义模块（character, pose, scene, theme, lighting, style, composition）
  - 支持 `{{@module:xxx}}` 和 `{{library.field}}` 语法
  - 支持过滤器: `join`, `join:`
  - 39个可用变量（用于主图模板）
- **测试覆盖**: 12/12集成测试通过（751ms）

#### Phase 3: UI层 ✅
**完成日期**: 2025-11-16
**代码量**: 28文件，~4,850 LOC
**关键成果**:
- **7个主要页面**:
  1. `/` - Dashboard（项目概览、快速统计、最近活动）
  2. `/libraries` - 库管理（列表、创建、编辑、删除）
  3. `/prompts` - Prompt管理（生成、查看、导出）
  4. `/images` - 图片管理（批量生成、版本管理）
  5. `/templates` - 模板管理（系统/用户模板编辑）
  6. `/status` - 系统状态（健康检查、错误日志）
  7. `/settings` - 系统设置（配置管理）
- **8个React Query Hooks**: 数据获取和缓存管理
- **12个UI组件**:
  - LibraryTable, PromptCard, BatchGenerationDialog
  - LoadingSpinner, ErrorMessage, ConfirmDialog
  - LibraryForm, TemplateEditor, ImageGrid 等
- **Monaco Editor集成**: 代码分割、语法高亮
- **响应式设计**: 所有页面支持移动端和桌面端
- **统一设计**: 所有页面遵循 Header + Stats + Content 布局

### 1.4 已完成核心功能（Phase 4-5）

#### Phase 4: 图片生成系统 ✅
**完成日期**: 2025-11-18
**代码量**: ~3,200 LOC, 22 files
**关键成果**:
- **AI Provider实现**:
  - GeminiProvider（REST API封装）
  - BytedanceProvider（REST API封装）
  - ProviderManager（Fallback机制，自动切换）
- **图片生成流程**:
  - ImageGenerator（3轮生成协调）
  - BatchGenerator（批量任务管理）
  - ComboManager（组合枚举）
- **图片拼接系统**:
  - ImageStitcher（sharp库，主图+对比图拼接）
  - TextOverlay（7种语言文字叠加）
  - Languages配置（en, fr, ja, ko, de, es, zh）
- **BullMQ队列集成**:
  - image-generation-queue（任务队列）
  - Worker进程（后台任务处理）
  - 进度追踪（实时状态更新）
- **API端点**:
  - `/api/images/generate/single` - 单图生成
  - `/api/images/generate/batch` - 批量生成
  - `/api/images/stitch` - 图片拼接
  - `/api/images/progress/[imageId]` - 进度查询

#### Phase 5: 高级功能 ✅
**完成日期**: 2025-11-18
**代码量**: ~4,500 LOC, 33 files
**关键成果**:
- **错误管理系统**（8 files）:
  - ErrorLogger（集中式错误日志）
  - ErrorClassifier（8种错误分类）
  - Error API（查询、统计、清理）
  - ErrorLogViewer & ErrorStats组件
- **健康监控系统**（7 files）:
  - HealthChecker（系统健康检查）
  - Provider/Database/Queue/FileSystem监控
  - Health API（统一健康端点）
  - HealthStatusCard & ProviderStatus & QueueStatus组件
- **同步管理系统**（16 files）:
  - SyncManager（协调8个检查器）
  - 8个IChecker实现（库配置、无效引用、Prompt同步、图片同步、组合状态、字段完整性、孤立记录、重复检测）
  - 自动修复能力（安全问题自动修复）
  - Sync API（检查、修复、历史）
  - SyncDashboard & SyncCheckList组件
- **批量操作系统**（5 files）:
  - 批量删除API（级联删除选项）
  - Prompt导出（JSON/TXT/ZIP格式）
  - JSONExporter & ZIPBuilder工具类

### 1.5 待实现功能（Phase 6）

#### Phase 6: 测试与部署 ⬜
**预计时长**: 1.5周
**关键任务**:
- 单元测试（目标80%覆盖率）
- 集成测试（API端点）
- E2E测试（用户流程）
- Vercel部署配置
- nginx服务器设置（图片生成）
- 生产环境优化

### 1.6 与Flask系统对比

| 特性 | Flask (旧) | Next.js (新) | 状态 |
|------|-----------|-------------|------|
| **后端框架** | Python Flask | TypeScript Next.js | ✅ 已迁移 |
| **数据库** | JSON文件 | PostgreSQL + Prisma | ✅ 已迁移 |
| **前端框架** | Vanilla JS | React 19 + shadcn/ui | ✅ 已迁移 |
| **类型安全** | 无 | TypeScript全栈 | ✅ 已实现 |
| **UI组件** | 自定义CSS | shadcn/ui + Tailwind | ✅ 已实现 |
| **验证** | JSON Schema | Zod | ✅ 已实现 |
| **Template Engine** | Python模板 | TypeScript重写 | ✅ 已实现 |
| **图片生成** | Python SDK | REST API封装 + BullMQ | ✅ 已实现 |
| **批量任务** | Flask线程 | BullMQ队列 | ✅ 已实现 |
| **错误管理** | 无 | ErrorLogger + 分类系统 | ✅ 已实现 |
| **健康监控** | 无 | 统一健康检查 | ✅ 已实现 |
| **同步管理** | 无 | 8个检查器 + 自动修复 | ✅ 已实现 |
| **部署** | 手动 | Vercel + nginx | ⬜ 待实现 |

**Flask系统详细说明**: 参见 [LEGACY_FLASK_REFERENCE.md](./LEGACY_FLASK_REFERENCE.md)

### 1.7 下一步行动

**Phase 6 优先任务** (详见 [todo.md](./todo.md)):
1. 编写Template Engine单元测试（目标80%覆盖率）
2. 编写Generator单元测试
3. 编写Utility工具单元测试
4. 实现API端点集成测试
5. 编写E2E测试（库管理、Prompt生成、图片生成流程）
6. Vercel部署配置
7. nginx图片服务器设置
8. 性能优化与监控告警

**预计完成时间**: 1.5周（2025-12-02前）

---

## 2. 重构背景与目标

### 2.1 当前系统痛点

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

### 2.2 重构目标

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

## 3. 技术栈选型

### 3.1 决策总结

| 维度 | 现有技术 | 新技术 | 理由 |
|------|---------|--------|------|
| **后端框架** | Flask (Python) | Next.js 16 App Router | 全栈TypeScript，Serverless友好，丰富生态 |
| **数据库** | JSON文件 | PostgreSQL + Prisma ORM | 关系型数据库，强类型ORM，支持复杂查询 |
| **前端框架** | Vanilla JS | React 19 + Next.js | 组件化，状态管理，丰富生态 |
| **UI组件库** | 自定义CSS | shadcn/ui + Tailwind CSS | 现代化设计，可定制，轻量级 |
| **验证** | JSON Schema | Zod | TypeScript-first，与Prisma无缝集成 |
| **异步任务** | Flask后台线程 | Next.js Server Actions + 轮询 | 简化架构，无需额外队列 |
| **图片存储** | 本地文件系统 | 本地 + nginx静态服务 | 平滑迁移，未来可扩展至S3 |
| **AI Providers** | Python SDK | 直接REST API封装 | 减少依赖，完全控制 |
| **部署** | 无 | Vercel + 自托管nginx | Serverless主应用 + 长时间任务隔离 |
| **测试** | pytest (64%通过) | Vitest + Playwright | 全栈测试覆盖 |

---

## 4. 架构设计

### 4.1 整体架构图

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

### 4.2 三层架构模式

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

### 4.3 关键设计模式

#### Template Engine
- **架构**: Parser + Module System + Filter System
- **7个预定义模块**: character, pose, scene, theme, lighting, style, composition
- **语法支持**: `{{@module:xxx}}` (模块) + `{{library.field}}` (直接字段访问)
- **过滤器**: `join`, `join:` 用于数组格式化
- **变量系统**: 主图模板39个变量，Diff模板45个变量（7个命名空间）

#### AI Provider管理
- **Provider接口**: IImageProvider统一接口
- **Fallback机制**: 可配置的Provider链（如: Gemini → ByteDance）
- **健康监控**: 周期性健康检查与自动切换
- **尝试记录**: 数据库记录所有Provider尝试用于分析

#### 3-Round图片生成流程
1. **Round 1**: 使用主图Prompt生成主图（英文）
2. **Round 2**: 使用Diff Prompt + 主图作为上下文生成对比图（必须使用相同Provider）
3. **Round 3**: 拼接最终图片，叠加多语言文字（7种语言）

---

## 5. 数据库设计

### 5.1 核心表设计

详细Schema请参考 `prisma/schema.prisma`，以下是关键表结构：

#### Library表（库配置）
- **用途**: 存储6个库的配置和条目数据
- **关键字段**:
  - `name`: 库名称（character, pose, scene, theme, style, decorative_props）
  - `entries`: JSON字段存储库条目数组
  - `schema`: 可选JSON Schema定义

#### Record表（生成记录）
- **用途**: 记录每个图片生成任务的元数据
- **关键字段**:
  - `imageId`: 唯一图片ID（如: betty_turnback_living_halloween_retro50s_0001）
  - `libraryIds`: JSON字段存储所选库ID映射
  - `outfitMinorState`: 服装次要状态（颜色等）
  - `usedDecorations`: 使用的装饰物
  - `providerAttempts`: Provider尝试记录
  - `promptGenerated`, `imageGenerated`: 状态标志

#### Prompt表（Prompt文本）
- **用途**: 存储生成的中英文Prompt
- **类型**: MAIN（主图）/ DIFF（对比图）
- **字段**: promptCn（中文）, promptEn（英文）

#### ImageVariant表（图片版本）
- **用途**: 管理同一imageId的多个版本
- **字段**:
  - `version`: 版本号（1, 2, 3...）
  - `imageMainPath`, `imageDiffPath`: 主图和对比图路径
  - `finalImages`: JSON存储7种语言最终图片路径

#### Template表（模板）
- **用途**: 系统和用户自定义模板
- **类型**: SYSTEM / USER
- **分类**: MAIN（主图模板）/ DIFF（对比图模板）

### 5.2 数据迁移策略

#### 迁移范围（Clean Slate）
1. **完整迁移**:
   - 6个库JSON文件 → `Library`表（`entries`字段存储JSON）
   - 系统模板 → `Template`表

2. **不迁移**（从零开始）:
   - `records/*.json` → 不迁移
   - `prompts/*.txt` → 不迁移
   - `images/` → 保留文件，但数据库无历史记录

#### 迁移脚本
详见 `scripts/migrate-libraries.ts` - 使用Prisma Client的upsert操作迁移6个库的JSON数据到数据库。

---

## 6. API设计

### 6.1 API端点映射

详细映射请参考 **`API_MAPPING.md`**，这里列出核心端点分类：

#### 库管理（6个端点）
- `GET/POST /api/libraries` - 列表/创建库
- `GET/PUT/DELETE /api/libraries/[name]` - 获取/更新/删除库
- `GET /api/libraries/[name]/[id]` - 单个库条目操作
- `GET /api/libraries/config` - 获取库配置元数据

#### Prompt生成（3个端点）
- `POST /api/prompts/generate-main` - 生成主图Prompt
- `POST /api/prompts/generate-diff` - 生成Diff Prompt
- `POST /api/prompts/batch` - 批量生成

#### 图片生成（4个端点）
- `POST /api/images/generate/single` - 单个图片生成
- `POST /api/images/generate/batch` - 批量图片生成
- `POST /api/images/stitch` - 图片拼接
- `GET /api/images/progress/[imageId]` - 生成进度查询

#### 模板管理（5个端点）
- `GET/POST /api/templates` - 列表/创建模板
- `GET/PUT/DELETE /api/templates/[id]` - 获取/更新/删除模板
- `POST /api/templates/validate` - 验证模板语法

#### 工具端点（4个端点）
- `GET /api/health` - 系统健康检查
- `GET /api/providers/status` - Provider状态
- `GET /api/sync/check` - 同步检查
- `POST /api/sync/repair` - 自动修复

### 6.2 API设计原则

#### 统一响应格式

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

#### 请求验证
- 所有API端点使用Zod进行请求验证
- 验证Schema统一放在 `src/schemas/` 目录
- 具体实现参见 `src/schemas/api.schema.ts` 和各API route文件

---

## 7. 系统架构概述

### 7.1 Template Engine系统

#### 架构设计
- **核心组件**: TemplateParser（模板解析） + ModuleBuilder（模块构建） + FilterSystem（过滤器）
- **主图模板**: 7个预定义模块，39个可用变量
- **Diff模板**: 7个命名空间（main, outfit_state, new_outfit_state, color_changes, decorations, new_decorations, all_decorations），45个变量

#### 实现文件
- `src/lib/engines/template-engine.ts` - 主图Template引擎
- `src/lib/engines/diff-template-engine.ts` - Diff Template引擎
- `src/lib/engines/parser.ts` - 模板解析器
- `src/lib/engines/filters.ts` - 过滤器实现

#### 一致性保证
- 与Python版本输出完全一致
- 使用相同的随机种子机制
- 测试脚本: `scripts/test-consistency.ts`

### 7.2 AI Provider系统

#### Provider接口设计
- **IImageProvider接口**: 统一的图片生成接口
- **方法**: `generate(prompt, contextImage?)` 和 `healthCheck()`
- **实现**: GeminiProvider, BytedanceProvider

#### Provider Manager
- **Fallback机制**: 配置化的Provider链
- **健康监控**: 周期性检查Provider可用性
- **尝试记录**: 记录所有尝试到数据库用于分析
- **实现文件**: `src/lib/providers/provider-manager.ts`

### 7.3 图片生成流程

#### 3-Round生成架构
1. **Round 1 - 主图生成**:
   - 输入: 主图Prompt（英文）
   - 输出: 主图PNG
   - Provider: Fallback链中第一个成功的

2. **Round 2 - 对比图生成**:
   - 输入: Diff Prompt + 主图作为上下文
   - 输出: 对比图PNG
   - Provider: 必须与Round 1相同

3. **Round 3 - 图片拼接**:
   - 输入: 主图 + 对比图
   - 输出: 7种语言的最终图片
   - 技术: sharp库进行图片处理 + 多语言文字叠加

#### 实现文件
- `src/lib/generators/image-generator.ts` - 3轮生成协调
- `src/lib/stitcher/image-stitcher.ts` - 图片拼接
- `src/lib/stitcher/text-overlay.ts` - 文字叠加
- `src/lib/stitcher/languages.ts` - 7种语言配置

### 7.4 前端组件架构

#### Server Components vs Client Components
- **Server Components（默认）**: 所有静态页面和数据获取
- **Client Components（'use client'）**: 仅用于交互组件（表单、对话框、编辑器）
- **动态导入**: Monaco Editor等重型组件使用 `dynamic(() => import(), { ssr: false })`

#### 状态管理策略
- **React Query**: 服务器状态缓存与自动刷新
- **URL State**: 搜索参数和路由参数用于可共享状态
- **最小化Context使用**: 优先React Query管理服务器状态

#### UI组件库
- **shadcn/ui**: 22个预安装组件
- **基于**: Radix UI原语 + Tailwind CSS
- **定制**: 源码级定制，CSS变量主题系统

### 7.5 异步任务处理

#### 架构决策: Server Actions + 轮询
- **选择理由**: 简化架构，无需额外队列系统（如BullMQ）
- **适用场景**: Vercel Serverless环境，任务执行时间 < 10分钟
- **实现方式**:
  - 长任务通过Server Actions触发
  - 客户端使用轮询检查任务进度
  - 进度存储在数据库（ImageBatch表）

#### 未来扩展
- 如任务超过10分钟，可迁移至BullMQ + Redis
- 任务执行移至自托管服务器

### 7.6 部署架构

#### 双环境策略
1. **Vercel (Serverless)**:
   - Next.js主应用
   - API Routes
   - 静态页面
   - 限制: 10分钟执行时间

2. **自托管VPS (nginx)**:
   - 图片存储与服务
   - 长时间运行的图片生成任务（如需要）
   - nginx静态文件服务

#### 环境配置
- 开发环境: 本地Next.js + Docker PostgreSQL
- 生产环境: Vercel + VPS PostgreSQL + nginx
- 配置文件: `.env.example`（示例）, `.env.local`（本地）

---

## 8. 迁移计划

### 8.1 整体时间线

| 周次 | 阶段 | 任务 | 预计工作量 |
|-----|------|------|-----------|
| **Week 1-2** | Phase 0-1 | 项目初始化 + 数据层 | ✅ 已完成 |
| **Week 3-4** | Phase 2 | 核心API + Template Engine | ✅ 已完成 |
| **Week 5** | Phase 3 | UI层 + React组件 | ✅ 已完成 |
| **Week 6-7** | Phase 4 | 图片生成系统 | ✅ 已完成 |
| **Week 8** | Phase 5 | 高级功能 | ✅ 已完成 |
| **Week 9-10** | Phase 6 | 测试与部署 | 🔄 进行中 |

### 8.2 依赖关系

```
Phase 0 (项目初始化)
    ↓
Phase 1 (数据层) → Phase 2 (核心API)
    ↓                    ↓
    ↓                Template Engine
    ↓                    ↓
Phase 3 (UI层) ←────────┘
    ↓
Phase 4 (图片生成) → Provider System → Image Generator
    ↓
Phase 5 (高级功能) → Sync Manager → Batch Operations
    ↓
Phase 6 (测试与部署) → Unit Tests → E2E Tests → Production Deploy
```

### 8.3 并行任务策略

- Phase 2和Phase 3部分任务可并行（UI Mock数据）
- Phase 4的Provider实现可并行开发
- Phase 5的多个子系统可并行实现
- Phase 6的不同测试类型可并行编写

---

## 9. 风险评估与缓解

### 9.1 技术风险

| 风险 | 级别 | 影响 | 缓解策略 |
|------|------|------|---------|
| **Template Engine输出不一致** | 🔴 高 | 影响Prompt质量 | 编写一致性测试脚本，对比Python和TypeScript输出 |
| **AI Provider API限制** | 🟡 中 | 影响图片生成 | 实现Fallback机制，多Provider支持 |
| **Vercel 10分钟限制** | 🟡 中 | 长任务无法执行 | 使用Server Actions + 轮询，或迁移至VPS |
| **数据库迁移失败** | 🟢 低 | 需要重新迁移 | 使用Prisma Migrations，事务保证原子性 |
| **TypeScript学习曲线** | 🟢 低 | 开发效率 | 充分利用Copilot，参考Next.js文档 |

### 9.2 业务风险

| 风险 | 级别 | 影响 | 缓解策略 |
|------|------|------|---------|
| **功能缺失** | 🔴 高 | 用户体验下降 | 对照Flask系统功能清单逐一验证 |
| **性能下降** | 🟡 中 | 响应时间变慢 | 使用数据库索引，React Query缓存，代码分割 |
| **用户培训成本** | 🟢 低 | 需要用户适应新UI | 保持核心流程一致，提供操作指南 |

### 9.3 测试策略

#### 单元测试
- **目标覆盖率**: 80%
- **重点**: Template Engine, Generators, Utilities
- **工具**: Vitest
- **位置**: `tests/unit/`

#### 集成测试
- **范围**: API端点, 数据库操作
- **工具**: Vitest + Prisma Test Helpers
- **位置**: `tests/integration/`

#### E2E测试
- **场景**:
  - 库管理完整流程
  - Prompt生成流程
  - 图片生成流程
- **工具**: Playwright
- **位置**: `tests/e2e/`

---

## 10. 附录

### 10.1 相关文档

- **[todo.md](./todo.md)** - 详细任务清单和进度追踪
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - 数据库Schema详细设计
- **[API_MAPPING.md](./API_MAPPING.md)** - Flask → Next.js API端点映射
- **[LEGACY_FLASK_REFERENCE.md](./LEGACY_FLASK_REFERENCE.md)** - Flask系统参考文档

### 10.2 关键文件路径

#### 核心业务逻辑
- Template Engine: `src/lib/engines/template-engine.ts`
- Diff Template Engine: `src/lib/engines/diff-template-engine.ts`
- Provider Manager: `src/lib/providers/provider-manager.ts`
- Image Generator: `src/lib/generators/image-generator.ts`

#### 数据库
- Prisma Schema: `prisma/schema.prisma`
- 数据库Seed: `prisma/seed.ts`
- 迁移脚本: `scripts/migrate-libraries.ts`

#### API Routes
- 库管理: `src/app/api/libraries/`
- Prompt生成: `src/app/api/prompts/`
- 图片生成: `src/app/api/images/`
- 模板管理: `src/app/api/templates/`

#### 验证Schema
- API Schema: `src/schemas/api.schema.ts`
- Library Schema: `src/schemas/library.schema.ts`
- Prompt Schema: `src/schemas/prompt.schema.ts`
- Image Schema: `src/schemas/image.schema.ts`

### 10.3 开发命令参考

```bash
# 开发
npm run dev              # 启动开发服务器 (Turbopack)
npm run build            # 构建生产版本
npm start               # 启动生产服务器

# 数据库
npm run db:studio        # 打开Prisma Studio GUI
npm run db:migrate       # 运行数据库迁移
npm run db:seed          # 运行种子数据
npm run db:push          # 推送Schema更改（开发环境）

# 测试
npm test                # 运行所有测试
npm run test:unit       # 单元测试
npm run test:integration # 集成测试
npm run test:e2e        # E2E测试

# 代码质量
npm run lint            # 运行ESLint
npm run type-check      # TypeScript类型检查
npm run format          # Prettier格式化
```

---

**文档结束**

*本文档会随项目进展持续更新。最新版本请查看项目仓库。*
