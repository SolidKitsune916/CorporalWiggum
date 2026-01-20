# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-19)

**Core value:** Never lose track of running loops. When stopped, it's stopped. When running, you see them all.
**Current focus:** Phase 3 - CLI Core

## Current Position

Phase: 3 of 6 (CLI Core)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-01-20 - Completed 03-01-PLAN.md (CLI Scaffold)

Progress: [████████░░] 73%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 5.5 min
- Total execution time: 0.8 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-process-foundation | 3/3 | 24 min | 8 min |
| 02-dashboard-reliability | 4/4 | 18 min | 4.5 min |
| 03-cli-core | 1/3 | 4 min | 4 min |

**Recent Trend:**
- Last 5 plans: 02-02 (3 min), 02-03 (2 min), 02-04 (5 min), 03-01 (4 min)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- PID files stored at ~/.ralph/pids/ (user-writable, cross-project visible)
- JSON format for PID files with pid, projectId, projectPath, mode, startedAt
- ProcessRegistry wraps SessionRepository (unified interface, keeps heartbeat)
- 5 second default timeout before escalating SIGTERM to SIGKILL
- Process group kill (-pid) on Unix to terminate child processes
- Orphan detection runs at dashboard startup, auto-cleans stale entries
- Live orphans require user action via WebSocket handlers
- Reset ALL state when URL changes, not just core state (02-03)
- Reset prevLoopRunningRef to prevent false "Loop stopped" toasts (02-03)
- Optional starting/stopping flags in LoopStatus for intermediate UI states (02-01)
- LoopController emits starting:true/false and stopping:true during transitions (02-01)
- Use 200ms stabilityThreshold with 50ms poll interval for awaitWriteFinish (02-02)
- All DASH requirements verified working in integrated test (02-04)
- CLI uses standalone database access (no dashboard dependency) (03-01)
- PID file fallback in CLI for orphaned processes not in database (03-01)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-20
Stopped at: Completed 03-01-PLAN.md (CLI Scaffold)
Resume file: None
