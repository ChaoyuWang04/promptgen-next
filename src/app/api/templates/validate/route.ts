/**
 * POST /api/templates/validate
 *
 * Validates template syntax without rendering.
 * Returns errors and warnings.
 *
 * Replaces Flask: POST /api/templates/validate
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateTemplate } from '@/lib/engines/template-engine';

export const dynamic = 'force-dynamic';

/**
 * Request body schema
 */
interface ValidateTemplateRequest {
  content: string;
}

/**
 * POST handler
 */
export async function POST(request: NextRequest) {
  try {
    const body: ValidateTemplateRequest = await request.json();

    if (!body.content) {
      return NextResponse.json(
        { error: '缺少必需字段: content' },
        { status: 400 }
      );
    }

    const { content } = body;

    // Validate template
    const result = validateTemplate(content);

    return NextResponse.json({
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      error_count: result.errors.length,
      warning_count: result.warnings.length,
    });
  } catch (error) {
    console.error('[POST /api/templates/validate] Error:', error);

    return NextResponse.json(
      {
        error: '模板验证失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
