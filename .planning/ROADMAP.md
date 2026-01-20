# Roadmap: Ralph Wiggum V3 — Multi-Project Control System

## Overview

This roadmap transforms Ralph Wiggum from a single-project dashboard with reliability issues into a multi-project control system with bulletproof process management. We start by building a solid process foundation (registry, PID files, verified stop), then fix the existing dashboard to use it, add CLI control, build a new launcher hub, and finish with observability and scriptability enhancements.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Process Foundation** - Central registry and reliable process lifecycle management
- [ ] **Phase 2: Dashboard Reliability** - Fix existing start/stop/task list/navigation issues
- [ ] **Phase 3: CLI Core** - Terminal interface for loop control
- [ ] **Phase 4: Launcher Hub** - Multi-project dashboard view
- [ ] **Phase 5: Sub-agent Observability** - Track and display sub-agent spawning
- [ ] **Phase 6: Scriptability** - Exit codes, JSON output, auto-stop, webhooks

## Phase Details

### Phase 1: Process Foundation
**Goal**: System reliably tracks and controls all running loops across all projects
**Depends on**: Nothing (first phase)
**Requirements**: PROC-01, PROC-02, PROC-03, PROC-04, PROC-05
**Success Criteria** (what must be TRUE):
  1. User can see all running loops in a central registry (even after dashboard restart)
  2. Stop command kills process and confirms termination before reporting success
  3. Dashboard startup detects orphaned loops and offers cleanup
  4. Each loop has a PID file that survives dashboard restarts
  5. Stop uses SIGTERM with timeout, escalates to SIGKILL if needed
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Process registry and PID file infrastructure (PROC-01, PROC-04)
- [ ] 01-02-PLAN.md — Stop verification and graceful shutdown (PROC-02, PROC-05)
- [ ] 01-03-PLAN.md — Orphan detection and cleanup (PROC-03)

### Phase 2: Dashboard Reliability
**Goal**: Existing dashboard reliably starts, stops, and displays loop state
**Depends on**: Phase 1
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. User clicks Start, process spawns, UI shows "Running" within 2 seconds
  2. User clicks Stop, process terminates, UI shows "Stopped" within 5 seconds
  3. Task list updates automatically when IMPLEMENTATION_PLAN.md changes
  4. User can switch between projects and see correct context each time
**Plans**: TBD

Plans:
- [ ] 02-01: Loop start reliability (spawn + confirm running)
- [ ] 02-02: Loop stop reliability (kill + confirm terminated)
- [ ] 02-03: Task list file watching fixes
- [ ] 02-04: Project switching navigation fixes

### Phase 3: CLI Core
**Goal**: User can control loops from terminal without opening dashboard
**Depends on**: Phase 1
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, CLI-06, CLI-07
**Success Criteria** (what must be TRUE):
  1. `ralph status` shows all running loops with project, mode, runtime, cost
  2. `ralph start <project>` starts a loop and confirms it's running
  3. `ralph stop <project>` stops a loop and verifies termination
  4. `ralph stop --all` stops all running loops with confirmation
  5. `ralph attach <project>` streams live output to terminal
  6. `ralph list` shows all registered projects
  7. `ralph logs <project>` tails recent log output
**Plans**: TBD

Plans:
- [ ] 03-01: CLI scaffold and project/status commands
- [ ] 03-02: Start and stop commands
- [ ] 03-03: Attach and logs commands

### Phase 4: Launcher Hub
**Goal**: User has a central dashboard view for all projects with live status
**Depends on**: Phase 2
**Requirements**: LAUN-01, LAUN-02, LAUN-03, LAUN-04, LAUN-05
**Success Criteria** (what must be TRUE):
  1. Dedicated launcher page shows all registered projects
  2. Each project card shows real-time status (running/stopped/error)
  3. Start/stop buttons work with immediate visual feedback
  4. Global header shows active loop count from any page
  5. Running projects display elapsed time and cost
**Plans**: TBD

Plans:
- [ ] 04-01: Launcher page layout and project cards
- [ ] 04-02: Real-time status updates via WebSocket
- [ ] 04-03: Global header with active loop count

### Phase 5: Sub-agent Observability
**Goal**: User can see sub-agent spawning behavior and costs per session
**Depends on**: Phase 2
**Requirements**: OBSV-01, OBSV-02, OBSV-03, OBSV-04
**Success Criteria** (what must be TRUE):
  1. System tracks sub-agent count per iteration
  2. Telemetry panel shows sub-agent count and cost breakdown
  3. Warning appears when sub-agent spawning exceeds threshold
  4. Session summary shows total sub-agents across all iterations
**Plans**: TBD

Plans:
- [ ] 05-01: Sub-agent parsing from Claude output
- [ ] 05-02: Telemetry panel integration
- [ ] 05-03: Threshold alerts and session summary

### Phase 6: Scriptability
**Goal**: CLI supports scripting workflows with proper exit codes and machine output
**Depends on**: Phase 3
**Requirements**: SCRP-01, SCRP-02, SCRP-03, SCRP-04
**Success Criteria** (what must be TRUE):
  1. CLI commands return proper exit codes (0=success, non-zero=error)
  2. `ralph status --json` and `ralph list --json` output valid JSON
  3. Loop auto-stops when completion signal detected
  4. Webhook fires on loop completion or failure
**Plans**: TBD

Plans:
- [ ] 06-01: Exit codes and JSON output mode
- [ ] 06-02: Auto-stop on completion
- [ ] 06-03: Webhook notifications

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6
Note: Phase 3 (CLI) and Phase 2 (Dashboard) both depend on Phase 1, so they could run in parallel if needed.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Process Foundation | 0/3 | Planned | - |
| 2. Dashboard Reliability | 0/4 | Not started | - |
| 3. CLI Core | 0/3 | Not started | - |
| 4. Launcher Hub | 0/3 | Not started | - |
| 5. Sub-agent Observability | 0/3 | Not started | - |
| 6. Scriptability | 0/3 | Not started | - |

---
*Roadmap created: 2026-01-19*
*Phase 1 planned: 2026-01-19*
