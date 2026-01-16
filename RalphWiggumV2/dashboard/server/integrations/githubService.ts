/**
 * GitHub Integration Service for WIGGUM
 *
 * Uses the `gh` CLI for GitHub operations.
 * Provides PR/issue management and repository information.
 */

import { spawn } from 'child_process';
import { logger } from '../lib/logger.js';

export interface GitHubPR {
  number: number;
  title: string;
  url: string;
  state: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  isDraft: boolean;
  labels: string[];
  headRef: string;
  baseRef: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  url: string;
  state: string;
  author: string;
  createdAt: string;
  labels: string[];
  assignees: string[];
}

export interface GitHubRepo {
  name: string;
  owner: string;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
}

export interface GitHubUser {
  login: string;
  name: string;
  email: string;
}

class GitHubService {
  private projectPath: string | null = null;

  /**
   * Set the project path for git operations
   */
  setProjectPath(path: string): void {
    this.projectPath = path;
  }

  /**
   * Execute a gh CLI command
   */
  private async execGh(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = this.projectPath ? { cwd: this.projectPath } : {};
      const proc = spawn('gh', args, options);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          logger.error('GitHub CLI error', { args, stderr, code });
          reject(new Error(stderr || `gh command failed with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        logger.error('GitHub CLI spawn error', { error: err.message });
        reject(err);
      });
    });
  }

  /**
   * Check if gh CLI is available and authenticated
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.execGh(['auth', 'status']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<GitHubUser | null> {
    try {
      const output = await this.execGh([
        'api', 'user',
        '--jq', '{ login: .login, name: .name, email: .email }'
      ]);
      return JSON.parse(output);
    } catch (err) {
      logger.warn('Failed to get GitHub user', { error: err instanceof Error ? err.message : 'Unknown' });
      return null;
    }
  }

  /**
   * Get repository info
   */
  async getRepoInfo(): Promise<GitHubRepo | null> {
    try {
      const output = await this.execGh([
        'repo', 'view', '--json',
        'name,owner,url,defaultBranchRef,isPrivate'
      ]);
      const data = JSON.parse(output);
      return {
        name: data.name,
        owner: data.owner.login,
        url: data.url,
        defaultBranch: data.defaultBranchRef?.name || 'main',
        isPrivate: data.isPrivate,
      };
    } catch (err) {
      logger.warn('Failed to get repo info', { error: err instanceof Error ? err.message : 'Unknown' });
      return null;
    }
  }

  /**
   * List pull requests
   */
  async listPRs(state: 'open' | 'closed' | 'all' = 'open', limit: number = 10): Promise<GitHubPR[]> {
    try {
      const output = await this.execGh([
        'pr', 'list',
        '--state', state,
        '--limit', limit.toString(),
        '--json', 'number,title,url,state,author,createdAt,updatedAt,isDraft,labels,headRefName,baseRefName'
      ]);
      const prs = JSON.parse(output);
      return prs.map((pr: Record<string, unknown>) => ({
        number: pr.number,
        title: pr.title,
        url: pr.url,
        state: pr.state,
        author: (pr.author as Record<string, string>)?.login || 'unknown',
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
        isDraft: pr.isDraft,
        labels: (pr.labels as Array<{ name: string }>)?.map((l) => l.name) || [],
        headRef: pr.headRefName,
        baseRef: pr.baseRefName,
      }));
    } catch (err) {
      logger.error('Failed to list PRs', { error: err instanceof Error ? err.message : 'Unknown' });
      return [];
    }
  }

  /**
   * Get PR details
   */
  async getPR(number: number): Promise<GitHubPR | null> {
    try {
      const output = await this.execGh([
        'pr', 'view', number.toString(),
        '--json', 'number,title,url,state,author,createdAt,updatedAt,isDraft,labels,headRefName,baseRefName'
      ]);
      const pr = JSON.parse(output);
      return {
        number: pr.number,
        title: pr.title,
        url: pr.url,
        state: pr.state,
        author: pr.author?.login || 'unknown',
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
        isDraft: pr.isDraft,
        labels: pr.labels?.map((l: { name: string }) => l.name) || [],
        headRef: pr.headRefName,
        baseRef: pr.baseRefName,
      };
    } catch (err) {
      logger.error('Failed to get PR', { number, error: err instanceof Error ? err.message : 'Unknown' });
      return null;
    }
  }

  /**
   * Create a PR
   */
  async createPR(title: string, body: string, base?: string, draft: boolean = false): Promise<GitHubPR | null> {
    try {
      const args = ['pr', 'create', '--title', title, '--body', body];
      if (base) args.push('--base', base);
      if (draft) args.push('--draft');

      const output = await this.execGh(args);
      // Output is the PR URL
      const urlMatch = output.match(/https:\/\/github\.com\/[^\s]+\/pull\/(\d+)/);
      if (urlMatch) {
        return this.getPR(parseInt(urlMatch[1], 10));
      }
      return null;
    } catch (err) {
      logger.error('Failed to create PR', { error: err instanceof Error ? err.message : 'Unknown' });
      throw err;
    }
  }

  /**
   * List issues
   */
  async listIssues(state: 'open' | 'closed' | 'all' = 'open', limit: number = 10): Promise<GitHubIssue[]> {
    try {
      const output = await this.execGh([
        'issue', 'list',
        '--state', state,
        '--limit', limit.toString(),
        '--json', 'number,title,url,state,author,createdAt,labels,assignees'
      ]);
      const issues = JSON.parse(output);
      return issues.map((issue: Record<string, unknown>) => ({
        number: issue.number,
        title: issue.title,
        url: issue.url,
        state: issue.state,
        author: (issue.author as Record<string, string>)?.login || 'unknown',
        createdAt: issue.createdAt,
        labels: (issue.labels as Array<{ name: string }>)?.map((l) => l.name) || [],
        assignees: (issue.assignees as Array<{ login: string }>)?.map((a) => a.login) || [],
      }));
    } catch (err) {
      logger.error('Failed to list issues', { error: err instanceof Error ? err.message : 'Unknown' });
      return [];
    }
  }

  /**
   * Create an issue
   */
  async createIssue(title: string, body: string, labels?: string[]): Promise<GitHubIssue | null> {
    try {
      const args = ['issue', 'create', '--title', title, '--body', body];
      if (labels && labels.length > 0) {
        args.push('--label', labels.join(','));
      }

      const output = await this.execGh(args);
      // Output is the issue URL
      const urlMatch = output.match(/https:\/\/github\.com\/[^\s]+\/issues\/(\d+)/);
      if (urlMatch) {
        const issueNumber = parseInt(urlMatch[1], 10);
        const issues = await this.listIssues('all', 100);
        return issues.find((i) => i.number === issueNumber) || null;
      }
      return null;
    } catch (err) {
      logger.error('Failed to create issue', { error: err instanceof Error ? err.message : 'Unknown' });
      throw err;
    }
  }

  /**
   * Get workflow runs
   */
  async getWorkflowRuns(limit: number = 5): Promise<Array<{ id: number; name: string; status: string; conclusion: string; url: string }>> {
    try {
      const output = await this.execGh([
        'run', 'list',
        '--limit', limit.toString(),
        '--json', 'databaseId,name,status,conclusion,url'
      ]);
      return JSON.parse(output).map((run: Record<string, unknown>) => ({
        id: run.databaseId,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        url: run.url,
      }));
    } catch (err) {
      logger.warn('Failed to get workflow runs', { error: err instanceof Error ? err.message : 'Unknown' });
      return [];
    }
  }
}

// Singleton instance
export const githubService = new GitHubService();
export default githubService;
