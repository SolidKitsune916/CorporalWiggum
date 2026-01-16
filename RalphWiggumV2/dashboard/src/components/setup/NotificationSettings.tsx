import { useState } from 'react';
import { Bell, MessageSquare, Hash, Save, TestTube } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';

type NotificationEvent =
  | 'loop:started'
  | 'loop:completed'
  | 'loop:error'
  | 'review:completed'
  | 'plan:generated';

interface NotificationConfig {
  slack: {
    enabled: boolean;
    webhookUrl: string;
    events: NotificationEvent[];
  };
  discord: {
    enabled: boolean;
    webhookUrl: string;
    events: NotificationEvent[];
  };
}

interface NotificationSettingsProps {
  onSave?: (config: NotificationConfig) => void;
  onTest?: (channel: 'slack' | 'discord') => void;
}

const ALL_EVENTS: { value: NotificationEvent; label: string }[] = [
  { value: 'loop:started', label: 'Loop Started' },
  { value: 'loop:completed', label: 'Loop Completed' },
  { value: 'loop:error', label: 'Loop Error' },
  { value: 'review:completed', label: 'Review Completed' },
  { value: 'plan:generated', label: 'Plan Generated' },
];

export function NotificationSettings({ onSave, onTest }: NotificationSettingsProps) {
  const [config, setConfig] = useState<NotificationConfig>({
    slack: {
      enabled: false,
      webhookUrl: '',
      events: ['loop:started', 'loop:completed', 'loop:error'],
    },
    discord: {
      enabled: false,
      webhookUrl: '',
      events: ['loop:started', 'loop:completed', 'loop:error'],
    },
  });

  const [testingSlack, setTestingSlack] = useState(false);
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSlackToggle = (enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      slack: { ...prev.slack, enabled },
    }));
  };

  const handleDiscordToggle = (enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      discord: { ...prev.discord, enabled },
    }));
  };

  const handleSlackUrlChange = (webhookUrl: string) => {
    setConfig((prev) => ({
      ...prev,
      slack: { ...prev.slack, webhookUrl },
    }));
  };

  const handleDiscordUrlChange = (webhookUrl: string) => {
    setConfig((prev) => ({
      ...prev,
      discord: { ...prev.discord, webhookUrl },
    }));
  };

  const handleSlackEventToggle = (event: NotificationEvent) => {
    setConfig((prev) => {
      const events = prev.slack.events.includes(event)
        ? prev.slack.events.filter((e) => e !== event)
        : [...prev.slack.events, event];
      return { ...prev, slack: { ...prev.slack, events } };
    });
  };

  const handleDiscordEventToggle = (event: NotificationEvent) => {
    setConfig((prev) => {
      const events = prev.discord.events.includes(event)
        ? prev.discord.events.filter((e) => e !== event)
        : [...prev.discord.events, event];
      return { ...prev, discord: { ...prev.discord, events } };
    });
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      if (onSave) {
        onSave(config);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
  };

  const handleTestSlack = async () => {
    setTestingSlack(true);
    try {
      if (onTest) {
        onTest('slack');
      }
    } finally {
      setTimeout(() => setTestingSlack(false), 1000);
    }
  };

  const handleTestDiscord = async () => {
    setTestingDiscord(true);
    try {
      if (onTest) {
        onTest('discord');
      }
    } finally {
      setTimeout(() => setTestingDiscord(false), 1000);
    }
  };

  return (
    <Card className="bg-wiggum-obsidian border-wiggum-obsidian-light">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Bell className="w-5 h-5 text-wiggum-cyan" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Configure notifications for Slack and Discord
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Slack Configuration */}
        <div className="space-y-4 p-4 rounded-lg bg-wiggum-obsidian-light">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-[#4A154B]" />
              <Label className="text-white font-medium">Slack</Label>
            </div>
            <Switch
              checked={config.slack.enabled}
              onCheckedChange={handleSlackToggle}
              aria-label="Enable Slack notifications"
            />
          </div>

          {config.slack.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="slack-webhook" className="text-gray-300 text-sm">
                  Webhook URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="slack-webhook"
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={config.slack.webhookUrl}
                    onChange={(e) => handleSlackUrlChange(e.target.value)}
                    className="bg-wiggum-obsidian border-wiggum-obsidian-lighter text-white"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestSlack}
                    disabled={!config.slack.webhookUrl || testingSlack}
                    className="border-wiggum-cyan text-wiggum-cyan hover:bg-wiggum-cyan/20"
                  >
                    <TestTube className={`w-4 h-4 ${testingSlack ? 'animate-pulse' : ''}`} />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Events</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_EVENTS.map((event) => (
                    <label
                      key={event.value}
                      className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer"
                    >
                      <Checkbox
                        checked={config.slack.events.includes(event.value)}
                        onCheckedChange={() => handleSlackEventToggle(event.value)}
                      />
                      {event.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Discord Configuration */}
        <div className="space-y-4 p-4 rounded-lg bg-wiggum-obsidian-light">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#5865F2]" />
              <Label className="text-white font-medium">Discord</Label>
            </div>
            <Switch
              checked={config.discord.enabled}
              onCheckedChange={handleDiscordToggle}
              aria-label="Enable Discord notifications"
            />
          </div>

          {config.discord.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="discord-webhook" className="text-gray-300 text-sm">
                  Webhook URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="discord-webhook"
                    type="url"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={config.discord.webhookUrl}
                    onChange={(e) => handleDiscordUrlChange(e.target.value)}
                    className="bg-wiggum-obsidian border-wiggum-obsidian-lighter text-white"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestDiscord}
                    disabled={!config.discord.webhookUrl || testingDiscord}
                    className="border-wiggum-cyan text-wiggum-cyan hover:bg-wiggum-cyan/20"
                  >
                    <TestTube className={`w-4 h-4 ${testingDiscord ? 'animate-pulse' : ''}`} />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Events</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_EVENTS.map((event) => (
                    <label
                      key={event.value}
                      className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer"
                    >
                      <Checkbox
                        checked={config.discord.events.includes(event.value)}
                        onCheckedChange={() => handleDiscordEventToggle(event.value)}
                      />
                      {event.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="bg-wiggum-cyan text-black hover:bg-wiggum-cyan-light"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default NotificationSettings;
