import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Database,
  Zap,
  Check,
  X,
  Settings,
  HardDrive,
  Key,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import type {
  ExternalRepoReference,
  RepoFetchStrategy,
  RepoCacheStatus,
  GitHubMcpConfig,
  ClientCommand,
} from '@/types';

interface ExternalReposConfigProps {
  projectId: string;
  sendCommand: (command: ClientCommand) => void;
  externalRepos: ExternalRepoReference[];
  cacheStatus: Record<string, RepoCacheStatus>;
  mcpStatus: GitHubMcpConfig | null;
  urlValidation?: { valid: boolean; error?: string; defaultBranch?: string } | null;
  onClearUrlValidation?: () => void;
  onSetGitHubToken?: (token: string) => void;
}

const STRATEGY_OPTIONS: { value: RepoFetchStrategy; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto-detect', description: 'Automatically detect key files' },
  { value: 'readme-only', label: 'README Only', description: 'Just fetch README.md' },
  { value: 'docs-folder', label: 'Documentation', description: 'README + docs/**/*.md' },
  { value: 'typescript-lib', label: 'TypeScript Library', description: 'src/, types/, *.d.ts, etc.' },
  { value: 'python-lib', label: 'Python Library', description: '*.py, pyproject.toml, etc.' },
  { value: 'specified', label: 'Specific Paths', description: 'Choose exactly what to fetch' },
  { value: 'full-clone', label: 'Full Clone', description: 'Clone entire repository' },
  { value: 'mcp-only', label: 'MCP Only', description: 'Query repo via MCP at runtime' },
  { value: 'hybrid', label: 'Hybrid', description: 'Static files + MCP queries' },
];

const STRATEGY_BADGES: Record<RepoFetchStrategy, { color: string; icon: React.ReactNode }> = {
  auto: { color: 'bg-blue-100 text-blue-800', icon: <Settings className="w-3 h-3" /> },
  'readme-only': { color: 'bg-gray-100 text-gray-800', icon: null },
  'docs-folder': { color: 'bg-gray-100 text-gray-800', icon: null },
  'typescript-lib': { color: 'bg-blue-100 text-blue-800', icon: null },
  'python-lib': { color: 'bg-yellow-100 text-yellow-800', icon: null },
  specified: { color: 'bg-purple-100 text-purple-800', icon: null },
  'full-clone': { color: 'bg-orange-100 text-orange-800', icon: <Database className="w-3 h-3" /> },
  'mcp-only': { color: 'bg-green-100 text-green-800', icon: <Zap className="w-3 h-3" /> },
  hybrid: { color: 'bg-teal-100 text-teal-800', icon: <Zap className="w-3 h-3" /> },
};

interface AddRepoDialogState {
  open: boolean;
  url: string;
  alias: string;
  branch: string;
  fetchStrategy: RepoFetchStrategy;
  paths: string;
  mcpHints: string;
  purpose: string;
  validating: boolean;
}

const initialDialogState: AddRepoDialogState = {
  open: false,
  url: '',
  alias: '',
  branch: '',
  fetchStrategy: 'auto',
  paths: '',
  mcpHints: '',
  purpose: '',
  validating: false,
};

export function ExternalReposConfig({
  projectId,
  sendCommand,
  externalRepos,
  cacheStatus,
  mcpStatus,
  urlValidation,
  onClearUrlValidation,
  onSetGitHubToken,
}: ExternalReposConfigProps) {
  const [dialog, setDialog] = useState<AddRepoDialogState>(initialDialogState);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [tokenDialog, setTokenDialog] = useState({ open: false, token: '', showToken: false, saving: false });

  // Clear validating state when urlValidation prop arrives
  useEffect(() => {
    if (urlValidation && dialog.validating) {
      setDialog(d => ({ ...d, validating: false }));
    }
  }, [urlValidation, dialog.validating]);

  // Derive validation result directly from prop - show when not validating and have result
  const validationResult = !dialog.validating ? urlValidation : null;

  // Request initial data
  useEffect(() => {
    sendCommand({ type: 'external-repos:list', payload: { projectId } });
    sendCommand({ type: 'external-repos:mcp-status', payload: { projectId } });
    sendCommand({ type: 'external-repos:cache-stats' });
  }, [projectId, sendCommand]);

  // Request cache status when repos change
  useEffect(() => {
    if (externalRepos.length > 0) {
      sendCommand({
        type: 'external-repos:cache-status',
        payload: { projectId, repoIds: externalRepos.map(r => r.id) },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only re-fetch when repo count changes
  }, [projectId, externalRepos.length, sendCommand]);

  const validateUrl = useCallback(() => {
    if (!dialog.url) return;
    setDialog(d => ({ ...d, validating: true }));
    sendCommand({ type: 'external-repos:validate-url', payload: { url: dialog.url } });
  }, [dialog.url, sendCommand]);

  const handleAdd = () => {
    const payload: {
      projectId: string;
      url: string;
      alias: string;
      fetchStrategy: RepoFetchStrategy;
      branch?: string;
      purpose?: string;
      paths?: string[];
      mcpHints?: string[];
    } = {
      projectId,
      url: dialog.url,
      alias: dialog.alias || dialog.url.split('/').pop() || 'Repo',
      fetchStrategy: dialog.fetchStrategy,
    };

    if (dialog.branch) payload.branch = dialog.branch;
    if (dialog.purpose) payload.purpose = dialog.purpose;
    if (dialog.fetchStrategy === 'specified' && dialog.paths) {
      payload.paths = dialog.paths.split('\n').map(p => p.trim()).filter(Boolean);
    }
    if ((dialog.fetchStrategy === 'mcp-only' || dialog.fetchStrategy === 'hybrid') && dialog.mcpHints) {
      payload.mcpHints = dialog.mcpHints.split('\n').map(h => h.trim()).filter(Boolean);
    }

    sendCommand({ type: 'external-repos:add', payload });
    setDialog(initialDialogState);
    onClearUrlValidation?.();
  };

  const handleRemove = (repoId: string) => {
    if (confirm('Remove this repository?')) {
      sendCommand({ type: 'external-repos:remove', payload: { projectId, repoId } });
    }
  };

  const handleRefresh = (repoId: string) => {
    setRefreshing(repoId);
    sendCommand({
      type: 'external-repos:fetch',
      payload: { projectId, repoIds: [repoId], forceRefresh: true },
    });
    // Clear refreshing state after a delay
    setTimeout(() => setRefreshing(null), 3000);
  };

  const handleClearAllCache = () => {
    if (confirm('Clear all cached repository content?')) {
      sendCommand({ type: 'external-repos:clear-cache', payload: { projectId } });
    }
  };

  const handleSaveToken = () => {
    if (!tokenDialog.token.trim() || !onSetGitHubToken) return;
    setTokenDialog(d => ({ ...d, saving: true }));
    onSetGitHubToken(tokenDialog.token.trim());
    // Close dialog after a short delay (the toast will confirm success/failure)
    setTimeout(() => {
      setTokenDialog({ open: false, token: '', showToken: false, saving: false });
    }, 500);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getCacheStatusBadge = (repoId: string) => {
    const status = cacheStatus[repoId];
    if (!status) return null;

    if (!status.cached) {
      return <Badge variant="outline" className="text-xs">Not cached</Badge>;
    }
    if (!status.fresh) {
      return (
        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
          Stale ({status.reason})
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs text-green-600 border-green-300">
        <Check className="w-3 h-3 mr-1" />
        Cached {status.sizeBytes && `(${formatBytes(status.sizeBytes)})`}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              External GitHub Repositories
            </CardTitle>
            <CardDescription>
              Link external GitHub repositories to include their content when generating PRDs.
              Content is cached locally for faster access.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {externalRepos.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllCache}
              >
                <HardDrive className="w-4 h-4 mr-1" />
                Clear Cache
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setDialog(d => ({ ...d, open: true }))}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Repository
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* MCP Status */}
        {mcpStatus && (
          <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="font-medium">MCP GitHub Integration:</span>
                {mcpStatus.tokenConfigured ? (
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    <Check className="w-3 h-3 mr-1" />
                    Token Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                    <X className="w-3 h-3 mr-1" />
                    No Token
                  </Badge>
                )}
              </div>
              {onSetGitHubToken && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTokenDialog({ open: true, token: '', showToken: false, saving: false })}
                  className="gap-1"
                >
                  <Key className="w-3.5 h-3.5" />
                  {mcpStatus.tokenConfigured ? 'Update Token' : 'Configure Token'}
                </Button>
              )}
            </div>
            {mcpStatus.reposWithMcp.length > 0 && (
              <p className="mt-1 text-muted-foreground">
                {mcpStatus.reposWithMcp.length} repo(s) using MCP for on-demand queries
              </p>
            )}
          </div>
        )}

        {/* Repository List */}
        {externalRepos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ExternalLink className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No external repositories linked yet.</p>
            <p className="text-sm">
              Add repositories to include their documentation and code as context for PRD generation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {externalRepos.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{repo.alias}</span>
                    <Badge className={STRATEGY_BADGES[repo.fetchStrategy].color}>
                      {STRATEGY_BADGES[repo.fetchStrategy].icon}
                      <span className="ml-1">{repo.fetchStrategy}</span>
                    </Badge>
                    {getCacheStatusBadge(repo.id)}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {repo.url}
                    {repo.branch && ` @ ${repo.branch}`}
                  </div>
                  {repo.purpose && (
                    <div className="text-xs text-muted-foreground mt-1">{repo.purpose}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRefresh(repo.id)}
                    disabled={refreshing === repo.id}
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing === repo.id ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(repo.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Repository Dialog */}
        <Dialog open={dialog.open} onOpenChange={(open) => {
          setDialog(d => ({ ...d, open }));
          if (!open) onClearUrlValidation?.();
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add External Repository</DialogTitle>
              <DialogDescription>
                Link a GitHub repository to include as context when generating PRDs.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="repo-url">Repository URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="repo-url"
                    placeholder="https://github.com/owner/repo"
                    value={dialog.url}
                    onChange={(e) => {
                      setDialog(d => ({ ...d, url: e.target.value }));
                      onClearUrlValidation?.();
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={validateUrl}
                    disabled={!dialog.url || dialog.validating}
                  >
                    {dialog.validating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      'Validate'
                    )}
                  </Button>
                </div>
                {validationResult && (
                  <p className={`text-sm ${validationResult.valid ? 'text-green-600' : 'text-red-600'}`}>
                    {validationResult.valid
                      ? `Valid repository (default branch: ${validationResult.defaultBranch})`
                      : validationResult.error}
                  </p>
                )}
              </div>

              {/* Alias */}
              <div className="space-y-2">
                <Label htmlFor="repo-alias">Display Name</Label>
                <Input
                  id="repo-alias"
                  placeholder="e.g., Stripe SDK"
                  value={dialog.alias}
                  onChange={(e) => setDialog(d => ({ ...d, alias: e.target.value }))}
                />
              </div>

              {/* Branch */}
              <div className="space-y-2">
                <Label htmlFor="repo-branch">Branch (optional)</Label>
                <Input
                  id="repo-branch"
                  placeholder="Leave empty for default branch"
                  value={dialog.branch}
                  onChange={(e) => setDialog(d => ({ ...d, branch: e.target.value }))}
                />
              </div>

              {/* Fetch Strategy */}
              <div className="space-y-2">
                <Label>Fetch Strategy</Label>
                <Select
                  value={dialog.fetchStrategy}
                  onValueChange={(v) => setDialog(d => ({ ...d, fetchStrategy: v as RepoFetchStrategy }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STRATEGY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          <span className="text-xs text-muted-foreground">{opt.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Paths (for specified strategy) */}
              {dialog.fetchStrategy === 'specified' && (
                <div className="space-y-2">
                  <Label htmlFor="repo-paths">Paths to Fetch (one per line)</Label>
                  <Textarea
                    id="repo-paths"
                    placeholder="src/index.ts&#10;docs/*.md&#10;README.md"
                    value={dialog.paths}
                    onChange={(e) => setDialog(d => ({ ...d, paths: e.target.value }))}
                    rows={4}
                  />
                </div>
              )}

              {/* MCP Hints (for mcp-only or hybrid) */}
              {(dialog.fetchStrategy === 'mcp-only' || dialog.fetchStrategy === 'hybrid') && (
                <div className="space-y-2">
                  <Label htmlFor="repo-hints">MCP Query Hints (one per line)</Label>
                  <Textarea
                    id="repo-hints"
                    placeholder="Search for authentication patterns&#10;Find database query examples&#10;Look for API error handling"
                    value={dialog.mcpHints}
                    onChange={(e) => setDialog(d => ({ ...d, mcpHints: e.target.value }))}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    These hints tell Claude what to look for when querying the repository via MCP.
                  </p>
                </div>
              )}

              {/* Purpose */}
              <div className="space-y-2">
                <Label htmlFor="repo-purpose">Purpose (optional)</Label>
                <Input
                  id="repo-purpose"
                  placeholder="e.g., Payment processing integration"
                  value={dialog.purpose}
                  onChange={(e) => setDialog(d => ({ ...d, purpose: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setDialog(initialDialogState);
                onClearUrlValidation?.();
              }}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!dialog.url}>
                Add Repository
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* GitHub Token Dialog */}
        <Dialog open={tokenDialog.open} onOpenChange={(open) => setTokenDialog(d => ({ ...d, open }))}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Configure GitHub Token
              </DialogTitle>
              <DialogDescription>
                Enter a GitHub Personal Access Token to enable MCP integration for on-demand repository queries.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="github-token">Personal Access Token</Label>
                <div className="relative">
                  <Input
                    id="github-token"
                    type={tokenDialog.showToken ? 'text' : 'password'}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={tokenDialog.token}
                    onChange={(e) => setTokenDialog(d => ({ ...d, token: e.target.value }))}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setTokenDialog(d => ({ ...d, showToken: !d.showToken }))}
                  >
                    {tokenDialog.showToken ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Required scopes: <code className="bg-muted px-1 rounded">repo</code> (for private repos) or <code className="bg-muted px-1 rounded">public_repo</code> (for public repos only)
                </p>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How to create a token:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
                  <li>Click "Generate new token (classic)"</li>
                  <li>Select the <code className="bg-muted px-1 rounded">repo</code> scope</li>
                  <li>Generate and copy the token</li>
                </ol>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTokenDialog({ open: false, token: '', showToken: false, saving: false })}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveToken}
                disabled={!tokenDialog.token.trim() || tokenDialog.saving}
              >
                {tokenDialog.saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Token'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
