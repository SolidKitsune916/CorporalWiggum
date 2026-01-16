# Webhooks

Configure custom webhooks to integrate WIGGUM with any external service.

## Overview

Webhooks send HTTP requests when events occur in WIGGUM. Use them to:

- Trigger CI/CD pipelines
- Update project management tools
- Send custom notifications
- Log events to external systems

## Dashboard Configuration

### Adding a Webhook

1. Go to **Setup** → **Webhook Manager**
2. Click **Add Webhook**
3. Configure:
   - **Name**: Descriptive identifier
   - **URL**: Endpoint to receive events
   - **Method**: GET, POST, or PUT
   - **Events**: Select which events trigger the webhook

### Managing Webhooks

From the Webhook Manager, you can:

- **Enable/Disable**: Toggle webhooks without deleting
- **Edit**: Modify URL, method, or events
- **Test**: Send a test payload
- **Delete**: Remove the webhook

## Payload Format

All webhooks receive a standardized payload:

```json
{
  "source": "wiggum",
  "event": "loop:completed",
  "title": "Ralph Loop Completed",
  "message": "Loop completed after 15 iterations",
  "severity": "success",
  "metadata": {
    "iterations": 15,
    "duration": 2700000,
    "commits": 8
  },
  "timestamp": "2024-01-15T11:15:00.000Z"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | Always "wiggum" |
| `event` | string | Event type identifier |
| `title` | string | Human-readable title |
| `message` | string | Event description |
| `severity` | string | info, success, warning, or error |
| `metadata` | object | Event-specific data |
| `timestamp` | string | ISO 8601 timestamp |

## Available Events

| Event | Description | Metadata |
|-------|-------------|----------|
| `loop:started` | Loop begins | mode, projectPath |
| `loop:completed` | Loop finishes | iterations, duration |
| `loop:error` | Loop fails | error, iteration |
| `review:completed` | Review done | score, summary |
| `plan:generated` | Plan created | planPath |

## API Usage

### Webhook Manager

```typescript
import { webhookManager } from './integrations/webhookManager';

// Add webhook
const webhook = webhookManager.addWebhook({
  name: 'CI Trigger',
  url: 'https://ci.example.com/trigger',
  method: 'POST',
  enabled: true,
  events: ['loop:completed']
});

// Update webhook
webhookManager.updateWebhook(webhook.id, {
  events: ['loop:completed', 'loop:error']
});

// Test webhook
const result = await webhookManager.testWebhook(webhook.id);
console.log(result.success ? 'OK' : result.error);

// Remove webhook
webhookManager.removeWebhook(webhook.id);
```

### Broadcast Events

```typescript
// Send to all enabled webhooks
await webhookManager.broadcast({
  event: 'loop:completed',
  title: 'Loop Complete',
  message: 'Finished successfully',
  severity: 'success',
  metadata: { iterations: 10 },
  timestamp: new Date().toISOString()
});
```

## Integration Examples

### GitHub Actions

Trigger a workflow on loop completion:

**Webhook Configuration:**
- URL: `https://api.github.com/repos/OWNER/REPO/dispatches`
- Method: POST
- Headers: `Authorization: token YOUR_TOKEN`

**Payload Transformation** (via intermediary):

```json
{
  "event_type": "wiggum-loop-complete",
  "client_payload": {
    "iterations": 15,
    "commits": 8
  }
}
```

### Jira

Update issue status when loop completes:

**Webhook Configuration:**
- URL: `https://your-domain.atlassian.net/rest/api/3/issue/ISSUE-123/transitions`
- Method: POST
- Headers: Authorization with API token

### Datadog

Log events to Datadog:

**Webhook Configuration:**
- URL: `https://http-intake.logs.datadoghq.com/api/v2/logs`
- Method: POST
- Headers: `DD-API-KEY: your-api-key`

### PagerDuty

Alert on errors:

**Webhook Configuration:**
- URL: `https://events.pagerduty.com/v2/enqueue`
- Method: POST
- Events: `loop:error` only

## Security

### HTTPS

Always use HTTPS endpoints for webhooks to ensure data security.

### Authentication

Add authentication headers:

```typescript
webhookManager.addWebhook({
  name: 'Secure Webhook',
  url: 'https://api.example.com/events',
  method: 'POST',
  enabled: true,
  headers: {
    'Authorization': 'Bearer your-token',
    'X-API-Key': 'your-api-key'
  }
});
```

### Signature Verification

For incoming webhooks to WIGGUM, implement signature verification:

```typescript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return signature === `sha256=${expected}`;
}
```

## Error Handling

### Retry Logic

Failed webhook requests are retried:

- 3 attempts with exponential backoff
- 1s, 2s, 4s delays

### Failure Logging

Failed webhooks are logged:

```
[ERROR] Failed to send webhook: webhook-123
  URL: https://api.example.com/events
  Status: 503
  Error: Service Unavailable
```

### Circuit Breaker

After 5 consecutive failures, the webhook is temporarily disabled for 5 minutes.

## Best Practices

### Idempotency

Design receiving endpoints to be idempotent:

- Include event IDs in payloads
- Check for duplicates before processing
- Use database transactions

### Timeouts

Set appropriate timeouts on receiving endpoints:

- WIGGUM waits 10 seconds for response
- Long-running tasks should be queued

### Monitoring

Track webhook delivery:

- Success/failure rates
- Response times
- Error patterns

## Next Steps

- [Architecture Overview](/architecture/overview) - System design
- [Troubleshooting](/troubleshooting/common-issues) - Handle problems
