/**
 * Data Verification Script
 * Verifies Phase 1 database setup completion
 */

import { prisma } from '../src/lib/db/prisma';

async function main() {
  console.log('🔍 Verifying Phase 1 Database Setup...\n');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection: OK\n');

    // Check Libraries
    console.log('📚 Checking Libraries...');
    const libraries = await prisma.library.findMany({
      select: {
        name: true,
        displayName: true,
        entries: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    console.log(`  Total libraries: ${libraries.length}`);
    console.log('\n  Entry counts:');

    let totalEntries = 0;
    for (const lib of libraries) {
      const entries = lib.entries as Record<string, any>;
      const count = Object.keys(entries).length;
      totalEntries += count;
      console.log(`    ${lib.name.padEnd(20)} ${count} entries  (${lib.displayName})`);
    }

    console.log(`  Total entries across all libraries: ${totalEntries}\n`);

    // Check Templates
    console.log('📄 Checking Templates...');
    const templates = await prisma.template.findMany({
      select: {
        name: true,
        type: true,
        category: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    console.log(`  Total templates: ${templates.length}\n`);
    for (const tmpl of templates) {
      console.log(`    ${tmpl.name}`);
      console.log(`      Type: ${tmpl.type}, Category: ${tmpl.category}`);
    }

    // Verification Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Verification Summary');
    console.log('='.repeat(50));

    const expectedLibraries = 6;
    const expectedTemplates = 2;
    const expectedEntries = 14; // 2+3+3+3+2+1

    const checks = [
      {
        name: 'Libraries count',
        expected: expectedLibraries,
        actual: libraries.length,
        pass: libraries.length === expectedLibraries,
      },
      {
        name: 'Total entries',
        expected: expectedEntries,
        actual: totalEntries,
        pass: totalEntries === expectedEntries,
      },
      {
        name: 'Templates count',
        expected: expectedTemplates,
        actual: templates.length,
        pass: templates.length === expectedTemplates,
      },
    ];

    console.log('');
    for (const check of checks) {
      const status = check.pass ? '✅' : '❌';
      console.log(`${status} ${check.name}: ${check.actual}/${check.expected}`);
    }

    const allPassed = checks.every(c => c.pass);

    console.log('\n' + '='.repeat(50));
    if (allPassed) {
      console.log('✅ Phase 1 Database Setup: COMPLETE');
      console.log('   All data verified successfully!');
      console.log('   Ready to proceed to Phase 2.');
    } else {
      console.log('❌ Phase 1 Database Setup: INCOMPLETE');
      console.log('   Some checks failed. Please review above.');
    }
    console.log('='.repeat(50) + '\n');

    // Display Prisma Studio URL
    console.log('💡 Tip: View data in Prisma Studio at http://localhost:5555');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
