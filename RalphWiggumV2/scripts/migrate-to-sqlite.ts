#!/usr/bin/env npx tsx
/**
 * Migration Script: JSON to SQLite
 *
 * This script migrates existing project data from ~/.ralph/projects.json
 * to the new SQLite database at ~/.ralph/ralph.db.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-sqlite.ts
 *
 * The script is safe to run multiple times - it will skip projects that
 * already exist in the database.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';

// Import the database module
const dashboardServerPath = path.join(import.meta.dirname, '../dashboard/server');

async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 JSON to SQLite Migration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const RALPH_DIR = path.join(os.homedir(), '.ralph');
  const PROJECTS_FILE = path.join(RALPH_DIR, 'projects.json');

  // Check if JSON file exists
  if (!fs.existsSync(PROJECTS_FILE)) {
    console.log('✓ No projects.json found - nothing to migrate');
    console.log('  This is normal for new installations.');
    console.log('');
    return;
  }

  // Import database modules dynamically
  const { RalphDatabase } = await import(path.join(dashboardServerPath, 'database/index.js'));
  const { getProjectRepository } = await import(
    path.join(dashboardServerPath, 'database/repositories/ProjectRepository.js')
  );

  // Initialize database (this creates tables if needed)
  console.log('Initializing SQLite database...');
  RalphDatabase.getInstance();
  console.log(`  Database: ${RalphDatabase.getDatabasePath()}`);
  console.log('');

  // Read JSON file
  console.log('Reading projects.json...');
  const jsonData = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  const projects = jsonData.projects || [];
  console.log(`  Found ${projects.length} projects`);
  console.log('');

  if (projects.length === 0) {
    console.log('✓ No projects to migrate');
    return;
  }

  // Migrate projects
  const repo = getProjectRepository();
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  console.log('Migrating projects...');
  for (const project of projects) {
    try {
      // Check if already exists in database
      const existing = repo.getProjectByPath(project.path);
      if (existing) {
        console.log(`  ⊘ Skipped (already exists): ${project.name}`);
        skipped++;
        continue;
      }

      // Insert directly into database (not through addProject which validates path)
      const db = RalphDatabase.getInstance();
      db.prepare(
        `
        INSERT INTO projects (id, path, name, added_at, last_opened, is_ralph_ready)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run(
        project.id,
        project.path,
        project.name,
        project.addedAt,
        project.lastOpened || null,
        project.isRalphReady ? 1 : 0
      );

      console.log(`  ✓ Migrated: ${project.name}`);
      migrated++;
    } catch (err) {
      console.log(`  ✗ Error migrating ${project.name}: ${(err as Error).message}`);
      errors++;
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Migration Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
  console.log('');

  if (migrated > 0 && errors === 0) {
    // Rename old file as backup
    const backupPath = `${PROJECTS_FILE}.backup.${Date.now()}`;
    fs.renameSync(PROJECTS_FILE, backupPath);
    console.log(`✓ Original file backed up to:`);
    console.log(`  ${backupPath}`);
    console.log('');
    console.log('✓ Migration complete!');
  } else if (errors > 0) {
    console.log('⚠ Migration completed with errors.');
    console.log('  Original file was NOT removed.');
    console.log('  Please fix errors and run again.');
  } else {
    console.log('✓ Nothing new to migrate.');
  }

  console.log('');

  // Close database
  RalphDatabase.close();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
