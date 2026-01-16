/**
 * Discord Notifier for WIGGUM
 *
 * Sends notifications to Discord via webhooks.
 */

import { logger } from '../lib/logger.js';

export interface DiscordMessage {
  title: string;
  message: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

const SEVERITY_COLORS: Record<string, number> = {
  info: 0x3498db,      // blue
  success: 0x2ecc71,   // green
  warning: 0xf39c12,   // orange
  error: 0xe74c3c,     // red
};

const SEVERITY_EMOJIS: Record<string, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

class DiscordNotifier {
  private webhookUrl: string | null = null;

  /**
   * Set the Discord webhook URL
   */
  setWebhookUrl(url: string): void {
    this.webhookUrl = url;
    logger.info('Discord webhook URL configured');
  }

  /**
   * Check if Discord is configured
   */
  isConfigured(): boolean {
    return this.webhookUrl !== null;
  }

  /**
   * Send a message to Discord
   */
  async send(message: DiscordMessage): Promise<void> {
    if (!this.webhookUrl) {
      logger.warn('Discord webhook URL not configured');
      return;
    }

    const { title, message: text, severity = 'info', metadata = {}, timestamp = new Date() } = message;

    const fields = Object.entries(metadata)
      .slice(0, 25) // Discord limit
      .map(([name, value]) => ({
        name,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        inline: true,
      }));

    const payload = {
      username: 'Corporal WIGGUM',
      avatar_url: 'https://raw.githubusercontent.com/anthropics/claude-code/main/assets/icon.png',
      embeds: [
        {
          title: `${SEVERITY_EMOJIS[severity]} ${title}`,
          description: text,
          color: SEVERITY_COLORS[severity],
          fields: fields.length > 0 ? fields : undefined,
          footer: {
            text: 'Corporal WIGGUM, R.A.L.P.H.',
          },
          timestamp: timestamp.toISOString(),
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
        throw new Error(`Discord API error: ${response.status} - ${errorText}`);
      }

      logger.debug('Discord notification sent', { title });
    } catch (err) {
      logger.error('Failed to send Discord notification', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }
  }

  /**
   * Send a simple text message
   */
  async sendText(content: string): Promise<void> {
    if (!this.webhookUrl) {
      logger.warn('Discord webhook URL not configured');
      return;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Corporal WIGGUM',
          content,
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
      }
    } catch (err) {
      logger.error('Failed to send Discord text', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }
  }
}

// Singleton instance
export const discordNotifier = new DiscordNotifier();
export default discordNotifier;
