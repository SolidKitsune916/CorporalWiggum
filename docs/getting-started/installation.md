# Installation

## Prerequisites

- **Node.js** 20 or later
- **npm** 10 or later
- **Claude CLI** installed and configured
- **Git** for version control

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/SolidKitsune916/CorporalWiggum.git
cd CorporalWiggum
```

### 2. Run Setup

The setup script will install all dependencies and configure the project:

```bash
npm run setup
```

This installs:
- Dashboard frontend dependencies
- Server dependencies
- SQLite database for session persistence
- Playwright browsers for E2E testing (optional)

### 3. Verify Installation

```bash
# Check dependencies
npm run check

# Run the dashboard
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to verify the dashboard is running.

## Configuration

### Environment Variables

Create a `.env` file in the dashboard directory:

```bash
# Optional: Sentry DSN for error tracking
SENTRY_DSN=your-sentry-dsn

# Optional: Custom ports
PORT=3001
VITE_WS_PORT=3001

# Optional: Log level
LOG_LEVEL=info
```

### Claude CLI Configuration

Ensure Claude CLI is installed and configured:

```bash
# Verify Claude CLI
claude --version

# Authenticate if needed
claude login
```

## Directory Structure

```
CorporalWiggum/
├── dashboard/           # React frontend + Express backend
│   ├── src/            # Frontend source
│   ├── server/         # Backend source
│   └── tests/          # Test files
├── agents/             # Specialist agent definitions
├── docs/               # This documentation
├── specs/              # Feature specifications
└── loop.sh            # Main loop script
```

## Next Steps

- [Quickstart Guide](/getting-started/quickstart) - Get running in 5 minutes
- [Your First Loop](/getting-started/first-loop) - Run your first autonomous coding loop
