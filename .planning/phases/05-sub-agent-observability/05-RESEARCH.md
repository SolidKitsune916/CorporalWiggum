# Phase 5: Sub-agent Observability - Research

**Researched:** 2026-01-20
**Domain:** Claude Code Sub-agent Detection, Telemetry Panel, Cost Tracking, Threshold Alerts
**Confidence:** MEDIUM

## Summary

This research investigates how to track sub-agent spawning behavior in Claude Code loops and display this data in the dashboard's telemetry panel. Claude Code uses the Task tool to spawn sub-agents (parallel Claude instances that execute independently). These sub-agents can significantly impact cost since each spawns its own context.

The key challenge is **detection**: Claude Code's streaming JSON output contains tool_use blocks where sub-agents are invoked via `name: "Task"`. Messages from within a sub-agent include a `parent_tool_use_id` field. However, the loop.sh currently captures output to ralph.log without structured parsing of the stream-json format.

The existing codebase has:
- `SessionRepository` with fields for cost tracking (`costSpent`, `tokensInputTotal`, `tokensOutputTotal`)
- `iteration_telemetry` table for per-iteration data (includes `tools_used_json` field)
- `AlertManager` for sending alerts across multiple channels
- `MetricsCollector` with Prometheus-style counters and gauges
- WebSocket infrastructure for real-time UI updates

**Primary recommendation:** Parse Claude Code's stream-json output for `tool_use` blocks with `name: "Task"`, count sub-agent spawns per iteration, store in `iteration_telemetry`, aggregate to session level, and display in telemetry panel with configurable threshold alerts.

## Standard Stack

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^12.6.0 | SQLite for persistence | Already used for sessions/iterations |
| ws | ^8.19.0 | WebSocket real-time updates | Already integrated |
| chokidar | ^5.0.0 | File watching | Already used for log monitoring |

### Supporting (Already in Codebase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| AlertManager | built-in | Threshold alerts | Sub-agent count exceeds limit |
| MetricsCollector | built-in | Counter/gauge tracking | Sub-agent metrics |
| sonner | ^2.0.7 | Toast notifications | Warning displays |

### No Additional Dependencies Needed
The current stack provides everything needed. Focus is on:
1. Parsing Claude Code stream-json output
2. Extending existing data models
3. Adding UI components for display

## Architecture Patterns

### Recommended Project Structure

No new files, extend existing:
```
dashboard/server/
├── loopController.ts          # Add stream-json parsing for Task tool
├── database/
│   └── repositories/
│       ├── SessionRepository.ts   # Add subAgentCount field
│       └── IterationRepository.ts # NEW: Per-iteration telemetry queries
└── lib/
    └── subAgentParser.ts      # NEW: Parse Task tool from stream-json

dashboard/src/
├── components/
│   ├── SubAgentPanel.tsx      # NEW: Display sub-agent counts
│   └── Dashboard.tsx          # Add SubAgentPanel to telemetry area
└── types/index.ts             # Add sub-agent types
```

### Pattern 1: Stream-JSON Sub-agent Detection

**What:** Parse Claude Code's stream-json output to detect Task tool invocations
**When to use:** During loop execution, processing stdout from Claude CLI
**Source:** [Claude Code Docs - Programmatic Usage](https://code.claude.com/docs/en/headless)

```typescript
// Sub-agent detection from stream-json output
interface StreamMessage {
  type: 'assistant' | 'user' | 'system' | 'tool_use' | 'tool_result';
  message?: {
    role: string;
    content: Array<{
      type: string;
      name?: string;       // "Task" for sub-agent
      id?: string;         // tool_use_id
      input?: unknown;
    }>;
  };
  parent_tool_use_id?: string | null;  // Non-null = inside sub-agent
  session_id?: string;
}

function parseSubAgentSpawn(line: string): { spawned: boolean; toolUseId?: string } {
  try {
    const msg: StreamMessage = JSON.parse(line);

    // Detect Task tool invocation (sub-agent spawn)
    if (msg.message?.content) {
      for (const block of msg.message.content) {
        if (block.type === 'tool_use' && block.name === 'Task') {
          return { spawned: true, toolUseId: block.id };
        }
      }
    }
    return { spawned: false };
  } catch {
    return { spawned: false };
  }
}
```

### Pattern 2: Per-Iteration Sub-agent Counting

**What:** Track sub-agent count at iteration granularity
**When to use:** During loop execution, update on each iteration boundary
**Source:** Existing iteration tracking pattern in loopController.ts

```typescript
// In LoopController
private subAgentCount = 0;
private iterationSubAgentCounts: Map<number, number> = new Map();

private processStreamLine(line: string): void {
  // Check for sub-agent spawn
  const result = parseSubAgentSpawn(line);
  if (result.spawned) {
    this.subAgentCount++;
    const currentIter = this.status.iteration;
    const iterCount = this.iterationSubAgentCounts.get(currentIter) || 0;
    this.iterationSubAgentCounts.set(currentIter, iterCount + 1);

    // Emit for UI update
    this.emit('subagent:spawned', {
      iteration: currentIter,
      count: this.subAgentCount,
      toolUseId: result.toolUseId,
    });
  }

  // Check for iteration boundary (existing pattern)
  const iterMatch = line.match(/LOOP\s+(\d+)/i);
  if (iterMatch) {
    // Record previous iteration's sub-agent count
    this.recordIterationSubAgents();
    // ... existing iteration handling
  }
}
```

### Pattern 3: Threshold Alert System

**What:** Alert when sub-agent spawning exceeds configurable threshold
**When to use:** After each sub-agent spawn, check against threshold
**Source:** Existing AlertManager pattern

```typescript
// Sub-agent threshold configuration
interface SubAgentConfig {
  warningThreshold: number;    // Default: 5 per iteration
  criticalThreshold: number;   // Default: 10 per iteration
  sessionWarningThreshold: number;  // Default: 20 per session
}

function checkSubAgentThreshold(
  iteration: number,
  iterationCount: number,
  sessionCount: number,
  config: SubAgentConfig
): void {
  // Per-iteration warning
  if (iterationCount >= config.criticalThreshold) {
    alertManager.send(
      'High Sub-agent Spawning',
      `Iteration ${iteration} spawned ${iterationCount} sub-agents (critical threshold: ${config.criticalThreshold})`,
      'high',
      'subagent-monitor'
    );
  } else if (iterationCount >= config.warningThreshold) {
    alertManager.send(
      'Sub-agent Spawning Warning',
      `Iteration ${iteration} spawned ${iterationCount} sub-agents`,
      'medium',
      'subagent-monitor'
    );
  }

  // Session-level warning
  if (sessionCount >= config.sessionWarningThreshold) {
    alertManager.send(
      'Session Sub-agent Limit',
      `Session has spawned ${sessionCount} sub-agents total`,
      'high',
      'subagent-monitor'
    );
  }
}
```

### Pattern 4: Cost Estimation for Sub-agents

**What:** Estimate additional cost from sub-agent spawning
**When to use:** Display in telemetry panel
**Source:** Claude pricing model research

```typescript
// Sub-agent cost estimation
// Each sub-agent incurs:
// 1. Context loading cost (system prompt + initial context)
// 2. Tool execution costs
// 3. Response generation costs

// Conservative estimate: ~$0.01-0.05 per sub-agent spawn (varies by task)
const SUBAGENT_BASE_COST_ESTIMATE = 0.02; // $0.02 per sub-agent

function estimateSubAgentCost(subAgentCount: number): number {
  return subAgentCount * SUBAGENT_BASE_COST_ESTIMATE;
}

// More accurate: track actual sub-agent costs from stream-json usage events
// Stream-json includes token counts that can be attributed to sub-agents
```

### Anti-Patterns to Avoid

- **Polling log files:** Use stream processing, not file polling for sub-agent detection
- **Blocking stream parsing:** Parse JSON lines asynchronously, don't block main thread
- **Global counters only:** Track at iteration level for meaningful analysis
- **Hard-coded thresholds:** Make thresholds configurable per-project

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Alert dispatching | Custom notification system | AlertManager (existing) | Multi-channel support, tested |
| Metrics collection | Custom counters | MetricsCollector (existing) | Prometheus-compatible |
| Real-time UI updates | HTTP polling | WebSocket events (existing) | Already integrated |
| Stream parsing | Line-by-line regex | JSON.parse per line | Structured, type-safe |

**Key insight:** The infrastructure exists. Focus on connecting stream parsing to existing telemetry.

## Common Pitfalls

### Pitfall 1: Missing Sub-agent Detection

**What goes wrong:** Sub-agents spawn but aren't counted
**Why it happens:** Claude CLI output not using stream-json format
**How to avoid:**
1. Ensure loop.sh uses `--output-format stream-json` for Claude CLI invocation
2. Parse stderr (Claude streams JSON to stderr)
3. Handle both tool_use in assistant messages and tool_result in user messages
**Warning signs:** Sub-agent count stays at 0 despite complex tasks

### Pitfall 2: Double-Counting Sub-agents

**What goes wrong:** Same sub-agent counted multiple times
**Why it happens:** Multiple events per sub-agent (start, tool uses, completion)
**How to avoid:**
1. Track by tool_use_id, not by message count
2. Only count on initial Task tool_use, not subsequent messages
3. Use Set for deduplication
**Warning signs:** Sub-agent count much higher than expected

### Pitfall 3: Cost Estimation Drift

**What goes wrong:** Estimated cost diverges significantly from actual
**Why it happens:** Sub-agent complexity varies widely
**How to avoid:**
1. Display as "estimated" with disclaimer
2. If possible, parse actual token usage from stream-json
3. Allow user correction of estimate multiplier
**Warning signs:** User reports cost mismatch

### Pitfall 4: Alert Fatigue

**What goes wrong:** Too many threshold alerts, users ignore them
**Why it happens:** Thresholds too low, or legitimate high-subagent tasks
**How to avoid:**
1. Start with higher thresholds (5 warning, 10 critical)
2. Allow per-project threshold configuration
3. Include "snooze" or "dismiss" option
4. Aggregate alerts (don't fire per-spawn)
**Warning signs:** Users disable alerts entirely

### Pitfall 5: Performance Impact from Stream Parsing

**What goes wrong:** Parsing slows down loop execution
**Why it happens:** JSON.parse on every line in main thread
**How to avoid:**
1. Parse only lines that start with `{"type"` (quick pre-filter)
2. Process in batches if volume is high
3. Don't emit UI updates on every spawn (batch/debounce)
**Warning signs:** Loop iterations slower than without observability

## Code Examples

### Database Schema Extension

```sql
-- Add sub-agent tracking to active_sessions
ALTER TABLE active_sessions ADD COLUMN sub_agent_count INTEGER DEFAULT 0;

-- Add sub-agent field to iteration_telemetry (already has tools_used_json)
-- Use tools_used_json to store sub-agent details:
-- {"subAgents": [{"toolUseId": "...", "startedAt": "..."}], "count": 3}
```

### TypeScript Types

```typescript
// In types/index.ts

export interface SubAgentSpawnEvent {
  iteration: number;
  toolUseId: string;
  timestamp: Date;
}

export interface SubAgentTelemetry {
  sessionTotal: number;
  iterationCounts: Record<number, number>;  // iteration -> count
  lastSpawnAt?: Date;
  estimatedCost: number;
}

export interface SubAgentConfig {
  warningThreshold: number;       // per iteration
  criticalThreshold: number;      // per iteration
  sessionWarningThreshold: number;
  estimatedCostPerAgent: number;  // in USD
}

// WebSocket message types
export interface SubAgentStatusMessage extends WSMessage {
  type: 'subagent:status';
  payload: SubAgentTelemetry;
}

export interface SubAgentWarningMessage extends WSMessage {
  type: 'subagent:warning';
  payload: {
    level: 'warning' | 'critical';
    message: string;
    iteration: number;
    count: number;
  };
}
```

### SubAgentPanel Component

```typescript
// In components/SubAgentPanel.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users } from 'lucide-react';
import type { SubAgentTelemetry } from '@/types';

interface SubAgentPanelProps {
  telemetry: SubAgentTelemetry;
  warningThreshold: number;
}

export function SubAgentPanel({ telemetry, warningThreshold }: SubAgentPanelProps) {
  const isWarning = telemetry.sessionTotal >= warningThreshold;

  return (
    <Card className={isWarning ? 'border-yellow-500' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Sub-agents
          {isWarning && (
            <Badge variant="warning" className="ml-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              High Usage
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Session Total</span>
          <span className="font-mono font-semibold">{telemetry.sessionTotal}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Est. Cost</span>
          <span className="font-mono text-sm">
            ${telemetry.estimatedCost.toFixed(4)}
          </span>
        </div>
        {telemetry.lastSpawnAt && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Spawn</span>
            <span className="text-sm">
              {new Date(telemetry.lastSpawnAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Session Summary Integration

```typescript
// Add to session summary display
interface SessionSummary {
  // Existing fields
  iterations: number;
  duration: number;
  costSpent: number;
  tokensInput: number;
  tokensOutput: number;

  // New sub-agent fields
  subAgentTotal: number;
  subAgentsByIteration: Record<number, number>;
  subAgentEstimatedCost: number;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ignore sub-agents | Track via Task tool | Claude Code 2.0 (2025) | Cost visibility |
| Manual cost tracking | Stream-json parsing | Now standard | Automation |
| No thresholds | Configurable alerts | Best practice | Runaway prevention |

**Current Claude Code behavior (as of 2026):**
- Sub-agents spawned via Task tool
- Up to 7 parallel sub-agents supported
- Sub-agents cannot spawn sub-agents (prevents infinite nesting)
- Stream-json output includes parent_tool_use_id for context
- Transcript files stored separately for each sub-agent

## Open Questions

### 1. Exact stream-json format for Task tool

- **What we know:** Task tool invocations appear in tool_use blocks
- **What's unclear:** Exact JSON schema varies by Claude version
- **Recommendation:** Log sample output during development, build flexible parser

### 2. Sub-agent cost attribution

- **What we know:** Each sub-agent uses tokens independently
- **What's unclear:** How to attribute costs to specific sub-agents vs main context
- **Recommendation:** Start with simple estimation, refine with actual data

### 3. Threshold defaults

- **What we know:** Need configurable thresholds
- **What's unclear:** What values make sense for typical projects
- **Recommendation:** Start conservative (5 warning, 10 critical per iteration), adjust based on user feedback

### 4. Stream-json format adoption

- **What we know:** Current loop.sh may not use stream-json
- **What's unclear:** Impact of changing output format on existing parsing
- **Recommendation:** Check current claude invocation, add stream-json flag if not present

## Sources

### Primary (HIGH confidence)
- [Claude Code Docs - Programmatic Usage](https://code.claude.com/docs/en/headless) - Output formats, stream-json
- [Claude Code Docs - Sub-agents](https://code.claude.com/docs/en/sub-agents) - Task tool, sub-agent architecture
- Existing codebase: loopController.ts, SessionRepository.ts, AlertManager, MetricsCollector

### Secondary (MEDIUM confidence)
- [ClaudeLog - Task/Agent Tools](https://claudelog.com/mechanics/task-agent-tools/) - Task tool mechanics
- [alexop.dev - Claude Code Customization](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/) - Sub-agent behavior
- [Awesome Claude - Cheatsheet](https://awesomeclaude.ai/code-cheatsheet) - CLI flags reference

### Tertiary (LOW confidence)
- [claude-flow Wiki](https://github.com/ruvnet/claude-flow/wiki/Stream-Chaining) - Stream-json chaining patterns
- Community discussions on sub-agent detection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase patterns, no new dependencies
- Architecture: MEDIUM - Stream parsing approach validated, exact format needs verification
- Pitfalls: MEDIUM - Based on documented behavior, needs real-world validation
- Cost estimation: LOW - Estimates vary, needs calibration with actual data

**Research date:** 2026-01-20
**Valid until:** 30 days (Claude Code updates frequently, verify stream format)
