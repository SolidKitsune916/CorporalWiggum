/**
 * Webhook Manager for WIGGUM
 *
 * Manages generic webhook endpoints for custom integrations.
 */

import { logger } from '../lib/logger.js';

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  enabled: boolean;
  events?: string[];
  createdAt: Date;
}

export interface WebhookPayload {
  event: string;
  title: string;
  message: string;
  severity: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

class WebhookManager {
  private webhooks: Map<string, WebhookConfig> = new Map();

  /**
   * Add a new webhook
   */
  addWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt'>): WebhookConfig {
    const id = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const webhook: WebhookConfig = {
      ...config,
      id,
      createdAt: new Date(),
    };
    this.webhooks.set(id, webhook);
    logger.info('Webhook added', { id, name: config.name });
    return webhook;
  }

  /**
   * Remove a webhook
   */
  removeWebhook(id: string): boolean {
    const deleted = this.webhooks.delete(id);
    if (deleted) {
      logger.info('Webhook removed', { id });
    }
    return deleted;
  }

  /**
   * Update a webhook
   */
  updateWebhook(id: string, updates: Partial<Omit<WebhookConfig, 'id' | 'createdAt'>>): WebhookConfig | null {
    const webhook = this.webhooks.get(id);
    if (!webhook) return null;

    const updated: WebhookConfig = {
      ...webhook,
      ...updates,
    };
    this.webhooks.set(id, updated);
    logger.info('Webhook updated', { id });
    return updated;
  }

  /**
   * Get a webhook by ID
   */
  getWebhook(id: string): WebhookConfig | undefined {
    return this.webhooks.get(id);
  }

  /**
   * List all webhooks
   */
  listWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Enable/disable a webhook
   */
  setEnabled(id: string, enabled: boolean): boolean {
    const webhook = this.webhooks.get(id);
    if (!webhook) return false;

    webhook.enabled = enabled;
    this.webhooks.set(id, webhook);
    logger.info('Webhook status changed', { id, enabled });
    return true;
  }

  /**
   * Send payload to a specific webhook
   */
  async send(id: string, payload: WebhookPayload): Promise<boolean> {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      logger.warn('Webhook not found', { id });
      return false;
    }

    if (!webhook.enabled) {
      logger.debug('Webhook is disabled', { id });
      return false;
    }

    // Check if webhook should receive this event
    if (webhook.events && webhook.events.length > 0 && !webhook.events.includes(payload.event)) {
      logger.debug('Webhook does not subscribe to event', { id, event: payload.event });
      return false;
    }

    try {
      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WIGGUM/1.0',
          ...webhook.headers,
        },
        body: JSON.stringify({
          source: 'wiggum',
          ...payload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      logger.debug('Webhook sent successfully', { id, event: payload.event });
      return true;
    } catch (err) {
      logger.error('Failed to send webhook', {
        id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Broadcast payload to all enabled webhooks
   */
  async broadcast(payload: WebhookPayload): Promise<{ sent: number; failed: number }> {
    const results = await Promise.allSettled(
      Array.from(this.webhooks.keys()).map((id) => this.send(id, payload))
    );

    const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - sent;

    logger.debug('Webhook broadcast completed', { sent, failed, event: payload.event });
    return { sent, failed };
  }

  /**
   * Test a webhook with a test payload
   */
  async testWebhook(id: string): Promise<{ success: boolean; error?: string }> {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const testPayload: WebhookPayload = {
      event: 'test',
      title: 'Webhook Test',
      message: 'This is a test message from Corporal WIGGUM',
      severity: 'info',
      metadata: { test: true },
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WIGGUM/1.0',
          ...webhook.headers,
        },
        body: JSON.stringify({
          source: 'wiggum',
          ...testPayload,
        }),
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Import webhooks from config
   */
  importWebhooks(configs: Array<Omit<WebhookConfig, 'id' | 'createdAt'>>): void {
    configs.forEach((config) => {
      this.addWebhook(config);
    });
    logger.info('Webhooks imported', { count: configs.length });
  }

  /**
   * Export webhooks config
   */
  exportWebhooks(): Array<Omit<WebhookConfig, 'createdAt'>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructuring to omit createdAt
    return Array.from(this.webhooks.values()).map(({ createdAt: _createdAt, ...rest }) => rest);
  }

  /**
   * Clear all webhooks
   */
  clear(): void {
    this.webhooks.clear();
    logger.info('All webhooks cleared');
  }
}

// Singleton instance
export const webhookManager = new WebhookManager();
export default webhookManager;
