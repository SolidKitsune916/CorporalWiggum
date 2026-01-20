/**
 * File tailing utility for CLI
 *
 * Provides functions to read last lines of a file and tail a file
 * in real-time using fs.watch for efficient change detection.
 */

import fs from 'fs';
import { promises as fsPromises } from 'fs';
import chalk from 'chalk';

/**
 * Options for tailFile function
 */
export interface TailOptions {
  /** Number of initial lines to show (default: 20) */
  initialLines?: number;
  /** Callback for each line output (default: console.log) */
  onLine?: (line: string) => void;
}

// Track active watcher for programmatic stop
let activeWatcher: fs.FSWatcher | null = null;

/**
 * Read the last N lines from a file
 *
 * @param filePath - Path to the file
 * @param n - Number of lines to return
 * @returns Array of lines (empty if file doesn't exist or is empty)
 */
export async function readLastLines(filePath: string, n: number): Promise<string[]> {
  try {
    const content = await fsPromises.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.length > 0);
    return lines.slice(-n);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    // File not found is gracefully handled
    if (error.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Tail a file, showing initial lines and then streaming new content
 *
 * Uses fs.watch for efficient file change detection and tracks file position
 * to only output new content.
 *
 * @param filePath - Path to the file to tail
 * @param options - Tailing options
 * @returns Promise that never resolves (tails until Ctrl+C or stopTailing())
 */
export async function tailFile(filePath: string, options?: TailOptions): Promise<void> {
  const initialLines = options?.initialLines ?? 20;
  const onLine = options?.onLine ?? console.log;

  // Check file exists
  try {
    await fsPromises.access(filePath, fs.constants.R_OK);
  } catch {
    throw new Error(`File not found or not readable: ${filePath}`);
  }

  // Read and output initial lines
  const lastLines = await readLastLines(filePath, initialLines);
  for (const line of lastLines) {
    onLine(line);
  }

  // Get initial file size as position marker
  let stats = await fsPromises.stat(filePath);
  let position = stats.size;

  // Print separator
  console.log(chalk.dim('--- Streaming. Press Ctrl+C to detach ---'));

  // Set up file watcher
  return new Promise((resolve, reject) => {
    const watcher = fs.watch(filePath, async (eventType) => {
      if (eventType !== 'change') {
        return;
      }

      try {
        // Get new file size
        stats = await fsPromises.stat(filePath);
        const newSize = stats.size;

        // Handle file truncation (e.g., log rotation)
        if (newSize < position) {
          position = 0;
        }

        // If file grew, read new content
        if (newSize > position) {
          const fd = await fsPromises.open(filePath, 'r');
          try {
            const buffer = Buffer.alloc(newSize - position);
            await fd.read(buffer, 0, buffer.length, position);
            const newContent = buffer.toString('utf-8');

            // Split by newlines and output each line
            const lines = newContent.split('\n');
            for (const line of lines) {
              if (line.length > 0) {
                onLine(line);
              }
            }

            position = newSize;
          } finally {
            await fd.close();
          }
        }
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        // File deleted while watching - exit gracefully
        if (error.code === 'ENOENT') {
          console.log(chalk.dim('\nFile deleted. Detached.'));
          watcher.close();
          activeWatcher = null;
          resolve();
        }
        // Ignore other transient errors during watch
      }
    });

    // Store for programmatic stop
    activeWatcher = watcher;

    // Set up SIGINT handler
    const sigintHandler = () => {
      watcher.close();
      activeWatcher = null;
      console.log(chalk.dim('\nDetached.'));
      process.exit(0);
    };

    process.on('SIGINT', sigintHandler);

    // Handle watcher errors
    watcher.on('error', (err) => {
      watcher.close();
      activeWatcher = null;
      reject(err);
    });
  });
}

/**
 * Stop tailing programmatically
 *
 * Call this to stop the active tail operation without using Ctrl+C.
 */
export function stopTailing(): void {
  if (activeWatcher) {
    activeWatcher.close();
    activeWatcher = null;
    console.log(chalk.dim('\nDetached.'));
  }
}
