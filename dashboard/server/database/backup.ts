/**
 * Database Backup Service
 *
 * Provides backup and restore functionality for the SQLite database.
 * Supports automatic daily backups and manual backup/restore operations.
 */

import path from 'path';
import fs from 'fs';
import { RalphDatabase } from './index.js';
import { logger } from '../lib/logger.js';

const BACKUP_DIR = path.join(RalphDatabase.getRalphDir(), 'backups');
const MAX_BACKUPS = 7; // Keep last 7 days by default

export interface BackupInfo {
  filename: string;
  path: string;
  createdAt: Date;
  size: number;
}

export class DatabaseBackup {
  private static lastBackupDate: string | null = null;

  /**
   * Create a backup of the database
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future use (backup metadata)
  static async createBackup(_description?: string): Promise<BackupInfo> {
    // Ensure backup directory exists
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ralph-backup-${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, filename);

    const db = RalphDatabase.getInstance();

    // Use SQLite backup API (returns a Promise)
    await db.backup(backupPath);

    // Record backup in the database
    const now = new Date().toISOString();
    this.lastBackupDate = now.split('T')[0];

    logger.info('Created backup', { filename });

    // Clean old backups
    this.cleanOldBackups();

    const stats = fs.statSync(backupPath);
    return {
      filename,
      path: backupPath,
      createdAt: new Date(),
      size: stats.size,
    };
  }

  /**
   * Restore from a backup file
   */
  static restoreFromBackup(backupPath: string): void {
    // Verify backup exists
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    const mainDbPath = RalphDatabase.getDatabasePath();

    // Close current connection
    RalphDatabase.close();

    // Create a pre-restore backup just in case
    const preRestoreBackup = `${mainDbPath}.pre-restore`;
    if (fs.existsSync(mainDbPath)) {
      fs.copyFileSync(mainDbPath, preRestoreBackup);
    }

    try {
      // Copy backup to main location
      fs.copyFileSync(backupPath, mainDbPath);

      // Also copy WAL and SHM files if they exist
      const walPath = `${backupPath}-wal`;
      const shmPath = `${backupPath}-shm`;
      if (fs.existsSync(walPath)) {
        fs.copyFileSync(walPath, `${mainDbPath}-wal`);
      }
      if (fs.existsSync(shmPath)) {
        fs.copyFileSync(shmPath, `${mainDbPath}-shm`);
      }

      // Reconnect to verify
      RalphDatabase.getInstance();

      logger.info('Restored from backup', { backupPath });

      // Remove pre-restore backup on success
      if (fs.existsSync(preRestoreBackup)) {
        fs.unlinkSync(preRestoreBackup);
      }
    } catch (error) {
      // Restore failed - try to recover from pre-restore backup
      if (fs.existsSync(preRestoreBackup)) {
        fs.copyFileSync(preRestoreBackup, mainDbPath);
        fs.unlinkSync(preRestoreBackup);
        RalphDatabase.getInstance();
      }
      throw error;
    }
  }

  /**
   * List available backups
   */
  static listBackups(): BackupInfo[] {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }

    const files = fs.readdirSync(BACKUP_DIR);
    const backups: BackupInfo[] = [];

    for (const file of files) {
      if (file.startsWith('ralph-backup-') && file.endsWith('.db')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        backups.push({
          filename: file,
          path: filePath,
          createdAt: stats.mtime,
          size: stats.size,
        });
      }
    }

    // Sort by date, newest first
    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return backups;
  }

  /**
   * Delete a backup file
   */
  static deleteBackup(backupPath: string): boolean {
    if (!fs.existsSync(backupPath)) {
      return false;
    }

    // Don't allow deleting non-backup files
    if (!backupPath.includes(BACKUP_DIR)) {
      throw new Error('Can only delete files in backup directory');
    }

    fs.unlinkSync(backupPath);
    return true;
  }

  /**
   * Clean old backups, keeping only the most recent MAX_BACKUPS
   */
  static cleanOldBackups(maxBackups: number = MAX_BACKUPS): number {
    const backups = this.listBackups();

    if (backups.length <= maxBackups) {
      return 0;
    }

    // Delete oldest backups
    const toDelete = backups.slice(maxBackups);
    let deleted = 0;

    for (const backup of toDelete) {
      try {
        fs.unlinkSync(backup.path);
        deleted++;
        logger.info('Deleted old backup', { filename: backup.filename });
      } catch (error) {
        logger.error('Failed to delete backup', { filename: backup.filename, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return deleted;
  }

  /**
   * Perform automatic daily backup if one hasn't been done today
   */
  static async performDailyBackupIfNeeded(): Promise<BackupInfo | null> {
    const today = new Date().toISOString().split('T')[0];

    if (this.lastBackupDate === today) {
      return null; // Already backed up today
    }

    // Check if we have a backup from today
    const backups = this.listBackups();
    const todayBackup = backups.find(b => {
      return b.createdAt.toISOString().split('T')[0] === today;
    });

    if (todayBackup) {
      this.lastBackupDate = today;
      return null; // Already have today's backup
    }

    // Create daily backup
    return this.createBackup('Automatic daily backup');
  }

  /**
   * Get backup directory path
   */
  static getBackupDir(): string {
    return BACKUP_DIR;
  }

  /**
   * Get total backup size
   */
  static getTotalBackupSize(): number {
    const backups = this.listBackups();
    return backups.reduce((total, b) => total + b.size, 0);
  }
}
