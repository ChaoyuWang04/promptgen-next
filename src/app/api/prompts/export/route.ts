/**
 * Export Prompts API
 * POST /api/prompts/export - Export prompts to JSON/TXT/ZIP
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { JSONExporter } from '@/lib/export/json-exporter';
import { ZIPBuilder } from '@/lib/export/zip-builder';
import { ErrorLogger } from '@/lib/errors/error-logger';

export const dynamic = 'force-dynamic';

const exportSchema = z.object({
  imageIds: z.array(z.string()).optional(),
  format: z.enum(['json', 'txt', 'zip']).default('json'),
  prettyPrint: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageIds, format, prettyPrint } = exportSchema.parse(body);

    // Fetch prompts
    const prompts = await prisma.prompt.findMany({
      where: imageIds ? { imageId: { in: imageIds } } : undefined,
      include: {
        record: {
          select: {
            imageId: true,
            libraryIds: true,
          },
        },
      },
    });

    if (format === 'json') {
      const jsonData = JSONExporter.stringify(prompts, prettyPrint);

      return new NextResponse(jsonData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="prompts_${Date.now()}.json"`,
        },
      });
    } else if (format === 'txt') {
      // Export as plain text
      const textContent = prompts
        .map(
          (p) =>
            `Image ID: ${p.imageId}\nType: ${p.type}\n\nChinese:\n${p.promptCn}\n\nEnglish:\n${p.promptEn}\n\n${'='.repeat(80)}\n`
        )
        .join('\n');

      return new NextResponse(textContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="prompts_${Date.now()}.txt"`,
        },
      });
    } else if (format === 'zip') {
      const builder = new ZIPBuilder();

      // Add JSON file
      builder.addJSONFile('prompts.json', prompts, true);

      // Add separate text files for each prompt
      prompts.forEach((p) => {
        builder.addTextFile(
          `${p.imageId}_${p.type}.txt`,
          `Type: ${p.type}\n\nChinese:\n${p.promptCn}\n\nEnglish:\n${p.promptEn}`
        );
      });

      const zipBuffer = await builder.generateBuffer();

      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${ZIPBuilder.generateFileName('prompts')}"`,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_FORMAT', message: 'Invalid export format' } },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    await ErrorLogger.log(error, {
      method: 'POST',
      url: '/api/prompts/export',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: error instanceof Error ? error.message : 'Export failed',
        },
      },
      { status: 500 }
    );
  }
}
