# Breaking Changes Log

This file documents issues found during codebase review that were NOT fixed because they require architectural changes, could affect other functionality, or might be breaking changes.

## React setState in useEffect Anti-patterns

These components use the `setState` pattern synchronously within `useEffect`, which can cause cascading renders. Fixing these requires refactoring the component architecture.

### 1. PRDQuestionList.tsx (Line 58)
- **Issue**: `setAnswers({})` and `setSubmitted(false)` called in useEffect when questions change
- **Affected files**: `dashboard/src/components/PRDQuestionList.tsx`
- **Why skipped**: This resets form state when questions change. Refactoring would require changing how the component manages its state lifecycle.
- **Suggested fix**: Use a key prop to reset the component when questions change, or derive initial state from questions

### 2. StoriesGenerator.tsx (Line 58)
- **Issue**: `setEditedStories(complete)` called in useEffect when complete changes
- **Affected files**: `dashboard/src/components/StoriesGenerator.tsx`
- **Why skipped**: This syncs edited stories with generated stories. Could affect the editing workflow.
- **Suggested fix**: Use `useMemo` or lift state management to parent component

### 3. LauncherHome.tsx (Line 63)
- **Issue**: `setSuccessMessage()` called in useEffect when init result changes
- **Affected files**: `dashboard/src/components/launcher/LauncherHome.tsx`
- **Why skipped**: This shows success messages after project initialization. Changing could affect UX flow.
- **Suggested fix**: Move success message handling to the initialization callback

### 4. ExternalReposConfig.tsx (Line 125)
- **Issue**: `setDialog()` called in useEffect when URL validation completes
- **Affected files**: `dashboard/src/components/setup/ExternalReposConfig.tsx`
- **Why skipped**: This updates dialog state based on async validation. Requires refactoring async flow.
- **Suggested fix**: Handle validation result in the callback rather than via effect

### 5. OnboardingWizard.tsx (Lines 66, 79)
- **Issue**: `setCommands()` and `setStep()` called in useEffect
- **Affected files**: `dashboard/src/components/setup/OnboardingWizard.tsx`
- **Why skipped**: These sync wizard state with external scan results. Changing could break wizard flow.
- **Suggested fix**: Derive commands from projectScan, use controlled step pattern

### 6. status-badge.tsx (Line 39)
- **Issue**: `setVisible(true)` called in useEffect when status changes
- **Affected files**: `dashboard/src/components/ui/status-badge.tsx`
- **Why skipped**: UI component used across the app. Changes could have wide impact.
- **Suggested fix**: Use CSS transitions instead of state-based visibility, or derive visibility from status

## Fast Refresh / Hot Module Reload Issues

These files export both components and non-component values, which breaks React Fast Refresh in development. Not fixing as these are shadcn/ui components following their standard patterns.

### Files affected:
- `dashboard/src/components/AccessibilityProvider.tsx` (exports context and hook)
- `dashboard/src/components/ui/badge.tsx` (exports badgeVariants)
- `dashboard/src/components/ui/button.tsx` (exports buttonVariants)
- `dashboard/src/components/ui/status-badge.tsx` (exports statusBadgeVariants)

**Why skipped**: These follow shadcn/ui patterns. Changing would require restructuring the component library approach.

## Missing Hook Dependencies

### useWebSocket.ts (Line 979)
- **Issue**: Initially reported as `useCallback` missing `loopStatus.running` dependency
- **Status**: **FALSE POSITIVE** - `loopStatus.running` is not referenced in useWebSocket.ts
- **Resolution**: No action needed. ESLint passes with no react-hooks/exhaustive-deps warnings

## npm Audit Vulnerabilities (Moderate Severity)

### esbuild <=0.24.2
- **Issue**: Development server can be exploited to make requests and read responses (GHSA-67mh-4wv8-2f99)
- **Affected packages**: vite-node, vitepress, vitest (7 moderate severity vulnerabilities total)
- **Why skipped**: Fix requires `npm audit fix --force` which would downgrade vitepress from 1.x to 0.1.1 (breaking change)
- **Impact**: Development environment only - not exploitable in production builds
- **Suggested fix**: Wait for upstream packages to release compatible fixes

---

*Last updated: 2026-01-19*
