/**
 * Database access for CLI
 *
 * Re-exports database initialization and repositories from the dashboard.
 * The CLI shares the same SQLite database at ~/.ralph/ralph.db
 */
import Database from 'better-sqlite3';
/**
 * Get the database instance, creating it if necessary
 */
export declare function getDb(): Database.Database;
/**
 * Get the path to the database file
 */
export declare function getDatabasePath(): string;
/**
 * Get the path to the ralph directory
 */
export declare function getRalphDir(): string;
/**
 * Close the database connection
 */
export declare function closeDb(): void;
//# sourceMappingURL=database.d.ts.map