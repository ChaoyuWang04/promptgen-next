<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/ChaoyuWang04/promptgen-next">
    <h3 align="center">PromptGen</h3>
  </a>

<p align="center">
  An end-to-end prompt generation and image production system built with Next.js, Prisma, PostgreSQL, Redis, and multi-provider AI image orchestration.
  <br /><br />
  | <a href="https://github.com/ChaoyuWang04/promptgen-next">Repository</a> |
  <a href="https://github.com/ChaoyuWang04/promptgen-next/issues/new?labels=bug">Report Bug</a> |
  <a href="https://github.com/ChaoyuWang04/promptgen-next/issues/new?labels=enhancement">Request Feature</a> |
</p>

</div>


<!-- ABOUT THE PROJECT -->
## About The Project

PromptGen is a full-stack practice project for structured prompt generation, AI image generation, and multilingual image stitching. It combines reusable database-driven libraries with editable templates to generate prompts, run image generation through multiple providers, and produce final stitched assets with localized overlays.

The repository currently focuses on a dashboard-style internal workflow for managing libraries, templates, combinations, prompt generation, image generation, and system monitoring.

| Component | Description |
|--------|-------|
| Library management | Create and manage reusable libraries such as character, pose, scene, theme, style, and decorative props |
| Template system | Author and validate MAIN and DIFF templates with Monaco editor, variable discovery, and preview rendering |
| Prompt generation | Generate MAIN prompts from required library selections and DIFF prompts from existing records |
| Image pipeline | Run a 3-round flow: MAIN image, DIFF image, then stitched multilingual outputs |
| Combination management | Build deterministic combinations, preview strategy outputs, and manage generation targets |
| Batch processing | Queue async image generation jobs with BullMQ and Redis |
| Monitoring and repair | Inspect provider health, queue status, sync issues, and auto-repair eligible problems |

The current workflow in this repo is:

1. Configure reusable libraries and entries in the dashboard.
2. Create or edit MAIN and DIFF templates.
3. Build combinations manually or from generation strategies.
4. Generate MAIN and DIFF prompts from selected libraries.
5. Generate images through provider fallback orchestration.
6. Stitch final multilingual variants and monitor system status.


### Built With

[![Next.js][Next-badge]][Next-url]
[![React][React-badge]][React-url]
[![TypeScript][TypeScript-badge]][TypeScript-url]
[![Prisma][Prisma-badge]][Prisma-url]
[![PostgreSQL][PostgreSQL-badge]][PostgreSQL-url]
[![Redis][Redis-badge]][Redis-url]
[![Tailwind CSS][Tailwind-badge]][Tailwind-url]



<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

- Node.js 20+ recommended
- npm
- [just](https://github.com/casey/just)
- Docker and Docker Compose
- PostgreSQL and Redis services started through Docker
- API credentials for the image providers you want to enable

For project architecture and implementation details, see the docs in [`docs/`](./docs).

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/ChaoyuWang04/promptgen-next.git
   cd promptgen-next
   ```

2. Install dependencies
   ```sh
   just install
   ```

3. Configure environment variables
   ```sh
   cp .env.example .env
   ```

4. Start PostgreSQL and Redis
   ```sh
   just docker-up
   ```

5. Apply database migrations
   ```sh
   just db-apply
   ```

6. Generate Prisma client
   ```sh
   just prisma-generate
   ```

7. Optionally seed the database
   ```sh
   just db-seed
   ```

8. Start the development server
   ```sh
   just dev
   ```

9. Open the app
   ```sh
   http://localhost:3000
   ```

### Environment Variables

The project ships with `.env.example`. The main variables are:

```env
DATABASE_URL="postgresql://<db-user>:<db-password>@localhost:5432/promptgen_dev"

IMAGE_PROVIDERS="gemini,bytedance"

GEMINI_API_KEY="<your-gemini-api-key>"
GEMINI_MODEL="gemini-2.5-flash-image"
GEMINI_ASPECT_RATIO="9:16"
GEMINI_TIMEOUT=120000

BYTEDANCE_API_KEY="<your-bytedance-api-key>"
BYTEDANCE_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"
BYTEDANCE_MODEL="doubao-seedream-4-0-250828"
BYTEDANCE_SIZE="1440x2560"
BYTEDANCE_WATERMARK="false"
BYTEDANCE_TIMEOUT=60000

IMAGE_OUTPUT_DIR="public/images"
REQUEST_DELAY_MS=2000

REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DB=0

BULLMQ_CONCURRENCY=3
BULLMQ_MAX_RETRIES=2

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```



<!-- USAGE EXAMPLES -->
## Usage

The current product flow can be understood as six stages:

**Stage 1 - Configure data libraries**

Use the `/libraries` dashboard to define reusable libraries and entries. Libraries are database-driven and support custom schema, display fields, ordering, import/export, and template-based creation.

**Stage 2 - Author prompt templates**

Use `/templates` to create and validate MAIN and DIFF templates. The editor supports variable autocomplete, template validation, preview rendering, and dependency discovery for referenced libraries.

**Stage 3 - Create combinations**

Use `/combinations` to create generation targets from selected library entries. You can preview Cartesian-product strategies before persisting them, then batch-delete or filter combinations later.

**Stage 4 - Generate prompts**

Use `/prompts` or the corresponding APIs to generate:

- MAIN prompts from required library selections
- DIFF prompts from existing records with outfit and decoration changes

Prompt generation persists `Record` and `Prompt` data for downstream image generation.

**Stage 5 - Generate images**

The image pipeline uses a 3-round flow:

```sh
Round 1: MAIN image generation
Round 2: DIFF image generation with the same provider and context image
Round 3: Stitch final multilingual outputs
```

Supported providers currently include Gemini and ByteDance, with fallback order controlled by `IMAGE_PROVIDERS`.

**Stage 6 - Monitor and repair**

Use `/status` and the monitoring APIs to inspect:

- database and provider health
- queue status
- error logs
- data sync issues
- auto-repair candidates

### Common Commands

```sh
just dev
just build
just test
just lint
just type-check
just format
```

### Database Commands

```sh
just docker-up
just docker-down
just db-status
just db-diff "description"
just db-apply
just prisma-generate
just db-seed
just db-snapshot
```



<!-- ROADMAP -->
## Roadmap

- [x] Database-driven library management
- [x] MAIN and DIFF template authoring with validation and preview
- [x] Prompt generation for structured image workflows
- [x] Multi-provider image generation with fallback
- [x] Multilingual image stitching pipeline
- [x] Batch generation with BullMQ and Redis
- [x] Health checks, sync checks, and repair tooling
- [ ] Improve settings persistence and admin configuration flows
- [ ] Add more providers and richer generation controls
- [ ] Expand prompt export, translation, and image review workflows
- [ ] Add screenshots and visual documentation to the README

See the [open issues](https://github.com/ChaoyuWang04/promptgen-next/issues) for a full list of proposed improvements and known issues.



<!-- CONTRIBUTING -->
## Contributing

Contributions, issue reports, and improvement suggestions are welcome.

If you want to contribute:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

For local verification before opening a PR, the expected baseline is:

```sh
just build
just test
just lint
just type-check
```



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.



<!-- PROJECT DOCS -->
## Documentation

- `docs/prd.md` - product requirements and workflow scope
- `docs/frontend.md` - frontend routes, hooks, and UI patterns
- `docs/backend.md` - backend services, generators, providers, and queue flow
- `docs/api.md` - API endpoint reference
- `docs/database.md` - schema and migration workflow
- `docs/structure.md` - project structure overview
- `docs/trd.md` - technical stack and architecture decisions



<!-- MARKDOWN LINKS & IMAGES -->
[Next-badge]: https://img.shields.io/badge/Next.js-16.0.3-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React-badge]: https://img.shields.io/badge/React-19.2.0-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://react.dev/
[TypeScript-badge]: https://img.shields.io/badge/TypeScript-5.6.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Prisma-badge]: https://img.shields.io/badge/Prisma-6.0.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white
[Prisma-url]: https://www.prisma.io/
[PostgreSQL-badge]: https://img.shields.io/badge/PostgreSQL-16-316192?style=for-the-badge&logo=postgresql&logoColor=white
[PostgreSQL-url]: https://www.postgresql.org/
[Redis-badge]: https://img.shields.io/badge/Redis-5.x-DC382D?style=for-the-badge&logo=redis&logoColor=white
[Redis-url]: https://redis.io/
[Tailwind-badge]: https://img.shields.io/badge/Tailwind_CSS-3.4.15-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
