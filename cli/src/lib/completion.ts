/**
 * Completion signal detection for auto-stop functionality
 *
 * Detects completion signals in log files matching loop.sh behavior.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Completion signals to detect (matches loop.sh)
 */
export const COMPLETION_SIGNALS = {
  BUILD: 'ALL_TASKS_COMPLETE',
  PLANNING: 'PLANNING_COMPLETE',
} as const;

export type CompletionSignal = (typeof COMPLETION_SIGNALS)[keyof typeof COMPLETION_SIGNALS];

/**
 * Result of completion check
 */
export interface CompletionResult {
  complete: boolean;
  signal?: CompletionSignal;
}

/**
 * Check a string for completion signals
 * Matches loop.sh behavior: grep -q "ALL_TASKS_COMPLETE"
 */
export function checkForCompletion(content: string): CompletionResult {
  // Check for ALL_TASKS_COMPLETE
  if (content.includes(COMPLETION_SIGNALS.BUILD)) {
    return { complete: true, signal: COMPLETION_SIGNALS.BUILD };
  }

  // Check for PLANNING_COMPLETE
  if (content.includes(COMPLETION_SIGNALS.PLANNING)) {
    return { complete: true, signal: COMPLETION_SIGNALS.PLANNING };
  }

  return { complete: false };
}

/**
 * Find the log file for a project
 * Priority: ralph.log symlink, then .ralph-logs directory
 */
export function findLogFile(projectPath: string): string | null {
  // 1. Check for ralph.log symlink
  const symlink = path.join(projectPath, 'ralph.log');
  try {
    const stats = fs.lstatSync(symlink);
    if (stats.isSymbolicLink() || stats.isFile()) {
      return symlink;
    }
  } catch {
    // Continue to fallback
  }

  // 2. Check .ralph-logs directory for most recent log
  const logsDir = path.join(projectPath, '.ralph-logs');
  try {
    const files = fs
      .readdirSync(logsDir)
      .filter((f) => f.endsWith('.log'))
      .map((f) => ({
        name: f,
        path: path.join(logsDir, f),
        mtime: fs.statSync(path.join(logsDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (files.length > 0) {
      return files[0].path;
    }
  } catch {
    // No logs directory
  }

  return null;
}

/**
 * Watch a log file for completion signals
 * Returns a cleanup function
 */
export function watchForCompletion(
  logPath: string,
  onComplete: (signal: CompletionSignal) => void,
  onError?: (error: Error) => void
): () => void {
  let lastSize = 0;
  let watcher: fs.FSWatcher | null = null;

  const checkLog = async () => {
    try {
      const stats = await fs.promises.stat(logPath);

      // Only read new content
      if (stats.size > lastSize) {
        const fd = await fs.promises.open(logPath, 'r');
        const buffer = Buffer.alloc(stats.size - lastSize);
        await fd.read(buffer, 0, buffer.length, lastSize);
        await fd.close();

        const newContent = buffer.toString();
        lastSize = stats.size;

        const result = checkForCompletion(newContent);
        if (result.complete && result.signal) {
          // Stop watching and notify
          cleanup();
          onComplete(result.signal);
        }
      }
    } catch (err) {
      onError?.(err as Error);
    }
  };

  const cleanup = () => {
    if (watcher) {
      watcher.close();
      watcher = null;
    }
  };

  // Initial check (in case already complete)
  checkLog();

  // Watch for changes
  try {
    watcher = fs.watch(logPath, checkLog);
  } catch (err) {
    onError?.(err as Error);
  }

  return cleanup;
}
