/**
 * StoriesGenerator - Converts PRD.md to prd.json user stories
 *
 * Reads the PRD.md file and uses Claude CLI to extract user stories
 * in the exact prd.json schema format for Simple mode.
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess, exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { logger } from './lib/logger.js';

interface StoriesGeneratorStatus {
  generating: boolean;
  startedAt: Date | null;
}

export interface UserStory {
  id: string;
  title: string;
  acceptanceCriteria: string[];
  priority: number;
  passes: boolean;
  notes: string;
}

export interface PrdJson {
  branchName: string;
  userStories: UserStory[];
}

export class StoriesGenerator extends EventEmitter {
  private projectPath: string;
  private process: ChildProcess | null = null;
  private status: StoriesGeneratorStatus = {
    generating: false,
    startedAt: null,
  };
  private accumulatedOutput: string = '';

  constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
  }

  getStatus(): StoriesGeneratorStatus {
    return { ...this.status };
  }

  /**
   * Generate prd.json user stories from PRD.md
   */
  async generate(): Promise<void> {
    if (this.status.generating) {
      throw new Error('Stories generation already in progress');
    }

    this.status = {
      generating: true,
      startedAt: new Date(),
    };
    this.accumulatedOutput = '';
    this.emit('status', this.status);

    try {
      // Read PRD.md
      const prdPath = path.join(this.projectPath, 'PRD.md');
      let prdContent: string;
      
      try {
        prdContent = await fs.readFile(prdPath, 'utf-8');
      } catch {
        throw new Error('PRD.md not found. Please create a PRD first using the PRD Generator.');
      }

      // Also try to read AUDIENCE_JTBD.md for additional context
      let audienceContent = '';
      try {
        audienceContent = await fs.readFile(
          path.join(this.projectPath, 'AUDIENCE_JTBD.md'),
          'utf-8'
        );
      } catch {
        // Optional file, continue without it
      }

      // Build the prompt
      const prompt = this.buildPrompt(prdContent, audienceContent);

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
      logger.info('Starting stories generation', { directory: this.projectPath });

      this.process = spawn('claude', claudeArgs, {
        cwd: this.projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
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
        logger.error('Stories generator stderr', { text });
      });

      // Handle process close
      this.process.on('close', (code) => {
        this.status = {
          generating: false,
          startedAt: null,
        };
        this.process = null;

        if (code === 0) {
          // Try to parse the prd.json from output
          const prdJson = this.parsePrdJson(this.accumulatedOutput);
          if (prdJson) {
            this.emit('complete', prdJson);
          } else {
            this.emit('error', 'Failed to parse user stories from Claude output');
          }
        } else {
          this.emit('error', `Stories generation exited with code ${code}`);
        }
        this.emit('status', this.status);
      });

      // Handle process error
      this.process.on('error', (err) => {
        this.status = {
          generating: false,
          startedAt: null,
        };
        this.process = null;
        this.emit('error', err.message);
        this.emit('status', this.status);
      });

    } catch (err) {
      this.status = {
        generating: false,
        startedAt: null,
      };
      this.emit('error', err instanceof Error ? err.message : 'Unknown error');
      this.emit('status', this.status);
    }
  }

  private buildPrompt(prdContent: string, audienceContent: string): string {
    return `You are converting a Product Requirements Document (PRD) into user stories for an AI development agent.

## Input: PRD.md

${prdContent}

${audienceContent ? `## Additional Context: AUDIENCE_JTBD.md\n\n${audienceContent}` : ''}

## Task

Extract user stories from the PRD and output them in the exact JSON format below. Each story should:
1. Have a clear, actionable title
2. Include specific, testable acceptance criteria
3. Be prioritized (1 = highest priority, implement first)
4. Start with \`passes: false\` (the AI agent will set to true when complete)

## Output Format

Output ONLY valid JSON in exactly this format (no markdown, no explanation):

{
  "branchName": "ralph/feature-name",
  "userStories": [
    {
      "id": "US-001",
      "title": "Short descriptive title of the feature",
      "acceptanceCriteria": [
        "Specific testable criterion 1",
        "Specific testable criterion 2",
        "typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}

## Guidelines

- Create 5-15 user stories covering the core functionality
- Priority 1 stories are foundational (setup, core features)
- Priority 2 stories build on priority 1
- Priority 3 stories are enhancements or edge cases
- Each acceptance criterion should be verifiable by running code or tests
- Always include "typecheck passes" as an acceptance criterion
- Include "tests pass" for stories that warrant testing
- The branchName should be descriptive of the feature set

Output the JSON now:`;
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
      }
    }
  }

  private parsePrdJson(output: string): PrdJson | null {
    // Try to find JSON in the output
    // Look for the JSON object pattern
    const jsonMatch = output.match(/\{[\s\S]*"branchName"[\s\S]*"userStories"[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate structure
        if (parsed.branchName && Array.isArray(parsed.userStories)) {
          // Ensure all stories have required fields
          const validStories = parsed.userStories.map((story: Partial<UserStory>, index: number) => ({
            id: story.id || `US-${String(index + 1).padStart(3, '0')}`,
            title: story.title || 'Untitled Story',
            acceptanceCriteria: Array.isArray(story.acceptanceCriteria) 
              ? story.acceptanceCriteria 
              : ['typecheck passes'],
            priority: typeof story.priority === 'number' ? story.priority : index + 1,
            passes: false, // Always start as false
            notes: story.notes || '',
          }));

          return {
            branchName: parsed.branchName,
            userStories: validStories,
          };
        }
      } catch (e) {
        logger.error('Failed to parse prd.json', { error: e instanceof Error ? e.message : String(e) });
      }
    }

    return null;
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
        generating: false,
        startedAt: null,
      };
      this.emit('cancelled');
      this.emit('status', this.status);
    }
  }
}
