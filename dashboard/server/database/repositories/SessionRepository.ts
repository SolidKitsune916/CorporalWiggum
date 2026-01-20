/**
 * SessionRepository - Manages active loop sessions for browser refresh resilience
 *
 * This repository persists session state to SQLite so that:
 * 1. Browser refresh reconnects to running loops
 * 2. Server restarts can recover orphaned sessions
 * 3. Session history is preserved for debugging
 */

import { getDb } from '../index.js';
import type { LoopMode } from '../../../src/types/index.js';

export interface ActiveSession {
  id: string;
  projectId: string;
  pid: number;
  mode: LoopMode;
  startedAt: string;
  currentIteration: number;
  maxIterations: number | null;
  maxRuntimeSeconds: number | null;
  costLimit: number | null;
  costSpent: number;
  tokensInputTotal: number;
  tokensOutputTotal: number;
  state: 'running' | 'paused' | 'stopping' | 'completed' | 'crashed';
  lastHeartbeat: string;
  workScope: string | null;
  completionPromise: string;
  consecutiveFailures: number;
  loopDetected: boolean;
  backoffSeconds: number;
  metadata: Record<string, unknown> | null;
  subAgentCount: number;
}

interface SessionRow {
  id: string;
  project_id: string;
  pid: number;
  mode: string;
  started_at: string;
  current_iteration: number;
  max_iterations: number | null;
  max_runtime_seconds: number | null;
  cost_limit: number | null;
  cost_spent: number;
  tokens_input_total: number;
  tokens_output_total: number;
  state: string;
  last_heartbeat: string;
  work_scope: string | null;
  completion_promise: string;
  consecutive_failures: number;
  loop_detected: number;
  backoff_seconds: number;
  metadata_json: string | null;
  sub_agent_count: number;
}

export interface CreateSessionInput {
  id: string;
  projectId: string;
  pid: number;
  mode: LoopMode;
  maxIterations?: number;
  maxRuntimeSeconds?: number;
  costLimit?: number;
  workScope?: string;
  completionPromise?: string;
}

export interface UpdateSessionInput {
  pid?: number;
  currentIteration?: number;
  costSpent?: number;
  tokensInputTotal?: number;
  tokensOutputTotal?: number;
  state?: ActiveSession['state'];
  consecutiveFailures?: number;
  loopDetected?: boolean;
  backoffSeconds?: number;
  metadata?: Record<string, unknown>;
}

export class SessionRepository {
  /**
   * Create a new active session
   */
  createSession(input: CreateSessionInput): ActiveSession {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `
      INSERT INTO active_sessions (
        id, project_id, pid, mode, started_at, current_iteration,
        max_iterations, max_runtime_seconds, cost_limit, cost_spent,
        tokens_input_total, tokens_output_total, state, last_heartbeat,
        work_scope, completion_promise, consecutive_failures, loop_detected,
        backoff_seconds, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      input.id,
      input.projectId,
      input.pid,
      input.mode,
      now,
      0, // current_iteration
      input.maxIterations ?? null,
      input.maxRuntimeSeconds ?? null,
      input.costLimit ?? null,
      0, // cost_spent
      0, // tokens_input_total
      0, // tokens_output_total
      'running',
      now,
      input.workScope ?? null,
      input.completionPromise ?? 'ALL_TASKS_COMPLETE',
      0, // consecutive_failures
      0, // loop_detected
      0, // backoff_seconds
      null // metadata_json
    );

    return this.getSession(input.id)!;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): ActiveSession | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM active_sessions WHERE id = ?').get(sessionId) as
      | SessionRow
      | undefined;

    return row ? this.rowToSession(row) : null;
  }

  /**
   * Get the active session for a project (if any)
   */
  getActiveSessionForProject(projectId: string): ActiveSession | null {
    const db = getDb();
    const row = db
      .prepare(
        `
      SELECT * FROM active_sessions
      WHERE project_id = ? AND state IN ('running', 'paused')
      ORDER BY started_at DESC LIMIT 1
    `
      )
      .get(projectId) as SessionRow | undefined;

    return row ? this.rowToSession(row) : null;
  }

  /**
   * Get all active sessions (running or paused)
   */
  getActiveSessions(): ActiveSession[] {
    const db = getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM active_sessions
      WHERE state IN ('running', 'paused')
      ORDER BY started_at DESC
    `
      )
      .all() as SessionRow[];

    return rows.map(this.rowToSession);
  }

  /**
   * Update session fields
   */
  updateSession(sessionId: string, updates: UpdateSessionInput): void {
    const db = getDb();
    const now = new Date().toISOString();

    const setClauses: string[] = ['last_heartbeat = ?'];
    const values: unknown[] = [now];

    if (updates.pid !== undefined) {
      setClauses.push('pid = ?');
      values.push(updates.pid);
    }
    if (updates.currentIteration !== undefined) {
      setClauses.push('current_iteration = ?');
      values.push(updates.currentIteration);
    }
    if (updates.costSpent !== undefined) {
      setClauses.push('cost_spent = ?');
      values.push(updates.costSpent);
    }
    if (updates.tokensInputTotal !== undefined) {
      setClauses.push('tokens_input_total = ?');
      values.push(updates.tokensInputTotal);
    }
    if (updates.tokensOutputTotal !== undefined) {
      setClauses.push('tokens_output_total = ?');
      values.push(updates.tokensOutputTotal);
    }
    if (updates.state !== undefined) {
      setClauses.push('state = ?');
      values.push(updates.state);
    }
    if (updates.consecutiveFailures !== undefined) {
      setClauses.push('consecutive_failures = ?');
      values.push(updates.consecutiveFailures);
    }
    if (updates.loopDetected !== undefined) {
      setClauses.push('loop_detected = ?');
      values.push(updates.loopDetected ? 1 : 0);
    }
    if (updates.backoffSeconds !== undefined) {
      setClauses.push('backoff_seconds = ?');
      values.push(updates.backoffSeconds);
    }
    if (updates.metadata !== undefined) {
      setClauses.push('metadata_json = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    values.push(sessionId);

    db.prepare(
      `
      UPDATE active_sessions SET ${setClauses.join(', ')} WHERE id = ?
    `
    ).run(...values);
  }

  /**
   * Update heartbeat timestamp (called periodically during loop execution)
   */
  updateHeartbeat(sessionId: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare('UPDATE active_sessions SET last_heartbeat = ? WHERE id = ?').run(now, sessionId);
  }

  /**
   * Update current iteration number
   */
  updateIteration(sessionId: string, iteration: number): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare('UPDATE active_sessions SET current_iteration = ?, last_heartbeat = ? WHERE id = ?')
      .run(iteration, now, sessionId);
  }

  /**
   * Add token usage to running totals
   */
  updateTokenUsage(sessionId: string, inputTokens: number, outputTokens: number): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE active_sessions
      SET tokens_input_total = tokens_input_total + ?,
          tokens_output_total = tokens_output_total + ?,
          last_heartbeat = ?
      WHERE id = ?
    `).run(inputTokens, outputTokens, now, sessionId);
  }

  /**
   * Update cost spent
   */
  updateCost(sessionId: string, costUsd: number): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare('UPDATE active_sessions SET cost_spent = ?, last_heartbeat = ? WHERE id = ?')
      .run(costUsd, now, sessionId);
  }

  /**
   * Mark a session as completed
   */
  markSessionCompleted(sessionId: string): void {
    this.updateSession(sessionId, { state: 'completed' });
  }

  /**
   * Mark a session as crashed
   */
  markSessionCrashed(sessionId: string): void {
    this.updateSession(sessionId, { state: 'crashed' });
  }

  /**
   * Mark a session as stopping (graceful shutdown requested)
   */
  markSessionStopping(sessionId: string): void {
    this.updateSession(sessionId, { state: 'stopping' });
  }

  /**
   * Delete a session (cleanup after completion)
   */
  deleteSession(sessionId: string): void {
    const db = getDb();
    db.prepare('DELETE FROM active_sessions WHERE id = ?').run(sessionId);
  }

  /**
   * Clean up stale sessions (sessions that haven't had a heartbeat in a while)
   * This is called by the health monitor
   */
  cleanupStaleSessions(maxAgeMs: number = 60000): ActiveSession[] {
    const db = getDb();
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

    // Get stale sessions before deleting
    const stale = db
      .prepare(
        `
      SELECT * FROM active_sessions
      WHERE state = 'running' AND last_heartbeat < ?
    `
      )
      .all(cutoff) as SessionRow[];

    // Mark them as crashed
    db.prepare(
      `
      UPDATE active_sessions SET state = 'crashed'
      WHERE state = 'running' AND last_heartbeat < ?
    `
    ).run(cutoff);

    return stale.map(this.rowToSession);
  }

  /**
   * Get recent sessions for a project (for history display)
   */
  getRecentSessions(projectId: string, limit: number = 10): ActiveSession[] {
    const db = getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM active_sessions
      WHERE project_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `
      )
      .all(projectId, limit) as SessionRow[];

    return rows.map(this.rowToSession);
  }

  /**
   * Increment sub-agent count for a session
   */
  updateSubAgentCount(sessionId: string, count: number = 1): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE active_sessions
      SET sub_agent_count = sub_agent_count + ?,
          last_heartbeat = ?
      WHERE id = ?
    `).run(count, now, sessionId);
  }

  /**
   * Get current sub-agent count for a session
   */
  getSubAgentCount(sessionId: string): number {
    const db = getDb();
    const row = db.prepare('SELECT sub_agent_count FROM active_sessions WHERE id = ?')
      .get(sessionId) as { sub_agent_count: number } | undefined;
    return row?.sub_agent_count ?? 0;
  }

  /**
   * Update session state (convenience method)
   */
  updateSessionState(sessionId: string, state: ActiveSession['state']): void {
    this.updateSession(sessionId, { state });
  }

  /**
   * Convert database row to ActiveSession
   */
  private rowToSession(row: SessionRow): ActiveSession {
    let metadata: Record<string, unknown> | null = null;
    if (row.metadata_json) {
      try {
        metadata = JSON.parse(row.metadata_json);
      } catch {
        metadata = null;
      }
    }

    return {
      id: row.id,
      projectId: row.project_id,
      pid: row.pid,
      mode: row.mode as LoopMode,
      startedAt: row.started_at,
      currentIteration: row.current_iteration,
      maxIterations: row.max_iterations,
      maxRuntimeSeconds: row.max_runtime_seconds,
      costLimit: row.cost_limit,
      costSpent: row.cost_spent,
      tokensInputTotal: row.tokens_input_total,
      tokensOutputTotal: row.tokens_output_total,
      state: row.state as ActiveSession['state'],
      lastHeartbeat: row.last_heartbeat,
      workScope: row.work_scope,
      completionPromise: row.completion_promise,
      consecutiveFailures: row.consecutive_failures,
      loopDetected: row.loop_detected === 1,
      backoffSeconds: row.backoff_seconds,
      metadata,
      subAgentCount: row.sub_agent_count,
    };
  }
}

// Singleton instance
let sessionRepositoryInstance: SessionRepository | null = null;

export function getSessionRepository(): SessionRepository {
  if (!sessionRepositoryInstance) {
    sessionRepositoryInstance = new SessionRepository();
  }
  return sessionRepositoryInstance;
}
