/**
 * Library Configuration
 *
 * Centralizes metadata for all library types.
 * Defines display names, fields, ordering, and validation rules.
 *
 * This is the SINGLE SOURCE OF TRUTH for library configuration.
 */

/**
 * Library type enum
 */
export const LIBRARY_NAMES = [
  'character',
  'pose',
  'scene',
  'theme',
  'style',
  'decorative_props',
] as const;

export type LibraryName = (typeof LIBRARY_NAMES)[number];

/**
 * Library structure type
 */
export type LibraryStructureType = 'standard' | 'nested_array';

/**
 * Library requirement type
 */
export type LibraryRequirementType = 'required' | 'optional';

/**
 * Library configuration interface
 */
export interface LibraryConfig {
  /** Internal name (matches database) */
  name: LibraryName;

  /** Display name (Chinese) */
  displayName: string;

  /** Field to display in dropdowns (e.g., 'name' for character.name) */
  displayField: string;

  /** Whether this library is required for prompt generation */
  type: LibraryRequirementType;

  /** Sort order in UI */
  order: number;

  /** Data structure type */
  structureType: LibraryStructureType;

  /** Description of the library's purpose */
  description?: string;
}

/**
 * ENABLED LIBRARIES CONFIGURATION
 *
 * This array defines all active libraries in the system.
 * To add a new library:
 * 1. Add entry here
 * 2. Create data/{name}.json file
 * 3. Add Prisma query helpers in src/lib/db/queries.ts
 * 4. Frontend will auto-adapt (no changes needed)
 */
export const ENABLED_LIBRARIES: LibraryConfig[] = [
  {
    name: 'character',
    displayName: '人物',
    displayField: 'name',
    type: 'required',
    order: 1,
    structureType: 'standard',
    description: '角色人物定义，包含外貌、服装、配色规则',
  },
  {
    name: 'pose',
    displayName: '姿态',
    displayField: 'pose_name',
    type: 'required',
    order: 2,
    structureType: 'standard',
    description: '人物姿态动作，包含身体朝向、肢体位置、情绪',
  },
  {
    name: 'scene',
    displayName: '场景',
    displayField: 'scene_name',
    type: 'required',
    order: 3,
    structureType: 'standard',
    description: '背景场景环境，包含地点、家具、氛围',
  },
  {
    name: 'theme',
    displayName: '主题',
    displayField: 'theme_name',
    type: 'required',
    order: 4,
    structureType: 'standard',
    description: '节日或活动主题，包含特定装饰道具',
  },
  {
    name: 'style',
    displayName: '画风',
    displayField: 'style_name',
    type: 'required',
    order: 5,
    structureType: 'standard',
    description: '艺术风格定义，包含色调、光照、渲染方式',
  },
  {
    name: 'decorative_props',
    displayName: '装饰小物',
    displayField: 'name',
    type: 'optional',
    order: 6,
    structureType: 'nested_array',
    description: '通用装饰小道具库，用于对比图生成',
  },
];

/**
 * Helper Functions
 */

/**
 * Get library configuration by name
 */
export function getLibraryConfig(name: string): LibraryConfig | undefined {
  return ENABLED_LIBRARIES.find(lib => lib.name === name);
}

/**
 * Get all required libraries
 */
export function getRequiredLibraries(): LibraryConfig[] {
  return ENABLED_LIBRARIES.filter(lib => lib.type === 'required');
}

/**
 * Get all optional libraries
 */
export function getOptionalLibraries(): LibraryConfig[] {
  return ENABLED_LIBRARIES.filter(lib => lib.type === 'optional');
}

/**
 * Check if a library name is valid
 */
export function isValidLibraryName(name: string): name is LibraryName {
  return LIBRARY_NAMES.includes(name as LibraryName);
}

/**
 * Get library display name
 */
export function getLibraryDisplayName(name: LibraryName): string {
  const config = getLibraryConfig(name);
  return config?.displayName || name;
}

/**
 * Get sorted libraries (by order field)
 */
export function getSortedLibraries(): LibraryConfig[] {
  return [...ENABLED_LIBRARIES].sort((a, b) => a.order - b.order);
}

/**
 * Library ID field names (for parsing image IDs)
 */
export const LIBRARY_ID_FIELDS: Record<LibraryName, string> = {
  character: 'character_id',
  pose: 'pose_id',
  scene: 'scene_id',
  theme: 'theme_id',
  style: 'style_id',
  decorative_props: 'decorative_props_id',
};

/**
 * Get library ID field name
 */
export function getLibraryIdField(name: LibraryName): string {
  return LIBRARY_ID_FIELDS[name];
}

/**
 * Constants
 */
export const TOTAL_LIBRARIES = ENABLED_LIBRARIES.length;
export const REQUIRED_LIBRARIES_COUNT = getRequiredLibraries().length;
export const OPTIONAL_LIBRARIES_COUNT = getOptionalLibraries().length;
