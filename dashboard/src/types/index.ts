// Ralph Wiggum V3 - TypeScript Interfaces
// Data Models per PRD Section 3

// ============================================
// 3.1 Loop Status
// ============================================

export type LoopMode = 'build' | 'plan' | 'plan-slc' | 'plan-work' | 'review';

export type ExitReason =
  | 'completed'
  | 'max_iterations'
  | 'cost_limit'
  | 'runtime_limit'
  | 'user_stopped'
  | 'error';

export interface LoopStatus {
  running: boolean;
  mode: LoopMode;
  iteration: number;
  maxIterations: number;
  startedAt?: Date;
  elapsedTime?: number;
  maxRuntime?: number;

  // Cost tracking
  costSpent?: number;
  costLimit?: number;
  tokensUsed?: {
    input: number;
    output: number;
  };

  // Health
  consecutiveFailures: number;
  loopDetected: boolean;
  backoffSeconds?: number;

  // Completion
  completionSignal?: string;
  exitReason?: ExitReason;
}

// ============================================
// 3.2 Cost Tracking
// ============================================

export interface IterationCost {
  iteration: number;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  timestamp: Date;
}

export interface CostTracker {
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCost: number;
  costLimit: number;
  perIterationCosts: IterationCost[];
}

// Pricing constants (Opus model)
export const PRICING = {
  inputPerMillion: 3.0,   // $3 per 1M input tokens
  outputPerMillion: 15.0, // $15 per 1M output tokens
} as const;

// ============================================
// 3.3 Telemetry
// ============================================

export type TriggerReason = 'INITIAL' | 'TASK_INCOMPLETE' | 'RECOVERY' | 'LOOP_DETECTED';

export interface ValidationResult {
  type: 'test' | 'typecheck' | 'lint';
  passed: boolean;
  output?: string;
  duration?: number;
}

export interface IterationTelemetry {
  iteration: number;
  startedAt: Date;
  duration: number;
  success: boolean;
  triggerReason: TriggerReason;
  tokensUsed?: {
    input: number;
    output: number;
  };
  cost?: number;
  toolsUsed?: string[];
  outputPreview?: string;
  errorMessage?: string;
  validationResults?: ValidationResult[];
}

// ============================================
// 3.4 Project Configuration
// ============================================

export interface FileStatus {
  exists: boolean;
  path: string;
  lastModified?: Date;
}

export interface DependencyStatus {
  name: string;
  required: boolean;
  installed: boolean;
  version?: string;
  minVersion?: string;
  installInstructions?: string;
}

export interface ProjectConfig {
  name: string;
  path: string;
  mode: 'embedded' | 'standalone';
  detectionReason: string;

  // Ralph files status
  ralphFiles: {
    agentsMd: FileStatus;
    claudeMd: FileStatus;
    implementationPlan: FileStatus;
    audienceJtbd: FileStatus;
    prd: FileStatus;
  };

  // Dependencies
  dependencies: DependencyStatus[];

  // Git status
  git: {
    isRepo: boolean;
    branch?: string;
    hasUncommittedChanges?: boolean;
  };
}

// ============================================
// 3.5 Loop Control Options
// ============================================

export interface LoopStartOptions {
  mode: LoopMode;
  maxIterations?: number;
  maxRuntime?: number;       // seconds (default: 14400 = 4 hours)
  costLimit?: number;        // dollars (default: 50)
  completionPromise?: string; // default: 'ALL_TASKS_COMPLETE'
  loopDetectionThreshold?: number; // default: 0.9
  backoffEnabled?: boolean;  // default: true
  rollbackOnFailure?: boolean; // default: true
  dryRun?: boolean;          // default: false
}

// ============================================
// 3.6 YAML Configuration Schema
// ============================================

export interface RalphConfig {
  maxIterations: number;      // default: 100
  maxRuntime: number;         // seconds, default: 14400
  costLimit: number;          // dollars, default: 50.0
  completionPromise: string;  // default: "ALL_TASKS_COMPLETE"
  loopDetectionThreshold: number; // default: 0.9
  backoffEnabled: boolean;    // default: true
  rollbackOnFailure: boolean; // default: true
}

// ============================================
// 3.7 WebSocket Messages
// ============================================

export interface WSMessage {
  type: string;
  payload?: unknown;
}

// Loop messages
export interface LoopStartMessage extends WSMessage {
  type: 'loop:start';
  payload: LoopStartOptions;
}

export interface LoopStopMessage extends WSMessage {
  type: 'loop:stop';
}

export interface LoopStatusMessage extends WSMessage {
  type: 'loop:status';
  payload: LoopStatus;
}

export interface LoopOutputMessage extends WSMessage {
  type: 'loop:output';
  payload: {
    iteration: number;
    content: string;
    stream: 'stdout' | 'stderr';
  };
}

// Cost messages
export interface CostUpdateMessage extends WSMessage {
  type: 'cost:update';
  payload: CostTracker;
}

// Telemetry messages
export interface TelemetryUpdateMessage extends WSMessage {
  type: 'telemetry:update';
  payload: IterationTelemetry;
}

export interface TelemetryHistoryMessage extends WSMessage {
  type: 'telemetry:history';
  payload: IterationTelemetry[];
}

// Project messages
export interface ProjectInfoMessage extends WSMessage {
  type: 'project:info';
  payload: ProjectConfig;
}

export interface ProjectPathOverrideMessage extends WSMessage {
  type: 'project:path-override';
  payload: {
    newPath: string;
  };
}

export interface ProjectPathOverrideResultMessage extends WSMessage {
  type: 'project:path-override-result';
  payload: {
    success: boolean;
    message: string;
  };
}

export interface ProjectInitMessage extends WSMessage {
  type: 'project:init';
  payload: {
    files: string[]; // files to create
  };
}

export interface ProjectInitResultMessage extends WSMessage {
  type: 'project:init-result';
  payload: {
    success: boolean;
    created: string[];
  };
}

// Config messages
export interface ConfigReadMessage extends WSMessage {
  type: 'config:read';
}

export interface ConfigUpdateMessage extends WSMessage {
  type: 'config:update';
  payload: Partial<RalphConfig>;
}

// ============================================
// 3.8 Task Model
// ============================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type TaskFormat = 'checkbox' | 'numbered' | 'user_story';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: number;
  status: TaskStatus;
  format: TaskFormat;
  acceptanceCriteria?: string[];
  dependencies?: string[];
}

export interface ImplementationPlan {
  tasks: Task[];
  completedCount: number;
  totalCount: number;
  healthScore: number; // completedCount / totalCount
}

// ============================================
// Git Types
// ============================================

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
}

export interface GitStatus {
  isRepo: boolean;
  branch?: string;
  hasUncommittedChanges?: boolean;
  ahead?: number;
  behind?: number;
}

// ============================================
// Review Types
// ============================================

export interface ReviewCriteria {
  name: string;
  description: string;
  weight: number;
}

export interface ReviewResult {
  passed: boolean;
  score: number;
  reasoning: string;
  criteria: string;
  timestamp: Date;
}

export interface CodeReview {
  totalScore: number;
  passed: boolean;
  results: ReviewResult[];
  recommendations: string[];
}
