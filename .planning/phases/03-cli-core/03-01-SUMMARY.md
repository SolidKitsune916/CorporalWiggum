---
phase: 03-cli-core
plan: 01
subsystem: cli
tags: [commander, chalk, ora, sqlite, better-sqlite3, typescript, terminal]

# Dependency graph
requires:
  - phase: 01-process-foundation
    provides: Database schema, PidFileManager patterns, process liveness checking
provides:
  - CLI binary `ralph` with status and list commands
  - Direct database access module for CLI
  - Formatted table output utilities
  - Duration, cost, and status formatters
affects: [03-cli-core/02, 03-cli-core/03]

# Tech tracking
tech-stack:
  added: [commander@14, chalk@5, ora@8]
  patterns: [standalone CLI direct database access, table output formatting]

key-files:
  created:
    - cli/package.json
    - cli/tsconfig.json
    - cli/src/ralph.ts
    - cli/src/commands/status.ts
    - cli/src/commands/list.ts
    - cli/src/lib/database.ts
    - cli/src/lib/output.ts
    - cli/src/lib/format.ts
  modified: []

key-decisions:
  - "Standalone CLI with direct SQLite access (no dashboard dependency)"
  - "Self-contained implementations rather than importing dashboard modules"
  - "PID file fallback for detecting orphaned processes not in database"

patterns-established:
  - "CLI commands use Commander.js with async actions"
  - "Database access via getDb() singleton from cli/src/lib/database.ts"
  - "Table output uses tableHeader/tableRow functions with width constraints"
  - "Color constants in output.ts for consistent styling"

# Metrics
duration: 4min
completed: 2026-01-20
---

# Phase 03 Plan 01: CLI Scaffold Summary

**Standalone CLI tool with `ralph status` and `ralph list` commands using direct SQLite access for dashboard-independent operation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-20T13:28:26Z
- **Completed:** 2026-01-20T13:32:16Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Created @ralph/cli package with Commander.js, chalk, ora, better-sqlite3
- `ralph status` shows all running loops with project, mode, runtime, cost, and alive status
- `ralph list` shows all registered projects with path and running status
- CLI works independently of dashboard via direct database access
- Colored table output with dim headers and green/red status indicators
- npm linked for global `ralph` command availability

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CLI package structure and dependencies** - `fc39989` (feat)
2. **Task 2: Create CLI entry point and output utilities** - `e4b2750` (feat)
3. **Task 3: Implement status and list commands** - `e398c57` (feat)

## Files Created/Modified
- `cli/package.json` - CLI package config with bin field for ralph command
- `cli/tsconfig.json` - TypeScript config with NodeNext module resolution
- `cli/src/ralph.ts` - Entry point with Commander program setup
- `cli/src/commands/status.ts` - Status command showing running loops
- `cli/src/commands/list.ts` - List command showing registered projects
- `cli/src/lib/database.ts` - SQLite database access singleton
- `cli/src/lib/output.ts` - Styled console output helpers (chalk/ora)
- `cli/src/lib/format.ts` - Duration, cost, status, and path formatters

## Decisions Made
- **Standalone implementations:** Created self-contained database.ts and format utilities rather than importing from dashboard modules to avoid logger dependencies and simplify CLI
- **PID file fallback:** Status command checks both database and PID files to catch orphaned processes not tracked in database
- **Direct table output:** Used simple tableHeader/tableRow functions rather than external table libraries for minimal dependencies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Commander 14.1.0 doesn't exist (latest is 14.0.2) - updated package.json with correct version

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CLI scaffold complete with status and list commands
- Ready for Plan 02 (start/stop commands) to add process control
- Database module ready for reuse in other commands
- Output utilities ready for consistent formatting across commands

---
*Phase: 03-cli-core*
*Completed: 2026-01-20*
