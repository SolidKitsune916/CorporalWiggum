/**
 * External Repository Types and Constants (Server-Side)
 * Internal types for the externalRepos module
 */

// ============================================================================
// Fetch Strategy Types
// ============================================================================

export type RepoFetchStrategy =
  | 'readme-only'      // Just README.md
  | 'docs-folder'      // README + docs/*.md
  | 'specified'        // User-defined paths
  | 'auto'             // Auto-detect key files
  | 'typescript-lib'   // TypeScript library profile
  | 'python-lib'       // Python library profile
  | 'full-clone'       // Clone entire repo
  | 'mcp-only'         // MCP queries only (minimal static)
  | 'hybrid';          // Core files + MCP queries

// ============================================================================
// Extraction Profiles
// ============================================================================

export interface ExtractionProfile {
  name: string;
  include: string[];
  exclude: string[];
  maxFiles: number;
  maxFileSize: number;  // bytes
}

export const EXTRACTION_PROFILES: Record<string, ExtractionProfile> = {
  'readme-only': {
    name: 'README Only',
    include: ['README.md', 'README.rst', 'README.txt', 'readme.md'],
    exclude: [],
    maxFiles: 1,
    maxFileSize: 100 * 1024,  // 100KB
  },
  'docs-folder': {
    name: 'Documentation',
    include: ['README.md', 'readme.md', 'docs/**/*.md', 'documentation/**/*.md', 'doc/**/*.md'],
    exclude: ['**/node_modules/**', '**/.git/**'],
    maxFiles: 50,
    maxFileSize: 100 * 1024,
  },
  'auto': {
    name: 'Auto-detect',
    include: [
      'README.md', 'readme.md',
      'docs/**/*.md',
      'src/index.ts', 'src/index.js',
      'lib/index.ts', 'lib/index.js',
      'package.json',
      'pyproject.toml',
      'setup.py',
      'Cargo.toml',
      'go.mod',
    ],
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/*.min.js',
      '**/*.map',
    ],
    maxFiles: 30,
    maxFileSize: 50 * 1024,
  },
  'typescript-lib': {
    name: 'TypeScript Library',
    include: [
      'README.md', 'readme.md',
      'package.json',
      'tsconfig.json',
      'src/**/*.ts',
      'src/**/*.tsx',
      'lib/**/*.ts',
      'types/**/*.ts',
      '*.d.ts',
      'docs/**/*.md',
    ],
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/__tests__/**',
    ],
    maxFiles: 100,
    maxFileSize: 50 * 1024,
  },
  'python-lib': {
    name: 'Python Library',
    include: [
      'README.md', 'readme.md',
      'pyproject.toml',
      'setup.py',
      'setup.cfg',
      'requirements.txt',
      'src/**/*.py',
      '*.py',
      'docs/**/*.md',
      'docs/**/*.rst',
    ],
    exclude: [
      '**/.git/**',
      '**/__pycache__/**',
      '**/venv/**',
      '**/.venv/**',
      '**/dist/**',
      '**/build/**',
      '**/*.pyc',
      '**/test_*.py',
      '**/*_test.py',
    ],
    maxFiles: 100,
    maxFileSize: 50 * 1024,
  },
  'full-clone': {
    name: 'Full Clone',
    include: ['**/*'],
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/__pycache__/**',
      '**/venv/**',
      '**/.venv/**',
      '**/*.min.js',
      '**/*.map',
      '**/*.pyc',
      '**/target/**',
    ],
    maxFiles: 500,
    maxFileSize: 50 * 1024,
  },
  'mcp-only': {
    name: 'MCP Only (Minimal Static)',
    include: ['README.md', 'readme.md'],
    exclude: [],
    maxFiles: 1,
    maxFileSize: 100 * 1024,
  },
  'hybrid': {
    name: 'Hybrid (Auto + MCP)',
    include: [
      'README.md', 'readme.md',
      'docs/**/*.md',
      'src/index.ts', 'src/index.js',
      'package.json',
    ],
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
    ],
    maxFiles: 20,
    maxFileSize: 50 * 1024,
  },
};

// ============================================================================
// Fetch Limits
// ============================================================================

export const FETCH_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024,        // 50KB per file
  MAX_REPO_SIZE: 500 * 1024,       // 500KB total per repo
  MAX_CACHE_SIZE: 2 * 1024 * 1024 * 1024,  // 2GB total cache
  DEFAULT_TTL_HOURS: 24,
  DEFAULT_MAX_TOKENS: 50000,       // ~50K chars
};

// ============================================================================
// External Repo Reference (stored in project settings)
// ============================================================================

export interface ExternalRepoReference {
  id: string;                     // UUID
  url: string;                    // https://github.com/owner/repo
  alias: string;                  // Display name
  branch?: string;                // Default: auto-detected

  // Fetch configuration
  fetchStrategy: RepoFetchStrategy;
  paths?: string[];               // For 'specified' strategy
  mcpHints?: string[];            // For 'mcp-only' or 'hybrid'

  // Limits
  maxTokens?: number;             // Default: 50000 chars

  // Metadata
  purpose?: string;               // Why this repo is referenced
  addedAt: string;                // ISO date
  lastFetchedAt?: string;         // ISO date
  cachedCommitSha?: string;       // For freshness checking

  // Cache settings (per-repo override)
  cacheTTLHours?: number;         // Override default (24h)
  disableCache?: boolean;         // Always fetch fresh
}

// ============================================================================
// Cache Types
// ============================================================================

export interface RepoCacheEntry {
  id: string;                     // Hash of url#branch
  url: string;
  branch: string;
  commitSha: string;
  cachedAt: string;               // ISO date
  lastAccessedAt: string;         // ISO date
  sizeBytes: number;
  ttlHours: number;
  extractedProfiles: string[];    // Which profiles cached
}

export interface RepoCacheStatus {
  cached: boolean;
  fresh: boolean;
  reason?: 'not_cached' | 'ttl_expired' | 'new_commits' | 'fresh';
  localSha?: string;
  remoteSha?: string;
  sizeBytes?: number;
  extractedProfiles?: string[];
}

// ============================================================================
// Fetched Content
// ============================================================================

export interface FetchedFile {
  path: string;
  content: string;
  size: number;
  truncated: boolean;
}

export interface FetchedRepoContent {
  repoId: string;
  repoAlias: string;
  repoUrl: string;
  commitSha: string;
  fromCache: boolean;
  files: FetchedFile[];
  totalSize: number;
  fetchedAt: string;              // ISO date
  mcpInstructions?: string[];     // For MCP strategies
  error?: string;
}

// ============================================================================
// MCP Config Types
// ============================================================================

export interface GitHubMcpConfig {
  enabled: boolean;
  tokenConfigured: boolean;
  reposWithMcp: string[];         // Repo IDs using mcp-only or hybrid
}

export interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

// ============================================================================
// GitHub API Types
// ============================================================================

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  defaultBranch: string;
  private: boolean;
}

export interface GitHubTokenInfo {
  valid: boolean;
  scopes?: string[];
  login?: string;
  error?: string;
}

// ============================================================================
// Parsed URL
// ============================================================================

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  isValid: boolean;
}
