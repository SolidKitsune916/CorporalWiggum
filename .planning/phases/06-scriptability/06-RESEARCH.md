# Phase 6: Scriptability - Research

**Researched:** 2026-01-20
**Domain:** CLI Exit Codes, Machine-Readable Output, Completion Detection, Webhooks
**Confidence:** HIGH

## Summary

This research investigates how to make the Ralph CLI scriptable, enabling automation workflows, CI/CD integration, and external system notifications. The phase builds on the existing CLI infrastructure from Phase 3 and the webhook infrastructure already present in the dashboard.

The existing codebase provides strong foundations:
- CLI built with Commander.js 14.x (supports options, subcommands)
- `status` and `list` commands already query database and format output
- `WebhookManager` class with full CRUD, broadcast, and retry capabilities
- Completion signals (`ALL_TASKS_COMPLETE`, `PLANNING_COMPLETE`) already defined in loop.sh
- Session state tracked in SQLite with `state` column (running/completed/crashed)

**Key findings:**
1. **Exit codes**: Follow POSIX convention (0=success, 1=general error) - simple and universally supported
2. **JSON output**: Add `--json` flag to existing commands; output to stdout, errors to stderr
3. **Auto-stop**: Detect `ALL_TASKS_COMPLETE` in log output, update session state, fire webhook
4. **Webhooks**: Reuse existing `WebhookManager` for CLI, add completion events

**Primary recommendation:** Minimal changes to existing CLI commands (add `--json` flag, ensure `process.exit()` codes), create new `watch` command or enhance existing flow to detect completion signal and trigger webhooks.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in CLI)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | 14.x | CLI framework | Already used, supports `.option()` for --json |
| better-sqlite3 | 12.x | Database | Session state queries |
| chalk | 5.x | Terminal colors | Conditionally disabled for JSON output |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js fetch | built-in | Webhook HTTP calls | POST to webhook URLs |
| AbortSignal.timeout | built-in | Request timeouts | Prevent hanging webhook calls |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native fetch | axios | axios adds dependency, native fetch is sufficient |
| polling completion | fs.watch | fs.watch already used for log tailing in attach command |
| Custom JSON formatter | JSON.stringify | Built-in is sufficient, add pretty-print option if needed |

**Installation:**
```bash
# No new dependencies needed - all exist in CLI already
```

## Architecture Patterns

### Recommended Changes to Existing Structure
```
cli/
└── src/
    ├── commands/
    │   ├── status.ts    # Add --json option, ensure exit codes
    │   ├── list.ts      # Add --json option, ensure exit codes
    │   ├── start.ts     # Ensure exit codes (already has process.exit(1))
    │   └── stop.ts      # Ensure exit codes (already has process.exit(1))
    └── lib/
        ├── json-output.ts  # NEW: JSON formatting utilities
        └── webhook.ts      # NEW: CLI webhook sender (reuse WebhookPayload type)
```

### Pattern 1: Exit Code Convention
**What:** CLI commands return predictable exit codes for scripting
**When to use:** All CLI commands
**Source:** [POSIX Exit Codes](https://tldp.org/LDP/abs/html/exitcodes.html), [Modern CLI Design](https://moderncli.dev/code/exit-code/)

```typescript
// Exit codes following POSIX convention
export const EXIT_CODES = {
  SUCCESS: 0,           // Command succeeded
  GENERAL_ERROR: 1,     // General error (catch-all)
  INVALID_USAGE: 2,     // Invalid arguments/options
  NOT_FOUND: 64,        // Resource not found (project, session)
  ALREADY_EXISTS: 65,   // Resource conflict (loop already running)
  PERMISSION: 77,       // Permission denied
  PROCESS_ERROR: 78,    // Process management error
} as const;

// Usage in command
export const statusCommand = new Command('status')
  .option('-j, --json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const loops = getActiveLoops();
      if (options.json) {
        console.log(JSON.stringify({ success: true, data: loops }));
        process.exit(EXIT_CODES.SUCCESS);
      }
      // ... human-readable output
      process.exit(EXIT_CODES.SUCCESS);
    } catch (err) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: err.message }));
      } else {
        console.error(colors.error(`Error: ${err.message}`));
      }
      process.exit(EXIT_CODES.GENERAL_ERROR);
    }
  });
```

### Pattern 2: JSON Output Mode
**What:** Structured JSON output for machine consumption
**When to use:** When `--json` flag is provided
**Source:** [Node.js CLI Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices)

```typescript
// JSON output wrapper type
interface JsonOutput<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: string;
    version: string;
  };
}

// JSON output helper
function outputJson<T>(data: T): void {
  const output: JsonOutput<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '3.0.0',
    },
  };
  console.log(JSON.stringify(output, null, 2));
}

function outputJsonError(error: string): void {
  const output: JsonOutput<never> = {
    success: false,
    error,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '3.0.0',
    },
  };
  // Write error to stdout (not stderr) for JSON consistency
  console.log(JSON.stringify(output, null, 2));
}

// Example: ralph status --json
interface LoopStatus {
  projectId: string;
  mode: string;
  pid: number;
  startedAt: string;
  runtime: string;
  cost: number;
  iteration: number;
  isAlive: boolean;
}

// Output format for ralph status --json
{
  "success": true,
  "data": [
    {
      "projectId": "my-project",
      "mode": "build",
      "pid": 12345,
      "startedAt": "2026-01-20T10:00:00Z",
      "runtime": "1h 23m",
      "cost": 1.45,
      "iteration": 5,
      "isAlive": true
    }
  ],
  "metadata": {
    "timestamp": "2026-01-20T11:23:00Z",
    "version": "3.0.0"
  }
}
```

### Pattern 3: Completion Signal Detection
**What:** Detect ALL_TASKS_COMPLETE in log output and trigger actions
**When to use:** Auto-stop feature (SCRP-03)
**Source:** Existing loop.sh pattern (lines 793-818)

```typescript
// Completion signals to detect
const COMPLETION_SIGNALS = {
  BUILD: 'ALL_TASKS_COMPLETE',
  PLANNING: 'PLANNING_COMPLETE',
};

// Check log file for completion signal
async function checkForCompletion(logPath: string): Promise<{
  complete: boolean;
  signal?: string;
}> {
  const content = await fs.promises.readFile(logPath, 'utf-8');

  for (const [type, signal] of Object.entries(COMPLETION_SIGNALS)) {
    if (content.includes(signal)) {
      return { complete: true, signal };
    }
  }

  return { complete: false };
}

// Watch for completion in log file (for auto-stop)
async function watchForCompletion(
  projectPath: string,
  sessionId: string,
  onComplete: (signal: string) => void
): Promise<void> {
  const logPath = path.join(projectPath, 'ralph.log');
  let lastSize = 0;

  const checkCompletion = async () => {
    const stats = await fs.promises.stat(logPath);
    if (stats.size > lastSize) {
      const result = await checkForCompletion(logPath);
      if (result.complete) {
        onComplete(result.signal!);
        return true;
      }
      lastSize = stats.size;
    }
    return false;
  };

  // Initial check
  if (await checkCompletion()) return;

  // Watch for changes
  const watcher = fs.watch(logPath, async () => {
    if (await checkCompletion()) {
      watcher.close();
    }
  });
}
```

### Pattern 4: Webhook Notification from CLI
**What:** Fire webhook on loop completion or failure
**When to use:** SCRP-04 webhook notifications
**Source:** Existing `WebhookManager`, [Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks)

```typescript
// Webhook payload for loop events (matches existing WebhookPayload)
interface LoopWebhookPayload {
  event: 'loop:complete' | 'loop:failed' | 'loop:stopped';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string;
  metadata: {
    projectId: string;
    projectPath: string;
    sessionId: string;
    mode: string;
    duration: number;     // seconds
    iterations: number;
    cost: number;
    exitReason?: string;  // 'signal' | 'max_iterations' | 'error'
  };
}

// Send webhook notification
async function sendWebhookNotification(
  webhookUrl: string,
  payload: LoopWebhookPayload,
  options?: {
    timeout?: number;
    retries?: number;
    headers?: Record<string, string>;
  }
): Promise<boolean> {
  const timeout = options?.timeout ?? 5000;
  const retries = options?.retries ?? 3;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Ralph-CLI/3.0.0',
          ...options?.headers,
        },
        body: JSON.stringify({
          source: 'ralph-cli',
          ...payload,
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (response.ok) {
        return true;
      }

      // Don't retry 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        return false;
      }
    } catch (err) {
      // Last attempt failed
      if (attempt === retries - 1) {
        console.error(`Webhook failed after ${retries} attempts: ${err.message}`);
        return false;
      }

      // Exponential backoff: 1s, 2s, 4s
      await sleep(1000 * Math.pow(2, attempt));
    }
  }

  return false;
}
```

### Pattern 5: Webhook Configuration
**What:** Configure webhook URL via environment or config
**When to use:** SCRP-04 webhook setup
**Source:** Existing docs/integrations/webhooks.md

```typescript
// Load webhook config from environment or database
function getWebhookConfig(): {
  url?: string;
  urls?: string[];
  auth?: string;
  headers?: Record<string, string>;
} {
  // Priority: Environment -> Database (user_preferences) -> None

  // Check environment
  const singleUrl = process.env.RALPH_WEBHOOK_URL;
  const multiUrls = process.env.RALPH_WEBHOOK_URLS?.split(',');
  const auth = process.env.RALPH_WEBHOOK_AUTH;
  const headersJson = process.env.RALPH_WEBHOOK_HEADERS;

  let headers: Record<string, string> | undefined;
  if (headersJson) {
    try {
      headers = JSON.parse(headersJson);
    } catch {
      console.warn('Invalid RALPH_WEBHOOK_HEADERS JSON');
    }
  }

  if (auth) {
    headers = { ...headers, Authorization: auth };
  }

  return {
    url: singleUrl,
    urls: multiUrls,
    headers,
  };
}

// Broadcast to all configured webhooks
async function broadcastWebhook(payload: LoopWebhookPayload): Promise<void> {
  const config = getWebhookConfig();
  const urls = config.urls ?? (config.url ? [config.url] : []);

  if (urls.length === 0) {
    return; // No webhooks configured
  }

  await Promise.allSettled(
    urls.map((url) => sendWebhookNotification(url, payload, {
      headers: config.headers,
    }))
  );
}
```

### Anti-Patterns to Avoid
- **Mixing JSON and text output**: When `--json` is set, ALL output must be JSON (no console.error with text)
- **Non-standard exit codes**: Don't use custom codes > 255 or negative codes
- **Blocking webhooks**: Don't wait for webhook success before returning - fire and forget (or log failure)
- **Hardcoded webhook URLs**: Always use environment/config, never hardcode URLs
- **Polling for completion**: Use fs.watch, not setInterval polling

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP requests with timeout | Custom timeout logic | `AbortSignal.timeout()` | Built-in, clean API |
| Retry with backoff | Custom retry loop | Simple exponential backoff | Pattern is well-known, keep it simple |
| Webhook configuration | Custom config file | Environment variables | Standard, no new config files |
| JSON formatting | Custom formatter | `JSON.stringify(_, null, 2)` | Built-in, handles edge cases |
| Completion detection | Custom log parser | grep-style string search | Simple, matches loop.sh |

**Key insight:** The existing codebase already has most of the infrastructure. This phase primarily adds flags to existing commands and integrates with the existing webhook system.

## Common Pitfalls

### Pitfall 1: JSON Output to stderr Breaks Parsing
**What goes wrong:** Scripts piping `ralph status --json` get parse errors
**Why it happens:** Mixing JSON data on stdout with errors on stderr
**How to avoid:**
- When `--json` is set, write ALL output to stdout
- Errors become `{"success": false, "error": "..."}` not console.error
- Disable chalk colors when `--json` is set (no ANSI escapes in JSON)
**Warning signs:** `jq` parse errors, empty `data` fields

```typescript
// BAD: Mixing output streams
if (options.json) {
  console.log(JSON.stringify(data));
}
console.error('Warning: something'); // Breaks JSON parsing!

// GOOD: Consistent JSON envelope
if (options.json) {
  if (error) {
    console.log(JSON.stringify({ success: false, error }));
  } else {
    console.log(JSON.stringify({ success: true, data }));
  }
} else {
  // Human-readable with colors
}
```

### Pitfall 2: Exit Code 0 on "No Results"
**What goes wrong:** Scripts check exit code, assume failure when there's no data
**Why it happens:** Confusing "no loops running" with "error"
**How to avoid:**
- Exit 0 for successful query, even with empty results
- Exit non-zero only for actual errors (DB failure, invalid args)
- Include `data: []` in JSON output for empty results
**Warning signs:** CI scripts failing when no loops are running

```typescript
// BAD: Exit 1 for empty results
if (loops.length === 0) {
  console.error('No loops running');
  process.exit(1); // This is NOT an error!
}

// GOOD: Exit 0, data is empty array
if (loops.length === 0) {
  if (options.json) {
    console.log(JSON.stringify({ success: true, data: [] }));
  } else {
    emptyState('No running loops');
  }
  process.exit(0); // Success, just nothing to show
}
```

### Pitfall 3: Webhook Blocks Command Return
**What goes wrong:** `ralph stop` takes 10+ seconds due to slow webhook
**Why it happens:** Waiting for webhook response before command completion
**How to avoid:**
- Fire webhooks asynchronously (don't await in command flow)
- Set aggressive timeouts (5s max)
- Log failures but don't fail the command
**Warning signs:** Slow command execution, "hung" CLI

```typescript
// BAD: Blocking on webhook
await sendWebhook(payload); // Command hangs here
console.log('Done');

// GOOD: Fire and forget with error handling
sendWebhook(payload).catch((err) => {
  // Log but don't throw - webhook failure shouldn't fail the command
  console.error(`Webhook failed: ${err.message}`);
});
console.log('Done');
```

### Pitfall 4: Completion Signal False Positives
**What goes wrong:** Loop stops early because ALL_TASKS_COMPLETE appears in output context
**Why it happens:** Signal string appears in Claude's reasoning about the signal
**How to avoid:**
- Check for signal on its own line (like loop.sh does)
- Or require specific format: `\nALL_TASKS_COMPLETE\n`
- The existing loop.sh grep works well - match that behavior
**Warning signs:** Premature stops, tasks remaining when loop ends

```typescript
// BAD: Simple includes
if (content.includes('ALL_TASKS_COMPLETE')) {
  // Matches: "I should output ALL_TASKS_COMPLETE when done"
}

// GOOD: Match existing loop.sh behavior (grep -q)
// Signal should appear as clear marker, not in explanation
const lines = content.split('\n');
const signalLine = lines.find(line =>
  line.trim() === 'ALL_TASKS_COMPLETE' ||
  line.includes('"ALL_TASKS_COMPLETE"') // In stream-json output
);
```

### Pitfall 5: Webhook URL Validation Missing
**What goes wrong:** Invalid URLs cause cryptic fetch errors
**Why it happens:** No validation of RALPH_WEBHOOK_URL format
**How to avoid:**
- Validate URL format on load
- Check for HTTPS (warn on HTTP in production)
- Test webhook connectivity on first use
**Warning signs:** "Invalid URL" errors, "fetch failed" without context

```typescript
// Validate webhook URL
function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use http or https' };
    }
    if (parsed.protocol === 'http:' && !parsed.hostname.includes('localhost')) {
      console.warn('Warning: Using HTTP for webhook. Consider HTTPS for security.');
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}
```

## Code Examples

Verified patterns from official sources and existing codebase:

### Commander.js with --json Option
```typescript
// Source: Commander.js README, existing cli/src/commands/status.ts
import { Command } from 'commander';

export const statusCommand = new Command('status')
  .description('Show all running loops system-wide')
  .option('-j, --json', 'Output in JSON format')
  .action(async (options: { json?: boolean }) => {
    try {
      const loops = getActiveLoops();

      if (options.json) {
        // JSON mode: structured output, no colors
        const output = {
          success: true,
          data: loops.map(loop => ({
            projectId: loop.projectId,
            mode: loop.mode,
            pid: loop.pid,
            startedAt: loop.startedAt,
            iteration: loop.iteration,
            cost: loop.costSpent,
            isAlive: loop.isAlive,
          })),
          metadata: {
            timestamp: new Date().toISOString(),
            version: '3.0.0',
          },
        };
        console.log(JSON.stringify(output, null, 2));
        process.exit(0);
      }

      // Human-readable mode: colors, table format
      if (loops.length === 0) {
        emptyState('No running loops');
        process.exit(0);
      }

      // ... existing table output
      process.exit(0);
    } catch (err) {
      if (options.json) {
        console.log(JSON.stringify({
          success: false,
          error: (err as Error).message,
        }));
      } else {
        console.error(colors.error(`Error: ${(err as Error).message}`));
      }
      process.exit(1);
    }
  });
```

### Webhook Sender with Retry
```typescript
// Source: fetch-retry npm pattern, existing webhookManager.ts
async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  maxRetries = 3
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Ralph-CLI/3.0.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return;
      }

      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Webhook rejected: HTTP ${response.status}`);
      }

      // Retry server errors (5xx)
    } catch (err) {
      if (attempt === maxRetries - 1) {
        throw err;
      }
      // Exponential backoff
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}
```

### Completion Detection Integration
```typescript
// Source: loop.sh lines 789-834, Node.js fs.watch docs
import * as fs from 'fs';

async function monitorForCompletion(
  logPath: string,
  onComplete: (event: 'complete' | 'failed', details: object) => void
): Promise<() => void> {
  let lastPosition = 0;

  const checkLog = async () => {
    try {
      const stat = await fs.promises.stat(logPath);
      if (stat.size <= lastPosition) return;

      const fd = await fs.promises.open(logPath, 'r');
      const buffer = Buffer.alloc(stat.size - lastPosition);
      await fd.read(buffer, 0, buffer.length, lastPosition);
      await fd.close();

      const newContent = buffer.toString();
      lastPosition = stat.size;

      // Check for completion signals
      if (newContent.includes('ALL_TASKS_COMPLETE')) {
        onComplete('complete', { signal: 'ALL_TASKS_COMPLETE' });
      } else if (newContent.includes('PLANNING_COMPLETE')) {
        onComplete('complete', { signal: 'PLANNING_COMPLETE' });
      }
      // Could also check for error patterns
    } catch (err) {
      console.error('Log monitoring error:', err);
    }
  };

  // Initial check
  await checkLog();

  // Watch for changes
  const watcher = fs.watch(logPath, checkLog);

  // Return cleanup function
  return () => watcher.close();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| sysexits.h codes (64-78) | Simple 0/1 codes | Deprecated by FreeBSD | Use 0=success, 1=error |
| Custom JSON libraries | JSON.stringify | Always | No dependency needed |
| Polling for completion | fs.watch events | 2020+ | Better performance |
| Blocking webhooks | Async with timeout | Always | Non-blocking CLI |
| node-fetch | Native fetch | Node 18+ | No dependency |

**Deprecated/outdated:**
- `request` npm package: Deprecated, use native fetch
- `node-fetch`: Native fetch available since Node 18
- Complex exit code schemes: Community consensus is 0=success, 1=error

## Open Questions

Things that couldn't be fully resolved:

1. **Where should webhook config persist for CLI?**
   - What we know: Dashboard uses in-memory WebhookManager, env vars for defaults
   - What's unclear: Should CLI have its own webhook config? Or share with dashboard?
   - Recommendation: Use environment variables (`RALPH_WEBHOOK_URL`) for now - simplest, no new config files

2. **Should auto-stop be a separate command or flag?**
   - What we know: `ralph start` already returns immediately (daemon mode)
   - What's unclear: How should user opt into auto-stop? Flag on start? Separate watcher command?
   - Recommendation: Add `--wait` flag to `ralph start` that blocks until completion, or create `ralph watch <project>` command

3. **Webhook idempotency**
   - What we know: Webhook receivers may get duplicates on retry
   - What's unclear: Should we add webhook-id header for deduplication?
   - Recommendation: Add `X-Ralph-Event-Id: <sessionId>-<event>` header, document for receivers

## Sources

### Primary (HIGH confidence)
- [POSIX Exit Codes](https://tldp.org/LDP/abs/html/exitcodes.html) - Exit code standards
- [Node.js CLI Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices) - JSON output patterns
- [Commander.js GitHub](https://github.com/tj/commander.js) - CLI framework
- Existing codebase: `cli/src/commands/*.ts`, `dashboard/server/integrations/webhookManager.ts`
- Existing codebase: `loop.sh` (completion signal detection, lines 789-834)
- Existing codebase: `docs/integrations/webhooks.md` (webhook payload format)

### Secondary (MEDIUM confidence)
- [Standard Webhooks Spec](https://github.com/standard-webhooks/standard-webhooks) - Webhook best practices
- [Modern CLI Design](https://moderncli.dev/code/exit-code/) - Exit code conventions
- [Node.js fs.watch](https://nodejs.org/api/fs.html#fswatchfilename-options-listener) - File watching

### Tertiary (LOW confidence)
- WebSearch results for webhook retry patterns (verified against existing webhookManager.ts)

## Metadata

**Confidence breakdown:**
- Exit codes: HIGH - POSIX standard well documented, simple pattern
- JSON output: HIGH - Commander.js supports options, pattern is straightforward
- Auto-stop: HIGH - Completion signals already defined and working in loop.sh
- Webhooks: HIGH - Existing webhookManager.ts provides complete implementation

**Research date:** 2026-01-20
**Valid until:** 90 days (CLI patterns are stable, webhook infrastructure already exists)
