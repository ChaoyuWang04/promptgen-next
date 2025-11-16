/**
 * Random Utilities
 *
 * Utilities for random selection, shuffling, and color picking.
 * Used for diff prompt generation (outfit color changes, decoration selection).
 */

/**
 * Get random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get random element from array
 */
export function randomChoice<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot choose from empty array');
  }
  return array[randomInt(0, array.length - 1)];
}

/**
 * Get N random elements from array (without replacement)
 */
export function randomSample<T>(array: T[], count: number): T[] {
  if (count > array.length) {
    throw new Error(`Cannot sample ${count} items from array of length ${array.length}`);
  }

  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Select random color from pool, excluding current color
 */
export function selectNewColor(currentColor: string, colorPool: string[]): string {
  if (colorPool.length === 0) {
    throw new Error('Color pool is empty');
  }

  // Filter out current color
  const availableColors = colorPool.filter(c => c !== currentColor);

  if (availableColors.length === 0) {
    // If all colors are excluded, return a random one anyway
    return randomChoice(colorPool);
  }

  return randomChoice(availableColors);
}

/**
 * Generate random outfit color changes
 *
 * @param outfitMinor - Outfit minor elements with color pools
 * @param changeCount - Number of elements to change (default: 3)
 * @returns Array of color changes
 */
export function generateOutfitChanges(
  outfitMinor: Array<{
    element: string;
    original_color: string;
    color_pool: string[];
    description_template?: string;
  }>,
  changeCount: number = 3
): Array<{
  element: string;
  original_color: string;
  new_color: string;
  description_template?: string;
}> {
  if (outfitMinor.length === 0) {
    return [];
  }

  // Select random elements to change
  const count = Math.min(changeCount, outfitMinor.length);
  const selectedElements = randomSample(outfitMinor, count);

  // Generate color changes
  return selectedElements.map(item => {
    const newColor = selectNewColor(item.original_color, item.color_pool);

    return {
      element: item.element,
      original_color: item.original_color,
      new_color: newColor,
      description_template: item.description_template,
    };
  });
}

/**
 * Select random decorations from theme and scene
 *
 * @param themeDecorations - Theme-specific decorations
 * @param sceneDecorations - Scene-specific decorations (optional)
 * @param totalCount - Total decorations to select (default: 8-9)
 * @returns Selected decorations with sources
 */
export function selectRandomDecorations(
  themeDecorations: Array<{ name: string; priority?: string }>,
  sceneDecorations: Array<{ name: string; priority?: string }> = [],
  totalCount: number = randomInt(8, 9)
): {
  from_theme: string[];
  from_scene: string[];
  all: Array<{ name: string; source: string }>;
} {
  const selected: Array<{ name: string; source: string }> = [];

  // Select 3-5 from theme (prioritize 'high' priority)
  const themeHighPriority = themeDecorations.filter(d => d.priority === 'high');
  const themeLowPriority = themeDecorations.filter(d => d.priority !== 'high');

  const themeCount = randomInt(3, Math.min(5, themeDecorations.length));
  const themeSelected: string[] = [];

  // First, pick from high priority
  const highCount = Math.min(themeHighPriority.length, themeCount);
  const highPicked = randomSample(themeHighPriority, highCount);
  themeSelected.push(...highPicked.map(d => d.name));

  // Fill remaining from low priority
  const remaining = themeCount - highCount;
  if (remaining > 0 && themeLowPriority.length > 0) {
    const lowCount = Math.min(remaining, themeLowPriority.length);
    const lowPicked = randomSample(themeLowPriority, lowCount);
    themeSelected.push(...lowPicked.map(d => d.name));
  }

  selected.push(...themeSelected.map(name => ({ name, source: 'theme' })));

  // Select remaining from scene (if available)
  const sceneCount = totalCount - selected.length;
  let sceneSelected: string[] = [];

  if (sceneCount > 0 && sceneDecorations.length > 0) {
    const count = Math.min(sceneCount, sceneDecorations.length);
    const picked = randomSample(sceneDecorations, count);
    sceneSelected = picked.map(d => d.name);
    selected.push(...sceneSelected.map(name => ({ name, source: 'scene' })));
  }

  return {
    from_theme: themeSelected,
    from_scene: sceneSelected,
    all: selected,
  };
}

/**
 * Set random seed (for testing purposes)
 * Note: JavaScript's Math.random() cannot be seeded directly.
 * This is a placeholder for future implementation with a seedable RNG library.
 */
export function setRandomSeed(seed: number): void {
  // TODO: Implement seedable random number generator if needed for tests
  console.warn('setRandomSeed not implemented - using Math.random()');
}
