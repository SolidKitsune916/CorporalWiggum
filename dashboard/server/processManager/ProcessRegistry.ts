/**
 * ProcessRegistry - Central registry for all running loops across projects
 *
 * Wraps SessionRepository and PidFileManager to provide:
 * 1. Unified loop registration (database + PID file)
 * 2. Central view of all active loops across all projects
 * 3. Process liveness checking
 * 4. Sync between PID files and database for orphan detection
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger.js';
import {
  getSessionRepository,
  type SessionRepository,
  type ActiveSession,
  type CreateSessionInput,
} from '../database/repositories/SessionRepository.js';
import { PidFileManager, type PidFileContent } from './PidFileManager.js';
import type { LoopMode } from '../../src/types/index.js';

/**
 * Information about an active loop including liveness status
 */
export interface ActiveLoopInfo {
  session: ActiveSession;
  isAlive: boolean;
  pidFileExists: boolean;
}

/**
 * Information about orphaned processes/sessions
 */
export interface OrphanInfo {
  type: 'stale_session' | 'orphan_pidfile';
  projectId: string;
  pid: number;
  source: 'database' | 'pidfile';
  startedAt?: string;
  mode?: LoopMode;
}

/**
 * Central process registry for managing all running loops
 */
export class ProcessRegistry {
  private sessionRepo: SessionRepository;
  private pidFileManager: PidFileManager;

  constructor(sessionRepo: SessionRepository, pidFileManager: PidFileManager) {
    this.sessionRepo = sessionRepo;
    this.pidFileManager = pidFileManager;
  }

  /**
   * Register a new loop, creating both database session and PID file
   *
   * @returns The session ID
   */
  async registerLoop(
    projectId: string,
    projectPath: string,
    pid: number,
    mode: LoopMode,
    options?: {
      maxIterations?: number;
      maxRuntimeSeconds?: number;
      costLimit?: number;
      workScope?: string;
      completionPromise?: string;
    }
  ): Promise<string> {
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    // Create session in database
    const sessionInput: CreateSessionInput = {
      id: sessionId,
      projectId,
      pid,
      mode,
      maxIterations: options?.maxIterations,
      maxRuntimeSeconds: options?.maxRuntimeSeconds,
      costLimit: options?.costLimit,
      workScope: options?.workScope,
      completionPromise: options?.completionPromise || 'ALL_TASKS_COMPLETE',
    };

    try {
      this.sessionRepo.createSession(sessionInput);
      logger.info('Session created in database', { sessionId, projectId, pid });
    } catch (err) {
      logger.error('Failed to create session in database', {
        sessionId,
        projectId,
        error: (err as Error).message,
      });
      throw err;
    }

    // Write PID file (secondary persistence)
    const pidContent: PidFileContent = {
      pid,
      projectId,
      projectPath,
      mode,
      startedAt: now,
    };

    await this.pidFileManager.writePidFile(pidContent);

    return sessionId;
  }

  /**
   * Unregister a loop, removing both database session and PID file
   */
  async unregisterLoop(
    sessionId: string,
    projectId: string,
    success: boolean = true
  ): Promise<void> {
    // Delete PID file first (so it's gone even if DB update fails)
    await this.pidFileManager.deletePidFile(projectId);

    // Mark session as completed/crashed in database
    try {
      if (success) {
        this.sessionRepo.markSessionCompleted(sessionId);
      } else {
        this.sessionRepo.markSessionCrashed(sessionId);
      }
      logger.info('Session unregistered', { sessionId, projectId, success });
    } catch (err) {
      logger.warn('Failed to update session state', {
        sessionId,
        error: (err as Error).message,
      });
    }
  }

  /**
   * Get all active loops with liveness information
   */
  async getAllActiveLoops(): Promise<ActiveLoopInfo[]> {
    const sessions = this.sessionRepo.getActiveSessions();
    const activeLoops: ActiveLoopInfo[] = [];

    for (const session of sessions) {
      const isAlive = this.isProcessAlive(session.pid);
      const pidFile = await this.pidFileManager.readPidFile(session.projectId);

      activeLoops.push({
        session,
        isAlive,
        pidFileExists: pidFile !== null,
      });
    }

    return activeLoops;
  }

  /**
   * Get the active loop for a specific project
   */
  getActiveLoop(projectId: string): ActiveSession | null {
    return this.sessionRepo.getActiveSessionForProject(projectId);
  }

  /**
   * Sync PID files with database and return orphan information
   *
   * Returns two types of orphans:
   * 1. Stale sessions: Database has 'running' session but process is dead
   * 2. Orphan PID files: PID file exists with live process but no matching session
   */
  async syncWithPidFiles(): Promise<OrphanInfo[]> {
    const orphans: OrphanInfo[] = [];

    // Check 1: Database sessions where process is dead
    const sessions = this.sessionRepo.getActiveSessions();
    for (const session of sessions) {
      if (!this.isProcessAlive(session.pid)) {
        orphans.push({
          type: 'stale_session',
          projectId: session.projectId,
          pid: session.pid,
          source: 'database',
          startedAt: session.startedAt,
          mode: session.mode,
        });
      }
    }

    // Check 2: PID files where process is alive but no matching session
    const pidFiles = await this.pidFileManager.listPidFiles();
    for (const pidFile of pidFiles) {
      // Check if there's a matching active session
      const hasMatchingSession = sessions.some(
        (s) => s.pid === pidFile.pid && s.projectId === pidFile.projectId
      );

      if (!hasMatchingSession && this.isProcessAlive(pidFile.pid)) {
        orphans.push({
          type: 'orphan_pidfile',
          projectId: pidFile.projectId,
          pid: pidFile.pid,
          source: 'pidfile',
          startedAt: pidFile.startedAt,
          mode: pidFile.mode,
        });
      }
    }

    return orphans;
  }

  /**
   * Check if a process is alive using signal 0
   *
   * Signal 0 doesn't send any signal but checks if the process exists.
   * EPERM means the process exists but we don't have permission (still alive).
   */
  isProcessAlive(pid: number): boolean {
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
   * Clean up stale sessions (process dead but session still marked running)
   */
  async cleanupStaleSessions(): Promise<string[]> {
    const cleanedIds: string[] = [];
    const sessions = this.sessionRepo.getActiveSessions();

    for (const session of sessions) {
      if (!this.isProcessAlive(session.pid)) {
        // Mark session as crashed
        this.sessionRepo.markSessionCrashed(session.id);
        // Delete PID file if exists
        await this.pidFileManager.deletePidFile(session.projectId);
        cleanedIds.push(session.id);

        logger.info('Cleaned up stale session', {
          sessionId: session.id,
          projectId: session.projectId,
          pid: session.pid,
        });
      }
    }

    return cleanedIds;
  }
}

// Singleton instance
let processRegistryInstance: ProcessRegistry | null = null;

/**
 * Get the singleton ProcessRegistry instance
 */
export function getProcessRegistry(): ProcessRegistry {
  if (!processRegistryInstance) {
    const sessionRepo = getSessionRepository();
    const pidFileManager = new PidFileManager();
    processRegistryInstance = new ProcessRegistry(sessionRepo, pidFileManager);
  }
  return processRegistryInstance;
}
