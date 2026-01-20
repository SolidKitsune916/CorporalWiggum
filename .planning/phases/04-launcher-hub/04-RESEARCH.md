# Phase 4: Launcher Hub - Research

**Researched:** 2026-01-20
**Domain:** React Dashboard UI, WebSocket Real-time Updates, Global State Management
**Confidence:** HIGH

## Summary

Phase 4 builds the Launcher Hub - a central dashboard view for all registered projects with real-time status tracking. The existing codebase already has substantial infrastructure in place:

1. **LauncherHome.tsx** and **ProjectCard.tsx** exist with basic project listing and start/stop functionality
2. **useLauncher.ts** hook provides WebSocket-based state management for projects and instances
3. **ProcessRegistry** tracks running loops across all projects with PID files and database persistence
4. **SessionRepository** stores cost tracking (`costSpent`), iteration counts, and elapsed time per session

The main gaps are: (1) real-time status on project cards (currently shows basic running/stopped), (2) global header with active loop count visible from any page, and (3) elapsed time and cost display for running projects.

**Primary recommendation:** Extend existing components rather than rebuilding. Add a new `LauncherContext` provider for global loop count accessible from both LauncherHome and Dashboard, and enhance ProjectCard to poll/receive real-time loop metrics.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | UI framework | Already in codebase |
| WebSocket (ws) | ^8.19.0 | Real-time updates | Already used for dashboard |
| lucide-react | ^0.562.0 | Icons | Already used throughout |
| tailwindcss | ^3.4.19 | Styling | Already configured |
| Radix UI | Various | UI primitives | Already used (Card, Badge, etc.) |

### Supporting (Already in Use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | ^0.7.1 | Variant styling | For component variants |
| sonner | ^2.0.7 | Toast notifications | User feedback |
| better-sqlite3 | ^12.6.0 | Session persistence | Cost/time tracking |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useLauncher hook | Zustand/Recoil | Overkill - hook already handles all launcher state |
| Manual WebSocket | react-use-websocket | Adds dependency, existing pattern works well |
| Context for global count | Prop drilling | Context cleaner for header visible on all pages |

**Installation:** No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure

The existing structure is well-organized. Extend it:

```
dashboard/src/
├── components/
│   ├── launcher/
│   │   ├── LauncherHome.tsx      # Extend with live metrics
│   │   ├── ProjectCard.tsx       # Extend with elapsed/cost
│   │   ├── AddProjectDialog.tsx  # Existing, no changes
│   │   ├── FileBrowser.tsx       # Existing, no changes
│   │   └── GlobalHeader.tsx      # NEW: shared header component
│   └── ui/
│       └── ...                   # Existing UI components
├── hooks/
│   ├── useLauncher.ts            # Extend with session metrics
│   └── useWebSocket.ts           # Existing dashboard hook
├── contexts/
│   └── LauncherContext.tsx       # NEW: global loop count provider
└── types/
    └── index.ts                  # Extend LauncherInstance type
```

### Pattern 1: Context Provider for Global Loop Count (LAUN-04)

**What:** React Context to share active loop count across LauncherHome and Dashboard header
**When to use:** When state must be visible on any page regardless of current view
**Example:**
```typescript
// Source: React official docs + codebase patterns
interface LauncherContextValue {
  activeLoopCount: number;
  runningProjects: { projectId: string; projectName: string }[];
}

const LauncherContext = createContext<LauncherContextValue>({
  activeLoopCount: 0,
  runningProjects: [],
});

// Provider wraps App component
function LauncherProvider({ children }: { children: React.ReactNode }) {
  const { instances, projects } = useLauncher();

  const value = useMemo(() => ({
    activeLoopCount: instances.length,
    runningProjects: instances.map(i => ({
      projectId: i.projectId,
      projectName: projects.find(p => p.id === i.projectId)?.name || 'Unknown',
    })),
  }), [instances, projects]);

  return (
    <LauncherContext.Provider value={value}>
      {children}
    </LauncherContext.Provider>
  );
}
```

### Pattern 2: Extending LauncherInstance for Real-time Metrics (LAUN-02, LAUN-05)

**What:** Add session metrics to LauncherInstance type
**When to use:** Displaying elapsed time and cost on project cards
**Example:**
```typescript
// Extend existing type in types/index.ts
export interface LauncherInstance {
  projectId: string;
  backendPort: number;
  frontendPort: number;
  pid: number;
  startedAt: string;
  loopStatus?: {
    running: boolean;
    iteration: number;
    mode: string;
    // NEW fields from SessionRepository
    costSpent?: number;        // From ActiveSession.costSpent
    elapsedSeconds?: number;   // Calculated from startedAt
    maxIterations?: number;
  };
}
```

### Pattern 3: Optimistic UI with Visual Feedback (LAUN-03)

**What:** Immediate button state change before server confirmation
**When to use:** Start/stop buttons for responsive feel
**Example:**
```typescript
// Source: Existing LoopControls.tsx pattern
const handleStart = (projectId: string) => {
  // Optimistic: show spinner immediately
  setSpawningProjectId(projectId);
  spawnInstance(projectId);
  // Server response updates instances array via WebSocket
};

// Button states derived from combined state
const isStarting = spawningProjectId === project.id;
const isRunning = !!instance && !isStarting;

<Button disabled={isStarting || isRunning}>
  {isStarting ? <Loader2 className="animate-spin" /> : <Play />}
  {isStarting ? 'Starting...' : 'Start'}
</Button>
```

### Anti-Patterns to Avoid

- **Polling for status:** Don't poll server for loop status - use WebSocket push already in place
- **Storing derived state:** Don't store `elapsedSeconds` in state - calculate from `startedAt` on render
- **Global state for local UI:** Don't put spawning/stopping state in context - keep in component
- **Duplicate WebSocket connections:** Reuse existing connections, don't create per-card connections

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loop process tracking | Custom process registry | Existing `ProcessRegistry` | Handles PID files, DB sync, orphan detection |
| Session cost tracking | Manual calculation | `SessionRepository.costSpent` | Already tracked per session |
| Real-time updates | Polling interval | WebSocket broadcast | Already implemented in `useLauncher` |
| Time elapsed display | `Date.now() - startedAt` | Calculate in render | Avoid stale state issues |
| Project list persistence | localStorage | SQLite via `ProjectRepository` | Already persisted server-side |

**Key insight:** Phase 1-3 built all the backend infrastructure. Phase 4 is primarily frontend enhancement - connecting existing data to UI components.

## Common Pitfalls

### Pitfall 1: Stale Elapsed Time Display
**What goes wrong:** Elapsed time doesn't update while viewing the page
**Why it happens:** Storing calculated elapsed time in state instead of calculating on render
**How to avoid:** Use `useMemo` or inline calculation with `Date.now()`, re-trigger with `setInterval` for display updates only
**Warning signs:** Time display freezes when looking at it

### Pitfall 2: Global Header Not Updating Across Views
**What goes wrong:** Loop count in header doesn't reflect changes when on Dashboard view
**Why it happens:** LauncherHome and Dashboard have separate WebSocket connections
**How to avoid:** Create shared `LauncherContext` that maintains its own connection OR share connection state via context
**Warning signs:** Count only updates after navigating away and back

### Pitfall 3: Race Condition on Start/Stop
**What goes wrong:** User clicks Start, sees "Starting...", then nothing happens
**Why it happens:** WebSocket response arrives before `spawningProjectId` is set, or clears it too early
**How to avoid:** Use refs for spawn tracking (already done in `LauncherHome.tsx`), clear on instance list update
**Warning signs:** Buttons get stuck in disabled state

### Pitfall 4: Cost Display Precision
**What goes wrong:** Cost shows as $0.1234567890
**Why it happens:** Not formatting currency properly
**How to avoid:** Use `toFixed(4)` or `Intl.NumberFormat` for consistent display
**Warning signs:** Long decimal numbers in UI

### Pitfall 5: Memory Leak on Unmount
**What goes wrong:** Console warnings about updating unmounted component
**Why it happens:** Timer for elapsed time update continues after component unmounts
**How to avoid:** Clear interval in useEffect cleanup (already done in existing components)
**Warning signs:** React dev tools warnings

## Code Examples

Verified patterns from official sources and existing codebase:

### Elapsed Time Display with Auto-Update
```typescript
// Source: Existing LoopStatus.tsx pattern
function ElapsedTime({ startedAt }: { startedAt: string }) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return (
    <span className="font-mono">
      {hours.toString().padStart(2, '0')}:
      {minutes.toString().padStart(2, '0')}:
      {seconds.toString().padStart(2, '0')}
    </span>
  );
}
```

### Cost Display with Formatting
```typescript
// Source: Intl.NumberFormat best practices
function CostDisplay({ cents }: { cents: number }) {
  const dollars = cents / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(dollars);

  return <span className="font-mono text-muted-foreground">{formatted}</span>;
}
```

### Global Header with Loop Count Badge
```typescript
// Source: Existing header pattern in Dashboard.tsx + LauncherHome.tsx
function GlobalHeader() {
  const { activeLoopCount } = useContext(LauncherContext);

  return (
    <header className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-10 w-10" />
          <h1 className="text-xl font-semibold">Corporal Wiggum</h1>
        </div>

        {/* Right side with badges */}
        <div className="flex items-center gap-4">
          {activeLoopCount > 0 && (
            <Badge variant="default" className="gap-1">
              <Play className="h-3 w-3" />
              {activeLoopCount} Running
            </Badge>
          )}
          {/* Connection badge, etc. */}
        </div>
      </div>
    </header>
  );
}
```

### Enhanced Project Card Status
```typescript
// Source: Existing ProjectCard.tsx pattern, extended
function getStatusBadge(instance?: LauncherInstance, project?: LauncherProject) {
  if (instance?.loopStatus?.running) {
    return (
      <Badge variant="success" className="flex items-center gap-1">
        <Play className="h-3 w-3 animate-pulse" />
        Running
      </Badge>
    );
  }
  if (instance && !instance.loopStatus?.running) {
    return (
      <Badge variant="warning" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Error
      </Badge>
    );
  }
  if (!project?.isRalphReady) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Settings className="h-3 w-3" />
        Setup Required
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">Idle</Badge>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prop drilling for global state | React Context | React 16.3+ | Clean separation of concerns |
| Polling for updates | WebSocket push | Already implemented | No change needed |
| Local storage persistence | SQLite + server | Phase 1 | Reliable cross-session |
| Manual process tracking | ProcessRegistry | Phase 1 | Bulletproof loop tracking |

**Deprecated/outdated:**
- Polling intervals for status updates: WebSocket already pushes changes
- Local storage for project list: Server already handles persistence

## Open Questions

Things that couldn't be fully resolved:

1. **Cost Tracking Granularity**
   - What we know: `SessionRepository` has `costSpent` field, `updateCost()` method exists
   - What's unclear: How cost is calculated/populated (may need Phase 5 for Claude API cost parsing)
   - Recommendation: Display field if populated, show "-" if not yet available

2. **Multiple Dashboard Instances**
   - What we know: Dashboard supports `?backend=PORT` for multi-instance
   - What's unclear: Should launcher track all dashboard instances or just loop processes?
   - Recommendation: Track loop processes only (via ProcessRegistry), dashboard instances are separate concern

3. **Error State Details**
   - What we know: `LauncherInstance.loopStatus` has basic info
   - What's unclear: How to surface error details (crash reason, last error message)
   - Recommendation: Add optional `error?: string` field to `loopStatus` if needed

## Sources

### Primary (HIGH confidence)
- **Codebase analysis**: `/dashboard/src/components/launcher/LauncherHome.tsx`, `ProjectCard.tsx`
- **Codebase analysis**: `/dashboard/src/hooks/useLauncher.ts`
- **Codebase analysis**: `/dashboard/server/processManager/ProcessRegistry.ts`
- **Codebase analysis**: `/dashboard/server/database/repositories/SessionRepository.ts`
- **Codebase analysis**: `/dashboard/src/components/Dashboard.tsx`, `LoopControls.tsx`
- [React Official - Managing State](https://react.dev/learn/managing-state)
- [React Official - Context](https://legacy.reactjs.org/docs/context.html)

### Secondary (MEDIUM confidence)
- [Real-time Updates with WebSockets and React Hooks - GeeksforGeeks](https://www.geeksforgeeks.org/reactjs/real-time-updates-with-websockets-and-react-hooks/)
- [React State Management in 2025 - Developerway](https://www.developerway.com/posts/react-state-management-2025)
- [Managing Global State with Context - Effort Stack](https://effortstack.com/blog/global-state-management-react-context)

### Tertiary (LOW confidence)
- [Building Real-Time Dashboards with React and WebSockets - WildnetEdge](https://www.wildnetedge.com/blogs/building-real-time-dashboards-with-react-and-websockets)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in codebase, no new dependencies
- Architecture: HIGH - Extending existing patterns, not introducing new ones
- Pitfalls: HIGH - Based on existing codebase patterns and common React issues

**Research date:** 2026-01-20
**Valid until:** 60 days (stable React patterns, no fast-moving dependencies)

---

## Implementation Summary for Planner

The key insight is that **90% of the infrastructure exists**. Phase 4 is primarily:

1. **LAUN-01**: LauncherHome already shows projects. Needs polish, not rebuild.

2. **LAUN-02**: Extend `LauncherInstance.loopStatus` to include more fields from `SessionRepository`. Server already broadcasts instance updates via WebSocket.

3. **LAUN-03**: Already implemented in `LauncherHome.tsx` with `spawningRef` pattern. May need refinement.

4. **LAUN-04**: Create `LauncherContext` provider, wrap `App.tsx`, extract shared header component.

5. **LAUN-05**: Extend `LauncherInstance` type, add elapsed time display (ticking), add cost display (from session). Server needs to include these fields in WebSocket broadcasts.

**Server changes needed:**
- Modify launcher instance list broadcast to include session metrics (costSpent, startedAt for elapsed calculation)
- May need to poll ProcessRegistry to get live session data for all projects

**Frontend changes needed:**
- New `LauncherContext` provider
- Shared `GlobalHeader` component
- Enhanced `ProjectCard` with elapsed/cost display
- Ticking elapsed time component
