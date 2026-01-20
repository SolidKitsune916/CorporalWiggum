/**
 * Watch command - Wait for loop completion
 *
 * Monitors a running loop and exits when it completes or fails.
 * Useful for scripts that need to wait for loop completion.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolveProjectOrExit } from '../lib/resolve.js';
import { getDb } from '../lib/database.js';
import { EXIT_CODES } from '../lib/exit-codes.js';
import { outputJson, outputJsonError } from '../lib/json-output.js';
import {
  watchForCompletion,
  findLogFile,
  CompletionSignal,
} from '../lib/completion.js';
import {
  broadcastWebhooks,
  createCompletionPayload,
  createCrashedPayload,
} from '../lib/webhook.js';

/**
 * Check if process is alive
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    return error.code === 'EPERM';
  }
}

/**
 * Get the active loop for a project
 */
function getActiveLoop(projectId: string): {
  id: string;
  pid: number;
  startedAt: string;
  mode: string;
} | null {
  const db = getDb();
  const row = db
    .prepare(
      `
    SELECT id, pid, started_at, mode FROM active_sessions
    WHERE project_id = ? AND state IN ('running', 'paused')
    ORDER BY started_at DESC LIMIT 1
  `
    )
    .get(projectId) as
    | {
        id: string;
        pid: number;
        started_at: string;
        mode: string;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    pid: row.pid,
    startedAt: row.started_at,
    mode: row.mode,
  };
}

/**
 * Update session state to completed
 */
function markSessionCompleted(sessionId: string, _signal: CompletionSignal): void {
  const db = getDb();
  db.prepare(
    `
    UPDATE active_sessions
    SET state = 'completed', last_heartbeat = ?
    WHERE id = ?
  `
  ).run(new Date().toISOString(), sessionId);
}

export const watchCommand = new Command('watch')
  .description('Wait for a loop to complete')
  .argument('<project>', 'Project name, path, or ID')
  .option('-j, --json', 'Output in JSON format')
  .option('-t, --timeout <seconds>', 'Timeout in seconds (0 = no timeout)', '0')
  .action(
    async (projectArg: string, options: { json?: boolean; timeout?: string }) => {
      try {
        const project = resolveProjectOrExit(projectArg);
        const timeoutSec = parseInt(options.timeout || '0', 10);

        // Check for running loop
        const loop = getActiveLoop(project.id);
        if (!loop) {
          if (options.json) {
            outputJsonError(`No running loop for ${project.name}`);
          } else {
            console.error(chalk.red(`No running loop for ${project.name}`));
            console.error(chalk.dim("Use 'ralph status' to see running loops"));
          }
          process.exit(EXIT_CODES.NOT_FOUND);
        }

        // Find log file
        const logPath = findLogFile(project.path);
        if (!logPath) {
          if (options.json) {
            outputJsonError('Log file not found');
          } else {
            console.error(chalk.red('Log file not found'));
            console.error(chalk.dim('Expected ralph.log or .ralph-logs directory'));
          }
          process.exit(EXIT_CODES.NOT_FOUND);
        }

        // Start watching
        const spinner = options.json
          ? null
          : ora(`Watching ${project.name} for completion...`).start();

        let completed = false;
        let timeoutId: NodeJS.Timeout | null = null;
        let cleanupWatcher: (() => void) | null = null;
        let processCheckInterval: NodeJS.Timeout | null = null;

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (processCheckInterval) clearInterval(processCheckInterval);
          if (cleanupWatcher) cleanupWatcher();
        };

        // Set up timeout if specified
        if (timeoutSec > 0) {
          timeoutId = setTimeout(() => {
            cleanup();
            if (spinner) spinner.fail('Timeout waiting for completion');
            if (options.json) {
              outputJsonError('Timeout waiting for completion');
            }
            process.exit(EXIT_CODES.GENERAL_ERROR);
          }, timeoutSec * 1000);
        }

        // Poll for process death (every 2 seconds)
        processCheckInterval = setInterval(() => {
          if (!isProcessAlive(loop.pid)) {
            cleanup();

            if (!completed) {
              // Process died without completion signal = crash
              // Fire crash webhook
              const crashDuration = Math.round(
                (Date.now() - new Date(loop.startedAt).getTime()) / 1000
              );
              broadcastWebhooks(
                createCrashedPayload({
                  projectId: project.id,
                  projectPath: project.path,
                  sessionId: loop.id,
                  mode: loop.mode,
                  durationSeconds: crashDuration,
                })
              );

              if (spinner) spinner.fail('Loop crashed before completion');
              if (options.json) {
                outputJsonError('Loop crashed before completion');
              }
              process.exit(EXIT_CODES.GENERAL_ERROR);
            }
          }
        }, 2000);

        // Watch for completion
        cleanupWatcher = watchForCompletion(
          logPath,
          (signal) => {
            completed = true;
            cleanup();

            // Mark session as completed
            markSessionCompleted(loop.id, signal);

            const duration = Date.now() - new Date(loop.startedAt).getTime();
            const durationSec = Math.round(duration / 1000);

            // Fire webhook (fire and forget)
            broadcastWebhooks(
              createCompletionPayload({
                projectId: project.id,
                projectPath: project.path,
                sessionId: loop.id,
                mode: loop.mode,
                durationSeconds: durationSec,
                signal,
              })
            );

            if (options.json) {
              outputJson({
                event: 'complete',
                signal,
                projectId: project.id,
                projectName: project.name,
                mode: loop.mode,
                sessionId: loop.id,
                durationSeconds: durationSec,
              });
            } else {
              spinner?.succeed(`Loop completed: ${signal}`);
              console.log(chalk.dim(`Duration: ${durationSec}s`));
            }

            process.exit(EXIT_CODES.SUCCESS);
          },
          (err) => {
            if (spinner) spinner.warn(`Log watch error: ${err.message}`);
          }
        );

        // Handle SIGINT gracefully
        process.on('SIGINT', () => {
          cleanup();
          if (!options.json) {
            console.log(chalk.dim('\nWatch cancelled'));
          }
          process.exit(EXIT_CODES.SUCCESS);
        });
      } catch (err) {
        if (options.json) {
          outputJsonError((err as Error).message);
        } else {
          console.error(chalk.red(`Error: ${(err as Error).message}`));
        }
        process.exit(EXIT_CODES.GENERAL_ERROR);
      }
    }
  );
