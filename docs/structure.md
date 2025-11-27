# Project Structure

## Overview

Next.js 16 app with App Router, organized by feature and responsibility.

---

## Directory Tree

```
promptgen-next/
├── prisma/                    # Database (Prisma)
│   ├── schema.prisma          # Schema (source of truth)
│   └── migrations/            # Prisma migrations
│
├── atlas/                     # Atlas migrations (SQL)
│   └── migrations/
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (dashboard)/       # Dashboard route group
│   │   │   ├── page.tsx       # Dashboard home (/)
│   │   │   ├── libraries/     # Library management
│   │   │   ├── prompts/       # Prompt generation
│   │   │   ├── combinations/  # Combination management
│   │   │   ├── templates/     # Template editor
│   │   │   ├── status/        # System status
│   │   │   ├── settings/      # Settings (placeholder UI)
│   │   │   ├── images/        # Present but empty
│   │   │   └── layout.tsx     # Dashboard layout
│   │   ├── api/               # API routes (45 endpoints)
│   │   │   ├── libraries/     # Library CRUD/import/export/stats/reorder/templates
│   │   │   ├── templates/     # Template CRUD/render/validate/variables
│   │   │   ├── prompts/       # Prompt generation/export
│   │   │   ├── combinations/  # Combination CRUD/strategy/batch/language
│   │   │   ├── images/        # Image generation, batches, stats, stitch
│   │   │   ├── records/       # Record listing + bulk delete
│   │   │   ├── sync/          # Sync check/repair/history
│   │   │   ├── providers/     # Provider stats
│   │   │   ├── health/        # Health check
│   │   │   ├── queue/         # Queue stats
│   │   │   └── errors/        # Error logs and stats
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   │
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui (30 components)
│   │   ├── shared/            # Shared components
│   │   ├── library/           # Library feature components
│   │   ├── combinations/      # Combination components
│   │   ├── monitoring/        # Status components
│   │   ├── errors/            # Error components
│   │   └── sync/              # Sync components
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-libraries.ts
│   │   ├── use-prompts.ts
│   │   ├── use-combinations.ts
│   │   ├── use-templates.ts
│   │   ├── use-images.ts
│   │   ├── use-dashboard.ts
│   │   ├── use-batch-progress.ts
│   │   └── use-debounce.ts
│   │
│   ├── lib/                   # Business logic
│   │   ├── db/                # Prisma client
│   │   ├── engines/           # Template engines
│   │   ├── generators/        # Prompt/image generators
│   │   ├── providers/         # AI providers
│   │   ├── queue/             # BullMQ queue
│   │   ├── stitcher/          # Image stitching
│   │   ├── sync/              # Sync management
│   │   ├── api/               # Frontend API client & query config
│   │   └── utils/             # Utilities
│   │
│   ├── schemas/               # Zod validation schemas
│   │   ├── api.schema.ts
│   │   ├── prompt.schema.ts
│   │   ├── template.schema.ts
│   │   ├── record.schema.ts
│   │   └── combination.schema.ts
│   │
│   ├── types/                 # TypeScript types
│   ├── config/                # Configuration
│   └── providers/             # React providers
│
├── tests/                     # Test suite
│   ├── unit/                  # Unit tests (Vitest)
│   ├── integration/           # Integration tests
│   └── e2e/                   # E2E tests (Playwright)
│
├── public/                    # Static assets
│   └── images/                # Generated images
│
├── docs/                      # Documentation
│   ├── api.md                 # API reference
│   ├── backend.md             # Backend architecture
│   ├── database.md            # Database schema
│   ├── frontend.md            # Frontend architecture
│   ├── structure.md           # This file
│   ├── trd.md                 # Technical reference
│   └── prd.md                 # Product requirements
│
├── scripts/                   # Utility scripts
├── dev/                       # Dev helpers
├── temptools/                 # Temporary tooling
├── context/                   # Design context files
│
├── .env.example               # Environment template
├── next.config.ts             # Next.js config
├── tailwind.config.ts         # Tailwind config
├── tsconfig.json              # TypeScript config
├── vitest.config.ts           # Vitest config
├── playwright.config.ts       # Playwright config
├── components.json            # shadcn/ui config
├── justfile                   # Task runner commands
├── docker-compose.yml         # Docker services
├── package.json               # Dependencies
├── CLAUDE.md                  # AI assistant instructions
└── README.md                  # Project readme
```

---

## Key Directories

### `src/app/` - Next.js App Router

- `(dashboard)/` - Route group with shared layout
- `api/` - RESTful API endpoints
- Server Components by default, Client Components with 'use client'

### `src/lib/` - Business Logic

Framework-agnostic code:
- `engines/` - Template parsing and rendering
- `generators/` - Prompt and image generation
- `providers/` - AI provider integration
- `queue/` - Async job processing
- `sync/` - Data integrity checks

### `src/components/` - React Components

- `ui/` - shadcn/ui primitives (don't modify directly)
- `shared/` - Layout components (Sidebar, Header)
- Feature folders - Domain-specific components

### `src/schemas/` - Validation

Zod schemas for API request/response validation

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files/Folders | kebab-case | `use-libraries.ts` |
| Components | PascalCase | `LibraryTable.tsx` |
| Functions | camelCase | `generateMainPrompt` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Types | PascalCase | `TemplateContext` |

---

## Import Aliases

| Alias | Path |
|-------|------|
| `@/` | `src/` |
| `@/components` | `src/components` |
| `@/lib` | `src/lib` |
| `@/hooks` | `src/hooks` |
| `@/schemas` | `src/schemas` |
| `@/types` | `src/types` |
