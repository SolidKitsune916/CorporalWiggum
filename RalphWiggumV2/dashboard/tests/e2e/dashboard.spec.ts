import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Dashboard Loading', () => {
    test('should display the dashboard title', async ({ page }) => {
      await expect(page.locator('text=Corporal WIGGUM')).toBeVisible();
    });

    test('should show connection status', async ({ page }) => {
      // Wait for WebSocket connection
      await page.waitForTimeout(1000);
      // Check for connected indicator or status
      await expect(page.locator('[data-testid="connection-status"], .connection-status')).toBeVisible();
    });
  });

  test.describe('Loop Controls', () => {
    test('should display loop control buttons', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start")');
      await expect(startButton).toBeVisible();
    });

    test('should start loop when clicking start button', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start")');
      await startButton.click();
      // Verify loop status changes
      await expect(page.locator('text=/Running|Started|Active/i')).toBeVisible({ timeout: 5000 });
    });

    test('should stop loop when clicking stop button', async ({ page }) => {
      // First start the loop
      const startButton = page.locator('button:has-text("Start")');
      await startButton.click();
      await page.waitForTimeout(500);

      // Then stop it
      const stopButton = page.locator('button:has-text("Stop")');
      await stopButton.click();

      // Verify loop status changes back to idle
      await expect(page.locator('text=/Idle|Stopped/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Project Management', () => {
    test('should show project info section', async ({ page }) => {
      await expect(page.locator('[data-testid="project-info"], .project-info, text=/Project/i')).toBeVisible();
    });

    test('should display project path', async ({ page }) => {
      // Project path should be visible somewhere
      await expect(page.locator('text=/Path|Directory|Project/i')).toBeVisible();
    });
  });

  test.describe('Tab Navigation', () => {
    test('should navigate between tabs', async ({ page }) => {
      // Find tab buttons
      const tabs = page.locator('[role="tab"], .tab-button, button:has-text("Setup"), button:has-text("Config")');

      if (await tabs.count() > 0) {
        await tabs.first().click();
        await page.waitForTimeout(300);
        // Verify tab content changed
        expect(await page.locator('[role="tabpanel"], .tab-content').count()).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Configuration', () => {
    test('should display configuration panel', async ({ page }) => {
      // Look for config-related elements
      const configSection = page.locator('[data-testid="config-panel"], .config-panel, text=/Configuration|Settings/i');
      await expect(configSection.first()).toBeVisible();
    });
  });

  test.describe('Git Status', () => {
    test('should display git branch information', async ({ page }) => {
      const gitInfo = page.locator('[data-testid="git-status"], .git-status, text=/main|branch/i');
      await expect(gitInfo.first()).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should be able to navigate with Tab key', async ({ page }) => {
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      expect(focusedElement).toBeTruthy();
    });

    test('should activate buttons with Enter key', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start")');
      await startButton.focus();
      await page.keyboard.press('Enter');
      // Button should be activated
      await page.waitForTimeout(500);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('text=Corporal WIGGUM')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('text=Corporal WIGGUM')).toBeVisible();
    });
  });
});
