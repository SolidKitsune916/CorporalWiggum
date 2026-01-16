/**
 * Alerting Service for WIGGUM
 *
 * Manages alerts and notifications for important events.
 * Supports multiple notification channels (console, webhooks, etc.)
 */

import { logger } from './logger.js';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertChannel = 'console' | 'webhook' | 'slack' | 'discord';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  source: string;
  metadata?: Record<string, unknown>;
  acknowledged: boolean;
}

interface AlertChannelConfig {
  type: AlertChannel;
  enabled: boolean;
  config?: Record<string, string>;
}

interface WebhookPayload {
  alert: Alert;
  timestamp: string;
  source: string;
}

class AlertManager {
  private alerts: Alert[] = [];
  private channels: AlertChannelConfig[] = [
    { type: 'console', enabled: true },
  ];
  private maxAlerts = 100;

  /**
   * Send an alert
   */
  async send(
    title: string,
    message: string,
    severity: AlertSeverity,
    source: string,
    metadata?: Record<string, unknown>
  ): Promise<Alert> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      severity,
      timestamp: new Date(),
      source,
      metadata,
      acknowledged: false,
    };

    // Store alert
    this.alerts.unshift(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.pop();
    }

    // Send to all enabled channels
    await this.dispatch(alert);

    return alert;
  }

  /**
   * Send alert to all enabled channels
   */
  private async dispatch(alert: Alert): Promise<void> {
    for (const channel of this.channels) {
      if (!channel.enabled) continue;

      try {
        switch (channel.type) {
          case 'console':
            this.sendToConsole(alert);
            break;
          case 'webhook':
            if (channel.config?.url) {
              await this.sendToWebhook(alert, channel.config.url);
            }
            break;
          case 'slack':
            if (channel.config?.webhookUrl) {
              await this.sendToSlack(alert, channel.config.webhookUrl);
            }
            break;
          case 'discord':
            if (channel.config?.webhookUrl) {
              await this.sendToDiscord(alert, channel.config.webhookUrl);
            }
            break;
        }
      } catch (err) {
        logger.error('Failed to dispatch alert', {
          channel: channel.type,
          alertId: alert.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  private sendToConsole(alert: Alert): void {
    const prefix = {
      low: '\x1b[34m[LOW]\x1b[0m',
      medium: '\x1b[33m[MEDIUM]\x1b[0m',
      high: '\x1b[31m[HIGH]\x1b[0m',
      critical: '\x1b[35m[CRITICAL]\x1b[0m',
    };

    logger.warn(`${prefix[alert.severity]} ALERT: ${alert.title}`, {
      message: alert.message,
      source: alert.source,
      ...alert.metadata,
    });
  }

  private async sendToWebhook(alert: Alert, url: string): Promise<void> {
    const payload: WebhookPayload = {
      alert,
      timestamp: new Date().toISOString(),
      source: 'wiggum',
    };

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private async sendToSlack(alert: Alert, webhookUrl: string): Promise<void> {
    const colorMap = {
      low: '#36a64f',
      medium: '#f2c744',
      high: '#ff6b6b',
      critical: '#cc0066',
    };

    const payload = {
      attachments: [
        {
          color: colorMap[alert.severity],
          title: alert.title,
          text: alert.message,
          fields: [
            { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
            { title: 'Source', value: alert.source, short: true },
          ],
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private async sendToDiscord(alert: Alert, webhookUrl: string): Promise<void> {
    const colorMap = {
      low: 3447003,
      medium: 15844367,
      high: 15158332,
      critical: 10038562,
    };

    const payload = {
      embeds: [
        {
          title: alert.title,
          description: alert.message,
          color: colorMap[alert.severity],
          fields: [
            { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
            { name: 'Source', value: alert.source, inline: true },
          ],
          timestamp: alert.timestamp.toISOString(),
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Configure an alert channel
   */
  configureChannel(channel: AlertChannelConfig): void {
    const existing = this.channels.find((c) => c.type === channel.type);
    if (existing) {
      Object.assign(existing, channel);
    } else {
      this.channels.push(channel);
    }
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 10): Alert[] {
    return this.alerts.slice(0, limit);
  }

  /**
   * Acknowledge an alert
   */
  acknowledge(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Clear all alerts
   */
  clear(): void {
    this.alerts = [];
  }
}

// Singleton instance
export const alertManager = new AlertManager();

// Convenience functions
export function sendAlert(
  title: string,
  message: string,
  severity: AlertSeverity,
  source: string,
  metadata?: Record<string, unknown>
): Promise<Alert> {
  return alertManager.send(title, message, severity, source, metadata);
}

export default alertManager;
