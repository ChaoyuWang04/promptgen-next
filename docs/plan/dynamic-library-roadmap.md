# 完全动态库管理系统建设方案

## 1. 背景与动机

### 1.1 当前问题

当前系统的库管理存在大量硬编码依赖：

- **库类型固定**: 系统预设了 6 种库类型 (character, pose, scene, theme, style, decorative_props)
- **类型系统耦合**: TypeScript 联合类型 `LibraryName` 写死了库名称
- **验证逻辑硬编码**: Zod schema 使用 `z.enum()` 固定校验库名称
- **生成器依赖**: 模板引擎和生成器直接访问固定的库字段

### 1.2 动态化价值

- **灵活性**: 允许用户自定义任意库类型,无需修改代码
- **扩展性**: 新增库类型不需要重新部署
- **维护成本**: 减少代码修改和潜在的回归风险

---

## 2. 当前架构分析

### 2.1 硬编码依赖清单

| 文件 | 硬编码内容 | 影响范围 |
|------|-----------|---------|
| `src/lib/config/library-config.ts` | `LIBRARY_NAMES` 数组, `LibraryName` 类型 | 全局 |
| `src/schemas/api.schema.ts` | `z.enum(['character', ...])` (3处) | API 验证 |
| `src/lib/engines/types.ts` | `LibrarySelection` 接口固定字段 | 模板渲染 |
| `src/lib/generators/main-prompt-generator.ts` | 直接访问 `libraryIds.character` 等 | 提示词生成 |
| `src/lib/generators/combo-manager.ts` | `LibraryFilter` 接口固定字段 | 组合枚举 |
| `src/lib/utils/image-id.ts` | `LIBRARY_ABBREVIATIONS`, 固定库顺序 | Image ID 格式 |
| `src/hooks/use-libraries.ts` | `useCreateLibraryEntry` 中的库类型判断 | 前端 Hook |
| `src/lib/utils/monaco-schema-provider.ts` | `getTemplateByName()` 调用 (5处) | 编辑器配置 |

### 2.2 数据库层现状 (已支持动态)

```prisma
model Library {
  name        String   @unique    // 任意库名称
  entries     Json               // 灵活的 JSON 存储
  schema      Json?              // 可选的 JSON Schema
  metadata    Json?              // 扩展元数据
}
```

数据库设计已经支持动态库管理,问题在于应用层的硬编码。

### 2.3 架构依赖图

```
┌─────────────────────────────────────────────────────────────┐
│                      应用层 (硬编码)                         │
├─────────────────────────────────────────────────────────────┤
│  TypeScript Types  │  Zod Schemas  │  Generators/Engines   │
│  ────────────────  │  ───────────  │  ──────────────────   │
│  LibraryName       │  z.enum([])   │  libraryIds.character │
│  LibrarySelection  │               │  template.render()    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据层 (已动态)                         │
├─────────────────────────────────────────────────────────────┤
│                   PostgreSQL + Prisma                       │
│                   Library.entries: Json                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 技术挑战

### 3.1 TypeScript 联合类型的静态性

**问题**: TypeScript 联合类型必须在编译时确定,无法从运行时数据推导。

```typescript
// 当前设计 (静态)
type LibraryName = 'character' | 'pose' | 'scene' | 'theme' | 'style' | 'decorative_props';

// 无法实现 (动态)
type LibraryName = typeof ENABLED_LIBRARIES[number]; // 仅限常量数组
```

**影响**:
- 所有使用 `LibraryName` 的函数需要类型转换
- 失去 IDE 自动补全和类型检查
- 运行时错误难以在编译时发现

### 3.2 Zod 枚举验证的编译时约束

**问题**: `z.enum()` 只接受字面值数组,无法使用动态值。

```typescript
// 当前设计 (静态)
libraryName: z.enum(['character', 'pose', 'scene', 'theme', 'style', 'decorative_props'])

// 替代方案 (动态,但失去类型安全)
libraryName: z.string().refine(
  (val) => ENABLED_LIBRARIES.includes(val),
  { message: 'Invalid library name' }
)
```

### 3.3 Image ID 格式兼容性

**问题**: 当前 Image ID 格式依赖固定的库顺序。

```
betty_christmas_entrance_cozy_warm_001
 │       │          │      │     │
 └───────┴──────────┴──────┴─────┴── 固定顺序: character_pose_scene_theme_style
```

**风险**:
- 新增库会改变 ID 格式
- 现有记录的 ID 将无法解析
- 需要迁移策略或版本控制

### 3.4 模板引擎变量解析

**问题**: 模板使用 `{{character.name}}` 语法,假定库名称已知。

```
{{character.name}} in {{scene.location}} with {{theme.palette_core}} colors
```

**挑战**:
- 如何在模板中引用动态库?
- 如何验证模板引用的库是否存在?

---

## 4. 分阶段实施方案

### 阶段 1: API 验证层动态化 (低风险)

**目标**: 允许 API 接受任意库名称,同时保持后向兼容。

**修改内容**:

1. **修改 `src/schemas/api.schema.ts`**:
```typescript
// 替换 z.enum() 为动态验证
import { getEnabledLibraryNames } from '@/lib/config/library-config';

const dynamicLibraryNameSchema = z.string().refine(
  (val) => getEnabledLibraryNames().includes(val),
  { message: 'Invalid library name' }
);
```

2. **添加运行时库发现机制**:
```typescript
// src/lib/config/library-config.ts
export async function getEnabledLibraryNames(): Promise<string[]> {
  const libraries = await prisma.library.findMany({
    where: { isActive: true },
    select: { name: true },
  });
  return libraries.map(l => l.name);
}
```

**工作量**: 3-5 天
**风险等级**: 低

---

### 阶段 2: 生成器逻辑重构 (中风险)

**目标**: 让生成器从配置动态读取库信息,而非硬编码字段访问。

**修改内容**:

1. **重构 `LibrarySelection` 接口**:
```typescript
// 从固定字段改为 Record
interface LibrarySelection {
  [libraryName: string]: string;  // libraryName -> entryId
}
```

2. **修改生成器的库访问逻辑**:
```typescript
// 之前
const characterEntry = await getLibraryEntry('character', libraryIds.character);

// 之后
for (const [libraryName, entryId] of Object.entries(libraryIds)) {
  const entry = await getLibraryEntry(libraryName, entryId);
  context[libraryName] = entry;
}
```

3. **更新模板上下文构建**:
```typescript
// 动态构建上下文
async function buildTemplateContext(libraryIds: LibrarySelection): Promise<TemplateContext> {
  const context: Record<string, any> = {};
  for (const [name, id] of Object.entries(libraryIds)) {
    context[name] = await getLibraryEntry(name, id);
  }
  return context as TemplateContext;
}
```

**工作量**: 1-2 周
**风险等级**: 中

---

### 阶段 3: Image ID 格式重设计 (中风险)

**目标**: 设计支持动态库的 Image ID 格式,同时保持向后兼容。

**方案 A: 版本化 ID 格式**
```
v2_betty_christmas_entrance_cozy_warm_001
│
└── 版本前缀,区分新旧格式
```

**方案 B: 基于哈希的 ID**
```
img_a1b2c3d4e5f6_001
    │
    └── libraryIds 的哈希值
```

**方案 C: 结构化 ID**
```json
{
  "version": 2,
  "libraries": {
    "character": "betty",
    "scene": "entrance"
  },
  "variant": 1
}
// 存储为: base64(json)
```

**推荐**: 方案 A (版本化),兼容性最好。

**迁移策略**:
1. 新记录使用 v2 格式
2. 读取时检测版本,分别解析
3. 可选: 后台任务迁移旧记录

**工作量**: 1 周
**风险等级**: 中

---

### 阶段 4: 类型系统泛型化 (高风险)

**目标**: 使用 TypeScript 泛型和条件类型,实现编译时的动态库支持。

**方案**:

1. **定义库配置为 const 数组**:
```typescript
// library-config.ts
export const ENABLED_LIBRARIES = ['character', 'pose', 'scene'] as const;
export type LibraryName = typeof ENABLED_LIBRARIES[number];
```

2. **使用泛型约束**:
```typescript
interface LibrarySelection<T extends readonly string[] = typeof ENABLED_LIBRARIES> {
  [K in T[number]]?: string;
}
```

3. **条件类型用于必需/可选库**:
```typescript
type RequiredLibraries = Extract<LibraryName, 'character' | 'pose' | 'scene'>;
type OptionalLibraries = Exclude<LibraryName, RequiredLibraries>;
```

**局限**:
- 仍需在代码中定义库列表
- 添加库需要修改配置并重新编译
- 适合库类型相对稳定的场景

**工作量**: 2-3 周
**风险等级**: 高

---

## 5. 风险评估与缓解措施

### 5.1 现有数据兼容性

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Image ID 格式变更 | 现有记录无法关联 | 版本化 ID + 双向解析 |
| 库名称变更 | Record.libraryIds 失效 | 数据迁移脚本 |
| 模板语法不兼容 | 旧模板无法渲染 | 模板版本控制 |

### 5.2 类型安全丧失

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 编译时检查减少 | 运行时错误增加 | 增强单元测试覆盖 |
| IDE 提示缺失 | 开发效率下降 | 使用 JSDoc 注释 |
| 重构困难 | 难以追踪库引用 | 代码搜索规范化 |

### 5.3 回滚策略

1. **数据库回滚**: 使用 Atlas 迁移的 down 文件
2. **代码回滚**: Git revert 到稳定版本
3. **功能开关**: 使用 feature flag 控制新/旧逻辑

---

## 6. 工作量估算

### 6.1 各阶段工时

| 阶段 | 工作内容 | 预估工时 | 依赖 |
|------|---------|---------|------|
| 阶段 1 | API 验证层动态化 | 3-5 天 | 无 |
| 阶段 2 | 生成器逻辑重构 | 1-2 周 | 阶段 1 |
| 阶段 3 | Image ID 重设计 | 1 周 | 阶段 2 |
| 阶段 4 | 类型系统泛型化 | 2-3 周 | 阶段 1-3 |
| 测试 | 集成测试 + E2E 测试 | 1 周 | 各阶段 |
| **总计** | | **6-9 周** | |

### 6.2 优先级建议

```
优先级高                                              优先级低
├─────────────────────────────────────────────────────────┤
阶段1        阶段2          阶段3          阶段4
(必需)       (推荐)         (可选)         (长期)
```

**建议路径**:
- **短期**: 只实施阶段 1,获得基本的动态库支持
- **中期**: 实施阶段 2-3,完成生成器和 ID 重构
- **长期**: 根据需求决定是否实施阶段 4

---

## 7. 替代方案: 配置驱动的半动态化

如果完全动态化成本过高,可以采用折中方案:

### 7.1 方案描述

- 库类型仍在代码中定义 (`ENABLED_LIBRARIES` 常量)
- 添加新库只需修改配置文件并重新部署
- 保留 TypeScript 类型安全

### 7.2 优势

- 工作量小 (1-2 天)
- 保持类型安全
- 兼容现有代码

### 7.3 实施方式

```typescript
// library-config.ts
export const ENABLED_LIBRARIES = [
  'character',
  'pose',
  'scene',
  'theme',
  'style',
  'decorative_props',
  // 添加新库只需在这里增加一行
  'new_library',
] as const;

export type LibraryName = typeof ENABLED_LIBRARIES[number];
```

**限制**: 添加库需要代码修改和部署。

---

## 8. 决策建议

### 如果库类型变化频繁 (每周添加新类型)
→ 实施完整动态化方案 (阶段 1-4)

### 如果库类型偶尔变化 (每月或更少)
→ 采用配置驱动的半动态化方案

### 如果库类型基本固定
→ 保持现状,无需重构

---

## 附录: 相关文件清单

需要修改的文件 (完全动态化):

```
src/lib/config/library-config.ts          # 库配置中枢
src/schemas/api.schema.ts                 # API 验证 (3处 z.enum)
src/lib/engines/types.ts                  # 类型定义
src/lib/generators/main-prompt-generator.ts
src/lib/generators/diff-prompt-generator.ts
src/lib/generators/combo-manager.ts
src/lib/utils/image-id.ts
src/hooks/use-libraries.ts
src/lib/utils/monaco-schema-provider.ts
tests/unit/generators/*.test.ts           # 测试文件
tests/integration/api/*.test.ts
```
