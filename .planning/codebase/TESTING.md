# Testing Patterns

**Analysis Date:** 2026-01-19

## Test Framework

**Runner:**
- Vitest 2.x for unit/integration tests
- Config: `dashboard/vitest.config.ts`

**Assertion Library:**
- Vitest built-in assertions
- `@testing-library/jest-dom` for DOM matchers

**E2E Framework:**
- Playwright 1.45.x
- Config: `dashboard/playwright.config.ts`

**Run Commands:**
```bash
npm run test              # Run all unit tests once
npm run test:watch        # Watch mode
npm run test:coverage     # Run with coverage report
npm run test:e2e          # Run Playwright E2E tests
npm run test:e2e:ui       # Run Playwright with UI
```

## Test File Organization

**Location:**
- Unit tests: Co-located or in `tests/` directory (pattern configured but no tests exist yet)
- E2E tests: `dashboard/tests/e2e/` directory

**Naming:**
- Unit tests: `*.test.ts` or `*.spec.ts`
- Component tests: `*.test.tsx` or `*.spec.tsx`
- E2E tests: `*.spec.ts`

**Structure:**
```
dashboard/
├── src/
│   └── components/
│       └── Component.tsx
│       └── Component.test.tsx  (co-located, not yet created)
├── tests/
│   └── e2e/
│       └── dashboard.spec.ts   (E2E tests)
├── setupTests.ts               (Vitest setup file)
├── vitest.config.ts            (Unit test config)
└── playwright.config.ts        (E2E config)
```

## Test Structure

**Vitest Configuration:**
```typescript
// dashboard/vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**/*', 'node_modules/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**E2E Test Structure (Playwright):**
```typescript
// dashboard/tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Dashboard Loading', () => {
    test('should display the dashboard title', async ({ page }) => {
      await expect(page.locator('text=Corporal WIGGUM')).toBeVisible();
    });
  });
});
```

**Patterns:**
- Use `test.describe()` for grouping related tests
- Use `test.beforeEach()` for common setup
- Use descriptive test names: `should [action] when [condition]`

## Mocking

**Framework:** MSW (Mock Service Worker) 2.x

**Setup Pattern:**
```typescript
// dashboard/setupTests.ts
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse, ws } from 'msw';

// Define MSW handlers
export const handlers = [
  http.get('/api/status', () => {
    return HttpResponse.json({
      loop: { status: 'idle', iterations: 0, currentTask: null },
      tasks: [],
      git: { branch: 'main', status: 'clean', commits: [] },
      config: { hasPRD: false, hasAudience: false, hasAgents: false },
    });
  }),

  http.post('/api/loop/start', () => {
    return HttpResponse.json({ success: true });
  }),
];

// Create MSW server
export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());
```

**WebSocket Mocking:**
```typescript
// Mock WebSocket server for testing
const wsServer = ws.link('ws://localhost:3001/ws');

// WebSocket event handler
wsServer.addEventListener('connection', ({ client }) => {
  client.send(JSON.stringify({
    type: 'loop:status',
    payload: { status: 'idle', iterations: 0 },
  }));
});
```

**Browser API Mocks:**
```typescript
// Mock matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};
```

**What to Mock:**
- External HTTP API calls (use MSW)
- WebSocket connections (use MSW ws)
- Browser APIs not available in jsdom (matchMedia, ResizeObserver, IntersectionObserver)
- Time-dependent operations (use vi.useFakeTimers)

**What NOT to Mock:**
- Component rendering behavior
- React hooks (test their effects)
- State management logic (test actual state changes)
- CSS/styling (test via visual regression or E2E)

## Fixtures and Factories

**Test Data Approach:**
- Inline fixtures in handler responses
- No separate fixture files detected

**Example Pattern:**
```typescript
// Define test data inline in MSW handlers
http.get('/api/project-info', () => {
  return HttpResponse.json({
    targetProjectPath: '/test/project',
    ralphPath: '/test/ralph',
    mode: 'embedded',
    detectionReason: 'Test environment',
  });
});
```

**Location:**
- Test data: Inline in `setupTests.ts` or test files
- No separate fixtures directory

## Coverage

**Requirements:**
- Statements: 70%
- Branches: 70%
- Functions: 70%
- Lines: 70%

**View Coverage:**
```bash
npm run test:coverage
# Reports generated in: text, json, html formats
```

**Coverage Exclusions:**
```typescript
// From vitest.config.ts
exclude: [
  'node_modules/**',
  'dist/**',
  '**/*.d.ts',
  '**/*.config.*',
  '**/setupTests.ts',
  'tests/e2e/**',
],
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, hooks, utilities
- Isolation: Full mocking of external dependencies
- Speed: Fast (milliseconds)
- Location: `src/**/*.test.{ts,tsx}`
- Current state: Test infrastructure configured, tests not yet written

**Component Tests:**
- Scope: React components with Testing Library
- Approach: User-centric testing (what user sees/does)
- Mocking: MSW for API, mocked browser APIs
- Current state: Setup ready in `setupTests.ts`

**Integration Tests:**
- Scope: Multiple modules working together
- Approach: Test hook + component integration
- Current state: Not yet implemented

**E2E Tests:**
- Scope: Full application flows
- Framework: Playwright
- Browsers: Chromium, Firefox, WebKit
- Location: `dashboard/tests/e2e/`
- Current state: Basic tests exist at `dashboard/tests/e2e/dashboard.spec.ts`

## E2E Test Patterns

**Playwright Configuration:**
```typescript
// dashboard/playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

**E2E Test Examples:**
```typescript
// Test navigation
test('should navigate between tabs', async ({ page }) => {
  const tabs = page.locator('[role="tab"]');
  if (await tabs.count() > 0) {
    await tabs.first().click();
    await page.waitForTimeout(300);
    expect(await page.locator('[role="tabpanel"]').count()).toBeGreaterThan(0);
  }
});

// Test keyboard navigation
test('should be able to navigate with Tab key', async ({ page }) => {
  await page.keyboard.press('Tab');
  const focusedElement = await page.locator(':focus');
  expect(focusedElement).toBeTruthy();
});

// Test responsive design
test('should work on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator('text=Corporal WIGGUM')).toBeVisible();
});
```

**Selectors:**
- Prefer `data-testid` attributes: `page.locator('[data-testid="connection-status"]')`
- Text content: `page.locator('text=Corporal WIGGUM')`
- ARIA roles: `page.locator('[role="tab"]')`
- Button text: `page.locator('button:has-text("Start")')`

## Common Patterns

**Async Testing:**
```typescript
// Wait for element
await expect(page.locator('text=/Running|Started|Active/i')).toBeVisible({ timeout: 5000 });

// Wait for timeout (use sparingly)
await page.waitForTimeout(500);

// Wait for navigation
await page.goto('/');
```

**Error Testing:**
```typescript
// Test error states - pattern to implement
test('should show error when API fails', async () => {
  server.use(
    http.get('/api/status', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );
  // Test error handling
});
```

**Component Testing Pattern (to implement):**
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoopControls } from '@/components/LoopControls';

test('should call onStart when start button clicked', async () => {
  const onStart = vi.fn();
  const onStop = vi.fn();

  render(
    <LoopControls
      loopStatus={{ running: false, mode: null, iteration: 0, maxIterations: 0 }}
      onStart={onStart}
      onStop={onStop}
    />
  );

  const startButton = screen.getByRole('button', { name: /start/i });
  await userEvent.click(startButton);

  expect(onStart).toHaveBeenCalledWith(expect.objectContaining({
    mode: expect.any(String),
  }));
});
```

## Testing Gaps

**Current State:**
- Test infrastructure is fully configured
- `setupTests.ts` has comprehensive mocking setup
- E2E tests exist but are basic
- **No unit tests exist in `src/`**
- **No component tests written yet**

**Priority Areas for Testing:**
1. `useWebSocket` hook - critical state management
2. `useLauncher` hook - project management logic
3. UI components in `src/components/ui/`
4. Core features: `LoopControls`, `TaskList`, `Dashboard`

---

*Testing analysis: 2026-01-19*
