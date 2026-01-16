# Quickstart

Get up and running with R.A.L.P.H. in 5 minutes.

## 1. Start the Dashboard

```bash
npm run dev
```

This starts:
- Frontend on [http://localhost:5173](http://localhost:5173)
- WebSocket server on port 3001

## 2. Access the Dashboard

Open your browser to [http://localhost:5173](http://localhost:5173).

You'll see the main dashboard with:
- **Loop Status** - Current loop state (Idle/Running)
- **Task List** - Implementation plan progress
- **Git History** - Recent commits
- **Log Viewer** - Real-time Claude output

## 3. Configure Your Project

If this is your first time:

1. The **Onboarding Wizard** will appear automatically
2. Click "Scan Project" to analyze your codebase
3. Review the generated `AGENTS.md` configuration
4. Save to initialize Ralph for your project

## 4. Start Your First Loop

### Using the Dashboard

1. Go to the **Dashboard** tab
2. Select a loop mode:
   - **Build** - Execute implementation tasks
   - **Plan** - Generate implementation plans
3. Set max iterations (0 = unlimited)
4. Click **Start**

### Using the CLI

```bash
# Build mode (unlimited iterations)
./loop.sh

# Build mode (max 10 iterations)
./loop.sh 10

# Plan mode
./loop.sh plan

# SLC planning mode
./loop.sh plan-slc
```

## 5. Monitor Progress

Watch Claude work in real-time:
- **Logs** tab shows Claude's output
- **Task List** updates as tasks complete
- **Git History** shows commits

## Key Files

After setup, your project will have:

```
your-project/
├── AGENTS.md              # Build/test commands
├── CLAUDE.md              # Ralph instructions
├── IMPLEMENTATION_PLAN.md # Task list
└── .ralph/                # Session data
```

## Next Steps

- [Your First Loop](/getting-started/first-loop) - Detailed walkthrough
- [Loop Modes](/user-guide/loop-modes) - Understanding different modes
- [Safety Controls](/user-guide/safety-controls) - Guardrails and limits
