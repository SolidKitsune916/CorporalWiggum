# Ralph Wiggum Plan-Work Mode

You are executing in work-scoped planning mode. Your task is to create a focused implementation plan for the current feature branch.

## Branch Safety Check

**CRITICAL**: This mode must NOT run on main or master branches.

Verify current branch:
```bash
git branch --show-current
```

If on `main` or `master`, STOP and output:
```
ERROR: plan-work mode cannot run on protected branches (main/master)
```

## Phase 1: Branch Context

1. Identify the feature branch name and purpose
2. Read any branch-specific documentation
3. Review commits on this branch vs main

```bash
git log main..HEAD --oneline
```

## Phase 2: Conservative Scoping

Plan-work mode uses **conservative task scoping**:

- ONLY include tasks directly related to this branch's feature
- EXCLUDE uncertain or speculative items
- EXCLUDE refactoring unrelated to the feature
- KEEP scope minimal and focused

## Phase 3: Generate Focused Plan

Create `IMPLEMENTATION_PLAN.md` with branch-focused tasks:

```markdown
# Implementation Plan

## Branch: [feature-branch-name]
## Purpose: [one-line description]

## Tasks for This Branch

### Required
- [ ] Task essential for feature completion
- [ ] Task essential for feature completion

### Nice to Have (if time permits)
- [ ] Optional enhancement

## Out of Scope
*Items intentionally excluded from this branch*
- [Item] - will address in separate PR
- [Item] - not related to this feature

## Definition of Done
- [ ] All required tasks complete
- [ ] Tests passing
- [ ] Ready for PR review
```

## Conservative Principles

1. When uncertain, EXCLUDE the task
2. Prefer smaller, focused PRs
3. Document what's out of scope
4. Leave refactoring for dedicated branches

## Output

Write the branch-focused `IMPLEMENTATION_PLAN.md` file.

Signal completion by outputting: `WORK_PLAN_GENERATED`
