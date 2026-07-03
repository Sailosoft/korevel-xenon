import { z } from "zod";

// ─── Craft Formats ───────────────────────────────────────────────────────

export const BKCraftFormats = [
  "markdown",
  "html",
  "tailwind",
  "csv",
  "json",
  "imageList",
  "mermaid",
  "plain",
  "architecture",
  "agentSwarm",
  "docker",
] as const;

export const BKCraftFormatEnum = z.enum(BKCraftFormats);
export type BKCraftFormat = z.infer<typeof BKCraftFormatEnum>;

// ─── Craft Configuration ─────────────────────────────────────────────────

export const BKCraftConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Craft name is required"),
  format: BKCraftFormatEnum.default("markdown"),
  description: z.string().optional(),
  /**
   * Craft instruction sent to AI that dictates output formatting.
   * This is a strict formatting directive — no commentary, no wrapping, no questions.
   */
  instruction: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type BKCraftConfig = z.infer<typeof BKCraftConfigSchema>;

// ─── Prompt Descriptions ─────────────────────────────────────────────────

export const BKCraftFormatDescriptions: Record<BKCraftFormat, string> = {
  markdown:
    "Markdown output that is actually readable and well-structured. Use real Markdown syntax to structure the content: headings (#/##), bullet or numbered lists, bold (**...**) and italics (*...*) where helpful, and blank lines between paragraphs. Use fenced code blocks (```...```) ONLY if the user request includes code or needs a code block. Otherwise, avoid code fences. STRICTLY PROHIBITED: any meta-commentary, introductory phrases (\"Here is the result\", \"Sure, here's\", etc.), concluding remarks, follow-up questions, or any text outside the requested content. Output ONLY the pure formatted response — nothing before, nothing after.",
  html:
    "Strict HTML output. Use appropriate semantic tags (h1/h2/h3, p, ul/ol/li, strong/em, pre/code, a, etc.) and valid nesting. Do not output Markdown.",
  tailwind:
    "Output that uses Tailwind CSS utility class names for styling. Provide className strings/attributes as needed; do not output unrelated markup or explanations.",
  csv:
    "CSV output. First row must be the header. Subsequent rows must match the header column count. The craft engine will render it as a table.",
  json:
    "Readable JSON output. Produce valid JSON only. Keep it structured (objects/arrays) and use indentation where possible.",
  imageList:
    "Image list output. Include image URLs (from Pexels, Unsplash, Pixabay, Pinterest, StockSnap when possible). The craft engine will extract URLs and render a gallery.",
  mermaid:
    "Mermaid diagram code. Output ONLY the raw Mermaid diagram syntax — do NOT wrap in ```mermaid code fences or any other formatting. No explanation, no labels, no surrounding text. Just the diagram code.",
  plain:
    "Plain text output only. No Markdown code fences and no Markdown formatting syntax. Keep it readable using paragraph breaks and simple line-based structure (e.g., numbered lines like '1. ...' or short bullet-like lines). Do not wrap the text in backticks.",
  architecture:
    `Architecture document output. Generates a comprehensive Architecture.md file describing the full system architecture. No word limit — be exhaustive and detailed. Use Markdown syntax with all of the following sections (fill each completely based on the project context):

## Backend
Describe the backend architecture in full: frameworks, runtime, API design (REST/GraphQL/gRPC), authentication/authorization strategy, database layer (ORM, migrations, connection pooling), caching layer, message queues, background jobs, file storage, logging, error handling, and middleware stack. Include package names and versions where relevant.

## Frontend
Describe the frontend architecture: framework (React/Next.js/Vue/etc.), rendering strategy (SSR/SSG/ISR/CSR), state management, routing, UI component library, styling approach (CSS Modules/Tailwind/Styled Components), form handling, API client layer, internationalization, accessibility (a11y) strategy, and bundler/build tooling.

## Infrastructure
Describe the infrastructure: hosting provider, compute (VMs/containers/serverless), networking (VPC, subnets, CDN), load balancing, auto-scaling, DNS, SSL/TLS certificate management, container orchestration (Kubernetes/Nomad/Docker Compose), and any service mesh or API gateway.

## Project Structure
Provide the full directory tree of the project with annotations explaining the purpose of each top-level directory and key subdirectory. Explain the module/feature organization pattern used.

## Environment Variables
List every environment variable used across the project: name, description, type (string/number/boolean), whether it is required or optional, default value if any, and which file(s) consume it (.env, .env.local, etc.).

## CI/CD Setup
Describe the CI/CD pipeline: platform (GitHub Actions/GitLab CI/Jenkins/etc.), trigger events, build stages, test stages (unit/integration/e2e), linting/formatting checks, security scanning, artifact publishing, deployment stages (staging/production), and any approval gates. Include the CI config file path.

## PortReference
List all ports used by services in the project: service name, port number, protocol (TCP/UDP), purpose, and whether it is exposed externally or internally.

## Local Dev
Describe the local development setup: prerequisites, how to start the dev server, hot reload behavior, debugging setup (VS Code launch configs, Chrome DevTools), mock/stub services, local database setup, and any Docker Compose services for local development.

## Production
Describe the production deployment: build process, artifact creation, deployment strategy (blue-green/canary/rolling), health checks, monitoring and alerting, log aggregation, error tracking (Sentry/Datadog/etc.), backup strategy, and disaster recovery plan.

## Documentation
List all documentation sources: in-code JSDoc/TSDoc, README files, wiki, ADRs (Architecture Decision Records), API docs (Swagger/OpenAPI), Storybook, and any supplemental docs in the /docs folder.

## Feature-Level Technical
For each major feature in the project, describe: the feature name, the files involved (with paths), data models, key functions/components, API endpoints consumed/exposed, and how it integrates with other features.

## Features
A bullet list of every feature in the project with a one-line description.

## Prerequisites
List all prerequisites for working on the project: languages and runtimes (Node.js version, Python version, etc.), package managers (npm/pnpm/yarn), databases (PostgreSQL/MongoDB/Redis), cloud CLIs, and any system-level dependencies.

## LocalDevSetup
Step-by-step instructions to set up the project from a fresh clone: clone, install dependencies, configure environment variables, initialize databases, run migrations, seed data, and start the dev server. Include exact commands.

## ProductionServer
Step-by-step instructions to deploy to production: build, configure environment, run database migrations, start the server (process manager like PM2/supervisor/systemd), set up reverse proxy (Nginx/Caddy), and verify deployment.

STRICTLY PROHIBITED: any meta-commentary, introductory phrases, concluding remarks, follow-up questions, or any text outside the requested content. Output ONLY the pure formatted response — nothing before, nothing after.`,
  agentSwarm:
    `Agent Swarm document output. Generates an Agent.md file with instructions, capabilities, behavioral guidelines, and swarm coordination rules for AI agents operating within the system. No word limit — be exhaustive and detailed. Compatible with standard agentic coding conventions (CLAUDE.md, AGENTS.md). Use clear Markdown with ALL of the following sections (fill each completely based on the project context):

## Identity & Purpose
Define the agent's identity: name, role, primary objectives, and the scope of its authority. Describe what problems this agent swarm solves and when it should be invoked.

## Capabilities
List every capability the agent swarm possesses: code generation, refactoring, debugging, documentation, testing, dependency management, deployment, monitoring, etc. For each capability, describe the exact tools, APIs, or commands available and the expected output format.

## Behavioral Guidelines
Describe how the agent should behave: communication style (concise/verbose/technical), response structure, how to handle ambiguity, when to ask clarifying questions vs. make assumptions, error handling protocol, and how to report progress.

## Swarm Coordination Rules
If multiple agents operate in this swarm, define: how agents discover each other, communication protocol between agents, task delegation rules, conflict resolution, shared state management, and handoff procedures. If this is a single-agent system, describe how it interacts with external tools and services.

## File System & Project Structure Awareness
Describe the agent's knowledge of the project file structure: which directories and files it needs to read/write, conventions for file naming, import/export patterns, and any restrictions on file modifications.

## Tools & Permissions
List all tools the agent has access to (read files, write files, execute commands, search codebase, etc.) and any restrictions on their use. Describe how the agent should request additional permissions.

## Task Execution Workflow
Describe the step-by-step workflow the agent follows when given a task: analyze requirements → plan approach → search codebase → implement changes → verify → report. Include validation checkpoints at each stage.

## Quality Standards
Define the quality bar: code style (linter rules, formatting), test coverage requirements, documentation requirements, type safety, error handling standards, and performance benchmarks.

## Communication & Reporting
Describe how the agent communicates results: commit message format, PR description template, changelog entries, inline code comments, and any status reporting to human operators.

## Environment & Dependencies
Describe the runtime environment: OS, language runtime versions, package manager, installed tools, environment variables required, and any external service dependencies.

## Security & Compliance
Define security constraints: secrets handling, data privacy, access control, audit logging, and compliance requirements (GDPR/SOC2/etc.).

## Limitations & Constraints
Describe what the agent must NOT do: destructive operations without confirmation, modifying files outside scope, accessing sensitive data, making breaking API changes without approval, etc.

## Diagnostics & Troubleshooting
Describe how the agent debugs issues: log analysis patterns, common failure modes, recovery procedures, and escalation paths to human operators.

STRICTLY PROHIBITED: any meta-commentary, introductory phrases, concluding remarks, follow-up questions, or any text outside the requested content. Output ONLY the pure formatted response — nothing before, nothing after.`,
  docker:
    `Docker Compose YAML output. Generates a complete, production-ready docker-compose YAML configuration. No word limit — be exhaustive. Output clean YAML without explanatory text. The craft engine renders it in a Monaco editor with YAML syntax highlighting for review.

Include ALL of the following service categories based on the project context:

## Application Services
- Main application container (build context, Dockerfile, ports, env vars, volumes, depends_on, healthcheck)
- Reverse proxy / load balancer (Nginx, Caddy, Traefik) with SSL termination
- Static file server for assets and uploads

## Data Layer Services
- Primary database (PostgreSQL/MySQL with version, persistent volume, init scripts, backup strategy)
- Cache layer (Redis/Memcached with persistence config)
- Search engine (Elasticsearch/MeiliSearch with index volumes)
- Message queue (RabbitMQ/Redis Streams/NATS with management UI)

## Development Services
- Database admin tool (Adminer/pgAdmin/phpMyAdmin)
- Mail catcher (Mailpit/MailHog for email testing)
- Mock APIs or stub services
- Task runner (Celery/Sidekiq workers)

## Infrastructure Concerns
- Network definitions (custom bridge networks, external networks)
- Volume definitions (named volumes with driver options, bind mounts)
- Logging configuration (driver, options, max-size, max-file)
- Resource limits (CPU, memory reservations and limits per service)
- Restart policies (unless-stopped, always, on-failure)
- Environment file references (.env, .env.production)
- Service dependencies and startup ordering (depends_on with condition: service_healthy)

## Security
- Non-root user configuration per service
- Read-only root filesystem where applicable
- Secrets management (Docker secrets vs env vars)
- Network isolation between tiers (frontend cannot reach database directly)
- SSL/TLS certificate paths and renewal mechanism

## Monitoring & Observability
- Health check endpoints and intervals for each service
- Metrics export (Prometheus endpoints)
- Log aggregation setup (Loki, Grafana)
- Tracing setup (Jaeger, OpenTelemetry)

## Production Readiness
- Multi-stage build configuration reference
- Image tagging strategy (semver, git SHA, latest)
- Replica counts and scaling hints
- Rolling update configuration (update_config)
- Backup volume for databases (scheduled snapshot volume)

If certain services are not applicable, omit them. Include only YAML — no markdown, no explanation, no comments outside the YAML syntax. Use clear YAML structure with proper indentation (2 spaces).`,
};


// ─── Craft Engine Result ─────────────────────────────────────────────────

export interface BKCraftEngineResult {
  raw: string;
  parsed: string;
  format: BKCraftFormat;
  images?: Array<{ src: string; alt: string; source: string }>;
}
