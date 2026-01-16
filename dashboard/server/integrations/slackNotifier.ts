/**
 * Slack Notifier for WIGGUM
 *
 * Sends notifications to Slack via incoming webhooks.
 */

import { logger } from '../lib/logger.js';

export interface SlackMessage {
  title: string;
  message: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: '#36a64f',      // green
  success: '#2eb886',   // teal
  warning: '#f2c744',   // yellow
  error: '#cc0066',     // red
};

const SEVERITY_EMOJIS: Record<string, string> = {
  info: ':information_source:',
  success: ':white_check_mark:',
  warning: ':warning:',
  error: ':x:',
};

class SlackNotifier {
  private webhookUrl: string | null = null;

  /**
   * Set the Slack webhook URL
   */
  setWebhookUrl(url: string): void {
    this.webhookUrl = url;
    logger.info('Slack webhook URL configured');
  }

  /**
   * Check if Slack is configured
   */
  isConfigured(): boolean {
    return this.webhookUrl !== null;
  }

  /**
   * Send a message to Slack
   */
  async send(message: SlackMessage): Promise<void> {
    if (!this.webhookUrl) {
      logger.warn('Slack webhook URL not configured');
      return;
    }

    const { title, message: text, severity = 'info', metadata = {}, timestamp = new Date() } = message;

    const payload = {
      attachments: [
        {
          color: SEVERITY_COLORS[severity],
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${SEVERITY_EMOJIS[severity]} ${title}`,
                emoji: true,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text,
              },
            },
            ...(Object.keys(metadata).length > 0
              ? [
                  {
                    type: 'section',
                    fields: Object.entries(metadata)
                      .slice(0, 10)
                      .map(([key, value]) => ({
                        type: 'mrkdwn',
                        text: `*${key}:* ${typeof value === 'object' ? JSON.stringify(value) : value}`,
                      })),
                  },
                ]
              : []),
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `Corporal WIGGUM | ${timestamp.toISOString()}`,
                },
              ],
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack API error: ${response.status} - ${errorText}`);
      }

      logger.debug('Slack notification sent', { title });
    } catch (err) {
      logger.error('Failed to send Slack notification', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }
  }

  /**
   * Send a simple text message
   */
  async sendText(text: string): Promise<void> {
    if (!this.webhookUrl) {
      logger.warn('Slack webhook URL not configured');
      return;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
    } catch (err) {
      logger.error('Failed to send Slack text', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }
  }
}

// Singleton instance
export const slackNotifier = new SlackNotifier();
export default slackNotifier;
