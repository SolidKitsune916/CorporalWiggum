---
phase: 06-scriptability
verified: 2026-01-20T17:15:00Z
status: passed
score: 4/4 must-haves verified
---

# Phase 6: Scriptability Verification Report

**Phase Goal:** CLI supports scripting workflows with proper exit codes and machine output
**Verified:** 2026-01-20T17:15:00Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CLI commands return proper exit codes (0=success, non-zero=error) | VERIFIED | EXIT_CODES constant with SUCCESS(0), GENERAL_ERROR(1), INVALID_USAGE(2), NOT_FOUND(64), ALREADY_EXISTS(65). Used in all commands: status.ts, list.ts, start.ts, stop.ts, watch.ts. 30+ usages of process.exit(EXIT_CODES.*) |
| 2 | `ralph status --json` and `ralph list --json` output valid JSON | VERIFIED | Both commands have `.option('-j, --json')`. status.ts:160, list.ts:76. JSON output via outputJson() helper with success/data/metadata envelope. watch.ts also supports --json |
| 3 | Loop auto-stops when completion signal detected | VERIFIED | watch.ts watches for ALL_TASKS_COMPLETE and PLANNING_COMPLETE signals via watchForCompletion(). Marks session completed and exits with code 0 |
| 4 | Webhook fires on loop completion or failure | VERIFIED | webhook.ts exports broadcastWebhooks(), createCompletionPayload(), createStoppedPayload(), createCrashedPayload(). watch.ts fires on complete/crash, stop.ts fires on user-initiated stop |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `cli/src/lib/exit-codes.ts` | EXIT_CODES constant object | VERIFIED (22 lines) | Exports EXIT_CODES with SUCCESS, GENERAL_ERROR, INVALID_USAGE, NOT_FOUND, ALREADY_EXISTS |
| `cli/src/lib/json-output.ts` | JSON output helper functions | VERIFIED (55 lines) | Exports outputJson, outputJsonError, JsonOutput interface with timestamp/version metadata |
| `cli/src/lib/completion.ts` | Completion signal detection utilities | VERIFIED (141 lines) | Exports COMPLETION_SIGNALS, checkForCompletion, findLogFile, watchForCompletion |
| `cli/src/lib/webhook.ts` | Webhook sending utilities | VERIFIED (256 lines) | Exports sendWebhook, broadcastWebhooks, createCompletionPayload, createStoppedPayload, createCrashedPayload |
| `cli/src/commands/status.ts` | status command with --json flag | VERIFIED (255 lines) | Has `.option('-j, --json')` at line 160, imports EXIT_CODES and outputJson |
| `cli/src/commands/list.ts` | list command with --json flag | VERIFIED (146 lines) | Has `.option('-j, --json')` at line 76, imports EXIT_CODES and outputJson |
| `cli/src/commands/start.ts` | start command with exit codes | VERIFIED (296 lines) | Imports EXIT_CODES, uses INVALID_USAGE, ALREADY_EXISTS, NOT_FOUND, GENERAL_ERROR, SUCCESS |
| `cli/src/commands/stop.ts` | stop command with webhooks | VERIFIED (349 lines) | Imports broadcastWebhooks and createStoppedPayload, fires webhooks on successful stops |
| `cli/src/commands/watch.ts` | watch command with completion/webhooks | VERIFIED (247 lines) | Imports watchForCompletion, broadcastWebhooks, fires webhooks on complete and crash |
| `cli/src/ralph.ts` | CLI entry point with watch command | VERIFIED (40 lines) | Imports and registers watchCommand |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| status.ts | exit-codes.ts | import EXIT_CODES | WIRED | Line 14, used at lines 203, 209, 246, 250, 253 |
| status.ts | json-output.ts | import outputJson | WIRED | Line 15, used at line 202 |
| list.ts | exit-codes.ts | import EXIT_CODES | WIRED | Line 12, used at lines 93, 102, 137, 141, 144 |
| list.ts | json-output.ts | import outputJson | WIRED | Line 13, used at line 92 |
| start.ts | exit-codes.ts | import EXIT_CODES | WIRED | Line 17, used at lines 193, 205, 215, 264, 272, 290, 293 |
| stop.ts | exit-codes.ts | import EXIT_CODES | WIRED | Line 17, used at lines 293, 298, 305, 314, 338, 341, 346 |
| stop.ts | webhook.ts | import broadcastWebhooks | WIRED | Line 18, used at lines 272, 327 |
| watch.ts | exit-codes.ts | import EXIT_CODES | WIRED | Line 13, used at lines 110, 122, 149, 178, 223, 236, 244 |
| watch.ts | json-output.ts | import outputJson | WIRED | Line 14, used at lines 105, 147, 175, 209 |
| watch.ts | completion.ts | import watchForCompletion | WIRED | Line 16, used at line 184 |
| watch.ts | webhook.ts | import broadcastWebhooks | WIRED | Lines 20-24, used at lines 164, 197 |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SCRP-01: CLI commands return proper exit codes | SATISFIED | EXIT_CODES used in all 5 main commands |
| SCRP-02: `ralph status --json` and `ralph list --json` output machine-readable JSON | SATISFIED | --json flag on status, list, watch commands with JsonOutput envelope |
| SCRP-03: Loop automatically stops when completion signal detected | SATISFIED | watch command detects ALL_TASKS_COMPLETE and PLANNING_COMPLETE via watchForCompletion |
| SCRP-04: Optional webhook POST on loop completion or failure | SATISFIED | Webhooks fire via RALPH_WEBHOOK_URL/RALPH_WEBHOOK_URLS env vars on complete, stop, crash |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | - |

No TODO, FIXME, placeholder, or stub patterns found in phase 6 files.

### Human Verification Required

### 1. JSON Output Validity

**Test:** Run `ralph status --json | jq .` and `ralph list --json | jq .`
**Expected:** Valid JSON with `success: true`, `data: []` (or array of items), and `metadata: { timestamp, version }` structure
**Why human:** Requires running actual CLI commands and parsing output

### 2. Exit Code Verification

**Test:** Run `ralph start . invalid-mode; echo $?`
**Expected:** Exit code 2 (INVALID_USAGE)
**Why human:** Requires running CLI and checking exit code

### 3. Webhook Delivery

**Test:** Set `RALPH_WEBHOOK_URL=https://webhook.site/your-uuid` and run a loop to completion or stop it
**Expected:** POST request arrives at webhook endpoint with event payload
**Why human:** Requires external webhook receiver and running actual loop

### 4. Watch Command Completion Detection

**Test:** Start a loop, run `ralph watch <project>`, wait for ALL_TASKS_COMPLETE
**Expected:** Watch command reports completion and exits with code 0
**Why human:** Requires running actual loop to completion

## Summary

All 4 phase 6 truths verified:

1. **Exit codes:** EXIT_CODES constant defined and used consistently across all commands (0, 1, 2, 64, 65)
2. **JSON output:** --json flag on status, list, watch commands with structured envelope (success, data, metadata)
3. **Auto-stop:** watch command monitors logs for completion signals and exits appropriately
4. **Webhooks:** broadcastWebhooks fires on loop complete, user stop, and crash events

TypeScript compiles without errors. No stub patterns or placeholders found. All key links verified as wired.

Phase 6 goal achieved: CLI supports scripting workflows with proper exit codes and machine output.

---
*Verified: 2026-01-20T17:15:00Z*
*Verifier: Claude (gsd-verifier)*
