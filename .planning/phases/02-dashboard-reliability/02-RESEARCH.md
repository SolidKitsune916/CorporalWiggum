# Phase 2: Dashboard Reliability - Research

**Researched:** 2026-01-19
**Domain:** React State Management, WebSocket Integration, File Watching, Process Control UI
**Confidence:** HIGH

## Summary

This research investigates how to make the existing Ralph dashboard reliably start, stop, and display loop state. Phase 1 built the process management foundation (ProcessRegistry, PidFileManager, GracefulShutdown, OrphanDetector). Phase 2 integrates this foundation into the dashboard UI with proper feedback, timing, and state synchronization.

The existing codebase has most infrastructure in place:
- `LoopController` already uses `ProcessRegistry` for loop registration and `GracefulShutdown` for stop
- `useWebSocket` hook receives status updates and emits commands
- `FileWatcher` watches IMPLEMENTATION_PLAN.md with chokidar
- Project switching uses URL params (`?backend=PORT`) for multi-instance support

**What needs fixing for DASH requirements:**

1. **DASH-01 (Start reliability)**: Start command works but UI feedback is delayed - need to confirm process is actually running before showing "Running"
2. **DASH-02 (Stop reliability)**: GracefulShutdown exists but UI doesn't wait for verification - need to show "Stopping..." state and only show "Stopped" after confirmed termination
3. **DASH-03 (Task list updates)**: FileWatcher watches the file but changes may not propagate reliably - need to verify debouncing and force refresh capability
4. **DASH-04 (Project switching)**: Navigation works but context may be stale - need to verify correct context load on project switch

**Primary recommendation:** Enhance the existing loop:start and loop:stop WebSocket handlers to include verification feedback, add explicit status confirmation messages, and add task list refresh mechanisms.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Already used, modern hooks API |
| WebSocket (ws) | 8.x | Real-time communication | Already used, native integration |
| chokidar | 3.x | File watching | Already used, cross-platform |
| sonner/toast | 1.x | User notifications | Already integrated in useWebSocket |

### Supporting (Already in Codebase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| EventEmitter | built-in | Server-side events | Status broadcasts |
| child_process | built-in | Process spawning | Loop execution |

### No Additional Dependencies Needed
The current stack is sufficient. The issues are integration, not missing libraries.

## Architecture Patterns

### Recommended Enhancements to Existing Structure

No new files required. Modify existing files:
```
dashboard/server/
├── loopController.ts        # Add start verification emit
├── index.ts                 # Add loop:start-confirmed, loop:stop-confirmed handlers
└── fileWatcher.ts           # Add force refresh mechanism

dashboard/src/
├── hooks/useWebSocket.ts    # Handle new confirmation messages
└── components/
    ├── LoopControls.tsx     # Show "Starting..."/"Stopping..." intermediate states
    └── Dashboard.tsx        # Handle project switch context refresh
```

### Pattern 1: Optimistic UI with Confirmation
**What:** Show intermediate state immediately, then confirm with server
**When to use:** Start/stop operations that take 1-5 seconds
**Source:** Existing codebase pattern extended

```typescript
// Client-side: Show intermediate state immediately
const [actionState, setActionState] = useState<'idle' | 'starting' | 'stopping'>('idle');

const handleStart = () => {
  setActionState('starting'); // Optimistic
  sendCommand({ type: 'loop:start', payload: options });
};

// Server confirms via loop:status with running=true
// OR sends loop:start-confirmed explicitly
```

### Pattern 2: Verified Stop with Progress Feedback
**What:** Wait for termination confirmation before showing "Stopped"
**When to use:** Stop operations where false success would be confusing
**Source:** Phase 1 GracefulShutdown pattern applied to UI

```typescript
// Server-side: Emit intermediate states during stop
async stop(): Promise<void> {
  this.emit('log', { content: 'Stopping loop...', type: 'info' });
  this.emit('status', { ...this.status, stopping: true }); // NEW: stopping state

  const result = await this.gracefulShutdown.stopAndVerify(pid);

  if (result.success) {
    this.emit('status', { running: false, stopping: false });
    this.emit('log', { content: `Stopped via ${result.method}`, type: 'success' });
  } else {
    this.emit('status', { running: true, stopping: false }); // Still running!
    this.emit('log', { content: 'Failed to stop', type: 'error' });
  }
}
```

### Pattern 3: File Watcher Debounce + Force Refresh
**What:** Debounce rapid changes, provide manual refresh
**When to use:** File watching where editor saves trigger multiple events
**Source:** chokidar best practices

```typescript
// Existing debounce in chokidar is default 100ms - may need tuning
const watcher = chokidar.watch(planPath, {
  persistent: true,
  ignoreInitial: false,
  awaitWriteFinish: {
    stabilityThreshold: 200, // Wait 200ms after last change
    pollInterval: 50,
  },
});

// Force refresh mechanism
async forceRefresh(): Promise<void> {
  await this.parseTasks();
  this.emit('tasks', this.tasks);
}
```

### Pattern 4: Context Refresh on Project Switch
**What:** Clear and reload all state when switching projects
**When to use:** Multi-project dashboard with shared components
**Source:** Existing backendPort pattern extended

```typescript
// When backendPort changes, reconnect WebSocket
useEffect(() => {
  // Close existing connection
  wsRef.current?.close();
  // Reconnect with new port
  connect();
}, [wsUrl]); // wsUrl includes backendPort

// On reconnect, server sends initial state
ws.onopen = () => {
  // Server automatically sends status, tasks, git, config
  ws.send(JSON.stringify({ type: 'session:current', payload: {} }));
};
```

### Anti-Patterns to Avoid
- **Fire and forget commands**: Always wait for confirmation before updating UI
- **Polling instead of events**: Use WebSocket push, not HTTP polling
- **Stale closures**: Use refs or callbacks for WebSocket message handlers
- **Assuming single project**: Always scope state to current project context

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Process liveness check | Shell out to ps | signal 0 (already in GracefulShutdown) | Cross-platform, reliable |
| File change detection | setTimeout polling | chokidar (already in FileWatcher) | Efficient, debounced |
| UI state sync | Custom pub/sub | WebSocket broadcast (already exists) | Already working |
| Toast notifications | Custom component | sonner/toast (already integrated) | Consistent UX |

**Key insight:** The infrastructure exists. Focus on integration and feedback timing.

## Common Pitfalls

### Pitfall 1: Race Between Start Command and Status Update
**What goes wrong:** User clicks Start, UI doesn't update, user clicks again, two loops start
**Why it happens:** Status update arrives before UI registers "starting" state
**How to avoid:**
1. Disable Start button immediately on click
2. Use local "starting" state that blocks double-clicks
3. Only re-enable on confirmed status change
**Warning signs:** Multiple processes spawned, "already running" errors

### Pitfall 2: Stop Reports Success Before Process Dies
**What goes wrong:** UI shows "Stopped" but process still running
**Why it happens:** stop() returns after sending signal, not after verification
**How to avoid:** Already fixed in Phase 1 GracefulShutdown - just need to wait for the result
**Warning signs:** Port still in use, "already running" on restart

### Pitfall 3: File Watcher Misses Changes
**What goes wrong:** IMPLEMENTATION_PLAN.md changes but task list doesn't update
**Why it happens:** Editor writes temp file then renames, or writes multiple times
**How to avoid:**
1. Use awaitWriteFinish option in chokidar
2. Add manual refresh button
3. Refresh on loop status change (iteration complete often means task change)
**Warning signs:** Users manually refreshing browser to see updates

### Pitfall 4: Project Switch Leaves Stale State
**What goes wrong:** Switch projects, see old project's tasks/status
**Why it happens:** React state not cleared on WebSocket reconnect
**How to avoid:**
1. Reset all state in useWebSocket when URL/port changes
2. Clear tasks/status when disconnected
3. Wait for initial state before showing content
**Warning signs:** Wrong project name, tasks from different project

### Pitfall 5: Toast Spam on Rapid Updates
**What goes wrong:** Multiple toasts stack up during fast operations
**Why it happens:** Every status change triggers toast
**How to avoid:**
1. Only toast on significant transitions (idle->running, running->idle)
2. Debounce or dedupe similar toasts
3. Use loading states instead of toasts for in-progress operations
**Warning signs:** Toast queue blocks UI, user dismissing constantly

## Code Examples

Verified patterns from existing codebase:

### Start Confirmation Flow (Enhanced)
```typescript
// In LoopController.start()
start(options: { mode: LoopMode; maxIterations?: number; workScope?: string }) {
  if (this.process) {
    this.emitLog('Loop already running', 'warning');
    return;
  }

  // ... existing spawn code ...

  this.process = spawn(bashCmd, [loopScript, ...args], { ... });
  const pid = this.process.pid;

  // Emit intermediate state immediately
  this.status = {
    running: true,
    starting: true,  // NEW: indicates startup in progress
    mode,
    iteration: 0,
    maxIterations: maxIterations || 0,
    pid,
  };
  this.emit('status', this.status);

  // After successful registration, confirm startup
  if (this.projectId && pid) {
    const processRegistry = getProcessRegistry();
    processRegistry.registerLoop(...).then((sessionId) => {
      this.sessionId = sessionId;
      // Remove starting flag to confirm
      this.status = { ...this.status, starting: false };
      this.emit('status', this.status);
      this.emitLog(`Session created: ${sessionId}`, 'info');
    });
  }
}
```

### Stop Verification Flow (Enhanced)
```typescript
// In LoopController.stop()
async stop(): Promise<void> {
  if (!this.process || !this.process.pid) {
    this.emitLog('No loop running', 'warning');
    return;
  }

  const pid = this.process.pid;

  // Emit stopping state
  this.status = { ...this.status, stopping: true };
  this.emit('status', this.status);
  this.emitLog('Stopping loop...', 'info');

  // Mark session as stopping
  if (this.sessionId) {
    const sessionRepo = getSessionRepository();
    sessionRepo.updateSessionState(this.sessionId, 'stopping');
  }

  // Use GracefulShutdown for verified termination
  const result = await this.gracefulShutdown.stopAndVerify(pid);

  if (result.success) {
    this.emitLog(`Loop stopped via ${result.method} (${result.durationMs}ms)`, 'success');
    // Status will update in 'close' event handler
  } else {
    this.emitLog(`Failed to stop loop after ${result.durationMs}ms`, 'error');
    // Reset stopping flag since we failed
    this.status = { ...this.status, stopping: false };
    this.emit('status', this.status);
  }
}
```

### UI with Intermediate States
```typescript
// In LoopControls.tsx
interface LoopControlsProps {
  loopStatus: LoopStatus;
  onStart: (options) => void;
  onStop: () => void;
}

export function LoopControls({ loopStatus, onStart, onStop }: LoopControlsProps) {
  const isStarting = loopStatus.running && loopStatus.starting;
  const isStopping = loopStatus.stopping;
  const isRunning = loopStatus.running && !isStarting && !isStopping;
  const isIdle = !loopStatus.running && !isStopping;

  return (
    <div className="flex gap-2">
      {isIdle && (
        <Button onClick={handleStart}>
          <Play className="h-4 w-4" />
          Start
        </Button>
      )}
      {isStarting && (
        <Button disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
          Starting...
        </Button>
      )}
      {isRunning && (
        <Button variant="destructive" onClick={onStop}>
          <Square className="h-4 w-4" />
          Stop
        </Button>
      )}
      {isStopping && (
        <Button variant="destructive" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
          Stopping...
        </Button>
      )}
    </div>
  );
}
```

### Task List Manual Refresh
```typescript
// In FileWatcher - add public method
public async forceTaskRefresh(): Promise<void> {
  await this.parseTasks();
  // Emit is handled in parseTasks
}

// In server/index.ts - add WebSocket handler
case 'tasks:refresh':
  await fileWatcher.forceTaskRefresh();
  // Tasks will be broadcast via existing 'tasks' event
  break;

// In Dashboard.tsx - add refresh button
<Button variant="ghost" size="sm" onClick={() => sendCommand({ type: 'tasks:refresh' })}>
  <RefreshCw className="h-4 w-4" />
</Button>
```

### Project Switch Context Clear
```typescript
// In useWebSocket.ts - reset on URL change
useEffect(() => {
  // Reset all state
  setLoopStatus(DEFAULT_LOOP_STATUS);
  setTasks(DEFAULT_TASKS);
  setGitStatus(DEFAULT_GIT_STATUS);
  setLogs([]);
  setProjectConfig(null);

  // Reconnect
  connect();

  return () => {
    // Cleanup
    wsRef.current?.close();
  };
}, [url]); // url includes port, so changes on project switch
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Poll for status | WebSocket push | Always better | Real-time updates |
| Fire-and-forget commands | Verified termination | Phase 1 | Reliable stop |
| Single project | Multi-project with port routing | Existing | Scales to many projects |

**Deprecated/outdated:**
- HTTP polling for status: Use WebSocket events
- setTimeout for file watching: Use chokidar with proper options

## Open Questions

Things that couldn't be fully resolved:

1. **Exact timing requirements**
   - What we know: Spec says "within 2 seconds" for start, "within 5 seconds" for stop
   - What's unclear: Are these hard requirements or guidelines?
   - Recommendation: Treat as guidelines; focus on accurate feedback over speed

2. **Task list change detection edge cases**
   - What we know: chokidar works for most editors
   - What's unclear: Behavior with vim's swap files, VS Code's backup writes
   - Recommendation: Use awaitWriteFinish, add manual refresh button

3. **Multi-instance state isolation**
   - What we know: Each instance has separate WebSocket connection
   - What's unclear: Any shared state that could leak between projects?
   - Recommendation: Review singleton patterns (ProcessRegistry is global but project-scoped)

## Integration Points with Phase 1

Phase 1 created these components that Phase 2 integrates:

| Phase 1 Component | Phase 2 Usage |
|-------------------|---------------|
| ProcessRegistry.registerLoop() | Called from LoopController.start(), confirmation emits status |
| ProcessRegistry.unregisterLoop() | Called from LoopController on close/error |
| GracefulShutdown.stopAndVerify() | Called from LoopController.stop(), result determines UI state |
| OrphanDetector | Runs at startup, handled in server/index.ts |
| PidFileManager | Internal to ProcessRegistry, no direct UI interaction |

**Key integration:** The foundation is synchronous and reliable. Phase 2 adds:
1. Status flags (`starting`, `stopping`) for UI intermediate states
2. WebSocket messages to communicate verification results
3. UI components that respond to intermediate states
4. Task list refresh mechanisms

## Sources

### Primary (HIGH confidence)
- Existing codebase: loopController.ts, useWebSocket.ts, FileWatcher.ts
- Phase 1 research and implementation (01-RESEARCH.md, ProcessRegistry.ts, GracefulShutdown.ts)
- React documentation for state management patterns

### Secondary (MEDIUM confidence)
- chokidar documentation for file watching options
- WebSocket best practices for real-time updates

### Tertiary (LOW confidence)
- Community patterns for optimistic UI with confirmation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase patterns, no new dependencies
- Architecture: HIGH - Extending existing, proven patterns from Phase 1
- Pitfalls: HIGH - Based on observed codebase behavior and common React issues

**Research date:** 2026-01-19
**Valid until:** 60 days (stable domain, patterns well-established)
