
Summary
This unified plan merges the best elements from both implementation plans:

claude_plan_code_interface.md: MCP integration, hybrid strategies, GitHub token management
claude_plan_web_interface.md: Modular code structure, detailed fetcher/cache implementation, UI components
Key Design Decisions
Decision	Choice	Rationale
Scope	Project-level linked repos	Set once, optionally select per PRD session
Fetch Strategies	9 strategies including mcp-only and hybrid	Maximum flexibility for different repo types
Caching	SQLite metadata + filesystem content	Fast lookups + large content storage
MCP Integration	Via --mcp-config flag to Claude CLI	Enables on-demand queries during generation
Token Storage	Env var first, then Ralph preferences	Both dev convenience and UI configuration
Fetch Strategy Matrix
Strategy	What's Fetched	MCP	Best For
readme-only	README.md only	❌	Quick reference
docs-folder	README + docs/*.md	❌	Documentation-heavy repos
specified	User-defined paths	❌	Precise control
auto	Key files auto-detected	❌	General purpose (default)
typescript-lib	src/, types/, *.d.ts	❌	TypeScript SDKs
python-lib	*.py, pyproject.toml	❌	Python libraries
full-clone	Everything (filtered)	❌	Comprehensive context
mcp-only	README only (static)	✅	Large repos, exploratory
hybrid	Core files (auto)	✅	Best of both worlds
File Structure

dashboard/server/externalRepos/
├── index.ts              # Factory & exports
├── types.ts              # Internal types & constants
├── cache.ts              # SQLite + filesystem cache
├── fetcher.ts            # Fetch logic (HTTP, gh CLI, clone)
├── manager.ts            # CRUD for repo configs
├── contextBuilder.ts     # Build prompt context
└── mcpConfigManager.ts   # MCP config generation

dashboard/src/components/
├── setup/
│   └── ExternalReposConfig.tsx    # Settings page for managing repos
└── (modify) IterativePRDGenerator.tsx  # Add repo selection UI
Types (dashboard/src/types/index.ts)

// ============ FETCH STRATEGIES ============

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

// ============ EXTERNAL REPO REFERENCE ============

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

// ============ CACHE TYPES ============

export interface RepoCacheEntry {
  id: string;                     // Hash of url#branch
  url: string;
  branch: string;
  commitSha: string;
  cachedAt: string;
  lastAccessedAt: string;
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

// ============ FETCHED CONTENT ============

export interface FetchedRepoContent {
  repoId: string;
  repoAlias: string;
  repoUrl: string;
  commitSha: string;
  fromCache: boolean;
  files: Array<{
    path: string;
    content: string;
    size: number;
    truncated: boolean;
  }>;
  totalSize: number;
  fetchedAt: string;
  mcpInstructions?: string[];     // For MCP strategies
  error?: string;
}

// ============ MCP CONFIG ============

export interface GitHubMcpConfig {
  enabled: boolean;
  tokenConfigured: boolean;
  reposWithMcp: string[];         // Repo IDs using mcp-only or hybrid
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
  payload: { ids: string[]; forceRefresh?: boolean };
}

export interface ExternalReposCacheStatusCommand {
  type: 'external-repos:cache-status';
  payload: { ids: string[] };
}

export interface ExternalReposClearCacheCommand {
  type: 'external-repos:clear-cache';
  payload: { ids?: string[] };    // Empty = clear all
}

export interface ExternalReposMcpStatusCommand {
  type: 'external-repos:mcp-status';
}

export interface ExternalReposSetTokenCommand {
  type: 'external-repos:set-token';
  payload: { token: string };
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
  payload: Record<string, RepoCacheStatus>;
}

export interface ExternalReposMcpStatusMessage extends WSMessage {
  type: 'external-repos:mcp-status';
  payload: GitHubMcpConfig;
}

export interface ExternalReposErrorMessage extends WSMessage {
  type: 'external-repos:error';
  payload: { error: string; repoId?: string };
}
Implementation Phases
Phase 1: Core Infrastructure (Backend)
1.1 Types & Constants (dashboard/server/externalRepos/types.ts)

Extraction profiles with include/exclude patterns
Fetch limits (50KB/file, 500KB/repo, 24h TTL)
1.2 Cache System (dashboard/server/externalRepos/cache.ts)

SQLite table: repo_cache (id, url, branch, commit_sha, cached_at, size_bytes, etc.)
Filesystem: ~/.ralph/repo-cache/content/{hash}/{profile}.txt
LRU cleanup when exceeding 2GB
Freshness check via git ls-remote
1.3 Fetcher (dashboard/server/externalRepos/fetcher.ts)

parseGitHubUrl() - Extract owner/repo
getDefaultBranch() - Via gh API or HTTP
getRemoteCommitSha() - Via git ls-remote
fetchFile() - Via gh API or raw.githubusercontent.com
cloneRepo() - git clone --depth 1
extractByProfile() - Apply include/exclude patterns
fetchByStrategy() - Main entry point
1.4 Manager (dashboard/server/externalRepos/manager.ts)

CRUD operations storing in projects.settings_json
1.5 Context Builder (dashboard/server/externalRepos/contextBuilder.ts)

buildContext() - Format files as XML blocks
buildMcpInstructions() - Generate MCP hints section
Phase 2: MCP Integration
2.1 MCP Config Manager (dashboard/server/externalRepos/mcpConfigManager.ts)


export class McpConfigManager {
  async getGitHubToken(): Promise<string | null>;
  async validateToken(token: string): Promise<{ valid: boolean; scopes?: string[] }>;
  async writeTempConfig(repos: ExternalRepoReference[]): Promise<string>;
  buildMcpInstructions(repos: ExternalRepoReference[]): string;
  cleanup(): void;
}
2.2 Token Management

Check process.env.GITHUB_PERSONAL_ACCESS_TOKEN first
Fall back to PreferencesRepository.get('github.personalAccessToken')
Validate via GitHub API (GET /user)
Phase 3: WebSocket API
Add handlers to dashboard/server/index.ts:

external-repos:list
external-repos:add
external-repos:remove
external-repos:update
external-repos:fetch
external-repos:cache-status
external-repos:clear-cache
external-repos:mcp-status
external-repos:set-token
Phase 4: PRD Generator Integration
4.1 Session Extension (prdSessionManager.ts)


interface PRDSession {
  // ... existing fields
  selectedExternalRepos?: string[];
}
4.2 Prompt Building (iterativePrdGenerator.ts)


async buildPRDPrompt(options: {
  // ... existing
  externalRepoIds?: string[];
}): Promise<string> {
  // 1. Fetch content for selected repos
  // 2. Build context with <external-repository> tags
  // 3. Add MCP instructions if any repos use mcp-only/hybrid
  // 4. Return combined prompt
}
4.3 Claude CLI Invocation


async runClaude(prompt: string, enableMcp: boolean): Promise<void> {
  const args = ['-p', '--output-format=stream-json', '--dangerously-skip-permissions'];

  if (enableMcp) {
    const configPath = await this.mcpConfigManager.writeTempConfig(repos);
    args.push('--mcp-config', configPath);
  }

  this.process = spawn('claude', args, {
    env: { ...process.env, GITHUB_PERSONAL_ACCESS_TOKEN: token }
  });
}
Phase 5: Frontend UI
5.1 External Repos Config (dashboard/src/components/setup/ExternalReposConfig.tsx)

List repos with strategy badges and cache status
Add/Edit dialog with strategy-specific options
MCP hints input for mcp-only/hybrid strategies
GitHub token configuration (masked input, test button)
Cache management (per-repo refresh, clear all)
5.2 PRD Generator Integration (IterativePRDGenerator.tsx)

Checkbox list of available repos
MCP indicator badge for mcp-only/hybrid repos
Warning if MCP repos selected but no token configured
Link to "Manage repositories →"
Prompt Structure

<external-repositories>
<repository name="stripe/stripe-node" commit="abc123f" cached="true">
### README.md
[content]



### src/index.ts
[content]


</repository>
</external-repositories>

<mcp-github-instructions>
You have access to the GitHub MCP server for on-demand queries.

Repositories available via MCP:
- supabase/supabase-js (Database & Auth)
  - Search for auth patterns and session management
  - Find database query examples
- vercel/ai (AI SDK)
  - Look for streaming response patterns

Available MCP actions:
- Search code in repositories
- Get specific file contents
- List directory structures
- Search issues/PRs for context
</mcp-github-instructions>

<task>
[PRD generation prompt...]
</task>
Cache Architecture

~/.ralph/repo-cache/
├── content/
│   ├── a1b2c3d4/                    # sha256(url#branch)[:8]
│   │   ├── auto.txt                 # Extracted by profile
│   │   ├── typescript-lib.txt
│   │   └── readme-only.txt
│   └── b2c3d4e5/
│       └── ...
└── (metadata in SQLite: ~/.ralph/ralph.db)
Freshness Check Flow:

Check if TTL expired (default 24h)
If expired or freshnessCheck enabled: git ls-remote to get remote SHA
Compare with cached SHA
If different → mark stale, re-fetch on next use
Verification Checklist
 Add public repo with auto strategy → verify files fetched
 Add same repo again → verify served from cache (instant)
 Wait for TTL or modify metadata → verify stale indicator
 Force refresh → verify new SHA
 Add private repo → verify gh auth required
 Add repo with mcp-only → verify MCP instructions in prompt
 Add repo with hybrid → verify both static content and MCP hints
 Generate PRD with external repos → verify context included
 Test cache cleanup (fill to 2GB) → verify LRU eviction
 Test GitHub token via UI → verify validation works
Implementation Order

Phase 1: Core Infrastructure
├── 1. dashboard/server/externalRepos/types.ts
├── 2. dashboard/server/externalRepos/cache.ts
├── 3. dashboard/server/externalRepos/fetcher.ts
├── 4. dashboard/server/externalRepos/manager.ts
├── 5. dashboard/server/externalRepos/contextBuilder.ts
└── 6. dashboard/server/externalRepos/index.ts

Phase 2: MCP Integration
├── 7. dashboard/server/externalRepos/mcpConfigManager.ts
└── 8. Token validation utility

Phase 3: WebSocket API
└── 9. dashboard/server/index.ts (add handlers)

Phase 4: PRD Generator
├── 10. dashboard/server/prdSessionManager.ts (extend session)
├── 11. dashboard/server/iterativePrdGenerator.ts (add context)
└── 12. dashboard/server/prdGenerator.ts (simple mode)

Phase 5: Frontend
├── 13. dashboard/src/types/index.ts (add types)
├── 14. dashboard/src/components/setup/ExternalReposConfig.tsx
└── 15. dashboard/src/components/IterativePRDGenerator.tsx (modify)

Phase 6: Testing
├── 16. Test static strategies
├── 17. Test caching
├── 18. Test MCP strategies
└── 19. Test private repos
Dependencies
minimatch - For glob pattern matching in extraction
uuid - For generating repo IDs (likely already installed)
GitHub MCP server: npx @github/github-mcp-server