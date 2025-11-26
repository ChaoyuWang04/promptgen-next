# Backend Architecture

## Overview

Business logic layer in `src/lib/` providing template rendering, prompt generation, AI provider integration, and image processing.

---

## Template Engine

Located in `src/lib/engines/`

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

---

## Prompt Generation

Located in `src/lib/generators/`

### Main Prompt Generator

Generates initial image prompt from library selections.

**Flow:**
1. Load 5 required libraries (character, pose, scene, theme, style)
2. Build template context from library entries
3. Render template using TemplateEngine
4. Extract outfit_minor_state for diff generation
5. Extract used_decorations from theme
6. Generate unique imageId
7. Save Record + MAIN Prompt to database

### Diff Prompt Generator

Generates difference prompt for variation images.

**Flow:**
1. Load existing Record with main prompt data
2. Generate 3 random outfit color changes
3. Select 8-9 decorations (prioritizing high-priority items)
4. Build diff context with changes
5. Render diff template
6. Save DIFF Prompt + update Record

---

## AI Providers

Located in `src/lib/providers/`

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

**Note:** ByteDance Round 2 uses saved URL from Round 1 as context.

### Provider Manager

Handles fallback chain and attempt tracking.

- **Fallback Order:** Gemini → ByteDance
- **Attempt Tracking:** Records all attempts with success/failure
- **Health Checks:** Periodic availability verification

---

## Image Generation

Located in `src/lib/generators/image-generator.ts`

### 3-Round Flow

| Round | Description | Output |
|-------|-------------|--------|
| 1 | Generate main image from main prompt | `v{N}_main.png` |
| 2 | Generate diff image using same provider + main image as context | `v{N}_diff.png` |
| 3 | Stitch final images with text overlay (7 languages) | `v{N}_final_{lang}.png` |

**Important:** Round 2 must use same provider as Round 1 for context continuity.

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

Located in `src/lib/stitcher/`

Combines main and diff images with narrative text overlay.

| Setting | Value |
|---------|-------|
| Title Size | 110px |
| Padding | 40px |
| Gap | 20px |
| Background | #ffffff |

---

## Batch Processing

Located in `src/lib/generators/batch-generator.ts`

### Workflow

1. Create ImageBatch record (PENDING)
2. For each imageId:
   - Ensure Record exists (generate MAIN prompt if needed)
   - Ensure DIFF prompt exists
3. Queue jobs to BullMQ
4. Update batch to IN_PROGRESS
5. Worker processes jobs asynchronously

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

Located in `src/lib/generators/combo-manager.ts`

Enumerates combinations from strategy configuration.

**Features:**
- Cartesian product enumeration
- Multi-select support for libraries
- Statistics: total possible, with prompts, with images
- Find ungenerated/unimaged combinations

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

Format: `{char}_{pose}_{scene}_{theme}_{style}_{sequence}`

Example: `betty_turnback_living_halloween_retro50s_0001`

### Random Utilities

- `randomSample(array, count)` - Pick N items without replacement
- `selectNewColor(current, pool)` - Pick different color from pool
- `selectRandomDecorations(theme, scene, count)` - Prioritize high-priority items

---

## Data Flow Summary

1. **User selects libraries** → Creates Combination
2. **Generate main prompt** → Creates Record + MAIN Prompt
3. **Generate diff prompt** → Creates DIFF Prompt
4. **Generate images** → 3-round flow with provider fallback
5. **Store variants** → ImageVariant with all file paths
