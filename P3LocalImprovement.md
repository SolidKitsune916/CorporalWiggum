Plan: Improve RalphWiggumV3 Local Application Integration
Summary
Transform RalphWiggumV3 into a well-documented, easy-to-setup local application that seamlessly integrates with existing projects in both embedded (cloned into project) and standalone (pointing at external project) modes.

Key Improvements
Root-level orchestration - Single npm start entry point
Path transparency - Show users why a path was selected and how to override
Project initialization - Create Ralph files in target projects if missing
Unified setup wizard - One coherent first-run experience
Pre-flight checks - Block startup if critical dependencies missing
Phase 1: Root-Level Orchestration
1.1 Create /RalphWiggumV2/package.json
Root-level package.json with unified scripts:


{
  "name": "ralph-wiggum",
  "version": "2.0.0",
  "description": "Autonomous AI Development Loop Dashboard",
  "scripts": {
    "start": "node scripts/check-deps.js && npm run dev --prefix dashboard",
    "setup": "bash scripts/setup.sh",
    "dev": "npm run dev --prefix dashboard",
    "build": "npm run build --prefix dashboard",
    "check": "node scripts/check-deps.js"
  }
}
1.2 Create /RalphWiggumV2/scripts/check-deps.js
Dependency verification script that runs before startup:

Check: Node.js (18+), npm, git, Claude CLI
Exit with colored status and installation instructions if critical deps missing
Warn but continue if optional deps (git) missing
1.3 Create /RalphWiggumV2/scripts/setup.sh
Interactive setup script:

Detect embedded vs standalone mode
Prompt for PROJECT_PATH if standalone
Run npm install in dashboard/
Create .env from .env.example
Optionally initialize Ralph files in target project
1.4 Create /RalphWiggumV2/.env.example

# Target project path (leave empty for auto-detection in embedded mode)
PROJECT_PATH=

# Server ports
PORT=3001
VITE_PORT=5173
Phase 2: Path Configuration Transparency
2.1 Create /RalphWiggumV2/dashboard/src/components/setup/ProjectPathInfo.tsx
New component showing:

Detected mode (embedded/standalone) with visual badge
Target project path
Detection reason in plain English
"Why this path?" expandable section showing detection chain
Override input with "Apply & Restart" button
2.2 Modify /RalphWiggumV2/dashboard/server/index.ts
Add new WebSocket handlers:

project:path-override - Save new PROJECT_PATH to .env
project:detection-details - Return full detection chain for UI display
Also modify:

Load .env from RalphWiggumV2 root (not just dashboard)
Include detection details in project:info response
Phase 3: Project Initialization
3.1 Create /RalphWiggumV2/dashboard/server/templateManager.ts
Template manager that:

Stores templates for AGENTS.md, CLAUDE.md, IMPLEMENTATION_PLAN.md
getTemplate(name) - Returns template content
applyTemplate(targetPath, templateName, options) - Writes to target
Templates should include placeholders (e.g., [build-command])
3.2 Create /RalphWiggumV2/templates/ directory
Store template files:

AGENTS.md.template - Based on existing AGENTS.md
CLAUDE.md.template - Based on existing CLAUDE.md
IMPLEMENTATION_PLAN.md.template - Empty starter
AUDIENCE_JTBD.md.template - Placeholder content
3.3 Modify /RalphWiggumV2/dashboard/server/index.ts
Add new WebSocket handlers:

project:init-status - Check which Ralph files exist vs missing
project:init-preview - Preview what would be created
project:init - Create missing files in target project
3.4 Create /RalphWiggumV2/dashboard/src/components/setup/ProjectInitializer.tsx
Initialization wizard step:

List Ralph files with status (existing ✅ / missing ❌)
Checkboxes to select which to create
Preview of each file before creation
"Create Selected Files" button
Phase 4: Unified Setup Wizard
4.1 Create /RalphWiggumV2/dashboard/src/components/setup/UnifiedSetupWizard.tsx
Single wizard with steps:

Welcome - Explain embedded vs standalone, show detected mode
Dependencies - Pre-flight checks with install links (use existing DependencyChecker)
Path Confirmation - Show detected path, allow override (use ProjectPathInfo)
Project Init - Create missing Ralph files (use ProjectInitializer)
Configure - Edit AGENTS.md with detected/entered build commands
Complete - Summary and next steps
4.2 Create /RalphWiggumV2/dashboard/src/hooks/useSetupWizard.ts
Wizard state management:

Persist progress to localStorage
Track completion of each step
Support "Run Full Setup" vs "Quick Setup"
Handle back/next navigation
4.3 Modify /RalphWiggumV2/dashboard/src/components/Dashboard.tsx
Update first-run detection:

Show wizard if: no AGENTS.md in target AND no CLAUDE.md AND first visit
Add "Run Setup" button in Settings tab to re-run wizard
Remove separate OnboardingWizard usage (consolidate into UnifiedSetupWizard)
Phase 5: Health Indicator
5.1 Create /RalphWiggumV2/dashboard/src/components/HealthIndicator.tsx
Compact header component showing:

Mode badge (Embedded/Standalone)
Project path (truncated with tooltip)
Config status (e.g., "3/5 files")
Dependency status (green/yellow/red dot)
Click to expand detailed panel
5.2 Modify /RalphWiggumV2/dashboard/src/components/Dashboard.tsx
Add HealthIndicator to header, between title and WebSocket status badge.

Phase 6: Documentation
6.1 Create /RalphWiggumV2/QUICKSTART.md
One-page getting started:


# Quick Start

## Embedded Mode (Recommended)
1. Clone into your project: `git clone ... my-project/RalphWiggumV2`
2. Run setup: `cd my-project/RalphWiggumV2 && npm run setup`
3. Start: `npm start`

## Standalone Mode
1. Clone anywhere: `git clone ...`
2. Set project: `export PROJECT_PATH=/path/to/your/project`
3. Run setup: `npm run setup`
4. Start: `npm start`
6.2 Update /RalphWiggumV2/README.md
Add sections:

Clear embedded vs standalone explanation
Updated installation using root npm scripts
Troubleshooting section for path issues
Files to Create
File	Purpose
/RalphWiggumV2/package.json	Root-level npm scripts
/RalphWiggumV2/scripts/check-deps.js	Dependency verification
/RalphWiggumV2/scripts/setup.sh	Interactive setup
/RalphWiggumV2/.env.example	Environment template
/RalphWiggumV2/templates/	Template directory
dashboard/src/components/setup/ProjectPathInfo.tsx	Path display/override
dashboard/src/components/setup/ProjectInitializer.tsx	File creation wizard
dashboard/src/components/setup/UnifiedSetupWizard.tsx	Consolidated wizard
dashboard/src/components/HealthIndicator.tsx	Status indicator
dashboard/src/hooks/useSetupWizard.ts	Wizard state
dashboard/server/templateManager.ts	Template handling
/RalphWiggumV2/QUICKSTART.md	Quick start guide
Files to Modify
File	Changes
dashboard/server/index.ts	Add path override API, .env loading, init handlers
dashboard/src/components/Dashboard.tsx	Add HealthIndicator, update first-run logic
/RalphWiggumV2/README.md	Add embedded/standalone docs
Verification Plan
Manual Testing
Fresh clone test (embedded):

Clone into a test project with package.json
Run npm run setup from RalphWiggumV2
Run npm start
Verify dashboard detects parent project correctly
Verify setup wizard appears on first run
Standalone test:

Clone to ~/RalphWiggumV2 (not in a project)
Set PROJECT_PATH to an existing project
Run npm run setup and npm start
Verify dashboard connects to specified project
Project initialization test:

Point at a project without Ralph files
Use wizard to create AGENTS.md, CLAUDE.md
Verify files created in target project
Dependency check test:

Temporarily rename claude CLI
Run npm start
Verify startup blocked with helpful error
Path override test:

Start in embedded mode
Use UI to override to different project
Verify dashboard switches targets after restart
Checklist
 npm run setup works from root
 npm start works from root
 Auto-detection works in embedded mode
 PROJECT_PATH override works in standalone mode
 Setup wizard guides new users
 Missing dependencies block startup with instructions
 Project initialization creates files in target
 Health indicator shows current status
 Path override UI saves to .env
Implementation Order
Phase 1 (Root orchestration) - Foundation for everything else
Phase 2 (Path transparency) - Users understand what's happening
Phase 3 (Project init) - Can initialize new projects
Phase 4 (Unified wizard) - Coherent first-run experience
Phase 5 (Health indicator) - Ongoing visibility
Phase 6 (Documentation) - Final polish
Technical Notes
.env Loading Strategy
Modify Vite config to load .env from RalphWiggumV2 root:


// dashboard/vite.config.ts
import { loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '')
  // ... use env values
})
Server Restart After Path Change
Rather than implementing auto-restart (complex), show clear UI:

"Path changed. Restart required."
Copy-paste command: npm start
Or add npm script: npm run restart
Template Customization
Templates in /templates/ directory allow users to customize defaults before running setup wizard again.