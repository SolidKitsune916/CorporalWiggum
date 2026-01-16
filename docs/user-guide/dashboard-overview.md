# Dashboard Overview

The R.A.L.P.H. dashboard provides a visual interface for managing autonomous coding loops.

## Main Navigation

The dashboard has four main tabs:

### Dashboard Tab

The main control center showing:

- **Loop Controls** - Start/Stop buttons, mode selector, iteration limit
- **Existing Documents** - Quick access to PRD, AUDIENCE_JTBD, IMPLEMENTATION_PLAN
- **Loop Status** - Current state, iteration count, mode
- **Context Meter** - Token usage estimate
- **Git History** - Recent commits
- **Task List** - Implementation plan progress
- **Recent Logs** - Last 20 log entries

### Generate Tab

AI-powered content generation:

- **Implementation Plan** - Generate task lists from descriptions
- **Code Review** - Analyze code vs documentation
- **Quality Review** - LLM-as-Judge subjective quality checks
- **PRD & Audience** - Generate product requirements

### Logs Tab

Full log viewer with:
- Real-time Claude output streaming
- Timestamp and log level filtering
- Clear button to reset

### Setup Tab

Configuration options:

- **Project Info** - Path and status
- **Specialist Agents** - Install/enable Claude Code agents
- **Cursor Rules** - Manage .cursor/rules files
- **CLAUDE.md** - Edit Ralph instructions
- **Dependencies** - Check required tools

## Header

The header shows:

- **WIGGUM Logo** - Click to return to dashboard
- **Workflow Mode Toggle** - Simple vs Advanced
- **Launcher Button** - Switch to project launcher
- **GitHub Link** - Repository link (if configured)
- **Connection Status** - WebSocket state
- **Loop Status Badge** - Running/Idle indicator

## Loop Controls

### Start Button

Click to begin a loop with options:

- **Mode**: Build, Plan, Plan-SLC, Plan-Work, Review
- **Max Iterations**: 0 = unlimited, or specific number

### Stop Button

Gracefully stops the current loop:
- Waits for current iteration to complete
- Saves state for recovery
- Updates task progress

## Task List

Shows tasks from `IMPLEMENTATION_PLAN.md`:

- **Checkbox** - Completion status
- **Task ID** - Reference number
- **Title** - Task description
- **Progress Bar** - Overall completion

Click a task to see details (in Advanced mode).

## Context Meter

Estimates token usage:
- Shows current context size
- Warns when approaching limits
- Helps plan iteration counts

## Next Steps

- [Loop Modes](/user-guide/loop-modes) - Detailed mode explanations
- [Safety Controls](/user-guide/safety-controls) - Guardrails and limits
