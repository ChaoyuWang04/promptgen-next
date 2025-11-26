/**
 * Diff Prompt Generator
 *
 * Generates diff (comparison) image prompts based on existing main images.
 * Implements 3 color changes + 8-9 decoration additions.
 */

import { prisma } from '../db/prisma';
import { renderTemplate } from '../engines/template-engine';
import { type DiffTemplateContext, type DiffPromptGenerationResult } from '../engines/types';
import { generateOutfitChanges, selectRandomDecorations } from '../utils/random';

/**
 * Default color pool for outfit color changes
 */
const DEFAULT_COLOR_POOL = ['红色', '蓝色', '绿色', '黄色', '粉色', '紫色', '橙色', '白色', '黑色', '灰色'];

/**
 * Normalize outfit_minor data to expected format
 * Handles both old format (object array) and simple format (string array)
 */
function normalizeOutfitMinor(
  data: unknown
): Array<{
  element: string;
  original_color: string;
  color_pool: string[];
  description_template?: string;
}> {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  // Check if it's already in the correct format (object array)
  const firstItem = data[0];
  if (typeof firstItem === 'object' && firstItem !== null && 'element' in firstItem) {
    return data as Array<{
      element: string;
      original_color: string;
      color_pool: string[];
      description_template?: string;
    }>;
  }

  // Convert simple string array format to object format
  // e.g., "红色平底鞋" -> {element: "平底鞋", original_color: "红色", color_pool: [...]}
  return (data as string[]).map(item => {
    // Try to extract color from the beginning of the string
    const colorMatch = item.match(/^(红色|蓝色|绿色|黄色|粉色|紫色|橙色|白色|黑色|灰色|棕色|米色)/);
    const originalColor = colorMatch ? colorMatch[1] : '原色';
    const element = colorMatch ? item.slice(colorMatch[1].length) : item;

    return {
      element,
      original_color: originalColor,
      color_pool: DEFAULT_COLOR_POOL.filter(c => c !== originalColor),
      description_template: `{color}${element}`,
    };
  });
}

/**
 * Normalize decorative_props data to expected format
 * Handles both old format (object array) and simple format (string array)
 */
function normalizeDecorations(
  data: unknown
): Array<{ name: string; priority?: string }> {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  // Check if it's already in the correct format (object array)
  const firstItem = data[0];
  if (typeof firstItem === 'object' && firstItem !== null && 'name' in firstItem) {
    return data as Array<{ name: string; priority?: string }>;
  }

  // Convert simple string array format to object format
  return (data as string[]).map((item, index) => ({
    name: item,
    priority: index < 3 ? 'high' : 'low', // First 3 items are high priority
  }));
}

/**
 * Load record by image ID
 */
async function loadRecord(imageId: string): Promise<any> {
  const record = await prisma.record.findUnique({
    where: { imageId },
    include: {
      prompts: true,
    },
  });

  if (!record) {
    throw new Error(`Record not found: ${imageId}`);
  }

  if (!record.promptGenerated) {
    throw new Error(`Main prompt not generated for: ${imageId}`);
  }

  return record;
}

/**
 * Load library entry
 */
async function loadLibraryEntry(libraryName: string, entryId: string): Promise<any> {
  const library = await prisma.library.findUnique({
    where: { name: libraryName },
    select: { entries: true },
  });

  if (!library) {
    throw new Error(`Library not found: ${libraryName}`);
  }

  const entries = library.entries as Record<string, any>;
  const entry = entries[entryId];

  if (!entry) {
    throw new Error(`Entry not found in ${libraryName}: ${entryId}`);
  }

  return entry;
}

/**
 * Build diff template context
 */
async function buildDiffContext(
  record: any,
  outfitChanges: Array<{
    element: string;
    original_color: string;
    new_color: string;
    description_template?: string;
  }>,
  newDecorations: {
    from_theme: string[];
    from_scene: string[];
    all: Array<{ name: string; source: string }>;
  }
): Promise<DiffTemplateContext> {
  // Load library data
  const libraryIds = record.libraryIds as any;

  const [character, pose, scene, theme, style] = await Promise.all([
    loadLibraryEntry('character', libraryIds.character),
    loadLibraryEntry('pose', libraryIds.pose),
    loadLibraryEntry('scene', libraryIds.scene),
    loadLibraryEntry('theme', libraryIds.theme),
    loadLibraryEntry('style', libraryIds.style),
  ]);

  // Build outfit state descriptions
  const outfitState = outfitChanges.map((change, index) => {
    const template = change.description_template || '{color}的{element}';
    const description = template
      .replace('{color}', change.new_color)
      .replace('{element}', change.element);

    return {
      element: change.element,
      current_color: change.new_color,
      description: `${index + 1}. 将${change.element}的颜色改为${change.new_color}`,
    };
  });

  // Build new outfit state for database
  const newOutfitState = outfitChanges.map(change => ({
    element: change.element,
    original_color: change.original_color,
    new_color: change.new_color,
  }));

  // Build color change descriptions
  const colorChanges = outfitChanges.map(change =>
    `${change.element}: 从${change.original_color}改为${change.new_color}`
  );

  // Build decoration descriptions
  const allDecorations = newDecorations.all.map(d => d.name);

  const context: DiffTemplateContext = {
    // Main image data
    main: {
      character,
      pose,
      scene,
      theme,
      style,
    },

    // Current libraries (same as main)
    character,
    pose,
    scene,
    theme,
    style,

    // Outfit state changes
    outfit_state: outfitState.map(s => s.description) as any,
    new_outfit_state: newOutfitState as any,
    color_changes: colorChanges,

    // Decoration changes
    decorations: record.usedDecorations,
    new_decorations: allDecorations as any, // Use string array for template
    all_decorations: allDecorations,
  };

  return context;
}

/**
 * Generate diff image prompt
 *
 * @param imageId - Base image ID
 * @param templateName - Template name (default: system diff template)
 * @param saveToDatabase - Whether to save record to database
 * @returns Diff prompt generation result
 */
export async function generateDiffPrompt(
  imageId: string,
  templateName: string = 'diff_template_default_v1',
  saveToDatabase: boolean = true
): Promise<DiffPromptGenerationResult> {
  // Load record
  const record = await loadRecord(imageId);

  // Load template
  const template = await prisma.template.findUnique({
    where: { name: templateName },
    select: { content: true, category: true },
  });

  if (!template) {
    throw new Error(`Template not found: ${templateName}`);
  }

  if (template.category !== 'DIFF') {
    throw new Error(`Template ${templateName} is not a DIFF template`);
  }

  // Load library data for outfit changes and decorations
  const libraryIds = record.libraryIds as any;
  const character = await loadLibraryEntry('character', libraryIds.character);
  const theme = await loadLibraryEntry('theme', libraryIds.theme);

  // Normalize outfit_minor data format
  // Old format: [{element, original_color, color_pool}]
  // Simple format: ["红色平底鞋", ...] (string array)
  const rawOutfitMinor = character.outfit_minor || [];
  const normalizedOutfitMinor = normalizeOutfitMinor(rawOutfitMinor);

  // Generate 3 outfit color changes
  const outfitChanges = generateOutfitChanges(normalizedOutfitMinor, 3);

  // Normalize decorative_props data format
  // Old format: [{name, priority}]
  // Simple format: ["遮阳伞", ...] (string array)
  const rawDecorations = theme.decorative_props || [];
  const normalizedDecorations = normalizeDecorations(rawDecorations);

  // Generate 8-9 decoration additions
  const newDecorations = selectRandomDecorations(normalizedDecorations, [], 8);

  // Build context
  const context = await buildDiffContext(record, outfitChanges, newDecorations);

  // Render template
  const promptCn = renderTemplate(template.content, context as any, {
    strict: false,
  });

  // Create result
  const result: DiffPromptGenerationResult = {
    diff_id: `${imageId}_diff`,
    image_id: imageId,
    prompt_cn: promptCn,
    new_outfit_state: outfitChanges,
    new_decorations: newDecorations.all,
    generated_at: new Date(),
  };

  // Save to database
  if (saveToDatabase) {
    await saveDiffPromptRecord(result, record.id, templateName);
  }

  return result;
}

/**
 * Save diff prompt to database
 */
async function saveDiffPromptRecord(
  result: DiffPromptGenerationResult,
  recordId: string,
  templateName: string
): Promise<void> {
  // Check if diff prompt already exists
  const existing = await prisma.prompt.findFirst({
    where: {
      recordId,
      type: 'DIFF',
    },
  });

  if (existing) {
    throw new Error(`Diff prompt already exists for record: ${recordId}`);
  }

  // Create diff prompt
  await prisma.prompt.create({
    data: {
      recordId,
      type: 'DIFF',
      promptCn: result.prompt_cn,
      promptEn: '', // TODO: Translate
    },
  });

  // Update record with new outfit state and decorations
  await prisma.record.update({
    where: { id: recordId },
    data: {
      outfitMinorState: result.new_outfit_state as any,
      usedDecorations: {
        from_theme: result.new_decorations.filter(d => d.source === 'theme').map(d => d.name),
        from_scene: result.new_decorations.filter(d => d.source === 'scene').map(d => d.name),
      } as any,
    },
  });
}
