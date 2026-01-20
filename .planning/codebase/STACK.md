# Technology Stack

**Analysis Date:** 2026-01-19

## Languages

**Primary:**
- TypeScript ~5.9.3 - Used throughout frontend and backend
- JavaScript - Config files only (eslint, tailwind, postcss)

**Secondary:**
- Bash - Main orchestration script `loop.sh`
- SQL - SQLite schema in `dashboard/server/database/index.ts`

## Runtime

**Environment:**
- Node.js (ES2022 target)
- Uses ESM modules (`"type": "module"` in package.json)

**Package Manager:**
- npm
- Lockfile: Not present in root (workspace-style setup)

**Node Version:**
- Not explicitly specified (.nvmrc not present)
- Inferred minimum: Node 18+ (ESM, ES2022 features)

## Frameworks

**Core:**
- React 19.2.0 - Frontend UI framework
- Express 5.2.1 - Backend HTTP/WebSocket server
- Vite 7.2.4 - Frontend build tool and dev server

**Testing:**
- Vitest 2.0.0 - Unit/integration tests
- Playwright 1.45.0 - E2E tests
- Testing Library (React 16.0.0, jest-dom 6.0.0) - Component testing
- MSW 2.0.0 - API mocking

**Build/Dev:**
- TypeScript ~5.9.3 - Type checking and compilation
- ESLint 9.39.1 - Linting
- tsx 4.21.0 - TypeScript execution for server

## Key Dependencies

**Critical:**
- `better-sqlite3` ^12.6.0 - Local SQLite database for session persistence
- `ws` ^8.19.0 - WebSocket server for real-time communication
- `chokidar` ^5.0.0 - File system watching for live updates
- `simple-git` ^3.30.0 - Git operations for repository management

**Infrastructure:**
- `@sentry/node` ^8.0.0 - Error tracking (backend)
- `@sentry/react` ^8.0.0 - Error tracking (frontend)
- `concurrently` ^9.2.1 - Running frontend and backend simultaneously

**UI Framework:**
- `@radix-ui/*` - Headless UI components (dialog, tabs, select, etc.)
- `tailwindcss` ^3.4.19 - Utility-first CSS
- `tailwindcss-animate` ^1.0.7 - Animation utilities
- `lucide-react` ^0.562.0 - Icon library
- `class-variance-authority` ^0.7.1 - Component variant management
- `clsx` ^2.1.1 - Conditional classnames
- `tailwind-merge` ^3.4.0 - Tailwind class deduplication
- `sonner` ^2.0.7 - Toast notifications

**Documentation:**
- `vitepress` ^1.3.0 - Documentation site generator

## Configuration

**Environment:**
- `.env.example` defines required variables:
  - `PROJECT_PATH` - Target project path (optional, auto-detected)
  - `PORT` - Server port (default: 3001)
  - `VITE_PORT` - Frontend port (default: 5173)
  - `COST_LIMIT` - Claude API cost limit (default: 50)
  - `MAX_RUNTIME` - Max execution time in seconds (default: 14400)
  - `COMPLETION_PROMISE` - Completion signal (default: ALL_TASKS_COMPLETE)
  - `CLAUDE_MODEL_FLAG` - Enable --model flag (optional)

**Build:**
- `vite.config.ts` - Vite configuration with React plugin
- `tsconfig.json` - Project references to `tsconfig.app.json` and `tsconfig.node.json`
- `tsconfig.app.json` - Frontend TypeScript config (ES2022, bundler mode, React JSX)
- `dashboard/server/tsconfig.json` - Backend TypeScript config
- `tailwind.config.js` - Tailwind with custom "wiggum" brand colors
- `eslint.config.js` - Flat config with typescript-eslint and react-hooks

**Path Aliases:**
- `@/*` maps to `./src/*` in frontend

## Platform Requirements

**Development:**
- macOS, Linux, or Windows (with WSL recommended for bash scripts)
- Claude CLI installed and authenticated (`claude` command available)
- Git installed
- Node.js 18+
- Optional: `gh` CLI for GitHub integration

**Production:**
- Local execution only (no cloud deployment)
- SQLite database stored at `~/.ralph/ralph.db`
- Session logs stored in `logs/` directory

## Scripts

**Root package.json:**
```bash
npm start      # Check deps + start dashboard
npm run setup  # Run setup script
npm run dev    # Start dashboard in dev mode
npm run build  # Build dashboard
npm run check  # Check dependencies
```

**Dashboard package.json:**
```bash
npm run dev         # Vite + Express server (concurrent)
npm run dev:alt     # Alternative ports (5175/3002)
npm run test        # Vitest unit tests
npm run test:e2e    # Playwright E2E tests
npm run test:coverage # Coverage report
npm run lint        # ESLint
npm run build       # TypeScript check + Vite build
```

**Main orchestration:**
```bash
./loop.sh                    # Build mode, unlimited
./loop.sh 20                 # Build mode, max 20 iterations
./loop.sh plan               # Standard planning
./loop.sh plan-slc           # SLC-oriented planning
./loop.sh plan-work "desc"   # Work-scoped planning
./loop.sh review             # Code vs docs analysis
./loop.sh validate           # Functionality validation
```

---

*Stack analysis: 2026-01-19*
