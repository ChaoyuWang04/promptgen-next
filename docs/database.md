# Database Schema

## Overview

PostgreSQL database managed via Prisma ORM with Atlas migrations. Contains 8 models and 5 enums.

---

## Models

### Combination
Central entity linking library selections to templates for generating image sets.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| combinationKey | String | Unique identifier (e.g., `betty_christmas_entrance`) |
| libraryIds | JSON | Selected library entry IDs |
| mainTemplateId | String | FK to main prompt template |
| diffTemplateId | String | FK to diff prompt template |
| strategyConfig | JSON? | Optional dynamic strategy configuration |
| createdAt/updatedAt | DateTime | Timestamps |

**Relations:** Has many Records, belongs to main/diff Templates

---

### Library
Stores reusable data libraries (character, pose, scene, theme, style, decorative_props).

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| name | String | Unique library name (kebab-case) |
| displayName | String | Human-readable name |
| description | String? | Optional description |
| displayField | String | Field to show in UI (default: "name") |
| category | LibraryCategory | MAIN or DIFF |
| order | Int | Display order |
| entries | JSON | Library entries data |
| schema | JSON? | Optional validation schema |
| isActive | Boolean | Enable/disable library |
| schemaVersion | String? | Schema version tracking |
| metadata | JSON? | Additional metadata |

---

### Record
Core generation record tracking one image ID through the generation pipeline.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| imageId | String | Unique image identifier |
| combinationId | String? | FK to Combination |
| libraryIds | JSON | Selected library entries |
| outfitMinorState | JSON? | Current outfit colors for diff generation |
| usedDecorations | JSON? | Decorations used from theme/scene |
| promptGenerated | Boolean | Main/diff prompts exist |
| imageGenerated | Boolean | Images have been generated |
| providerUsed | String? | AI provider that succeeded |
| providerAttempts | JSON? | All provider attempt records |
| latestVersion | Int | Current variant version number |

**Relations:** Belongs to Combination, has many Prompts, has many ImageVariants

---

### Prompt
Stores generated prompts (main or diff) in Chinese.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| recordId | String | FK to Record |
| type | PromptType | MAIN or DIFF |
| promptCn | String | Chinese language prompt |
| promptEn | String | English prompt (reserved) |

**Relations:** Belongs to Record

---

### ImageVariant
Tracks multiple versions per Record with file paths for all outputs.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| recordId | String | FK to Record |
| version | Int | Sequential version (1, 2, 3...) |
| imageMainPath | String? | Path to round 1 (main) image |
| imageDiffPath | String? | Path to round 2 (diff) image |
| finalImages | JSON? | Map of language codes to final image paths |
| generatedAt | DateTime? | When images were generated |

**Relations:** Belongs to Record

---

### Template
Reusable prompt templates for main and diff generation.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| name | String | Unique template name |
| description | String? | Template description |
| type | TemplateType | SYSTEM (read-only) or USER |
| category | TemplateCategory | MAIN or DIFF |
| content | String | Template content with variables |

**Relations:** Referenced by Combinations as main/diff template

---

### ImageBatch
Tracks async batch generation jobs.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| imageIds | String[] | Array of image IDs to generate |
| status | BatchStatus | PENDING, IN_PROGRESS, COMPLETED, FAILED |
| completed | Int | Count of completed images |
| failed | Int | Count of failed images |
| errorMessages | String[] | Collected error messages |
| startedAt | DateTime? | When processing started |
| completedAt | DateTime? | When processing finished |

---

### ErrorLog
Optional error tracking for debugging.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| level | String | ERROR, WARN, INFO |
| message | String | Error message |
| context | JSON? | Additional context |
| createdAt | DateTime | When error occurred |

---

## Enums

| Enum | Values | Usage |
|------|--------|-------|
| PromptType | MAIN, DIFF | Distinguishes main vs diff prompts |
| TemplateType | SYSTEM, USER | System templates are read-only |
| TemplateCategory | MAIN, DIFF | Template usage category |
| LibraryCategory | MAIN, DIFF | Library usage in main or diff templates |
| BatchStatus | PENDING, IN_PROGRESS, COMPLETED, FAILED | Batch job lifecycle |

---

## Key Relations

- **Combination** 1:N **Record** - One combination can have multiple variant records
- **Record** 1:N **Prompt** - Each record has main and diff prompts
- **Record** 1:N **ImageVariant** - Multiple versions per record (v1, v2, v3...)
- **Template** 1:N **Combination** - Templates used by many combinations

---

## Indexes

- `Combination.combinationKey` - Unique index
- `Library.name` - Unique index
- `Record.imageId` - Unique index
- `Template.name` - Unique index
- `Record.combinationId` - Foreign key index

---

## Migration Workflow

Uses Atlas for migrations with Prisma schema as source of truth:

1. Edit `prisma/schema.prisma`
2. Run `just db-diff <name>` to generate migration
3. Review SQL in `atlas/migrations/`
4. Run `just db-apply` to apply
5. Run `just prisma-generate` to update client
