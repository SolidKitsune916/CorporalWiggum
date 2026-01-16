/**
 * Backend Sentry Integration for WIGGUM
 *
 * Initializes Sentry for error tracking and performance monitoring
 * in the Node.js backend.
 */

import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

interface SentryConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  enabled?: boolean;
}

let isInitialized = false;

/**
 * Initialize Sentry for the backend
 */
export function initSentry(config: SentryConfig = {}): void {
  if (isInitialized) {
    logger.warn('Sentry is already initialized');
    return;
  }

  const dsn = config.dsn || process.env.SENTRY_DSN;

  // Skip initialization if no DSN is configured
  if (!dsn) {
    logger.info('Sentry DSN not configured, skipping initialization');
    return;
  }

  const enabled = config.enabled ?? process.env.NODE_ENV === 'production';

  if (!enabled) {
    logger.info('Sentry is disabled in development');
    return;
  }

  Sentry.init({
    dsn,
    environment: config.environment || process.env.NODE_ENV || 'development',
    release: config.release || process.env.APP_VERSION || '0.0.0',
    tracesSampleRate: config.tracesSampleRate ?? 0.1,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });

  isInitialized = true;
  logger.info('Sentry initialized');
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
 * Express error handler middleware
 */
export function sentryErrorHandler(): ReturnType<typeof Sentry.expressErrorHandler> {
  return Sentry.expressErrorHandler();
}

/**
 * Express request handler middleware
 */
export function sentryRequestHandler(): ReturnType<typeof Sentry.expressIntegration> {
  return Sentry.expressIntegration();
}

/**
 * Flush pending events before shutdown
 */
export async function flush(timeout: number = 2000): Promise<boolean> {
  return Sentry.flush(timeout);
}

export default {
  init: initSentry,
  captureError,
  captureMessage,
  setUser,
  addBreadcrumb,
  setTag,
  sentryErrorHandler,
  sentryRequestHandler,
  flush,
};
