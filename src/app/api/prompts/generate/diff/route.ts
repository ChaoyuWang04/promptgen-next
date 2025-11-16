/**
 * POST /api/prompts/generate/diff
 *
 * Generates a diff (comparison) image prompt from an existing main image.
 * Implements 3 outfit color changes + 8-9 decoration additions.
 *
 * Replaces Flask: POST /api/generate/diff
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDiffPrompt } from '@/lib/generators';

export const dynamic = 'force-dynamic';

/**
 * Request body schema
 */
interface GenerateDiffRequest {
  image_id: string;
  template_name?: string;
  save_to_database?: boolean;
}

/**
 * POST handler
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateDiffRequest = await request.json();

    // Validate image_id
    if (!body.image_id) {
      return NextResponse.json(
        { error: '缺少必需字段: image_id' },
        { status: 400 }
      );
    }

    const { image_id, template_name, save_to_database } = body;

    // Generate diff prompt
    const result = await generateDiffPrompt(
      image_id,
      template_name || 'diff_template_default_v1',
      save_to_database !== false // Default: true
    );

    return NextResponse.json({
      success: true,
      diff_id: result.diff_id,
      image_id: result.image_id,
      prompt_cn: result.prompt_cn,
      prompt_en: result.prompt_en || null,
      new_outfit_state: result.new_outfit_state,
      new_decorations: result.new_decorations,
      generated_at: result.generated_at,
    });
  } catch (error) {
    console.error('[POST /api/prompts/generate/diff] Error:', error);

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

      if (error.message.includes('not generated')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: '生成对比图Prompt失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
