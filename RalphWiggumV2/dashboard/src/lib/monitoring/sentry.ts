/**
 * Frontend Sentry Integration for WIGGUM
 *
 * Initializes Sentry for error tracking and performance monitoring
 * in the React frontend.
 */

import * as Sentry from '@sentry/react';

interface SentryConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  enabled?: boolean;
}

let isInitialized = false;

/**
 * Initialize Sentry for the frontend
 */
export function initSentry(config: SentryConfig = {}): void {
  if (isInitialized) {
    console.warn('Sentry is already initialized');
    return;
  }

  const dsn = config.dsn || import.meta.env.VITE_SENTRY_DSN;

  // Skip initialization if no DSN is configured
  if (!dsn) {
    console.info('Sentry DSN not configured, skipping initialization');
    return;
  }

  const enabled = config.enabled ?? import.meta.env.PROD;

  if (!enabled) {
    console.info('Sentry is disabled in development');
    return;
  }

  Sentry.init({
    dsn,
    environment: config.environment || import.meta.env.MODE || 'development',
    release: config.release || import.meta.env.VITE_APP_VERSION || '0.0.0',
    tracesSampleRate: config.tracesSampleRate ?? 0.1,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });

  isInitialized = true;
  console.info('Sentry initialized');
}

/**
 * Capture an error in Sentry
 */
export function captureError(error: Error, context?: Record<string, unknown>): string {
  if (context) {
    Sentry.setContext('additional', context);
  }
  return Sentry.captureException(error);
}

/**
 * Capture a message in Sentry
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info'
): string {
  return Sentry.captureMessage(message, level);
}

/**
 * Set user context for Sentry
 */
export function setUser(user: { id?: string; email?: string; username?: string } | null): void {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set a tag for all events
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({ name, op });
}

/**
 * Get the Sentry error boundary component for React
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * HOC to wrap components with Sentry error boundary
 */
export const withErrorBoundary = Sentry.withErrorBoundary;

export default {
  init: initSentry,
  captureError,
  captureMessage,
  setUser,
  addBreadcrumb,
  setTag,
  startTransaction,
  ErrorBoundary,
  withErrorBoundary,
};
