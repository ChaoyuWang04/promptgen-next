The most important thing that u need to keep in your mind:
**Remember**: Always think ultra hard and use proper mcp tools and sub-agents when needed. For requirements, always think proactively first and always articulate the reasoning process step by step—identify which parts of the existing system this new change will affect. For implementation, always analyze how we can ensure the new feature implementation integrates perfectly with the existing system and ensure the new system is robust and complete. Meanwhile, please ask me questions at any time to ensure our expectations for the system are aligned. We not only need to implement this new feature but also ensure its interaction with other system components is perfect. After implementation, please update todo.md in the root directory.

## 🎯 Core Directives

When working here:
1. **Follow instructions literally** - don't assume or improvise unless explicitly told
2. **Ask for clarification** when requirements are ambiguous
3. **Report what you're doing** before executing complex operations

## 📍 Workspace Routing System

### How Routing Works
```
User Input → Analyze Requirements → Search & Assess Current State → Create Implementation Plan → Execute in Target Workspace
```

### Routing Workflow

**CRITICAL**: This is NOT keyword-based routing. You must analyze and plan before acting.

#### Phase 1: Requirement Analysis
When receiving any task, FIRST:
1. **Identify the core requirement** - What does the user actually want to achieve?
2. **Determine scope** - Which parts of the codebase will be affected?
3. **List success criteria** - How will we know the task is complete?

#### Phase 2: Current State Assessment
Before any implementation:
1. **Create search plan** - List all files/directories that might be relevant
2. **Execute search and read files**
3. **Document current implementation**
   - What already exists?
   - What patterns are being used?
   - What can be reused?

#### Phase 3: Implementation Planning
Based on assessment, create an execution plan and then confirm with me:
1. **Identify target workspace(s)** - Where will changes be made?
2. **Load relevant CLAUDE.md files** - Get workspace-specific rules
3. **Create task list** with specific order and a todo.md file in the root

#### Phase 4: Execution
Only NOW do you start implementation:
1. **Announce plan to user** - "Based on analysis, I'll need to modify X files..."
2. **Load workspace CLAUDE.md** - `[workspace]/CLAUDE.md`
3. **Execute plan step by step** - Follow workspace-specific instructions
4. **Validate each step** - Run tests, check for errors

### Workspace Reference Table

**Note**: These are NOT trigger keywords. They're reference categories for Phase 3 planning.

| Workspace | Common Indicators | Location | Purpose |
|-----------|------------------|----------|---------|
| **UI Layer** | Pages, React components, shadcn/ui, styling, user interactions | `src/app/(dashboard)/`, `src/components/` | 7 main pages, 28 React components |
| **API Layer** | RESTful endpoints, request validation, route handlers | `src/app/api/` | 18 API endpoints (libraries, prompts, templates, images, sync, health) |
| **Business Logic** | Template Engine, AI Providers, generators, sync management | `src/lib/` | Core logic: engines, providers, generators, sync, stitcher, utils |
| **Database** | Prisma schema, migrations, seed data, database queries | `prisma/` | 7 models (Library, Record, Prompt, ImageVariant, Template, ImageBatch), 4 enums |
| **Validation** | Zod schemas for API requests/responses, data validation | `src/schemas/` | 5 schema files (library, prompt, image, template, api) |
| **Testing** | Unit tests, integration tests, E2E tests | `tests/` | Unit (engines, generators), Integration (API), E2E (Playwright) |
| **Documentation** | Architecture docs, TODO tracking, API mapping | `docs/` | REFACTOR.md, REFRACTOR_TODO.md, API_MAPPING.md, DATABASE_SCHEMA.md |

### Technology Stack

- **Framework**: Next.js 16.0.3 with App Router + Turbopack
- **Language**: TypeScript 5.6.3 (strict mode enabled)
- **Runtime**: React 19.2.0 (Server Components + Client Components)
- **Database**: PostgreSQL 16-alpine (Docker) + Prisma ORM 6.0.0
- **UI Library**: shadcn/ui (22 components installed) built on Radix UI
- **Styling**: Tailwind CSS 3.4.15 with CSS variables theming
- **State Management**: React Query (TanStack Query) for server state caching
- **Validation**: Zod 3.23+ for runtime type validation
- **Image Processing**: sharp 0.33+ for image stitching and manipulation
- **AI Providers**: Google Gemini & ByteDance (REST API wrappers)
- **Testing**:
  - Vitest 2.1.6 for unit tests
  - Playwright 1.48.2 for E2E tests
  - Integration tests for API endpoints
- **Code Quality**: ESLint 9 (flat config) + Prettier 3.3
- **Development**: Turbopack for fast HMR (374ms startup time)

### Project Structure

```
promptgen-next/
├── prisma/
│   ├── schema.prisma              # 7 models, 4 enums (170 LOC)
│   ├── migrations/                # Database migrations
│   └── seed.ts                    # Seed data (6 libraries, 14 entries, 2 system templates)
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (dashboard)/          # Dashboard route group (shared layout)
│   │   │   ├── page.tsx          # Dashboard home
│   │   │   ├── libraries/        # Library management (list, create, edit, delete)
│   │   │   ├── prompts/          # Prompt generation (main, diff, batch)
│   │   │   ├── images/           # Image management (batch generation, versions)
│   │   │   ├── templates/        # Template editor (Monaco integration)
│   │   │   ├── status/           # System status & health checks
│   │   │   └── settings/         # System settings
│   │   ├── api/                  # API Routes (18 endpoints)
│   │   │   ├── libraries/        # 6 endpoints (list/get/create/update/delete/config)
│   │   │   ├── prompts/
│   │   │   │   ├── generate-main/    # Main prompt generation
│   │   │   │   ├── generate-diff/    # Diff prompt generation
│   │   │   │   └── batch/            # Batch generation
│   │   │   ├── templates/        # Template CRUD + validation
│   │   │   ├── images/           # Image generation & stitching
│   │   │   ├── sync/             # Sync management (check, repair)
│   │   │   ├── providers/        # Provider health & stats
│   │   │   └── health/           # System health check
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles (Tailwind)
│   │
│   ├── components/               # React components (28 total)
│   │   ├── ui/                  # shadcn/ui components (22 installed)
│   │   │   ├── button.tsx, card.tsx, dialog.tsx, form.tsx, input.tsx
│   │   │   ├── select.tsx, table.tsx, tabs.tsx, toast.tsx, etc.
│   │   ├── library/             # Library management components
│   │   │   ├── LibraryTable.tsx, LibraryForm.tsx, LibraryFilter.tsx
│   │   ├── prompt/              # Prompt generation components
│   │   │   ├── PromptCard.tsx, BatchGenerationDialog.tsx
│   │   ├── template/            # Template editor components
│   │   │   └── TemplateEditor.tsx (Monaco integration)
│   │   └── shared/              # Shared components
│   │       ├── LoadingSpinner.tsx, ErrorMessage.tsx, ConfirmDialog.tsx
│   │
│   ├── lib/                      # Core business logic (~4,526 LOC)
│   │   ├── db/                  # Database client
│   │   │   └── prisma.ts        # Prisma singleton
│   │   ├── engines/             # Template engines
│   │   │   ├── template-engine.ts        # Main template (7 modules, 39 variables)
│   │   │   ├── diff-template-engine.ts   # Diff template (45 variables, 7 namespaces)
│   │   │   ├── parser.ts                 # Template parser ({{}} syntax)
│   │   │   └── filters.ts                # Filters (join, join:)
│   │   ├── providers/           # AI Providers (Phase 4 - pending)
│   │   │   ├── base.ts                   # Provider interface
│   │   │   ├── gemini.ts                 # Gemini Provider
│   │   │   ├── bytedance.ts              # ByteDance Provider
│   │   │   └── provider-manager.ts       # Fallback manager
│   │   ├── generators/          # Generators (Phase 4 - pending)
│   │   │   ├── prompt-generator.ts       # Main prompt generation
│   │   │   ├── diff-prompt-generator.ts  # Diff prompt generation
│   │   │   ├── image-generator.ts        # 3-round image generation
│   │   │   ├── combo-manager.ts          # Combination enumeration
│   │   │   └── batch-generator.ts        # Batch coordination
│   │   ├── sync/                # Sync management (Phase 5 - pending)
│   │   │   └── sync-manager.ts           # 8 checkers + auto repair
│   │   ├── stitcher/            # Image stitching (Phase 4 - pending)
│   │   │   ├── image-stitcher.ts         # sharp-based stitching
│   │   │   ├── text-overlay.ts           # Multi-language text
│   │   │   └── languages.ts              # 7 language configs
│   │   └── utils/               # Utility functions
│   │       ├── id-generator.ts           # Image ID generation/parsing
│   │       ├── file-manager.ts           # File operations
│   │       ├── cache.ts                  # LRU cache
│   │       ├── errors.ts                 # Custom error classes
│   │       └── logger.ts                 # Logging utilities
│   │
│   ├── schemas/                  # Zod validation (~500 LOC)
│   │   ├── library.schema.ts             # Library schemas
│   │   ├── prompt.schema.ts              # Prompt schemas
│   │   ├── image.schema.ts               # Image schemas
│   │   ├── template.schema.ts            # Template schemas
│   │   └── api.schema.ts                 # API request/response schemas
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── library.types.ts, prompt.types.ts, image.types.ts
│   │   ├── template.types.ts, provider.types.ts, api.types.ts
│   │
│   ├── config/                   # Configuration files
│   │   ├── library-config.ts             # Library metadata (6 libraries)
│   │   ├── languages.ts                  # 7 language configs
│   │   └── constants.ts                  # Global constants
│   │
│   └── middleware.ts             # Next.js middleware (optional)
│
├── tests/                        # Test suite
│   ├── unit/                    # Unit tests
│   │   ├── engines/             # Template engine tests
│   │   ├── generators/          # Generator tests
│   │   └── utils/               # Utility tests
│   ├── integration/             # Integration tests (12 passing)
│   │   └── api/                 # API endpoint tests
│   └── e2e/                     # E2E tests (Playwright)
│       ├── library-management.spec.ts
│       ├── prompt-generation.spec.ts
│       └── image-generation.spec.ts
│
├── docs/                         # Documentation
│   ├── REFACTOR.md              # Full architecture design (2000+ lines)
│   ├── REFRACTOR_TODO.md        # Task tracking checklist
│   ├── DATABASE_SCHEMA.md       # Prisma schema details
│   ├── API_MAPPING.md           # Flask → Next.js API mapping
│   └── LEGACY_FLASK_REFERENCE.md # Flask system reference
│
├── public/
│   ├── images/                  # Generated images (organized by imageId)
│   └── favicon.svg              # Favicon
│
├── scripts/                      # Utility scripts
│   ├── migrate-libraries.ts     # Migrate 6 libraries from JSON
│   └── seed-database.ts         # Database seeding
│
├── .env.example                  # Environment variables template
├── next.config.ts                # Next.js config (remotePatterns for images)
├── tsconfig.json                 # TypeScript config (strict mode)
├── tailwind.config.ts            # Tailwind CSS config
├── components.json               # shadcn/ui config
├── vitest.config.ts              # Vitest config
├── playwright.config.ts          # Playwright config
├── package.json                  # Dependencies
└── README.md                     # Project README
```

### Key Architecture Patterns

**Three-Layer Architecture**:
- **Frontend Layer** (`src/app/`, `src/components/`): React 19 Server Components by default, Client Components only for interactivity
- **API Layer** (`src/app/api/`): 18 RESTful endpoints with Zod validation, unified success/error responses
- **Data Layer** (`src/lib/db/`): Prisma ORM with 7 models, connection pooling, transaction support

**Template Engine System**:
- **Syntax**: Supports `{{@module:character}}` (predefined modules) and `{{library.field}}` (direct field access)
- **7 Modules**: character, pose, scene, theme, lighting, style, composition
- **Variables**: 39 variables for main templates, 45 variables for diff templates (7 namespaces)
- **Filters**: `{{field | join}}`, `{{field | join: ', '}}` for array formatting
- **Diff Templates**: 7 namespaces (main, outfit_state, new_outfit_state, color_changes, decorations, new_decorations, all_decorations)

**AI Provider Management**:
- **Provider Interface**: IImageProvider with generate() and healthCheck() methods
- **Fallback Chain**: ProviderManager with configurable fallback (Gemini → ByteDance)
- **Attempt Tracking**: Record provider attempts in database for analytics
- **Health Monitoring**: Periodic health checks with automatic provider switching

**3-Round Image Generation Flow**:
1. **Round 1**: Generate main image using main prompt (English)
2. **Round 2**: Generate diff image using diff prompt + main image as context (same provider required)
3. **Round 3**: Stitch final images with multi-language text overlay (7 languages: en, fr, ja, ko, de, es, zh)

**Data Model Design**:
- **Library**: 6 types (character, pose, scene, theme, style, decorative_props) with JSON entries
- **Record**: Tracks imageId, libraryIds, outfit state, decorations, prompts, variants
- **Prompt**: Main/Diff prompts in Chinese and English
- **ImageVariant**: Version management (v1, v2, v3...) with multiple language outputs
- **Template**: System/User templates with category (MAIN/DIFF)
- **ImageBatch**: Batch generation tracking with progress updates

**API Design Patterns**:
- **Request Validation**: Zod schemas for all API inputs
- **Response Format**: Unified `{success, data, message}` for success, `{success: false, error: {code, message, details}}` for errors
- **Error Codes**: VALIDATION_ERROR, NOT_FOUND, INTERNAL_ERROR
- **Endpoint Organization**: RESTful with logical grouping (libraries, prompts, templates, images, sync, providers, health)

**Component Strategy**:
- **Server Components**: Default for static content and data fetching (Dashboard, library lists, stats)
- **Client Components**: Used only for interactivity ('use client' directive) - forms, dialogs, editors
- **shadcn/ui**: 22 pre-installed components (Button, Card, Dialog, Form, Input, Select, Table, Tabs, Toast, etc.)
- **Dynamic Imports**: Monaco Editor loaded with `dynamic(() => import(), { ssr: false })` to avoid SSR issues

**State Management**:
- **React Query**: Server state caching with automatic refetching and invalidation
- **React Context**: Minimal usage, prefer React Query for server state
- **URL State**: Search params and route params for shareable state

**Business Logic Isolation**:
- **Framework-Agnostic**: All core logic in `src/lib/` (no Next.js dependencies)
- **Testable**: Pure TypeScript functions and classes
- **Reusable**: Can be used in API routes, Server Actions, or CLI scripts

**Error Handling & Recovery**:
- **Provider Fallback**: Automatic retry with alternative providers
- **Database Transactions**: Atomic operations for data consistency
- **Error Boundaries**: React error boundaries for UI error containment
- **Attempt Logging**: All provider attempts logged in providerAttempts JSON field

**Performance Optimizations**:
- **Code Splitting**: Dynamic imports for heavy components (Monaco Editor)
- **Image Optimization**: Next.js Image component with remotePatterns configuration
- **Database Indexing**: Composite indexes on frequently queried fields (imageId, libraryIds)
- **Turbopack**: Fast HMR in development (374ms startup)
- **LRU Cache**: In-memory caching for frequently accessed data

**Code Organization Principles**:
- **Colocation**: Related files grouped by feature (library/, prompt/, template/)
- **Separation of Concerns**: UI, API, Business Logic, Database in distinct layers
- **Type Safety**: TypeScript strict mode, Prisma-generated types, Zod runtime validation
- **Consistency**: Unified naming conventions, file structure, error handling patterns

## 💻 Development Workflow

### Setup Commands

```bash
# Install dependencies
npm install

# Development server (Turbopack, 374ms startup)
npm run dev              # http://localhost:3000

# Database operations
npm run db:studio        # Open Prisma Studio UI (database GUI)
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with test data (6 libraries, 14 entries, 2 templates)
npm run db:push          # Push schema changes to database (dev only)
npm run db:generate      # Generate Prisma Client

# Build & Production
npm run build            # Build Next.js application for production
npm start               # Start production server

# Testing
npm test                # Run all tests (unit + integration)
npm run test:unit       # Run unit tests (Vitest)
npm run test:e2e        # Run E2E tests (Playwright)
npm run test:integration # Run integration tests (API endpoints)
npm run test:watch      # Run tests in watch mode

# Code Quality
npm run lint            # Run ESLint (flat config)
npm run lint:fix        # Auto-fix linting issues
npm run type-check      # TypeScript type checking
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting

# Utility Scripts
npm run migrate-libraries  # Migrate 6 libraries from JSON to database (one-time)
npm run consistency-test   # Test Template Engine output consistency with Python version
```

## Git Workflow (Before Making Changes)

**ALWAYS execute these checks first:**

1. **Verify current branch**
   ```bash
   git branch --show-current
   ```

2. **Add unsaved file and commit with correct comment **
   ```bash
   git add .
   git commit -m "related comment to the change"
   ```

### Commit Message Format
```
type(scope): subject
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## 🐛 Debugging Instructions

### Debug Workflow

1. Error Collection : Browser errors via Chrome DevTools MCP and Playwright MCP
2. Documentation Research : Query official docs via Context7 mcp
3. Solution Planning : Create fix plan based on findings
4. User Confirmation:
**MUST present findings before fixing:**
```
Found: [error] caused by [root cause]
Official docs recommend: [solution]
I need to change: [specific changes]
May I proceed?
```
5. Implementation
Only after approval, implement fixes and verify using Chrome/Playwright tools.

## UI/UX design

### Design Principles

- Comprehensive design checklist in `/context/design-principles.md`
- Brand style guide in `/context/style-guide.md`
- When making visual (front-end, UI/UX) changes, always refer to these files for guidance

### Quick Visual Check

IMMEDIATELY after implementing any front-end change:

1. **Identify what changed** – Review the modified components/pages
2. **Navigate to affected pages** – Use `mcp__playwright__browser_navigate` to visit each changed view
3. **Verify design compliance** – Compare against `/context/design-principles.md` and `/context/style-guide.md`
4. **Validate feature implementation** – Ensure the change fulfills the user's specific request
5. **Check acceptance criteria** – Review any provided context files or requirements
6. **Capture evidence** – Take full page screenshot at desktop viewport (1440px) of each changed view
7. **Check for errors** – Run `mcp__playwright__browser_console_messages`

This verification ensures changes meet design standards and user requirements.

### Comprehensive Design Review

Invoke the `@agent-design-review` subagent for thorough design validation when:
- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing

### shadcn/ui Components

- Modern component library built on Radix UI primitives
- Components in `/src/components/ui/`
- Tailwind CSS v4 with CSS variables for theming
- Lucide React icons throughout

## ⚠️ Critical Rules

**NEVER DO THESE**:
1. ❌ Delete files without explicit permission
2. ❌ Modify core configuration without discussion
3. ❌ Commit sensitive data (passwords, API keys)
4. ❌ Force push to main branch
5. ❌ Ignore failing tests
6. ❌ Use `any` type in TypeScript without comment explaining why
7. ❌ Copy-paste code without understanding it
8. ❌ Make assumptions about business logic

**ALWAYS DO THESE**:
1. ✅ Read error messages completely before fixing
2. ✅ Test your changes locally
3. ✅ Keep commits atomic and focused
4. ✅ Update documentation when changing APIs
5. ✅ Ask for clarification when unsure
6. ✅ Report blockers immediately
7. ✅ Follow existing patterns in codebase
8. ✅ Consider edge cases and error states
