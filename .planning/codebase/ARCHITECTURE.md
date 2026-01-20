# Architecture

**Analysis Date:** 2026-01-19

## Pattern Overview

**Overall:** Monorepo with CLI orchestrator + Full-Stack Web Dashboard

**Key Characteristics:**
- Bash-based loop orchestrator (`loop.sh`) drives AI-powered development sessions
- React SPA frontend with Express/WebSocket backend for real-time dashboard
- SQLite database for session persistence and project registry
- Event-driven architecture with WebSocket pub/sub for UI updates
- Service-oriented backend with domain-specific modules

## Layers

**CLI Orchestrator Layer:**
- Purpose: Execute AI development loops via Claude CLI
- Location: `/Users/samueledwards/RalphWiggumV3/loop.sh`
- Contains: Mode detection, health monitoring, iteration control, log rotation
- Depends on: Claude CLI, bash, git, project prompt files (PROMPT_*.md)
- Used by: Terminal users, dashboard LoopController

**Dashboard Frontend Layer:**
- Purpose: Real-time web UI for monitoring and controlling AI sessions
- Location: `/Users/samueledwards/RalphWiggumV3/dashboard/src/`
- Contains: React components, custom hooks, TypeScript types
- Depends on: WebSocket hook, Radix UI primitives, Tailwind CSS
- Used by: Browser clients

**Dashboard Backend Layer:**
- Purpose: API server and WebSocket broker between CLI and frontend
- Location: `/Users/samueledwards/RalphWiggumV3/dashboard/server/`
- Contains: Express routes, WebSocket handlers, domain services
- Depends on: Express, ws, better-sqlite3, chokidar (file watching)
- Used by: Frontend via WebSocket, CLI via spawned processes

**Data Persistence Layer:**
- Purpose: Store projects, sessions, execution history, preferences
- Location: `/Users/samueledwards/RalphWiggumV3/dashboard/server/database/`
- Contains: SQLite schema, repository pattern implementations
- Depends on: better-sqlite3
- Used by: Backend services

**Prompt/Template Layer:**
- Purpose: Define AI behavior for different modes
- Location: `/Users/samueledwards/RalphWiggumV3/PROMPT_*.md`
- Contains: Mode-specific prompts (build, plan, review, PRD generation)
- Depends on: Nothing (text files)
- Used by: CLI orchestrator, dashboard generators

## Data Flow

**Loop Execution Flow:**

1. User starts loop via Dashboard UI or `./loop.sh` command
2. `LoopController.start()` spawns bash subprocess running `loop.sh`
3. `loop.sh` invokes Claude CLI with mode-specific prompt
4. Claude CLI output streamed to `ralph.log`
5. `FileWatcher` monitors log/task files, emits change events
6. Backend broadcasts changes to all connected WebSocket clients
7. React UI updates via `useWebSocket` hook state changes

**WebSocket Message Flow:**

1. Client connects to `/ws` endpoint
2. Server sends initial state (loop status, tasks, git status, config)
3. Client sends commands (`loop:start`, `loop:stop`, `plan:generate`, etc.)
4. Server processes command, updates state, broadcasts to all clients
5. File changes trigger automatic broadcasts

**State Management:**
- Server maintains authoritative state in memory + SQLite
- Frontend receives state via WebSocket, stores in hook state
- No client-side persistence; state recovered from server on reconnect

## Key Abstractions

**LoopController:**
- Purpose: Manages Claude CLI subprocess lifecycle
- Examples: `/Users/samueledwards/RalphWiggumV3/dashboard/server/loopController.ts`
- Pattern: EventEmitter-based process management with session tracking

**FileWatcher:**
- Purpose: Monitor project files for changes, parse task state
- Examples: `/Users/samueledwards/RalphWiggumV3/dashboard/server/fileWatcher.ts`
- Pattern: Chokidar-based file watching with debounced event emission

**ProjectConfigManager:**
- Purpose: Read/write project configuration files
- Examples: `/Users/samueledwards/RalphWiggumV3/dashboard/server/projectConfig.ts`
- Pattern: Facade over file system operations with validation

**useWebSocket Hook:**
- Purpose: Single source of truth for all frontend state from server
- Examples: `/Users/samueledwards/RalphWiggumV3/dashboard/src/hooks/useWebSocket.ts`
- Pattern: Massive custom hook (~60KB) managing all WebSocket state and commands

**Repository Pattern:**
- Purpose: Data access abstraction for SQLite tables
- Examples: `/Users/samueledwards/RalphWiggumV3/dashboard/server/database/repositories/`
- Pattern: Singleton repositories with prepared statement caching

## Entry Points

**CLI Entry (`loop.sh`):**
- Location: `/Users/samueledwards/RalphWiggumV3/loop.sh`
- Triggers: Direct shell execution, LoopController spawn
- Responsibilities: Parse args, detect mode, run Claude CLI, handle signals

**Dashboard Server Entry:**
- Location: `/Users/samueledwards/RalphWiggumV3/dashboard/server/index.ts`
- Triggers: `npm run dev`, `tsx server/index.ts`
- Responsibilities: Initialize services, setup routes, start WebSocket server

**Dashboard Frontend Entry:**
- Location: `/Users/samueledwards/RalphWiggumV3/dashboard/src/main.tsx`
- Triggers: Browser loading Vite-served HTML
- Responsibilities: Mount React app, route to Launcher or Dashboard view

**NPM Entry:**
- Location: `/Users/samueledwards/RalphWiggumV3/package.json`
- Triggers: `npm start`, `npm run dev`
- Responsibilities: Run dependency check, start dashboard dev server

## Error Handling

**Strategy:** Defensive with graceful degradation

**Patterns:**
- Backend: try/catch with error logging via `logger.ts`, Sentry integration
- WebSocket: Error messages broadcast to clients as `*:error` events
- CLI: Exit codes, signal handling, health monitoring with alerts
- Frontend: Error states displayed inline, toast notifications for transient errors

## Cross-Cutting Concerns

**Logging:**
- Backend: Structured logging via `/Users/samueledwards/RalphWiggumV3/dashboard/server/lib/logger.ts`
- CLI: Session-based log files in `/Users/samueledwards/RalphWiggumV3/logs/`
- Metrics: Counter/gauge tracking via `/Users/samueledwards/RalphWiggumV3/dashboard/server/lib/metrics.ts`

**Validation:**
- File operations validate paths and content
- WebSocket messages type-checked via TypeScript
- Project readiness checked via existence of key files (AGENTS.md, CLAUDE.md)

**Authentication:**
- None (local-only application)
- GitHub token optional for external repo features

**Real-time Updates:**
- WebSocket-based pub/sub from server to all connected clients
- File watching via chokidar for automatic state updates

---

*Architecture analysis: 2026-01-19*
