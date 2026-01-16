# GitHub Integration

R.A.L.P.H. integrates with GitHub via the `gh` CLI for PR management, issues, and workflow monitoring.

## Prerequisites

1. Install GitHub CLI:
   ```bash
   # macOS
   brew install gh

   # Ubuntu/Debian
   sudo apt install gh
   ```

2. Authenticate:
   ```bash
   gh auth login
   ```

## Features

### Pull Requests

View and manage PRs from the dashboard:

- **List PRs** - See open pull requests
- **PR Details** - View description, status, reviews
- **Workflow Status** - Check CI status

### Issues

Track issues related to your project:

- **Open Issues** - List pending issues
- **Issue Details** - View description, labels

### Repository Info

Quick access to repository metadata:

- Branch information
- Recent commits
- Workflow runs

## Dashboard Usage

The GitHub Panel is available in the dashboard:

1. Go to **Dashboard** tab
2. Find the **GitHub** section
3. Click **Refresh** to fetch latest data

### Available Actions

- **Check Status** - Refresh all GitHub data
- **View PR** - Open PR in browser
- **View Issue** - Open issue in browser

## Configuration

### Setup

The integration uses your system's `gh` CLI authentication. Ensure you're logged in:

```bash
gh auth status
```

### Environment Variables

Optional configuration:

```bash
# Override default repo (auto-detected from git)
GITHUB_REPO=owner/repo
```

## API Reference

The GitHub service exposes these methods:

```typescript
// Get current user
const user = await githubService.getCurrentUser();

// List pull requests
const prs = await githubService.listPRs({ state: 'open' });

// Get PR details
const pr = await githubService.getPR(123);

// List issues
const issues = await githubService.listIssues({ state: 'open', labels: 'bug' });

// Get repository info
const repo = await githubService.getRepoInfo();
```

## Troubleshooting

### "gh command not found"

Install GitHub CLI and ensure it's in your PATH.

### "Not authenticated"

Run `gh auth login` to authenticate.

### Rate Limiting

GitHub has rate limits. If you see 403 errors, wait and retry.
