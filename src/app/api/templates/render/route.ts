/**
 * POST /api/templates/render
 *
 * Renders a template with provided library selections.
 * Used for previewing templates before saving.
 *
 * Replaces Flask: POST /api/templates/preview
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { renderTemplate } from '@/lib/engines/template-engine';
import { type TemplateContext, type LibrarySelection } from '@/lib/engines/types';

export const dynamic = 'force-dynamic';

/**
 * Request body schema
 */
interface RenderTemplateRequest {
  content: string;
  library_ids: LibrarySelection;
}

/**
 * Load library entry by ID
 */
async function loadLibraryEntry(libraryName: string, entryId: string): Promise<any> {
  const library = await prisma.library.findUnique({
    where: { name: libraryName },
    select: { entries: true },
  });

  if (!library) {
    throw new Error(`Library not found: ${libraryName}`);
  }

  const entries = library.entries as Record<string, any>;
  const entry = entries[entryId];

  if (!entry) {
    throw new Error(`Entry not found in ${libraryName}: ${entryId}`);
  }

  return entry;
}

/**
 * Build template context from library selections
 */
async function buildContext(selections: LibrarySelection): Promise<TemplateContext> {
  const promises = [
    loadLibraryEntry('character', selections.character),
    loadLibraryEntry('pose', selections.pose),
    loadLibraryEntry('scene', selections.scene),
    loadLibraryEntry('theme', selections.theme),
    loadLibraryEntry('style', selections.style),
  ];

  // Add decorative_props if provided (for DIFF templates)
  if ('decorative_props' in selections && selections.decorative_props) {
    promises.push(loadLibraryEntry('decorative_props', selections.decorative_props));
  }

  const [character, pose, scene, theme, style, decorative_props] = await Promise.all(promises);

  const context: TemplateContext = {
    character,
    pose,
    scene,
    theme,
    style,
  };

  // Add decorative_props to context if it was loaded
  if (decorative_props) {
    (context as any).decorative_props = decorative_props;
  }

  return context;
}

/**
 * POST handler
 */
export async function POST(request: NextRequest) {
  try {
    const body: RenderTemplateRequest = await request.json();

    // Validate required fields
    if (!body.content) {
      return NextResponse.json(
        { error: '缺少必需字段: content' },
        { status: 400 }
      );
    }

    if (!body.library_ids) {
      return NextResponse.json(
        { error: '缺少必需字段: library_ids' },
        { status: 400 }
      );
    }

    const { content, library_ids } = body;

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

    // Build context
    const context = await buildContext(library_ids);

    // Render template
    const rendered = renderTemplate(content, context, {
      strict: false,
    });

    return NextResponse.json({
      success: true,
      data: {
        rendered,
        library_ids,
      },
    });
  } catch (error) {
    console.error('[POST /api/templates/render] Error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: '渲染模板失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
