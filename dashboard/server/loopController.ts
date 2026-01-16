import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import stringSimilarity from 'string-similarity';
import type { ProjectDetector } from './projectDetector.js';
import type { CostTracker } from './costTracker.js';
import type { TelemetryTracker } from './telemetryTracker.js';

export interface LoopStartOptions {
  mode: 'build' | 'plan' | 'plan-slc' | 'plan-work' | 'review';
  maxIterations?: number;
  maxRuntime?: number;
  costLimit?: number;
  completionPromise?: string;
  loopDetectionThreshold?: number;
  backoffEnabled?: boolean;
  rollbackOnFailure?: boolean;
  dryRun?: boolean;
}

export interface LoopStatus {
  running: boolean;
  mode: string;
  iteration: number;
  maxIterations: number;
  startedAt?: Date;
  elapsedTime?: number;
  maxRuntime?: number;
  costSpent?: number;
  costLimit?: number;
  tokensUsed?: { input: number; output: number };
  consecutiveFailures: number;
  loopDetected: boolean;
  backoffSeconds?: number;
  completionSignal?: string;
  exitReason?: string;
}

interface LoopControllerOptions {
  projectDetector: ProjectDetector;
  costTracker: CostTracker;
  telemetryTracker: TelemetryTracker;
  broadcast: (message: object) => void;
}

export class LoopController {
  private process: ChildProcess | null = null;
  private status: LoopStatus;
  private options: LoopStartOptions | null = null;
  private startTime: Date | null = null;
  private elapsedInterval: NodeJS.Timeout | null = null;
  private recentOutputs: string[] = [];
  private currentIterationOutput: string = '';

  private projectDetector: ProjectDetector;
  private costTracker: CostTracker;
  private telemetryTracker: TelemetryTracker;
  private broadcast: (message: object) => void;

  constructor(opts: LoopControllerOptions) {
    this.projectDetector = opts.projectDetector;
    this.costTracker = opts.costTracker;
    this.telemetryTracker = opts.telemetryTracker;
    this.broadcast = opts.broadcast;

    this.status = {
      running: false,
      mode: 'build',
      iteration: 0,
      maxIterations: 100,
      consecutiveFailures: 0,
      loopDetected: false,
    };
  }

  getStatus(): LoopStatus {
    return { ...this.status };
  }

  async start(options: LoopStartOptions): Promise<void> {
    if (this.status.running) {
      console.warn('Loop is already running');
      return;
    }

    this.options = {
      mode: options.mode || 'build',
      maxIterations: options.maxIterations ?? 100,
      maxRuntime: options.maxRuntime ?? 14400,
      costLimit: options.costLimit ?? 50,
      completionPromise: options.completionPromise ?? 'ALL_TASKS_COMPLETE',
      loopDetectionThreshold: options.loopDetectionThreshold ?? 0.9,
      backoffEnabled: options.backoffEnabled ?? true,
      rollbackOnFailure: options.rollbackOnFailure ?? true,
      dryRun: options.dryRun ?? false,
    };

    // Reset state
    this.status = {
      running: true,
      mode: this.options.mode,
      iteration: 0,
      maxIterations: this.options.maxIterations ?? 100,
      maxRuntime: this.options.maxRuntime,
      costLimit: this.options.costLimit,
      consecutiveFailures: 0,
      loopDetected: false,
    };

    this.startTime = new Date();
    this.status.startedAt = this.startTime;
    this.recentOutputs = [];
    this.currentIterationOutput = '';

    // Set cost limit
    this.costTracker.setLimit(this.options.costLimit ?? 50);
    this.costTracker.reset();

    // Reset telemetry
    this.telemetryTracker.reset();

    // Start elapsed time tracking
    this.elapsedInterval = setInterval(() => {
      if (this.startTime) {
        this.status.elapsedTime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
        this.status.costSpent = this.costTracker.getTotalCost();
        this.status.tokensUsed = {
          input: this.costTracker.getData().totalTokensInput,
          output: this.costTracker.getData().totalTokensOutput,
        };
        this.broadcastStatus();
      }
    }, 1000);

    // Start the loop process
    await this.runLoop();
  }

  stop(): void {
    if (!this.status.running) {
      return;
    }

    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }

    this.cleanup('user_stopped');
  }

  private async runLoop(): Promise<void> {
    const projectConfig = this.projectDetector.getProjectConfig();
    if (!projectConfig) {
      console.error('No project configured');
      this.cleanup('error');
      return;
    }

    const loopScript = path.resolve(projectConfig.path, 'loop.sh');

    // Check if loop.sh exists in project, otherwise use the one from RalphWiggumV3
    const fs = await import('fs');
    let scriptPath = loopScript;
    if (!fs.existsSync(loopScript)) {
      scriptPath = path.resolve(path.dirname(path.dirname(__dirname)), 'loop.sh');
    }

    const args: string[] = [];
    if (this.options?.mode && this.options.mode !== 'build') {
      args.push(this.options.mode);
    }
    if (this.options?.maxIterations) {
      args.push(this.options.maxIterations.toString());
    }

    const env = {
      ...process.env,
      RALPH_DIR: path.dirname(path.dirname(__dirname)),
      PROJECT_PATH: projectConfig.path,
      COST_LIMIT: this.options?.costLimit?.toString() ?? '50',
      MAX_RUNTIME: this.options?.maxRuntime?.toString() ?? '14400',
      COMPLETION_PROMISE: this.options?.completionPromise ?? 'ALL_TASKS_COMPLETE',
      DRY_RUN: this.options?.dryRun ? 'true' : 'false',
      BACKOFF_ENABLED: this.options?.backoffEnabled ? 'true' : 'false',
      ROLLBACK_ON_FAILURE: this.options?.rollbackOnFailure ? 'true' : 'false',
    };

    this.process = spawn('bash', [scriptPath, ...args], {
      cwd: projectConfig.path,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Handle stdout
    this.process.stdout?.on('data', (data) => {
      const output = data.toString();
      this.handleOutput(output, 'stdout');
    });

    // Handle stderr
    this.process.stderr?.on('data', (data) => {
      const output = data.toString();
      this.handleOutput(output, 'stderr');
    });

    // Handle process exit
    this.process.on('close', (code) => {
      if (code === 0) {
        this.cleanup('completed');
      } else if (this.status.running) {
        this.cleanup('error');
      }
    });

    this.process.on('error', (error) => {
      console.error('Loop process error:', error);
      this.cleanup('error');
    });
  }

  private handleOutput(output: string, stream: 'stdout' | 'stderr'): void {
    this.currentIterationOutput += output;

    // Parse iteration markers
    const iterationMatch = output.match(/Iteration (\d+)/);
    if (iterationMatch) {
      const newIteration = parseInt(iterationMatch[1], 10);
      if (newIteration !== this.status.iteration) {
        // New iteration started
        if (this.status.iteration > 0) {
          this.processIterationEnd();
        }
        this.status.iteration = newIteration;
        this.currentIterationOutput = output;
      }
    }

    // Parse cost/token information from JSON output
    this.parseCostFromOutput(output);

    // Check for completion signal
    if (output.includes(this.options?.completionPromise ?? 'ALL_TASKS_COMPLETE')) {
      this.status.completionSignal = this.options?.completionPromise;
    }

    // Broadcast output
    this.broadcast({
      type: 'loop:output',
      payload: {
        iteration: this.status.iteration,
        content: output,
        stream,
      },
    });
  }

  private parseCostFromOutput(output: string): void {
    // Parse Claude CLI stream-json output for usage information
    // Format: {"type":"usage","usage":{"input_tokens":1234,"output_tokens":567}}
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('"type":"usage"') || line.includes('"type": "usage"')) {
        try {
          const json = JSON.parse(line);
          if (json.type === 'usage' && json.usage) {
            this.costTracker.addUsage(
              json.usage.input_tokens || 0,
              json.usage.output_tokens || 0
            );
            this.broadcast({
              type: 'cost:update',
              payload: this.costTracker.getData(),
            });
          }
        } catch {
          // Not valid JSON, skip
        }
      }
    }
  }

  private processIterationEnd(): void {
    // Check for loop detection
    const threshold = this.options?.loopDetectionThreshold ?? 0.9;
    for (const prev of this.recentOutputs) {
      const similarity = stringSimilarity.compareTwoStrings(
        this.currentIterationOutput,
        prev
      );
      if (similarity >= threshold) {
        this.status.loopDetected = true;
        this.status.consecutiveFailures++;
        break;
      }
    }

    // Store output for comparison
    this.recentOutputs.push(this.currentIterationOutput);
    if (this.recentOutputs.length > 5) {
      this.recentOutputs.shift();
    }

    // Record telemetry
    this.telemetryTracker.recordIteration({
      iteration: this.status.iteration,
      success: !this.status.loopDetected,
      duration: Date.now() - (this.startTime?.getTime() ?? Date.now()),
      tokensInput: this.costTracker.getData().totalTokensInput,
      tokensOutput: this.costTracker.getData().totalTokensOutput,
      cost: this.costTracker.getTotalCost(),
      outputPreview: this.currentIterationOutput.slice(0, 200),
    });

    // Check limits
    if (this.status.iteration >= (this.options?.maxIterations ?? 100)) {
      this.stop();
      this.status.exitReason = 'max_iterations';
    }

    if (this.costTracker.getTotalCost() >= (this.options?.costLimit ?? 50)) {
      this.stop();
      this.status.exitReason = 'cost_limit';
    }

    const elapsed = this.startTime
      ? (Date.now() - this.startTime.getTime()) / 1000
      : 0;
    if (elapsed >= (this.options?.maxRuntime ?? 14400)) {
      this.stop();
      this.status.exitReason = 'runtime_limit';
    }
  }

  private cleanup(exitReason: string): void {
    this.status.running = false;
    this.status.exitReason = exitReason;

    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
      this.elapsedInterval = null;
    }

    this.process = null;
    this.broadcastStatus();
  }

  private broadcastStatus(): void {
    this.broadcast({
      type: 'loop:status',
      payload: this.getStatus(),
    });
  }
}
