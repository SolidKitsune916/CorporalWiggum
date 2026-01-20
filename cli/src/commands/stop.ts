/**
 * Stop command - Stop running loops
 *
 * Stops loops with verified termination using graceful shutdown
 * (SIGTERM -> wait -> SIGKILL -> verify).
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import readline from 'readline/promises';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { resolveProjectOrExit } from '../lib/resolve.js';
import { getDb, getRalphDir } from '../lib/database.js';
import { EXIT_CODES } from '../lib/exit-codes.js';
import { broadcastWebhooks, createStoppedPayload } from '../lib/webhook.js';

/**
 * LoopMode type (matches dashboard/src/types/index.ts)
 */
type LoopMode = 'plan' | 'plan-slc' | 'plan-work' | 'build' | 'review';

/**
 * Active session from database
 */
interface ActiveSession {
  id: string;
  projectId: string;
  pid: number;
  mode: LoopMode;
  startedAt: string;
}

/**
 * Result of a stop operation
 */
interface StopResult {
  success: boolean;
  method: 'sigterm' | 'sigkill' | 'already_dead' | 'failed';
  durationMs: number;
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
 * Kill a process group (or individual process as fallback)
 */
function killProcessGroup(pid: number, signal: 'SIGTERM' | 'SIGKILL'): void {
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    // On Windows, use taskkill to kill the process tree
    const forceFlag = signal === 'SIGKILL' ? '/F' : '';
    try {
      execSync(`taskkill /pid ${pid} /T ${forceFlag}`, { stdio: 'ignore' });
    } catch {
      // taskkill may fail if process already dead - that's fine
    }
  } else {
    // On Unix, try process group first (negative PID)
    try {
      process.kill(-pid, signal);
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      // ESRCH means no process group - try direct kill
      if (error.code === 'ESRCH' || error.code === 'EPERM') {
        try {
          process.kill(pid, signal);
        } catch {
          // Process may already be dead - that's fine
        }
      }
    }
  }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Stop a process and verify it's actually dead
 */
async function stopAndVerify(pid: number, timeoutMs: number = 5000): Promise<StopResult> {
  const startTime = Date.now();

  // Check if already dead
  if (!isProcessAlive(pid)) {
    return { success: true, method: 'already_dead', durationMs: 0 };
  }

  // Send SIGTERM to process group
  killProcessGroup(pid, 'SIGTERM');

  // Poll until dead or timeout
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(100);
    if (!isProcessAlive(pid)) {
      return {
        success: true,
        method: 'sigterm',
        durationMs: Date.now() - startTime,
      };
    }
  }

  // Escalate to SIGKILL
  killProcessGroup(pid, 'SIGKILL');
  await sleep(200);

  const stillAlive = isProcessAlive(pid);
  return {
    success: !stillAlive,
    method: stillAlive ? 'failed' : 'sigkill',
    durationMs: Date.now() - startTime,
  };
}

/**
 * Get the active loop for a project
 */
function getActiveLoop(projectId: string): ActiveSession | null {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT id, project_id, pid, mode, started_at FROM active_sessions
      WHERE project_id = ? AND state IN ('running', 'paused')
      ORDER BY started_at DESC LIMIT 1
    `
    )
    .get(projectId) as
    | { id: string; project_id: string; pid: number; mode: string; started_at: string }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    projectId: row.project_id,
    pid: row.pid,
    mode: row.mode as LoopMode,
    startedAt: row.started_at,
  };
}

/**
 * Get all active loops
 */
function getAllActiveLoops(): ActiveSession[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT id, project_id, pid, mode, started_at FROM active_sessions
      WHERE state IN ('running', 'paused')
      ORDER BY started_at DESC
    `
    )
    .all() as Array<{ id: string; project_id: string; pid: number; mode: string; started_at: string }>;

  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    pid: row.pid,
    mode: row.mode as LoopMode,
    startedAt: row.started_at,
  }));
}

/**
 * Unregister a loop (mark session as completed/crashed and delete PID file)
 */
function unregisterLoop(sessionId: string, projectId: string, success: boolean): void {
  const db = getDb();
  const now = new Date().toISOString();

  // Mark session as completed or crashed
  const state = success ? 'completed' : 'crashed';
  db.prepare('UPDATE active_sessions SET state = ?, last_heartbeat = ? WHERE id = ?').run(
    state,
    now,
    sessionId
  );

  // Delete PID file
  const pidDir = path.join(getRalphDir(), 'pids');
  const sanitizedId = projectId.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 64);
  const pidFile = path.join(pidDir, `${sanitizedId}.pid`);

  try {
    fs.unlinkSync(pidFile);
  } catch {
    // PID file may not exist - that's fine
  }
}

export const stopCommand = new Command('stop')
  .description('Stop a running loop')
  .argument('[project]', 'Project name, path, or ID')
  .option('-a, --all', 'Stop all running loops')
  .option('-f, --force', 'Force kill without graceful shutdown')
  .option('-y, --yes', 'Skip confirmation for --all')
  .action(
    async (
      projectArg: string | undefined,
      options: { all?: boolean; force?: boolean; yes?: boolean }
    ) => {
      try {
        const timeoutMs = options.force ? 0 : 5000;

        if (options.all) {
          // Stop all running loops
          const loops = getAllActiveLoops();

          if (loops.length === 0) {
            console.log(chalk.dim('No running loops'));
            return;
          }

          // Confirm unless --yes
          if (!options.yes) {
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            const answer = await rl.question(
              chalk.yellow(`Stop ALL ${loops.length} running loop${loops.length === 1 ? '' : 's'}? [y/N] `)
            );
            rl.close();

            if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
              console.log(chalk.dim('Aborted'));
              return;
            }
          }

          // Stop each loop
          let stopped = 0;
          let failed = 0;

          for (const loop of loops) {
            const spinner = ora(`Stopping ${loop.projectId}...`).start();

            const result = await stopAndVerify(loop.pid, timeoutMs);
            unregisterLoop(loop.id, loop.projectId, result.success);

            if (result.success) {
              // Fire webhook (fire and forget)
              const durationSec = Math.round(
                (Date.now() - new Date(loop.startedAt).getTime()) / 1000
              );
              broadcastWebhooks(
                createStoppedPayload({
                  projectId: loop.projectId,
                  sessionId: loop.id,
                  mode: loop.mode,
                  durationSeconds: durationSec,
                })
              );

              spinner.succeed(`Stopped ${loop.projectId} via ${result.method} (${result.durationMs}ms)`);
              stopped++;
            } else {
              spinner.fail(`Failed to stop ${loop.projectId}`);
              failed++;
            }
          }

          // Summary
          console.log();
          if (failed === 0) {
            console.log(chalk.green(`Stopped ${stopped} loop${stopped === 1 ? '' : 's'}`));
            process.exit(EXIT_CODES.SUCCESS);
          } else {
            console.log(
              chalk.yellow(`Stopped ${stopped}, failed ${failed}`)
            );
            process.exit(EXIT_CODES.GENERAL_ERROR);
          }
        } else {
          // Stop single project
          if (!projectArg) {
            console.error(chalk.red('Project argument required'));
            console.error(chalk.dim("Use 'ralph stop <project>' or 'ralph stop --all'"));
            process.exit(EXIT_CODES.INVALID_USAGE);
          }

          const project = resolveProjectOrExit(projectArg);
          const session = getActiveLoop(project.id);

          if (!session) {
            console.error(chalk.red(`No running loop for ${project.name}`));
            console.error(chalk.dim("Use 'ralph status' to see running loops"));
            process.exit(EXIT_CODES.NOT_FOUND);
          }

          const spinner = ora(`Stopping loop for ${project.name}...`).start();

          const result = await stopAndVerify(session.pid, timeoutMs);
          unregisterLoop(session.id, project.id, result.success);

          if (result.success) {
            // Fire webhook (fire and forget)
            const durationSec = Math.round(
              (Date.now() - new Date(session.startedAt).getTime()) / 1000
            );
            broadcastWebhooks(
              createStoppedPayload({
                projectId: project.id,
                projectPath: project.path,
                sessionId: session.id,
                mode: session.mode,
                durationSeconds: durationSec,
              })
            );

            spinner.succeed(`Stopped via ${result.method} (${result.durationMs}ms)`);
            process.exit(EXIT_CODES.SUCCESS);
          } else {
            spinner.fail('Failed to stop loop');
            process.exit(EXIT_CODES.GENERAL_ERROR);
          }
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(EXIT_CODES.GENERAL_ERROR);
      }
    }
  );
