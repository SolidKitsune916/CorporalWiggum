/**
 * OrphanDetector - Detects and cleans up orphaned loops at dashboard startup
 *
 * When the dashboard crashes or restarts, loops may continue running without
 * proper tracking. This class:
 * 1. Detects orphaned loops from both database and PID files
 * 2. Automatically cleans up stale entries (dead processes)
 * 3. Reports live orphans to the frontend for user action
 * 4. Provides cleanup functionality for orphaned processes
 */

import { logger } from '../lib/logger.js';
import { PidFileManager } from './PidFileManager.js';
import {
  getSessionRepository,
  type SessionRepository,
} from '../database/repositories/SessionRepository.js';
import type { LoopMode } from '../../src/types/index.js';

/**
 * Information about an orphaned loop
 */
export interface OrphanedLoop {
  projectId: string;
  projectPath?: string;
  pid: number;
  mode: LoopMode;
  startedAt: string;
  source: 'database' | 'pidfile';
  status: 'alive' | 'dead';
}

/**
 * Result of orphan detection
 */
export interface OrphanDetectionResult {
  /** Live processes without proper tracking */
  orphans: OrphanedLoop[];
  /** Session IDs marked as crashed (dead processes) */
  staleSessions: string[];
  /** PID files deleted (dead processes) */
  stalePidFiles: string[];
}

/**
 * Detects and manages orphaned loop processes
 */
export class OrphanDetector {
  private pidFileManager: PidFileManager;
  private sessionRepo: SessionRepository;

  constructor(pidFileManager: PidFileManager, sessionRepo: SessionRepository) {
    this.pidFileManager = pidFileManager;
    this.sessionRepo = sessionRepo;
  }

  /**
   * Detect orphaned loops from both database and PID files
   *
   * Detection logic:
   * 1. For each active database session:
   *    - If process is dead: mark session crashed, add to staleSessions
   *    - If process is alive but no PID file: add to orphans (source: 'database')
   * 2. For each PID file:
   *    - If process is dead: delete PID file, add to stalePidFiles
   *    - If process is alive but no matching session: add to orphans (source: 'pidfile')
   */
  async detectOrphans(): Promise<OrphanDetectionResult> {
    const result: OrphanDetectionResult = {
      orphans: [],
      staleSessions: [],
      stalePidFiles: [],
    };

    // Get current state from both sources
    const sessions = this.sessionRepo.getActiveSessions();
    const pidFiles = await this.pidFileManager.listPidFiles();

    // Build lookup maps
    const pidFileMap = new Map(pidFiles.map((pf) => [pf.pid, pf]));
    const sessionPids = new Set(sessions.map((s) => s.pid));

    logger.debug('Orphan detection starting', {
      activeSessions: sessions.length,
      pidFiles: pidFiles.length,
    });

    // Check database sessions
    for (const session of sessions) {
      const alive = this.isProcessAlive(session.pid);

      if (!alive) {
        // Process is dead - mark session as crashed
        this.sessionRepo.markSessionCrashed(session.id);
        result.staleSessions.push(session.id);
        logger.debug('Marked stale session as crashed', {
          sessionId: session.id,
          projectId: session.projectId,
          pid: session.pid,
        });
      } else if (!pidFileMap.has(session.pid)) {
        // Process is alive but no PID file - orphan from database
        result.orphans.push({
          projectId: session.projectId,
          pid: session.pid,
          mode: session.mode,
          startedAt: session.startedAt,
          source: 'database',
          status: 'alive',
        });
        logger.debug('Found orphan from database (no PID file)', {
          projectId: session.projectId,
          pid: session.pid,
        });
      }
    }

    // Check PID files
    for (const pidFile of pidFiles) {
      const alive = this.isProcessAlive(pidFile.pid);

      if (!alive) {
        // Process is dead - delete stale PID file
        await this.pidFileManager.deletePidFile(pidFile.projectId);
        result.stalePidFiles.push(pidFile.projectId);
        logger.debug('Deleted stale PID file', {
          projectId: pidFile.projectId,
          pid: pidFile.pid,
        });
      } else if (!sessionPids.has(pidFile.pid)) {
        // Process is alive but no matching session - orphan from PID file
        result.orphans.push({
          projectId: pidFile.projectId,
          projectPath: pidFile.projectPath,
          pid: pidFile.pid,
          mode: pidFile.mode,
          startedAt: pidFile.startedAt,
          source: 'pidfile',
          status: 'alive',
        });
        logger.debug('Found orphan from PID file (no session)', {
          projectId: pidFile.projectId,
          pid: pidFile.pid,
        });
      }
    }

    logger.info('Orphan detection complete', {
      orphansFound: result.orphans.length,
      staleSessionsCleaned: result.staleSessions.length,
      stalePidFilesCleaned: result.stalePidFiles.length,
    });

    return result;
  }

  /**
   * Kill an orphaned process and clean up its tracking data
   *
   * @returns true if cleanup succeeded, false otherwise
   */
  async cleanupOrphan(orphan: OrphanedLoop): Promise<boolean> {
    logger.info('Cleaning up orphan', {
      projectId: orphan.projectId,
      pid: orphan.pid,
      source: orphan.source,
    });

    try {
      // First, try to kill the process gracefully (SIGTERM)
      const killed = await this.stopProcess(orphan.pid);

      if (!killed) {
        logger.warn('Failed to kill orphan process', {
          projectId: orphan.projectId,
          pid: orphan.pid,
        });
        return false;
      }

      // Clean up PID file if exists
      await this.pidFileManager.deletePidFile(orphan.projectId);

      // Mark any matching session as crashed
      const session = this.sessionRepo.getActiveSessionForProject(orphan.projectId);
      if (session && session.pid === orphan.pid) {
        this.sessionRepo.markSessionCrashed(session.id);
      }

      logger.info('Orphan cleaned up successfully', {
        projectId: orphan.projectId,
        pid: orphan.pid,
      });

      return true;
    } catch (err) {
      logger.error('Error cleaning up orphan', {
        projectId: orphan.projectId,
        pid: orphan.pid,
        error: (err as Error).message,
      });
      return false;
    }
  }

  /**
   * Clean up multiple orphaned processes
   *
   * @returns count of cleaned and failed orphans
   */
  async cleanupAllOrphans(
    orphans: OrphanedLoop[]
  ): Promise<{ cleaned: number; failed: number }> {
    let cleaned = 0;
    let failed = 0;

    for (const orphan of orphans) {
      const success = await this.cleanupOrphan(orphan);
      if (success) {
        cleaned++;
      } else {
        failed++;
      }
    }

    logger.info('Batch orphan cleanup complete', { cleaned, failed });

    return { cleaned, failed };
  }

  /**
   * Check if a process is alive using signal 0
   *
   * Signal 0 doesn't send any signal but checks if the process exists.
   * EPERM means the process exists but we don't have permission (still alive).
   */
  private isProcessAlive(pid: number): boolean {
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
   * Stop a process gracefully, falling back to SIGKILL if needed
   *
   * @returns true if process was stopped, false if it couldn't be stopped
   */
  private async stopProcess(pid: number): Promise<boolean> {
    // First check if process is still alive
    if (!this.isProcessAlive(pid)) {
      return true; // Already dead
    }

    try {
      // Send SIGTERM for graceful shutdown
      process.kill(pid, 'SIGTERM');

      // Wait up to 5 seconds for process to exit
      const maxWait = 5000;
      const interval = 100;
      let waited = 0;

      while (waited < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, interval));
        waited += interval;

        if (!this.isProcessAlive(pid)) {
          return true; // Process exited
        }
      }

      // Process didn't exit gracefully, force kill
      logger.warn('Process did not exit gracefully, sending SIGKILL', { pid });
      process.kill(pid, 'SIGKILL');

      // Wait a bit more
      await new Promise((resolve) => setTimeout(resolve, 500));

      return !this.isProcessAlive(pid);
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;

      // ESRCH means process doesn't exist - already dead
      if (error.code === 'ESRCH') {
        return true;
      }

      // EPERM means we don't have permission to kill the process
      if (error.code === 'EPERM') {
        logger.error('No permission to kill process', { pid });
        return false;
      }

      logger.error('Error stopping process', {
        pid,
        error: error.message,
      });
      return false;
    }
  }
}
