/**
 * Start command - Start a loop for a project
 *
 * Spawns a loop process in daemon mode, verifies it's running,
 * and registers it with the ProcessRegistry.
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { resolveProjectOrExit } from '../lib/resolve.js';
import { getDb, getRalphDir } from '../lib/database.js';

/**
 * LoopMode type (matches dashboard/src/types/index.ts)
 */
type LoopMode = 'plan' | 'plan-slc' | 'plan-work' | 'build' | 'review';

/**
 * PID file content structure
 */
interface PidFileContent {
  pid: number;
  projectId: string;
  projectPath: string;
  mode: LoopMode;
  startedAt: string;
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
 * Get the active loop for a project
 */
function getActiveLoop(projectId: string): { id: string; pid: number } | null {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT id, pid FROM active_sessions
      WHERE project_id = ? AND state IN ('running', 'paused')
      ORDER BY started_at DESC LIMIT 1
    `
    )
    .get(projectId) as { id: string; pid: number } | undefined;
  return row ?? null;
}

/**
 * Register a loop in the database and create PID file
 */
function registerLoop(
  projectId: string,
  projectPath: string,
  pid: number,
  mode: LoopMode,
  options?: {
    maxIterations?: number;
    workScope?: string;
  }
): string {
  const db = getDb();
  const sessionId = uuidv4();
  const now = new Date().toISOString();

  // Create session in database
  db.prepare(
    `
    INSERT INTO active_sessions (
      id, project_id, pid, mode, started_at, current_iteration,
      max_iterations, max_runtime_seconds, cost_limit, cost_spent,
      tokens_input_total, tokens_output_total, state, last_heartbeat,
      work_scope, completion_promise, consecutive_failures, loop_detected,
      backoff_seconds, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    sessionId,
    projectId,
    pid,
    mode,
    now,
    0, // current_iteration
    options?.maxIterations ?? null,
    null, // max_runtime_seconds
    null, // cost_limit
    0, // cost_spent
    0, // tokens_input_total
    0, // tokens_output_total
    'running',
    now, // last_heartbeat
    options?.workScope ?? null,
    'ALL_TASKS_COMPLETE',
    0, // consecutive_failures
    0, // loop_detected
    0, // backoff_seconds
    null // metadata_json
  );

  // Write PID file
  const pidDir = path.join(getRalphDir(), 'pids');
  const sanitizedId = projectId.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 64);
  const pidFile = path.join(pidDir, `${sanitizedId}.pid`);

  const pidContent: PidFileContent = {
    pid,
    projectId,
    projectPath,
    mode,
    startedAt: now,
  };

  try {
    fs.mkdirSync(pidDir, { recursive: true });
    fs.writeFileSync(pidFile, JSON.stringify(pidContent, null, 2), { mode: 0o600 });
  } catch {
    // PID file is secondary persistence - don't fail if it can't be written
  }

  return sessionId;
}

/**
 * Find the loop.sh script
 */
function findLoopScript(projectPath: string): string | null {
  // 1. Check project directory
  const projectLoopSh = path.join(projectPath, 'loop.sh');
  if (fs.existsSync(projectLoopSh)) {
    return projectLoopSh;
  }

  // 2. Check RALPH_DIR env var
  if (process.env.RALPH_DIR) {
    const envLoopSh = path.join(process.env.RALPH_DIR, 'loop.sh');
    if (fs.existsSync(envLoopSh)) {
      return envLoopSh;
    }
  }

  // 3. Check relative to CLI (../../loop.sh from cli/dist)
  const cliDir = path.dirname(new URL(import.meta.url).pathname);
  const relativeLoopSh = path.join(cliDir, '..', '..', '..', 'loop.sh');
  if (fs.existsSync(relativeLoopSh)) {
    return path.resolve(relativeLoopSh);
  }

  return null;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const startCommand = new Command('start')
  .description('Start a loop for a project')
  .argument('<project>', 'Project name, path, or ID')
  .argument('[mode]', 'Loop mode', 'build')
  .option('-n, --max-iterations <n>', 'Maximum iterations', parseInt)
  .option('-w, --work-scope <scope>', 'Work scope (for plan-work mode)')
  .action(
    async (
      projectArg: string,
      mode: string,
      options: { maxIterations?: number; workScope?: string }
    ) => {
      try {
        // Validate mode
        const validModes: LoopMode[] = ['plan', 'plan-slc', 'plan-work', 'build', 'review'];
        if (!validModes.includes(mode as LoopMode)) {
          console.error(chalk.red(`Invalid mode: ${mode}`));
          console.error(chalk.dim(`Valid modes: ${validModes.join(', ')}`));
          process.exit(1);
        }
        const loopMode = mode as LoopMode;

        // Resolve project
        const project = resolveProjectOrExit(projectArg);

        // Check if already running
        const existing = getActiveLoop(project.id);
        if (existing && isProcessAlive(existing.pid)) {
          console.error(chalk.red(`Loop already running for ${project.name} (PID: ${existing.pid})`));
          console.error(chalk.dim("Use 'ralph stop' to stop it first"));
          process.exit(1);
        }

        // Find loop.sh
        const loopScript = findLoopScript(project.path);
        if (!loopScript) {
          console.error(chalk.red('loop.sh not found'));
          console.error(
            chalk.dim('Expected in project directory, RALPH_DIR, or relative to CLI')
          );
          process.exit(1);
        }

        // Build command arguments
        const args: string[] = [];
        switch (loopMode) {
          case 'plan':
            args.push('plan');
            if (options.maxIterations) args.push(options.maxIterations.toString());
            break;
          case 'plan-slc':
            args.push('plan-slc');
            if (options.maxIterations) args.push(options.maxIterations.toString());
            break;
          case 'plan-work':
            args.push('plan-work');
            if (options.workScope) args.push(options.workScope);
            break;
          case 'build':
            if (options.maxIterations) {
              args.push(options.maxIterations.toString());
            }
            break;
          case 'review':
            args.push('review');
            break;
        }

        // Start spinner
        const spinner = ora(`Starting ${loopMode} loop for ${project.name}...`).start();

        // Spawn process in daemon mode
        const child = spawn('bash', [loopScript, ...args], {
          cwd: project.path,
          env: {
            ...process.env,
            WORK_SCOPE: options.workScope || '',
            RALPH_DIR: path.dirname(loopScript),
          },
          detached: true,
          stdio: 'ignore',
        });

        // Unref so CLI can exit
        child.unref();

        const pid = child.pid;
        if (!pid) {
          spinner.fail('Failed to spawn process');
          process.exit(1);
        }

        // Wait and verify process is alive
        await sleep(500);

        if (!isProcessAlive(pid)) {
          spinner.fail('Loop failed to start');
          process.exit(1);
        }

        // Register with database and PID file
        const sessionId = registerLoop(project.id, project.path, pid, loopMode, {
          maxIterations: options.maxIterations,
          workScope: options.workScope,
        });

        spinner.succeed(`Loop started (PID: ${pid})`);
        console.log(chalk.dim(`Session: ${sessionId}`));
        console.log(chalk.dim(`Mode: ${loopMode}`));
        if (options.maxIterations) {
          console.log(chalk.dim(`Max iterations: ${options.maxIterations}`));
        }
        if (options.workScope) {
          console.log(chalk.dim(`Work scope: ${options.workScope}`));
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    }
  );
