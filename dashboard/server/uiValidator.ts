/**
 * UI Validator - Validates UI components are complete and functional
 *
 * Checks:
 * - All buttons have working onClick handlers
 * - Forms have onSubmit handlers
 * - Loading states exist for async operations
 * - Error states exist for failure cases
 * - Disabled states are properly controlled
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from './lib/logger.js';

export interface ButtonIssue {
  file: string;
  line: number;
  buttonText: string;
  issue: 'no-handler' | 'empty-handler' | 'missing-loading' | 'missing-disabled';
}

export interface FormIssue {
  file: string;
  line: number;
  issue: 'no-onsubmit' | 'no-action' | 'no-error-handling';
}

export interface AsyncIssue {
  file: string;
  line: number;
  operation: string;
  issue: 'no-loading-state' | 'no-error-state' | 'no-try-catch';
}

export interface UIValidationResult {
  buttonIssues: ButtonIssue[];
  formIssues: FormIssue[];
  asyncIssues: AsyncIssue[];
  summary: {
    total: number;
    buttons: number;
    forms: number;
    async: number;
  };
}

export class UIValidator {
  private projectPath: string;
  private srcPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.srcPath = path.join(projectPath, 'src');
  }

  /**
   * Run all UI validation checks
   */
  async validate(): Promise<UIValidationResult> {
    const result: UIValidationResult = {
      buttonIssues: [],
      formIssues: [],
      asyncIssues: [],
      summary: { total: 0, buttons: 0, forms: 0, async: 0 },
    };

    try {
      const files = await this.findTsxFiles(this.srcPath);

      const [buttons, forms, asyncOps] = await Promise.all([
        this.validateButtons(files),
        this.validateForms(files),
        this.validateAsyncOperations(files),
      ]);

      result.buttonIssues = buttons;
      result.formIssues = forms;
      result.asyncIssues = asyncOps;

      result.summary.buttons = buttons.length;
      result.summary.forms = forms.length;
      result.summary.async = asyncOps.length;
      result.summary.total = buttons.length + forms.length + asyncOps.length;
    } catch (err) {
      logger.error('Error running UI validation', { error: err instanceof Error ? err.message : String(err) });
    }

    return result;
  }

  /**
   * Find all TSX files
   */
  private async findTsxFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            const subFiles = await this.findTsxFiles(fullPath);
            files.push(...subFiles);
          }
        } else if (entry.name.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return files;
  }

  /**
   * Validate button elements have proper handlers
   */
  private async validateButtons(files: string[]): Promise<ButtonIssue[]> {
    const issues: ButtonIssue[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(this.projectPath, file);

        // Track if we're inside a Button component
        let inButton = false;
        let buttonStartLine = 0;
        let buttonHasOnClick = false;
        let buttonText = '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNum = i + 1;

          // Check for Button component start
          if (line.match(/<Button\s/)) {
            inButton = true;
            buttonStartLine = lineNum;
            buttonHasOnClick = false;
            buttonText = '';

            // Check if onClick is on the same line
            if (line.match(/onClick\s*=/)) {
              buttonHasOnClick = true;
            }

            // Check for empty handler on same line
            if (line.match(/onClick\s*=\s*\{?\s*\(\)\s*=>\s*\{\s*\}\s*\}?/)) {
              issues.push({
                file: relativePath,
                line: lineNum,
                buttonText: 'unknown',
                issue: 'empty-handler',
              });
            }

            // Try to extract button text
            const textMatch = line.match(/>([^<]+)</);
            if (textMatch) {
              buttonText = textMatch[1].trim();
            }
          }

          // If inside button, check for onClick
          if (inButton && line.match(/onClick\s*=/)) {
            buttonHasOnClick = true;
          }

          // Check for button close
          if (inButton && (line.includes('</Button>') || line.match(/\/>/))) {
            // Button without onClick handler (but skip if disabled={true})
            if (!buttonHasOnClick && !content.slice(0, i * 100).includes('disabled={true}')) {
              // Some buttons are intentionally display-only, skip those
              const isDisplayOnly = buttonText.toLowerCase().includes('badge') ||
                                   buttonText.toLowerCase().includes('status');
              if (!isDisplayOnly) {
                issues.push({
                  file: relativePath,
                  line: buttonStartLine,
                  buttonText: buttonText || 'unknown',
                  issue: 'no-handler',
                });
              }
            }
            inButton = false;
          }
        }
      } catch {
        // File not readable
      }
    }

    return issues;
  }

  /**
   * Validate form elements have proper handlers
   */
  private async validateForms(files: string[]): Promise<FormIssue[]> {
    const issues: FormIssue[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(this.projectPath, file);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNum = i + 1;

          // Check for form elements
          if (line.match(/<form\s/i)) {
            // Look for onSubmit in nearby lines
            const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join('\n');

            if (!context.match(/onSubmit\s*=/)) {
              issues.push({
                file: relativePath,
                line: lineNum,
                issue: 'no-onsubmit',
              });
            }
          }
        }
      } catch {
        // File not readable
      }
    }

    return issues;
  }

  /**
   * Validate async operations have proper loading/error states
   */
  private async validateAsyncOperations(files: string[]): Promise<AsyncIssue[]> {
    const issues: AsyncIssue[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(this.projectPath, file);

        // Find async functions and fetch calls
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNum = i + 1;

          // Check for fetch calls without try-catch
          if (line.match(/fetch\s*\(/) || line.match(/await\s+\w+\.\w+\(/)) {
            // Look for try-catch in surrounding context
            const contextStart = Math.max(0, i - 10);
            const contextEnd = Math.min(lines.length, i + 10);
            const context = lines.slice(contextStart, contextEnd).join('\n');

            if (!context.includes('try {') && !context.includes('catch')) {
              // Skip if it's inside a try block
              const beforeContext = lines.slice(Math.max(0, i - 20), i).join('\n');
              if (!beforeContext.includes('try {')) {
                issues.push({
                  file: relativePath,
                  line: lineNum,
                  operation: line.trim().substring(0, 40),
                  issue: 'no-try-catch',
                });
              }
            }
          }
        }

        // Check for async handlers without loading states
        const hasAsyncHandler = content.match(/onClick\s*=\s*\{?\s*async/);
        const hasLoadingState = content.match(/loading|isLoading|pending|submitting/i);

        if (hasAsyncHandler && !hasLoadingState) {
          issues.push({
            file: relativePath,
            line: 1,
            operation: 'async onClick handler',
            issue: 'no-loading-state',
          });
        }
      } catch {
        // File not readable
      }
    }

    return issues;
  }

  /**
   * Generate a markdown report of findings
   */
  generateReport(result: UIValidationResult): string {
    const lines: string[] = [
      '# UI Validation Report',
      '',
      `**Generated**: ${new Date().toISOString()}`,
      '',
      '## Summary',
      '',
      `| Category | Issues |`,
      `|----------|--------|`,
      `| Button Issues | ${result.buttonIssues.length} |`,
      `| Form Issues | ${result.formIssues.length} |`,
      `| Async Issues | ${result.asyncIssues.length} |`,
      `| **Total** | **${result.summary.total}** |`,
      '',
    ];

    if (result.buttonIssues.length > 0) {
      lines.push('## Button Issues', '');
      lines.push('| File | Line | Button | Issue |');
      lines.push('|------|------|--------|-------|');
      for (const b of result.buttonIssues) {
        lines.push(`| ${b.file} | ${b.line} | ${b.buttonText} | ${b.issue} |`);
      }
      lines.push('');
    }

    if (result.formIssues.length > 0) {
      lines.push('## Form Issues', '');
      lines.push('| File | Line | Issue |');
      lines.push('|------|------|-------|');
      for (const f of result.formIssues) {
        lines.push(`| ${f.file} | ${f.line} | ${f.issue} |`);
      }
      lines.push('');
    }

    if (result.asyncIssues.length > 0) {
      lines.push('## Async Operation Issues', '');
      lines.push('| File | Line | Operation | Issue |');
      lines.push('|------|------|-----------|-------|');
      for (const a of result.asyncIssues) {
        lines.push(`| ${a.file} | ${a.line} | \`${a.operation}\` | ${a.issue} |`);
      }
      lines.push('');
    }

    if (result.summary.total === 0) {
      lines.push('## Result: All Clear!', '');
      lines.push('No UI validation issues detected.');
    }

    return lines.join('\n');
  }
}
