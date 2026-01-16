# Ralph Wiggum V3

## Autonomous AI Development Loop System

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/your-repo/ralph-wiggum)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-18%2B-brightgreen.svg)](https://nodejs.org)

Ralph Wiggum V3 is an autonomous AI development system that combines iterative AI-powered code generation with real-time monitoring, quality gates, and multi-project management. It leverages Claude AI to autonomously plan, implement, and validate code changes through test-driven development (TDD) workflows.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Installation Modes](#installation-modes)
- [Usage Guide](#usage-guide)
- [Configuration](#configuration)
- [Dashboard Guide](#dashboard-guide)
- [Safety Features](#safety-features)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

---

## Overview

### Vision

Reduce software development costs and accelerate delivery by enabling AI to autonomously execute development tasks while maintaining code quality through programmatic validation and LLM-based quality gates.

### Target Users

- **Software developers** seeking to accelerate development workflows
- **Development teams** managing multiple projects simultaneously
- **Engineers** who want AI assistance with TDD-based development
- **Technical leads** requiring autonomous build systems with quality oversight

### How It Works

1. You define tasks in `IMPLEMENTATION_PLAN.md`
2. Configure your project in `AGENTS.md` with build/test commands
3. Ralph iteratively executes Claude to complete tasks
4. Validation runs automatically after each change
5. Changes are committed when validation passes
6. Loop continues until all tasks are complete

---

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Autonomous Build Loop** | Iterative AI-powered code generation with automatic validation and git commits |
| **Planning Modes** | Standard, SLC (Simple, Lovable, Complete), and branch-scoped planning |
| **Code Review Mode** | LLM-based codebase analysis and health scoring |
| **Real-Time Dashboard** | React + Express monitoring interface with WebSocket updates |
| **Multi-Project Launcher** | Central hub for managing multiple projects |
| **Cost Tracking** | Real-time token and cost monitoring with configurable limits |

### Safety Features

| Feature | Description |
|---------|-------------|
| **Cost Limits** | Stop execution when spending exceeds threshold (default: $50) |
| **Runtime Limits** | Maximum execution time to prevent runaway sessions (default: 4 hours) |
| **Loop Detection** | Fuzzy string matching to detect stuck iterations |
| **Exponential Backoff** | Automatic retry with increasing delays on failures |
| **State Rollback** | Git reset to last successful state after repeated failures |

### Planning Modes

| Mode | Command | Description |
|------|---------|-------------|
| **Standard** | `./loop.sh plan` | Full codebase analysis and implementation planning |
| **SLC** | `./loop.sh plan-slc` | User-journey focused, minimal viable scope |
| **Work** | `./loop.sh plan-work` | Branch-scoped, conservative task planning |

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RALPH WIGGUM V3 SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐    ┌──────────────────┐    ┌────────────────────┐    │
│  │     loop.sh      │    │    Dashboard     │    │   Configuration    │    │
│  │   (Execution     │◄──►│    (React +      │◄──►│      Files         │    │
│  │     Engine)      │    │    Express)      │    │   (AGENTS.md,      │    │
│  └────────┬─────────┘    └────────┬─────────┘    │    CLAUDE.md)      │    │
│           │                       │              └────────────────────┘    │
│           ▼                       ▼                                        │
│  ┌──────────────────┐    ┌──────────────────┐    ┌────────────────────┐    │
│  │   Claude CLI     │    │    WebSocket     │    │   Cost Tracker     │    │
│  │   (AI Engine)    │    │     Server       │    │   & Telemetry      │    │
│  └──────────────────┘    └──────────────────┘    └────────────────────┘    │
│                                                                             │
│  SAFETY & CONTROL LAYER                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Cost Limits │ Runtime Limits │ Loop Detection │ Backoff/Rollback   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Two-Tier Architecture

**Tier 1 - Execution Loop (loop.sh)**
- Bash script orchestrating Claude CLI sessions
- Supports 5 execution modes: build, plan, plan-slc, plan-work, review
- Fresh Claude session per iteration for context efficiency
- Health monitoring and stuck-loop detection

**Tier 2 - Dashboard (React + Express)**
- Frontend: React 19 + TypeScript + Vite
- Backend: Express.js + WebSocket server
- Real-time status updates and log streaming
- Cost tracking and telemetry visualization

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 19.x |
| Language | TypeScript | 5.x |
| Build Tool | Vite | 7.x |
| Styling | Tailwind CSS | 3.x |
| Backend | Express.js | 5.x |
| Real-time | WebSocket (ws) | 8.x |
| Runtime | Node.js | 18+ |
| AI Engine | Claude CLI | Latest |

### Execution Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  AGENTS.md  │────►│   loop.sh    │────►│ Claude CLI  │
└─────────────┘     └──────┬───────┘     └──────┬──────┘
                          │                     │
                          ▼                     ▼
┌─────────────────┐  ┌──────────────┐    ┌──────────────┐
│ IMPLEMENTATION_ │◄─│  Validation  │◄───│   Code       │
│    PLAN.md      │  │   Suite      │    │   Changes    │
└─────────────────┘  └──────┬───────┘    └──────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │Cost Check│ │ Git      │ │ Telemetry│
       │& Limits  │ │ Commit   │ │ Update   │
       └──────────┘ └──────────┘ └──────────┘
```

---

## Quick Start

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org)
- **Claude CLI** - [Install](https://claude.ai/cli)
- **Git** - [Download](https://git-scm.com)
- **Bash** - Included on macOS/Linux, Git Bash for Windows

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/ralph-wiggum.git
cd ralph-wiggum

# 2. Run setup
npm run setup

# 3. Start the dashboard
npm start
```

The dashboard will be available at `http://localhost:5173`

### Verify Installation

```bash
# Check all dependencies
npm run check
```

---

## Installation Modes

Ralph Wiggum supports two installation modes:

### Embedded Mode (Recommended)

Clone Ralph Wiggum into your project directory:

```bash
cd your-project
git clone https://github.com/your-repo/ralph-wiggum.git RalphWiggumV3
cd RalphWiggumV3
npm run setup
npm start
```

Ralph automatically detects the parent project and operates on it.

### Standalone Mode

Clone Ralph Wiggum anywhere and point it to your project:

```bash
git clone https://github.com/your-repo/ralph-wiggum.git ~/RalphWiggumV3
cd ~/RalphWiggumV3

# Set the project path
echo "PROJECT_PATH=/path/to/your/project" >> .env

npm run setup
npm start
```

### Environment Configuration

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Available environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_PATH` | Auto-detected | Target project directory |
| `PORT` | `3001` | WebSocket server port |
| `VITE_PORT` | `5173` | Frontend dev server port |
| `COST_LIMIT` | `50` | Maximum cost in dollars |
| `MAX_RUNTIME` | `14400` | Maximum runtime in seconds (4 hours) |
| `COMPLETION_PROMISE` | `ALL_TASKS_COMPLETE` | Completion signal string |

---

## Usage Guide

### Using the Dashboard

```bash
# Start the dashboard
npm start

# Or for development with hot reload
npm run dev
```

### Using the CLI Directly

#### Build Mode

Execute tasks from `IMPLEMENTATION_PLAN.md`:

```bash
# Unlimited iterations
./loop.sh

# With iteration limit
./loop.sh build 50

# With max iterations (default: 100)
./loop.sh 100
```

#### Plan Mode

Generate an implementation plan:

```bash
# Standard planning
./loop.sh plan

# SLC-oriented planning (requires AUDIENCE_JTBD.md)
./loop.sh plan-slc

# Branch-scoped planning (must not be on main/master)
./loop.sh plan-work
```

#### Review Mode

Analyze codebase against documentation:

```bash
./loop.sh review
```

### Environment Variables for CLI

```bash
# Set cost limit
COST_LIMIT=25 ./loop.sh

# Set runtime limit (1 hour)
MAX_RUNTIME=3600 ./loop.sh

# Dry run (preview only)
DRY_RUN=true ./loop.sh

# Disable backoff
BACKOFF_ENABLED=false ./loop.sh

# Disable rollback
ROLLBACK_ON_FAILURE=false ./loop.sh
```

---

## Configuration

### AGENTS.md

Project configuration file with build and validation commands:

```markdown
## Build & Run

- Build: `npm run build`
- Dev server: `npm run dev`
- Test: `npm test`

## Validation

Run these after implementing to get immediate feedback:

- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build check: `npm run build`

## Operational Notes

- Frontend runs on port 3000
- Backend runs on port 8080
- Use environment variables for configuration

### Codebase Patterns

- Components in `src/components/`
- Hooks in `src/hooks/`
- API calls in `src/services/`
```

### CLAUDE.md

AI instructions that guide Claude's behavior:

```markdown
# Project Instructions

## Phase 0: Orient

1. Read `AGENTS.md` for build/test commands
2. Read `IMPLEMENTATION_PLAN.md` for current tasks

## Phase 1: Execute

1. Pick highest-priority incomplete task
2. Search codebase first - don't assume functionality is missing
3. Implement completely - no placeholders, no TODOs
4. Run validation commands
5. If tests pass: `git add -A && git commit -m "feat: [task]"`
6. Update `IMPLEMENTATION_PLAN.md`

## Completion Signal

Output `ALL_TASKS_COMPLETE` when all tasks are done.
```

### IMPLEMENTATION_PLAN.md

Task tracking with prioritized checklist:

```markdown
# Implementation Plan

## Current Tasks

### Priority 1 - Critical
- [ ] Implement user authentication
- [ ] Add database connection

### Priority 2 - Important
- [ ] Create API endpoints
- [ ] Build UI components

### Priority 3 - Nice to Have
- [ ] Add dark mode
- [ ] Improve error messages

## Completed Tasks

- [x] Set up project structure
- [x] Configure TypeScript

## Notes & Discoveries

- Database requires PostgreSQL 14+
- Auth uses JWT tokens
```

---

## Dashboard Guide

### Dashboard Tab

The main monitoring interface showing:

- **Loop Status** - Running/stopped, mode, iteration count
- **Cost Meter** - Current spend vs limit with progress bar
- **Task List** - Implementation tasks with progress tracking
- **Log Viewer** - Real-time streaming output
- **Runtime Display** - Elapsed time vs limit

### Loop Controls

| Control | Default | Description |
|---------|---------|-------------|
| Mode | `build` | Execution mode (build, plan, plan-slc, plan-work, review) |
| Max Iterations | `100` | Maximum iterations before stopping |
| Cost Limit | `$50` | Maximum cost before stopping |
| Max Runtime | `4 hours` | Maximum execution time |
| Completion Promise | `ALL_TASKS_COMPLETE` | Signal to detect completion |
| Backoff Enabled | `true` | Enable exponential backoff on failures |
| Rollback on Failure | `true` | Reset to last successful state after 3 failures |
| Dry Run | `false` | Preview mode without executing Claude |

### Telemetry Tab

View iteration history and metrics:

- **Iteration History** - Expandable details for each iteration
- **Cost Summary** - Total cost breakdown by iteration
- **Performance Metrics** - Duration trends and success rates
- **Export Controls** - Download telemetry as JSON

### Setup Tab

Project configuration management:

- **Project Path** - View and override target project
- **Operating Mode** - Embedded or standalone indicator
- **Ralph Files Status** - Which configuration files exist
- **Dependencies** - System dependency status

---

## Safety Features

### Cost Tracking & Limits

Ralph tracks token usage and calculates costs in real-time:

- **Pricing**: $3 per 1M input tokens, $15 per 1M output tokens (Opus)
- **Default limit**: $50 (configurable via `COST_LIMIT`)
- **Visual indicator**: Progress bar with color thresholds
  - Green: < 50%
  - Yellow: 50-80%
  - Red: ≥ 80%

### Runtime Limits

Prevent runaway sessions:

- **Default**: 4 hours (14400 seconds)
- **Configurable**: Set `MAX_RUNTIME` in seconds
- **Display**: Shows elapsed vs limit in real-time

### Loop Detection

Detect when the AI is stuck producing similar outputs:

- **Method**: Fuzzy string matching with 90% similarity threshold
- **History**: Compares against last 5 outputs
- **Action**: Triggers backoff and warning

### Exponential Backoff

Automatic retry with increasing delays:

```
Delay = 2^(consecutive_failures) seconds
Maximum delay = 60 seconds
```

Example:
- 1st failure: 2 second delay
- 2nd failure: 4 second delay
- 3rd failure: 8 second delay
- ... up to 60 seconds max

### State Rollback

Automatic recovery after repeated failures:

- **Trigger**: 3 consecutive failures
- **Action**: `git reset --hard HEAD~1`
- **Effect**: Returns to last successful commit
- **Reset**: Failure counter reset after rollback

---

## Troubleshooting

### Common Issues

#### "Claude CLI not found"

```bash
# Install Claude CLI
# Visit: https://claude.ai/cli

# Verify installation
claude --version
```

#### "Dashboard won't start"

```bash
# Check dependencies
npm run check

# Reinstall dependencies
cd dashboard && rm -rf node_modules && npm install
```

#### "WebSocket connection failed"

- Check if port 3001 is available
- Try a different port: `PORT=3002 npm start`
- Check firewall settings

#### "Loop keeps failing"

1. Check `ralph.log` for error messages
2. Verify `AGENTS.md` has valid commands
3. Ensure validation commands work locally
4. Check `ralph-health.log` for patterns

#### "Cost limit reached too quickly"

- Reduce task complexity
- Split tasks into smaller chunks
- Increase `COST_LIMIT` if appropriate
- Use `plan` mode to generate efficient task lists

### Log Files

| File | Purpose |
|------|---------|
| `ralph.log` | Execution log with timestamps |
| `ralph-health.log` | Health metrics and warnings |
| `ralph-metrics.json` | Structured telemetry data |

### Getting Help

1. Check the [troubleshooting guide](#troubleshooting)
2. Review log files for error messages
3. Open an issue on GitHub

---

## Project Structure

```
RalphWiggumV3/
├── package.json                    # Root-level npm scripts
├── .env.example                    # Environment template
├── README.md                       # This file
├── loop.sh                         # Main execution engine
│
├── scripts/
│   ├── setup.sh                    # Automated setup
│   └── check-deps.js               # Dependency verification
│
├── templates/
│   ├── AGENTS.md.template          # Project config template
│   ├── CLAUDE.md.template          # AI instructions template
│   ├── IMPLEMENTATION_PLAN.md.template
│   └── AUDIENCE_JTBD.md.template
│
├── PROMPT_build.md                 # Build mode instructions
├── PROMPT_plan.md                  # Standard planning
├── PROMPT_plan_slc.md              # SLC planning
├── PROMPT_plan_work.md             # Branch-scoped planning
├── PROMPT_review.md                # Code review instructions
│
├── dashboard/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx                 # Main application
│   │   ├── components/
│   │   │   ├── Dashboard.tsx       # Main dashboard
│   │   │   ├── LoopControls.tsx    # Loop control panel
│   │   │   ├── LoopStatus.tsx      # Status display
│   │   │   ├── TaskList.tsx        # Task tracking
│   │   │   ├── LogViewer.tsx       # Log display
│   │   │   ├── CostMeter.tsx       # Cost display
│   │   │   ├── TelemetryPanel.tsx  # Telemetry view
│   │   │   ├── HealthIndicator.tsx # Status indicator
│   │   │   └── setup/
│   │   │       ├── UnifiedSetupWizard.tsx
│   │   │       ├── ProjectPathInfo.tsx
│   │   │       └── ProjectInitializer.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useLoop.ts
│   │   │   └── useSetupWizard.ts
│   │   └── types/
│   │       └── index.ts            # TypeScript definitions
│   └── server/
│       ├── index.ts                # Express + WebSocket server
│       ├── loopController.ts       # Loop execution
│       ├── costTracker.ts          # Cost accounting
│       ├── telemetryTracker.ts     # Telemetry collection
│       ├── templateManager.ts      # Template handling
│       └── projectDetector.ts      # Mode detection
│
└── .claude/
    └── plugins/ralph-wiggum/       # Claude Code plugin
```

---

## Contributing

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-repo/ralph-wiggum.git
cd ralph-wiggum

# Install dependencies
npm run setup

# Start in development mode
npm run dev
```

### Running Tests

```bash
# TypeScript validation
cd dashboard && npx tsc --noEmit

# Lint check
cd dashboard && npm run lint

# Build check
npm run build
```

### Code Style

- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Styling**: Tailwind CSS utility classes
- **Commits**: Conventional commits (`feat:`, `fix:`, `refactor:`)

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run all validation commands
4. Submit a pull request with clear description
5. Address any review feedback

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Built with [Claude AI](https://claude.ai) by Anthropic
- Dashboard powered by [React](https://react.dev) and [Vite](https://vitejs.dev)
- UI components from [Radix UI](https://www.radix-ui.com)

---

*Ralph Wiggum V3 - Because "Me fail software development? That's unpossible!"*
