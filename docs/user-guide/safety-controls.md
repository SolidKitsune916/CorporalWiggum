# Safety Controls

R.A.L.P.H. includes multiple safety features to prevent runaway loops and protect your codebase.

## Iteration Limits

### Max Iterations

Set a limit on loop iterations:

```bash
./loop.sh 10  # Stop after 10 iterations
./loop.sh 0   # Unlimited (not recommended for unattended runs)
```

**Best practice:** Start with 5-10 iterations to validate behavior.

### Automatic Stop Conditions

The loop stops automatically when:
- All tasks in `IMPLEMENTATION_PLAN.md` are complete
- Max iterations reached
- Critical validation error occurs
- User clicks Stop button

## Validation Gates

Each iteration runs validation before committing:

1. **TypeScript Check** - `npx tsc --noEmit`
2. **Lint** - `npm run lint`
3. **Tests** - `npm test`
4. **Build** - `npm run build`

Failed validation:
- Prevents commit
- Logs error details
- Retries the task

## Stuck Loop Detection

The health monitor detects stuck loops:

- Tracks consecutive failure count
- Warns after 3 consecutive failures
- Can auto-pause after configurable threshold
- Logs health metrics to `ralph-health.log`

## File System Protections

### Path Traversal Prevention

Blocks attempts to access files outside project:
- No `../` navigation outside root
- Symlink resolution checks
- Absolute path validation

### File Size Limits

Prevents reading/writing extremely large files:
- Default max: 10MB per file
- Configurable via environment

### Protected Paths

Some paths are always blocked:
- `/etc/`, `/usr/`, `/bin/`
- `~/.ssh/`, `~/.config/`
- System directories

## Session Recovery

### Browser Refresh Resilience

If you refresh the dashboard:
- Active loop continues running
- Session state is preserved
- WebSocket reconnects automatically
- Task progress is maintained

### Heartbeat Monitoring

The server tracks session health:
- Heartbeat every 30 seconds
- Stale sessions cleaned up
- Active sessions recoverable

## Git Safety

### Commit Protocol

Each task follows safe git practices:
- Descriptive commit messages
- Co-author attribution
- No force pushes (unless explicit)

### Branch Protection

By default:
- Works on current branch
- No main/master force pushes
- Warns before destructive operations

## Monitoring & Alerts

### Structured Logging

All operations are logged:
```javascript
logger.info('Task completed', { taskId, duration, status });
logger.error('Validation failed', { error, iteration });
```

### Alert Triggers

Configurable alerts for:
- Loop errors
- Task failures
- Health warnings

Send to:
- Console
- Slack
- Discord
- Custom webhooks

## Best Practices

1. **Start Small** - Use low iteration limits initially
2. **Watch Logs** - Monitor first few iterations
3. **Good Tests** - Comprehensive tests catch issues
4. **Commit Points** - Each task = one commit
5. **Review Output** - Check generated code quality

## Emergency Stop

If something goes wrong:

1. **Dashboard**: Click **Stop** button
2. **Terminal**: `Ctrl+C` to kill loop
3. **Process**: `pkill -f loop.sh`

The loop will finish its current operation before stopping.
