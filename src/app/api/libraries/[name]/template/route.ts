/**
 * Library Entry Template Generator
 *
 * GET /api/libraries/[name]/template
 *
 * Generates a template object for creating new library entries.
 * Analyzes existing entries to infer the structure and provides
 * default/empty values for each field.
 *
 * Replaces Flask: GET /api/libraries/<library_name>/template
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  isValidLibraryName,
  getLibraryConfig,
  getLibraryDisplayName,
  type LibraryName,
} from '@/lib/config/library-config';

export const dynamic = 'force-dynamic';

/**
 * Type guard for library name validation
 */
function validateLibraryName(name: string): asserts name is LibraryName {
  if (!isValidLibraryName(name)) {
    throw new Error(`未知的库名称: ${name}`);
  }
}

/**
 * Infer the type of a value
 */
function inferType(value: any): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

/**
 * Generate default value for a given type
 */
function getDefaultValue(value: any): any {
  const type = inferType(value);

  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      // For arrays, analyze first element if exists
      if (value.length > 0) {
        const firstItem = value[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          // Return template of first object in array
          return [generateTemplateFromObject(firstItem)];
        }
        // Return array with one default value
        return [getDefaultValue(firstItem)];
      }
      return [];
    case 'object':
      if (value === null) return null;
      return generateTemplateFromObject(value);
    default:
      return null;
  }
}

/**
 * Generate a template from an object by analyzing its structure
 */
function generateTemplateFromObject(obj: Record<string, any>): Record<string, any> {
  const template: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    template[key] = getDefaultValue(value);
  }

  return template;
}

/**
 * Generate a template for a library entry
 */
function generateEntryTemplate(entries: Record<string, any>, structureType: string): any {
  if (structureType === 'nested_array') {
    // For nested_array, analyze first item in common_props
    const commonProps = entries.common_props || [];
    if (commonProps.length === 0) {
      return {
        id: '',
        name: '',
      };
    }

    return generateTemplateFromObject(commonProps[0]);
  } else {
    // For standard libraries, analyze first entry
    const firstKey = Object.keys(entries)[0];
    if (!firstKey) {
      return {
        id: '',
        name: '',
      };
    }

    return generateTemplateFromObject(entries[firstKey]);
  }
}

/**
 * GET /api/libraries/[name]/template
 *
 * Returns a template object for creating new entries.
 *
 * Response format:
 * {
 *   "template": { ... },           // Template object with default values
 *   "field_types": { ... },        // Inferred types for each field
 *   "structure_type": "standard"   // Library structure type
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    validateLibraryName(name);

    const config = getLibraryConfig(name);
    if (!config) {
      return NextResponse.json(
        { error: `库配置不存在: ${name}` },
        { status: 404 }
      );
    }

    // Get library
    const library = await prisma.library.findUnique({
      where: { name },
      select: { entries: true },
    });

    if (!library) {
      return NextResponse.json(
        { error: `库不存在: ${getLibraryDisplayName(name)}` },
        { status: 404 }
      );
    }

    const entries = library.entries as Record<string, any>;

    // Generate template
    const template = generateEntryTemplate(entries, config.structureType);

    // Infer field types
    const fieldTypes: Record<string, string> = {};
    for (const [key, value] of Object.entries(template)) {
      fieldTypes[key] = inferType(value);
    }

    return NextResponse.json({
      template,
      field_types: fieldTypes,
      structure_type: config.structureType,
      library_name: name,
      display_name: config.displayName,
    });
  } catch (error) {
    console.error(`[GET /api/libraries/${(await params).name}/template] Error:`, error);

    if (error instanceof Error && error.message.startsWith('未知的库名称')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: '生成模板失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
