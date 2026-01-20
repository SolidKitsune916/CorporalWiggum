---
phase: 06-scriptability
plan: 02
subsystem: cli
tags: [watch, completion-detection, scripting, fs-watch]

# Dependency graph
requires:
  - phase: 06-01
    provides: Exit codes and JSON output infrastructure
  - phase: 03-03
    provides: Log file tailing patterns (fs.watch)
provides:
  - ralph watch command for blocking completion waits
  - Completion signal detection (ALL_TASKS_COMPLETE, PLANNING_COMPLETE)
  - Log file discovery (ralph.log symlink, .ralph-logs directory)
affects: [06-03-shell-completion, ci-cd-integration, automation-scripts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Completion signal detection via string search
    - File watching with position tracking for incremental reads
    - Process alive polling for crash detection

key-files:
  created:
    - cli/src/lib/completion.ts
    - cli/src/commands/watch.ts
  modified:
    - cli/src/ralph.ts

key-decisions:
  - "Match loop.sh grep behavior for signal detection (string includes check)"
  - "Use fs.watch (same as tail.ts) for efficient file watching"
  - "Poll process alive status every 2s for crash detection"
  - "Exit 0 on completion, 1 on crash/timeout, 64 on not found"

patterns-established:
  - "Completion detection: checkForCompletion() for synchronous, watchForCompletion() for real-time"
  - "Log discovery: ralph.log symlink first, .ralph-logs directory fallback"

# Metrics
duration: 2min
completed: 2026-01-20
---

# Phase 6 Plan 2: Watch Command & Completion Detection Summary

**ralph watch command enables scripts to block until loop completion with proper exit codes**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-20T16:50:08Z
- **Completed:** 2026-01-20T16:52:27Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Completion signal detection utility matching loop.sh behavior
- Log file discovery (ralph.log symlink or .ralph-logs directory)
- ralph watch command blocks until completion or failure
- JSON output and timeout support for scripting

## Task Commits

Each task was committed atomically:

1. **Task 1: Create completion detection utility** - `5bf8da8` (feat)
2. **Task 2: Create watch command** - `bbd733c` (feat)

## Files Created/Modified
- `cli/src/lib/completion.ts` - Completion signal detection and log file watching
- `cli/src/commands/watch.ts` - Watch command implementation
- `cli/src/ralph.ts` - Register watch command

## Decisions Made
- Match loop.sh grep behavior for signal detection (simple string includes)
- Use fs.watch (same as tail.ts) for efficient file watching
- Only read new content since last check (position tracking)
- Poll process alive status every 2 seconds for crash detection
- Exit codes: 0 on completion, 1 on crash/timeout, 64 on not found

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Watch command enables CI/CD integration scripts
- Exit codes and JSON output ready for shell scripting
- Ready for 06-03 shell completion

---
*Phase: 06-scriptability*
*Completed: 2026-01-20*
