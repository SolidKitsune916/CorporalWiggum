# **Ralph Wiggum V3**

## **Autonomous AI Development Loop System**

## **Product Requirements Document**

---

| Field | Value |
| ----- | ----- |
| **Version** | 3.0 |
| **Status** | Final |

---

## **Table of Contents**

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Data Models & Interfaces](#3-data-models--interfaces)
4. [Core Features](#4-core-features)
5. [Local Application Setup](#5-local-application-setup)
6. [Safety & Cost Control](#6-safety--cost-control)
7. [Resilience & Recovery](#7-resilience--recovery)
8. [Observability & Telemetry](#8-observability--telemetry)
9. [User Interface Specifications](#9-user-interface-specifications)
10. [API & WebSocket Specifications](#10-api--websocket-specifications)
11. [Integration Requirements](#11-integration-requirements)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [File Structure](#13-file-structure)
14. [Glossary](#14-glossary)

---

## **1. Project Overview**

### **1.1 Purpose**

Ralph Wiggum V3 is an autonomous AI development system that combines iterative AI-powered code generation with real-time monitoring, quality gates, and multi-project management. The system enables developers to accelerate software development by leveraging Claude AI to autonomously plan, implement, and validate code changes through test-driven development (TDD) workflows.

### **1.2 Vision Statement**

Reduce software development costs and accelerate delivery by enabling AI to autonomously execute development tasks while maintaining code quality through programmatic validation and LLM-based quality gates.

### **1.3 Target Users**

- Software developers seeking to accelerate development workflows
- Development teams managing multiple projects simultaneously
- Engineers who want AI assistance with TDD-based development
- Technical leads requiring autonomous build systems with quality oversight

### **1.4 Key Features Summary**

| Feature | Description | Priority |
| ------- | ----------- | -------- |
| Autonomous Build Loop | Iterative AI-powered code generation with validation | P0 |
| Planning Modes | Standard, SLC, and branch-scoped planning | P0 |
| Real-Time Dashboard | React + Express monitoring interface | P0 |
| Multi-Project Launcher | Central hub for managing multiple projects | P0 |
| Code Review Mode | LLM-based codebase analysis | P0 |
| Local Application Setup | Unified entry point and setup automation | P1 |
| Cost Tracking & Limits | Token/cost accounting with configurable limits | P1 |
| Runtime Limits | Configurable maximum execution time | P1 |
| Loop Detection | Fuzzy string matching for stuck-loop detection | P1 |
| Exponential Backoff | Automatic retry with increasing delays | P2 |
| State Rollback | Git reset on repeated failures | P2 |
| Per-Iteration Telemetry | Structured telemetry and metrics | P2 |
| Dry Run Mode | Preview mode without execution | P3 |
| YAML Configuration | Unified configuration file | P3 |

---

## **2. System Architecture**

### **2.1 High-Level Architecture**

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

### **2.2 Two-Tier Architecture**

#### **Tier 1 - Execution Loop (loop.sh)**

| Component | Description |
| --------- | ----------- |
| Orchestrator | Bash script orchestrating Claude CLI sessions |
| Execution Modes | build, plan, plan-slc, plan-work, review |
| Session Management | Fresh Claude session per iteration for context efficiency |
| Health Monitoring | Stuck-loop detection and iteration health checks |
| Cost Tracking | Token/cost parsing from Claude CLI output |
| Safety Controls | Runtime limits, cost limits, backoff, rollback |

#### **Tier 2 - Dashboard (React + Express)**

| Component | Description |
| --------- | ----------- |
| Frontend | React 19 + TypeScript + Vite |
| Backend | Express.js + WebSocket server |
| Operation Modes | Launcher mode and Dashboard mode |
| Multi-Instance | Support for concurrent projects |
| Telemetry | Per-iteration metrics and cost display |

### **2.3 Technology Stack**

#### **Frontend**

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| Framework | React 19 | UI rendering |
| Language | TypeScript 5.0 | Type safety |
| Build Tool | Vite 5.0 | Build & bundling |
| Styling | Tailwind CSS | Styling |
| State | React hooks + Context | State management |

#### **Backend**

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| Runtime | Node.js 18+ | Server runtime |
| Framework | Express.js | HTTP server |
| Real-time | WebSocket (ws) | Bidirectional communication |
| File Watching | Chokidar | File system monitoring |
| Process Management | Child process | Loop execution |

#### **Execution Engine**

| Technology | Purpose |
| ---------- | ------- |
| Bash | loop.sh orchestrator |
| Claude CLI | AI execution engine |
| Git | Version control integration |
| jq/yq (optional) | JSON/YAML parsing |

### **2.4 Execution Flow**

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

### **2.5 Dashboard WebSocket Flow**

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
       │ File Watcher │          │    Loop      │          │    Cost      │
       │  (chokidar)  │          │  Controller  │          │   Tracker    │
       └──────────────┘          └──────────────┘          └──────────────┘
```

---

## **3. Data Models & Interfaces**

### **3.1 Loop Status**

```typescript
interface LoopStatus {
  running: boolean;
  mode: LoopMode;
  iteration: number;
  maxIterations: number;
  startedAt?: Date;
  elapsedTime?: number;
  maxRuntime?: number;
  
  // Cost tracking
  costSpent?: number;
  costLimit?: number;
  tokensUsed?: {
    input: number;
    output: number;
  };
  
  // Health
  consecutiveFailures: number;
  loopDetected: boolean;
  backoffSeconds?: number;
  
  // Completion
  completionSignal?: string;
  exitReason?: 'completed' | 'max_iterations' | 'cost_limit' | 'runtime_limit' | 'user_stopped' | 'error';
}

type LoopMode = 'build' | 'plan' | 'plan-slc' | 'plan-work' | 'review';
```

### **3.2 Cost Tracking**

```typescript
interface CostTracker {
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCost: number;
  costLimit: number;
  perIterationCosts: IterationCost[];
}

interface IterationCost {
  iteration: number;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  timestamp: Date;
}

// Pricing constants (Opus model)
const PRICING = {
  inputPerMillion: 3.0,   // $3 per 1M input tokens
  outputPerMillion: 15.0, // $15 per 1M output tokens
};
```

### **3.3 Telemetry**

```typescript
interface IterationTelemetry {
  iteration: number;
  startedAt: Date;
  duration: number;
  success: boolean;
  triggerReason: TriggerReason;
  tokensUsed?: {
    input: number;
    output: number;
  };
  cost?: number;
  toolsUsed?: string[];
  outputPreview?: string;
  errorMessage?: string;
  validationResults?: ValidationResult[];
}

type TriggerReason = 'INITIAL' | 'TASK_INCOMPLETE' | 'RECOVERY' | 'LOOP_DETECTED';

interface ValidationResult {
  type: 'test' | 'typecheck' | 'lint';
  passed: boolean;
  output?: string;
  duration?: number;
}
```

### **3.4 Project Configuration**

```typescript
interface ProjectConfig {
  name: string;
  path: string;
  mode: 'embedded' | 'standalone';
  detectionReason: string;
  
  // Ralph files status
  ralphFiles: {
    agentsMd: FileStatus;
    claudeMd: FileStatus;
    implementationPlan: FileStatus;
    audienceJtbd: FileStatus;
    prd: FileStatus;
  };
  
  // Dependencies
  dependencies: DependencyStatus[];
  
  // Git status
  git: {
    isRepo: boolean;
    branch?: string;
    hasUncommittedChanges?: boolean;
  };
}

interface FileStatus {
  exists: boolean;
  path: string;
  lastModified?: Date;
}

interface DependencyStatus {
  name: string;
  required: boolean;
  installed: boolean;
  version?: string;
  minVersion?: string;
  installInstructions?: string;
}
```

### **3.5 Loop Control Options**

```typescript
interface LoopStartOptions {
  mode: LoopMode;
  maxIterations?: number;
  maxRuntime?: number;      // seconds (default: 14400 = 4 hours)
  costLimit?: number;       // dollars (default: 50)
  completionPromise?: string; // default: 'ALL_TASKS_COMPLETE'
  loopDetectionThreshold?: number; // default: 0.9
  backoffEnabled?: boolean;  // default: true
  rollbackOnFailure?: boolean; // default: true
  dryRun?: boolean;          // default: false
}
```

### **3.6 YAML Configuration Schema**

```typescript
interface RalphConfig {
  maxIterations: number;      // default: 100
  maxRuntime: number;         // seconds, default: 14400
  costLimit: number;          // dollars, default: 50.0
  completionPromise: string;  // default: "ALL_TASKS_COMPLETE"
  loopDetectionThreshold: number; // default: 0.9
  backoffEnabled: boolean;    // default: true
  rollbackOnFailure: boolean; // default: true
}
```

### **3.7 WebSocket Messages**

```typescript
// Base message interface
interface WSMessage {
  type: string;
  payload?: any;
}

// Loop messages
interface LoopStartMessage extends WSMessage {
  type: 'loop:start';
  payload: LoopStartOptions;
}

interface LoopStatusMessage extends WSMessage {
  type: 'loop:status';
  payload: LoopStatus;
}

interface LoopOutputMessage extends WSMessage {
  type: 'loop:output';
  payload: {
    iteration: number;
    content: string;
    stream: 'stdout' | 'stderr';
  };
}

// Cost messages
interface CostUpdateMessage extends WSMessage {
  type: 'cost:update';
  payload: CostTracker;
}

// Telemetry messages
interface TelemetryUpdateMessage extends WSMessage {
  type: 'telemetry:update';
  payload: IterationTelemetry;
}

// Project messages
interface ProjectInfoMessage extends WSMessage {
  type: 'project:info';
  payload: ProjectConfig;
}

interface ProjectPathOverrideMessage extends WSMessage {
  type: 'project:path-override';
  payload: {
    newPath: string;
  };
}

interface ProjectInitMessage extends WSMessage {
  type: 'project:init';
  payload: {
    files: string[]; // files to create
  };
}
```

### **3.8 Task Model**

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  format: 'checkbox' | 'numbered' | 'user_story';
  acceptanceCriteria?: string[];
  dependencies?: string[];
}

interface ImplementationPlan {
  tasks: Task[];
  completedCount: number;
  totalCount: number;
  healthScore: number; // completedCount / totalCount
}
```

---

## **4. Core Features**

### **4.1 Autonomous Build Loop**

**Description**: Iteratively executes development tasks using Claude AI with automatic validation and git commits.

#### **Execution Flow**

1. Load project configuration from `AGENTS.md`
2. Read task list from `IMPLEMENTATION_PLAN.md`
3. Identify highest-priority incomplete task
4. Execute Claude session with task context
5. Run validation suite (tests, typecheck, lint)
6. Commit changes on successful validation
7. Update implementation plan
8. Track cost and telemetry
9. Loop until completion or limit reached

#### **Completion Detection**

- `ALL_TASKS_COMPLETE` signal in Claude output (configurable)
- Maximum iteration limit reached
- Cost limit exceeded
- Runtime limit exceeded
- User interruption (Ctrl+C)

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-BL-001 | Loop executes tasks in priority order | P0 | Tasks selected by priority field |
| FR-BL-002 | Validation failures trigger plan updates with error context | P0 | Error message included in next iteration |
| FR-BL-003 | Successful validations result in automatic git commits | P0 | Git log shows commit after each success |
| FR-BL-004 | Loop terminates gracefully on completion signal | P0 | Clean exit on ALL_TASKS_COMPLETE |
| FR-BL-005 | Cost tracked per iteration from Claude CLI output | P1 | Token counts parsed from stream-json |
| FR-BL-006 | Loop stops when cost limit exceeded | P1 | Exit with cost_limit reason |
| FR-BL-007 | Loop stops when runtime limit exceeded | P1 | Exit with runtime_limit reason |
| FR-BL-008 | Loop detection using fuzzy string matching | P1 | Similar outputs (>90%) trigger warning |

### **4.2 Planning Modes**

#### **4.2.1 Standard Plan Mode**

- Analyzes specifications and existing codebase
- Performs gap analysis between current state and requirements
- Derives test requirements from acceptance criteria
- Generates `IMPLEMENTATION_PLAN.md` with prioritized tasks

#### **4.2.2 Plan-SLC Mode (Simple, Lovable, Complete)**

- Requires `AUDIENCE_JTBD.md` and `PRD.md` context
- Sequences activities into user journey map
- Recommends minimal viable release slice
- Scopes tasks to SLC release criteria

#### **4.2.3 Plan-Work Mode (Branch-Scoped)**

- Creates focused implementation plan for feature branches
- Conservative task scoping (excludes uncertain items)
- Validates execution on non-main branches only

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-PL-001 | Plan mode generates structured IMPLEMENTATION_PLAN.md | P0 | Valid markdown with checkbox tasks |
| FR-PL-002 | Plan-SLC mode reads AUDIENCE_JTBD.md context | P0 | File content included in prompt |
| FR-PL-003 | Plan-work mode rejects execution on main/master branches | P0 | Error message if on protected branch |
| FR-PL-004 | All modes produce checkbox-formatted task lists | P0 | Tasks parseable as checkboxes |

### **4.3 Code Review Mode**

**Description**: Analyzes codebase against documentation to verify completeness and identify technical debt.

#### **Capabilities**

- Verification phase: Checks claimed features against implementation
- Discovery phase: Identifies undocumented functionality
- Health score calculation (completed tasks / total tasks)
- Technical debt detection
- Missing test coverage identification
- Recommendations generation

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-RV-001 | Review identifies incomplete tasks marked as done | P0 | Discrepancies listed in output |
| FR-RV-002 | Health score accurately reflects codebase state | P0 | Score = completed / total |
| FR-RV-003 | Recommendations are actionable and specific | P0 | Each recommendation has clear action |
| FR-RV-004 | Review detects discrepancies between docs and code | P0 | Missing implementations flagged |

### **4.4 Multi-Project Launcher**

**Description**: Central hub for managing multiple Ralph-enabled projects with instance spawning.

#### **Capabilities**

- Project registry with metadata tracking
- Auto-discovery of Ralph-ready projects
- Separate dashboard instance per project
- Dynamic port allocation
- Instance lifecycle management (start/stop/crash recovery)

#### **Project Detection**

- Git repository detection
- Ralph-ready indicators (AGENTS.md or CLAUDE.md present)
- Technology stack scanning

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-ML-001 | Launcher discovers projects in specified directories | P0 | Projects listed with metadata |
| FR-ML-002 | Each project spawns on unique port | P0 | No port conflicts |
| FR-ML-003 | Instance crashes are detected and reported | P0 | Crash notification in UI |
| FR-ML-004 | Projects can be started/stopped independently | P0 | Individual control per project |

### **4.5 File Browser**

**Description**: Directory navigation component for project selection in launcher mode.

#### **Capabilities**

- Breadcrumb navigation with clickable path segments
- Windows drive letter support (C:, D:, etc.)
- Git repository visual highlighting
- Ralph-ready project detection
- Directory-only filtering
- Smart sorting (Ralph-ready → git repos → alphabetical)

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-FB-001 | Browser navigates filesystem directories | P0 | Directories listed and navigable |
| FR-FB-002 | Git repositories display visual indicator | P0 | Git icon/badge shown |
| FR-FB-003 | Ralph-ready projects highlighted distinctly | P0 | Different styling for Ralph projects |
| FR-FB-004 | Sorting prioritizes relevant projects | P0 | Ralph-ready first in list |

### **4.6 LLM-as-Judge Review System**

**Description**: Uses Claude AI to evaluate subjective quality criteria that resist programmatic validation.

#### **Use Cases**

- Creative quality assessment (tone, narrative flow)
- Aesthetic judgments (visual harmony, design consistency)
- UX quality evaluation (intuitive navigation, user flow)
- Content appropriateness (context-aware messaging)

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-LJ-001 | Review criteria defined in prompt templates | P0 | Templates include criteria |
| FR-LJ-002 | Image artifacts processed via vision capability | P1 | Screenshots evaluated |
| FR-LJ-003 | Review results include pass/fail and reasoning | P0 | Structured output |
| FR-LJ-004 | Reviews execute within acceptable latency (<10s) | P1 | Haiku model used |

### **4.7 Specialist Agents**

**Description**: Domain-specific AI agents with specialized knowledge and coding standards.

#### **Available Agents**

| Agent | Specialty |
| ----- | --------- |
| React TypeScript Expert | Components, hooks, state management, type safety |
| Accessibility Expert | WCAG 2.2, ARIA patterns, keyboard navigation |
| QoL UX Expert | Loading states, forms, animations, micro-interactions |
| Golang Backend Expert | Go idioms, API design, concurrency patterns |

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-SA-001 | Specialist agents loadable from .claude/agents/ | P0 | Agents discoverable |
| FR-SA-002 | Agent selection available in dashboard | P0 | Dropdown/selector in UI |
| FR-SA-003 | Agent context included in Claude prompts | P0 | Agent instructions in prompt |

---

## **5. Local Application Setup**

### **5.1 Root-Level Orchestration**

**Description**: Unified entry point for the entire application from the root directory.

#### **Root package.json Scripts**

```json
{
  "name": "ralph-wiggum",
  "version": "3.0.0",
  "description": "Autonomous AI Development Loop Dashboard",
  "scripts": {
    "start": "node scripts/check-deps.js && npm run dev --prefix dashboard",
    "setup": "bash scripts/setup.sh",
    "dev": "npm run dev --prefix dashboard",
    "build": "npm run build --prefix dashboard",
    "check": "node scripts/check-deps.js"
  }
}
```

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-LO-001 | `npm start` from root starts entire application | P1 | Dashboard accessible at localhost |
| FR-LO-002 | `npm run setup` installs all dependencies | P1 | All node_modules populated |
| FR-LO-003 | `npm run check` verifies all dependencies | P1 | Pass/fail status for each dep |

### **5.2 Dependency Verification**

**File**: `/scripts/check-deps.js`

#### **Dependencies to Check**

| Dependency | Version | Required | Install Instructions |
| ---------- | ------- | -------- | -------------------- |
| Node.js | 18+ | Yes | https://nodejs.org |
| npm | 8+ | Yes | Included with Node.js |
| Git | 2.30+ | No | https://git-scm.com |
| Claude CLI | any | Yes | https://claude.ai/cli |
| Bash | any | Yes | Included in Unix/macOS, Git Bash for Windows |

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-DV-001 | Check script outputs colored pass/fail status | P1 | Green for pass, red for fail |
| FR-DV-002 | Missing critical deps block startup | P1 | Exit code 1 with instructions |
| FR-DV-003 | Missing optional deps show warning only | P1 | Warning but continue |
| FR-DV-004 | Installation instructions provided for missing deps | P1 | URL or command shown |

### **5.3 Environment Configuration**

**File**: `/.env.example`

```bash
# Target project path (leave empty for auto-detection in embedded mode)
PROJECT_PATH=

# Server ports
PORT=3001
VITE_PORT=5173

# Optional: Override Claude CLI model flag behavior
# CLAUDE_MODEL_FLAG=true

# Safety limits
COST_LIMIT=50
MAX_RUNTIME=14400

# Completion detection
COMPLETION_PROMISE=ALL_TASKS_COMPLETE
```

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-EC-001 | .env.example documents all variables | P1 | All vars listed with comments |
| FR-EC-002 | Setup script creates .env from template | P1 | .env created if missing |
| FR-EC-003 | Dashboard loads .env from root directory | P1 | Vars accessible in server |

### **5.4 Operating Modes**

#### **Embedded Mode**

- Ralph cloned into a project directory (e.g., `my-project/RalphWiggumV3`)
- Auto-detects parent project
- Uses parent directory as PROJECT_PATH

#### **Standalone Mode**

- Ralph cloned to any location
- PROJECT_PATH explicitly set in .env
- Points to external project directory

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-OM-001 | Auto-detect embedded vs standalone mode | P1 | Mode shown in UI |
| FR-OM-002 | Display detection reason to user | P1 | "Why this path?" explanation |
| FR-OM-003 | Allow path override from UI | P1 | Input field + Apply button |
| FR-OM-004 | Path override saves to .env | P1 | Persists across restarts |

### **5.5 Project Initialization**

**Description**: Create missing Ralph files in target projects.

#### **Template Files**

| Template | Purpose |
| -------- | ------- |
| `AGENTS.md.template` | Project configuration with build commands |
| `CLAUDE.md.template` | AI instructions and context |
| `IMPLEMENTATION_PLAN.md.template` | Empty task list starter |
| `AUDIENCE_JTBD.md.template` | Target audience definition |

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-PI-001 | Detect which Ralph files exist vs missing | P1 | Status shown per file |
| FR-PI-002 | Preview files before creation | P1 | Content displayed in UI |
| FR-PI-003 | Create selected files in target project | P1 | Files written to PROJECT_PATH |
| FR-PI-004 | Templates support placeholder substitution | P2 | [build-command] replaced |

### **5.6 Setup Wizard**

**Description**: Unified first-run experience guiding users through setup.

#### **Wizard Steps**

1. **Welcome** - Explain embedded vs standalone, show detected mode
2. **Dependencies** - Pre-flight checks with install links
3. **Path Confirmation** - Show detected path, allow override
4. **Project Init** - Create missing Ralph files
5. **Configure** - Edit AGENTS.md with build commands
6. **Complete** - Summary and next steps

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-SW-001 | Wizard appears on first run | P1 | Shown if no AGENTS.md and no CLAUDE.md |
| FR-SW-002 | Progress persisted to localStorage | P1 | Can resume after refresh |
| FR-SW-003 | "Run Setup" button in Settings to re-run | P1 | Manual trigger available |
| FR-SW-004 | Each step validates before allowing next | P1 | Blocking validation |

### **5.7 Health Indicator**

**Description**: Compact header component showing system status.

#### **Display Elements**

- Mode badge (Embedded/Standalone)
- Project path (truncated with tooltip)
- Config status (e.g., "3/5 files")
- Dependency status (green/yellow/red dot)
- Click to expand detailed panel

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-HI-001 | Health indicator in dashboard header | P1 | Visible at all times |
| FR-HI-002 | Color-coded status dots | P1 | Green/yellow/red based on health |
| FR-HI-003 | Expandable detail panel | P1 | Click to see full status |

---

## **6. Safety & Cost Control**

### **6.1 Cost Tracking**

**Description**: Track token usage and costs from Claude CLI output.

#### **Implementation**

```typescript
// Parse Claude CLI stream-json output for usage events
// Calculate cost using pricing: $3/1M input, $15/1M output (Opus)
// Emit cost:update WebSocket events

interface CostCalculation {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;   // inputTokens * 3 / 1_000_000
  outputCost: number;  // outputTokens * 15 / 1_000_000
  totalCost: number;   // inputCost + outputCost
}
```

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-CT-001 | Parse token usage from Claude CLI JSON output | P1 | Tokens extracted per iteration |
| FR-CT-002 | Calculate cost using model pricing | P1 | Correct dollar amount |
| FR-CT-003 | Track cumulative cost across iterations | P1 | Running total maintained |
| FR-CT-004 | Display cost meter in dashboard | P1 | Visual progress bar |
| FR-CT-005 | Color thresholds on cost meter | P1 | Green <50%, yellow <80%, red ≥80% |

### **6.2 Cost Limits**

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-CL-001 | COST_LIMIT env var (default $50) | P1 | Configurable limit |
| FR-CL-002 | Loop exits when cost limit exceeded | P1 | Clean exit with message |
| FR-CL-003 | Cost limit configurable in UI | P1 | Input field in controls |

### **6.3 Runtime Limits**

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-RL-001 | MAX_RUNTIME env var (default 14400 = 4 hours) | P1 | Configurable limit |
| FR-RL-002 | Track elapsed time from loop start | P1 | Timer maintained |
| FR-RL-003 | Loop exits when runtime exceeded | P1 | Clean exit with message |
| FR-RL-004 | Display elapsed vs limit in UI | P1 | "Elapsed: 1h 23m / 4h 00m" |
| FR-RL-005 | Runtime limit configurable in UI | P1 | Hours/minutes selector |

### **6.4 Enhanced Loop Detection**

**Description**: Detect when the AI is stuck producing similar outputs.

#### **Implementation**

```typescript
import stringSimilarity from 'string-similarity';

const LOOP_THRESHOLD = 0.9;  // 90% similarity
const OUTPUT_HISTORY_SIZE = 5;

function detectLoop(currentOutput: string, recentOutputs: string[]): boolean {
  for (const prev of recentOutputs) {
    if (stringSimilarity.compareTwoStrings(currentOutput, prev) >= LOOP_THRESHOLD) {
      return true;
    }
  }
  return false;
}
```

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-LD-001 | Compare current output to recent outputs | P1 | Fuzzy string matching |
| FR-LD-002 | Configurable similarity threshold (default 0.9) | P1 | Can adjust sensitivity |
| FR-LD-003 | Display warning in UI when loop detected | P1 | Visual alert |
| FR-LD-004 | Optionally pause/stop on loop detection | P2 | Configurable behavior |

---

## **7. Resilience & Recovery**

### **7.1 Exponential Backoff**

**Description**: Automatically retry with increasing delays on failures.

#### **Implementation**

```bash
# After check_iteration_health returns failure:
if [ "$CONSECUTIVE_FAILURES" -gt 0 ]; then
  BACKOFF=$((2 ** CONSECUTIVE_FAILURES))
  if [ "$BACKOFF" -gt 60 ]; then BACKOFF=60; fi
  echo "Backing off for ${BACKOFF}s before retry..."
  sleep "$BACKOFF"
fi
```

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-EB-001 | Backoff delay increases exponentially | P2 | 2^n seconds delay |
| FR-EB-002 | Maximum backoff capped at 60 seconds | P2 | Never exceeds 60s |
| FR-EB-003 | Backoff status logged and visible | P2 | Shown in health log |
| FR-EB-004 | Backoff resets on successful iteration | P2 | Counter zeroed |

### **7.2 State Rollback**

**Description**: Automatically rollback to last successful state after repeated failures.

#### **Implementation**

```bash
if [ "$CONSECUTIVE_FAILURES" -ge 3 ]; then
  echo "Rolling back to last successful checkpoint..."
  git reset --hard HEAD~1 2>/dev/null || true
  CONSECUTIVE_FAILURES=0
fi
```

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-SR-001 | Rollback triggered after 3 consecutive failures | P2 | Git reset executed |
| FR-SR-002 | Rollback logs event to health log | P2 | Event recorded |
| FR-SR-003 | Failure counter resets after rollback | P2 | Fresh start |
| FR-SR-004 | Rollback configurable (on/off) | P2 | Can disable |

---

## **8. Observability & Telemetry**

### **8.1 Per-Iteration Telemetry**

**Description**: Structured telemetry for each iteration.

#### **Data Captured**

```typescript
interface IterationTelemetry {
  iteration: number;
  startedAt: Date;
  duration: number;
  success: boolean;
  triggerReason: 'INITIAL' | 'TASK_INCOMPLETE' | 'RECOVERY' | 'LOOP_DETECTED';
  tokensUsed?: { input: number; output: number };
  cost?: number;
  toolsUsed?: string[];
  outputPreview?: string;
  errorMessage?: string;
}
```

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-IT-001 | Capture telemetry for each iteration | P2 | All fields populated |
| FR-IT-002 | Export telemetry to ralph-metrics.json | P2 | File updated after run |
| FR-IT-003 | Display iteration history in UI | P2 | Collapsible list |
| FR-IT-004 | Show duration, tokens, cost per iteration | P2 | Metrics visible |

### **8.2 Telemetry Panel Component**

**Description**: UI component for viewing iteration history.

#### **Features**

- Collapsible iteration history
- Duration, tokens, cost per iteration
- Success/failure indicators
- Output preview on expand
- Error messages highlighted

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-TP-001 | Telemetry panel in dashboard | P2 | Accessible from main view |
| FR-TP-002 | Expandable iteration details | P2 | Click to show more |
| FR-TP-003 | Filter by success/failure | P2 | Toggle buttons |
| FR-TP-004 | Export telemetry data | P2 | Download as JSON |

### **8.3 Configurable Completion Promise**

**Description**: Allow customization of the completion signal.

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-CP-001 | COMPLETION_PROMISE env var | P2 | Default: ALL_TASKS_COMPLETE |
| FR-CP-002 | Completion promise configurable in UI | P2 | Input field in controls |
| FR-CP-003 | Loop stops when promise string detected | P2 | Correct exit behavior |

### **8.4 Dry Run Mode**

**Description**: Preview mode that shows what would execute without running.

#### **Implementation**

```bash
if [ "${DRY_RUN:-false}" = "true" ]; then
  echo "[DRY RUN] Would execute: claude -p ..."
  echo "[DRY RUN] Prompt file: $PROMPT_FILE_PATH"
  cat "$PROMPT_FILE_PATH"
  exit 0
fi
```

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-DR-001 | --dry-run flag in loop.sh | P3 | Flag recognized |
| FR-DR-002 | Dry run shows prompt without executing | P3 | Output only, no API call |
| FR-DR-003 | Dry run checkbox in UI | P3 | Toggle in controls |

---

## **9. User Interface Specifications**

### **9.1 Dashboard Tabs**

#### **9.1.1 Dashboard Tab**

| Component | Description |
| --------- | ----------- |
| Loop Status | Running/stopped, mode, iteration count |
| Cost Meter | Current spend / limit with progress bar |
| Runtime Display | Elapsed time / limit |
| Task List | Completion tracking with progress indicators |
| Git History | Recent commits display |
| Log Viewer | Real-time streaming output |
| Context Meter | Iteration progress indicator |

#### **9.1.2 Generate Tab**

| Component | Description |
| --------- | ----------- |
| Mode Selector | Standard, SLC, work plan modes |
| PRD Generator | Form-based PRD generation |
| Output Preview | Live preview during generation |
| Context Files | File selection for context |

#### **9.1.3 Logs Tab**

| Component | Description |
| --------- | ----------- |
| Log History | Full execution log |
| Search | Filter logs by text |
| Streaming | Real-time updates |

#### **9.1.4 Setup Tab**

| Component | Description |
| --------- | ----------- |
| Project Scanner | Configuration validation |
| AGENTS.md Editor | Visual editor for config |
| CLAUDE.md Manager | AI instructions editor |
| Agent Installer | Specialist agents selection |
| Dependency Checker | Status indicators |
| Path Configuration | Project path display/override |

#### **9.1.5 Telemetry Tab (New)**

| Component | Description |
| --------- | ----------- |
| Iteration History | Collapsible iteration list |
| Cost Summary | Total cost breakdown |
| Performance Metrics | Duration trends |
| Export Controls | Download telemetry data |

### **9.2 Loop Controls**

| Control | Type | Default | Description |
| ------- | ---- | ------- | ----------- |
| Mode | Select | build | Execution mode |
| Max Iterations | Number | 100 | Iteration limit |
| Max Runtime | Time picker | 4 hours | Runtime limit |
| Cost Limit | Number | $50 | Cost limit |
| Completion Promise | Text | ALL_TASKS_COMPLETE | Completion signal |
| Backoff Enabled | Checkbox | true | Enable backoff |
| Rollback on Failure | Checkbox | true | Enable rollback |
| Dry Run | Checkbox | false | Preview mode |

### **9.3 Cost Meter Component**

```typescript
interface CostMeterProps {
  spent: number;
  limit: number;
  tokensInput: number;
  tokensOutput: number;
}

// Visual representation:
// [████████░░░░░░░░] $24.50 / $50.00 (49%)
// Tokens: 1.2M in / 450K out

// Color thresholds:
// Green: < 50%
// Yellow: 50-80%
// Red: >= 80%
```

### **9.4 Health Indicator Component**

```typescript
interface HealthIndicatorProps {
  mode: 'embedded' | 'standalone';
  projectPath: string;
  configStatus: {
    present: number;
    total: number;
  };
  dependencyStatus: 'healthy' | 'warning' | 'error';
}

// Visual representation:
// [Embedded] ~/projects/my-app (3/5 files) ●
// Click to expand details
```

---

## **10. API & WebSocket Specifications**

### **10.1 WebSocket Message Types**

| Domain | Actions |
| ------ | ------- |
| loop | start, stop, status, output |
| config | read, update, validate |
| plan | generate, status |
| prd | generate, status |
| review | run, results |
| project | scan, register, discover, info, path-override, init, init-status, init-preview, detection-details |
| instance | spawn, stop, status |
| cost | update, limit |
| telemetry | update, history |

### **10.2 Loop Control Messages**

#### **Start Loop**

```typescript
// Client → Server
{
  type: 'loop:start',
  payload: {
    mode: 'build',
    maxIterations: 100,
    maxRuntime: 14400,
    costLimit: 50,
    completionPromise: 'ALL_TASKS_COMPLETE',
    backoffEnabled: true,
    rollbackOnFailure: true,
    dryRun: false
  }
}

// Server → Client (status updates)
{
  type: 'loop:status',
  payload: {
    running: true,
    mode: 'build',
    iteration: 5,
    // ... full LoopStatus
  }
}
```

#### **Stop Loop**

```typescript
// Client → Server
{
  type: 'loop:stop'
}
```

### **10.3 Cost Messages**

```typescript
// Server → Client
{
  type: 'cost:update',
  payload: {
    totalTokensInput: 1200000,
    totalTokensOutput: 450000,
    totalCost: 24.50,
    costLimit: 50,
    perIterationCosts: [...]
  }
}
```

### **10.4 Project Messages**

#### **Get Project Info**

```typescript
// Client → Server
{
  type: 'project:info'
}

// Server → Client
{
  type: 'project:info',
  payload: {
    name: 'my-project',
    path: '/home/user/projects/my-project',
    mode: 'embedded',
    detectionReason: 'Found package.json in parent directory',
    ralphFiles: {
      agentsMd: { exists: true, path: '...' },
      claudeMd: { exists: true, path: '...' },
      // ...
    },
    dependencies: [...],
    git: { isRepo: true, branch: 'main' }
  }
}
```

#### **Override Project Path**

```typescript
// Client → Server
{
  type: 'project:path-override',
  payload: {
    newPath: '/home/user/other-project'
  }
}

// Server → Client (success)
{
  type: 'project:path-override-result',
  payload: {
    success: true,
    message: 'Path updated. Restart required.'
  }
}
```

#### **Initialize Project**

```typescript
// Client → Server
{
  type: 'project:init',
  payload: {
    files: ['AGENTS.md', 'CLAUDE.md']
  }
}

// Server → Client
{
  type: 'project:init-result',
  payload: {
    success: true,
    created: ['AGENTS.md', 'CLAUDE.md']
  }
}
```

### **10.5 Telemetry Messages**

```typescript
// Server → Client (after each iteration)
{
  type: 'telemetry:update',
  payload: {
    iteration: 5,
    startedAt: '2024-01-15T10:30:00Z',
    duration: 45000,
    success: true,
    triggerReason: 'TASK_INCOMPLETE',
    tokensUsed: { input: 50000, output: 15000 },
    cost: 0.375,
    toolsUsed: ['write_file', 'run_command'],
    outputPreview: 'Implemented user authentication...'
  }
}
```

---

## **11. Integration Requirements**

### **11.1 Claude CLI Integration**

| Attribute | Value |
| --------- | ----- |
| Protocol | Command line execution |
| Authentication | ~/.claude.json |
| Output Format | stream-json |
| Session | Fresh per iteration |

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-CI-001 | Execute Claude CLI with --output-format=stream-json | P0 | JSON lines output |
| FR-CI-002 | Parse usage events from JSON output | P1 | Token counts extracted |
| FR-CI-003 | Fresh session per iteration | P0 | No persistent context |
| FR-CI-004 | Support --model flag based on env var | P0 | CLAUDE_MODEL_FLAG checked |

### **11.2 Git Integration**

| Operation | Trigger |
| --------- | ------- |
| Commit | After successful validation |
| Status | Project health check |
| Reset | Rollback on failures |
| Branch Check | Plan-work mode validation |

#### **Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-GI-001 | Auto-commit on successful validation | P0 | Git log shows commit |
| FR-GI-002 | Branch detection for plan-work mode | P0 | main/master rejection |
| FR-GI-003 | Git reset for rollback | P2 | HEAD~1 reset works |
| FR-GI-004 | Display git status in dashboard | P0 | Branch and changes shown |

### **11.3 File System Integration**

| Feature | Library |
| ------- | ------- |
| File Watching | Chokidar |
| Directory Navigation | Node fs |
| Path Resolution | Path module |

---

## **12. Non-Functional Requirements**

### **12.1 Performance**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| NFR-PER-001 | Dashboard loads in < 2 seconds | P0 | Initial load time |
| NFR-PER-002 | WebSocket latency < 100ms | P0 | Real-time updates |
| NFR-PER-003 | File watcher detects changes in < 500ms | P0 | Responsive UI |
| NFR-PER-004 | Log streaming without page refresh | P0 | Continuous updates |
| NFR-PER-005 | LLM reviews complete in < 10s | P1 | Haiku model |

### **12.2 Reliability**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| NFR-REL-001 | Loop recovers from validation failures | P0 | Continues with error context |
| NFR-REL-002 | Dashboard reconnects on WebSocket drop | P0 | Auto-reconnect logic |
| NFR-REL-003 | Instance crashes detected and reported | P0 | Crash notification |
| NFR-REL-004 | Graceful shutdown on Ctrl+C | P0 | Clean process exit |

### **12.3 Usability**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| NFR-USE-001 | Single command to start (npm start) | P1 | One-liner startup |
| NFR-USE-002 | Clear error messages for missing deps | P1 | Actionable instructions |
| NFR-USE-003 | Setup wizard guides new users | P1 | Step-by-step flow |
| NFR-USE-004 | README has complete instructions | P1 | All use cases documented |

### **12.4 Security**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| NFR-SEC-001 | Dashboard operates within project scope | P0 | No arbitrary access |
| NFR-SEC-002 | No API keys stored in application | P0 | Claude CLI handles auth |
| NFR-SEC-003 | No force push operations | P0 | Git safety |
| NFR-SEC-004 | Branch validation for sensitive ops | P0 | Protected branch check |

### **12.5 Compatibility**

| Platform | Support |
| -------- | ------- |
| macOS | Full support |
| Linux | Full support |
| Windows | WSL or Git Bash required |

| Browser | Version |
| ------- | ------- |
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## **13. File Structure**

```
RalphWiggumV3/
├── package.json                    # Root-level npm scripts
├── .env.example                    # Environment template
├── README.md                       # Unified documentation
├── QUICKSTART.md                   # Quick start guide
├── ralph.yml                       # Configuration file (optional)
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
├── loop.sh                         # Main execution engine
├── CLAUDE.md                       # AI instructions
├── AGENTS.md                       # Project configuration
├── IMPLEMENTATION_PLAN.md          # Task tracking
├── PROMPT_*.md                     # Execution templates (7 files)
├── PRD.md                          # Product requirements
├── AUDIENCE_JTBD.md                # Target audience definition
│
├── specs/                          # Feature specifications
├── src/lib/                        # LLM review library
├── tools/                          # Utility scripts
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
│   │   │   ├── CostMeter.tsx       # Cost display (NEW)
│   │   │   ├── TelemetryPanel.tsx  # Telemetry view (NEW)
│   │   │   ├── HealthIndicator.tsx # Status indicator (NEW)
│   │   │   └── setup/
│   │   │       ├── UnifiedSetupWizard.tsx  # Setup wizard (NEW)
│   │   │       ├── ProjectPathInfo.tsx     # Path display (NEW)
│   │   │       └── ProjectInitializer.tsx  # File creation (NEW)
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useLoop.ts
│   │   │   └── useSetupWizard.ts   # Wizard state (NEW)
│   │   └── types/
│   │       └── index.ts            # TypeScript definitions
│   └── server/
│       ├── index.ts                # Express + WebSocket server
│       ├── loopController.ts       # Loop execution
│       ├── planGenerator.ts        # Plan generation
│       ├── reviewRunner.ts         # LLM reviews
│       ├── costTracker.ts          # Cost accounting (NEW)
│       ├── telemetryTracker.ts     # Telemetry collection (NEW)
│       └── templateManager.ts      # Template handling (NEW)
│
└── .claude/
    ├── agents/                     # Specialist agent definitions
    └── plugins/ralph-wiggum/       # Claude Code plugin
```

---

## **14. Glossary**

| Term | Definition |
| ---- | ---------- |
| AGENTS.md | Project configuration file containing build commands and project metadata |
| CLAUDE.md | AI instructions file providing context and guidelines for Claude |
| Claude CLI | Command-line interface for Claude AI |
| Completion Promise | String that signals all tasks are complete (default: ALL_TASKS_COMPLETE) |
| Embedded Mode | Ralph cloned into a project directory, auto-detecting parent project |
| Health Score | Ratio of completed tasks to total tasks |
| Implementation Plan | Markdown file containing prioritized task list |
| Iteration | Single execution cycle of the loop (one Claude session) |
| License Plate | Unique identifier for a batch of work |
| Loop Detection | Mechanism to detect when AI produces repetitive outputs |
| LLM-as-Judge | Using Claude to evaluate subjective quality criteria |
| Plan-SLC | Planning mode for Simple, Lovable, Complete releases |
| Plan-Work | Planning mode scoped to feature branches |
| Ralph-Ready | Project containing AGENTS.md or CLAUDE.md files |
| Rollback | Git reset to previous state after repeated failures |
| Specialist Agent | Domain-specific AI configuration with specialized knowledge |
| Standalone Mode | Ralph pointed at an external project via PROJECT_PATH |
| Telemetry | Structured data collected per iteration for analysis |
| TDD | Test-Driven Development workflow |
| Validation Suite | Tests, typecheck, and lint commands run after each iteration |

---

## **Appendix A: User Stories**

### **Developer Stories**

> "As a developer, I want to run `npm start` from the root directory so that I don't need to remember which subdirectory to navigate to."

> "As a developer, I want to see my cost spend in real-time so that I can avoid unexpected Claude API charges."

> "As a developer, I want the loop to automatically stop after 4 hours so that overnight runs don't consume unlimited resources."

> "As a developer, I want to see why a project path was detected so that I can understand and override it if needed."

### **Team Lead Stories**

> "As a team lead, I want to manage multiple projects from a central launcher so that I can monitor all active development loops."

> "As a team lead, I want telemetry data exported after each run so that I can analyze iteration patterns and costs."

### **New User Stories**

> "As a new user, I want a setup wizard to guide me through configuration so that I can get started quickly."

> "As a new user, I want clear error messages when dependencies are missing so that I know exactly what to install."

---

## **Appendix B: Configuration Examples**

### **ralph.yml**

```yaml
# Ralph Wiggum V3 Configuration

# Execution limits
maxIterations: 100
maxRuntime: 14400      # 4 hours in seconds
costLimit: 50.0        # dollars

# Completion detection
completionPromise: "ALL_TASKS_COMPLETE"

# Safety features
loopDetectionThreshold: 0.9
backoffEnabled: true
rollbackOnFailure: true

# Model (optional, uses Claude CLI default)
# model: claude-sonnet-4-20250514
```

### **.env**

```bash
# Project path (empty for auto-detection)
PROJECT_PATH=

# Server ports
PORT=3001
VITE_PORT=5173

# Safety limits
COST_LIMIT=50
MAX_RUNTIME=14400

# Completion detection
COMPLETION_PROMISE=ALL_TASKS_COMPLETE

# Optional model flag
# CLAUDE_MODEL_FLAG=true
```

---

## **Appendix C: Priority Definitions**

| Priority | Definition | Implementation |
| -------- | ---------- | -------------- |
| **P0** | Core functionality, must-have | Existing features |
| **P1** | Local setup & safety controls | Next implementation phase |
| **P2** | Resilience & observability | Future enhancement |
| **P3** | Optimization & config | Backlog |

---

*— End of Document —*
