export type LoopMode = 'plan' | 'plan-slc' | 'plan-work' | 'build' | 'review';

// ============================================================================
// Workflow Mode Types (Simple vs Advanced)
// ============================================================================

export type WorkflowMode = 'simple' | 'advanced';

// Simple Mode: prd.json user stories
export interface UserStory {
  id: string;
  title: string;
  acceptanceCriteria: string[];
  priority: number;
  passes: boolean;
  notes?: string;
}

export interface PRDJson {
  branchName: string;
  userStories: UserStory[];
}

export interface LoopStatus {
  running: boolean;
  starting?: boolean;  // true during process spawn, false once confirmed running
  stopping?: boolean;  // true during graceful shutdown, false once confirmed stopped
  mode: LoopMode | null;
  iteration: number;
  maxIterations: number;
  workScope?: string;
  startedAt?: Date;
  pid?: number;
}

// ============================================================================
// Sub-agent Telemetry Types (Feature: Sub-agent Observability)
// ============================================================================

export interface SubAgentTelemetry {
  sessionTotal: number;           // Total sub-agents this session
  iterationCounts: Record<number, number>;  // iteration -> count
  lastSpawnAt?: string;           // ISO date string
  estimatedCost: number;          // Estimated additional cost in USD
}

export interface SubAgentConfig {
  warningThreshold: number;       // Per iteration
  criticalThreshold: number;      // Per iteration
  sessionWarningThreshold: number; // Total session
  estimatedCostPerAgent: number;  // USD per sub-agent spawn
}

// WebSocket messages for sub-agent telemetry
export interface SubAgentStatusMessage extends WSMessage {
  type: 'subagent:status';
  payload: SubAgentTelemetry;
}

export interface SubAgentWarningMessage extends WSMessage {
  type: 'subagent:warning';
  payload: {
    level: 'warning' | 'critical';
    message: string;
    iteration: number;
    count: number;
  };
}

export interface Task {
  id: string;
  content: string;
  completed: boolean;
  priority?: number;
}

export interface TasksState {
  tasks: Task[];
  completed: number;
  total: number;
  lastUpdated?: Date;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
}

export interface GitStatus {
  branch: string;
  uncommittedCount: number;
  commits: GitCommit[];
  lastUpdated?: Date;
  remoteUrl?: string;
  repoName?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  content: string;
  type: 'info' | 'error' | 'warning' | 'success';
}

export interface ProjectConfig {
  projectPath: string;
  projectId?: string;  // Unique ID for project (for external repos lookup)
  hasAgentsMd: boolean;
  hasClaudeMd: boolean;
  hasImplementationPlan: boolean;
  hasPRD: boolean;
  hasAudienceJTBD: boolean;
  hasSpecs: boolean;
  hasCursorRules: boolean;
  hasLoopSh: boolean;
  hasReadme: boolean;
  hasPrdJson: boolean;
  hasProgressTxt: boolean;
  enabledAgents: string[];
}

export interface AgentsConfig {
  buildCommand: string;
  runCommand: string;
  devCommand: string;
  testCommand: string;
  typecheckCommand: string;
  lintCommand: string;
  operationalNotes: string;
  codebasePatterns: string;
}

export interface SpecialistAgent {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export const SPECIALIST_AGENTS: SpecialistAgent[] = [
  {
    id: 'react-typescript-expert',
    name: 'React TypeScript Expert',
    description: 'React architecture, hooks, state, TypeScript types, code reviews, performance optimization',
    enabled: true,
  },
  {
    id: 'accessibility-expert',
    name: 'Accessibility Expert',
    description: 'WCAG 2.2 compliance, ARIA patterns, keyboard navigation, screen reader support, focus management',
    enabled: true,
  },
  {
    id: 'qol-ux-expert',
    name: 'QoL UX Expert',
    description: 'Loading states, toasts, forms UX, dark mode, animations, responsive patterns',
    enabled: true,
  },
];

// Dynamic agent info from file system
export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  source: 'global' | 'project';
  enabled: boolean;
  filePath: string;
}

// Cursor rule info from .cursor/rules/
export interface CursorRuleInfo {
  id: string;
  name: string;
  description: string;
  globs: string[];
  enabled: boolean;
  filePath: string;
}

// WebSocket message types
export interface WSMessage {
  type: string;
  payload: unknown;
}

export interface LoopStatusMessage extends WSMessage {
  type: 'loop:status';
  payload: LoopStatus;
}

export interface LogMessage extends WSMessage {
  type: 'loop:log';
  payload: LogEntry;
}

export interface TasksMessage extends WSMessage {
  type: 'tasks:update';
  payload: TasksState;
}

export interface GitMessage extends WSMessage {
  type: 'git:update';
  payload: GitStatus;
}

export interface ConfigMessage extends WSMessage {
  type: 'config:update';
  payload: ProjectConfig;
}

export interface ConfigSavedMessage extends WSMessage {
  type: 'config:saved';
  payload: {
    file: string;
  };
}

export interface ConfigContentMessage extends WSMessage {
  type: 'config:content';
  payload: {
    file: string;
    content: string;
  };
}

export interface ConfigErrorMessage extends WSMessage {
  type: 'config:error';
  payload: {
    file: string;
    error: string;
  };
}

export interface AgentsUpdateMessage extends WSMessage {
  type: 'agents:update';
  payload: {
    enabledAgents: string[];
  };
}

// Plan generation messages
export interface PlanGeneratorStatus {
  generating: boolean;
  mode: 'plan' | 'plan-slc' | 'plan-work' | null;
  startedAt: Date | null;
}

export interface PlanStatusMessage extends WSMessage {
  type: 'plan:status';
  payload: PlanGeneratorStatus;
}

export interface PlanOutputMessage extends WSMessage {
  type: 'plan:output';
  payload: { text: string };
}

export interface PlanLogMessage extends WSMessage {
  type: 'plan:log';
  payload: { text: string };
}

export interface PlanCompleteMessage extends WSMessage {
  type: 'plan:complete';
  payload: { plan: string; output: string };
}

export interface PlanErrorMessage extends WSMessage {
  type: 'plan:error';
  payload: { error: string };
}

// PRD generation messages
export interface PRDGeneratorStatus {
  generating: boolean;
  startedAt: Date | null;
}

export interface PRDStatusMessage extends WSMessage {
  type: 'prd:status';
  payload: PRDGeneratorStatus;
}

export interface PRDOutputMessage extends WSMessage {
  type: 'prd:output';
  payload: { text: string };
}

export interface PRDCompleteMessage extends WSMessage {
  type: 'prd:complete';
  payload: { prd: string; audience: string };
}

export interface PRDErrorMessage extends WSMessage {
  type: 'prd:error';
  payload: { error: string };
}

// Document content messages (for PRD context)
export interface DocsContentMessage extends WSMessage {
  type: 'docs:content';
  payload: { path: string; content: string };
}

export interface DocsErrorMessage extends WSMessage {
  type: 'docs:error';
  payload: { error: string };
}

// Session recovery messages (for browser refresh resilience)
export interface SessionRecoveredMessage extends WSMessage {
  type: 'session:recovered';
  payload: {
    sessionId: string;
    status: LoopStatus;
  };
}

export interface SessionNoneMessage extends WSMessage {
  type: 'session:none';
  payload: { reason: string };
}

export interface SessionErrorMessage extends WSMessage {
  type: 'session:error';
  payload: { error: string };
}

// ============================================================================
// Orphan Detection Types (for startup orphan cleanup)
// ============================================================================

/**
 * Information about an orphaned loop detected at startup
 */
export interface OrphanedLoop {
  projectId: string;
  projectPath?: string;
  pid: number;
  mode: LoopMode;
  startedAt: string;
  source: 'database' | 'pidfile';
  status: 'alive' | 'dead';
}

/**
 * Result of orphan detection at startup
 */
export interface OrphanDetectionResult {
  /** Live processes without proper tracking */
  orphans: OrphanedLoop[];
  /** Session IDs marked as crashed (dead processes) */
  staleSessions: string[];
  /** PID files deleted (dead processes) */
  stalePidFiles: string[];
}

// Orphan detection WebSocket messages
export interface OrphansDetectedMessage extends WSMessage {
  type: 'orphans:detected';
  payload: { orphans: OrphanedLoop[] };
}

export interface OrphansCleanedMessage extends WSMessage {
  type: 'orphans:cleaned';
  payload: { pid: number; projectId: string };
}

export interface OrphansAllCleanedMessage extends WSMessage {
  type: 'orphans:all-cleaned';
  payload: { cleaned: number; failed: number };
}

export interface OrphansErrorMessage extends WSMessage {
  type: 'orphans:error';
  payload: { error: string };
}

// ============================================================================
// Workflow Mode WebSocket Messages
// ============================================================================

export interface ModeCurrentMessage extends WSMessage {
  type: 'mode:current';
  payload: {
    mode: WorkflowMode;
  };
}

export interface ModeUpdatedMessage extends WSMessage {
  type: 'mode:updated';
  payload: {
    success: boolean;
    mode?: WorkflowMode;
    filesCreated?: string[];
    message?: string;
  };
}

export type ServerMessage =
  | LoopStatusMessage
  | LogMessage
  | TasksMessage
  | GitMessage
  | ConfigMessage
  | ConfigSavedMessage
  | ConfigContentMessage
  | ConfigErrorMessage
  | AgentsUpdateMessage
  | AgentsListResultMessage
  | RulesListResultMessage
  | RulesUpdateMessage
  | PlanStatusMessage
  | PlanOutputMessage
  | PlanLogMessage
  | PlanCompleteMessage
  | PlanErrorMessage
  | PRDStatusMessage
  | PRDOutputMessage
  | PRDCompleteMessage
  | PRDErrorMessage
  | DocsContentMessage
  | DocsErrorMessage
  | ProjectScanMessage
  | ProjectInfoMessage
  | ClaudeMdListResultMessage
  | ClaudeMdContentMessage
  | ClaudeMdAppliedMessage
  | ClaudeMdErrorMessage
  | DependenciesResultMessage
  | DependenciesErrorMessage
  | RepoAgentsResultMessage
  | AgentInstalledMessage
  | AgentErrorMessage
  | LauncherProjectsListMessage
  | LauncherProjectAddedMessage
  | LauncherProjectRemovedMessage
  | LauncherInstancesListMessage
  | LauncherInstanceSpawnedMessage
  | LauncherInstanceStoppedMessage
  | LauncherInstanceCrashedMessage
  | LauncherDiscoverResultMessage
  | LauncherInitResultMessage
  | LauncherInitErrorMessage
  | LauncherErrorMessage
  | LauncherBrowseResultMessage
  | ReviewStatusMessage
  | ReviewOutputMessage
  | ReviewCompleteMessage
  | ReviewErrorMessage
  | ReviewCancelledMessage
  | ReviewGeneratorStatusMessage
  | ReviewGeneratorOutputMessage
  | ReviewGeneratorCompleteMessage
  | ReviewGeneratorErrorMessage
  | SessionRecoveredMessage
  | SessionNoneMessage
  | SessionErrorMessage
  | OrphansDetectedMessage
  | OrphansCleanedMessage
  | OrphansAllCleanedMessage
  | OrphansErrorMessage
  | ModeCurrentMessage
  | ModeUpdatedMessage
  | PortsListMessage
  | PortsKilledMessage
  | PortsErrorMessage
  | LogsListMessage
  | LogsContentMessage
  | LogsDeletedMessage
  | LogsCleanupResultMessage
  | LogsErrorMessage
  | TroubleshootStatusMessage
  | TroubleshootOutputMessage
  | TroubleshootCompleteMessage
  | TroubleshootCancelledMessage
  | TroubleshootErrorMessage
  | StoriesStatusMessage
  | StoriesOutputMessage
  | StoriesCompleteMessage
  | StoriesSavedMessage
  | StoriesCancelledMessage
  | StoriesErrorMessage
  | PRDInterviewVersionsMessage
  | PRDInterviewSessionMessage
  | PRDInterviewAnalysisMessage
  | PRDInterviewQuestionsMessage
  | PRDInterviewStatusMessage
  | PRDInterviewOutputMessage
  | PRDInterviewCompleteMessage
  | PRDInterviewCancelledMessage
  | PRDInterviewErrorMessage
  | ExternalReposListMessage
  | ExternalReposAddedMessage
  | ExternalReposUpdatedMessage
  | ExternalReposRemovedMessage
  | ExternalReposFetchedMessage
  | ExternalReposCacheStatusMessage
  | ExternalReposCacheClearedMessage
  | ExternalReposMcpStatusMessage
  | ExternalReposUrlValidatedMessage
  | ExternalReposTokenValidatedMessage
  | ExternalReposTokenSetMessage
  | ExternalReposCacheStatsMessage
  | ExternalReposErrorMessage
  | SubAgentStatusMessage
  | SubAgentWarningMessage;

// Client commands
export interface StartLoopCommand {
  type: 'loop:start';
  payload: {
    mode: LoopMode;
    maxIterations?: number;
    workScope?: string;
  };
}

export interface StopLoopCommand {
  type: 'loop:stop';
}

export interface ReadConfigCommand {
  type: 'config:read';
  payload: {
    file: string;
  };
}

export interface WriteConfigCommand {
  type: 'config:write';
  payload: {
    file: string;
    content: string;
  };
}

export interface RefreshConfigCommand {
  type: 'config:refresh';
}

export interface ToggleAgentCommand {
  type: 'agents:toggle';
  payload: {
    agentId: string;
    enabled: boolean;
  };
}

export interface GeneratePlanCommand {
  type: 'plan:generate';
  payload: {
    goal: string;
    mode: 'plan' | 'plan-slc' | 'plan-work';
    workScope?: string;
    usePrdContext?: boolean;  // Include PRD.md and AUDIENCE_JTBD.md as context
  };
}

export interface CancelPlanCommand {
  type: 'plan:cancel';
}

export interface ClearPlanOutputCommand {
  type: 'plan:clear';
}

export interface GeneratePRDCommand {
  type: 'prd:generate';
  payload: {
    productName: string;
    overallDescription: string;  // High-level description of the application
    problemStatement: string;
    targetAudience: string;
    keyCapabilities: string[];
    contextDocs?: string[];  // Optional array of doc paths to include as context
    docsOnly?: boolean;      // If true, generate PRD from docs only without form fields
  };
}

export interface CancelPRDCommand {
  type: 'prd:cancel';
}

// Document reading command
export interface ReadDocCommand {
  type: 'docs:read';
  payload: {
    docPath: string;
  };
}

// Project info (from project root detector)
export interface ProjectInfo {
  targetProjectPath: string;
  ralphPath: string;
  mode: 'embedded' | 'standalone';
  detectionReason: string;
}

export interface ProjectInfoMessage extends WSMessage {
  type: 'project:info';
  payload: ProjectInfo;
}

// Subproject detected within a monorepo/multi-project structure
export interface SubProject {
  name: string;
  path: string;
  language: 'typescript' | 'javascript' | 'go' | 'python' | 'unknown';
  framework: string | null;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | null;
}

// Discovered markdown document for PRD context selection
export interface DiscoveredDoc {
  path: string;           // Relative path from project root
  name: string;           // File basename
  size: number;           // File size in bytes
  directory: string;      // Parent directory (for grouping in UI)
}

// Project scanning types
export interface ProjectScan {
  projectName: string;
  projectPath: string;
  scanMode: 'embedded' | 'standalone';
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | null;
  framework: string | null;
  language: 'typescript' | 'javascript' | 'python' | 'go' | 'mixed' | 'unknown';
  detectedCommands: {
    build?: string;
    dev?: string;
    test?: string;
    lint?: string;
    typecheck?: string;
  };
  existingDocs: Array<{
    path: string;
    name: string;
    size: number;
  }>;
  // All discovered markdown files for PRD context selection
  allMarkdownFiles: DiscoveredDoc[];
  hasRalphConfig: {
    agentsMd: boolean;
    claudeMd: boolean;
    implementationPlan: boolean;
    loopSh: boolean;
    specsDir: boolean;
    cursorRules: boolean;
  };
  hasRalphSubdirectory: boolean;
  structure: Array<{
    path: string;
    type: 'dir' | 'file';
  }>;
  subprojects: SubProject[];
  isMonorepo: boolean;
}

export interface ProjectScanMessage extends WSMessage {
  type: 'project:scan-result';
  payload: ProjectScan;
}

export interface ScanProjectCommand {
  type: 'project:scan';
}

// Agent list messages
export interface AgentsListResultMessage extends WSMessage {
  type: 'agents:list-result';
  payload: AgentInfo[];
}

// Cursor rules messages
export interface RulesListResultMessage extends WSMessage {
  type: 'rules:list-result';
  payload: CursorRuleInfo[];
}

export interface RulesUpdateMessage extends WSMessage {
  type: 'rules:update';
  payload: CursorRuleInfo[];
}

// Agent list command
export interface ListAgentsCommand {
  type: 'agents:list';
}

// Cursor rules commands
export interface ListRulesCommand {
  type: 'rules:list';
}

export interface ToggleRuleCommand {
  type: 'rules:toggle';
  payload: {
    ruleId: string;
    enabled: boolean;
  };
}

// CLAUDE.md file info
export interface ClaudeMdFile {
  path: string;
  location: string;
  exists: boolean;
  lineCount: number;
}

// CLAUDE.md commands
export interface ListClaudeMdCommand {
  type: 'claude:list';
}

export interface ReadClaudeMdCommand {
  type: 'claude:read';
  payload: {
    path: string;
  };
}

export interface ApplyClaudeMdCommand {
  type: 'claude:apply';
}

// CLAUDE.md messages
export interface ClaudeMdListResultMessage extends WSMessage {
  type: 'claude:list-result';
  payload: ClaudeMdFile[];
}

export interface ClaudeMdContentMessage extends WSMessage {
  type: 'claude:content';
  payload: {
    path: string;
    content: string;
  };
}

export interface ClaudeMdAppliedMessage extends WSMessage {
  type: 'claude:applied';
}

export interface ClaudeMdErrorMessage extends WSMessage {
  type: 'claude:error';
  payload: {
    error: string;
  };
}

// Dependency check result
export interface DependencyCheckResult {
  id: string;
  name: string;
  available: boolean;
  version?: string;
  path?: string;
  error?: string;
}

// Dependency check commands
export interface CheckDependenciesCommand {
  type: 'dependencies:check';
}

// Dependency check messages
export interface DependenciesResultMessage extends WSMessage {
  type: 'dependencies:result';
  payload: DependencyCheckResult[];
}

export interface DependenciesErrorMessage extends WSMessage {
  type: 'dependencies:error';
  payload: {
    error: string;
  };
}

// Repo agent info (agents available in Ralph repo for installation)
export interface RepoAgentInfo {
  id: string;
  name: string;
  description: string;
  filePath: string;
  installedGlobal: boolean;
  installedProject: boolean;
}

// Agent installation commands
export interface ListRepoAgentsCommand {
  type: 'agents:list-repo';
}

export interface InstallAgentGlobalCommand {
  type: 'agents:install-global';
  payload: {
    agentId: string;
  };
}

export interface InstallAgentProjectCommand {
  type: 'agents:install-project';
  payload: {
    agentId: string;
  };
}

export interface InstallAllAgentsGlobalCommand {
  type: 'agents:install-all-global';
}

// Agent installation messages
export interface RepoAgentsResultMessage extends WSMessage {
  type: 'agents:repo-result';
  payload: RepoAgentInfo[];
}

export interface AgentInstalledMessage extends WSMessage {
  type: 'agents:installed';
  payload: {
    agentId: string;
    scope: 'global' | 'project';
  };
}

export interface AgentErrorMessage extends WSMessage {
  type: 'agents:error';
  payload: {
    error: string;
  };
}

export type ClientCommand =
  | StartLoopCommand
  | StopLoopCommand
  | ReadConfigCommand
  | WriteConfigCommand
  | RefreshConfigCommand
  | ToggleAgentCommand
  | ListAgentsCommand
  | ListRulesCommand
  | ToggleRuleCommand
  | GeneratePlanCommand
  | CancelPlanCommand
  | ClearPlanOutputCommand
  | GeneratePRDCommand
  | CancelPRDCommand
  | ReadDocCommand
  | ScanProjectCommand
  | ListClaudeMdCommand
  | ReadClaudeMdCommand
  | ApplyClaudeMdCommand
  | CheckDependenciesCommand
  | ListRepoAgentsCommand
  | InstallAgentGlobalCommand
  | InstallAgentProjectCommand
  | InstallAllAgentsGlobalCommand
  | LauncherListProjectsCommand
  | LauncherAddProjectCommand
  | LauncherRemoveProjectCommand
  | LauncherSpawnInstanceCommand
  | LauncherStopInstanceCommand
  | LauncherListInstancesCommand
  | LauncherDiscoverCommand
  | LauncherInitProjectCommand
  | LauncherBrowseCommand
  | ReviewRunCommand
  | ReviewCancelCommand
  | GenerateReviewCommand
  | CancelReviewGeneratorCommand
  | ModeGetCommand
  | ModeSetCommand
  | PortsScanCommand
  | PortsKillCommand
  | LogsListCommand
  | LogsReadCommand
  | LogsDeleteCommand
  | LogsCleanupCommand
  | TroubleshootLaunchCommand
  | TroubleshootCancelCommand
  | StoriesGenerateCommand
  | StoriesCancelCommand
  | StoriesSaveCommand
  | TemplateCreateCommand
  | PRDInterviewCheckVersionsCommand
  | PRDInterviewStartCommand
  | PRDInterviewAnalyzeCodebaseCommand
  | PRDInterviewAnswerCommand
  | PRDInterviewMoreQuestionsCommand
  | PRDInterviewGenerateCommand
  | PRDInterviewCancelCommand
  | PRDInterviewResumeCommand
  | PRDInterviewClearCommand
  | ExternalReposListCommand
  | ExternalReposAddCommand
  | ExternalReposUpdateCommand
  | ExternalReposRemoveCommand
  | ExternalReposFetchCommand
  | ExternalReposCacheStatusCommand
  | ExternalReposClearCacheCommand
  | ExternalReposMcpStatusCommand
  | ExternalReposValidateUrlCommand
  | ExternalReposValidateTokenCommand
  | ExternalReposSetTokenCommand
  | ExternalReposCacheStatsCommand;

// Template creation command
export interface TemplateCreateCommand {
  type: 'template:create';
  payload: {
    template: string;
  };
}

// Workflow mode commands
export interface ModeGetCommand {
  type: 'mode:get';
}

export interface ModeSetCommand {
  type: 'mode:set';
  payload: {
    mode: WorkflowMode;
  };
}

// ============================================================================
// Project Launcher Types (Feature Set 9)
// ============================================================================

// Project registered in the launcher
export interface LauncherProject {
  id: string;
  path: string;
  name: string;
  addedAt: string;  // ISO date string
  lastOpened?: string;  // ISO date string
  isRalphReady: boolean;
}

// Running dashboard instance
export interface LauncherInstance {
  projectId: string;
  backendPort: number;
  frontendPort: number;
  pid: number;
  startedAt: string;  // ISO date string
  loopStatus?: {
    running: boolean;
    iteration: number;
    mode: string;
    // Session metrics for LAUN-02/LAUN-05
    costSpent?: number;        // Cost in cents from SessionRepository
    maxIterations?: number;    // From session config
    state?: 'running' | 'paused' | 'stopping' | 'completed' | 'crashed';
  };
}

// Project discovered during auto-discovery scan
export interface DiscoveredProject {
  path: string;
  name: string;
  isGitRepo: boolean;
  isRalphReady: boolean;
  alreadyRegistered: boolean;
}

// Launcher WebSocket Commands
export interface LauncherListProjectsCommand {
  type: 'launcher:projects:list';
}

export interface LauncherAddProjectCommand {
  type: 'launcher:projects:add';
  payload: {
    path: string;
  };
}

export interface LauncherRemoveProjectCommand {
  type: 'launcher:projects:remove';
  payload: {
    projectId: string;
  };
}

export interface LauncherSpawnInstanceCommand {
  type: 'launcher:instance:spawn';
  payload: {
    projectId: string;
  };
}

export interface LauncherStopInstanceCommand {
  type: 'launcher:instance:stop';
  payload: {
    projectId: string;
  };
}

export interface LauncherListInstancesCommand {
  type: 'launcher:instances:list';
}

export interface LauncherDiscoverCommand {
  type: 'launcher:discover';
}

export interface LauncherInitProjectCommand {
  type: 'launcher:project:init';
  payload: {
    projectId: string;
    templates?: string[];  // Optional: specific templates to create (defaults to all)
  };
}

// Result of project initialization
export interface ProjectInitResult {
  projectId: string;
  created: string[];  // List of files created
  skipped: string[];  // List of files that already existed
}

export interface LauncherInitResultMessage extends WSMessage {
  type: 'launcher:project:init:result';
  payload: ProjectInitResult;
}

export interface LauncherInitErrorMessage extends WSMessage {
  type: 'launcher:project:init:error';
  payload: {
    projectId: string;
    error: string;
  };
}

// Launcher WebSocket Server Messages
export interface LauncherProjectsListMessage extends WSMessage {
  type: 'launcher:projects:list';
  payload: LauncherProject[];
}

export interface LauncherProjectAddedMessage extends WSMessage {
  type: 'launcher:project:added';
  payload: LauncherProject;
}

export interface LauncherProjectRemovedMessage extends WSMessage {
  type: 'launcher:project:removed';
  payload: {
    projectId: string;
  };
}

export interface LauncherInstancesListMessage extends WSMessage {
  type: 'launcher:instances:list';
  payload: LauncherInstance[];
}

export interface LauncherInstanceSpawnedMessage extends WSMessage {
  type: 'launcher:instance:spawned';
  payload: LauncherInstance;
}

export interface LauncherInstanceStoppedMessage extends WSMessage {
  type: 'launcher:instance:stopped';
  payload: {
    projectId: string;
  };
}

export interface LauncherInstanceCrashedMessage extends WSMessage {
  type: 'launcher:instance:crashed';
  payload: {
    projectId: string;
    error: string;
  };
}

export interface LauncherDiscoverResultMessage extends WSMessage {
  type: 'launcher:discover:result';
  payload: DiscoveredProject[];
}

export interface LauncherErrorMessage extends WSMessage {
  type: 'launcher:error';
  payload: {
    error: string;
  };
}

// ============================================================================
// File Browser Types (Feature Set 12)
// ============================================================================

// Directory entry in file browser
export interface BrowseEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isGitRepo: boolean;
  isRalphReady: boolean;
}

// Result of browsing a directory
export interface BrowseResult {
  currentPath: string;
  parentPath: string | null;
  entries: BrowseEntry[];
  drives?: string[];  // Windows drive letters (C:, D:, etc.)
}

// File browser WebSocket command
export interface LauncherBrowseCommand {
  type: 'launcher:browse';
  payload: {
    path: string;  // Empty string or "/" for root/drives on Windows
  };
}

// File browser WebSocket message
export interface LauncherBrowseResultMessage extends WSMessage {
  type: 'launcher:browse:result';
  payload: BrowseResult;
}

// ============================================================================
// LLM-as-Judge Review Types (Feature Set 13)
// ============================================================================

// Configuration for running a review
export interface ReviewConfig {
  criteria: string;      // What to evaluate (behavioral, observable)
  artifact: string;      // Text content OR image path (.png, .jpg, .jpeg)
  artifactPath?: string; // Optional path context for image artifacts
}

// Result of a review
export interface ReviewResult {
  pass: boolean;
  score?: number;        // Optional score out of 100
  feedback?: string;     // Only present when pass=false
  criteria: string;
  reviewedAt: string;    // ISO date string
}

// Review runner status
export interface ReviewRunnerStatus {
  running: boolean;
  startedAt: string | null;  // ISO date string
}

// Review WebSocket commands
export interface ReviewRunCommand {
  type: 'review:run';
  payload: ReviewConfig;
}

export interface ReviewCancelCommand {
  type: 'review:cancel';
}

// Review WebSocket messages
export interface ReviewStatusMessage extends WSMessage {
  type: 'review:status';
  payload: ReviewRunnerStatus;
}

export interface ReviewOutputMessage extends WSMessage {
  type: 'review:output';
  payload: { text: string };
}

export interface ReviewCompleteMessage extends WSMessage {
  type: 'review:complete';
  payload: ReviewResult;
}

export interface ReviewErrorMessage extends WSMessage {
  type: 'review:error';
  payload: { error: string };
}

export interface ReviewCancelledMessage extends WSMessage {
  type: 'review:cancelled';
}

// ============================================================================
// Code Review Generator Types (Feature Set 14 - Review Mode)
// ============================================================================

// Review Generator mode types
export type ReviewGeneratorMode = 'review' | 'review-quick' | 'review-spec';

// Status of review generation
export interface ReviewGeneratorStatus {
  generating: boolean;
  mode: ReviewGeneratorMode | null;
  startedAt: Date | null;
}

// Parsed review report data
export interface ReviewReportData {
  generatedAt: string;
  mode: string;
  duration: string;
  summary: {
    tasksClaimedComplete: number;
    actuallyVerifiedComplete: number;
    incompleteBroken: number;
    technicalDebtItems: number;
    missingTestCoverage: number;
  };
  healthScore: {
    completed: number;
    total: number;
    percentage: number;
  };
  verifiedComplete: Array<{
    taskId: string;
    description: string;
    evidence: string;
  }>;
  incompleteMarkedDone: Array<{
    taskId: string;
    description: string;
    issueType: string;
    details: string;
    file?: string;
  }>;
  technicalDebt: Array<{
    severity: 'High' | 'Medium' | 'Low';
    file: string;
    line: number;
    issue: string;
  }>;
  missingCoverage: Array<{
    spec: string;
    criterion: string;
    status: string;
  }>;
  recommendations: string[];
}

// Review Generator WebSocket Commands
export interface GenerateReviewCommand {
  type: 'review-generator:generate';
  payload: {
    mode: ReviewGeneratorMode;
    focusArea?: string;
    specFile?: string;
  };
}

export interface CancelReviewGeneratorCommand {
  type: 'review-generator:cancel';
}

// Review Generator WebSocket Messages
export interface ReviewGeneratorStatusMessage extends WSMessage {
  type: 'review-generator:status';
  payload: ReviewGeneratorStatus;
}

export interface ReviewGeneratorOutputMessage extends WSMessage {
  type: 'review-generator:output';
  payload: { text: string };
}

export interface ReviewGeneratorCompleteMessage extends WSMessage {
  type: 'review-generator:complete';
  payload: { report: string; output: string };
}

export interface ReviewGeneratorErrorMessage extends WSMessage {
  type: 'review-generator:error';
  payload: { error: string };
}

// ============================================================================
// Port Management Types (Feature Set: Ports Tab)
// ============================================================================

// A process using a network port
export interface PortProcess {
  pid: number;
  name: string;
  port: number;
  protocol: 'TCP' | 'UDP';
  state: string;
  user: string;
}

// Port scan WebSocket command
export interface PortsScanCommand {
  type: 'ports:scan';
}

// Port kill WebSocket command
export interface PortsKillCommand {
  type: 'ports:kill';
  payload: {
    pid: number;
  };
}

// Port list WebSocket message (response to scan)
export interface PortsListMessage extends WSMessage {
  type: 'ports:list';
  payload: PortProcess[];
}

// Port killed WebSocket message (response to kill)
export interface PortsKilledMessage extends WSMessage {
  type: 'ports:killed';
  payload: {
    pid: number;
    success: boolean;
  };
}

// Port error WebSocket message
export interface PortsErrorMessage extends WSMessage {
  type: 'ports:error';
  payload: {
    error: string;
  };
}

// ============================================================================
// Log Management Types (Feature Set: Log History)
// ============================================================================

// A log session file
export interface LogSession {
  filename: string;
  timestamp: string;
  size: number;
  date: string;  // ISO date string
  isActive: boolean;
}

// Log list WebSocket command
export interface LogsListCommand {
  type: 'logs:list';
}

// Log read WebSocket command
export interface LogsReadCommand {
  type: 'logs:read';
  payload: {
    filename: string;
  };
}

// Log delete WebSocket command
export interface LogsDeleteCommand {
  type: 'logs:delete';
  payload: {
    filename: string;
  };
}

// Log cleanup WebSocket command
export interface LogsCleanupCommand {
  type: 'logs:cleanup';
  payload: {
    keepDays: number;
  };
}

// Log list WebSocket message (response to list)
export interface LogsListMessage extends WSMessage {
  type: 'logs:list';
  payload: LogSession[];
}

// Log content WebSocket message (response to read)
export interface LogsContentMessage extends WSMessage {
  type: 'logs:content';
  payload: {
    filename: string;
    content: string;
  };
}

// Log deleted WebSocket message (response to delete)
export interface LogsDeletedMessage extends WSMessage {
  type: 'logs:deleted';
  payload: {
    filename: string;
  };
}

// Log cleanup result WebSocket message
export interface LogsCleanupResultMessage extends WSMessage {
  type: 'logs:cleanup:result';
  payload: {
    deletedCount: number;
  };
}

// Log error WebSocket message
export interface LogsErrorMessage extends WSMessage {
  type: 'logs:error';
  payload: {
    error: string;
  };
}

// ============================================================================
// Troubleshoot Types (Feature: Claude CLI Troubleshooting)
// ============================================================================

// Troubleshoot launch WebSocket command
export interface TroubleshootLaunchCommand {
  type: 'troubleshoot:launch';
  payload: {
    errorLog: string;
  };
}

// Troubleshoot cancel WebSocket command
export interface TroubleshootCancelCommand {
  type: 'troubleshoot:cancel';
}

// Troubleshoot status WebSocket message
export interface TroubleshootStatusMessage extends WSMessage {
  type: 'troubleshoot:status';
  payload: {
    running: boolean;
    startedAt: string | null;
  };
}

// Troubleshoot output WebSocket message (streaming)
export interface TroubleshootOutputMessage extends WSMessage {
  type: 'troubleshoot:output';
  payload: {
    text: string;
  };
}

// Troubleshoot complete WebSocket message
export interface TroubleshootCompleteMessage extends WSMessage {
  type: 'troubleshoot:complete';
  payload: {
    success: boolean;
    output: string;
  };
}

// Troubleshoot cancelled WebSocket message
export interface TroubleshootCancelledMessage extends WSMessage {
  type: 'troubleshoot:cancelled';
}

// Troubleshoot error WebSocket message
export interface TroubleshootErrorMessage extends WSMessage {
  type: 'troubleshoot:error';
  payload: {
    error: string;
  };
}

// ============================================================================
// Stories Generator Types (Feature: PRD.md to prd.json conversion)
// ============================================================================

// Note: UserStory interface is defined at the top of this file

// prd.json structure (uses UserStory from above)
export interface PrdJson {
  branchName: string;
  userStories: UserStory[];
}

// Stories generator status
export interface StoriesGeneratorStatus {
  generating: boolean;
  startedAt: string | null;
}

// Stories generate WebSocket command
export interface StoriesGenerateCommand {
  type: 'stories:generate';
}

// Stories cancel WebSocket command
export interface StoriesCancelCommand {
  type: 'stories:cancel';
}

// Stories save WebSocket command
export interface StoriesSaveCommand {
  type: 'stories:save';
  payload: {
    prdJson: PrdJson;
  };
}

// Stories status WebSocket message
export interface StoriesStatusMessage extends WSMessage {
  type: 'stories:status';
  payload: StoriesGeneratorStatus;
}

// Stories output WebSocket message (streaming)
export interface StoriesOutputMessage extends WSMessage {
  type: 'stories:output';
  payload: {
    text: string;
  };
}

// Stories complete WebSocket message
export interface StoriesCompleteMessage extends WSMessage {
  type: 'stories:complete';
  payload: PrdJson;
}

// Stories saved WebSocket message
export interface StoriesSavedMessage extends WSMessage {
  type: 'stories:saved';
  payload: {
    success: boolean;
  };
}

// Stories cancelled WebSocket message
export interface StoriesCancelledMessage extends WSMessage {
  type: 'stories:cancelled';
}

// Stories error WebSocket message
export interface StoriesErrorMessage extends WSMessage {
  type: 'stories:error';
  payload: {
    error: string;
  };
}

// ============================================================================
// Iterative PRD Generator Types (Feature: Q&A Interview + Versioning)
// ============================================================================

// PRD Version information
export interface PRDVersion {
  version: number;           // 1, 2, 3, etc.
  filename: string;          // PRD_v1.md
  audienceFilename: string;  // AUDIENCE_JTBD_v1.md
  createdAt: string;         // ISO date string
  description: string;       // Brief summary of what this version added
}

// PRD Version history
export interface PRDVersionHistory {
  versions: PRDVersion[];
  latestVersion: number;
}

// Codebase analysis result
export interface CodebaseAnalysis {
  // From ProjectScanner
  techStack: string[];
  fileCount: number;
  hasTests: boolean;
  hasApi: boolean;
  
  // From Claude analysis
  summary: string;              // High-level description
  keyComponents: string[];      // Main modules/features identified
  architectureNotes: string;    // Architecture observations
  suggestedFocus: string[];     // Areas Claude thinks need attention
}

// Question category type
export type PRDQuestionCategory = 'technical' | 'users' | 'features' | 'scope' | 'integration' | 'other';

// Individual question in Q&A
export interface PRDQuestion {
  id: string;
  text: string;
  category?: PRDQuestionCategory;
  answer?: string;
  suggestedAnswer?: string;  // AI-suggested answer to pre-fill
  skipped: boolean;
}

// A round of Q&A
export interface PRDQuestionRound {
  roundNumber: number;
  questions: PRDQuestion[];
  submittedAt?: string;  // ISO date string
}

// Phase of the PRD interview
export type PRDInterviewPhase = 'version-select' | 'input' | 'analyzing' | 'questions' | 'generating' | 'complete';

// Full PRD interview session
export interface PRDSession {
  id: string;
  createdAt: string;         // ISO date string
  updatedAt: string;         // ISO date string
  
  // Version info
  targetVersion: number;           // Version being created
  previousVersions: number[];      // Selected previous versions for context
  
  // Phase tracking
  phase: PRDInterviewPhase;
  
  // Input data
  description: string;
  additionalContext?: string;      // Free text pasted by user (rough draft PRD, specs, etc.)
  contextDocs: string[];
  
  // Codebase analysis
  codebaseAnalysis?: CodebaseAnalysis;
  
  // Q&A rounds
  rounds: PRDQuestionRound[];
  
  // Output
  finalPrd?: string;
  finalAudience?: string;
}

// PRD Interview status for UI
export interface PRDInterviewStatus {
  hasSession: boolean;
  session?: PRDSession;
  versions: PRDVersion[];
  analyzing: boolean;
  generating: boolean;
}

// --- PRD Interview Commands (Client -> Server) ---

export interface PRDInterviewCheckVersionsCommand {
  type: 'prd-interview:check-versions';
}

export interface PRDInterviewStartCommand {
  type: 'prd-interview:start';
  payload: {
    description: string;
    additionalContext?: string;  // Free text pasted by user (rough draft PRD, specs, etc.)
    contextDocs: string[];
    previousVersions: number[];  // Which versions to use as context
    startFresh: boolean;         // true = start from v1, false = continue from latest
    skipQuestions?: boolean;     // If true, go directly to PRD generation
  };
}

export interface PRDInterviewAnalyzeCodebaseCommand {
  type: 'prd-interview:analyze-codebase';
}

export interface PRDInterviewAnswerCommand {
  type: 'prd-interview:answer';
  payload: {
    roundNumber: number;
    answers: Array<{ questionId: string; answer?: string; skipped: boolean }>;
  };
}

export interface PRDInterviewMoreQuestionsCommand {
  type: 'prd-interview:more';
}

export interface PRDInterviewGenerateCommand {
  type: 'prd-interview:generate';
}

export interface PRDInterviewCancelCommand {
  type: 'prd-interview:cancel';
}

export interface PRDInterviewResumeCommand {
  type: 'prd-interview:resume';
}

export interface PRDInterviewClearCommand {
  type: 'prd-interview:clear';
}

// --- PRD Interview Messages (Server -> Client) ---

export interface PRDInterviewVersionsMessage extends WSMessage {
  type: 'prd-interview:versions';
  payload: PRDVersionHistory;
}

export interface PRDInterviewSessionMessage extends WSMessage {
  type: 'prd-interview:session';
  payload: PRDSession;
}

export interface PRDInterviewAnalysisMessage extends WSMessage {
  type: 'prd-interview:analysis';
  payload: CodebaseAnalysis;
}

export interface PRDInterviewQuestionsMessage extends WSMessage {
  type: 'prd-interview:questions';
  payload: {
    roundNumber: number;
    questions: PRDQuestion[];
  };
}

export interface PRDInterviewStatusMessage extends WSMessage {
  type: 'prd-interview:status';
  payload: {
    phase: PRDInterviewPhase;
    analyzing: boolean;
    generating: boolean;
  };
}

export interface PRDInterviewOutputMessage extends WSMessage {
  type: 'prd-interview:output';
  payload: { text: string };
}

export interface PRDInterviewCompleteMessage extends WSMessage {
  type: 'prd-interview:complete';
  payload: {
    version: PRDVersion;
    prd: string;
    audience: string;
  };
}

export interface PRDInterviewCancelledMessage extends WSMessage {
  type: 'prd-interview:cancelled';
}

export interface PRDInterviewErrorMessage extends WSMessage {
  type: 'prd-interview:error';
  payload: { error: string };
}

// ============================================================================
// External Repository Types (Feature: Dynamic GitHub Repo References)
// ============================================================================

/**
 * Fetch strategy for external repositories
 */
export type RepoFetchStrategy =
  | 'readme-only'      // Just README.md
  | 'docs-folder'      // README + docs/*.md
  | 'specified'        // User-defined paths
  | 'auto'             // Auto-detect key files
  | 'typescript-lib'   // TypeScript library profile
  | 'python-lib'       // Python library profile
  | 'full-clone'       // Clone entire repo
  | 'mcp-only'         // MCP queries only (minimal static)
  | 'hybrid';          // Core files + MCP queries

/**
 * External repository reference (stored in project settings)
 */
export interface ExternalRepoReference {
  id: string;                     // UUID
  url: string;                    // https://github.com/owner/repo
  alias: string;                  // Display name
  branch?: string;                // Default: auto-detected

  // Fetch configuration
  fetchStrategy: RepoFetchStrategy;
  paths?: string[];               // For 'specified' strategy
  mcpHints?: string[];            // For 'mcp-only' or 'hybrid'

  // Limits
  maxTokens?: number;             // Default: 50000 chars

  // Metadata
  purpose?: string;               // Why this repo is referenced
  addedAt: string;                // ISO date
  lastFetchedAt?: string;         // ISO date
  cachedCommitSha?: string;       // For freshness checking

  // Cache settings (per-repo override)
  cacheTTLHours?: number;         // Override default (24h)
  disableCache?: boolean;         // Always fetch fresh
}

/**
 * Cache status for a repository
 */
export interface RepoCacheStatus {
  cached: boolean;
  fresh: boolean;
  reason?: 'not_cached' | 'ttl_expired' | 'new_commits' | 'fresh';
  localSha?: string;
  remoteSha?: string;
  sizeBytes?: number;
  extractedProfiles?: string[];
}

/**
 * Cache statistics for external repos
 */
export interface RepoCacheStats {
  totalEntries: number;
  totalSize: number;
  totalSizeFormatted: string;
}

/**
 * Fetched file from external repository
 */
export interface FetchedFile {
  path: string;
  content: string;
  size: number;
  truncated: boolean;
}

/**
 * Fetched repository content
 */
export interface FetchedRepoContent {
  repoId: string;
  repoAlias: string;
  repoUrl: string;
  commitSha: string;
  fromCache: boolean;
  files: FetchedFile[];
  totalSize: number;
  fetchedAt: string;
  mcpInstructions?: string[];
  error?: string;
}

/**
 * GitHub MCP configuration status
 */
export interface GitHubMcpConfig {
  enabled: boolean;
  tokenConfigured: boolean;
  reposWithMcp: string[];
}

// --- External Repos Commands (Client -> Server) ---

export interface ExternalReposListCommand {
  type: 'external-repos:list';
  payload: { projectId: string };
}

export interface ExternalReposAddCommand {
  type: 'external-repos:add';
  payload: {
    projectId: string;
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
  };
}

export interface ExternalReposUpdateCommand {
  type: 'external-repos:update';
  payload: {
    projectId: string;
    repoId: string;
    [key: string]: unknown;
  };
}

export interface ExternalReposRemoveCommand {
  type: 'external-repos:remove';
  payload: { projectId: string; repoId: string };
}

export interface ExternalReposFetchCommand {
  type: 'external-repos:fetch';
  payload: { projectId: string; repoIds: string[]; forceRefresh?: boolean };
}

export interface ExternalReposCacheStatusCommand {
  type: 'external-repos:cache-status';
  payload: { projectId: string; repoIds?: string[] };
}

export interface ExternalReposClearCacheCommand {
  type: 'external-repos:clear-cache';
  payload: { projectId: string; repoIds?: string[] };
}

export interface ExternalReposMcpStatusCommand {
  type: 'external-repos:mcp-status';
  payload: { projectId: string };
}

export interface ExternalReposValidateUrlCommand {
  type: 'external-repos:validate-url';
  payload: { url: string };
}

export interface ExternalReposValidateTokenCommand {
  type: 'external-repos:validate-token';
  payload: { token: string };
}

export interface ExternalReposSetTokenCommand {
  type: 'external-repos:set-token';
  payload: { token: string };
}

export interface ExternalReposCacheStatsCommand {
  type: 'external-repos:cache-stats';
}

// --- External Repos Messages (Server -> Client) ---

export interface ExternalReposListMessage extends WSMessage {
  type: 'external-repos:list';
  payload: ExternalRepoReference[];
}

export interface ExternalReposAddedMessage extends WSMessage {
  type: 'external-repos:added';
  payload: ExternalRepoReference;
}

export interface ExternalReposUpdatedMessage extends WSMessage {
  type: 'external-repos:updated';
  payload: ExternalRepoReference;
}

export interface ExternalReposRemovedMessage extends WSMessage {
  type: 'external-repos:removed';
  payload: { repoId: string };
}

export interface ExternalReposFetchedMessage extends WSMessage {
  type: 'external-repos:fetched';
  payload: {
    contents: FetchedRepoContent[];
    summary: string;
  };
}

export interface ExternalReposCacheStatusMessage extends WSMessage {
  type: 'external-repos:cache-status';
  payload: Record<string, RepoCacheStatus>;
}

export interface ExternalReposCacheClearedMessage extends WSMessage {
  type: 'external-repos:cache-cleared';
  payload: { repoIds: string[] | 'all' };
}

export interface ExternalReposMcpStatusMessage extends WSMessage {
  type: 'external-repos:mcp-status';
  payload: GitHubMcpConfig;
}

export interface ExternalReposUrlValidatedMessage extends WSMessage {
  type: 'external-repos:url-validated';
  payload: {
    valid: boolean;
    owner?: string;
    repo?: string;
    defaultBranch?: string;
    error?: string;
  };
}

export interface ExternalReposTokenValidatedMessage extends WSMessage {
  type: 'external-repos:token-validated';
  payload: {
    valid: boolean;
    login?: string;
    scopes?: string[];
    error?: string;
  };
}

export interface ExternalReposTokenSetMessage extends WSMessage {
  type: 'external-repos:token-set';
  payload: {
    success: boolean;
    login?: string;
    scopes?: string[];
    error?: string;
  };
}

export interface ExternalReposCacheStatsMessage extends WSMessage {
  type: 'external-repos:cache-stats';
  payload: RepoCacheStats;
}

export interface ExternalReposErrorMessage extends WSMessage {
  type: 'external-repos:error';
  payload: { error: string; repoId?: string };
}
