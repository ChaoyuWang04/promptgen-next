# 策略生成功能 v2 - 完整实施文档

## 📋 功能概述

完善组合管理功能，实现：选择模板 → 自动识别引用库 → 多选固定元素 → 实时计算组合数 → 预览确认 → 生成Record

## 🎯 核心改进

### 1. 模板库自动识别
- 用户选择模板后，系统自动解析模板内容
- 识别模板中引用的所有库（仅`{{library.field}}`语法）
- 验证MAIN模板不允许引用`decorative_props`库

### 2. 多选元素支持
- 每个库支持多选元素（Checkbox Group）
- 留空表示全选该库所有元素
- 实时计算笛卡尔积组合数

**示例**：
- character: `['betty', 'alice']` (2个)
- theme: `['christmas']` (1个)
- scene: `[]` (空=全选，假设3个)
- **组合数** = 2 × 1 × 3 = **6个组合**

### 3. 四步骤向导流程
1. **Step 1: 选择模板** - 显示模板引用的库列表
2. **Step 2: 配置元素** - 多选各库元素
3. **Step 3: 预览** - 显示总组合数、模板信息、库选择情况
4. **Step 4: 确认生成** - 批量创建Combination记录

### 4. 数据格式升级

**旧格式 (v1 - 已弃用)**:
```json
{
  "templateId": "template_main_v1",
  "strategyConfig": {
    "fixed": { "character": "char_betty_v1" },
    "variable": ["theme", "scene"]
  }
}
```

**新格式 (v2 - 当前使用)**:
```json
{
  "templateId": "template_main_v1",
  "strategyConfig": {
    "character": ["char_betty_v1", "char_alice_v1"],
    "theme": ["theme_christmas_v1"],
    "scene": []
  }
}
```

## 🏗️ 技术架构

### 后端实现

#### 1. 核心工具 (`src/lib/utils/`)

**模板解析器** (`template-parser.ts`):
```typescript
// 提取模板引用的库
extractLibrariesFromTemplate(content: string): LibraryName[]

// 验证MAIN模板不引用decorative_props
validateTemplateLibraryReferences(content, category)

// 提取变量详情
extractVariableDetails(content): VariableReference[]
```

**组合管理器增强** (`combo-manager.ts`):
```typescript
// 动态库组合数计算
calculateDynamicCombinationCount(strategyConfig): Promise<number>

// 枚举动态组合
enumerateDynamicCombinations(strategyConfig): Promise<Combination[]>

// 生成笛卡尔积
generateCartesianProduct(libraryNames, entriesMap)
```

#### 2. API端点 (`src/app/api/`)

| 端点 | 方法 | 功能 | 文件 |
|------|------|------|------|
| `/api/templates/[id]/libraries` | GET | 解析模板引用的库 | `templates/[id]/libraries/route.ts` |
| `/api/combinations/preview` | POST | 预览组合数和配置 | `combinations/preview/route.ts` |
| `/api/combinations/strategy` | POST | 生成策略组合 (v2) | `combinations/strategy/route.ts` |

**GET /api/templates/[id]/libraries**:
```typescript
Response: {
  templateId: string;
  templateName: string;
  templateCategory: 'MAIN' | 'DIFF';
  libraries: Array<{
    name: string;
    displayName: string;
    exists: boolean;
    entryCount: number;
    isActive: boolean;
  }>;
}
```

**POST /api/combinations/preview**:
```typescript
Request: {
  templateId: string;
  strategyConfig: Record<string, string[]>;
}

Response: {
  totalCombinations: number;
  librarySummary: Array<{
    library: string;
    displayName: string;
    selectedCount: number;
    totalCount: number;
    isAll: boolean;
    selectedElements: Array<{id, name}> | null;
  }>;
}
```

**POST /api/combinations/strategy** (v2):
```typescript
Request: {
  templateId: string;
  strategyConfig: Record<string, string[]>;
}

Response: {
  total: number;
  created: number;
  skipped: number;
  createdKeys: string[];
}
```

#### 3. 数据验证 (`src/schemas/`)

**Schema版本管理**:
```typescript
// v1 (已弃用)
StrategyGenerationRequestSchemaV1

// v2 (当前)
StrategyGenerationRequestSchemaV2

// 默认导出v2
export const StrategyGenerationRequestSchema = StrategyGenerationRequestSchemaV2;
```

### 前端实现

#### 1. React Hooks (`src/hooks/`)

**模板Hooks** (`use-templates.ts`):
```typescript
// 获取模板引用的库列表
useTemplateLibraries(templateId: string)
```

**组合Hooks** (`use-combinations.ts`):
```typescript
// 预览组合数（不实际生成）
usePreviewCombinations()

// 生成策略组合
useGenerateCombinations()
```

**Query Keys** (`query-client.ts`):
```typescript
queryKeys.templates.libraries(id)
```

#### 2. UI组件 (`src/components/combinations/`)

**策略生成对话框** (`strategy-generation-dialog.tsx`):
- 4步骤向导：Template → Configure → Preview → Confirm
- 步骤指示器（带CheckCircle完成标记）
- 响应式布局（max-w-2xl, max-h-90vh）

**库元素选择器** (`LibraryElementSelector`):
- Checkbox Group多选
- 全选/清空按钮
- 选中数量实时显示
- 最大高度32 + 滚动

## 📊 数据流

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 用户选择模板                                            │
│    ↓                                                         │
│ 2. GET /api/templates/[id]/libraries                        │
│    → 解析模板content，提取{{library.field}}                 │
│    → 返回libraries列表 + 每个库的entryCount                 │
│    ↓                                                         │
│ 3. 用户多选各库元素                                         │
│    strategyConfig = { character: ['id1', 'id2'], ... }      │
│    ↓                                                         │
│ 4. POST /api/combinations/preview                           │
│    → ComboManager.calculateDynamicCombinationCount()        │
│    → 返回totalCombinations + librarySummary                 │
│    ↓                                                         │
│ 5. 用户确认                                                 │
│    ↓                                                         │
│ 6. POST /api/combinations/strategy                          │
│    → ComboManager.enumerateDynamicCombinations()            │
│    → 生成笛卡尔积：generateCartesianProduct()               │
│    → 批量创建Combination记录                                │
│    ↓                                                         │
│ 7. 返回created/skipped统计                                  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 使用示例

### 1. 后端API调用

```bash
# 获取模板引用的库
curl http://localhost:3000/api/templates/template_main_v1/libraries

# 预览组合数
curl -X POST http://localhost:3000/api/combinations/preview \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "template_main_v1",
    "strategyConfig": {
      "character": ["char_betty_v1"],
      "theme": ["theme_christmas_v1", "theme_halloween_v1"],
      "scene": []
    }
  }'

# 生成组合
curl -X POST http://localhost:3000/api/combinations/strategy \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "template_main_v1",
    "strategyConfig": {
      "character": ["char_betty_v1", "char_alice_v1"],
      "theme": ["theme_christmas_v1"],
      "scene": ["scene_bedroom_v1", "scene_garden_v1"]
    }
  }'
```

### 2. 前端组件使用

```tsx
import { StrategyGenerationDialog } from '@/components/combinations/strategy-generation-dialog';

function CombinationsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        策略生成
      </Button>

      <StrategyGenerationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
```

### 3. Hooks使用

```tsx
// 获取模板引用的库
const { data: templateLibraries } = useTemplateLibraries('template_main_v1');
// templateLibraries.libraries: [
//   { name: 'character', displayName: '人物', entryCount: 3, ... },
//   { name: 'theme', displayName: '主题', entryCount: 5, ... }
// ]

// 预览组合数
const previewMutation = usePreviewCombinations();
await previewMutation.mutateAsync({
  templateId: 'template_main_v1',
  strategyConfig: {
    character: ['char_betty_v1'],
    theme: [],  // 空=全选
  }
});
// previewMutation.data.totalCombinations: 5

// 生成组合
const generateMutation = useGenerateCombinations();
await generateMutation.mutateAsync({
  templateId: 'template_main_v1',
  strategyConfig: { /* ... */ }
});
// generateMutation.data: { created: 5, skipped: 0, total: 5 }
```

## 🔧 关键文件清单

### 后端 (7个文件)
```
src/lib/utils/template-parser.ts                    # 模板解析
src/lib/generators/combo-manager.ts                 # 组合计算（增强）
src/app/api/templates/[id]/libraries/route.ts       # 库解析API
src/app/api/combinations/preview/route.ts           # 预览API
src/app/api/combinations/strategy/route.ts          # 策略生成API (重写)
src/schemas/combination.schema.ts                   # Schema版本管理
```

### 前端 (4个文件)
```
src/hooks/use-templates.ts                          # useTemplateLibraries
src/hooks/use-combinations.ts                       # usePreviewCombinations
src/lib/api/query-client.ts                         # queryKeys更新
src/components/combinations/strategy-generation-dialog.tsx  # UI组件（重写）
```

## 📝 Git Commits

```bash
# Phase 1: 后端核心工具
feat(backend): 实现模板解析和组合计算增强

# Phase 2: API端点
feat(api): 添加模板库解析和组合预览端点，增强策略生成API

# Phase 3.3: React Hooks
feat(hooks): 添加策略生成支持的React Hooks

# Phase 3: UI组件
feat(ui): 重构策略生成对话框支持多选和4步骤向导
```

## ✅ 验证清单

- [x] 后端模板解析正确提取库引用
- [x] MAIN模板验证禁止decorative_props
- [x] 组合数计算支持任意库的笛卡尔积
- [x] 预览API返回准确的组合数和摘要
- [x] 策略生成API支持v2格式并生成Record
- [x] Hooks集成React Query缓存
- [x] UI组件4步骤流程完整
- [x] 多选元素交互流畅
- [x] 预览面板信息完整
- [x] 错误处理和验证完善
- [x] **E2E测试通过** (Playwright MCP, 2025-11-22)

## 🧪 E2E测试结果

**测试日期**: 2025-11-22
**测试工具**: Playwright MCP
**测试状态**: ✅ 全部通过

### 测试场景

选择模板 `template_default_v1` (MAIN)，配置：
- **人物**: betty (1/2)
- **姿态**: 全选 (3个)
- **场景**: 全选 (3个)
- **主题**: 圣诞节, 万圣节 (2/3)
- **画风**: 全选 (2个)

**预期组合数**: 1 × 3 × 3 × 2 × 2 = **36个**

### 测试步骤与结果

1. **Step 1 - 选择模板** ✅
   - 点击"策略生成"按钮，对话框打开
   - 选择模板 `template_default_v1`
   - API `/api/templates/[id]/libraries` 成功返回5个库元素

2. **Step 2 - 配置元素** ✅
   - 显示5个库的Checkbox Group
   - 选中 betty (人物: 1/2)
   - 选中 圣诞节, 万圣节 (主题: 2/3，多选功能正常)
   - 其他库留空（全选）

3. **Step 3 - 预览** ✅
   - 预览API `/api/combinations/preview` 计算组合数
   - 显示：**预计生成组合数 36 个** (计算正确)
   - 库选择情况摘要：
     - 人物: 1/2个 (betty)
     - 姿态: 全选 (3个)
     - 场景: 全选 (3个)
     - 主题: 2/3个 (圣诞节, 万圣节)
     - 画风: 全选 (2个)

4. **Step 4 - 确认生成** ✅
   - 点击"确认生成 36 个组合"
   - API `/api/combinations/strategy` 成功创建记录
   - Toast通知: "组合生成成功 - 创建了 36 个组合 (0 个已存在)"
   - 对话框自动关闭
   - 页面更新显示 "共 36 个组合"
   - 分页显示: 1 / 2

5. **数据库验证** ✅
   - 数据库记录数: 36个
   - combinationKey格式正确
   - libraryIds包含正确的元素ID
   - strategyConfig正确保存原始配置

### 发现的问题与修复

**问题**: Next.js 15+ `params` 必须 await
**错误**: `Argument 'where' needs at least one of 'id' or 'name'`
**原因**: `/api/templates/[id]/libraries` 路由未 await params
**修复**: `const { id } = await params;`
**提交**: `70cb664` - fix(api): Await params in template libraries endpoint

### 截图

生成成功后的组合列表页面保存在:
`/Users/samwong/Desktop/1Project/promptgen-next/.playwright-mcp/strategy-generation-success.png`

## 🎨 UI截图说明

### Step 1: 选择模板
- 模板下拉选择器（显示category badge）
- 引用库列表卡片（显示库名和元素数量）

### Step 2: 配置元素
- 每个库独立Card
- Checkbox Group 2列布局
- 全选/清空按钮
- 选中数量Badge实时更新

### Step 3: 预览
- 大号组合数Badge
- 模板信息卡片
- 库选择情况详细列表（全选/部分选中状态）

### Step 4: 确认生成
- 显示生成进度
- 成功后关闭对话框
- Toast通知创建结果

## 🔄 后续优化方向

1. **性能优化**
   - 大量组合时分页加载
   - 虚拟滚动优化库元素列表
   - 预览计算缓存

2. **功能增强**
   - 保存策略配置为模板
   - 批量删除组合
   - 组合去重检测
   - 导出组合列表

3. **用户体验**
   - 快捷键支持（Esc关闭、Enter确认）
   - 加载骨架屏
   - 操作撤销功能
   - 配置历史记录

## 📚 相关文档

- [PRD v2.0](./update_prd.md) - 产品需求文档
- [Combination Management](./COMBINATION_MANAGEMENT.md) - 组合管理详细说明
- [API Mapping](./API_MAPPING.md) - API端点映射表

---

**版本**: 2.0
**更新日期**: 2025-11-21
**作者**: Claude Code AI Assistant
