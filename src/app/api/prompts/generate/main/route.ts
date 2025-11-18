/**
 * POST /api/prompts/generate/main
 *
 * Generates a main image prompt from library selections.
 * Creates a generation record in the database.
 *
 * Replaces Flask: POST /api/generate/main
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateMainPrompt } from '@/lib/generators';
import { type LibrarySelection } from '@/lib/engines/types';

export const dynamic = 'force-dynamic';

/**
 * Request body schema
 */
interface GenerateMainRequest {
  library_ids: LibrarySelection;
  template_name?: string;
  save_to_database?: boolean;
}

/**
 * POST handler
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateMainRequest = await request.json();

    // Validate library_ids
    if (!body.library_ids) {
      return NextResponse.json(
        { error: '缺少必需字段: library_ids' },
        { status: 400 }
      );
    }

    const { library_ids, template_name, save_to_database } = body;

    // Validate required libraries
    const requiredLibraries = ['character', 'pose', 'scene', 'theme', 'style'];
    const missingLibraries = requiredLibraries.filter(
      lib => !library_ids[lib as keyof LibrarySelection]
    );

    if (missingLibraries.length > 0) {
      return NextResponse.json(
        {
          error: '缺少必需的库选择',
          missing_libraries: missingLibraries,
        },
        { status: 400 }
      );
    }

    // Generate prompt
    const result = await generateMainPrompt(
      library_ids,
      template_name || 'template_default_v1',
      save_to_database !== false // Default: true
    );

    return NextResponse.json({
      success: true,
      data: {
        image_id: result.image_id,
        prompt_cn: result.prompt_cn,
        prompt_en: result.prompt_en || null,
        library_ids: result.library_ids,
        outfit_minor_state: result.outfit_minor_state,
        used_decorations: result.used_decorations,
        generated_at: result.generated_at,
      },
    });
  } catch (error) {
    console.error('[POST /api/prompts/generate/main] Error:', error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        error: '生成主图Prompt失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
