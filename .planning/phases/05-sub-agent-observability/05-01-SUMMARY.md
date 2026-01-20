---
phase: 05-sub-agent-observability
plan: 01
subsystem: telemetry
tags: [sub-agents, parsing, database, stream-json]

dependency-graph:
  requires: [04-launcher-hub]
  provides: [sub-agent-tracking-backend, sub-agent-database-schema]
  affects: [05-02, 05-03]

tech-stack:
  added: []
  patterns: [stream-json-parsing, event-emission, database-migration]

key-files:
  created:
    - dashboard/server/lib/subAgentParser.ts
  modified:
    - dashboard/server/loopController.ts
    - dashboard/server/database/index.ts
    - dashboard/server/database/repositories/SessionRepository.ts
    - dashboard/src/types/index.ts

decisions:
  - id: sub-agent-detection-via-tool-use
    choice: Parse stream-json for tool_use blocks with name="Task"
    rationale: Claude Code spawns sub-agents via Task tool, visible in stream-json stderr output
  - id: deduplication-via-tool-use-id
    choice: Track seen toolUseIds in Set to prevent double-counting
    rationale: Same tool_use message may appear multiple times in stream
  - id: session-level-persistence
    choice: Store sub_agent_count in active_sessions table
    rationale: Allows retrieval after process exits, enables historical analysis

metrics:
  duration: 3 min
  completed: 2026-01-20
---

# Phase 5 Plan 1: Sub-Agent Backend Foundation Summary

**One-liner:** Stream-json parser for Task tool detection with database persistence via migration 002

## What Was Built

This plan establishes the backend infrastructure for sub-agent observability:

1. **SubAgentParser Module** (`dashboard/server/lib/subAgentParser.ts`)
   - `parseSubAgentSpawn(line)` - Detects Task tool_use blocks in stream-json
   - `isInsideSubAgent(line)` - Checks if output is from within a sub-agent context
   - Quick pre-filter to skip non-JSON lines before parsing

2. **Database Schema Extension** (Migration 002)
   - Added `sub_agent_count INTEGER DEFAULT 0` to `active_sessions` table
   - Incremental migration preserves existing data

3. **SessionRepository Methods**
   - `updateSubAgentCount(sessionId, count)` - Increment counter atomically
   - `getSubAgentCount(sessionId)` - Retrieve current count
   - `updateSessionState(sessionId, state)` - Convenience method for state updates

4. **LoopController Integration**
   - Imports and uses parseSubAgentSpawn on stderr lines
   - Tracks counts per session and per iteration in memory
   - Updates database on each spawn detection
   - Emits `subagent:spawned` events for real-time UI updates
   - Provides `getSubAgentTelemetry()` for telemetry retrieval

5. **TypeScript Types**
   - `SubAgentTelemetry` - Session-level telemetry structure
   - `SubAgentConfig` - Threshold configuration
   - `SubAgentStatusMessage` / `SubAgentWarningMessage` - WebSocket message types

## Key Implementation Details

### Stream-JSON Parsing Strategy
```typescript
// Quick pre-filter avoids JSON.parse overhead
if (!line.startsWith('{') || !line.includes('"type"')) {
  return { spawned: false };
}

// Look for tool_use blocks with name="Task"
for (const block of msg.message.content) {
  if (block.type === 'tool_use' && block.name === 'Task') {
    return { spawned: true, toolUseId: block.id };
  }
}
```

### Deduplication
Each tool_use has a unique ID. We track seen IDs in a Set to prevent double-counting when the same message appears multiple times in the stream.

### Event Flow
1. Claude outputs stream-json to stderr
2. LoopController stderr handler calls parseSubAgentSpawn()
3. On spawn detection, handleSubAgentSpawn() updates:
   - In-memory counters (session total, per-iteration)
   - Database via sessionRepo.updateSubAgentCount()
   - Emits 'subagent:spawned' event with toolUseId

## Commits

| Hash | Description |
|------|-------------|
| 00aa61e | feat(05-01): create SubAgentParser module |
| a34d775 | feat(05-01): extend database schema and SessionRepository |
| 2b31922 | feat(05-01): wire LoopController to parse and track sub-agents |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 05-02:** Backend foundation complete. The following are now available:
- `parseSubAgentSpawn()` for additional parsing needs
- `sessionRepo.getSubAgentCount()` for retrieving counts
- `loopController.getSubAgentTelemetry()` for real-time telemetry
- `subagent:spawned` events for UI subscriptions
- WebSocket message types for frontend consumption

**Dependencies satisfied:**
- SubAgentTelemetry type defined for frontend components
- Database column exists for persistence
- Event emission pattern established for real-time updates
