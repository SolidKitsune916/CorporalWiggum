# Ralph Wiggum V3 — Multi-Project Control System

## What This Is

A control system for managing autonomous AI development loops across multiple local projects. Users can start, stop, monitor, and configure Ralph Wiggum loops from a central dashboard UI or CLI, with system-wide visibility into all running processes, sub-agent tracking, and scriptability for automation.

## Core Value

**Never lose track of running loops.** When a loop is stopped, it's stopped. When loops are running, you can see them — all of them, across all projects, from one place.

## Requirements

### Validated

<!-- v1.0 shipped 2026-01-20 -->

**Process Management — v1.0**
- ✓ System-wide process registry tracking all running loops across all projects
- ✓ Reliable loop stop that kills process and verifies termination
- ✓ Orphan process detection and cleanup on dashboard startup
- ✓ PID file management for each running loop (~/.ralph/pids/)
- ✓ Graceful shutdown with SIGTERM before SIGKILL escalation

**Dashboard — v1.0**
- ✓ Autonomous build loop via `loop.sh` with Claude CLI
- ✓ Multiple execution modes (build, plan, plan-slc, plan-work, review)
- ✓ React dashboard with WebSocket real-time updates
- ✓ SQLite persistence for projects and sessions
- ✓ File watching for task/log updates with debouncing
- ✓ Cost tracking and limits
- ✓ Runtime limits and safety controls
- ✓ Git integration (commits, branch validation)
- ✓ Multi-project registration in database
- ✓ VitePress documentation site
- ✓ Reliable start/stop with intermediate UI states
- ✓ Project switching with clean state reset

**Launcher Hub — v1.0**
- ✓ Dedicated launcher view as central hub for all projects
- ✓ Real-time status of each project (running/stopped/error)
- ✓ Start/stop controls per project with immediate feedback
- ✓ Active loop count in global header (always visible)
- ✓ Cost/runtime display per active loop

**CLI Tool — v1.0**
- ✓ `ralph status` — show all running loops system-wide
- ✓ `ralph start <project> [mode]` — start a loop on a project
- ✓ `ralph stop <project>` — stop a loop with verified termination
- ✓ `ralph stop --all` — stop all running loops
- ✓ `ralph attach <project>` — stream live output from running loop
- ✓ `ralph list` — list all registered projects
- ✓ `ralph logs <project>` — tail recent logs
- ✓ `ralph watch <project>` — wait for completion signal

**Sub-agent Observability — v1.0**
- ✓ Track sub-agent spawns per iteration
- ✓ Display sub-agent count and cost breakdown in telemetry
- ✓ Alert when sub-agent spawning exceeds threshold
- ✓ Session summary showing total sub-agents spawned

**Scriptability — v1.0**
- ✓ Exit codes from CLI for scripting (0=success, non-zero=error)
- ✓ JSON output mode for `ralph status --json` and `ralph list --json`
- ✓ Auto-stop via `ralph watch` when completion signal detected
- ✓ Webhook notifications on loop completion/failure

### Active

<!-- v1.1+ candidates -->

**Advanced Features (P2 — Nice to Have)**
- Web-based terminal emulator in dashboard for CLI access
- Loop scheduling (start at specific time)
- Project templates for quick initialization
- Cost forecasting based on task complexity

### Out of Scope

- Cloud/remote deployment — local-only tool
- Multi-user authentication — single user system
- Mobile app — desktop/terminal only
- Plugin marketplace — not needed for core value
- Containerization — adds complexity without benefit for local tool

## Context

**Current State (v1.0 shipped 2026-01-20):**
- Full process management with PID files, registry, orphan detection
- Reliable dashboard with start/stop confirmation and file watching
- Complete CLI tool with 8 commands
- Launcher hub with live status, cost, and elapsed time
- Sub-agent tracking with warnings and session summaries
- Scriptability with exit codes, JSON output, watch command, webhooks

**Technical Environment:**
- React 19 + Express + WebSocket (dashboard)
- SQLite via better-sqlite3 (persistence)
- Bash `loop.sh` orchestrator (execution engine)
- Node.js 18+ / TypeScript 5.9
- Claude CLI for AI execution
- Commander.js CLI framework

**Key Files:**
- `dashboard/server/loopController.ts` — loop process management
- `dashboard/server/processManager/` — PID files, registry, shutdown
- `dashboard/server/fileWatcher.ts` — file change detection
- `dashboard/src/hooks/useWebSocket.ts` — frontend state management
- `dashboard/server/database/` — SQLite repositories
- `cli/src/ralph.ts` — CLI entry point
- `cli/src/commands/` — CLI command implementations
- `loop.sh` — main execution script

## Constraints

- **CLI**: Must use Claude CLI (not direct API) — user preference
- **Local**: No external services, runs entirely on user's machine
- **Existing Stack**: Build on React/Express/SQLite stack, no framework changes
- **Bash Orchestrator**: Keep `loop.sh` as execution engine, don't rewrite in Node

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PID files at ~/.ralph/pids/ | User-writable, cross-project visible | ✓ Good |
| JSON format for PID files | Machine-readable, extensible | ✓ Good |
| ProcessRegistry wraps SessionRepository | Unified interface, keeps heartbeat | ✓ Good |
| 5s SIGTERM timeout before SIGKILL | Balance responsiveness with grace period | ✓ Good |
| CLI standalone database access | No dashboard dependency | ✓ Good |
| CLI daemon mode (detached, stdio:ignore) | CLI can exit after spawn | ✓ Good |
| Sub-agent detection via Task tool_use | Claude Code pattern, visible in stream-json | ✓ Good |
| Exit codes: 0/1/2/64/65 | Unix conventions, specific error codes | ✓ Good |
| Fire-and-forget webhooks | Don't block commands on HTTP | ✓ Good |
| Session enrichment per listInstances() | Acceptable for infrequent launcher requests | ✓ Good |

---
*Last updated: 2026-01-20 after v1.0 milestone*
