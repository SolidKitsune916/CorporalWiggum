/**
 * PidFileManager - Handles PID file operations for persistent process tracking
 *
 * PID files are stored at ~/.ralph/pids/<sanitized-project-id>.pid
 * They contain JSON with pid, projectId, projectPath, mode, and startedAt.
 *
 * This enables:
 * 1. Dashboard restarts to find running loops
 * 2. Cross-project visibility of all running loops
 * 3. Orphan detection and cleanup
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../lib/logger.js';
import type { LoopMode } from '../../src/types/index.js';

/**
 * Content stored in a PID file
 */
export interface PidFileContent {
  pid: number;
  projectId: string;
  projectPath: string;
  mode: LoopMode;
  startedAt: string; // ISO 8601
}

/**
 * Manages PID file operations for loop process tracking
 */
export class PidFileManager {
  /**
   * Get the PID directory path (~/.ralph/pids)
   */
  getPidDir(): string {
    return path.join(os.homedir(), '.ralph', 'pids');
  }

  /**
   * Sanitize a project ID for use as a filename
   * Replaces non-alphanumeric characters with underscores
   * Limits to 64 characters to avoid filesystem issues
   */
  sanitizeForFilename(projectId: string): string {
    return projectId.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 64);
  }

  /**
   * Get the full path to a PID file for a project
   */
  getPidFilePath(projectId: string): string {
    const sanitized = this.sanitizeForFilename(projectId);
    return path.join(this.getPidDir(), `${sanitized}.pid`);
  }

  /**
   * Write a PID file for a running loop
   * Creates the PID directory if it doesn't exist
   * File is written with mode 0o600 (owner read/write only)
   */
  async writePidFile(content: PidFileContent): Promise<void> {
    const pidDir = this.getPidDir();
    const pidFile = this.getPidFilePath(content.projectId);

    try {
      // Ensure PID directory exists
      await fs.mkdir(pidDir, { recursive: true });

      // Write PID file with restricted permissions
      const jsonContent = JSON.stringify(content, null, 2);
      await fs.writeFile(pidFile, jsonContent, { mode: 0o600 });

      logger.debug('PID file written', {
        projectId: content.projectId,
        pid: content.pid,
        path: pidFile,
      });
    } catch (err) {
      logger.warn('Failed to write PID file', {
        projectId: content.projectId,
        error: (err as Error).message,
      });
      // Don't throw - PID files are a secondary persistence mechanism
    }
  }

  /**
   * Read a PID file for a project
   * Returns null if the file doesn't exist or is invalid
   */
  async readPidFile(projectId: string): Promise<PidFileContent | null> {
    const pidFile = this.getPidFilePath(projectId);

    try {
      const content = await fs.readFile(pidFile, 'utf-8');
      const parsed = JSON.parse(content) as PidFileContent;

      // Validate required fields
      if (
        typeof parsed.pid !== 'number' ||
        typeof parsed.projectId !== 'string' ||
        typeof parsed.projectPath !== 'string' ||
        typeof parsed.mode !== 'string' ||
        typeof parsed.startedAt !== 'string'
      ) {
        logger.warn('Invalid PID file content', {
          projectId,
          path: pidFile,
        });
        return null;
      }

      return parsed;
    } catch (err) {
      // ENOENT is expected when no PID file exists
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn('Failed to read PID file', {
          projectId,
          error: (err as Error).message,
        });
      }
      return null;
    }
  }

  /**
   * Delete a PID file for a project
   * Silently ignores if the file doesn't exist
   */
  async deletePidFile(projectId: string): Promise<void> {
    const pidFile = this.getPidFilePath(projectId);

    try {
      await fs.unlink(pidFile);
      logger.debug('PID file deleted', {
        projectId,
        path: pidFile,
      });
    } catch (err) {
      // ENOENT is expected if file was already deleted
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn('Failed to delete PID file', {
          projectId,
          error: (err as Error).message,
        });
      }
    }
  }

  /**
   * List all PID files in the PID directory
   * Returns an array of PidFileContent for all valid PID files
   */
  async listPidFiles(): Promise<PidFileContent[]> {
    const pidDir = this.getPidDir();
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

          // Validate required fields
          if (
            typeof parsed.pid === 'number' &&
            typeof parsed.projectId === 'string' &&
            typeof parsed.projectPath === 'string' &&
            typeof parsed.mode === 'string' &&
            typeof parsed.startedAt === 'string'
          ) {
            pidFiles.push(parsed);
          } else {
            logger.warn('Invalid PID file skipped', { path: filePath });
          }
        } catch (parseErr) {
          logger.warn('Failed to parse PID file', {
            path: filePath,
            error: (parseErr as Error).message,
          });
        }
      }
    } catch (err) {
      // ENOENT is expected if PID directory doesn't exist yet
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn('Failed to list PID files', {
          error: (err as Error).message,
        });
      }
    }

    return pidFiles;
  }
}
