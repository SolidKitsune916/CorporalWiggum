/**
 * MCP Config Manager
 *
 * Manages MCP (Model Context Protocol) configuration for GitHub integration.
 * Handles token management, config file generation, and cleanup.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { ExternalRepoReference, GitHubTokenInfo, McpServerConfig } from './types.js';
import { parseGitHubUrl } from './fetcher.js';
import { getPreferencesRepository } from '../database/repositories/PreferencesRepository.js';

const GITHUB_TOKEN_KEY = 'github.personalAccessToken';

const MCP_CONFIG_DIR = path.join(os.tmpdir(), 'ralph-mcp-configs');

// Ensure config directory exists
if (!fs.existsSync(MCP_CONFIG_DIR)) {
  fs.mkdirSync(MCP_CONFIG_DIR, { recursive: true });
}

/**
 * Get the GitHub token from environment or preferences
 */
export function getGitHubToken(): string | null {
  // Check environment first (both common env var names)
  const envToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN;
  if (envToken) return envToken;

  // Check stored preferences
  const prefs = getPreferencesRepository();
  const storedToken = prefs.get<string>(GITHUB_TOKEN_KEY);
  if (storedToken) return storedToken;

  return null;
}

/**
 * Set the GitHub token in preferences
 */
export function setGitHubToken(token: string): void {
  const prefs = getPreferencesRepository();
  prefs.set(GITHUB_TOKEN_KEY, token);
}

/**
 * Clear the stored GitHub token
 */
export function clearGitHubToken(): void {
  const prefs = getPreferencesRepository();
  prefs.delete(GITHUB_TOKEN_KEY);
}

/**
 * Check if a token is configured (env or stored)
 */
export function hasGitHubToken(): boolean {
  return getGitHubToken() !== null;
}

/**
 * Validate a GitHub token
 */
export async function validateGitHubToken(token: string): Promise<GitHubTokenInfo> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Ralph-Wiggum-Dashboard',
      },
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `Invalid token: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json() as { login: string };

    // Get scopes from header
    const scopesHeader = response.headers.get('x-oauth-scopes');
    const scopes = scopesHeader ? scopesHeader.split(',').map(s => s.trim()) : [];

    return {
      valid: true,
      login: data.login,
      scopes,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate token',
    };
  }
}

/**
 * Generate MCP config for Claude CLI
 */
export function generateMcpConfig(repos: ExternalRepoReference[]): Record<string, McpServerConfig> {
  const mcpRepos = repos.filter(
    r => r.fetchStrategy === 'mcp-only' || r.fetchStrategy === 'hybrid'
  );

  if (mcpRepos.length === 0) {
    return {};
  }

  // Build list of repos for the MCP server
  const repoUrls = mcpRepos.map(r => {
    const parsed = parseGitHubUrl(r.url);
    return parsed.isValid ? `${parsed.owner}/${parsed.repo}` : r.url;
  });

  return {
    'github': {
      command: 'npx',
      args: [
        '-y',
        '@github/github-mcp-server',
        '--repos',
        repoUrls.join(','),
      ],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: '${GITHUB_PERSONAL_ACCESS_TOKEN}',
      },
    },
  };
}

/**
 * Write a temporary MCP config file for Claude CLI
 * Returns the path to the config file
 */
export function writeTempMcpConfig(repos: ExternalRepoReference[]): string | null {
  const config = generateMcpConfig(repos);

  if (Object.keys(config).length === 0) {
    return null;
  }

  const configPath = path.join(MCP_CONFIG_DIR, `mcp-config-${Date.now()}.json`);
  fs.writeFileSync(configPath, JSON.stringify({ mcpServers: config }, null, 2));

  return configPath;
}

/**
 * Clean up old MCP config files (older than 1 hour)
 */
export function cleanupOldConfigs(): number {
  if (!fs.existsSync(MCP_CONFIG_DIR)) {
    return 0;
  }

  const files = fs.readdirSync(MCP_CONFIG_DIR);
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  let cleaned = 0;

  for (const file of files) {
    if (!file.startsWith('mcp-config-')) continue;

    const filePath = path.join(MCP_CONFIG_DIR, file);
    const stat = fs.statSync(filePath);

    if (stat.mtimeMs < oneHourAgo) {
      fs.unlinkSync(filePath);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Delete a specific config file
 */
export function deleteConfigFile(configPath: string): void {
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}

/**
 * Build MCP server arguments for Claude CLI spawn
 */
export function buildClaudeCliArgs(
  baseArgs: string[],
  repos: ExternalRepoReference[]
): { args: string[]; configPath: string | null; cleanup: () => void } {
  const configPath = writeTempMcpConfig(repos);

  if (!configPath) {
    return {
      args: baseArgs,
      configPath: null,
      cleanup: () => {},
    };
  }

  return {
    args: [...baseArgs, '--mcp-config', configPath],
    configPath,
    cleanup: () => deleteConfigFile(configPath),
  };
}

/**
 * Check if any repos require MCP
 */
export function hasMcpRepos(repos: ExternalRepoReference[]): boolean {
  return repos.some(r => r.fetchStrategy === 'mcp-only' || r.fetchStrategy === 'hybrid');
}

/**
 * Build instructions for Claude about available MCP tools
 */
export function buildMcpToolInstructions(repos: ExternalRepoReference[]): string {
  const mcpRepos = repos.filter(
    r => r.fetchStrategy === 'mcp-only' || r.fetchStrategy === 'hybrid'
  );

  if (mcpRepos.length === 0) {
    return '';
  }

  const repoDescriptions = mcpRepos.map(repo => {
    const parsed = parseGitHubUrl(repo.url);
    const repoName = parsed.isValid ? `${parsed.owner}/${parsed.repo}` : repo.alias;
    const purpose = repo.purpose ? ` - ${repo.purpose}` : '';
    const hints = repo.mcpHints?.length
      ? '\n' + repo.mcpHints.map(h => `    - ${h}`).join('\n')
      : '';

    return `  - ${repoName}${purpose}${hints}`;
  }).join('\n');

  return `
## GitHub MCP Integration

You have access to the GitHub MCP server for querying external repositories.
When you need more information about these repos beyond what's in the static context,
use the available MCP tools to search and retrieve additional content.

### Available Repositories:
${repoDescriptions}

### MCP Capabilities:
- Search code across repositories
- Get specific file contents
- List directory structures
- Search issues and pull requests
- View repository metadata

Use these tools when you need to:
- Find specific implementation patterns
- Look up API signatures or types
- Search for usage examples
- Explore repository structure
`.trim();
}
