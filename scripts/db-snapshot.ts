/**
 * Database Snapshot Export Script
 *
 * Exports all PostgreSQL tables to JSON files for Claude to read.
 * Usage:
 *   just db-snapshot              # Export all tables
 *   just db-snapshot-tables "Library,Template"  # Export specific tables
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Output directory
const OUTPUT_DIR = path.join(process.cwd(), 'context', 'db-snapshot')

// All available tables
const ALL_TABLES = [
  'Library',
  'Template',
  'Combination',
  'Record',
  'Prompt',
  'ImageVariant',
  'ImageBatch',
  'ErrorLog',
] as const

type TableName = (typeof ALL_TABLES)[number]

interface TableStats {
  name: string
  count: number
  lastUpdated: string | null
}

async function getTableData(tableName: TableName): Promise<{
  data: unknown[]
  stats: TableStats
}> {
  let data: unknown[] = []
  let lastUpdated: Date | null = null

  switch (tableName) {
    case 'Library':
      data = await prisma.library.findMany({ orderBy: { order: 'asc' } })
      const lastLib = await prisma.library.findFirst({
        orderBy: { updatedAt: 'desc' },
      })
      lastUpdated = lastLib?.updatedAt ?? null
      break

    case 'Template':
      data = await prisma.template.findMany({
        orderBy: [{ type: 'asc' }, { category: 'asc' }],
      })
      const lastTpl = await prisma.template.findFirst({
        orderBy: { updatedAt: 'desc' },
      })
      lastUpdated = lastTpl?.updatedAt ?? null
      break

    case 'Combination':
      data = await prisma.combination.findMany({
        include: {
          mainTemplate: { select: { id: true, name: true } },
          diffTemplate: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      const lastCombo = await prisma.combination.findFirst({
        orderBy: { updatedAt: 'desc' },
      })
      lastUpdated = lastCombo?.updatedAt ?? null
      break

    case 'Record':
      data = await prisma.record.findMany({
        include: {
          combination: { select: { id: true, combinationKey: true } },
          _count: { select: { prompts: true, variants: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      const lastRec = await prisma.record.findFirst({
        orderBy: { updatedAt: 'desc' },
      })
      lastUpdated = lastRec?.updatedAt ?? null
      break

    case 'Prompt':
      data = await prisma.prompt.findMany({
        include: {
          record: { select: { id: true, imageId: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      const lastPrompt = await prisma.prompt.findFirst({
        orderBy: { updatedAt: 'desc' },
      })
      lastUpdated = lastPrompt?.updatedAt ?? null
      break

    case 'ImageVariant':
      data = await prisma.imageVariant.findMany({
        include: {
          record: { select: { id: true, imageId: true } },
        },
        orderBy: { generatedAt: 'desc' },
      })
      const lastVariant = await prisma.imageVariant.findFirst({
        orderBy: { generatedAt: 'desc' },
      })
      lastUpdated = lastVariant?.generatedAt ?? null
      break

    case 'ImageBatch':
      data = await prisma.imageBatch.findMany({
        orderBy: { createdAt: 'desc' },
      })
      const lastBatch = await prisma.imageBatch.findFirst({
        orderBy: { updatedAt: 'desc' },
      })
      lastUpdated = lastBatch?.updatedAt ?? null
      break

    case 'ErrorLog':
      data = await prisma.errorLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit error logs to recent 100
      })
      const lastError = await prisma.errorLog.findFirst({
        orderBy: { createdAt: 'desc' },
      })
      lastUpdated = lastError?.createdAt ?? null
      break
  }

  return {
    data,
    stats: {
      name: tableName,
      count: data.length,
      lastUpdated: lastUpdated?.toISOString() ?? null,
    },
  }
}

function tableNameToFileName(tableName: TableName): string {
  // Convert PascalCase to kebab-case
  return tableName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .concat('.json')
}

async function generateSummary(stats: TableStats[]): Promise<string> {
  const now = new Date().toISOString()
  const totalRecords = stats.reduce((sum, s) => sum + s.count, 0)

  let md = `# Database Snapshot\n\n`
  md += `**Exported at:** ${now}\n\n`
  md += `**Total records:** ${totalRecords}\n\n`

  md += `## Table Statistics\n\n`
  md += `| Table | Records | Last Updated |\n`
  md += `|-------|---------|-------------|\n`

  for (const s of stats) {
    const lastUpdated = s.lastUpdated
      ? new Date(s.lastUpdated).toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
        })
      : '-'
    md += `| ${s.name} | ${s.count} | ${lastUpdated} |\n`
  }

  md += `\n## Quick Access\n\n`
  md += `| File | Description |\n`
  md += `|------|-------------|\n`
  md += `| \`libraries.json\` | Library configurations (character, pose, scene, etc.) |\n`
  md += `| \`templates.json\` | System and user templates |\n`
  md += `| \`combinations.json\` | Element combinations with template assignments |\n`
  md += `| \`records.json\` | Generation records with prompt/image status |\n`
  md += `| \`prompts.json\` | Generated prompts (CN/EN) |\n`
  md += `| \`image-variants.json\` | Image version tracking |\n`
  md += `| \`image-batches.json\` | Batch generation tasks |\n`
  md += `| \`error-logs.json\` | Recent error logs (max 100) |\n`

  md += `\n## Usage\n\n`
  md += `\`\`\`bash\n`
  md += `# Export database snapshot\n`
  md += `just db-snapshot\n`
  md += `\n`
  md += `# Then ask Claude to read:\n`
  md += `# "Please read context/db-snapshot/_summary.md"\n`
  md += `\`\`\`\n`

  return md
}

async function main() {
  console.log('Database Snapshot Export')
  console.log('========================\n')

  // Parse arguments
  const args = process.argv.slice(2)
  let tablesToExport: TableName[] = [...ALL_TABLES]

  const tablesArg = args.find((a) => a.startsWith('--tables='))
  if (tablesArg) {
    const tableNames = tablesArg.replace('--tables=', '').split(',')
    tablesToExport = tableNames.filter((t) =>
      ALL_TABLES.includes(t as TableName)
    ) as TableName[]

    if (tablesToExport.length === 0) {
      console.error('Error: No valid table names provided')
      console.error(`Valid tables: ${ALL_TABLES.join(', ')}`)
      process.exit(1)
    }
  }

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    console.log(`Created directory: ${OUTPUT_DIR}`)
  }

  // Export each table
  const allStats: TableStats[] = []

  for (const tableName of tablesToExport) {
    process.stdout.write(`Exporting ${tableName}... `)

    try {
      const { data, stats } = await getTableData(tableName)
      allStats.push(stats)

      const fileName = tableNameToFileName(tableName)
      const filePath = path.join(OUTPUT_DIR, fileName)

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`${stats.count} records`)
    } catch (error) {
      console.error(`Error: ${error}`)
    }
  }

  // Generate summary
  console.log('\nGenerating summary...')
  const summary = await generateSummary(allStats)
  const summaryPath = path.join(OUTPUT_DIR, '_summary.md')
  fs.writeFileSync(summaryPath, summary, 'utf-8')

  console.log(`\nSnapshot exported to: ${OUTPUT_DIR}`)
  console.log('Files:')
  for (const tableName of tablesToExport) {
    console.log(`  - ${tableNameToFileName(tableName)}`)
  }
  console.log('  - _summary.md')
}

main()
  .catch((e) => {
    console.error('Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
