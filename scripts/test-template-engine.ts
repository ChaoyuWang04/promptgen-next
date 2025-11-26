/**
 * Template Engine Test Script
 *
 * Tests the template engine with real library data from database.
 */

import { prisma } from '../src/lib/db/prisma';
import { renderTemplate } from '../src/lib/engines/template-engine';
import { type TemplateContext } from '../src/lib/engines/types';

async function main() {
  console.log('🧪 Testing Template Engine...\n');

  try {
    // Load library data
    console.log('📚 Loading library data...');

    const character = await prisma.library.findUnique({
      where: { name: 'character' },
      select: { entries: true },
    });

    const pose = await prisma.library.findUnique({
      where: { name: 'pose' },
      select: { entries: true },
    });

    const scene = await prisma.library.findUnique({
      where: { name: 'scene' },
      select: { entries: true },
    });

    const theme = await prisma.library.findUnique({
      where: { name: 'theme' },
      select: { entries: true },
    });

    const style = await prisma.library.findUnique({
      where: { name: 'style' },
      select: { entries: true },
    });

    if (!character || !pose || !scene || !theme || !style) {
      throw new Error('Failed to load library data');
    }

    console.log('  ✓ Libraries loaded\n');

    // Get template
    console.log('📄 Loading system template...');

    const template = await prisma.template.findUnique({
      where: { name: 'template_default_v1' },
      select: { content: true },
    });

    if (!template) {
      throw new Error('System template not found');
    }

    console.log('  ✓ Template loaded\n');
    console.log('Template content:');
    console.log('─'.repeat(80));
    console.log(template.content);
    console.log('─'.repeat(80) + '\n');

    // Build context
    const charEntries = character.entries as Record<string, any>;
    const poseEntries = pose.entries as Record<string, any>;
    const sceneEntries = scene.entries as Record<string, any>;
    const themeEntries = theme.entries as Record<string, any>;
    const styleEntries = style.entries as Record<string, any>;

    const context: TemplateContext = {
      character: charEntries['char_betty_v1'],
      pose: poseEntries['pose_turn_back_smile_v1'],
      scene: sceneEntries['scene_living_sofa_v1'],
      theme: themeEntries['theme_summer_v1'],
      style: styleEntries['style_retro1950_flat_v1'],
    };

    console.log('🎨 Rendering template with context...');
    console.log(`  Character: ${context.character.name}`);
    console.log(`  Pose: ${context.pose.pose_name}`);
    console.log(`  Scene: ${context.scene.scene}`);
    console.log(`  Theme: ${context.theme.theme}`);
    console.log(`  Style: ${context.style.era_style}\n`);

    // Render template
    const rendered = renderTemplate(template.content, context);

    console.log('✅ Rendered Result:');
    console.log('─'.repeat(80));
    console.log(rendered);
    console.log('─'.repeat(80) + '\n');

    console.log('✅ Template engine test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
