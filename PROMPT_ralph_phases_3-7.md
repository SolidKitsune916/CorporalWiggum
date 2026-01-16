# Ralph Loop: Complete Phases 3-7 of Corporal WIGGUM

Complete the remaining phases of **Corporal WIGGUM, R.A.L.P.H.** development. Work iteratively, using failures as data to guide improvements.

## Current Status: ~55% Complete

- ✅ Phase 1 (SQLite Database): COMPLETE
- ✅ Phase 2 (Branding): COMPLETE  
- 🔴 Phase 3 (Testing): NOT STARTED
- 🟡 Phase 4 (Monitoring): 60% COMPLETE
- 🔴 Phase 5 (Integrations): NOT STARTED
- 🔴 Phase 6 (Documentation): NOT STARTED
- 🔴 Phase 7 (Accessibility): NOT STARTED

## Context

Read `/remaining.md` for complete breakdown. Project location: `RalphWiggumV2/dashboard/`.

## Execution Order (Complete Sequentially)

1. **Phase 4 Completion** → 2. **Phase 3** → 3. **Phase 5** → 4. **Phase 7** → 5. **Phase 6**

---

## PHASE 4 COMPLETION (40% remaining)

**Already exist (DO NOT RECREATE):**
- `dashboard/server/lib/logger.ts`
- `dashboard/server/lib/metrics.ts`
- `dashboard/server/lib/alerts.ts`

**Tasks:**
1. Create `dashboard/src/lib/monitoring/sentry.ts` - Frontend Sentry init
2. Create `dashboard/server/lib/sentry.ts` - Backend Sentry init
3. Integrate logger into `server/index.ts` (replace console.log/error/warn)
4. Integrate metrics into WebSocket handlers (track message counts, errors, timing)
5. Add alert triggers for critical errors
6. Add dependencies: `@sentry/react`, `@sentry/node`

**Verification:**
- `npx tsc --noEmit` passes
- `npm run build` succeeds
- `npm run dev` runs without errors
- Logger output visible in console

---

## PHASE 3: TESTING (100% remaining)

**Create:**
- `dashboard/vitest.config.ts` - React testing, 70% coverage threshold
- `dashboard/playwright.config.ts` - E2E config, base URL localhost:5173
- `dashboard/setupTests.ts` - Testing-library + MSW setup
- `dashboard/tests/e2e/dashboard.spec.ts` - Critical flows (start/stop loop, project mgmt)
- `dashboard/tests/integration/ws-handlers.test.ts` - All WebSocket message types
- `.github/workflows/test.yml` - CI workflow

**Dependencies:**
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

**Verification:**
- `npm run test` passes
- `npm run test:e2e` passes
- Coverage ≥70% for unit tests
- All WebSocket handlers tested

---

## PHASE 5: INTEGRATIONS (100% remaining)

**Create:**
- `dashboard/server/integrations/githubService.ts` - Use `gh` CLI
- `dashboard/server/integrations/notificationService.ts` - Event dispatcher
- `dashboard/server/integrations/slackNotifier.ts` - Webhook-based
- `dashboard/server/integrations/discordNotifier.ts` - Webhook-based
- `dashboard/server/integrations/webhookManager.ts` - Generic webhook dispatcher
- `dashboard/src/components/GitHubPanel.tsx` - PR/issue UI
- `dashboard/src/components/setup/NotificationSettings.tsx` - Config UI
- `dashboard/src/components/setup/WebhookManager.tsx` - Webhook config UI

**Events:** `loop:started`, `loop:completed`, `loop:error`

**Verification:**
- GitHub service works with `gh` CLI
- Notifications send to Slack/Discord
- UI components functional
- Webhooks configurable via UI

---

## PHASE 7: ACCESSIBILITY (100% remaining)

**Tasks:**
1. Add `aria-live` regions for status updates
2. Ensure all icon buttons have `aria-label`
3. Verify focus indicators (cyan ring) on all interactive elements
4. Add skip-to-content link
5. Verify color contrast ≥4.5:1 (obsidian bg + cyan/white text)
6. Test keyboard-only navigation
7. Test with VoiceOver/NVDA

**Verification:**
- Lighthouse accessibility score ≥90
- All interactive elements keyboard accessible
- Screen reader announces content correctly

---

## PHASE 6: DOCUMENTATION (100% remaining)

**Create VitePress site:**
```
RalphWiggumV2/docs/
├── .vitepress/config.ts
├── index.md
├── getting-started/ (installation, quickstart, first-loop)
├── user-guide/ (dashboard-overview, loop-modes, safety-controls)
├── api/ (websocket-api)
├── integrations/ (github, slack, webhooks)
├── architecture/ (overview)
└── troubleshooting/ (common-issues)
```

**Dependencies:** `vitepress: ^1.3.0`

**Scripts:**
```json
{
  "docs:dev": "vitepress dev docs",
  "docs:build": "vitepress build docs",
  "docs:preview": "vitepress preview docs"
}
```

**Verification:**
- `npm run docs:build` succeeds
- All pages render correctly
- Links work

---

## Iterative Workflow

**For each phase:**
1. Read existing code and `/remaining.md`
2. Implement changes
3. Run verification commands
4. Fix any failures (use errors as data)
5. Commit progress
6. Repeat until phase complete

**After each phase:**
- Run `npx tsc --noEmit`
- Run `npm run lint`
- Run `npm run build`
- Run `npm run dev` and verify
- Commit with message: "feat: Complete Phase X"

---

## Completion

When ALL phases (3-7) are complete:

```
<promise>PHASES_3-7_COMPLETE</promise>
```

**Final verification:**
- All phases complete
- All tests passing
- Build succeeds
- Documentation builds
- Accessibility score ≥90

---

**Start with Phase 4 completion. Work iteratively. Use failures to guide fixes. Output completion promise when done.**
