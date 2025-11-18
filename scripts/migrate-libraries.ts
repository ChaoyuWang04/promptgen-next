/**
 * Library Data Migration Script
 *
 * Migrates 6 library JSON files from the Flask project to PostgreSQL
 * - character.json
 * - pose.json
 * - scene.json
 * - theme.json
 * - style.json
 * - decorative_props.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { prisma } from '../src/lib/db/prisma';

// Library configuration
const LIBRARIES = [
  {
    name: 'character' as const,
    displayName: '人物',
    jsonFile: 'character.json',
  },
  {
    name: 'pose' as const,
    displayName: '姿态',
    jsonFile: 'pose.json',
  },
  {
    name: 'scene' as const,
    displayName: '场景',
    jsonFile: 'scene.json',
  },
  {
    name: 'theme' as const,
    displayName: '主题',
    jsonFile: 'theme.json',
  },
  {
    name: 'style' as const,
    displayName: '画风',
    jsonFile: 'style.json',
  },
  {
    name: 'decorative_props' as const,
    displayName: '装饰小物',
    jsonFile: 'decorative_props.json',
  },
];

// Path to the data directory (promptgen-next/context/old project/data/)
const DATA_DIR = path.resolve(__dirname, '../context/old project/data');

async function loadLibraryData(fileName: string): Promise<Record<string, any>> {
  const filePath = path.join(DATA_DIR, fileName);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${fileName}:`, error);
    throw error;
  }
}

async function migrateLibrary(
  name: string,
  displayName: string,
  jsonFile: string
): Promise<void> {
  console.log(`\n📚 Migrating ${name} library...`);

  try {
    // Load JSON data
    const entries = await loadLibraryData(jsonFile);
    const entryCount = Object.keys(entries).length;

    console.log(`  ✓ Loaded ${entryCount} entries from ${jsonFile}`);

    // Check if library already exists
    const existing = await prisma.library.findUnique({
      where: { name },
    });

    if (existing) {
      // Update existing library
      await prisma.library.update({
        where: { name },
        data: {
          displayName,
          entries: entries as any,
          updatedAt: new Date(),
        },
      });
      console.log(`  ✓ Updated existing ${name} library`);
    } else {
      // Create new library
      await prisma.library.create({
        data: {
          name,
          displayName,
          entries: entries as any,
        },
      });
      console.log(`  ✓ Created new ${name} library`);
    }

    console.log(`  ✅ ${name} library migration complete`);
  } catch (error) {
    console.error(`  ❌ Error migrating ${name}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting library data migration...');
  console.log(`📂 Source directory: ${DATA_DIR}`);

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✓ Database connection established\n');

    // Migrate all libraries
    for (const library of LIBRARIES) {
      await migrateLibrary(library.name, library.displayName, library.jsonFile);
    }

    console.log('\n✅ All libraries migrated successfully!');

    // Display summary
    const libraryCount = await prisma.library.count();
    console.log(`\n📊 Summary:`);
    console.log(`  Total libraries in database: ${libraryCount}`);

    // Display entry counts
    const libraries = await prisma.library.findMany({
      select: { name: true, entries: true },
    });

    console.log(`\n📈 Entry counts:`);
    for (const lib of libraries) {
      const entries = lib.entries as Record<string, any>;
      const count = Object.keys(entries).length;
      console.log(`  ${lib.name}: ${count} entries`);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
main()
  .then(() => {
    console.log('\n✨ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
