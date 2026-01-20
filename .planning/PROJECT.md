# Ralph Wiggum V3 — Multi-Project Control System

## What This Is

A control system for managing autonomous AI development loops across multiple local projects. Users can start, stop, monitor, and configure Ralph Wiggum loops from a central dashboard UI or CLI, with system-wide visibility into all running processes to prevent runaway loops and wasted API usage.

## Core Value

**Never lose track of running loops.** When a loop is stopped, it's stopped. When loops are running, you can see them — all of them, across all projects, from one place.

## Requirements

### Validated

<!-- Existing capabilities from the codebase -->

- ✓ Autonomous build loop via `loop.sh` with Claude CLI — existing
- ✓ Multiple execution modes (build, plan, plan-slc, plan-work, review) — existing
- ✓ React dashboard with WebSocket real-time updates — existing
- ✓ SQLite persistence for projects and sessions — existing
- ✓ File watching for task/log updates — existing
- ✓ Cost tracking and limits — existing
- ✓ Runtime limits and safety controls — existing
- ✓ Git integration (commits, branch validation) — existing
- ✓ Multi-project registration in database — existing
- ✓ VitePress documentation site — existing

### Active

<!-- What we're building -->

**Process Management (P0 — Critical)**
- [ ] System-wide process registry tracking all running loops across all projects
- [ ] Reliable loop stop that kills process and verifies termination
- [ ] Orphan process detection and cleanup on dashboard startup
- [ ] PID file management for each running loop
- [ ] Graceful shutdown with SIGTERM before SIGKILL escalation

**Launcher Page (P0 — Critical)**
- [ ] Dedicated launcher view as central hub for all projects
- [ ] Real-time status of each project (running/stopped/error)
- [ ] Start/stop controls per project with immediate feedback
- [ ] Active loop count in global header (always visible)
- [ ] Cost/runtime display per active loop

**CLI Tool (P0 — Critical)**
- [ ] `ralph status` — show all running loops system-wide
- [ ] `ralph start <project> [mode]` — start a loop on a project
- [ ] `ralph stop <project>` — stop a loop with verified termination
- [ ] `ralph stop --all` — stop all running loops
- [ ] `ralph attach <project>` — stream live output from running loop
- [ ] `ralph list` — list all registered projects
- [ ] `ralph logs <project>` — tail recent logs

**Dashboard Fixes (P0 — Critical)**
- [ ] Fix unreliable loop start/stop (process not actually starting/stopping)
- [ ] Fix task list not updating (file watcher or WebSocket issue)
- [ ] Fix project switching (navigation state management)

**Sub-agent Observability (P1 — High)**
- [ ] Track sub-agent spawns per iteration
- [ ] Display sub-agent count and cost breakdown in telemetry
- [ ] Alert when sub-agent spawning exceeds threshold
- [ ] Session summary showing total sub-agents spawned

**Scriptability (P1 — High)**
- [ ] Exit codes from CLI for scripting (0=success, non-zero=error)
- [ ] JSON output mode for `ralph status` and `ralph list`
- [ ] Configurable auto-stop after completion (for overnight runs)
- [ ] Webhook notifications on loop completion/failure

### Out of Scope

- Cloud/remote deployment — local-only tool
- Multi-user authentication — single user system
- Mobile app — desktop/terminal only
- Plugin marketplace — not needed for core value
- Containerization — adds complexity without benefit for local tool

## Context

**Current State:**
- Dashboard exists but has reliability issues with loop start/stop
- Task list sometimes doesn't reflect actual file state
- Project switching in multi-project view is broken
- No system-wide process registry — loops can become orphaned
- No CLI interface for terminal-based control
- No visibility into sub-agent spawning behavior

**Technical Environment:**
- React 19 + Express + WebSocket (existing dashboard)
- SQLite via better-sqlite3 (existing persistence)
- Bash `loop.sh` orchestrator (existing execution engine)
- Node.js 18+ / TypeScript 5.9
- Claude CLI for AI execution

**Key Files:**
- `dashboard/server/loopController.ts` — loop process management
- `dashboard/server/fileWatcher.ts` — file change detection
- `dashboard/src/hooks/useWebSocket.ts` — frontend state management
- `dashboard/server/database/` — SQLite repositories
- `loop.sh` — main execution script

## Constraints

- **CLI**: Must use Claude CLI (not direct API) — user preference
- **Local**: No external services, runs entirely on user's machine
- **Existing Stack**: Build on React/Express/SQLite stack, no framework changes
- **Bash Orchestrator**: Keep `loop.sh` as execution engine, don't rewrite in Node

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PID file for process tracking | Reliable way to verify process state across restarts | — Pending |
| CLI as separate Node script | Can share code with dashboard server, consistent behavior | — Pending |
| SQLite for process registry | Already using SQLite, single source of truth | — Pending |

---
*Last updated: 2026-01-19 after initialization*
