/**
 * Library Template Definitions
 *
 * 定义 6 种预定义库模板，包括：
 * - JSON Schema 结构定义
 * - 示例条目数据
 * - 模板元数据
 */

// ========================================
// 类型定义
// ========================================

export interface LibraryTemplate {
  name: string;              // 内部标识符（小写、下划线）
  displayName: string;       // 显示名称（中文）
  description: string;       // 模板描述
  displayField: string;      // 在列表中显示的主要字段名
  category?: string;         // 模板分类（可选）
  schema: object;            // JSON Schema 定义
  exampleEntry: object;      // 示例条目
  structureType: 'standard' | 'nested_array'; // 数据结构类型
}

// ========================================
// Character (人物) 模板
// ========================================

const characterTemplate: LibraryTemplate = {
  name: 'character',
  displayName: '人物',
  description: '角色人物定义，包含外貌、服装、配色规则等',
  displayField: 'name',
  category: 'core',
  structureType: 'standard',
  schema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: '唯一标识符',
        pattern: '^char_[a-z0-9_]+$'
      },
      name: {
        type: 'string',
        description: '人物名称'
      },
      appearance_core: {
        type: 'string',
        description: '核心外貌特征（发型、脸型、表情、标志性配饰）'
      },
      outfit_major: {
        type: 'string',
        description: '主要服装描述'
      },
      outfit_minor: {
        type: 'array',
        description: '次要服装配件（可变色）',
        items: {
          type: 'object',
          properties: {
            element: { type: 'string', description: '配件名称' },
            original_color: { type: 'string', description: '原始颜色' },
            color_pool: {
              type: 'array',
              items: { type: 'string' },
              description: '可选颜色池'
            },
            description_template: { type: 'string', description: '描述模板（{color}占位符）' }
          },
          required: ['element', 'original_color', 'color_pool', 'description_template']
        }
      },
      must_keep: {
        type: 'array',
        items: { type: 'string' },
        description: '必须保持的特征'
      },
      negative_rules: {
        type: 'array',
        items: { type: 'string' },
        description: '禁止出现的元素'
      },
      style_anchor: {
        type: 'string',
        description: '锚定画风ID'
      },
      reference_ids: {
        type: 'array',
        items: { type: 'string' },
        description: '参考图片ID'
      }
    },
    required: ['id', 'name', 'appearance_core', 'outfit_major', 'outfit_minor']
  },
  exampleEntry: {
    id: 'char_example_v1',
    name: 'example_character',
    appearance_core: '短黑发, 圆润脸型, 自然微笑',
    outfit_major: '蓝色连衣裙',
    outfit_minor: [
      {
        element: '鞋子',
        original_color: '红色',
        color_pool: ['绿色', '黄色', '粉色'],
        description_template: '{color}平底鞋'
      }
    ],
    must_keep: ['亲切微笑'],
    negative_rules: ['禁止第二人物', '禁止文字Logo'],
    style_anchor: 'retro_1950s_flat',
    reference_ids: []
  }
};

// ========================================
// Pose (姿态) 模板
// ========================================

const poseTemplate: LibraryTemplate = {
  name: 'pose',
  displayName: '姿态',
  description: '人物姿态定义，包含身体方向、头部方向、手臂和腿部位置等',
  displayField: 'pose_name',
  category: 'core',
  structureType: 'standard',
  schema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: '唯一标识符',
        pattern: '^pose_[a-z0-9_]+$'
      },
      pose_name: {
        type: 'string',
        description: '姿态名称'
      },
      body_orientation: {
        type: 'string',
        description: '身体朝向描述'
      },
      head_orientation: {
        type: 'string',
        description: '头部朝向和表情'
      },
      arm_position: {
        type: 'string',
        description: '手臂位置描述'
      },
      leg_position: {
        type: 'string',
        description: '腿部位置描述'
      },
      emotion: {
        type: 'array',
        items: { type: 'string' },
        description: '情绪关键词'
      },
      usage_hint: {
        type: 'string',
        description: '使用建议'
      }
    },
    required: ['id', 'pose_name', 'body_orientation', 'head_orientation']
  },
  exampleEntry: {
    id: 'pose_example_v1',
    pose_name: '站立微笑',
    body_orientation: '身体正面朝向观众, 自然站立',
    head_orientation: '头部正面, 表情开心微笑',
    arm_position: '双手自然下垂或轻放腰间',
    leg_position: '双腿自然站立',
    emotion: ['友好', '放松', '自信'],
    usage_hint: '适合日常生活场景'
  }
};

// ========================================
// Scene (场景) 模板
// ========================================

const sceneTemplate: LibraryTemplate = {
  name: 'scene',
  displayName: '场景',
  description: '场景定义，包含必要物品、可选物品、相机预设等',
  displayField: 'scene',
  category: 'core',
  structureType: 'standard',
  schema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: '唯一标识符',
        pattern: '^scene_[a-z0-9_]+$'
      },
      scene: {
        type: 'string',
        description: '场景名称'
      },
      must_objects: {
        type: 'array',
        items: { type: 'string' },
        description: '必须出现的物品'
      },
      optional_objects: {
        type: 'array',
        items: { type: 'string' },
        description: '可选物品'
      },
      camera_preset: {
        type: 'object',
        properties: {
          shot: { type: 'string', description: '镜头类型' },
          height: { type: 'string', description: '相机高度' },
          subject_ratio: { type: 'string', description: '主体占比' }
        },
        description: '相机预设'
      },
      occlusion_guard: {
        type: 'array',
        items: { type: 'string' },
        description: '遮挡防护规则'
      },
      layout_priority: {
        type: 'array',
        items: { type: 'string' },
        description: '布局优先级规则'
      },
      cleanliness_level: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: '清洁度等级 (0-1)'
      }
    },
    required: ['id', 'scene', 'must_objects']
  },
  exampleEntry: {
    id: 'scene_example_v1',
    scene: '客厅',
    must_objects: ['沙发', '茶几'],
    optional_objects: ['靠垫', '装饰画', '绿植'],
    camera_preset: {
      shot: '半身近景',
      height: '胸口略上',
      subject_ratio: '0.7-0.85'
    },
    occlusion_guard: ['家具不得遮挡膝盖以上'],
    layout_priority: ['人物位于画面中心'],
    cleanliness_level: 0.8
  }
};

// ========================================
// Theme (主题) 模板
// ========================================

const themeTemplate: LibraryTemplate = {
  name: 'theme',
  displayName: '主题',
  description: '主题定义，包含调色板、氛围、装饰物品等',
  displayField: 'theme',
  category: 'styling',
  structureType: 'standard',
  schema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: '唯一标识符',
        pattern: '^theme_[a-z0-9_]+$'
      },
      theme: {
        type: 'string',
        description: '主题名称'
      },
      palette_core: {
        type: 'array',
        items: { type: 'string' },
        description: '核心配色方案'
      },
      mood_words: {
        type: 'array',
        items: { type: 'string' },
        description: '氛围关键词'
      },
      micro_props: {
        type: 'array',
        items: { type: 'string' },
        description: '微型装饰道具'
      },
      max_micro_props: {
        type: 'number',
        description: '最大微型道具数量'
      },
      strength: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: '主题强度 (0-1)'
      },
      decorative_props: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            name_en: { type: 'string' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] }
          }
        },
        description: '装饰道具列表'
      },
      max_decorative_props: {
        type: 'number',
        description: '最大装饰道具数量'
      },
      exclusion_rules: {
        type: 'array',
        items: { type: 'string' },
        description: '排除规则'
      }
    },
    required: ['id', 'theme', 'palette_core', 'mood_words']
  },
  exampleEntry: {
    id: 'theme_example_v1',
    theme: '示例主题',
    palette_core: ['蓝色点缀', '整体明亮'],
    mood_words: ['轻松', '温馨'],
    micro_props: ['小星星', '彩带'],
    max_micro_props: 3,
    strength: 0.6,
    decorative_props: [
      {
        name: '小气球',
        name_en: 'balloon',
        priority: 'high'
      }
    ],
    max_decorative_props: 5,
    exclusion_rules: ['避免过于深沉的颜色']
  }
};

// ========================================
// Style (画风) 模板
// ========================================

const styleTemplate: LibraryTemplate = {
  name: 'style',
  displayName: '画风',
  description: '画风定义，包含时代风格、渲染技术、色彩特征等',
  displayField: 'era_style',
  category: 'styling',
  structureType: 'standard',
  schema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: '唯一标识符',
        pattern: '^style_[a-z0-9_]+$'
      },
      style_id: {
        type: 'string',
        description: '画风ID（用于关联）'
      },
      era_style: {
        type: 'string',
        description: '时代风格描述'
      },
      render_technique: {
        type: 'string',
        description: '渲染技术描述'
      },
      line_weight: {
        type: 'string',
        description: '线条粗细'
      },
      shade_level: {
        type: 'string',
        description: '阴影程度'
      },
      color_temp: {
        type: 'string',
        description: '色温特征'
      },
      inspirations: {
        type: 'array',
        items: { type: 'string' },
        description: '参考灵感来源'
      },
      style_adapter_strength: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: '风格适配器强度 (0-1)'
      },
      negative_style: {
        type: 'array',
        items: { type: 'string' },
        description: '排除的画风特征'
      }
    },
    required: ['id', 'style_id', 'era_style', 'render_technique']
  },
  exampleEntry: {
    id: 'style_example_v1',
    style_id: 'example_style',
    era_style: '现代卡通',
    render_technique: '2D扁平, 干净线条',
    line_weight: '中等',
    shade_level: '轻微阴影',
    color_temp: '中性偏暖',
    inspirations: ['现代动画'],
    style_adapter_strength: 0.7,
    negative_style: ['写实风', '重阴影']
  }
};

// ========================================
// Decorative Props (装饰小物) 模板
// ========================================

const decorativePropsTemplate: LibraryTemplate = {
  name: 'decorative_props',
  displayName: '装饰小物',
  description: '装饰道具库，使用特殊的嵌套数组结构',
  displayField: 'name',
  category: 'assets',
  structureType: 'nested_array', // 特殊结构类型
  schema: {
    type: 'object',
    properties: {
      common_props: {
        type: 'array',
        description: '通用装饰道具列表',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '唯一标识符',
              pattern: '^prop_[a-z0-9_]+$'
            },
            name: {
              type: 'string',
              description: '道具名称（中文）'
            },
            name_en: {
              type: 'string',
              description: '道具名称（英文）'
            },
            size: {
              type: 'string',
              enum: ['small', 'medium', 'large'],
              description: '道具尺寸'
            },
            style_compatible: {
              type: 'array',
              items: { type: 'string' },
              description: '兼容的画风ID列表（"all" 表示兼容所有）'
            },
            category: {
              type: 'string',
              description: '道具分类'
            }
          },
          required: ['id', 'name', 'name_en', 'size', 'style_compatible', 'category']
        }
      }
    },
    required: ['common_props']
  },
  exampleEntry: {
    common_props: [
      {
        id: 'prop_example',
        name: '示例道具',
        name_en: 'example prop',
        size: 'small',
        style_compatible: ['all'],
        category: 'decoration'
      }
    ]
  }
};

// ========================================
// 导出所有模板
// ========================================

export const LIBRARY_TEMPLATES: LibraryTemplate[] = [
  characterTemplate,
  poseTemplate,
  sceneTemplate,
  themeTemplate,
  styleTemplate,
  decorativePropsTemplate
];

// 根据 name 获取模板
export function getTemplateByName(name: string): LibraryTemplate | undefined {
  return LIBRARY_TEMPLATES.find(template => template.name === name);
}

// 根据分类获取模板列表
export function getTemplatesByCategory(category: string): LibraryTemplate[] {
  return LIBRARY_TEMPLATES.filter(template => template.category === category);
}

// 获取所有模板名称列表
export function getAllTemplateNames(): string[] {
  return LIBRARY_TEMPLATES.map(template => template.name);
}

// 验证模板名称是否有效
export function isValidTemplateName(name: string): boolean {
  return LIBRARY_TEMPLATES.some(template => template.name === name);
}
