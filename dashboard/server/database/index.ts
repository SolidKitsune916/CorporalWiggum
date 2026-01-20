/**
 * Database singleton for Corporal WIGGUM, R.A.L.P.H.
 *
 * Uses better-sqlite3 for synchronous, fast local SQLite operations.
 * Database file is stored at ~/.ralph/ralph.db
 */

import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { logger } from '../lib/logger.js';

const RALPH_DIR = path.join(os.homedir(), '.ralph');
const DB_FILE = path.join(RALPH_DIR, 'ralph.db');

export class RalphDatabase {
  private static instance: Database.Database | null = null;
  private static currentVersion = 2;

  /**
   * Get the database instance, creating it if necessary
   */
  static getInstance(): Database.Database {
    if (!this.instance) {
      // Ensure directory exists
      fs.mkdirSync(RALPH_DIR, { recursive: true });

      this.instance = new Database(DB_FILE);

      // Enable WAL mode for better concurrency
      this.instance.pragma('journal_mode = WAL');

      // Enable foreign keys
      this.instance.pragma('foreign_keys = ON');

      // Run migrations
      this.runMigrations();
    }
    return this.instance;
  }

  /**
   * Get the path to the database file
   */
  static getDatabasePath(): string {
    return DB_FILE;
  }

  /**
   * Get the path to the ralph directory
   */
  static getRalphDir(): string {
    return RALPH_DIR;
  }

  /**
   * Run database migrations
   */
  private static runMigrations(): void {
    const db = this.instance!;

    // Create schema_version table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        description TEXT
      )
    `);

    // Get current version
    const row = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number | null };
    const currentVersion = row?.version || 0;

    // Run migrations
    if (currentVersion < 1) {
      this.migration001(db);
    }

    if (currentVersion < 2) {
      this.migration002(db);
    }
  }

  /**
   * Migration 001: Initial schema
   */
  private static migration001(db: Database.Database): void {
    db.exec(`
      -- Projects table (migrated from projects.json)
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        added_at TEXT NOT NULL,
        last_opened TEXT,
        is_ralph_ready INTEGER DEFAULT 0,
        settings_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Execution history table
      CREATE TABLE IF NOT EXISTS execution_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        iteration INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_ms INTEGER,
        success INTEGER,
        exit_reason TEXT,
        tokens_input INTEGER,
        tokens_output INTEGER,
        cost_usd REAL,
        trigger_reason TEXT,
        output_preview TEXT,
        error_message TEXT,
        validation_results_json TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- Active sessions table (for browser refresh resilience)
      CREATE TABLE IF NOT EXISTS active_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        pid INTEGER NOT NULL,
        mode TEXT NOT NULL,
        started_at TEXT NOT NULL,
        current_iteration INTEGER DEFAULT 0,
        max_iterations INTEGER,
        max_runtime_seconds INTEGER,
        cost_limit REAL,
        cost_spent REAL DEFAULT 0,
        tokens_input_total INTEGER DEFAULT 0,
        tokens_output_total INTEGER DEFAULT 0,
        state TEXT DEFAULT 'running',
        last_heartbeat TEXT NOT NULL,
        work_scope TEXT,
        completion_promise TEXT DEFAULT 'ALL_TASKS_COMPLETE',
        consecutive_failures INTEGER DEFAULT 0,
        loop_detected INTEGER DEFAULT 0,
        backoff_seconds INTEGER DEFAULT 0,
        metadata_json TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- User preferences table
      CREATE TABLE IF NOT EXISTS user_preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Iteration telemetry (detailed per-iteration data)
      CREATE TABLE IF NOT EXISTS iteration_telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        iteration INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_ms INTEGER,
        success INTEGER,
        trigger_reason TEXT,
        tokens_input INTEGER,
        tokens_output INTEGER,
        cost_usd REAL,
        tools_used_json TEXT,
        output_preview TEXT,
        error_message TEXT,
        validation_results_json TEXT,
        FOREIGN KEY (session_id) REFERENCES active_sessions(id) ON DELETE CASCADE
      );

      -- Create indices for performance
      CREATE INDEX IF NOT EXISTS idx_execution_history_project ON execution_history(project_id);
      CREATE INDEX IF NOT EXISTS idx_execution_history_session ON execution_history(session_id);
      CREATE INDEX IF NOT EXISTS idx_execution_history_started_at ON execution_history(started_at);
      CREATE INDEX IF NOT EXISTS idx_active_sessions_project ON active_sessions(project_id);
      CREATE INDEX IF NOT EXISTS idx_active_sessions_state ON active_sessions(state);
      CREATE INDEX IF NOT EXISTS idx_iteration_telemetry_session ON iteration_telemetry(session_id);

      -- Record migration
      INSERT INTO schema_version (version, description) VALUES (1, 'Initial schema');
    `);

    logger.info('Applied migration 001: Initial schema');
  }

  /**
   * Migration 002: Add sub-agent tracking
   */
  private static migration002(db: Database.Database): void {
    db.exec(`
      -- Add sub_agent_count to active_sessions
      ALTER TABLE active_sessions ADD COLUMN sub_agent_count INTEGER DEFAULT 0;

      -- Record migration
      INSERT INTO schema_version (version, description) VALUES (2, 'Add sub-agent tracking');
    `);

    logger.info('Applied migration 002: Add sub-agent tracking');
  }

  /**
   * Close the database connection
   */
  static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }

  /**
   * Check if the database is initialized
   */
  static isInitialized(): boolean {
    return this.instance !== null;
  }

  /**
   * Get database statistics
   */
  static getStats(): { size: number; tables: string[] } {
    const stats = fs.statSync(DB_FILE);
    const db = this.getInstance();

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];

    return {
      size: stats.size,
      tables: tables.map(t => t.name),
    };
  }
}

// Export a convenience function for getting the database
export function getDb(): Database.Database {
  return RalphDatabase.getInstance();
}
