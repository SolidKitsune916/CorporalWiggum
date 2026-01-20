# Phase 1: Process Foundation - Research

**Researched:** 2026-01-19
**Domain:** Node.js Process Management, PID Files, Signal Handling
**Confidence:** HIGH

## Summary

This research investigates how to build reliable process tracking for the Ralph dashboard that survives dashboard restarts and provides accurate visibility into all running loops across projects.

The current codebase already has substantial infrastructure:
- `loopController.ts` manages spawning/stopping loops via `child_process`
- `SessionRepository.ts` tracks sessions in SQLite with heartbeat mechanism
- `healthMonitor.ts` periodically checks process liveness using `process.kill(pid, 0)`
- `instanceSpawner.ts` manages dashboard instances with similar patterns

**What's missing for PROC requirements:**
1. **PID files** (PROC-04): Sessions are in SQLite but not persisted as standalone PID files
2. **Cross-project registry** (PROC-01): Sessions are per-project, no central view
3. **Verified termination** (PROC-02): Stop sends SIGTERM/SIGKILL but doesn't verify death
4. **Orphan cleanup UI** (PROC-03): Health monitor detects orphans but no startup prompt

**Primary recommendation:** Extend the existing SQLite-based session tracking with PID files as a secondary persistence mechanism, add termination verification, and create a startup orphan detection flow.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 12.x | SQLite database | Already used, synchronous API, fast |
| Node.js child_process | built-in | Process spawning | Native, well-documented |
| Node.js fs | built-in | File operations | For PID files |

### Supporting (Already in Codebase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| EventEmitter | built-in | Event-based communication | Status updates, orphan notifications |
| path | built-in | Path handling | PID file locations |
| os | built-in | OS info | Home directory for ~/.ralph |

### No Additional Dependencies Needed
The current stack is sufficient. Do not add:
- PM2 (overkill for this use case)
- pidfile npm packages (simple enough to implement directly)
- External process managers

## Architecture Patterns

### Recommended Project Structure (Extension to Existing)
```
dashboard/server/
├── database/
│   └── repositories/
│       └── SessionRepository.ts  # Extend with cross-project queries
├── processManager/               # NEW: Dedicated process management
│   ├── PidFileManager.ts        # PID file read/write/cleanup
│   ├── ProcessRegistry.ts       # Central registry (wraps SessionRepository)
│   └── GracefulShutdown.ts      # SIGTERM -> wait -> SIGKILL logic
├── loopController.ts            # Extend to use ProcessRegistry
├── healthMonitor.ts             # Extend for startup orphan detection
└── index.ts                     # Add startup orphan check flow
```

### Pattern 1: PID File Management
**What:** Write PID to file on process start, delete on clean exit
**When to use:** Any long-running child process that must be tracked across restarts
**Source:** [Linux PID File Best Practices](https://www.baeldung.com/linux/pid-file)

```typescript
// PID file location: ~/.ralph/pids/<project-id>.pid
// Format: Single line with PID number, optional trailing newline

interface PidFile {
  projectId: string;
  pid: number;
  startedAt: string;
  mode: LoopMode;
}

// Write on process start
async function writePidFile(projectId: string, pid: number, mode: LoopMode): Promise<void> {
  const pidDir = path.join(os.homedir(), '.ralph', 'pids');
  await fs.mkdir(pidDir, { recursive: true });
  const pidFile = path.join(pidDir, `${projectId}.pid`);
  const content = JSON.stringify({
    pid,
    startedAt: new Date().toISOString(),
    mode
  });
  await fs.writeFile(pidFile, content, { mode: 0o600 });
}

// Delete on clean exit
async function deletePidFile(projectId: string): Promise<void> {
  const pidFile = path.join(os.homedir(), '.ralph', 'pids', `${projectId}.pid`);
  try {
    await fs.unlink(pidFile);
  } catch (e) {
    // Ignore if already deleted
  }
}
```

### Pattern 2: Graceful Shutdown with Escalation
**What:** Send SIGTERM, wait, then SIGKILL if needed
**When to use:** Stopping any child process
**Source:** [Node.js Child Process Documentation](https://nodejs.org/api/child_process.html)

```typescript
// PROC-05: SIGTERM with timeout, escalate to SIGKILL
async function stopProcess(pid: number, timeoutMs: number = 5000): Promise<boolean> {
  // Check if process exists
  if (!processExists(pid)) {
    return true; // Already dead
  }

  // Send SIGTERM
  try {
    process.kill(pid, 'SIGTERM');
  } catch (e) {
    return true; // Process gone
  }

  // Wait for graceful exit
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(100);
    if (!processExists(pid)) {
      return true; // Graceful exit succeeded
    }
  }

  // Escalate to SIGKILL
  try {
    process.kill(pid, 'SIGKILL');
  } catch (e) {
    return true; // Process gone
  }

  // Verify termination
  await sleep(100);
  return !processExists(pid);
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0); // Signal 0 tests existence
    return true;
  } catch {
    return false;
  }
}
```

### Pattern 3: Process Liveness Check
**What:** Use signal 0 to test if process exists
**When to use:** Verifying PID files, detecting orphans
**Source:** [Node.js Process Documentation](https://nodejs.org/api/process.html)

```typescript
// Signal 0 is the standard way to check process existence
// Works cross-platform (Node.js emulates on Windows)
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    // ESRCH = no such process
    // EPERM = exists but no permission (still alive!)
    return err.code === 'EPERM';
  }
}
```

### Pattern 4: Startup Orphan Detection
**What:** On dashboard startup, scan for orphaned processes
**When to use:** Dashboard initialization
**Source:** Current healthMonitor.ts pattern

```typescript
interface OrphanedLoop {
  projectId: string;
  pid: number;
  startedAt: string;
  mode: LoopMode;
  source: 'database' | 'pidfile';
}

async function detectOrphanedLoops(): Promise<OrphanedLoop[]> {
  const orphans: OrphanedLoop[] = [];

  // Check 1: Database sessions marked as 'running' where process is dead
  const sessions = sessionRepo.getActiveSessions();
  for (const session of sessions) {
    if (!isProcessAlive(session.pid)) {
      orphans.push({
        projectId: session.projectId,
        pid: session.pid,
        startedAt: session.startedAt,
        mode: session.mode,
        source: 'database'
      });
    }
  }

  // Check 2: PID files where process is still alive (dashboard crashed)
  const pidFiles = await scanPidFiles();
  for (const pidFile of pidFiles) {
    if (isProcessAlive(pidFile.pid)) {
      // Process is still running but dashboard didn't know about it
      const inDb = sessions.some(s => s.pid === pidFile.pid);
      if (!inDb) {
        orphans.push({
          ...pidFile,
          source: 'pidfile'
        });
      }
    }
  }

  return orphans;
}
```

### Anti-Patterns to Avoid
- **Polling process list**: Don't parse `ps aux` output. Use signal 0 instead.
- **Assuming PID uniqueness over time**: PIDs are reused. Always verify process identity.
- **SIGKILL as first resort**: Always try SIGTERM first for graceful shutdown.
- **Ignoring Windows**: Windows doesn't have real signals, but Node.js emulates them.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Process existence check | Shell out to `ps` | `process.kill(pid, 0)` | Cross-platform, no parsing |
| Session persistence | Custom file format | SQLite (already in use) | ACID, queries, already integrated |
| Cross-platform signals | Platform switches | Node.js child_process | Handles Windows emulation |

**Key insight:** The current codebase already has good patterns. Extend, don't replace.

## Common Pitfalls

### Pitfall 1: PID Reuse Race Condition
**What goes wrong:** Process A dies, PID X is reused by Process B, we think A is still running
**Why it happens:** PIDs are recycled by the OS
**How to avoid:** Store additional identity (start time, command) in PID file; verify before killing
**Warning signs:** Killing the wrong process; "ghost" sessions that never die

### Pitfall 2: SIGTERM Ignored by Child Trees
**What goes wrong:** Loop process dies but its children (Claude CLI) keep running
**Why it happens:** SIGTERM only goes to direct child, not process group
**How to avoid:** Use `kill(-pid, signal)` to signal entire process group (negative PID)
**Warning signs:** Port still in use after stop; orphaned Claude processes

```typescript
// Kill entire process group (Unix only)
// On Windows, use taskkill /T (already in codebase)
function killProcessGroup(pid: number, signal: string): void {
  if (process.platform === 'win32') {
    exec(`taskkill /pid ${pid} /T /F`);
  } else {
    try {
      process.kill(-pid, signal); // Negative PID = process group
    } catch {
      process.kill(pid, signal); // Fallback to single process
    }
  }
}
```

### Pitfall 3: Database Lock on Crash
**What goes wrong:** Dashboard crashes, SQLite WAL file left in dirty state
**Why it happens:** better-sqlite3 WAL mode needs clean shutdown
**How to avoid:** WAL mode is already enabled and handles this; database recovers on next open
**Warning signs:** Database corruption errors on startup

### Pitfall 4: Stale PID Files
**What goes wrong:** PID file exists but process crashed without cleanup
**Why it happens:** SIGKILL or crash doesn't run cleanup handlers
**How to avoid:** Always verify PID file contents with `process.kill(pid, 0)` before trusting
**Warning signs:** "Loop already running" errors when nothing is running

### Pitfall 5: Race Between Stop and Verify
**What goes wrong:** Report "stopped" before process actually terminates
**Why it happens:** SIGTERM is async; kill() returns immediately
**How to avoid:** Poll with signal 0 until process confirmed dead or timeout
**Warning signs:** User clicks stop, sees success, but process still using resources

## Code Examples

Verified patterns from official sources and existing codebase:

### Signal 0 for Process Check
```typescript
// Source: Node.js docs - https://nodejs.org/api/process.html
function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    if (err.code === 'EPERM') {
      return true; // Exists but no permission
    }
    return false; // ESRCH = no such process
  }
}
```

### Graceful Stop with Verification (PROC-02, PROC-05)
```typescript
// Source: Existing loopController.ts pattern + official docs
async function stopAndVerify(
  pid: number,
  timeoutMs: number = 5000
): Promise<{ success: boolean; method: 'sigterm' | 'sigkill' | 'already_dead' }> {
  // Already dead?
  if (!processExists(pid)) {
    return { success: true, method: 'already_dead' };
  }

  // Try SIGTERM
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T`, { timeout: 1000 });
    } else {
      process.kill(-pid, 'SIGTERM'); // Process group
    }
  } catch {
    // Process may have died between check and kill
    if (!processExists(pid)) {
      return { success: true, method: 'sigterm' };
    }
  }

  // Wait for graceful exit
  const pollInterval = 100;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, pollInterval));
    if (!processExists(pid)) {
      return { success: true, method: 'sigterm' };
    }
  }

  // Escalate to SIGKILL
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { timeout: 1000 });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch {
    // Ignore errors
  }

  // Final verification
  await new Promise(r => setTimeout(r, 200));
  const stillAlive = processExists(pid);

  return {
    success: !stillAlive,
    method: 'sigkill'
  };
}
```

### PID File Format
```typescript
// Source: Linux FHS 3.0 + Baeldung best practices
// Location: ~/.ralph/pids/<sanitized-project-id>.pid

interface PidFileContent {
  pid: number;
  projectId: string;
  projectPath: string;
  mode: LoopMode;
  startedAt: string; // ISO 8601
}

// Sanitize project ID for filesystem
function sanitizeForFilename(projectId: string): string {
  return projectId.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 64);
}

// PID file path
function getPidFilePath(projectId: string): string {
  return path.join(os.homedir(), '.ralph', 'pids', `${sanitizeForFilename(projectId)}.pid`);
}
```

### Startup Orphan Check Flow
```typescript
// Source: Existing healthMonitor.ts pattern
// Called once at dashboard startup

interface StartupOrphanResult {
  orphans: OrphanedLoop[];
  cleanedUp: string[];
  stillRunning: string[];
}

async function checkStartupOrphans(): Promise<StartupOrphanResult> {
  const result: StartupOrphanResult = {
    orphans: [],
    cleanedUp: [],
    stillRunning: []
  };

  // 1. Check database for stale sessions
  const sessions = sessionRepo.getActiveSessions();
  for (const session of sessions) {
    const alive = processExists(session.pid);
    if (!alive) {
      // Process died, session is orphaned
      sessionRepo.markSessionCrashed(session.id);
      result.cleanedUp.push(session.id);
    } else {
      // Process still running from previous dashboard instance
      result.stillRunning.push(session.id);
      result.orphans.push({
        projectId: session.projectId,
        pid: session.pid,
        startedAt: session.startedAt,
        mode: session.mode,
        source: 'database'
      });
    }
  }

  // 2. Check PID files for processes we don't know about
  const pidDir = path.join(os.homedir(), '.ralph', 'pids');
  try {
    const files = await fs.readdir(pidDir);
    for (const file of files) {
      if (!file.endsWith('.pid')) continue;

      const content = await fs.readFile(path.join(pidDir, file), 'utf-8');
      const pidData: PidFileContent = JSON.parse(content);

      // Check if this PID is in our database
      const inDb = sessions.some(s => s.pid === pidData.pid);
      if (!inDb && processExists(pidData.pid)) {
        result.orphans.push({
          projectId: pidData.projectId,
          pid: pidData.pid,
          startedAt: pidData.startedAt,
          mode: pidData.mode,
          source: 'pidfile'
        });
      }
    }
  } catch {
    // PID directory may not exist yet
  }

  return result;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `/var/run/*.pid` | `~/.ralph/pids/*.pid` or SQLite | Modern convention | User-writable, no root needed |
| `ps aux \| grep` | `process.kill(pid, 0)` | Always better | Cross-platform, no parsing |
| SIGKILL immediately | SIGTERM + timeout + SIGKILL | Best practice | Graceful cleanup possible |

**Deprecated/outdated:**
- `/var/run` for user processes: Use `~/.local/run` or app-specific directory
- Parsing process output: Fragile, platform-dependent

## Open Questions

Things that couldn't be fully resolved:

1. **Process group behavior on spawn**
   - What we know: detached: true creates process group on Unix
   - What's unclear: Does current loop.sh spawn need process group for full cleanup?
   - Recommendation: Test with `-pid` kill; add if needed

2. **Claude CLI child process tree**
   - What we know: Claude CLI may spawn subprocesses
   - What's unclear: Whether SIGTERM reaches all children
   - Recommendation: Use `pgrep -P` or process group kill to verify

## Sources

### Primary (HIGH confidence)
- [Node.js Process Documentation](https://nodejs.org/api/process.html) - signal handling, kill()
- [Node.js Child Process Documentation](https://nodejs.org/api/child_process.html) - spawn, signals, timeouts
- [Linux FHS 3.0 /run specification](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/ch03s15.html) - PID file location
- Existing codebase: loopController.ts, healthMonitor.ts, SessionRepository.ts

### Secondary (MEDIUM confidence)
- [Baeldung: What is a .pid File in Linux](https://www.baeldung.com/linux/pid-file) - PID file format
- [Linux PID File Best Practices](https://linuxvox.com/blog/storing-pid-file-for-a-daemon-run-as-user/) - User daemon storage
- [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3) - WAL mode behavior

### Tertiary (LOW confidence)
- Community patterns from DEV.to articles on graceful shutdown

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase patterns and official Node.js APIs
- Architecture: HIGH - Extending existing, proven SessionRepository and healthMonitor patterns
- Pitfalls: HIGH - Based on Node.js docs and existing codebase issues

**Research date:** 2026-01-19
**Valid until:** 60 days (stable domain, Node.js APIs rarely change)
