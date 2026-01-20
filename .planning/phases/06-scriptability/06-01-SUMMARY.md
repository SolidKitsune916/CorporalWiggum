---
phase: 06-scriptability
plan: 01
subsystem: cli
tags: [cli, exit-codes, json, scripting, automation]

# Dependency graph
requires:
  - phase: 03-cli-core
    provides: CLI command structure (status, list, start, stop)
provides:
  - Standard exit codes for all CLI commands
  - JSON output mode for status and list commands
  - Machine-readable output for scripts and CI/CD
affects: [06-02, 06-03, external-integrations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - EXIT_CODES constant object for standardized exit values
    - JsonOutput interface with success/data/error/metadata envelope
    - outputJson() and outputJsonError() helpers for consistent JSON output

key-files:
  created:
    - cli/src/lib/exit-codes.ts
    - cli/src/lib/json-output.ts
  modified:
    - cli/src/commands/status.ts
    - cli/src/commands/list.ts
    - cli/src/commands/start.ts
    - cli/src/commands/stop.ts

key-decisions:
  - "Exit codes: 0=success, 1=general error, 2=invalid usage, 64=not found, 65=already exists"
  - "JSON errors go to stdout (not stderr) for consistent script parsing"
  - "Empty results return exit 0 with data: [] (not error)"
  - "JSON envelope includes timestamp and version metadata for debugging"

patterns-established:
  - "EXIT_CODES import pattern for all CLI commands"
  - "outputJson(data) / outputJsonError(msg) for JSON mode"
  - "--json flag pattern with options.json check"

# Metrics
duration: 4min
completed: 2026-01-20
---

# Phase 6 Plan 01: Exit Codes & JSON Output Summary

**Standardized exit codes (0/1/2/64/65) and --json output mode for CLI scriptability**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-20T16:44:11Z
- **Completed:** 2026-01-20T16:48:43Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Standard exit codes for all CLI commands enabling reliable script integration
- JSON output mode for `ralph status --json` and `ralph list --json`
- Machine-readable envelope with success/data/error/metadata structure
- Empty results handled correctly (exit 0, not error)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create exit codes and JSON output utilities** - `d2addbd` (feat)
2. **Task 2: Add --json flag and exit codes to status and list commands** - `219062a` (feat)
3. **Task 3: Add exit codes to start and stop commands** - `07eb833` (feat)

## Files Created/Modified
- `cli/src/lib/exit-codes.ts` - EXIT_CODES constant with SUCCESS, GENERAL_ERROR, INVALID_USAGE, NOT_FOUND, ALREADY_EXISTS
- `cli/src/lib/json-output.ts` - outputJson and outputJsonError helpers with JsonOutput interface
- `cli/src/commands/status.ts` - Added --json flag, JSON output for loops array, proper exit codes
- `cli/src/commands/list.ts` - Added --json flag, JSON output for projects array, proper exit codes
- `cli/src/commands/start.ts` - Replaced exit(1) with appropriate EXIT_CODES values
- `cli/src/commands/stop.ts` - Replaced exit(1) with appropriate EXIT_CODES values

## Decisions Made
- **Exit code values:** Based on sysexits.h conventions - 64 for NOT_FOUND, 65 for ALREADY_EXISTS
- **JSON to stdout:** JSON errors output to stdout (not stderr) so scripts can parse all output consistently
- **Empty = success:** Empty arrays return exit 0 with `data: []` - emptiness is not an error
- **Metadata in envelope:** Include timestamp and version for debugging and audit trails

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Exit codes foundation ready for 06-02 (start/stop --json output)
- JSON output pattern established for extending to other commands
- All CLI commands now return predictable exit codes for scripting

---
*Phase: 06-scriptability*
*Completed: 2026-01-20*
