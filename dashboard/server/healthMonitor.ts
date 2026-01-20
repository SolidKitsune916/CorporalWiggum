/**
 * Health Monitor - Monitors session health and process liveness
 *
 * Responsibilities:
 * - Detect orphaned sessions (process died unexpectedly)
 * - Clean up stale sessions
 * - Emit events for UI notification
 * - Perform periodic health checks
 */

import { EventEmitter } from 'events';
import { getSessionRepository, type ActiveSession } from './database/repositories/SessionRepository.js';
import { getExecutionHistoryRepository } from './database/repositories/ExecutionHistoryRepository.js';
import { DatabaseBackup } from './database/backup.js';
import { logger } from './lib/logger.js';

// Heartbeat timeout - if no heartbeat in this time, session is stale
const HEARTBEAT_TIMEOUT_MS = 30000; // 30 seconds

// Check interval
const CHECK_INTERVAL_MS = 10000; // 10 seconds

export interface HealthMonitorEvents {
  'session:orphaned': (session: ActiveSession) => void;
  'session:recovered': (session: ActiveSession) => void;
  'health:check': (stats: HealthStats) => void;
}

export interface HealthStats {
  activeSessions: number;
  staleSessions: number;
  totalMemoryMB: number;
  uptime: number;
  lastCheck: Date;
}

export class HealthMonitor extends EventEmitter {
  private checkInterval: NodeJS.Timeout | null = null;
  private startTime: Date;
  private running = false;

  constructor() {
    super();
    this.startTime = new Date();
  }

  /**
   * Start the health monitor
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    logger.info('Starting health monitor');

    // Perform initial check
    this.performCheck();

    // Start periodic checks
    this.checkInterval = setInterval(() => {
      this.performCheck();
    }, CHECK_INTERVAL_MS);

    // Perform daily backup on startup if needed (async, don't block startup)
    DatabaseBackup.performDailyBackupIfNeeded().catch(err => {
      logger.error('Failed to perform daily backup', { error: err instanceof Error ? err.message : String(err) });
    });
  }

  /**
   * Stop the health monitor
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.running = false;
    logger.info('Stopped health monitor');
  }

  /**
   * Perform a health check
   */
  private performCheck(): void {
    try {
      const sessionRepo = getSessionRepository();

      // Get active sessions
      const activeSessions = sessionRepo.getActiveSessions();

      // Check each session for liveness
      for (const session of activeSessions) {
        this.checkSessionHealth(session);
      }

      // Clean up any remaining stale sessions
      const staleSessions = sessionRepo.cleanupStaleSessions(HEARTBEAT_TIMEOUT_MS);
      for (const stale of staleSessions) {
        this.handleOrphanedSession(stale);
      }

      // Emit health stats
      const stats: HealthStats = {
        activeSessions: activeSessions.length - staleSessions.length,
        staleSessions: staleSessions.length,
        totalMemoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        uptime: Date.now() - this.startTime.getTime(),
        lastCheck: new Date(),
      };

      this.emit('health:check', stats);
    } catch (error) {
      logger.error('Error during health check', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Check if a specific session is healthy
   */
  private checkSessionHealth(session: ActiveSession): void {
    // Check if process is still alive
    if (!this.isProcessAlive(session.pid)) {
      logger.info('Process is not alive', { pid: session.pid, sessionId: session.id });
      this.handleOrphanedSession(session);
      return;
    }

    // Check heartbeat freshness
    const lastHeartbeat = new Date(session.lastHeartbeat);
    const now = new Date();
    const ageMs = now.getTime() - lastHeartbeat.getTime();

    if (ageMs > HEARTBEAT_TIMEOUT_MS) {
      logger.warn('Session heartbeat stale', { sessionId: session.id, ageSeconds: Math.round(ageMs / 1000) });
      // Don't immediately mark as orphaned - the process might still be running
      // The cleanupStaleSessions call will handle this
    }
  }

  /**
   * Handle an orphaned session
   */
  private handleOrphanedSession(session: ActiveSession): void {
    logger.info('Handling orphaned session', { sessionId: session.id });

    const sessionRepo = getSessionRepository();
    const historyRepo = getExecutionHistoryRepository();

    // Mark session as crashed
    sessionRepo.markSessionCrashed(session.id);

    // Record in execution history
    historyRepo.recordExecution({
      projectId: session.projectId,
      sessionId: session.id,
      mode: session.mode,
      iteration: session.currentIteration,
      startedAt: session.startedAt,
      endedAt: new Date().toISOString(),
      success: false,
      exitReason: 'orphaned',
      tokensInput: session.tokensInputTotal,
      tokensOutput: session.tokensOutputTotal,
      costUsd: session.costSpent,
      errorMessage: 'Process died unexpectedly or heartbeat timeout',
    });

    // Emit event for UI notification
    this.emit('session:orphaned', session);
  }

  /**
   * Check if a process is alive by sending signal 0
   */
  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Recover a session on server startup
   * Returns the session if it can be recovered, null otherwise
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future project-specific recovery
  async recoverSession(_projectPath: string): Promise<ActiveSession | null> {
    const sessionRepo = getSessionRepository();

    // Find active session for this project
    // We need to find by project path, but we store by project ID
    // This would require joining with projects table or storing path in session
    // For now, let's check all active sessions
    const activeSessions = sessionRepo.getActiveSessions();

    for (const session of activeSessions) {
      // Check if process is still alive
      if (this.isProcessAlive(session.pid)) {
        logger.info('Recovered session', { sessionId: session.id, pid: session.pid });
        this.emit('session:recovered', session);
        return session;
      } else {
        // Process is dead, mark as crashed
        this.handleOrphanedSession(session);
      }
    }

    return null;
  }

  /**
   * Get current health stats
   */
  getStats(): HealthStats {
    const sessionRepo = getSessionRepository();
    const activeSessions = sessionRepo.getActiveSessions();

    return {
      activeSessions: activeSessions.length,
      staleSessions: 0,
      totalMemoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      uptime: Date.now() - this.startTime.getTime(),
      lastCheck: new Date(),
    };
  }
}

// Singleton instance
let healthMonitorInstance: HealthMonitor | null = null;

export function getHealthMonitor(): HealthMonitor {
  if (!healthMonitorInstance) {
    healthMonitorInstance = new HealthMonitor();
  }
  return healthMonitorInstance;
}
