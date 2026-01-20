/**
 * Webhook utility for CLI commands
 *
 * Sends webhook notifications on loop events.
 * Compatible with existing WebhookPayload format from dashboard.
 */

/**
 * Webhook payload for loop events
 * Matches dashboard WebhookPayload structure
 */
export interface LoopWebhookPayload {
  event: 'loop:complete' | 'loop:stopped' | 'loop:crashed';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string;
  metadata: {
    projectId: string;
    projectPath?: string;
    sessionId?: string;
    mode?: string;
    durationSeconds?: number;
    iterations?: number;
    cost?: number;
    signal?: string; // Completion signal (ALL_TASKS_COMPLETE, etc)
    exitReason?: string; // 'signal' | 'user_stop' | 'crash'
  };
}

/**
 * Get webhook configuration from environment
 */
function getWebhookConfig(): {
  urls: string[];
  headers?: Record<string, string>;
} {
  const urls: string[] = [];

  // Single URL
  const singleUrl = process.env.RALPH_WEBHOOK_URL;
  if (singleUrl) {
    urls.push(singleUrl);
  }

  // Multiple URLs (comma-separated)
  const multiUrls = process.env.RALPH_WEBHOOK_URLS;
  if (multiUrls) {
    urls.push(...multiUrls.split(',').map((u) => u.trim()).filter(Boolean));
  }

  // Optional auth header
  const auth = process.env.RALPH_WEBHOOK_AUTH;
  let headers: Record<string, string> | undefined;
  if (auth) {
    headers = { Authorization: auth };
  }

  // Optional custom headers (JSON)
  const headersJson = process.env.RALPH_WEBHOOK_HEADERS;
  if (headersJson) {
    try {
      headers = { ...headers, ...JSON.parse(headersJson) };
    } catch {
      // Ignore invalid JSON
    }
  }

  return { urls, headers };
}

/**
 * Validate a webhook URL
 */
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Send a single webhook with retry
 */
export async function sendWebhook(
  url: string,
  payload: LoopWebhookPayload,
  options?: {
    timeout?: number;
    retries?: number;
    headers?: Record<string, string>;
  }
): Promise<boolean> {
  const timeout = options?.timeout ?? 5000;
  const retries = options?.retries ?? 3;

  if (!isValidWebhookUrl(url)) {
    console.error(`Invalid webhook URL: ${url}`);
    return false;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Ralph-CLI/3.0.0',
          'X-Ralph-Event': payload.event,
          'X-Ralph-Event-Id': `${payload.metadata.sessionId || 'unknown'}-${payload.event}`,
          ...options?.headers,
        },
        body: JSON.stringify({
          source: 'ralph-cli',
          ...payload,
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (response.ok) {
        return true;
      }

      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        console.error(`Webhook rejected: HTTP ${response.status}`);
        return false;
      }

      // Retry server errors (5xx)
    } catch (err) {
      // Last attempt failed
      if (attempt === retries - 1) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Webhook failed after ${retries} attempts: ${message}`);
        return false;
      }

      // Exponential backoff: 1s, 2s, 4s
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  return false;
}

/**
 * Broadcast payload to all configured webhooks
 * Fire-and-forget: doesn't block, logs failures
 */
export async function broadcastWebhooks(payload: LoopWebhookPayload): Promise<void> {
  const config = getWebhookConfig();

  if (config.urls.length === 0) {
    return; // No webhooks configured
  }

  // Fire and forget - don't await all
  Promise.allSettled(config.urls.map((url) => sendWebhook(url, payload, { headers: config.headers })))
    .then((results) => {
      const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
      const failed = results.length - sent;
      if (failed > 0) {
        console.error(`Webhooks: ${sent} sent, ${failed} failed`);
      }
    })
    .catch(() => {
      // Ignore broadcast errors
    });
}

/**
 * Create a webhook payload for loop completion
 */
export function createCompletionPayload(params: {
  projectId: string;
  projectPath?: string;
  sessionId?: string;
  mode?: string;
  durationSeconds?: number;
  signal: string;
}): LoopWebhookPayload {
  return {
    event: 'loop:complete',
    title: 'Loop Completed',
    message: `Loop for ${params.projectId} completed with signal: ${params.signal}`,
    severity: 'info',
    timestamp: new Date().toISOString(),
    metadata: {
      projectId: params.projectId,
      projectPath: params.projectPath,
      sessionId: params.sessionId,
      mode: params.mode,
      durationSeconds: params.durationSeconds,
      signal: params.signal,
      exitReason: 'signal',
    },
  };
}

/**
 * Create a webhook payload for loop stop (user-initiated)
 */
export function createStoppedPayload(params: {
  projectId: string;
  projectPath?: string;
  sessionId?: string;
  mode?: string;
  durationSeconds?: number;
}): LoopWebhookPayload {
  return {
    event: 'loop:stopped',
    title: 'Loop Stopped',
    message: `Loop for ${params.projectId} was stopped by user`,
    severity: 'info',
    timestamp: new Date().toISOString(),
    metadata: {
      projectId: params.projectId,
      projectPath: params.projectPath,
      sessionId: params.sessionId,
      mode: params.mode,
      durationSeconds: params.durationSeconds,
      exitReason: 'user_stop',
    },
  };
}

/**
 * Create a webhook payload for loop crash
 */
export function createCrashedPayload(params: {
  projectId: string;
  projectPath?: string;
  sessionId?: string;
  mode?: string;
  durationSeconds?: number;
  error?: string;
}): LoopWebhookPayload {
  return {
    event: 'loop:crashed',
    title: 'Loop Crashed',
    message: `Loop for ${params.projectId} crashed unexpectedly`,
    severity: 'error',
    timestamp: new Date().toISOString(),
    metadata: {
      projectId: params.projectId,
      projectPath: params.projectPath,
      sessionId: params.sessionId,
      mode: params.mode,
      durationSeconds: params.durationSeconds,
      exitReason: 'crash',
    },
  };
}
