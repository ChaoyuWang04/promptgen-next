# PromptGen API Endpoint Mapping
# Flask → Next.js Migration

**文档版本**: 1.0.0
**创建日期**: 2025-11-15
**Flask端点总数**: 45
**Next.js端点总数**: 45

---

## 目录

1. [映射概览](#1-映射概览)
2. [详细端点映射](#2-详细端点映射)
3. [Breaking Changes](#3-breaking-changes)
4. [请求/响应格式变更](#4-请求响应格式变更)

---

## 1. 映射概览

### 1.1 端点分类

| 类别 | Flask端点数 | Next.js端点数 | 说明 |
|------|-----------|--------------|------|
| Health & Status | 3 | 3 | 健康检查 |
| Library Management | 6 | 6 | 库CRUD |
| Prompt Generation | 8 | 8 | Prompt生成 |
| Templates | 11 | 11 | 模板管理 |
| Records | 5 | 5 | 记录管理 |
| Images | 7 | 7 | 图片生成 |
| Sync | 7 | 7 | 同步管理 |
| Providers | 3 | 3 | Provider管理 |
| **总计** | **45** | **45** | 100%覆盖 |

### 1.2 路由结构对比

| Flask | Next.js | 说明 |
|-------|---------|------|
| `/api/libraries/<name>` | `/api/libraries/[name]` | 动态路由 |
| `/api/libraries/<name>/<id>` | `/api/libraries/[name]/[id]` | 嵌套动态路由 |
| `/api/generate/batch/progress` | `/api/generate/batch/progress` | 无变化 |

---

## 2. 详细端点映射

### 2.1 Health & Status (3个端点)

#### 2.1.1 基础健康检查

| Flask | Next.js | 方法 | 说明 |
|-------|---------|------|------|
| `GET /api/health` | `GET /api/health` | GET | 基础ping |

**Flask实现** (`api.py:100-106`):
```python
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "PromptGen API is running"})
```

**Next.js实现** (`src/app/api/health/route.ts`):
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: { status: 'ok', message: 'PromptGen API is running' }
  });
}
```

#### 2.1.2 库健康检查

| Flask | Next.js | 方法 | 说明 |
|-------|---------|------|------|
| `GET /api/health/libraries` | `GET /api/health/libraries` | GET | 库文件验证 |

#### 2.1.3 Gemini健康检查

| Flask | Next.js | 方法 | 说明 |
|-------|---------|------|------|
| `GET /api/health/gemini` | `GET /api/providers/gemini/health` | GET | 测试Gemini API |

**Breaking Change**: 路径变更，从`/api/health/gemini` → `/api/providers/gemini/health`

---

### 2.2 Library Management (6个端点)

#### 2.2.1 获取库配置

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/libraries/config` | `GET /api/libraries/config` | GET |

**请求**: 无参数
**响应**:
```json
{
  "success": true,
  "data": {
    "enabled_libraries": [...],
    "total_count": 6
  }
}
```

#### 2.2.2 获取库条目列表

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/libraries/<name>` | `GET /api/libraries/[name]` | GET |

**请求参数**: `name` (character, pose, scene, theme, style, decorative_props)

**Flask**: `api.py:944-975`
**Next.js**: `src/app/api/libraries/[name]/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const library = await prisma.library.findUnique({ where: { name } });
  return NextResponse.json({
    success: true,
    data: library.entries
  });
}
```

#### 2.2.3 添加库条目

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/libraries/<name>` | `POST /api/libraries/[name]` | POST |

**请求体**:
```json
{
  "id": "char_example_v1",
  "name": "Example",
  "appearance_core": "..."
}
```

**响应**:
```json
{
  "success": true,
  "data": { "id": "char_example_v1", ... }
}
```

#### 2.2.4 更新库条目

| Flask | Next.js | 方法 |
|-------|---------|------|
| `PUT /api/libraries/<name>/<id>` | `PUT /api/libraries/[name]/[id]` | PUT |

#### 2.2.5 删除库条目

| Flask | Next.js | 方法 |
|-------|---------|------|
| `DELETE /api/libraries/<name>/<id>` | `DELETE /api/libraries/[name]/[id]` | DELETE |

#### 2.2.6 获取新条目模板

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/libraries/<name>/template` | `GET /api/libraries/[name]/template` | GET |

---

### 2.3 Prompt Generation (8个端点)

#### 2.3.1 生成主图Prompt

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/generate/main` | `POST /api/generate/main` | POST |

**请求体** (Phase 2格式):
```json
{
  "library_ids": {
    "character": "char_betty_v1",
    "pose": "pose_turn_back_smile_v1",
    "scene": "scene_living_sofa_v1",
    "theme": "theme_halloween_v1",
    "style": "style_retro1950_flat_v1"
  },
  "template_id": "template_default_v1"  // 可选
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "image_id": "betty_turnback_living_halloween_retro50s_0001",
    "prompt_cn": "...",
    "prompt_en": "...",
    "record_id": "cuid123"
  }
}
```

**Breaking Change**:
- ❌ 旧格式（不再支持）: `{"character_id": "...", "pose_id": "..."}`
- ✅ 新格式（必须）: `{"library_ids": {"character": "...", ...}}`

#### 2.3.2 生成Diff Prompt

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/generate/diff` | `POST /api/generate/diff` | POST |

**请求体**:
```json
{
  "image_id": "betty_turnback_living_halloween_retro50s_0001",
  "library_ids": {  // 可选，选择性修改
    "pose": "pose_new_v1"
  }
}
```

#### 2.3.3 自定义Diff生成

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/generate/diff/custom` | `POST /api/generate/diff/custom` | POST |

**请求体**:
```json
{
  "image_id": "...",
  "color_changes": [
    {"element": "鞋子", "new_color": "蓝色"}
  ],
  "new_decorations": ["道具1", "道具2"]
}
```

#### 2.3.4 批量Prompt生成

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/generate/batch` | `POST /api/generate/batch` | POST |

**请求体**:
```json
{
  "library_filter": {  // 可选筛选
    "character_ids": ["char_betty_v1"],
    "theme_ids": null  // null表示全选
  }
}
```

#### 2.3.5 批量生成进度查询

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/generate/batch/progress` | `GET /api/generate/batch/[batchId]/progress` | GET |

**Breaking Change**: 增加`batchId`参数

---

### 2.4 Templates (11个端点)

#### 2.4.1 列出模板

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/templates/list` | `GET /api/templates` | GET |

**Breaking Change**: 路径简化 `list` → ``

**查询参数**:
- `type`: SYSTEM | USER
- `category`: MAIN | DIFF

#### 2.4.2 创建模板

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/templates` | `POST /api/templates` | POST |

**请求体**:
```json
{
  "name": "my_template_v1",
  "description": "我的自定义模板",
  "type": "USER",
  "category": "MAIN",
  "content": "角色：{{@module:character}}\n..."
}
```

#### 2.4.3 获取模板

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/templates/<id>` | `GET /api/templates/[id]` | GET |

#### 2.4.4 更新模板

| Flask | Next.js | 方法 |
|-------|---------|------|
| `PUT /api/templates/<id>` | `PUT /api/templates/[id]` | PUT |

#### 2.4.5 删除模板

| Flask | Next.js | 方法 |
|-------|---------|------|
| `DELETE /api/templates/<id>` | `DELETE /api/templates/[id]` | DELETE |

#### 2.4.6 预览模板

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/templates/preview` | `POST /api/templates/preview` | POST |

**请求体**:
```json
{
  "content": "角色：{{@module:character}}",
  "library_ids": {...},
  "seed": 42  // 可选，用于测试一致性
}
```

#### 2.4.7 验证模板

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/templates/validate` | `POST /api/templates/validate` | POST |

**响应**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": []
  }
}
```

#### 2.4.8 获取变量列表（主图）

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/templates/variables` | `GET /api/templates/variables` | GET |

**响应**:
```json
{
  "success": true,
  "data": {
    "variables": [
      {
        "name": "character.name",
        "type": "string",
        "description": "人物名称",
        "example": "betty"
      },
      ...
    ],
    "total_count": 39
  }
}
```

#### 2.4.9 获取变量列表（Diff）

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/templates/diff/variables` | `GET /api/templates/diff/variables` | GET |

**响应**: 45个变量（比主图多6个）

#### 2.4.10 验证Diff模板

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/templates/diff/validate` | `POST /api/templates/diff/validate` | POST |

#### 2.4.11 预览Diff模板

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/templates/diff/preview` | `POST /api/templates/diff/preview` | POST |

---

### 2.5 Records (5个端点)

#### 2.5.1 获取记录列表

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/records` | `GET /api/records` | GET |

**查询参数**:
- `page`: 页码
- `limit`: 每页数量
- `filter`: pending | generated | failed

#### 2.5.2 获取记录详情

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/records/<id>` | `GET /api/records/[id]` | GET |

#### 2.5.3 获取记录所有版本

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/records/<id>/variants` | `GET /api/records/[id]/variants` | GET |

#### 2.5.4 更新记录状态

| Flask | Next.js | 方法 |
|-------|---------|------|
| `PUT /api/records/<id>/status` | `PUT /api/records/[id]/status` | PUT |

#### 2.5.5 筛选记录

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/records/filter` | `GET /api/records/filter` | GET |

**查询参数**:
- `character_id`
- `prompt_generated`
- `image_generated`

---

### 2.6 Images (7个端点)

#### 2.6.1 单张图片生成

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/images/generate/single` | `POST /api/images/generate/single` | POST |

**请求体**:
```json
{
  "image_id": "betty_turnback_...",
  "language_ids": [1, 2, 3, 4, 5, 6, 7]  // 可选，默认全部
}
```

#### 2.6.2 批量图片生成

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/images/generate/batch` | `POST /api/images/generate/batch` | POST |

**请求体**:
```json
{
  "library_filter": {  // 可选筛选
    "character_ids": ["char_betty_v1"],
    "theme_ids": null
  },
  "language_ids": [1, 2, 3, 4, 5, 6, 7]
}
```

#### 2.6.3 批量生成进度

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/images/generate/batch/progress` | `GET /api/images/generate/batch/[batchId]/progress` | GET |

**Breaking Change**: 增加`batchId`路径参数

#### 2.6.4 单张生成进度

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/images/generate/single/progress/<id>` | `GET /api/images/generate/single/progress/[id]` | GET |

#### 2.6.5 手动拼接

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/images/stitch` | `POST /api/images/stitch` | POST |

#### 2.6.6 图片统计

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/images/stats` | `GET /api/images/stats` | GET |

**响应**:
```json
{
  "success": true,
  "data": {
    "total_records": 150,
    "images_generated": 100,
    "images_pending": 50,
    "images_failed": 5,
    "provider_stats": {
      "gemini": {"success": 60, "failed": 2},
      "bytedance": {"success": 40, "failed": 3}
    }
  }
}
```

#### 2.6.7 重试失败

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/images/retry-failed` | `POST /api/images/retry-failed` | POST |

---

### 2.7 Sync (7个端点)

#### 2.7.1 基础同步检查

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/sync/check` | `GET /api/sync/check` | GET |

#### 2.7.2 基础修复

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/sync/repair` | `POST /api/sync/repair` | POST |

#### 2.7.3 完整报告

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/sync/report` | `GET /api/sync/report` | GET |

#### 2.7.4 深度检查

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/sync/deep-check` | `GET /api/sync/deep-check` | GET |

#### 2.7.5 查找孤立文件

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/sync/orphans` | `GET /api/sync/orphans` | GET |

#### 2.7.6 清理孤立文件

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/sync/orphans/clean` | `POST /api/sync/orphans/clean` | POST |

#### 2.7.7 一键修复所有

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/sync/repair-all` | `POST /api/sync/repair-all` | POST |

**请求体**:
```json
{
  "dry_run": false,  // true为预览模式
  "categories": ["library_config", "invalid_refs", "prompts", "images"]
}
```

---

### 2.8 Providers (3个端点)

#### 2.8.1 Provider状态

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/providers/status` | `GET /api/providers/status` | GET |

**响应**:
```json
{
  "success": true,
  "data": {
    "gemini": {
      "status": "healthy",
      "api_key_configured": true,
      "last_check": "2025-11-15T10:00:00Z"
    },
    "bytedance": {
      "status": "healthy",
      "api_key_configured": true
    }
  }
}
```

#### 2.8.2 Provider统计

| Flask | Next.js | 方法 |
|-------|---------|------|
| `GET /api/providers/stats` | `GET /api/providers/stats` | GET |

**响应**:
```json
{
  "success": true,
  "data": {
    "gemini": {
      "total_requests": 100,
      "successful_requests": 95,
      "failed_requests": 5,
      "success_rate": 0.95,
      "average_response_time_ms": 1500
    },
    "bytedance": { ... }
  }
}
```

#### 2.8.3 测试Provider

| Flask | Next.js | 方法 |
|-------|---------|------|
| `POST /api/providers/test` | `POST /api/providers/test` | POST |

**请求体**:
```json
{
  "provider": "gemini",
  "test_prompt": "A simple test image"
}
```

---

## 3. Breaking Changes

### 3.1 路径变更

| 旧路径 | 新路径 | 原因 |
|--------|--------|------|
| `/api/health/gemini` | `/api/providers/gemini/health` | 更符合RESTful规范 |
| `/api/templates/list` | `/api/templates` | 简化路径 |
| `/api/generate/batch/progress` | `/api/generate/batch/[batchId]/progress` | 更清晰的资源标识 |

### 3.2 请求格式变更

#### 主图生成 (`POST /api/generate/main`)

**旧格式** (Phase 1, 不再支持):
```json
{
  "character_id": "char_betty_v1",
  "pose_id": "pose_turn_back_smile_v1",
  "scene_id": "scene_living_sofa_v1",
  "theme_id": "theme_halloween_v1",
  "style_id": "style_retro1950_flat_v1"
}
```

**新格式** (Phase 2, 必须):
```json
{
  "library_ids": {
    "character": "char_betty_v1",
    "pose": "pose_turn_back_smile_v1",
    "scene": "scene_living_sofa_v1",
    "theme": "theme_halloween_v1",
    "style": "style_retro1950_flat_v1"
  }
}
```

### 3.3 响应格式统一

**Flask**: 不统一，各端点响应格式不同
**Next.js**: 统一格式

**成功响应**:
```json
{
  "success": true,
  "data": { ... },
  "message": "可选说明"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR",
    "message": "错误描述",
    "details": { ... }  // 可选
  }
}
```

---

## 4. 请求/响应格式变更

### 4.1 分页

**Flask**: 使用query参数 `?page=1&limit=20`
**Next.js**: 同上，无变化

### 4.2 错误代码

| Flask | Next.js | HTTP状态码 |
|-------|---------|-----------|
| 无统一错误码 | `VALIDATION_ERROR` | 400 |
| 无统一错误码 | `NOT_FOUND` | 404 |
| 无统一错误码 | `INTERNAL_ERROR` | 500 |
| 无统一错误码 | `UNAUTHORIZED` | 401 |

### 4.3 时间格式

**Flask**: 字符串格式不统一
**Next.js**: 统一ISO 8601格式

```json
{
  "createdAt": "2025-11-15T10:30:45.123Z"
}
```

---

## 5. 迁移检查清单

### 前端客户端迁移

- [ ] 更新API基础URL
- [ ] 修改请求格式（library_ids）
- [ ] 更新响应处理（success字段）
- [ ] 更新错误处理（error.code）
- [ ] 更新路径（移除`/list`后缀）
- [ ] 更新进度端点（添加batchId）

### 测试

- [ ] 所有端点单元测试
- [ ] 集成测试
- [ ] 错误处理测试
- [ ] 性能测试

---

**文档结束** - 返回 [`REFACTOR.md`](./REFACTOR.md) 查看完整架构设计
