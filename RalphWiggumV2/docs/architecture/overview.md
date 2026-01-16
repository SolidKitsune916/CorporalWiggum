# Architecture Overview

This document describes the high-level architecture of Corporal WIGGUM.

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     WIGGUM Dashboard                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │   Backend    │  │   Database   │      │
│  │   (React)    │◄─┤  (Express)   │◄─┤  (SQLite)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ▲                 │                                  │
│         │                 ▼                                  │
│         │          ┌──────────────┐                         │
│         └──────────┤  WebSocket   │                         │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │     Target Project       │
              │  ┌────────────────────┐  │
              │  │   AGENTS.md        │  │
              │  │   CLAUDE.md        │  │
              │  │   IMPLEMENTATION_  │  │
              │  │   PLAN.md          │  │
              │  └────────────────────┘  │
              └──────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │     Claude Code CLI      │
              │    (AI Execution)        │
              └──────────────────────────┘
```

## Frontend (React)

### Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Vite** - Build tool

### Key Components

| Component | Purpose |
|-----------|---------|
| `Dashboard` | Main application layout |
| `LoopControls` | Start/stop loop interface |
| `LogViewer` | Real-time log streaming |
| `TaskList` | Task status display |
| `GitHistory` | Version control info |
| `SetupWizard` | Configuration UI |

### State Management

- React hooks for local state
- WebSocket for real-time updates
- No external state library needed

## Backend (Express)

### Technology Stack

- **Express 5** - HTTP framework
- **WebSocket** - Real-time communication
- **better-sqlite3** - Database
- **TypeScript** - Type safety

### Services

| Service | Purpose |
|---------|---------|
| `LoopController` | Manages loop execution |
| `FileWatcher` | Monitors file changes |
| `ProjectConfig` | Handles configuration |
| `PlanGenerator` | Creates implementation plans |
| `ReviewRunner` | Executes code reviews |

### API Endpoints

#### REST

```
GET  /api/status       - Current system status
GET  /api/project-info - Project information
GET  /api/config/:file - Read config file
POST /api/config/:file - Write config file
POST /api/loop/start   - Start loop
POST /api/loop/stop    - Stop loop
```

#### WebSocket

See [WebSocket API](/api/websocket-api) for full documentation.

## Database (SQLite)

### Tables

| Table | Purpose |
|-------|---------|
| `projects` | Registered projects |
| `sessions` | Loop execution sessions |
| `execution_history` | Past executions |
| `preferences` | User settings |

### Schema

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  pid INTEGER,
  status TEXT,
  started_at TEXT,
  ended_at TEXT,
  iterations INTEGER DEFAULT 0
);

CREATE TABLE execution_history (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  iteration INTEGER,
  task TEXT,
  status TEXT,
  output TEXT,
  created_at TEXT
);
```

## Loop Execution Flow

### Build Mode

```
1. Read IMPLEMENTATION_PLAN.md
2. Find first incomplete task
3. Spawn Claude Code process
4. Stream output to dashboard
5. Monitor for completion
6. Run validation commands
7. Commit if successful
8. Update plan
9. Repeat or stop
```

### Plan Mode

```
1. Scan project structure
2. Read PRD and specs
3. Analyze existing code
4. Generate task breakdown
5. Write IMPLEMENTATION_PLAN.md
6. Complete
```

## File Watching

The `FileWatcher` service monitors:

- `IMPLEMENTATION_PLAN.md` - Task updates
- `PRD.md` - Requirement changes
- `.git` - Commit activity
- `*.log` - Loop output files

Changes trigger WebSocket broadcasts to update the UI.

## Session Management

### Persistence

Sessions are persisted to SQLite for:

- Browser refresh recovery
- Crash recovery
- Historical tracking

### Health Monitoring

The `HealthMonitor` service:

- Tracks process heartbeats
- Detects crashed sessions
- Cleans up stale data

## Integrations

### External Services

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Slack     │     │   Discord   │     │   Webhooks  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │   NotificationService    │
              └──────────────────────────┘
```

### GitHub Integration

```
┌─────────────────────────────────────┐
│           GitHubService             │
│  ┌─────────────────────────────┐   │
│  │       gh CLI wrapper        │   │
│  └─────────────────────────────┘   │
│         │            │              │
│         ▼            ▼              │
│    ┌─────────┐  ┌─────────┐       │
│    │  PRs    │  │ Issues  │       │
│    └─────────┘  └─────────┘       │
└─────────────────────────────────────┘
```

## Security Considerations

### Input Validation

- Path traversal prevention
- File size limits
- Content sanitization

### Process Isolation

- Spawned processes run in project directory
- No elevated privileges
- Controlled environment variables

### Authentication

- No built-in auth (local tool)
- Relies on system permissions
- Optional Sentry for error tracking

## Performance

### Optimizations

- SQLite with WAL mode
- WebSocket binary compression
- Lazy loading of components
- Virtual scrolling for logs

### Scalability

- Single-tenant design
- Multiple projects via launcher
- Separate dashboard instances

## Development

### Local Setup

```bash
cd RalphWiggumV2/dashboard
npm install
npm run dev
```

### Testing

```bash
npm test          # Unit tests
npm run test:e2e  # E2E tests
```

### Building

```bash
npm run build     # Production build
npm run preview   # Preview build
```

## Next Steps

- [Troubleshooting](/troubleshooting/common-issues) - Common issues
- [WebSocket API](/api/websocket-api) - Integration guide
