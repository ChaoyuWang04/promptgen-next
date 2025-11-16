/**
 * View System Templates
 */

import { prisma } from '../src/lib/db/prisma';

async function main() {
  const templates = await prisma.template.findMany({
    where: { type: 'SYSTEM' },
    select: {
      name: true,
      category: true,
      content: true,
    },
  });

  for (const tmpl of templates) {
    console.log('\n' + '='.repeat(80));
    console.log(`Template: ${tmpl.name} (${tmpl.category})`);
    console.log('='.repeat(80));
    console.log(tmpl.content);
  }

  await prisma.$disconnect();
}

main();
