/**
 * TroubleshootRunner - Runs Claude CLI to debug errors
 *
 * Spawns Claude CLI in the background with --dangerously-skip-permissions
 * to analyze error logs and fix issues in the project.
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess, exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { logger } from './lib/logger.js';

interface TroubleshootStatus {
  running: boolean;
  startedAt: Date | null;
}

export class TroubleshootRunner extends EventEmitter {
  private projectPath: string;
  private ralphPath: string;
  private process: ChildProcess | null = null;
  private status: TroubleshootStatus = {
    running: false,
    startedAt: null,
  };
  private accumulatedOutput: string = '';

  constructor(projectPath: string, ralphPath: string) {
    super();
    this.projectPath = projectPath;
    this.ralphPath = ralphPath;
  }

  getStatus(): TroubleshootStatus {
    return { ...this.status };
  }

  /**
   * Run troubleshooting using Claude CLI
   */
  async run(errorLog: string): Promise<void> {
    if (this.status.running) {
      throw new Error('Troubleshooting already in progress');
    }

    this.status = {
      running: true,
      startedAt: new Date(),
    };
    this.accumulatedOutput = '';
    this.emit('status', this.status);

    try {
      // Try to read AGENTS.md for project context
      let agentsContext = '';
      try {
        const agentsPath = path.join(this.projectPath, 'AGENTS.md');
        const agentsContent = await fs.readFile(agentsPath, 'utf-8');
        agentsContext = `
## Project Build/Test Commands (from AGENTS.md)

${agentsContent}
`;
      } catch {
        agentsContext = `
## Project Context

No AGENTS.md found. You may need to discover build/test commands.
`;
      }

      // Build the troubleshooting prompt
      const prompt = `# Troubleshooting Request

You are helping to debug and fix an error in a project.

## Project Path

\`${this.projectPath}\`

${agentsContext}

## Error Log / Stack Trace

\`\`\`
${errorLog}
\`\`\`

## Instructions

1. Analyze the error above
2. Identify the root cause
3. Propose and implement a fix
4. Run any relevant validation commands (typecheck, lint, tests) to verify the fix
5. Explain what you changed and why

If you need more context, explore the codebase to understand the relevant code.
`;

      // Build CLI arguments
      const claudeArgs = [
        '-p',
        '--output-format=stream-json',
        '--dangerously-skip-permissions'
      ];

      // Add --model flag on Windows or if explicitly enabled
      const isWindows = process.platform === 'win32';
      if (isWindows || process.env.CLAUDE_MODEL_FLAG === 'true') {
        claudeArgs.push('--model', 'sonnet');
      }

      // Spawn Claude CLI
      logger.info('Starting troubleshoot', { directory: this.projectPath, errorLogLength: errorLog.length });

      this.process = spawn('claude', claudeArgs, {
        cwd: this.projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,  // Required for Windows
      });

      // Write prompt to stdin
      this.process.stdin?.write(prompt);
      this.process.stdin?.end();

      // Parse streaming JSON output
      if (this.process.stdout) {
        const rl = readline.createInterface({
          input: this.process.stdout,
          crlfDelay: Infinity,
        });

        rl.on('line', (line) => {
          this.handleOutputLine(line);
        });
      }

      // Handle stderr
      this.process.stderr?.on('data', (data) => {
        const text = data.toString();
        logger.error('Troubleshoot stderr', { text });
        // Emit stderr as output too so user can see it
        this.emit('output', `[stderr] ${text}`);
      });

      // Handle process close
      this.process.on('close', (code) => {
        this.status = {
          running: false,
          startedAt: null,
        };
        this.process = null;

        if (code === 0) {
          this.emit('complete', {
            success: true,
            output: this.accumulatedOutput,
          });
        } else {
          this.emit('error', `Troubleshoot process exited with code ${code}`);
        }
        this.emit('status', this.status);
      });

      // Handle process error
      this.process.on('error', (err) => {
        this.status = {
          running: false,
          startedAt: null,
        };
        this.process = null;
        this.emit('error', err.message);
        this.emit('status', this.status);
      });

    } catch (err) {
      this.status = {
        running: false,
        startedAt: null,
      };
      this.emit('error', err instanceof Error ? err.message : 'Unknown error');
      this.emit('status', this.status);
    }
  }

  private handleOutputLine(line: string): void {
    try {
      const json = JSON.parse(line);

      // Handle different message types from stream-json format
      if (json.type === 'text' || json.type === 'content_block_delta') {
        const text = json.text || json.delta?.text || '';
        if (text) {
          this.accumulatedOutput += text;
          this.emit('output', text);
        }
      } else if (json.type === 'assistant') {
        // Assistant response - extract text content
        if (json.message?.content) {
          for (const block of json.message.content) {
            if (block.type === 'text') {
              this.accumulatedOutput += block.text;
              this.emit('output', block.text);
            }
          }
        }
      }
    } catch {
      // Non-JSON line - accumulate anyway
      if (line.trim()) {
        this.accumulatedOutput += line + '\n';
        this.emit('output', line + '\n');
      }
    }
  }

  cancel(): void {
    if (this.process) {
      const pid = this.process.pid;
      const isWindows = process.platform === 'win32';

      if (isWindows && pid) {
        exec(`taskkill /pid ${pid} /T /F`, () => {
          // Ignore errors
        });
      } else {
        this.process.kill('SIGTERM');
      }

      this.status = {
        running: false,
        startedAt: null,
      };
      this.emit('cancelled');
      this.emit('status', this.status);
    }
  }
}

/**
 * Check if Claude CLI is available
 */
export async function isClaudeCliAvailable(): Promise<boolean> {
  const { exec: execCallback } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(execCallback);
  
  try {
    await execAsync('which claude || where claude');
    return true;
  } catch {
    return false;
  }
}
