---
phase: 03-cli-core
plan: 02
subsystem: cli
tags: [commander, chalk, ora, spawn, daemon, process-control, terminal]

# Dependency graph
requires:
  - phase: 03-01
    provides: CLI scaffold with status, list commands and database access
  - phase: 01-process-foundation
    provides: GracefulShutdown patterns, PidFileManager, ProcessRegistry interface
provides:
  - CLI start command with daemon mode spawning
  - CLI stop command with verified termination
  - Project resolver utility (name/path/ID resolution)
affects: [03-cli-core/03, 04-websocket-bridge]

# Tech tracking
tech-stack:
  added: [uuid]
  patterns: [daemon spawning with detached:true, verified termination with SIGTERM/SIGKILL]

key-files:
  created:
    - cli/src/commands/start.ts
    - cli/src/commands/stop.ts
    - cli/src/lib/resolve.ts
  modified:
    - cli/src/ralph.ts
    - cli/package.json

key-decisions:
  - "Spawn in daemon mode (detached: true, stdio: ignore) so CLI can exit"
  - "Wait 500ms then verify process alive before returning success"
  - "Use process group kill (-pid) on Unix to terminate child processes"
  - "5 second default timeout before escalating SIGTERM to SIGKILL"
  - "Confirmation prompt for stop --all (skippable with --yes)"

patterns-established:
  - "CLI process spawning uses spawn with detached:true for daemon mode"
  - "Verified termination waits for process death confirmation"
  - "Project resolution tries ID, then path, then resolved path, then name"

# Metrics
duration: 3min
completed: 2026-01-20
---

# Phase 03 Plan 02: Start/Stop Commands Summary

**CLI start and stop commands with daemon spawning, verified termination, and project resolution by name/path/ID**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-20T13:33:55Z
- **Completed:** 2026-01-20T13:36:54Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- `ralph start <project> [mode]` spawns loops as daemon processes
- `ralph stop <project>` and `ralph stop --all` with verified termination
- Project resolver accepts name, path, or UUID as identifier
- Graceful shutdown with SIGTERM/SIGKILL escalation
- Session registration and PID file management

## Task Commits

Each task was committed atomically:

1. **Task 1: Create project resolver utility** - `a209992` (feat)
2. **Task 2: Implement start command** - `5979de5` (feat)
3. **Task 3: Implement stop command** - `e329039` (feat)

## Files Created/Modified
- `cli/src/lib/resolve.ts` - Project resolution by name/path/ID
- `cli/src/commands/start.ts` - Start command with daemon spawning
- `cli/src/commands/stop.ts` - Stop command with verified termination
- `cli/src/ralph.ts` - Updated to include start and stop commands
- `cli/package.json` - Added uuid dependency

## Decisions Made
- **Daemon mode spawning:** Uses `spawn` with `detached: true` and `stdio: 'ignore'` so CLI can exit while loop continues. Process is `unref()`'d to allow Node to exit.
- **Verification before success:** Wait 500ms after spawn and verify process is alive before returning success. Prevents false "started" messages for immediate crashes.
- **Process group termination:** Use `-pid` (negative PID) on Unix to send signals to entire process group, ensuring child processes are also terminated.
- **Confirmation prompt:** `ralph stop --all` prompts for confirmation unless `--yes` flag is provided to prevent accidental mass termination.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Added uuid package as dependency since CLI didn't have it for session ID generation

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Start and stop commands complete with same reliability guarantees as dashboard
- Ready for Plan 03 (attach/logs commands) to add output streaming
- Project resolver utility reusable by attach, logs, and future commands

---
*Phase: 03-cli-core*
*Completed: 2026-01-20*
