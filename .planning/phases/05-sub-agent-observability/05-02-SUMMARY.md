---
phase: 05-sub-agent-observability
plan: 02
subsystem: telemetry-ui
tags: [sub-agents, react, websocket, frontend]

dependency-graph:
  requires: [05-01]
  provides: [sub-agent-ui-panel, websocket-telemetry-integration]
  affects: [05-03]

tech-stack:
  added: []
  patterns: [websocket-state-management, react-component-composition]

key-files:
  created:
    - dashboard/src/components/SubAgentPanel.tsx
  modified:
    - dashboard/src/hooks/useWebSocket.ts
    - dashboard/server/index.ts
    - dashboard/src/components/LoopStatus.tsx
    - dashboard/src/components/Dashboard.tsx

decisions:
  - id: panel-conditional-render
    choice: SubAgentPanel only renders when loop is running
    rationale: No telemetry to show when idle, avoids empty panel clutter
  - id: iteration-breakdown-last-five
    choice: Show last 5 iterations in breakdown
    rationale: Keeps panel compact while showing recent activity trend
  - id: warning-threshold-default
    choice: Default warning threshold 20 sub-agents per session
    rationale: Based on typical session costs, configurable via prop
  - id: cost-estimate-rate
    choice: $0.02 per sub-agent spawn estimate
    rationale: Consistent with Plan 01 research, server calculates on broadcast

metrics:
  duration: 4 min
  completed: 2026-01-20
---

# Phase 5 Plan 2: Sub-Agent Frontend UI Summary

**One-liner:** SubAgentPanel component with WebSocket state management displaying real-time sub-agent telemetry

## What Was Built

This plan creates the frontend UI for sub-agent observability:

1. **SubAgentPanel Component** (`dashboard/src/components/SubAgentPanel.tsx`)
   - Session total sub-agent count with prominent display
   - Estimated cost calculation (default $0.02/spawn)
   - Last spawn timestamp display
   - Iteration breakdown showing last 5 iterations as badges
   - High usage warning styling when threshold exceeded
   - Graceful handling of no telemetry state

2. **WebSocket Hook Extension** (`dashboard/src/hooks/useWebSocket.ts`)
   - Added `subAgentTelemetry` state variable
   - Handle `subagent:status` messages to update telemetry
   - Handle `subagent:warning` messages with toast notifications
   - Reset telemetry when loop stops
   - Reset telemetry on URL change (project switch)

3. **Server WebSocket Broadcast** (`dashboard/server/index.ts`)
   - Listen to loopController `subagent:spawned` events
   - Fetch full telemetry from `loopController.getSubAgentTelemetry()`
   - Calculate estimated cost at $0.02 per sub-agent
   - Broadcast `subagent:status` to all connected clients

4. **Dashboard Integration**
   - LoopStatus component accepts and passes subAgentTelemetry
   - SubAgentPanel renders below LoopStatus card when loop is running
   - Dashboard destructures subAgentTelemetry from useWebSocket

## Key Implementation Details

### Component Structure
```typescript
interface SubAgentPanelProps {
  telemetry: SubAgentTelemetry | null;
  isRunning: boolean;
  warningThreshold?: number;  // Default: 20 per session
}
```

### Iteration Breakdown Display
```typescript
const iterationBreakdown = telemetry?.iterationCounts
  ? Object.entries(telemetry.iterationCounts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(-5)  // Show last 5 iterations
  : [];
```

### WebSocket Message Flow
1. LoopController emits `subagent:spawned` event on Task tool detection
2. Server handler calls `loopController.getSubAgentTelemetry()` for current state
3. Server broadcasts `subagent:status` message with full telemetry
4. Frontend `useWebSocket` updates `subAgentTelemetry` state
5. `LoopStatus` receives state and renders `SubAgentPanel`

## Commits

| Hash | Description |
|------|-------------|
| 8ba317f | feat(05-02): create SubAgentPanel component |
| bd16533 | feat(05-02): extend useWebSocket with sub-agent telemetry state |
| 99ceaa3 | feat(05-02): wire server WebSocket broadcast for sub-agent telemetry |
| 50778cf | feat(05-02): integrate SubAgentPanel into Dashboard |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 05-03:** Frontend UI complete. The following are now available:
- `SubAgentPanel` component for telemetry display
- `subAgentTelemetry` state in useWebSocket hook
- Real-time updates via WebSocket on each spawn
- UI automatically shows when loop is running

**For Plan 03 (Session Persistence Display):**
- SubAgentPanel already receives `telemetry.sessionTotal`
- Database persistence from Plan 01 can provide historical counts
- Panel can be extended to show historical data when session ends
