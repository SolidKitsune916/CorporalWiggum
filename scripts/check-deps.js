#!/usr/bin/env node

/**
 * Dependency verification script for Ralph Wiggum V3
 * Checks required and optional dependencies before startup
 */

import { execSync } from 'child_process';

const DEPENDENCIES = [
  {
    name: 'Node.js',
    command: 'node --version',
    minVersion: '18.0.0',
    required: true,
    installUrl: 'https://nodejs.org'
  },
  {
    name: 'npm',
    command: 'npm --version',
    minVersion: '8.0.0',
    required: true,
    installUrl: 'Included with Node.js'
  },
  {
    name: 'Git',
    command: 'git --version',
    minVersion: '2.30.0',
    required: false,
    installUrl: 'https://git-scm.com'
  },
  {
    name: 'Claude CLI',
    command: 'claude --version',
    minVersion: null,
    required: true,
    installUrl: 'https://claude.ai/cli'
  },
  {
    name: 'Bash',
    command: 'bash --version',
    minVersion: null,
    required: true,
    installUrl: 'Included in Unix/macOS, Git Bash for Windows'
  }
];

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function parseVersion(versionString) {
  const match = versionString.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

function compareVersions(current, min) {
  if (!current || !min) return true;

  const curr = parseVersion(current);
  const minimum = parseVersion(min);

  if (!curr || !minimum) return true;

  if (curr.major > minimum.major) return true;
  if (curr.major < minimum.major) return false;
  if (curr.minor > minimum.minor) return true;
  if (curr.minor < minimum.minor) return false;
  return curr.patch >= minimum.patch;
}

function checkDependency(dep) {
  try {
    const output = execSync(dep.command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : output;

    const meetsMinVersion = compareVersions(version, dep.minVersion);

    return {
      installed: true,
      version,
      meetsMinVersion,
      error: null
    };
  } catch {
    return {
      installed: false,
      version: null,
      meetsMinVersion: false,
      error: 'Not found'
    };
  }
}

function printStatus(dep, result) {
  const statusIcon = result.installed && result.meetsMinVersion
    ? `${colors.green}✓${colors.reset}`
    : (result.installed
      ? `${colors.yellow}!${colors.reset}`
      : `${colors.red}✗${colors.reset}`);

  const versionInfo = result.version
    ? `v${result.version}`
    : 'not installed';

  const minVersionInfo = dep.minVersion
    ? ` (min: ${dep.minVersion})`
    : '';

  const requiredTag = dep.required
    ? `${colors.bold}[required]${colors.reset}`
    : '[optional]';

  console.log(`  ${statusIcon} ${dep.name}: ${versionInfo}${minVersionInfo} ${requiredTag}`);

  if (!result.installed || !result.meetsMinVersion) {
    console.log(`    → Install: ${dep.installUrl}`);
  }
}

function main() {
  console.log(`\n${colors.bold}Ralph Wiggum V3 - Dependency Check${colors.reset}\n`);
  console.log('Checking dependencies...\n');

  let hasErrors = false;
  let hasWarnings = false;

  for (const dep of DEPENDENCIES) {
    const result = checkDependency(dep);
    printStatus(dep, result);

    if (dep.required && (!result.installed || !result.meetsMinVersion)) {
      hasErrors = true;
    }

    if (!dep.required && (!result.installed || !result.meetsMinVersion)) {
      hasWarnings = true;
    }
  }

  console.log('');

  if (hasErrors) {
    console.log(`${colors.red}${colors.bold}ERROR: Missing required dependencies.${colors.reset}`);
    console.log('Please install the required dependencies above before continuing.\n');
    process.exit(1);
  }

  if (hasWarnings) {
    console.log(`${colors.yellow}${colors.bold}WARNING: Some optional dependencies are missing.${colors.reset}`);
    console.log('The application will work but some features may be limited.\n');
  }

  console.log(`${colors.green}${colors.bold}All required dependencies are installed!${colors.reset}\n`);
  process.exit(0);
}

main();
