/**
 * Library Templates Endpoint
 *
 * GET /api/libraries/templates - Get all available library templates
 */

import { NextResponse } from 'next/server';
import { LIBRARY_TEMPLATES } from '@/lib/templates/library-templates';

export const dynamic = 'force-dynamic';

/**
 * GET /api/libraries/templates
 *
 * Returns all available library templates.
 *
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       name: string,
 *       displayName: string,
 *       description: string,
 *       displayField: string,
 *       category: string,
 *       structureType: 'standard' | 'nested_array',
 *       schema: object,
 *       exampleEntry: object
 *     },
 *     ...
 *   ]
 * }
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: LIBRARY_TEMPLATES,
    });
  } catch (error) {
    console.error('[GET /api/libraries/templates] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取模板列表失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
