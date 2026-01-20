# External Integrations

**Analysis Date:** 2026-01-19

## APIs & External Services

**Claude AI:**
- Primary integration - orchestrates AI-powered development
- Client: `claude` CLI (spawned via `child_process`)
- Auth: Requires authenticated Claude CLI
- Usage: Plan generation, PRD generation, code reviews, troubleshooting
- Files: `dashboard/server/loopController.ts`, `dashboard/server/planGenerator.ts`, `dashboard/server/prdGenerator.ts`

**GitHub:**
- Service: GitHub API via `gh` CLI
- Client: `dashboard/server/integrations/githubService.ts`
- Auth: Requires authenticated `gh` CLI
- Features: PR management, issue management, repo info, workflow runs
- Usage: Optional integration for repository operations

**Sentry:**
- Service: Error tracking and performance monitoring
- SDKs: `@sentry/node` (backend), `@sentry/react` (frontend)
- Auth: `SENTRY_DSN` environment variable
- Files: `dashboard/server/lib/sentry.ts`
- Mode: Disabled in development by default

## Data Storage

**Databases:**
- SQLite via `better-sqlite3`
- Location: `~/.ralph/ralph.db`
- Client: `dashboard/server/database/index.ts`
- Schema:
  - `projects` - Registered project registry
  - `execution_history` - Loop execution records
  - `active_sessions` - Browser refresh resilience
  - `user_preferences` - Settings storage
  - `iteration_telemetry` - Per-iteration metrics
  - `schema_version` - Migration tracking
- Features: WAL mode, foreign keys enabled

**File Storage:**
- Local filesystem for all operations
- Session logs: `logs/session-{timestamp}.log`
- Ralph directory: `~/.ralph/`
- Project files: IMPLEMENTATION_PLAN.md, PRD.md, prd.json, etc.

**Caching:**
- External repo content cached locally
- Implementation: `dashboard/server/externalRepos/cache.ts`
- TTL configurable per-repo

## Authentication & Identity

**Auth Provider:**
- No user authentication (local tool)
- External auth delegated to CLI tools (claude, gh)

**Implementation:**
- Claude CLI: Pre-authenticated via Anthropic
- GitHub CLI: Pre-authenticated via `gh auth login`
- GitHub Token: Optional for external repos (`dashboard/server/externalRepos/mcpConfigManager.ts`)

## Monitoring & Observability

**Error Tracking:**
- Sentry (optional, production only)
- File: `dashboard/server/lib/sentry.ts`
- Captures: Exceptions, messages, breadcrumbs, user context

**Logging:**
- Custom logger: `dashboard/server/lib/logger.ts`
- Levels: debug, info, warn, error, fatal
- Output: Console with timestamps

**Metrics:**
- Custom metrics: `dashboard/server/lib/metrics.ts`
- Tracks: WebSocket connections, message counts
- In-memory only (no external metrics service)

**Health Monitoring:**
- `dashboard/server/healthMonitor.ts`
- Tracks: Session health, iteration progress
- Detects: Stuck loops, consecutive failures

**Alerts:**
- `dashboard/server/lib/alerts.ts`
- Channels: Console, webhook, Slack, Discord
- Severities: low, medium, high, critical

## Notifications

**Discord:**
- Webhook-based notifications
- File: `dashboard/server/integrations/discordNotifier.ts`
- Auth: Webhook URL configuration
- Features: Rich embeds, severity colors

**Slack:**
- Incoming webhook notifications
- File: `dashboard/server/integrations/slackNotifier.ts`
- Auth: Webhook URL configuration
- Features: Block-based messages, metadata fields

**Generic Webhooks:**
- Customizable webhook manager
- File: `dashboard/server/integrations/webhookManager.ts`
- Methods: GET, POST, PUT
- Features: Event filtering, broadcast support

**Notification Service:**
- Unified notification facade
- File: `dashboard/server/integrations/notificationService.ts`
- Coordinates: Discord, Slack, webhooks

## CI/CD & Deployment

**Hosting:**
- Local development only
- No cloud deployment configured

**CI Pipeline:**
- GitHub Actions available (`.github/` directory exists)
- Details not analyzed in tech focus

## External Repositories

**Feature:** Import context from external GitHub repos
- Files: `dashboard/server/externalRepos/`
- Components:
  - `manager.ts` - Repo registration and config
  - `fetcher.ts` - Content fetching strategies
  - `cache.ts` - Local caching layer
  - `contextBuilder.ts` - Context aggregation
  - `mcpConfigManager.ts` - MCP/token management
- Fetch strategies: full, sparse, specific paths
- Auth: Optional GitHub token for private repos

## Environment Configuration

**Required env vars:**
- None strictly required (uses defaults)

**Optional env vars:**
- `PROJECT_PATH` - Override auto-detected project path
- `PORT` - Backend server port (default: 3001)
- `VITE_PORT` - Frontend dev server port (default: 5173)
- `COST_LIMIT` - Claude API cost limit (default: 50)
- `MAX_RUNTIME` - Max execution time in seconds (default: 14400)
- `SENTRY_DSN` - Sentry error tracking
- `CLAUDE_MODEL_FLAG` - Enable model selection flag
- `COMPLETION_PROMISE` - Completion signal string

**Secrets location:**
- Environment variables
- Claude CLI: Uses system keychain/config
- GitHub CLI: Uses `gh` credential store
- GitHub token: Stored via mcpConfigManager

## WebSocket Communication

**Server:**
- Path: `/ws`
- Library: `ws` ^8.19.0
- File: `dashboard/server/index.ts`

**Message Types (selected):**
- `loop:start`, `loop:stop`, `loop:status` - Loop control
- `plan:generate`, `plan:cancel` - Planning
- `prd:generate`, `prd:cancel` - PRD generation
- `config:read`, `config:write` - File management
- `launcher:*` - Multi-project management
- `review:*` - Code review features
- `external-repos:*` - External repo management
- `logs:*` - Log management
- `ports:*` - Port scanning/killing
- `troubleshoot:*` - Error diagnosis
- `stories:*` - PRD to prd.json conversion
- `prd-interview:*` - Interactive PRD generation

## Webhooks & Callbacks

**Incoming:**
- None (local tool, no external webhooks)

**Outgoing:**
- Discord notifications
- Slack notifications
- Generic webhooks
- All configurable via webhook manager

---

*Integration audit: 2026-01-19*
