# Your First Loop

This guide walks you through running your first autonomous coding loop with R.A.L.P.H.

## Prerequisites

- Dashboard running (`npm run dev`)
- Project initialized with `AGENTS.md` and `CLAUDE.md`
- An `IMPLEMENTATION_PLAN.md` with tasks to complete

## Step 1: Create an Implementation Plan

You have two options:

### Option A: Generate with AI

1. Go to **Generate** > **Implementation Plan**
2. Enter a description of what you want to build
3. (Optional) Enable "Use PRD Documents" if you have PRD.md
4. Click **Generate**
5. Review the generated plan
6. Click **Insert** to save as `IMPLEMENTATION_PLAN.md`

### Option B: Write Manually

Create `IMPLEMENTATION_PLAN.md`:

```markdown
# Implementation Plan

## Tasks

- [ ] Task 1: Create user authentication component
- [ ] Task 2: Add login form with validation
- [ ] Task 3: Implement session management
- [ ] Task 4: Add logout functionality
```

## Step 2: Configure Build Commands

Ensure `AGENTS.md` has your project's commands:

```markdown
## Build & Run

- Build: `npm run build`
- Dev server: `npm run dev`
- Tests: `npm test`

## Validation

- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
```

## Step 3: Start the Loop

### From Dashboard

1. Go to **Dashboard** tab
2. Verify loop status shows **Idle**
3. Select **Build** mode
4. Set **Max Iterations**: `5` (start small)
5. Click **Start**

### From Terminal

```bash
./loop.sh 5
```

## Step 4: Monitor Progress

As the loop runs:

1. **Watch Logs** - Real-time Claude output
2. **Check Tasks** - Progress bar updates
3. **Review Commits** - Git history shows changes

### Understanding Loop Output

```
[Iteration 1/5]
- Reading IMPLEMENTATION_PLAN.md...
- Found 4 incomplete tasks
- Working on: Task 1: Create user authentication component
- Running validation...
- Tests passed
- Committing changes...
[Iteration Complete]
```

## Step 5: Review Results

When the loop completes:

1. Check `IMPLEMENTATION_PLAN.md` - Tasks marked `[x]` are done
2. Review git history for commits
3. Run tests manually: `npm test`
4. Try the application: `npm run dev`

## Common Scenarios

### Loop Stops Early

The loop stops when:
- All tasks complete (ideal)
- Max iterations reached
- Critical error occurs
- You click **Stop**

### Task Fails

If a task fails validation:
1. The loop will retry
2. After 3 consecutive failures, it may stop
3. Check logs for error details
4. Fix manually and restart

### Want More Iterations

If tasks remain after max iterations:
1. Click **Start** again
2. Or run `./loop.sh` for unlimited

## Best Practices

1. **Start Small** - Use 5-10 iterations first
2. **Clear Tasks** - Well-defined tasks complete faster
3. **Good Tests** - Validation catches errors early
4. **Commit Often** - Each task should be one commit
5. **Watch Logs** - Spot issues before they compound

## Next Steps

- [Dashboard Overview](/user-guide/dashboard-overview) - Full dashboard guide
- [Loop Modes](/user-guide/loop-modes) - Plan vs Build modes
- [Troubleshooting](/troubleshooting/common-issues) - When things go wrong
