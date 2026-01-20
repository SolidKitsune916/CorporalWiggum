# Requirements: Ralph Wiggum V3 — Multi-Project Control System

**Defined:** 2026-01-19
**Core Value:** Never lose track of running loops. When stopped, it's stopped. When running, you see them all.

## v1 Requirements

Requirements for this release. Each maps to roadmap phases.

### Process Management

- [ ] **PROC-01**: System tracks all running loops across all projects in a central registry
- [ ] **PROC-02**: Stop command kills process and verifies termination before reporting success
- [ ] **PROC-03**: Dashboard startup detects and offers to clean up orphaned loop processes
- [ ] **PROC-04**: Each running loop writes a PID file that persists across dashboard restarts
- [ ] **PROC-05**: Stop uses SIGTERM with timeout, escalates to SIGKILL if process doesn't exit

### Launcher Page

- [ ] **LAUN-01**: Dedicated launcher view shows all registered projects with their current status
- [ ] **LAUN-02**: Each project card shows real-time status (running/stopped/error) with live updates
- [ ] **LAUN-03**: Start/stop buttons per project with immediate visual feedback
- [ ] **LAUN-04**: Global header shows count of active loops (visible from any page)
- [ ] **LAUN-05**: Running projects show elapsed time and cost spent

### CLI Tool

- [ ] **CLI-01**: `ralph status` shows all running loops system-wide with project, mode, runtime, cost
- [ ] **CLI-02**: `ralph start <project> [mode]` starts a loop and confirms it's running
- [ ] **CLI-03**: `ralph stop <project>` stops loop and verifies termination
- [ ] **CLI-04**: `ralph stop --all` stops all running loops with confirmation
- [ ] **CLI-05**: `ralph attach <project>` streams live output from running loop to terminal
- [ ] **CLI-06**: `ralph list` shows all registered projects with path and status
- [ ] **CLI-07**: `ralph logs <project>` tails recent log output

### Dashboard Fixes

- [ ] **DASH-01**: Loop start reliably spawns process and confirms it's running
- [ ] **DASH-02**: Loop stop reliably kills process and updates UI to reflect stopped state
- [ ] **DASH-03**: Task list updates when IMPLEMENTATION_PLAN.md changes
- [ ] **DASH-04**: Project switching navigates correctly and loads correct project context

### Sub-agent Observability

- [ ] **OBSV-01**: Track number of sub-agents spawned per iteration
- [ ] **OBSV-02**: Display sub-agent count and estimated cost in telemetry panel
- [ ] **OBSV-03**: Alert/warning when sub-agent spawning exceeds configurable threshold
- [ ] **OBSV-04**: Session summary shows total sub-agents spawned across all iterations

### Scriptability

- [ ] **SCRP-01**: CLI commands return proper exit codes (0=success, non-zero=error)
- [ ] **SCRP-02**: `ralph status --json` and `ralph list --json` output machine-readable JSON
- [ ] **SCRP-03**: Loop automatically stops and reports when completion signal detected
- [ ] **SCRP-04**: Optional webhook POST on loop completion or failure

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Web-based terminal emulator in dashboard for CLI access
- **ADV-02**: Loop scheduling (start at specific time)
- **ADV-03**: Project templates for quick initialization
- **ADV-04**: Cost forecasting based on task complexity

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Cloud deployment | Local-only tool, no server infrastructure |
| Multi-user auth | Single user system, no collaboration needed |
| Mobile app | Desktop/terminal workflow, mobile adds no value |
| Plugin marketplace | Core functionality first, extensibility later |
| Docker/containers | Adds complexity without benefit for local tool |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROC-01 | TBD | Pending |
| PROC-02 | TBD | Pending |
| PROC-03 | TBD | Pending |
| PROC-04 | TBD | Pending |
| PROC-05 | TBD | Pending |
| LAUN-01 | TBD | Pending |
| LAUN-02 | TBD | Pending |
| LAUN-03 | TBD | Pending |
| LAUN-04 | TBD | Pending |
| LAUN-05 | TBD | Pending |
| CLI-01 | TBD | Pending |
| CLI-02 | TBD | Pending |
| CLI-03 | TBD | Pending |
| CLI-04 | TBD | Pending |
| CLI-05 | TBD | Pending |
| CLI-06 | TBD | Pending |
| CLI-07 | TBD | Pending |
| DASH-01 | TBD | Pending |
| DASH-02 | TBD | Pending |
| DASH-03 | TBD | Pending |
| DASH-04 | TBD | Pending |
| OBSV-01 | TBD | Pending |
| OBSV-02 | TBD | Pending |
| OBSV-03 | TBD | Pending |
| OBSV-04 | TBD | Pending |
| SCRP-01 | TBD | Pending |
| SCRP-02 | TBD | Pending |
| SCRP-03 | TBD | Pending |
| SCRP-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 0
- Unmapped: 29 ⚠️

---
*Requirements defined: 2026-01-19*
*Last updated: 2026-01-19 after initial definition*
