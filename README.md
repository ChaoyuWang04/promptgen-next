# PromptGen Next.js

Modern AI Image Generation System built with Next.js 15, React 19, and TypeScript.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: PostgreSQL + Prisma ORM
- **Validation**: Zod
- **Testing**: Vitest + Playwright
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 22+
- Docker (for PostgreSQL)

### Installation

```bash
# Install dependencies
npm install

# Start PostgreSQL
docker-compose up -d

# Run database migrations
npm run prisma:migrate

# Seed database
npm run prisma:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
npm run test:e2e

# Prisma Studio (database GUI)
npm run prisma:studio
```

## Project Status

- ✅ Phase 0: Project Initialization
- 🔄 Phase 1: Data Layer Design
- ⏳ Phase 2: Core API
- ⏳ Phase 3: UI Layer
- ⏳ Phase 4: Image Generation
- ⏳ Phase 5: Advanced Features
- ⏳ Phase 6: Testing & Deployment

## Documentation

See `/docs/refactor` for detailed architecture and migration plans.

## License

Private Project
