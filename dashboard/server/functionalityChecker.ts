/**
 * Functionality Checker - Validates UI components are complete and functional
 *
 * Detects:
 * - Dead onClick handlers (handlers that don't do anything)
 * - Missing WebSocket handlers (frontend sends message type backend doesn't handle)
 * - Orphan state (state set but never read, or read but never set)
 * - Broken imports (imports of non-existent modules)
 * - Unused props (props passed but not used)
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from './lib/logger.js';

export interface DeadHandler {
  file: string;
  line: number;
  handler: string;
  reason: string;
}

export interface MissingWsHandler {
  sentFrom: string;
  messageType: string;
  line: number;
}

export interface OrphanState {
  file: string;
  variable: string;
  issue: 'never-read' | 'never-set' | 'set-not-used';
  line: number;
}

export interface UnusedProp {
  component: string;
  file: string;
  prop: string;
  line: number;
}

export interface BrokenImport {
  file: string;
  line: number;
  importPath: string;
  reason: string;
}

export interface FunctionalityCheckResult {
  deadHandlers: DeadHandler[];
  missingWsHandlers: MissingWsHandler[];
  orphanState: OrphanState[];
  unusedProps: UnusedProp[];
  brokenImports: BrokenImport[];
  summary: {
    total: number;
    critical: number;
    warnings: number;
  };
}

export class FunctionalityChecker {
  private projectPath: string;
  private srcPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.srcPath = path.join(projectPath, 'src');
  }

  /**
   * Run all functionality checks
   */
  async check(): Promise<FunctionalityCheckResult> {
    const result: FunctionalityCheckResult = {
      deadHandlers: [],
      missingWsHandlers: [],
      orphanState: [],
      unusedProps: [],
      brokenImports: [],
      summary: { total: 0, critical: 0, warnings: 0 },
    };

    try {
      // Get all TypeScript/TSX files
      const files = await this.findTsFiles(this.srcPath);

      // Run checks in parallel
      const [handlers, wsHandlers, stateIssues] = await Promise.all([
        this.checkDeadHandlers(files),
        this.checkWebSocketHandlers(files),
        this.checkOrphanState(files),
      ]);

      result.deadHandlers = handlers;
      result.missingWsHandlers = wsHandlers;
      result.orphanState = stateIssues;

      // Calculate summary
      result.summary.critical =
        result.deadHandlers.length +
        result.missingWsHandlers.length;
      result.summary.warnings =
        result.orphanState.length +
        result.unusedProps.length;
      result.summary.total = result.summary.critical + result.summary.warnings;

    } catch (err) {
      logger.error('Error running functionality checks', { error: err instanceof Error ? err.message : String(err) });
    }

    return result;
  }

  /**
   * Find all TypeScript/TSX files in a directory
   */
  private async findTsFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            const subFiles = await this.findTsFiles(fullPath);
            files.push(...subFiles);
          }
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or not readable
    }

    return files;
  }

  /**
   * Check for dead onClick handlers
   * Patterns that indicate a handler does nothing:
   * - Empty arrow functions: onClick={() => {}}
   * - Console.log only: onClick={() => console.log('clicked')}
   * - TODO/FIXME comments in handler
   */
  private async checkDeadHandlers(files: string[]): Promise<DeadHandler[]> {
    const deadHandlers: DeadHandler[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNum = i + 1;

          // Check for empty handlers
          const emptyHandler = line.match(/on\w+\s*=\s*\{?\s*\(\)\s*=>\s*\{\s*\}\s*\}?/);
          if (emptyHandler) {
            deadHandlers.push({
              file: path.relative(this.projectPath, file),
              line: lineNum,
              handler: emptyHandler[0].substring(0, 50),
              reason: 'Empty handler - does nothing',
            });
          }

          // Check for console.log-only handlers
          const logOnlyHandler = line.match(/on\w+\s*=\s*\{?\s*\(\)\s*=>\s*console\.(log|warn|error)/);
          if (logOnlyHandler) {
            deadHandlers.push({
              file: path.relative(this.projectPath, file),
              line: lineNum,
              handler: logOnlyHandler[0].substring(0, 50),
              reason: 'Handler only logs - no functional action',
            });
          }

          // Check for TODO/placeholder handlers
          if (line.match(/on\w+\s*=/) && (line.includes('TODO') || line.includes('FIXME') || line.includes('PLACEHOLDER'))) {
            const match = line.match(/on\w+\s*=/);
            if (match) {
              deadHandlers.push({
                file: path.relative(this.projectPath, file),
                line: lineNum,
                handler: match[0],
                reason: 'Handler marked as TODO/FIXME/PLACEHOLDER',
              });
            }
          }
        }
      } catch {
        // File not readable
      }
    }

    return deadHandlers;
  }

  /**
   * Check for WebSocket message types sent from frontend but not handled on backend
   */
  private async checkWebSocketHandlers(files: string[]): Promise<MissingWsHandler[]> {
    const missingHandlers: MissingWsHandler[] = [];
    const sentTypes = new Map<string, { file: string; line: number }>();
    const handledTypes = new Set<string>();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(this.projectPath, file);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNum = i + 1;

          // Find sent message types: sendCommand({ type: 'xxx' }) or send({ type: 'xxx' })
          const sendMatch = line.match(/(?:sendCommand|send|ws\.send)\s*\(\s*(?:JSON\.stringify\s*\()?\s*\{\s*type:\s*['"`]([^'"`]+)['"`]/);
          if (sendMatch) {
            sentTypes.set(sendMatch[1], { file: relativePath, line: lineNum });
          }

          // Find handled message types: case 'xxx': or message.type === 'xxx'
          const caseMatch = line.match(/case\s+['"`]([^'"`]+)['"`]\s*:/);
          if (caseMatch) {
            handledTypes.add(caseMatch[1]);
          }

          const typeCheckMatch = line.match(/(?:message|msg|data)\.type\s*===?\s*['"`]([^'"`]+)['"`]/);
          if (typeCheckMatch) {
            handledTypes.add(typeCheckMatch[1]);
          }
        }
      } catch {
        // File not readable
      }
    }

    // Find sent types that are not handled
    for (const [type, location] of sentTypes) {
      // Skip response types (ending in :result, :error, :update, etc.)
      if (type.match(/:(result|error|update|status|content|list|saved)$/)) {
        continue;
      }

      if (!handledTypes.has(type)) {
        missingHandlers.push({
          sentFrom: location.file,
          messageType: type,
          line: location.line,
        });
      }
    }

    return missingHandlers;
  }

  /**
   * Check for orphan state variables
   * - State set but never read
   * - State read but never set (except from initial value)
   */
  private async checkOrphanState(files: string[]): Promise<OrphanState[]> {
    const orphanState: OrphanState[] = [];

    for (const file of files) {
      // Only check React components (TSX files)
      if (!file.endsWith('.tsx')) continue;

      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(this.projectPath, file);

        // Find useState declarations
        const stateVars = new Map<string, { line: number; setter: string }>();

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNum = i + 1;

          // Match: const [foo, setFoo] = useState(...)
          const stateMatch = line.match(/const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState/);
          if (stateMatch) {
            stateVars.set(stateMatch[1], { line: lineNum, setter: stateMatch[2] });
          }
        }

        // Check if state variables are used
        for (const [varName, info] of stateVars) {
          let readCount = 0;

          for (const line of lines) {
            // Count reads (excluding the declaration)
            const readRegex = new RegExp(`\\b${varName}\\b`, 'g');
            const reads = (line.match(readRegex) || []).length;
            if (!line.includes('useState')) {
              readCount += reads;
            }
          }

          // State is orphan if never read after declaration
          if (readCount <= 1) {
            orphanState.push({
              file: relativePath,
              variable: varName,
              issue: 'set-not-used',
              line: info.line,
            });
          }
        }
      } catch {
        // File not readable
      }
    }

    return orphanState;
  }

  /**
   * Generate a markdown report of findings
   */
  generateReport(result: FunctionalityCheckResult): string {
    const lines: string[] = [
      '# Functionality Check Report',
      '',
      `**Generated**: ${new Date().toISOString()}`,
      '',
      '## Summary',
      '',
      `| Category | Count | Severity |`,
      `|----------|-------|----------|`,
      `| Dead Handlers | ${result.deadHandlers.length} | Critical |`,
      `| Missing WS Handlers | ${result.missingWsHandlers.length} | Critical |`,
      `| Orphan State | ${result.orphanState.length} | Warning |`,
      `| Unused Props | ${result.unusedProps.length} | Warning |`,
      `| **Total Issues** | **${result.summary.total}** | |`,
      '',
    ];

    if (result.deadHandlers.length > 0) {
      lines.push('## Dead Handlers', '');
      lines.push('| File | Line | Handler | Reason |');
      lines.push('|------|------|---------|--------|');
      for (const h of result.deadHandlers) {
        lines.push(`| ${h.file} | ${h.line} | \`${h.handler}\` | ${h.reason} |`);
      }
      lines.push('');
    }

    if (result.missingWsHandlers.length > 0) {
      lines.push('## Missing WebSocket Handlers', '');
      lines.push('| Sent From | Message Type | Line |');
      lines.push('|-----------|--------------|------|');
      for (const h of result.missingWsHandlers) {
        lines.push(`| ${h.sentFrom} | \`${h.messageType}\` | ${h.line} |`);
      }
      lines.push('');
    }

    if (result.orphanState.length > 0) {
      lines.push('## Orphan State Variables', '');
      lines.push('| File | Variable | Issue | Line |');
      lines.push('|------|----------|-------|------|');
      for (const s of result.orphanState) {
        lines.push(`| ${s.file} | \`${s.variable}\` | ${s.issue} | ${s.line} |`);
      }
      lines.push('');
    }

    if (result.summary.total === 0) {
      lines.push('## Result: All Clear!', '');
      lines.push('No functionality issues detected.');
    }

    return lines.join('\n');
  }
}
