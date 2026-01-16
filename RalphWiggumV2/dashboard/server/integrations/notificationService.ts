/**
 * Notification Service for WIGGUM
 *
 * Central event dispatcher for sending notifications to various channels.
 * Supports Slack, Discord, and generic webhooks.
 */

import { EventEmitter } from 'events';
import { logger } from '../lib/logger.js';
import { slackNotifier } from './slackNotifier.js';
import { discordNotifier } from './discordNotifier.js';
import { webhookManager } from './webhookManager.js';

export type NotificationEvent =
  | 'loop:started'
  | 'loop:completed'
  | 'loop:error'
  | 'loop:iteration'
  | 'review:completed'
  | 'plan:generated'
  | 'prd:generated';

export interface NotificationPayload {
  event: NotificationEvent;
  title: string;
  message: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface NotificationConfig {
  slack: {
    enabled: boolean;
    webhookUrl?: string;
    events: NotificationEvent[];
  };
  discord: {
    enabled: boolean;
    webhookUrl?: string;
    events: NotificationEvent[];
  };
  webhooks: {
    enabled: boolean;
    events: NotificationEvent[];
  };
}

class NotificationService extends EventEmitter {
  private config: NotificationConfig = {
    slack: {
      enabled: false,
      events: ['loop:started', 'loop:completed', 'loop:error'],
    },
    discord: {
      enabled: false,
      events: ['loop:started', 'loop:completed', 'loop:error'],
    },
    webhooks: {
      enabled: false,
      events: ['loop:started', 'loop:completed', 'loop:error'],
    },
  };

  /**
   * Configure notification channels
   */
  configure(config: Partial<NotificationConfig>): void {
    if (config.slack) {
      this.config.slack = { ...this.config.slack, ...config.slack };
      if (config.slack.webhookUrl) {
        slackNotifier.setWebhookUrl(config.slack.webhookUrl);
      }
    }
    if (config.discord) {
      this.config.discord = { ...this.config.discord, ...config.discord };
      if (config.discord.webhookUrl) {
        discordNotifier.setWebhookUrl(config.discord.webhookUrl);
      }
    }
    if (config.webhooks) {
      this.config.webhooks = { ...this.config.webhooks, ...config.webhooks };
    }
    logger.info('Notification service configured', { config: this.config });
  }

  /**
   * Get current configuration
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Send a notification to all enabled channels
   */
  async send(payload: NotificationPayload): Promise<void> {
    const { event, title, message, severity = 'info', metadata = {}, timestamp = new Date() } = payload;

    logger.debug('Sending notification', { event, title });
    this.emit('notification', payload);

    const promises: Promise<void>[] = [];

    // Send to Slack
    if (this.config.slack.enabled && this.config.slack.events.includes(event)) {
      promises.push(
        slackNotifier.send({ title, message, severity, metadata, timestamp })
          .catch((err) => {
            logger.error('Failed to send Slack notification', { error: err.message });
          })
      );
    }

    // Send to Discord
    if (this.config.discord.enabled && this.config.discord.events.includes(event)) {
      promises.push(
        discordNotifier.send({ title, message, severity, metadata, timestamp })
          .catch((err) => {
            logger.error('Failed to send Discord notification', { error: err.message });
          })
      );
    }

    // Send to generic webhooks
    if (this.config.webhooks.enabled && this.config.webhooks.events.includes(event)) {
      promises.push(
        webhookManager.broadcast({
          event,
          title,
          message,
          severity,
          metadata,
          timestamp: timestamp.toISOString(),
        })
          .catch((err) => {
            logger.error('Failed to send webhook notification', { error: err.message });
          })
      );
    }

    await Promise.allSettled(promises);
  }

  /**
   * Send loop started notification
   */
  async notifyLoopStarted(mode: string, projectPath: string): Promise<void> {
    await this.send({
      event: 'loop:started',
      title: 'Ralph Loop Started',
      message: `Loop started in ${mode} mode`,
      severity: 'info',
      metadata: { mode, projectPath },
    });
  }

  /**
   * Send loop completed notification
   */
  async notifyLoopCompleted(iterations: number, duration: number): Promise<void> {
    await this.send({
      event: 'loop:completed',
      title: 'Ralph Loop Completed',
      message: `Loop completed after ${iterations} iterations`,
      severity: 'success',
      metadata: { iterations, durationMs: duration },
    });
  }

  /**
   * Send loop error notification
   */
  async notifyLoopError(error: string, iteration?: number): Promise<void> {
    await this.send({
      event: 'loop:error',
      title: 'Ralph Loop Error',
      message: error,
      severity: 'error',
      metadata: { iteration },
    });
  }

  /**
   * Send review completed notification
   */
  async notifyReviewCompleted(score: number, summary: string): Promise<void> {
    await this.send({
      event: 'review:completed',
      title: 'Review Completed',
      message: summary,
      severity: score >= 70 ? 'success' : 'warning',
      metadata: { score },
    });
  }

  /**
   * Send plan generated notification
   */
  async notifyPlanGenerated(planPath: string): Promise<void> {
    await this.send({
      event: 'plan:generated',
      title: 'Implementation Plan Generated',
      message: `Plan saved to ${planPath}`,
      severity: 'success',
      metadata: { planPath },
    });
  }
}

// Singleton instance
export const notificationService = new NotificationService();
export default notificationService;
