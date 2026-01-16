Plan: Make RalphWiggumV3 a Locally Runnable Application
Summary
Transform the RalphWiggumV3 directory into a well-documented, easy-to-setup local application with full ecosystem functionality (dashboard + Ralph loop tools).

Current State Analysis
What Exists
RalphWiggumV2/dashboard: React 19 + Express backend (functional)
RalphWiggumV2/loop.sh: Bash-based Ralph loop orchestrator
ralph-loop-agent: npm package for building agents
claude-code: Claude Code plugin repository
how-to-ralph-wiggum: Educational materials
What Works Today
npm run dev in dashboard directory starts frontend + backend
Loop functionality via ./loop.sh commands
PRD/Plan generation using Claude CLI
File watching, git integration, WebSocket communication
Gaps for Easy Local Usage
No unified entry point - Must know which subdirectory to run from
No setup automation - Manual npm install, no env templates
Missing .env.example - Environment variables undocumented
No dependency verification - Users don't know what's needed upfront
Scattered documentation - Instructions spread across multiple READMEs
No pre-flight checks - App starts but fails if Claude CLI missing
Implementation Plan
Phase 1: Root-Level Orchestration
1.1 Create root package.json

File: /Users/samueledwards/RalphWiggumV3/package.json
Scripts to run dashboard from root:
npm start → Start dashboard
npm run setup → Install all dependencies
npm run check → Verify dependencies
1.2 Create setup script

File: /Users/samueledwards/RalphWiggumV3/scripts/setup.sh
Actions:
Check Node.js version (18+)
Install dashboard dependencies
Create .env from template if missing
Run dependency checker
Phase 2: Environment Configuration
2.1 Create environment template

File: /Users/samueledwards/RalphWiggumV3/.env.example
Document all variables:

# Server Configuration
PORT=3001
VITE_PORT=5173

# Optional: Override Claude CLI model flag behavior
# CLAUDE_MODEL_FLAG=true

# Optional: Override project path
# PROJECT_PATH=/path/to/your/project
2.2 Update dashboard to load .env from root

Modify Vite config to look for .env in parent directory
Or symlink handling in setup script
Phase 3: Dependency Verification
3.1 Create pre-flight check script

File: /Users/samueledwards/RalphWiggumV3/scripts/check-deps.js
Check and report status of:
Node.js (version 18+)
npm (version 8+)
git (version 2.30+)
Claude CLI (any version)
bash (for loop.sh)
Output: Clear pass/fail with installation instructions
3.2 Integrate into dashboard startup

Show warning banner if dependencies missing
Link to dependency checker tab
Phase 4: Documentation Consolidation
4.1 Create unified README at root

File: /Users/samueledwards/RalphWiggumV3/README.md
Sections:
Quick Start (3 commands max)
Prerequisites
Installation
Running the Dashboard
Using Ralph Loop
Troubleshooting
Project Structure
4.2 Create QUICKSTART.md

File: /Users/samueledwards/RalphWiggumV3/QUICKSTART.md
Single-page getting started guide
Copy-paste friendly commands
Phase 5: Improved First-Run Experience
5.1 Add setup wizard to dashboard

Detect first run (no project configured)
Guide user through:
Verify dependencies
Select/create project directory
Configure preferences
Store completion state in ~/.ralph/setup-complete
5.2 Add health indicator to dashboard header

Show green/yellow/red status based on:
Claude CLI availability
Project directory validity
Git repository status
Files to Create/Modify
File	Action	Purpose
/package.json	Create	Root-level npm scripts
/scripts/setup.sh	Create	Automated setup
/scripts/check-deps.js	Create	Dependency verification
/.env.example	Create	Environment template
/README.md	Create	Unified documentation
/QUICKSTART.md	Create	Getting started guide
/RalphWiggumV2/dashboard/src/components/SetupWizard.tsx	Create	First-run wizard
/RalphWiggumV2/dashboard/src/components/HealthIndicator.tsx	Create	Status display
/RalphWiggumV2/dashboard/server/index.ts	Modify	Startup checks
Verification Plan
Manual Testing
Clone fresh copy of repo
Run npm run setup from root
Run npm start from root
Verify dashboard loads at localhost:5173
Test PRD generation (requires Claude CLI)
Test loop.sh plan mode
Verify all tabs functional
Checklist
 Single command to install (npm run setup)
 Single command to start (npm start)
 Clear error messages for missing dependencies
 Setup wizard guides new users
 README has complete instructions
What This Doesn't Change
Claude CLI remains the LLM provider (per your preference)
Core application architecture unchanged
All existing features preserved
No containerization (can be added later if needed)
Estimated Scope
~8 new files to create
~2 existing files to modify
Focus: Developer experience, not new features