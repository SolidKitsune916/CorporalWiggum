RalphWiggumV2 Improvements from ralph-orchestrator
Summary
Port key features from ralph-orchestrator (Python framework) to enhance RalphWiggumV2 (bash+React dashboard) with better safety controls, cost tracking, and observability.

Phase 1: Safety & Cost Control (Priority: Critical)
1.1 Cost Tracking & Limits
Gap: RalphWiggumV2 has no cost awareness - agents can run up significant bills.

Implementation:

Create costTracker.ts:


interface CostTracker {
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCost: number;
  costLimit: number;
  perIterationCosts: IterationCost[];
}
Parse Claude CLI stream-json output for usage events
Use pricing: $3/1M input, $15/1M output (Opus)
Emit cost:update WebSocket events
Modify loop.sh:407-438:

Already uses --output-format=stream-json
Add cost tracking by parsing JSON lines for usage data
Add COST_LIMIT env var (default $50)
Exit loop when cost limit exceeded
Modify loopController.ts:46-78:

Add costLimit parameter to start() options
Parse stdout for JSON cost data
Track cumulative cost across iterations
Create CostMeter.tsx:

Display current spend / limit
Progress bar with color thresholds (green < 50%, yellow < 80%, red >= 80%)
Update types/index.ts:


interface LoopStatus {
  // ... existing fields
  costSpent?: number;
  costLimit?: number;
  tokensUsed?: { input: number; output: number };
}
1.2 Runtime Limits
Gap: RalphWiggumV2 runs indefinitely until completion/max iterations.

Implementation:

Modify loop.sh:

Add MAX_RUNTIME env var (default 14400 = 4 hours)
Track LOOP_START_TIME=$(date +%s) before main loop
Check elapsed time at start of each iteration
Exit with message when runtime exceeded
Modify loopController.ts:46:

Add maxRuntime parameter to start() options
Pass as env var to loop.sh
Modify LoopControls.tsx:

Add runtime limit input field (hours/minutes selector)
Default to 4 hours
Modify LoopStatus.tsx:

Calculate elapsed time from startedAt
Display "Elapsed: 1h 23m / 4h 00m limit"
1.3 Enhanced Loop Detection
Gap: Basic "no progress" detection vs fuzzy string matching.

Implementation:

Install string-similarity npm package in dashboard/

Modify loopController.ts:


import stringSimilarity from 'string-similarity';

private recentOutputs: string[] = [];
private readonly LOOP_THRESHOLD = 0.9;
private readonly OUTPUT_HISTORY_SIZE = 5;

private detectLoop(currentOutput: string): boolean {
  for (const prev of this.recentOutputs) {
    if (stringSimilarity.compareTwoStrings(currentOutput, prev) >= this.LOOP_THRESHOLD) {
      return true;
    }
  }
  this.recentOutputs.push(currentOutput);
  if (this.recentOutputs.length > this.OUTPUT_HISTORY_SIZE) {
    this.recentOutputs.shift();
  }
  return false;
}
Capture Claude output in stdout handler (already accumulating per iteration)

Add loopDetected field to LoopStatus type

Display warning in LoopStatus.tsx when loop detected

Phase 2: Resilience (Priority: High)
2.1 Exponential Backoff
Gap: RalphWiggumV2 has no backoff strategy on failures.

Implementation:

Modify loop.sh:142-144 (already has CONSECUTIVE_FAILURES):


# After check_iteration_health returns failure:
if [ "$CONSECUTIVE_FAILURES" -gt 0 ]; then
  BACKOFF=$((2 ** CONSECUTIVE_FAILURES))
  if [ "$BACKOFF" -gt 60 ]; then BACKOFF=60; fi
  echo "Backing off for ${BACKOFF}s before retry..."
  sleep "$BACKOFF"
fi
Add backoff info to health log output

Optionally emit backoff status to dashboard via log parsing

2.2 State Rollback on Repeated Failures
Gap: No recovery mechanism after consecutive failures.

Implementation:

Modify loop.sh after 3 consecutive failures:


if [ "$CONSECUTIVE_FAILURES" -ge 3 ]; then
  echo "Rolling back to last successful checkpoint..."
  git reset --hard HEAD~1 2>/dev/null || true
  CONSECUTIVE_FAILURES=0
fi
Track last successful commit hash for targeted rollback

Log rollback events to health log

Phase 3: Observability (Priority: Medium)
3.1 Per-Iteration Telemetry
Gap: Basic health logging vs structured telemetry.

Implementation:

Create telemetryTracker.ts:


interface IterationTelemetry {
  iteration: number;
  startedAt: Date;
  duration: number;
  success: boolean;
  triggerReason: 'INITIAL' | 'TASK_INCOMPLETE' | 'RECOVERY' | 'LOOP_DETECTED';
  tokensUsed?: { input: number; output: number };
  cost?: number;
  toolsUsed?: string[];
  outputPreview?: string;
  errorMessage?: string;
}
Export telemetry to ralph-metrics.json after each run

Create TelemetryPanel.tsx:

Collapsible iteration history
Show duration, tokens, cost per iteration
Success/failure indicators
Add WebSocket message types:


interface TelemetryUpdateMessage extends WSMessage {
  type: 'telemetry:update';
  payload: IterationTelemetry;
}
3.2 Configurable Completion Promise
Gap: Only recognizes ALL_TASKS_COMPLETE string.

Implementation:

Modify loop.sh:487:


COMPLETION_PROMISE="${COMPLETION_PROMISE:-ALL_TASKS_COMPLETE}"
if grep -q "$COMPLETION_PROMISE" "$OUTPUT_LOG" 2>/dev/null; then
Add completionPromise to LoopControls.tsx form

Pass as env var from loopController.ts

Phase 4: Optimization (Priority: Low)
4.1 Dry Run Mode
Implementation:

Add --dry-run flag to loop.sh:


if [ "${DRY_RUN:-false}" = "true" ]; then
  echo "[DRY RUN] Would execute: claude -p ..."
  echo "[DRY RUN] Prompt file: $PROMPT_FILE_PATH"
  cat "$PROMPT_FILE_PATH"
  exit 0
fi
Add checkbox to LoopControls.tsx

4.2 YAML Configuration
Implementation:

Create ralph.yml schema:


maxIterations: 100
maxRuntime: 14400  # seconds
costLimit: 50.0    # dollars
completionPromise: "ALL_TASKS_COMPLETE"
loopDetectionThreshold: 0.9
backoffEnabled: true
rollbackOnFailure: true
Load in loop.sh using yq or simple grep/sed parsing

Optionally add config editor to Setup tab

Files to Modify
File	Changes
loop.sh	Cost tracking, runtime limits, backoff, rollback, completion promise
loopController.ts	Loop detection, cost parsing, telemetry
types/index.ts	New types for cost, telemetry, config
LoopControls.tsx	Runtime limit, cost limit, completion promise inputs
LoopStatus.tsx	Elapsed time, cost display, loop detection warning
Dashboard.tsx	Add CostMeter, TelemetryPanel components
Files to Create
File	Purpose
costTracker.ts	Token/cost accounting
telemetryTracker.ts	Per-iteration telemetry
CostMeter.tsx	Cost display component
TelemetryPanel.tsx	Iteration history view
Implementation Order
#	Feature	Complexity	Est. LOC
1	Runtime Limits	Low	~50
2	Cost Tracking	Medium	~200
3	Loop Detection	Low-Med	~80
4	Exponential Backoff	Low	~20
5	State Rollback	Low	~30
6	Per-Iteration Telemetry	Medium	~250
7	Completion Promise Config	Low	~30
8	Dry Run Mode	Low	~20
9	YAML Configuration	Medium	~100
Verification Plan
Runtime Limits: Set 1-minute limit, verify loop stops at ~60 seconds
Cost Tracking: Run loop, verify token counts match Claude CLI output, check cost meter updates
Loop Detection: Create task that causes repeated similar output, verify detection and warning
Backoff: Cause validation failures, verify increasing sleep delays in ralph-health.log
Rollback: Force 3+ failures, verify git log shows reset to previous commit
Telemetry: Complete a run, verify ralph-metrics.json contains iteration details with correct data
Completion Promise: Set custom string, verify loop stops when that string appears in output