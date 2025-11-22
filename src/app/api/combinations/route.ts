/**
 * Combination API Routes
 * GET /api/combinations - List combinations with filtering and pagination
 * POST /api/combinations - Create a single combination
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  CombinationFilterSchema,
  CreateCombinationSchema,
} from '@/schemas/combination.schema';
import { generateCombinationKey } from '@/lib/utils/file-manager';

/**
 * GET /api/combinations
 * List combinations with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse library filters
    const libraryFilters: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith('library_')) {
        const libraryName = key.replace('library_', '');
        libraryFilters[libraryName] = value;
      }
    }

    // Parse query parameters
    const filterData = {
      templateId: searchParams.get('templateId') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
      libraryFilters: Object.keys(libraryFilters).length > 0 ? libraryFilters : undefined,
    };

    // Validate filters
    const validationResult = CombinationFilterSchema.safeParse(filterData);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid filter parameters',
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { templateId, libraryFilters: libFilters, search, page, pageSize } = validationResult.data;

    // Build where clause
    const where: any = {};

    if (templateId) {
      where.templateId = templateId;
    }

    if (search) {
      where.combinationKey = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Library filters - search within JSON
    if (libFilters && Object.keys(libFilters).length > 0) {
      where.AND = Object.entries(libFilters).map(([libraryName, entryId]) => ({
        libraryIds: {
          path: [libraryName],
          equals: entryId,
        },
      }));
    }

    // Get total count
    const total = await prisma.combination.count({ where });

    // Get combinations with record counts
    const combinations = await prisma.combination.findMany({
      where,
      include: {
        _count: {
          select: { records: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Calculate total pages
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: {
        combinations,
        total,
        page,
        pageSize,
        totalPages,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/combinations error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch combinations',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/combinations
 * Create a single combination
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = CreateCombinationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid combination data',
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { libraryIds, templateId, strategyConfig } = validationResult.data;

    // Generate combination key if not provided
    let combinationKey = validationResult.data.combinationKey;
    if (!combinationKey) {
      // Fetch library entries to get entry names for the combination key
      const libraryNamesArray = Object.keys(libraryIds);
      const libraries = await prisma.library.findMany({
        where: { name: { in: libraryNamesArray } },
        select: { name: true, entries: true },
      });

      // Build libraryNames map from entries
      const libraryNames: Record<string, string> = {};
      for (const library of libraries) {
        const entryId = libraryIds[library.name];
        const entries = library.entries as Record<string, any>;
        const entry = entries[entryId];
        if (entry?.name) {
          libraryNames[library.name] = entry.name;
        }
      }

      combinationKey = generateCombinationKey(libraryIds, { libraryNames });
    }

    // Check if combination already exists
    const existing = await prisma.combination.findUnique({
      where: { combinationKey },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_ERROR',
            message: `Combination already exists: ${combinationKey}`,
          },
        },
        { status: 409 }
      );
    }

    // Create combination
    const combination = await prisma.combination.create({
      data: {
        combinationKey,
        libraryIds,
        templateId,
        strategyConfig: strategyConfig ?? undefined,
      },
      include: {
        _count: {
          select: { records: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: combination,
      message: `Combination created: ${combinationKey}`,
    });
  } catch (error) {
    console.error('[API] POST /api/combinations error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create combination',
        },
      },
      { status: 500 }
    );
  }
}
