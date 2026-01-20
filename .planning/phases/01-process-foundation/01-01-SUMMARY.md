---
phase: 01-process-foundation
plan: 01
subsystem: process-management
tags: [pid-files, process-registry, session-tracking, node-fs]

# Dependency graph
requires:
  - phase: none
    provides: Foundation work, no prior dependencies
provides:
  - PidFileManager class for PID file operations
  - ProcessRegistry class for central loop tracking
  - LoopController integration with PID file creation/deletion
affects: [02-orphan-recovery, 03-cross-project-visibility]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Signal 0 check for process liveness (process.kill(pid, 0))"
    - "JSON-based PID files at ~/.ralph/pids/<project-id>.pid"
    - "Singleton registry pattern for ProcessRegistry"

key-files:
  created:
    - dashboard/server/processManager/PidFileManager.ts
    - dashboard/server/processManager/ProcessRegistry.ts
    - dashboard/server/processManager/index.ts
  modified:
    - dashboard/server/loopController.ts

key-decisions:
  - "PID files stored at ~/.ralph/pids/ (user-writable, not /var/run)"
  - "JSON format for PID files (includes projectId, projectPath, mode, startedAt)"
  - "File permissions 0o600 for PID files (owner read/write only)"
  - "ProcessRegistry wraps SessionRepository (not replaces) for unified interface"

patterns-established:
  - "Signal 0 for process liveness: try process.kill(pid, 0), EPERM means alive"
  - "Sanitize project IDs for filenames: replace non-alphanumeric, limit 64 chars"
  - "Async PID file operations with graceful error handling (warn, don't throw)"

# Metrics
duration: 12min
completed: 2026-01-19
---

# Phase 1 Plan 1: PID File Infrastructure Summary

**PidFileManager and ProcessRegistry classes providing persistent PID file tracking and central loop registry**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-19T10:00:00Z
- **Completed:** 2026-01-19T10:12:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- PidFileManager class with read/write/delete/list operations for ~/.ralph/pids/
- ProcessRegistry class wrapping SessionRepository + PidFileManager for unified loop tracking
- LoopController now creates PID files on loop start and removes them on stop/crash
- Signal 0 process liveness checking for orphan detection

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PidFileManager class** - `817125d` (feat)
2. **Task 2: Create ProcessRegistry class** - `89d2af7` (feat)
3. **Task 3: Integrate ProcessRegistry into LoopController** - `fe92cfe` (feat)

## Files Created/Modified

- `dashboard/server/processManager/PidFileManager.ts` - PID file read/write/delete/list operations
- `dashboard/server/processManager/ProcessRegistry.ts` - Central registry with session + PID file sync
- `dashboard/server/processManager/index.ts` - Barrel export for processManager module
- `dashboard/server/loopController.ts` - Integration with ProcessRegistry for loop lifecycle

## Decisions Made

- **PID file location:** ~/.ralph/pids/ (user-writable, cross-project visible)
- **PID file format:** JSON with pid, projectId, projectPath, mode, startedAt
- **Error handling:** Graceful degradation (log warnings, don't throw on PID file failures)
- **ProcessRegistry pattern:** Wrap SessionRepository, don't replace (keeps existing heartbeat mechanism)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PID file infrastructure complete, ready for orphan detection (Plan 02)
- ProcessRegistry provides syncWithPidFiles() for orphan detection
- cleanupStaleSessions() ready for use in health monitor integration

---
*Phase: 01-process-foundation*
*Completed: 2026-01-19*
