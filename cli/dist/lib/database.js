/**
 * Database access for CLI
 *
 * Re-exports database initialization and repositories from the dashboard.
 * The CLI shares the same SQLite database at ~/.ralph/ralph.db
 */
import path from 'path';
import os from 'os';
import fs from 'fs';
import Database from 'better-sqlite3';
// Constants matching dashboard/server/database/index.ts
const RALPH_DIR = path.join(os.homedir(), '.ralph');
const DB_FILE = path.join(RALPH_DIR, 'ralph.db');
// Singleton instance
let dbInstance = null;
/**
 * Get the database instance, creating it if necessary
 */
export function getDb() {
    if (!dbInstance) {
        // Ensure directory exists
        fs.mkdirSync(RALPH_DIR, { recursive: true });
        dbInstance = new Database(DB_FILE);
        // Enable WAL mode for better concurrency
        dbInstance.pragma('journal_mode = WAL');
        // Enable foreign keys
        dbInstance.pragma('foreign_keys = ON');
    }
    return dbInstance;
}
/**
 * Get the path to the database file
 */
export function getDatabasePath() {
    return DB_FILE;
}
/**
 * Get the path to the ralph directory
 */
export function getRalphDir() {
    return RALPH_DIR;
}
/**
 * Close the database connection
 */
export function closeDb() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
//# sourceMappingURL=database.js.map