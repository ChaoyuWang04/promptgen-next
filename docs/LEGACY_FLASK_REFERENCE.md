# Flask系统架构参考文档 (已废弃)

⚠️ **重要说明：本文档为存档参考**

本文档记录了已废弃的Flask版本PromptGen系统架构。该系统正在被Next.js版本完全替代。

**当前系统**: 参见 `REFACTOR.md` 了解Next.js架构
**迁移进度**: 参见 `REFRACTOR_TODO.md` 了解重构进度
**最后更新**: 2025-11-16

---

## 一、系统概述

### 1.1 系统目标
构建**稳定可控的休闲游戏广告素材自动生成系统**，通过AI驱动生成主图与对比图（微改图），提升IAA广告素材生产效率，实现规模化出图与快速A/B测试。

### 1.2 核心架构
系统分为**两个生成阶段**:
1. **主图生成阶段**: 通过Prompt拼接生成原始广告素材
2. **对比图生成阶段**: 基于生成记录进行局部改动（11-12处细节变化）

### 1.3 设计灵感
采用**NFT collection生成逻辑**: 通过模块化素材库与组合规则自动生成稳定画面结构。

### 1.4 技术栈
- **后端**: Python 3.x + Flask
- **数据存储**: JSON文件系统
- **前端**: Vanilla JavaScript + 自定义CSS
- **AI Provider**: Google Gemini, ByteDance Doubao
- **图片处理**: Pillow (PIL)

---

## 二、核心模块速查

### 2.1 12个核心Python模块

| 模块 | 职责 | 关键接口 |
|------|------|----------|
| `data_loader.py` | 六库加载与LRU缓存 | `load_character()`, `load_all_libraries()` |
| `prompt_generator.py` | 主图生成(7模块拼接) | `generate_main_prompt(...)` |
| `diff_prompt_generator.py` | 对比图生成(3改色+8-9小物) | `generate_diff_prompt(image_id)` |
| `record_generator.py` | 生成记录CRUD+多版本管理 | `create_and_save_record()`, `add_variant()` |
| `combo_manager.py` | 组合枚举与状态追踪 | `enumerate_all_combinations()`, `sync_combinations()` |
| `batch_generator.py` | 批量生成协调器 | `generate_all_pending(callback)` |
| `sync_manager.py` | 数据一致性检查修复 | `check_sync_status()`, `repair_inconsistencies()` |
| `template_engine.py` | 模板渲染引擎(混合模式) | `render_template()`, `validate_template()` |
| `provider_manager.py` | 多Provider调度与Fallback | `generate_with_fallback()`, `check_health()` |
| `stitch_generator.py` | 多语言图片拼接 | `stitch_images()`, `create_final_image()` |
| `utils.py` | 工具函数 | `generate_image_id()`, `parse_image_id()` |
| `providers/*.py` | Provider抽象层 | `ImageGeneratorProvider`, `GeminiProvider` |

### 2.2 主要功能模块

#### Template Editor System (模板编辑器 v2.0)
- **模板引擎**: 支持 `{{@module:character}}` 调用预定义模块
- **Web编辑器**: Notion风格文本编辑，`{{` 触发自动补全
- **39个变量**: 用于主图模板
- **45个变量**: 用于对比图模板（含7个命名空间）
- **输出一致性**: 与原始generator在相同随机种子下100%一致

#### Provider Manager (多Provider架构)
- **自动Fallback**: 按优先级依次尝试Provider直到成功
- **风格一致性**: 同一image_id的主图与对比图强制使用同一Provider
- **健康检查**: 实时监控API key和SDK状态
- **支持的Provider**: Gemini (Google), ByteDance Doubao

#### Diff Template System (对比图系统)
- **架构重构**: `BaseTemplateEditor` → `MainTemplateEditor` / `DiffTemplateEditor`
- **代码复用率**: 60%以上逻辑由基类提供
- **智能过滤器**: 自动处理dict→name提取、outfit_state格式化

### 2.3 Web应用架构

**后端 (api.py)**:
- Flask REST API **35个有效端点**
- 库管理: `GET/POST/PUT/DELETE /api/libraries/<name>`
- 生成: `POST /api/generate/main`, `/diff`, `/diff/custom`
- 批量: `POST /api/generate/batch`
- 图片: `POST /api/images/generate/batch`
- 同步: `POST /api/sync/repair-all`
- Provider管理: `GET /api/providers/status`, `/stats`
- Template管理: `POST /api/templates/preview`, `GET /api/templates/variables`

**前端 (web/)**:
- `index.html` - 主页面（三栏布局）
- `library_management.html` - 库管理界面
- `template_editor.html` - 模板编辑器
- `js/library-config.js` - 集中式配置管理器（330行）
- `js/app.js` - 主应用逻辑
- `js/dev-mode.js` - 开发者调试面板

---

## 三、数据结构与文件规范

### 3.1 核心数据结构

#### 生成记录 (Generation Record)
```json
{
  "image_id": "betty_turnback_living_halloween_retro50s_0001",
  "library_ids": {
    "character": "char_betty_v1",
    "pose": "pose_turn_back_smile_v1",
    "scene": "scene_living_sofa_v1",
    "theme": "theme_halloween_v1",
    "style": "style_retro1950_flat_v1"
  },
  "character_id": "char_betty_v1",  // 向后兼容
  "theme_id": "theme_halloween_v1",
  "outfit_minor_state": [
    {"element": "鞋子", "current_color": "红色"}
  ],
  "used_decorations": {
    "from_theme": ["小南瓜", "蝙蝠剪纸"],
    "from_scene": []
  },
  "variants": [
    {
      "version": 1,
      "image_main_path": "images/.../v1_main.png",
      "image_diff_path": "images/.../v1_diff.png",
      "final_images": {
        "en": "images/.../v1_final_en.png",
        "fr": "images/.../v1_final_fr.png",
        // ... 7种语言
      },
      "generated_at": "2025-11-07T15:37:59"
    }
  ],
  "provider_used": "bytedance",
  "provider_attempts": [
    {
      "provider": "gemini",
      "success": false,
      "error": "API quota exceeded"
    }
  ]
}
```

#### 对比图改动规则
- **改色**: 固定3处outfit_minor元素
- **添加小物**: 8-9件（3-5件从主题库 + 剩余从通用库）
- **总改动**: 11-12处细节变化
- **约束**: 不改场景物体、主题装饰、outfit_major、姿态

### 3.2 文件路径规范

#### 库文件
```
data/
├── character.json          # 人物库
├── pose.json              # 姿态库
├── scene.json             # 场景库
├── theme.json             # 主题库
├── style.json             # 画风库
└── decorative_props.json  # 装饰小物件库
```

#### 生成记录与图片
```
records/{image_id}.json
prompts/{image_id}_main.txt
prompts/{image_id}_diff.txt

images/{image_id}/
├── v1_main.png
├── v1_diff.png
├── v1_final_en.png
├── v1_final_fr.png
├── v1_final_ja.png
├── v1_final_ko.png
├── v1_final_de.png
├── v1_final_es.png
└── v1_final_zh.png
```

### 3.3 命名约定

#### Image ID格式
```
{character}_{pose}_{scene}_{theme}_{style}_{sequence}
```
示例: `betty_turnback_living_halloween_retro50s_0001`

#### 库ID格式
- Character: `char_{name}_v{version}` (如 `char_betty_v1`)
- Pose: `pose_{action}_v{version}` (如 `pose_turn_back_smile_v1`)
- Scene: `scene_{location}_v{version}` (如 `scene_living_sofa_v1`)
- Theme: `theme_{name}_v{version}` (如 `theme_halloween_v1`)
- Style: `style_{name}_v{version}` (如 `style_retro1950_flat_v1`)
- Prop: `prop_{name}` (如 `prop_pocket_watch`)

---

## 四、关键系统特性

### 4.1 Phase 2 - 动态库系统

**设计理念**:
- 从静态5库系统演进到动态N库系统
- 消除115处硬编码引用
- 支持3-N个库的任意组合

**核心组件**:
1. **config/library_config.py** - 集中式库配置元数据
2. **web/js/library-config.js** - 前端配置管理器（17个API方法）
3. **动态ID系统** - `generate_dynamic_image_id()`, `parse_dynamic_image_id()`

**双格式支持**:
- 新格式: `library_ids` (字典)
- 旧格式: `character_id`, `pose_id` 等（向后兼容）

**性能提升**:
| 指标 | Phase 1 | Phase 2 |
|------|---------|---------|
| 硬编码引用 | 115处 | 0处 |
| 添加新库耗时 | 2-3天 | 30分钟 |
| 支持库数量 | 固定5个 | 3-N个 |

### 4.2 Phase 3 - 库管理系统

**功能**:
- 可视化库列表和条目管理
- 动态表单生成（基于JSON Schema）
- 实时验证（jsonschema）
- 搜索和筛选
- 批量导入/导出
- JSON预览（语法高亮）
- 热重载机制（库创建后立即生效）

**关键文件**:
- `library_management.html` (296行)
- `js/library-manager.js` (1,131行)
- `js/library-form-builder.js` (629行)
- `js/json-previewer.js` (279行)

### 4.3 图片生成流程

#### 三轮生成流程
```
Round 1: 生成主图
- 读取 prompts/{image_id}_main.txt
- 调用 Provider API（带自动Fallback）
- 保存到 images/{image_id}/v1_main.png

Round 2: 生成对比图
- 读取 prompts/{image_id}_diff.txt
- 强制使用与主图相同的Provider
- 基于主图生成对比图
- 保存到 images/{image_id}/v1_diff.png

Round 3: 拼接最终图
- 并排拼接主图和对比图
- 添加多语言文字叠加（7种语言）
- 保存7个语言版本
```

#### 选择性生图
通过 `library_filter` 参数筛选特定组合生成，节省50-80% API token消耗。

示例：
```json
{
  "character_ids": ["char_wilma_v1"],
  "pose_ids": null,  // null = 全选
  "theme_ids": ["theme_halloween_v1"]
}
```
结果：1×3×3×1×1 = 9个组合（vs 全选54个）

### 4.4 同步管理系统

**综合同步修复系统** (2025-11-15):
- 库配置同步
- 无效库引用检测
- Prompt文件同步
- 图片variants同步
- 组合状态同步
- 孤立文件检测
- 字段完整性验证

**API端点**: `POST /api/sync/repair-all`

---

## 五、系统能力总结

### 已实现功能
- ✅ Prompt生成（主图+对比图）
- ✅ Template Editor（39/45个变量）
- ✅ 图片生成（多Provider + Fallback）
- ✅ 多版本支持（v1/v2/v3...）
- ✅ 多语言支持（7种语言）
- ✅ 批量生产
- ✅ 选择性生图
- ✅ 数据管理（库CRUD）
- ✅ 一致性保障（自动同步修复）
- ✅ 健康监控（Provider状态）

### 待完善功能
- ❌ A/B测试数据收集（广告平台API对接）
- ⚠️ 参考图系统（IP-Adapter/LoRA训练）

---

## 六、关键设计决策

### 6.1 为何选择JSON文件存储？
- **优点**: 简单直观、易于调试、无需数据库服务器
- **缺点**: 并发性能差、查询效率低、数据量大时IO瓶颈
- **适用场景**: MVP阶段、数据量小（<1000条记录）

### 6.2 为何使用LRU缓存？
`data_loader.py` 使用 `@lru_cache` 装饰器缓存库数据，避免重复读取JSON文件。

### 6.3 为何需要同步管理？
JSON文件系统缺乏事务机制，容易出现：
- Prompt文件存在但record未标记
- 图片已生成但variants数组未更新
- 组合状态与实际记录不一致

`sync_manager.py` 提供检测+修复能力。

### 6.4 为何Template Engine与原generator输出一致？
- **需求**: 过渡期需保证输出稳定性
- **实现**: 100个随机种子对比测试
- **价值**: 平滑迁移，业务无感知

---

## 七、迁移到Next.js的原因

### 7.1 Flask系统的局限性

| 问题 | 描述 | 影响 |
|------|------|------|
| **JSON文件瓶颈** | 并发写入冲突、查询效率低 | 无法扩展到1000+记录 |
| **前端技术债** | Vanilla JS、手动DOM操作 | 维护困难、代码冗长 |
| **无类型安全** | Python动态类型 + JS无验证 | 运行时错误多 |
| **部署复杂** | 需要Python环境 + 文件权限 | 运维成本高 |
| **实时性差** | 轮询机制 + 文件IO | 用户体验欠佳 |

### 7.2 Next.js的优势

| 特性 | Flask (旧) | Next.js (新) |
|------|-----------|-------------|
| **数据库** | JSON文件 | PostgreSQL + Prisma |
| **类型安全** | 无 | TypeScript全栈 |
| **UI组件** | 自定义CSS | shadcn/ui + Tailwind |
| **API层** | Flask路由 | Next.js Route Handlers |
| **部署** | 手动 | Vercel Serverless |
| **实时性** | 轮询 | Server Actions |

---

## 八、参考资源

### 8.1 代码位置
**Flask系统已归档**，代码仍在项目根目录（但不再维护）：
- `src/` - Python核心模块
- `web/` - 前端文件
- `api.py` - Flask主程序
- `data/` - JSON库文件

### 8.2 相关文档
- **架构设计**: `docs/REFACTOR.md` (Next.js系统)
- **迁移进度**: `docs/REFRACTOR_TODO.md`
- **数据库Schema**: `docs/DATABASE_SCHEMA.md`
- **API映射**: `docs/API_MAPPING.md`
- **变更日志**: `docs/changelog/` (Phase 2/3详细说明)

### 8.3 测试覆盖
- **总测试数**: 126个
- **通过率**: 81% (91个通过)
- **核心测试**:
  - Phase 2集成测试: 43个
  - Diff模板引擎: 35个
  - 向后兼容性: 12个

---

## 九、常见问题

**Q: Flask系统还能继续使用吗？**
A: 技术上可以，但不建议。系统不再接收新功能和Bug修复，仅作为参考。

**Q: 如何迁移现有数据到Next.js？**
A: 参见 `DATABASE_SCHEMA.md` 的 "数据迁移策略" 章节。库数据已完成迁移，历史records不迁移（Clean Slate策略）。

**Q: Template Engine在Next.js中如何实现？**
A: TypeScript重写，保证输出一致性。参见 `src/lib/engines/template-engine.ts`。

**Q: 为何不直接升级Flask？**
A: Flask本身很好，但：
1. JSON文件无法扩展（需要数据库）
2. 前端Vanilla JS维护成本高（需要React）
3. 无类型安全（需要TypeScript）
4. 全栈重构比局部修补更高效

---

**文档版本**: v1.0
**最后更新**: 2025-11-16
**维护状态**: 归档（仅供参考）

如需了解当前系统，请参阅 [REFACTOR.md](./REFACTOR.md)
