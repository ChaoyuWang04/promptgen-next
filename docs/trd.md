# Technical Reference Document

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 16.0.3 |
| Language | TypeScript | 5.6.3 |
| Runtime | React | 19.2.0 |
| Database | PostgreSQL | 16-alpine |
| ORM | Prisma | 6.0.0 |
| Migrations | Atlas | - |
| Queue | BullMQ | - |
| Cache | Redis (ioredis) | 5.x |
| UI Library | shadcn/ui | - |
| Styling | Tailwind CSS | 3.4.15 |
| State | TanStack Query | 5.x |
| Validation | Zod | 3.23+ |
| Testing | Vitest + Playwright | 2.1.6 / 1.48.2 |
| Bundler | Turbopack | - |

---

## Architecture Patterns

### Three-Layer Architecture

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Frontend | `src/app/`, `src/components/` | UI, routing, state |
| API | `src/app/api/` | Request handling, validation |
| Business Logic | `src/lib/` | Core logic, framework-agnostic |

### Template Engine Pattern

Variable rendering with filter support: `{{library.field | filter}}`

### Provider Fallback Pattern

Sequential provider attempts with fallback:
1. Try providers in `IMAGE_PROVIDERS` order (e.g., Gemini → ByteDance)
3. Record all attempts for analytics

### Queue-Based Processing

BullMQ for async image generation:
- Job retry with exponential backoff
- Progress tracking via SSE
- Batch coordination

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| REDIS_URL | Redis connection string | Yes |
| GEMINI_API_KEY | Google Gemini API key | Yes |
| GEMINI_MODEL | Gemini model name | No |
| BYTEDANCE_API_KEY | ByteDance API key | No |
| BYTEDANCE_MODEL | ByteDance model name | No |
| IMAGE_PROVIDERS | Comma-separated provider list | No |
| NODE_ENV | Environment (development/production) | No |

---

## Development Commands

| Command | Purpose |
|---------|---------|
| `just dev` | Start development server |
| `just build` | Production build |
| `just test` | Run all tests |
| `just lint` | Run ESLint |
| `just type-check` | TypeScript check |
| `just format` | Format with Prettier |

### Database Commands

| Command | Purpose |
|---------|---------|
| `just docker-up` | Start PostgreSQL + Redis |
| `just docker-down` | Stop containers |
| `just db-status` | Show migration status |
| `just db-diff <name>` | Create migration |
| `just db-apply` | Apply migrations |
| `just db-studio` | Open Prisma Studio |
| `just db-seed` | Seed database |
| `just prisma-generate` | Generate Prisma client |

---

## Database Migration Workflow

1. Edit `prisma/schema.prisma`
2. Run `just db-diff "description"`
3. Review SQL in `atlas/migrations/`
4. Get approval before applying
5. Run `just db-apply`
6. Run `just prisma-generate`

**Safety Rules:**
- Never run destructive commands without confirmation
- Always review generated SQL
- Never modify production directly

---

## Testing Strategy

| Type | Tool | Location | Purpose |
|------|------|----------|---------|
| Unit | Vitest | `tests/unit/` | Business logic |
| Integration | Vitest | `tests/integration/` | API endpoints |
| E2E | Playwright | `tests/e2e/` | User flows |

**Commands:**
- `just test` - All tests
- `just test-unit` - Unit only
- `just test-e2e` - E2E only

---

## Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js configuration |
| `tailwind.config.ts` | Tailwind CSS |
| `tsconfig.json` | TypeScript |
| `components.json` | shadcn/ui |
| `vitest.config.ts` | Unit testing |
| `playwright.config.ts` | E2E testing |
| `justfile` | Task runner |
| `docker-compose.yml` | Docker services |

---

## Key Technical Decisions

### Server Components Default

React Server Components for static content, Client Components only for interactivity.

### Zod Runtime Validation

All API inputs validated at runtime with Zod schemas.

### Atlas Over Prisma Migrate

Atlas for SQL-first migrations with better control over generated SQL.

### Dynamic Library Service

Libraries are DB-driven (order/required/metadata), cached in `libraryService`, and power prompt generators + imageId builder.

### Python Stitcher

`PythonStitcher` stitches MAIN/DIFF images and can backfill single-language variants for existing ImageVariant records.

### BullMQ for Async Jobs

Redis-backed queue for reliable image generation with retry logic.

### Provider Abstraction

Common interface for AI providers enables fallback and swapping.

---

## Performance Considerations

| Optimization | Implementation |
|--------------|----------------|
| Code splitting | Dynamic imports for Monaco Editor |
| Image optimization | Next.js Image component |
| Query caching | TanStack Query with 60s stale time |
| Database indexing | Composite indexes on imageId, combinationKey |
| Fast HMR | Turbopack (374ms startup) |
