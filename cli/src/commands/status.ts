/**
 * Status command - Show all running loops system-wide
 *
 * Reads from both the SQLite database and PID files to show
 * all running loops with their project, mode, runtime, cost, and status.
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { getDb, getRalphDir } from '../lib/database.js';
import { colors, tableHeader, tableRow, emptyState } from '../lib/output.js';
import { formatDuration, formatCost, formatStatus } from '../lib/format.js';
import { EXIT_CODES } from '../lib/exit-codes.js';
import { outputJson, outputJsonError } from '../lib/json-output.js';

/**
 * LoopMode type (matches dashboard/src/types/index.ts)
 */
type LoopMode = 'plan' | 'plan-slc' | 'plan-work' | 'build' | 'review';

/**
 * Session row from database
 */
interface SessionRow {
  id: string;
  project_id: string;
  pid: number;
  mode: string;
  started_at: string;
  current_iteration: number;
  cost_spent: number;
  state: string;
}

/**
 * PID file content
 */
interface PidFileContent {
  pid: number;
  projectId: string;
  projectPath: string;
  mode: LoopMode;
  startedAt: string;
}

/**
 * Active loop info combining session and liveness data
 */
interface ActiveLoopInfo {
  projectId: string;
  mode: LoopMode;
  startedAt: string;
  iteration: number;
  costSpent: number;
  pid: number;
  isAlive: boolean;
}

/**
 * Check if a process is alive using signal 0
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    // EPERM means process exists but no permission - still alive
    return error.code === 'EPERM';
  }
}

/**
 * Get all active loops from database and verify their liveness
 */
function getActiveLoops(): ActiveLoopInfo[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT id, project_id, pid, mode, started_at, current_iteration, cost_spent, state
      FROM active_sessions
      WHERE state IN ('running', 'paused')
      ORDER BY started_at DESC
    `
    )
    .all() as SessionRow[];

  return rows.map((row) => ({
    projectId: row.project_id,
    mode: row.mode as LoopMode,
    startedAt: row.started_at,
    iteration: row.current_iteration,
    costSpent: row.cost_spent,
    pid: row.pid,
    isAlive: isProcessAlive(row.pid),
  }));
}

/**
 * List all PID files to catch orphaned processes not in database
 */
async function listPidFiles(): Promise<PidFileContent[]> {
  const pidDir = path.join(getRalphDir(), 'pids');
  const pidFiles: PidFileContent[] = [];

  try {
    const files = await fs.readdir(pidDir);

    for (const file of files) {
      if (!file.endsWith('.pid')) {
        continue;
      }

      const filePath = path.join(pidDir, file);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content) as PidFileContent;

        if (
          typeof parsed.pid === 'number' &&
          typeof parsed.projectId === 'string' &&
          typeof parsed.mode === 'string' &&
          typeof parsed.startedAt === 'string'
        ) {
          pidFiles.push(parsed);
        }
      } catch {
        // Skip invalid PID files
      }
    }
  } catch (err) {
    // ENOENT is expected if PID directory doesn't exist yet
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  return pidFiles;
}

/**
 * JSON output structure for status command
 */
interface StatusJsonOutput {
  projectId: string;
  mode: LoopMode;
  pid: number;
  startedAt: string;
  runtimeMs: number;
  cost: number;
  iteration: number;
  isAlive: boolean;
}

export const statusCommand = new Command('status')
  .description('Show all running loops system-wide')
  .option('-j, --json', 'Output in JSON format')
  .action(async (options: { json?: boolean }) => {
    try {
      // Get active loops from database
      const loops = getActiveLoops();

      // Also check PID files for orphaned processes
      const pidFiles = await listPidFiles();

      // Merge: use database as primary source, add PID-only entries
      const seen = new Set(loops.map((l) => l.projectId));
      const orphans: ActiveLoopInfo[] = [];

      for (const pf of pidFiles) {
        if (!seen.has(pf.projectId) && isProcessAlive(pf.pid)) {
          orphans.push({
            projectId: pf.projectId,
            mode: pf.mode,
            startedAt: pf.startedAt,
            iteration: 0,
            costSpent: 0,
            pid: pf.pid,
            isAlive: true,
          });
        }
      }

      const allLoops = [...loops, ...orphans];

      // JSON output mode
      if (options.json) {
        const now = Date.now();
        const jsonData: StatusJsonOutput[] = allLoops.map((loop) => ({
          projectId: loop.projectId,
          mode: loop.mode,
          pid: loop.pid,
          startedAt: loop.startedAt,
          runtimeMs: now - new Date(loop.startedAt).getTime(),
          cost: loop.costSpent,
          iteration: loop.iteration,
          isAlive: loop.isAlive,
        }));
        outputJson(jsonData);
        process.exit(EXIT_CODES.SUCCESS);
      }

      // Human-readable output
      if (allLoops.length === 0) {
        emptyState('No running loops', 'Start a loop from the dashboard or with ralph start <project>');
        process.exit(EXIT_CODES.SUCCESS);
      }

      // Print table
      console.log(colors.bold('Running Loops:'));
      console.log();

      tableHeader(
        { text: 'PROJECT', width: 20 },
        { text: 'MODE', width: 12 },
        { text: 'RUNTIME', width: 12 },
        { text: 'COST', width: 10 },
        { text: 'STATUS', width: 10 }
      );

      for (const loop of allLoops) {
        const statusText = formatStatus(loop.isAlive);
        const statusColor = loop.isAlive ? colors.running : colors.dead;

        tableRow(
          { text: loop.projectId, width: 20 },
          { text: loop.mode, width: 12 },
          { text: formatDuration(loop.startedAt), width: 12 },
          { text: formatCost(loop.costSpent), width: 10 },
          { text: loop.isAlive ? 'running' : 'dead', width: 10, color: statusColor }
        );
      }

      // Summary
      const alive = allLoops.filter((l) => l.isAlive).length;
      const dead = allLoops.filter((l) => !l.isAlive).length;
      console.log();
      console.log(
        colors.dim(
          `${alive} running${dead > 0 ? `, ${dead} dead (run ralph cleanup to remove stale entries)` : ''}`
        )
      );
      process.exit(EXIT_CODES.SUCCESS);
    } catch (err) {
      if (options.json) {
        outputJsonError((err as Error).message);
        process.exit(EXIT_CODES.GENERAL_ERROR);
      }
      console.error(colors.error(`Error: ${(err as Error).message}`));
      process.exit(EXIT_CODES.GENERAL_ERROR);
    }
  });
