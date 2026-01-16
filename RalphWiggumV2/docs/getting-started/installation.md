# Installation

This guide covers how to install and set up Corporal WIGGUM on your system.

## Prerequisites

Before installing WIGGUM, ensure you have:

- **Node.js** v20 or later
- **npm** v10 or later
- **Git** for version control
- **Claude Code CLI** (for AI interactions)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/ralph-wiggum.git
cd ralph-wiggum
```

### 2. Install Dashboard Dependencies

```bash
cd RalphWiggumV2/dashboard
npm install
```

### 3. Configure Environment (Optional)

Create a `.env` file for custom configuration:

```bash
# Server port
PORT=3001

# Sentry DSN for error tracking (optional)
SENTRY_DSN=your-sentry-dsn

# Log level
LOG_LEVEL=info
```

### 4. Start the Dashboard

```bash
npm run dev
```

This starts both the frontend (Vite) and backend (Express) servers:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:3001](http://localhost:3001)

## Verifying Installation

Open [http://localhost:5173](http://localhost:5173) in your browser. You should see:

1. The WIGGUM dashboard with connection status
2. Loop controls (Start/Stop buttons)
3. Configuration panels

If the connection shows "Disconnected", check:

- The backend server is running on port 3001
- No firewall is blocking WebSocket connections
- The console for any error messages

## Project Setup

For each project you want to use with WIGGUM:

### 1. Initialize Ralph Files

The dashboard can auto-create required files, or create them manually:

```bash
# In your project directory
touch AGENTS.md CLAUDE.md IMPLEMENTATION_PLAN.md
```

### 2. Configure AGENTS.md

Add project-specific commands:

```markdown
# Project Agents Configuration

## Build Commands
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`
- Type Check: `npx tsc --noEmit`

## Codebase Patterns
- Components in `src/components/`
- Tests co-located with source files
```

### 3. Configure CLAUDE.md

Set up AI instructions (or use the dashboard wizard):

```markdown
# Claude Instructions

## Project Overview
Brief description of your project...

## Code Standards
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
```

## Next Steps

- [Quick Start Guide](/getting-started/quickstart) - Run your first loop
- [Dashboard Overview](/user-guide/dashboard-overview) - Learn the interface
- [Loop Modes](/user-guide/loop-modes) - Understand different modes
