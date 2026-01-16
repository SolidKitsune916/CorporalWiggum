# Common Issues

Solutions to frequently encountered problems with WIGGUM.

## Connection Issues

### Dashboard Shows "Disconnected"

**Symptoms:**
- Red "Disconnected" badge in header
- Controls are unresponsive

**Solutions:**

1. **Check backend is running:**
   ```bash
   # Should show server running on port 3001
   curl http://localhost:3001/api/status
   ```

2. **Restart the development server:**
   ```bash
   npm run dev
   ```

3. **Check for port conflicts:**
   ```bash
   # Find what's using port 3001
   lsof -i :3001
   ```

4. **Verify WebSocket connection:**
   - Open browser DevTools → Network → WS
   - Check for connection errors

### WebSocket Keeps Reconnecting

**Symptoms:**
- Frequent connect/disconnect in logs
- Intermittent status updates

**Solutions:**

1. **Check network stability**
2. **Reduce browser extensions** (some interfere with WebSocket)
3. **Try a different browser**
4. **Check server logs for errors**

## Loop Execution Issues

### Loop Won't Start

**Symptoms:**
- Click "Start" but nothing happens
- Status stays "Idle"

**Solutions:**

1. **Check IMPLEMENTATION_PLAN.md exists:**
   ```bash
   ls -la IMPLEMENTATION_PLAN.md
   ```

2. **Verify Claude Code CLI is installed:**
   ```bash
   claude --version
   ```

3. **Check for incomplete tasks:**
   ```bash
   grep -c "\- \[ \]" IMPLEMENTATION_PLAN.md
   ```

4. **Review server logs for errors**

### Loop Stops Unexpectedly

**Symptoms:**
- Loop ends before max iterations
- No error message shown

**Solutions:**

1. **Check task completion:**
   - All tasks may be complete
   - Look for `ALL_TASKS_COMPLETE` in logs

2. **Check for validation failures:**
   - Multiple failures trigger stop
   - Review log for error patterns

3. **Verify process didn't crash:**
   ```bash
   ps aux | grep claude
   ```

### Validation Always Fails

**Symptoms:**
- Tasks never complete
- "Validation failed" in logs

**Solutions:**

1. **Check AGENTS.md commands are correct:**
   ```markdown
   ## Validation Commands
   - Test: npm test
   - Lint: npm run lint
   ```

2. **Run commands manually:**
   ```bash
   npm test
   npm run lint
   ```

3. **Check for missing dependencies:**
   ```bash
   npm install
   ```

## Configuration Issues

### AGENTS.md Not Found

**Symptoms:**
- Setup wizard appears repeatedly
- "Missing AGENTS.md" warning

**Solutions:**

1. **Create the file:**
   ```bash
   touch AGENTS.md
   ```

2. **Use the Setup Wizard** to generate content

3. **Copy from template:**
   ```bash
   cp templates/AGENTS.md .
   ```

### Configuration Not Updating

**Symptoms:**
- Changes not reflected in dashboard
- Old settings persist

**Solutions:**

1. **Click "Refresh" in Setup tab**

2. **Save the file properly:**
   - Ensure no syntax errors
   - Check file permissions

3. **Restart the server**

## Git Issues

### Commits Not Being Created

**Symptoms:**
- Tasks complete but no commits
- "Nothing to commit" in logs

**Solutions:**

1. **Check Git is initialized:**
   ```bash
   git status
   ```

2. **Verify files are being modified:**
   ```bash
   git diff
   ```

3. **Check for .gitignore issues:**
   ```bash
   cat .gitignore
   ```

### Git Conflicts

**Symptoms:**
- Loop stops with conflict error
- "Merge conflict" in logs

**Solutions:**

1. **Resolve conflicts manually:**
   ```bash
   git status
   git diff
   # Fix conflicts
   git add .
   git commit
   ```

2. **Reset to clean state:**
   ```bash
   git reset --hard HEAD
   ```

3. **Start fresh on clean branch:**
   ```bash
   git checkout -b fresh-start
   ```

## Performance Issues

### Dashboard is Slow

**Symptoms:**
- UI feels sluggish
- Long load times

**Solutions:**

1. **Clear browser cache**

2. **Reduce log history:**
   - Click "Clear Logs" button
   - Logs are stored in memory

3. **Check for memory leaks:**
   - Open DevTools → Performance
   - Look for increasing memory usage

### High CPU Usage

**Symptoms:**
- Fan running constantly
- System slowdown

**Solutions:**

1. **Reduce max iterations:**
   - Lower limit reduces concurrent work

2. **Check for runaway processes:**
   ```bash
   top -o cpu
   ```

3. **Stop unused dashboard instances**

## Database Issues

### Session Recovery Fails

**Symptoms:**
- "Failed to recover session" error
- Loop state lost after refresh

**Solutions:**

1. **Check database file exists:**
   ```bash
   ls -la ~/.wiggum/data.db
   ```

2. **Reset database:**
   ```bash
   rm ~/.wiggum/data.db
   # Restart server
   ```

3. **Check file permissions:**
   ```bash
   chmod 644 ~/.wiggum/data.db
   ```

## Integration Issues

### Slack Notifications Not Sending

**Symptoms:**
- Events occur but no Slack messages
- "Test" button fails

**Solutions:**

1. **Verify webhook URL:**
   - Must start with `https://hooks.slack.com/`
   - No trailing whitespace

2. **Check Slack app permissions:**
   - Webhook must have channel access

3. **Test webhook directly:**
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test"}' \
     YOUR_WEBHOOK_URL
   ```

### GitHub CLI Not Working

**Symptoms:**
- "gh CLI not available" error
- GitHub panel empty

**Solutions:**

1. **Install gh CLI:**
   ```bash
   brew install gh  # macOS
   ```

2. **Authenticate:**
   ```bash
   gh auth login
   gh auth status
   ```

3. **Check repository access:**
   ```bash
   gh repo view
   ```

## Getting Help

If these solutions don't resolve your issue:

1. **Check server logs:**
   ```bash
   # Logs appear in terminal running npm run dev
   ```

2. **Enable debug logging:**
   ```bash
   LOG_LEVEL=debug npm run dev
   ```

3. **Report an issue:**
   - Include error messages
   - Include steps to reproduce
   - Include environment details
