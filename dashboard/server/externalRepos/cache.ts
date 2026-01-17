/**
 * External Repository Cache System
 *
 * Uses SQLite for metadata and filesystem for content storage.
 * Cache location: ~/.ralph/repo-cache/content/{hash}/{profile}.txt
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getDb, RalphDatabase } from '../database/index.js';
import {
  RepoCacheEntry,
  RepoCacheStatus,
  FetchedFile,
  FETCH_LIMITS,
  RepoFetchStrategy,
} from './types.js';

const CACHE_DIR = path.join(RalphDatabase.getRalphDir(), 'repo-cache', 'content');

/**
 * Generate a cache ID from URL and branch
 */
export function getCacheId(url: string, branch: string): string {
  const hash = crypto.createHash('sha256').update(`${url}#${branch}`).digest('hex');
  return hash.slice(0, 8);  // First 8 chars
}

/**
 * Get the cache directory for a repo
 */
export function getCacheDir(cacheId: string): string {
  return path.join(CACHE_DIR, cacheId);
}

/**
 * Ensure the cache table exists in the database
 */
export function ensureCacheTable(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS repo_cache (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      branch TEXT NOT NULL,
      commit_sha TEXT NOT NULL,
      cached_at TEXT NOT NULL,
      last_accessed_at TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      ttl_hours INTEGER NOT NULL,
      extracted_profiles TEXT NOT NULL,
      UNIQUE(url, branch)
    );

    CREATE INDEX IF NOT EXISTS idx_repo_cache_url ON repo_cache(url);
    CREATE INDEX IF NOT EXISTS idx_repo_cache_last_accessed ON repo_cache(last_accessed_at);
  `);
}

/**
 * Get cached content for a repo
 */
export function getCachedContent(
  url: string,
  branch: string,
  profile: string
): { files: FetchedFile[]; commitSha: string } | null {
  const cacheId = getCacheId(url, branch);
  const cacheDir = getCacheDir(cacheId);
  const cachePath = path.join(cacheDir, `${profile}.json`);

  if (!fs.existsSync(cachePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(cachePath, 'utf-8');
    const data = JSON.parse(content) as { files: FetchedFile[]; commitSha: string };

    // Update last_accessed_at
    const db = getDb();
    db.prepare(`
      UPDATE repo_cache
      SET last_accessed_at = datetime('now')
      WHERE id = ?
    `).run(cacheId);

    return data;
  } catch {
    return null;
  }
}

/**
 * Store content in cache
 */
export function setCachedContent(
  url: string,
  branch: string,
  profile: string,
  files: FetchedFile[],
  commitSha: string,
  ttlHours: number = FETCH_LIMITS.DEFAULT_TTL_HOURS
): void {
  const cacheId = getCacheId(url, branch);
  const cacheDir = getCacheDir(cacheId);

  // Ensure cache directory exists
  fs.mkdirSync(cacheDir, { recursive: true });

  // Write content to filesystem
  const cachePath = path.join(cacheDir, `${profile}.json`);
  const data = { files, commitSha };
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));

  // Calculate size
  const sizeBytes = files.reduce((sum, f) => sum + f.size, 0);

  // Get existing profiles for this cache entry
  const db = getDb();
  const existing = db.prepare(`
    SELECT extracted_profiles FROM repo_cache WHERE id = ?
  `).get(cacheId) as { extracted_profiles: string } | undefined;

  const existingProfiles: string[] = existing
    ? JSON.parse(existing.extracted_profiles)
    : [];

  if (!existingProfiles.includes(profile)) {
    existingProfiles.push(profile);
  }

  // Upsert cache metadata
  db.prepare(`
    INSERT INTO repo_cache (id, url, branch, commit_sha, cached_at, last_accessed_at, size_bytes, ttl_hours, extracted_profiles)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      commit_sha = excluded.commit_sha,
      cached_at = excluded.cached_at,
      last_accessed_at = excluded.last_accessed_at,
      size_bytes = excluded.size_bytes,
      ttl_hours = excluded.ttl_hours,
      extracted_profiles = excluded.extracted_profiles
  `).run(cacheId, url, branch, commitSha, sizeBytes, ttlHours, JSON.stringify(existingProfiles));
}

/**
 * Get cache entry metadata
 */
export function getCacheEntry(url: string, branch: string): RepoCacheEntry | null {
  const cacheId = getCacheId(url, branch);
  const db = getDb();

  const row = db.prepare(`
    SELECT * FROM repo_cache WHERE id = ?
  `).get(cacheId) as {
    id: string;
    url: string;
    branch: string;
    commit_sha: string;
    cached_at: string;
    last_accessed_at: string;
    size_bytes: number;
    ttl_hours: number;
    extracted_profiles: string;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    url: row.url,
    branch: row.branch,
    commitSha: row.commit_sha,
    cachedAt: row.cached_at,
    lastAccessedAt: row.last_accessed_at,
    sizeBytes: row.size_bytes,
    ttlHours: row.ttl_hours,
    extractedProfiles: JSON.parse(row.extracted_profiles),
  };
}

/**
 * Check if cache is fresh (not expired and same commit)
 */
export function checkCacheStatus(
  url: string,
  branch: string,
  remoteCommitSha?: string
): RepoCacheStatus {
  const entry = getCacheEntry(url, branch);

  if (!entry) {
    return { cached: false, fresh: false, reason: 'not_cached' };
  }

  // Check TTL
  const cachedAt = new Date(entry.cachedAt);
  const now = new Date();
  const hoursSinceCached = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCached > entry.ttlHours) {
    return {
      cached: true,
      fresh: false,
      reason: 'ttl_expired',
      localSha: entry.commitSha,
      sizeBytes: entry.sizeBytes,
      extractedProfiles: entry.extractedProfiles,
    };
  }

  // Check commit SHA if provided
  if (remoteCommitSha && remoteCommitSha !== entry.commitSha) {
    return {
      cached: true,
      fresh: false,
      reason: 'new_commits',
      localSha: entry.commitSha,
      remoteSha: remoteCommitSha,
      sizeBytes: entry.sizeBytes,
      extractedProfiles: entry.extractedProfiles,
    };
  }

  return {
    cached: true,
    fresh: true,
    reason: 'fresh',
    localSha: entry.commitSha,
    sizeBytes: entry.sizeBytes,
    extractedProfiles: entry.extractedProfiles,
  };
}

/**
 * Clear cache for a specific repo
 */
export function clearRepoCache(url: string, branch: string): void {
  const cacheId = getCacheId(url, branch);
  const cacheDir = getCacheDir(cacheId);

  // Remove files
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true });
  }

  // Remove metadata
  const db = getDb();
  db.prepare('DELETE FROM repo_cache WHERE id = ?').run(cacheId);
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  // Remove all cached files
  if (fs.existsSync(CACHE_DIR)) {
    fs.rmSync(CACHE_DIR, { recursive: true });
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  // Clear metadata
  const db = getDb();
  db.prepare('DELETE FROM repo_cache').run();
}

/**
 * Get total cache size
 */
export function getTotalCacheSize(): number {
  const db = getDb();
  const row = db.prepare(`
    SELECT COALESCE(SUM(size_bytes), 0) as total FROM repo_cache
  `).get() as { total: number };

  return row.total;
}

/**
 * Perform LRU cleanup when cache exceeds max size
 */
export function performLruCleanup(): number {
  const totalSize = getTotalCacheSize();

  if (totalSize <= FETCH_LIMITS.MAX_CACHE_SIZE) {
    return 0;
  }

  const db = getDb();
  let freedBytes = 0;

  // Get entries ordered by last_accessed_at (oldest first)
  const entries = db.prepare(`
    SELECT id, url, branch, size_bytes FROM repo_cache
    ORDER BY last_accessed_at ASC
  `).all() as Array<{ id: string; url: string; branch: string; size_bytes: number }>;

  let currentSize = totalSize;
  const targetSize = FETCH_LIMITS.MAX_CACHE_SIZE * 0.8;  // Free up to 80%

  for (const entry of entries) {
    if (currentSize <= targetSize) break;

    // Clear this entry
    const cacheDir = getCacheDir(entry.id);
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true });
    }
    db.prepare('DELETE FROM repo_cache WHERE id = ?').run(entry.id);

    freedBytes += entry.size_bytes;
    currentSize -= entry.size_bytes;
  }

  return freedBytes;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalEntries: number;
  totalSize: number;
  oldestEntry: string | null;
  newestEntry: string | null;
} {
  const db = getDb();

  const countRow = db.prepare('SELECT COUNT(*) as count FROM repo_cache').get() as { count: number };
  const sizeRow = db.prepare('SELECT COALESCE(SUM(size_bytes), 0) as total FROM repo_cache').get() as { total: number };
  const oldestRow = db.prepare('SELECT url FROM repo_cache ORDER BY cached_at ASC LIMIT 1').get() as { url: string } | undefined;
  const newestRow = db.prepare('SELECT url FROM repo_cache ORDER BY cached_at DESC LIMIT 1').get() as { url: string } | undefined;

  return {
    totalEntries: countRow.count,
    totalSize: sizeRow.total,
    oldestEntry: oldestRow?.url || null,
    newestEntry: newestRow?.url || null,
  };
}

/**
 * Get the profile name for a fetch strategy
 */
export function getProfileForStrategy(strategy: RepoFetchStrategy): string {
  switch (strategy) {
    case 'readme-only':
    case 'mcp-only':
      return 'readme-only';
    case 'docs-folder':
      return 'docs-folder';
    case 'typescript-lib':
      return 'typescript-lib';
    case 'python-lib':
      return 'python-lib';
    case 'full-clone':
      return 'full-clone';
    case 'hybrid':
    case 'auto':
    case 'specified':
    default:
      return 'auto';
  }
}

// Initialize cache table on module load
ensureCacheTable();
