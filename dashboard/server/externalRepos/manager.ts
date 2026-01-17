/**
 * External Repository Manager
 *
 * CRUD operations for managing external repository references.
 * Stores repo configurations in project settings_json.
 */

import { randomUUID } from 'crypto';
import { getProjectRepository } from '../database/repositories/ProjectRepository.js';
import { ExternalRepoReference, RepoFetchStrategy } from './types';
import { parseGitHubUrl, getDefaultBranch } from './fetcher.js';

const SETTINGS_KEY = 'externalRepos';

/**
 * Get external repos for a project
 */
export function getExternalRepos(projectId: string): ExternalRepoReference[] {
  const repository = getProjectRepository();
  const settings = repository.getSettings(projectId);

  if (!settings || !settings[SETTINGS_KEY]) {
    return [];
  }

  return settings[SETTINGS_KEY] as ExternalRepoReference[];
}

/**
 * Get a single external repo by ID
 */
export function getExternalRepo(
  projectId: string,
  repoId: string
): ExternalRepoReference | null {
  const repos = getExternalRepos(projectId);
  return repos.find(r => r.id === repoId) || null;
}

/**
 * Add an external repo to a project
 */
export async function addExternalRepo(
  projectId: string,
  options: {
    url: string;
    alias: string;
    branch?: string;
    fetchStrategy?: RepoFetchStrategy;
    paths?: string[];
    mcpHints?: string[];
    maxTokens?: number;
    purpose?: string;
    cacheTTLHours?: number;
    disableCache?: boolean;
  }
): Promise<ExternalRepoReference> {
  // Validate URL
  const parsed = parseGitHubUrl(options.url);
  if (!parsed.isValid) {
    throw new Error(`Invalid GitHub URL: ${options.url}`);
  }

  // Get default branch if not specified
  let branch = options.branch;
  if (!branch) {
    try {
      branch = await getDefaultBranch(parsed.owner, parsed.repo);
    } catch {
      branch = 'main';
    }
  }

  const repo: ExternalRepoReference = {
    id: randomUUID(),
    url: options.url,
    alias: options.alias,
    branch,
    fetchStrategy: options.fetchStrategy || 'auto',
    paths: options.paths,
    mcpHints: options.mcpHints,
    maxTokens: options.maxTokens,
    purpose: options.purpose,
    addedAt: new Date().toISOString(),
    cacheTTLHours: options.cacheTTLHours,
    disableCache: options.disableCache,
  };

  // Get current repos
  const repos = getExternalRepos(projectId);

  // Check for duplicates
  const existing = repos.find(r => r.url === options.url);
  if (existing) {
    throw new Error(`Repository already added: ${existing.alias}`);
  }

  repos.push(repo);

  // Save
  saveExternalRepos(projectId, repos);

  return repo;
}

/**
 * Update an external repo
 */
export function updateExternalRepo(
  projectId: string,
  repoId: string,
  updates: Partial<Omit<ExternalRepoReference, 'id' | 'addedAt'>>
): ExternalRepoReference {
  const repos = getExternalRepos(projectId);
  const index = repos.findIndex(r => r.id === repoId);

  if (index === -1) {
    throw new Error(`Repository not found: ${repoId}`);
  }

  // Apply updates
  const updated = {
    ...repos[index],
    ...updates,
  };

  repos[index] = updated;
  saveExternalRepos(projectId, repos);

  return updated;
}

/**
 * Remove an external repo
 */
export function removeExternalRepo(projectId: string, repoId: string): void {
  const repos = getExternalRepos(projectId);
  const index = repos.findIndex(r => r.id === repoId);

  if (index === -1) {
    throw new Error(`Repository not found: ${repoId}`);
  }

  repos.splice(index, 1);
  saveExternalRepos(projectId, repos);
}

/**
 * Get repos by IDs
 */
export function getExternalReposByIds(
  projectId: string,
  repoIds: string[]
): ExternalRepoReference[] {
  const repos = getExternalRepos(projectId);
  return repos.filter(r => repoIds.includes(r.id));
}

/**
 * Get repos that use MCP (mcp-only or hybrid strategies)
 */
export function getMcpEnabledRepos(projectId: string): ExternalRepoReference[] {
  const repos = getExternalRepos(projectId);
  return repos.filter(r => r.fetchStrategy === 'mcp-only' || r.fetchStrategy === 'hybrid');
}

/**
 * Mark a repo as fetched (updates lastFetchedAt and cachedCommitSha)
 */
export function markRepoFetched(
  projectId: string,
  repoId: string,
  commitSha: string
): void {
  updateExternalRepo(projectId, repoId, {
    lastFetchedAt: new Date().toISOString(),
    cachedCommitSha: commitSha,
  });
}

/**
 * Save external repos to project settings
 */
function saveExternalRepos(projectId: string, repos: ExternalRepoReference[]): void {
  const repository = getProjectRepository();
  const settings = repository.getSettings(projectId) || {};

  settings[SETTINGS_KEY] = repos;
  repository.updateSettings(projectId, settings);
}

/**
 * Get external repos count for a project
 */
export function getExternalReposCount(projectId: string): number {
  return getExternalRepos(projectId).length;
}

/**
 * Validate repo URL and return info
 */
export async function validateRepoUrl(url: string): Promise<{
  valid: boolean;
  owner?: string;
  repo?: string;
  defaultBranch?: string;
  error?: string;
}> {
  const parsed = parseGitHubUrl(url);

  if (!parsed.isValid) {
    return { valid: false, error: 'Invalid GitHub URL format' };
  }

  try {
    const defaultBranch = await getDefaultBranch(parsed.owner, parsed.repo);

    return {
      valid: true,
      owner: parsed.owner,
      repo: parsed.repo,
      defaultBranch,
    };
  } catch (error) {
    return {
      valid: false,
      owner: parsed.owner,
      repo: parsed.repo,
      error: error instanceof Error ? error.message : 'Failed to access repository',
    };
  }
}
