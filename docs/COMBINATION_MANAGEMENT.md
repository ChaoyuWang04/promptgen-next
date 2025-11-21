# 组合管理功能文档

## 概述

组合管理面板是一个用于管理元素组合（而非单个图片）的功能模块。它允许用户通过策略配置批量生成组合，并为每个组合生成多个变体图片。

## 核心概念

### 组合 (Combination)
- 一组特定的库元素选择，如 "Betty + 圣诞 + 家门口"
- 唯一标识：`combinationKey`（如 `betty_christmas_entrance`）
- 每个组合可以有多个变体图片 (v1, v2, v3...)

### 变体 (Variant)
- 同一组合的不同图片版本
- 每个变体包含：main图、diff图、final图（多语言）
- 变体编号从 1 开始递增

### 策略生成
- 通过配置固定/可变库来批量生成组合
- 例如：固定人物=Betty，可变=主题×场景 → 生成所有 Betty+主题+场景 组合

## 数据结构

### Combination 模型
```prisma
model Combination {
  id              String   @id @default(cuid())
  combinationKey  String   @unique
  libraryIds      Json     // {"character": "char_betty_v1", ...}
  templateId      String?
  strategyConfig  Json?    // {"fixed": [...], "variable": [...]}
  records         Record[]
  createdAt       DateTime
  updatedAt       DateTime
}
```

### Record 模型更新
- 新增 `combinationId` 关联字段
- 新增 `variantNumber` 变体编号

## 文件存储结构

```
public/images/combinations/
└── betty_christmas_entrance/
    ├── v1_main.png
    ├── v1_diff.png
    ├── v1_final_en.png
    ├── v1_final_ja.png
    ├── v2_main.png
    ├── v2_diff.png
    └── ...
```

## API 端点

### 组合管理
| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/combinations` | GET | 获取组合列表（分页、筛选） |
| `/api/combinations` | POST | 创建单个组合 |
| `/api/combinations/[id]` | GET | 获取组合详情及所有变体 |
| `/api/combinations/[id]` | DELETE | 删除组合及关联数据 |

### 生成相关
| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/combinations/strategy` | POST | 策略批量生成组合 |
| `/api/combinations/[id]/generate` | POST | 生成新变体 |
| `/api/combinations/[id]/variants/[variantId]/language` | POST | 生成语言版本 |

## UI 组件

### 页面结构
- **左侧面板**：组合列表（搜索、筛选、分页）
- **右侧面板**：组合详情（信息、生成按钮、变体列表）

### 主要组件
- `CombinationList` - 组合列表
- `CombinationDetail` - 详情面板
- `VariantCard` - 变体卡片（图片展示、语言切换）
- `StrategyGenerationDialog` - 策略生成对话框

## 使用流程

### 1. 策略生成组合
1. 点击"策略生成"按钮
2. 选择模板
3. 配置每个库：
   - **固定**：选择具体元素（如人物=Betty）
   - **可变**：枚举所有元素（如所有主题）
4. 预览组合数量
5. 确认生成

### 2. 生成变体图片
1. 从列表选择组合
2. 在详情面板点击"生成图片 (vN)"
3. 系统自动执行：
   - 生成 Prompt（main + diff）
   - 调用 AI 生成图片（main + diff）
   - 拼接 final 图（默认英语）
4. 结果显示在变体列表中

### 3. 切换语言版本
1. 在变体卡片中选择语言
2. 如果该语言版本不存在，系统自动生成
3. 生成后可下载或查看原图

## React Query Hooks

```typescript
// 获取组合列表
const { data } = useCombinations({ search, page, pageSize });

// 获取组合详情
const { data } = useCombination(id);

// 生成变体
const { mutate } = useGenerateVariant();
mutate(combinationId);

// 生成语言版本
const { mutate } = useGenerateLanguage();
mutate({ combinationId, variantId, language });

// 策略生成
const { mutate } = useGenerateCombinations();
mutate({ templateId, strategyConfig });

// 删除组合
const { mutate } = useDeleteCombination();
mutate(id);
```

## 配置要求

### 环境变量
```env
# AI Provider 配置
IMAGE_PROVIDERS=gemini
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.5-flash-image

# 可选：ByteDance Provider
BYTEDANCE_API_KEY=your_api_key
BYTEDANCE_MODEL=doubao-seedream-4-0-250828
```

## 新增文件清单

### API 路由
- `src/app/api/combinations/route.ts`
- `src/app/api/combinations/[id]/route.ts`
- `src/app/api/combinations/[id]/generate/route.ts`
- `src/app/api/combinations/[id]/variants/[variantId]/language/route.ts`
- `src/app/api/combinations/strategy/route.ts`

### UI 组件
- `src/app/(dashboard)/combinations/page.tsx`
- `src/components/combinations/combination-list.tsx`
- `src/components/combinations/combination-detail.tsx`
- `src/components/combinations/variant-card.tsx`
- `src/components/combinations/strategy-generation-dialog.tsx`

### 业务逻辑
- `src/hooks/use-combinations.ts`
- `src/schemas/combination.schema.ts`
- `src/lib/utils/file-manager.ts`

### 数据库
- `prisma/migrations/20251120..._add_combination_model/`

## 后续优化建议

1. **批量生成变体**：一键为所有组合生成变体
2. **筛选增强**：按库元素筛选组合
3. **预览功能**：快速预览 main/diff 图
4. **导出功能**：批量导出选中的 final 图
5. **性能优化**：使用虚拟列表处理大量组合

---

*文档版本：1.0*
*更新日期：2025-11-20*
