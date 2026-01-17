/**
 * External Repository Fetcher
 *
 * Handles fetching content from GitHub repos using:
 * - GitHub API (for single files, directory listings)
 * - raw.githubusercontent.com (for file content)
 * - git clone --depth 1 (for full clone strategy)
 * - gh CLI (when authenticated)
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { minimatch } from 'minimatch';
import {
  ExternalRepoReference,
  FetchedFile,
  FetchedRepoContent,
  ParsedGitHubUrl,
  GitHubRepoInfo,
  ExtractionProfile,
  EXTRACTION_PROFILES,
  FETCH_LIMITS,
} from './types.js';
import {
  getCachedContent,
  setCachedContent,
  checkCacheStatus,
  getProfileForStrategy,
} from './cache.js';

// ============================================================================
// URL Parsing
// ============================================================================

/**
 * Parse a GitHub URL to extract owner and repo
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl {
  // Support formats:
  // https://github.com/owner/repo
  // https://github.com/owner/repo.git
  // git@github.com:owner/repo.git
  // github.com/owner/repo

  const patterns = [
    /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/,
    /^([\w.-]+)\/([\w.-]+)$/,  // owner/repo format
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
        isValid: true,
      };
    }
  }

  return { owner: '', repo: '', isValid: false };
}

// ============================================================================
// GitHub API Helpers
// ============================================================================

/**
 * Get the GitHub token from environment or preferences
 */
export function getGitHubToken(): string | null {
  // Check environment first
  const envToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN;
  if (envToken) return envToken;

  // Could also check stored preferences here in the future
  return null;
}

/**
 * Make a GitHub API request
 */
async function githubApiRequest<T>(
  endpoint: string,
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Ralph-Wiggum-Dashboard',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`https://api.github.com${endpoint}`, { headers });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Get repo info (default branch, private status)
 */
export async function getRepoInfo(owner: string, repo: string): Promise<GitHubRepoInfo> {
  const token = getGitHubToken();

  const data = await githubApiRequest<{
    default_branch: string;
    private: boolean;
  }>(`/repos/${owner}/${repo}`, token);

  return {
    owner,
    repo,
    defaultBranch: data.default_branch,
    private: data.private,
  };
}

/**
 * Get the default branch for a repo
 */
export async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const info = await getRepoInfo(owner, repo);
  return info.defaultBranch;
}

/**
 * Get remote commit SHA using git ls-remote
 */
export function getRemoteCommitSha(url: string, branch: string): string | null {
  try {
    const result = execSync(`git ls-remote ${url} refs/heads/${branch}`, {
      encoding: 'utf-8',
      timeout: 10000,
    });
    const sha = result.split('\t')[0];
    return sha || null;
  } catch {
    return null;
  }
}

// ============================================================================
// File Fetching
// ============================================================================

/**
 * Fetch a single file from raw.githubusercontent.com
 */
async function fetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * List directory contents using GitHub API
 */
async function listDirectory(
  owner: string,
  repo: string,
  branch: string,
  dirPath: string = ''
): Promise<Array<{ path: string; type: 'file' | 'dir'; size: number }>> {
  const token = getGitHubToken();
  const endpoint = `/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`;

  try {
    const data = await githubApiRequest<Array<{
      path: string;
      type: string;
      size: number;
    }>>(endpoint, token);

    return data.map(item => ({
      path: item.path,
      type: item.type === 'dir' ? 'dir' : 'file',
      size: item.size || 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Recursively list all files in a repo
 */
async function listAllFiles(
  owner: string,
  repo: string,
  branch: string,
  maxFiles: number = 500
): Promise<Array<{ path: string; size: number }>> {
  const token = getGitHubToken();
  const files: Array<{ path: string; size: number }> = [];

  // Use the tree API for efficiency
  try {
    const data = await githubApiRequest<{
      tree: Array<{ path: string; type: string; size?: number }>;
      truncated: boolean;
    }>(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, token);

    for (const item of data.tree) {
      if (item.type === 'blob' && files.length < maxFiles) {
        files.push({ path: item.path, size: item.size || 0 });
      }
    }
  } catch {
    // Fall back to directory listing if tree API fails
    const dirsToProcess = [''];

    while (dirsToProcess.length > 0 && files.length < maxFiles) {
      const dir = dirsToProcess.shift()!;
      const items = await listDirectory(owner, repo, branch, dir);

      for (const item of items) {
        if (files.length >= maxFiles) break;

        if (item.type === 'dir') {
          dirsToProcess.push(item.path);
        } else {
          files.push({ path: item.path, size: item.size });
        }
      }
    }
  }

  return files;
}

// ============================================================================
// Extraction Logic
// ============================================================================

/**
 * Check if a file path matches any of the include patterns
 */
function matchesInclude(filePath: string, patterns: string[]): boolean {
  return patterns.some(pattern => minimatch(filePath, pattern, { matchBase: true }));
}

/**
 * Check if a file path matches any of the exclude patterns
 */
function matchesExclude(filePath: string, patterns: string[]): boolean {
  return patterns.some(pattern => minimatch(filePath, pattern, { matchBase: true }));
}

/**
 * Filter files based on extraction profile
 */
function filterFilesByProfile(
  files: Array<{ path: string; size: number }>,
  profile: ExtractionProfile
): Array<{ path: string; size: number }> {
  return files
    .filter(f => {
      // Check include patterns
      if (!matchesInclude(f.path, profile.include)) return false;
      // Check exclude patterns
      if (matchesExclude(f.path, profile.exclude)) return false;
      // Check file size
      if (f.size > profile.maxFileSize) return false;
      return true;
    })
    .slice(0, profile.maxFiles);
}

// ============================================================================
// Clone-based Fetching
// ============================================================================

/**
 * Clone a repo and extract files based on profile
 */
async function cloneAndExtract(
  url: string,
  branch: string,
  profile: ExtractionProfile
): Promise<{ files: FetchedFile[]; commitSha: string }> {
  const tmpDir = path.join(os.tmpdir(), `ralph-clone-${Date.now()}`);

  try {
    // Shallow clone
    execSync(`git clone --depth 1 --branch ${branch} ${url} ${tmpDir}`, {
      encoding: 'utf-8',
      timeout: 60000,
    });

    // Get commit SHA
    const commitSha = execSync('git rev-parse HEAD', {
      cwd: tmpDir,
      encoding: 'utf-8',
    }).trim();

    // Walk directory and collect files
    const files: FetchedFile[] = [];
    let totalSize = 0;

    const walkDir = (dir: string, basePath: string = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!matchesExclude(relativePath, profile.exclude)) {
            walkDir(fullPath, relativePath);
          }
        } else if (entry.isFile()) {
          // Check if file matches profile
          if (
            matchesInclude(relativePath, profile.include) &&
            !matchesExclude(relativePath, profile.exclude) &&
            files.length < profile.maxFiles
          ) {
            const stat = fs.statSync(fullPath);

            if (stat.size <= profile.maxFileSize) {
              let content = fs.readFileSync(fullPath, 'utf-8');
              let truncated = false;

              // Truncate if adding this would exceed repo size limit
              if (totalSize + content.length > FETCH_LIMITS.MAX_REPO_SIZE) {
                const remaining = FETCH_LIMITS.MAX_REPO_SIZE - totalSize;
                if (remaining > 1000) {
                  content = content.slice(0, remaining) + '\n\n[Content truncated due to size limit]';
                  truncated = true;
                } else {
                  return; // Skip this file
                }
              }

              files.push({
                path: relativePath,
                content,
                size: content.length,
                truncated,
              });
              totalSize += content.length;
            }
          }
        }
      }
    };

    walkDir(tmpDir);

    return { files, commitSha };
  } finally {
    // Cleanup
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  }
}

// ============================================================================
// API-based Fetching
// ============================================================================

/**
 * Fetch files using GitHub API (for non-clone strategies)
 */
async function fetchFilesViaApi(
  owner: string,
  repo: string,
  branch: string,
  profile: ExtractionProfile
): Promise<{ files: FetchedFile[]; commitSha: string }> {
  // Get commit SHA
  const commitSha = getRemoteCommitSha(`https://github.com/${owner}/${repo}`, branch) || 'unknown';

  // List all files
  const allFiles = await listAllFiles(owner, repo, branch, profile.maxFiles * 2);

  // Filter by profile
  const filteredFiles = filterFilesByProfile(allFiles, profile);

  // Fetch content for each file
  const files: FetchedFile[] = [];
  let totalSize = 0;

  for (const file of filteredFiles) {
    if (totalSize >= FETCH_LIMITS.MAX_REPO_SIZE) break;

    const content = await fetchRawFile(owner, repo, branch, file.path);
    if (content === null) continue;

    let finalContent = content;
    let truncated = false;

    // Truncate if too large
    if (content.length > profile.maxFileSize) {
      finalContent = content.slice(0, profile.maxFileSize) + '\n\n[Content truncated due to size limit]';
      truncated = true;
    }

    // Check total size
    if (totalSize + finalContent.length > FETCH_LIMITS.MAX_REPO_SIZE) {
      const remaining = FETCH_LIMITS.MAX_REPO_SIZE - totalSize;
      if (remaining > 1000) {
        finalContent = finalContent.slice(0, remaining) + '\n\n[Content truncated due to size limit]';
        truncated = true;
      } else {
        break;
      }
    }

    files.push({
      path: file.path,
      content: finalContent,
      size: finalContent.length,
      truncated,
    });
    totalSize += finalContent.length;
  }

  return { files, commitSha };
}

// ============================================================================
// Main Fetch Function
// ============================================================================

/**
 * Fetch repository content based on strategy
 */
export async function fetchRepoContent(
  repo: ExternalRepoReference,
  forceRefresh: boolean = false
): Promise<FetchedRepoContent> {
  const parsed = parseGitHubUrl(repo.url);
  if (!parsed.isValid) {
    return {
      repoId: repo.id,
      repoAlias: repo.alias,
      repoUrl: repo.url,
      commitSha: '',
      fromCache: false,
      files: [],
      totalSize: 0,
      fetchedAt: new Date().toISOString(),
      error: `Invalid GitHub URL: ${repo.url}`,
    };
  }

  // Determine branch
  let branch = repo.branch;
  if (!branch) {
    try {
      branch = await getDefaultBranch(parsed.owner, parsed.repo);
    } catch {
      branch = 'main';  // Fallback
    }
  }

  // Get profile based on strategy
  const profileName = getProfileForStrategy(repo.fetchStrategy);
  const profile = EXTRACTION_PROFILES[profileName] || EXTRACTION_PROFILES['auto'];

  // Check cache (unless force refresh)
  if (!forceRefresh && !repo.disableCache) {
    const cached = getCachedContent(repo.url, branch, profileName);
    if (cached) {
      const status = checkCacheStatus(repo.url, branch);
      if (status.fresh) {
        return {
          repoId: repo.id,
          repoAlias: repo.alias,
          repoUrl: repo.url,
          commitSha: cached.commitSha,
          fromCache: true,
          files: cached.files,
          totalSize: cached.files.reduce((sum, f) => sum + f.size, 0),
          fetchedAt: new Date().toISOString(),
          mcpInstructions: repo.mcpHints,
        };
      }
    }
  }

  try {
    let result: { files: FetchedFile[]; commitSha: string };

    // Choose fetch method based on strategy
    if (repo.fetchStrategy === 'full-clone') {
      result = await cloneAndExtract(repo.url, branch, profile);
    } else if (repo.fetchStrategy === 'specified' && repo.paths) {
      // For specified strategy, create a custom profile
      const customProfile: ExtractionProfile = {
        ...profile,
        include: repo.paths,
      };
      result = await fetchFilesViaApi(parsed.owner, parsed.repo, branch, customProfile);
    } else {
      result = await fetchFilesViaApi(parsed.owner, parsed.repo, branch, profile);
    }

    // Cache the result
    if (!repo.disableCache) {
      setCachedContent(
        repo.url,
        branch,
        profileName,
        result.files,
        result.commitSha,
        repo.cacheTTLHours || FETCH_LIMITS.DEFAULT_TTL_HOURS
      );
    }

    return {
      repoId: repo.id,
      repoAlias: repo.alias,
      repoUrl: repo.url,
      commitSha: result.commitSha,
      fromCache: false,
      files: result.files,
      totalSize: result.files.reduce((sum, f) => sum + f.size, 0),
      fetchedAt: new Date().toISOString(),
      mcpInstructions: repo.mcpHints,
    };
  } catch (error) {
    return {
      repoId: repo.id,
      repoAlias: repo.alias,
      repoUrl: repo.url,
      commitSha: '',
      fromCache: false,
      files: [],
      totalSize: 0,
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch multiple repos in parallel
 */
export async function fetchMultipleRepos(
  repos: ExternalRepoReference[],
  forceRefresh: boolean = false
): Promise<FetchedRepoContent[]> {
  const results = await Promise.all(
    repos.map(repo => fetchRepoContent(repo, forceRefresh))
  );
  return results;
}
