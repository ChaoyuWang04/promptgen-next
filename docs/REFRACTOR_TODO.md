# PromptGen Next.js重构任务追踪清单
# REFRACTOR_TODO.md

**文档版本**: 1.1.0
**创建日期**: 2025-11-15
**最后更新**: 2025-11-16
**状态**: Phase 1 进行中

---

## 📊 项目概览

### 技术栈
- **前端**: Next.js 15 + React 19 + shadcn/ui + Tailwind CSS
- **后端**: Next.js API Routes + TypeScript
- **数据库**: PostgreSQL + Prisma ORM
- **验证**: Zod
- **测试**: Vitest + Playwright
- **部署**: Vercel + 自托管nginx

### 估算工作量
- **总时长**: 8-10周（全职）
- **总代码量**: ~8,000-10,000 LOC
- **核心Phases**: 7个阶段（Phase 0-6）

---

## 🎯 进度追踪

| Phase | 阶段名称 | 状态 | 预计时长 | 完成度 | 关键里程碑 |
|-------|---------|------|---------|--------|-----------|
| **Phase 0** | 项目初始化 | ✅ Complete | 2-3天 | 100% | Next.js项目搭建 |
| **Phase 1** | 数据层设计 | 🔄 In Progress | 1周 | 88% (7/8) | Prisma Schema完成 |
| **Phase 2** | 核心API | ⬜ Not Started | 1.5周 | 0% | 库管理+Prompt生成API |
| **Phase 3** | UI层 | ⬜ Not Started | 1周 | 0% | 主要页面完成 |
| **Phase 4** | 图片生成 | ⬜ Not Started | 1.5周 | 0% | 3轮生成流程 |
| **Phase 5** | 高级功能 | ⬜ Not Started | 1周 | 0% | 模板编辑器+同步 |
| **Phase 6** | 测试与部署 | ⬜ Not Started | 1.5周 | 0% | 生产环境上线 |

**总体进度**: 1.88/7 Phases 完成 (27%)

---

## Phase 0: 项目初始化 📦

**目标**: 搭建Next.js项目骨架，配置开发环境
**预计时长**: 2-3天
**状态**: ✅ **COMPLETE** (2025-11-16完成)

### 任务清单

#### 0.1 Next.js项目创建
- [x] **初始化Next.js 15项目** (30分钟) ✅
  ```bash
  npx create-next-app@latest promptgen-next --typescript --tailwind --app --src-dir
  cd promptgen-next
  ```
  - [x] 选择App Router
  - [x] 启用TypeScript
  - [x] 启用Tailwind CSS
  - [x] 使用`src/`目录
  - [x] 启用ESLint

#### 0.2 shadcn/ui安装与配置
- [x] **初始化shadcn/ui** (20分钟) ✅
  ```bash
  npx shadcn@latest init
  ```
  - 选择样式: `new-york`
  - 启用RSC: `yes`
  - Base color: `zinc`
  - CSS变量: `yes`

- [x] **安装常用组件** (30分钟) ✅ (已安装22个组件)
  ```bash
  npx shadcn@latest add button card dialog form input select
  npx shadcn@latest add table tabs toast dropdown-menu popover
  npx shadcn@latest add separator switch textarea accordion alert
  npx shadcn@latest add badge checkbox label progress
  ```

#### 0.3 依赖安装
- [ ] **安装生产依赖** (20分钟)
  ```bash
  npm install @prisma/client zod
  npm install sharp date-fns axios
  npm install @monaco-editor/react  # 模板编辑器
  ```

- [ ] **安装开发依赖** (20分钟)
  ```bash
  npm install -D prisma @types/node
  npm install -D vitest @vitejs/plugin-react
  npm install -D @playwright/test
  npm install -D eslint-config-prettier prettier
  ```

#### 0.4 TypeScript配置
- [ ] **配置tsconfig.json** (15分钟)
  - 启用严格模式
  - 配置路径别名（@/\*）
  - 启用增量编译

- [ ] **创建types目录结构** (10分钟)
  ```
  src/types/
  ├── library.types.ts
  ├── prompt.types.ts
  ├── image.types.ts
  ├── template.types.ts
  └── api.types.ts
  ```

#### 0.5 项目目录结构创建
- [ ] **创建核心目录** (20分钟)
  ```bash
  mkdir -p src/app/api/{libraries,generate,images,templates,sync,providers}
  mkdir -p src/app/\(dashboard\)/{libraries,prompts,images,templates,sync}
  mkdir -p src/components/{ui,library,prompt,image,template,sync,shared}
  mkdir -p src/lib/{db,engines,providers,generators,sync,stitcher,utils}
  mkdir -p src/schemas
  mkdir -p src/config
  mkdir -p tests/{unit,integration,e2e}
  mkdir -p scripts
  mkdir -p prisma
  ```

#### 0.6 环境变量配置
- [ ] **创建.env.example** (10分钟)
  ```env
  # Database
  DATABASE_URL="postgresql://user:password@localhost:5432/promptgen_dev"

  # AI Providers
  GEMINI_API_KEY="your_gemini_key_here"
  GEMINI_MODEL="gemini-2.5-flash-image"
  BYTEDANCE_API_KEY="your_bytedance_key_here"
  BYTEDANCE_MODEL="doubao-seedream-4-0-250828"
  IMAGE_PROVIDERS="gemini,bytedance"

  # Image Worker (for production)
  IMAGE_WORKER_URL="http://localhost:3001"

  # Next.js
  NEXT_PUBLIC_APP_URL="http://localhost:3000"
  ```

- [ ] **创建.env.local** (5分钟)
  - 复制.env.example
  - 填入真实API密钥

#### 0.7 配置文件设置
- [ ] **配置next.config.ts** (15分钟)
  ```typescript
  import type { NextConfig } from 'next';

  const nextConfig: NextConfig = {
    images: {
      domains: ['localhost'],  // 开发环境
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '**.supabase.co',  // 生产环境
        }
      ]
    },
    experimental: {
      serverActions: {
        bodySizeLimit: '10mb'  // 支持大文件上传
      }
    }
  };

  export default nextConfig;
  ```

- [ ] **配置prettier** (10分钟)
  ```json
  {
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "tabWidth": 2,
    "printWidth": 100
  }
  ```

- [ ] **配置ESLint** (10分钟)
  - 添加prettier集成
  - 配置TypeScript规则

#### 0.8 测试框架配置
- [ ] **配置Vitest** (20分钟)
  ```typescript
  // vitest.config.ts
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react';
  import path from 'path';

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts']
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  });
  ```

- [ ] **配置Playwright** (20分钟)
  ```bash
  npm init playwright@latest
  ```

#### 0.9 验证安装
- [ ] **运行开发服务器** (5分钟)
  ```bash
  npm run dev
  ```
  访问 http://localhost:3000 验证

- [ ] **运行Lint** (5分钟)
  ```bash
  npm run lint
  ```

- [ ] **构建测试** (5分钟)
  ```bash
  npm run build
  ```

### ✅ 完成情况 (2025-11-16)
**所有子任务已完成 (9/9)**:
- ✅ 0.1-0.2: Next.js 15.1.8 + shadcn/ui (22组件)
- ✅ 0.3: 所有依赖安装完成 (React 19.2.0, Prisma 6.0)
- ✅ 0.4: TypeScript严格模式配置
- ✅ 0.5: 完整目录结构创建
- ✅ 0.6: 环境变量配置 (.env, .env.example)
- ✅ 0.7: 所有配置文件 (next.config, prettier, eslint)
- ✅ 0.8: Vitest + Playwright测试框架
- ✅ 0.9: 开发服务器验证通过 (http://localhost:3000)

### 完成标准
- ✅ Next.js开发服务器正常运行
- ✅ shadcn/ui组件可用
- ✅ TypeScript无错误
- ✅ 测试框架配置完成
- ✅ Git仓库初始化

### 依赖关系
- **前置任务**: 无
- **后续任务**: Phase 1 数据层设计

---

## Phase 1: 数据层设计 🗄️

**目标**: 设计并实现Prisma Schema，创建Zod验证Schema
**预计时长**: 1周
**状态**: 🔄 **IN PROGRESS** - 7/8任务完成 (88%)

### 任务清单

#### 1.1 Docker PostgreSQL Setup ✅
- [x] **创建docker-compose.yml** (10分钟) ✅
- [x] **配置DATABASE_URL** (5分钟) ✅
- [x] **启动PostgreSQL容器** ✅ (promptgen-postgres运行中)

#### 1.2 Prisma Schema设计 ✅
- [x] **设计完整Prisma Schema** (2小时) ✅
- [x] **7个模型**: Library, Record, Prompt, ImageVariant, Template, ImageBatch, ErrorLog
- [x] **4个枚举**: PromptType, TemplateType, TemplateCategory, BatchStatus

#### 1.3 Prisma迁移 ✅
- [x] **同步数据库schema** (使用prisma db push) ✅
- [x] **生成Prisma Client v6.19.0** ✅

#### 1.4 Prisma客户端封装 ✅
- [x] **创建Prisma单例** `src/lib/db/prisma.ts` ✅
- [x] **配置日志** (dev/prod环境)✅

#### 1.5 Zod Schema设计 ✅
- [x] **创建5个Zod Schema文件** (~500 LOC) ✅:
  - library.schema.ts (140 lines)
  - record.schema.ts (110 lines)
  - prompt.schema.ts (45 lines)
  - template.schema.ts (50 lines)
  - api.schema.ts (155 lines)

#### 1.6 数据迁移脚本 ✅
- [x] **编写库迁移脚本** `scripts/migrate-libraries.ts` (185 lines) ✅

#### 1.7 Seed数据 ✅
- [x] **创建seed脚本** `prisma/seed.ts` (150 lines) ✅
- [x] **运行seed成功** ✅ (2个系统模板已创建)
- [x] **迁移6个库JSON文件** ✅ (14个库条目已导入)

#### 1.8 测试数据库连接 ⏭️
- [ ] **编写数据库集成测试** (20分钟) **→ 延期至Phase 6**
  ```bash
  npx prisma init
  ```

- [ ] **配置DATABASE_URL** (5分钟)
  - 设置PostgreSQL连接字符串

#### 1.2 Prisma Schema设计
- [ ] **设计Library表** (30分钟)
  ```prisma
  model Library {
    id          String   @id @default(cuid())
    name        String   @unique
    displayName String
    entries     Json
    schema      Json?
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    @@index([name])
  }
  ```

- [ ] **设计Record表** (45分钟)
  ```prisma
  model Record {
    id                String   @id @default(cuid())
    imageId           String   @unique
    libraryIds        Json
    outfitMinorState  Json
    usedDecorations   Json
    prompts           Prompt[]
    variants          ImageVariant[]
    providerUsed      String?
    providerAttempts  Json
    promptGenerated   Boolean  @default(false)
    imageGenerated    Boolean  @default(false)
    createdAt         DateTime @default(now())
    updatedAt         DateTime @updatedAt

    @@index([imageId])
    @@index([promptGenerated, imageGenerated])
  }
  ```

- [ ] **设计Prompt表** (20分钟)
  ```prisma
  model Prompt {
    id         String     @id @default(cuid())
    recordId   String
    record     Record     @relation(fields: [recordId], references: [id], onDelete: Cascade)
    type       PromptType
    promptCn   String     @db.Text
    promptEn   String     @db.Text
    createdAt  DateTime   @default(now())
    updatedAt  DateTime   @updatedAt

    @@index([recordId, type])
  }

  enum PromptType {
    MAIN
    DIFF
  }
  ```

- [ ] **设计ImageVariant表** (20分钟)
  ```prisma
  model ImageVariant {
    id              String   @id @default(cuid())
    recordId        String
    record          Record   @relation(fields: [recordId], references: [id], onDelete: Cascade)
    version         Int
    imageMainPath   String?
    imageDiffPath   String?
    finalImages     Json?
    generatedAt     DateTime @default(now())

    @@unique([recordId, version])
    @@index([recordId])
  }
  ```

- [ ] **设计Template表** (20分钟)
  ```prisma
  model Template {
    id          String           @id @default(cuid())
    name        String
    description String?
    type        TemplateType
    category    TemplateCategory
    content     String           @db.Text
    createdAt   DateTime         @default(now())
    updatedAt   DateTime         @updatedAt

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

- [ ] **设计ImageBatch表（异步任务追踪）** (15分钟)
  ```prisma
  model ImageBatch {
    id          String       @id @default(cuid())
    imageIds    Json
    totalImages Int
    completed   Int          @default(0)
    failed      Int          @default(0)
    status      BatchStatus  @default(PENDING)
    createdAt   DateTime     @default(now())
    updatedAt   DateTime     @updatedAt
  }

  enum BatchStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    FAILED
  }
  ```

#### 1.3 Prisma迁移
- [ ] **创建初始迁移** (10分钟)
  ```bash
  npx prisma migrate dev --name init
  ```

- [ ] **生成Prisma Client** (5分钟)
  ```bash
  npx prisma generate
  ```

#### 1.4 Prisma客户端封装
- [ ] **创建Prisma单例** (15分钟)
  ```typescript
  // src/lib/db/prisma.ts
  import { PrismaClient } from '@prisma/client';

  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
  };

  export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
  ```

#### 1.5 Zod Schema设计
- [ ] **创建Library Schema** (30分钟)
  ```typescript
  // src/schemas/library.schema.ts
  import { z } from 'zod';

  export const LibraryEntrySchema = z.object({
    id: z.string(),
    name: z.string(),
    // 根据库类型动态扩展...
  });

  export const LibrarySchema = z.object({
    name: z.enum(['character', 'pose', 'scene', 'theme', 'style', 'decorative_props']),
    displayName: z.string(),
    entries: z.record(LibraryEntrySchema)
  });
  ```

- [ ] **创建Prompt Schema** (20分钟)
  ```typescript
  // src/schemas/prompt.schema.ts
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
  ```

- [ ] **创建Image Schema** (20分钟)
  ```typescript
  // src/schemas/image.schema.ts
  import { z } from 'zod';

  export const GenerateImageRequestSchema = z.object({
    image_ids: z.array(z.string()),
    language_ids: z.array(z.number().min(1).max(7)).default([1, 2, 3, 4, 5, 6, 7])
  });
  ```

- [ ] **创建Template Schema** (20分钟)
  ```typescript
  // src/schemas/template.schema.ts
  import { z } from 'zod';

  export const TemplateSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(['SYSTEM', 'USER']),
    category: z.enum(['MAIN', 'DIFF']),
    content: z.string().min(1)
  });
  ```

- [ ] **创建API响应Schema** (30分钟)
  ```typescript
  // src/schemas/api.schema.ts
  import { z } from 'zod';

  export const SuccessResponseSchema = z.object({
    success: z.literal(true),
    data: z.any(),
    message: z.string().optional()
  });

  export const ErrorResponseSchema = z.object({
    success: z.literal(false),
    error: z.object({
      code: z.enum(['VALIDATION_ERROR', 'NOT_FOUND', 'INTERNAL_ERROR', 'UNAUTHORIZED']),
      message: z.string(),
      details: z.any().optional()
    })
  });
  ```

#### 1.6 数据迁移脚本
- [ ] **编写库迁移脚本** (1小时)
  ```typescript
  // scripts/migrate-libraries.ts
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
      const filePath = path.join(__dirname, '../data', config.file);
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

- [ ] **运行迁移脚本** (10分钟)
  ```bash
  npx tsx scripts/migrate-libraries.ts
  ```

#### 1.7 Seed数据
- [ ] **创建seed脚本** (30分钟)
  ```typescript
  // prisma/seed.ts
  import { PrismaClient } from '@prisma/client';

  const prisma = new PrismaClient();

  async function main() {
    // 创建系统模板
    await prisma.template.createMany({
      data: [
        {
          name: 'template_default_v1',
          description: '官方默认主图模板',
          type: 'SYSTEM',
          category: 'MAIN',
          content: '角色：{{@module:character}}\n场景：{{@module:scene}}...'
        },
        {
          name: 'diff_template_default_v1',
          description: '官方默认对比图模板',
          type: 'SYSTEM',
          category: 'DIFF',
          content: '基于{{main.image_id}}的修改...'
        }
      ]
    });
  }

  main()
    .then(() => prisma.$disconnect())
    .catch(console.error);
  ```

- [ ] **配置package.json seed命令** (5分钟)
  ```json
  {
    "prisma": {
      "seed": "tsx prisma/seed.ts"
    }
  }
  ```

- [ ] **运行seed** (5分钟)
  ```bash
  npx prisma db seed
  ```

#### 1.8 测试数据库连接
- [ ] **编写数据库测试** (20分钟)
  ```typescript
  // tests/integration/db/prisma.test.ts
  import { describe, it, expect } from 'vitest';
  import { prisma } from '@/lib/db/prisma';

  describe('Prisma Database Connection', () => {
    it('should connect to database', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as result`;
      expect(result).toBeDefined();
    });

    it('should query libraries', async () => {
      const libraries = await prisma.library.findMany();
      expect(libraries.length).toBe(6);
    });
  });
  ```

### ✅ 完成情况 (2025-11-16)
**已完成 7/8 任务 (88%)**:
- ✅ 1.1: Docker PostgreSQL运行中 (postgres:16-alpine)
- ✅ 1.2: Prisma Schema完成 (170 lines, 7 models, 4 enums)
- ✅ 1.3: 数据库schema同步成功
- ✅ 1.4: Prisma Client单例创建
- ✅ 1.5: 5个Zod Schema文件 (~500 LOC)
- ✅ 1.6: 库迁移脚本编写
- ✅ 1.7: 数据迁移完成 (6库14条目 + 2个系统模板)
- ⏭️ 1.8: 数据库集成测试 **延期至Phase 6**

**数据库状态**:
- 📊 8个表已创建 (Library, Record, Prompt, ImageVariant, Template, ImageBatch, ErrorLog, _prisma_migrations)
- 📚 6个库已导入 (character, pose, scene, theme, style, decorative_props)
- 📝 2个系统模板已创建 (template_default_v1, diff_template_default_v1)
- ✅ PostgreSQL健康检查通过

### 完成标准
- ✅ Prisma Schema定义完整
- ✅ 数据库迁移成功
- ✅ 6个库JSON已导入数据库
- ✅ Zod Schema全部定义
- ⏭️ 数据库连接测试通过 (延期至Phase 6集中测试)

### 依赖关系
- **前置任务**: Phase 0 项目初始化 ✅
- **后续任务**: Phase 2 核心API

---

## Phase 2: 核心API 🔌

**目标**: 实现库管理、Prompt生成、Template Engine核心API
**预计时长**: 1.5周
**状态**: ⬜ Not Started

### 任务清单

#### 2.1 库管理API（6个端点）

##### 2.1.1 GET /api/libraries/config
- [ ] **实现config端点** (30分钟)
  ```typescript
  // src/app/api/libraries/config/route.ts
  import { NextResponse } from 'next/server';
  import { LIBRARY_CONFIG } from '@/config/library-config';

  export async function GET() {
    return NextResponse.json({
      success: true,
      data: {
        enabled_libraries: LIBRARY_CONFIG,
        total_count: LIBRARY_CONFIG.length
      }
    });
  }
  ```

##### 2.1.2 GET /api/libraries/[name]
- [ ] **实现库列表查询** (45分钟)
  ```typescript
  // src/app/api/libraries/[name]/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/db/prisma';

  export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> }
  ) {
    const { name } = await params;

    const library = await prisma.library.findUnique({
      where: { name }
    });

    if (!library) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Library ${name} not found`
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: library.entries
    });
  }
  ```

##### 2.1.3 POST /api/libraries/[name]
- [ ] **实现添加库条目** (1小时)
  - Zod验证
  - 唯一性检查
  - JSON更新逻辑

##### 2.1.4 PUT /api/libraries/[name]/[id]
- [ ] **实现更新库条目** (45分钟)
  - 查找条目
  - 更新JSON
  - 返回更新后数据

##### 2.1.5 DELETE /api/libraries/[name]/[id]
- [ ] **实现删除库条目** (30分钟)
  - 依赖检查（是否有Record引用）
  - 删除逻辑
  - 级联处理

##### 2.1.6 GET /api/libraries/[name]/template
- [ ] **实现模板生成** (30分钟)
  - 基于JSON Schema生成空模板
  - 返回默认值

#### 2.2 Template Engine核心逻辑

##### 2.2.1 模板解析器
- [ ] **实现TemplateParser类** (2小时)
  ```typescript
  // src/lib/engines/parser.ts
  export class TemplateParser {
    parse(template: string): Token[] {
      // 正则匹配 {{...}}
      const regex = /\{\{([^}]+)\}\}/g;
      const tokens: Token[] = [];

      let match;
      while ((match = regex.exec(template)) !== null) {
        const content = match[1].trim();

        if (content.startsWith('@module:')) {
          // {{@module:character}}
          tokens.push({
            type: 'module',
            moduleName: content.replace('@module:', ''),
            raw: match[0]
          });
        } else if (content.includes('|')) {
          // {{field | join:', '}}
          const [path, filterChain] = content.split('|').map(s => s.trim());
          tokens.push({
            type: 'field',
            path,
            filterChain,
            raw: match[0]
          });
        } else {
          // {{field}}
          tokens.push({
            type: 'field',
            path: content,
            raw: match[0]
          });
        }
      }

      return tokens;
    }
  }
  ```

##### 2.2.2 Template Engine主类
- [ ] **实现TemplateEngine类** (4小时)
  ```typescript
  // src/lib/engines/template-engine.ts
  export class TemplateEngine {
    async renderTemplate(
      template: string,
      librarySelections: Record<string, string>,
      seed?: number
    ): Promise<string> {
      // 1. 解析模板
      const tokens = this.parser.parse(template);

      // 2. 加载库数据
      const libraryData = await this.loadLibraryData(librarySelections);

      // 3. 构建上下文
      const context = this.buildContext(libraryData, seed);

      // 4. 渲染
      let result = template;
      for (const token of tokens) {
        const value = await this.resolveToken(token, context, seed);
        result = result.replace(token.raw, value);
      }

      return result;
    }

    // 7个模块构建器
    private buildCharacterModule(character: any, seed?: number): string { }
    private buildPoseModule(pose: any, seed?: number): string { }
    private buildSceneModule(scene: any, seed?: number): string { }
    private buildThemeModule(theme: any, seed?: number): string { }
    private buildLightingModule(style: any, seed?: number): string { }
    private buildStyleModule(style: any, seed?: number): string { }
    private buildCompositionModule(data: any, seed?: number): string { }
  }
  ```

- [ ] **实现7个模块构建器** (6小时)
  - 逐一迁移Python版本逻辑
  - 保持输出格式一致性
  - 支持随机种子

##### 2.2.3 过滤器系统
- [ ] **实现过滤器** (1小时)
  ```typescript
  // src/lib/engines/filters.ts
  export function applyFilters(value: any, filterChain: string): string {
    const filters = parseFilterChain(filterChain);

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
          return value.join(filter.args[0] || ', ');
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

##### 2.2.4 Diff Template Engine
- [ ] **实现DiffTemplateEngine类** (3小时)
  ```typescript
  // src/lib/engines/diff-template-engine.ts
  export class DiffTemplateEngine extends TemplateEngine {
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

      // 2. 构建7个命名空间
      const context = {
        main: this.buildMainContext(record),
        outfit_state: this.extractOutfitState(record),
        new_outfit_state: this.generateNewOutfitState(record),
        color_changes: this.computeColorChanges(record),
        decorations: this.extractDecorations(record),
        new_decorations: this.generateNewDecorations(seed),
        all_decorations: []
      };

      // 3. 渲染
      return super.renderTemplate(template, context, seed);
    }
  }
  ```

#### 2.3 Prompt生成API（8个端点）

##### 2.3.1 POST /api/generate/main
- [ ] **实现主图Prompt生成** (1.5小时)
  ```typescript
  // src/app/api/generate/main/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { GenerateMainRequestSchema } from '@/schemas/prompt.schema';
  import { PromptGenerator } from '@/lib/generators/prompt-generator';

  export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      const validatedData = GenerateMainRequestSchema.parse(body);

      const generator = new PromptGenerator();
      const result = await generator.generateMain(validatedData.library_ids);

      return NextResponse.json({
        success: true,
        data: result
      });
    } catch (error) {
      // 错误处理...
    }
  }
  ```

##### 2.3.2 POST /api/generate/diff
- [ ] **实现Diff Prompt生成** (1小时)
  - 自动模式（随机改色+装饰）
  - 验证image_id存在
  - 调用DiffTemplateEngine

##### 2.3.3 POST /api/generate/diff/custom
- [ ] **实现自定义Diff生成** (1小时)
  - 手动选择改色
  - 手动选择装饰
  - 验证输入合法性

##### 2.3.4 POST /api/generate/batch
- [ ] **实现批量Prompt生成** (2小时)
  - 异步任务创建
  - 进度追踪
  - 错误收集

##### 2.3.5 GET /api/generate/batch/progress
- [ ] **实现进度查询** (30分钟)
  - 查询批次状态
  - 返回进度百分比
  - 返回错误列表

#### 2.4 Prompt Generator业务逻辑
- [ ] **实现PromptGenerator类** (3小时)
  ```typescript
  // src/lib/generators/prompt-generator.ts
  export class PromptGenerator {
    private templateEngine: TemplateEngine;

    async generateMain(libraryIds: Record<string, string>, templateId?: string) {
      // 1. 加载模板
      const template = await this.loadTemplate(templateId);

      // 2. 生成image_id
      const imageId = generateImageId(libraryIds);

      // 3. 渲染模板
      const promptCn = await this.templateEngine.renderTemplate(
        template.content,
        libraryIds
      );

      // 4. 翻译为英文（可选，或直接使用英文模板）
      const promptEn = await this.translateToEnglish(promptCn);

      // 5. 创建记录
      const record = await prisma.record.create({
        data: {
          imageId,
          libraryIds,
          outfitMinorState: await this.extractOutfitState(libraryIds),
          usedDecorations: { from_theme: [], from_scene: [] },
          promptGenerated: true,
          prompts: {
            create: {
              type: 'MAIN',
              promptCn,
              promptEn
            }
          }
        },
        include: { prompts: true }
      });

      return record;
    }
  }
  ```

#### 2.5 单元测试
- [ ] **Template Engine测试** (2小时)
  - 测试模板解析
  - 测试7个模块输出
  - 测试过滤器
  - **关键**: 输出一致性测试（与Python版本对比）

- [ ] **Diff Template Engine测试** (1.5小时)
  - 测试7个命名空间
  - 测试颜色变化计算
  - 测试装饰合并

- [ ] **API端点测试** (2小时)
  - 测试所有库管理端点
  - 测试Prompt生成端点
  - 测试错误处理

### 完成标准
- ✅ 库管理API 6个端点全部实现
- ✅ Prompt生成API 5个端点实现
- ✅ Template Engine与Python版本输出100%一致（至少100个随机种子测试）
- ✅ Diff Template Engine输出正确
- ✅ 单元测试覆盖率 > 80%

### 依赖关系
- **前置任务**: Phase 1 数据层设计
- **后续任务**: Phase 3 UI层

---

## Phase 3: UI层 🎨

**目标**: 使用shadcn/ui构建主要页面和组件
**预计时长**: 1周
**状态**: ⬜ Not Started

### 任务清单

#### 3.1 Dashboard主页
- [ ] **创建Dashboard布局** (1小时)
  ```typescript
  // src/app/(dashboard)/layout.tsx
  export default function DashboardLayout({
    children
  }: {
    children: React.ReactNode
  }) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Header />
          {children}
        </main>
      </div>
    );
  }
  ```

- [ ] **实现Sidebar导航** (1.5小时)
  - 库管理链接
  - Prompt生成链接
  - 图片管理链接
  - 模板编辑器链接
  - 同步管理链接

- [ ] **实现Header组件** (45分钟)
  - Logo
  - 面包屑导航
  - 用户菜单（可选）

- [ ] **创建Dashboard页面** (2小时)
  - 统计卡片（总记录数、已生成图片数、待生成数）
  - 最近记录列表
  - 快捷操作按钮

#### 3.2 库管理页面
- [ ] **创建库列表页** (1.5小时)
  ```typescript
  // src/app/(dashboard)/libraries/page.tsx
  - 6个库的卡片展示
  - 每个库显示条目数量
  - 点击进入库详情
  ```

- [ ] **创建库详情页** (3小时)
  ```typescript
  // src/app/(dashboard)/libraries/[name]/page.tsx
  - 表格展示所有条目
  - 搜索与筛选
  - 添加/编辑/删除按钮
  - 分页
  ```

- [ ] **实现LibraryForm组件** (4小时)
  - 动态表单生成（基于Zod Schema）
  - 嵌套对象支持
  - 数组字段支持
  - 实时验证

- [ ] **实现LibraryTable组件** (2小时)
  - 使用shadcn/ui Table
  - 排序功能
  - 行选择
  - 操作列（编辑/删除）

#### 3.3 Prompt生成页面
- [ ] **创建主图生成页** (3小时)
  ```typescript
  // src/app/(dashboard)/prompts/page.tsx
  - 5个库的选择器（下拉框）
  - 模板选择（可选）
  - 生成按钮
  - 实时预览Prompt
  ```

- [ ] **创建Diff生成页** (2.5小时)
  ```typescript
  // src/app/(dashboard)/prompts/diff/page.tsx
  - 选择已有主图
  - 自动/自定义模式切换
  - 改色选择器
  - 装饰选择器
  - 生成预览
  ```

- [ ] **实现PromptPreview组件** (1.5小时)
  - Markdown渲染
  - 语法高亮
  - 复制按钮

#### 3.4 图片管理页面
- [ ] **创建图片列表页** (3小时)
  ```typescript
  // src/app/(dashboard)/images/page.tsx
  - 网格布局展示
  - 筛选器（已生成/未生成/失败）
  - 批量生成按钮
  - 批量生成进度条
  ```

- [ ] **创建图片详情页** (2小时)
  ```typescript
  // src/app/(dashboard)/images/[id]/page.tsx
  - 显示主图、对比图、最终图
  - 7种语言切换
  - 版本历史
  - 重新生成按钮
  ```

- [ ] **实现BatchImageModal组件** (2.5小时)
  - 选择要生成的组合
  - 库筛选器
  - 语言选择
  - 进度追踪

#### 3.5 模板编辑器页面
- [ ] **创建模板列表页** (1.5小时)
  - 系统模板（只读）
  - 用户模板（可编辑）
  - 新建按钮

- [ ] **创建模板编辑页** (4小时)
  ```typescript
  // src/app/(dashboard)/templates/[id]/edit/page.tsx
  - Monaco Editor集成
  - 自动补全（{{触发）
  - 实时预览
  - 验证按钮
  - 保存按钮
  ```

- [ ] **实现TemplateEditor组件** (3小时)
  - Monaco Editor配置
  - 自定义语言支持
  - 主题切换

- [ ] **实现VariableAutocomplete** (2小时)
  - 39个变量（主图）/ 45个变量（Diff）
  - 变量描述
  - 过滤器提示

#### 3.6 共享组件
- [ ] **ErrorBoundary组件** (1小时)
  - 捕获React错误
  - 友好错误页面
  - 错误上报（可选）

- [ ] **LoadingSpinner组件** (30分钟)
  - 全局加载动画
  - 骨架屏（Skeleton）

- [ ] **Toaster组件** (45分钟)
  - 使用shadcn/ui Toast
  - 成功/错误/警告通知
  - 自动消失

#### 3.7 响应式设计
- [ ] **移动端适配** (2小时)
  - Sidebar折叠
  - 表格横向滚动
  - 按钮大小调整

### 完成标准
- ✅ 所有主要页面实现
- ✅ shadcn/ui组件正确使用
- ✅ 响应式设计在移动端可用
- ✅ 无TypeScript错误
- ✅ 无Accessibility警告

### 依赖关系
- **前置任务**: Phase 2 核心API
- **后续任务**: Phase 4 图片生成

---

## Phase 4: 图片生成系统 🖼️

**目标**: 实现AI Provider、3轮生成流程、图片拼接
**预计时长**: 1.5周
**状态**: ⬜ Not Started

### 任务清单

#### 4.1 Provider系统

##### 4.1.1 Provider接口定义
- [ ] **定义IImageProvider接口** (30分钟)
  ```typescript
  // src/lib/providers/types.ts
  export interface IImageProvider {
    generate(prompt: string, contextImage?: Buffer): Promise<Buffer>;
    healthCheck(): Promise<boolean>;
  }
  ```

##### 4.1.2 Gemini Provider
- [ ] **实现GeminiProvider** (2小时)
  ```typescript
  // src/lib/providers/gemini.ts
  export class GeminiProvider implements IImageProvider {
    async generate(prompt: string, contextImage?: Buffer): Promise<Buffer> {
      // 调用Gemini API
      // 处理响应
      // 返回图片Buffer
    }

    async healthCheck(): Promise<boolean> {
      // 测试API key有效性
    }
  }
  ```

- [ ] **单元测试** (1小时)

##### 4.1.3 ByteDance Provider
- [ ] **实现BytedanceProvider** (2小时)
  ```typescript
  // src/lib/providers/bytedance.ts
  export class BytedanceProvider implements IImageProvider {
    async generate(prompt: string, contextImage?: Buffer): Promise<Buffer> {
      // 调用ByteDance API
    }
  }
  ```

- [ ] **单元测试** (1小时)

##### 4.1.4 Provider Manager
- [ ] **实现ProviderManager** (3小时)
  ```typescript
  // src/lib/providers/provider-manager.ts
  export class ProviderManager {
    async generateWithFallback(
      prompt: string,
      contextImage?: Buffer
    ): Promise<{ image: Buffer; provider: string }> {
      // 按fallback chain顺序尝试
      // 记录成功/失败
      // 返回结果
    }

    async checkHealth(): Promise<Record<string, boolean>> {
      // 检查所有Provider健康状态
    }
  }
  ```

- [ ] **集成测试** (1.5小时)

#### 4.2 Image Generator核心逻辑

##### 4.2.1 ImageGenerator类
- [ ] **实现3轮生成流程** (4小时)
  ```typescript
  // src/lib/generators/image-generator.ts
  export class ImageGenerator {
    async generateThreeRounds(
      imageId: string,
      languageIds: number[]
    ): Promise<void> {
      // Round 1: 生成主图
      const { image: mainImage, provider } = await this.providerManager.generateWithFallback(mainPrompt);

      // Round 2: 生成对比图（强制同一Provider）
      const diffImage = await this.generateWithSameProvider(diffPrompt, mainImage, provider);

      // Round 3: 拼接最终图
      for (const langId of languageIds) {
        await this.stitcher.stitch({...});
      }

      // 更新数据库
    }
  }
  ```

##### 4.2.2 批量生成协调器
- [ ] **实现BatchImageGenerator** (2小时)
  ```typescript
  // src/lib/generators/batch-image-generator.ts
  export class BatchImageGenerator {
    async generateBatch(imageIds: string[], languageIds: number[]) {
      // 创建批次记录
      // 逐个生成
      // 更新进度
      // 错误处理
    }
  }
  ```

#### 4.3 图片拼接系统

##### 4.3.1 ImageStitcher类
- [ ] **使用sharp实现拼接** (3小时)
  ```typescript
  // src/lib/stitcher/image-stitcher.ts
  import sharp from 'sharp';

  export class ImageStitcher {
    async stitch({
      mainImagePath,
      diffImagePath,
      outputPath,
      languageId
    }: StitchOptions): Promise<string> {
      // 1. 加载两张图片
      const mainBuffer = await fs.readFile(mainImagePath);
      const diffBuffer = await fs.readFile(diffImagePath);

      // 2. 横向拼接
      const combined = await sharp({
        create: {
          width: 2048,  // 1024 * 2
          height: 1024,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
        .composite([
          { input: mainBuffer, left: 0, top: 0 },
          { input: diffBuffer, left: 1024, top: 0 }
        ])
        .png()
        .toBuffer();

      // 3. 添加文字叠加
      const withText = await this.addTextOverlay(combined, languageId);

      // 4. 保存
      await fs.writeFile(outputPath, withText);

      return outputPath;
    }
  }
  ```

##### 4.3.2 多语言文字叠加
- [ ] **实现TextOverlay** (2小时)
  ```typescript
  // src/lib/stitcher/text-overlay.ts
  export class TextOverlay {
    async addText(
      imageBuffer: Buffer,
      languageId: number
    ): Promise<Buffer> {
      // 获取文字模板
      const template = this.getTextTemplate(languageId);

      // 使用sharp添加文字
      const svg = `
        <svg width="2048" height="100">
          <text x="1024" y="50" text-anchor="middle" font-size="48">
            ${template}
          </text>
        </svg>
      `;

      return sharp(imageBuffer)
        .composite([{
          input: Buffer.from(svg),
          top: 50,
          left: 0
        }])
        .png()
        .toBuffer();
    }
  }
  ```

#### 4.4 API端点实现

##### 4.4.1 POST /api/images/generate/single
- [ ] **实现单张图片生成** (1小时)
  - 接收image_id
  - 调用ImageGenerator
  - 返回任务ID

##### 4.4.2 POST /api/images/generate/batch
- [ ] **实现批量图片生成** (1.5小时)
  - 接收image_ids + library_filter
  - 创建批次
  - 异步执行
  - 返回batch_id

##### 4.4.3 GET /api/images/generate/batch/[batchId]/progress
- [ ] **实现进度查询** (45分钟)
  - 查询批次状态
  - 返回完成数/失败数
  - 返回错误列表

##### 4.4.4 POST /api/images/stitch
- [ ] **实现手动拼接** (1小时)
  - 接收main_path + diff_path
  - 调用Stitcher
  - 返回最终图路径

##### 4.4.5 GET /api/images/stats
- [ ] **实现统计信息** (30分钟)
  - 总图片数
  - 已生成数
  - 失败数
  - Provider使用统计

#### 4.5 前端集成
- [ ] **实现批量生成UI** (2小时)
  - 进度条组件
  - 实时轮询
  - 错误展示

- [ ] **实现单张生成UI** (1小时)
  - 生成按钮
  - 加载动画
  - 结果展示

#### 4.6 测试
- [ ] **Provider单元测试** (2小时)
- [ ] **ImageGenerator集成测试** (2小时)
- [ ] **Stitcher单元测试** (1小时)
- [ ] **E2E测试：完整生成流程** (2小时)

### 完成标准
- ✅ Gemini + ByteDance Provider实现
- ✅ Fallback机制正常工作
- ✅ 3轮生成流程完整
- ✅ 图片拼接质量合格
- ✅ 7种语言文字正确叠加
- ✅ 批量生成进度追踪准确

### 依赖关系
- **前置任务**: Phase 3 UI层
- **后续任务**: Phase 5 高级功能

---

## Phase 5: 高级功能 ⚡

**目标**: 实现模板编辑器、同步管理、批量操作
**预计时长**: 1周
**状态**: ⬜ Not Started

### 任务清单

#### 5.1 模板管理完整功能

##### 5.1.1 模板CRUD API
- [ ] **GET /api/templates** (30分钟)
  - 列出所有模板
  - 支持筛选（type, category）

- [ ] **POST /api/templates** (45分钟)
  - 创建新模板
  - Zod验证

- [ ] **PUT /api/templates/[id]** (30分钟)
  - 更新模板
  - 仅允许修改USER类型

- [ ] **DELETE /api/templates/[id]** (30分钟)
  - 删除模板
  - 检查是否被引用

##### 5.1.2 模板验证与预览
- [ ] **POST /api/templates/validate** (1小时)
  - 语法验证
  - 变量存在性检查
  - 返回错误列表

- [ ] **POST /api/templates/preview** (1.5小时)
  - 基于真实库数据渲染
  - 返回渲染结果
  - 支持自定义种子

##### 5.1.3 变量元数据API
- [ ] **GET /api/templates/variables** (45分钟)
  - 返回39个主图变量
  - 包含描述、类型、示例

- [ ] **GET /api/templates/diff/variables** (45分钟)
  - 返回45个Diff变量
  - 包含命名空间信息

#### 5.2 同步管理系统

##### 5.2.1 同步检查器
- [ ] **实现8种Checker** (6小时)
  ```typescript
  // src/lib/sync/checkers/
  - library-config-checker.ts    // 库配置同步
  - invalid-refs-checker.ts       // 无效库引用
  - prompt-sync-checker.ts        // Prompt文件同步
  - image-sync-checker.ts         // 图片文件同步
  - combo-status-checker.ts       // 组合状态同步
  - field-integrity-checker.ts    // 字段完整性
  - orphan-checker.ts             // 孤立文件检测
  - provider-health-checker.ts    // Provider健康检查
  ```

##### 5.2.2 SyncManager主类
- [ ] **实现SyncManager** (4小时)
  ```typescript
  // src/lib/sync/sync-manager.ts
  export class SyncManager {
    async checkAll(): Promise<SyncReport> {
      // 运行所有8个检查器
      // 汇总结果
    }

    async repairAll(issues: SyncIssue[]): Promise<RepairResult> {
      // 自动修复
      // 返回修复结果
    }
  }
  ```

##### 5.2.3 同步API端点
- [ ] **GET /api/sync/check** (1小时)
  - 运行完整检查
  - 返回问题列表

- [ ] **POST /api/sync/repair-all** (1.5小时)
  - 一键修复所有问题
  - 预览模式（dry-run）
  - 确认后执行

- [ ] **GET /api/sync/report** (45分钟)
  - 生成详细报告
  - 导出JSON

##### 5.2.4 同步UI
- [ ] **实现SyncDashboard** (3小时)
  - 8个检查器状态显示
  - 问题列表展示
  - 修复按钮
  - 修复进度

#### 5.3 批量操作增强

##### 5.3.1 Combo Manager
- [ ] **实现组合枚举** (2小时)
  ```typescript
  // src/lib/generators/combo-manager.ts
  export class ComboManager {
    enumerateAllCombinations(): Combination[] {
      // 笛卡尔积
    }

    enumerateWithFilter(filter: LibraryFilter): Combination[] {
      // 按筛选条件生成
    }
  }
  ```

##### 5.3.2 批量生成配置
- [ ] **实现LibraryFilter组件** (2小时)
  - 5个库的多选下拉框
  - 实时计算组合数
  - 全选/反选

##### 5.3.3 批量Prompt生成增强
- [ ] **支持筛选器** (1.5小时)
  - 修改批量API接受filter参数
  - 前端传递筛选条件

#### 5.4 错误管理系统
- [ ] **实现ErrorManager** (2小时)
  ```typescript
  // src/lib/utils/error-manager.ts
  export class ErrorManager {
    logError(error: Error, context: any): void {
      // 记录到数据库
    }

    getRecentErrors(limit: number): Promise<ErrorLog[]> {
      // 查询最近错误
    }
  }
  ```

- [ ] **创建ErrorLog表** (30分钟)
  ```prisma
  model ErrorLog {
    id        String   @id @default(cuid())
    message   String
    stack     String?  @db.Text
    context   Json?
    createdAt DateTime @default(now())
  }
  ```

#### 5.5 测试
- [ ] **SyncManager单元测试** (2小时)
- [ ] **ComboManager单元测试** (1小时)
- [ ] **E2E: 完整同步流程** (1.5小时)

### 完成标准
- ✅ 模板编辑器完全可用
- ✅ 同步管理检测准确
- ✅ 批量操作高效
- ✅ 错误管理完善

### 依赖关系
- **前置任务**: Phase 4 图片生成
- **后续任务**: Phase 6 测试与部署

---

## Phase 6: 测试与部署 🚀

**目标**: 完善测试覆盖，优化性能，部署到生产环境
**预计时长**: 1.5周
**状态**: ⬜ Not Started

### 任务清单

#### 6.1 单元测试完善
- [ ] **Template Engine测试套件** (3小时)
  - **关键**: 100个随机种子输出一致性测试
  - 边界条件测试
  - 错误处理测试

- [ ] **Diff Template Engine测试** (2小时)
  - 7个命名空间测试
  - 颜色变化计算测试
  - 装饰合并测试

- [ ] **Provider测试** (2小时)
  - Mock API响应
  - Fallback测试
  - 健康检查测试

- [ ] **ImageGenerator测试** (2小时)
  - 3轮生成流程测试
  - 错误恢复测试
  - 版本管理测试

- [ ] **目标**: 单元测试覆盖率 > 80%

#### 6.2 集成测试
- [ ] **API端点集成测试** (4小时)
  - 所有REST端点
  - 错误场景
  - 边界条件

- [ ] **数据库集成测试** (2小时)
  - Prisma操作测试
  - 事务测试
  - 级联删除测试

#### 6.3 E2E测试（Playwright）
- [ ] **库管理流程** (2小时)
  - 添加/编辑/删除条目
  - 搜索与筛选
  - 表单验证

- [ ] **Prompt生成流程** (2小时)
  - 主图生成
  - Diff生成
  - 批量生成

- [ ] **图片生成流程** (3小时)
  - 单张生成
  - 批量生成
  - 进度追踪

- [ ] **模板编辑流程** (2小时)
  - 创建/编辑模板
  - 实时预览
  - 验证与保存

#### 6.4 性能优化

##### 6.4.1 数据库优化
- [ ] **添加索引** (1小时)
  - 复合索引（libraryIds, imageId）
  - 查询性能分析

- [ ] **连接池配置** (30分钟)
  - Prisma连接池大小
  - 超时设置

##### 6.4.2 前端优化
- [ ] **代码分割** (2小时)
  - 动态导入Monaco Editor
  - 路由级别代码分割
  - 减少初始bundle大小

- [ ] **图片优化** (1小时)
  - Next.js Image组件
  - 懒加载
  - WebP格式

- [ ] **缓存策略** (1.5小时)
  - API响应缓存
  - 静态资源缓存
  - Service Worker（可选）

##### 6.4.3 API性能
- [ ] **响应时间优化** (2小时)
  - 数据库查询优化
  - 并行请求
  - 减少嵌套查询

#### 6.5 生产环境配置

##### 6.5.1 Vercel部署
- [ ] **配置vercel.json** (30分钟)
  ```json
  {
    "buildCommand": "prisma generate && next build",
    "framework": "nextjs",
    "regions": ["hkg1"]
  }
  ```

- [ ] **配置环境变量** (30分钟)
  - DATABASE_URL
  - API密钥
  - IMAGE_WORKER_URL

- [ ] **首次部署** (1小时)
  ```bash
  vercel --prod
  ```

- [ ] **验证部署** (30分钟)
  - 测试所有功能
  - 检查错误日志

##### 6.5.2 自托管nginx服务器
- [ ] **配置Docker Compose** (2小时)
  - nginx容器
  - image-worker容器
  - PostgreSQL容器

- [ ] **配置nginx** (1小时)
  - 静态文件服务
  - 反向代理
  - SSL证书

- [ ] **部署Image Worker** (2小时)
  - 构建Docker镜像
  - 环境变量配置
  - 启动服务

##### 6.5.3 数据库部署
- [ ] **Supabase设置** (1小时)
  - 创建项目
  - 获取连接字符串
  - 运行迁移

- [ ] **备份策略** (1小时)
  - 自动备份配置
  - 恢复测试

#### 6.6 监控与日志

##### 6.6.1 错误监控
- [ ] **集成Sentry（可选）** (1.5小时)
  - Next.js错误追踪
  - 性能监控

##### 6.6.2 日志系统
- [ ] **结构化日志** (1小时)
  - Winston或Pino
  - 日志级别配置
  - 日志轮转

##### 6.6.3 性能监控
- [ ] **Vercel Analytics** (30分钟)
  - 启用Analytics
  - 配置Web Vitals

#### 6.7 文档完善
- [ ] **更新README.md** (2小时)
  - 项目介绍
  - 安装步骤
  - 部署指南

- [ ] **API文档** (2小时)
  - 端点列表
  - 请求/响应示例
  - 错误代码

- [ ] **用户手册** (3小时)
  - 功能介绍
  - 操作指南
  - FAQ

#### 6.8 安全审查
- [ ] **代码审查** (2小时)
  - SQL注入检查
  - XSS防护
  - CSRF防护

- [ ] **依赖安全扫描** (30分钟)
  ```bash
  npm audit
  npm audit fix
  ```

- [ ] **环境变量保护** (30分钟)
  - 验证.env.local不在git中
  - 敏感信息加密

#### 6.9 最终验收测试
- [ ] **功能完整性检查** (3小时)
  - 逐一验证所有功能
  - 与旧系统对比

- [ ] **性能基准测试** (2小时)
  - Lighthouse评分 > 90
  - API响应时间 < 200ms
  - 数据库查询 < 100ms

- [ ] **压力测试** (2小时)
  - 并发用户测试
  - 批量生成测试
  - 内存泄漏检查

### 完成标准
- ✅ 测试覆盖率 > 80%
- ✅ 所有E2E测试通过
- ✅ Vercel生产环境运行正常
- ✅ nginx服务器运行正常
- ✅ 性能指标达标
- ✅ 文档完善

### 依赖关系
- **前置任务**: Phase 5 高级功能
- **后续任务**: 项目完成 🎉

---

## 📋 检查清单（总览）

### Phase 0: 项目初始化
- [ ] Next.js项目创建
- [ ] shadcn/ui配置
- [ ] TypeScript配置
- [ ] 测试框架配置

### Phase 1: 数据层
- [ ] Prisma Schema设计
- [ ] Zod Schema定义
- [ ] 库数据迁移
- [ ] 数据库测试

### Phase 2: 核心API
- [ ] 库管理API（6个端点）
- [ ] Prompt生成API（8个端点）
- [ ] Template Engine迁移
- [ ] 输出一致性验证

### Phase 3: UI层
- [ ] Dashboard主页
- [ ] 库管理UI
- [ ] Prompt生成UI
- [ ] 模板编辑器UI

### Phase 4: 图片生成
- [ ] AI Provider封装
- [ ] 3轮生成流程
- [ ] 图片拼接
- [ ] 批量生成

### Phase 5: 高级功能
- [ ] 模板管理完整功能
- [ ] 同步管理系统
- [ ] 批量操作增强
- [ ] 错误管理

### Phase 6: 测试与部署
- [ ] 单元测试（>80%覆盖）
- [ ] 集成测试
- [ ] E2E测试
- [ ] Vercel部署
- [ ] nginx服务器部署

---

## 🎯 里程碑

| 里程碑 | 目标 | 预计完成日期 | 状态 |
|--------|------|-------------|------|
| **M1: 数据层完成** | Phase 0-1完成 | Week 2 | ⬜ |
| **M2: 核心功能可用** | Phase 2-3完成 | Week 5 | ⬜ |
| **M3: 完整端到端流程** | Phase 4完成 | Week 7 | ⬜ |
| **M4: 功能齐全** | Phase 5完成 | Week 8 | ⬜ |
| **M5: 生产就绪** | Phase 6完成 | Week 10 | ⬜ |

---

## 📊 每日任务追踪示例

### Week 1, Day 1 (示例)
- [ ] 初始化Next.js项目
- [ ] 安装shadcn/ui
- [ ] 配置TypeScript
- [ ] 创建目录结构
- [ ] Git初始化并提交

### Week 1, Day 2 (示例)
- [ ] Prisma初始化
- [ ] 设计Library表
- [ ] 设计Record表
- [ ] 创建初始迁移

（实际使用时按日填写）

---

## 🚨 风险与阻塞追踪

| 风险 | 状态 | 缓解措施 | 负责人 |
|------|------|---------|--------|
| Template Engine输出不一致 | 🟡 监控中 | 编写100个种子测试 | - |
| Vercel Serverless超时 | 🟡 监控中 | 图片生成独立到VPS | - |
| API Provider变更 | 🟢 低风险 | 版本锁定 | - |

---

## 📝 每日站会模板

### 今日完成
-

### 今日计划
-

### 阻塞问题
-

---

## 更新日志

| 日期 | 更新内容 | 更新人 |
|------|---------|--------|
| 2025-11-15 | 初始版本 | Claude + Sam |

---

**下一步**: 开始Phase 0 - 项目初始化 🚀
