# Architecture Overview

R.A.L.P.H. follows a modular architecture designed for extensibility and reliability.

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard (React)                       │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌─────────────────┐  │
│  │ Loop    │ │ Task     │ │ Generate│ │ Setup           │  │
│  │ Controls│ │ List     │ │ (Plans) │ │ (Config)        │  │
│  └─────────┘ └──────────┘ └─────────┘ └─────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ WebSocket
┌─────────────────────────┴───────────────────────────────────┐
│                    Backend Server (Node.js)                  │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│  │ WebSocket   │ │ Loop Manager │ │ File Watcher         │  │
│  │ Handler     │ │              │ │                      │  │
│  └─────────────┘ └──────────────┘ └──────────────────────┘  │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│  │ Plan        │ │ PRD          │ │ Review               │  │
│  │ Generator   │ │ Generator    │ │ Generator            │  │
│  └─────────────┘ └──────────────┘ └──────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ Process Spawn
┌─────────────────────────┴───────────────────────────────────┐
│                      loop.sh (Bash)                          │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│  │ Mode        │ │ Health       │ │ Claude CLI           │  │
│  │ Selection   │ │ Checks       │ │ Invocation           │  │
│  └─────────────┘ └──────────────┘ └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
RalphWiggum/
├── dashboard/              # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # React hooks (useWebSocket)
│   │   └── types/         # TypeScript definitions
│   └── server/            # Backend server
│       ├── index.ts       # WebSocket server
│       ├── fileWatcher.ts # File monitoring
│       ├── planGenerator.ts
│       ├── prdGenerator.ts
│       └── reviewGenerator.ts
├── docs/                   # VitePress documentation
├── loop.sh                 # Main loop script
├── PROMPT_*.md            # Claude prompts for each mode
├── AGENTS.md              # Project-specific config
├── IMPLEMENTATION_PLAN.md # Task list
└── CLAUDE.md              # Claude instructions
```

## Data Flow

### Loop Execution

1. User starts loop via Dashboard or CLI
2. Backend spawns `loop.sh` process
3. `loop.sh` invokes Claude CLI with appropriate prompt
4. Claude reads AGENTS.md, IMPLEMENTATION_PLAN.md
5. Claude implements tasks, commits changes
6. File watcher detects changes, updates Dashboard
7. Loop continues until completion or max iterations

### WebSocket Communication

```
Client                    Server
   │                         │
   │─── loop:start ─────────>│
   │                         │ spawn process
   │<── loop:status ─────────│
   │<── task:update ─────────│
   │<── log:entry ───────────│
   │                         │
   │─── loop:stop ──────────>│
   │                         │ kill process
   │<── loop:status ─────────│
```

## Key Modules

### Loop Manager

Manages loop process lifecycle:
- Spawn/kill processes
- Track iterations
- Monitor health
- Detect stuck loops

### File Watcher

Monitors project files:
- IMPLEMENTATION_PLAN.md for task status
- AGENTS.md for configuration
- Git status for commits

### Plan Generator

Generates implementation plans:
- Scans project structure
- Analyzes PRD documents
- Creates prioritized task list

### Review Generator

Creates code reviews:
- Quick scan (TODOs/FIXMEs)
- Full review mode
- Spec verification

## State Management

### Frontend (React)

- `useWebSocket` hook manages all server communication
- Local state for UI concerns
- Server is source of truth for loop state

### Backend (Node.js)

- In-memory state for active loops
- File system for persistent config
- No database required

## Security Model

- No external network access by default
- Sandboxed Claude execution
- User approval for destructive operations
- Git safety protocols enforced
