/**
 * GET /api/libraries/config
 *
 * Returns configuration metadata for all enabled libraries.
 * Now fetches from database instead of hardcoded config.
 * Used by frontend to dynamically generate UI components.
 *
 * Replaces Flask: GET /api/libraries/config
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * Response type for /api/libraries/config
 */
interface LibraryConfigResponse {
  enabled_libraries: Array<{
    name: string;
    display_name: string;
    display_field: string;
    type: string;
    order: number;
    structure_type: string;
    description?: string;
    is_active: boolean;
    entry_count: number;
  }>;
  total_count: number;
}

export async function GET() {
  try {
    // Fetch all libraries from database
    const libraries = await prisma.library.findMany({
      orderBy: { order: 'asc' },
    });

    // Calculate entry count for each library
    const enabledLibraries = libraries.map((lib) => {
      const metadata = lib.metadata as Record<string, unknown> | null;
      const structureType = (metadata?.structureType as string) || 'standard';

      // Count entries based on structure type
      let entryCount = 0;
      if (lib.entries) {
        const entries = lib.entries as Record<string, unknown>;
        if (structureType === 'nested_array' && entries.common_props && Array.isArray(entries.common_props)) {
          entryCount = entries.common_props.length;
        } else {
          entryCount = Object.keys(entries).length;
        }
      }

      return {
        name: lib.name,
        display_name: lib.displayName,
        display_field: lib.displayField,
        type: 'optional', // Default to optional for dynamic libraries
        order: lib.order,
        structure_type: structureType,
        description: lib.description || undefined,
        is_active: lib.isActive,
        entry_count: entryCount,
      };
    });

    const response: LibraryConfigResponse = {
      enabled_libraries: enabledLibraries,
      total_count: libraries.length,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('[GET /api/libraries/config] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load library configuration',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
