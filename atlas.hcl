# Atlas Configuration for PromptGen
# Uses Prisma schema as source of truth via external data source
# Documentation: https://atlasgo.io/guides/orms/prisma

# External data source for Prisma schema
data "external_schema" "prisma" {
  program = [
    "npx",
    "prisma",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel", "prisma/schema.prisma",
    "--script"
  ]
}

# Environment: Development (Local)
env "local" {
  # Source of truth: Prisma schema via external data source
  src = data.external_schema.prisma.url

  # Database connection (local dev only)
  url = "postgresql://promptgen:promptgen_dev_2024@localhost:5432/promptgen?sslmode=disable"  # pragma: allowlist secret

  # Migration directory
  migration {
    dir = "file://atlas/migrations"
  }

  # Development database for diff operations (uses Docker)
  dev = "docker://postgres/16/dev?search_path=public"
}

# Environment: Production (configure via env vars)
env "prod" {
  src = data.external_schema.prisma.url
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://atlas/migrations"
  }
}

# Environment: CI (for automated testing)
env "ci" {
  src = data.external_schema.prisma.url
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://atlas/migrations"
  }

  # Use ephemeral database for CI
  dev = "docker://postgres/16/dev?search_path=public"
}

# Lint configuration
lint {
  # Prevent destructive changes without explicit approval
  destructive {
    error = true
  }

  # Warn about data-dependent changes
  data_depend {
    error = true
  }
}
