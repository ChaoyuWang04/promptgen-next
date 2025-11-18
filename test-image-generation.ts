/**
 * Minimal Image Generation Test
 * Tests the 3-round image generation flow with Gemini API
 * WARNING: Makes real API calls - use sparingly!
 */

// Set environment variables directly for testing
process.env.GEMINI_API_KEY = 'AIzaSyCeDVsm2ojx_tVYaB2aCJgR6k-0qIZZWDU';
process.env.GEMINI_MODEL = 'gemini-2.0-flash-exp';
process.env.IMAGE_PROVIDERS = 'gemini';

import { PrismaClient } from '@prisma/client';
import { ImageGenerator } from './src/lib/generators/image-generator';
import { createProviderManagerFromEnv } from './src/lib/providers';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Starting minimal image generation test...\n');

  try {
    // Step 1: Create a test record with simple prompts
    const testImageId = 'TEST_001_001_001_001_001';

    console.log('📝 Creating test record with prompts...');
    const record = await prisma.record.upsert({
      where: { imageId: testImageId },
      update: {
        promptGenerated: true,
      },
      create: {
        imageId: testImageId,
        libraryIds: {
          character: 'test_char',
          pose: 'test_pose',
          scene: 'test_scene',
          theme: 'test_theme',
          style: 'test_style',
        },
        outfitMinorState: [],
        usedDecorations: { from_theme: [], from_scene: [] },
        providerAttempts: [],
        promptGenerated: true,
        imageGenerated: false,
      },
    });
    console.log(`✓ Record created: ${record.imageId}\n`);

    // Step 2: Create test prompts
    console.log('📝 Creating test prompts...');
    const mainPrompt = await prisma.prompt.create({
      data: {
        recordId: record.id,
        type: 'MAIN',
        promptCn: '一个可爱的卡通角色站在明亮的场景中',
        promptEn: 'A cute cartoon character standing in a bright scene',
      },
    });

    const diffPrompt = await prisma.prompt.create({
      data: {
        recordId: record.id,
        type: 'DIFF',
        promptCn: '添加一顶红色帽子',
        promptEn: 'Add a red hat',
      },
    });
    console.log('✓ Main prompt:', mainPrompt.promptEn);
    console.log('✓ Diff prompt:', diffPrompt.promptEn);
    console.log('');

    // Step 3: Test image generation (ONLY 1 LANGUAGE TO SAVE API CREDITS)
    console.log('🎨 Starting 3-round image generation...');
    console.log('⚠️  Using only 1 language (English) to save API credits\n');

    // Debug: Print environment variables
    console.log('[DEBUG] Environment variables:');
    console.log('  GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 10)}...` : 'NOT SET');
    console.log('  GEMINI_MODEL:', process.env.GEMINI_MODEL || 'NOT SET');
    console.log('  IMAGE_PROVIDERS:', process.env.IMAGE_PROVIDERS || 'NOT SET');
    console.log('');

    const providerManager = createProviderManagerFromEnv();
    const imageGenerator = new ImageGenerator(providerManager);

    const result = await imageGenerator.generateThreeRounds(testImageId, {
      languageIds: [1], // Only English to save credits
      overwrite: true,
    });

    console.log('\n✅ Generation complete!');
    console.log('📊 Results:');
    console.log('  - Image ID:', result.imageId);
    console.log('  - Version:', result.version);
    console.log('  - Provider:', result.provider);
    console.log('  - Total Time:', result.totalTimeMs, 'ms');
    console.log('  - Generated paths:');
    Object.entries(result.paths).forEach(([lang, path]) => {
      console.log(`    - ${lang}: ${path}`);
    });

    // Verify database was updated
    const updatedRecord = await prisma.record.findUnique({
      where: { imageId: testImageId },
      include: { imageVariants: true },
    });
    console.log('\n📊 Database verification:');
    console.log('  - Image generated:', updatedRecord?.imageGenerated);
    console.log('  - Variants count:', updatedRecord?.imageVariants.length);
    console.log('  - Latest version:', updatedRecord?.latestVersion);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
