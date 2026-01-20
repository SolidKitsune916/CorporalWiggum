# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-19)

**Core value:** Never lose track of running loops. When stopped, it's stopped. When running, you see them all.
**Current focus:** Phase 2 - Dashboard Reliability

## Current Position

Phase: 2 of 6 (Dashboard Reliability)
Plan: 3 of 4 in current phase (02-01, 02-02, 02-03 complete)
Status: In progress
Last activity: 2026-01-20 - Completed 02-02-PLAN.md (Task List File Watching)

Progress: [██████░░░░] 60%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 6 min
- Total execution time: 0.65 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-process-foundation | 3/3 | 24 min | 8 min |
| 02-dashboard-reliability | 3/4 | 13 min | 4 min |

**Recent Trend:**
- Last 5 plans: 01-03 (4 min), 02-03 (2 min), 02-01 (8 min), 02-02 (3 min)
- Trend: Improving

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-20
Stopped at: Completed 02-02-PLAN.md (Task List File Watching)
Resume file: None
