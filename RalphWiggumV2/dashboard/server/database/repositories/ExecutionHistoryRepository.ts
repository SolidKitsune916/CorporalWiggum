/**
 * ExecutionHistoryRepository - Tracks completed loop executions and iteration telemetry
 *
 * Provides historical data for:
 * - Viewing past loop executions
 * - Analyzing execution patterns
 * - Debugging failed runs
 */

import { getDb } from '../index.js';
import type { LoopMode } from '../../../src/types/index.js';

export interface ExecutionHistoryEntry {
  id: number;
  projectId: string;
  sessionId: string;
  mode: LoopMode;
  iteration: number;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  success: boolean | null;
  exitReason: string | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  costUsd: number | null;
  triggerReason: string | null;
  outputPreview: string | null;
  errorMessage: string | null;
  validationResults: unknown[] | null;
}

export interface IterationTelemetry {
  id: number;
  sessionId: string;
  iteration: number;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  success: boolean | null;
  triggerReason: string | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  costUsd: number | null;
  toolsUsed: string[] | null;
  outputPreview: string | null;
  errorMessage: string | null;
  validationResults: unknown[] | null;
}

interface HistoryRow {
  id: number;
  project_id: string;
  session_id: string;
  mode: string;
  iteration: number;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  success: number | null;
  exit_reason: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  trigger_reason: string | null;
  output_preview: string | null;
  error_message: string | null;
  validation_results_json: string | null;
}

interface TelemetryRow {
  id: number;
  session_id: string;
  iteration: number;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  success: number | null;
  trigger_reason: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  tools_used_json: string | null;
  output_preview: string | null;
  error_message: string | null;
  validation_results_json: string | null;
}

export interface CreateHistoryInput {
  projectId: string;
  sessionId: string;
  mode: LoopMode;
  iteration: number;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  success?: boolean;
  exitReason?: string;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
  triggerReason?: string;
  outputPreview?: string;
  errorMessage?: string;
  validationResults?: unknown[];
}

export interface CreateTelemetryInput {
  sessionId: string;
  iteration: number;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  success?: boolean;
  triggerReason?: string;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
  toolsUsed?: string[];
  outputPreview?: string;
  errorMessage?: string;
  validationResults?: unknown[];
}

export class ExecutionHistoryRepository {
  /**
   * Record a completed execution
   */
  recordExecution(input: CreateHistoryInput): number {
    const db = getDb();

    const result = db
      .prepare(
        `
      INSERT INTO execution_history (
        project_id, session_id, mode, iteration, started_at, ended_at,
        duration_ms, success, exit_reason, tokens_input, tokens_output,
        cost_usd, trigger_reason, output_preview, error_message, validation_results_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        input.projectId,
        input.sessionId,
        input.mode,
        input.iteration,
        input.startedAt,
        input.endedAt ?? null,
        input.durationMs ?? null,
        input.success !== undefined ? (input.success ? 1 : 0) : null,
        input.exitReason ?? null,
        input.tokensInput ?? null,
        input.tokensOutput ?? null,
        input.costUsd ?? null,
        input.triggerReason ?? null,
        input.outputPreview ?? null,
        input.errorMessage ?? null,
        input.validationResults ? JSON.stringify(input.validationResults) : null
      );

    return result.lastInsertRowid as number;
  }

  /**
   * Record iteration telemetry
   */
  recordIteration(input: CreateTelemetryInput): number {
    const db = getDb();

    const result = db
      .prepare(
        `
      INSERT INTO iteration_telemetry (
        session_id, iteration, started_at, ended_at, duration_ms, success,
        trigger_reason, tokens_input, tokens_output, cost_usd, tools_used_json,
        output_preview, error_message, validation_results_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        input.sessionId,
        input.iteration,
        input.startedAt,
        input.endedAt ?? null,
        input.durationMs ?? null,
        input.success !== undefined ? (input.success ? 1 : 0) : null,
        input.triggerReason ?? null,
        input.tokensInput ?? null,
        input.tokensOutput ?? null,
        input.costUsd ?? null,
        input.toolsUsed ? JSON.stringify(input.toolsUsed) : null,
        input.outputPreview ?? null,
        input.errorMessage ?? null,
        input.validationResults ? JSON.stringify(input.validationResults) : null
      );

    return result.lastInsertRowid as number;
  }

  /**
   * Get execution history for a project
   */
  getProjectHistory(projectId: string, limit: number = 50): ExecutionHistoryEntry[] {
    const db = getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM execution_history
      WHERE project_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `
      )
      .all(projectId, limit) as HistoryRow[];

    return rows.map(this.rowToHistory);
  }

  /**
   * Get execution history by session
   */
  getSessionHistory(sessionId: string): ExecutionHistoryEntry[] {
    const db = getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM execution_history
      WHERE session_id = ?
      ORDER BY iteration ASC
    `
      )
      .all(sessionId) as HistoryRow[];

    return rows.map(this.rowToHistory);
  }

  /**
   * Get iteration telemetry for a session
   */
  getSessionTelemetry(sessionId: string): IterationTelemetry[] {
    const db = getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM iteration_telemetry
      WHERE session_id = ?
      ORDER BY iteration ASC
    `
      )
      .all(sessionId) as TelemetryRow[];

    return rows.map(this.rowToTelemetry);
  }

  /**
   * Get aggregate statistics for a project
   */
  getProjectStats(
    projectId: string
  ): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    totalIterations: number;
    totalCostUsd: number;
    avgDurationMs: number;
  } {
    const db = getDb();
    const row = db
      .prepare(
        `
      SELECT
        COUNT(*) as total_executions,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_executions,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_executions,
        SUM(iteration) as total_iterations,
        SUM(COALESCE(cost_usd, 0)) as total_cost_usd,
        AVG(duration_ms) as avg_duration_ms
      FROM execution_history
      WHERE project_id = ?
    `
      )
      .get(projectId) as {
      total_executions: number;
      successful_executions: number;
      failed_executions: number;
      total_iterations: number;
      total_cost_usd: number;
      avg_duration_ms: number;
    };

    return {
      totalExecutions: row.total_executions || 0,
      successfulExecutions: row.successful_executions || 0,
      failedExecutions: row.failed_executions || 0,
      totalIterations: row.total_iterations || 0,
      totalCostUsd: row.total_cost_usd || 0,
      avgDurationMs: row.avg_duration_ms || 0,
    };
  }

  /**
   * Get recent executions across all projects
   */
  getRecentExecutions(limit: number = 20): ExecutionHistoryEntry[] {
    const db = getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM execution_history
      ORDER BY started_at DESC
      LIMIT ?
    `
      )
      .all(limit) as HistoryRow[];

    return rows.map(this.rowToHistory);
  }

  /**
   * Clean up old history entries
   */
  cleanupOldHistory(maxAgeDays: number = 30): number {
    const db = getDb();
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();

    const result = db
      .prepare(
        `
      DELETE FROM execution_history WHERE started_at < ?
    `
      )
      .run(cutoff);

    return result.changes;
  }

  /**
   * Convert history row to entry
   */
  private rowToHistory(row: HistoryRow): ExecutionHistoryEntry {
    let validationResults: unknown[] | null = null;
    if (row.validation_results_json) {
      try {
        validationResults = JSON.parse(row.validation_results_json);
      } catch {
        validationResults = null;
      }
    }

    return {
      id: row.id,
      projectId: row.project_id,
      sessionId: row.session_id,
      mode: row.mode as LoopMode,
      iteration: row.iteration,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationMs: row.duration_ms,
      success: row.success !== null ? row.success === 1 : null,
      exitReason: row.exit_reason,
      tokensInput: row.tokens_input,
      tokensOutput: row.tokens_output,
      costUsd: row.cost_usd,
      triggerReason: row.trigger_reason,
      outputPreview: row.output_preview,
      errorMessage: row.error_message,
      validationResults,
    };
  }

  /**
   * Convert telemetry row to entry
   */
  private rowToTelemetry(row: TelemetryRow): IterationTelemetry {
    let toolsUsed: string[] | null = null;
    if (row.tools_used_json) {
      try {
        toolsUsed = JSON.parse(row.tools_used_json);
      } catch {
        toolsUsed = null;
      }
    }

    let validationResults: unknown[] | null = null;
    if (row.validation_results_json) {
      try {
        validationResults = JSON.parse(row.validation_results_json);
      } catch {
        validationResults = null;
      }
    }

    return {
      id: row.id,
      sessionId: row.session_id,
      iteration: row.iteration,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationMs: row.duration_ms,
      success: row.success !== null ? row.success === 1 : null,
      triggerReason: row.trigger_reason,
      tokensInput: row.tokens_input,
      tokensOutput: row.tokens_output,
      costUsd: row.cost_usd,
      toolsUsed,
      outputPreview: row.output_preview,
      errorMessage: row.error_message,
      validationResults,
    };
  }
}

// Singleton instance
let executionHistoryRepositoryInstance: ExecutionHistoryRepository | null = null;

export function getExecutionHistoryRepository(): ExecutionHistoryRepository {
  if (!executionHistoryRepositoryInstance) {
    executionHistoryRepositoryInstance = new ExecutionHistoryRepository();
  }
  return executionHistoryRepositoryInstance;
}
