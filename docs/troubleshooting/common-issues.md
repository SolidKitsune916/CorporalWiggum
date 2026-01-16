# Troubleshooting

Common issues and solutions for R.A.L.P.H.

## Installation Issues

### "claude: command not found"

The Claude CLI is not installed or not in PATH.

```bash
# Install Claude CLI
npm install -g @anthropic-ai/claude-cli

# Verify installation
claude --version
```

### "npm: command not found"

Node.js is not installed.

```bash
# macOS
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Dashboard Won't Start

1. Check Node.js version (requires 18+):
   ```bash
   node --version
   ```

2. Reinstall dependencies:
   ```bash
   cd dashboard && rm -rf node_modules && npm install
   ```

3. Check for port conflicts:
   ```bash
   lsof -i :5173  # Vite dev server
   lsof -i :3001  # Backend server
   ```

## Loop Issues

### Loop Stuck on Same Task

Symptoms: Same task attempted repeatedly without progress.

Solutions:
1. Check if task is too vague - add more detail to IMPLEMENTATION_PLAN.md
2. Review Claude's output in logs for errors
3. Manually complete the blocking task and restart

### "ALL_TASKS_COMPLETE" Prematurely

Claude may signal completion when tasks remain.

Solutions:
1. Ensure tasks in IMPLEMENTATION_PLAN.md use `- [ ]` checkbox format
2. Check for parsing issues in task list
3. Add more explicit task descriptions

### Context Window Exhausted

Long-running loops may exceed context limits.

Solutions:
1. Use `--max-iterations` flag to limit loop length
2. Break large features into smaller plans
3. Review generated code for unnecessary verbosity

## Connection Issues

### WebSocket Disconnects

Dashboard loses connection to backend.

Solutions:
1. Check backend is still running:
   ```bash
   ps aux | grep "tsx server"
   ```

2. Restart the dashboard:
   ```bash
   npm run dev
   ```

3. Check for firewall blocking localhost connections

### "Failed to fetch" Errors

API calls failing from dashboard.

Solutions:
1. Ensure backend is running on expected port
2. Check browser console for CORS errors
3. Verify no proxy interference

## Git Issues

### "Not a git repository"

R.A.L.P.H. requires a git repository.

```bash
cd your-project
git init
git add -A
git commit -m "Initial commit"
```

### Commit Failures

Claude's commits may fail due to hooks or conflicts.

Solutions:
1. Check pre-commit hooks aren't blocking
2. Ensure no merge conflicts exist
3. Verify git user is configured:
   ```bash
   git config user.email "you@example.com"
   git config user.name "Your Name"
   ```

## Performance Issues

### Slow Dashboard

Solutions:
1. Clear browser cache
2. Reduce log history in settings
3. Close other resource-intensive applications

### High CPU During Loop

Normal during Claude execution. If persistent:
1. Check for infinite loops in generated code
2. Review test suite for hanging tests
3. Monitor with `top` or Activity Monitor

## Configuration Issues

### AGENTS.md Not Detected

Solutions:
1. Ensure file is in project root
2. Check file permissions
3. Verify file encoding is UTF-8

### Tasks Not Parsing

IMPLEMENTATION_PLAN.md format issues.

Required format:
```markdown
- [ ] Task description here
- [x] Completed task
```

Supported variations:
```markdown
## User Story (US-001)
- [ ] 1. Numbered task
- [ ] Task with emoji ✅
```

## Getting Help

If issues persist:

1. Check logs in dashboard Logs tab
2. Review terminal output from `loop.sh`
3. Open an issue at [GitHub](https://github.com/anthropics/ralph-wiggum/issues)
4. Include: OS version, Node version, error messages, steps to reproduce
