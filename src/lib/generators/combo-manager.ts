/**
 * Combo Manager
 * Enumerates all possible library combinations for batch generation
 */

import { prisma } from '@/lib/db/prisma';
import { generateImageId } from '@/lib/utils/image-id';
import type { LibraryName } from '@/lib/config/library-config';

/**
 * Library filter for combination enumeration
 */
export interface LibraryFilter {
  /**
   * Selected character IDs
   * If empty, uses all characters
   */
  character?: string[];

  /**
   * Selected pose IDs
   */
  pose?: string[];

  /**
   * Selected scene IDs
   */
  scene?: string[];

  /**
   * Selected theme IDs
   */
  theme?: string[];

  /**
   * Selected style IDs
   */
  style?: string[];
}

/**
 * Combination result
 */
export interface Combination {
  /**
   * Generated image ID for this combination
   */
  imageId: string;

  /**
   * Library selections
   */
  libraryIds: {
    character: string;
    pose: string;
    scene: string;
    theme: string;
    style: string;
  };
}

/**
 * Combo Manager - handles combination enumeration
 */
export class ComboManager {
  /**
   * Enumerate all possible combinations based on filter
   */
  async enumerateCombinations(filter: LibraryFilter = {}): Promise<Combination[]> {
    console.log('[ComboManager] Enumerating combinations with filter:', filter);

    // Load library entries
    const libraries = await this.loadLibraries();

    // Get selected entries for each library
    const selectedCharacters = filter.character?.length
      ? this.filterEntries(libraries.character, filter.character)
      : libraries.character;

    const selectedPoses = filter.pose?.length
      ? this.filterEntries(libraries.pose, filter.pose)
      : libraries.pose;

    const selectedScenes = filter.scene?.length
      ? this.filterEntries(libraries.scene, filter.scene)
      : libraries.scene;

    const selectedThemes = filter.theme?.length
      ? this.filterEntries(libraries.theme, filter.theme)
      : libraries.theme;

    const selectedStyles = filter.style?.length
      ? this.filterEntries(libraries.style, filter.style)
      : libraries.style;

    // Calculate Cartesian product
    const combinations: Combination[] = [];

    for (const character of selectedCharacters) {
      for (const pose of selectedPoses) {
        for (const scene of selectedScenes) {
          for (const theme of selectedThemes) {
            for (const style of selectedStyles) {
              const libraryIds = {
                character: character.id,
                pose: pose.id,
                scene: scene.id,
                theme: theme.id,
                style: style.id,
              };

              const imageId = await generateImageId(libraryIds);

              combinations.push({
                imageId,
                libraryIds,
              });
            }
          }
        }
      }
    }

    console.log(
      `[ComboManager] Generated ${combinations.length} combination(s)`
    );

    return combinations;
  }

  /**
   * Calculate total number of combinations without generating them
   */
  async calculateCombinationCount(filter: LibraryFilter = {}): Promise<number> {
    const libraries = await this.loadLibraries();

    const characterCount = filter.character?.length || libraries.character.length;
    const poseCount = filter.pose?.length || libraries.pose.length;
    const sceneCount = filter.scene?.length || libraries.scene.length;
    const themeCount = filter.theme?.length || libraries.theme.length;
    const styleCount = filter.style?.length || libraries.style.length;

    const total =
      characterCount * poseCount * sceneCount * themeCount * styleCount;

    console.log(
      `[ComboManager] Total combinations: ${total} (${characterCount}×${poseCount}×${sceneCount}×${themeCount}×${styleCount})`
    );

    return total;
  }

  /**
   * Filter existing records to find ungenerated combinations
   */
  async getUngeneratedCombinations(
    filter: LibraryFilter = {}
  ): Promise<Combination[]> {
    const allCombinations = await this.enumerateCombinations(filter);

    // Get existing image IDs
    const existingRecords = await prisma.record.findMany({
      where: {
        promptGenerated: true,
      },
      select: {
        imageId: true,
      },
    });

    const existingImageIds = new Set(existingRecords.map((r) => r.imageId));

    // Filter out existing combinations
    const ungenerated = allCombinations.filter(
      (combo) => !existingImageIds.has(combo.imageId)
    );

    console.log(
      `[ComboManager] ${ungenerated.length}/${allCombinations.length} combinations are ungenerated`
    );

    return ungenerated;
  }

  /**
   * Get combinations that have prompts but no images
   */
  async getUnimagedCombinations(
    filter: LibraryFilter = {}
  ): Promise<Combination[]> {
    const allCombinations = await this.enumerateCombinations(filter);

    // Get records with prompts but no images
    const recordsWithoutImages = await prisma.record.findMany({
      where: {
        promptGenerated: true,
        imageGenerated: false,
      },
      select: {
        imageId: true,
      },
    });

    const unimagedImageIds = new Set(recordsWithoutImages.map((r) => r.imageId));

    // Filter to only unimaged combinations
    const unimaged = allCombinations.filter((combo) =>
      unimagedImageIds.has(combo.imageId)
    );

    console.log(
      `[ComboManager] ${unimaged.length} combination(s) have prompts but no images`
    );

    return unimaged;
  }

  /**
   * Load library entries from database
   */
  private async loadLibraries() {
    const libraries = await prisma.library.findMany({
      where: {
        name: {
          in: ['character', 'pose', 'scene', 'theme', 'style'],
        },
      },
    });

    const libraryMap: Record<string, any[]> = {
      character: [],
      pose: [],
      scene: [],
      theme: [],
      style: [],
    };

    for (const library of libraries) {
      const entries = library.entries as Record<string, any>;
      libraryMap[library.name] = Object.entries(entries).map(
        ([id, data]) => ({
          id,
          ...data,
        })
      );
    }

    return libraryMap;
  }

  /**
   * Filter library entries by IDs
   */
  private filterEntries(
    entries: Array<{ id: string; [key: string]: any }>,
    selectedIds: string[]
  ): Array<{ id: string; [key: string]: any }> {
    return entries.filter((entry) => selectedIds.includes(entry.id));
  }

  /**
   * Get combinations summary statistics
   */
  async getCombinationStats(filter: LibraryFilter = {}) {
    const [totalPossible, allCombinations] = await Promise.all([
      this.calculateCombinationCount(filter),
      this.enumerateCombinations(filter),
    ]);

    const allImageIds = allCombinations.map((c) => c.imageId);

    // Get existing records stats
    const [withPrompts, withImages] = await Promise.all([
      prisma.record.count({
        where: {
          imageId: { in: allImageIds },
          promptGenerated: true,
        },
      }),
      prisma.record.count({
        where: {
          imageId: { in: allImageIds },
          imageGenerated: true,
        },
      }),
    ]);

    return {
      totalPossible,
      withPrompts,
      withImages,
      withoutPrompts: totalPossible - withPrompts,
      withPromptsButNoImages: withPrompts - withImages,
    };
  }

  /**
   * ============================================================
   * NEW: Dynamic Library Strategy Support (Multi-Select)
   * ============================================================
   */

  /**
   * Calculate combination count with dynamic libraries and multi-select
   *
   * @param strategyConfig - Library selections (each library can have multiple element IDs)
   * @returns Total combination count
   *
   * @example
   * // 2 characters × 1 theme × 3 scenes = 6 combinations
   * calculateDynamicCombinationCount({
   *   character: ['betty', 'alice'],
   *   theme: ['christmas'],
   *   scene: [] // empty means all scenes
   * })
   */
  async calculateDynamicCombinationCount(
    strategyConfig: Partial<Record<LibraryName, string[]>>
  ): Promise<number> {
    const libraries = await this.loadDynamicLibraries(
      Object.keys(strategyConfig) as LibraryName[]
    );

    let total = 1;

    for (const [libraryName, selectedIds] of Object.entries(strategyConfig)) {
      const libraryEntries = libraries[libraryName] || [];

      // If selectedIds is empty or undefined, use all entries
      const count =
        selectedIds && selectedIds.length > 0
          ? selectedIds.length
          : libraryEntries.length;

      total *= count;
    }

    console.log(
      `[ComboManager] Dynamic combination count: ${total}`,
      strategyConfig
    );

    return total;
  }

  /**
   * Enumerate combinations with dynamic libraries
   *
   * @param strategyConfig - Library selections
   * @returns Array of image IDs for each combination
   *
   * @example
   * enumerateDynamicCombinations({
   *   character: ['betty'],
   *   theme: ['christmas', 'halloween'],
   *   scene: ['bedroom']
   * })
   * // Returns: ['betty_christmas_bedroom', 'betty_halloween_bedroom']
   */
  async enumerateDynamicCombinations(
    strategyConfig: Partial<Record<LibraryName, string[]>>
  ): Promise<Array<{ imageId: string; libraryIds: Record<string, string> }>> {
    console.log('[ComboManager] Enumerating dynamic combinations:', strategyConfig);

    const libraryNames = Object.keys(strategyConfig) as LibraryName[];
    const libraries = await this.loadDynamicLibraries(libraryNames);

    // Prepare selected entries for each library
    const selectedEntriesMap: Record<string, Array<{ id: string }>> = {};

    for (const libraryName of libraryNames) {
      const allEntries = libraries[libraryName] || [];
      const selectedIds = strategyConfig[libraryName] || [];

      selectedEntriesMap[libraryName] =
        selectedIds.length > 0
          ? allEntries.filter((entry) => selectedIds.includes(entry.id))
          : allEntries;
    }

    // Generate Cartesian product
    const combinations = this.generateCartesianProduct(
      libraryNames,
      selectedEntriesMap
    );

    console.log(
      `[ComboManager] Generated ${combinations.length} dynamic combination(s)`
    );

    return combinations;
  }

  /**
   * Load library entries for specific library names
   */
  private async loadDynamicLibraries(libraryNames: LibraryName[]) {
    const libraries = await prisma.library.findMany({
      where: {
        name: {
          in: libraryNames,
        },
      },
    });

    const libraryMap: Record<string, Array<{ id: string; [key: string]: any }>> = {};

    for (const library of libraries) {
      const entries = library.entries as Record<string, any>;
      libraryMap[library.name] = Object.entries(entries).map(([id, data]) => ({
        id,
        ...data,
      }));
    }

    return libraryMap;
  }

  /**
   * Generate Cartesian product for dynamic library combinations
   */
  private generateCartesianProduct(
    libraryNames: LibraryName[],
    entriesMap: Record<string, Array<{ id: string }>>
  ): Array<{ imageId: string; libraryIds: Record<string, string> }> {
    const results: Array<{ imageId: string; libraryIds: Record<string, string> }> =
      [];

    const generate = (index: number, current: Record<string, string>) => {
      if (index === libraryNames.length) {
        // Base case: all libraries selected, generate imageId
        const imageId = this.generateImageIdSync(current);
        results.push({
          imageId,
          libraryIds: { ...current },
        });
        return;
      }

      const libraryName = libraryNames[index];
      const entries = entriesMap[libraryName] || [];

      for (const entry of entries) {
        generate(index + 1, {
          ...current,
          [libraryName]: entry.id,
        });
      }
    };

    generate(0, {});
    return results;
  }

  /**
   * Synchronous version of generateImageId for Cartesian product
   * Uses deterministic ID generation without database lookup
   */
  private generateImageIdSync(libraryIds: Record<string, string>): string {
    // Sort keys to ensure consistent order
    const sortedKeys = Object.keys(libraryIds).sort();
    const parts = sortedKeys.map((key) => libraryIds[key]);
    return parts.join('_');
  }
}
