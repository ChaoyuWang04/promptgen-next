/**
 * Renumber Libraries Script
 *
 * This script renumbers all libraries sequentially (0, 1, 2, 3...)
 * before applying the unique constraint on the order field.
 *
 * Run: npx tsx scripts/renumber-libraries.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function renumberLibraries() {
  try {
    console.log('🔄 Starting library renumbering...\n');

    // Fetch all libraries ordered by their current order value
    const libraries = await prisma.library.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        order: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    console.log(`📊 Found ${libraries.length} libraries:`);
    libraries.forEach((lib) => {
      console.log(`  - ${lib.displayName} (${lib.name}): order = ${lib.order}`);
    });

    // Check for duplicate orders
    const orderCounts = new Map<number, number>();
    libraries.forEach((lib) => {
      orderCounts.set(lib.order, (orderCounts.get(lib.order) || 0) + 1);
    });

    const duplicates = Array.from(orderCounts.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found duplicate order values:`);
      duplicates.forEach(([order, count]) => {
        console.log(`  - order ${order} is used ${count} times`);
      });
    } else {
      console.log('\n✅ No duplicate order values found');
    }

    console.log('\n🔧 Renumbering libraries...');

    // Renumber all libraries sequentially
    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // First, temporarily set all orders to negative values to avoid conflicts
      // This is necessary because of the unique constraint we're about to add
      for (let i = 0; i < libraries.length; i++) {
        await tx.library.update({
          where: { id: libraries[i].id },
          data: { order: -(i + 1) }, // Use negative numbers temporarily
        });
      }

      // Then set the final order values
      for (let i = 0; i < libraries.length; i++) {
        await tx.library.update({
          where: { id: libraries[i].id },
          data: { order: i },
        });
        console.log(`  ✓ ${libraries[i].displayName}: order = ${i}`);
      }
    });

    console.log('\n✅ Library renumbering completed successfully!');

    // Verify the results
    const updatedLibraries = await prisma.library.findMany({
      select: {
        name: true,
        displayName: true,
        order: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    console.log('\n📋 Final library order:');
    updatedLibraries.forEach((lib) => {
      console.log(`  ${lib.order}. ${lib.displayName} (${lib.name})`);
    });
  } catch (error) {
    console.error('❌ Error during renumbering:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
renumberLibraries()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
