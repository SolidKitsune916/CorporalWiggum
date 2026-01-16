# Safety Controls

WIGGUM includes multiple safety mechanisms to prevent runaway loops and ensure controlled execution.

## Iteration Limits

### Max Iterations

Set a maximum number of loop cycles:

```
Max Iterations: 20
```

The loop stops automatically when reaching this limit, even if tasks remain.

### Recommended Limits

| Task Type | Suggested Limit |
|-----------|-----------------|
| Planning | 3-5 |
| Small features | 10-20 |
| Large features | 30-50 |
| Complex refactoring | 50-100 |

### No Limit Mode

Set to 0 or leave empty for unlimited iterations. Use with caution:

- Only for well-defined, bounded tasks
- Monitor actively while running
- Have a clear completion condition

## Stop Controls

### Manual Stop

Click **Stop Loop** to halt execution. The current iteration completes before stopping.

### Graceful Shutdown

On stop:

1. Current task finishes
2. Validation runs
3. Changes are committed (if valid)
4. Plan is updated
5. Loop exits cleanly

### Emergency Stop

Close the browser or kill the server process for immediate termination. Note:

- Current work may be lost
- Git status may be dirty
- Plan may be inconsistent

## Completion Conditions

### Task Completion

The loop stops when:

- All tasks in IMPLEMENTATION_PLAN.md are complete
- No more `- [ ]` items remain
- The `ALL_TASKS_COMPLETE` signal is output

### Promise Statements

For automated workflows, use completion promises:

```markdown
When ALL phases are complete, output:
<promise>PHASES_COMPLETE</promise>
```

The loop continues until the promise condition is met.

## Validation Gates

### Pre-Commit Validation

Before committing, all configured validations must pass:

```markdown
## Validation Commands
- Test: `npm test`
- Lint: `npm run lint`
- Type Check: `npx tsc --noEmit`
```

Failed validation:

- Blocks the commit
- Logs the error
- Attempts to fix
- Retries validation

### Continuous Validation

Each iteration:

1. Runs all validation commands
2. Only commits if all pass
3. Logs failures for debugging

## Cost Controls

### Token Tracking

Monitor API usage in the dashboard:

- Input tokens
- Output tokens
- Estimated cost

### Cost Alerts

Configure alerts for spending thresholds:

```typescript
// In notification settings
alertOnCost: {
  threshold: 10.00, // USD
  channel: 'slack'
}
```

## Error Handling

### Automatic Retry

On transient failures:

- Network errors: Retry 3 times
- API rate limits: Wait and retry
- Validation failures: Attempt fix

### Fatal Errors

The loop stops on:

- Repeated validation failures (5+)
- Git conflicts
- Missing required files
- Authentication failures

### Error Recovery

After a crash:

1. Check Git status for uncommitted changes
2. Review IMPLEMENTATION_PLAN.md
3. Fix any issues manually
4. Restart the loop

## Monitoring

### Real-Time Logs

Watch the Log Viewer for:

- Task progress
- Validation results
- Errors and warnings
- Commit messages

### Metrics

Track execution metrics:

- Loop duration
- Iterations per task
- Success rate
- Error frequency

### Alerts

Configure notifications for:

- Loop started/completed
- Errors encountered
- Cost thresholds exceeded

## Best Practices

### Start Conservative

Begin with low iteration limits:

1. Set Max Iterations to 5
2. Observe behavior
3. Increase gradually

### Monitor Actively

During initial runs:

- Watch the log viewer
- Check commits
- Verify changes

### Use Version Control

Always work on a branch:

```bash
git checkout -b feature/my-feature
```

This allows easy rollback if needed.

### Review Before Merge

After loop completion:

1. Review all commits
2. Check code quality
3. Run full test suite
4. Create PR for review

## Next Steps

- [Troubleshooting](/troubleshooting/common-issues) - Handle problems
- [WebSocket API](/api/websocket-api) - Build monitoring tools
