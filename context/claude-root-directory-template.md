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
2. **Load relevant CLAUDE.md files** - Get workspace-specific rules
3. **Create task list** with specific order and a todo.md file in the root

#### Phase 4: Execution
Only NOW do you start implementation:
1. **Announce plan to user** - "Based on analysis, I'll need to modify X files..."
2. **Load workspace CLAUDE.md** - `[workspace]/CLAUDE.md`
3. **Execute plan step by step** - Follow workspace-specific instructions
4. **Validate each step** - Run tests, check for errors

### Workspace Reference Table
<!-- Update this section per project -->

**Note**: These are NOT trigger keywords. They're reference categories for Phase 3 planning.

| Workspace | Common Indicators | Config File | Purpose |
|-----------|------------------|-------------|---------|
| **Frontend** | UI changes, components, styling, user interactions | `/frontend/CLAUDE.md` | Client-side development |
| **Backend** | API logic, database operations, server-side processing | `/backend/CLAUDE.md` | Server-side development |
| **Testing** | Test coverage, test files, quality assurance | `/tests/CLAUDE.md` | Test implementation |
| **Documentation** | README updates, API docs, code comments | `/docs/CLAUDE.md` | Documentation updates |
| **DevOps** | Deployment, CI/CD, Docker, infrastructure | `/devops/CLAUDE.md` | Operations and deployment |
| **Database** | Migrations, schema changes, queries | `/database/CLAUDE.md` | Database operations |

### Technology Stack
<!-- Update this section per project -->
- **Framework**: [e.g., Next.js 14, Django 4.2]
- **Language**: [e.g., TypeScript, Python 3.11]
- **Database**: [e.g., PostgreSQL 15, MongoDB]
- **Styling**: [e.g., Tailwind CSS, styled-components]
- **State Management**: [e.g., Redux, Zustand, Context API]
- **Testing**: [e.g., Jest, Pytest, Cypress]

### Project Structure
<!-- Update this section per project -->
```
/
├── src/                 # Source code
│   ├── components/      # Reusable components
│   ├── pages/          # Page components/routes
│   ├── lib/            # Utility functions
│   ├── styles/         # Global styles
│   └── types/          # TypeScript definitions
├── public/             # Static assets
├── tests/              # Test files
├── docs/               # Documentation
└── config/             # Configuration files
```

### Key Architecture Patterns
<!-- Update this section per project -->
- **Component Structure**: Atomic design (atoms → molecules → organisms)
- **State Management**: Flux pattern with centralized store
- **API Communication**: REST/GraphQL with error boundaries
- **Styling Strategy**: CSS-in-JS with theme provider
- **Error Handling**: Try-catch blocks with fallback UI
- **Performance**: Code splitting, lazy loading, memo optimization

## 💻 Development Workflow

### Setup Commands
<!-- Update this section per project -->
```bash
# Install dependencies
npm install          # or: yarn install, pnpm install

# Start development server
npm run dev          # Check package.json for exact command

# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint
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
