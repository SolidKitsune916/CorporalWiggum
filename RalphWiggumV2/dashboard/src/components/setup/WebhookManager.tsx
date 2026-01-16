import { useState } from 'react';
import { Webhook, Plus, Trash2, Edit2, Check, X, TestTube, Power, PowerOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  enabled: boolean;
  events: string[];
}

interface WebhookManagerProps {
  webhooks?: WebhookConfig[];
  onAdd?: (webhook: Omit<WebhookConfig, 'id'>) => void;
  onUpdate?: (id: string, webhook: Partial<WebhookConfig>) => void;
  onDelete?: (id: string) => void;
  onTest?: (id: string) => Promise<{ success: boolean; error?: string }>;
  onToggle?: (id: string, enabled: boolean) => void;
}

const AVAILABLE_EVENTS = [
  'loop:started',
  'loop:completed',
  'loop:error',
  'review:completed',
  'plan:generated',
];

export function WebhookManager({
  webhooks = [],
  onAdd,
  onUpdate,
  onDelete,
  onTest,
  onToggle,
}: WebhookManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string }>>({});

  const [newWebhook, setNewWebhook] = useState<{
    name: string;
    url: string;
    method: 'GET' | 'POST' | 'PUT';
    events: string[];
  }>({
    name: '',
    url: '',
    method: 'POST',
    events: ['loop:started', 'loop:completed', 'loop:error'],
  });

  const [editedWebhook, setEditedWebhook] = useState<Partial<WebhookConfig>>({});

  const handleAdd = () => {
    if (onAdd && newWebhook.name && newWebhook.url) {
      onAdd({
        ...newWebhook,
        enabled: true,
      });
      setNewWebhook({
        name: '',
        url: '',
        method: 'POST',
        events: ['loop:started', 'loop:completed', 'loop:error'],
      });
      setIsAdding(false);
    }
  };

  const handleEdit = (webhook: WebhookConfig) => {
    setEditingId(webhook.id);
    setEditedWebhook(webhook);
  };

  const handleSaveEdit = () => {
    if (onUpdate && editingId) {
      onUpdate(editingId, editedWebhook);
      setEditingId(null);
      setEditedWebhook({});
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedWebhook({});
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      if (onTest) {
        const result = await onTest(id);
        setTestResults((prev) => ({ ...prev, [id]: result }));
      }
    } finally {
      setTestingId(null);
    }
  };

  const handleToggle = (id: string, enabled: boolean) => {
    if (onToggle) {
      onToggle(id, enabled);
    }
  };

  return (
    <Card className="bg-wiggum-obsidian border-wiggum-obsidian-light">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Webhook className="w-5 h-5 text-wiggum-cyan" />
              Webhook Manager
            </CardTitle>
            <CardDescription>
              Configure custom webhooks for external integrations
            </CardDescription>
          </div>
          {!isAdding && (
            <Button
              onClick={() => setIsAdding(true)}
              className="bg-wiggum-cyan text-black hover:bg-wiggum-cyan-light"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Webhook
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add New Webhook Form */}
        {isAdding && (
          <div className="p-4 rounded-lg bg-wiggum-obsidian-light space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-name" className="text-gray-300">
                  Name
                </Label>
                <Input
                  id="webhook-name"
                  placeholder="My Webhook"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook((prev) => ({ ...prev, name: e.target.value }))}
                  className="bg-wiggum-obsidian border-wiggum-obsidian-lighter text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-method" className="text-gray-300">
                  Method
                </Label>
                <select
                  id="webhook-method"
                  value={newWebhook.method}
                  onChange={(e) =>
                    setNewWebhook((prev) => ({
                      ...prev,
                      method: e.target.value as 'GET' | 'POST' | 'PUT',
                    }))
                  }
                  className="w-full px-3 py-2 rounded-md bg-wiggum-obsidian border border-wiggum-obsidian-lighter text-white"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-url" className="text-gray-300">
                URL
              </Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://example.com/webhook"
                value={newWebhook.url}
                onChange={(e) => setNewWebhook((prev) => ({ ...prev, url: e.target.value }))}
                className="bg-wiggum-obsidian border-wiggum-obsidian-lighter text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Events</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <Badge
                    key={event}
                    variant={newWebhook.events.includes(event) ? 'default' : 'outline'}
                    className={`cursor-pointer ${
                      newWebhook.events.includes(event)
                        ? 'bg-wiggum-cyan text-black'
                        : 'border-gray-600 text-gray-400'
                    }`}
                    onClick={() =>
                      setNewWebhook((prev) => ({
                        ...prev,
                        events: prev.events.includes(event)
                          ? prev.events.filter((e) => e !== event)
                          : [...prev.events, event],
                      }))
                    }
                  >
                    {event}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsAdding(false)}
                className="text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!newWebhook.name || !newWebhook.url}
                className="bg-wiggum-cyan text-black hover:bg-wiggum-cyan-light"
              >
                Add Webhook
              </Button>
            </div>
          </div>
        )}

        {/* Webhooks List */}
        <ScrollArea className="h-[400px]">
          {webhooks.length === 0 && !isAdding ? (
            <div className="text-center py-8 text-gray-500">
              <Webhook className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No webhooks configured</p>
              <p className="text-sm">Add a webhook to send notifications to external services</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className={`p-4 rounded-lg bg-wiggum-obsidian-light ${
                    !webhook.enabled ? 'opacity-60' : ''
                  }`}
                >
                  {editingId === webhook.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={editedWebhook.name || ''}
                          onChange={(e) =>
                            setEditedWebhook((prev) => ({ ...prev, name: e.target.value }))
                          }
                          className="bg-wiggum-obsidian border-wiggum-obsidian-lighter text-white"
                        />
                        <select
                          value={editedWebhook.method || 'POST'}
                          onChange={(e) =>
                            setEditedWebhook((prev) => ({
                              ...prev,
                              method: e.target.value as 'GET' | 'POST' | 'PUT',
                            }))
                          }
                          className="px-3 py-2 rounded-md bg-wiggum-obsidian border border-wiggum-obsidian-lighter text-white"
                        >
                          <option value="POST">POST</option>
                          <option value="GET">GET</option>
                          <option value="PUT">PUT</option>
                        </select>
                      </div>
                      <Input
                        value={editedWebhook.url || ''}
                        onChange={(e) =>
                          setEditedWebhook((prev) => ({ ...prev, url: e.target.value }))
                        }
                        className="bg-wiggum-obsidian border-wiggum-obsidian-lighter text-white"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="text-gray-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{webhook.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {webhook.method}
                          </Badge>
                          {webhook.enabled ? (
                            <Badge className="bg-green-600/20 text-green-500 text-xs">Active</Badge>
                          ) : (
                            <Badge className="bg-gray-600/20 text-gray-500 text-xs">Disabled</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggle(webhook.id, !webhook.enabled)}
                            className="text-gray-400 hover:text-white"
                            title={webhook.enabled ? 'Disable' : 'Enable'}
                          >
                            {webhook.enabled ? (
                              <Power className="w-4 h-4" />
                            ) : (
                              <PowerOff className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTest(webhook.id)}
                            disabled={testingId === webhook.id}
                            className="text-gray-400 hover:text-white"
                            title="Test webhook"
                          >
                            <TestTube
                              className={`w-4 h-4 ${testingId === webhook.id ? 'animate-pulse' : ''}`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(webhook)}
                            className="text-gray-400 hover:text-white"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete?.(webhook.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-gray-500 text-sm truncate mb-2">{webhook.url}</p>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event) => (
                          <Badge
                            key={event}
                            variant="secondary"
                            className="text-xs bg-wiggum-obsidian"
                          >
                            {event}
                          </Badge>
                        ))}
                      </div>
                      {testResults[webhook.id] && (
                        <div
                          className={`mt-2 text-sm ${
                            testResults[webhook.id].success ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {testResults[webhook.id].success
                            ? 'Test successful!'
                            : `Test failed: ${testResults[webhook.id].error}`}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default WebhookManager;
