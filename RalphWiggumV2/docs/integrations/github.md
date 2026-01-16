# GitHub Integration

WIGGUM integrates with GitHub using the `gh` CLI for repository operations.

## Prerequisites

### Install GitHub CLI

```bash
# macOS
brew install gh

# Windows
winget install --id GitHub.cli

# Linux
sudo apt install gh
```

### Authenticate

```bash
gh auth login
```

Follow the prompts to authenticate with your GitHub account.

## Features

### Pull Request Management

View and manage pull requests from the dashboard:

- List open PRs
- View PR details
- Create new PRs
- Check review status

### Issue Tracking

Monitor repository issues:

- List open issues
- View issue details
- Create new issues

### Workflow Status

Check GitHub Actions:

- Recent workflow runs
- Build status
- Deployment status

## Dashboard Integration

### GitHub Panel

The GitHub Panel displays:

1. **Repository Info** - Name, owner, visibility
2. **Pull Requests** - Open PRs with status
3. **Issues** - Open issues by priority
4. **Workflows** - Recent CI/CD runs

### Enabling the Panel

The GitHub panel appears automatically when:

- `gh` CLI is installed
- You're authenticated
- The project is a Git repository

## API Usage

### Service Methods

```typescript
import { githubService } from './integrations/githubService';

// Check availability
const available = await githubService.isAvailable();

// Get repo info
const repo = await githubService.getRepoInfo();

// List PRs
const prs = await githubService.listPRs('open', 10);

// Create PR
const pr = await githubService.createPR(
  'Add new feature',
  'Description of changes',
  'main',
  false // not draft
);

// List issues
const issues = await githubService.listIssues('open', 10);
```

### WebSocket Messages

```typescript
// Request PR list
ws.send(JSON.stringify({
  type: 'github:prs',
  payload: { state: 'open', limit: 10 }
}));

// Response
{
  type: 'github:prs:result',
  payload: [{
    number: 123,
    title: 'Feature PR',
    url: 'https://github.com/...',
    state: 'open',
    author: 'username',
    isDraft: false
  }]
}
```

## Automated PR Creation

WIGGUM can automatically create PRs after completing a feature:

### Configuration

In AGENTS.md:

```markdown
## GitHub Integration
- Auto-create PRs: Yes
- PR template: .github/pull_request_template.md
- Default reviewers: @team-lead, @reviewer
```

### PR Content

Auto-generated PRs include:

- Summary of changes
- List of commits
- Test status
- Related issues

## Workflow Triggers

### On Loop Completion

Trigger GitHub Actions when a loop completes:

```typescript
notificationService.configure({
  webhooks: {
    enabled: true,
    events: ['loop:completed']
  }
});
```

### GitHub Actions Integration

Example workflow triggered by WIGGUM:

```yaml
name: WIGGUM Post-Loop
on:
  repository_dispatch:
    types: [wiggum-loop-complete]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./deploy.sh
```

## Best Practices

### Branch Strategy

Use feature branches for loop work:

```bash
# Create feature branch
git checkout -b feature/my-feature

# Run loop on branch
# WIGGUM creates commits

# Create PR when done
gh pr create
```

### Commit Messages

WIGGUM generates conventional commits:

```
feat: Add user authentication
fix: Resolve login validation bug
refactor: Improve error handling
test: Add unit tests for auth
```

### PR Reviews

After loop completion:

1. Review all commits
2. Check code quality
3. Run full test suite
4. Request team review

## Troubleshooting

### gh CLI Not Found

```bash
# Verify installation
which gh

# Check version
gh --version
```

### Authentication Issues

```bash
# Re-authenticate
gh auth logout
gh auth login

# Verify status
gh auth status
```

### Permission Denied

Ensure your GitHub token has required scopes:

- `repo` - Full repository access
- `workflow` - Workflow access (optional)

## Next Steps

- [Slack Integration](/integrations/slack) - Team notifications
- [Webhooks](/integrations/webhooks) - Custom integrations
