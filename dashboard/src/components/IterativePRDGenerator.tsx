import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PRDVersionSelector } from './PRDVersionSelector';
import { CodebaseAnalysisCard } from './CodebaseAnalysisCard';
import { PRDQuestionList } from './PRDQuestionList';
import { DocumentationSelector } from './DocumentationSelector';
import { DocumentPreview } from './DocumentPreview';
import type {
  PRDSession,
  PRDVersionHistory,
  CodebaseAnalysis,
  PRDQuestion,
  PRDVersion,
  DiscoveredDoc,
  ExternalRepoReference,
  GitHubMcpConfig,
} from '@/types';
import {
  Play,
  Square,
  Copy,
  FileDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  FolderOpen,
  Sparkles,
  RefreshCw,
  Trash2,
  ExternalLink,
  Zap,
  Settings,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface IterativePRDGeneratorProps {
  // Session state
  session: PRDSession | null;
  versionHistory: PRDVersionHistory | null;
  analysis: CodebaseAnalysis | null;
  questions: { roundNumber: number; questions: PRDQuestion[] } | null;
  status: { phase: string; analyzing: boolean; generating: boolean };
  output: string;
  complete: { version: PRDVersion; prd: string; audience: string } | null;
  error: string | null;

  // Document selection for context
  discoveredDocs: DiscoveredDoc[];
  selectedDocPaths: string[];
  onDocSelectionChange: (paths: string[]) => void;
  onPreviewDoc: (path: string) => void;
  previewDoc: { path: string; content: string } | null;
  isLoadingPreview: boolean;
  onClosePreview: () => void;

  // External repositories for context
  externalRepos: ExternalRepoReference[];
  selectedExternalRepoIds: string[];
  onExternalRepoSelectionChange: (ids: string[]) => void;
  mcpStatus?: GitHubMcpConfig | null;
  onNavigateToExternalRepos?: () => void;

  // Actions
  onCheckVersions: () => void;
  onStartInterview: (description: string, contextDocs: string[], previousVersions: number[], startFresh: boolean, additionalContext?: string, skipQuestions?: boolean, selectedExternalRepos?: string[]) => void;
  onAnalyzeCodebase: () => void;
  onSubmitAnswers: (roundNumber: number, answers: Array<{ questionId: string; answer?: string; skipped: boolean }>) => void;
  onRequestMoreQuestions: () => void;
  onGeneratePRD: () => void;
  onCancel: () => void;
  onResume: () => void;
  onClearSession: () => void;
  onClearOutput: () => void;
  onInsertPRD: (prdContent: string, audienceContent: string) => void;
}

type ViewPhase = 'version-select' | 'input' | 'questions' | 'generating' | 'complete';

export function IterativePRDGenerator({
  session,
  versionHistory,
  analysis,
  questions,
  status,
  output,
  complete,
  error,
  discoveredDocs,
  selectedDocPaths,
  onDocSelectionChange,
  onPreviewDoc,
  previewDoc,
  isLoadingPreview,
  onClosePreview,
  externalRepos,
  selectedExternalRepoIds,
  onExternalRepoSelectionChange,
  mcpStatus,
  onNavigateToExternalRepos,
  onCheckVersions,
  onStartInterview,
  onAnalyzeCodebase,
  onSubmitAnswers,
  onRequestMoreQuestions,
  onGeneratePRD,
  onCancel,
  onResume,
  onClearSession,
  onClearOutput,
  onInsertPRD,
}: IterativePRDGeneratorProps) {
  const [description, setDescription] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [showDocSelector, setShowDocSelector] = useState(false);
  const [showAdditionalContext, setShowAdditionalContext] = useState(false);
  const [showExternalRepos, setShowExternalRepos] = useState(false);
  const [selectedPreviousVersions, setSelectedPreviousVersions] = useState<number[]>([]);
  const [showInputForm, setShowInputForm] = useState(false);

  // Check for versions on mount
  useEffect(() => {
    onCheckVersions();
    onResume(); // Check for existing session
  }, [onCheckVersions, onResume]);

  // Auto-select common documentation files when discoveredDocs loads
  useEffect(() => {
    const autoSelectPatterns = [
      /^PRD(_v\d+)?\.md$/i,
      /^README\.md$/i,
      /^AUDIENCE_JTBD(_v\d+)?\.md$/i,
      /^IMPLEMENTATION_PLAN\.md$/i,
    ];
    const autoSelected = discoveredDocs
      .filter(doc => autoSelectPatterns.some(p => p.test(doc.name)))
      .map(doc => doc.path);
    if (autoSelected.length > 0 && selectedDocPaths.length === 0) {
      onDocSelectionChange(autoSelected);
    }
  }, [discoveredDocs, selectedDocPaths.length, onDocSelectionChange]);

  // Determine current view phase
  const getViewPhase = (): ViewPhase => {
    if (complete) return 'complete';
    if (status.generating || output) return 'generating';
    if (questions && session?.rounds && session.rounds.length > 0) return 'questions';
    if (session && session.phase !== 'version-select') return 'input';
    if (showInputForm) return 'input';  // Show input form without session yet
    return 'version-select';
  };

  const viewPhase = getViewPhase();

  // Handle starting fresh (start over)
  const handleStartFresh = () => {
    setDescription('');
    setAdditionalContext('');
    setShowAdditionalContext(false);
    setSelectedPreviousVersions([]);
    setShowInputForm(false);  // Reset input form state
    onClearSession();
  };

  // Handle starting with new version
  const handleCreateNewVersion = (previousVersions: number[]) => {
    setSelectedPreviousVersions(previousVersions);
    // Session will be created when user submits description
  };

  // Handle starting the interview (with questions)
  const handleStartInterview = (skipQuestions = false) => {
    if (!description.trim() && !additionalContext.trim()) return;
    const startFresh = selectedPreviousVersions.length === 0;
    setShowInputForm(false);  // Reset since we're starting the interview
    onStartInterview(
      description.trim(),
      selectedDocPaths,
      selectedPreviousVersions,
      startFresh,
      additionalContext.trim() || undefined,
      skipQuestions,
      selectedExternalRepoIds.length > 0 ? selectedExternalRepoIds : undefined
    );
  };

  // Handle generating PRD directly (skip questions)
  const handleGenerateDirectly = () => {
    handleStartInterview(true);
  };

  // Handle starting over - cancel any running process and clear session
  const handleStartOver = () => {
    onCancel();       // Cancel any running Claude process
    setShowInputForm(false);  // Reset input form state
    onClearSession(); // Clear the session and return to start
  };

  // Copy content to clipboard
  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // Insert PRD files
  const handleInsert = () => {
    if (complete) {
      onInsertPRD(complete.prd, complete.audience);
    }
  };

  // Render version selection phase
  const renderVersionSelect = () => {
    if (!versionHistory) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      );
    }

    // Check for existing session to resume
    if (session && session.phase !== 'complete') {
      return (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-500" />
              <CardTitle>Resume Previous Session</CardTitle>
            </div>
            <CardDescription>
              You have an unfinished PRD interview for version {session.targetVersion}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" onClick={handleStartFresh} className="flex-1">
              <Trash2 className="w-4 h-4 mr-2" />
              Start Over
            </Button>
            <Button onClick={onResume} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Resume Session
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <PRDVersionSelector
        versionHistory={versionHistory}
        onStartFresh={() => {
          setSelectedPreviousVersions([]);
          setShowInputForm(true);  // Show input form without starting interview yet
        }}
        onCreateNewVersion={handleCreateNewVersion}
      />
    );
  };

  // Render input phase
  const renderInput = () => (
    <div className="space-y-4">
      {/* Back button if versions exist */}
      {versionHistory && versionHistory.versions.length > 0 && (
        <Button variant="ghost" size="sm" onClick={handleStartFresh} className="gap-1">
          <ChevronLeft className="w-4 h-4" />
          Back to versions
        </Button>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle>
              {selectedPreviousVersions.length > 0
                ? `Creating PRD v${(versionHistory?.latestVersion || 0) + 1}`
                : 'New PRD Interview'}
            </CardTitle>
          </div>
          <CardDescription>
            Describe what you want to build and I'll ask clarifying questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">What do you want to build?</label>
            <Textarea
              placeholder="Describe your product, feature, or enhancement in as much detail as you'd like..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Additional context (collapsible) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Additional Context</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdditionalContext(!showAdditionalContext)}
                className="gap-1 text-xs"
              >
                {showAdditionalContext ? 'Hide' : 'Add'} context
              </Button>
            </div>
            {showAdditionalContext && (
              <div className="space-y-1">
                <Textarea
                  placeholder="Paste additional context here (e.g., rough draft PRD, technical specs, user research, competitor analysis...)&#10;&#10;If you provide substantial context, you can skip questions and generate the PRD directly."
                  value={additionalContext}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdditionalContext(e.target.value)}
                  className="min-h-[200px] resize-none font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Paste a rough draft PRD to have Claude generate refined questions based on it
                </p>
              </div>
            )}
          </div>

          {/* Context documents */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Context Documents</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDocSelector(!showDocSelector)}
                className="gap-1 text-xs"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                {showDocSelector ? 'Hide' : 'Select'} ({selectedDocPaths.length})
              </Button>
            </div>
            {selectedDocPaths.length > 0 && !showDocSelector && (
              <p className="text-xs text-muted-foreground">
                {selectedDocPaths.length} document{selectedDocPaths.length !== 1 ? 's' : ''} selected as context
              </p>
            )}
            {showDocSelector && (
              <DocumentationSelector
                docs={discoveredDocs}
                selectedPaths={selectedDocPaths}
                onSelectionChange={onDocSelectionChange}
                onPreviewDoc={onPreviewDoc}
              />
            )}
          </div>

          {/* External repositories */}
          {externalRepos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  External Repositories
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExternalRepos(!showExternalRepos)}
                  className="gap-1 text-xs"
                >
                  {showExternalRepos ? 'Hide' : 'Select'} ({selectedExternalRepoIds.length})
                </Button>
              </div>
              {selectedExternalRepoIds.length > 0 && !showExternalRepos && (
                <p className="text-xs text-muted-foreground">
                  {selectedExternalRepoIds.length} repo{selectedExternalRepoIds.length !== 1 ? 's' : ''} will be included as context
                </p>
              )}
              {showExternalRepos && (
                <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  {externalRepos.map((repo) => {
                    const isSelected = selectedExternalRepoIds.includes(repo.id);
                    const isMcp = repo.fetchStrategy === 'mcp-only' || repo.fetchStrategy === 'hybrid';
                    return (
                      <div
                        key={repo.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                        onClick={() => {
                          if (isSelected) {
                            onExternalRepoSelectionChange(selectedExternalRepoIds.filter(id => id !== repo.id));
                          } else {
                            onExternalRepoSelectionChange([...selectedExternalRepoIds, repo.id]);
                          }
                        }}
                      >
                        <Checkbox checked={isSelected} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{repo.alias}</span>
                            {isMcp && (
                              <Badge variant="outline" className="text-xs py-0 text-green-600 border-green-300">
                                <Zap className="w-3 h-3 mr-0.5" />
                                MCP
                              </Badge>
                            )}
                          </div>
                          {repo.purpose && (
                            <p className="text-xs text-muted-foreground truncate">{repo.purpose}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* MCP Token Warning */}
                  {(() => {
                    const selectedMcpRepos = externalRepos.filter(
                      r => selectedExternalRepoIds.includes(r.id) &&
                           (r.fetchStrategy === 'mcp-only' || r.fetchStrategy === 'hybrid')
                    );
                    if (selectedMcpRepos.length > 0 && mcpStatus && !mcpStatus.tokenConfigured) {
                      return (
                        <div className="flex items-start gap-2 p-2 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div className="text-xs">
                            <p className="font-medium">GitHub token not configured</p>
                            <p className="text-yellow-700 dark:text-yellow-300">
                              MCP repos ({selectedMcpRepos.map(r => r.alias).join(', ')}) require a GitHub token for on-demand queries.
                              Set <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">GITHUB_PERSONAL_ACCESS_TOKEN</code> or configure in Settings.
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="flex items-center justify-between pt-1 border-t">
                    <p className="text-xs text-muted-foreground">
                      Selected repos will be fetched and included in the PRD context.
                      MCP repos can be queried on-demand during generation.
                    </p>
                    {onNavigateToExternalRepos && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={onNavigateToExternalRepos}
                        className="text-xs h-auto p-0 gap-1"
                      >
                        <Settings className="w-3 h-3" />
                        Manage repos
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Codebase analysis */}
          <CodebaseAnalysisCard
            analysis={analysis}
            isAnalyzing={status.analyzing}
            onAnalyze={onAnalyzeCodebase}
          />

          {/* Action buttons - show dual buttons if additional context is provided */}
          {additionalContext.trim() ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleStartInterview(false)}
                disabled={(!description.trim() && !additionalContext.trim()) || status.analyzing}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                Ask Questions About This
              </Button>
              <Button
                onClick={handleGenerateDirectly}
                disabled={(!description.trim() && !additionalContext.trim()) || status.analyzing}
                className="flex-1"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate PRD Directly
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => handleStartInterview(false)}
              disabled={!description.trim() || status.analyzing}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Interview
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Document preview */}
      <DocumentPreview
        doc={previewDoc}
        isLoading={isLoadingPreview}
        isOpen={!!previewDoc}
        isSelected={previewDoc ? selectedDocPaths.includes(previewDoc.path) : false}
        onClose={onClosePreview}
        onToggleSelect={(path) => {
          if (selectedDocPaths.includes(path)) {
            onDocSelectionChange(selectedDocPaths.filter(p => p !== path));
          } else {
            onDocSelectionChange([...selectedDocPaths, path]);
          }
        }}
      />
    </div>
  );

  // Render questions phase
  const renderQuestions = () => {
    if (!questions || !session) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">PRD v{session.targetVersion}</Badge>
            {session.codebaseAnalysis && (
              <Badge variant="secondary" className="text-xs">
                Codebase analyzed
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleStartOver}>
            <ChevronLeft className="w-3 h-3 mr-1" />
            Start Over
          </Button>
        </div>

        <PRDQuestionList
          key={`round-${questions.roundNumber}`}
          questions={questions.questions}
          roundNumber={questions.roundNumber}
          previousRounds={session.rounds.slice(0, -1)}
          isGenerating={status.generating}
          onSubmit={(answers) => onSubmitAnswers(questions.roundNumber, answers)}
          onRequestMore={onRequestMoreQuestions}
          onGeneratePRD={onGeneratePRD}
        />
      </div>
    );
  };

  // Render generating phase
  const renderGenerating = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <CardTitle>Generating PRD...</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <Square className="w-3 h-3 mr-1" />
            Cancel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <pre className="whitespace-pre-wrap text-sm font-mono text-muted-foreground">
            {output || 'Starting generation...'}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  // Render complete phase
  const renderComplete = () => {
    if (!complete) return null;

    return (
      <Card className="border-green-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <CardTitle>PRD v{complete.version.version} Generated</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClearOutput}>
                <RefreshCw className="w-3 h-3 mr-1" />
                New PRD
              </Button>
            </div>
          </div>
          <CardDescription>
            Your PRD and Audience analysis are ready
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="prd">
            <TabsList>
              <TabsTrigger value="prd">PRD_v{complete.version.version}.md</TabsTrigger>
              <TabsTrigger value="audience">AUDIENCE_JTBD_v{complete.version.version}.md</TabsTrigger>
            </TabsList>
            <TabsContent value="prd" className="mt-4">
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm">
                  {complete.prd}
                </pre>
              </ScrollArea>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(complete.prd)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="audience" className="mt-4">
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm">
                  {complete.audience}
                </pre>
              </ScrollArea>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(complete.audience)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleInsert} className="flex-1">
              <FileDown className="w-4 h-4 mr-2" />
              Insert Files to Project
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render error state
  const renderError = () => {
    if (!error) return null;

    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <CardTitle className="text-red-500">Error</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" size="sm" onClick={onClearOutput} className="mt-3">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {error && renderError()}
      
      {viewPhase === 'version-select' && !session && renderVersionSelect()}
      {(viewPhase === 'input' || (session && !questions)) && renderInput()}
      {viewPhase === 'questions' && renderQuestions()}
      {viewPhase === 'generating' && renderGenerating()}
      {viewPhase === 'complete' && renderComplete()}
    </div>
  );
}
