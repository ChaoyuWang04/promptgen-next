# Frontend Architecture

## Overview

Next.js 16 App Router + React 19. UI uses shadcn/ui with Tailwind; data fetching via TanStack Query. Routes live under `src/app/(dashboard)/`.

---

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard with library/template/record counts + provider success stats |
| `/libraries` | Sidebar-driven library CRUD; supports create from template, entry dialogs, config dialog |
| `/prompts` | MAIN prompt generation UI (required libraries); DIFF tab currently informational |
| `/combinations` | Two-panel list/detail, infinite scroll, strategy generation dialog, batch delete, batch progress bar |
| `/templates` | Monaco editor, template list, preview/render, variable autocomplete, create/update/delete |
| `/status` | Health overview, provider status, queue stats, error logs (tabs) |
| `/settings` | Placeholder settings UI (no persistence yet) |
| `/images` | Present but empty (no page implementation yet) |

---

## Layout Structure

**Root Layout** (`src/app/layout.tsx`): Inter font, QueryProvider, Toaster, Chinese locale.

**Dashboard Layout** (`src/app/(dashboard)/layout.tsx`): Persistent Sidebar + Header + ErrorBoundary-wrapped main content (p-6). Command palette placeholder.

---

## Component Library

shadcn/ui components in `src/components/ui/` (buttons, form controls, dialogs, sheet, tabs, table, toast, etc.).

### Custom Components

Shared (`src/components/shared/`): Sidebar, Header, ErrorBoundary, LoadingSpinner, EmptyState, StatCard.
Libraries (`src/components/library/`): LibrarySidebar, LibraryTable, CreateLibraryDialog, LibraryConfigDialog, EntryFormDialog, EntryDetailDialog.
Combinations (`src/components/combinations/`): CombinationList, CombinationDetail, StrategyGenerationDialog, BatchProgressBar, VariantCard.
Monitoring/Errors (`src/components/monitoring/`, `src/components/errors/`): HealthStatusCard, ProviderStatus, QueueStatus, ErrorStats, ErrorLogViewer, ErrorFilter.

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
- Delete combination → invalidate combinations, records; batch delete triggers same
- Template save/delete → invalidate templates, template variables

---

## Custom Hooks

Located in `src/hooks/`

| Hook | Purpose |
|------|---------|
| useLibraries | Library config + entry CRUD |
| usePrompts | Generate main/diff prompts |
| useCombinations | Infinite list, batch delete, detail |
| useTemplates | Template CRUD, preview, variable loading |
| useImages | Batch generation, stats, progress |
| useDashboard | Dashboard statistics |
| useBatchProgress | Real-time batch polling |
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

1. Component renders loading/skeleton
2. Hook fetches via Query
3. Conditional render: loading → error → data
4. Mutations trigger targeted invalidation

### Infinite Scroll

- IntersectionObserver on sentinel div
- fetchNextPage when visible + hasNextPage

### Selection Mode

- Set<string> for selected IDs
- Checkbox in list items
- Batch action buttons
