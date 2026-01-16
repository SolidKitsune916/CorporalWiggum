---
layout: home

hero:
  name: "Corporal WIGGUM"
  text: "R.A.L.P.H."
  tagline: Recursive Autonomous Loop for Programming Humans
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/installation
    - theme: alt
      text: View on GitHub
      link: https://github.com/your-repo/ralph-wiggum

features:
  - icon: 🔄
    title: Autonomous Loops
    details: Run iterative development loops that implement tasks, validate changes, and commit progress automatically.
  - icon: 📋
    title: Smart Planning
    details: Generate implementation plans from PRDs, specs, and existing code using AI-powered analysis.
  - icon: 🛡️
    title: Safety Controls
    details: Built-in safeguards including iteration limits, cost tracking, and approval workflows.
  - icon: 📊
    title: Real-time Dashboard
    details: Monitor loop progress, view logs, manage tasks, and control execution through an intuitive web interface.
  - icon: 🔗
    title: Integrations
    details: Connect with GitHub, Slack, Discord, and custom webhooks for notifications and automation.
  - icon: ♿
    title: Accessible
    details: WCAG 2.2 AA compliant with keyboard navigation, screen reader support, and high contrast modes.
---

## What is Corporal WIGGUM?

Corporal WIGGUM is an autonomous development assistant that runs iterative "loops" to implement software features. It combines AI-powered code generation with structured workflows to:

- **Plan** - Analyze requirements and generate implementation plans
- **Build** - Implement tasks one at a time with full validation
- **Review** - Assess code quality and documentation alignment
- **Iterate** - Learn from each cycle to improve results

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-repo/ralph-wiggum.git
cd ralph-wiggum/RalphWiggumV2/dashboard

# Install dependencies
npm install

# Start the dashboard
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Key Concepts

### Loops

A **loop** is a single iteration of the development cycle. Each loop:

1. Reads the current task from `IMPLEMENTATION_PLAN.md`
2. Implements the task following project rules
3. Runs validation (tests, linting, type checking)
4. Commits changes on success
5. Updates the plan for the next iteration

### Modes

WIGGUM supports multiple operating modes:

| Mode | Purpose |
|------|---------|
| **Build** | Implement tasks from the plan |
| **Plan** | Generate/update implementation plans |
| **Plan SLC** | Create Simple, Lovable, Complete release slices |
| **Plan Work** | Scope planning for feature branches |

### Configuration Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Project-specific build/test commands |
| `CLAUDE.md` | Instructions for the AI assistant |
| `IMPLEMENTATION_PLAN.md` | Current tasks and priorities |
| `PRD.md` | Product requirements document |
| `AUDIENCE_JTBD.md` | Jobs-to-be-done analysis |
