Dynamic External GitHub Repo References - Implementation Plan
Overview
Add the ability to dynamically reference external GitHub repositories as context when generating PRDs and documentation via Claude Code CLI.

User Decisions:

✅ Scope: Project-level linked repos (set once, optionally select per session)
✅ Fetch Strategy: Configurable per-repo (user chooses strategy for each repo)
✅ Auth: Both public (raw HTTP) and private repos (via gh CLI)
Enhancements from Reference Implementation:

✅ Caching: Filesystem cache with TTL and git SHA freshness checks
✅ Extraction Profiles: Pre-defined profiles for common repo types (typescript_lib, python_lib, docs_only)
✅ Clone vs API: Option to shallow clone entire repo for deeper context (not just individual files)
✅ MCP Integration: Use GitHub MCP server for on-demand queries during Claude conversation (hybrid approach)
Implementation Summary
New Types (dashboard/src/types/index.ts)

// Fetch strategy options (expanded with profiles + MCP)
export type RepoFetchStrategy =
  | 'specified'        // User specifies exact file paths
  | 'readme-only'      // Just README.md
  | 'docs-folder'      // All markdown in docs/
  | 'typescript-lib'   // src/**/*.ts, types/**/*.ts, *.d.ts, README.md
  | 'python-lib'       // **/*.py, README.md, pyproject.toml
  | 'auto'             // Auto-detect key files (README, API docs, package.json, entry points)
  | 'full-clone'       // Shallow clone + extract all relevant files (most comprehensive)
  | 'mcp-only'         // No static content - Claude queries via MCP during conversation
  | 'hybrid';          // Core files cached + MCP for deeper exploration

// External repo reference (stored at project level)
export interface ExternalRepoReference {
  id: string;                     // UUID
  url: string;                    // e.g., "https://github.com/owner/repo"
  alias: string;                  // Friendly name for display
  branch?: string;                // Default: main/master (auto-detected)
  fetchStrategy: RepoFetchStrategy;
  paths?: string[];               // For 'specified' strategy
  maxTokens?: number;             // Max context size (default: 50000 chars)
  mcpHints?: string[];            // For 'mcp-only' or 'hybrid' - hints for Claude on what to query
                                  // e.g., ["search for authentication patterns", "find API types"]
  addedAt: string;                // ISO date
  lastFetchedAt?: string;         // ISO date
  cachedCommitSha?: string;       // For freshness checking
}

// MCP configuration for GitHub integration
export interface GitHubMcpConfig {
  enabled: boolean;
  tokenConfigured: boolean;       // Whether GITHUB_PERSONAL_ACCESS_TOKEN is set
  reposWithMcp: string[];         // Repo IDs using 'mcp-only' or 'hybrid' strategy
}

// Cache metadata for a repo
export interface RepoCacheEntry {
  repoId: string;
  url: string;
  branch: string;
  commitSha: string;              // Git SHA of cached version
  cachedAt: string;               // ISO date
  lastAccessedAt: string;         // For LRU cleanup
  sizeBytes: number;
  extractedProfiles: string[];    // Which profiles have been extracted
}

// Fetched content from a repo
export interface FetchedRepoContent {
  repoId: string;
  repoAlias: string;
  commitSha: string;              // So user knows what version they're using
  fromCache: boolean;             // Whether this came from cache
  files: Array<{
    path: string;
    content: string;
    size: number;
    truncated: boolean;
  }>;
  totalSize: number;
  fetchedAt: string;
  error?: string;
}

// Cache status for UI display
export interface RepoCacheStatus {
  cached: boolean;
  fresh: boolean;                 // Is cached version up-to-date?
  localSha?: string;
  remoteSha?: string;
  reason?: 'not_cached' | 'ttl_expired' | 'new_commits' | 'fresh';
}
WebSocket Commands & Messages

// Commands (Client → Server)
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
    forceRefresh?: boolean;  // Bypass cache
  };
}

export interface ExternalReposCacheStatusCommand {
  type: 'external-repos:cache-status';
  payload: { ids: string[] };
}

export interface ExternalReposClearCacheCommand {
  type: 'external-repos:clear-cache';
  payload: { id?: string };  // Omit to clear all
}

// Messages (Server → Client)
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
Files to Create
1. dashboard/server/externalRepoFetcher.ts
New service for fetching content from external GitHub repos with caching.

Key Methods:

parseGitHubUrl(url) - Extract owner/repo from URL
getDefaultBranch(owner, repo) - Detect main/master via gh api
getRemoteSha(owner, repo, branch) - Get latest commit SHA without cloning
getCacheStatus(repo) - Check if cached and fresh
fetchByStrategy(repo, forceRefresh?) - Fetch based on strategy (uses cache)
extractByProfile(repoPath, profile) - Extract content using profile patterns
Fetch Strategies & Patterns:


const EXTRACTION_PROFILES = {
  'readme-only': {
    patterns: ['README.md', 'README.rst', 'readme.md'],
    excludes: [],
    maxChars: 20000
  },
  'docs-folder': {
    patterns: ['README.md', 'docs/**/*.md', '*.md'],
    excludes: ['.git'],
    maxChars: 50000
  },
  'typescript-lib': {
    patterns: ['src/**/*.ts', 'lib/**/*.ts', 'types/**/*.ts', '**/*.d.ts', 'README.md', 'package.json'],
    excludes: ['*test*', '*spec*', 'node_modules', '.git', 'dist'],
    maxChars: 80000
  },
  'python-lib': {
    patterns: ['**/*.py', 'README.md', 'pyproject.toml', 'setup.py'],
    excludes: ['*test*', 'tests/', '.git', '__pycache__', '.venv'],
    maxChars: 80000
  },
  'auto': {
    patterns: ['README.md', 'package.json', 'pyproject.toml', 'go.mod', 'Cargo.toml',
               'src/index.ts', 'src/index.js', 'src/main.py', 'lib/index.ts',
               '**/*.d.ts', 'types/**/*', 'src/types/**/*'],
    excludes: ['node_modules', '.git', 'dist', 'build', '__pycache__'],
    maxChars: 60000
  },
  'full-clone': {
    patterns: ['**/*'],
    excludes: ['node_modules', '.git', '__pycache__', '*.lock', 'package-lock.json',
               '*.min.js', '*.map', 'dist', 'build', '.next', 'coverage', 'vendor',
               '*.png', '*.jpg', '*.gif', '*.ico', '*.woff*', '*.ttf', '*.svg'],
    maxChars: 150000
  }
};
Fetching Logic:

Check cache status (is it fresh based on TTL + remote SHA?)
If fresh cache exists → return cached extraction
If not cached or stale:
For full-clone, typescript-lib, python-lib: shallow clone via git clone --depth 1
For readme-only, specified: fetch individual files via gh api or raw HTTP
Extract content using profile patterns
Cache both the clone (if applicable) and extracted content
Size limits: 50KB per file, configurable total per repo
2. dashboard/server/externalRepoCache.ts
Filesystem cache manager for repo content.

Cache Location: ~/.ralph/repo-cache/

Structure:


~/.ralph/repo-cache/
├── repos/
│   ├── {hash}/                    # Hash of url#branch
│   │   ├── repo/                  # Git clone (for full-clone strategy)
│   │   ├── metadata.json          # RepoCacheEntry
│   │   └── extracted/             # Pre-extracted content by profile
│   │       ├── typescript-lib.txt
│   │       ├── auto.txt
│   │       └── readme-only.txt
│   └── ...
└── index.json                     # Quick lookup
Key Methods:

getCacheDir(url, branch) - Get cache directory for repo
getCacheStatus(url, branch) - Check freshness
getExtractedContent(url, branch, profile) - Get cached extraction
saveExtraction(url, branch, profile, content) - Save extraction
cleanup(maxSizeGB) - LRU cleanup when over size limit
clearAll() - Clear entire cache
Config:


const CACHE_CONFIG = {
  maxSizeGB: 2.0,           // Max cache size
  defaultTTLHours: 24,      // How long before checking remote for updates
  freshnessCheck: true,     // Check remote SHA before using cache
};
3. dashboard/server/externalRepoManager.ts
Manager for CRUD operations on linked repos.

Storage: Project's settings_json column in SQLite via ProjectRepository.

Key Methods:

listRepos(projectId) - Get all linked repos
addRepo(projectId, repo) - Add new repo
updateRepo(projectId, repo) - Update repo config
removeRepo(projectId, repoId) - Remove repo
Files to Modify
1. dashboard/src/types/index.ts
Add types listed above
Add new message types to ServerMessage union
Add new command types to ClientCommand union
2. dashboard/server/index.ts
Add WebSocket handlers:

case 'external-repos:list':
case 'external-repos:add':
case 'external-repos:remove':
case 'external-repos:update':
case 'external-repos:fetch':
case 'external-repos:cache-status':
case 'external-repos:clear-cache':
3. dashboard/server/iterativePrdGenerator.ts
In buildPRDPrompt() method (~line 384):

Accept externalRepoIds?: string[] parameter
Fetch content via ExternalRepoFetcher
Format content with XML-style tags for clear context separation:

// Format external repo content in prompt
const formatExternalRepoContent = (content: FetchedRepoContent) => `
<external-repository name="${content.repoAlias}" commit="${content.commitSha.slice(0,7)}">
${content.files.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')}
</external-repository>
`;
4. dashboard/server/prdGenerator.ts
Same changes for simple PRD mode.

5. dashboard/server/prdSessionManager.ts
Extend PRDSession interface:


selectedExternalRepos?: string[];  // IDs of repos to include this session
6. dashboard/src/components/IterativePRDGenerator.tsx
Add UI section for:

Showing linked repos (from project settings)
Toggling which repos to include in current session
Cache status indicator (fresh/stale/not cached)
Link to manage repos (opens settings)
7. New UI: dashboard/src/components/setup/ExternalReposConfig.tsx
New component for managing linked repos:

List of linked repos with:
Fetch strategy badge
Cache status (✓ cached, ⟳ stale, ○ not cached)
Last fetched timestamp
Add repo dialog:
URL input with validation
Alias (auto-suggested from repo name)
Strategy dropdown with descriptions
Optional: specific paths input (for 'specified' strategy)
Edit/remove repos
"Test Fetch" button to preview content size and files
"Refresh Cache" button to force re-fetch
Global "Clear Cache" action
Integration Flow

┌─────────────────────────────────────────────────────────┐
│                    Project Settings                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ External Repositories                             │   │
│  │  ├─ stripe/stripe-node [typescript-lib] ✓ cached │   │
│  │  ├─ vercel/next.js [readme-only] ⟳ stale         │   │
│  │  └─ [+ Add Repository]                           │   │
│  │                                                   │   │
│  │  Cache: 45MB / 2GB  [Clear Cache]                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  PRD Generator UI                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Include External Repos:                          │   │
│  │  ☑ stripe/stripe-node (✓ cached @ abc123f)       │   │
│  │  ☐ vercel/next.js                                │   │
│  │                                     [Manage →]   │   │
│  └─────────────────────────────────────────────────┘   │
│  [Generate PRD]                                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              externalRepoFetcher.ts                     │
│  1. Check cache for selected repos                      │
│  2. Fetch/clone if not cached or stale                  │
│  3. Extract content using strategy profile              │
│  4. Cache extraction for future use                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              iterativePrdGenerator.ts                   │
│  1. Get fetched content from externalRepoFetcher        │
│  2. Format as <external-repository> XML blocks          │
│  3. Build prompt with local + external context          │
│  4. Send to Claude CLI                                  │
└─────────────────────────────────────────────────────────┘
Cache Architecture

~/.ralph/repo-cache/
├── repos/
│   ├── a1b2c3d4/                          # sha256(url#branch)[:8]
│   │   ├── repo/                          # shallow git clone
│   │   │   ├── src/
│   │   │   ├── README.md
│   │   │   └── package.json
│   │   ├── metadata.json                  # RepoCacheEntry
│   │   └── extracted/
│   │       ├── typescript-lib.txt         # Pre-extracted by profile
│   │       ├── readme-only.txt
│   │       └── auto.txt
│   └── b2c3d4e5/
│       └── ...
└── index.json                             # { repos: { hash: url }, totalSize }
Freshness Check Flow:

git ls-remote <url> refs/heads/<branch> → get remote SHA (fast, no clone)
Compare with metadata.json.commitSha
If different → mark stale, re-fetch on next use
TTL fallback: if cachedAt > 24h ago, check remote regardless
Verification Plan
Add external repo - Add stripe/stripe-node via settings UI
Configure fetch strategy - Set to "typescript-lib"
Verify caching:
First fetch should clone and cache
Second fetch should be instant from cache
Check ~/.ralph/repo-cache/ structure
Test freshness:
Wait for TTL or manually modify metadata.json
Verify stale indicator appears
Force refresh and verify new SHA
Start PRD generation - Select the repo in PRD generator
Verify prompt - Check Claude receives the external content with commit SHA
Test private repo - Ensure gh auth works for private repos
Test cache cleanup - Add repos until over 2GB, verify LRU cleanup
Implementation Steps
Phase 1: Core Infrastructure
 Add types to dashboard/src/types/index.ts (all interfaces above)
 Create dashboard/server/externalRepoCache.ts (filesystem cache manager)
 Create dashboard/server/externalRepoFetcher.ts (fetch + extraction logic)
 Create dashboard/server/externalRepoManager.ts (CRUD for repo configs in SQLite)
Phase 2: MCP Support
 Create dashboard/server/mcpConfigManager.ts (MCP config generation + temp files)
 Add GITHUB_PERSONAL_ACCESS_TOKEN validation utility
Phase 3: WebSocket API
 Add WebSocket handlers to dashboard/server/index.ts
 Add external-repos:* commands and messages
Phase 4: PRD Generator Integration
 Modify dashboard/server/iterativePrdGenerator.ts:
Add selectedExternalRepos to session
Fetch static content via externalRepoFetcher
Build MCP instructions via mcpConfigManager
Pass --mcp-config to Claude CLI when needed
 Modify dashboard/server/prdGenerator.ts (same for simple mode)
Phase 5: Frontend UI
 Create dashboard/src/components/setup/ExternalReposConfig.tsx (settings page)
 Modify dashboard/src/components/IterativePRDGenerator.tsx (repo selection UI)
 Add GitHub token status indicator to settings
Phase 6: Testing & Verification
 Test static strategies (readme-only, typescript-lib, auto)
 Test caching (freshness, LRU cleanup)
 Test MCP strategies (mcp-only, hybrid) with GitHub token
 Test private repo access
MCP Integration Architecture
How It Works
When repos use mcp-only or hybrid strategy, we pass the GitHub MCP server config to Claude CLI, allowing Claude to query repos on-demand during PRD generation.

MCP Server Setup

// MCP config passed to Claude CLI via --mcp-config flag
const mcpConfig = {
  mcpServers: {
    github: {
      command: 'npx',
      args: ['-y', '@github/github-mcp-server'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PAT || ''
      }
    }
  }
};
Integration with Claude CLI Spawn

// In iterativePrdGenerator.ts / prdGenerator.ts
async runClaude(prompt: string, options: { enableMcp?: boolean }): Promise<void> {
  const claudeArgs = [
    '-p',
    '--output-format=stream-json',
    '--dangerously-skip-permissions'
  ];

  // Add MCP config if any repos use mcp-only or hybrid strategy
  if (options.enableMcp) {
    const mcpConfigPath = await this.writeTempMcpConfig();
    claudeArgs.push('--mcp-config', mcpConfigPath);
  }

  this.process = spawn('claude', claudeArgs, {
    cwd: this.projectPath,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: {
      ...process.env,
      GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PAT || '',
    }
  });
}
Prompt Structure with MCP

<external-repositories>
<!-- Static content for repos using auto/typescript-lib/etc strategies -->
<external-repository name="stripe/stripe-node" commit="abc123f">
### README.md
...
</external-repository>
</external-repositories>

<mcp-github-instructions>
You have access to the GitHub MCP server for on-demand queries.

Repositories available via MCP:
- supabase/supabase-js (Purpose: Database & Auth)
  Hints: Search for auth patterns, find session management code
- vercel/ai (Purpose: AI SDK reference)
  Hints: Look for streaming patterns, find tool use examples

Available MCP actions:
- Search code in repositories
- Get specific file contents
- List directory structures
- Search issues/PRs for implementation context
</mcp-github-instructions>

<task>
Generate a PRD for...
</task>
Strategy Decision Matrix
Strategy	Static Content	MCP Queries	Best For
readme-only	README only	❌	Quick reference
docs-folder	All docs/ markdown	❌	Documentation-heavy repos
typescript-lib	src/, types/, .d.ts	❌	TypeScript SDKs (core integration)
python-lib	*.py, pyproject.toml	❌	Python libraries
auto	Key files auto-detected	❌	General purpose
full-clone	Everything (filtered)	❌	When you need comprehensive context
mcp-only	❌ None	✅	Large repos, exploratory queries
hybrid	Core files (auto)	✅	Best of both - overview + depth
New Files for MCP Support
dashboard/server/mcpConfigManager.ts

export class McpConfigManager {
  private tempConfigPath: string | null = null;

  // Check if GitHub token is configured
  async isGitHubTokenConfigured(): Promise<boolean>;

  // Write temp MCP config file for Claude CLI
  async writeTempConfig(repos: ExternalRepoReference[]): Promise<string>;

  // Build MCP instructions for prompt
  buildMcpInstructions(repos: ExternalRepoReference[]): string;

  // Cleanup temp files
  cleanup(): void;
}
UI Changes for MCP
In ExternalReposConfig.tsx:

Show GitHub token status (configured/not configured)
"Configure GitHub Token" button → opens settings
For mcp-only and hybrid strategies, show MCP hints input
Strategy dropdown descriptions explain MCP vs static
In IterativePRDGenerator.tsx:

Show which repos will use MCP (badge/icon)
Warning if MCP repos selected but token not configured
GitHub Token Configuration
Token resolution order (first found wins):

Environment variable: GITHUB_PERSONAL_ACCESS_TOKEN
Stored in Ralph settings (via PreferencesRepository)
Settings Storage

// In PreferencesRepository (user_preferences table)
PreferenceKeys.GITHUB_PAT = 'github.personalAccessToken'

// Encrypted/obfuscated storage (not plaintext)
// Show masked value in UI: ghp_****xxxx
UI for Token Management
In ExternalReposConfig.tsx or dedicated Settings section:

Status indicator: ✓ Configured / ⚠ Not configured
Input field to set/update token (password type, masked)
"Test Token" button to validate with gh auth status or API call
Clear token button
Note about required scopes: repo (for private repos), read:org (optional)
Token Validation

// In mcpConfigManager.ts
async getGitHubToken(): Promise<string | null> {
  // 1. Check environment
  if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
    return process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  }

  // 2. Check stored preferences
  const stored = await preferencesRepo.get(PreferenceKeys.GITHUB_PAT);
  if (stored) {
    return stored;
  }

  return null;
}

async validateToken(token: string): Promise<{ valid: boolean; scopes?: string[]; error?: string }> {
  // Call GitHub API to validate
  // GET https://api.github.com/user with Authorization header
  // Check X-OAuth-Scopes response header for permissions
}