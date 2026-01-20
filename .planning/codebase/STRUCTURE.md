# Codebase Structure

**Analysis Date:** 2026-01-19

## Directory Layout

```
RalphWiggumV3/
├── dashboard/                    # Full-stack web dashboard
│   ├── src/                      # React frontend
│   │   ├── components/           # UI components
│   │   │   ├── ui/               # Radix UI primitives
│   │   │   ├── launcher/         # Project launcher views
│   │   │   └── setup/            # Setup wizard components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Frontend utilities
│   │   ├── types/                # TypeScript type definitions
│   │   └── assets/               # Static assets
│   ├── server/                   # Express backend
│   │   ├── database/             # SQLite layer
│   │   │   └── repositories/     # Data access objects
│   │   ├── externalRepos/        # GitHub repo integration
│   │   ├── integrations/         # External service connectors
│   │   └── lib/                  # Backend utilities
│   ├── tests/                    # Test suites
│   │   ├── integration/          # Integration tests
│   │   └── e2e/                  # Playwright E2E tests
│   └── public/                   # Static web assets
├── agents/                       # Specialist agent definitions
├── .claude/                      # Claude Code configuration
│   ├── plugins/ralph-wiggum/     # Claude plugin
│   │   ├── commands/             # Plugin commands
│   │   ├── hooks/                # Plugin hooks
│   │   └── scripts/              # Plugin scripts
│   └── agents/                   # Claude agent configs
├── .cursor/rules/                # Cursor IDE rules
├── scripts/                      # Build/setup scripts
├── specs/                        # Feature specifications
├── templates/                    # Project bootstrap templates
├── docs/                         # VitePress documentation
├── logs/                         # Session log files
├── tools/                        # Utility tools
├── loop.sh                       # Main CLI orchestrator
└── PROMPT_*.md                   # AI prompt templates
```

## Directory Purposes

**`/dashboard/`:**
- Purpose: Full-stack web application for managing Ralph sessions
- Contains: React SPA frontend, Express/WebSocket backend
- Key files: `package.json`, `vite.config.ts`, `tsconfig.json`

**`/dashboard/src/`:**
- Purpose: React frontend source code
- Contains: Components, hooks, types, styles
- Key files: `main.tsx` (entry), `App.tsx` (router), `index.css`

**`/dashboard/src/components/`:**
- Purpose: React UI components organized by feature
- Contains: Feature components, reusable UI primitives
- Key files: `Dashboard.tsx` (main view), feature panels (PRDGenerator, PlanGenerator, etc.)

**`/dashboard/src/components/ui/`:**
- Purpose: Radix UI-based primitive components (shadcn/ui style)
- Contains: Button, Card, Tabs, Dialog, Select, etc.
- Key files: Each primitive in its own file

**`/dashboard/src/hooks/`:**
- Purpose: Custom React hooks for state management
- Contains: WebSocket connection, launcher state
- Key files: `useWebSocket.ts` (main state), `useLauncher.ts`

**`/dashboard/server/`:**
- Purpose: Express backend with WebSocket support
- Contains: Domain services, database layer, integrations
- Key files: `index.ts` (entry), `loopController.ts`, `fileWatcher.ts`

**`/dashboard/server/database/`:**
- Purpose: SQLite persistence layer
- Contains: Schema definitions, migrations, repository pattern
- Key files: `index.ts` (singleton), repositories for projects/sessions/history

**`/agents/`:**
- Purpose: Specialist AI agent prompt definitions
- Contains: Expert agent prompts (React, accessibility, UX, Go)
- Key files: `react-typescript-expert.md`, `accessibility-expert.md`, `qol-ux-expert.md`, `golang-backend-expert.md`

**`/.claude/plugins/ralph-wiggum/`:**
- Purpose: Claude Code plugin for IDE integration
- Contains: Commands, hooks, scripts for Claude Code
- Key files: `README.md`, `QUICK_START.md`

**`/.cursor/rules/`:**
- Purpose: Cursor IDE coding rules and guidelines
- Contains: Language/framework-specific rules
- Key files: `2000-golang-backend.mdc`

**`/scripts/`:**
- Purpose: Build and setup automation
- Contains: Dependency checker, setup script, migrations
- Key files: `check-deps.js`, `setup.sh`

**`/specs/`:**
- Purpose: Feature specification documents
- Contains: Numbered spec files for planned features
- Key files: `01-prd-plan-integration.md`, `09-project-launcher.md`, etc.

**`/templates/`:**
- Purpose: Bootstrap templates for new Ralph projects
- Contains: Starter file templates
- Key files: `AGENTS.md.template`, `CLAUDE.md.template`, `IMPLEMENTATION_PLAN.md.template`

## Key File Locations

**Entry Points:**
- `/Users/samueledwards/RalphWiggumV3/loop.sh`: CLI orchestrator entry
- `/Users/samueledwards/RalphWiggumV3/dashboard/server/index.ts`: Backend server entry
- `/Users/samueledwards/RalphWiggumV3/dashboard/src/main.tsx`: Frontend entry

**Configuration:**
- `/Users/samueledwards/RalphWiggumV3/package.json`: Root npm config
- `/Users/samueledwards/RalphWiggumV3/dashboard/package.json`: Dashboard dependencies
- `/Users/samueledwards/RalphWiggumV3/dashboard/vite.config.ts`: Vite bundler config
- `/Users/samueledwards/RalphWiggumV3/dashboard/tsconfig.json`: TypeScript config
- `/Users/samueledwards/RalphWiggumV3/.env.example`: Environment template

**Core Logic:**
- `/Users/samueledwards/RalphWiggumV3/dashboard/server/loopController.ts`: Claude CLI process management
- `/Users/samueledwards/RalphWiggumV3/dashboard/server/fileWatcher.ts`: File system monitoring
- `/Users/samueledwards/RalphWiggumV3/dashboard/src/hooks/useWebSocket.ts`: Frontend state management
- `/Users/samueledwards/RalphWiggumV3/dashboard/src/components/Dashboard.tsx`: Main dashboard view

**AI Prompts:**
- `/Users/samueledwards/RalphWiggumV3/PROMPT_build.md`: Build mode prompt
- `/Users/samueledwards/RalphWiggumV3/PROMPT_plan.md`: Planning mode prompt
- `/Users/samueledwards/RalphWiggumV3/PROMPT_plan_slc.md`: SLC planning prompt
- `/Users/samueledwards/RalphWiggumV3/PROMPT_prd.md`: PRD generation prompt
- `/Users/samueledwards/RalphWiggumV3/PROMPT_review.md`: Review mode prompt

**Testing:**
- `/Users/samueledwards/RalphWiggumV3/dashboard/tests/integration/`: Integration tests
- `/Users/samueledwards/RalphWiggumV3/dashboard/tests/e2e/`: Playwright E2E tests

**Types:**
- `/Users/samueledwards/RalphWiggumV3/dashboard/src/types/index.ts`: Shared TypeScript types

## Naming Conventions

**Files:**
- React components: PascalCase (`Dashboard.tsx`, `LoopControls.tsx`)
- Hooks: camelCase with `use` prefix (`useWebSocket.ts`, `useLauncher.ts`)
- Server modules: camelCase (`loopController.ts`, `fileWatcher.ts`)
- UI primitives: kebab-case (`scroll-area.tsx`, `status-badge.tsx`)
- Prompts: SCREAMING_SNAKE_CASE prefix (`PROMPT_build.md`)
- Templates: SCREAMING_SNAKE with `.template` suffix (`AGENTS.md.template`)

**Directories:**
- Feature groups: camelCase (`launcher/`, `setup/`)
- Standard: lowercase (`components/`, `hooks/`, `lib/`)

**Exports:**
- Components: Named exports matching filename
- Hooks: Named exports with `use` prefix
- Types: Named exports, often grouped in `index.ts`

## Where to Add New Code

**New Feature Component:**
- Implementation: `/Users/samueledwards/RalphWiggumV3/dashboard/src/components/`
- Pattern: Single file per component, PascalCase naming
- Import from: `@/components/ui/` for primitives, `@/types` for types

**New UI Primitive:**
- Implementation: `/Users/samueledwards/RalphWiggumV3/dashboard/src/components/ui/`
- Pattern: Radix UI wrapper with Tailwind styling
- Follow existing shadcn/ui patterns

**New Backend Service:**
- Implementation: `/Users/samueledwards/RalphWiggumV3/dashboard/server/`
- Pattern: Class-based service with EventEmitter if needed
- Register in `index.ts`, add WebSocket handlers

**New Database Table:**
- Schema: Add migration in `/Users/samueledwards/RalphWiggumV3/dashboard/server/database/index.ts`
- Repository: Create in `/Users/samueledwards/RalphWiggumV3/dashboard/server/database/repositories/`

**New Integration:**
- Implementation: `/Users/samueledwards/RalphWiggumV3/dashboard/server/integrations/`
- Pattern: Export functions or classes, document env vars needed

**New Agent Definition:**
- Implementation: `/Users/samueledwards/RalphWiggumV3/agents/`
- Pattern: Markdown file with prompt instructions
- Register in `registry.json`

**New Prompt Mode:**
- Prompt file: `/Users/samueledwards/RalphWiggumV3/PROMPT_{mode}.md`
- Update `loop.sh` mode detection
- Add backend handler in `index.ts`

**Utilities:**
- Frontend: `/Users/samueledwards/RalphWiggumV3/dashboard/src/lib/`
- Backend: `/Users/samueledwards/RalphWiggumV3/dashboard/server/lib/`

## Special Directories

**`/logs/`:**
- Purpose: Session log files from Claude CLI runs
- Generated: Yes, by `loop.sh`
- Committed: No (in .gitignore)

**`/dashboard/dist/`:**
- Purpose: Vite production build output
- Generated: Yes, by `npm run build`
- Committed: No

**`/node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes, by `npm install`
- Committed: No

**`/.planning/`:**
- Purpose: Planning and codebase analysis documents
- Generated: Mixed (some manual, some generated)
- Committed: Varies by project

**`~/.ralph/`:**
- Purpose: Global Ralph data (SQLite database)
- Generated: Yes, by database initialization
- Committed: No (user home directory)

---

*Structure analysis: 2026-01-19*
