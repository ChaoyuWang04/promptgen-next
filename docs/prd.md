# Product Requirements Document

## Overview

PromptGen is an AI-powered prompt generation and image creation system. It combines reusable library elements with customizable templates to generate bilingual prompts, then uses AI providers to create and process images with multi-language text overlays.

---

## Core Features

### 1. Library Management

Manage 6 types of reusable data libraries:

| Library | Category | Purpose |
|---------|----------|---------|
| character | MAIN | Character definitions (appearance, outfit, colors) |
| pose | MAIN | Body positions and expressions |
| scene | MAIN | Environment settings |
| theme | MAIN | Theme elements (mood, decorations, colors) |
| style | MAIN | Visual style parameters |
| decorative_props | DIFF | Decorations for diff generation |

**Capabilities:**
- Create, edit, delete library entries
- Configure display fields and schemas
- Bulk import/export

### 2. Template System

Two template categories:

| Category | Purpose |
|----------|---------|
| MAIN | Generate initial image prompts |
| DIFF | Generate variation prompts with changes |

**Template Types:**
- SYSTEM - Built-in, read-only
- USER - Custom, editable

**Syntax:**
- Direct field access: `{{character.name}}`
- Filters: `{{field | join: ', '}}`

### 3. Prompt Generation

**Main Prompt:**
- Select entries from 5 required libraries
- Render template with selections
- Output bilingual prompt (Chinese primary)
- Track outfit state for diff generation

**Diff Prompt:**
- Based on existing main prompt
- Automatically generate 3 outfit color changes
- Select 8-9 decorations from theme/scene
- Track changes for image generation

### 4. Image Generation

**3-Round Flow:**

| Round | Description | Output |
|-------|-------------|--------|
| 1 | Generate main image from main prompt | Main image |
| 2 | Generate diff image using main as context | Diff image |
| 3 | Stitch final images with text overlay | 7 language variants |

**Supported Languages:**
- English, French, Japanese, Korean, German, Spanish, Chinese

**AI Providers:**
- Gemini (primary)
- ByteDance (fallback)

### 5. Combination Management

**Combination:**
- Unique set of library selections + templates
- Generates unique imageId
- Can have multiple variant versions

**Strategy Generation:**
- Multi-select library entries
- Enumerate Cartesian product
- Batch create combinations

### 6. Batch Processing

**Modes:**
- All - Generate everything
- Ungenerated - Only prompts pending
- Unimaged - Only images pending

**Features:**
- Async queue-based processing
- Progress tracking via SSE
- Configurable concurrency
- Error handling with continue option

---

## User Workflows

### Create New Images

1. **Setup Libraries** - Add character, pose, scene, theme, style entries
2. **Create Templates** - Define main and diff templates
3. **Generate Combinations** - Use strategy wizard to enumerate combinations
4. **Generate Prompts** - Create main and diff prompts for combinations
5. **Generate Images** - Run 3-round image generation
6. **Review Results** - View generated images with language variants

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

**Sync Verification:**
- Library configuration
- Prompt existence
- Image file integrity
- Record relationships
- Orphan detection

---

## Future Considerations

- English prompt translation
- Additional AI providers
- Custom stitching layouts
- Export/import workflows
- User authentication
