import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { LoopStatus, LoopMode, LogEntry } from '../src/types';
import { getSessionRepository, type ActiveSession } from './database/repositories/SessionRepository.js';
import { getExecutionHistoryRepository } from './database/repositories/ExecutionHistoryRepository.js';
import { getProcessRegistry, GracefulShutdown } from './processManager/index.js';
import { parseSubAgentSpawn } from './lib/subAgentParser.js';

// Heartbeat interval in milliseconds
const HEARTBEAT_INTERVAL_MS = 5000;

// Sub-agent threshold defaults
const DEFAULT_SUBAGENT_WARNING_THRESHOLD = 5;     // Per iteration
const DEFAULT_SUBAGENT_CRITICAL_THRESHOLD = 10;   // Per iteration
const DEFAULT_SESSION_WARNING_THRESHOLD = 20;     // Total session

// Find bash executable on Windows
function findBashOnWindows(): string | null {
  const possiblePaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    'C:\\Git\\bin\\bash.exe',
    process.env.PROGRAMFILES + '\\Git\\bin\\bash.exe',
    process.env['PROGRAMFILES(X86)'] + '\\Git\\bin\\bash.exe',
  ];

  for (const bashPath of possiblePaths) {
    if (bashPath && fs.existsSync(bashPath)) {
      return bashPath;
    }
  }
  return null;
}

export interface LoopControllerOptions {
  projectId?: string;
  maxRuntimeSeconds?: number;
  costLimit?: number;
  completionPromise?: string;
}

export interface LoopValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
}

export class LoopController extends EventEmitter {
  private projectPath: string; // Target project to run in
  private ralphPath: string; // RalphWiggumV2 directory (for loop.sh)
  private projectId: string | null = null;
  private process: ChildProcess | null = null;
  private sessionId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private status: LoopStatus = {
    running: false,
    mode: null,
    iteration: 0,
    maxIterations: 0,
  };
  private gracefulShutdown = new GracefulShutdown();

  // Sub-agent tracking
  private subAgentCount = 0;
  private iterationSubAgentCounts: Map<number, number> = new Map();
  private lastSubAgentSpawnAt: Date | null = null;
  private seenToolUseIds: Set<string> = new Set(); // Prevent double-counting

  // Sub-agent threshold configuration
  private subAgentWarningThreshold = DEFAULT_SUBAGENT_WARNING_THRESHOLD;
  private subAgentCriticalThreshold = DEFAULT_SUBAGENT_CRITICAL_THRESHOLD;
  private sessionWarningThreshold = DEFAULT_SESSION_WARNING_THRESHOLD;
  private sessionWarningEmitted = false;  // Track if session warning already sent
  private iterationWarningsEmitted: Set<number> = new Set();  // Track per-iteration warnings

  constructor(projectPath: string, ralphPath?: string) {
    super();
    this.projectPath = projectPath;
    this.ralphPath = ralphPath || projectPath;
  }

  /**
   * Set the project ID for session tracking
   */
  setProjectId(projectId: string): void {
    this.projectId = projectId;
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  getStatus(): LoopStatus {
    return { ...this.status };
  }

  /**
   * Get the current active session from the database
   */
  getActiveSession(): ActiveSession | null {
    if (!this.sessionId) return null;
    const sessionRepo = getSessionRepository();
    return sessionRepo.getSession(this.sessionId);
  }

  /**
   * Recover an existing session (e.g., after browser refresh)
   */
  recoverSession(session: ActiveSession): void {
    this.sessionId = session.id;
    this.projectId = session.projectId;
    this.status = {
      running: session.state === 'running' || session.state === 'paused',
      mode: session.mode,
      iteration: session.currentIteration,
      maxIterations: session.maxIterations || 0,
      workScope: session.workScope ?? undefined,
      startedAt: new Date(session.startedAt),
      pid: session.pid,
    };

    // Start heartbeat for recovered session
    this.startHeartbeat();

    this.emit('status', this.status);
  }

  /**
   * Validate project configuration before starting a loop
   * Checks for AGENTS.md and required sections
   */
  validateProjectForLoop(): LoopValidationResult {
    const agentsPath = path.join(this.projectPath, 'AGENTS.md');

    // Check if AGENTS.md exists
    if (!fs.existsSync(agentsPath)) {
      return {
        valid: false,
        error: 'AGENTS.md not found',
        suggestion: 'Create AGENTS.md with build and validation commands',
      };
    }

    // Check for ## Validation section
    const content = fs.readFileSync(agentsPath, 'utf-8');
    if (!content.includes('## Validation')) {
      return {
        valid: false,
        error: 'AGENTS.md missing ## Validation section',
        suggestion: 'Add a "## Validation" section with typecheck/lint commands',
      };
    }

    return { valid: true };
  }

  start(options: { mode: LoopMode; maxIterations?: number; workScope?: string } & LoopControllerOptions) {
    if (this.process) {
      this.emitLog('Loop already running', 'warning');
      return;
    }

    // Validate project configuration before starting
    const validation = this.validateProjectForLoop();
    if (!validation.valid) {
      this.emitLog(`Error: ${validation.error}`, 'error');
      if (validation.suggestion) {
        this.emitLog(`Suggestion: ${validation.suggestion}`, 'info');
      }
      this.emit('error', validation.error);
      return;
    }

    const { mode, maxIterations, workScope, maxRuntimeSeconds, costLimit, completionPromise } = options;
    // Use loop.sh from Ralph's directory, not the target project
    const loopScript = path.join(this.ralphPath, 'loop.sh');

    // Build command arguments
    const args: string[] = [];

    switch (mode) {
      case 'plan':
        args.push('plan');
        if (maxIterations) args.push(maxIterations.toString());
        break;
      case 'plan-slc':
        args.push('plan-slc');
        if (maxIterations) args.push(maxIterations.toString());
        break;
      case 'plan-work':
        args.push('plan-work');
        if (workScope) args.push(workScope);
        break;
      case 'build':
        if (maxIterations) {
          args.push(maxIterations.toString());
        }
        break;
    }

    this.emitLog(
      `Starting loop: ${mode}${maxIterations ? ` (max ${maxIterations} iterations)` : ''}`,
      'info'
    );
    if (this.ralphPath !== this.projectPath) {
      this.emitLog(`Target project: ${this.projectPath}`, 'info');
      this.emitLog(`Ralph directory: ${this.ralphPath}`, 'info');
    }

    // Determine how to run bash on this platform
    const isWindows = process.platform === 'win32';
    let bashCmd = 'bash';

    if (isWindows) {
      const gitBash = findBashOnWindows();
      if (gitBash) {
        bashCmd = gitBash;
        this.emitLog(`Using Git Bash: ${gitBash}`, 'info');
      } else {
        this.emitLog(
          'Error: Git Bash not found. Please install Git for Windows to run the loop.',
          'error'
        );
        this.emitLog('Download from: https://git-scm.com/download/win', 'error');
        return;
      }
    }

    // Run in target project directory, but set RALPH_DIR so loop.sh can find its files
    this.process = spawn(bashCmd, [loopScript, ...args], {
      cwd: this.projectPath,
      env: {
        ...process.env,
        WORK_SCOPE: workScope || '',
        RALPH_DIR: this.ralphPath, // Tell loop.sh where to find prompt files
      },
    });

    const pid = this.process.pid;

    // Set status with starting: true immediately after spawn
    this.status = {
      running: true,
      starting: true,  // Indicate startup in progress
      mode,
      iteration: 0,
      maxIterations: maxIterations || 0,
      workScope,
      startedAt: new Date(),
      pid,
    };
    this.emit('status', this.status);

    // Reset sub-agent tracking
    this.subAgentCount = 0;
    this.iterationSubAgentCounts.clear();
    this.lastSubAgentSpawnAt = null;
    this.seenToolUseIds.clear();
    this.sessionWarningEmitted = false;
    this.iterationWarningsEmitted.clear();

    // Register loop with ProcessRegistry (creates session + PID file)
    if (this.projectId && pid) {
      const processRegistry = getProcessRegistry();
      processRegistry
        .registerLoop(this.projectId, this.projectPath, pid, mode, {
          maxIterations,
          maxRuntimeSeconds,
          costLimit,
          workScope,
          completionPromise: completionPromise || 'ALL_TASKS_COMPLETE',
        })
        .then((sessionId) => {
          this.sessionId = sessionId;
          this.emitLog(`Session created: ${sessionId}`, 'info');

          // Start heartbeat
          this.startHeartbeat();

          // Registration complete, clear starting flag
          this.status = { ...this.status, starting: false };
          this.emit('status', this.status);
        })
        .catch((err) => {
          this.emitLog(`Failed to create session: ${(err as Error).message}`, 'warning');
          // Clear starting flag even on error
          this.status = { ...this.status, starting: false };
          this.emit('status', this.status);
        });
    } else {
      // No project ID, clear starting flag immediately
      this.status = { ...this.status, starting: false };
      this.emit('status', this.status);
    }

    // Handle stdout
    this.process.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l: string) => l.trim());
      lines.forEach((line: string) => {
        // Detect iteration markers
        const iterMatch = line.match(/LOOP\s+(\d+)/i);
        if (iterMatch) {
          const newIteration = parseInt(iterMatch[1], 10);
          this.status.iteration = newIteration;

          // Update session iteration in database
          if (this.sessionId) {
            try {
              const sessionRepo = getSessionRepository();
              sessionRepo.updateIteration(this.sessionId, newIteration);
            } catch {
              // Ignore errors updating iteration
            }
          }

          this.emit('status', this.status);
        }

        // Detect token usage (if loop.sh outputs it)
        const tokenMatch = line.match(/tokens:\s*(\d+)\s*input,?\s*(\d+)\s*output/i);
        if (tokenMatch && this.sessionId) {
          try {
            const sessionRepo = getSessionRepository();
            sessionRepo.updateTokenUsage(
              this.sessionId,
              parseInt(tokenMatch[1], 10),
              parseInt(tokenMatch[2], 10)
            );
          } catch {
            // Ignore errors updating tokens
          }
        }

        // Detect cost updates (if loop.sh outputs it)
        const costMatch = line.match(/cost:\s*\$?([\d.]+)/i);
        if (costMatch && this.sessionId) {
          try {
            const sessionRepo = getSessionRepository();
            sessionRepo.updateCost(this.sessionId, parseFloat(costMatch[1]));
          } catch {
            // Ignore errors updating cost
          }
        }

        this.emitLog(line, 'info');
      });
    });

    // Handle stderr
    this.process.stderr?.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l: string) => l.trim());
      lines.forEach((line: string) => {
        // Check for sub-agent spawn FIRST (before other processing)
        const spawnResult = parseSubAgentSpawn(line);
        if (spawnResult.spawned && spawnResult.toolUseId) {
          // Avoid double-counting same tool_use_id
          if (!this.seenToolUseIds.has(spawnResult.toolUseId)) {
            this.seenToolUseIds.add(spawnResult.toolUseId);
            this.handleSubAgentSpawn(spawnResult.toolUseId);
          }
        }

        // Claude CLI outputs streaming JSON to stderr - these are not errors
        // Check if line is JSON streaming output from Claude
        const isClaudeStreamingJson = line.startsWith('{') && (
          line.includes('"type":"assistant"') ||
          line.includes('"type":"user"') ||
          line.includes('"type":"system"') ||
          line.includes('"type":"text"') ||
          line.includes('"type":"content_block') ||
          line.includes('"type":"message')
        );

        if (isClaudeStreamingJson) {
          // This is normal Claude CLI streaming output, not an error
          this.emitLog(line, 'info');
        } else {
          // This is an actual error
          this.emitLog(line, 'error');
        }
      });
    });

    // Handle process exit
    this.process.on('close', (code) => {
      this.emitLog(`Loop exited with code ${code}`, code === 0 ? 'success' : 'error');

      // Stop heartbeat
      this.stopHeartbeat();

      // Record execution history and unregister loop
      if (this.sessionId && this.projectId) {
        const currentSessionId = this.sessionId;
        const currentProjectId = this.projectId;
        const success = code === 0;

        try {
          const sessionRepo = getSessionRepository();
          const historyRepo = getExecutionHistoryRepository();
          const session = sessionRepo.getSession(currentSessionId);

          if (session) {
            // Record in execution history
            historyRepo.recordExecution({
              projectId: currentProjectId,
              sessionId: currentSessionId,
              mode: this.status.mode || 'build',
              iteration: this.status.iteration,
              startedAt: session.startedAt,
              endedAt: new Date().toISOString(),
              success,
              exitReason: success ? 'completed' : 'error',
              tokensInput: session.tokensInputTotal,
              tokensOutput: session.tokensOutputTotal,
              costUsd: session.costSpent,
              errorMessage: !success ? `Process exited with code ${code}` : undefined,
            });
          }
        } catch (err) {
          this.emitLog(`Failed to record execution: ${(err as Error).message}`, 'warning');
        }

        // Unregister loop via ProcessRegistry (marks session complete + deletes PID file)
        const processRegistry = getProcessRegistry();
        processRegistry
          .unregisterLoop(currentSessionId, currentProjectId, success)
          .catch((err) => {
            this.emitLog(`Failed to unregister loop: ${(err as Error).message}`, 'warning');
          });
      }

      this.process = null;
      this.sessionId = null;
      this.status = {
        ...this.status,
        running: false,
        starting: false,  // Clear starting flag on close
        stopping: false,  // Clear stopping flag on close
        pid: undefined,
      };
      this.emit('status', this.status);
    });

    this.process.on('error', (err) => {
      this.emitLog(`Loop error: ${err.message}`, 'error');

      // Stop heartbeat
      this.stopHeartbeat();

      // Unregister loop via ProcessRegistry (marks session crashed + deletes PID file)
      if (this.sessionId && this.projectId) {
        const processRegistry = getProcessRegistry();
        processRegistry
          .unregisterLoop(this.sessionId, this.projectId, false)
          .catch(() => {
            // Ignore errors during crash cleanup
          });
      }

      this.process = null;
      this.sessionId = null;
      this.status = {
        ...this.status,
        running: false,
        starting: false,  // Clear starting flag on error
        stopping: false,  // Clear stopping flag on error
        pid: undefined,
      };
      this.emit('status', this.status);
    });
  }

  async stop(): Promise<void> {
    if (!this.process) {
      this.emitLog('No loop running', 'warning');
      return;
    }

    const pid = this.process.pid;
    if (!pid) {
      this.emitLog('Process has no PID', 'warning');
      return;
    }

    // Emit stopping state before shutdown
    this.status = { ...this.status, stopping: true };
    this.emit('status', this.status);
    this.emitLog('Stopping loop...', 'info');

    // Mark session as stopping
    if (this.sessionId) {
      try {
        const sessionRepo = getSessionRepository();
        sessionRepo.updateSessionState(this.sessionId, 'stopping');
      } catch {
        // Ignore errors
      }
    }

    // Use GracefulShutdown for verified termination
    const result = await this.gracefulShutdown.stopAndVerify(pid);

    if (result.success) {
      this.emitLog(
        `Loop stopped via ${result.method} (${result.durationMs}ms)`,
        'success'
      );
    } else {
      this.emitLog(
        `Failed to stop loop after ${result.durationMs}ms`,
        'error'
      );
    }

    // Cleanup will happen in the 'close' event handler
    // The 'close' handler will still run and do cleanup
  }

  /**
   * Pause the current session
   */
  pause(): void {
    if (this.sessionId) {
      try {
        const sessionRepo = getSessionRepository();
        sessionRepo.updateSessionState(this.sessionId, 'paused');
        this.emitLog('Session paused', 'info');
      } catch (err) {
        this.emitLog(`Failed to pause session: ${(err as Error).message}`, 'warning');
      }
    }
  }

  /**
   * Resume a paused session
   */
  resume(): void {
    if (this.sessionId) {
      try {
        const sessionRepo = getSessionRepository();
        sessionRepo.updateSessionState(this.sessionId, 'running');
        this.emitLog('Session resumed', 'info');
      } catch (err) {
        this.emitLog(`Failed to resume session: ${(err as Error).message}`, 'warning');
      }
    }
  }

  /**
   * Start the heartbeat interval
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.sessionId) {
        try {
          const sessionRepo = getSessionRepository();
          sessionRepo.updateHeartbeat(this.sessionId);
        } catch {
          // Ignore heartbeat errors
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop the heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private emitLog(content: string, type: LogEntry['type']) {
    const entry: LogEntry = {
      id: `loop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      content,
      type,
    };
    this.emit('log', entry);
  }

  /**
   * Handle a sub-agent spawn detection
   */
  private handleSubAgentSpawn(toolUseId: string): void {
    this.subAgentCount++;
    this.lastSubAgentSpawnAt = new Date();

    const currentIter = this.status.iteration;
    const iterCount = (this.iterationSubAgentCounts.get(currentIter) || 0) + 1;
    this.iterationSubAgentCounts.set(currentIter, iterCount);

    // Update database
    if (this.sessionId) {
      try {
        const sessionRepo = getSessionRepository();
        sessionRepo.updateSubAgentCount(this.sessionId, 1);
      } catch {
        // Ignore database errors for sub-agent tracking
      }
    }

    // Emit event for UI update
    this.emit('subagent:spawned', {
      iteration: currentIter,
      count: this.subAgentCount,
      toolUseId,
    });

    this.emitLog(`Sub-agent spawned (total: ${this.subAgentCount}, iteration: ${iterCount})`, 'info');

    // Check thresholds after incrementing count
    this.checkSubAgentThresholds();
  }

  /**
   * Get sub-agent telemetry for this session
   */
  getSubAgentTelemetry(): { sessionTotal: number; iterationCounts: Record<number, number>; lastSpawnAt: Date | null } {
    return {
      sessionTotal: this.subAgentCount,
      iterationCounts: Object.fromEntries(this.iterationSubAgentCounts),
      lastSpawnAt: this.lastSubAgentSpawnAt,
    };
  }

  /**
   * Check sub-agent thresholds and emit warnings if exceeded
   */
  private checkSubAgentThresholds(): void {
    const currentIter = this.status.iteration;
    const iterCount = this.iterationSubAgentCounts.get(currentIter) || 0;

    // Per-iteration threshold check (only warn once per iteration per threshold level)
    if (iterCount >= this.subAgentCriticalThreshold) {
      if (!this.iterationWarningsEmitted.has(currentIter * 1000 + 2)) {  // 2 = critical
        this.iterationWarningsEmitted.add(currentIter * 1000 + 2);
        this.emit('subagent:warning', {
          level: 'critical',
          message: `Critical: Iteration ${currentIter} spawned ${iterCount} sub-agents (threshold: ${this.subAgentCriticalThreshold})`,
          iteration: currentIter,
          count: iterCount,
        });
        this.emitLog(`CRITICAL: High sub-agent count in iteration ${currentIter}: ${iterCount}`, 'warning');
      }
    } else if (iterCount >= this.subAgentWarningThreshold) {
      if (!this.iterationWarningsEmitted.has(currentIter * 1000 + 1)) {  // 1 = warning
        this.iterationWarningsEmitted.add(currentIter * 1000 + 1);
        this.emit('subagent:warning', {
          level: 'warning',
          message: `Warning: Iteration ${currentIter} spawned ${iterCount} sub-agents (threshold: ${this.subAgentWarningThreshold})`,
          iteration: currentIter,
          count: iterCount,
        });
        this.emitLog(`Warning: High sub-agent count in iteration ${currentIter}: ${iterCount}`, 'warning');
      }
    }

    // Session-level threshold check (only warn once)
    if (!this.sessionWarningEmitted && this.subAgentCount >= this.sessionWarningThreshold) {
      this.sessionWarningEmitted = true;
      this.emit('subagent:warning', {
        level: 'warning',
        message: `Session has spawned ${this.subAgentCount} sub-agents (threshold: ${this.sessionWarningThreshold})`,
        iteration: currentIter,
        count: this.subAgentCount,
      });
      this.emitLog(`Warning: Session sub-agent count reached ${this.subAgentCount}`, 'warning');
    }
  }

  /**
   * Configure sub-agent thresholds
   */
  setSubAgentThresholds(config: {
    warningThreshold?: number;
    criticalThreshold?: number;
    sessionWarningThreshold?: number;
  }): void {
    if (config.warningThreshold !== undefined) {
      this.subAgentWarningThreshold = config.warningThreshold;
    }
    if (config.criticalThreshold !== undefined) {
      this.subAgentCriticalThreshold = config.criticalThreshold;
    }
    if (config.sessionWarningThreshold !== undefined) {
      this.sessionWarningThreshold = config.sessionWarningThreshold;
    }
  }
}
