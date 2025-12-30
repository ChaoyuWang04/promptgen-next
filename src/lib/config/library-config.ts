/**
 * Library Configuration
 *
 * This module provides backward-compatible wrappers around LibraryService.
 * New code should use libraryService directly from '@/lib/services'.
 *
 * MIGRATION NOTICE:
 * - All synchronous functions are deprecated and will be removed in a future version
 * - Use async functions or libraryService directly for new code
 * - Library configuration is now stored in the database, not hardcoded
 */

import { libraryService, type LibraryConfig as ServiceLibraryConfig } from '../services';

// ==========================================
// Types (kept for backward compatibility)
// ==========================================

/**
 * Library name type - now dynamic from database
 * @deprecated Use string type directly, library names are dynamic
 */
export type LibraryName = string;

/**
 * Library structure type
 */
export type LibraryStructureType = 'standard' | 'nested_array';

/**
 * Library requirement type
 */
export type LibraryRequirementType = 'required' | 'optional';

/**
 * Library category type (matches Prisma LibraryCategory enum)
 */
export type LibraryCategory = 'MAIN' | 'DIFF';

/**
 * Library configuration interface
 * Compatible with the old interface structure
 */
export interface LibraryConfig {
  /** Internal name (matches database) */
  name: string;

  /** Display name (Chinese) */
  displayName: string;

  /** Field to display in dropdowns (e.g., 'name' for character.name) */
  displayField: string;

  /** Whether this library is required for prompt generation */
  type: LibraryRequirementType;

  /** Library category: MAIN or DIFF */
  category: LibraryCategory;

  /** Sort order in UI */
  order: number;

  /** Data structure type */
  structureType: LibraryStructureType;

  /** Description of the library's purpose */
  description?: string;

  /** Abbreviation for image ID generation */
  abbreviation?: string;
}

/**
 * Convert ServiceLibraryConfig to legacy LibraryConfig
 */
function toLegacyConfig(lib: ServiceLibraryConfig): LibraryConfig {
  return {
    name: lib.name,
    displayName: lib.displayName,
    displayField: lib.displayField,
    type: lib.isRequired ? 'required' : 'optional',
    category: lib.category,
    order: lib.order,
    structureType: (lib.metadata?.structureType as LibraryStructureType) || 'standard',
    description: lib.description || undefined,
    abbreviation: lib.abbreviation || undefined,
  };
}

// ==========================================
// Async Functions (recommended for new code)
// ==========================================

/**
 * Get library configuration by name (async)
 */
export async function getLibraryConfigAsync(name: string): Promise<LibraryConfig | undefined> {
  const lib = await libraryService.getByName(name);
  return lib ? toLegacyConfig(lib) : undefined;
}

/**
 * Get all required libraries (async)
 */
export async function getRequiredLibrariesAsync(): Promise<LibraryConfig[]> {
  const libs = await libraryService.getRequired();
  return libs.map(toLegacyConfig);
}

/**
 * Get all optional libraries (async)
 */
export async function getOptionalLibrariesAsync(): Promise<LibraryConfig[]> {
  const libs = await libraryService.getOptional();
  return libs.map(toLegacyConfig);
}

/**
 * Check if a library name is valid (async)
 */
export async function isValidLibraryNameAsync(name: string): Promise<boolean> {
  return libraryService.isValidLibraryName(name);
}

/**
 * Get library display name (async)
 */
export async function getLibraryDisplayNameAsync(name: string): Promise<string> {
  const lib = await libraryService.getByName(name);
  return lib?.displayName || name;
}

/**
 * Get sorted libraries by order field (async)
 */
export async function getSortedLibrariesAsync(): Promise<LibraryConfig[]> {
  const libs = await libraryService.getSortedByOrder();
  return libs.map(toLegacyConfig);
}

/**
 * Get libraries by category (async)
 */
export async function getLibrariesByCategoryAsync(category: LibraryCategory): Promise<LibraryConfig[]> {
  const libs = await libraryService.getByCategory(category);
  return libs.map(toLegacyConfig);
}

/**
 * Get MAIN libraries (async)
 */
export async function getMainLibrariesAsync(): Promise<LibraryConfig[]> {
  return getLibrariesByCategoryAsync('MAIN');
}

/**
 * Get DIFF libraries (async)
 */
export async function getDiffLibrariesAsync(): Promise<LibraryConfig[]> {
  return getLibrariesByCategoryAsync('DIFF');
}

/**
 * Check if a library belongs to a specific category (async)
 */
export async function isLibraryInCategoryAsync(
  libraryName: string,
  category: LibraryCategory
): Promise<boolean> {
  const config = await libraryService.getByName(libraryName);
  return config?.category === category;
}

/**
 * Get all library names (async)
 */
export async function getLibraryNamesAsync(): Promise<string[]> {
  return libraryService.getNames();
}

/**
 * Get all enabled libraries (async)
 */
export async function getEnabledLibrariesAsync(): Promise<LibraryConfig[]> {
  const libs = await libraryService.getAll();
  return libs.map(toLegacyConfig);
}

// ==========================================
// Deprecated Synchronous Functions
// These are kept for backward compatibility during migration
// ==========================================

// Cache for synchronous access (populated on first async call)
let _cachedLibraries: LibraryConfig[] | null = null;
let _cachePromise: Promise<void> | null = null;

/**
 * Initialize cache for synchronous access
 * Call this at app startup to enable synchronous functions
 */
export async function initLibraryConfigCache(): Promise<void> {
  const libs = await libraryService.getAll();
  _cachedLibraries = libs.map(toLegacyConfig);
}

/**
 * Get cached libraries (for synchronous access)
 * Returns empty array if cache not initialized
 */
function getCachedLibraries(): LibraryConfig[] {
  if (!_cachedLibraries) {
    // Trigger async initialization if not started
    if (!_cachePromise) {
      _cachePromise = initLibraryConfigCache();
    }
    console.warn(
      'Library config cache not initialized. Call initLibraryConfigCache() at app startup.'
    );
    return [];
  }
  return _cachedLibraries;
}

/**
 * Invalidate the library config cache
 * Call this after library CRUD operations
 */
export function invalidateLibraryConfigCache(): void {
  _cachedLibraries = null;
  _cachePromise = null;
  libraryService.invalidateCache();
}

/**
 * @deprecated Use getLibraryConfigAsync or libraryService.getByName
 */
export function getLibraryConfig(name: string): LibraryConfig | undefined {
  return getCachedLibraries().find(lib => lib.name === name);
}

/**
 * @deprecated Use getRequiredLibrariesAsync or libraryService.getRequired
 */
export function getRequiredLibraries(): LibraryConfig[] {
  return getCachedLibraries().filter(lib => lib.type === 'required');
}

/**
 * @deprecated Use getOptionalLibrariesAsync or libraryService.getOptional
 */
export function getOptionalLibraries(): LibraryConfig[] {
  return getCachedLibraries().filter(lib => lib.type === 'optional');
}

/**
 * @deprecated Use isValidLibraryNameAsync or libraryService.isValidLibraryName
 */
export function isValidLibraryName(name: string): boolean {
  return getCachedLibraries().some(lib => lib.name === name);
}

/**
 * @deprecated Use getLibraryDisplayNameAsync
 */
export function getLibraryDisplayName(name: string): string {
  const config = getLibraryConfig(name);
  return config?.displayName || name;
}

/**
 * @deprecated Use getSortedLibrariesAsync or libraryService.getSortedByOrder
 */
export function getSortedLibraries(): LibraryConfig[] {
  return [...getCachedLibraries()].sort((a, b) => a.order - b.order);
}

/**
 * @deprecated Use getLibrariesByCategoryAsync or libraryService.getByCategory
 */
export function getLibrariesByCategory(category: LibraryCategory): LibraryConfig[] {
  return getCachedLibraries().filter(lib => lib.category === category);
}

/**
 * @deprecated Use getMainLibrariesAsync
 */
export function getMainLibraries(): LibraryConfig[] {
  return getLibrariesByCategory('MAIN');
}

/**
 * @deprecated Use getDiffLibrariesAsync
 */
export function getDiffLibraries(): LibraryConfig[] {
  return getLibrariesByCategory('DIFF');
}

/**
 * @deprecated Use isLibraryInCategoryAsync
 */
export function isLibraryInCategory(libraryName: string, category: LibraryCategory): boolean {
  const config = getLibraryConfig(libraryName);
  return config?.category === category;
}

/**
 * Get library ID field name
 * This generates the field name dynamically based on library name
 */
export function getLibraryIdField(name: string): string {
  return `${name}_id`;
}

// ==========================================
// Deprecated Constants
// ==========================================

/**
 * @deprecated Library names are now dynamic from database
 * Use getLibraryNamesAsync() instead
 */
export const LIBRARY_NAMES: readonly string[] = [];

/**
 * @deprecated Use getEnabledLibrariesAsync() instead
 */
export const ENABLED_LIBRARIES: LibraryConfig[] = [];

/**
 * @deprecated Use libraryService.getStats() instead
 */
export const TOTAL_LIBRARIES = 0;
export const REQUIRED_LIBRARIES_COUNT = 0;
export const OPTIONAL_LIBRARIES_COUNT = 0;
export const MAIN_LIBRARIES_COUNT = 0;
export const DIFF_LIBRARIES_COUNT = 0;

/**
 * @deprecated Library ID fields are now generated dynamically
 */
export const LIBRARY_ID_FIELDS: Record<string, string> = {};

// Re-export libraryService for convenience
export { libraryService } from '../services';
