# Ralph Wiggum Loop Prompt - Complete Phases 3-7

You are working on **Corporal WIGGUM, R.A.L.P.H.** - a local-only autonomous development loop tool.

## Ralph Methodology

This task uses the Ralph development methodology: iterative AI agent loops that persist work in files and git history. Each iteration sees previous work and improves upon it. The loop continues until completion criteria are met.

**Key Principles:**
- Iteration > Perfection - Refine work through multiple passes
- Failures Are Data - Use test failures and errors to guide fixes
- Self-Correction - Read your own code, tests, and git history to improve
- Clear Completion Criteria - Know exactly when you're done

## Current Status: ~55% Complete

- ✅ Phase 1 (SQLite Database): COMPLETE
- ✅ Phase 2 (Branding): COMPLETE  
- 🔴 Phase 3 (Testing): NOT STARTED
- 🟡 Phase 4 (Monitoring): 60% COMPLETE
- 🔴 Phase 5 (Integrations): NOT STARTED
- 🔴 Phase 6 (Documentation): NOT STARTED
- 🔴 Phase 7 (Accessibility): NOT STARTED

## Context

Read `/remaining.md` for complete task breakdown and current status. The project is located in `RalphWiggumV2/dashboard/`.

## Execution Order

Complete phases in this exact order:
1. **Phase 4 Completion** (integrate existing logger/metrics, add Sentry)
2. **Phase 3** (testing infrastructure)
3. **Phase 5** (integrations)
4. **Phase 7** (accessibility)
5. **Phase 6** (documentation)

---

## PHASE 4 COMPLETION (40% remaining)

### Already Created (DO NOT RECREATE):
- ✅ `dashboard/server/lib/logger.ts` - Structured logging
- ✅ `dashboard/server/lib/metrics.ts` - Metrics collector
- ✅ `dashboard/server/lib/alerts.ts` - Alert manager

### Tasks:

1. **Create Frontend Sentry Integration**
   - File: `dashboard/src/lib/monitoring/sentry.ts`
   - Initialize Sentry for React with error boundary
   - Configure DSN from environment variable (optional, don't fail if missing)
   - Set release version from package.json

2. **Create Backend Sentry Integration**
   - File: `dashboard/server/lib/sentry.ts`
   - Initialize Sentry for Node.js
   - Configure DSN from environment variable (optional)
   - Set release version from package.json

3. **Integrate Logger into Server**
   - File: `dashboard/server/index.ts`
   - Replace all `console.log()` calls with `logger.info()`
   - Replace all `console.error()` calls with `logger.error()`
   - Replace all `console.warn()` calls with `logger.warn()`
   - Import logger from `./lib/logger.js`

4. **Integrate Metrics into WebSocket Handlers**
   - File: `dashboard/server/index.ts`
   - Add metrics tracking for WebSocket message types
   - Track: message counts, error rates, response times
   - Use `metrics.increment()`, `metrics.timing()`, `metrics.gauge()`

5. **Add Alert Triggers**
   - Integrate alerts into critical error paths
   - Trigger alerts on: loop failures, WebSocket errors, database errors

6. **Add Dependencies**
   - Add to `dashboard/package.json`:
     ```json
     {
       "dependencies": {
         "@sentry/react": "^8.0.0",
         "@sentry/node": "^8.0.0"
       }
     }
     ```

---

## PHASE 3: TESTING INFRASTRUCTURE (100% remaining)

### Files to Create:

1. **Vitest Configuration**
   - File: `dashboard/vitest.config.ts`
   - Configure for React testing
   - Set coverage thresholds: 70% for unit tests
   - Include setupTests.ts

2. **Playwright Configuration**
   - File: `dashboard/playwright.config.ts`
   - Configure for E2E testing
   - Set base URL: `http://localhost:5173`
   - Configure test timeout: 30s

3. **Test Setup**
   - File: `dashboard/setupTests.ts`
   - Configure testing-library
   - Setup MSW (Mock Service Worker) for API mocking

4. **E2E Tests**
   - File: `dashboard/tests/e2e/dashboard.spec.ts`
   - Test critical flows:
     - Start/stop loop
     - Project management (add/remove projects)
     - WebSocket connection
     - Dashboard navigation

5. **Integration Tests**
   - File: `dashboard/tests/integration/ws-handlers.test.ts`
   - Test all WebSocket message types
   - Test error handling
   - Test message validation

6. **CI Workflow**
   - File: `.github/workflows/test.yml`
   - Run tests on push/PR
   - Run TypeScript check
   - Run linting
   - Run E2E tests

### Dependencies to Add:
```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@playwright/test": "^1.45.0",
    "msw": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0"
  }
}
```

### Test Coverage Targets:
- Unit tests: 70%+ coverage
- Integration tests for all WebSocket message types
- E2E tests for critical user flows

---

## PHASE 5: INTEGRATIONS (100% remaining)

### Files to Create:

1. **GitHub Service**
   - File: `dashboard/server/integrations/githubService.ts`
   - Use `gh` CLI for GitHub operations
   - Methods: listPRs, createPR, getIssues, createIssue
   - Handle authentication via `gh auth status`

2. **Notification Service**
   - File: `dashboard/server/integrations/notificationService.ts`
   - Event dispatcher pattern
   - Support multiple notification channels
   - Events: `loop:started`, `loop:completed`, `loop:error`

3. **Slack Notifier**
   - File: `dashboard/server/integrations/slackNotifier.ts`
   - Webhook-based notifications
   - Format messages with project context
   - Support @mentions on failure

4. **Discord Notifier**
   - File: `dashboard/server/integrations/discordNotifier.ts`
   - Webhook-based notifications
   - Format messages with embeds
   - Support @mentions on failure

5. **Webhook Manager**
   - File: `dashboard/server/integrations/webhookManager.ts`
   - Generic webhook dispatcher
   - Support custom webhook URLs
   - Retry logic and error handling

6. **GitHub Panel Component**
   - File: `dashboard/src/components/GitHubPanel.tsx`
   - Display PRs and issues
   - Show GitHub status
   - Link to GitHub repo

7. **Notification Settings UI**
   - File: `dashboard/src/components/setup/NotificationSettings.tsx`
   - Configure Slack/Discord webhooks
   - Enable/disable notifications
   - Test notification button

8. **Webhook Manager UI**
   - File: `dashboard/src/components/setup/WebhookManager.tsx`
   - Add/edit/delete custom webhooks
   - Configure webhook events
   - Test webhook button

### Events to Support:
- `loop:started` - When a loop begins
- `loop:completed` - When a loop finishes successfully
- `loop:error` - When a loop encounters an error
- Optional @mentions on failure (configurable)

---

## PHASE 7: ACCESSIBILITY (100% remaining)

### Tasks:

1. **ARIA Live Regions**
   - Add `aria-live="polite"` regions for:
     - Loop status updates
     - Notification messages
     - Error messages
   - Use `aria-live="assertive"` for critical errors

2. **Icon Button Labels**
   - Ensure all icon-only buttons have `aria-label`
   - Check all components using Lucide icons
   - Add descriptive labels

3. **Focus Indicators**
   - Verify all interactive elements have visible focus states
   - Ensure cyan ring (focus-visible:ring-cyan-500) is visible
   - Test keyboard navigation

4. **Skip-to-Content Link**
   - Add skip link at top of page
   - Skip to main content area
   - Visible on focus

5. **Color Contrast**
   - Verify contrast ratios meet WCAG AA (4.5:1)
   - Test obsidian background with cyan/white text
   - Use contrast checker tool

6. **Keyboard Navigation**
   - Test all flows with keyboard only
   - Ensure tab order is logical
   - Ensure all interactive elements are focusable

7. **Screen Reader Testing**
   - Test with VoiceOver (macOS) or NVDA (Windows)
   - Verify all content is announced correctly
   - Ensure form labels are properly associated

---

## PHASE 6: DOCUMENTATION (100% remaining)

### Structure to Create:

```
RalphWiggumV2/docs/
├── .vitepress/
│   └── config.ts
├── index.md
├── getting-started/
│   ├── installation.md
│   ├── quickstart.md
│   └── first-loop.md
├── user-guide/
│   ├── dashboard-overview.md
│   ├── loop-modes.md
│   └── safety-controls.md
├── api/
│   └── websocket-api.md
├── integrations/
│   ├── github.md
│   ├── slack.md
│   └── webhooks.md
├── architecture/
│   └── overview.md
└── troubleshooting/
    └── common-issues.md
```

### Dependencies to Add:
```json
{
  "devDependencies": {
    "vitepress": "^1.3.0"
  }
}
```

### Package.json Scripts to Add:
```json
{
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  }
}
```

### Documentation Content:

1. **Getting Started**
   - Installation instructions
   - Quickstart guide
   - Running your first loop

2. **User Guide**
   - Dashboard overview
   - Loop modes explanation
   - Safety controls and limits

3. **API Documentation**
   - WebSocket API reference
   - Message types and payloads
   - Error handling

4. **Integrations**
   - GitHub integration setup
   - Slack/Discord webhook configuration
   - Custom webhooks

5. **Architecture**
   - System overview
   - Component structure
   - Data flow

6. **Troubleshooting**
   - Common issues and solutions
   - Debugging tips
   - Log locations

---

## VERIFICATION STEPS

After completing each phase, run these checks:

1. **TypeScript Check**
   ```bash
   cd RalphWiggumV2/dashboard
   npx tsc --noEmit
   ```

2. **Linting**
   ```bash
   npm run lint
   ```

3. **Build Test**
   ```bash
   npm run build
   ```

4. **Dev Server Test**
   ```bash
   npm run dev
   # Verify app runs without errors
   ```

5. **Test Suite** (after Phase 3)
   ```bash
   npm run test
   npm run test:e2e
   ```

---

## KEY FILES TO REFERENCE

- `RalphWiggumV2/dashboard/server/index.ts` - Main server file
- `RalphWiggumV2/dashboard/server/lib/*.ts` - Existing logger/metrics/alerts
- `RalphWiggumV2/dashboard/package.json` - Dependencies and scripts
- `remaining.md` - Complete task breakdown

---

## IMPORTANT NOTES

1. **Read First**: Always read `/remaining.md` before starting work
2. **Order Matters**: Complete phases in the specified order
3. **Don't Recreate**: Phase 4 logger/metrics/alerts already exist - integrate them, don't recreate
4. **Test After Each Phase**: Run verification steps after each phase
5. **Commit Frequently**: Commit after completing each phase
6. **Ask if Stuck**: If unclear on requirements, ask for clarification

---

## SUCCESS CRITERIA

- ✅ Phase 4: Logger/metrics integrated, Sentry added, alerts working
- ✅ Phase 3: Test suite runs, 70%+ coverage, E2E tests pass
- ✅ Phase 5: All integrations functional, UI components working
- ✅ Phase 7: Lighthouse accessibility score 90+, keyboard navigation works
- ✅ Phase 6: Documentation site builds, all pages complete

## Completion Promise

When ALL phases are complete, output:

```
<promise>PHASES_3-7_COMPLETE</promise>
```

## Ralph Loop Instructions

1. **Read First**: Read `/remaining.md` and existing code to understand current state
2. **Work Iteratively**: 
   - Make changes
   - Run verification steps
   - Fix any failures
   - Commit progress
   - Repeat until phase complete
3. **Self-Correct**: 
   - Read test output to understand failures
   - Check git history to see what was tried
   - Use TypeScript errors to guide fixes
   - Let failures inform next iteration
4. **Verify After Each Phase**: Run all verification steps before moving to next phase
5. **Commit Frequently**: Commit after completing each phase or significant milestone

---

**Start with Phase 4 completion, then proceed through phases 3, 5, 7, and 6 in order.**

**Output `<promise>PHASES_3-7_COMPLETE</promise>` when all phases are done.**
