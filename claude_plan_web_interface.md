Enhanced Implementation Plan: Dynamic GitHub Repo References
This combines your existing dashboard architecture with caching, MCP integration, and hybrid fetch strategies.

Architecture Overview
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Project Settings                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ External Repositories                                                │   │
│  │  ├─ stripe/stripe-node (Payments) [auto] [cached ✓]                 │   │
│  │  ├─ vercel/next.js (Framework) [readme-only] [cached ✓]             │   │
│  │  ├─ internal/sdk (Internal) [full-clone] [private]                  │   │
│  │  └─ [+ Add Repository]                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Cache Layer (SQLite + FS)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │ Metadata DB  │  │ Content FS   │  │ Prewarm Svc  │                      │
│  │ (TTL, SHA)   │  │ (extracted)  │  │ (background) │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Fetch Router                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   HTTP/gh CLI   │  │   Full Clone    │  │   MCP GitHub    │             │
│  │   (targeted)    │  │   (complete)    │  │   (on-demand)   │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PRD Generator                                       │
│  1. Load selected repos from project settings                               │
│  2. Check cache → fetch if stale                                            │
│  3. Build context with <repository> tags                                    │
│  4. Include MCP hints if strategy = 'mcp'                                   │
│  5. Send to Claude Code CLI                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

Enhanced Types
dashboard/src/types/index.ts
typescript// ============ FETCH STRATEGIES ============

/**
 * How to fetch content from a repository
 */
export type RepoFetchStrategy =
  | 'specified'      // User specifies exact file paths
  | 'readme-only'    // Just README.md
  | 'docs-folder'    // All markdown in docs/
  | 'auto'           // Auto-detect key files (README, API docs, types, package.json)
  | 'full-clone'     // Clone entire repo, extract based on profile
  | 'mcp';           // Use MCP GitHub server for on-demand queries

/**
 * Extraction profiles for full-clone strategy
 */
export type RepoExtractionProfile =
  | 'typescript_lib'  // src/**/*.ts, types/**/*.ts, README.md
  | 'python_lib'      // **/*.py, README.md, pyproject.toml
  | 'docs_only'       // README.md, docs/**/*.md, examples/**/*
  | 'full'            // Everything (with standard excludes)
  | 'custom';         // User-defined patterns

// ============ EXTERNAL REPO REFERENCE ============

/**
 * External repository reference (stored at project level)
 */
export interface ExternalRepoReference {
  id: string;                              // UUID
  url: string;                             // e.g., "https://github.com/owner/repo"
  alias: string;                           // Friendly name for display
  branch?: string;                         // Default: auto-detected (main/master)
  
  // Fetch configuration
  fetchStrategy: RepoFetchStrategy;
  paths?: string[];                        // For 'specified' strategy
  extractionProfile?: RepoExtractionProfile; // For 'full-clone' strategy
  customPatterns?: {                       // For 'custom' profile
    include: string[];
    exclude: string[];
  };
  
  // MCP hints (for 'mcp' strategy)
  mcpHints?: string[];                     // e.g., ["search for auth patterns", "find API types"]
  
  // Access configuration
  isPrivate?: boolean;                     // Requires gh CLI auth
  
  // Metadata
  addedAt: string;                         // ISO date
  purpose?: string;                        // Why this repo is referenced
  
  // Cache settings (per-repo override)
  cacheTTLHours?: number;                  // Override default TTL
  disableCache?: boolean;                  // Always fetch fresh
}

// ============ CACHE TYPES ============

/**
 * Cache status for a repository
 */
export interface RepoCacheStatus {
  isCached: boolean;
  isFresh: boolean;
  reason?: 'not_cached' | 'ttl_expired' | 'new_commits' | 'cache_disabled';
  cachedAt?: string;
  commitSha?: string;
  remoteCommitSha?: string;
  sizeBytes?: number;
  extractedProfiles?: string[];            // Which profiles are pre-extracted
}

/**
 * Cache entry metadata (stored in SQLite)
 */
export interface RepoCacheEntry {
  id: string;                              // Hash of url+branch
  url: string;
  branch: string;
  commitSha: string;
  cachedAt: string;
  lastAccessedAt: string;
  sizeBytes: number;
  ttlHours: number;
  extractedProfiles: string[];             // ['typescript_lib', 'docs_only']
}

// ============ FETCHED CONTENT ============

/**
 * Fetched content from a repository
 */
export interface FetchedRepoContent {
  repoId: string;
  repoAlias: string;
  repoUrl: string;
  
  // Content
  files: Array<{
    path: string;
    content: string;
    size: number;
    truncated: boolean;
  }>;
  
  // For MCP strategy - hints to include in prompt
  mcpInstructions?: string[];
  
  // Metadata
  fetchedAt: string;
  fromCache: boolean;
  cacheStatus?: RepoCacheStatus;
  totalSize: number;
  error?: string;
}

// ============ WEBSOCKET COMMANDS ============

export interface ExternalReposListCommand {
  type: 'external-repos:list';
}

export interface ExternalReposAddCommand {
  type: 'external-repos:add';
  payload: Omit<ExternalRepoReference, 'id' | 'addedAt'>;
}

export interface ExternalReposRemoveCommand {
  type: 'external-repos:remove';
  payload: { id: string };
}

export interface ExternalReposUpdateCommand {
  type: 'external-repos:update';
  payload: ExternalRepoReference;
}

export interface ExternalReposFetchCommand {
  type: 'external-repos:fetch';
  payload: { 
    ids: string[];
    forceRefresh?: boolean;      // Bypass cache
  };
}

export interface ExternalReposCacheStatusCommand {
  type: 'external-repos:cache-status';
  payload: { ids: string[] };
}

export interface ExternalReposCacheClearCommand {
  type: 'external-repos:cache-clear';
  payload: { ids?: string[] };   // Empty = clear all
}

export interface ExternalReposPrewarmCommand {
  type: 'external-repos:prewarm';
  payload: { ids: string[] };
}

// ============ WEBSOCKET MESSAGES ============

export interface ExternalReposListMessage extends WSMessage {
  type: 'external-repos:list';
  payload: ExternalRepoReference[];
}

export interface ExternalReposFetchedMessage extends WSMessage {
  type: 'external-repos:fetched';
  payload: FetchedRepoContent[];
}

export interface ExternalReposCacheStatusMessage extends WSMessage {
  type: 'external-repos:cache-status';
  payload: Record<string, RepoCacheStatus>;  // repoId -> status
}

export interface ExternalReposErrorMessage extends WSMessage {
  type: 'external-repos:error';
  payload: {
    repoId?: string;
    error: string;
  };
}

// Add to ClientCommand union
export type ClientCommand = 
  // ... existing commands
  | ExternalReposListCommand
  | ExternalReposAddCommand
  | ExternalReposRemoveCommand
  | ExternalReposUpdateCommand
  | ExternalReposFetchCommand
  | ExternalReposCacheStatusCommand
  | ExternalReposCacheClearCommand
  | ExternalReposPrewarmCommand;

// Add to ServerMessage union
export type ServerMessage =
  // ... existing messages
  | ExternalReposListMessage
  | ExternalReposFetchedMessage
  | ExternalReposCacheStatusMessage
  | ExternalReposErrorMessage;

New Files to Create
1. dashboard/server/externalRepos/types.ts
typescript/**
 * Internal types for the external repos system
 */

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  defaultBranch: string;
}

export interface FetchResult {
  path: string;
  content: string;
  size: number;
  truncated: boolean;
  error?: string;
}

export interface CloneResult {
  localPath: string;
  commitSha: string;
  sizeBytes: number;
}

export const EXTRACTION_PROFILES = {
  typescript_lib: {
    include: ['src/**/*.ts', 'lib/**/*.ts', 'types/**/*.ts', '**/*.d.ts', 'README.md', 'package.json'],
    exclude: ['*test*', '*spec*', '__tests__', 'node_modules', '.git', 'dist', 'build']
  },
  python_lib: {
    include: ['**/*.py', 'README.md', 'pyproject.toml', 'setup.py'],
    exclude: ['*test*', 'tests/', '.git', '__pycache__', 'venv', '.venv']
  },
  docs_only: {
    include: ['README.md', 'README.rst', 'docs/**/*.md', '*.md', 'examples/**/*', 'CHANGELOG.md'],
    exclude: ['.git']
  },
  full: {
    include: ['**/*'],
    exclude: ['node_modules', '.git', '__pycache__', '*.lock', 'package-lock.json', 
              '*.min.js', '*.map', 'dist', 'build', '.next', 'coverage', 'vendor',
              '*.png', '*.jpg', '*.gif', '*.ico', '*.woff*', '*.ttf', '*.svg']
  }
} as const;

export const FETCH_LIMITS = {
  maxFileSizeBytes: 50 * 1024,        // 50KB per file
  maxTotalSizeBytes: 500 * 1024,      // 500KB total per repo (increased for full-clone)
  maxFilesPerRepo: 100,
  defaultTTLHours: 24,
  maxTTLHours: 168,                   // 1 week
  cloneDepth: 1,                       // Shallow clone
} as const;
2. dashboard/server/externalRepos/cache.ts
typescript/**
 * Caching layer for external repository content
 * Uses SQLite for metadata + filesystem for content
 */

import { Database } from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { RepoCacheEntry, RepoCacheStatus, ExternalRepoReference } from '../../src/types';
import { FETCH_LIMITS } from './types';

export interface CacheConfig {
  cacheDir: string;
  maxCacheSizeGB: number;
  defaultTTLHours: number;
  enableFreshnessCheck: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  cacheDir: path.join(process.cwd(), '.cache', 'external-repos'),
  maxCacheSizeGB: 2,
  defaultTTLHours: FETCH_LIMITS.defaultTTLHours,
  enableFreshnessCheck: true,
};

export class RepoCache {
  private db: Database;
  private config: CacheConfig;
  private contentDir: string;

  constructor(db: Database, config: Partial<CacheConfig> = {}) {
    this.db = db;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.contentDir = path.join(this.config.cacheDir, 'content');
    
    this.initializeSchema();
    this.ensureDirectories();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS repo_cache (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        branch TEXT NOT NULL,
        commit_sha TEXT NOT NULL,
        cached_at TEXT NOT NULL,
        last_accessed_at TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        ttl_hours INTEGER NOT NULL,
        extracted_profiles TEXT NOT NULL DEFAULT '[]'
      );
      
      CREATE INDEX IF NOT EXISTS idx_repo_cache_url ON repo_cache(url, branch);
      CREATE INDEX IF NOT EXISTS idx_repo_cache_accessed ON repo_cache(last_accessed_at);
    `);
  }

  private ensureDirectories(): void {
    fs.mkdirSync(this.contentDir, { recursive: true });
  }

  /**
   * Generate cache key from URL and branch
   */
  private getCacheKey(url: string, branch: string): string {
    const key = `${url}#${branch}`;
    return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
  }

  /**
   * Get cache status for a repository
   */
  async getCacheStatus(
    repo: ExternalRepoReference,
    getRemoteSha?: () => Promise<string | null>
  ): Promise<RepoCacheStatus> {
    const cacheKey = this.getCacheKey(repo.url, repo.branch || 'main');
    
    const entry = this.db.prepare(`
      SELECT * FROM repo_cache WHERE id = ?
    `).get(cacheKey) as RepoCacheEntry | undefined;

    if (!entry) {
      return { isCached: false, isFresh: false, reason: 'not_cached' };
    }

    // Check TTL
    const ttl = repo.cacheTTLHours || entry.ttlHours;
    const cachedAt = new Date(entry.cachedAt);
    const expiresAt = new Date(cachedAt.getTime() + ttl * 60 * 60 * 1000);
    
    if (new Date() > expiresAt) {
      return {
        isCached: true,
        isFresh: false,
        reason: 'ttl_expired',
        cachedAt: entry.cachedAt,
        commitSha: entry.commitSha,
        sizeBytes: entry.sizeBytes,
        extractedProfiles: JSON.parse(entry.extractedProfiles as unknown as string),
      };
    }

    // Optionally check for new commits
    if (this.config.enableFreshnessCheck && getRemoteSha) {
      const remoteSha = await getRemoteSha();
      if (remoteSha && remoteSha !== entry.commitSha) {
        return {
          isCached: true,
          isFresh: false,
          reason: 'new_commits',
          cachedAt: entry.cachedAt,
          commitSha: entry.commitSha,
          remoteCommitSha: remoteSha,
          sizeBytes: entry.sizeBytes,
          extractedProfiles: JSON.parse(entry.extractedProfiles as unknown as string),
        };
      }
    }

    // Cache is fresh
    return {
      isCached: true,
      isFresh: true,
      cachedAt: entry.cachedAt,
      commitSha: entry.commitSha,
      sizeBytes: entry.sizeBytes,
      extractedProfiles: JSON.parse(entry.extractedProfiles as unknown as string),
    };
  }

  /**
   * Get cached content for a profile
   */
  getCachedContent(url: string, branch: string, profile: string): string | null {
    const cacheKey = this.getCacheKey(url, branch);
    const contentPath = path.join(this.contentDir, cacheKey, `${profile}.txt`);
    
    if (fs.existsSync(contentPath)) {
      // Touch last accessed
      this.db.prepare(`
        UPDATE repo_cache SET last_accessed_at = ? WHERE id = ?
      `).run(new Date().toISOString(), cacheKey);
      
      return fs.readFileSync(contentPath, 'utf-8');
    }
    
    return null;
  }

  /**
   * Store content in cache
   */
  storeContent(
    url: string,
    branch: string,
    commitSha: string,
    profile: string,
    content: string,
    ttlHours: number = this.config.defaultTTLHours
  ): void {
    const cacheKey = this.getCacheKey(url, branch);
    const cacheDir = path.join(this.contentDir, cacheKey);
    const contentPath = path.join(cacheDir, `${profile}.txt`);
    
    // Ensure directory exists
    fs.mkdirSync(cacheDir, { recursive: true });
    
    // Write content
    fs.writeFileSync(contentPath, content, 'utf-8');
    
    // Update or insert metadata
    const now = new Date().toISOString();
    const sizeBytes = Buffer.byteLength(content, 'utf-8');
    
    const existing = this.db.prepare(`SELECT * FROM repo_cache WHERE id = ?`).get(cacheKey);
    
    if (existing) {
      // Update existing entry
      const profiles = JSON.parse((existing as RepoCacheEntry).extractedProfiles as unknown as string) as string[];
      if (!profiles.includes(profile)) {
        profiles.push(profile);
      }
      
      this.db.prepare(`
        UPDATE repo_cache 
        SET commit_sha = ?, cached_at = ?, last_accessed_at = ?, 
            size_bytes = ?, ttl_hours = ?, extracted_profiles = ?
        WHERE id = ?
      `).run(commitSha, now, now, sizeBytes, ttlHours, JSON.stringify(profiles), cacheKey);
    } else {
      // Insert new entry
      this.db.prepare(`
        INSERT INTO repo_cache (id, url, branch, commit_sha, cached_at, last_accessed_at, size_bytes, ttl_hours, extracted_profiles)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(cacheKey, url, branch, commitSha, now, now, sizeBytes, ttlHours, JSON.stringify([profile]));
    }
    
    // Cleanup if needed
    this.cleanupIfNeeded();
  }

  /**
   * Clear cache for specific repos or all
   */
  clear(urls?: string[]): void {
    if (urls && urls.length > 0) {
      for (const url of urls) {
        const entries = this.db.prepare(`SELECT id FROM repo_cache WHERE url = ?`).all(url) as { id: string }[];
        for (const entry of entries) {
          const cacheDir = path.join(this.contentDir, entry.id);
          if (fs.existsSync(cacheDir)) {
            fs.rmSync(cacheDir, { recursive: true });
          }
        }
        this.db.prepare(`DELETE FROM repo_cache WHERE url = ?`).run(url);
      }
    } else {
      // Clear all
      fs.rmSync(this.contentDir, { recursive: true, force: true });
      fs.mkdirSync(this.contentDir, { recursive: true });
      this.db.prepare(`DELETE FROM repo_cache`).run();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalRepos: number; totalSizeMB: number; entries: RepoCacheEntry[] } {
    const entries = this.db.prepare(`SELECT * FROM repo_cache`).all() as RepoCacheEntry[];
    const totalSize = entries.reduce((sum, e) => sum + e.sizeBytes, 0);
    
    return {
      totalRepos: entries.length,
      totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      entries,
    };
  }

  /**
   * Remove old/large entries if cache exceeds size limit (LRU)
   */
  private cleanupIfNeeded(): void {
    const maxBytes = this.config.maxCacheSizeGB * 1024 * 1024 * 1024;
    const stats = this.getStats();
    
    if (stats.totalSizeMB * 1024 * 1024 <= maxBytes) {
      return;
    }

    // Sort by last accessed (oldest first)
    const entries = this.db.prepare(`
      SELECT * FROM repo_cache ORDER BY last_accessed_at ASC
    `).all() as RepoCacheEntry[];

    let currentSize = stats.totalSizeMB * 1024 * 1024;
    const targetSize = maxBytes * 0.8; // Clean to 80%

    for (const entry of entries) {
      if (currentSize <= targetSize) break;
      
      // Remove content
      const cacheDir = path.join(this.contentDir, entry.id);
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true });
      }
      
      // Remove from DB
      this.db.prepare(`DELETE FROM repo_cache WHERE id = ?`).run(entry.id);
      currentSize -= entry.sizeBytes;
    }
  }
}
3. dashboard/server/externalRepos/fetcher.ts
typescript/**
 * Fetches content from external GitHub repositories
 * Supports: HTTP raw, gh CLI, and full clone
 */

import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExternalRepoReference, FetchedRepoContent, RepoFetchStrategy } from '../../src/types';
import { GitHubRepoInfo, FetchResult, CloneResult, EXTRACTION_PROFILES, FETCH_LIMITS } from './types';
import { RepoCache } from './cache';
import { minimatch } from 'minimatch';

export class ExternalRepoFetcher {
  private cache: RepoCache;
  private ghAvailable: boolean | null = null;

  constructor(cache: RepoCache) {
    this.cache = cache;
  }

  /**
   * Parse GitHub URL to extract owner/repo
   */
  parseGitHubUrl(url: string): GitHubRepoInfo | null {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\.]+)/,           // https://github.com/owner/repo
      /github\.com:([^\/]+)\/([^\/\.]+)/,            // git@github.com:owner/repo
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
          defaultBranch: 'main', // Will be detected later
        };
      }
    }
    return null;
  }

  /**
   * Check if gh CLI is available and authenticated
   */
  private async isGhAvailable(): Promise<boolean> {
    if (this.ghAvailable !== null) return this.ghAvailable;

    try {
      execSync('gh auth status', { stdio: 'pipe' });
      this.ghAvailable = true;
    } catch {
      this.ghAvailable = false;
    }
    return this.ghAvailable;
  }

  /**
   * Get default branch for a repository
   */
  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    // Try gh CLI first
    if (await this.isGhAvailable()) {
      try {
        const result = execSync(
          `gh api repos/${owner}/${repo} --jq '.default_branch'`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        ).trim();
        if (result) return result;
      } catch {
        // Fall through
      }
    }

    // Try HTTP API (works for public repos)
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (response.ok) {
        const data = await response.json();
        return data.default_branch || 'main';
      }
    } catch {
      // Fall through
    }

    return 'main';
  }

  /**
   * Get latest commit SHA from remote
   */
  async getRemoteCommitSha(owner: string, repo: string, branch: string): Promise<string | null> {
    try {
      const result = execSync(
        `git ls-remote https://github.com/${owner}/${repo}.git refs/heads/${branch}`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 }
      );
      const sha = result.split('\t')[0];
      return sha || null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch a single file from GitHub
   */
  async fetchFile(owner: string, repo: string, branch: string, filePath: string): Promise<FetchResult> {
    const result: FetchResult = {
      path: filePath,
      content: '',
      size: 0,
      truncated: false,
    };

    // Try gh CLI first (works for private repos)
    if (await this.isGhAvailable()) {
      try {
        const content = execSync(
          `gh api repos/${owner}/${repo}/contents/${filePath}?ref=${branch} --jq '.content' | base64 -d`,
          { encoding: 'utf-8', maxBuffer: FETCH_LIMITS.maxFileSizeBytes * 2, stdio: ['pipe', 'pipe', 'pipe'] }
        );
        result.content = content;
        result.size = Buffer.byteLength(content, 'utf-8');
        
        if (result.size > FETCH_LIMITS.maxFileSizeBytes) {
          result.content = content.slice(0, FETCH_LIMITS.maxFileSizeBytes);
          result.truncated = true;
        }
        return result;
      } catch {
        // Fall through to HTTP
      }
    }

    // Try raw.githubusercontent.com (public repos only)
    try {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const content = await response.text();
        result.content = content;
        result.size = Buffer.byteLength(content, 'utf-8');
        
        if (result.size > FETCH_LIMITS.maxFileSizeBytes) {
          result.content = content.slice(0, FETCH_LIMITS.maxFileSizeBytes);
          result.truncated = true;
        }
        return result;
      }
    } catch {
      // Fall through
    }

    result.error = `Failed to fetch ${filePath}`;
    return result;
  }

  /**
   * List files in a repository directory
   */
  async listRepoFiles(owner: string, repo: string, branch: string, dirPath: string = ''): Promise<string[]> {
    const files: string[] = [];

    // Try gh CLI
    if (await this.isGhAvailable()) {
      try {
        const result = execSync(
          `gh api repos/${owner}/${repo}/contents/${dirPath}?ref=${branch} --jq '.[].path'`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
        return result.trim().split('\n').filter(Boolean);
      } catch {
        // Fall through
      }
    }

    // Try GitHub API
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`
      );
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data.map((f: { path: string }) => f.path) : [];
      }
    } catch {
      // Fall through
    }

    return files;
  }

  /**
   * Clone repository to temp directory
   */
  async cloneRepo(url: string, branch: string): Promise<CloneResult> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-clone-'));
    
    try {
      execSync(
        `git clone --depth ${FETCH_LIMITS.cloneDepth} --branch ${branch} ${url} ${tempDir}`,
        { stdio: 'pipe', timeout: 120000 }
      );

      // Get commit SHA
      const commitSha = execSync('git rev-parse HEAD', { 
        cwd: tempDir, 
        encoding: 'utf-8' 
      }).trim();

      // Calculate size
      let sizeBytes = 0;
      const countSize = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && entry.name !== '.git') {
            countSize(fullPath);
          } else if (entry.isFile()) {
            sizeBytes += fs.statSync(fullPath).size;
          }
        }
      };
      countSize(tempDir);

      return { localPath: tempDir, commitSha, sizeBytes };
    } catch (error) {
      // Cleanup on failure
      fs.rmSync(tempDir, { recursive: true, force: true });
      throw error;
    }
  }

  /**
   * Extract content from cloned repo based on patterns
   */
  extractFromClone(
    repoPath: string,
    includePatterns: string[],
    excludePatterns: string[]
  ): FetchResult[] {
    const results: FetchResult[] = [];
    let totalSize = 0;

    const processDir = (dir: string, relativePath: string = '') => {
      if (totalSize >= FETCH_LIMITS.maxTotalSizeBytes) return;
      if (results.length >= FETCH_LIMITS.maxFilesPerRepo) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (totalSize >= FETCH_LIMITS.maxTotalSizeBytes) break;
        if (results.length >= FETCH_LIMITS.maxFilesPerRepo) break;

        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);

        // Check excludes
        const shouldExclude = excludePatterns.some(pattern => 
          minimatch(relPath, pattern) || 
          minimatch(entry.name, pattern) ||
          relPath.split(path.sep).some(part => minimatch(part, pattern))
        );
        if (shouldExclude) continue;

        if (entry.isDirectory()) {
          processDir(fullPath, relPath);
        } else if (entry.isFile()) {
          // Check includes
          const shouldInclude = includePatterns.some(pattern => minimatch(relPath, pattern));
          if (!shouldInclude) continue;

          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            
            // Skip binary files
            if (content.includes('\x00')) continue;

            const size = Buffer.byteLength(content, 'utf-8');
            const truncated = size > FETCH_LIMITS.maxFileSizeBytes;
            
            results.push({
              path: relPath,
              content: truncated ? content.slice(0, FETCH_LIMITS.maxFileSizeBytes) : content,
              size,
              truncated,
            });
            
            totalSize += Math.min(size, FETCH_LIMITS.maxFileSizeBytes);
          } catch {
            // Skip unreadable files
          }
        }
      }
    };

    processDir(repoPath);
    return results;
  }

  /**
   * Fetch content based on strategy
   */
  async fetchByStrategy(
    repo: ExternalRepoReference,
    forceRefresh: boolean = false
  ): Promise<FetchedRepoContent> {
    const info = this.parseGitHubUrl(repo.url);
    if (!info) {
      return {
        repoId: repo.id,
        repoAlias: repo.alias,
        repoUrl: repo.url,
        files: [],
        fetchedAt: new Date().toISOString(),
        fromCache: false,
        totalSize: 0,
        error: 'Invalid GitHub URL',
      };
    }

    const branch = repo.branch || await this.getDefaultBranch(info.owner, info.repo);
    const profile = this.getProfileForStrategy(repo);

    // Check cache (unless disabled or force refresh)
    if (!repo.disableCache && !forceRefresh) {
      const cacheStatus = await this.cache.getCacheStatus(repo, async () => 
        this.getRemoteCommitSha(info.owner, info.repo, branch)
      );

      if (cacheStatus.isCached && cacheStatus.isFresh) {
        const cachedContent = this.cache.getCachedContent(repo.url, branch, profile);
        if (cachedContent) {
          // Parse cached content back to files
          const files = this.parseCachedContent(cachedContent);
          return {
            repoId: repo.id,
            repoAlias: repo.alias,
            repoUrl: repo.url,
            files,
            mcpInstructions: repo.fetchStrategy === 'mcp' ? repo.mcpHints : undefined,
            fetchedAt: new Date().toISOString(),
            fromCache: true,
            cacheStatus,
            totalSize: files.reduce((sum, f) => sum + f.size, 0),
          };
        }
      }
    }

    // Fetch fresh content
    let files: FetchResult[] = [];
    let commitSha = 'unknown';

    try {
      switch (repo.fetchStrategy) {
        case 'readme-only':
          files = [await this.fetchFile(info.owner, info.repo, branch, 'README.md')];
          break;

        case 'docs-folder':
          const docFiles = await this.listRepoFiles(info.owner, info.repo, branch, 'docs');
          const mdFiles = docFiles.filter(f => f.endsWith('.md'));
          files = await Promise.all([
            this.fetchFile(info.owner, info.repo, branch, 'README.md'),
            ...mdFiles.slice(0, 20).map(f => this.fetchFile(info.owner, info.repo, branch, f))
          ]);
          break;

        case 'specified':
          if (repo.paths && repo.paths.length > 0) {
            files = await Promise.all(
              repo.paths.map(p => this.fetchFile(info.owner, info.repo, branch, p))
            );
          }
          break;

        case 'auto':
          const autoFiles = ['README.md', 'package.json', 'pyproject.toml', 'Cargo.toml'];
          const typeFiles = await this.listRepoFiles(info.owner, info.repo, branch, 'types');
          const srcIndex = await this.fetchFile(info.owner, info.repo, branch, 'src/index.ts');
          
          files = [
            ...await Promise.all(autoFiles.map(f => this.fetchFile(info.owner, info.repo, branch, f))),
            srcIndex,
            ...await Promise.all(typeFiles.slice(0, 10).map(f => this.fetchFile(info.owner, info.repo, branch, f)))
          ];
          files = files.filter(f => !f.error);
          break;

        case 'full-clone': {
          const clone = await this.cloneRepo(repo.url, branch);
          commitSha = clone.commitSha;
          
          const patterns = this.getPatternsForProfile(repo);
          files = this.extractFromClone(clone.localPath, patterns.include, patterns.exclude);
          
          // Cleanup clone
          fs.rmSync(clone.localPath, { recursive: true, force: true });
          break;
        }

        case 'mcp':
          // For MCP, we just provide hints - Claude will query via MCP server
          files = [await this.fetchFile(info.owner, info.repo, branch, 'README.md')];
          break;
      }
    } catch (error) {
      return {
        repoId: repo.id,
        repoAlias: repo.alias,
        repoUrl: repo.url,
        files: [],
        fetchedAt: new Date().toISOString(),
        fromCache: false,
        totalSize: 0,
        error: `Fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    // Filter out failed fetches
    files = files.filter(f => !f.error);

    // Cache the results
    if (!repo.disableCache && files.length > 0) {
      const cacheContent = this.formatForCache(files);
      this.cache.storeContent(
        repo.url,
        branch,
        commitSha,
        profile,
        cacheContent,
        repo.cacheTTLHours || FETCH_LIMITS.defaultTTLHours
      );
    }

    return {
      repoId: repo.id,
      repoAlias: repo.alias,
      repoUrl: repo.url,
      files,
      mcpInstructions: repo.fetchStrategy === 'mcp' ? repo.mcpHints : undefined,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
    };
  }

  /**
   * Get extraction profile name for a strategy
   */
  private getProfileForStrategy(repo: ExternalRepoReference): string {
    if (repo.fetchStrategy === 'full-clone' && repo.extractionProfile) {
      return repo.extractionProfile;
    }
    return repo.fetchStrategy;
  }

  /**
   * Get include/exclude patterns for a profile
   */
  private getPatternsForProfile(repo: ExternalRepoReference): { include: string[]; exclude: string[] } {
    if (repo.customPatterns) {
      return repo.customPatterns;
    }
    
    const profile = repo.extractionProfile || 'full';
    return EXTRACTION_PROFILES[profile as keyof typeof EXTRACTION_PROFILES] || EXTRACTION_PROFILES.full;
  }

  /**
   * Format files for cache storage
   */
  private formatForCache(files: FetchResult[]): string {
    return files.map(f => 
      `### FILE: ${f.path}${f.truncated ? ' [TRUNCATED]' : ''}\n\`\`\`\n${f.content}\n\`\`\`\n`
    ).join('\n');
  }

  /**
   * Parse cached content back to files
   */
  private parseCachedContent(content: string): FetchResult[] {
    const files: FetchResult[] = [];
    const fileRegex = /### FILE: (.+?)( \[TRUNCATED\])?\n```\n([\s\S]*?)\n```/g;
    
    let match;
    while ((match = fileRegex.exec(content)) !== null) {
      files.push({
        path: match[1],
        content: match[3],
        size: Buffer.byteLength(match[3], 'utf-8'),
        truncated: !!match[2],
      });
    }
    
    return files;
  }
}
4. dashboard/server/externalRepos/manager.ts
typescript/**
 * CRUD manager for external repository references
 * Stores in project's settings_json column
 */

import { v4 as uuidv4 } from 'uuid';
import { ExternalRepoReference } from '../../src/types';
import { ProjectRepository } from '../projectRepository';

export class ExternalRepoManager {
  private projectRepo: ProjectRepository;

  constructor(projectRepo: ProjectRepository) {
    this.projectRepo = projectRepo;
  }

  /**
   * Get all external repos for a project
   */
  async listRepos(projectId: string): Promise<ExternalRepoReference[]> {
    const project = await this.projectRepo.getProject(projectId);
    if (!project) return [];

    const settings = project.settings_json ? JSON.parse(project.settings_json) : {};
    return settings.externalRepos || [];
  }

  /**
   * Add a new external repo reference
   */
  async addRepo(
    projectId: string,
    repo: Omit<ExternalRepoReference, 'id' | 'addedAt'>
  ): Promise<ExternalRepoReference> {
    const project = await this.projectRepo.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const settings = project.settings_json ? JSON.parse(project.settings_json) : {};
    const repos: ExternalRepoReference[] = settings.externalRepos || [];

    // Check for duplicate URL
    if (repos.some(r => r.url === repo.url)) {
      throw new Error('Repository already added to this project');
    }

    const newRepo: ExternalRepoReference = {
      ...repo,
      id: uuidv4(),
      addedAt: new Date().toISOString(),
    };

    repos.push(newRepo);
    settings.externalRepos = repos;

    await this.projectRepo.updateProject(projectId, {
      settings_json: JSON.stringify(settings),
    });

    return newRepo;
  }

  /**
   * Update an existing repo reference
   */
  async updateRepo(projectId: string, repo: ExternalRepoReference): Promise<ExternalRepoReference> {
    const project = await this.projectRepo.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const settings = project.settings_json ? JSON.parse(project.settings_json) : {};
    const repos: ExternalRepoReference[] = settings.externalRepos || [];

    const index = repos.findIndex(r => r.id === repo.id);
    if (index === -1) throw new Error('Repository not found');

    repos[index] = { ...repo };
    settings.externalRepos = repos;

    await this.projectRepo.updateProject(projectId, {
      settings_json: JSON.stringify(settings),
    });

    return repo;
  }

  /**
   * Remove a repo reference
   */
  async removeRepo(projectId: string, repoId: string): Promise<void> {
    const project = await this.projectRepo.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const settings = project.settings_json ? JSON.parse(project.settings_json) : {};
    const repos: ExternalRepoReference[] = settings.externalRepos || [];

    const index = repos.findIndex(r => r.id === repoId);
    if (index === -1) throw new Error('Repository not found');

    repos.splice(index, 1);
    settings.externalRepos = repos;

    await this.projectRepo.updateProject(projectId, {
      settings_json: JSON.stringify(settings),
    });
  }

  /**
   * Get repos by IDs
   */
  async getReposByIds(projectId: string, ids: string[]): Promise<ExternalRepoReference[]> {
    const repos = await this.listRepos(projectId);
    return repos.filter(r => ids.includes(r.id));
  }
}
5. dashboard/server/externalRepos/contextBuilder.ts
typescript/**
 * Builds context strings for PRD generation from fetched repo content
 */

import { FetchedRepoContent, ExternalRepoReference } from '../../src/types';

export interface BuiltContext {
  staticContent: string;        // Pre-fetched content to include in prompt
  mcpInstructions: string;      // Instructions for Claude to use MCP
  totalTokensEstimate: number;  // Rough token count
}

export class ExternalRepoContextBuilder {
  
  /**
   * Build context from multiple fetched repos
   */
  buildContext(fetchedRepos: FetchedRepoContent[]): BuiltContext {
    const staticParts: string[] = [];
    const mcpParts: string[] = [];
    let totalChars = 0;

    for (const repo of fetchedRepos) {
      if (repo.error) {
        staticParts.push(`
<repository name="${repo.repoAlias}" url="${repo.repoUrl}" status="error">
Error fetching repository: ${repo.error}
</repository>
`);
        continue;
      }

      // Add static file content
      if (repo.files.length > 0) {
        const filesContent = repo.files.map(f => 
          `### ${f.path}${f.truncated ? ' [truncated]' : ''}\n\`\`\`\n${f.content}\n\`\`\``
        ).join('\n\n');

        staticParts.push(`
<repository name="${repo.repoAlias}" url="${repo.repoUrl}" files="${repo.files.length}" cached="${repo.fromCache}">
${filesContent}
</repository>
`);
        totalChars += filesContent.length;
      }

      // Add MCP instructions if present
      if (repo.mcpInstructions && repo.mcpInstructions.length > 0) {
        mcpParts.push(`
### ${repo.repoAlias} (${repo.repoUrl})
${repo.mcpInstructions.map(hint => `- ${hint}`).join('\n')}
`);
      }
    }

    // Build MCP instructions section
    let mcpInstructions = '';
    if (mcpParts.length > 0) {
      mcpInstructions = `
<mcp_github_instructions>
You have access to the GitHub MCP server. Use it to query these repositories for additional context as needed:

${mcpParts.join('\n')}

Available MCP actions:
- Search code in repositories
- Get specific file contents  
- List directory structures
- Search issues and PRs for additional context
</mcp_github_instructions>
`;
    }

    return {
      staticContent: staticParts.length > 0 
        ? `<external_repositories>\nThe following external repositories are provided as reference:\n${staticParts.join('\n')}\n</external_repositories>`
        : '',
      mcpInstructions,
      totalTokensEstimate: Math.ceil(totalChars / 4), // Rough estimate
    };
  }

  /**
   * Build a preview of what will be included (for UI)
   */
  buildPreview(fetchedRepos: FetchedRepoContent[]): {
    repos: Array<{
      alias: string;
      url: string;
      fileCount: number;
      totalSize: number;
      fromCache: boolean;
      hasMcpHints: boolean;
      error?: string;
    }>;
    totalFiles: number;
    totalSize: number;
    estimatedTokens: number;
  } {
    const repos = fetchedRepos.map(r => ({
      alias: r.repoAlias,
      url: r.repoUrl,
      fileCount: r.files.length,
      totalSize: r.totalSize,
      fromCache: r.fromCache,
      hasMcpHints: !!(r.mcpInstructions && r.mcpInstructions.length > 0),
      error: r.error,
    }));

    return {
      repos,
      totalFiles: repos.reduce((sum, r) => sum + r.fileCount, 0),
      totalSize: repos.reduce((sum, r) => sum + r.totalSize, 0),
      estimatedTokens: Math.ceil(repos.reduce((sum, r) => sum + r.totalSize, 0) / 4),
    };
  }
}
6. dashboard/server/externalRepos/index.ts
typescript/**
 * Main export for external repos module
 */

export * from './types';
export * from './cache';
export * from './fetcher';
export * from './manager';
export * from './contextBuilder';

import { Database } from 'better-sqlite3';
import { RepoCache, CacheConfig } from './cache';
import { ExternalRepoFetcher } from './fetcher';
import { ExternalRepoManager } from './manager';
import { ExternalRepoContextBuilder } from './contextBuilder';
import { ProjectRepository } from '../projectRepository';

/**
 * Factory to create all external repo services
 */
export function createExternalRepoServices(
  db: Database,
  projectRepo: ProjectRepository,
  cacheConfig?: Partial<CacheConfig>
) {
  const cache = new RepoCache(db, cacheConfig);
  const fetcher = new ExternalRepoFetcher(cache);
  const manager = new ExternalRepoManager(projectRepo);
  const contextBuilder = new ExternalRepoContextBuilder();

  return {
    cache,
    fetcher,
    manager,
    contextBuilder,
  };
}

Files to Modify
1. dashboard/server/index.ts - WebSocket Handlers
typescript// Add imports
import { 
  createExternalRepoServices,
  ExternalRepoReference 
} from './externalRepos';

// Initialize services (near other service initialization)
const externalRepoServices = createExternalRepoServices(db, projectRepository);

// Add WebSocket handlers in the switch statement
case 'external-repos:list': {
  const projectId = getCurrentProjectId(ws); // Your existing method
  const repos = await externalRepoServices.manager.listRepos(projectId);
  sendMessage(ws, { type: 'external-repos:list', payload: repos });
  break;
}

case 'external-repos:add': {
  const projectId = getCurrentProjectId(ws);
  const repo = await externalRepoServices.manager.addRepo(
    projectId, 
    command.payload as Omit<ExternalRepoReference, 'id' | 'addedAt'>
  );
  // Broadcast updated list
  const repos = await externalRepoServices.manager.listRepos(projectId);
  sendMessage(ws, { type: 'external-repos:list', payload: repos });
  break;
}

case 'external-repos:remove': {
  const projectId = getCurrentProjectId(ws);
  await externalRepoServices.manager.removeRepo(projectId, command.payload.id);
  const repos = await externalRepoServices.manager.listRepos(projectId);
  sendMessage(ws, { type: 'external-repos:list', payload: repos });
  break;
}

case 'external-repos:update': {
  const projectId = getCurrentProjectId(ws);
  await externalRepoServices.manager.updateRepo(projectId, command.payload);
  const repos = await externalRepoServices.manager.listRepos(projectId);
  sendMessage(ws, { type: 'external-repos:list', payload: repos });
  break;
}

case 'external-repos:fetch': {
  const projectId = getCurrentProjectId(ws);
  const { ids, forceRefresh } = command.payload;
  const repos = await externalRepoServices.manager.getReposByIds(projectId, ids);
  
  const fetchedContent = await Promise.all(
    repos.map(r => externalRepoServices.fetcher.fetchByStrategy(r, forceRefresh))
  );
  
  sendMessage(ws, { type: 'external-repos:fetched', payload: fetchedContent });
  break;
}

case 'external-repos:cache-status': {
  const projectId = getCurrentProjectId(ws);
  const repos = await externalRepoServices.manager.getReposByIds(projectId, command.payload.ids);
  
  const statuses: Record<string, RepoCacheStatus> = {};
  for (const repo of repos) {
    statuses[repo.id] = await externalRepoServices.cache.getCacheStatus(repo);
  }
  
  sendMessage(ws, { type: 'external-repos:cache-status', payload: statuses });
  break;
}

case 'external-repos:cache-clear': {
  const { ids } = command.payload;
  if (ids && ids.length > 0) {
    const projectId = getCurrentProjectId(ws);
    const repos = await externalRepoServices.manager.getReposByIds(projectId, ids);
    externalRepoServices.cache.clear(repos.map(r => r.url));
  } else {
    externalRepoServices.cache.clear();
  }
  sendMessage(ws, { type: 'external-repos:cache-status', payload: {} });
  break;
}

case 'external-repos:prewarm': {
  const projectId = getCurrentProjectId(ws);
  const repos = await externalRepoServices.manager.getReposByIds(projectId, command.payload.ids);
  
  // Prewarm in background
  Promise.all(repos.map(r => externalRepoServices.fetcher.fetchByStrategy(r)))
    .then(results => {
      sendMessage(ws, { type: 'external-repos:fetched', payload: results });
    });
  
  // Immediate acknowledgment
  sendMessage(ws, { type: 'external-repos:cache-status', payload: { prewarming: true } });
  break;
}
2. dashboard/server/iterativePrdGenerator.ts - Include External Context
typescript// Add imports
import { createExternalRepoServices } from './externalRepos';

// In buildPRDPrompt method, add parameter and logic:

async buildPRDPrompt(
  // ... existing params
  externalRepoIds?: string[],
  projectId?: string
): Promise<string> {
  
  // ... existing code to build base prompt
  
  // Fetch and include external repo context
  let externalContext = '';
  let mcpInstructions = '';
  
  if (externalRepoIds && externalRepoIds.length > 0 && projectId) {
    const externalRepoServices = createExternalRepoServices(this.db, this.projectRepo);
    const repos = await externalRepoServices.manager.getReposByIds(projectId, externalRepoIds);
    
    // Fetch content for all selected repos
    const fetchedContent = await Promise.all(
      repos.map(r => externalRepoServices.fetcher.fetchByStrategy(r))
    );
    
    // Build context
    const context = externalRepoServices.contextBuilder.buildContext(fetchedContent);
    externalContext = context.staticContent;
    mcpInstructions = context.mcpInstructions;
  }
  
  // Include in prompt
  const prompt = `
${externalContext}

${mcpInstructions}

${/* ... rest of existing prompt */ ''}
`;
  
  return prompt;
}
3. dashboard/server/prdSessionManager.ts - Extend Session
typescript// Add to PRDSession interface
export interface PRDSession {
  // ... existing fields
  selectedExternalRepos?: string[];  // IDs of repos to include
}

// Update session creation/update methods to handle this field

UI Components
dashboard/src/components/setup/ExternalReposConfig.tsx
tsximport React, { useState, useEffect } from 'react';
import { 
  ExternalRepoReference, 
  RepoFetchStrategy, 
  RepoExtractionProfile,
  RepoCacheStatus 
} from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';

const FETCH_STRATEGIES: { value: RepoFetchStrategy; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto-detect', description: 'README, types, package.json, main entry' },
  { value: 'readme-only', label: 'README only', description: 'Just the README.md file' },
  { value: 'docs-folder', label: 'Documentation', description: 'README + docs/ folder' },
  { value: 'specified', label: 'Specific files', description: 'You choose which files' },
  { value: 'full-clone', label: 'Full clone', description: 'Clone entire repo (slower, more complete)' },
  { value: 'mcp', label: 'MCP (on-demand)', description: 'Query via MCP during generation' },
];

const EXTRACTION_PROFILES: { value: RepoExtractionProfile; label: string }[] = [
  { value: 'typescript_lib', label: 'TypeScript Library' },
  { value: 'python_lib', label: 'Python Library' },
  { value: 'docs_only', label: 'Documentation Only' },
  { value: 'full', label: 'Full Repository' },
];

interface Props {
  projectId: string;
}

export const ExternalReposConfig: React.FC<Props> = ({ projectId }) => {
  const { sendCommand, lastMessage } = useWebSocket();
  const [repos, setRepos] = useState<ExternalRepoReference[]>([]);
  const [cacheStatus, setCacheStatus] = useState<Record<string, RepoCacheStatus>>({});
  const [isAddingRepo, setIsAddingRepo] = useState(false);
  const [editingRepo, setEditingRepo] = useState<ExternalRepoReference | null>(null);
  
  // Form state
  const [formUrl, setFormUrl] = useState('');
  const [formAlias, setFormAlias] = useState('');
  const [formStrategy, setFormStrategy] = useState<RepoFetchStrategy>('auto');
  const [formProfile, setFormProfile] = useState<RepoExtractionProfile>('typescript_lib');
  const [formPaths, setFormPaths] = useState('');
  const [formMcpHints, setFormMcpHints] = useState('');
  const [formPurpose, setFormPurpose] = useState('');

  // Load repos on mount
  useEffect(() => {
    sendCommand({ type: 'external-repos:list' });
  }, [projectId]);

  // Handle messages
  useEffect(() => {
    if (!lastMessage) return;
    
    switch (lastMessage.type) {
      case 'external-repos:list':
        setRepos(lastMessage.payload);
        // Request cache status
        if (lastMessage.payload.length > 0) {
          sendCommand({
            type: 'external-repos:cache-status',
            payload: { ids: lastMessage.payload.map((r: ExternalRepoReference) => r.id) }
          });
        }
        break;
      case 'external-repos:cache-status':
        setCacheStatus(lastMessage.payload);
        break;
    }
  }, [lastMessage]);

  const resetForm = () => {
    setFormUrl('');
    setFormAlias('');
    setFormStrategy('auto');
    setFormProfile('typescript_lib');
    setFormPaths('');
    setFormMcpHints('');
    setFormPurpose('');
    setIsAddingRepo(false);
    setEditingRepo(null);
  };

  const handleSubmit = () => {
    const payload: Omit<ExternalRepoReference, 'id' | 'addedAt'> = {
      url: formUrl,
      alias: formAlias || formUrl.split('/').slice(-2).join('/'),
      fetchStrategy: formStrategy,
      purpose: formPurpose,
    };

    if (formStrategy === 'specified' && formPaths) {
      payload.paths = formPaths.split('\n').map(p => p.trim()).filter(Boolean);
    }
    if (formStrategy === 'full-clone') {
      payload.extractionProfile = formProfile;
    }
    if (formStrategy === 'mcp' && formMcpHints) {
      payload.mcpHints = formMcpHints.split('\n').map(h => h.trim()).filter(Boolean);
    }

    if (editingRepo) {
      sendCommand({
        type: 'external-repos:update',
        payload: { ...payload, id: editingRepo.id, addedAt: editingRepo.addedAt }
      });
    } else {
      sendCommand({ type: 'external-repos:add', payload });
    }

    resetForm();
  };

  const handleRemove = (id: string) => {
    if (confirm('Remove this repository reference?')) {
      sendCommand({ type: 'external-repos:remove', payload: { id } });
    }
  };

  const handleTestFetch = (repo: ExternalRepoReference) => {
    sendCommand({
      type: 'external-repos:fetch',
      payload: { ids: [repo.id], forceRefresh: true }
    });
  };

  const handleClearCache = (id?: string) => {
    sendCommand({
      type: 'external-repos:cache-clear',
      payload: { ids: id ? [id] : undefined }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">External Repository References</h2>
        <div className="space-x-2">
          <button
            onClick={() => handleClearCache()}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Clear All Cache
          </button>
          <button
            onClick={() => setIsAddingRepo(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Repository
          </button>
        </div>
      </div>

      {/* Repository List */}
      <div className="space-y-3">
        {repos.map(repo => {
          const status = cacheStatus[repo.id];
          return (
            <div key={repo.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{repo.alias}</div>
                  <div className="text-sm text-gray-500">{repo.url}</div>
                  {repo.purpose && (
                    <div className="text-sm text-gray-600 mt-1">{repo.purpose}</div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded ${
                    repo.fetchStrategy === 'mcp' ? 'bg-purple-100 text-purple-700' :
                    repo.fetchStrategy === 'full-clone' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {repo.fetchStrategy}
                  </span>
                  {status?.isCached && (
                    <span className={`px-2 py-1 text-xs rounded ${
                      status.isFresh ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {status.isFresh ? 'cached ✓' : 'stale'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => handleTestFetch(repo)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Test Fetch
                </button>
                <button
                  onClick={() => {
                    setEditingRepo(repo);
                    setFormUrl(repo.url);
                    setFormAlias(repo.alias);
                    setFormStrategy(repo.fetchStrategy);
                    setFormProfile(repo.extractionProfile || 'typescript_lib');
                    setFormPaths(repo.paths?.join('\n') || '');
                    setFormMcpHints(repo.mcpHints?.join('\n') || '');
                    setFormPurpose(repo.purpose || '');
                    setIsAddingRepo(true);
                  }}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleClearCache(repo.id)}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Clear Cache
                </button>
                <button
                  onClick={() => handleRemove(repo.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
        
        {repos.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No external repositories linked. Add one to include external context in PRD generation.
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {isAddingRepo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingRepo ? 'Edit Repository' : 'Add External Repository'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">GitHub URL</label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={e => setFormUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Alias (display name)</label>
                <input
                  type="text"
                  value={formAlias}
                  onChange={e => setFormAlias(e.target.value)}
                  placeholder="e.g., Stripe SDK"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Purpose</label>
                <input
                  type="text"
                  value={formPurpose}
                  onChange={e => setFormPurpose(e.target.value)}
                  placeholder="e.g., Payment processing integration"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fetch Strategy</label>
                <select
                  value={formStrategy}
                  onChange={e => setFormStrategy(e.target.value as RepoFetchStrategy)}
                  className="w-full border rounded px-3 py-2"
                >
                  {FETCH_STRATEGIES.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label} - {s.description}
                    </option>
                  ))}
                </select>
              </div>

              {formStrategy === 'full-clone' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Extraction Profile</label>
                  <select
                    value={formProfile}
                    onChange={e => setFormProfile(e.target.value as RepoExtractionProfile)}
                    className="w-full border rounded px-3 py-2"
                  >
                    {EXTRACTION_PROFILES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {formStrategy === 'specified' && (
                <div>
                  <label className="block text-sm font-medium mb-1">File Paths (one per line)</label>
                  <textarea
                    value={formPaths}
                    onChange={e => setFormPaths(e.target.value)}
                    placeholder="README.md&#10;src/index.ts&#10;types/api.d.ts"
                    className="w-full border rounded px-3 py-2 h-24 font-mono text-sm"
                  />
                </div>
              )}

              {formStrategy === 'mcp' && (
                <div>
                  <label className="block text-sm font-medium mb-1">MCP Query Hints (one per line)</label>
                  <textarea
                    value={formMcpHints}
                    onChange={e => setFormMcpHints(e.target.value)}
                    placeholder="Search for authentication patterns&#10;Find the main client class&#10;Look for webhook handling"
                    className="w-full border rounded px-3 py-2 h-24"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {editingRepo ? 'Save Changes' : 'Add Repository'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
dashboard/src/components/IterativePRDGenerator.tsx - Repo Selection
tsx// Add to existing component

// Add state for selected repos
const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);
const [availableRepos, setAvailableRepos] = useState<ExternalRepoReference[]>([]);

// Load available repos
useEffect(() => {
  sendCommand({ type: 'external-repos:list' });
}, []);

// Handle message
useEffect(() => {
  if (lastMessage?.type === 'external-repos:list') {
    setAvailableRepos(lastMessage.payload);
  }
}, [lastMessage]);

// Add UI section (before Generate button)
{availableRepos.length > 0 && (
  <div className="border rounded-lg p-4 mb-4">
    <div className="font-medium mb-2">Include External Repositories</div>
    <div className="space-y-2">
      {availableRepos.map(repo => (
        <label key={repo.id} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selectedRepoIds.includes(repo.id)}
            onChange={e => {
              if (e.target.checked) {
                setSelectedRepoIds([...selectedRepoIds, repo.id]);
              } else {
                setSelectedRepoIds(selectedRepoIds.filter(id => id !== repo.id));
              }
            }}
          />
          <span>{repo.alias}</span>
          <span className="text-xs text-gray-500">({repo.fetchStrategy})</span>
        </label>
      ))}
    </div>
    <div className="mt-2">
      <a href="/settings/external-repos" className="text-sm text-blue-600 hover:underline">
        Manage repositories →
      </a>
    </div>
  </div>
)}

// Include in generation request
const handleGenerate = () => {
  sendCommand({
    type: 'prd:generate',
    payload: {
      // ... existing payload
      externalRepoIds: selectedRepoIds,
    }
  });
};

Verification Checklist

Types - All new types added to dashboard/src/types/index.ts
Cache - SQLite + filesystem cache working with TTL
Fetcher - HTTP, gh CLI, and full-clone all working
Manager - CRUD operations storing in project settings
WebSocket - All commands handled
UI Config - Add/edit/remove repos with strategy selection
UI Generator - Repo selection in PRD generator
PRD Integration - External context included in prompts
MCP - MCP hints passed through to Claude
Private Repos - gh CLI auth working


Implementation Order

✅ Types (dashboard/src/types/index.ts)
⬜ Cache system (dashboard/server/externalRepos/cache.ts)
⬜ Fetcher (dashboard/server/externalRepos/fetcher.ts)
⬜ Manager (dashboard/server/externalRepos/manager.ts)
⬜ Context builder (dashboard/server/externalRepos/contextBuilder.ts)
⬜ WebSocket handlers (dashboard/server/index.ts)
⬜ UI: Config component (ExternalReposConfig.tsx)
⬜ UI: Generator integration (IterativePRDGenerator.tsx)
⬜ PRD generator integration (iterativePrdGenerator.ts)
⬜ Testing with public repo
⬜ Testing with private repo
⬜ Testing MCP integration

