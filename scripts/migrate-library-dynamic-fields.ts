/**
 * Data Migration Script: Populate Library Dynamic Fields
 *
 * This script migrates existing library records to include:
 * - abbreviation: For image ID generation
 * - isRequired: Whether the library is required for prompt generation
 * - metadata.generatorConfig: Field mappings for generator logic
 *
 * Run with: npx tsx scripts/migrate-library-dynamic-fields.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default abbreviations based on library name
const ABBREVIATIONS: Record<string, string> = {
  character: 'char',
  pose: 'pose',
  scene: 'scene',
  theme: 'theme',
  style: 'style',
  decorative_prop: 'prop',
  decorative_props: 'props',
};

// Generator config for libraries that have special field mappings
const GENERATOR_CONFIGS: Record<string, Record<string, string>> = {
  character: {
    outfitField: 'outfit_minor', // Field containing outfit items for color changing
  },
  theme: {
    decorationField: 'micro_props', // Field containing decoration items
    additionalDecorationField: 'decorative_props', // Additional decoration field
  },
  scene: {
    decorationField: 'small_objects', // Scene also has decoration items
  },
};

async function migrateLibraries() {
  console.log('Starting library dynamic fields migration...\n');

  const libraries = await prisma.library.findMany();

  for (const library of libraries) {
    console.log(`Processing library: ${library.name}`);

    // Determine abbreviation
    const abbreviation =
      ABBREVIATIONS[library.name] ||
      library.name.substring(0, 4).toLowerCase();

    // Determine isRequired based on category
    const isRequired = library.category === 'MAIN';

    // Build metadata with generatorConfig
    const currentMetadata = (library.metadata as Record<string, unknown>) || {};
    const generatorConfig = GENERATOR_CONFIGS[library.name] || {};

    const newMetadata = {
      ...currentMetadata,
      ...(Object.keys(generatorConfig).length > 0 && { generatorConfig }),
    };

    // Update the library
    await prisma.library.update({
      where: { id: library.id },
      data: {
        abbreviation,
        isRequired,
        metadata: Object.keys(newMetadata).length > 0 ? newMetadata : undefined,
      },
    });

    console.log(`  - abbreviation: ${abbreviation}`);
    console.log(`  - isRequired: ${isRequired}`);
    if (Object.keys(generatorConfig).length > 0) {
      console.log(`  - generatorConfig: ${JSON.stringify(generatorConfig)}`);
    }
    console.log('');
  }

  console.log('Migration completed successfully!');
}

async function main() {
  try {
    await migrateLibraries();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
