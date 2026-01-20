---
phase: 04-launcher-hub
plan: 03
subsystem: ui
tags: [react, elapsed-time, cost-display, status-badges, launcher]

# Dependency graph
requires:
  - phase: 04-launcher-hub
    plan: 01
    provides: LauncherInstance.loopStatus with session metrics (costSpent, startedAt, state)
provides:
  - ElapsedTime component with real-time ticking display
  - CostDisplay component with USD currency formatting
  - Enhanced status badges (Running, Stopping, Crashed, Ready, Setup Required, Idle)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Force re-render pattern for real-time updates without state storage
    - Intl.NumberFormat for locale-aware currency formatting

key-files:
  created: []
  modified:
    - dashboard/src/components/launcher/ProjectCard.tsx

key-decisions:
  - "ElapsedTime uses force re-render pattern (empty useState + interval) to avoid stale closure issues"
  - "CostDisplay uses Intl.NumberFormat with 2-4 decimal places for micro-transactions"
  - "Status badges prioritize error states (crashed > stopping > running > ready > setup > idle)"

patterns-established:
  - "Real-time display: Calculate value on each render, use interval only for re-render trigger"

# Metrics
duration: 3min
completed: 2026-01-20
---

# Phase 4 Plan 03: Project Card Metrics Display Summary

**Enhanced ProjectCard with real-time ticking elapsed time, USD cost display, and state-aware status badges for running loop visibility**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-20T14:25:00Z
- **Completed:** 2026-01-20T14:28:00Z
- **Tasks:** 4 (3 auto + 1 checkpoint)
- **Files modified:** 1

## Accomplishments
- Created ElapsedTime helper component that ticks every second using force re-render pattern
- Created CostDisplay helper component with Intl.NumberFormat for USD formatting
- Enhanced getStatusBadge() to show 6 distinct states with appropriate icons and colors
- Updated getStatusDetail() to display mode, iteration progress, elapsed time, and cost
- Human verified visual correctness with ticking timer and proper formatting

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ElapsedTime and CostDisplay helper components** - `25e953b` (feat)
2. **Task 2: Enhance getStatusBadge with error and state handling** - `192a22e` (feat)
3. **Task 3: Update getStatusDetail to show elapsed time and cost** - `179a958` (feat)
4. **Task 4: Human verification checkpoint** - Approved, no commit needed

## Files Created/Modified
- `dashboard/src/components/launcher/ProjectCard.tsx` - Added helper components, enhanced status logic, integrated metrics display

## Technical Details

### ElapsedTime Component
- Uses empty useState `[, forceUpdate] = useState(0)` pattern
- setInterval triggers re-render every 1000ms
- Elapsed time calculated fresh on each render (avoids stale closure)
- Formats as HH:MM:SS with zero-padding

### CostDisplay Component
- Converts cents to dollars
- Uses Intl.NumberFormat with 'en-US' locale
- Supports 2-4 decimal places for micro-transactions
- Styled with font-mono for tabular alignment

### Status Badge Priority
1. Crashed (destructive, AlertTriangle)
2. Stopping (warning, Loader2 spinning)
3. Running (success, Play pulsing)
4. Ready (secondary, CheckCircle)
5. Setup Required (warning, AlertTriangle)
6. Idle (secondary, no icon)

## Decisions Made
- Force re-render pattern chosen over storing elapsed seconds in state to avoid stale closures
- Cost only shown when > 0 to avoid cluttering UI with $0.00
- Status badge order prioritizes error states for visibility

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- LAUN-02 (show cost spent) - Complete
- LAUN-05 (elapsed time display) - Complete
- Phase 4 complete - all 3 plans finished
- Ready for Phase 5 (Visual Polish)

---
*Phase: 04-launcher-hub*
*Completed: 2026-01-20*
