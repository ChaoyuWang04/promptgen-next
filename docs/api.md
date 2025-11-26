# API Reference

## Overview

43 RESTful API endpoints organized in `src/app/api/`. All endpoints use Zod validation and return unified response format.

### Response Format

**Success:** `{ success: true, data: {...}, message?: string }`

**Error:** `{ success: false, error: { code: string, message: string, details?: any } }`

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| VALIDATION_ERROR | 400 | Invalid request body/params |
| NOT_FOUND | 404 | Resource doesn't exist |
| CONFLICT | 409 | Resource already exists |
| INTERNAL_ERROR | 500 | Server error |

---

## Library Management (10 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/libraries` | Create new library |
| GET | `/api/libraries/config` | Get all library configurations |
| GET | `/api/libraries/[name]` | Get library entries |
| POST | `/api/libraries/[name]` | Create entry in library |
| PUT | `/api/libraries/[name]` | Replace all entries |
| PATCH | `/api/libraries/[name]` | Update library metadata |
| DELETE | `/api/libraries/[name]` | Delete library |
| GET | `/api/libraries/[name]/[id]` | Get single entry |
| PUT | `/api/libraries/[name]/[id]` | Update entry |
| DELETE | `/api/libraries/[name]/[id]` | Delete entry |

**Key Fields:**
- `name` - Unique kebab-case identifier
- `displayName` - Human-readable name
- `category` - MAIN or DIFF
- `entries` - JSON data for library elements

---

## Template Management (7 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List templates (filter by type/category) |
| POST | `/api/templates` | Create template |
| GET | `/api/templates/[id]` | Get template |
| PUT | `/api/templates/[id]` | Update template |
| DELETE | `/api/templates/[id]` | Delete template (USER only) |
| GET | `/api/templates/[id]/libraries` | Get template dependencies |
| POST | `/api/templates/validate` | Validate template content |
| POST | `/api/templates/render` | Preview template rendering |
| GET | `/api/templates/variables` | List available variables |

**Constraints:**
- SYSTEM templates are read-only
- Category must be MAIN or DIFF
- Name must be unique

---

## Prompt Generation (3 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/prompts/generate/main` | Generate main prompt |
| POST | `/api/prompts/generate/diff` | Generate diff prompt |
| GET | `/api/prompts/variables` | Get template variables |

### Generate Main Prompt

**Required:** library_ids with character, pose, scene, theme, style

**Returns:** imageId, promptCn, promptEn, outfit_minor_state, used_decorations

### Generate Diff Prompt

**Required:** image_id (existing record)

**Returns:** diff_id, promptCn, promptEn, new_outfit_state, new_decorations

---

## Combination Management (8 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/combinations` | List combinations (paginated, filterable) |
| POST | `/api/combinations` | Create single combination |
| POST | `/api/combinations/strategy` | Generate combinations from strategy |
| POST | `/api/combinations/preview` | Preview strategy results |
| GET | `/api/combinations/[id]` | Get combination with records |
| PUT | `/api/combinations/[id]` | Update combination |
| DELETE | `/api/combinations/[id]` | Delete combination |
| DELETE | `/api/combinations/batch` | Batch delete combinations |
| POST | `/api/combinations/[id]/generate` | Generate variant for combination |

### Strategy Generation (v2)

**Request:**
- mainTemplateId, diffTemplateId - Template references
- strategyConfig - Map of library names to entry ID arrays

**Process:** Enumerates Cartesian product of selections, creates combinations, generates imageIds

---

## Image Generation (5 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/images/generate/single` | Generate single image (all rounds) |
| POST | `/api/images/generate/batch` | Start batch generation |
| GET | `/api/images/generate/batch/[batchId]` | Get batch status |
| GET | `/api/images/progress/[imageId]` | SSE progress stream |
| GET | `/api/images/stats` | Image generation statistics |

### Single Generation

**Request:** imageId, languageIds (optional, default all 7)

**Process:** 3-round flow (main → diff → stitch)

### Batch Generation

**Modes:**
- `all` - Generate all matching combinations
- `ungenerated` - Only prompts pending
- `unimaged` - Only images pending

**Options:** concurrency (1-5), continueOnError

---

## Record Management (2 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/records` | List records (paginated) |
| DELETE | `/api/records/bulk-delete` | Bulk delete records |

**Query Params:**
- page, limit - Pagination
- status - Filter by completed/pending

---

## Health & Monitoring (7 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health check |
| GET | `/api/sync/check` | Check data sync issues |
| POST | `/api/sync/repair` | Repair sync issues |
| GET | `/api/sync/history` | Sync repair history |
| GET | `/api/providers/stats` | Provider usage statistics |
| GET | `/api/queue/stats` | Queue statistics |
| GET | `/api/errors` | Query error logs |
| DELETE | `/api/errors` | Delete error logs |
| GET | `/api/errors/stats` | Error statistics |

### Health Check Response

**Status:** HEALTHY (200), DEGRADED (207), UNHEALTHY (503)

**Components checked:**
- Database connectivity
- Provider availability (Gemini, ByteDance)
- Queue status
- File system
- Memory usage

### Sync Checkers

8 checkers run in parallel:
- LibraryConfig, InvalidRefs, PromptSync, ImageSync
- ComboStatus, FieldIntegrity, Orphan, Duplicate

---

## Validation Schemas

Located in `src/schemas/`

| File | Purpose |
|------|---------|
| api.schema.ts | Request/response validation |
| prompt.schema.ts | Prompt data structures |
| template.schema.ts | Template validation |
| record.schema.ts | Record and variant schemas |
| combination.schema.ts | Combination and strategy schemas |

---

## Pagination

**Request:** `?page=1&pageSize=20`

**Response:**
- `data.items` - Array of results
- `data.total` - Total count
- `data.page` - Current page
- `data.totalPages` - Total pages
