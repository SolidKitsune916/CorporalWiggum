/**
 * Template Manager - Provides default templates for Ralph configuration files
 * Used to initialize projects that are missing Ralph files
 */

import fs from 'fs/promises';
import path from 'path';

// Default AGENTS.md template
const AGENTS_TEMPLATE = `# Project Configuration

## Build Commands
- Build: \`npm run build\`
- Test: \`npm test\`
- Lint: \`npm run lint\`

## Project Notes
[Add your project-specific notes here]
`;

// Default CLAUDE.md template
const CLAUDE_TEMPLATE = `# Project Instructions

## Phase 0: Orient

1. Read \`AGENTS.md\` for build/test commands
2. Read \`IMPLEMENTATION_PLAN.md\` for current tasks

## Phase 1: Execute

1. Pick highest-priority incomplete task
2. Search codebase first - don't assume functionality is missing
3. Implement completely - no placeholders, no TODOs
4. Run validation commands
5. If tests pass: \`git add -A && git commit -m "feat: [task]"\`
6. Update \`IMPLEMENTATION_PLAN.md\`

## Completion Signal

Output \`ALL_TASKS_COMPLETE\` when all tasks are done.
`;

// Default IMPLEMENTATION_PLAN.md template
const IMPLEMENTATION_PLAN_TEMPLATE = `# Implementation Plan

## Current Tasks

### Priority 1 - Critical
- [ ] [Add your first task here]

### Priority 2 - Important
- [ ] [Add secondary tasks here]

## Completed Tasks

[Completed tasks will be moved here]

## Notes & Discoveries

[Document findings during implementation]
`;

// Simple mode prd.json template
const PRD_JSON_TEMPLATE = JSON.stringify({
  branchName: "ralph/feature",
  userStories: [
    {
      id: "US-001",
      title: "[Your first user story]",
      acceptanceCriteria: [
        "[Criterion 1]",
        "[Criterion 2]",
        "typecheck passes"
      ],
      priority: 1,
      passes: false,
      notes: ""
    }
  ]
}, null, 2);

// Simple mode progress.txt template
const PROGRESS_TXT_TEMPLATE = `# Ralph Progress Log
Started: [DATE]

## Codebase Patterns
[Add reusable patterns discovered during development here]
- Example: Migrations use IF NOT EXISTS
- Example: Types exported from actions.ts

## Key Files
[Important files for this project]
- Example: db/schema.ts
- Example: app/auth/actions.ts

---

## [Date] - [Story ID]
- What was implemented: [Brief description]
- Files changed: [List of files]
- **Learnings:**
  - [Pattern or gotcha discovered]
  - [Another learning]

---
`;

// Workflow mode file template
const RALPH_MODE_TEMPLATE = 'simple';

export type TemplateName = 'AGENTS.md' | 'CLAUDE.md' | 'IMPLEMENTATION_PLAN.md' | 'prd.json' | 'progress.txt' | '.ralph-mode';

const TEMPLATES: Record<TemplateName, string> = {
  'AGENTS.md': AGENTS_TEMPLATE,
  'CLAUDE.md': CLAUDE_TEMPLATE,
  'IMPLEMENTATION_PLAN.md': IMPLEMENTATION_PLAN_TEMPLATE,
  'prd.json': PRD_JSON_TEMPLATE,
  'progress.txt': PROGRESS_TXT_TEMPLATE,
  '.ralph-mode': RALPH_MODE_TEMPLATE,
};

export class TemplateManager {
  /**
   * Get template content by name
   */
  getTemplate(name: TemplateName): string {
    const template = TEMPLATES[name];
    if (!template) {
      throw new Error(`Unknown template: ${name}`);
    }
    return template;
  }

  /**
   * Get all available template names
   */
  getAvailableTemplates(): TemplateName[] {
    return Object.keys(TEMPLATES) as TemplateName[];
  }

  /**
   * Check if a file exists at the given path
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize a project with specified templates
   * Only creates files that don't already exist
   * @param projectPath - The project directory path
   * @param templates - Array of template names to create (defaults to AGENTS.md and CLAUDE.md)
   * @returns Object with created files and skipped files
   */
  async initializeProject(
    projectPath: string,
    templates: TemplateName[] = ['AGENTS.md', 'CLAUDE.md']
  ): Promise<{ created: string[]; skipped: string[] }> {
    const created: string[] = [];
    const skipped: string[] = [];

    for (const templateName of templates) {
      const filePath = path.join(projectPath, templateName);
      const exists = await this.fileExists(filePath);

      if (exists) {
        skipped.push(templateName);
        continue;
      }

      const content = this.getTemplate(templateName);
      await fs.writeFile(filePath, content, 'utf-8');
      created.push(templateName);
    }

    return { created, skipped };
  }

  /**
   * Check which Ralph files exist in a project
   */
  async checkProjectFiles(projectPath: string): Promise<Record<TemplateName, boolean>> {
    const result: Record<TemplateName, boolean> = {
      'AGENTS.md': false,
      'CLAUDE.md': false,
      'IMPLEMENTATION_PLAN.md': false,
      'prd.json': false,
      'progress.txt': false,
      '.ralph-mode': false,
    };

    for (const templateName of this.getAvailableTemplates()) {
      const filePath = path.join(projectPath, templateName);
      result[templateName] = await this.fileExists(filePath);
    }

    return result;
  }

  /**
   * Check if a project needs initialization (missing both AGENTS.md and CLAUDE.md)
   */
  async needsInitialization(projectPath: string): Promise<boolean> {
    const hasAgents = await this.fileExists(path.join(projectPath, 'AGENTS.md'));
    const hasClaude = await this.fileExists(path.join(projectPath, 'CLAUDE.md'));
    return !hasAgents && !hasClaude;
  }
}
