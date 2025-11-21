---
trigger: always_on
---

The most important thing that u need to keep in your mind:
**Remember**: Always think ultra hard and use proper mcp tools and sub-agents when needed. For requirements, always think proactively first and always articulate the reasoning process step by step—identify which parts of the existing system this new change will affect. For implementation, always analyze how we can ensure the new feature implementation integrates perfectly with the existing system and ensure the new system is robust and complete. Meanwhile, please ask me questions at any time to ensure our expectations for the system are aligned. We not only need to implement this new feature but also ensure its interaction with other system components is perfect. After implementation, please update todo.md in the root directory.

## 🎯 Core Directives

When working here:
1. **Follow instructions literally** - don't assume or improvise unless explicitly told
2. **Ask for clarification** when requirements are ambiguous
3. **Report what you're doing** before executing complex operations

## 📍 Workspace Routing System

### How Routing Works
```
User Input → Analyze Requirements → Search & Assess Current State → Create Implementation Plan → Execute in Target Workspace
```

### Routing Workflow

**CRITICAL**: This is NOT keyword-based routing. You must analyze and plan before acting.

#### Phase 1: Requirement Analysis
When receiving any task, FIRST:
1. **Identify the core requirement** - What does the user actually want to achieve?
2. **Determine scope** - Which parts of the codebase will be affected?
3. **List success criteria** - How will we know the task is complete?

#### Phase 2: Current State Assessment
Before any implementation:
1. **Create search plan** - List all files/directories that might be relevant
2. **Execute search and read files**
3. **Document current implementation**
   - What already exists?
   - What patterns are being used?
   - What can be reused?

#### Phase 3: Implementation Planning
Based on assessment, create an execution plan and then confirm with me:
1. **Identify target workspace(s)** - Where will changes be made?
2. **Load relevant files** - Get workspace-specific rules
3. **Create task list** with specific order and a todo.md file in the root

#### Phase 4: Execution
Only NOW do you start implementation:
1. **Announce plan to user** - "Based on analysis, I'll need to modify X files..."
2. **Execute plan step by step** - Follow workspace-specific instructions
3. **Validate each step** - Run tests, check for errors

### Workspace Reference Table

**Note**: This is a **monolithic project** with integrated backend and frontend. All instructions are in this root CLAUDE.md file.

| Domain | Location | Common Indicators | Purpose |
|--------|----------|-------------------|---------|
| **Backend Core** | `/src` | Prompt generation, template engine, image providers, batch processing | Python business logic modules |
| **Web Interface** | `/web` | HTML pages, vanilla JS modules, Tailwind CSS | Static frontend (no build step) |
| **Configuration** | `/config` | Library management, settings, environment variables | System configuration |
| **Testing** | `/tests` | Pytest test files, fixtures, integration tests | Test suite implementation |
| **Data Storage** | `/data`, `/records`, `/prompts`, `/images` | Generated content, library data | File-based persistence |
| **Documentation** | `/context`, `/docs` | Design principles, PRD, changelogs | Project specifications |

### Technology Stack
- **Backend Framework**: Flask 3.0.0 (Python web server)
- **Language**: Python 3.x
- **Frontend**: Vanilla JavaScript (ES6+, no framework)
- **Styling**: Tailwind CSS v4 + CSS custom properties
- **AI Providers**: Google Gemini API (`gemini-2.5-flash-image`) + ByteDance Doubao API (`doubao-seedream-4-0`)
- **Image Processing**: Pillow >= 10.0.0
- **Testing**: Pytest 7.4.3
- **State Management**: Browser localStorage + vanilla JS modules
- **API Communication**: Custom REST client with retry/timeout logic
- **Data Storage**: File-based JSON + image files (no database)

### Project Structure
```
/
├── api.py                      # Main Flask API server (entry point)
├── src/                        # Python business logic
│   ├── prompt_generator.py     # Main prompt generation (7-module system)
│   ├── diff_prompt_generator.py # Diff prompt generation
│   ├── template_engine.py      # Template rendering engine
│   ├── template_manager.py     # Template CRUD operations
│   ├── diff_template_engine.py # Diff template rendering
│   ├── image_generator.py      # Image generation orchestration
│   ├── batch_generator.py      # Batch processing coordinator
│   ├── combo_manager.py        # Library combination management
│   ├── record_generator.py     # Generation record tracking
│   ├── sync_manager.py         # Data consistency checks
│   ├── stitch_generator.py     # Multi-language image stitching
│   ├── data_loader.py          # Data loading with LRU cache
│   ├── utils.py                # Utility functions
│   └── providers/              # AI provider integrations
│       ├── base_provider.py    # Provider abstraction
│       ├── gemini_provider.py  # Google Gemini integration
│       └── bytedance_provider.py # ByteDance Doubao integration
├── web/                        # Static frontend
│   ├── index.html              # Main dashboard
│   ├── library_management.html # Library admin UI
│   ├── template_editor.html    # Prompt template editor
│   ├── diff_template_editor.html # Diff template editor
│   ├── js/                     # Vanilla JS modules (21 files)
│   │   ├── app.js              # Main app logic
│   │   ├── library-config.js   # Dynamic config loader
│   │   ├── error-manager.js    # Centralized error handling
│   │   ├── base-template-editor.js # Template editing base
│   │   └── ...                 # Additional modules
│   └── css/                    # Tailwind compiled CSS
├── config/                     # Configuration management
│   ├── settings.py             # Environment settings
│   └── library_config.py       # Dynamic library metadata
├── tests/                      # Pytest test suite
│   ├── conftest.py             # Test fixtures
│   ├── test_integration.py     # Integration tests
│   └── ...                     # Additional test files
├── context/                    # Design & specification docs
│   ├── design-principles.md    # UI/UX guidelines
│   └── prd.md                  # Product requirements (53KB)
├── data/                       # Source library data (JSON)
├── prompts/                    # Generated prompt files
├── records/                    # Generation record JSONs
├── images/                     # Generated image files
└── requirements.txt            # Python dependencies
```

### Key Architecture Patterns
- **Backend Pattern**: Modular Python with provider abstraction for AI services
- **Frontend Pattern**: Vanilla JS modules with event-driven architecture (no framework)
- **State Management**: Browser localStorage for persistence + in-memory caching (LRU)
- **API Communication**: Flask REST API serving both JSON endpoints + static files
- **Styling Strategy**: Tailwind utility classes + CSS custom properties for theming
- **Error Handling**: Centralized error-manager.js with toast notifications
- **Performance**: LRU caching (data_loader), batch processing, lazy loading, file-based storage
- **Data Storage**: File-based JSON (prompts/records) + image files (no database)
- **Multi-Provider Pattern**: Automatic fallback between Gemini → ByteDance for reliability

## 💻 Development Workflow

### Setup Commands
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start development server (Flask API + static frontend)
python api.py
# Access at http://localhost:5001 (macOS may use 5001 due to AirPlay on 5000)

# Run tests
pytest                          # Run all tests
pytest tests/test_integration.py # Run specific test file
pytest -m integration           # Run tests by marker (integration, unit, api, slow)
pytest -v                       # Verbose output
pytest -ra                      # Report summary of all test results

# No build step needed
# - Frontend: Static HTML + vanilla JS (no compilation)
# - CSS: Pre-compiled Tailwind CSS in web/css/output.css
```

## Git Workflow (Before Making Changes)

**ALWAYS execute these checks first:**

1. **Verify current branch**
   ```bash
   git branch --show-current
   ```

2. **Add unsaved file and commit with correct comment **
   ```bash
   git add .
   git commit -m "related comment to the change"
   ```

### Commit Message Format
```
type(scope): subject
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## 🐛 Debugging Instructions

### Debug Workflow

1. Error Collection : Browser errors via Chrome DevTools MCP and Playwright MCP
2. Documentation Research : Query official docs via Context7 mcp
3. Solution Planning : Create fix plan based on findings
4. User Confirmation:
**MUST present findings before fixing:**
```
Found: [error] caused by [root cause]
Official docs recommend: [solution]
I need to change: [specific changes]
May I proceed?
```
5. Implementation
Only after approval, implement fixes and verify using Chrome/Playwright tools.

## UI/UX design

### Design Principles

- Comprehensive design checklist in `/context/design-principles.md`
- Brand style guide in `/context/style-guide.md`
- When making visual (front-end, UI/UX) changes, always refer to these files for guidance

### Quick Visual Check

IMMEDIATELY after implementing any front-end change:

1. **Identify what changed** – Review the modified components/pages
2. **Navigate to affected pages** – Use `mcp__playwright__browser_navigate` to visit each changed view
3. **Verify design compliance** – Compare against `/context/design-principles.md` and `/context/style-guide.md`
4. **Validate feature implementation** – Ensure the change fulfills the user's specific request
5. **Check acceptance criteria** – Review any provided context files or requirements
6. **Capture evidence** – Take full page screenshot at desktop viewport (1440px) of each changed view
7. **Check for errors** – Run `mcp__playwright__browser_console_messages`

This verification ensures changes meet design standards and user requirements.

### Comprehensive Design Review

Invoke the `@agent-design-review` subagent for thorough design validation when:
- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing

### shadcn/ui Components

- Modern component library built on Radix UI primitives
- Components in `/src/components/ui/`
- Tailwind CSS v4 with CSS variables for theming
- Lucide React icons throughout

## ⚠️ Critical Rules

**NEVER DO THESE**:
1. ❌ Delete files without explicit permission
2. ❌ Modify core configuration without discussion
3. ❌ Commit sensitive data (passwords, API keys)
4. ❌ Force push to main branch
5. ❌ Ignore failing tests
6. ❌ Use `any` type in TypeScript without comment explaining why
7. ❌ Copy-paste code without understanding it
8. ❌ Make assumptions about business logic

**ALWAYS DO THESE**:
1. ✅ Read error messages completely before fixing
2. ✅ Test your changes locally
3. ✅ Keep commits atomic and focused
4. ✅ Update documentation when changing APIs
5. ✅ Ask for clarification when unsure
6. ✅ Report blockers immediately
7. ✅ Follow existing patterns in codebase
8. ✅ Consider edge cases and error states
