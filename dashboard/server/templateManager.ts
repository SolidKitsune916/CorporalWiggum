import fs from 'fs/promises';
import path from 'path';

const DEFAULT_TEMPLATES: Record<string, string> = {
  'AGENTS.md': `# Project Configuration

## Build Commands

- Build: \`npm run build\`
- Dev: \`npm run dev\`
- Test: \`npm test\`

## Validation Commands

- Typecheck: \`npx tsc --noEmit\`
- Lint: \`npm run lint\`

## Operational Notes

[Add project-specific patterns and guidelines here]
`,

  'CLAUDE.md': `# Ralph Wiggum Instructions

## Quick Reference

\`\`\`bash
# Planning modes
./loop.sh plan              # Standard planning
./loop.sh plan-slc          # SLC-oriented planning
./loop.sh plan-work "desc"  # Work-scoped planning

# Building mode
./loop.sh                  # Build mode, unlimited
./loop.sh 20               # Build mode, max 20 iterations
\`\`\`

---

## Phase 0: Orient

Before starting any task:

1. Study \`AGENTS.md\` for project-specific build/test commands
2. Study \`IMPLEMENTATION_PLAN.md\` for current tasks and priorities

---

## Phase 1: Execute

1. Pick the highest-priority incomplete task from \`IMPLEMENTATION_PLAN.md\`
2. Search the codebase first - do not assume functionality is missing
3. Implement that ONE task completely
4. Run validation (see \`AGENTS.md\` for commands)
5. If tests pass: \`git add -A && git commit -m "feat: [task summary]"\`
6. Update \`IMPLEMENTATION_PLAN.md\`: mark complete, note discoveries

---

## Completion Signal

**ONLY output \`ALL_TASKS_COMPLETE\` when there are ZERO incomplete tasks in IMPLEMENTATION_PLAN.md**
`,

  'IMPLEMENTATION_PLAN.md': `# Implementation Plan

## Current Tasks

### Priority 1 - Core Features

- [ ] Task 1: [Description]
- [ ] Task 2: [Description]

### Priority 2 - Enhancements

- [ ] Task 3: [Description]
- [ ] Task 4: [Description]

---

## Completed Tasks

*Completed tasks will be moved here.*

---

## Notes & Discoveries

*Add operational learnings here during development.*
`,

  'AUDIENCE_JTBD.md': `# Target Audience & Jobs-To-Be-Done

## Target Audience

### Primary Users

**[User Persona Name]**
- Role: [Job title/role]
- Goals: [What they want to achieve]
- Pain Points: [Current frustrations]
- Context: [How they work]

---

## Jobs-To-Be-Done

### Main Job

**When** [situation],
**I want to** [action],
**So I can** [outcome].

---

## Success Metrics

- [Metric 1]: [Target]
- [Metric 2]: [Target]
`,

  'PRD.md': `# Product Requirements Document

## Overview

### Product Name
[Product Name]

### Problem Statement
[What problem does this solve?]

### Target Users
[Who will use this?]

---

## Key Features

1. **Feature 1**: [Description]
2. **Feature 2**: [Description]
3. **Feature 3**: [Description]

---

## Success Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
`,
};

export class TemplateManager {
  private templatesDir: string;
  private templates: Map<string, string> = new Map();

  constructor(templatesDir: string) {
    this.templatesDir = templatesDir;
    this.loadTemplates();
  }

  private async loadTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(this.templatesDir);
      for (const file of files) {
        if (file.endsWith('.template')) {
          const name = file.replace('.template', '');
          const content = await fs.readFile(
            path.join(this.templatesDir, file),
            'utf-8'
          );
          this.templates.set(name, content);
        }
      }
    } catch {
      // Templates directory may not exist, use defaults
      console.log('Using default templates');
    }
  }

  getTemplate(name: string): string | null {
    // Check loaded templates first
    if (this.templates.has(name)) {
      return this.templates.get(name)!;
    }

    // Fall back to default templates
    if (DEFAULT_TEMPLATES[name]) {
      return DEFAULT_TEMPLATES[name];
    }

    return null;
  }

  async createFile(projectPath: string, fileName: string, options?: Record<string, string>): Promise<void> {
    let content = this.getTemplate(fileName);

    if (!content) {
      throw new Error(`No template found for ${fileName}`);
    }

    // Apply substitutions
    if (options) {
      for (const [key, value] of Object.entries(options)) {
        content = content.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
      }
    }

    const filePath = path.join(projectPath, fileName);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  getAvailableTemplates(): string[] {
    const available = new Set<string>();

    // Add loaded templates
    for (const name of this.templates.keys()) {
      available.add(name);
    }

    // Add default templates
    for (const name of Object.keys(DEFAULT_TEMPLATES)) {
      available.add(name);
    }

    return Array.from(available);
  }
}
