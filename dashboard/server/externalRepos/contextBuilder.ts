/**
 * Context Builder for External Repositories
 *
 * Builds prompt context from fetched repository content.
 * Formats content as XML blocks for inclusion in Claude prompts.
 */

import { FetchedRepoContent, ExternalRepoReference } from './types.js';

/**
 * Build context XML from fetched repository content
 */
export function buildRepoContext(content: FetchedRepoContent): string {
  if (content.error) {
    return `<repository name="${escapeXml(content.repoAlias)}" url="${escapeXml(content.repoUrl)}" error="true">
Error fetching repository: ${escapeXml(content.error)}
</repository>`;
  }

  if (content.files.length === 0) {
    return `<repository name="${escapeXml(content.repoAlias)}" url="${escapeXml(content.repoUrl)}">
No files found matching the extraction profile.
</repository>`;
  }

  const fileBlocks = content.files.map(file => {
    const truncatedNote = file.truncated ? ' [truncated]' : '';
    return `### ${file.path}${truncatedNote}
\`\`\`
${file.content}
\`\`\``;
  }).join('\n\n');

  return `<repository name="${escapeXml(content.repoAlias)}" commit="${content.commitSha.slice(0, 7)}" cached="${content.fromCache}">
${fileBlocks}
</repository>`;
}

/**
 * Build context from multiple repositories
 */
export function buildExternalReposContext(contents: FetchedRepoContent[]): string {
  if (contents.length === 0) {
    return '';
  }

  const repoBlocks = contents.map(buildRepoContext).join('\n\n');

  return `<external-repositories>
${repoBlocks}
</external-repositories>`;
}

/**
 * Build MCP instructions section for repos using MCP strategies
 */
export function buildMcpInstructions(repos: ExternalRepoReference[]): string {
  const mcpRepos = repos.filter(
    r => r.fetchStrategy === 'mcp-only' || r.fetchStrategy === 'hybrid'
  );

  if (mcpRepos.length === 0) {
    return '';
  }

  const repoList = mcpRepos.map(repo => {
    const hints = repo.mcpHints?.length
      ? `\n${repo.mcpHints.map(h => `  - ${h}`).join('\n')}`
      : '';
    const purpose = repo.purpose ? ` (${repo.purpose})` : '';
    return `- ${repo.alias}${purpose}${hints}`;
  }).join('\n');

  return `<mcp-github-instructions>
You have access to the GitHub MCP server for on-demand queries.

Repositories available via MCP:
${repoList}

Available MCP actions:
- Search code in repositories
- Get specific file contents
- List directory structures
- Search issues/PRs for context

When you need more detail about these repositories beyond what's in the static context,
use the GitHub MCP tools to query the repositories directly.
</mcp-github-instructions>`;
}

/**
 * Build complete context section including repos and MCP instructions
 */
export function buildFullExternalContext(
  contents: FetchedRepoContent[],
  repos: ExternalRepoReference[]
): string {
  const parts: string[] = [];

  // Add static repo content
  const repoContext = buildExternalReposContext(contents);
  if (repoContext) {
    parts.push(repoContext);
  }

  // Add MCP instructions if applicable
  const mcpInstructions = buildMcpInstructions(repos);
  if (mcpInstructions) {
    parts.push(mcpInstructions);
  }

  return parts.join('\n\n');
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Calculate approximate token count for context
 * Uses rough estimate of 4 chars per token
 */
export function estimateTokenCount(context: string): number {
  return Math.ceil(context.length / 4);
}

/**
 * Truncate context to fit within token limit
 */
export function truncateContextToTokens(
  contents: FetchedRepoContent[],
  maxTokens: number
): FetchedRepoContent[] {
  const maxChars = maxTokens * 4;
  let totalChars = 0;
  const result: FetchedRepoContent[] = [];

  for (const content of contents) {
    const contentSize = content.files.reduce((sum, f) => sum + f.content.length, 0);

    if (totalChars + contentSize <= maxChars) {
      result.push(content);
      totalChars += contentSize;
    } else {
      // Truncate this repo's content to fit remaining space
      const remaining = maxChars - totalChars;
      if (remaining > 1000) {
        const truncatedFiles = [];
        let repoChars = 0;

        for (const file of content.files) {
          if (repoChars + file.content.length <= remaining) {
            truncatedFiles.push(file);
            repoChars += file.content.length;
          } else if (remaining - repoChars > 500) {
            // Partial file
            truncatedFiles.push({
              ...file,
              content: file.content.slice(0, remaining - repoChars - 100) +
                '\n\n[Content truncated to fit token limit]',
              truncated: true,
            });
            break;
          }
        }

        if (truncatedFiles.length > 0) {
          result.push({
            ...content,
            files: truncatedFiles,
            totalSize: truncatedFiles.reduce((sum, f) => sum + f.size, 0),
          });
        }
      }
      break;
    }
  }

  return result;
}

/**
 * Build a summary of external repos for logging/display
 */
export function buildReposSummary(contents: FetchedRepoContent[]): string {
  return contents
    .map(c => {
      const status = c.error
        ? `❌ Error: ${c.error}`
        : `✓ ${c.files.length} files, ${formatBytes(c.totalSize)}${c.fromCache ? ' (cached)' : ''}`;
      return `${c.repoAlias}: ${status}`;
    })
    .join('\n');
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
