import { useState, useEffect, useMemo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { LoopStatus } from './LoopStatus';
import { TaskList } from './TaskList';
import { LogViewer } from './LogViewer';
import { ContextMeter } from './ContextMeter';
import { GitHistory } from './GitHistory';
import { LoopControls } from './LoopControls';
import { SetupWizard } from './setup/SetupWizard';
import { OnboardingWizard } from './setup/OnboardingWizard';
import { PlanGenerator } from './PlanGenerator';
import { IterativePRDGenerator } from './IterativePRDGenerator';
import { ReviewGenerator } from './ReviewGenerator';
import { ReviewPanel } from './ReviewPanel';
import { ExistingDocsViewer } from './ExistingDocsViewer';
import { WorkflowModeToggle } from './WorkflowModeToggle';
import { PortsTab } from './PortsTab';
import { FileEditor } from './FileEditor';
import { LogHistory } from './LogHistory';
import { TroubleshootPanel } from './TroubleshootPanel';
import { StoriesGenerator } from './StoriesGenerator';
import { SimpleModeChecklist } from './SimpleModeChecklist';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Settings,
  Terminal,
  Wifi,
  WifiOff,
  Wand2,
  FileText,
  ListTodo,
  ListChecks,
  Github,
  FileSearch,
  Home,
  Sparkles,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardProps {
  backendPort?: number;
}

export function Dashboard({ backendPort }: DashboardProps) {
  // Build WebSocket URL - use custom port if provided, otherwise use default
  const wsUrl = backendPort
    ? `ws://localhost:${backendPort}/ws`
    : undefined; // undefined uses the default from useWebSocket

  const {
    connected,
    loopStatus,
    tasks,
    gitStatus,
    logs,
    projectConfig,
    enabledAgents,
    planStatus,
    planOutput,
    planComplete,
    planError,
    projectScan,
    scanLoading,
    projectInfo,
    availableAgents,
    cursorRules,
    agentsLoading,
    rulesLoading,
    selectedDocPaths,
    previewDoc,
    isLoadingPreview,
    claudeMdFiles,
    claudeMdContent,
    claudeMdLoading,
    claudeMdApplying,
    sendCommand,
    clearLogs,
    clearPlanOutput,
    scanProject,
    listAgents,
    listRules,
    setSelectedDocPaths,
    readDoc,
    closeDocPreview,
    listClaudeMdFiles,
    readClaudeMdFile,
    applyRalphClaudeMd,
    closeClaudeMdPreview,
    dependencyStatus,
    dependencyLoading,
    checkDependencies,
    configPreviewDoc,
    configPreviewLoading,
    readConfigFile,
    closeConfigPreview,
    repoAgents,
    repoAgentsLoading,
    agentInstalling,
    listRepoAgents,
    installAgentGlobal,
    installAgentProject,
    installAllAgentsGlobal,
    // Review generator (Feature Set 14)
    reviewGeneratorStatus,
    reviewGeneratorOutput,
    reviewGeneratorComplete,
    reviewGeneratorError,
    generateReview,
    cancelReviewGenerator,
    clearReviewGeneratorOutput,
    // Review runner (Feature Set 13 - LLM-as-Judge)
    reviewRunnerStatus,
    reviewRunnerOutput,
    reviewRunnerResult,
    reviewRunnerError,
    runReview,
    cancelReview,
    // Workflow mode
    workflowMode,
    setWorkflowMode,
    getWorkflowMode,
    // Port management
    portProcesses,
    portsLoading,
    portsError,
    scanPorts,
    killPort,
    // Log management
    logSessions,
    logsLoading,
    logsError,
    logContent,
    logContentLoading,
    listLogs,
    readLog,
    deleteLog,
    cleanupLogs,
    // Troubleshoot
    troubleshootRunning,
    troubleshootOutput,
    troubleshootError,
    launchTroubleshoot,
    cancelTroubleshoot,
    clearTroubleshootOutput,
    // Stories generator
    storiesGenerating,
    storiesOutput,
    storiesComplete,
    storiesError,
    generateStories,
    cancelStories,
    saveStories,
    clearStoriesOutput,
    // Iterative PRD generator
    prdInterviewSession,
    prdVersionHistory,
    prdInterviewAnalysis,
    prdInterviewQuestions,
    prdInterviewStatus,
    prdInterviewOutput,
    prdInterviewComplete,
    prdInterviewError,
    checkPrdVersions,
    startPrdInterview,
    analyzePrdCodebase,
    submitPrdAnswers,
    requestMorePrdQuestions,
    generatePrdFromInterview,
    cancelPrdInterview,
    resumePrdSession,
    clearPrdSession,
    clearPrdInterviewOutput,
    // External repos
    externalRepos,
    externalReposCacheStatus,
    externalReposMcpStatus,
    externalReposUrlValidation,
    clearExternalReposUrlValidation,
    setGitHubToken,
    listExternalRepos,
  } = useWebSocket(wsUrl);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSimpleModeChecklist, setShowSimpleModeChecklist] = useState(false);
  const [generateSubTab, setGenerateSubTab] = useState<'plan' | 'review' | 'quality' | 'prd' | 'stories'>('plan');
  const [setupDefaultTab, setSetupDefaultTab] = useState<string | undefined>(undefined);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Derive showOnboarding from projectConfig instead of setting via useEffect
  const showOnboarding = useMemo(() => {
    if (!projectConfig || onboardingComplete) return false;
    return !projectConfig.hasAgentsMd;
  }, [projectConfig, onboardingComplete]);

  // Track selected external repos for PRD context
  const [selectedExternalRepoIds, setSelectedExternalRepoIds] = useState<string[]>([]);

  // Fetch external repos when on PRD sub-tab
  useEffect(() => {
    if (connected && activeTab === 'generate' && generateSubTab === 'prd') {
      listExternalRepos();
    }
  }, [connected, activeTab, generateSubTab, listExternalRepos]);

  // Get workflow mode when connected
  useEffect(() => {
    if (connected) {
      getWorkflowMode();
    }
  }, [connected, getWorkflowMode]);

  // Trigger project scan when entering generate tab if not already scanned
  useEffect(() => {
    if (activeTab === 'generate' && !projectScan && !scanLoading && connected) {
      scanProject();
    }
  }, [activeTab, projectScan, scanLoading, connected, scanProject]);

  // Handle tab changes - clear setupDefaultTab when navigating away from setup
  const handleTabChange = (newTab: string) => {
    if (newTab !== 'setup' && setupDefaultTab) {
      setSetupDefaultTab(undefined);
    }
    setActiveTab(newTab);
  };

  // Fetch external repos when on PRD tab
  useEffect(() => {
    const projectId = projectConfig?.projectId || projectConfig?.projectPath;
    if (generateSubTab === 'prd' && projectId && connected) {
      sendCommand({
        type: 'external-repos:list',
        payload: { projectId },
      });
    }
  }, [generateSubTab, projectConfig?.projectId, projectConfig?.projectPath, connected, sendCommand]);

  // Note: External repos are managed locally for now
  // TODO: Move external repos state and message handling to useWebSocket hook
  // The WebSocket handlers are in place on the server side,
  // but we need to add message handling in useWebSocket.ts for full integration

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
  };

  // Handle workflow mode change - show checklist if switching to simple with missing files
  const handleWorkflowModeChange = (mode: 'simple' | 'advanced') => {
    setWorkflowMode(mode);
    
    // If switching to simple mode, check if required files exist
    if (mode === 'simple' && projectConfig) {
      const hasPrdJson = projectConfig.hasPrdJson ?? false;
      const hasAgents = projectConfig.hasAgentsMd ?? false;
      const hasProgress = projectConfig.hasProgressTxt ?? false;
      
      // Show checklist if any required file is missing
      if (!hasPrdJson || !hasAgents || !hasProgress) {
        setShowSimpleModeChecklist(true);
      }
    }
  };

  // Create AGENTS.md from template
  const handleCreateAgents = () => {
    sendCommand({ type: 'template:create', payload: { template: 'AGENTS.md' } });
  };

  // Create progress.txt from template
  const handleCreateProgress = () => {
    sendCommand({ type: 'template:create', payload: { template: 'progress.txt' } });
  };

  // Navigate to Generate tab and switch to Stories sub-tab
  const handleNavigateToGenerate = () => {
    setShowSimpleModeChecklist(false);
    setActiveTab('generate');
    setGenerateSubTab('prd');
  };

  const handleSaveAgentsMd = (content: string) => {
    sendCommand({ type: 'config:write', payload: { file: 'AGENTS.md', content } });
  };

  const handleRunWizard = () => {
    // Reset onboardingComplete to trigger showOnboarding (which is derived from projectConfig)
    setOnboardingComplete(false);
  };

  // Show onboarding wizard if needed
  if (showOnboarding) {
    return (
      <OnboardingWizard
        projectScan={projectScan}
        projectInfo={projectInfo}
        scanLoading={scanLoading}
        workflowMode={workflowMode}
        onWorkflowModeChange={setWorkflowMode}
        onScanProject={scanProject}
        onSaveAgentsMd={handleSaveAgentsMd}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background" id="main-content" role="main">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4" role="banner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden bg-primary/10">
              <img 
                src="/logo.png" 
                alt="Corporal Wiggum Logo" 
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                <span className="text-primary">Corporal Wiggum</span>
                <span className="text-muted-foreground font-normal text-sm ml-2">Codename: R.A.L.P.H.</span>
              </h1>
              <p className="text-sm text-muted-foreground italic">
                Recursive Autonomous Loop for Programming Heuristically
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <WorkflowModeToggle
              mode={workflowMode}
              onToggle={handleWorkflowModeChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '?mode=launcher'}
              className="gap-2"
              aria-label="Go to project launcher"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Launcher
            </Button>
            {gitStatus.repoName && (
              <a
                href={`https://github.com/${gitStatus.repoName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-4 w-4" />
                {gitStatus.repoName}
              </a>
            )}
            <Badge variant={connected ? 'success' : 'destructive'} className="gap-1">
              {connected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Disconnected
                </>
              )}
            </Badge>
            <Badge variant={loopStatus.running ? 'default' : 'secondary'}>
              {loopStatus.running ? `Running: ${loopStatus.mode}` : 'Idle'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-[750px]">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-2">
              <Wand2 className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2">
              <FileText className="h-4 w-4" />
              Files
            </TabsTrigger>
            <TabsTrigger value="ports" className="gap-2">
              <Server className="h-4 w-4" />
              Ports
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Terminal className="h-4 w-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="setup" className="gap-2">
              <Settings className="h-4 w-4" />
              Setup
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Loop Controls */}
            <LoopControls
              loopStatus={loopStatus}
              onStart={(options) => sendCommand({ type: 'loop:start', payload: options })}
              onStop={() => sendCommand({ type: 'loop:stop' })}
            />

            {/* Existing Documents */}
            <ExistingDocsViewer
              projectConfig={projectConfig}
              onReadFile={readConfigFile}
              onEditFile={(filename: string) => {
                readConfigFile(filename);
                setActiveTab('files');
              }}
              onNavigateToGenerate={(tab) => {
                setActiveTab('generate');
                setGenerateSubTab(tab);
              }}
              previewDoc={configPreviewDoc}
              isLoadingPreview={configPreviewLoading}
              onClosePreview={closeConfigPreview}
              onRefresh={() => sendCommand({ type: 'config:refresh' })}
            />

            {/* Status Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Loop Status */}
              <LoopStatus status={loopStatus} />

              {/* Context Meter */}
              <ContextMeter iteration={loopStatus.iteration} />

              {/* Git Status */}
              <GitHistory status={gitStatus} />
            </div>

            {/* Tasks */}
            <div className="grid gap-6 lg:grid-cols-2">
              <TaskList tasks={tasks} workflowMode={workflowMode} />
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Terminal className="h-5 w-5" />
                  Recent Logs
                </h3>
                <LogViewer logs={logs.slice(-20)} compact onClear={clearLogs} />
              </div>
            </div>
          </TabsContent>

          {/* Generate Tab */}
          <TabsContent value="generate">
            <Tabs value={generateSubTab} onValueChange={(v) => setGenerateSubTab(v as 'plan' | 'review' | 'quality' | 'prd' | 'stories')} className="space-y-4">
              <TabsList className="grid w-full grid-cols-5 lg:w-[900px]">
                <TabsTrigger value="stories" className="gap-2">
                  <ListChecks className="h-4 w-4" />
                  User Stories
                </TabsTrigger>
                <TabsTrigger value="plan" className="gap-2">
                  <ListTodo className="h-4 w-4" />
                  Impl. Plan
                </TabsTrigger>
                <TabsTrigger value="prd" className="gap-2">
                  <FileText className="h-4 w-4" />
                  PRD
                </TabsTrigger>
                <TabsTrigger value="review" className="gap-2">
                  <FileSearch className="h-4 w-4" />
                  Code Review
                </TabsTrigger>
                <TabsTrigger value="quality" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Quality
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stories">
                <StoriesGenerator
                  hasPrd={projectConfig?.hasPRD ?? false}
                  isGenerating={storiesGenerating}
                  output={storiesOutput}
                  complete={storiesComplete}
                  error={storiesError}
                  onGenerate={generateStories}
                  onCancel={cancelStories}
                  onSave={saveStories}
                  onClear={clearStoriesOutput}
                />
              </TabsContent>

              <TabsContent value="plan">
                <PlanGenerator
                  planStatus={planStatus}
                  planOutput={planOutput}
                  planComplete={planComplete}
                  planError={planError}
                  onGeneratePlan={(options) =>
                    sendCommand({ type: 'plan:generate', payload: options })
                  }
                  onCancelPlan={() => sendCommand({ type: 'plan:cancel' })}
                  onInsertPlan={(content) =>
                    sendCommand({
                      type: 'config:write',
                      payload: { file: 'IMPLEMENTATION_PLAN.md', content },
                    })
                  }
                  onClearOutput={clearPlanOutput}
                />
              </TabsContent>

              <TabsContent value="review">
                <ReviewGenerator
                  reviewStatus={reviewGeneratorStatus}
                  reviewOutput={reviewGeneratorOutput}
                  reviewComplete={reviewGeneratorComplete}
                  reviewError={reviewGeneratorError}
                  onGenerateReview={generateReview}
                  onCancelReview={cancelReviewGenerator}
                  onClearOutput={clearReviewGeneratorOutput}
                  onSaveReport={(content) =>
                    sendCommand({
                      type: 'config:write',
                      payload: { file: 'REVIEW_REPORT.md', content },
                    })
                  }
                />
              </TabsContent>

              <TabsContent value="quality">
                <ReviewPanel
                  status={reviewRunnerStatus}
                  output={reviewRunnerOutput}
                  result={reviewRunnerResult}
                  error={reviewRunnerError}
                  onRunReview={runReview}
                  onCancel={cancelReview}
                />
              </TabsContent>

              <TabsContent value="prd">
                <IterativePRDGenerator
                  session={prdInterviewSession}
                  versionHistory={prdVersionHistory}
                  analysis={prdInterviewAnalysis}
                  questions={prdInterviewQuestions}
                  status={prdInterviewStatus}
                  output={prdInterviewOutput}
                  complete={prdInterviewComplete}
                  error={prdInterviewError}
                  discoveredDocs={projectScan?.allMarkdownFiles || []}
                  selectedDocPaths={selectedDocPaths}
                  onDocSelectionChange={setSelectedDocPaths}
                  onPreviewDoc={readDoc}
                  previewDoc={previewDoc}
                  isLoadingPreview={isLoadingPreview}
                  onClosePreview={closeDocPreview}
                  externalRepos={externalRepos}
                  selectedExternalRepoIds={selectedExternalRepoIds}
                  onExternalRepoSelectionChange={setSelectedExternalRepoIds}
                  mcpStatus={externalReposMcpStatus}
                  onNavigateToExternalRepos={() => {
                    setSetupDefaultTab('external-repos');
                    setActiveTab('setup');
                  }}
                  onCheckVersions={checkPrdVersions}
                  onStartInterview={startPrdInterview}
                  onAnalyzeCodebase={analyzePrdCodebase}
                  onSubmitAnswers={submitPrdAnswers}
                  onRequestMoreQuestions={requestMorePrdQuestions}
                  onGeneratePRD={generatePrdFromInterview}
                  onCancel={cancelPrdInterview}
                  onResume={resumePrdSession}
                  onClearSession={clearPrdSession}
                  onClearOutput={clearPrdInterviewOutput}
                  onInsertPRD={(prd, audience) => {
                    // Get version number from complete result or default to unversioned
                    const version = prdInterviewComplete?.version.version;
                    const prdFilename = version ? `PRD_v${version}.md` : 'PRD.md';
                    const audienceFilename = version ? `AUDIENCE_JTBD_v${version}.md` : 'AUDIENCE_JTBD.md';
                    sendCommand({
                      type: 'config:write',
                      payload: { file: prdFilename, content: prd },
                    });
                    sendCommand({
                      type: 'config:write',
                      payload: { file: audienceFilename, content: audience },
                    });
                  }}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <FileEditor
              onReadFile={readConfigFile}
              onWriteFile={(filename: string, content: string) => {
                sendCommand({ type: 'config:write', payload: { file: filename, content } });
              }}
              fileContent={configPreviewDoc}
              isLoading={configPreviewLoading}
            />
          </TabsContent>

          {/* Ports Tab */}
          <TabsContent value="ports">
            <PortsTab
              portProcesses={portProcesses}
              portsLoading={portsLoading}
              portsError={portsError}
              onScanPorts={scanPorts}
              onKillPort={killPort}
            />
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <div className="space-y-6">
              {/* Current session logs */}
              <LogViewer logs={logs} onClear={clearLogs} />
              
              {/* Troubleshoot with Claude CLI */}
              <TroubleshootPanel
                onLaunchTroubleshoot={launchTroubleshoot}
                onCancelTroubleshoot={cancelTroubleshoot}
                onClearOutput={clearTroubleshootOutput}
                isRunning={troubleshootRunning}
                output={troubleshootOutput}
                error={troubleshootError}
              />
              
              {/* Log history for past sessions */}
              <LogHistory
                sessions={logSessions}
                isLoading={logsLoading}
                error={logsError}
                onListLogs={listLogs}
                onReadLog={readLog}
                onDeleteLog={deleteLog}
                onCleanupLogs={cleanupLogs}
                logContent={logContent}
                logContentLoading={logContentLoading}
              />
            </div>
          </TabsContent>

          {/* Setup Tab */}
          <TabsContent value="setup">
            <SetupWizard
              projectConfig={projectConfig}
              enabledAgents={enabledAgents}
              availableAgents={availableAgents}
              cursorRules={cursorRules}
              agentsLoading={agentsLoading}
              rulesLoading={rulesLoading}
              gitStatus={gitStatus}
              projectInfo={projectInfo}
              claudeMdFiles={claudeMdFiles}
              claudeMdContent={claudeMdContent}
              claudeMdLoading={claudeMdLoading}
              claudeMdApplying={claudeMdApplying}
              onReadFile={(file) => sendCommand({ type: 'config:read', payload: { file } })}
              onWriteFile={(file, content) =>
                sendCommand({ type: 'config:write', payload: { file, content } })
              }
              onToggleAgent={(agentId, enabled) =>
                sendCommand({ type: 'agents:toggle', payload: { agentId, enabled } })
              }
              onListAgents={listAgents}
              onListRules={listRules}
              onToggleRule={(ruleId, enabled) =>
                sendCommand({ type: 'rules:toggle', payload: { ruleId, enabled } })
              }
              onListClaudeMdFiles={listClaudeMdFiles}
              onReadClaudeMdFile={readClaudeMdFile}
              onApplyRalphClaudeMd={applyRalphClaudeMd}
              onCloseClaudeMdPreview={closeClaudeMdPreview}
              onRunWizard={handleRunWizard}
              dependencyStatus={dependencyStatus}
              dependencyLoading={dependencyLoading}
              onCheckDependencies={checkDependencies}
              repoAgents={repoAgents}
              repoAgentsLoading={repoAgentsLoading}
              agentInstalling={agentInstalling}
              onListRepoAgents={listRepoAgents}
              onInstallAgentGlobal={installAgentGlobal}
              onInstallAgentProject={installAgentProject}
              onInstallAllAgentsGlobal={installAllAgentsGlobal}
              // External repos
              externalRepos={externalRepos}
              externalReposCacheStatus={externalReposCacheStatus}
              externalReposMcpStatus={externalReposMcpStatus}
              externalReposUrlValidation={externalReposUrlValidation}
              sendCommand={sendCommand}
              onClearExternalReposUrlValidation={clearExternalReposUrlValidation}
              onSetGitHubToken={setGitHubToken}
              defaultTab={setupDefaultTab}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Simple Mode Setup Checklist Modal */}
      <SimpleModeChecklist
        isOpen={showSimpleModeChecklist}
        onClose={() => setShowSimpleModeChecklist(false)}
        projectConfig={projectConfig}
        onCreateAgents={handleCreateAgents}
        onCreateProgress={handleCreateProgress}
        onGenerateStories={generateStories}
        isGeneratingStories={storiesGenerating}
        storiesComplete={storiesComplete}
        onSaveStories={saveStories}
        onNavigateToGenerate={handleNavigateToGenerate}
      />
    </div>
  );
}
