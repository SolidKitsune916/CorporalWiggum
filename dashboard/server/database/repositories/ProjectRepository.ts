/**
 * ProjectRepository - SQLite-backed CRUD operations for projects
 *
 * Replaces the file-based ProjectRegistry with SQLite storage.
 */

import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { getDb } from '../index.js';
import type { LauncherProject } from '../../../src/types/index.js';

interface ProjectRow {
  id: string;
  path: string;
  name: string;
  added_at: string;
  last_opened: string | null;
  is_ralph_ready: number;
  settings_json: string | null;
  created_at: string;
  updated_at: string;
}

export class ProjectRepository {
  /**
   * Get all registered projects
   */
  listProjects(): LauncherProject[] {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM projects ORDER BY last_opened DESC NULLS LAST, added_at DESC')
      .all() as ProjectRow[];

    return rows.map(this.rowToProject);
  }

  /**
   * Get a single project by ID
   */
  getProject(projectId: string): LauncherProject | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as
      | ProjectRow
      | undefined;

    return row ? this.rowToProject(row) : null;
  }

  /**
   * Get a project by path
   */
  getProjectByPath(projectPath: string): LauncherProject | null {
    const db = getDb();
    const normalizedPath = path.resolve(projectPath);
    const row = db.prepare('SELECT * FROM projects WHERE path = ?').get(normalizedPath) as
      | ProjectRow
      | undefined;

    return row ? this.rowToProject(row) : null;
  }

  /**
   * Add a new project
   */
  async addProject(projectPath: string): Promise<LauncherProject> {
    const db = getDb();

    // Normalize the path
    const normalizedPath = path.resolve(projectPath);

    // Check if already registered
    const existing = this.getProjectByPath(normalizedPath);
    if (existing) {
      throw new Error(`Project already registered: ${existing.name}`);
    }

    // Verify the path exists and is a directory
    try {
      const stat = await fs.stat(normalizedPath);
      if (!stat.isDirectory()) {
        throw new Error('Path is not a directory');
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('Directory does not exist');
      }
      throw err;
    }

    // Check if Ralph-ready
    const isRalphReady = await this.checkRalphReady(normalizedPath);

    // Extract project name from path
    const name = path.basename(normalizedPath);

    const project: LauncherProject = {
      id: randomUUID(),
      path: normalizedPath,
      name,
      addedAt: new Date().toISOString(),
      isRalphReady,
    };

    db.prepare(
      `
      INSERT INTO projects (id, path, name, added_at, is_ralph_ready)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(project.id, project.path, project.name, project.addedAt, project.isRalphReady ? 1 : 0);

    return project;
  }

  /**
   * Remove a project by ID
   */
  removeProject(projectId: string): void {
    const db = getDb();
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

    if (result.changes === 0) {
      throw new Error('Project not found');
    }
  }

  /**
   * Update a project's lastOpened timestamp
   */
  updateLastOpened(projectId: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      `
      UPDATE projects SET last_opened = ?, updated_at = ? WHERE id = ?
    `
    ).run(now, now, projectId);
  }

  /**
   * Re-check and update Ralph-ready status for a project
   */
  async refreshRalphStatus(projectId: string): Promise<boolean> {
    const project = this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const isReady = await this.checkRalphReady(project.path);

    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      `
      UPDATE projects SET is_ralph_ready = ?, updated_at = ? WHERE id = ?
    `
    ).run(isReady ? 1 : 0, now, projectId);

    return isReady;
  }

  /**
   * Update project settings
   */
  updateSettings(projectId: string, settings: Record<string, unknown>): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      `
      UPDATE projects SET settings_json = ?, updated_at = ? WHERE id = ?
    `
    ).run(JSON.stringify(settings), now, projectId);
  }

  /**
   * Get project settings
   */
  getSettings(projectId: string): Record<string, unknown> | null {
    const db = getDb();
    const row = db.prepare('SELECT settings_json FROM projects WHERE id = ?').get(projectId) as
      | { settings_json: string | null }
      | undefined;

    if (!row || !row.settings_json) {
      return null;
    }

    try {
      return JSON.parse(row.settings_json);
    } catch {
      return null;
    }
  }

  /**
   * Check if a project path is Ralph-ready
   * A project is Ralph-ready if it has AGENTS.md, CLAUDE.md, or IMPLEMENTATION_PLAN.md
   */
  private async checkRalphReady(projectPath: string): Promise<boolean> {
    const checks = await Promise.all([
      this.fileExists(path.join(projectPath, 'AGENTS.md')),
      this.fileExists(path.join(projectPath, 'CLAUDE.md')),
      this.fileExists(path.join(projectPath, 'IMPLEMENTATION_PLAN.md')),
    ]);

    return checks.some(exists => exists);
  }

  /**
   * Helper to check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert a database row to a LauncherProject
   */
  private rowToProject(row: ProjectRow): LauncherProject {
    return {
      id: row.id,
      path: row.path,
      name: row.name,
      addedAt: row.added_at,
      lastOpened: row.last_opened ?? undefined,
      isRalphReady: row.is_ralph_ready === 1,
    };
  }
}

// Singleton instance for convenience
let projectRepositoryInstance: ProjectRepository | null = null;

export function getProjectRepository(): ProjectRepository {
  if (!projectRepositoryInstance) {
    projectRepositoryInstance = new ProjectRepository();
  }
  return projectRepositoryInstance;
}
