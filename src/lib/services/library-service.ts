/**
 * Library Service
 *
 * Central service for dynamic library configuration.
 * Replaces hardcoded library configuration with database-driven approach.
 *
 * Features:
 * - Cached library lookups with TTL
 * - Dynamic library type support
 * - Validation utilities
 * - Generator config retrieval
 */

import { prisma } from '../db/prisma';
import type { Library, LibraryCategory } from '@prisma/client';

/**
 * Library configuration interface
 * Represents the full library data from database
 */
export interface LibraryConfig {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  displayField: string;
  category: LibraryCategory;
  abbreviation: string | null;
  isRequired: boolean;
  entries: Record<string, Record<string, unknown>>;
  schema: Record<string, unknown> | null;
  schemaVersion: string;
  order: number;
  isActive: boolean;
  metadata: LibraryMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Library metadata interface
 */
export interface LibraryMetadata {
  structureType?: 'standard' | 'nested_array';
  generatorConfig?: {
    outfitField?: string;
    decorationField?: string;
    additionalDecorationField?: string;
  };
  [key: string]: unknown;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Library Service Class
 *
 * Provides cached access to library configuration from database.
 * All methods are async to support database queries.
 */
class LibraryServiceClass {
  private cache: Map<string, LibraryConfig> = new Map();
  private allLibrariesCache: LibraryConfig[] | null = null;
  private cacheExpiry: number = 0;
  private readonly TTL = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    return Date.now() < this.cacheExpiry && this.allLibrariesCache !== null;
  }

  /**
   * Invalidate the cache
   * Call this after library CRUD operations
   */
  invalidateCache(): void {
    this.cache.clear();
    this.allLibrariesCache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Convert Prisma Library to LibraryConfig
   */
  private toLibraryConfig(library: Library): LibraryConfig {
    return {
      id: library.id,
      name: library.name,
      displayName: library.displayName,
      description: library.description,
      displayField: library.displayField,
      category: library.category,
      abbreviation: library.abbreviation,
      isRequired: library.isRequired,
      entries: library.entries as Record<string, Record<string, unknown>>,
      schema: library.schema as Record<string, unknown> | null,
      schemaVersion: library.schemaVersion,
      order: library.order,
      isActive: library.isActive,
      metadata: library.metadata as LibraryMetadata | null,
      createdAt: library.createdAt,
      updatedAt: library.updatedAt,
    };
  }

  /**
   * Refresh the cache from database
   */
  private async refreshCache(): Promise<void> {
    const libraries = await prisma.library.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    this.cache.clear();
    this.allLibrariesCache = libraries.map(lib => this.toLibraryConfig(lib));

    for (const lib of this.allLibrariesCache) {
      this.cache.set(lib.name, lib);
    }

    this.cacheExpiry = Date.now() + this.TTL;
  }

  /**
   * Ensure cache is populated
   */
  private async ensureCache(): Promise<void> {
    if (!this.isCacheValid()) {
      await this.refreshCache();
    }
  }

  // ==========================================
  // Core Query Methods
  // ==========================================

  /**
   * Get all active libraries sorted by order
   */
  async getAll(): Promise<LibraryConfig[]> {
    await this.ensureCache();
    return this.allLibrariesCache || [];
  }

  /**
   * Get library by name
   */
  async getByName(name: string): Promise<LibraryConfig | null> {
    await this.ensureCache();
    return this.cache.get(name) || null;
  }

  /**
   * Get libraries by category (MAIN or DIFF)
   */
  async getByCategory(category: LibraryCategory): Promise<LibraryConfig[]> {
    await this.ensureCache();
    return (this.allLibrariesCache || []).filter(lib => lib.category === category);
  }

  /**
   * Get all required libraries
   */
  async getRequired(): Promise<LibraryConfig[]> {
    await this.ensureCache();
    return (this.allLibrariesCache || []).filter(lib => lib.isRequired);
  }

  /**
   * Get all optional libraries
   */
  async getOptional(): Promise<LibraryConfig[]> {
    await this.ensureCache();
    return (this.allLibrariesCache || []).filter(lib => !lib.isRequired);
  }

  /**
   * Get libraries sorted by order field
   */
  async getSortedByOrder(): Promise<LibraryConfig[]> {
    await this.ensureCache();
    return [...(this.allLibrariesCache || [])].sort((a, b) => a.order - b.order);
  }

  /**
   * Get all library names
   */
  async getNames(): Promise<string[]> {
    await this.ensureCache();
    return (this.allLibrariesCache || []).map(lib => lib.name);
  }

  // ==========================================
  // Validation Methods
  // ==========================================

  /**
   * Check if a library name is valid
   */
  async isValidLibraryName(name: string): Promise<boolean> {
    await this.ensureCache();
    return this.cache.has(name);
  }

  /**
   * Validate library selections
   * Checks that all required libraries are present and all names are valid
   */
  async validateLibraryIds(
    ids: Record<string, string>
  ): Promise<ValidationResult> {
    await this.ensureCache();

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for unknown libraries
    for (const libraryName of Object.keys(ids)) {
      if (!this.cache.has(libraryName)) {
        errors.push(`Unknown library: ${libraryName}`);
      }
    }

    // Check for missing required libraries
    const requiredLibraries = (this.allLibrariesCache || []).filter(
      lib => lib.isRequired
    );
    for (const lib of requiredLibraries) {
      if (!ids[lib.name]) {
        errors.push(`Missing required library: ${lib.displayName} (${lib.name})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate that a field exists in a library's schema
   */
  async validateFieldReference(
    libraryName: string,
    fieldName: string
  ): Promise<ValidationResult> {
    const library = await this.getByName(libraryName);

    if (!library) {
      return {
        valid: false,
        errors: [`Unknown library: ${libraryName}`],
        warnings: [],
      };
    }

    const schema = library.schema;
    if (!schema || !schema.properties) {
      return {
        valid: true,
        errors: [],
        warnings: [`Library ${libraryName} has no schema defined`],
      };
    }

    const properties = schema.properties as Record<string, unknown>;
    if (!properties[fieldName]) {
      return {
        valid: true, // Allow saving, just warn
        errors: [],
        warnings: [`Unknown field: ${libraryName}.${fieldName}`],
      };
    }

    return { valid: true, errors: [], warnings: [] };
  }

  // ==========================================
  // Entry Methods
  // ==========================================

  /**
   * Get a specific entry from a library
   */
  async getEntry(
    libraryName: string,
    entryId: string
  ): Promise<Record<string, unknown> | null> {
    const library = await this.getByName(libraryName);
    if (!library) return null;

    return library.entries[entryId] || null;
  }

  /**
   * Get all entry IDs for a library
   */
  async getEntryIds(libraryName: string): Promise<string[]> {
    const library = await this.getByName(libraryName);
    if (!library) return [];

    return Object.keys(library.entries);
  }

  /**
   * Get the display value for an entry
   */
  async getEntryDisplayValue(
    libraryName: string,
    entryId: string
  ): Promise<string> {
    const library = await this.getByName(libraryName);
    if (!library) return entryId;

    const entry = library.entries[entryId];
    if (!entry) return entryId;

    const displayField = library.displayField;
    return (entry[displayField] as string) || entryId;
  }

  // ==========================================
  // Generator Config Methods
  // ==========================================

  /**
   * Get generator config for a library
   */
  async getGeneratorConfig(
    libraryName: string
  ): Promise<LibraryMetadata['generatorConfig'] | null> {
    const library = await this.getByName(libraryName);
    return library?.metadata?.generatorConfig || null;
  }

  /**
   * Get outfit field name for a library (typically 'character')
   */
  async getOutfitField(libraryName: string): Promise<string | null> {
    const config = await this.getGeneratorConfig(libraryName);
    return config?.outfitField || null;
  }

  /**
   * Get decoration field name for a library (typically 'theme')
   */
  async getDecorationField(libraryName: string): Promise<string | null> {
    const config = await this.getGeneratorConfig(libraryName);
    return config?.decorationField || null;
  }

  // ==========================================
  // Image ID Methods
  // ==========================================

  /**
   * Get abbreviation for image ID generation
   */
  async getAbbreviation(libraryName: string): Promise<string> {
    const library = await this.getByName(libraryName);
    // Fallback to first 4 characters if no abbreviation set
    return library?.abbreviation || libraryName.substring(0, 4);
  }

  /**
   * Get libraries for image ID generation (sorted by order)
   * Only includes libraries that have entries selected
   */
  async getLibrariesForImageId(
    selections: Record<string, string>
  ): Promise<LibraryConfig[]> {
    const allLibraries = await this.getSortedByOrder();
    return allLibraries.filter(lib => selections[lib.name]);
  }

  // ==========================================
  // Statistics
  // ==========================================

  /**
   * Get library statistics
   */
  async getStats(): Promise<{
    total: number;
    required: number;
    optional: number;
    byCategory: Record<string, number>;
  }> {
    await this.ensureCache();
    const libraries = this.allLibrariesCache || [];

    const byCategory: Record<string, number> = {};
    for (const lib of libraries) {
      byCategory[lib.category] = (byCategory[lib.category] || 0) + 1;
    }

    return {
      total: libraries.length,
      required: libraries.filter(lib => lib.isRequired).length,
      optional: libraries.filter(lib => !lib.isRequired).length,
      byCategory,
    };
  }
}

// Export singleton instance
export const libraryService = new LibraryServiceClass();

// Export class for testing
export { LibraryServiceClass };
