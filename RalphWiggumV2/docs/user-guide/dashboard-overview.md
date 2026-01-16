# Dashboard Overview

The WIGGUM dashboard provides a real-time interface for controlling loops, monitoring progress, and managing project configuration.

## Main Interface

The dashboard is organized into tabs:

- **Dashboard** - Loop controls and status
- **Setup** - Project configuration
- **Generate** - Plan and PRD generation
- **Logs** - Execution history

## Dashboard Tab

### Loop Controls

The main control panel for starting and stopping loops:

| Control | Description |
|---------|-------------|
| **Mode** | Select Build, Plan, Plan SLC, or Plan Work |
| **Max Iterations** | Limit the number of loop cycles |
| **Work Scope** | Description for Plan Work mode |
| **Start/Stop** | Begin or halt loop execution |

### Loop Status

Real-time display showing:

- **Status** - Idle, Running, or Stopped
- **Iteration** - Current iteration number
- **Task** - Currently executing task
- **Duration** - Time elapsed since start

### Task List

Shows tasks from `IMPLEMENTATION_PLAN.md`:

- **Pending** - Not yet started
- **In Progress** - Currently being implemented
- **Completed** - Successfully finished

### Git Status

Displays version control information:

- Current branch
- Modified files
- Recent commits
- Repository link

### Log Viewer

Real-time stream of loop activity:

- Task execution
- Validation results
- Commit messages
- Errors and warnings

## Setup Tab

### Dependency Checker

Verifies required tools are installed:

- Node.js version
- npm version
- Git availability
- Claude Code CLI

### AGENTS.md Configuration

Edit project-specific build commands:

```markdown
## Validation Commands
- Test: `npm test`
- Lint: `npm run lint`
- Build: `npm run build`
```

### CLAUDE.md Configuration

Set AI instructions for the project:

```markdown
## Code Standards
- Use TypeScript
- Follow ESLint rules
- Write tests for new code
```

### Specialist Agents

Enable/disable specialist agents:

- React/TypeScript Expert
- Accessibility Expert
- UX/QoL Expert
- Go Backend Expert

## Generate Tab

### Plan Generator

Create implementation plans from:

- PRD.md
- Spec files
- Existing code analysis
- User descriptions

### PRD Generator

Generate product requirements documents from:

- Feature descriptions
- User stories
- Technical constraints

### Review Generator

Analyze code against documentation:

- PRD alignment
- Spec compliance
- Quality metrics

## Keyboard Navigation

The dashboard supports full keyboard navigation:

| Key | Action |
|-----|--------|
| `Tab` | Move between elements |
| `Enter` | Activate buttons/links |
| `Escape` | Close dialogs |
| `Arrow keys` | Navigate within components |

## Accessibility Features

- Skip-to-content link
- ARIA live regions for status updates
- High contrast color scheme
- Screen reader compatible
- Reduced motion support

## Next Steps

- [Loop Modes](/user-guide/loop-modes) - Learn about different modes
- [Safety Controls](/user-guide/safety-controls) - Configure limits
- [WebSocket API](/api/websocket-api) - Build custom integrations
