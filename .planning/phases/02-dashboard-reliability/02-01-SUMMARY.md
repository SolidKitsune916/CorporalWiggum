---
phase: 02-dashboard-reliability
plan: 01
subsystem: ui
tags: [react, websocket, loop-controls, state-management]

# Dependency graph
requires:
  - phase: 01-process-foundation
    provides: ProcessRegistry, GracefulShutdown, session tracking
provides:
  - LoopStatus type with starting/stopping flags
  - LoopController emitting intermediate state transitions
  - LoopControls with four distinct button states
affects: [02-02, 02-03, dashboard-ui, loop-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Intermediate state flags in status objects for UI transitions"
    - "Derived state variables for mutually exclusive UI states"
    - "Disabled controls during transitioning states"

key-files:
  created: []
  modified:
    - dashboard/src/types/index.ts
    - dashboard/server/loopController.ts
    - dashboard/src/components/LoopControls.tsx

key-decisions:
  - "Optional flags (starting/stopping) instead of union type for backward compatibility"
  - "Emit starting:true before registration, false after registration completes"
  - "Emit stopping:true before graceful shutdown begins"
  - "Clear both flags in close and error handlers for clean state"

patterns-established:
  - "Intermediate state pattern: running && starting = transitioning to run"
  - "Derived state pattern: isIdle = !running && !stopping for UI logic"

# Metrics
duration: 8min
completed: 2026-01-20
---

# Phase 2 Plan 1: UI Intermediate States Summary

**LoopStatus type extended with starting/stopping flags, LoopController emitting intermediate states, LoopControls showing Starting.../Stopping... button states with disabled inputs during transitions**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-20T05:07:00Z
- **Completed:** 2026-01-20T05:15:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added `starting` and `stopping` optional boolean flags to LoopStatus interface
- LoopController now emits `starting: true` immediately after spawn, `false` after registration
- LoopController emits `stopping: true` before graceful shutdown
- Both flags cleared in close and error handlers
- LoopControls shows four distinct states: idle, starting, running, stopping
- Buttons disabled during transitions preventing double-clicks
- Form inputs disabled during all non-idle states

## Task Commits

Each task was committed atomically:

1. **Task 1: Add starting/stopping flags to LoopStatus type** - `6fd7e70` (feat)
2. **Task 2: Emit starting/stopping states from LoopController** - `164f7c3` (feat)
3. **Task 3: Update LoopControls UI with intermediate states** - `c9cae69` (feat)

## Files Created/Modified

- `dashboard/src/types/index.ts` - Added starting/stopping optional boolean flags to LoopStatus
- `dashboard/server/loopController.ts` - Emit intermediate states during start/stop lifecycle
- `dashboard/src/components/LoopControls.tsx` - Four-state button UI with spinner animations

## Decisions Made

1. **Optional flags vs enum:** Used optional booleans instead of a state enum for backward compatibility with existing code that only checks `running`
2. **Registration timing:** `starting: false` is emitted after ProcessRegistry.registerLoop() completes (or fails) rather than immediately
3. **Flag clearing:** Both flags explicitly cleared in close and error handlers to ensure clean state after termination

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Unused variable warning:** Removed unused `isTransitioning` variable that was defined but never used
- **Pre-existing build errors:** useWebSocket.ts has pre-existing TypeScript errors (unused refreshTasks variable) but they don't affect this plan's changes

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DASH-01 and DASH-02 requirements for reliable UI state feedback are now implemented
- UI immediately shows transitioning states preventing user confusion
- Buttons disabled during transitions preventing double-click issues
- Ready for 02-02 (Task State Reliability) and 02-03 (Project Switching) plans

---
*Phase: 02-dashboard-reliability*
*Completed: 2026-01-20*
