/**
 * Template Libraries API
 * GET /api/templates/[id]/libraries
 *
 * Parse template content and return referenced libraries
 *
 * Uses dynamic library configuration from database via LibraryService.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  extractLibrariesFromTemplate,
  validateTemplateLibraryReferences,
} from '@/lib/utils/template-parser';
import { libraryService } from '@/lib/services';

/**
 * GET /api/templates/[id]/libraries
 *
 * Parse template and return all referenced libraries with metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch template from database
    const template = await prisma.template.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        content: true,
        category: true,
        type: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `模板 ${id} 不存在`,
          },
        },
        { status: 404 }
      );
    }

    // Extract libraries from template content
    const libraryNames = extractLibrariesFromTemplate(template.content);

    // Validate template library references
    const validation = validateTemplateLibraryReferences(
      template.content,
      template.category
    );

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error,
            details: {
              templateId: template.id,
              templateName: template.name,
              templateCategory: template.category,
            },
          },
        },
        { status: 400 }
      );
    }

    // Fetch library metadata for each referenced library
    const librariesWithMetadata = await Promise.all(
      libraryNames.map(async (libName) => {
        // Get library config from LibraryService
        const config = await libraryService.getByName(libName);

        // Get entry count from database
        const library = await prisma.library.findUnique({
          where: { name: libName },
          select: {
            id: true,
            name: true,
            displayName: true,
            entries: true,
            isActive: true,
          },
        });

        if (!library) {
          return {
            name: libName,
            displayName: config?.displayName || libName,
            exists: false,
            entryCount: 0,
            isActive: false,
          };
        }

        const entries = library.entries as Record<string, unknown>;
        const entryCount = Object.keys(entries).length;

        return {
          name: libName,
          displayName: library.displayName,
          exists: true,
          entryCount,
          isActive: library.isActive,
          config: {
            type: config?.isRequired ? 'required' : 'optional',
            displayField: config?.displayField,
            structureType: config?.metadata?.structureType || 'standard',
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        templateId: template.id,
        templateName: template.name,
        templateCategory: template.category,
        templateType: template.type,
        libraries: librariesWithMetadata,
        totalLibraries: libraryNames.length,
      },
    });
  } catch (error) {
    console.error('[API] Error parsing template libraries:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '解析模板库引用时发生错误',
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}
