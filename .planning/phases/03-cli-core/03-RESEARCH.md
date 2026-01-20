# Phase 3: CLI Core - Research

**Researched:** 2026-01-20
**Domain:** Node.js CLI Development, Process Communication, Terminal Streaming
**Confidence:** HIGH

## Summary

This research investigates how to build a standalone CLI tool (`ralph`) that provides terminal-based control of Ralph loops. The CLI needs to interact with the same data sources as the dashboard (SQLite database at `~/.ralph/ralph.db`, PID files at `~/.ralph/pids/`) without requiring the dashboard to be running.

The existing codebase from Phase 1 provides excellent foundations:
- `ProcessRegistry` for unified loop tracking (database + PID files)
- `GracefulShutdown` for verified process termination (SIGTERM -> SIGKILL escalation)
- `PidFileManager` for PID file operations
- `SessionRepository` for session state in SQLite
- `ProjectRepository` for project registration
- `LogManager` for log file operations

**Architecture decision:** The CLI should be a standalone Node.js application that directly accesses the SQLite database and PID files, NOT requiring the dashboard server to be running. This ensures the CLI works independently and can control loops even when the dashboard is down.

**Primary recommendation:** Use Commander.js for CLI argument parsing, share the existing `processManager` and `database/repositories` modules, and implement file tailing with Node.js `fs.watch` + `readline` for the `attach` and `logs` commands.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | 14.x | CLI argument parsing | Most popular Node.js CLI framework, TypeScript support |
| better-sqlite3 | 12.x | SQLite database | Already in codebase, synchronous API |
| chalk | 5.x | Terminal colors | Standard for CLI output styling |
| ora | 8.x | Spinner/progress | Standard for CLI loading states |

### Supporting (Already in Codebase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fs/promises | built-in | File operations | Log tailing, PID files |
| readline | built-in | Line-by-line streaming | Log output, attach streaming |
| child_process | built-in | Process spawning | Starting loops |
| path | built-in | Path handling | Cross-platform paths |
| os | built-in | OS info | Home directory for ~/.ralph |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| commander | yargs | yargs is more feature-rich but commander is simpler, lighter |
| ora | cli-spinners | ora has cleaner API, includes spinners |
| chalk | picocolors | picocolors is smaller but chalk has richer API |

**Installation:**
```bash
npm install commander chalk ora
npm install -D @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
cli/
├── package.json         # Separate package, "bin": { "ralph": "./dist/ralph.js" }
├── tsconfig.json        # TypeScript config
└── src/
    ├── ralph.ts         # Entry point with Commander program
    ├── commands/        # Command implementations
    │   ├── status.ts    # ralph status
    │   ├── start.ts     # ralph start <project>
    │   ├── stop.ts      # ralph stop <project|--all>
    │   ├── list.ts      # ralph list
    │   ├── attach.ts    # ralph attach <project>
    │   └── logs.ts      # ralph logs <project>
    ├── lib/             # Shared utilities
    │   ├── database.ts  # Database access (import from dashboard/server)
    │   ├── format.ts    # Output formatting helpers
    │   └── output.ts    # chalk/ora wrappers
    └── shared/          # Symlink or re-export from dashboard/server
        ├── processManager/
        └── database/
```

### Pattern 1: Shared Database Access
**What:** CLI directly imports and uses the same database module as dashboard
**When to use:** All commands that need session, project, or telemetry data
**Source:** Existing `dashboard/server/database/index.ts`

```typescript
// CLI can directly import the database module
// Database file is at ~/.ralph/ralph.db
import { getDb, RalphDatabase } from '../../dashboard/server/database/index.js';
import { getSessionRepository } from '../../dashboard/server/database/repositories/SessionRepository.js';
import { getProjectRepository } from '../../dashboard/server/database/repositories/ProjectRepository.js';

// Get all active sessions for `ralph status`
const sessionRepo = getSessionRepository();
const activeSessions = sessionRepo.getActiveSessions();

// Get all projects for `ralph list`
const projectRepo = getProjectRepository();
const projects = projectRepo.listProjects();
```

### Pattern 2: Shared Process Management
**What:** CLI uses same ProcessRegistry, GracefulShutdown, PidFileManager as dashboard
**When to use:** start, stop, status commands
**Source:** Existing `dashboard/server/processManager/`

```typescript
import { getProcessRegistry, GracefulShutdown } from '../../dashboard/server/processManager/index.js';

// For `ralph stop`
const gracefulShutdown = new GracefulShutdown();
const result = await gracefulShutdown.stopAndVerify(pid, 5000);
if (result.success) {
  console.log(`Stopped via ${result.method} in ${result.durationMs}ms`);
}

// For `ralph status`
const registry = getProcessRegistry();
const activeLoops = await registry.getAllActiveLoops();
for (const loop of activeLoops) {
  console.log(`${loop.session.projectId}: ${loop.isAlive ? 'running' : 'dead'}`);
}
```

### Pattern 3: Commander.js Subcommand Structure
**What:** Each CLI command is a separate module added to the main program
**When to use:** All CLI commands
**Source:** [Commander.js documentation](https://github.com/tj/commander.js)

```typescript
// src/ralph.ts - Entry point
#!/usr/bin/env node
import { Command } from 'commander';
import { statusCommand } from './commands/status.js';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { listCommand } from './commands/list.js';
import { attachCommand } from './commands/attach.js';
import { logsCommand } from './commands/logs.js';

const program = new Command();

program
  .name('ralph')
  .description('Control Ralph Wiggum loops from the terminal')
  .version('3.0.0');

program.addCommand(statusCommand);
program.addCommand(startCommand);
program.addCommand(stopCommand);
program.addCommand(listCommand);
program.addCommand(attachCommand);
program.addCommand(logsCommand);

program.parseAsync(process.argv);
```

```typescript
// src/commands/status.ts
import { Command } from 'commander';

export const statusCommand = new Command('status')
  .description('Show all running loops system-wide')
  .action(async () => {
    // Implementation
  });
```

### Pattern 4: Log File Tailing with fs.watch + readline
**What:** Efficient file tailing for `attach` and `logs` commands
**When to use:** Streaming live output to terminal
**Source:** [Node.js Readline documentation](https://nodejs.org/api/readline.html)

```typescript
import * as fs from 'fs';
import * as readline from 'readline';

async function tailFile(filePath: string, fromEnd: number = 50): Promise<void> {
  // Initial read of last N lines
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const initialLines = lines.slice(-fromEnd);
  initialLines.forEach(line => console.log(line));

  // Watch for changes
  const watcher = fs.watch(filePath, async (eventType) => {
    if (eventType === 'change') {
      const newContent = await fs.promises.readFile(filePath, 'utf-8');
      const newLines = newContent.split('\n');
      // Output only new lines (track position)
      // ...
    }
  });

  // Handle Ctrl+C to stop watching
  process.on('SIGINT', () => {
    watcher.close();
    process.exit(0);
  });
}
```

### Pattern 5: Project Identifier Resolution
**What:** Accept project name, path, or ID and resolve to project
**When to use:** All commands that take <project> argument
**Source:** Existing `ProjectRepository`

```typescript
// Resolve project identifier (name, path, or ID)
function resolveProject(identifier: string): LauncherProject | null {
  const projectRepo = getProjectRepository();

  // Try by ID first
  let project = projectRepo.getProject(identifier);
  if (project) return project;

  // Try by path
  project = projectRepo.getProjectByPath(identifier);
  if (project) return project;

  // Try by name (case-insensitive match)
  const projects = projectRepo.listProjects();
  project = projects.find(p =>
    p.name.toLowerCase() === identifier.toLowerCase()
  );

  return project ?? null;
}
```

### Anti-Patterns to Avoid
- **Requiring dashboard to be running**: CLI should work standalone with direct database access
- **Polling for log changes**: Use fs.watch, not setInterval polling
- **Hardcoded paths**: Always use os.homedir() and path.join()
- **Synchronous file operations**: Use async/await for file I/O
- **Console.log everywhere**: Use chalk for colors, ora for spinners

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Process liveness check | Shell out to `ps` | `process.kill(pid, 0)` | Cross-platform, already in GracefulShutdown |
| Session tracking | Custom file format | SQLite (existing) | Already implemented, ACID |
| Graceful shutdown | Raw signals | GracefulShutdown class | SIGTERM->SIGKILL already implemented |
| Terminal colors | ANSI codes | chalk | Cross-platform, clean API |
| CLI argument parsing | Manual parsing | commander | Handles help, errors, subcommands |
| Loading spinners | Custom animation | ora | Handles terminal redraws correctly |

**Key insight:** Phase 1 built the hard parts (ProcessRegistry, GracefulShutdown, PidFileManager). The CLI just needs to expose these via a terminal interface.

## Common Pitfalls

### Pitfall 1: Database Lock Contention
**What goes wrong:** CLI and dashboard both try to write to SQLite simultaneously
**Why it happens:** SQLite has write locks; concurrent writers block
**How to avoid:**
- better-sqlite3 uses WAL mode (already configured)
- WAL mode allows concurrent reads with single writer
- CLI should prefer reads; writes are rare (only start/stop update state)
**Warning signs:** "SQLITE_BUSY" errors, long hangs on database operations

### Pitfall 2: Stale PID Files After Crash
**What goes wrong:** CLI shows loop as "running" but process is dead
**Why it happens:** Process crashed without cleanup
**How to avoid:** Always verify PID with `process.kill(pid, 0)` before trusting PID file
**Warning signs:** "Running" status but no output, can't attach

```typescript
// Always verify before reporting status
const pidFile = await pidFileManager.readPidFile(projectId);
if (pidFile) {
  const isAlive = gracefulShutdown.isProcessAlive(pidFile.pid);
  return isAlive ? 'running' : 'dead (stale PID file)';
}
```

### Pitfall 3: fs.watch Platform Differences
**What goes wrong:** File watching works on macOS but not Linux
**Why it happens:** fs.watch behavior varies by OS (macOS uses FSEvents, Linux uses inotify)
**How to avoid:**
- Test on target platforms
- Consider chokidar if fs.watch proves unreliable
- Fall back to polling as last resort
**Warning signs:** `attach` command doesn't show new output

### Pitfall 4: Terminal Output Corruption
**What goes wrong:** Spinner animation corrupts log output
**Why it happens:** Mixing ora spinners with console.log
**How to avoid:** Stop spinner before logging, or use ora's built-in methods
**Warning signs:** Garbled output, cursor in wrong position

```typescript
const spinner = ora('Starting loop...').start();
// Don't do: console.log('Something');
// Do: spinner.info('Something');
// Or: spinner.stop(); console.log('Something');
```

### Pitfall 5: Process Group Kill on Start
**What goes wrong:** Starting a loop kills unrelated processes
**Why it happens:** Negative PID in kill(-pid) affects entire process group
**How to avoid:**
- Only use process group kill on stop operations
- Verify PID matches expected project before killing
**Warning signs:** Other terminals close, unrelated processes die

## Code Examples

Verified patterns from official sources and existing codebase:

### Commander.js Command with Options
```typescript
// Source: Commander.js README
import { Command } from 'commander';
import chalk from 'chalk';

export const stopCommand = new Command('stop')
  .description('Stop a running loop')
  .argument('[project]', 'Project name, path, or ID')
  .option('-a, --all', 'Stop all running loops')
  .option('-f, --force', 'Force kill without graceful shutdown')
  .action(async (project, options) => {
    if (options.all) {
      await stopAllLoops(options.force);
    } else if (project) {
      await stopLoop(project, options.force);
    } else {
      console.error(chalk.red('Error: Specify a project or use --all'));
      process.exit(1);
    }
  });
```

### Table Output with Chalk
```typescript
// Source: chalk README
import chalk from 'chalk';

function printStatusTable(loops: ActiveLoopInfo[]): void {
  console.log(chalk.bold('Running Loops:'));
  console.log(chalk.dim('─'.repeat(80)));
  console.log(
    chalk.dim(
      'PROJECT'.padEnd(20) +
      'MODE'.padEnd(12) +
      'RUNTIME'.padEnd(12) +
      'COST'.padEnd(10) +
      'STATUS'
    )
  );
  console.log(chalk.dim('─'.repeat(80)));

  for (const loop of loops) {
    const runtime = formatDuration(loop.session.startedAt);
    const cost = `$${loop.session.costSpent.toFixed(2)}`;
    const status = loop.isAlive
      ? chalk.green('running')
      : chalk.red('dead');

    console.log(
      loop.session.projectId.padEnd(20) +
      loop.session.mode.padEnd(12) +
      runtime.padEnd(12) +
      cost.padEnd(10) +
      status
    );
  }
}
```

### Spinner for Long Operations
```typescript
// Source: ora README
import ora from 'ora';

async function startLoop(projectId: string, mode: string): Promise<void> {
  const spinner = ora(`Starting ${mode} loop for ${projectId}...`).start();

  try {
    // Start the process
    const pid = await spawnLoop(projectId, mode);

    // Verify it's running
    await sleep(500);
    if (isProcessAlive(pid)) {
      spinner.succeed(`Loop started (PID: ${pid})`);
    } else {
      spinner.fail('Loop failed to start');
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}
```

### Confirmation Prompt for --all
```typescript
// Source: Node.js readline/promises
import * as readline from 'readline/promises';

async function confirmStopAll(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await rl.question('Stop ALL running loops? [y/N] ');
  rl.close();

  return answer.toLowerCase() === 'y';
}
```

### File Tailing for Attach Command
```typescript
// Source: Node.js fs/readline documentation
import * as fs from 'fs';
import * as path from 'path';

async function attachToLoop(projectPath: string): Promise<void> {
  const logPath = path.join(projectPath, 'ralph.log');

  // Check if log exists
  if (!fs.existsSync(logPath)) {
    throw new Error('No active log file found');
  }

  // Read and resolve symlink to get actual session log
  const realPath = await fs.promises.realpath(logPath);

  // Get file size for initial position
  let position = (await fs.promises.stat(realPath)).size;

  // Initial output: last 20 lines
  const content = await fs.promises.readFile(realPath, 'utf-8');
  const lines = content.split('\n').slice(-20);
  lines.forEach(line => process.stdout.write(line + '\n'));

  console.log(chalk.dim('--- Attached. Press Ctrl+C to detach ---'));

  // Watch for changes
  const watcher = fs.watch(realPath, async () => {
    const newSize = (await fs.promises.stat(realPath)).size;
    if (newSize > position) {
      const fd = await fs.promises.open(realPath, 'r');
      const buffer = Buffer.alloc(newSize - position);
      await fd.read(buffer, 0, buffer.length, position);
      await fd.close();
      process.stdout.write(buffer.toString());
      position = newSize;
    }
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    watcher.close();
    console.log(chalk.dim('\nDetached.'));
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| yargs-style declarative | Commander programmatic | Both valid | Commander is lighter |
| colors npm package | chalk | 2020+ | colors had supply chain issue |
| cli-spinner | ora | 2018+ | ora handles terminal better |
| Polling for file changes | fs.watch | Always | Better performance |
| CJS require | ESM import | 2022+ | Project uses ESM |

**Deprecated/outdated:**
- `colors` npm package: Had supply chain attack, use chalk
- Global `bin` installs: Use `npm link` during development
- `fs.watchFile`: Polling-based, use `fs.watch` or chokidar

## Open Questions

Things that couldn't be fully resolved:

1. **Module sharing between cli/ and dashboard/**
   - What we know: Both need ProcessRegistry, database modules
   - What's unclear: Best way to share (symlink, npm workspace, copy)
   - Recommendation: Use npm workspaces to share packages without duplication

2. **npm link vs global install**
   - What we know: Users need `ralph` command available globally
   - What's unclear: Best installation experience
   - Recommendation: Document `npm link` for development, `npm install -g` for production

3. **Windows path handling**
   - What we know: Home directory works differently on Windows
   - What's unclear: Edge cases with path separators
   - Recommendation: Use path.join() everywhere, test on Windows

## Sources

### Primary (HIGH confidence)
- [Commander.js GitHub](https://github.com/tj/commander.js) - CLI framework
- [Node.js Readline Documentation](https://nodejs.org/api/readline.html) - Line streaming
- [Node.js fs.watch Documentation](https://nodejs.org/api/fs.html#fswatchfilename-options-listener) - File watching
- Existing codebase: `dashboard/server/processManager/`, `dashboard/server/database/`

### Secondary (MEDIUM confidence)
- [Building a TypeScript CLI with Commander](https://blog.logrocket.com/building-typescript-cli-node-js-commander/) - TypeScript setup
- [chalk GitHub](https://github.com/chalk/chalk) - Terminal colors
- [ora GitHub](https://github.com/sindresorhus/ora) - Spinners

### Tertiary (LOW confidence)
- Stack Overflow patterns for file tailing
- npm trends comparison (commander vs yargs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Commander is dominant, chalk/ora are standard
- Architecture: HIGH - Direct database access follows existing patterns
- Pitfalls: HIGH - Based on Node.js docs and existing codebase patterns

**Research date:** 2026-01-20
**Valid until:** 90 days (CLI patterns are stable)
