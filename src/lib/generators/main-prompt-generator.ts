/**
 * Main Prompt Generator
 *
 * Generates main image prompts from library selections and templates.
 * Creates generation records and manages outfit state for diff generation.
 */

import { prisma } from '../db/prisma';
import { renderTemplate } from '../engines/template-engine';
import { type TemplateContext, type LibrarySelection, type PromptGenerationResult } from '../engines/types';
import { generateImageId } from '../utils/image-id';

/**
 * Load library entry by ID
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

  // Handle nested_array structure (decorative_props)
  if (libraryName === 'decorative_props') {
    const commonProps = entries.common_props || [];
    const entry = commonProps.find((item: any) => item.id === entryId);

    if (!entry) {
      throw new Error(`Entry not found in ${libraryName}: ${entryId}`);
    }

    return entry;
  }

  // Standard structure
  const entry = entries[entryId];

  if (!entry) {
    throw new Error(`Entry not found in ${libraryName}: ${entryId}`);
  }

  return entry;
}

/**
 * Build template context from library selections
 */
async function buildContext(selections: LibrarySelection): Promise<TemplateContext> {
  const [character, pose, scene, theme, style] = await Promise.all([
    loadLibraryEntry('character', selections.character),
    loadLibraryEntry('pose', selections.pose),
    loadLibraryEntry('scene', selections.scene),
    loadLibraryEntry('theme', selections.theme),
    loadLibraryEntry('style', selections.style),
  ]);

  return {
    character,
    pose,
    scene,
    theme,
    style,
  };
}

/**
 * Extract outfit minor state from character
 */
function extractOutfitMinorState(character: any): Array<{
  element: string;
  current_color: string;
}> {
  if (!character.outfit_minor || !Array.isArray(character.outfit_minor)) {
    return [];
  }

  return character.outfit_minor.map((item: any) => ({
    element: item.element,
    current_color: item.original_color || '',
  }));
}

/**
 * Extract used decorations from theme
 */
function extractUsedDecorations(theme: any): {
  from_theme: string[];
  from_scene: string[];
} {
  const fromTheme: string[] = [];

  // Get theme decorations (micro_props or decorative_props)
  if (theme.micro_props && Array.isArray(theme.micro_props)) {
    fromTheme.push(...theme.micro_props.slice(0, theme.max_micro_props || 3));
  } else if (theme.decorative_props && Array.isArray(theme.decorative_props)) {
    const highPriority = theme.decorative_props
      .filter((d: any) => d.priority === 'high')
      .map((d: any) => d.name)
      .slice(0, 3);
    fromTheme.push(...highPriority);
  }

  return {
    from_theme: fromTheme,
    from_scene: [],
  };
}

/**
 * Generate main image prompt
 *
 * @param selections - Library selections
 * @param templateName - Template name (default: system template)
 * @param saveToDatabase - Whether to save record to database
 * @returns Prompt generation result
 */
export async function generateMainPrompt(
  selections: LibrarySelection,
  templateName: string = 'template_default_v1',
  saveToDatabase: boolean = true
): Promise<PromptGenerationResult> {
  // Load template
  const template = await prisma.template.findUnique({
    where: { name: templateName },
    select: { content: true, category: true },
  });

  if (!template) {
    throw new Error(`Template not found: ${templateName}`);
  }

  if (template.category !== 'MAIN') {
    throw new Error(`Template ${templateName} is not a MAIN template`);
  }

  // Build context
  const context = await buildContext(selections);

  // Render template
  const promptCn = renderTemplate(template.content, context, {
    strict: false,
  });

  // Generate image ID
  const imageId = await generateImageId(selections);

  // Extract outfit state and decorations
  const outfitMinorState = extractOutfitMinorState(context.character);
  const usedDecorations = extractUsedDecorations(context.theme);

  // Create result
  const result: PromptGenerationResult = {
    image_id: imageId,
    prompt_cn: promptCn,
    library_ids: selections,
    outfit_minor_state: outfitMinorState,
    used_decorations: usedDecorations,
    generated_at: new Date(),
  };

  // Save to database
  if (saveToDatabase) {
    await saveMainPromptRecord(result, templateName);
  }

  return result;
}

/**
 * Save main prompt generation record to database
 */
async function saveMainPromptRecord(
  result: PromptGenerationResult,
  templateName: string
): Promise<void> {
  // Check if record already exists
  const existing = await prisma.record.findUnique({
    where: { imageId: result.image_id },
  });

  if (existing) {
    throw new Error(`Record already exists for image ID: ${result.image_id}`);
  }

  // Create record
  await prisma.record.create({
    data: {
      imageId: result.image_id,
      libraryIds: result.library_ids as any,
      outfitMinorState: result.outfit_minor_state as any,
      usedDecorations: result.used_decorations as any,
      providerAttempts: [],
      promptGenerated: true,
      imageGenerated: false,
      prompts: {
        create: {
          type: 'MAIN',
          promptCn: result.prompt_cn,
          promptEn: '', // TODO: Translate
        },
      },
    },
  });
}

/**
 * Get available library entries for selection
 */
export async function getAvailableLibraryEntries(libraryName: string): Promise<
  Array<{
    id: string;
    name: string;
    displayName?: string;
  }>
> {
  const library = await prisma.library.findUnique({
    where: { name: libraryName },
    select: { entries: true },
  });

  if (!library) {
    throw new Error(`Library not found: ${libraryName}`);
  }

  const entries = library.entries as Record<string, any>;

  // Handle nested_array structure
  if (libraryName === 'decorative_props') {
    const commonProps = entries.common_props || [];
    return commonProps.map((item: any) => ({
      id: item.id,
      name: item.name,
      displayName: item.name,
    }));
  }

  // Standard structure
  return Object.entries(entries).map(([id, entry]: [string, any]) => ({
    id,
    name: entry.name || entry.pose_name || entry.scene || entry.theme || entry.era_style || id,
    displayName: entry.name || entry.pose_name || entry.scene || entry.theme || entry.era_style,
  }));
}
