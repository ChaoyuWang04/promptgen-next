# PromptGen Development Commands
# Usage: just <recipe> [args...]
# Run `just` or `just --list` to see available commands

# Default recipe - show available commands
default:
    @just --list --unsorted

# ============================================
# Development
# ============================================

# Start development server (Turbopack)
dev:
    npm run dev

# Build production bundle
build:
    npm run build

# Start production server
start:
    npm run start

# Install dependencies
install:
    npm install

# ============================================
# Testing
# ============================================

# Run all tests
test:
    npm run test

# Run unit tests only (Vitest)
test-unit:
    npx vitest run

# Run unit tests in watch mode
test-unit-watch:
    npx vitest

# Run E2E tests (Playwright)
test-e2e:
    npx playwright test

# Run E2E tests with UI
test-e2e-ui:
    npx playwright test --ui

# ============================================
# Database - Docker
# ============================================

# Start PostgreSQL and Redis containers
docker-up:
    docker compose up -d

# Stop containers
docker-down:
    docker compose down

# View container logs
docker-logs:
    docker compose logs -f

# Restart containers
docker-restart:
    docker compose restart

# Check container status
docker-status:
    docker compose ps

# ============================================
# Database - Atlas Migrations
# ============================================

# Show current migration status
db-status:
    atlas migrate status --env local

# Create a new migration from Prisma schema changes
db-diff name:
    atlas migrate diff {{name}} --env local

# Apply pending migrations
db-apply:
    atlas migrate apply --env local

# Dry run - show what migrations would be applied
db-apply-dry:
    atlas migrate apply --env local --dry-run

# Validate migrations
db-validate:
    atlas migrate validate --env local

# Lint migrations for issues
db-lint:
    atlas migrate lint --env local --latest 1

# Hash migrations (after manual edits)
db-hash:
    atlas migrate hash --env local

# Show schema diff between Prisma and database
db-schema-diff:
    atlas schema diff --env local --from "file://prisma/schema.prisma" --to "postgresql://promptgen:promptgen_dev_2024@localhost:5432/promptgen"  # pragma: allowlist secret

# ============================================
# Database - Prisma (ORM only)
# ============================================

# Generate Prisma Client (REQUIRED after schema changes)
prisma-generate:
    npx prisma generate

# Open Prisma Studio (database GUI)
db-studio:
    npx prisma studio

# Validate Prisma schema
prisma-validate:
    npx prisma validate

# Format Prisma schema
prisma-format:
    npx prisma format

# ============================================
# Database - Utilities
# ============================================

# Seed database with test data
db-seed:
    npx tsx prisma/seed.ts

# Reset database (DANGER: drops all data)
db-reset:
    @echo "WARNING: This will drop all data!"
    @read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
    docker compose down -v
    docker compose up -d
    @sleep 3
    just db-apply
    just db-seed

# Connect to PostgreSQL shell
db-shell:
    docker exec -it promptgen-postgres psql -U promptgen -d promptgen

# ============================================
# Code Quality
# ============================================

# Run ESLint
lint:
    npm run lint

# Run ESLint with auto-fix
lint-fix:
    npx eslint . --fix

# Format code with Prettier
format:
    npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,md}"

# Check formatting without writing
format-check:
    npx prettier --check "src/**/*.{ts,tsx,js,jsx,json,css,md}"

# TypeScript type checking
type-check:
    npx tsc --noEmit

# Run all code quality checks
check: lint type-check format-check

# ============================================
# Setup & Utilities
# ============================================

# One-command project setup (for new developers)
setup:
    @echo "Setting up PromptGen development environment..."
    @echo "1. Installing dependencies..."
    npm install
    @echo "2. Starting Docker containers..."
    docker compose up -d
    @echo "3. Waiting for database..."
    @sleep 3
    @echo "4. Applying database migrations..."
    just db-apply
    @echo "5. Generating Prisma Client..."
    just prisma-generate
    @echo "6. Seeding database..."
    just db-seed
    @echo ""
    @echo "Setup complete! Run 'just dev' to start development server."

# Clean build artifacts
clean:
    rm -rf .next
    rm -rf node_modules/.cache

# Deep clean (includes node_modules)
clean-all:
    rm -rf .next
    rm -rf node_modules
    rm -rf .turbo

# Show project info
info:
    #!/usr/bin/env bash
    echo "PromptGen Next.js Application"
    echo "=============================="
    echo "Node:       $(node --version)"
    echo "npm:        $(npm --version)"
    echo "Just:       $(just --version)"
    echo "Atlas:      $(atlas version 2>/dev/null | head -1 || echo 'not installed')"
    echo ""
    echo "Database:   postgresql://promptgen:***@localhost:5432/promptgen"
    echo ""
    docker compose ps 2>/dev/null || echo "Docker containers: Not running"

# ============================================
# Migration from Prisma Migrate (One-time)
# ============================================

# Initialize Atlas from existing database (run once)
atlas-init:
    @echo "Initializing Atlas migration directory..."
    @mkdir -p atlas/migrations
    @echo "Creating baseline migration from current database state..."
    atlas migrate diff baseline --env local
    @echo "Done! Atlas is now managing your migrations."
    @echo ""
    @echo "IMPORTANT: You can now delete prisma/migrations/ directory"
    @echo "but keep it for reference during transition."
