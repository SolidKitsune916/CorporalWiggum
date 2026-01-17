import { useState, useEffect, useCallback } from 'react';
import { GitBranch, GitPullRequest, AlertCircle, ExternalLink, RefreshCw, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface GitHubPR {
  number: number;
  title: string;
  url: string;
  state: string;
  author: string;
  createdAt: string;
  isDraft: boolean;
  labels: string[];
  headRef: string;
  baseRef: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  url: string;
  state: string;
  author: string;
  createdAt: string;
  labels: string[];
}

interface GitHubRepo {
  name: string;
  owner: string;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
}

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  url: string;
}

interface GitHubPanelProps {
  onSendMessage?: (type: string, payload: unknown) => void;
}

export function GitHubPanel({ onSendMessage }: GitHubPanelProps) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [repo, setRepo] = useState<GitHubRepo | null>(null);
  const [prs, _setPRs] = useState<GitHubPR[]>([]);
  const [issues, _setIssues] = useState<GitHubIssue[]>([]);
  const [workflows, _setWorkflows] = useState<WorkflowRun[]>([]);

  // These setters will be used when WebSocket integration is complete
  void _setPRs;
  void _setIssues;
  void _setWorkflows;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'prs' | 'issues' | 'workflows'>('prs');

  const checkGitHub = useCallback(() => {
    setLoading(true);
    if (onSendMessage) {
      onSendMessage('github:check', {});
    }
    // Simulated response - in production this would come from WebSocket
    setTimeout(() => {
      setIsAvailable(true);
      setRepo({
        name: 'RalphWiggumV3',
        owner: 'user',
        url: 'https://github.com/user/RalphWiggumV3',
        defaultBranch: 'main',
        isPrivate: false,
      });
      setLoading(false);
    }, 500);
  }, [onSendMessage]);

  useEffect(() => {
    checkGitHub();
  }, [checkGitHub]);

  const refreshData = () => {
    setLoading(true);
    if (onSendMessage) {
      onSendMessage('github:refresh', {});
    }
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string, conclusion?: string) => {
    if (status === 'completed') {
      if (conclusion === 'success') return 'text-green-500';
      if (conclusion === 'failure') return 'text-red-500';
      return 'text-yellow-500';
    }
    if (status === 'in_progress') return 'text-yellow-500';
    return 'text-gray-500';
  };

  if (loading && isAvailable === null) {
    return (
      <Card className="bg-wiggum-obsidian border-wiggum-obsidian-light">
        <CardContent className="p-6 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-wiggum-cyan" />
          <p className="text-gray-400">Checking GitHub CLI...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAvailable) {
    return (
      <Card className="bg-wiggum-obsidian border-wiggum-obsidian-light">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <GitBranch className="w-5 h-5 text-wiggum-cyan" />
            GitHub Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <p className="text-gray-300 mb-2">GitHub CLI not available</p>
            <p className="text-gray-500 text-sm mb-4">
              Install and authenticate the GitHub CLI to enable this integration.
            </p>
            <Button
              variant="outline"
              className="border-wiggum-cyan text-wiggum-cyan hover:bg-wiggum-cyan/20"
              onClick={() => window.open('https://cli.github.com/', '_blank')}
            >
              Install GitHub CLI
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-wiggum-obsidian border-wiggum-obsidian-light">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <GitBranch className="w-5 h-5 text-wiggum-cyan" />
            GitHub Integration
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshData}
            disabled={loading}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {repo && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{repo.owner}/{repo.name}</span>
            {repo.isPrivate && <Badge variant="outline" className="text-xs">Private</Badge>}
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-wiggum-cyan hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4 border-b border-wiggum-obsidian-light">
          <button
            onClick={() => setActiveTab('prs')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'prs'
                ? 'text-wiggum-cyan border-b-2 border-wiggum-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <GitPullRequest className="w-4 h-4 inline-block mr-1" />
            Pull Requests
            {prs.length > 0 && (
              <Badge className="ml-2 bg-wiggum-cyan/20 text-wiggum-cyan">{prs.length}</Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'issues'
                ? 'text-wiggum-cyan border-b-2 border-wiggum-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <AlertCircle className="w-4 h-4 inline-block mr-1" />
            Issues
            {issues.length > 0 && (
              <Badge className="ml-2 bg-wiggum-cyan/20 text-wiggum-cyan">{issues.length}</Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'workflows'
                ? 'text-wiggum-cyan border-b-2 border-wiggum-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Circle className="w-4 h-4 inline-block mr-1" />
            Workflows
          </button>
        </div>

        {/* Tab Content */}
        <ScrollArea className="h-[300px]">
          {activeTab === 'prs' && (
            <div className="space-y-2">
              {prs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No open pull requests</p>
              ) : (
                prs.map((pr) => (
                  <a
                    key={pr.number}
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg bg-wiggum-obsidian-light hover:bg-wiggum-obsidian-lighter transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">#{pr.number}</span>
                          <span className="text-white font-medium">{pr.title}</span>
                          {pr.isDraft && (
                            <Badge variant="outline" className="text-xs">Draft</Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {pr.author} opened {formatDate(pr.createdAt)} · {pr.headRef} → {pr.baseRef}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </div>
                    {pr.labels.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {pr.labels.map((label) => (
                          <Badge key={label} variant="secondary" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </a>
                ))
              )}
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="space-y-2">
              {issues.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No open issues</p>
              ) : (
                issues.map((issue) => (
                  <a
                    key={issue.number}
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg bg-wiggum-obsidian-light hover:bg-wiggum-obsidian-lighter transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">#{issue.number}</span>
                          <span className="text-white font-medium">{issue.title}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {issue.author} opened {formatDate(issue.createdAt)}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </div>
                    {issue.labels.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {issue.labels.map((label) => (
                          <Badge key={label} variant="secondary" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </a>
                ))
              )}
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="space-y-2">
              {workflows.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent workflow runs</p>
              ) : (
                workflows.map((run) => (
                  <a
                    key={run.id}
                    href={run.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg bg-wiggum-obsidian-light hover:bg-wiggum-obsidian-lighter transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Circle className={`w-3 h-3 fill-current ${getStatusColor(run.status, run.conclusion)}`} />
                        <span className="text-white">{run.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getStatusColor(run.status, run.conclusion)}
                        >
                          {run.conclusion || run.status}
                        </Badge>
                        <ExternalLink className="w-4 h-4 text-gray-500" />
                      </div>
                    </div>
                  </a>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default GitHubPanel;
