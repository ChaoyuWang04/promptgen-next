The most important thing that u need to keep in your mind:
**Remember**: Always think ultra hard and use proper mcp tools and sub-agents when needed, also remember to plan reading docs wisely, some are way too long with your limited context window. For requirements, always think proactively first and always articulate the reasoning process step by step—identify which parts of the existing system this new change will affect. For implementation, always analyze how we can ensure the new feature implementation integrates perfectly with the existing system and ensure the new system is robust and complete. Meanwhile, please ask me questions at any time to ensure our expectations for the system are aligned. We not only need to implement this new feature but also ensure its interaction with other system components is perfect. After implementation, please update todo.md in the root directory.

## 🎯 Core Directives

When working here:
1. **Follow instructions literally** - don't assume or improvise unless explicitly told
2. **Ask for clarification** when requirements are ambiguous
3. **Report what you're doing** before executing complex operations
4. **Always analyze and plan before acting.**
## 📍 Workspace Routing System

### Core Principle (must follow step by step, do not skip!!!)
**CRITICAL**:  User Input → Analyze Requirements → Assess Current State → Plan → Execute in Target Workspace - git commit
### Standard Flow (Do NOT skip phases)
**Phase 1: Requirement Analysis**
1. Identify core requirement - What does user actually want?
2. Determine scope - Which parts affected?
3. Define success criteria - How to verify completion?
**Phase 2: Current State Assessment**
1. Create search plan - List relevant files/directories
2. Execute search and read files
3. Document current implementation - What exists? What patterns? What's reusable?
**Phase 3: Implementation Planning**
1. Identify target workspace(s)
2. Load relevant CLAUDE.md files
3. Create ordered task list + root `todo.md`
4. **Confirm plan with user before proceeding**
**Phase 4: Execution**
1. Announce plan - "Based on analysis, I'll modify X files..."
2. Execute step by step - Follow workspace-specific rules
3. Validate each step - Run tests, check errors
4. Git commit with proper comment.

### Technology Stack
- **Framework**: Next.js 16.0.3 with App Router + Turbopack
- **Language**: TypeScript 5.6.3 (strict mode enabled)
- **Runtime**: React 19.2.0 (Server Components + Client Components)
- **Database**: PostgreSQL 16-alpine + Prisma 6.0.0 (ORM) + Atlas 0.38.1 (migrations)
- **Styling**: Tailwind CSS 3.4.15 + shadcn/ui (22 components)
- **State Management**: React Query (TanStack Query 5.x) for server state
- **Validation**: Zod 3.23+ for runtime type validation
- **Testing**: Vitest 2.1.6 (unit) + Playwright 1.48.2 (E2E)
- **Command Runner**: Just 1.43.1

### Key Architecture Patterns
- **Three-Layer Architecture**: Frontend (React) → API Layer (Next.js Routes) → Data Layer (Prisma)
- **Component Structure**: Feature-based with shadcn/ui primitives (`/src/components/ui/`, `/src/components/library/`, etc.)
- **State Management**: React Query for server state caching, URL params for shareable state
- **API Communication**: Next.js API Routes with Zod validation, unified `{success, data, message}` responses
- **Styling Strategy**: Tailwind CSS + CSS variables for theming (dark/light mode)
- **Error Handling**: Centralized ErrorLogger + ErrorClassifier, API error responses with codes
- **Performance**: Turbopack HMR (374ms), code splitting, dynamic imports for Monaco Editor

### Project Structure
```
promptgen-next/
├── prisma/
│   ├── schema.prisma          # 8 models, 4 enums (Prisma schema)
│   └── seed.ts                # Database seeding script
├── atlas/
│   └── migrations/            # Atlas SQL migrations
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (dashboard)/       # Dashboard route group (7 pages)
│   │   │   ├── page.tsx       # Dashboard home
│   │   │   ├── libraries/     # Library management
│   │   │   ├── prompts/       # Prompt generation
│   │   │   ├── combinations/  # Combination management
│   │   │   ├── images/        # Image management
│   │   │   ├── templates/     # Template editor
│   │   │   └── status/        # System status
│   │   └── api/               # API Routes (35+ endpoints)
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components (22)
│   │   ├── library/           # Library management components
│   │   ├── prompt/            # Prompt generation components
│   │   ├── combinations/      # Combination components
│   │   └── shared/            # Shared components
│   ├── hooks/                 # React Query hooks
│   ├── lib/                   # Core business logic (~4,500 LOC)
│   │   ├── db/                # Prisma client singleton
│   │   ├── engines/           # Template engines (main + diff)
│   │   ├── generators/        # Prompt/image generators
│   │   ├── providers/         # AI providers (Gemini, ByteDance)
│   │   ├── sync/              # 8 sync checkers
│   │   └── utils/             # Utilities (logger, errors, cache)
│   └── schemas/               # Zod validation schemas
├── docs/                      # Documentation
│   └── todo.md                # Task tracking
├── tests/                     # Test files
└── justfile                   # Just command runner recipes
```

## 🛠️ Build, Test & Development
### Common Commands
Run `just` to see all available commands. Key commands:

| Task | Command | Purpose |
|------|---------|---------|
| **Setup** | `just setup` | First-time setup (deps + docker + migrations + seed) |
| **Install deps** | `just install` | Install npm packages |
| **Dev server** | `just dev` | Start dev server (Turbopack, http://localhost:3000) |
| **Build** | `just build` | Production build (prisma generate + next build) |
| **Test all** | `just test` | Run all tests |
| **Test unit** | `just test-unit` | Run Vitest unit tests |
| **Test E2E** | `just test-e2e` | Run Playwright E2E tests |
| **Lint** | `just lint` | ESLint check |
| **Type check** | `just type-check` | TypeScript validation |
| **Full check** | `just check` | lint + type-check + format-check |

### Development Workflow
**First time**: `just setup` (installs deps, starts Docker, applies migrations, seeds DB)
**Daily**: `just docker-up` → `just dev` → Make changes → `just check` before commit
**Pre-commit (REQUIRED)**: Run `just build` to verify compilation

### Database Commands
| Command | Purpose |
|---------|---------|
| `just docker-up` | Start PostgreSQL + Redis containers |
| `just docker-down` | Stop containers |
| `just db-studio` | Open Prisma Studio GUI |
| `just db-shell` | Connect to PostgreSQL shell |
| `just db-seed` | Seed database with test data |

### ⚠️ Critical Rules
1. **Build before PR** - Always verify `just build` passes
2. **Type check** - Run `just type-check` before committing
3. **Use Just commands** - Prefer `just <cmd>` over raw npm commands
4. **Docker required** - Database runs in Docker container


## 🗄️ Database Migration Workflow
### Core Principle
```
Prisma Schema → Atlas Migration → PostgreSQL → Prisma Client
(prisma/schema.prisma)  (atlas/migrations/)   (Docker)    (generated)
```
**Single source of truth**: `prisma/schema.prisma` - 🚫 Never edit migrations manually - ✅ All changes traceable via Atlas - ✅ Prisma only for ORM generation

### Standard Flow (Do NOT skip steps)
1. **Edit schema**: `prisma/schema.prisma` (add/modify models)
2. **Generate migration**: `just db-diff descriptive_name`
3. **Review SQL**: Check generated file in `atlas/migrations/`
4. **Apply migration**: `just db-apply`
5. **Verify status**: `just db-status`
6. **Generate Prisma Client**: `just prisma-generate`
7. **Test**: Verify changes work in application

### Key Commands
| Command | Purpose |
|---------|---------|
| `just db-status` | Show migration status |
| `just db-diff <name>` | Create new migration from schema changes |
| `just db-apply` | Apply pending migrations |
| `just db-apply-dry` | Preview what would be applied |
| `just db-lint` | Check for issues in migrations |
| `just db-validate` | Validate migrations |
| `just prisma-generate` | Regenerate Prisma Client |
| `just prisma-validate` | Validate Prisma schema |

### Database Models (8 total)
- **Combination**: Library combination tracking
- **Library**: 6 library types (character, pose, scene, theme, style, decorative_props)
- **Record**: Generation records with variants
- **Prompt**: Main/Diff prompts (CN + EN)
- **ImageVariant**: Version management with multi-language outputs
- **Template**: System/User templates (MAIN/DIFF categories)
- **ImageBatch**: Batch generation tracking
- **ErrorLog**: Error tracking and analysis


## 💅 Coding Style & Naming
### Format & Lint
- **Auto-format**: Run `just format` (Prettier) before commit
- **Linter**: ESLint 9 (flat config) - run `just lint`
- **Indentation**: 2 spaces (TypeScript/TSX/JSON)

### Naming Conventions
| Element | Convention | Example |
|---------|-----------|---------|
| **Variables/Functions** | camelCase | `getUserData`, `handleSubmit` |
| **React Components** | PascalCase | `LibraryTable`, `PromptCard` |
| **Files** | kebab-case | `library-table.tsx`, `use-libraries.ts` |
| **Directories** | kebab-case | `components/library/`, `hooks/` |
| **Constants** | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_RETRIES` |
| **Types/Interfaces** | PascalCase | `Library`, `PromptGenerateRequest` |
| **Zod Schemas** | camelCase + Schema suffix | `librarySchema`, `promptRequestSchema` |

### Code Organization
- **API Routes**: `src/app/api/` - RESTful endpoints with Zod validation
- **Components**: `src/components/` - Feature-based folders (library/, prompt/, ui/)
- **Hooks**: `src/hooks/` - React Query hooks (use-libraries.ts, use-prompts.ts)
- **Business Logic**: `src/lib/` - Framework-agnostic, testable (engines/, generators/, providers/)
- **Schemas**: `src/schemas/` - Zod validation schemas
- **Import ordering**: React/Next → 3rd party → Internal (@/lib, @/components)

### Project-Specific Rules
- **Server Components**: Default for pages, use `'use client'` only when needed
- **Client Components**: Forms, dialogs, editors with interactivity
- **API Responses**: Always return `{success: boolean, data?: T, message?: string, error?: {...}}`
- **shadcn/ui**: Use existing UI components before building custom


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
### Component Library
| Config | Value |
|--------|-------|
| **Library** | shadcn/ui (22 components installed) |
| **Base** | Radix UI primitives |
| **Components Path** | `/src/components/ui/` |
| **Styling** | Tailwind CSS 3.4.15 + CSS variables |
| **Icons** | Lucide React |
| **Theme** | CSS variables (dark/light mode support) |
| **Editor** | Monaco Editor (code/JSON editing) |

### Installed shadcn/ui Components
`accordion`, `alert-dialog`, `avatar`, `button`, `card`, `checkbox`, `command`, `dialog`, `dropdown-menu`, `form`, `input`, `label`, `popover`, `progress`, `radio-group`, `scroll-area`, `select`, `separator`, `switch`, `tabs`, `toast`, `tooltip`

### Usage Rules
- ✅ Use shadcn/ui components first before building custom
- ✅ Follow Radix UI composition patterns
- ✅ Extend via wrapper components when needed
- ✅ Use Monaco Editor for code/JSON editing (dynamic import with SSR disabled)
- 🚫 Don't modify `/src/components/ui/` source files directly

## 🧪 Testing Guidelines
### Test Commands
| Command | Purpose |
|---------|---------|
| `just test` | Run all tests (Vitest) |
| `just test-unit` | Run unit tests only |
| `just test-unit-watch` | Run unit tests in watch mode |
| `just test-e2e` | Run Playwright E2E tests |
| `just test-e2e-ui` | Run E2E tests with Playwright UI |

### Test Organization
- **Unit Tests**: `tests/unit/` - Template engines, generators, utilities
- **Integration Tests**: `tests/integration/` - API endpoint tests (12 passing)
- **E2E Tests**: `tests/e2e/` - Playwright browser tests

### Coverage Priorities
**Focus on**: Template engine output consistency, API response formats, Zod validation, business logic (generators, combo-manager)
**Don't test**: shadcn/ui components, Prisma Client internals, third-party libraries

### Current Test Status
- Integration tests: 12/12 passing
- Unit tests: Pending expansion (Phase 6)
- E2E tests: Pending expansion (Phase 6)

### ⚠️ Rules
- ✅ Run `just test` before committing significant changes
- ✅ Add tests for bug fixes (regression prevention)
- ✅ Test API endpoints with Zod schema validation
- 🚫 Don't mock Prisma in integration tests (use test database)

## 📝 Git Commit & PR Guidelines
### Commit Message Format
```
<type>(<scope>): <subject>
Example: feat(auth): 添加JWT token刷新机制
```
**Types**: `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore`
### Standard Flow
1. **Commit after every change** - Don't leave uncommitted files
2. **Write clear message** - Present tense, reference issue IDs (e.g., `feat(api): add user endpoint #123`)
3. **Create PR with**:
   - Concise description of change
   - Testing evidence (command output/screenshots)
   - Notes on config/schema updates
4. **Request reviews** - Both backend & frontend owners for shared contracts
### Key Rules
- ✅ Commit frequently, push often
- ✅ Use conventional commit format
- ✅ Include testing proof in PRs
- 🚫 Mix unrelated changes in one commit


## 🔄 API Development Workflow
### Core Principle
This project uses **Next.js API Routes** with **Zod validation** instead of OpenAPI.
```
Zod Schema → API Route → React Query Hook → Component
(src/schemas/)  (src/app/api/)  (src/hooks/)     (src/components/)
```
**Single Source of Truth**: Zod schemas in `src/schemas/` - ✅ Runtime validation - ✅ TypeScript inference - ✅ No code generation needed

### Adding New API Endpoints
1. **Define Zod schema**: Add request/response schemas to `src/schemas/`
2. **Create API route**: Add route handler in `src/app/api/`
3. **Add React Query hook**: Create hook in `src/hooks/`
4. **Use in component**: Import hook and use in component
5. **Test**: Add integration test in `tests/integration/`

### API Response Format
All endpoints use unified response format:
```typescript
// Success
{ success: true, data: T, message?: string }

// Error
{ success: false, error: { code: string, message: string, details?: any } }
```

### Error Codes
- `VALIDATION_ERROR`: Zod validation failed
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Server error
- `PROVIDER_ERROR`: AI provider failure
