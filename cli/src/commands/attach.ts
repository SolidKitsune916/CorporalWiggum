/**
 * Attach command - Stream live output from a running loop
 *
 * Attaches to a running loop and streams its output in real-time.
 * Ctrl+C detaches without stopping the loop.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { resolveProjectOrExit } from '../lib/resolve.js';
import { getDb } from '../lib/database.js';
import { tailFile } from '../lib/tail.js';
import { formatDuration } from '../lib/format.js';

/**
 * Session row from database
 */
interface SessionRow {
  id: string;
  pid: number;
  mode: string;
  started_at: string;
}

/**
 * Get the active loop for a project
 */
function getActiveLoop(projectId: string): SessionRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT id, pid, mode, started_at
      FROM active_sessions
      WHERE project_id = ? AND state IN ('running', 'paused')
      ORDER BY started_at DESC LIMIT 1
    `
    )
    .get(projectId) as SessionRow | undefined;
  return row ?? null;
}

/**
 * Find the log file for a project
 *
 * First checks for ralph.log symlink, then looks for most recent session log.
 */
function findLogFile(projectPath: string): string | null {
  // Primary: ralph.log (symlink to current session)
  const primaryLog = path.join(projectPath, 'ralph.log');

  try {
    // Check if it exists (even as symlink)
    fs.accessSync(primaryLog, fs.constants.R_OK);

    // If it's a symlink, resolve it
    const stats = fs.lstatSync(primaryLog);
    if (stats.isSymbolicLink()) {
      const realPath = fs.realpathSync(primaryLog);
      // Verify the resolved path exists and is readable
      fs.accessSync(realPath, fs.constants.R_OK);
      return realPath;
    }

    return primaryLog;
  } catch {
    // Primary log doesn't exist or not readable
  }

  // Fallback: check .ralph-logs directory for most recent file
  const logsDir = path.join(projectPath, '.ralph-logs');
  try {
    const files = fs.readdirSync(logsDir)
      .filter(f => f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: path.join(logsDir, f),
        mtime: fs.statSync(path.join(logsDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > 0) {
      return files[0].path;
    }
  } catch {
    // Logs directory doesn't exist or is empty
  }

  return null;
}

export const attachCommand = new Command('attach')
  .description('Stream live output from a running loop')
  .argument('<project>', 'Project name, path, or ID')
  .action(async (projectArg: string) => {
    try {
      // Resolve project
      const project = resolveProjectOrExit(projectArg);

      // Check for running loop
      const session = getActiveLoop(project.id);
      if (!session) {
        console.error(chalk.red(`No running loop for ${project.name}`));
        console.error(chalk.dim(`Start one with: ralph start ${project.name}`));
        process.exit(1);
      }

      // Find log file
      const logFile = findLogFile(project.path);
      if (!logFile) {
        console.error(chalk.red('No log file found'));
        console.error(chalk.dim(`Expected: ${project.path}/ralph.log`));
        process.exit(1);
      }

      // Print header
      console.log(chalk.bold(`Attached to ${project.name}`));
      console.log(
        chalk.dim(
          `Mode: ${session.mode} | PID: ${session.pid} | Running: ${formatDuration(session.started_at)}`
        )
      );
      console.log();

      // Tail the log file (never resolves - user must Ctrl+C)
      await tailFile(logFile, {
        initialLines: 30,
        onLine: console.log,
      });
    } catch (err) {
      // Handle known errors
      const error = err as Error;
      if (error.message.includes('File not found')) {
        console.error(chalk.red('Log file not found or not readable'));
        process.exit(1);
      }
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });
