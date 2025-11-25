### Project Structure
<!-- Update this section per project per progression-->
myapp/
├── backend/                  # Backend services ([Go/Python/Node])
│   ├── cmd/                  # Service entry points ([main.go/main.py/__main__.py])
│   │   ├── service-a/        # Example: API server
│   │   │   ├── [main.go/app.py/index.ts]
│   │   │   └── [run.sh/start.sh]
│   │   ├── service-b/        # Example: Worker/Queue processor
│   │   │   └── [main.go/worker.py/worker.ts]
│   │   └── service-c/        # Example: Scheduled jobs/Cron
│   │       └── [main.go/scheduler.py]
│   │
│   ├── internal/             # Private application code (not importable by external projects)
│   │   ├── config/           # Configuration loading ([viper/pydantic/dotenv])
│   │   ├── logger/           # Logging setup ([zap/logrus/winston/structlog])
│   │   ├── db/               # Database connection pool (🚫 no migration execution here)
│   │   │   └── [db.go/database.py/db.ts]
│   │   ├── orm/
│   │   │   ├── models/       # Data models ([structs/classes/entities])
│   │   │   └── repo/         # Repository layer (data access patterns)
│   │   ├── clients/          # External API clients (3rd party service wrappers)
│   │   ├── service/          # Business logic layer (core domain logic)
│   │   └── util/             # Utilities and helpers
│   │
│   ├── db/                   # Database schema management ([Atlas/Prisma/Alembic/TypeORM])
│   │   ├── [atlas.hcl/schema.prisma/alembic.ini/ormconfig.json]  # Config entry
│   │   ├── schema/           # Schema definitions ([*.hcl/*.prisma/*.py/migrations/])
│   │   │   ├── [00_base.hcl/schema.prisma/models.py]
│   │   │   └── [10_users.hcl/...]
│   │   ├── migrations/       # Generated migration files (auto-generated, don't edit)
│   │   └── schema.json       # Exported schema snapshot
│   │
│   ├── configs/              # Config file templates ([*.yaml/*.toml/*.env])
│   ├── [go.mod/requirements.txt/package.json]  # Dependency manifest
│   └── README.md
│
├── frontend/                 # Frontend application ([Next.js/React/Vue/Svelte])
│   ├── src/
│   │   ├── [pages/routes/app]/        # Routing
│   │   ├── components/                # UI components
│   │   ├── [server/api/lib]/          # Backend integration layer
│   │   ├── [hooks/composables]/       # Custom hooks/composables
│   │   └── styles/                    # Styling
│   ├── public/                        # Static assets
│   ├── [package.json/package.json]
│   ├── [tsconfig.json/jsconfig.json]
│   ├── [next.config.js/vite.config.ts/nuxt.config.ts]
│   └── README.md
│
├── shared/                   # Shared code between frontend/backend
│   ├── api-schema/           # API contracts ([OpenAPI/Protobuf/GraphQL schema])
│   ├── types/                # Shared type definitions
│   └── utils/                # Shared utilities
│
├── docker/                   # Container orchestration
│   ├── compose.yml           # Main Docker Compose file
│   ├── [Dockerfile.backend/Dockerfile.frontend]  # Service-specific images
│   └── env/                  # Environment-specific configs
│
├── docs/                     # Documentation
│   ├── architecture/         # System design, data models, ADRs
│   ├── api/                  # API documentation
│   └── guides/               # Development guides
│
├── scripts/                  # Utility scripts ([shell/python/node])
│   ├── db-query.sh           # Database utilities
│   └── [setup.sh/deploy.sh]  # Setup and deployment
│
├── .github/                  # CI/CD workflows
│   └── workflows/
│
├── [justfile/Makefile]       # Task runner
├── .env.example              # Environment variable template
├── .gitignore
├── CLAUDE.md                 # Project instructions for Claude
├── README.md
└── LICENSE
**Key Principles:**
- **backend/cmd/**: Each service = separate executable - **backend/internal/**: Private code (Go convention, optional for other languages) - **backend/db/**: Schema as code, migrations are generated (never manual) - **shared/**: Types/contracts shared between services - **docker/**: All container configs in one place - **Root files**: Only global configs (< 10 files)
