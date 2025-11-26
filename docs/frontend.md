# Frontend Architecture

## Overview

Next.js 16 App Router with React 19, shadcn/ui components, and TanStack Query for state management.

---

## Pages

7 main pages in `src/app/(dashboard)/`

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Dashboard | System overview, stats, recent activity |
| `/libraries` | Libraries | Manage 6 library types with entries |
| `/prompts` | Prompts | Generate main/diff prompts |
| `/combinations` | Combinations | Manage image combinations, batch operations |
| `/templates` | Templates | Create/edit prompt templates (Monaco Editor) |
| `/status` | Status | System health, providers, queue, errors |
| `/settings` | Settings | System configuration |

---

## Layout Structure

**Root Layout** (`src/app/layout.tsx`)
- QueryProvider (TanStack Query)
- Toaster (notifications)
- Font loading (Inter)

**Dashboard Layout** (`src/app/(dashboard)/layout.tsx`)
- Sidebar (w-64) - Navigation
- Header - Breadcrumbs, search
- Main content with ErrorBoundary

---

## Component Library

### shadcn/ui (30 components)

Located in `src/components/ui/`

| Category | Components |
|----------|------------|
| Form | button, input, textarea, select, checkbox, radio-group, switch, form, label |
| Layout | card, dialog, sheet, accordion, tabs, separator, scroll-area |
| Feedback | toast, alert, alert-dialog, skeleton, progress |
| Navigation | breadcrumb, dropdown-menu |
| Display | table, badge, avatar, tooltip, popover |

### Custom Components

**Shared** (`src/components/shared/`)

| Component | Purpose |
|-----------|---------|
| Sidebar | Main navigation with 7 items |
| Header | Top bar with breadcrumbs |
| ErrorBoundary | Catch rendering errors |
| LoadingSpinner | Loading indicator |
| EmptyState | Empty list placeholder |
| ErrorState | Error display |
| StatCard | Dashboard stat card |

**Combinations** (`src/components/combinations/`)

| Component | Purpose |
|-----------|---------|
| CombinationList | Infinite scroll list with selection |
| CombinationDetail | Detail panel |
| VariantCard | Image variant display |
| StrategyGenerationDialog | 4-step wizard |
| BatchProgressBar | Batch progress |

**Library** (`src/components/library/`)

| Component | Purpose |
|-----------|---------|
| LibraryTable | Searchable entry table |
| LibrarySidebar | Library list sidebar |
| LibraryConfigDialog | Configure library settings |
| CreateLibraryDialog | Create new library |
| EntryFormDialog | Edit/create entry |
| EntryDetailDialog | View entry details |

**Monitoring** (`src/components/monitoring/`)

| Component | Purpose |
|-----------|---------|
| HealthStatusCard | System health overview |
| ProviderStatus | AI provider status |
| QueueStatus | Job queue metrics |

**Errors** (`src/components/errors/`)

| Component | Purpose |
|-----------|---------|
| ErrorStats | Error statistics |
| ErrorLogViewer | View error logs |
| ErrorFilter | Filter errors |

---

## State Management

### TanStack Query Configuration

| Setting | Value |
|---------|-------|
| Stale Time | 60 seconds |
| Cache Time | 5 minutes |
| Retry | 2 attempts (no 4xx retry) |
| Refetch on Focus | Enabled |

### Query Key Factory

Organized by domain:
- `libraries` - Library config, list, detail
- `records` - Record list, detail, variants
- `prompts` - Prompt detail
- `templates` - Template list, detail, variables
- `images` - Stats, batches, progress
- `combinations` - List, count
- `providers` - Status, stats
- `sync` - Check, report
- `dashboard` - Stats

### Invalidation Patterns

After mutations, invalidate related queries:
- Create library entry → invalidate libraries
- Generate prompt → invalidate records, combinations
- Delete combination → invalidate combinations, records

---

## Custom Hooks

Located in `src/hooks/`

| Hook | Purpose |
|------|---------|
| useLibraries | Library CRUD operations |
| usePrompts | Generate main/diff prompts |
| useCombinations | Infinite list, batch delete |
| useTemplates | Template CRUD, preview |
| useImages | Batch generation, stats |
| useDashboard | Dashboard statistics |
| useBatchProgress | Real-time progress polling |
| useDebounce | Input debouncing (300ms) |
| useToast | Toast notifications |

---

## Styling

### Tailwind Configuration

| Setting | Value |
|---------|-------|
| Dark Mode | Class-based |
| Base Colors | Zinc (shadcn) |
| Theme | CSS variables with hsl() |

### CSS Variables

Defined in `src/app/globals.css`:
- `--background`, `--foreground`
- `--primary`, `--secondary`, `--destructive`
- `--muted`, `--accent`, `--popover`, `--card`
- `--border`, `--input`, `--ring`, `--radius`

---

## Key Patterns

### Form Handling

- react-hook-form with Zod validation
- shadcn Form component wrapper
- Error display per field

### Modal/Dialog

- Dialog for standard modals
- AlertDialog for destructive confirmations
- Sheet for side panels

### Data Loading

1. Component renders loading skeleton
2. Hook fetches data via Query
3. Conditional render: loading → error → data
4. Mutations trigger invalidation

### Infinite Scroll

- IntersectionObserver on sentinel div
- fetchNextPage when visible + hasNextPage

### Selection Mode

- Set<string> for selected IDs
- Checkbox in list items
- Batch action buttons
