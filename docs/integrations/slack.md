# Slack Integration

R.A.L.P.H. can send notifications to Slack channels via webhooks.

## Setup

### Create Slack Webhook

1. Go to [Slack API](https://api.slack.com/apps)
2. Create a new app or select existing
3. Enable **Incoming Webhooks**
4. Add a new webhook to your workspace
5. Copy the webhook URL

### Configure R.A.L.P.H.

Add the webhook URL to your environment:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXX/YYY/ZZZ"
```

Or add to your `.env` file in the project root.

## Notification Types

### Loop Events

- **Loop Started** - When a new loop begins
- **Loop Completed** - When all tasks finish
- **Loop Error** - When the loop encounters a fatal error

### Task Events

- **Task Completed** - Optionally notify on each task completion
- **Review Required** - When a task needs human review

## Configuration Options

```bash
# Enable Slack notifications
SLACK_ENABLED=true

# Notification settings
SLACK_NOTIFY_START=true
SLACK_NOTIFY_COMPLETE=true
SLACK_NOTIFY_ERROR=true
SLACK_NOTIFY_TASKS=false  # Per-task notifications (can be noisy)
```

## Message Format

Notifications include:

- Project name
- Event type with emoji indicator
- Relevant details (task count, error message, etc.)
- Link to dashboard (if configured)

### Example Message

```
:robot_face: R.A.L.P.H. Loop Complete
Project: my-app
Tasks Completed: 5
Duration: 12m 34s
```

## Troubleshooting

### Messages Not Appearing

1. Verify webhook URL is correct
2. Check `SLACK_ENABLED=true`
3. Ensure the webhook hasn't been revoked

### Rate Limiting

Slack webhooks have rate limits. If you're running many loops, consider disabling per-task notifications.
