/**
 * PreferencesRepository - User preferences storage
 *
 * Stores user preferences as key-value pairs with JSON support.
 */

import { getDb } from '../index.js';

interface PreferenceRow {
  key: string;
  value: string;
  updated_at: string;
}

export class PreferencesRepository {
  /**
   * Get a preference value
   */
  get<T = string>(key: string): T | null {
    const db = getDb();
    const row = db.prepare('SELECT value FROM user_preferences WHERE key = ?').get(key) as
      | { value: string }
      | undefined;

    if (!row) {
      return null;
    }

    // Try to parse as JSON, fall back to raw string
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return row.value as T;
    }
  }

  /**
   * Set a preference value
   */
  set<T>(key: string, value: T): void {
    const db = getDb();
    const now = new Date().toISOString();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    db.prepare(
      `
      INSERT INTO user_preferences (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
    `
    ).run(key, serialized, now, serialized, now);
  }

  /**
   * Delete a preference
   */
  delete(key: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM user_preferences WHERE key = ?').run(key);
    return result.changes > 0;
  }

  /**
   * Get all preferences
   */
  getAll(): Record<string, unknown> {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM user_preferences').all() as PreferenceRow[];

    const prefs: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        prefs[row.key] = JSON.parse(row.value);
      } catch {
        prefs[row.key] = row.value;
      }
    }

    return prefs;
  }

  /**
   * Get preferences by prefix
   */
  getByPrefix(prefix: string): Record<string, unknown> {
    const db = getDb();
    const rows = db
      .prepare('SELECT key, value FROM user_preferences WHERE key LIKE ?')
      .all(`${prefix}%`) as PreferenceRow[];

    const prefs: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        prefs[row.key] = JSON.parse(row.value);
      } catch {
        prefs[row.key] = row.value;
      }
    }

    return prefs;
  }

  /**
   * Check if a preference exists
   */
  has(key: string): boolean {
    const db = getDb();
    const row = db.prepare('SELECT 1 FROM user_preferences WHERE key = ?').get(key);
    return row !== undefined;
  }

  /**
   * Get preference with default value
   */
  getOrDefault<T>(key: string, defaultValue: T): T {
    const value = this.get<T>(key);
    return value !== null ? value : defaultValue;
  }

  /**
   * Bulk set preferences
   */
  setMany(preferences: Record<string, unknown>): void {
    const db = getDb();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO user_preferences (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
    `);

    const transaction = db.transaction((prefs: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(prefs)) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        stmt.run(key, serialized, now, serialized, now);
      }
    });

    transaction(preferences);
  }

  /**
   * Clear all preferences
   */
  clearAll(): number {
    const db = getDb();
    const result = db.prepare('DELETE FROM user_preferences').run();
    return result.changes;
  }
}

// Singleton instance
let preferencesRepositoryInstance: PreferencesRepository | null = null;

export function getPreferencesRepository(): PreferencesRepository {
  if (!preferencesRepositoryInstance) {
    preferencesRepositoryInstance = new PreferencesRepository();
  }
  return preferencesRepositoryInstance;
}

// Common preference keys
export const PreferenceKeys = {
  THEME: 'ui.theme',
  SIDEBAR_COLLAPSED: 'ui.sidebar.collapsed',
  LAST_PROJECT_ID: 'app.lastProjectId',
  NOTIFICATION_SLACK_ENABLED: 'notifications.slack.enabled',
  NOTIFICATION_DISCORD_ENABLED: 'notifications.discord.enabled',
  BACKUP_AUTO_ENABLED: 'backup.auto.enabled',
  BACKUP_RETENTION_DAYS: 'backup.retention.days',
} as const;
