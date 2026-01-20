---
phase: 06-scriptability
plan: 03
subsystem: cli
tags: [webhooks, notifications, http, integration, slack, discord, ci-cd]

# Dependency graph
requires:
  - phase: 06-02
    provides: watch command with completion detection
provides:
  - CLI webhook utility for loop event notifications
  - Webhook integration in watch command (complete/crash)
  - Webhook integration in stop command (user-stopped)
affects: [external integrations, ci-cd pipelines, notification systems]

# Tech tracking
tech-stack:
  added: []
  patterns: [fire-and-forget webhooks, exponential backoff retry]

key-files:
  created:
    - cli/src/lib/webhook.ts
  modified:
    - cli/src/commands/watch.ts
    - cli/src/commands/stop.ts

key-decisions:
  - "Environment variable configuration (RALPH_WEBHOOK_URL, RALPH_WEBHOOK_URLS comma-separated)"
  - "Fire-and-forget pattern to avoid blocking command completion"
  - "Exponential backoff retry (1s, 2s, 4s) with 3 attempts max"
  - "X-Ralph-Event-Id header for deduplication by receivers"
  - "Compatible with existing dashboard WebhookPayload structure"

patterns-established:
  - "Webhook utility: sendWebhook with retry, broadcastWebhooks fire-and-forget"
  - "Payload creators: createCompletionPayload, createStoppedPayload, createCrashedPayload"

# Metrics
duration: 3min
completed: 2026-01-20
---

# Phase 6 Plan 3: Webhook Notifications Summary

**CLI webhook integration for loop events: completion, user-stop, and crash notifications to external systems**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-20T16:54:13Z
- **Completed:** 2026-01-20T16:57:03Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created webhook utility with retry logic and exponential backoff
- Integrated loop:complete and loop:crashed webhooks in watch command
- Integrated loop:stopped webhook in stop command
- Environment-based configuration for webhook URLs and auth headers
- Fire-and-forget pattern ensures commands don't block on webhook delivery

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CLI webhook utility** - `facdda0` (feat)
2. **Task 2: Add webhook notification to watch command** - `6d2b796` (feat)
3. **Task 3: Add webhook notification to stop command** - `59a4414` (feat)

## Files Created/Modified

- `cli/src/lib/webhook.ts` - Webhook utility with sendWebhook, broadcastWebhooks, and payload creators
- `cli/src/commands/watch.ts` - Added broadcastWebhooks calls on completion and crash
- `cli/src/commands/stop.ts` - Added broadcastWebhooks calls on user-initiated stop

## Decisions Made

- Environment variable configuration via RALPH_WEBHOOK_URL (single) and RALPH_WEBHOOK_URLS (comma-separated multiple)
- Fire-and-forget pattern: webhooks don't block command completion
- Exponential backoff retry: 1s, 2s, 4s delays with max 3 attempts
- Don't retry on 4xx client errors (only retry 5xx server errors)
- X-Ralph-Event-Id header enables receiver-side deduplication
- Payload structure compatible with existing dashboard WebhookPayload

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

**Webhook configuration via environment variables:**

```bash
# Single webhook URL
export RALPH_WEBHOOK_URL="https://your-webhook.example.com/hook"

# Multiple webhook URLs (comma-separated)
export RALPH_WEBHOOK_URLS="https://slack.webhook.url,https://discord.webhook.url"

# Optional: Authorization header
export RALPH_WEBHOOK_AUTH="Bearer your-token"

# Optional: Custom headers (JSON)
export RALPH_WEBHOOK_HEADERS='{"X-Custom-Header": "value"}'
```

Webhooks will be sent automatically on loop events. No dashboard configuration required.

## Next Phase Readiness

- Phase 6 (Scriptability) now complete with all 3 plans implemented
- CLI provides full scriptability: JSON output, exit codes, watch command, webhooks
- Ready for CI/CD integration and external notification systems

---
*Phase: 06-scriptability*
*Completed: 2026-01-20*
