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
      link: https://github.com/SolidKitsune916/CorporalWiggum

features:
  - title: Autonomous Coding Loops
    details: Let Claude handle repetitive coding tasks while you focus on architecture and design decisions.
  - title: Multi-Project Management
    details: Manage multiple projects from a single launcher with independent dashboard instances.
  - title: Safety Controls
    details: Built-in guardrails including max iterations, file size limits, and path traversal prevention.
  - title: Real-time Monitoring
    details: Watch Claude work in real-time with structured logging, metrics, and alerts.
---

## What is R.A.L.P.H.?

R.A.L.P.H. (Recursive Autonomous Loop for Programming Humans) is a dashboard and loop management system for autonomous coding with Claude. It implements the "Ralph Wiggum" technique - letting AI handle implementation while humans provide direction.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/SolidKitsune916/CorporalWiggum.git
cd CorporalWiggum

# Install dependencies
npm run setup

# Start the dashboard
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) to access the dashboard.

## Key Features

- **Loop Modes**: Build, Plan, Plan-SLC, Plan-Work, and Review modes
- **Project Launcher**: Multi-instance support for managing multiple projects
- **Plan Generation**: AI-assisted implementation plan creation
- **Code Review**: LLM-as-Judge quality reviews for subjective criteria
- **Integrations**: GitHub, Slack, Discord, and custom webhooks
