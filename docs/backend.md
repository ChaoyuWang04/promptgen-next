# Backend Architecture

## Overview

Business logic in `src/lib/`: DB-driven libraries, template rendering, prompt generation, AI provider orchestration, and image stitching. API routes live in `src/app/api/` and wrap these services.

---

## Template Engine

Located in `src/lib/engines/`.

### Syntax

| Pattern | Description |
|---------|-------------|
| `{{library.field}}` | Direct field access from library data |
| `{{field \| filter}}` | Apply filter to field value |

### Filters

| Filter | Description |
|--------|-------------|
| `join` | Join array with default separator |
| `join: ', '` | Join array with custom separator |
| `uppercase` | Convert to uppercase |
| `lowercase` | Convert to lowercase |
| `first: N` | Get first N items |
| `default: value` | Fallback if empty |

Utilities: `validateTemplate` (syntax + variables) and `getAvailableVariables` (used by template UI/API).

---

## Prompt Generation

Located in `src/lib/generators/` with dynamic library lookup via `libraryService` (cached DB libraries; respects `metadata.generatorConfig` for outfit/decoration fields).

### Main Prompt Generator

Generates initial image prompt from library selections.

**Flow:**
1. Validate selections with `libraryService`.
2. Build context from all active libraries in selection.
3. Render MAIN template (default `template_default_v1`).
4. Extract outfit state + decorations using metadata pointers (`outfitField`, `decorationField`, `additionalDecorationField`).
5. Generate imageId (ordered by library `order`, uses abbreviations).
6. Persist Record with MAIN prompt (promptEn placeholder).

### Diff Prompt Generator

Generates difference prompt for variation images.

**Flow:**
1. Load Record + MAIN prompt.
2. Normalize outfit data (supports string arrays or structured objects); generate 3 color changes.
3. Normalize decorations (from metadata-driven fields); pick 8–9 items.
4. Render DIFF template (default `diff_template_default_v1`).
5. Save DIFF prompt; update Record outfit state/decoration usage.

---

## AI Providers

Located in `src/lib/providers/`. `ProviderManager` builds a fallback chain from `IMAGE_PROVIDERS` (comma list) and records attempts.

### Provider Interface

All providers implement:
- `generate(prompt, contextImage?)` - Generate image from prompt
- `healthCheck()` - Verify provider availability
- `name` / `model` - Provider identification

### Gemini Provider

| Setting | Value |
|---------|-------|
| Model | gemini-2.5-flash-image |
| Aspect Ratio | 9:16 |
| Timeout | 120 seconds |
| Format | Base64 image data |

### ByteDance Provider

| Setting | Value |
|---------|-------|
| Model | doubao-seedream-4-0-250828 |
| Size | 1440x2560 (9:16) |
| Timeout | 60 seconds |
| Format | URL (downloaded after generation) |

**Notes:** Provider for round 2 must match round 1 for context continuity. Attempt history stored per Record.

---

## Image Generation

Located in `src/lib/generators/image-generator.ts`

### 3-Round Flow

| Round | Description | Output |
|-------|-------------|--------|
| 1 | Generate main image from main prompt | `v{N}_main.png` |
| 2 | Generate diff image using same provider + main image as context | `v{N}_diff.png` |
| 3 | Stitch final images with text overlay (7 languages) | `v{N}_final_{lang}.png` |

Stitching uses `PythonStitcher` (also used by `/api/combinations/[id]/variants/[variantId]/language` to backfill a single language).

### Supported Languages

| ID | Code | Language |
|----|------|----------|
| 1 | en | English |
| 2 | fr | French |
| 3 | ja | Japanese |
| 4 | ko | Korean |
| 5 | de | German |
| 6 | es | Spanish |
| 7 | zh | Chinese |

---

## Image Stitching

Located in `src/lib/stitcher/`.

Combines main and diff images with narrative text overlay.

| Setting | Value |
|---------|-------|
| Title Size | 110px |
| Padding | 40px |
| Gap | 20px |
| Background | #ffffff |

---

## Batch Processing

Located in `src/lib/generators/batch-generator.ts`.

### Workflow

1. Create ImageBatch record (PENDING)
2. For each imageId:
   - Ensure Record exists (generate MAIN prompt if needed)
   - Ensure DIFF prompt exists
3. Queue jobs to BullMQ
4. Update batch to IN_PROGRESS
5. Worker processes jobs asynchronously
6. Batch status exposed via `/api/images/generate/batch/[batchId]` and `/api/images/batches`

### Queue Configuration (BullMQ + Redis)

| Setting | Value |
|---------|-------|
| Queue Name | image-generation |
| Retry Attempts | 3 |
| Backoff | Exponential (5s, 25s, 125s) |
| Completed TTL | 24 hours |
| Failed TTL | 7 days |

---

## Combination Manager

Located in `src/lib/generators/combo-manager.ts`.

Enumerates combinations from strategy configuration.

**Features:**
- Cartesian product enumeration
- Multi-select support for libraries
- Statistics: total possible, with prompts, with images
- Find ungenerated/unimaged combinations
 - Uses library entry names to build combinationKey when missing

---

## Sync Management

Located in `src/lib/sync/sync-manager.ts`

### Checkers (8)

| Checker | Purpose |
|---------|---------|
| LibraryConfigChecker | Validate library entries and schema |
| InvalidRefsChecker | Check for broken references |
| PromptSyncChecker | Ensure MAIN/DIFF prompts exist |
| ImageSyncChecker | Verify image files exist on disk |
| ComboStatusChecker | Validate combination consistency |
| FieldIntegrityChecker | Check required fields |
| OrphanChecker | Find orphaned records |
| DuplicateChecker | Detect duplicate records |

**Auto-Repair:** Issues marked with `canAutoRepair` flag can be fixed automatically.

---

## Utilities

Located in `src/lib/utils/`

### Image ID Generation

Format: `{lib1}_{lib2}_..._{sequence}` ordered by library `order` with entry abbreviations. Example: `betty_sitting_living_summer_simpson_0001`.

### Random Utilities

- `randomSample(array, count)` - Pick N items without replacement
- `selectNewColor(current, pool)` - Pick different color from pool
- `selectRandomDecorations(theme, scene, count)` - Prioritize high-priority items
- `generateOutfitChanges(outfitMinor, count)` - Build diff outfit changes
- `generateCombinationKey(libraryIds, { libraryNames })` - Deterministic combination key

---

## Data Flow Summary

1. **User selects libraries** → Creates Combination
2. **Generate main prompt** → Creates Record + MAIN Prompt
3. **Generate diff prompt** → Creates DIFF Prompt
4. **Generate images** → 3-round flow with provider fallback
5. **Store variants** → ImageVariant with all file paths; optional per-language backfill via language endpoint
