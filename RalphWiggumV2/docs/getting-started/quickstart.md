# Quick Start

Get up and running with WIGGUM in under 5 minutes.

## Prerequisites

- WIGGUM dashboard running (`npm run dev`)
- A project with `AGENTS.md` configured
- Claude Code CLI installed and authenticated

## Step 1: Open the Dashboard

Navigate to [http://localhost:5173](http://localhost:5173) in your browser.

## Step 2: Check Connection Status

Look for the connection badge in the top-right corner:

- **Connected** (green) - Ready to use
- **Disconnected** (red) - Check server status

## Step 3: Configure Your Project

If this is a new project, use the Setup Wizard:

1. Click the **Setup** tab
2. Run the **Dependency Checker** to verify requirements
3. Configure **AGENTS.md** with your build commands
4. Set up **CLAUDE.md** with project instructions

## Step 4: Create an Implementation Plan

Before running a build loop, you need tasks to implement:

1. Switch to the **Generate** tab
2. Select **Plan** mode
3. Optionally provide context (PRD, specs)
4. Click **Generate Plan**

The generated plan appears in `IMPLEMENTATION_PLAN.md`.

## Step 5: Start Your First Loop

1. Return to the **Dashboard** tab
2. Select **Build** mode
3. Set **Max Iterations** (start with 5-10)
4. Click **Start Build**

## What Happens During a Loop?

Each iteration:

1. **Reads** the next task from `IMPLEMENTATION_PLAN.md`
2. **Implements** the task following `CLAUDE.md` instructions
3. **Validates** using commands from `AGENTS.md`
4. **Commits** changes if validation passes
5. **Updates** the plan, marking the task complete

Watch the **Log Viewer** to see real-time progress.

## Stopping a Loop

Click **Stop Loop** at any time to gracefully halt execution. The current iteration will complete before stopping.

## Example: Building a Feature

```markdown
# IMPLEMENTATION_PLAN.md

## Current Sprint

### Feature: User Authentication
- [ ] Create login form component
- [ ] Add form validation
- [ ] Connect to auth API
- [ ] Add error handling
- [ ] Write tests
```

With this plan, WIGGUM will:

1. Create the login form component
2. Add validation logic
3. Integrate with your auth API
4. Handle errors gracefully
5. Write tests for each piece

Each task is implemented, validated, and committed separately.

## Next Steps

- [Your First Loop](/getting-started/first-loop) - Detailed walkthrough
- [Loop Modes](/user-guide/loop-modes) - Learn about Plan and Build modes
- [Safety Controls](/user-guide/safety-controls) - Configure limits
