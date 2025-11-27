# Product Requirements Document

## Overview

PromptGen is an AI-powered prompt generation and image creation system. It combines reusable library elements with customizable templates to generate prompts, then uses AI providers to create and stitch images with multilingual overlays.

---

## Core Features

### 1. Library Management

Manage reusable data libraries (current snapshot: character, pose, scene, theme, style, decorative_prop). Libraries are DB-driven, can be created from templates or custom schemas.

**Capabilities:** create/edit/delete libraries and entries, configure schema/display field/order/required flag, import/export JSON, auto-generate entry templates, view library templates, reorder libraries.

### 2. Template System

Two categories: MAIN (initial prompt) and DIFF (variation prompt). Types: SYSTEM (read-only) and USER (editable).

**Tooling:** Monaco editor, autocomplete from `/api/templates/variables`, preview render, template validation, dependency discovery (referenced libraries).

### 3. Prompt Generation

**Main Prompt:**
- Select entries from required libraries (driven by DB `isRequired`)
- Render template with library context
- Output prompt (Chinese primary; English placeholder)
- Track outfit state + decorations for diff generation

**Diff Prompt:**
- Based on existing MAIN record
- Generates 3 outfit color changes (metadata-driven outfit field)
- Picks 8–9 decorations from theme/scene (metadata-driven decoration fields)
- Updates Record outfit/decoration state

### 4. Image Generation

3-round flow: MAIN → DIFF (same provider, context image) → stitch 7 language variants. Python stitcher can backfill individual language files on demand. Providers managed via fallback chain (`IMAGE_PROVIDERS`), currently Gemini + ByteDance.

### 5. Combination Management

Combination = library selections + optional templates; generates deterministic combinationKey and imageIds. Strategy generation enumerates Cartesian products; preview before persist; supports batch delete and per-combination variant/language stitching.

### 6. Batch Processing

Batch generation modes: all / ungenerated / unimaged with configurable concurrency and continue-on-error. Tracks ImageBatch record; progress via SSE + batch status endpoint.

---

## User Workflows

### Create New Images

1. Configure libraries (from template or custom schema) and entries.
2. Author MAIN/DIFF templates (preview + validate).
3. Build combinations (manual or strategy).
4. Generate MAIN prompt (and DIFF when needed).
5. Trigger image generation (single or batch) with provider fallback.
6. Stitch language variants; optionally backfill per language.
7. Export prompts as JSON/TXT/ZIP if needed.

### Batch Operations

1. **Filter Combinations** - Select by library entries or status
2. **Choose Mode** - All, ungenerated, or unimaged
3. **Start Batch** - Queue jobs for processing
4. **Monitor Progress** - Track via status page

---

## System Constraints

### Required Libraries

5 libraries must be selected for main prompt generation:
- character
- pose
- scene
- theme
- style

### Image Output

| Setting | Value |
|---------|-------|
| Aspect Ratio | 9:16 |
| Languages | 7 (en, fr, ja, ko, de, es, zh) |
| Versions | Multiple per combination |

### Provider Requirements

- Round 2 must use same provider as Round 1
- Provider fallback on failure
- Attempt tracking for analytics

---

## Status Monitoring

**Health Checks:**
- Database connectivity
- Provider availability
- Queue status
- File system
- Memory usage
- Sync checkers (library config, invalid refs, prompt/image sync, combo status, field integrity, orphan, duplicate)

**Sync Verification:**
- Auto repair for flagged issues via `/api/sync/repair`

---

## Future Considerations

- English prompt translation
- Persisted settings UI
- Additional AI providers
- Custom stitching layouts
- Auth/roles for admin tooling
