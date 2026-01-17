/**
 * External Repositories Module
 *
 * Main entry point for external GitHub repository management.
 * Provides a unified API for fetching, caching, and building context
 * from external repositories for use in PRD generation.
 */

// Re-export types
export type {
  RepoFetchStrategy,
  ExternalRepoReference,
  RepoCacheEntry,
  RepoCacheStatus,
  FetchedFile,
  FetchedRepoContent,
  GitHubMcpConfig,
  ExtractionProfile,
  ParsedGitHubUrl,
  GitHubRepoInfo,
  GitHubTokenInfo,
  McpServerConfig,
} from './types';

// Re-export values
export {
  EXTRACTION_PROFILES,
  FETCH_LIMITS,
} from './types';

// Re-export cache functions
export {
  getCacheId,
  getCacheDir,
  getCachedContent,
  setCachedContent,
  getCacheEntry,
  checkCacheStatus,
  clearRepoCache,
  clearAllCache,
  getTotalCacheSize,
  performLruCleanup,
  getCacheStats,
  getProfileForStrategy,
} from './cache.js';

// Re-export fetcher functions
export {
  parseGitHubUrl,
  getGitHubToken,
  getRepoInfo,
  getDefaultBranch,
  getRemoteCommitSha,
  fetchRepoContent,
  fetchMultipleRepos,
} from './fetcher.js';

// Re-export manager functions
export {
  getExternalRepos,
  getExternalRepo,
  addExternalRepo,
  updateExternalRepo,
  removeExternalRepo,
  getExternalReposByIds,
  getMcpEnabledRepos,
  markRepoFetched,
  getExternalReposCount,
  validateRepoUrl,
} from './manager.js';

// Re-export context builder functions
export {
  buildRepoContext,
  buildExternalReposContext,
  buildMcpInstructions,
  buildFullExternalContext,
  estimateTokenCount,
  truncateContextToTokens,
  buildReposSummary,
} from './contextBuilder.js';

// ============================================================================
// High-level API
// ============================================================================

import { ExternalRepoReference, FetchedRepoContent, GitHubMcpConfig } from './types';
import { getExternalRepos, getExternalReposByIds, getMcpEnabledRepos } from './manager.js';
import { fetchMultipleRepos, getGitHubToken } from './fetcher.js';
import { checkCacheStatus, clearRepoCache, clearAllCache, getCacheStats } from './cache.js';
import { buildFullExternalContext, truncateContextToTokens, buildReposSummary } from './contextBuilder.js';

/**
 * Fetch and build context for selected repositories
 */
export async function fetchAndBuildContext(
  projectId: string,
  repoIds: string[],
  options: {
    forceRefresh?: boolean;
    maxTokens?: number;
  } = {}
): Promise<{
  context: string;
  contents: FetchedRepoContent[];
  summary: string;
}> {
  // Get the repos
  const repos = getExternalReposByIds(projectId, repoIds);

  if (repos.length === 0) {
    return { context: '', contents: [], summary: 'No repositories selected' };
  }

  // Fetch content
  let contents = await fetchMultipleRepos(repos, options.forceRefresh);

  // Truncate if needed
  if (options.maxTokens) {
    contents = truncateContextToTokens(contents, options.maxTokens);
  }

  // Build context
  const context = buildFullExternalContext(contents, repos);
  const summary = buildReposSummary(contents);

  return { context, contents, summary };
}

/**
 * Get cache status for multiple repositories
 */
export function getReposCacheStatus(
  projectId: string,
  repoIds?: string[]
): Record<string, { cached: boolean; fresh: boolean; reason?: string }> {
  let repos: ExternalRepoReference[];

  if (repoIds && repoIds.length > 0) {
    repos = getExternalReposByIds(projectId, repoIds);
  } else {
    repos = getExternalRepos(projectId);
  }

  const result: Record<string, { cached: boolean; fresh: boolean; reason?: string }> = {};

  for (const repo of repos) {
    const branch = repo.branch || 'main';
    const status = checkCacheStatus(repo.url, branch);
    result[repo.id] = {
      cached: status.cached,
      fresh: status.fresh,
      reason: status.reason,
    };
  }

  return result;
}

/**
 * Get MCP configuration status
 */
export function getMcpStatus(projectId: string): GitHubMcpConfig {
  const token = getGitHubToken();
  const mcpRepos = getMcpEnabledRepos(projectId);

  return {
    enabled: mcpRepos.length > 0,
    tokenConfigured: token !== null,
    reposWithMcp: mcpRepos.map(r => r.id),
  };
}

/**
 * Clear cache for specific repos or all
 */
export function clearCache(projectId: string, repoIds?: string[]): void {
  if (!repoIds || repoIds.length === 0) {
    clearAllCache();
    return;
  }

  const repos = getExternalReposByIds(projectId, repoIds);
  for (const repo of repos) {
    clearRepoCache(repo.url, repo.branch || 'main');
  }
}

/**
 * Get overall cache statistics
 */
export function getCacheStatistics(): {
  totalEntries: number;
  totalSize: number;
  totalSizeFormatted: string;
} {
  const stats = getCacheStats();
  const sizeFormatted = formatBytes(stats.totalSize);

  return {
    totalEntries: stats.totalEntries,
    totalSize: stats.totalSize,
    totalSizeFormatted: sizeFormatted,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}
