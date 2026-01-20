/**
 * Logs command - Show recent log output from a project
 *
 * Displays historical log output from a project's log file.
 * Can optionally follow new output with --follow flag.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { resolveProjectOrExit } from '../lib/resolve.js';
import { readLastLines, tailFile } from '../lib/tail.js';

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
    const files = fs
      .readdirSync(logsDir)
      .filter((f) => f.endsWith('.log'))
      .map((f) => ({
        name: f,
        path: path.join(logsDir, f),
        mtime: fs.statSync(path.join(logsDir, f)).mtime.getTime(),
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

export const logsCommand = new Command('logs')
  .description('Show recent log output')
  .argument('<project>', 'Project name, path, or ID')
  .option('-n, --lines <n>', 'Number of lines to show', '50')
  .option('-f, --follow', 'Follow log output (like tail -f)')
  .action(async (projectArg: string, options: { lines: string; follow?: boolean }) => {
    try {
      // Resolve project
      const project = resolveProjectOrExit(projectArg);

      // Parse lines option
      const numLines = parseInt(options.lines, 10);
      if (isNaN(numLines) || numLines < 1) {
        console.error(chalk.red('Invalid number of lines'));
        process.exit(1);
      }

      // Find log file
      const logFile = findLogFile(project.path);
      if (!logFile) {
        console.error(chalk.red(`No log files found for ${project.name}`));
        console.error(chalk.dim(`Expected: ${project.path}/ralph.log`));
        console.error(chalk.dim(`Or: ${project.path}/.ralph-logs/*.log`));
        process.exit(1);
      }

      if (options.follow) {
        // Follow mode: show initial lines then tail
        console.log(chalk.dim(`Showing last ${numLines} lines from ${path.basename(logFile)}`));
        console.log();

        // tailFile handles initial lines and streaming
        await tailFile(logFile, {
          initialLines: numLines,
          onLine: console.log,
        });
      } else {
        // Non-follow mode: just show last N lines and exit
        const lines = await readLastLines(logFile, numLines);

        if (lines.length === 0) {
          console.log(chalk.dim('Log file is empty'));
          return;
        }

        for (const line of lines) {
          console.log(line);
        }

        console.log();
        console.log(chalk.dim(`Showing last ${lines.length} lines from ${path.basename(logFile)}`));
        console.log(chalk.dim('Use -f to follow new output'));
      }
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
