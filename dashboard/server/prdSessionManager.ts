/**
 * PRD Session Manager - Handles session persistence and PRD version management
 * 
 * Features:
 * - Session persistence to .ralph/prd-session.json
 * - PRD version detection (PRD_v1.md, PRD_v2.md, etc.)
 * - Version history tracking
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

// Types (mirroring frontend types for backend use)
export interface PRDVersion {
  version: number;
  filename: string;
  audienceFilename: string;
  createdAt: string;
  description: string;
}

export interface PRDVersionHistory {
  versions: PRDVersion[];
  latestVersion: number;
}

export type PRDQuestionCategory = 'technical' | 'users' | 'features' | 'scope' | 'integration' | 'other';

export interface PRDQuestion {
  id: string;
  text: string;
  category?: PRDQuestionCategory;
  answer?: string;
  skipped: boolean;
}

export interface PRDQuestionRound {
  roundNumber: number;
  questions: PRDQuestion[];
  submittedAt?: string;
}

export type PRDInterviewPhase = 'version-select' | 'input' | 'analyzing' | 'questions' | 'generating' | 'complete';

export interface CodebaseAnalysis {
  techStack: string[];
  fileCount: number;
  hasTests: boolean;
  hasApi: boolean;
  summary: string;
  keyComponents: string[];
  architectureNotes: string;
  suggestedFocus: string[];
}

export interface PRDSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  targetVersion: number;
  previousVersions: number[];
  phase: PRDInterviewPhase;
  description: string;
  additionalContext?: string;  // Free text pasted by user (rough draft PRD, specs, etc.)
  contextDocs: string[];
  codebaseAnalysis?: CodebaseAnalysis;
  rounds: PRDQuestionRound[];
  finalPrd?: string;
  finalAudience?: string;
  // External repository references for PRD context
  selectedExternalRepos?: string[];  // Array of repo IDs to include
}

export class PRDSessionManager extends EventEmitter {
  private projectPath: string;
  private ralphDir: string;
  private sessionFile: string;

  constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
    this.ralphDir = path.join(projectPath, '.ralph');
    this.sessionFile = path.join(this.ralphDir, 'prd-session.json');
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Check if a session exists
   */
  async hasSession(): Promise<boolean> {
    try {
      await fs.access(this.sessionFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load existing session
   */
  async loadSession(): Promise<PRDSession | null> {
    try {
      const content = await fs.readFile(this.sessionFile, 'utf-8');
      return JSON.parse(content) as PRDSession;
    } catch {
      return null;
    }
  }

  /**
   * Save session to disk
   */
  async saveSession(session: PRDSession): Promise<void> {
    // Ensure .ralph directory exists
    try {
      await fs.mkdir(this.ralphDir, { recursive: true });
    } catch {
      // Directory may already exist
    }

    // Update the updatedAt timestamp
    session.updatedAt = new Date().toISOString();

    await fs.writeFile(this.sessionFile, JSON.stringify(session, null, 2), 'utf-8');
    this.emit('session:saved', session);
  }

  /**
   * Clear/delete session
   */
  async clearSession(): Promise<void> {
    try {
      await fs.unlink(this.sessionFile);
      this.emit('session:cleared');
    } catch {
      // File may not exist
    }
  }

  /**
   * Create a new session
   */
  createSession(
    targetVersion: number,
    previousVersions: number[],
    description: string,
    contextDocs: string[],
    additionalContext?: string,
    selectedExternalRepos?: string[]
  ): PRDSession {
    const now = new Date().toISOString();
    return {
      id: `prd-session-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      targetVersion,
      previousVersions,
      phase: 'input',
      description,
      additionalContext,
      contextDocs,
      rounds: [],
      selectedExternalRepos,
    };
  }

  /**
   * Update session phase
   */
  async updatePhase(session: PRDSession, phase: PRDInterviewPhase): Promise<PRDSession> {
    session.phase = phase;
    await this.saveSession(session);
    return session;
  }

  /**
   * Add a Q&A round to session
   */
  async addRound(session: PRDSession, questions: PRDQuestion[]): Promise<PRDSession> {
    const roundNumber = session.rounds.length + 1;
    session.rounds.push({
      roundNumber,
      questions,
    });
    await this.saveSession(session);
    return session;
  }

  /**
   * Submit answers for a round
   */
  async submitAnswers(
    session: PRDSession,
    roundNumber: number,
    answers: Array<{ questionId: string; answer?: string; skipped: boolean }>
  ): Promise<PRDSession> {
    const round = session.rounds.find(r => r.roundNumber === roundNumber);
    if (!round) {
      throw new Error(`Round ${roundNumber} not found`);
    }

    // Update questions with answers
    for (const answer of answers) {
      const question = round.questions.find(q => q.id === answer.questionId);
      if (question) {
        question.answer = answer.answer;
        question.skipped = answer.skipped;
      }
    }

    round.submittedAt = new Date().toISOString();
    await this.saveSession(session);
    return session;
  }

  /**
   * Set codebase analysis
   */
  async setCodebaseAnalysis(session: PRDSession, analysis: CodebaseAnalysis): Promise<PRDSession> {
    session.codebaseAnalysis = analysis;
    await this.saveSession(session);
    return session;
  }

  /**
   * Set final output
   */
  async setFinalOutput(session: PRDSession, prd: string, audience: string): Promise<PRDSession> {
    session.finalPrd = prd;
    session.finalAudience = audience;
    session.phase = 'complete';
    await this.saveSession(session);
    return session;
  }

  // ============================================================================
  // Version Management
  // ============================================================================

  /**
   * Scan for existing PRD versions
   */
  async getVersionHistory(): Promise<PRDVersionHistory> {
    const versions: PRDVersion[] = [];
    
    try {
      const files = await fs.readdir(this.projectPath);
      
      // Find all PRD_v*.md files
      const prdPattern = /^PRD_v(\d+)\.md$/;
      
      for (const file of files) {
        const match = file.match(prdPattern);
        if (match) {
          const version = parseInt(match[1], 10);
          const filename = file;
          const audienceFilename = `AUDIENCE_JTBD_v${version}.md`;
          
          // Get file stats for creation date
          const stats = await fs.stat(path.join(this.projectPath, file));
          
          // Try to extract description from the PRD content
          let description = '';
          try {
            const content = await fs.readFile(path.join(this.projectPath, file), 'utf-8');
            // Look for a description in the first few lines or "Changes from" section
            const changesMatch = content.match(/## Changes from.*?\n\n([\s\S]*?)(?=\n##|\n---|$)/i);
            if (changesMatch) {
              description = changesMatch[1].trim().substring(0, 200);
            } else {
              // Use first paragraph after title
              const firstParaMatch = content.match(/^#.*?\n\n(.*?)(?=\n\n|\n#)/s);
              if (firstParaMatch) {
                description = firstParaMatch[1].trim().substring(0, 200);
              }
            }
          } catch {
            description = `Version ${version}`;
          }
          
          versions.push({
            version,
            filename,
            audienceFilename,
            createdAt: stats.mtime.toISOString(),
            description: description || `PRD version ${version}`,
          });
        }
      }
      
      // Also check for legacy PRD.md (treat as v0 or suggest migration)
      try {
        await fs.access(path.join(this.projectPath, 'PRD.md'));
        const stats = await fs.stat(path.join(this.projectPath, 'PRD.md'));
        
        // Only add if no versioned PRDs exist
        if (versions.length === 0) {
          versions.push({
            version: 0,
            filename: 'PRD.md',
            audienceFilename: 'AUDIENCE_JTBD.md',
            createdAt: stats.mtime.toISOString(),
            description: 'Legacy PRD (unversioned)',
          });
        }
      } catch {
        // No legacy PRD
      }
      
      // Sort by version number
      versions.sort((a, b) => a.version - b.version);
      
    } catch {
      // Directory read failed
    }
    
    return {
      versions,
      latestVersion: versions.length > 0 ? Math.max(...versions.map(v => v.version)) : 0,
    };
  }

  /**
   * Get content of a specific PRD version
   */
  async getVersionContent(version: number): Promise<{ prd: string; audience: string }> {
    let prdFilename: string;
    let audienceFilename: string;
    
    if (version === 0) {
      // Legacy unversioned files
      prdFilename = 'PRD.md';
      audienceFilename = 'AUDIENCE_JTBD.md';
    } else {
      prdFilename = `PRD_v${version}.md`;
      audienceFilename = `AUDIENCE_JTBD_v${version}.md`;
    }
    
    let prd = '';
    let audience = '';
    
    try {
      prd = await fs.readFile(path.join(this.projectPath, prdFilename), 'utf-8');
    } catch {
      // File doesn't exist
    }
    
    try {
      audience = await fs.readFile(path.join(this.projectPath, audienceFilename), 'utf-8');
    } catch {
      // File doesn't exist
    }
    
    return { prd, audience };
  }

  /**
   * Get the next version number
   */
  async getNextVersionNumber(): Promise<number> {
    const history = await this.getVersionHistory();
    return history.latestVersion + 1;
  }

  /**
   * Save a new PRD version
   */
  async saveNewVersion(
    prd: string,
    audience: string,
    description: string
  ): Promise<PRDVersion> {
    const version = await this.getNextVersionNumber();
    const filename = `PRD_v${version}.md`;
    const audienceFilename = `AUDIENCE_JTBD_v${version}.md`;
    
    // Write files
    await fs.writeFile(path.join(this.projectPath, filename), prd, 'utf-8');
    await fs.writeFile(path.join(this.projectPath, audienceFilename), audience, 'utf-8');
    
    const versionInfo: PRDVersion = {
      version,
      filename,
      audienceFilename,
      createdAt: new Date().toISOString(),
      description,
    };
    
    this.emit('version:saved', versionInfo);
    return versionInfo;
  }

  /**
   * Build context from previous versions for Claude
   */
  async buildVersionContext(versionNumbers: number[]): Promise<string> {
    if (versionNumbers.length === 0) {
      return '';
    }
    
    let context = '\n\n## Previous PRD Versions (for context)\n\n';
    
    for (const version of versionNumbers.sort((a, b) => a - b)) {
      const { prd } = await this.getVersionContent(version);
      if (prd) {
        context += `### PRD Version ${version}\n\n`;
        // Truncate if too long
        if (prd.length > 15000) {
          context += prd.substring(0, 15000) + '\n\n[... truncated ...]\n\n';
        } else {
          context += prd + '\n\n';
        }
      }
    }
    
    return context;
  }
}
