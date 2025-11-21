# PromptGen-Next 产品需求文档 v2.0

## 一、项目概述

### 1.1 背景
PromptGen-Next是一个面向Find Difference休闲游戏的广告素材批量生成系统。通过结构化prompt和元素库的组合，实现大规模A/B测试素材的自动化生产。

### 1.2 核心目标
- 通过BFS（广度优先）策略探索不同元素组合的效果
- 通过DFS（深度优先）策略深挖成功组合的潜力
- 实现素材的批量生成、管理和复用
- 单次策略测试可生成约100张素材

### 1.3 系统定位
本系统专注于素材裂变和生成，不涉及广告投放数据的回流和分析。

## 二、系统架构

### 2.1 核心概念

#### 2.1.1 库（Library）
可复用的原子元素集合，所有库遵循统一的数据结构规范。

#### 2.1.2 元素（Element）
库中的最小单位，包含固定属性和可变属性。

#### 2.1.3 模板（Template）
定义prompt生成规则的配置，决定如何组合库中的元素。

#### 2.1.4 记录（Record）
每个生成素材的完整元数据记录。

### 2.2 系统模块
```
系统架构
├── 库管理模块
│   ├── 库CRUD
│   └── 元素CRUD
├── 模板管理模块
│   └── Prompt模板编辑器
├── 生成引擎模块
│   ├── 主图生成
│   └── 对比图生成
├── 素材管理模块
│   ├── 素材检索
│   └── 素材预览
└── 数据存储模块
    ├── 库存储
    ├── 模板存储
    └── Record存储
```

## 三、数据结构设计

### 3.1 库表结构（扁平化设计）

#### 3.1.1 库主表（libraries）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| library_id | VARCHAR(50) | 库唯一标识 |
| library_name | VARCHAR(100) | 库名称 |
| library_type | VARCHAR(50) | 库类型 |
| description | TEXT | 库描述 |
| version | INT | 版本号 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### 3.1.2 元素表（elements）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| element_id | VARCHAR(50) | 元素唯一标识 |
| library_id | VARCHAR(50) | 所属库ID |
| element_name | VARCHAR(100) | 元素名称 |
| element_type | VARCHAR(50) | 元素类型 |
| fixed_properties | JSON | 固定属性 |
| variable_properties | JSON | 可变属性 |
| metadata | JSON | 其他元数据 |
| created_at | TIMESTAMP | 创建时间 |

#### 3.1.3 元素属性表（element_properties）
用于存储需要参与差异生成的可变属性，避免JSON嵌套
| 字段名 | 类型 | 说明 |
|--------|------|------|
| property_id | INT | 自增主键 |
| element_id | VARCHAR(50) | 元素ID |
| property_name | VARCHAR(50) | 属性名（如：鞋子颜色）|
| property_type | VARCHAR(20) | 属性类型（color/size/state）|
| default_value | VARCHAR(100) | 默认值 |
| value_pool | JSON | 可选值列表 |
| is_variable | BOOLEAN | 是否可变 |

### 3.2 模板表结构

#### 3.2.1 模板主表（templates）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| template_id | VARCHAR(50) | 模板唯一标识 |
| template_name | VARCHAR(100) | 模板名称 |
| template_type | VARCHAR(20) | 类型(BFS/DFS) |
| prompt_structure | TEXT | Prompt结构定义 |
| required_libraries | JSON | 必需的库列表 |
| optional_libraries | JSON | 可选的库列表 |
| diff_config | JSON | 差异配置 |
| version | INT | 版本号 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 3.3 生成记录表结构

#### 3.3.1 记录主表（generation_records）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| record_id | VARCHAR(100) | 记录唯一标识 |
| batch_id | VARCHAR(50) | 批次ID |
| template_id | VARCHAR(50) | 使用的模板ID |
| template_version | INT | 模板版本 |
| strategy_type | VARCHAR(20) | 策略类型(BFS/DFS) |
| status | VARCHAR(20) | 状态 |
| created_at | TIMESTAMP | 创建时间 |
| completed_at | TIMESTAMP | 完成时间 |

#### 3.3.2 记录详情表（record_details）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| detail_id | INT | 自增主键 |
| record_id | VARCHAR(100) | 记录ID |
| element_usage | JSON | 使用的元素组合 |
| property_states | JSON | 属性当前状态 |
| main_prompt | TEXT | 主图Prompt |
| diff_prompt | TEXT | 对比图Prompt |
| main_image_path | VARCHAR(500) | 主图路径 |
| diff_image_path | VARCHAR(500) | 对比图路径 |
| final_image_path | VARCHAR(500) | 合成图路径 |
| hook_text | VARCHAR(500) | 宣传语 |
| differences_applied | JSON | 应用的差异 |

#### 3.3.3 元素使用记录表（element_usage）
记录每个素材使用的具体元素和属性值
| 字段名 | 类型 | 说明 |
|--------|------|------|
| usage_id | INT | 自增主键 |
| record_id | VARCHAR(100) | 记录ID |
| library_id | VARCHAR(50) | 库ID |
| element_id | VARCHAR(50) | 元素ID |
| property_name | VARCHAR(50) | 属性名 |
| used_value | VARCHAR(100) | 使用的值 |

### 3.4 库示例数据结构

#### 3.4.1 现有库类型
1. **character** - 角色库
2. **pose** - 姿态库
3. **scene** - 场景库
4. **style** - 画风库
5. **theme** - 主题库
6. **props** - 道具库

#### 3.4.2 扩展库类型
7. **relationships** - 关系库
8. **motives** - 动机库
9. **secrets_conflicts** - 冲突库
10. **stakes** - 后果库
11. **puzzle_types** - 找茬机制库
12. **visual_tropes** - 视觉套路库

所有库遵循相同的数据结构，可在模板中自由组合使用。

## 四、功能模块详述

### 4.1 库管理模块

#### 4.1.1 库管理
- 创建新库：定义库类型、名称、描述
- 编辑库信息：修改库的基本信息
- 删除库：软删除，保留历史数据
- 库版本管理：记录库的变更历史

#### 4.1.2 元素管理
- 添加元素：按照库的结构模板添加新元素
- 编辑元素：修改元素的属性
- 删除元素：软删除
- 批量导入：支持从JSON/CSV导入

### 4.2 模板管理模块

#### 4.2.1 Prompt模板编辑器
模板决定了如何组合库中的元素生成prompt。

**模板结构示例：**
```
模板包含以下部分：
1. 基础结构定义
   - 人物：{character.appearance_core} + {character.outfit_major}
   - 姿态：{pose.body_orientation} + {pose.emotion}
   - 场景：{scene.must_objects}
   - 主题：{theme.palette_core} + {theme.decorative_props}
   - 画风：{style.era_style} + {style.render_technique}

2. 组合规则
   - 必选元素
   - 可选元素
   - 排列方式（全排列/随机选择/固定组合）

3. 约束条件
   - 互斥规则
   - 依赖规则
   - 数量限制
```

### 4.3 生成引擎模块

#### 4.3.1 批量生成流程
1. 选择模板
2. 配置生成参数
   - 生成数量
   - 是否需要对比图
   - 差异配置
3. 执行生成
   - 根据模板组合元素
   - 生成prompt
   - 调用AI生图
   - 保存记录

#### 4.3.2 差异生成配置

**差异类型（固定三种）：**
1. **小物品插入**
   - 数量：0-10个
   - 物品池：怀表、闹钟、苹果、星星、蝴蝶等
   - 分布：随机分散在画面各处

2. **表情变化**
   - 数量：0-10个变化
   - 变化类型：微笑→惊讶、平静→开心等

3. **装饰换色**
   - 数量：0-10处
   - 基于元素的color_pool进行换色
   - 记录原色→新色的映射

**配置规则：**
- 总差异数量：固定为10个
- 分配方式：可配置每种类型的数量
- 默认分配：小物品5个 + 换色3个 + 表情2个

### 4.4 素材管理模块

#### 4.4.1 素材检索
- 按元素组合检索
  - 选择库→选择元素→查找包含这些元素的素材
- 按时间检索
- 按批次检索
- 按模板检索

#### 4.4.2 素材预览
- 缩略图展示
- 详情查看
  - 查看使用的元素
  - 查看生成的prompt
  - 查看应用的差异
  - 下载原图

### 4.5 文件管理规范

#### 4.5.1 命名规则
```
主图：{character}_{pose}_{scene}_{theme}_{style}_{序号}.png
对比图：{character}_{pose}_{scene}_{theme}_{style}_{序号}_diff.png
合成图：{character}_{pose}_{scene}_{theme}_{style}_{序号}_final.png
```

#### 4.5.2 存储结构
```
/storage
├── /images
│   ├── /main        # 主图
│   ├── /diff        # 对比图
│   └── /final       # 最终合成图
├── /prompts
│   ├── /main        # 主图prompt
│   └── /diff        # 对比图prompt
└── /records         # JSON记录文件
```

## 五、业务流程

### 5.1 BFS广度探索流程
1. 创建BFS模板，所有维度设为可变
2. 设置每个库随机选择元素
3. 批量生成100张测试素材
4. 记录每个组合的元素使用情况

### 5.2 DFS深度挖掘流程
1. 基于成功素材创建DFS模板
2. 锁定表现好的元素（如betty+马桶+坐姿）
3. 仅对其他维度进行变化
4. 生成20-30个变体进行测试

### 5.3 素材复用机制
1. 生成前检查：通过文件名判断是否已存在
2. 如已存在，直接复用，在record中标记复用
3. 多个策略共用素材时，各自维护独立的record

## 六、界面设计要求

### 6.1 页面结构
1. **库管理页面**
   - 左侧：库列表
   - 右侧：选中库的元素列表
   - 操作：增删改查

2. **元素管理页面**
   - 表格展示元素
   - 支持批量操作
   - 可编辑属性值

3. **模板编辑页面**
   - 可视化编辑prompt结构
   - 库元素拖拽组合
   - 规则配置面板

4. **批量生成页面**
   - 模板选择
   - 参数配置
   - 进度显示
   - 结果预览

5. **素材库页面**
   - 列表
   - 筛选面板
   - 批量操作
   - 详情弹窗

### 6.2 交互要求
- 所有操作需要即时反馈
- 批量操作需要进度提示
- 失败需要明确的错误信息
- 支持操作撤销

## 七、非功能性需求

### 7.1 性能要求
- 单次批量生成：支持100张
- 素材检索：3秒内返回结果
- 页面加载：2秒内完成

### 7.2 数据要求
- 所有数据本地存储
- 支持数据导出备份
- Record完整记录所有信息

### 7.3 扩展性要求
- 库类型可扩展
- 模板结构可自定义
- 差异类型预留扩展接口

## 八、版本规划

### 8.1 当前版本重点
1. 完善库的扁平化数据结构
2. 实现模板编辑器
3. 优化差异生成机制
4. 建立素材检索系统

### 8.2 后续版本考虑
1. 支持更多游戏类型的素材生成
2. 加入智能推荐功能
3. 集成更多AI生图引擎
4. 多语言宣传语自动生成

## 九、附录

### 9.1 术语表
- **BFS**：广度优先搜索，用于探索多种元素组合
- **DFS**：深度优先搜索，用于深挖成功组合
- **出量素材**：广告投放效果好的素材
- **素材裂变**：通过组合生成大量变体素材

### 9.2 数据示例

#### Record完整结构
```json
{
  "record_id": "batch001_001",
  "batch_id": "batch001",
  "template_id": "template_bfs_v1",
  "template_version": 1,
  "strategy_type": "BFS",
  "element_usage": {
    "character": "char_betty_v1",
    "pose": "pose_sitting_hold_v1",
    "scene": "scene_entrance_door_v1",
    "theme": "theme_christmas_v1",
    "style": "style_retro1950_flat_v1"
  },
  "property_states": {
    "shoe_color": "红色",
    "belt_color": "棕色",
    "bow_color": "蓝色"
  },
  "differences_applied": {
    "added_objects": ["怀表", "苹果", "星星"],
    "color_changes": [
      {"element": "鞋子", "from": "红色", "to": "绿色"}
    ],
    "expression_changes": ["微笑→惊讶"]
  },
  "main_prompt": "[完整的主图prompt]",
  "diff_prompt": "[完整的对比图prompt]",
  "hook_text": "我已经试玩了465次，仍然找不到10个不同",
  "main_image_path": "/storage/images/main/betty_sitting_entrance_christmas_retro50s_001.png",
  "diff_image_path": "/storage/images/diff/betty_sitting_entrance_christmas_retro50s_001_diff.png",
  "final_image_path": "/storage/images/final/betty_sitting_entrance_christmas_retro50s_001_final.png",
  "created_at": "2024-01-20T10:30:00Z",
  "completed_at": "2024-01-20T10:31:00Z",
  "status": "completed"
}
```

---

*文档版本：2.0*
*更新日期：2024-01-20*
*作者：PromptGen产品团队*
