/**
 * Iterative PRD Generator - Multi-phase Q&A interview workflow with versioning
 * 
 * Features:
 * - Interactive Q&A interview process
 * - Version context from previous PRDs
 * - Codebase analysis integration
 * - Session persistence
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess, exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import {
  PRDSessionManager,
  PRDSession,
  PRDQuestion,
  PRDQuestionRound,
  CodebaseAnalysis,
  PRDVersion,
  PRDVersionHistory,
} from './prdSessionManager.js';
import { CodebaseAnalyzer } from './codebaseAnalyzer.js';
import * as ExternalRepos from './externalRepos/index.js';
import {
  buildClaudeCliArgs,
  hasMcpRepos,
  buildMcpToolInstructions,
} from './externalRepos/mcpConfigManager.js';

interface GeneratorStatus {
  analyzing: boolean;
  generating: boolean;
  phase: string;
}

export class IterativePrdGenerator extends EventEmitter {
  private projectPath: string;
  private ralphPath: string;
  private projectId: string | null = null;  // For external repos lookup
  private sessionManager: PRDSessionManager;
  private codebaseAnalyzer: CodebaseAnalyzer;
  private process: ChildProcess | null = null;
  private mcpConfigCleanup: (() => void) | null = null;
  private status: GeneratorStatus = {
    analyzing: false,
    generating: false,
    phase: 'idle',
  };
  private accumulatedOutput: string = '';

  constructor(projectPath: string, ralphPath?: string, projectId?: string) {
    super();
    this.projectPath = projectPath;
    this.ralphPath = ralphPath || projectPath;
    this.projectId = projectId || null;
    this.sessionManager = new PRDSessionManager(projectPath);
    this.codebaseAnalyzer = new CodebaseAnalyzer(projectPath, ralphPath);

    // Forward session manager events
    this.sessionManager.on('session:saved', (session) => {
      this.emit('session', session);
    });

    // Forward codebase analyzer events
    this.codebaseAnalyzer.on('log', (msg) => this.emit('log', msg));
  }

  /**
   * Set the project ID for external repos lookup
   */
  setProjectId(projectId: string): void {
    this.projectId = projectId;
  }

  getStatus(): GeneratorStatus {
    return { ...this.status };
  }

  // ============================================================================
  // Version Management
  // ============================================================================

  /**
   * Check for existing PRD versions
   */
  async checkVersions(): Promise<PRDVersionHistory> {
    return this.sessionManager.getVersionHistory();
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Check for existing session
   */
  async hasSession(): Promise<boolean> {
    return this.sessionManager.hasSession();
  }

  /**
   * Resume existing session
   */
  async resumeSession(): Promise<PRDSession | null> {
    const session = await this.sessionManager.loadSession();
    if (session) {
      this.emit('session', session);
    }
    return session;
  }

  /**
   * Clear existing session
   */
  async clearSession(): Promise<void> {
    await this.sessionManager.clearSession();
    this.emit('session:cleared');
  }

  // ============================================================================
  // Interview Flow
  // ============================================================================

  /**
   * Start a new interview
   */
  async startInterview(
    description: string,
    contextDocs: string[],
    previousVersions: number[],
    startFresh: boolean,
    additionalContext?: string,
    skipQuestions?: boolean,
    selectedExternalRepos?: string[]
  ): Promise<PRDSession> {
    // Determine target version
    const history = await this.sessionManager.getVersionHistory();
    const targetVersion = startFresh ? 1 : history.latestVersion + 1;

    // Create new session
    const session = this.sessionManager.createSession(
      targetVersion,
      previousVersions,
      description,
      contextDocs,
      additionalContext,
      selectedExternalRepos
    );

    await this.sessionManager.saveSession(session);
    this.emit('session', session);

    // If skipQuestions is true, go directly to PRD generation
    if (skipQuestions) {
      // Don't auto-start questions, let the caller trigger generatePRD directly
      await this.sessionManager.updatePhase(session, 'generating');
    }

    return session;
  }

  /**
   * Run codebase analysis
   */
  async analyzeCodebase(): Promise<CodebaseAnalysis> {
    this.status.analyzing = true;
    this.status.phase = 'analyzing';
    this.emit('status', this.status);

    try {
      const analysis = await this.codebaseAnalyzer.analyze();
      
      // Update session with analysis
      const session = await this.sessionManager.loadSession();
      if (session) {
        await this.sessionManager.setCodebaseAnalysis(session, analysis);
      }

      this.emit('analysis', analysis);
      return analysis;

    } finally {
      this.status.analyzing = false;
      this.emit('status', this.status);
    }
  }

  /**
   * Generate clarifying questions
   */
  async generateQuestions(): Promise<PRDQuestion[]> {
    const session = await this.sessionManager.loadSession();
    if (!session) {
      throw new Error('No active session');
    }

    this.status.generating = true;
    this.status.phase = 'questions';
    this.emit('status', this.status);

    try {
      // Build the prompt
      const prompt = await this.buildQuestionsPrompt(session);

      // Run Claude
      const result = await this.runClaude(prompt);

      // Parse questions
      const questions = this.parseQuestions(result);

      // Add round to session
      await this.sessionManager.addRound(session, questions);
      await this.sessionManager.updatePhase(session, 'questions');

      this.emit('questions', {
        roundNumber: session.rounds.length,
        questions,
      });

      return questions;

    } finally {
      this.status.generating = false;
      this.emit('status', this.status);
    }
  }

  /**
   * Submit answers for current round
   */
  async submitAnswers(
    roundNumber: number,
    answers: Array<{ questionId: string; answer?: string; skipped: boolean }>
  ): Promise<PRDSession> {
    const session = await this.sessionManager.loadSession();
    if (!session) {
      throw new Error('No active session');
    }

    return this.sessionManager.submitAnswers(session, roundNumber, answers);
  }

  /**
   * Request more questions based on current answers
   */
  async requestMoreQuestions(): Promise<PRDQuestion[]> {
    // This reuses generateQuestions but includes previous answers in context
    return this.generateQuestions();
  }

  /**
   * Generate the final PRD
   */
  async generatePRD(): Promise<{ version: PRDVersion; prd: string; audience: string }> {
    const session = await this.sessionManager.loadSession();
    if (!session) {
      throw new Error('No active session');
    }

    this.status.generating = true;
    this.status.phase = 'generating';
    this.emit('status', this.status);
    await this.sessionManager.updatePhase(session, 'generating');

    try {
      // Build the full prompt
      const prompt = await this.buildPRDPrompt(session);

      // Run Claude (pass session for MCP integration)
      this.accumulatedOutput = '';
      const result = await this.runClaude(prompt, true, session);

      // Parse the output
      const { prd, audience } = this.parseDocuments(result);

      // Build version description from key changes
      const description = this.buildVersionDescription(session);

      // Save the new version
      const version = await this.sessionManager.saveNewVersion(prd, audience, description);

      // Update session
      await this.sessionManager.setFinalOutput(session, prd, audience);

      this.emit('complete', { version, prd, audience });

      return { version, prd, audience };

    } finally {
      this.status.generating = false;
      this.emit('status', this.status);
    }
  }

  /**
   * Cancel ongoing operation
   */
  cancel(): void {
    if (this.process) {
      const pid = this.process.pid;
      const isWindows = process.platform === 'win32';

      if (isWindows && pid) {
        exec(`taskkill /pid ${pid} /T /F`, () => {});
      } else {
        this.process.kill('SIGTERM');
      }

      this.status = { analyzing: false, generating: false, phase: 'idle' };
      this.emit('cancelled');
      this.emit('status', this.status);
    }

    if (this.codebaseAnalyzer.isAnalyzing()) {
      this.codebaseAnalyzer.cancel();
    }
  }

  // ============================================================================
  // Prompt Building
  // ============================================================================

  /**
   * Build prompt for generating questions
   */
  private async buildQuestionsPrompt(session: PRDSession): Promise<string> {
    let prompt = '';

    const isFollowup = session.rounds.length > 0;
    const roundNumber = session.rounds.length + 1;

    // Try to load custom prompt template
    try {
      prompt = await fs.readFile(
        path.join(this.ralphPath, 'PROMPT_prd_questions.md'),
        'utf-8'
      );
    } catch {
      prompt = this.getDefaultQuestionsPrompt(isFollowup, roundNumber);
    }

    // Build context sections
    const contextParts: string[] = [];

    // Add description
    contextParts.push(`## Product Description\n\n${session.description}`);

    // Add additional context (user-pasted content like rough draft PRD)
    if (session.additionalContext) {
      contextParts.push(`## Additional Context (User Provided)\n\n${session.additionalContext}`);
    }

    // Add previous PRD context if any
    if (session.previousVersions.length > 0) {
      const versionContext = await this.sessionManager.buildVersionContext(session.previousVersions);
      if (versionContext) {
        contextParts.push(versionContext);
      }
    }

    // Add codebase analysis if available
    if (session.codebaseAnalysis) {
      contextParts.push(this.formatCodebaseAnalysis(session.codebaseAnalysis));
    }

    // Add context documents
    if (session.contextDocs.length > 0) {
      let docsContext = '\n\n## Context Documents\n\n';
      for (const docPath of session.contextDocs) {
        try {
          const content = await fs.readFile(path.join(this.projectPath, docPath), 'utf-8');
          const truncated = content.length > 10000 
            ? content.substring(0, 10000) + '\n\n[... truncated ...]'
            : content;
          docsContext += `### ${docPath}\n\`\`\`markdown\n${truncated}\n\`\`\`\n\n`;
        } catch {
          // Skip unreadable files
        }
      }
      contextParts.push(docsContext);
    }

    // Add previous Q&A rounds if any
    if (session.rounds.length > 0) {
      contextParts.push(this.formatPreviousRounds(session.rounds));
    }

    // Replace placeholder
    prompt = prompt.replace('${CONTEXT}', contextParts.join('\n\n'));
    prompt = prompt.replace('${ROUND_NUMBER}', String(session.rounds.length + 1));
    prompt = prompt.replace('${IS_FOLLOWUP}', session.rounds.length > 0 ? 'true' : 'false');

    return prompt;
  }

  /**
   * Build prompt for generating the PRD
   */
  private async buildPRDPrompt(session: PRDSession): Promise<string> {
    let prompt = '';
    const hasPrevious = session.previousVersions.length > 0;
    const version = session.targetVersion;

    // Try to load custom prompt template
    try {
      prompt = await fs.readFile(
        path.join(this.ralphPath, 'PROMPT_prd.md'),
        'utf-8'
      );
    } catch {
      prompt = this.getDefaultPRDPrompt(hasPrevious, version);
    }

    // Build the full Q&A context
    const qaContext = this.buildFullQAContext(session);

    // Build context sections
    const contextParts: string[] = [];

    // Add description
    contextParts.push(`## Product Description\n\n${session.description}`);

    // Add additional context (user-pasted content like rough draft PRD)
    if (session.additionalContext) {
      contextParts.push(`## Additional Context (User Provided)\n\n${session.additionalContext}`);
    }

    // Add previous PRD context if any
    if (session.previousVersions.length > 0) {
      const versionContext = await this.sessionManager.buildVersionContext(session.previousVersions);
      if (versionContext) {
        contextParts.push(versionContext);
      }
    }

    // Add codebase analysis if available
    if (session.codebaseAnalysis) {
      contextParts.push(this.formatCodebaseAnalysis(session.codebaseAnalysis));
    }

    // Add context documents
    if (session.contextDocs.length > 0) {
      let docsContext = '\n\n## Context Documents\n\n';
      for (const docPath of session.contextDocs) {
        try {
          const content = await fs.readFile(path.join(this.projectPath, docPath), 'utf-8');
          const truncated = content.length > 10000
            ? content.substring(0, 10000) + '\n\n[... truncated ...]'
            : content;
          docsContext += `### ${docPath}\n\`\`\`markdown\n${truncated}\n\`\`\`\n\n`;
        } catch {
          // Skip unreadable files
        }
      }
      contextParts.push(docsContext);
    }

    // Add external repository context if selected
    if (session.selectedExternalRepos && session.selectedExternalRepos.length > 0 && this.projectId) {
      try {
        this.emit('log', `Fetching ${session.selectedExternalRepos.length} external repository(ies)...`);
        const { context, summary } = await ExternalRepos.fetchAndBuildContext(
          this.projectId,
          session.selectedExternalRepos,
          { maxTokens: 50000 }
        );
        if (context) {
          contextParts.push(context);
          this.emit('log', `External repos loaded:\n${summary}`);
        }
      } catch (error) {
        this.emit('log', `Warning: Failed to fetch external repos: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Replace placeholders
    prompt = prompt.replace('${CONTEXT}', contextParts.join('\n\n'));
    prompt = prompt.replace('${QA_CONTEXT}', qaContext);
    prompt = prompt.replace('${VERSION}', String(session.targetVersion));
    prompt = prompt.replace('${HAS_PREVIOUS}', session.previousVersions.length > 0 ? 'true' : 'false');

    return prompt;
  }

  /**
   * Format codebase analysis for prompt
   */
  private formatCodebaseAnalysis(analysis: CodebaseAnalysis): string {
    return `## Codebase Analysis

**Tech Stack**: ${analysis.techStack.join(', ')}
**File Count**: ${analysis.fileCount}
**Has Tests**: ${analysis.hasTests ? 'Yes' : 'No'}
**Has API**: ${analysis.hasApi ? 'Yes' : 'No'}

**Summary**: ${analysis.summary}

**Key Components**:
${analysis.keyComponents.map(c => `- ${c}`).join('\n')}

**Architecture Notes**: ${analysis.architectureNotes}

**Suggested Focus Areas**:
${analysis.suggestedFocus.map(f => `- ${f}`).join('\n')}
`;
  }

  /**
   * Format previous Q&A rounds for prompt
   */
  private formatPreviousRounds(rounds: PRDQuestionRound[]): string {
    if (rounds.length === 0) return '';

    let context = '\n\n## Previous Q&A\n\n';

    for (const round of rounds) {
      context += `### Round ${round.roundNumber}\n\n`;
      for (const q of round.questions) {
        context += `**Q**: ${q.text}\n`;
        if (q.skipped) {
          context += `**A**: (Skipped)\n\n`;
        } else {
          context += `**A**: ${q.answer || '(No answer)'}\n\n`;
        }
      }
    }

    return context;
  }

  /**
   * Build full Q&A context for PRD generation
   */
  private buildFullQAContext(session: PRDSession): string {
    if (session.rounds.length === 0) {
      return 'No Q&A sessions conducted.';
    }

    let context = '## Interview Q&A Summary\n\n';

    // Group by category if available
    const byCategory: Record<string, Array<{ q: string; a: string }>> = {
      technical: [],
      users: [],
      features: [],
      scope: [],
      integration: [],
      other: [],
    };

    for (const round of session.rounds) {
      for (const q of round.questions) {
        if (q.skipped) continue;
        const category = q.category || 'other';
        byCategory[category].push({
          q: q.text,
          a: q.answer || '(No answer)',
        });
      }
    }

    // Format by category
    const categoryNames: Record<string, string> = {
      technical: 'Technical Details',
      users: 'Users & Audience',
      features: 'Features & Capabilities',
      scope: 'Scope & Constraints',
      integration: 'Integrations',
      other: 'General',
    };

    for (const [cat, items] of Object.entries(byCategory)) {
      if (items.length === 0) continue;
      context += `### ${categoryNames[cat]}\n\n`;
      for (const item of items) {
        context += `**Q**: ${item.q}\n**A**: ${item.a}\n\n`;
      }
    }

    return context;
  }

  /**
   * Build version description from session
   */
  private buildVersionDescription(session: PRDSession): string {
    // Extract key points from description
    const words = session.description.split(' ').slice(0, 15).join(' ');
    return words.length < session.description.length ? words + '...' : words;
  }

  // ============================================================================
  // Claude Execution
  // ============================================================================

  /**
   * Run Claude CLI
   */
  private async runClaude(prompt: string, stream = false, session?: PRDSession): Promise<string> {
    return new Promise((resolve, reject) => {
      let claudeArgs = [
        '-p',
        '--output-format=stream-json',
        '--verbose',
        '--dangerously-skip-permissions'
      ];

      const isWindows = process.platform === 'win32';
      if (isWindows || process.env.CLAUDE_MODEL_FLAG === 'true') {
        claudeArgs.push('--model', 'sonnet');
      }

      // Check if MCP is needed for external repos
      if (session?.selectedExternalRepos && session.selectedExternalRepos.length > 0 && this.projectId) {
        const repos = ExternalRepos.getExternalReposByIds(this.projectId, session.selectedExternalRepos);
        if (hasMcpRepos(repos)) {
          const { args, cleanup } = buildClaudeCliArgs(claudeArgs, repos);
          claudeArgs = args;
          this.mcpConfigCleanup = cleanup;
          this.emit('log', 'MCP integration enabled for external repos');

          // Add MCP tool instructions to prompt
          const mcpInstructions = buildMcpToolInstructions(repos);
          if (mcpInstructions) {
            prompt = prompt + '\n\n' + mcpInstructions;
          }
        }
      }

      this.emit('log', `Executing Claude CLI...`);
      this.emit('log', `Prompt size: ${prompt.length} characters`);

      this.process = spawn('claude', claudeArgs, {
        cwd: this.projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let output = '';
      let stderrOutput = '';

      if (this.process.stdout) {
        const rl = readline.createInterface({
          input: this.process.stdout,
          crlfDelay: Infinity,
        });

        rl.on('line', (line) => {
          try {
            const json = JSON.parse(line);
            if (json.type === 'text' || json.type === 'content_block_delta') {
              const text = json.text || json.delta?.text || '';
              if (text) {
                output += text;
                if (stream) {
                  this.accumulatedOutput += text;
                  this.emit('output', { text });
                }
              }
            } else if (json.type === 'assistant' && json.message?.content) {
              for (const block of json.message.content) {
                if (block.type === 'text') {
                  output += block.text;
                  if (stream) {
                    this.accumulatedOutput += block.text;
                    this.emit('output', { text: block.text });
                  }
                }
              }
            }
          } catch {
            // Non-JSON line
          }
        });
      }

      this.process.stderr?.on('data', (data) => {
        stderrOutput += data.toString();
        this.emit('log', `[stderr] ${data.toString()}`);
      });

      this.process.stdin?.write(prompt);
      this.process.stdin?.end();

      this.process.on('close', (code) => {
        this.process = null;
        // Cleanup MCP config file if created
        if (this.mcpConfigCleanup) {
          this.mcpConfigCleanup();
          this.mcpConfigCleanup = null;
        }
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Claude exited with code ${code}: ${stderrOutput}`));
        }
      });

      this.process.on('error', (err) => {
        this.process = null;
        // Cleanup MCP config file if created
        if (this.mcpConfigCleanup) {
          this.mcpConfigCleanup();
          this.mcpConfigCleanup = null;
        }
        reject(err);
      });
    });
  }

  // ============================================================================
  // Response Parsing
  // ============================================================================

  /**
   * Parse questions from Claude output
   */
  private parseQuestions(output: string): PRDQuestion[] {
    const questions: PRDQuestion[] = [];

    // Try to parse structured format first
    const questionsMatch = output.match(/===QUESTIONS===\s*([\s\S]*?)\s*===END_QUESTIONS===/);
    
    if (questionsMatch) {
      // Parse structured format
      const lines = questionsMatch[1].split('\n');
      let currentQuestion: Partial<PRDQuestion> | null = null;

      for (const line of lines) {
        const questionMatch = line.match(/^Q(\d+):\s*(.+)$/);
        const categoryMatch = line.match(/^CATEGORY:\s*(.+)$/i);
        const suggestedMatch = line.match(/^SUGGESTED:\s*(.+)$/i);

        if (questionMatch) {
          if (currentQuestion && currentQuestion.text) {
            questions.push(currentQuestion as PRDQuestion);
          }
          currentQuestion = {
            id: `q-${Date.now()}-${questions.length}`,
            text: questionMatch[2].trim(),
            skipped: false,
          };
        } else if (categoryMatch && currentQuestion) {
          const cat = categoryMatch[1].toLowerCase().trim();
          if (['technical', 'users', 'features', 'scope', 'integration', 'other'].includes(cat)) {
            currentQuestion.category = cat as PRDQuestion['category'];
          }
        } else if (suggestedMatch && currentQuestion) {
          currentQuestion.suggestedAnswer = suggestedMatch[1].trim();
        }
      }

      if (currentQuestion && currentQuestion.text) {
        questions.push(currentQuestion as PRDQuestion);
      }
    } else {
      // Fallback: parse numbered list format
      const lines = output.split('\n');
      
      for (const line of lines) {
        const match = line.match(/^\d+\.\s+(.+)$/);
        if (match && match[1].trim().endsWith('?')) {
          questions.push({
            id: `q-${Date.now()}-${questions.length}`,
            text: match[1].trim(),
            skipped: false,
          });
        }
      }
    }

    return questions;
  }

  /**
   * Parse PRD and Audience documents from output
   */
  private parseDocuments(output: string): { prd: string; audience: string } {
    const prdMatch = output.match(/===PRD_START===\s*([\s\S]*?)\s*===PRD_END===/);
    const audienceMatch = output.match(/===AUDIENCE_START===\s*([\s\S]*?)\s*===AUDIENCE_END===/);

    return {
      prd: prdMatch?.[1]?.trim() || output,
      audience: audienceMatch?.[1]?.trim() || '',
    };
  }

  // ============================================================================
  // Default Prompts
  // ============================================================================

  private getDefaultQuestionsPrompt(isFollowup: boolean, roundNumber: number): string {
    const roundInstructions = isFollowup
      ? `This is round ${roundNumber} of the interview. Based on the previous answers, ask follow-up questions to dig deeper into areas that need clarification or explore new aspects not yet covered.`
      : `This is the initial round of questions. Ask questions covering:
- Technical requirements and constraints
- Target users and their needs
- Core features and capabilities
- Scope boundaries
- Integration requirements`;

    return `You are helping to gather requirements for a Product Requirements Document (PRD).

\${CONTEXT}

## Task

Generate 10-25 clarifying questions to better understand the product requirements. For each question, provide a SUGGESTED answer based on the context - this gives users a starting point they can edit.

${roundInstructions}

## Output Format

Respond in EXACTLY this format:

===QUESTIONS===
Q1: [Your question here]
CATEGORY: technical
SUGGESTED: [Your best guess answer based on context]

Q2: [Your question here]
CATEGORY: users
SUGGESTED: [Your best guess answer based on context]

Q3: [Your question here]
CATEGORY: features
SUGGESTED: [Your best guess answer based on context]
===END_QUESTIONS===

Use categories: technical, users, features, scope, integration, other
Each question MUST have a SUGGESTED line with a helpful, context-aware answer.
`;
  }

  private getDefaultPRDPrompt(hasPrevious: boolean, version: number): string {
    const previousSection = hasPrevious
      ? `Since this is an update to existing PRDs, include a "Changes from Previous Version" section at the beginning summarizing what's new or different.

`
      : '';

    return `You are generating a comprehensive Product Requirements Document.

\${CONTEXT}

\${QA_CONTEXT}

## Task

Generate a complete PRD (version ${version}) based on all the context provided above.

${previousSection}The PRD should include:
1. Project Overview (Purpose, Scope, Key Features)
2. Technical Architecture
3. Data Models & Interfaces
4. Functional Requirements
5. User Roles & Access Control
6. User Interface Specifications
7. API Specifications
8. Integration Requirements
9. Non-Functional Requirements
10. Glossary

Also generate an AUDIENCE_JTBD.md document with:
- Primary audience analysis
- Jobs to be done
- User personas

## Output Format

===PRD_START===
[Full PRD content]
===PRD_END===

===AUDIENCE_START===
[Full AUDIENCE_JTBD content]
===AUDIENCE_END===
`;
  }
}
