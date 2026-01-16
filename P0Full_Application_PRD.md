# Ralph Wiggum V2 - Full Application PRD

## Product Overview

**Ralph Wiggum V2** is an autonomous AI development system that combines iterative AI-powered code generation with real-time monitoring, quality gates, and multi-project management. The system enables developers to accelerate software development by leveraging Claude AI to autonomously plan, implement, and validate code changes through test-driven development (TDD) workflows.

### Vision Statement

Reduce software development costs and accelerate delivery by enabling AI to autonomously execute development tasks while maintaining code quality through programmatic validation and LLM-based quality gates.

### Target Users

- Software developers seeking to accelerate development workflows
- Development teams managing multiple projects simultaneously
- Engineers who want AI assistance with TDD-based development
- Technical leads requiring autonomous build systems with quality oversight

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Ralph Wiggum V2 System                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │   loop.sh    │    │  Dashboard   │    │  Configuration   │   │
│  │ (Execution   │◄──►│   (React +   │◄──►│     Files        │   │
│  │   Engine)    │    │   Express)   │    │  (AGENTS.md,     │   │
│  └──────┬───────┘    └──────┬───────┘    │   CLAUDE.md)     │   │
│         │                   │            └──────────────────┘   │
│         ▼                   ▼                                    │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │  Claude CLI  │    │  WebSocket   │                           │
│  │  (AI Engine) │    │   Server     │                           │
│  └──────────────┘    └──────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
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
- Dual-mode operation: Launcher mode and Dashboard mode
- Multi-instance support for concurrent projects

---

## Core Features

### 1. Autonomous Build Loop

**Description**: Iteratively executes development tasks using Claude AI with automatic validation and git commits.

**Execution Flow**:
1. Load project configuration from `AGENTS.md`
2. Read task list from `IMPLEMENTATION_PLAN.md`
3. Identify highest-priority incomplete task
4. Execute Claude session with task context
5. Run validation suite (tests, typecheck, lint)
6. Commit changes on successful validation
7. Update implementation plan
8. Loop until completion or interruption

**Completion Detection**:
- `ALL_TASKS_COMPLETE` signal in Claude output
- Maximum iteration limit reached
- User interruption (Ctrl+C)

**Acceptance Criteria**:
- [ ] Loop executes tasks in priority order
- [ ] Validation failures trigger plan updates with error context
- [ ] Successful validations result in automatic git commits
- [ ] Loop terminates gracefully on completion signal

### 2. Planning Modes

**2.1 Standard Plan Mode**
- Analyzes specifications and existing codebase
- Performs gap analysis between current state and requirements
- Derives test requirements from acceptance criteria
- Generates `IMPLEMENTATION_PLAN.md` with prioritized tasks

**2.2 Plan-SLC Mode (Simple, Lovable, Complete)**
- Requires `AUDIENCE_JTBD.md` and `PRD.md` context
- Sequences activities into user journey map
- Recommends minimal viable release slice
- Scopes tasks to SLC release criteria

**2.3 Plan-Work Mode (Branch-Scoped)**
- Creates focused implementation plan for feature branches
- Conservative task scoping (excludes uncertain items)
- Validates execution on non-main branches only

**Acceptance Criteria**:
- [ ] Plan mode generates structured IMPLEMENTATION_PLAN.md
- [ ] Plan-SLC mode reads and incorporates AUDIENCE_JTBD.md context
- [ ] Plan-work mode rejects execution on main/master branches
- [ ] All modes produce checkbox-formatted task lists

### 3. Code Review Mode

**Description**: Analyzes codebase against documentation to verify completeness and identify technical debt.

**Capabilities**:
- Verification phase: Checks claimed features against implementation
- Discovery phase: Identifies undocumented functionality
- Health score calculation (completed tasks / total tasks)
- Technical debt detection
- Missing test coverage identification
- Recommendations generation

**Acceptance Criteria**:
- [ ] Review identifies incomplete tasks marked as done
- [ ] Health score accurately reflects codebase state
- [ ] Recommendations are actionable and specific
- [ ] Review detects discrepancies between docs and code

### 4. Real-Time Dashboard

**4.1 Dashboard Tab**
- Loop execution status (running/stopped, mode, iteration count)
- Task list with completion tracking and progress indicators
- Git history displaying recent commits
- Real-time log viewer with streaming output
- Context meter showing iteration progress

**4.2 Generate Tab**
- Plan generator with mode selection (standard, SLC, work)
- PRD generator with form-based inputs
- Live output preview during generation
- Context file selection UI

**4.3 Logs Tab**
- Full execution log history
- Real-time streaming updates
- Search and filter capabilities

**4.4 Setup Tab**
- Project configuration scanner
- AGENTS.md visual editor
- CLAUDE.md management interface
- Specialist agents installation
- Dependency checker with status indicators
- Cursor rules configuration

**Acceptance Criteria**:
- [ ] Dashboard displays real-time loop status
- [ ] Task list parses multiple formats (checkbox, numbered, user story)
- [ ] Log viewer streams output without page refresh
- [ ] Setup wizard validates required dependencies

### 5. Multi-Project Launcher

**Description**: Central hub for managing multiple Ralph-enabled projects with instance spawning.

**Capabilities**:
- Project registry with metadata tracking
- Auto-discovery of Ralph-ready projects
- Separate dashboard instance per project
- Dynamic port allocation
- Instance lifecycle management (start/stop/crash recovery)

**Project Detection**:
- Git repository detection
- Ralph-ready indicators (AGENTS.md or CLAUDE.md present)
- Technology stack scanning

**Acceptance Criteria**:
- [ ] Launcher discovers projects in specified directories
- [ ] Each project spawns on unique port
- [ ] Instance crashes are detected and reported
- [ ] Projects can be started/stopped independently

### 6. File Browser

**Description**: Directory navigation component for project selection in launcher mode.

**Capabilities**:
- Breadcrumb navigation with clickable path segments
- Windows drive letter support (C:, D:, etc.)
- Git repository visual highlighting
- Ralph-ready project detection
- Directory-only filtering
- Smart sorting (Ralph-ready → git repos → alphabetical)

**Acceptance Criteria**:
- [ ] Browser navigates filesystem directories
- [ ] Git repositories display visual indicator
- [ ] Ralph-ready projects highlighted distinctly
- [ ] Sorting prioritizes relevant projects

### 7. LLM-as-Judge Review System

**Description**: Uses Claude AI to evaluate subjective quality criteria that resist programmatic validation.

**Use Cases**:
- Creative quality assessment (tone, narrative flow)
- Aesthetic judgments (visual harmony, design consistency)
- UX quality evaluation (intuitive navigation, user flow)
- Content appropriateness (context-aware messaging)

**Implementation**:
- Criteria-based review templates in PROMPT_build.md
- Support for text and image artifacts
- Vision capability for visual evaluations
- Haiku model for fast, cost-effective reviews

**Acceptance Criteria**:
- [ ] Review criteria defined in prompt templates
- [ ] Image artifacts processed via vision capability
- [ ] Review results include pass/fail and reasoning
- [ ] Reviews execute within acceptable latency (<10s)

### 8. Specialist Agents

**Description**: Domain-specific AI agents with specialized knowledge and coding standards.

**Available Agents**:
| Agent | Specialty |
|-------|-----------|
| React TypeScript Expert | Components, hooks, state management, type safety |
| Accessibility Expert | WCAG 2.2, ARIA patterns, keyboard navigation |
| QoL UX Expert | Loading states, forms, animations, micro-interactions |
| Golang Backend Expert | Go idioms, API design, concurrency patterns |

**Installation Scopes**:
- Global: Available to all projects
- Project-scoped: Available to specific project only

**Acceptance Criteria**:
- [ ] Agents installed to `.claude/agents/` directory
- [ ] CLAUDE.md updated with agent delegation instructions
- [ ] Agents apply domain-specific coding standards
- [ ] Installation supports both global and project scope

### 9. Health Monitoring

**Description**: Non-blocking system for detecting execution issues and preventing infinite loops.

**Monitoring Functions**:
- Agent config validation (AGENTS.md has real commands)
- Iteration health parsing (error detection in logs)
- Stuck loop detection (consecutive failure tracking)
- Health metrics logging to ralph-health.log

**Thresholds**:
- Warning: 3 consecutive stuck iterations
- User prompt: 5 consecutive failures

**Acceptance Criteria**:
- [ ] Invalid AGENTS.md triggers validation warning
- [ ] Stuck loop detected after 3 iterations
- [ ] User prompted at 5 consecutive failures
- [ ] Health metrics logged for analysis

---

## Configuration Files

### AGENTS.md (Project Configuration)

**Purpose**: Define project-specific commands and operational context.

**Required Sections**:
```markdown
## Build Commands
- Build: `npm run build`
- Dev: `npm run dev`
- Test: `npm test`

## Validation Commands
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`

## Operational Notes
[Project-specific patterns and guidelines]
```

### CLAUDE.md (AI Instructions)

**Purpose**: Define AI execution behavior and workflow phases.

**Key Sections**:
- Phase-based workflow (Orient → Load Rules → Execute)
- Rule file loading strategy
- Commit conventions
- Specialist agent delegation
- Completion signal detection

### IMPLEMENTATION_PLAN.md (Task Tracking)

**Purpose**: Track task status and priority ordering.

**Supported Formats**:
- Checkbox: `- [ ] Task description`
- User Story: `US-001: Description [incomplete]`
- Numbered: `1. Task description`

### Prompt Templates

| File | Purpose |
|------|---------|
| PROMPT_build.md | Build mode execution instructions |
| PROMPT_plan.md | Standard planning workflow |
| PROMPT_plan_slc.md | SLC-oriented planning |
| PROMPT_plan_work.md | Branch-scoped planning |
| PROMPT_prd.md | PRD generation workflow |
| PROMPT_review.md | Code review instructions |
| PROMPT_analyze.md | Codebase analysis |

---

## Technical Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| Vite | 7.2.4 | Build tooling |
| Radix UI | Various | UI primitives |
| Tailwind CSS | 3.4.19 | Styling |
| Lucide React | 0.562.0 | Icons |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Express.js | 5.2.1 | HTTP server |
| ws | 8.19.0 | WebSocket server |
| tsx | 4.21.0 | TypeScript execution |
| chokidar | 5.0.0 | File watching |
| simple-git | 3.30.0 | Git operations |

### External Dependencies
| Dependency | Required | Purpose |
|------------|----------|---------|
| Claude CLI | Yes | AI execution |
| Node.js 18+ | Dashboard only | Runtime |
| Git | Recommended | Version control |

---

## Data Flow

### Build Loop Data Flow

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
                           ▼
                    ┌──────────────┐
                    │  Git Commit  │
                    └──────────────┘
```

### Dashboard WebSocket Flow

```
┌──────────────┐    WebSocket     ┌──────────────┐
│    React     │◄────────────────►│   Express    │
│   Frontend   │  (bidirectional) │   Backend    │
└──────────────┘                  └──────┬───────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              ▼                          ▼                          ▼
       ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
       │ File Watcher │          │    Loop      │          │   Config     │
       │  (chokidar)  │          │  Controller  │          │   Manager    │
       └──────────────┘          └──────────────┘          └──────────────┘
```

### WebSocket Message Types

| Domain | Actions |
|--------|---------|
| loop | start, stop, status |
| config | read, update, validate |
| plan | generate, status |
| prd | generate, status |
| review | run, results |
| project | scan, register, discover |
| instance | spawn, stop, status |

---

## Storage

### Git-Tracked Files
- `IMPLEMENTATION_PLAN.md` - Task list (updated per iteration)
- Source code changes (committed per successful task)
- Configuration files (AGENTS.md, CLAUDE.md)

### Non-Git-Tracked Files
- `ralph.log` - Execution log
- `ralph-health.log` - Health metrics
- `PROJECT_REGISTRY.json` - Launcher project list

### In-Memory State
- WebSocket client connections
- Loop process PIDs
- Generation job status
- File watcher subscriptions

---

## Environment Requirements

### Required
- Claude CLI with valid authentication (`~/.claude.json`)
- Bash shell (loop.sh execution)

### Optional
- Node.js 18+ (dashboard functionality)
- Git (version control integration)
- Project-specific build tools (npm, yarn, etc.)

### Environment Variables
| Variable | Purpose | Default |
|----------|---------|---------|
| RALPH_DIR | Ralph template directory | Script directory |
| PROJECT_PATH | Override project root | Auto-detected |
| CLAUDE_MODEL_FLAG | Enable --model flag | Auto-detected |

---

## Quality Gates

### Programmatic Validation
1. **Test Suite**: Project test command from AGENTS.md
2. **Type Checking**: TypeScript/type validation command
3. **Linting**: Code style and quality checks

### LLM-Based Validation
1. **Subjective Quality**: Creative, aesthetic, UX assessments
2. **Code Review**: Documentation vs implementation verification
3. **Completeness Check**: Feature claim validation

### Health Checks
1. **Config Validation**: AGENTS.md contains real commands
2. **Iteration Health**: Error pattern detection in logs
3. **Stuck Detection**: Consecutive failure monitoring

---

## Security Considerations

### File System Access
- Dashboard operates within project directory scope
- File browser restricted to directory navigation
- No arbitrary command execution from UI

### Claude CLI Integration
- Uses authenticated Claude CLI sessions
- No API keys stored in application
- Fresh session per iteration (no persistent context)

### Git Operations
- Automatic commits after validation only
- No force push operations
- Branch validation for sensitive operations

---

## Performance Characteristics

### Context Efficiency
- One task per iteration maintains "smart zone" (40-60% context utilization)
- Fresh Claude sessions prevent context degradation
- Disposable plans enable regeneration over repair

### Dashboard Performance
- WebSocket for real-time updates (no polling)
- File watcher for efficient change detection
- Haiku model for fast review operations

### Multi-Instance Support
- Dynamic port allocation prevents conflicts
- Independent process per project
- Instance isolation prevents cross-project interference

---

## File Structure

```
RalphWiggumV2/
├── loop.sh                     # Main execution engine
├── CLAUDE.md                   # AI instructions
├── AGENTS.md                   # Project configuration
├── IMPLEMENTATION_PLAN.md      # Task tracking
├── PROMPT_*.md                 # Execution templates (7 files)
├── PRD.md                      # Product requirements
├── AUDIENCE_JTBD.md            # Target audience definition
├── specs/                      # Feature specifications
├── src/lib/                    # LLM review library
├── tools/                      # Utility scripts
├── dashboard/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── types/              # TypeScript definitions
│   │   └── App.tsx             # Main application
│   └── server/
│       ├── index.ts            # Express + WebSocket server
│       ├── loopController.ts   # Loop execution
│       ├── planGenerator.ts    # Plan generation
│       ├── reviewRunner.ts     # LLM reviews
│       └── [other services]    # Supporting modules
└── .claude/
    ├── agents/                 # Specialist agent definitions
    └── plugins/ralph-wiggum/   # Claude Code plugin
```

---

## Success Metrics

### Efficiency Metrics
- Tasks completed per session
- Average iterations per task
- Validation pass rate

### Quality Metrics
- Health score (completed/total tasks)
- Stuck loop frequency
- Review pass rate

### User Experience Metrics
- Dashboard response latency
- WebSocket connection stability
- Multi-instance reliability

---

## Future Considerations

### Potential Enhancements
- Additional specialist agents for other domains
- Enhanced visualization of task dependencies
- Integration with CI/CD pipelines
- Cloud-hosted launcher mode
- Team collaboration features

### Scalability Paths
- Distributed execution across multiple machines
- Persistent context management
- Custom model selection per task type
- Plugin architecture for external integrations

---

## Appendix: Completion Status

### Implementation Progress: 94/94 Tasks (100%)

**Completed Feature Sets**:
1. Core dashboard fixes and parsers
2. Cross-platform CLI support
3. File writing safety guidelines
4. Specialist agents system
5. Dependency checker
6. Configuration handlers
7. Existing docs viewer
8. CLAUDE.md management
9. Project launcher
10. Loop health monitoring
11. Instance spawning
12. File browser
13. LLM-as-Judge review system
14. Code review mode

**Version History**:
- v0.0.1 through v0.0.8
- Current: All features implemented and tested
