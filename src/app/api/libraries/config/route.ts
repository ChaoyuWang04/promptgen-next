/**
 * GET /api/libraries/config
 *
 * Returns configuration metadata for all enabled libraries.
 * Used by frontend to dynamically generate UI components.
 *
 * Replaces Flask: GET /api/libraries/config
 */

import { NextResponse } from 'next/server';
import {
  ENABLED_LIBRARIES,
  TOTAL_LIBRARIES,
  type LibraryConfig,
} from '@/lib/config/library-config';

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
  }>;
  total_count: number;
}

export async function GET() {
  try {
    // Transform LibraryConfig[] to API response format
    // (snake_case for backwards compatibility with Flask API)
    const enabledLibraries = ENABLED_LIBRARIES.map((lib: LibraryConfig) => ({
      name: lib.name,
      display_name: lib.displayName,
      display_field: lib.displayField,
      type: lib.type,
      order: lib.order,
      structure_type: lib.structureType,
      ...(lib.description && { description: lib.description }),
    }));

    const response: LibraryConfigResponse = {
      enabled_libraries: enabledLibraries,
      total_count: TOTAL_LIBRARIES,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/libraries/config] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to load library configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
