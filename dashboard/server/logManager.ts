import fs from 'fs/promises';
import path from 'path';
import { logger } from './lib/logger.js';

export interface LogSession {
  filename: string;
  timestamp: string;
  size: number;
  date: Date;
  isActive: boolean;
}

export class LogManager {
  private projectPath: string;
  private logsDir: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.logsDir = path.join(projectPath, 'logs');
  }

  /**
   * List all session log files with metadata
   */
  async listLogs(): Promise<LogSession[]> {
    const sessions: LogSession[] = [];

    try {
      // Ensure logs directory exists
      await fs.mkdir(this.logsDir, { recursive: true });

      const files = await fs.readdir(this.logsDir);

      // Get the active log (what ralph.log symlink points to)
      let activePath: string | null = null;
      try {
        const symlinkTarget = await fs.readlink(path.join(this.projectPath, 'ralph.log'));
        activePath = path.resolve(this.projectPath, symlinkTarget);
      } catch {
        // ralph.log doesn't exist or isn't a symlink
      }

      for (const file of files) {
        // Only include session log files
        if (!file.startsWith('session-') || !file.endsWith('.log')) {
          continue;
        }

        const filePath = path.join(this.logsDir, file);

        try {
          const stat = await fs.stat(filePath);

          // Parse timestamp from filename: session-2026-01-15T10-30-00.log
          const timestampMatch = file.match(/session-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.log/);

          // Parse date from filename
          const dateString = timestampMatch
            ? timestampMatch[1].replace(/T/, ' ').replace(/-/g, (m, i) => i < 10 ? '-' : ':')
            : '';
          const date = dateString ? new Date(dateString.slice(0, 10) + 'T' + dateString.slice(11).replace(/-/g, ':')) : new Date(stat.mtime);

          sessions.push({
            filename: file,
            timestamp: date.toISOString(),
            size: stat.size,
            date,
            isActive: filePath === activePath,
          });
        } catch {
          // Skip files that can't be read
        }
      }

      // Sort by date, most recent first
      sessions.sort((a, b) => b.date.getTime() - a.date.getTime());

      return sessions;
    } catch (err) {
      logger.error('Error listing logs', { error: err instanceof Error ? err.message : String(err) });
      return [];
    }
  }

  /**
   * Read a specific log file
   */
  async readLog(filename: string): Promise<string> {
    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || !filename.startsWith('session-')) {
      throw new Error('Invalid log filename');
    }

    const filePath = path.join(this.logsDir, filename);

    // Verify file is within logs directory
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(this.logsDir))) {
      throw new Error('Invalid log filename');
    }

    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      throw new Error(`Log file not found: ${filename}`);
    }
  }

  /**
   * Get the currently active session log (what ralph.log points to)
   */
  async getActiveLog(): Promise<{ filename: string; content: string } | null> {
    try {
      const symlinkPath = path.join(this.projectPath, 'ralph.log');
      const symlinkTarget = await fs.readlink(symlinkPath);
      const filename = path.basename(symlinkTarget);
      const content = await this.readLog(filename);
      return { filename, content };
    } catch {
      // No active log
      return null;
    }
  }

  /**
   * Delete a specific log file
   */
  async deleteLog(filename: string): Promise<void> {
    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || !filename.startsWith('session-')) {
      throw new Error('Invalid log filename');
    }

    const filePath = path.join(this.logsDir, filename);

    // Verify file is within logs directory
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(this.logsDir))) {
      throw new Error('Invalid log filename');
    }

    // Check if this is the active log
    try {
      const symlinkTarget = await fs.readlink(path.join(this.projectPath, 'ralph.log'));
      const activePath = path.resolve(this.projectPath, symlinkTarget);
      if (resolvedPath === activePath) {
        throw new Error('Cannot delete active session log');
      }
    } catch (err) {
      if ((err as Error).message === 'Cannot delete active session log') {
        throw err;
      }
      // ralph.log doesn't exist or isn't a symlink - OK to delete
    }

    await fs.unlink(filePath);
  }

  /**
   * Delete logs older than a specified number of days
   */
  async cleanupOldLogs(keepDays: number = 7): Promise<number> {
    const sessions = await this.listLogs();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    let deletedCount = 0;

    for (const session of sessions) {
      // Don't delete active session
      if (session.isActive) {
        continue;
      }

      if (session.date < cutoffDate) {
        try {
          await this.deleteLog(session.filename);
          deletedCount++;
        } catch (err) {
          logger.error('Failed to delete old log', { filename: session.filename, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    return deletedCount;
  }

  /**
   * Get total size of all logs
   */
  async getTotalLogSize(): Promise<number> {
    const sessions = await this.listLogs();
    return sessions.reduce((total, session) => total + session.size, 0);
  }
}
