/**
 * Phase 2 Integration Test Suite
 *
 * Tests all implemented API endpoints to ensure they work correctly.
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    console.log(`❌ ${name}`);
    console.error(`   Error: ${error instanceof Error ? error.message : error}`);
  }
}

async function fetchJSON(url: string, options?: RequestInit): Promise<any> {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function main() {
  console.log('🧪 Phase 2 Integration Test Suite\n');
  console.log('='.repeat(80));
  console.log('');

  // ========================================
  // Library Management APIs
  // ========================================
  console.log('📚 Testing Library Management APIs...\n');

  await test('GET /api/libraries/config', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/libraries/config`);
    if (data.total_count !== 6) throw new Error('Expected 6 libraries');
  });

  await test('GET /api/libraries/character', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/libraries/character`);
    if (!data.char_betty_v1) throw new Error('Betty character not found');
  });

  await test('GET /api/libraries/character/char_betty_v1', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/libraries/character/char_betty_v1`);
    if (data.name !== 'betty') throw new Error('Invalid character data');
  });

  await test('GET /api/libraries/character/template', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/libraries/character/template`);
    if (!data.template) throw new Error('Template not generated');
  });

  // ========================================
  // Prompt Generation APIs
  // ========================================
  console.log('\n🎨 Testing Prompt Generation APIs...\n');

  await test('GET /api/prompts/variables', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/prompts/variables`);
    if (data.variables.length < 30) throw new Error('Not enough variables');
  });

  let generatedImageId: string;

  await test('POST /api/prompts/generate/main', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/prompts/generate/main`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        library_ids: {
          character: 'char_wilma_v1',
          pose: 'pose_sitting_hold_v1',
          scene: 'scene_entrance_door_v1',
          theme: 'theme_halloween_v1',
          style: 'style_simpson_flat_v1',
        },
      }),
    });

    if (!data.success) throw new Error('Generation failed');
    if (!data.image_id) throw new Error('No image_id generated');

    generatedImageId = data.image_id;
    console.log(`   Generated: ${generatedImageId}`);
  });

  await test('POST /api/prompts/generate/diff', async () => {
    if (!generatedImageId) throw new Error('No image_id from previous test');

    const data = await fetchJSON(`${BASE_URL}/api/prompts/generate/diff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_id: generatedImageId,
      }),
    });

    if (!data.success) throw new Error('Diff generation failed');
    if (!data.diff_id) throw new Error('No diff_id generated');
    if (data.new_outfit_state.length !== 3) {
      throw new Error('Expected 3 outfit changes');
    }
    console.log(`   Generated: ${data.diff_id}`);
  });

  // ========================================
  // Template Management APIs
  // ========================================
  console.log('\n📄 Testing Template Management APIs...\n');

  await test('GET /api/templates', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/templates`);
    if (data.total_count !== 2) throw new Error('Expected 2 system templates');
  });

  await test('GET /api/templates/template_default_v1', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/templates/template_default_v1`);
    if (!data.content) throw new Error('Template content missing');
  });

  await test('POST /api/templates/validate (valid)', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/templates/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '角色: {{character.name}}\n情绪: {{pose.emotion | join}}',
      }),
    });

    if (!data.valid) throw new Error('Template should be valid');
  });

  await test('POST /api/templates/validate (invalid)', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/templates/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '角色: {{character.name\n情绪: {{pose.emotion}}',
      }),
    });

    if (data.valid) throw new Error('Template should be invalid (unclosed braces)');
    if (data.errors.length === 0) throw new Error('Expected errors');
  });

  await test('POST /api/templates/render', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/templates/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '角色: {{character.name}}\n情绪: {{pose.emotion | join}}',
        library_ids: {
          character: 'char_betty_v1',
          pose: 'pose_turn_back_smile_v1',
          scene: 'scene_living_sofa_v1',
          theme: 'theme_summer_v1',
          style: 'style_retro1950_flat_v1',
        },
      }),
    });

    if (!data.success) throw new Error('Render failed');
    if (!data.rendered.includes('betty')) throw new Error('Character name not rendered');
  });

  // ========================================
  // Summary
  // ========================================
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Results Summary\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`Total Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`\n  - ${r.name}`);
        console.log(`    Error: ${r.error}`);
      });
  }

  console.log('\n' + '='.repeat(80));

  if (failed > 0) {
    console.log('\n❌ Integration tests FAILED\n');
    process.exit(1);
  } else {
    console.log('\n✅ All integration tests PASSED\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n💥 Test suite failed:', error);
  process.exit(1);
});
