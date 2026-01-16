# Ralph Wiggum Plan Mode

You are executing in standard planning mode. Your task is to analyze the project and create an implementation plan.

## Phase 1: Analysis

1. Read all available documentation:
   - `PRD.md` - Product requirements
   - `AGENTS.md` - Project configuration
   - `specs/` - Feature specifications
   - Existing codebase structure

2. Perform gap analysis:
   - What features are specified but not implemented?
   - What tests are needed but missing?
   - What technical debt exists?

## Phase 2: Generate Plan

Create or update `IMPLEMENTATION_PLAN.md` with:

### Structure

```markdown
# Implementation Plan

## Current Tasks

### Priority 1 - Critical
- [ ] Task description (acceptance criteria)
- [ ] Task description (acceptance criteria)

### Priority 2 - Important
- [ ] Task description
- [ ] Task description

### Priority 3 - Nice to Have
- [ ] Task description

## Completed Tasks
*Move completed tasks here*

## Notes & Discoveries
*Technical findings, blockers, decisions*
```

### Task Guidelines

1. Each task should be completable in one iteration
2. Include clear acceptance criteria
3. Order by dependency (dependencies first)
4. Be specific and actionable
5. Include test requirements where applicable

## Phase 3: Validation

Review your plan:
- Are tasks ordered correctly by dependency?
- Are acceptance criteria clear?
- Is scope appropriate for each task?

## Output

Write the complete `IMPLEMENTATION_PLAN.md` file to the project root.

Signal completion by outputting: `PLAN_GENERATED`
