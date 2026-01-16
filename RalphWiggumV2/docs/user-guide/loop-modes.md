# Loop Modes

WIGGUM supports multiple operating modes, each designed for different stages of the development workflow.

## Build Mode

**Purpose**: Implement tasks from `IMPLEMENTATION_PLAN.md`

### How It Works

1. Reads the next incomplete task from the plan
2. Analyzes codebase context
3. Implements the task
4. Runs validation commands
5. Commits on success
6. Updates the plan
7. Repeats until complete or stopped

### When to Use

- Implementing planned features
- Bug fixes with clear scope
- Refactoring tasks
- Test writing

### Configuration

```
Mode: Build
Max Iterations: 20 (recommended start)
```

### Output

- Committed code changes
- Updated IMPLEMENTATION_PLAN.md
- Execution logs

## Plan Mode

**Purpose**: Generate or update `IMPLEMENTATION_PLAN.md`

### How It Works

1. Analyzes project structure
2. Reads PRD.md and spec files
3. Identifies required tasks
4. Prioritizes by dependencies
5. Generates structured plan

### When to Use

- Starting a new feature
- Breaking down large tasks
- Sprint planning
- Understanding project scope

### Input Sources

- PRD.md
- AUDIENCE_JTBD.md
- Spec files in `specs/`
- Existing codebase

### Output

```markdown
# Implementation Plan

## Phase 1: Foundation
- [ ] Task 1: Setup database schema
- [ ] Task 2: Create data models
- [ ] Task 3: Add validation

## Phase 2: API
- [ ] Task 4: Implement endpoints
- [ ] Task 5: Add authentication
```

## Plan SLC Mode

**Purpose**: Create Simple, Lovable, Complete release slices

### How It Works

1. Reads AUDIENCE_JTBD.md
2. Identifies user jobs-to-be-done
3. Groups into minimal viable features
4. Prioritizes by user value
5. Creates SLC-oriented plan

### When to Use

- Product-driven development
- MVP planning
- User story decomposition
- Release planning

### Requirements

- AUDIENCE_JTBD.md must exist
- Clear user personas defined
- Jobs-to-be-done documented

### Output

Plans organized by SLC slice:

```markdown
# SLC Plan

## Slice 1: Basic Authentication
User: New users who want to get started quickly

### Jobs to Be Done
- Sign up for an account
- Log in securely

### Tasks
- [ ] Create signup form
- [ ] Implement email verification
- [ ] Build login flow
```

## Plan Work Mode

**Purpose**: Scope planning for feature branches

### How It Works

1. Detects current Git branch
2. Analyzes branch name for context
3. Limits scope to branch work
4. Creates focused plan

### When to Use

- Feature branch development
- Scoped refactoring
- Bug fix branches
- Experimental work

### Requirements

- Must be on a feature branch (not main/master)
- Branch name should describe the work

### Input

```
Work Scope: "Add user profile page with avatar upload"
```

### Output

A focused plan specific to the branch:

```markdown
# Work Plan: feature/user-profile

## Tasks
- [ ] Create UserProfile component
- [ ] Add avatar upload functionality
- [ ] Connect to profile API
- [ ] Write tests
```

## Mode Comparison

| Feature | Build | Plan | Plan SLC | Plan Work |
|---------|-------|------|----------|-----------|
| Implements code | ✅ | ❌ | ❌ | ❌ |
| Creates commits | ✅ | ❌ | ❌ | ❌ |
| Generates plans | ❌ | ✅ | ✅ | ✅ |
| Requires branch | ❌ | ❌ | ❌ | ✅ |
| Uses JTBD | ❌ | Optional | ✅ | ❌ |

## Best Practices

### Start with Planning

Always generate a plan before building:

1. Run **Plan** mode to create initial plan
2. Review and adjust the plan
3. Run **Build** mode to implement

### Set Appropriate Limits

- Plan modes: 1-5 iterations
- Build mode: 10-50 iterations
- Complex features: Higher limits

### Use SLC for Products

When building user-facing features:

1. Document AUDIENCE_JTBD.md
2. Run Plan SLC mode
3. Implement one slice at a time

## Next Steps

- [Safety Controls](/user-guide/safety-controls) - Configure limits
- [Your First Loop](/getting-started/first-loop) - Practice tutorial
