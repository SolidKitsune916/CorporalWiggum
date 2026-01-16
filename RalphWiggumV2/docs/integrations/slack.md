# Slack Integration

Send WIGGUM notifications to Slack channels using incoming webhooks.

## Setup

### Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App**
3. Choose **From scratch**
4. Name it "WIGGUM" and select your workspace

### Add Incoming Webhook

1. In your app settings, go to **Incoming Webhooks**
2. Toggle **Activate Incoming Webhooks** to On
3. Click **Add New Webhook to Workspace**
4. Select the channel for notifications
5. Copy the webhook URL

### Configure in Dashboard

1. Open the WIGGUM dashboard
2. Go to **Setup** → **Notification Settings**
3. Enable **Slack**
4. Paste your webhook URL
5. Select events to receive
6. Click **Save Settings**

## Configuration Options

### Events

Select which events trigger Slack notifications:

| Event | Description |
|-------|-------------|
| `loop:started` | Loop begins execution |
| `loop:completed` | Loop finishes successfully |
| `loop:error` | Loop encounters an error |
| `review:completed` | Code review finishes |
| `plan:generated` | Implementation plan created |

### Message Format

Notifications include:

- Event type with emoji indicator
- Title and description
- Relevant metadata (iteration count, duration, etc.)
- Timestamp

## API Usage

### Direct Notification

```typescript
import { slackNotifier } from './integrations/slackNotifier';

// Set webhook URL
slackNotifier.setWebhookUrl('https://hooks.slack.com/services/...');

// Send message
await slackNotifier.send({
  title: 'Loop Completed',
  message: 'Successfully completed 15 iterations',
  severity: 'success',
  metadata: {
    iterations: 15,
    duration: '45m',
    commits: 8
  }
});
```

### Via Notification Service

```typescript
import { notificationService } from './integrations/notificationService';

// Configure Slack
notificationService.configure({
  slack: {
    enabled: true,
    webhookUrl: 'https://hooks.slack.com/services/...',
    events: ['loop:started', 'loop:completed', 'loop:error']
  }
});

// Send notification
await notificationService.notifyLoopCompleted(15, 2700000);
```

## Message Examples

### Loop Started

```
ℹ️ Ralph Loop Started

Loop started in build mode

Mode: build
Project: /path/to/project

Corporal WIGGUM | 2024-01-15T10:30:00Z
```

### Loop Completed

```
✅ Ralph Loop Completed

Loop completed after 15 iterations

Iterations: 15
Duration: 45m
Commits: 8

Corporal WIGGUM | 2024-01-15T11:15:00Z
```

### Loop Error

```
❌ Ralph Loop Error

Validation failed: Tests did not pass

Error: npm test exited with code 1
Iteration: 8

Corporal WIGGUM | 2024-01-15T11:00:00Z
```

## Testing

### Test Button

Use the test button in Notification Settings to verify:

1. Webhook URL is correct
2. App has channel permissions
3. Messages are formatted correctly

### Manual Test

```typescript
// Test the webhook
await slackNotifier.sendText('Test message from WIGGUM');
```

## Troubleshooting

### No Messages Received

1. Verify webhook URL is correct
2. Check Slack app has channel access
3. Ensure the event is enabled in settings
4. Check server logs for errors

### Message Not Formatting

Slack blocks have specific requirements:

- Text fields have character limits
- Emojis must be valid
- Links must be properly formatted

### Rate Limiting

Slack webhooks have rate limits:

- 1 message per second per webhook
- Burst of up to 5 messages

WIGGUM queues messages to avoid hitting limits.

## Best Practices

### Channel Selection

- Use a dedicated channel for WIGGUM
- Set appropriate notification preferences
- Consider separate channels for different projects

### Event Selection

Start with essential events:

- `loop:completed` - Know when work is done
- `loop:error` - Get alerted to problems

Add more as needed.

### Team Mentions

For critical errors, consider adding mentions:

```typescript
slackNotifier.send({
  title: 'Critical Error',
  message: '<!channel> Loop failed with critical error',
  severity: 'error'
});
```

## Next Steps

- [Discord Integration](/integrations/discord) - Alternative messaging
- [Webhooks](/integrations/webhooks) - Custom integrations
