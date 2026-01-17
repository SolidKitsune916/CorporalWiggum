/**
 * Codebase Analyzer - Combines ProjectScanner + Claude for semantic codebase analysis
 * 
 * Features:
 * - Uses existing ProjectScanner for structural analysis
 * - Uses Claude CLI for semantic understanding
 * - Identifies key files and components
 * - Provides architecture insights
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { ProjectScanner, ProjectScan } from './projectScanner.js';

export interface CodebaseAnalysis {
  // From ProjectScanner
  techStack: string[];
  fileCount: number;
  hasTests: boolean;
  hasApi: boolean;
  
  // From Claude analysis
  summary: string;
  keyComponents: string[];
  architectureNotes: string;
  suggestedFocus: string[];
}

interface KeyFile {
  path: string;
  content: string;
  type: 'config' | 'entry' | 'api' | 'component' | 'model' | 'other';
}

export class CodebaseAnalyzer extends EventEmitter {
  private projectPath: string;
  private ralphPath: string;
  private process: ChildProcess | null = null;
  private analyzing: boolean = false;

  constructor(projectPath: string, ralphPath?: string) {
    super();
    this.projectPath = projectPath;
    this.ralphPath = ralphPath || projectPath;
  }

  isAnalyzing(): boolean {
    return this.analyzing;
  }

  /**
   * Run full codebase analysis combining scanner + Claude
   */
  async analyze(): Promise<CodebaseAnalysis> {
    if (this.analyzing) {
      throw new Error('Analysis already in progress');
    }

    this.analyzing = true;
    this.emit('status', { analyzing: true });

    try {
      // Step 1: Run ProjectScanner for structural info
      this.emit('log', 'Running project scanner...');
      const scanner = new ProjectScanner(this.projectPath);
      const scanResult = await scanner.scan();

      // Step 2: Build basic analysis from scanner
      const structuralAnalysis = this.buildStructuralAnalysis(scanResult);
      this.emit('log', `Detected tech stack: ${structuralAnalysis.techStack.join(', ')}`);

      // Step 3: Identify key files to analyze
      this.emit('log', 'Identifying key files...');
      const keyFiles = await this.identifyKeyFiles(scanResult);
      this.emit('log', `Found ${keyFiles.length} key files for analysis`);

      // Step 4: Run Claude analysis on key files
      this.emit('log', 'Running Claude analysis...');
      const claudeAnalysis = await this.runClaudeAnalysis(keyFiles, scanResult);

      // Step 5: Combine results
      const analysis: CodebaseAnalysis = {
        ...structuralAnalysis,
        ...claudeAnalysis,
      };

      this.emit('complete', analysis);
      return analysis;

    } finally {
      this.analyzing = false;
      this.emit('status', { analyzing: false });
    }
  }

  /**
   * Cancel ongoing analysis
   */
  cancel(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
      this.analyzing = false;
      this.emit('cancelled');
      this.emit('status', { analyzing: false });
    }
  }

  /**
   * Build structural analysis from ProjectScanner results
   */
  private buildStructuralAnalysis(scan: ProjectScan): Pick<CodebaseAnalysis, 'techStack' | 'fileCount' | 'hasTests' | 'hasApi'> {
    const techStack: string[] = [];

    // Add language
    if (scan.language !== 'unknown') {
      techStack.push(scan.language === 'typescript' ? 'TypeScript' : 
                     scan.language === 'javascript' ? 'JavaScript' :
                     scan.language === 'python' ? 'Python' :
                     scan.language === 'go' ? 'Go' : scan.language);
    }

    // Add framework
    if (scan.framework) {
      techStack.push(scan.framework);
    }

    // Add package manager
    if (scan.packageManager) {
      techStack.push(scan.packageManager);
    }

    // Count files
    const fileCount = scan.structure.filter(s => s.type === 'file').length;

    // Check for tests
    const hasTests = scan.structure.some(s => 
      s.path.includes('test') || 
      s.path.includes('spec') || 
      s.path.includes('__tests__')
    );

    // Check for API
    const hasApi = scan.structure.some(s =>
      s.path.includes('api') ||
      s.path.includes('routes') ||
      s.path.includes('endpoints') ||
      s.path.includes('server')
    );

    return { techStack, fileCount, hasTests, hasApi };
  }

  /**
   * Identify key files that should be analyzed by Claude
   */
  private async identifyKeyFiles(scan: ProjectScan): Promise<KeyFile[]> {
    const keyFiles: KeyFile[] = [];
    const maxFileSize = 50000; // 50KB max per file
    const maxTotalSize = 150000; // 150KB total

    // Priority files to look for
    const priorityFiles = [
      { pattern: 'package.json', type: 'config' as const },
      { pattern: 'tsconfig.json', type: 'config' as const },
      { pattern: 'go.mod', type: 'config' as const },
      { pattern: 'requirements.txt', type: 'config' as const },
      { pattern: 'pyproject.toml', type: 'config' as const },
      { pattern: 'Cargo.toml', type: 'config' as const },
    ];

    // Entry point patterns
    const entryPatterns = [
      /^src\/index\.(ts|js|tsx|jsx)$/,
      /^src\/main\.(ts|js|tsx|jsx)$/,
      /^src\/app\.(ts|js|tsx|jsx)$/,
      /^index\.(ts|js|tsx|jsx)$/,
      /^main\.(ts|js|go|py)$/,
      /^app\.(ts|js|py)$/,
      /^server\/(index|main|app)\.(ts|js)$/,
    ];

    // API/route patterns
    const apiPatterns = [
      /^src\/api\/.*\.(ts|js)$/,
      /^api\/.*\.(ts|js)$/,
      /^routes\/.*\.(ts|js)$/,
      /^server\/.*\.(ts|js)$/,
    ];

    let totalSize = 0;

    // Add priority config files
    for (const { pattern, type } of priorityFiles) {
      const filePath = path.join(this.projectPath, pattern);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.length <= maxFileSize && totalSize + content.length <= maxTotalSize) {
          keyFiles.push({ path: pattern, content, type });
          totalSize += content.length;
        }
      } catch {
        // File doesn't exist
      }
    }

    // Find entry points
    for (const item of scan.structure) {
      if (item.type !== 'file') continue;
      if (totalSize >= maxTotalSize) break;

      for (const pattern of entryPatterns) {
        if (pattern.test(item.path)) {
          try {
            const content = await fs.readFile(path.join(this.projectPath, item.path), 'utf-8');
            if (content.length <= maxFileSize && totalSize + content.length <= maxTotalSize) {
              keyFiles.push({ path: item.path, content, type: 'entry' });
              totalSize += content.length;
            }
          } catch {
            // Can't read file
          }
          break;
        }
      }
    }

    // Find API routes (limit to 3)
    let apiCount = 0;
    for (const item of scan.structure) {
      if (item.type !== 'file' || apiCount >= 3) continue;
      if (totalSize >= maxTotalSize) break;

      for (const pattern of apiPatterns) {
        if (pattern.test(item.path)) {
          try {
            const content = await fs.readFile(path.join(this.projectPath, item.path), 'utf-8');
            if (content.length <= maxFileSize && totalSize + content.length <= maxTotalSize) {
              keyFiles.push({ path: item.path, content, type: 'api' });
              totalSize += content.length;
              apiCount++;
            }
          } catch {
            // Can't read file
          }
          break;
        }
      }
    }

    // Add README if exists
    try {
      const readmePath = path.join(this.projectPath, 'README.md');
      const content = await fs.readFile(readmePath, 'utf-8');
      if (content.length <= maxFileSize && totalSize + content.length <= maxTotalSize) {
        keyFiles.push({ path: 'README.md', content, type: 'other' });
        totalSize += content.length;
      }
    } catch {
      // No README
    }

    return keyFiles;
  }

  /**
   * Run Claude analysis on key files
   */
  private async runClaudeAnalysis(
    keyFiles: KeyFile[], 
    scan: ProjectScan
  ): Promise<Pick<CodebaseAnalysis, 'summary' | 'keyComponents' | 'architectureNotes' | 'suggestedFocus'>> {
    // Build prompt for Claude
    const prompt = this.buildAnalysisPrompt(keyFiles, scan);

    // Run Claude CLI
    const result = await this.executeClaudeAnalysis(prompt);

    // Parse the result
    return this.parseClaudeResult(result);
  }

  /**
   * Build the analysis prompt
   */
  private buildAnalysisPrompt(keyFiles: KeyFile[], scan: ProjectScan): string {
    let prompt = `You are analyzing a codebase to provide a high-level summary for PRD generation.

## Project Structure Overview

- **Project Name**: ${scan.projectName}
- **Language**: ${scan.language}
- **Framework**: ${scan.framework || 'Not detected'}
- **Package Manager**: ${scan.packageManager || 'Not detected'}
- **Is Monorepo**: ${scan.isMonorepo}
- **File Count**: ${scan.structure.length}

## Key Files

`;

    for (const file of keyFiles) {
      prompt += `### ${file.path} (${file.type})\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
    }

    prompt += `
## Task

Analyze this codebase and provide:

1. **SUMMARY**: A 2-3 sentence high-level description of what this project does
2. **KEY_COMPONENTS**: List of 3-7 main modules/features/components (one per line)
3. **ARCHITECTURE_NOTES**: Brief notes about the architecture patterns used (2-3 sentences)
4. **SUGGESTED_FOCUS**: Areas that might need attention or enhancement (2-5 items)

## Output Format

Respond in EXACTLY this format:

===SUMMARY===
[Your summary here]
===END_SUMMARY===

===KEY_COMPONENTS===
- Component 1
- Component 2
===END_KEY_COMPONENTS===

===ARCHITECTURE_NOTES===
[Your architecture notes here]
===END_ARCHITECTURE_NOTES===

===SUGGESTED_FOCUS===
- Focus area 1
- Focus area 2
===END_SUGGESTED_FOCUS===
`;

    return prompt;
  }

  /**
   * Execute Claude CLI for analysis
   */
  private async executeClaudeAnalysis(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
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
              output += text;
            } else if (json.type === 'assistant' && json.message?.content) {
              for (const block of json.message.content) {
                if (block.type === 'text') {
                  output += block.text;
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
      });

      this.process.stdin?.write(prompt);
      this.process.stdin?.end();

      this.process.on('close', (code) => {
        this.process = null;
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Claude analysis failed: ${stderrOutput || 'Unknown error'}`));
        }
      });

      this.process.on('error', (err) => {
        this.process = null;
        reject(err);
      });
    });
  }

  /**
   * Parse Claude's analysis result
   */
  private parseClaudeResult(result: string): Pick<CodebaseAnalysis, 'summary' | 'keyComponents' | 'architectureNotes' | 'suggestedFocus'> {
    // Extract sections using regex
    const summaryMatch = result.match(/===SUMMARY===\s*([\s\S]*?)\s*===END_SUMMARY===/);
    const componentsMatch = result.match(/===KEY_COMPONENTS===\s*([\s\S]*?)\s*===END_KEY_COMPONENTS===/);
    const architectureMatch = result.match(/===ARCHITECTURE_NOTES===\s*([\s\S]*?)\s*===END_ARCHITECTURE_NOTES===/);
    const focusMatch = result.match(/===SUGGESTED_FOCUS===\s*([\s\S]*?)\s*===END_SUGGESTED_FOCUS===/);

    // Parse list items
    const parseList = (text: string): string[] => {
      return text
        .split('\n')
        .map(line => line.replace(/^[-*]\s*/, '').trim())
        .filter(line => line.length > 0);
    };

    return {
      summary: summaryMatch?.[1]?.trim() || 'Unable to generate summary',
      keyComponents: componentsMatch ? parseList(componentsMatch[1]) : [],
      architectureNotes: architectureMatch?.[1]?.trim() || 'No architecture notes available',
      suggestedFocus: focusMatch ? parseList(focusMatch[1]) : [],
    };
  }
}
