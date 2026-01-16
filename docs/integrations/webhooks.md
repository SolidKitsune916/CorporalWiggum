# Custom Webhooks

R.A.L.P.H. supports custom webhooks for integration with external systems.

## Configuration

Add webhook URLs to your environment:

```bash
# Single webhook
RALPH_WEBHOOK_URL="https://your-server.com/webhook"

# Multiple webhooks (comma-separated)
RALPH_WEBHOOK_URLS="https://server1.com/hook,https://server2.com/hook"
```

## Event Payload

All webhooks receive a JSON payload:

```json
{
  "event": "loop:complete",
  "timestamp": "2024-01-15T10:30:00Z",
  "project": {
    "name": "my-project",
    "path": "/path/to/project"
  },
  "data": {
    "tasksCompleted": 5,
    "duration": 754,
    "iteration": 3
  }
}
```

## Event Types

| Event | Description |
|-------|-------------|
| `loop:start` | Loop has started |
| `loop:complete` | Loop finished all tasks |
| `loop:error` | Loop encountered fatal error |
| `loop:iteration` | New iteration started |
| `task:complete` | Individual task completed |
| `review:required` | Human review needed |

## Authentication

### Bearer Token

```bash
RALPH_WEBHOOK_AUTH="Bearer your-token-here"
```

### Custom Headers

```bash
RALPH_WEBHOOK_HEADERS='{"X-API-Key": "your-key"}'
```

## Retry Policy

Failed webhook deliveries are retried:

- 3 attempts maximum
- Exponential backoff (1s, 2s, 4s)
- Non-blocking (won't stop the loop)

## Example: Discord Integration

```bash
# Discord webhook URL
RALPH_WEBHOOK_URL="https://discord.com/api/webhooks/xxx/yyy"

# Discord expects different format, use transform
RALPH_WEBHOOK_TRANSFORM="discord"
```

## Example: Custom Server

```javascript
// Express server receiving webhooks
app.post('/ralph-webhook', (req, res) => {
  const { event, project, data } = req.body;

  if (event === 'loop:complete') {
    console.log(`${project.name} completed ${data.tasksCompleted} tasks`);
  }

  res.sendStatus(200);
});
```

## Security Considerations

- Use HTTPS endpoints only
- Validate webhook signatures if supported
- Keep webhook URLs secret
- Consider IP allowlisting for sensitive systems
