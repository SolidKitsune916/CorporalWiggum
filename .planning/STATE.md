# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-19)

**Core value:** Never lose track of running loops. When stopped, it's stopped. When running, you see them all.
**Current focus:** Phase 6 - Scriptability (COMPLETE)

## Current Position

Phase: 6 of 6 (Scriptability)
Plan: 3 of 3 in current phase
Status: Milestone complete
Last activity: 2026-01-20 - Completed 06-03-PLAN.md (Webhook Notifications)

Progress: [███████████████████] 19/19 plans (100%)

## Performance Metrics

**Velocity:**
- Total plans completed: 19
- Average duration: 3.9 min
- Total execution time: 1.25 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-process-foundation | 3/3 | 24 min | 8 min |
| 02-dashboard-reliability | 4/4 | 18 min | 4.5 min |
| 03-cli-core | 3/3 | 11 min | 3.7 min |
| 04-launcher-hub | 3/3 | 10 min | 3.3 min |
| 05-sub-agent-observability | 3/3 | 10 min | 3.3 min |
| 06-scriptability | 3/3 | 9 min | 3 min |

**Recent Trend:**
- Last 5 plans: 05-03 (3 min), 06-01 (4 min), 06-02 (2 min), 06-03 (3 min)
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
- CLI spawns in daemon mode (detached:true, stdio:ignore) so CLI can exit (03-02)
- Wait 500ms and verify process alive before returning start success (03-02)
- Confirmation prompt for stop --all (skippable with --yes) (03-02)
- fs.watch for file change detection in tailing utility (03-03)
- Position tracking outputs only new content as file grows (03-03)
- Log file discovery: ralph.log symlink first, then .ralph-logs directory (03-03)
- Session query on each listInstances() call - acceptable for infrequent launcher requests (04-01)
- Nullable enrichment fields for graceful degradation when no active session (04-01)
- LauncherProvider wraps both views inside AccessibilityProvider (04-02)
- GlobalHeader receives rightContent prop for view-specific additions (04-02)
- Connection status and active count from LauncherContext, not local useLauncher (04-02)
- ElapsedTime uses force re-render pattern to avoid stale closure issues (04-03)
- CostDisplay uses Intl.NumberFormat with 2-4 decimal places for micro-transactions (04-03)
- Status badges prioritize error states: crashed > stopping > running > ready > setup > idle (04-03)
- Sub-agent detection via Task tool_use blocks in stream-json stderr (05-01)
- Deduplication via toolUseId Set to prevent double-counting (05-01)
- Session-level persistence in active_sessions table via migration 002 (05-01)
- SubAgentPanel only renders when loop is running (avoid empty panel) (05-02)
- Show last 5 iterations in breakdown (keeps panel compact) (05-02)
- Default warning threshold 20 sub-agents per session (configurable via prop) (05-02)
- Cost estimate rate $0.02 per sub-agent spawn (server calculates on broadcast) (05-02)
- Per-iteration warning threshold: 5, critical: 10 (05-03)
- Session warning threshold: 20 sub-agents (05-03)
- Use numeric key encoding (iter*1000+level) for warning deduplication (05-03)
- Track session summary on running->stopped transition via useRef (05-03)
- Exit codes: 0=success, 1=general error, 2=invalid usage, 64=not found, 65=already exists (06-01)
- JSON errors go to stdout (not stderr) for consistent script parsing (06-01)
- Empty results return exit 0 with data: [] (not error) (06-01)
- JSON envelope includes timestamp and version metadata for debugging (06-01)
- Match loop.sh grep behavior for signal detection (string includes check) (06-02)
- Use fs.watch for completion monitoring (same pattern as tail.ts) (06-02)
- Poll process alive every 2s to detect crash vs completion (06-02)
- Exit codes for watch: 0 on completion, 1 on crash/timeout, 64 on not found (06-02)
- Environment variable webhook config (RALPH_WEBHOOK_URL, RALPH_WEBHOOK_URLS) (06-03)
- Fire-and-forget webhooks to avoid blocking commands (06-03)
- Exponential backoff retry (1s, 2s, 4s) with 3 attempts max (06-03)
- X-Ralph-Event-Id header for receiver-side deduplication (06-03)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-20
Stopped at: Completed 06-03-PLAN.md (Webhook Notifications) - ALL PHASES COMPLETE
Resume file: None
