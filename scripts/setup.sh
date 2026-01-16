#!/bin/bash

# Ralph Wiggum V3 Setup Script
# Automated setup for the dashboard application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Ralph Wiggum V3 Setup Script       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ is required. Please install from https://nodejs.org${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version OK (v$(node --version | cut -d'v' -f2))${NC}"

# Detect operating mode
echo ""
echo -e "${YELLOW}Detecting operating mode...${NC}"

# Check if we're embedded in a project (parent has package.json, .git, etc.)
PARENT_DIR="$(dirname "$ROOT_DIR")"
if [ -f "$PARENT_DIR/package.json" ] || [ -d "$PARENT_DIR/.git" ]; then
    MODE="embedded"
    PROJECT_PATH="$PARENT_DIR"
    echo -e "${GREEN}✓ Embedded mode detected${NC}"
    echo -e "  Target project: $PROJECT_PATH"
else
    MODE="standalone"
    PROJECT_PATH=""
    echo -e "${YELLOW}! Standalone mode detected${NC}"
    echo -e "  Set PROJECT_PATH in .env to point to your target project"
fi

# Create .env if it doesn't exist
echo ""
echo -e "${YELLOW}Checking environment configuration...${NC}"
if [ ! -f "$ROOT_DIR/.env" ]; then
    if [ -f "$ROOT_DIR/.env.example" ]; then
        cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"

        # Update PROJECT_PATH in .env for embedded mode
        if [ "$MODE" = "embedded" ]; then
            sed -i.bak "s|^PROJECT_PATH=.*|PROJECT_PATH=$PROJECT_PATH|" "$ROOT_DIR/.env" && rm -f "$ROOT_DIR/.env.bak"
        fi

        echo -e "${GREEN}✓ Created .env from template${NC}"
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Install dashboard dependencies
echo ""
echo -e "${YELLOW}Installing dashboard dependencies...${NC}"
cd "$ROOT_DIR/dashboard"
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✓ Dashboard dependencies installed${NC}"
else
    echo -e "${RED}Error: dashboard/package.json not found${NC}"
    exit 1
fi

# Run dependency check
echo ""
echo -e "${YELLOW}Running dependency verification...${NC}"
cd "$ROOT_DIR"
node scripts/check-deps.js || true

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Setup Complete!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Operating mode: ${BLUE}$MODE${NC}"
if [ "$MODE" = "embedded" ]; then
    echo -e "Target project: ${BLUE}$PROJECT_PATH${NC}"
else
    echo -e "Target project: ${YELLOW}Not configured - set PROJECT_PATH in .env${NC}"
fi
echo ""
echo -e "To start the dashboard:"
echo -e "  ${BLUE}npm start${NC}"
echo ""
echo -e "Or for development mode:"
echo -e "  ${BLUE}npm run dev${NC}"
echo ""
