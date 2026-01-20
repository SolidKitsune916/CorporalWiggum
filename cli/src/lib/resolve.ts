/**
 * Project resolution utilities for CLI
 *
 * Resolves project identifiers (name, path, or UUID) to LauncherProject objects.
 * Used by start, stop, attach, logs commands.
 */

import path from 'path';
import chalk from 'chalk';
import { getDb } from './database.js';

/**
 * LauncherProject interface (matches dashboard/src/types/index.ts)
 */
export interface LauncherProject {
  id: string;
  path: string;
  name: string;
  addedAt: string;
  lastOpened?: string;
  isRalphReady: boolean;
}

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
 * Convert a database row to a LauncherProject
 */
function rowToProject(row: ProjectRow): LauncherProject {
  return {
    id: row.id,
    path: row.path,
    name: row.name,
    addedAt: row.added_at,
    lastOpened: row.last_opened ?? undefined,
    isRalphReady: row.is_ralph_ready === 1,
  };
}

/**
 * Get a project by ID
 */
function getProjectById(projectId: string): LauncherProject | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as
    | ProjectRow
    | undefined;
  return row ? rowToProject(row) : null;
}

/**
 * Get a project by path
 */
function getProjectByPath(projectPath: string): LauncherProject | null {
  const db = getDb();
  const normalizedPath = path.resolve(projectPath);
  const row = db.prepare('SELECT * FROM projects WHERE path = ?').get(normalizedPath) as
    | ProjectRow
    | undefined;
  return row ? rowToProject(row) : null;
}

/**
 * Get all projects
 */
function listProjects(): LauncherProject[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM projects ORDER BY last_opened DESC NULLS LAST, added_at DESC')
    .all() as ProjectRow[];
  return rows.map(rowToProject);
}

/**
 * Resolve a project identifier to a LauncherProject
 *
 * Resolution order:
 * 1. Try getProjectById - exact ID match
 * 2. Try getProjectByPath - exact path match
 * 3. Try getProjectByPath with resolved path - resolve relative path
 * 4. List all projects and find case-insensitive name match
 *
 * @param identifier - Project name, path, or UUID
 * @returns The resolved project or null if not found
 */
export function resolveProject(identifier: string): LauncherProject | null {
  // 1. Try exact ID match
  const byId = getProjectById(identifier);
  if (byId) {
    return byId;
  }

  // 2. Try exact path match
  const byPath = getProjectByPath(identifier);
  if (byPath) {
    return byPath;
  }

  // 3. Try resolved relative path
  const resolvedPath = path.resolve(identifier);
  if (resolvedPath !== identifier) {
    const byResolvedPath = getProjectByPath(resolvedPath);
    if (byResolvedPath) {
      return byResolvedPath;
    }
  }

  // 4. Try case-insensitive name match
  const allProjects = listProjects();
  const lowerIdentifier = identifier.toLowerCase();
  const byName = allProjects.find(
    (p) => p.name.toLowerCase() === lowerIdentifier
  );
  if (byName) {
    return byName;
  }

  return null;
}

/**
 * Resolve a project identifier or exit with an error
 *
 * @param identifier - Project name, path, or UUID
 * @returns The resolved project (exits process if not found)
 */
export function resolveProjectOrExit(identifier: string): LauncherProject {
  const project = resolveProject(identifier);

  if (!project) {
    console.error(chalk.red(`Project not found: ${identifier}`));
    console.error(chalk.dim("Use 'ralph list' to see registered projects"));
    process.exit(1);
  }

  return project;
}
