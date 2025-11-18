/**
 * Database Seed Script
 *
 * Seeds the database with initial data:
 * - System templates (default main and diff templates)
 * - Optional: Sample records for testing
 */

import { prisma } from '../src/lib/db/prisma';
import { LIBRARY_TEMPLATES } from '../src/lib/templates/library-templates';
import * as fs from 'fs';
import * as path from 'path';

// System templates content
const MAIN_TEMPLATE_DEFAULT = `角色: {{character.name}}
外观: {{character.appearance_core}}, {{character.appearance_detail}}
穿着: {{character.outfit_major}}
姿态: {{pose.description}}, {{pose.emotion | join}}
场景: {{scene.location}}, {{scene.description}}
主题: {{theme.description}}
画风: {{style.rendering_style}}, {{style.color_palette | join}}`;

const DIFF_TEMPLATE_DEFAULT = `基于原图，进行以下改动:

颜色修改:
{{outfit_state | join}}

添加装饰元素:
{{new_decorations | join}}

保持其他元素不变。`;

async function seedTemplates() {
  console.log('🌱 Seeding system templates...');

  try {
    // Seed main template
    const mainTemplate = await prisma.template.upsert({
      where: { name: 'template_default_v1' },
      update: {},
      create: {
        name: 'template_default_v1',
        description: 'Official default main image template',
        type: 'SYSTEM',
        category: 'MAIN',
        content: MAIN_TEMPLATE_DEFAULT,
      },
    });

    console.log(`  ✓ Created/updated main template: ${mainTemplate.name}`);

    // Seed diff template
    const diffTemplate = await prisma.template.upsert({
      where: { name: 'diff_template_default_v1' },
      update: {},
      create: {
        name: 'diff_template_default_v1',
        description: 'Official default diff image template',
        type: 'SYSTEM',
        category: 'DIFF',
        content: DIFF_TEMPLATE_DEFAULT,
      },
    });

    console.log(`  ✓ Created/updated diff template: ${diffTemplate.name}`);

    console.log('  ✅ Templates seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding templates:', error);
    throw error;
  }
}

async function seedLibraries() {
  console.log('\n🌱 Seeding libraries...');

  try {
    // Check if we already have libraries
    const existingCount = await prisma.library.count();

    if (existingCount > 0) {
      console.log(`  ℹ️  Database already has ${existingCount} libraries`);
      console.log('  ℹ️  Updating existing libraries with new fields...');
    }

    // Seed libraries from templates
    for (const template of LIBRARY_TEMPLATES) {
      // Try to load data from context/old project/data if exists
      let entries: any = {};
      const dataPath = path.join(process.cwd(), 'context', 'old project', 'data', `${template.name}.json`);

      if (fs.existsSync(dataPath)) {
        try {
          const fileContent = fs.readFileSync(dataPath, 'utf-8');
          entries = JSON.parse(fileContent);
          console.log(`  ✓ Loaded ${template.name} data from file`);
        } catch (error) {
          console.log(`  ⚠️  Could not load ${template.name} data file, using empty entries`);
          entries = template.structureType === 'nested_array' ? template.exampleEntry : {};
        }
      } else {
        entries = template.structureType === 'nested_array' ? template.exampleEntry : {};
      }

      // Upsert library
      const library = await prisma.library.upsert({
        where: { name: template.name },
        update: {
          // Update metadata fields while preserving existing entries
          displayName: template.displayName,
          description: template.description,
          displayField: template.displayField,
          category: template.category,
          schema: template.schema as any,
          schemaVersion: '1.0',
          isActive: true,
          metadata: {
            createdFrom: 'template',
            structureType: template.structureType,
          },
        },
        create: {
          name: template.name,
          displayName: template.displayName,
          description: template.description,
          displayField: template.displayField,
          category: template.category,
          order: LIBRARY_TEMPLATES.indexOf(template),
          entries: entries as any,
          schema: template.schema as any,
          schemaVersion: '1.0',
          isActive: true,
          metadata: {
            createdFrom: 'template',
            structureType: template.structureType,
          },
        },
      });

      console.log(`  ✓ Created/updated library: ${library.displayName} (${library.name})`);
    }

    console.log('  ✅ Libraries seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding libraries:', error);
    throw error;
  }
}

async function seedSampleRecords() {
  console.log('\n🌱 Seeding sample records...');

  try {
    // Check if we already have records
    const existingCount = await prisma.record.count();

    if (existingCount > 0) {
      console.log(`  ℹ️  Database already has ${existingCount} records, skipping sample data`);
      return;
    }

    // Create a sample record (optional)
    const sampleRecord = await prisma.record.create({
      data: {
        imageId: 'sample_demo_test_welcome_modern_0001',
        libraryIds: {
          character: 'char_sample_v1',
          pose: 'pose_sample_v1',
          scene: 'scene_sample_v1',
          theme: 'theme_sample_v1',
          style: 'style_sample_v1',
        },
        outfitMinorState: [
          {
            element: '鞋子',
            current_color: '红色',
          },
        ],
        usedDecorations: {
          from_theme: [],
          from_scene: [],
        },
        providerAttempts: [],
        promptGenerated: false,
        imageGenerated: false,
      },
    });

    console.log(`  ✓ Created sample record: ${sampleRecord.imageId}`);
    console.log('  ✅ Sample records seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding sample records:', error);
    // Don't throw - sample records are optional
  }
}

async function main() {
  console.log('🚀 Starting database seed...\n');

  try {
    // Connect to database
    await prisma.$connect();
    console.log('✓ Database connection established\n');

    // Seed templates
    await seedTemplates();

    // Seed libraries
    await seedLibraries();

    // Seed sample records (optional)
    // await seedSampleRecords();

    console.log('\n✅ Database seed completed successfully!');

    // Display summary
    const templateCount = await prisma.template.count();
    const libraryCount = await prisma.library.count();
    const recordCount = await prisma.record.count();

    console.log(`\n📊 Summary:`);
    console.log(`  Templates: ${templateCount}`);
    console.log(`  Libraries: ${libraryCount}`);
    console.log(`  Records: ${recordCount}`);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed
main()
  .then(() => {
    console.log('\n✨ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed script failed:', error);
    process.exit(1);
  });
