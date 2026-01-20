/**
 * List command - Show all registered projects
 *
 * Reads from the projects table in SQLite and shows running status
 * by checking against active sessions.
 */

import { Command } from 'commander';
import { getDb } from '../lib/database.js';
import { colors, tableHeader, tableRow, emptyState } from '../lib/output.js';
import { truncatePath } from '../lib/format.js';

/**
 * Project row from database
 */
interface ProjectRow {
  id: string;
  path: string;
  name: string;
  added_at: string;
  last_opened: string | null;
  is_ralph_ready: number;
}

/**
 * Session row from database (for checking running status)
 */
interface SessionRow {
  project_id: string;
}

/**
 * Get all registered projects
 */
function listProjects(): ProjectRow[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT id, path, name, added_at, last_opened, is_ralph_ready FROM projects ORDER BY last_opened DESC NULLS LAST, added_at DESC')
    .all() as ProjectRow[];
  return rows;
}

/**
 * Get project IDs with active sessions
 */
function getRunningProjectIds(): Set<string> {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT DISTINCT project_id
      FROM active_sessions
      WHERE state IN ('running', 'paused')
    `
    )
    .all() as SessionRow[];
  return new Set(rows.map((r) => r.project_id));
}

export const listCommand = new Command('list')
  .description('Show all registered projects')
  .action(async () => {
    try {
      const projects = listProjects();
      const runningIds = getRunningProjectIds();

      if (projects.length === 0) {
        emptyState(
          'No projects registered',
          'Add projects via the dashboard or with ralph add <path>'
        );
        return;
      }

      // Print table
      console.log(colors.bold('Registered Projects:'));
      console.log();

      tableHeader(
        { text: 'NAME', width: 25 },
        { text: 'PATH', width: 40 },
        { text: 'STATUS', width: 10 }
      );

      for (const project of projects) {
        const isRunning = runningIds.has(project.id);
        const statusText = isRunning ? 'running' : '-';
        const statusColor = isRunning ? colors.running : colors.dim;

        tableRow(
          { text: project.name, width: 25 },
          { text: truncatePath(project.path, 39), width: 40 },
          { text: statusText, width: 10, color: statusColor }
        );
      }

      // Summary
      const runningCount = runningIds.size;
      console.log();
      console.log(
        colors.dim(
          `${projects.length} project${projects.length !== 1 ? 's' : ''} registered${
            runningCount > 0 ? `, ${runningCount} running` : ''
          }`
        )
      );
    } catch (err) {
      console.error(colors.error(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });
