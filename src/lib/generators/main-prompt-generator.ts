/**
 * Main Prompt Generator
 *
 * Generates main image prompts from library selections and templates.
 * Creates generation records and manages outfit state for diff generation.
 *
 * Uses dynamic library configuration from database via LibraryService.
 */

import { prisma } from '../db/prisma';
import { renderTemplate } from '../engines/template-engine';
import { type TemplateContext, type LibrarySelection, type PromptGenerationResult } from '../engines/types';
import { generateImageId } from '../utils/image-id';
import { libraryService } from '../services';

/**
 * Load library entry by ID using LibraryService
 */
async function loadLibraryEntry(libraryName: string, entryId: string): Promise<Record<string, unknown>> {
  const entry = await libraryService.getEntry(libraryName, entryId);

  if (!entry) {
    throw new Error(`Entry not found in ${libraryName}: ${entryId}`);
  }

  return entry;
}

/**
 * Build template context from library selections
 *
 * Dynamically loads all libraries that have entries in the selection.
 */
async function buildContext(selections: LibrarySelection): Promise<TemplateContext> {
  const context: TemplateContext = {};

  // Get all libraries
  const libraries = await libraryService.getAll();

  // Load entries for all selected libraries in parallel
  const loadPromises: Promise<void>[] = [];

  for (const library of libraries) {
    const entryId = selections[library.name];
    if (entryId) {
      loadPromises.push(
        loadLibraryEntry(library.name, entryId).then(entry => {
          context[library.name] = entry;
        })
      );
    }
  }

  await Promise.all(loadPromises);

  return context;
}

/**
 * Extract outfit state from context
 *
 * Uses dynamic field mapping from library metadata.generatorConfig.outfitField
 */
async function extractOutfitState(context: TemplateContext): Promise<
  Array<{
    element: string;
    current_color: string;
  }>
> {
  // Find library with outfitField config
  const libraries = await libraryService.getAll();

  for (const library of libraries) {
    const outfitField = library.metadata?.generatorConfig?.outfitField;
    if (outfitField && context[library.name]) {
      const outfitData = context[library.name][outfitField];

      if (Array.isArray(outfitData)) {
        // Handle array of strings (simple format)
        if (typeof outfitData[0] === 'string') {
          return outfitData.map((item: string) => ({
            element: item,
            current_color: '',
          }));
        }

        // Handle array of objects (complex format with element/color)
        return outfitData.map((item: Record<string, unknown>) => ({
          element: String(item.element || item.name || ''),
          current_color: String(item.original_color || item.color || ''),
        }));
      }
    }
  }

  return [];
}

/**
 * Extract used decorations from context
 *
 * Uses dynamic field mapping from library metadata.generatorConfig.decorationField
 */
async function extractUsedDecorations(context: TemplateContext): Promise<{
  from_theme: string[];
  from_scene: string[];
}> {
  const result = {
    from_theme: [] as string[],
    from_scene: [] as string[],
  };

  // Get all libraries
  const libraries = await libraryService.getAll();

  for (const library of libraries) {
    const decorationField = library.metadata?.generatorConfig?.decorationField;
    const additionalField = library.metadata?.generatorConfig?.additionalDecorationField;

    if (!context[library.name]) continue;

    // Process primary decoration field
    if (decorationField) {
      const decorations = extractDecorationsFromField(context[library.name], decorationField);
      if (library.name === 'theme') {
        result.from_theme.push(...decorations);
      } else if (library.name === 'scene') {
        result.from_scene.push(...decorations);
      }
    }

    // Process additional decoration field (if any)
    if (additionalField) {
      const decorations = extractDecorationsFromField(context[library.name], additionalField);
      if (library.name === 'theme') {
        result.from_theme.push(...decorations);
      }
    }
  }

  return result;
}

/**
 * Extract decoration names from a field
 */
function extractDecorationsFromField(
  entry: Record<string, unknown>,
  fieldName: string,
  maxItems: number = 3
): string[] {
  const data = entry[fieldName];

  if (!Array.isArray(data)) {
    return [];
  }

  // Handle array of strings
  if (typeof data[0] === 'string') {
    return data.slice(0, maxItems);
  }

  // Handle array of objects
  return data
    .filter((item: Record<string, unknown>) => item.priority === 'high' || !item.priority)
    .map((item: Record<string, unknown>) => String(item.name || ''))
    .filter(Boolean)
    .slice(0, maxItems);
}

/**
 * Validate library selections
 */
async function validateSelections(selections: LibrarySelection): Promise<void> {
  const validation = await libraryService.validateLibraryIds(selections);

  if (!validation.valid) {
    throw new Error(`Invalid library selections: ${validation.errors.join(', ')}`);
  }
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
  // Validate selections
  await validateSelections(selections);

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

  // Extract outfit state and decorations dynamically
  const outfitMinorState = await extractOutfitState(context);
  const usedDecorations = await extractUsedDecorations(context);

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
      libraryIds: result.library_ids,
      outfitMinorState: result.outfit_minor_state,
      usedDecorations: result.used_decorations,
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
 *
 * Uses dynamic displayField from library configuration.
 */
export async function getAvailableLibraryEntries(libraryName: string): Promise<
  Array<{
    id: string;
    name: string;
    displayName?: string;
  }>
> {
  const library = await libraryService.getByName(libraryName);

  if (!library) {
    throw new Error(`Library not found: ${libraryName}`);
  }

  const entries = library.entries;
  const displayField = library.displayField;

  // Standard structure - iterate over object
  return Object.entries(entries).map(([id, entry]) => {
    const entryObj = entry as Record<string, unknown>;
    const displayValue = String(entryObj[displayField] || entryObj.name || id);

    return {
      id,
      name: displayValue,
      displayName: displayValue,
    };
  });
}

/**
 * Get all available libraries for prompt generation
 */
export async function getAvailableLibraries(): Promise<
  Array<{
    name: string;
    displayName: string;
    isRequired: boolean;
    category: string;
  }>
> {
  const libraries = await libraryService.getAll();

  return libraries.map(lib => ({
    name: lib.name,
    displayName: lib.displayName,
    isRequired: lib.isRequired,
    category: lib.category,
  }));
}
