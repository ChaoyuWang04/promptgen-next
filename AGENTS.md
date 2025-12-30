## Core Directives
Think ultra hard. Plan doc reading wisely (context limits). Always articulate reasoning step-by-step, identify affected system parts. Ask questions to align expectations. After changes: update docs in `docs/` (specify which: api.md/backend.md/database.md/frontend.md/prd.md/structure.md/trd.md) + git commit.
### Standard Flow
**Phase 1: Requirement Analysis**
1. Identify core requirement 2. Determine scope (which parts affected) 3. Define success criteria
**Phase 2: Current State Assessment**
1. Create search plan (including reading relevant docs in `docs/` and db-snapshot in 'context/db-snapshot' first) 2. Execute search and read files 3. Document current implementation (patterns, reusable parts)
**Phase 3: Planning**
1. Identify target workspace(s) 2. Create ordered task list 3. Identify which docs to update (API changes→api.md, DB changes→database.md, FE changes→frontend.md, BE logic→backend.md, new features→prd.md, structure changes→structure.md, tech decisions→trd.md) 4. **Confirm plan with user before proceeding**
**Phase 4: Execution**
1. Announce plan ("Will modify X files...") 2. Execute step-by-step per workspace rules 3. Validate each step 4. Update identified docs in `docs/` (keep concise but include necessary details) 5. Git commit with proper message

### Technology Stack
- **Framework**: Next.js 16.0.3 (App Router + Turbopack)
- **Language**: TypeScript 5.6.3 (strict mode)
- **Database**: PostgreSQL 16-alpine (Docker) + Prisma ORM 6.0.0 + Redis (ioredis 5.x)
- **Styling**: Tailwind CSS 3.4.15 + CSS variables
- **State Management**: React Query (TanStack Query 5.x)
- **Testing**: Vitest 2.1.6 (unit) + Playwright 1.48.2 (E2E)

## Build, Test & Development
### Common Commands
| Task | Command | Purpose |
|------|---------|---------|
| **Install deps** | `just install` | Sync dependencies |
| **Dev server** | `just dev` | Start development server (Turbopack) |
| **Build** | `just build` | Create production bundle |
| **Test** | `just test` | Run all tests |
| **Lint** | `just lint` | Run ESLint |
| **Type check** | `just type-check` | TypeScript type checking |
| **Format** | `just format` | Format code with Prettier |

### Development Workflow
**Daily**: `just install` → `just docker-up` → `just dev` → Make changes
**Pre-commit (REQUIRED)**: `just build` to verify compilation → Optional: `just check` (lint + type-check + format-check)

### Database Commands
| Task | Command | Purpose |
|------|---------|---------|
| **Start DB** | `just docker-up` | Start PostgreSQL + Redis containers |
| **Stop DB** | `just docker-down` | Stop containers |
| **DB status** | `just db-status` | Show migration status |
| **DB studio** | `just db-studio` | Open Prisma Studio GUI |
| **Seed DB** | `just db-seed` | Seed with test data |

### Critical Rules
1. **Build before PR** - Always verify `just build` succeeds
2. **Docker required** - Run `just docker-up` before dev server
3. **Prisma generate** - Run `just prisma-generate` after schema changes


## Database Migration Workflow
### Core Principle
Design Doc → Schema Definition → Migration → Database → ORM. Single source of truth: `prisma/schema.prisma`. Never run migrations in app code. All changes traceable and reversible.
### Absolute Rules
**NEVER execute without confirmation:**
- DROP DATABASE/SCHEMA, TRUNCATE, DELETE WHERE 1=1
- Any write to production database
- `just db-reset` (drops all data)
- Direct SQL bypassing migration system
- Any schema changes, migrations, bulk import/export

**Safe operations (no confirmation needed):** SELECT queries, `just db-status`, generate migration files (not apply), review SQL files

### Standard Flow
1. Update design: `docs/database.md`
2. Update schema: `prisma/schema.prisma`
3. Generate migration: `just db-diff "description"`
4. **STOP: Show me the SQL file**
5. Review SQL: `atlas/migrations/`
6. **STOP: Wait for approval**
7. Apply: `just db-apply`
8. Verify: `just db-status`
9. Generate ORM: `just prisma-generate`


## Coding Style & Naming
### Format & Lint
- **Auto-format**: `just format` (Prettier)
- **Linter**: `just lint` (ESLint)
- **Indentation**: 2 spaces

### Naming Conventions
| Element | Convention | Example |
|---------|-----------|---------|
| **Variables/Functions** | `camelCase` | `getUserData`, `handleClick` |
| **Classes/Components** | `PascalCase` | `UserProfile`, `DataTable` |
| **Files/Directories** | `kebab-case` | `user-profile/`, `data-table.tsx` |
| **Constants** | `UPPER_SNAKE_CASE` | `API_KEY`, `MAX_RETRIES` |
| **Types/Interfaces** | `PascalCase` | `UserService`, `ImageVariant` |

### Code Organization
- **Shared code**: `src/lib/` for business logic, `src/schemas/` for Zod validation
- **Feature co-location**: Keep related files together in feature folders
- **Import ordering**: React → 3rd party → Internal (`@/lib`, `@/components`)

### Project-Specific Rules
- React components: PascalCase files in `src/components/`
- API routes: kebab-case folders in `src/app/api/`
- Zod schemas: `*.schema.ts` in `src/schemas/`


## UI/UX Design
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

### Component Library
| Config | Value |
|--------|-------|
| **Library** | shadcn/ui |
| **Base** | Radix UI primitives |
| **Components Path** | `/src/components/ui/` |
| **Styling** | Tailwind CSS 3.4.15 + CSS variables |
| **Icons** | Lucide React |
| **Theme** | CSS variables |

### Usage Rules
- Use library components first before building custom
- Follow library's composition patterns
- Extend via wrapper components when needed
- Don't modify library source files directly


## Testing Guidelines
### Test Commands
| Task | Command | Purpose |
|------|---------|---------|
| **All tests** | `just test` | Run full test suite |
| **Unit tests** | `just test-unit` | Run Vitest unit tests |
| **Unit watch** | `just test-unit-watch` | Vitest in watch mode |
| **E2E tests** | `just test-e2e` | Run Playwright E2E tests |
| **E2E UI** | `just test-e2e-ui` | Playwright with UI |

### Test Organization
- **Unit tests**: Co-located in `tests/unit/` mirroring `src/lib/` structure
- **Integration tests**: `tests/integration/api/` for API endpoint tests
- **E2E tests**: `tests/e2e/` for full user flow tests

### Coverage Priorities
Focus on: Edge cases, business logic (template engines, generators), API contracts, data transformations
Don't test: Third-party libraries, framework internals, simple getters/setters

### Rules
- Test before commit
- Add tests for bug fixes
- Cover edge cases and error paths
- Test real integrations when possible (use test DB)


## Git Commit & PR Guidelines
### Commit Message Format
**Types**: `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore`

### Standard Flow
1. **Commit after every change** - Don't leave uncommitted files
2. **Write clear message** - Present tense, reference issue IDs (e.g., `feat(api): add user endpoint #123`)
3. **Create PR with**:
   - Concise description of change
   - Testing evidence (command output/screenshots)
   - Notes on config/schema updates
