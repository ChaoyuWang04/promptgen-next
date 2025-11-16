# PromptGen Database Schema Design
# PostgreSQL + Prisma ORM

**文档版本**: 1.0.0
**创建日期**: 2025-11-15
**数据库**: PostgreSQL 16+
**ORM**: Prisma 6.0+

---

## 目录

1. [Schema概览](#1-schema概览)
2. [完整Prisma Schema](#2-完整prisma-schema)
3. [表详细设计](#3-表详细设计)
4. [索引策略](#4-索引策略)
5. [数据迁移策略](#5-数据迁移策略)
6. [查询示例](#6-查询示例)

---

## 1. Schema概览

### 1.1 数据表清单

| 表名 | 用途 | 估算行数 | 关键字段 |
|------|------|---------|----------|
| **Library** | 库配置存储 | 6 | name, entries (JSON) |
| **Record** | 生成记录 | 100-1000+ | imageId, libraryIds (JSON) |
| **Prompt** | Prompt文本 | 200-2000+ | recordId, type, promptCn/En |
| **ImageVariant** | 图片版本 | 100-3000+ | recordId, version, paths |
| **Template** | 模板 | 10-50 | type, category, content |
| **ImageBatch** | 批量任务 | 10-100 | status, totalImages |

### 1.2 关系图

```
┌──────────────┐
│   Library    │
└──────────────┘
       (不直接关联，通过JSON引用)

┌──────────────┐        ┌──────────────┐
│    Record    │◄───────┤    Prompt    │
│              │ 1:N    │              │
│              │        └──────────────┘
│              │
│              │        ┌──────────────┐
│              │◄───────┤ImageVariant  │
│              │ 1:N    │              │
└──────────────┘        └──────────────┘

┌──────────────┐
│   Template   │  (独立表)
└──────────────┘

┌──────────────┐
│ ImageBatch   │  (独立表,异步任务追踪)
└──────────────┘
```

---

## 2. 完整Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ========================================
// 库配置表
// ========================================
model Library {
  id          String   @id @default(cuid())
  name        String   @unique  // character, pose, scene, theme, style, decorative_props
  displayName String            // 人物, 姿态, 场景, 主题, 画风, 装饰小物
  entries     Json              // 库条目JSON数组
  schema      Json?             // JSON Schema定义（用于验证）
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([name])
}

// ========================================
// 生成记录表
// ========================================
model Record {
  id                String   @id @default(cuid())
  imageId           String   @unique  // betty_turnback_living_halloween_retro50s_0001

  // 库选择（动态JSON结构，支持3-N个库）
  libraryIds        Json     // {"character": "char_betty_v1", "pose": "...", ...}

  // Outfit状态（Diff生成需要）
  outfitMinorState  Json     // [{"element": "鞋子", "current_color": "红色"}]
  usedDecorations   Json     // {"from_theme": [...], "from_scene": [...]}

  // 关联关系
  prompts           Prompt[]
  variants          ImageVariant[]

  // Provider信息
  providerUsed      String?         // 最近一次使用的Provider: gemini, bytedance
  providerAttempts  Json            // [{provider, success, error, attempted_at}]

  // 状态标志
  promptGenerated   Boolean  @default(false)
  imageGenerated    Boolean  @default(false)

  // 时间戳
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([imageId])
  @@index([promptGenerated, imageGenerated])
}

// ========================================
// Prompt表
// ========================================
model Prompt {
  id         String     @id @default(cuid())
  recordId   String
  record     Record     @relation(fields: [recordId], references: [id], onDelete: Cascade)

  type       PromptType  // MAIN 或 DIFF
  promptCn   String      @db.Text  // 中文Prompt
  promptEn   String      @db.Text  // 英文Prompt

  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  @@index([recordId, type])
}

enum PromptType {
  MAIN
  DIFF
}

// ========================================
// 图片版本表
// ========================================
model ImageVariant {
  id              String   @id @default(cuid())
  recordId        String
  record          Record   @relation(fields: [recordId], references: [id], onDelete: Cascade)

  version         Int      // 1, 2, 3... (同一组合的多个版本用于A/B测试)
  imageMainPath   String?  // images/{image_id}/v1_main.png
  imageDiffPath   String?  // images/{image_id}/v1_diff.png
  finalImages     Json?    // {"en": "path", "fr": "path", ...} 7种语言

  generatedAt     DateTime @default(now())

  @@unique([recordId, version])
  @@index([recordId])
}

// ========================================
// 模板表
// ========================================
model Template {
  id          String           @id @default(cuid())
  name        String           // template_default_v1, user_custom_template
  description String?
  type        TemplateType     // SYSTEM 或 USER
  category    TemplateCategory // MAIN 或 DIFF
  content     String           @db.Text  // 模板内容（可能很长）

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([type, category])
}

enum TemplateType {
  SYSTEM  // 系统预置模板（只读）
  USER    // 用户自定义模板
}

enum TemplateCategory {
  MAIN  // 主图模板
  DIFF  // 对比图模板
}

// ========================================
// 批量任务表（异步任务追踪）
// ========================================
model ImageBatch {
  id          String       @id @default(cuid())
  imageIds    Json         // 要生成的image_id数组
  totalImages Int
  completed   Int          @default(0)
  failed      Int          @default(0)
  status      BatchStatus  @default(PENDING)

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([status])
}

enum BatchStatus {
  PENDING      // 等待开始
  IN_PROGRESS  // 进行中
  COMPLETED    // 已完成
  FAILED       // 失败
}

// ========================================
// 错误日志表（可选，用于错误追踪）
// ========================================
model ErrorLog {
  id        String   @id @default(cuid())
  level     String   // ERROR, WARN, INFO
  message   String
  stack     String?  @db.Text
  context   Json?    // 额外上下文信息
  createdAt DateTime @default(now())

  @@index([level, createdAt])
}
```

---

## 3. 表详细设计

### 3.1 Library表

**用途**: 存储6个库的配置和条目数据

```typescript
interface LibraryRow {
  id: string;
  name: 'character' | 'pose' | 'scene' | 'theme' | 'style' | 'decorative_props';
  displayName: string;
  entries: Record<string, LibraryEntry>;  // JSON字段
  schema?: JSONSchema;                     // JSON Schema定义
  createdAt: Date;
  updatedAt: Date;
}

// entries字段示例
{
  "char_betty_v1": {
    "id": "char_betty_v1",
    "name": "betty",
    "appearance_core": "短黑发, 圆润脸型...",
    "outfit_major": "蓝色无袖连衣裙",
    "outfit_minor": [...]
  },
  "char_wilma_v1": { ... }
}
```

**字段说明**:
- `name`: 库名称（唯一约束），用于API查询
- `displayName`: 前端显示名称
- `entries`: JSON存储所有库条目（避免为每个库创建表）
- `schema`: 可选的JSON Schema（用于验证新条目）

**为什么使用JSON**:
- 库结构不固定（character有outfit_minor，style没有）
- 避免过度规范化（6个表 vs 1个表）
- 查询性能足够（库数据很少修改）

### 3.2 Record表

**用途**: 存储每次Prompt生成的核心记录

```typescript
interface RecordRow {
  id: string;
  imageId: string;  // betty_turnback_living_halloween_retro50s_0001
  libraryIds: {
    character: string;
    pose: string;
    scene: string;
    theme: string;
    style: string;
    // 动态库支持：可能有更多字段
  };
  outfitMinorState: Array<{
    element: string;
    current_color: string;
  }>;
  usedDecorations: {
    from_theme: string[];
    from_scene: string[];
  };
  providerUsed?: string;
  providerAttempts: Array<{
    provider: string;
    success: boolean;
    error?: string;
    attempted_at: string;
  }>;
  promptGenerated: boolean;
  imageGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**字段说明**:
- `imageId`: 唯一标识符（可解析出库选择）
- `libraryIds`: **动态JSON**，支持3-N个库（Phase 2设计）
- `outfitMinorState`: 当前outfit颜色状态（Diff生成需要）
- `usedDecorations`: 已使用的装饰（避免重复）
- `providerAttempts`: Provider重试历史（调试用）

**索引**:
- `imageId`: 唯一索引（快速查找）
- `(promptGenerated, imageGenerated)`: 复合索引（筛选待生成记录）

### 3.3 Prompt表

**用途**: 存储生成的Prompt文本

```typescript
interface PromptRow {
  id: string;
  recordId: string;
  type: 'MAIN' | 'DIFF';
  promptCn: string;  // 可能很长，使用TEXT类型
  promptEn: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**字段说明**:
- `recordId`: 外键关联Record
- `type`: 区分主图和对比图Prompt
- `promptCn/En`: 使用`@db.Text`存储大文本

**为什么独立表**:
- Prompt文本很长（500-2000字符）
- 避免Record表过大
- 支持将来多语言Prompt

**索引**:
- `(recordId, type)`: 复合索引（快速查找某记录的MAIN/DIFF Prompt）

### 3.4 ImageVariant表

**用途**: 存储图片生成的多个版本

```typescript
interface ImageVariantRow {
  id: string;
  recordId: string;
  version: number;  // 1, 2, 3...
  imageMainPath: string;
  imageDiffPath: string;
  finalImages: {
    en: string;
    fr: string;
    ja: string;
    ko: string;
    de: string;
    es: string;
    zh: string;
  };
  generatedAt: Date;
}
```

**字段说明**:
- `version`: 版本号（用于A/B测试）
- `imageMainPath/DiffPath`: 文件路径
- `finalImages`: JSON存储7种语言的最终图路径

**唯一约束**:
- `(recordId, version)`: 同一记录的版本号不重复

**为什么独立表**:
- 支持多版本（v1, v2, v3...）
- 避免Record表列爆炸

### 3.5 Template表

**用途**: 存储系统和用户模板

```typescript
interface TemplateRow {
  id: string;
  name: string;
  description?: string;
  type: 'SYSTEM' | 'USER';
  category: 'MAIN' | 'DIFF';
  content: string;  // 模板内容（TEXT类型）
  createdAt: Date;
  updatedAt: Date;
}
```

**字段说明**:
- `type`: SYSTEM模板不可删除，USER模板可编辑
- `category`: 区分主图和Diff模板（变量不同）
- `content`: 使用`@db.Text`存储长模板

**索引**:
- `(type, category)`: 复合索引（筛选系统主图模板等）

### 3.6 ImageBatch表

**用途**: 追踪批量图片生成任务

```typescript
interface ImageBatchRow {
  id: string;
  imageIds: string[];  // JSON数组
  totalImages: number;
  completed: number;
  failed: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
}
```

**字段说明**:
- `imageIds`: 要生成的image_id列表
- `completed/failed`: 实时更新进度
- `status`: 批次状态

**索引**:
- `status`: 单列索引（查询进行中的批次）

---

## 4. 索引策略

### 4.1 主键索引（自动）

所有表使用`cuid()`主键：
```sql
PRIMARY KEY (id)
```

### 4.2 唯一索引

```sql
-- Library表
CREATE UNIQUE INDEX "Library_name_key" ON "Library"("name");

-- Record表
CREATE UNIQUE INDEX "Record_imageId_key" ON "Record"("imageId");

-- ImageVariant表
CREATE UNIQUE INDEX "ImageVariant_recordId_version_key" ON "ImageVariant"("recordId", "version");
```

### 4.3 复合索引

```sql
-- Record表：筛选待生成记录
CREATE INDEX "Record_promptGenerated_imageGenerated_idx" ON "Record"("promptGenerated", "imageGenerated");

-- Prompt表：快速查找某记录的Prompt
CREATE INDEX "Prompt_recordId_type_idx" ON "Prompt"("recordId", "type");

-- Template表：筛选模板类型
CREATE INDEX "Template_type_category_idx" ON "Template"("type", "category");

-- ErrorLog表：查询最近错误
CREATE INDEX "ErrorLog_level_createdAt_idx" ON "ErrorLog"("level", "createdAt");
```

### 4.4 外键索引（自动）

Prisma自动为外键创建索引：
```sql
CREATE INDEX "Prompt_recordId_idx" ON "Prompt"("recordId");
CREATE INDEX "ImageVariant_recordId_idx" ON "ImageVariant"("recordId");
```

### 4.5 性能优化建议

**JSON字段索引（PostgreSQL特性）**:
如果频繁查询`libraryIds`字段：
```sql
-- 为JSON字段创建GIN索引
CREATE INDEX "Record_libraryIds_gin_idx" ON "Record" USING GIN ("libraryIds");

-- 查询示例
SELECT * FROM "Record" WHERE "libraryIds" @> '{"character": "char_betty_v1"}';
```

**部分索引**:
```sql
-- 仅索引待生成的记录
CREATE INDEX "Record_pending_idx" ON "Record"("imageId")
WHERE "promptGenerated" = FALSE;
```

---

## 5. 数据迁移策略

### 5.1 迁移范围（Clean Slate方案）

#### 完整迁移
1. **6个库JSON文件** → `Library`表
   - `data/character.json`
   - `data/pose.json`
   - `data/scene.json`
   - `data/theme.json`
   - `data/style.json`
   - `data/decorative_props.json`

2. **系统模板** → `Template`表
   - `template_default_v1` (MAIN)
   - `diff_template_default_v1` (DIFF)

#### 不迁移
- `records/*.json` → 从零开始
- `prompts/*.txt` → 从零开始
- `images/` → 保留文件但数据库无记录

### 5.2 迁移脚本

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
  console.log('🚀 Starting library migration...\n');

  for (const config of LIBRARY_CONFIGS) {
    const filePath = path.join(__dirname, '../data', config.file);

    try {
      const jsonData = await fs.readFile(filePath, 'utf-8');
      const entries = JSON.parse(jsonData);

      const result = await prisma.library.upsert({
        where: { name: config.name },
        update: {
          entries,
          displayName: config.displayName,
          updatedAt: new Date()
        },
        create: {
          name: config.name,
          displayName: config.displayName,
          entries
        }
      });

      const entryCount = Object.keys(entries).length;
      console.log(`✅ ${config.displayName} (${config.name}): ${entryCount} entries`);
    } catch (error) {
      console.error(`❌ Failed to migrate ${config.name}:`, error.message);
    }
  }

  console.log('\n✨ Library migration complete!');
}

async function migrateTemplates() {
  console.log('\n🚀 Starting template migration...\n');

  const templates = [
    {
      name: 'template_default_v1',
      description: '官方默认主图模板',
      type: 'SYSTEM',
      category: 'MAIN',
      content: await fs.readFile(
        path.join(__dirname, '../schemes/system/template_default_v1.txt'),
        'utf-8'
      )
    },
    {
      name: 'diff_template_default_v1',
      description: '官方默认对比图模板',
      type: 'SYSTEM',
      category: 'DIFF',
      content: await fs.readFile(
        path.join(__dirname, '../schemes/system_diff/diff_template_default_v1.txt'),
        'utf-8'
      )
    }
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: { name: template.name },
      update: template,
      create: template
    });

    console.log(`✅ ${template.name}: ${template.description}`);
  }

  console.log('\n✨ Template migration complete!');
}

async function main() {
  try {
    await migrateLibraries();
    await migrateTemplates();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

### 5.3 运行迁移

```bash
# 1. 创建初始迁移
npx prisma migrate dev --name init

# 2. 运行数据迁移脚本
npx tsx scripts/migrate-libraries.ts

# 3. 验证迁移
npx prisma studio
```

---

## 6. 查询示例

### 6.1 库查询

```typescript
// 获取所有库配置
const libraries = await prisma.library.findMany();

// 获取character库
const characterLib = await prisma.library.findUnique({
  where: { name: 'character' }
});

// 访问特定条目
const entries = characterLib.entries as Record<string, any>;
const betty = entries['char_betty_v1'];
```

### 6.2 Record查询

```typescript
// 创建新记录
const record = await prisma.record.create({
  data: {
    imageId: 'betty_turnback_living_halloween_retro50s_0001',
    libraryIds: {
      character: 'char_betty_v1',
      pose: 'pose_turn_back_smile_v1',
      scene: 'scene_living_sofa_v1',
      theme: 'theme_halloween_v1',
      style: 'style_retro1950_flat_v1'
    },
    outfitMinorState: [
      { element: '鞋子', current_color: '红色' }
    ],
    usedDecorations: {
      from_theme: [],
      from_scene: []
    },
    prompts: {
      create: {
        type: 'MAIN',
        promptCn: '...',
        promptEn: '...'
      }
    }
  },
  include: {
    prompts: true
  }
});

// 查询待生成Prompt的记录
const pendingRecords = await prisma.record.findMany({
  where: {
    promptGenerated: false
  },
  orderBy: {
    createdAt: 'desc'
  }
});

// 查询某记录的所有版本
const record = await prisma.record.findUnique({
  where: { imageId: 'betty_turnback...' },
  include: {
    prompts: true,
    variants: {
      orderBy: { version: 'asc' }
    }
  }
});
```

### 6.3 复杂查询

```typescript
// 查询已生成图片但失败的记录
const failedRecords = await prisma.record.findMany({
  where: {
    promptGenerated: true,
    imageGenerated: false,
    providerAttempts: {
      path: '$[*].success',
      array_contains: false  // PostgreSQL JSON查询
    }
  }
});

// 统计每个Provider的成功率
const stats = await prisma.$queryRaw`
  SELECT
    provider_used,
    COUNT(*) as total,
    SUM(CASE WHEN image_generated THEN 1 ELSE 0 END) as success
  FROM "Record"
  WHERE provider_used IS NOT NULL
  GROUP BY provider_used
`;

// 查询最近7天的生成记录
const recentRecords = await prisma.record.findMany({
  where: {
    createdAt: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  },
  include: {
    prompts: true,
    variants: {
      take: 1,
      orderBy: { version: 'desc' }
    }
  }
});
```

### 6.4 事务操作

```typescript
// 原子性创建Record + Prompt
const result = await prisma.$transaction(async (tx) => {
  const record = await tx.record.create({
    data: {
      imageId: '...',
      libraryIds: { ... },
      outfitMinorState: [],
      usedDecorations: { from_theme: [], from_scene: [] }
    }
  });

  const prompt = await tx.prompt.create({
    data: {
      recordId: record.id,
      type: 'MAIN',
      promptCn: '...',
      promptEn: '...'
    }
  });

  return { record, prompt };
});
```

---

## 7. 性能优化

### 7.1 连接池配置

```env
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/promptgen?connection_limit=10&pool_timeout=20"
```

```typescript
// src/lib/db/prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});
```

### 7.2 查询优化建议

1. **使用select减少数据传输**:
   ```typescript
   const records = await prisma.record.findMany({
     select: {
       imageId: true,
       promptGenerated: true,
       imageGenerated: true
     }
   });
   ```

2. **分页查询**:
   ```typescript
   const records = await prisma.record.findMany({
     take: 20,
     skip: (page - 1) * 20
   });
   ```

3. **避免N+1查询**:
   ```typescript
   // ❌ 不好：N+1查询
   const records = await prisma.record.findMany();
   for (const record of records) {
     const prompts = await prisma.prompt.findMany({
       where: { recordId: record.id }
     });
   }

   // ✅ 好：使用include
   const records = await prisma.record.findMany({
     include: { prompts: true }
   });
   ```

---

## 附录

### A. 数据类型映射

| Prisma类型 | PostgreSQL类型 | TypeScript类型 |
|-----------|---------------|---------------|
| String    | VARCHAR       | string        |
| String @db.Text | TEXT   | string        |
| Int       | INTEGER       | number        |
| Boolean   | BOOLEAN       | boolean       |
| DateTime  | TIMESTAMP     | Date          |
| Json      | JSONB         | any           |

### B. 备份与恢复

**备份**:
```bash
pg_dump -U postgres -d promptgen_db > backup.sql
```

**恢复**:
```bash
psql -U postgres -d promptgen_db < backup.sql
```

### C. 迁移命令参考

```bash
# 创建新迁移
npx prisma migrate dev --name migration_name

# 应用迁移到生产
npx prisma migrate deploy

# 重置数据库（开发环境）
npx prisma migrate reset

# 生成Prisma Client
npx prisma generate

# 打开Prisma Studio（GUI）
npx prisma studio
```

---

**文档结束** - 详细API映射请参考 [`API_MAPPING.md`](./API_MAPPING.md)
