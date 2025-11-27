# API Reference

## Overview

45 REST endpoints in `src/app/api/`, all Zod-validated and returning:
- Success: `{ success: true, data, message? }`
- Error: `{ success: false, error: { code, message, details? } }`

## Library Management

| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/api/libraries` | Create library from template or custom schema (auto-order, metadata recorded) |
| GET | `/api/libraries/config` | DB-driven library list (order, active flag, entry counts, structure type) |
| GET | `/api/libraries/templates` | Built-in library templates (schema + example entry) |
| POST | `/api/libraries/reorder` | Swap library order (order is unique) |
| GET | `/api/libraries/[name]` | List entries (supports search/pagination via query) |
| POST/PUT/PATCH/DELETE | `/api/libraries/[name]` | Entry CRUD + library metadata update |
| GET | `/api/libraries/[name]/[id]` | Fetch single entry |
| PUT | `/api/libraries/[name]/[id]` | Update entry |
| DELETE | `/api/libraries/[name]/[id]` | Delete entry |
| GET | `/api/libraries/[name]/stats` | Entry counts, active flag |
| GET | `/api/libraries/[name]/template` | Auto-generate entry template from existing data |
| GET | `/api/libraries/[name]/export` | Export entries JSON |
| POST | `/api/libraries/[name]/import` | Import entries JSON |
| DELETE | `/api/libraries/[name]/bulk-delete` | Delete multiple entries by ID |

Key fields: `name` (lowercase + underscores), `category` (MAIN/DIFF), `displayField`, `metadata.structureType` (standard/nested_array), generator hints via `metadata.generatorConfig`.

## Template Management

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET/POST | `/api/templates` | List/create templates (SYSTEM read-only) |
| GET/PUT/DELETE | `/api/templates/[id]` | Read/update/delete (delete only USER) |
| GET | `/api/templates/[id]/libraries` | Which libraries a template references |
| POST | `/api/templates/validate` | Syntax + variable validation |
| POST | `/api/templates/render` | Preview render with sample context |
| GET | `/api/templates/variables` | Variable list by category (MAIN/DIFF) |

## Prompt Generation & Export

| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/api/prompts/generate/main` | Generate MAIN prompt; builds context from active libraries and saves Record + MAIN prompt |
| POST | `/api/prompts/generate/diff` | Generate DIFF prompt for existing imageId; applies outfit color changes + new decorations |
| GET | `/api/prompts/variables` | Variable metadata for prompt UI |
| POST | `/api/prompts/export` | Export prompts as json/txt/zip (optional imageId filter) |

Main prompt returns `image_id`, `prompt_cn`, `library_ids`, `outfit_minor_state`, `used_decorations`; DIFF returns `diff_id`, `prompt_cn`, `new_outfit_state`, `new_decorations`.

## Combination Management

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET/POST | `/api/combinations` | Paginated list with library/template filters; create single combination (auto key) |
| POST | `/api/combinations/preview` | Preview strategy enumeration without persisting |
| POST | `/api/combinations/strategy` | Persist combinations from strategy config |
| GET/DELETE | `/api/combinations/[id]` | Load combination with records/variants; deep delete (records, prompts, variants, files) |
| DELETE | `/api/combinations/batch` | Batch delete combinations + files |
| POST | `/api/combinations/[id]/generate` | Kick off variant generation for one combination |
| POST | `/api/combinations/[id]/variants/[variantId]/language` | Stitch missing language version for an existing variant |

## Image Generation & Assets

| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/api/images/generate/single` | 3-round pipeline (MAIN → DIFF → stitch 7 languages) |
| POST | `/api/images/generate/batch` | Queue batch by mode (all/ungenerated/unimaged); supports concurrency + continueOnError |
| GET | `/api/images/generate/batch/[batchId]` | Batch status |
| GET | `/api/images/progress/[imageId]` | SSE progress stream |
| GET | `/api/images/stats` | Aggregate image stats |
| GET | `/api/images/batches` | Paginated batch history (status filter) |
| POST | `/api/images/stitch` | Re-stitch final images (Python stitcher) |

## Records & Prompts

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/records` | Paginated records; filter `status` (completed/pending) |
| DELETE | `/api/records/bulk-delete` | Delete records by IDs |

## Health, Sync & Monitoring

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/health` | Health summary (DB, providers, queue, FS, memory) |
| GET | `/api/sync/check` | 8 checkers (library config, invalid refs, prompt/image sync, combo status, field integrity, orphan, duplicate) |
| POST | `/api/sync/repair` | Auto-fix issues flagged with `canAutoRepair` |
| GET | `/api/sync/history` | Repair history |
| GET | `/api/providers/stats` | Provider usage/success |
| GET | `/api/queue/stats` | BullMQ stats |
| GET/DELETE | `/api/errors` | Query/delete error logs |
| GET | `/api/errors/stats` | Error aggregation |

## Validation Schemas

Located in `src/schemas/`: `api.schema.ts`, `prompt.schema.ts`, `template.schema.ts`, `record.schema.ts`, `combination.schema.ts` (used across routes for request validation and template previews).

## Pagination

**Request:** `?page=1&pageSize=20`

**Response:**
- `data.items` - Array of results
- `data.total` - Total count
- `data.page` - Current page
- `data.totalPages` - Total pages
