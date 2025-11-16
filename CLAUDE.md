## Next.js项目状态 🚀

### 当前阶段: Phase 0 完成 ✅ (2025-11-16)

**项目**: PromptGen Next.js - 现代化AI图片生成系统重构版
**技术栈**: Next.js 16.0.3 + React 19 + TypeScript + Tailwind CSS + shadcn/ui + Prisma
**状态**: 项目初始化完成，所有依赖已配置且up-to-date，开发服务器运行正常

### 已完成的初始化工作

#### 核心技术栈配置 (All Up-to-Date)
- ✅ **Next.js 16.0.3** - 最新稳定版，使用Turbopack
- ✅ **React 19.2.0** - 最新版本
- ✅ **TypeScript 5.6.3** - 严格模式配置
- ✅ **Tailwind CSS 3.4.15** - 包含shadcn/ui CSS变量系统
- ✅ **Prisma 6.0.0** - PostgreSQL ORM配置完成
- ✅ **ESLint 9.15.0** - Flat config格式
- ✅ **Vitest 2.1.6** - 单元测试框架
- ✅ **Playwright 1.48.2** - E2E测试框架

#### 质量优化修复 (2025-11-16)
1. **next.config.ts**:
   - ✅ 移除deprecated `images.domains`
   - ✅ 迁移至`remotePatterns`（支持http://localhost和https://*.supabase.co）

2. **Favicon系统**:
   - ✅ 添加`/public/favicon.svg`（简洁的蓝色"P"图标）
   - ✅ 添加`/src/app/icon.tsx`（动态生成32x32 PNG图标）

3. **TypeScript配置**:
   - ✅ Next.js 16自动优化`tsconfig.json`为`jsx: "react-jsx"`（正确配置）

4. **ESLint配置**:
   - ✅ 修复ESLint 9 flat config语法
   - ✅ 移除不存在的`defineConfig`导入

5. **Lockfiles清理**:
   - ✅ 删除冲突的父目录`yarn.lock`
   - ✅ 消除Turbopack workspace警告

#### 开发服务器状态
```
✅ Server: http://localhost:3000
✅ Start time: 374ms (Turbopack)
✅ HMR: Connected
✅ Warnings: ZERO critical warnings
✅ Console: No errors (only HMR connected message)
✅ Network: All requests return 200 (no 404s)
✅ Icon: Loading successfully
```

#### 数据库设置
- ✅ Prisma Schema定义完成（7个模型）
- ✅ `.env`配置PostgreSQL连接
- ⏳ 待执行：`npx prisma migrate dev --name init`

### 下一步计划 (Phase 1)
参考`todo.md`了解详细开发路线图

---

## 零、如何使用本文档 / 与Claude协作规范


### 文档定位与作用
本文档是Claude的**核心上下文**,在每次对话时自动加载。它记录了：
- 当前系统架构、模块职责、数据结构（⚠️ 注意：下文档案为Flask旧版本参考，Next.js新版本正在重构中）
- 当前系统操作流程、命名规范、路线图以供参考

### 协作流程规范（模糊需求处理机制）

当你提出需求时,我会按以下**架构师模式**工作:

#### 第1步: 需求分析阶段
- **深入理解**: 探索你的业务目标、技术约束、期望效果
- **澄清模糊**: 主动询问不明确的部分,避免基于假设开发
- **调研背景**: 查阅相关代码、文档、业界最佳实践

#### 第2步: 方案设计阶段
- **多方案对比**: 提出2-3个候选方案,列出各自优劣
- **技术讲解**: 阐述核心技术原理、架构设计思路
- **教学模式**: 如涉及新技术,先教会你相关背景知识
- **风险评估**: 说明潜在风险、性能影响、维护成本

#### 第3步: 实施细节商议
- **确认方案**: 你选择方案后,共同敲定实施细节
- **接口设计**: 数据结构、API定义、函数签名
- **文件组织**: 新模块位置、命名规范、依赖关系
- **分阶段计划**: 将大任务拆分为可交付的小步骤

#### 第4步: 编码与验证
- **遵循规范**: 严格按照项目现有代码风格和命名约定
- **安全优先**: 主动检查安全漏洞(SQL注入、XSS、命令注入等)
- **测试验证**: 提供测试步骤或脚本,确保功能正常
- **文档更新**: 更新CLAUDE.md对应章节,补充新增功能

#### 第5步: 更新日志留痕 ⭐
**重要**: 每次大更新完成后,必须在`docs/changelog/`记录详细更新日志
- **触发条件**: 新增核心模块、架构变更、Breaking Changes、重要优化
- **日志格式**: 参考`docs/changelog/README.md`规范
- **包含内容**: 功能摘要(面向产品) + 技术细节(面向开发者) + 迁移指南

### 使用场景示例

<details>
<summary>示例: 模糊需求"我想优化生成速度"</summary>

**我的响应流程**:
1. **需求分析**: 询问当前瓶颈在哪个环节(Prompt生成? API调用? 图片拼接?)
2. **方案设计**:
   - 方案A: 引入缓存机制(适合重复生成)
   - 方案B: 批量并发请求(适合大量首次生成)
   - 方案C: 切换更快的Provider(需要测试)
3. **技术讲解**: 说明缓存策略(LRU、TTL)、并发控制(线程池、限流)
4. **实施**: 你选择方案后,共同确定缓存键设计、过期策略
5. **文档**: 更新CLAUDE.md的性能指标,在changelog记录优化效果
</details>

<details>
<summary>示例2: 明确需求"添加新的AI图片Provider"</summary>

### 提问最佳实践

**清晰的提问**:
- ✅ "我想让系统支持视频素材生成,需要改哪些模块?"
- ✅ "当前批量生成54组合需要10分钟,能优化到5分钟吗?"
- ✅ "A/B测试数据应该存在数据库还是JSON文件?"

**模糊的提问**:
- ⚠️ "能不能优化一下?" (什么方面的优化?)
- ⚠️ "加个新功能" (什么功能?解决什么问题?)
- ⚠️ "这个不太好" (哪里不好?期望是什么?)

**我的承诺**: 即使提问模糊,我也会主动澄清,确保理解你的真实需求。

---

## 一、项目概述

### 系统目标
构建一套**稳定可控的休闲游戏广告素材自动生成系统**,通过AI驱动生成主图与对比图(微改图),提升IAA广告素材生产效率,实现规模化出图与快速A/B测试。

### 核心架构
系统分为**两个生成阶段**:
1. **主图生成阶段**: 通过Prompt拼接生成原始广告素材
2. **对比图生成阶段**: 基于生成记录进行局部改动(11-12处细节变化)

### 设计灵感
采用**NFT collection生成逻辑**: 通过模块化素材库与组合规则自动生成稳定画面结构。

---

## 二、当前系统状态

### 项目阶段
**V1阶段已完成** (完整端到端生成系统,包含Prompt生成、API生图、图片拼接)

### 已完成内容

**核心生成模块:**
- ✅ 主图生成器 (`prompt_generator.py`) - 7模块结构化Prompt拼接
- ✅ 对比图生成器 (`diff_prompt_generator.py`) - 3处改色 + 8-9件小物
- ✅ 生成记录管理器 (`record_generator.py`) - 记录创建/保存/查询
- ✅ 数据加载器 (`data_loader.py`) - 六库加载与LRU缓存

**批量生成框架:**
- ✅ 组合管理器 (`combo_manager.py`) - 笛卡尔积枚举所有组合,状态追踪
- ✅ 批量生成协调器 (`batch_generator.py`) - 后台任务调度,进度回调
- ✅ 同步管理器 (`sync_manager.py`) - records/prompts/combination_status一致性检查

**Template Editor System (模板编辑器 v2.0):** ⭐⭐⭐ NEW!
- ✅ **模板引擎** (`template_engine.py`) - 简洁的混合模式模板系统
  - 支持 `{{@module:character}}` 调用预定义模块（100%复刻原7模块逻辑）
  - 支持 `{{character.appearance_core}}` 直接访问库字段
  - 支持过滤器: `{{pose.emotion | join}}`, `{{field | join: ', '}}`
  - 提供39个变量元数据API（用于自动补全）
  - **在相同随机种子下与原`prompt_generator.py`输出100%一致**
- ✅ **Web纯文本编辑器** (`template_editor.html` + `template-editor.js`)
  - 类Notion/Markdown编辑器体验
  - 输入 `{{` 触发自动补全（39个变量+描述+类型）
  - 双栏布局: 60%编辑器 + 40%实时预览
  - 实时语法验证与错误提示
  - 选择5库ID即时渲染完整Prompt
- ✅ **3个新增API端点**:
  - `POST /api/templates/preview` - 预览模板渲染结果
  - `GET /api/templates/variables` - 获取所有可用变量（用于自动补全）
  - `POST /api/templates/validate` - 验证模板语法
- ✅ **2个系统预置模板**:
  - `template_default_v1` - 官方默认模板（调用全部7个@module）
  - `template_simple_v1` - 简化示例模板（混合使用模块与字段）
- ✅ **代码简化**: 从旧Scheme Editor的2315行代码优化到1510行（-35%）

**⚠️ 旧 Scheme 编辑器系统已废弃 (2025-11-11):**
- **状态**: 已被 Template Editor 完全替代，所有文件已归档到 `deprecated/` 目录
- **归档文件**:
  - `deprecated/src/` - scheme_manager.py, scheme_validator.py, scheme_executor.py
  - `deprecated/web/` - scheme_editor.html, scheme-editor.js, scheme-editor.css
  - `deprecated/schemes/system/` - scheme_*.json (Block结构方案)
- **API端点**: `api.py` 中的 8个 `/api/schemes/*` 端点已注释（第1723-1979行）
- **详细说明**: 参考 `deprecated/README.md` 和 `docs/TEMPLATE_SYSTEM_UPDATE.md`

**Phase 4 & 5: Diff Template System (对比图模板系统):** ⭐⭐⭐ NEW! (2025-11-14)
- ✅ **架构重构** - 基于继承的可扩展编辑器架构
  - `BaseTemplateEditor` (614行) - 抽象基类，封装通用编辑器逻辑
  - `MainTemplateEditor` (411行) - 主图编辑器，从850行重构为411行（-52%代码）
  - `DiffTemplateEditor` (323行) - 对比图编辑器，继承基类实现diff特定功能
  - **代码复用率**: 60%以上的逻辑由基类提供

- ✅ **Diff模板引擎** (`diff_template_engine.py` - 286行)
  - **7个变量命名空间**: main.*, outfit_state.*, new_outfit_state.*, color_changes.*, decorations.*, new_decorations.*, all_decorations.*
  - **45个diff专用变量**: 比主图模板多6个变量（39→45）
  - **智能join过滤器**:
    - 自动处理dict→name字段提取（装饰道具）
    - 特殊格式化outfit_state数组（"1. 将鞋子的颜色改为蓝色"）
    - 预计算color_changes数组（"从红色改为蓝色"格式）
  - **100%输出一致性**: 与旧`diff_prompt_generator.py`在相同随机种子下输出完全一致

- ✅ **Diff API端点** (615行后端代码)
  - `GET /api/templates/diff/variables` - 返回45个diff变量元数据
  - `POST /api/templates/diff/validate` - 验证diff模板语法
  - `POST /api/templates/diff/preview` - 预览diff模板渲染（基于真实image_id）
  - **修改6个CRUD端点**: 支持 `?type=diff` 参数（list/save/update/delete/render）
  - **双模板存储**: `schemes/system_diff/` 和 `schemes/user_diff/` 独立目录

- ✅ **前端编辑器** (`diff_template_editor.html` - 423行)
  - **选择原图**: 从已生成的主图中选择作为基础
  - **3库预览选择器**: pose/scene/style（对比图不改character/theme）
  - **双栏编辑器**: 60%编辑区 + 40%实时预览
  - **自动补全**: 输入`{{`触发45个diff变量提示
  - **实时渲染**: 基于选定image_id + 新库选择即时生成预览

- ✅ **批量生成优化** - LibraryFilter共享组件 (486行)
  - **智能筛选**: 支持部分库多选、部分库全选的灵活组合
  - **实时计数**: 动态显示筛选后的组合数（如9/54组合）
  - **节省成本**: 选择性生图可节省50-80% API token消耗
  - **前端复用**: 同一组件用于批量生成和批量配置

- ✅ **测试覆盖**
  - **35个diff专用测试**: 100%通过率
    - 25个DiffTemplateEngine单元测试
    - 10个输出一致性测试（对比旧generator）
  - **前端集成测试**: diff preview API端到端测试通过
  - **总项目测试**: 126个测试，91通过（81%通过率）

- ✅ **系统预置模板**
  - `diff_template_default_v1` - 官方默认对比图模板
    - 100%复刻原`diff_prompt_generator.py`输出格式
    - 包含颜色修改 + 装饰元素添加
    - 预计算all_decorations合并from_theme和from_scene

**图片生成系统(多Provider架构):**
- ✅ **Provider Manager** (`provider_manager.py`) - 核心调度器 ⭐
  - **自动Fallback机制**: 按配置优先级(如`gemini,bytedance`)依次尝试Provider,直到成功
  - **风格一致性保障**: 同一image_id的主图与对比图强制使用同一Provider
  - **健康检查**: 实时监控API key配置状态、SDK安装情况
  - **统计追踪**: 记录每个Provider的成功率、平均耗时、失败次数
- ✅ **多AI模型支持**:
  - Gemini Provider (`gemini_provider.py`) - Google `gemini-2.5-flash-image`模型
  - Bytedance Provider (`bytedance_provider.py`) - 字节跳动`doubao-seedream-4-0-250828`模型
  - 可扩展至其他Provider(OpenAI/Midjourney/Stability AI等)
- ✅ **生成流程**: 三轮生成流程
  - Round 1: 生成主图 (调用Provider API)
  - Round 2: 基于主图生成对比图 (上下文传递)
  - Round 3: 拼接最终图 (多语言文字叠加)
- ✅ 图片拼接模块 (`stitch_generator.py`) - 多语言文字叠加
  - 支持7种语言(英/法/日/韩/德/西/繁中)
  - 自动布局计算与字体渲染
  - 生成"我试了X次但找不到Y个不同"风格广告素材

**Web应用层:**
- ✅ Flask REST API - **34个有效端点**(库CRUD/生成/批量/同步/图片生成/Provider管理/Template管理)
  - Provider管理端点(状态查询/统计数据/健康检查)
  - 记录管理增强端点(variants查询/状态更新/筛选)
  - 图片生成增强端点(单张进度/手动拼接)
  - **Template管理端点** (模板预览/变量列表/语法验证) ⭐
  - **Phase 2更新**: `POST /api/generate/main` 现要求 `library_ids` 格式 ⭐
  - ⚠️ 旧 `/api/schemes/*` 端点已废弃并注释
- ✅ Web可视化界面 - 库管理/生成交互/批量监控/模板编辑器(纯Vanilla JS)
- ✅ **Phase 2动态库系统** - 前端完全动态化 ⭐⭐⭐
  - `web/js/library-config.js` - 集中式库配置管理器(330行)
  - `web/app.js` - 批量生图过滤器动态化(47处硬编码已消除)
  - `web/js/main_gen.js` - 主图生成动态化(18处硬编码已消除) **Stage 3.2 ✅**
- ✅ 实时进度追踪 - 批量生成与图片生成进度轮询
- ✅ **Template Editor** (`template_editor.html`) - 纯文本模板编辑器 ⭐
  - Notion风格自由文本编辑
  - `{{` 触发自动补全（39个变量）
  - 实时预览与语法验证
- ✅ **开发者模式** (`web/js/dev-mode.js`) - 前端调试工具 ⭐
  - 可拖拽调试面板(Ctrl+D打开)
  - 实时显示API请求/响应
  - 网络统计与日志导出
- ✅ **错误管理系统** (`web/js/error-manager.js`) - 集中式错误处理
  - Toast通知系统(info/warning/error)
  - 错误历史记录与筛选
  - localStorage持久化

**数据与生产:**
- ✅ 六库JSON完整数据(2角色×3姿态×3场景×3主题×1画风 = 54组合)
- ✅ 54个组合Prompt已全部生成(主图+对比图)
- ✅ 生成记录持久化机制(~500字节精简版)

### 当前系统能力
- **Prompt生成**: 可通过Web界面或API生成任意五库组合的主图与对比图Prompt
- **Template Editor 模板编辑器**: 自由文本编辑器，支持灵活的Prompt结构自定义 ⭐
  - Notion风格纯文本编辑体验
  - `{{` 触发自动补全（39个可用变量）
  - 支持 `{{@module:xxx}}` 调用预定义模块（100%复刻原逻辑）
  - 支持 `{{library.field}}` 直接访问库字段
  - 支持过滤器: `{{field | join}}`, `{{field | join: ', '}}`
  - 实时预览与语法验证
  - 2个系统预置模板（默认模板、简化示例）
- **图片生成**: **完整端到端多Provider生成流程** - Prompt → [Gemini/Bytedance] API生图 → 拼接最终图
- **自动Fallback**: Provider失败时自动切换备用方案,保障生产稳定性
- **多版本支持**: 同一组合可生成多个版本(v1/v2/v3...),用于A/B测试对比
- **多语言支持**: 7种语言的文字叠加(英/法/日/韩/德/西/繁中),适配不同市场投放
- **批量生产**: 支持一键生成所有待生成组合,实时显示进度
- **选择性生图** ⭐ NEW: 通过库元素筛选特定组合生成,节省API token消耗
  - 灵活混合筛选: 某些库多选、某些库全选
  - 实时组合数预览: 动态计算筛选后的组合数量
  - 智能验证: 空筛选检测、大批量生成确认提示
  - 前后端双重验证: 确保筛选参数合法性
- **数据管理**: 库内容在线增删改查,组合状态自动追踪
- **综合同步修复系统** ⭐ NEW (2025-11-15):  一键检测并修复系统所有不一致问题
  - 库配置同步: 自动删除引用不存在文件的孤立库配置
  - 无效库引用: 标记records中引用已删除库的记录
  - Prompt同步: 修复prompt文件与记录的不一致
  - 图片同步: 修复variants数组与文件系统的不一致
  - 组合状态同步: 清理combination_status中的无效条目
  - 孤立文件检测: 识别无对应记录的prompt/image文件
  - 字段完整性验证: 检查record字段结构完整性
  - 健康面板集成: 点击"🔄 同步"按钮一键修复(预览→确认→执行)
- **一致性保障**: 自动检测并修复records/prompts/images文件与状态标志不一致
- **失败重试**: 自动追踪失败记录,支持一键重试(智能排除失败的Provider)
- **健康监控**: 实时监控Provider状态、成功率、平均耗时(支持库文件缺失降级运行)
- **开发者工具**: 前端调试面板、错误管理系统、API请求追踪

### 待完善功能
- ❌ **A/B测试数据收集**: 需对接广告平台API(Facebook Ads/Google Ads)收集CTR/CPI数据
- ⚠️ **参考图系统**: V2规划中的IP-Adapter/LoRA训练,确保角色外貌一致性

---

## 三、核心模块速查

### 12个核心Python模块

| 模块 | 职责 | 关键接口 | 状态 |
|------|------|----------|------|
| `data_loader.py` | 六库加载与LRU缓存 | `load_character()`, `load_all_libraries()` | ✅ |
| `prompt_generator.py` | 主图生成(7模块拼接) | `generate_main_prompt(...)` → `{image_id, prompt_cn, ...}` | ✅ |
| `diff_prompt_generator.py` | 对比图生成(3处改色+8-9件小物) | `generate_diff_prompt(image_id)` → `{diff_id, prompt_cn}` | ✅ |
| `record_generator.py` | 生成记录CRUD+多版本管理 | `create_and_save_record()`, `add_variant()`, `get_variants_with_filesystem_scan()` | ✅ |
| `combo_manager.py` | 组合枚举与状态追踪+选择性筛选 | `enumerate_all_combinations()`, `enumerate_combinations_with_filter()` ⭐, `sync_combinations()`, `update_image_status()` | ✅ |
| `batch_generator.py` | 批量生成协调器 | `generate_all_pending(progress_callback)`, `generate_single()` | ✅ |
| `sync_manager.py` | 数据一致性检查修复+综合同步系统 | `repair_all()` ⭐, `check_library_config_sync()`, `repair_library_config_sync()`, `check_invalid_library_references()`, `repair_invalid_library_references()`, `check_sync_status()`, `repair_inconsistencies()` | ✅ |
| **`template_engine.py`** ⭐ | **模板渲染引擎(混合模式)** | `render_template()`, `get_available_variables()`, `validate_template()` | ✅ |
| `provider_manager.py` | 多Provider调度与Fallback | `get_provider()`, `generate_with_fallback()`, `check_health()`, `get_stats()` | ✅ |
| `stitch_generator.py` | 多语言图片拼接 | `stitch_images(main, diff, output, language_id)`, `create_final_image()` | ✅ |
| `utils.py` | 工具函数 | `generate_image_id()`, `parse_image_id()` | ✅ |
| `providers/*.py` | Provider抽象层 | `ImageGeneratorProvider`基类, `GeminiProvider`, `BytedanceProvider` | ✅ |

**⚠️ 已废弃模块** (已移至 `deprecated/src/`):
- `scheme_manager.py`, `scheme_validator.py`, `scheme_executor.py` - 被 `template_engine.py` 替代

### Web应用架构

**后端 (api.py):**
- Flask REST API **35个有效端点** (另有8个已废弃的 `/api/schemes/*` 端点已注释)
- 库管理: `GET/POST/PUT/DELETE /api/libraries/<name>`
- 生成: `POST /api/generate/main`, `/diff`, `/diff/custom`
- 批量: `POST /api/generate/batch`, `GET /api/generate/batch/progress`
- 图片: `POST /api/images/generate/batch` (支持library_filter选择性生图 ⭐), `GET /api/images/stats`, `POST /api/images/stitch`
- **综合同步** ⭐ NEW: `POST /api/sync/repair-all` (一键检测修复所有不一致)
- 同步: `GET /api/sync/check`, `POST /api/sync/repair`, `GET /api/sync/report`, `GET /api/sync/deep-check`, `GET /api/sync/orphans`, `POST /api/sync/orphans/clean`
- Provider管理: `GET /api/providers/status`, `/stats`, `POST /api/providers/test`
- 记录管理增强: `GET /api/records/<id>/variants`, `PUT /api/records/<id>/status`, `GET /api/records/filter`
- 图片生成增强: `GET /api/images/generate/single/progress/<id>`
- **Template管理** ⭐: `POST /api/templates/preview`, `GET /api/templates/variables`, `POST /api/templates/validate`

**前端 (web/):**
- `index.html` - 主页面(三栏布局:筛选/列表/详情)
- `js/library_manager.js` - 库管理CRUD
- `js/main_gen.js` - 主图生成交互
- `js/diff_gen.js` - 对比图生成交互
- `js/image_gen.js` - 批量生图与同步管理
- **`template_editor.html`** ⭐ - Template模板编辑器页面
- **`js/template-editor.js`** ⭐ - 模板编辑器逻辑(自动补全/预览/验证)
- **`js/sync-manager.js`** ⭐ NEW - 综合同步修复管理器(预览/确认/执行)
- **`js/dev-mode.js`** - 开发者调试面板(Ctrl+D打开)
- **`js/error-manager.js`** - 错误管理与Toast通知(集成同步按钮)
- `css/error-system.css` - 错误系统样式(含同步按钮样式)
- `css/sync-manager.css` - 同步模态窗口样式

**⚠️ 已废弃文件** (已移至 `deprecated/web/`):
- `scheme_editor.html`, `js/scheme-editor.js`, `css/scheme-editor.css` - 被 Template Editor 替代


---

## 四、系统操作流程

### 流程1: Web批量生成Prompt
```
1. 打开Web界面 (python api.py 启动服务)
2. 点击"组合管理" → "同步组合" (调用 POST /api/combinations/sync)
3. 系统枚举所有五库组合(54个),识别pending状态
4. 点击"批量生成Prompt" (调用 POST /api/generate/batch)
5. 后台线程执行:
   - 遍历pending组合
   - 调用prompt_generator生成主图+对比图Prompt
   - 保存到prompts/{image_id}_main.txt和_diff.txt
   - 更新combination_status.json和records/
6. 前端轮询进度 (GET /api/generate/batch/progress)
7. 完成后显示统计数据
```

### 流程2: 单组合生成(Web交互)
```
1. 主图生成 (Phase 2已更新):
   - 在"生成主图"tab选择五库(character/pose/scene/theme/style)
   - 点击"生成主图" (调用 POST /api/generate/main)
   - **Phase 2 API格式**:
     {
       "library_ids": {
         "character": "char_betty_v1",
         "pose": "pose_turn_back_smile_v1",
         "scene": "scene_living_sofa_v1",
         "theme": "theme_halloween_v1",
         "style": "style_retro1950_flat_v1"
       }
     }
   - 返回image_id和Prompt文本
   - 自动创建records/{image_id}.json (包含library_ids字段)

2. 对比图生成:
   - 在"记录列表"选择已生成的主图记录
   - 系统自动加载outfit_minor当前颜色和已用装饰
   - 选择模式:
     - 自动模式: 调用 POST /api/generate/diff (随机改色+装饰)
     - 自定义模式: 调用 POST /api/generate/diff/custom (手动选色+装饰)
   - 返回diff_id和对比图Prompt
```

### 流程3: 数据同步检查修复
```
1. 点击"同步管理" (调用 GET /api/sync/check)
2. sync_manager检查:
   - Prompt文件存在性 vs prompt_generated标志
   - 记录状态 vs 组合状态一致性
   - 生成记录完整性
3. 显示不一致问题列表和修复建议
4. 用户确认后点击"修复" (调用 POST /api/sync/repair)
5. 自动修复:
   - 更新prompt_generated标志
   - 同步combination_status与records状态
   - 生成同步报告
```

### 流程4: 图片生成(多Provider三轮生成流程) ✅
```
1. 配置.env文件(多Provider模式):
   IMAGE_PROVIDERS=gemini,bytedance  # 优先级顺序
   GEMINI_API_KEY=your_gemini_key
   GEMINI_MODEL=gemini-2.5-flash-image
   BYTEDANCE_API_KEY=your_bytedance_key
   BYTEDANCE_MODEL=doubao-seedream-4-0-250828

2. 点击"批量生图" (调用 POST /api/images/generate/batch)
   可选参数: language_id (1-7, 默认1=英语), provider (指定Provider)

3. 后台线程执行三轮生成(带自动Fallback):

   Provider选择阶段:
   - ProviderManager按配置优先级获取Provider
   - 健康检查: 验证API key配置与SDK安装
   - Fallback逻辑: 第一个Provider失败自动尝试下一个

   Round 1 - 生成主图:
   - 读取prompts/{image_id}_main.txt
   - 调用Provider API生成主图 (如Gemini失败 → 自动切换Bytedance)
   - 保存到images/{image_id}/v1_main.png
   - 记录使用的Provider到record.provider_used

   Round 2 - 生成对比图:
   - 读取prompts/{image_id}_diff.txt
   - 强制使用与主图相同的Provider (保证风格一致)
   - 将主图作为上下文传递给Provider API
   - 基于主图生成对比图
   - 保存到images/{image_id}/v1_diff.png

   Round 3 - 拼接最终图 (7种语言):
   - 调用stitch_generator.stitch_images()
   - 将主图和对比图并排拼接
   - 添加多语言文字叠加("我试了X次但找不到Y个不同")
   - 保存7个语言版本: v1_final_en.png, v1_final_fr.png, ...

   - 更新record: variants数组添加新版本,记录provider_attempts历史

4. 前端轮询进度 (GET /api/images/generate/batch/progress)
   实时显示当前使用的Provider、重试次数
5. 失败记录可通过"重试失败"功能重新生成(智能排除失败Provider)
6. 可生成多个版本(v1, v2, v3...)用于A/B测试
```

### 流程5: 选择性生图(节省API token) ⭐ NEW
```
1. 打开"批量生图"模态窗口

2. 勾选"启用组合筛选"复选框
   - 自动展开筛选面板，填充5个库的多选下拉框

3. 选择要生成的库元素(灵活混合):
   示例1: 只生成Wilma + Halloween主题
   - 人物: 勾选"Wilma" (其他不选)
   - 姿态: 不选 (默认全选)
   - 场景: 不选 (默认全选)
   - 主题: 勾选"Halloween" (其他不选)
   - 画风: 不选 (默认全选)
   → 预计生成: 1×3×3×1×1 = 9个组合

   示例2: 生成多个人物在特定场景
   - 人物: 勾选"Wilma"和"Betty"
   - 场景: 勾选"Living Room"
   - 其他: 不选 (默认全选)
   → 预计生成: 2×3×1×3×1 = 18个组合

4. 实时查看预计组合数
   - 系统自动计算: character数 × pose数 × scene数 × theme数 × style数
   - 颜色警告:
     - 蓝色: 正常数量 (1-30)
     - 橙色: 较多 (31+) - 提示消耗较多token
     - 红色: 0个 (无效筛选)

5. 可选: 点击"预览详情"查看具体筛选结果

6. 点击"开始生成"
   - 前端验证: 检查组合数是否为0
   - 大批量确认: 超过30个组合时弹出确认对话框
   - 全选确认: 54个组合时二次确认

7. 后端处理:
   - 接收library_filter参数 (如: {"character_ids": ["char_wilma_v1"], "theme_ids": ["theme_halloween_v1"]})
   - 调用validate_library_filter()验证参数合法性
   - combo_manager.enumerate_combinations_with_filter()生成筛选后的组合列表
   - image_generator.generate_batch()仅处理筛选后的组合
   - 返回实际生成的组合数

8. 前端轮询进度,实时显示生成状态

边界情况处理:
- 空筛选(0个组合): 前端阻止提交,显示警告toast
- 无效ID: 后端返回400错误,列出无效ID
- 筛选后全部已生成: 返回success_count=0, skipped_count=N
```

---

## 五、快速参考

### 核心数据结构

#### 生成记录(Generation Record) - v4.0扩展版
```json
{
  "image_id": "betty_turnback_living_halloween_retro50s_0001",
  "character_id": "char_betty_v1",
  "theme_id": "theme_halloween_v1",
  "outfit_minor_state": [
    {"element": "鞋子", "current_color": "红色"}
  ],
  "used_decorations": {
    "from_theme": ["小南瓜", "蝙蝠剪纸"],
    "from_scene": []
  },

  // v4.0新增字段
  "variants": [
    {
      "version": 1,
      "image_main_path": "images/betty_turnback.../v1_main.png",
      "image_diff_path": "images/betty_turnback.../v1_diff.png",
      "final_images": {
        "en": "images/betty_turnback.../v1_final_en.png",
        "fr": "images/betty_turnback.../v1_final_fr.png",
        "ja": "images/betty_turnback.../v1_final_ja.png",
        "ko": "images/betty_turnback.../v1_final_ko.png",
        "de": "images/betty_turnback.../v1_final_de.png",
        "es": "images/betty_turnback.../v1_final_es.png",
        "zh": "images/betty_turnback.../v1_final_zh.png"
      },
      "generated_at": "2025-11-07T15:37:59"
    }
  ],
  "provider_used": "bytedance",  // 最近一次使用的Provider
  "provider_attempts": [
    {
      "provider": "gemini",
      "success": false,
      "error": "API quota exceeded",
      "attempted_at": "2025-11-07T15:35:12"
    },
    {
      "provider": "bytedance",
      "success": true,
      "attempted_at": "2025-11-07T15:37:59"
    }
  ]
}
```

#### 对比图改动规则(MVP)
- **改色**: 固定3处outfit_minor元素(从color_pool中排除当前颜色随机选)
- **添加小物**: 8-9件(3-5件从主题库 + 剩余从通用库)
- **总改动**: 11-12处细节变化
- **约束**: 不改场景物体、不改主题装饰、不改outfit_major、不改姿态

---

### 文件路径规范

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

#### 生成记录
```
records/{image_id}.json
```

#### 图像文件 (v4.0多版本结构)
```
images/{image_id}/
├── v1_main.png                 # 版本1主图
├── v1_diff.png                 # 版本1对比图
├── v1_final_en.png             # 版本1最终图-英语
├── v1_final_fr.png             # 版本1最终图-法语
├── v1_final_ja.png             # 版本1最终图-日语
├── v1_final_ko.png             # 版本1最终图-韩语
├── v1_final_de.png             # 版本1最终图-德语
├── v1_final_es.png             # 版本1最终图-西班牙语
├── v1_final_zh.png             # 版本1最终图-繁体中文
├── v2_main.png                 # 版本2主图 (可选)
├── v2_diff.png                 # 版本2对比图 (可选)
└── ...
```

### 关键命名约定

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

## 六、Phase 2 动态库系统架构

### 6.1 设计理念与架构演进

#### 从静态到动态的演进之路

**Phase 1 (静态5库系统)** → **Phase 2 (动态N库系统)**

Phase 1系统存在的核心问题:
- **硬编码泛滥**: 前后端共115处硬编码5库名称
- **扩展困难**: 添加第6个库需要修改30+个文件
- **维护成本高**: 每次库变更需要大量代码修改
- **缺乏灵活性**: 无法支持3库、4库、6库等不同组合

Phase 2的核心设计理念:
1. **集中式配置管理**: 库配置集中在`config/library_config.py`
2. **前后端完全动态化**: 代码不再假设固定库数量
3. **向后兼容性保障**: 双格式支持(library_ids + legacy字段)
4. **零硬编码目标**: 消除所有硬编码引用(115处→0处)

### 6.2 核心组件架构

#### 6.2.1 后端配置层

**config/library_config.py** - 库配置元数据中心
```python
ENABLED_LIBRARIES = [
    {
        'name': 'character',
        'display_name': '人物',
        'display_field': 'name',
        'type': 'required',
        'order': 1,
        'structure_type': 'standard'
    },
    # ... 更多库定义
]
```

**关键字段说明**:
- `name`: 库标识符(用于代码引用)
- `display_name`: 前端显示名称
- `display_field`: 下拉框显示的字段(如character.name)
- `type`: required(必填) | optional(可选)
- `order`: 排序顺序
- `structure_type`: standard(标准对象) | nested_array(嵌套数组)

**GET /api/libraries/config** - 配置API端点
- **路径**: `api.py:882-941`
- **功能**: 返回所有启用库的元数据
- **响应格式**:
```json
{
  "enabled_libraries": [
    {
      "name": "character",
      "display_name": "人物",
      "display_field": "name",
      "type": "required",
      "order": 1,
      "structure_type": "standard"
    }
  ],
  "total_count": 5
}
```

**GET /api/libraries/{name}/template** - 模板生成API
- **路径**: `api.py:1864-1925`
- **功能**: 基于JSON Schema动态生成新条目模板
- **支持**: 嵌套对象、数组结构的智能生成
- **用途**: 库管理页面的"添加新条目"功能

#### 6.2.2 前端配置层

**web/js/library-config.js** - 集中式配置管理器 ⭐⭐⭐
- **行数**: 330行
- **设计**: LibraryConfigManager单例类
- **核心价值**: 前端所有库相关操作的唯一入口

**17个核心API方法**:

**配置加载类** (3个):
1. `init()` - 异步加载配置
2. `isInitialized()` - 检查初始化状态
3. `getConfig()` - 获取完整配置

**库信息查询类** (5个):
4. `getEnabledLibraries()` - 获取所有启用库
5. `getLibraryByName(name)` - 获取单个库配置
6. `getRequiredLibraries()` - 获取必填库列表
7. `getOptionalLibraries()` - 获取可选库列表
8. `getLibraryOrder(name)` - 获取库排序

**前端元素生成类** (4个):
9. `getSelectElementId(name)` - 生成select元素ID
10. `getPreviewElementId(name)` - 生成预览元素ID
11. `getFilterElementId(name)` - 生成筛选器元素ID
12. `getLabelText(name)` - 获取标签文本

**字段映射类** (3个):
13. `getDisplayField(name)` - 获取显示字段名
14. `extractDisplayText(name, item)` - 提取显示文本
15. `getIdField(name)` - 获取ID字段名

**批量操作类** (2个):
16. `getAllSelectElementIds()` - 批量获取select元素ID
17. `validateLibraryName(name)` - 验证库名称合法性

**使用示例**:
```javascript
// 初始化配置
await LibraryConfig.init();

// 动态生成选择器
const libraries = LibraryConfig.getEnabledLibraries();
libraries.forEach(lib => {
    const selectId = LibraryConfig.getSelectElementId(lib.name);
    const displayField = LibraryConfig.getDisplayField(lib.name);
    // 创建<select>元素...
});

// 提取显示文本
const character = {id: 'char_betty_v1', name: 'Betty'};
const displayText = LibraryConfig.extractDisplayText('character', character);
// 返回: "Betty"
```

#### 6.2.3 动态ID系统

**src/utils.py** - 动态ID函数（Phase 2新增）

**generate_dynamic_image_id(library_selections, sequence)** - 第96-153行
- **功能**: 根据任意库组合生成Image ID
- **支持**: 3库、4库、5库、6库...任意数量
- **格式**: `{abbr1}_{abbr2}_..._{abbrN}_{sequence}`
- **示例**:
  - 5库: `betty_turnback_living_halloween_retro50s_0001`
  - 3库: `betty_turnback_living_0001`

**parse_dynamic_image_id(image_id)** - 第154-209行
- **功能**: 解析Image ID到库字典
- **返回**: `{'character': 'char_betty_v1', 'pose': '...', ...}`
- **特性**: 自动识别库数量

**get_next_sequence_dynamic(library_selections)** - 第210-277行
- **功能**: 获取下一个可用序列号
- **逻辑**: 扫描records/目录，计算同组合的最大序列号+1

### 6.3 前后端协作流程

#### 6.3.1 应用启动流程
```
1. 浏览器加载 index.html
   ↓
2. 加载 library-config.js
   ↓
3. app.js 调用 LibraryConfig.init()
   ↓
4. GET /api/libraries/config (从后端获取配置)
   ↓
5. 前端缓存配置到 LibraryConfig单例
   ↓
6. 动态生成筛选器、选择器UI
   ↓
7. 用户可开始操作
```

#### 6.3.2 批量生图流程（选择性筛选）
```
用户在前端勾选库元素
   ↓
构建 library_filter 对象 (app.js:1162-1166)
   {
     character_ids: ['char_betty_v1'],
     pose_ids: null,  // null表示全选
     scene_ids: ['scene_living_sofa_v1', 'scene_bedroom_v1'],
     theme_ids: null,
     style_ids: ['style_retro1950_flat_v1']
   }
   ↓
validate_library_filter() 验证 (api.py:150-201)
   - 检查库名称合法性
   - 验证ID存在性
   ↓
combo_manager.enumerate_combinations_with_filter()
   - 笛卡尔积枚举: 1 × 3 × 2 × 3 × 1 = 18个组合
   ↓
image_generator.generate_batch() 仅生成18个
   - 节省80%+ API token成本
```

### 6.4 扩展指南: 如何添加第6个库

**场景**: 添加"天气(weather)"库,支持晴天/雨天/雪天

#### Step 1: 定义库配置 (config/library_config.py)
```python
ENABLED_LIBRARIES = [
    # ... 现有5库
    {
        'name': 'weather',
        'display_name': '天气',
        'display_field': 'name',
        'type': 'optional',  # 可选库
        'order': 6,
        'structure_type': 'standard'
    }
]
```

#### Step 2: 创建数据文件 (data/weather.json)
```json
{
  "weather_sunny_v1": {
    "id": "weather_sunny_v1",
    "name": "晴天",
    "description": "明媚的阳光,蓝天白云"
  },
  "weather_rainy_v1": {
    "id": "weather_rainy_v1",
    "name": "雨天",
    "description": "淅淅沥沥的小雨"
  },
  "weather_snowy_v1": {
    "id": "weather_snowy_v1",
    "name": "雪天",
    "description": "纷纷扬扬的雪花"
  }
}
```

#### Step 3: 更新data_loader.py (添加加载函数)
```python
@lru_cache(maxsize=128)
def load_weather(weather_id: str) -> Dict[str, Any]:
    """Load weather library entry."""
    return load_library_entry('weather', weather_id)
```

#### Step 4: 前端自动适配 ✅ **无需修改**
- ✅ `LibraryConfig.init()` 自动加载第6个库
- ✅ 筛选器自动生成天气下拉框
- ✅ 主图生成自动显示天气选择器
- ✅ 批量生成自动支持天气筛选

#### Step 5: 验证功能
```bash
# 1. 重启API服务
python api.py

# 2. 打开浏览器控制台，验证配置
fetch('/api/libraries/config')
  .then(r => r.json())
  .then(d => console.log(d.total_count)); // 应该显示 6

# 3. 生成测试组合
# 新的组合数 = 2角色 × 3姿态 × 3场景 × 3主题 × 1画风 × 3天气 = 162
```

#### Step 6: 调整Prompt模板 (可选)
如果需要天气影响Prompt生成,修改`src/prompt_generator.py`:
```python
def generate_main_prompt(..., weather_id=None):
    # 添加天气相关描述
    if weather_id:
        weather = load_weather(weather_id)
        prompt += f", {weather['description']}"
```

**完成!** 系统现在支持6库组合,未来还可扩展至7库、8库...

### 6.5 向后兼容性保障

#### 6.5.1 双格式支持机制

**新记录格式**（含双字段）:
```json
{
  "image_id": "betty_turnback_living_halloween_retro50s_0001",

  // 新格式 (Phase 2)
  "library_ids": {
    "character": "char_betty_v1",
    "pose": "pose_turn_back_smile_v1",
    "scene": "scene_living_sofa_v1",
    "theme": "theme_halloween_v1",
    "style": "style_retro1950_flat_v1"
  },

  // 旧格式 (Phase 1 兼容)
  "character_id": "char_betty_v1",
  "pose_id": "pose_turn_back_smile_v1",
  "scene_id": "scene_living_sofa_v1",
  "theme_id": "theme_halloween_v1",
  "style_id": "style_retro1950_flat_v1"
}
```

**record_generator.py:145-206** - 双格式生成
```python
def create_and_save_record(**library_ids):
    record = {
        'image_id': image_id,
        'library_ids': library_ids,  # 新格式

        # 向后兼容：展开为旧字段
        'character_id': library_ids.get('character'),
        'pose_id': library_ids.get('pose'),
        # ...
    }
    return record
```

#### 6.5.2 API兼容性策略（Stage 5.1更新）

**POST /api/generate/main** - 仅支持新格式
- ✅ 接受: `{"library_ids": {...}}`
- ❌ 拒绝: `{"character_id": "...", ...}` (返回400错误)

**POST /api/generate/diff** - 仅支持新格式 (Stage 5.1变更)
- ✅ 接受: `{"image_id": "...", "library_ids": {...}}`
- ❌ 拒绝: `{"image_id": "...", "pose_id": "...", ...}` (返回400错误)

**Breaking Change**: Phase 2 Stage 5.1移除了旧格式支持
- **迁移指南**: 参考 `docs/changelog/2025-11-13-phase2-dynamic-library-system.md`
- **错误提示**: API返回清晰的迁移提示

### 6.6 性能与统计

| 指标 | Phase 1 | Phase 2 | 改进 |
|------|---------|---------|------|
| **硬编码引用** | 115处 | 0处 | 100%消除 |
| **添加新库耗时** | 2-3天 | 30分钟 | 96%↓ |
| **前端配置集中度** | 分散在7个文件 | 1个文件 | 86%↑ |
| **支持库数量** | 固定5个 | 3-N个 | 无限扩展 |
| **代码复杂度** | 高（嵌套for循环） | 低（笛卡尔积） | 大幅简化 |

**实际案例**:
- 选择性生图: 筛选1个角色+1个主题 = 9个组合（vs 全选54个）↓ 83% token消耗
- 代码维护: Stage 3前端动态化，减少未来修改点从47处→0处

### 6.7 架构优势总结

1. **可扩展性**: 支持3-N个库的任意组合，无需修改代码
2. **可维护性**: 零硬编码，配置集中管理
3. **开发效率**: 添加新库从2-3天缩短至30分钟
4. **灵活性**: 选择性生图功能，节省50-80% API成本
5. **向后兼容**: 双格式支持，平滑过渡
6. **测试覆盖**: 43个测试用例覆盖核心流程

**Phase 2架构是面向未来的设计**，为系统的持续演进和扩展奠定了坚实基础。

---

**相关文档**:
- 详细技术实现: `docs/changelog/2025-11-13-phase2-dynamic-library-system.md`
- 测试覆盖报告: `tests/test_phase2_integration.py`, `tests/test_backwards_compatibility.py`
- 配置管理API: `config/library_config.py`

---

## 七、库管理系统 (Phase 3)

### 7.1 功能概览

Phase 3引入了完整的可视化库管理界面，支持在线CRUD操作、实时验证、批量导入导出等功能。

**核心特性**:
- ✅ 可视化库列表和条目管理
- ✅ 动态表单生成（基于JSON Schema）
- ✅ 实时验证（后端jsonschema + 前端即时反馈）
- ✅ 搜索和筛选（支持ID/名称模糊匹配）
- ✅ 批量导入/导出（JSON格式）
- ✅ JSON预览（语法高亮 + 一键复制）
- ✅ 键盘快捷键（Ctrl+F/N/S, Esc）
- ✅ 草稿自动保存（防止数据丢失）
- ✅ **热重载机制** - 库创建/编辑/删除后立即生效，无需重启服务器 ⭐ NEW (2025-11-14)

### 7.1.1 热重载功能 (Hot-Reload) ⭐

**问题**: 创建新库后出现"未知的库名称"错误，需要手动重启Flask服务器

**原因**: 双配置文件不同步
- `library_config.py` 被动态更新 ✅
- `settings.py` 的 `LIBRARY_PATHS` 保持静态 ❌
- 导致运行时无法识别新库

**解决方案** (2025-11-14 实施):
1. **单一数据源**: 废弃 `settings.py` 静态 `LIBRARY_PATHS`，改用 `library_config.py` 作为唯一配置源
2. **动态函数**: `get_library_files()` 每次调用时实时读取最新配置
3. **模块热重载**: `reload_library_config()` 使用 `importlib.reload()` 重新加载模块
4. **前端事件**: 创建/编辑/删除成功后派发 `library-config-updated` 事件
5. **自动刷新**: `library-manager.js` 和 `app.js` 监听事件，自动刷新界面

**效果**:
- ✅ 创建库 → 立即可在 `index.html` 使用（无需重启）
- ✅ 编辑库 → 前端立即显示更新
- ✅ 删除库 → 前端立即移除
- ✅ `library_management.html` 自动识别新库

**技术实现**:
- 后端: `api.py:38-113` 添加 `reload_library_config()` 和 `clear_all_caches()`
- 后端: 替换13处静态 `LIBRARY_FILES` 为动态 `get_library_files()` 调用
- 前端: `library-admin.js:222-228` 派发自定义事件
- 前端: `library-manager.js:69-84` 和 `app.js:28-45` 监听事件并刷新

### 7.2 使用指南

#### 7.2.1 访问界面
```bash
# 确保Flask服务运行
python api.py

# 浏览器访问 (注意：macOS可能端口冲突，实际端口可能是5001)
http://localhost:5000/library_management.html
```

#### 7.2.2 基本操作流程

**添加新条目**:
1. 从左侧选择目标库（如"画风"）
2. 点击"➕ 新增条目"按钮
3. 填写表单字段（带 * 为必填）
4. 对于数组字段，点击"+ 添加项"按钮
5. 点击"✓ 验证"检查数据（可选但推荐）
6. 点击"💾 保存"提交

**编辑条目**:
1. 在表格中点击"编辑"按钮
2. 修改字段值
3. 验证并保存

**删除条目**:
1. 点击"删除"按钮
2. 确认删除对话框

**搜索条目**:
1. 在搜索框输入关键词（ID或名称）
2. 实时过滤结果（300ms防抖）

#### 7.2.3 高级功能

**导出库数据**:
```
批量操作 ▾ → 📥 导出JSON
```
下载JSON文件，可用于备份或迁移

**JSON预览**:
- 点击表格行查看条目JSON结构
- 点击"📋"按钮一键复制到剪贴板

**键盘快捷键**:
| 快捷键 | 功能 |
|--------|------|
| Ctrl+F | 聚焦搜索框 |
| Ctrl+N | 新增条目 |
| Ctrl+S | 保存表单（模态框内） |
| Esc | 关闭模态框 |

### 7.3 技术架构

#### 7.3.1 前端组件

**LibraryManager** (主控制器)
- 文件: `web/js/library-manager.js` (1,131 lines)
- 职责:
  - 库列表加载与渲染
  - 条目CRUD操作
  - 搜索/分页/选择
  - 导入/导出
  - 草稿管理

**LibraryFormBuilder** (动态表单生成器)
- 文件: `web/js/library-form-builder.js` (629 lines)
- 职责:
  - 根据JSON Schema自动生成表单
  - 支持字段类型: string, number, boolean, array, object
  - 递归处理嵌套结构（最大深度5层）
  - 实时验证

**JSONPreviewer** (JSON预览器)
- 文件: `web/js/json-previewer.js` (279 lines)
- 职责:
  - 语法高亮显示
  - 格式化/压缩
  - 复制到剪贴板
  - Diff对比工具

#### 7.3.2 后端API

**POST /api/libraries/validate** - 条目验证
- 位置: `api.py:874-1084`
- 功能:
  - JSON Schema严格验证
  - ID唯一性检查
  - ID格式建议（警告级别）
  - 嵌套结构支持
  - 错误路径追踪

**请求格式**:
```json
{
  "library_name": "character",
  "entry_data": {
    "id": "char_example_v1",
    "name": "Example Character",
    ...
  },
  "is_new": true,
  "exclude_id": null
}
```

**响应格式**:
```json
{
  "success": true,
  "valid": true,
  "errors": [
    {
      "field": "name",
      "message": "必填字段缺失: name",
      "path": ["outfit_minor", 0, "element"],
      "validator": "required",
      "severity": "error"
    }
  ],
  "error_count": 0,
  "warning_count": 0
}
```

### 7.4 特殊字段处理

#### 7.4.1 数组字段 (Array Fields)
- **UI**: 点击"+ 添加项"按钮动态添加
- **删除**: 点击"删除"按钮移除项
- **索引**: 删除后自动重新编号

**示例**: color_palette数组
```
color_palette:
  [0] "霓虹蓝" [删除]
  [1] "电子紫" [删除]
  [+ 添加项]
```

#### 7.4.2 嵌套对象字段 (Nested Objects)
- **UI**: 点击标题折叠/展开
- **渲染**: 递归生成子字段

**示例**: character.outfit_minor
```
outfit_minor:
  ├─ [0] 对象 [展开/折叠]
  │   ├─ element: "鞋子"
  │   ├─ original_color: "红色"
  │   ├─ color_pool: ["黑色", "白色", "棕色"]
  │   └─ description_template: "{color}的{element}"
  ├─ [+ 添加项]
```

#### 7.4.3 特殊库类型

**decorative_props** (nested_array结构)
- 结构: `{ "common_props": [...] }`
- 处理: LibraryConfig自动识别structure_type
- 显示: 直接渲染common_props数组内容

### 7.5 故障排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 表单不显示 | Schema未定义 | 检查`config/library_config.py`中的Schema |
| 验证按钮无响应 | 服务未重启 | `pkill -f "python.*api.py" && python api.py` |
| 保存失败 | 网络错误 | 查看浏览器DevTools控制台 |
| JSON预览显示undefined | 未选择条目 | 点击表格行选择条目 |
| 数组项删除不生效 | 事件监听器未绑定 | 刷新页面重试 |
| 端口5000访问403错误 | macOS AirPlay占用端口 | 使用端口5001访问 |

### 7.6 性能指标

| 指标 | 目标值 | Phase 3状态 |
|------|--------|--------|
| 页面加载时间 | <1秒 | ✅ 通过 |
| 库列表渲染 | <300ms | ✅ 通过 |
| 表格渲染（2-5项） | <100ms | ✅ 通过 |
| JSON预览更新 | <50ms | ✅ 通过 |
| 模态框打开 | <100ms | ✅ 通过 |

### 7.7 安全考虑

**已实现防护**:
- ✅ XSS防护: HTML实体转义
- ✅ CSRF防护: Flask默认保护
- ✅ SQL注入: 无SQL操作（纯JSON文件）
- ✅ 输入验证: JSON Schema严格验证

**待加强**:
- ⚠️ 文件上传验证（导入功能）
- ⚠️ 权限控制（未实现身份验证）

### 7.8 已知问题

**Phase 3.0 Known Issues**:
1. **getEnabledLibraries() 返回类型不一致**:
   - 问题: `library-manager.js` line 91期待对象数组，但`getEnabledLibraries()`返回字符串数组
   - 状态: ✅ 已修复 (2025-11-14)
   - 修复: 改用`getLibraryMetadata(libName)`获取完整元数据

2. **端口冲突**:
   - 问题: macOS AirPlay占用5000端口
   - 解决: Flask自动使用5001端口

3. **导入功能**:
   - 状态: ⚠️ 基础实现完成，冲突解决UI待增强

4. **批量编辑**:
   - 状态: ⚠️ 仅支持批量删除，批量修改多条目待实现

### 7.9 未来增强计划

**Phase 4候选功能**:
- [ ] 拖拽排序（数组项重新排序）
- [ ] 可视化字段编辑器（颜色选择器、图片上传）
- [ ] 批量编辑（同时修改多个条目）
- [ ] 版本历史（追踪修改记录）
- [ ] 撤销/重做（操作历史）
- [ ] 富文本编辑器（描述字段）
- [ ] 字段预设（保存常用配置）
- [ ] 高级搜索（按字段、日期范围）
- [ ] 导入时冲突解决UI

### 7.10 文件清单

**新建文件** (5 files):
1. `web/library_management.html` (296 lines) - 主页面
2. `web/css/library-management.css` (770 lines) - 样式表
3. `web/js/json-previewer.js` (279 lines) - JSON预览组件
4. `web/js/library-form-builder.js` (629 lines) - 表单生成器
5. `web/js/library-manager.js` (1,131 lines) - 主控制器

**修改文件** (3 files):
1. `api.py` (+213 lines: 验证端点 874-1084)
2. `requirements.txt` (+1 line: jsonschema>=4.21.0)
3. `web/index.html` (+1 line: 导航链接)

**总代码量**: ~4,587 lines (Backend 213 + Frontend 4,374)

---

**相关文档**:
- 实现详情: `docs/changelog/2025-11-14-phase3-library-management.md`
- Phase 3完成报告: `docs/changelog/PHASE3_COMPLETE.md`
- 测试结果: 见上述7.6性能指标

---

## 八、Next.js重构计划 🚀

### 8.1 重构概述

**状态**: 📋 规划阶段
**目标**: 将当前Flask + Vanilla JS系统全量重构为Next.js + TypeScript + shadcn/ui
**预计周期**: 8-10周
**文档**: `docs/refactor/`

### 8.2 技术栈决策

| 维度 | 现有技术 | 新技术 | 理由 |
|------|---------|--------|------|
| **后端框架** | Flask (Python) | Next.js 15 App Router | 全栈TypeScript，Serverless友好 |
| **数据库** | JSON文件 | PostgreSQL + Prisma ORM | 关系型数据库，强类型ORM |
| **前端框架** | Vanilla JS | React 19 + Next.js | 组件化，状态管理 |
| **UI组件库** | 自定义CSS | shadcn/ui + Tailwind CSS | 现代化设计，轻量级 |
| **验证** | JSON Schema | Zod | TypeScript-first |
| **异步任务** | Flask后台线程 | Next.js Server Actions + 轮询 | 简化架构 |
| **图片存储** | 本地文件系统 | 本地 + nginx静态服务 | 平滑迁移 |
| **AI Providers** | Python SDK | 直接REST API封装 | 减少依赖 |
| **部署** | 无 | Vercel + 自托管nginx | Serverless主应用 |

### 8.3 核心文档

1. **[REFACTOR.md](docs/refactor/REFACTOR.md)** - 完整架构设计文档
   - 技术栈详细说明
   - 架构对比（Flask vs Next.js）
   - 核心业务逻辑迁移方案
   - 目录结构设计
   - 部署架构

2. **[REFRACTOR_TODO.md](docs/refactor/REFRACTOR_TODO.md)** - 详细任务追踪清单
   - 7个Phases（Phase 0-6）
   - 每个Phase的详细子任务
   - 预估工作量
   - 完成标准
   - 依赖关系

3. **[DATABASE_SCHEMA.md](docs/refactor/DATABASE_SCHEMA.md)** - Prisma Schema设计
   - 完整Prisma Schema定义
   - 表关系图
   - 数据迁移策略
   - 查询示例

4. **[API_MAPPING.md](docs/refactor/API_MAPPING.md)** - API端点映射表
   - 45个Flask端点 → Next.js Route Handlers对应关系
   - 请求/响应格式对比
   - Breaking Changes标注

### 8.4 重构阶段规划

| Phase | 阶段名称 | 预计时长 | 关键里程碑 | 状态 |
|-------|---------|---------|-----------|------|
| **Phase 0** | 项目初始化 | 2-3天 | Next.js项目搭建 | ✅ **完成** (2025-11-16) |
| **Phase 1** | 数据层设计 | 1周 | Prisma Schema完成 | ⏳ **进行中** |
| **Phase 2** | 核心API | 1.5周 | 库管理+Prompt生成API | ⬜ 待开始 |
| **Phase 3** | UI层 | 1周 | 主要页面完成 | ⬜ 待开始 |
| **Phase 4** | 图片生成 | 1.5周 | 3轮生成流程 | ⬜ 待开始 |
| **Phase 5** | 高级功能 | 1周 | 模板编辑器+同步 | ⬜ 待开始 |
| **Phase 6** | 测试与部署 | 1.5周 | 生产环境上线 | ⬜ 待开始 |

**总体进度**: 1/7 Phases 完成 (14%)

### 8.5 关键技术挑战

#### 8.5.1 Template Engine输出一致性 ⚠️
- **挑战**: TypeScript重写后必须与Python版本输出100%一致
- **缓解**:
  - 编写snapshot测试（100个随机种子）
  - 单元测试覆盖每个模块
  - 相同随机种子对比输出

#### 8.5.2 Vercel Serverless限制
- **挑战**: 图片生成超时（10秒/60秒限制）
- **缓解**:
  - 图片生成独立到VPS
  - 混合部署架构（Vercel + nginx）

#### 8.5.3 数据迁移策略
- **方案**: Clean Slate（从零开始）
  - ✅ 完整迁移: 6个库JSON + 系统模板
  - ❌ 不迁移: records/prompts（从零开始）
  - ⚠️ 图片文件保留但数据库无历史记录

### 8.6 目录结构预览

```
promptgen-next/
├── prisma/
│   └── schema.prisma              # Prisma Schema
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (dashboard)/          # 仪表板页面组
│   │   ├── api/                  # API Routes
│   │   └── layout.tsx
│   ├── components/               # React组件
│   │   ├── ui/                  # shadcn组件
│   │   ├── library/             # 库管理组件
│   │   └── prompt/              # Prompt生成组件
│   ├── lib/                      # 核心业务逻辑
│   │   ├── engines/             # Template引擎
│   │   ├── providers/           # AI Providers
│   │   ├── generators/          # 生成器
│   │   └── sync/                # 同步管理
│   ├── schemas/                  # Zod验证Schema
│   └── types/                    # TypeScript类型定义
├── tests/                        # 测试文件
├── docs/refactor/                # 重构文档
└── scripts/                      # 迁移脚本
```

### 8.7 估算工作量

- **总开发时间**: 8-10周（全职）
- **总代码量**: ~8,000-10,000 LOC
  - TypeScript业务逻辑: 3,500 LOC
  - React组件: 2,500 LOC
  - API Routes: 1,500 LOC
  - Schema定义: 800 LOC
  - 测试: 1,500 LOC

### 8.8 下一步行动

1. ✅ 创建重构设计文档（已完成）
2. ✅ 创建任务追踪清单（已完成）
3. ✅ 创建数据库Schema设计（已完成）
4. ✅ 创建API映射表（已完成）
5. ✅ **完成Phase 0：项目初始化** ⭐ (2025-11-16)
   - Next.js 16.0.3项目搭建
   - 所有依赖配置且版本up-to-date
   - 质量优化修复（5项）
   - 开发服务器零警告运行
6. ⏳ **进行中**: 开始Phase 1：数据层设计

### 8.9 相关资源

- **重构文档**: `docs/refactor/REFACTOR.md`
- **任务清单**: `docs/refactor/REFRACTOR_TODO.md`
- **数据库设计**: `docs/refactor/DATABASE_SCHEMA.md`
- **API映射**: `docs/refactor/API_MAPPING.md`

---

**最后更新**: 2025-11-15
**维护者**: Claude + Sam Wong
