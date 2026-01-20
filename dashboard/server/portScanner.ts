import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './lib/logger.js';

const execAsync = promisify(exec);

export interface PortProcess {
  pid: number;
  name: string;
  port: number;
  protocol: 'TCP' | 'UDP';
  state: string;
  user: string;
}

// Processes to exclude from the port list (consumer apps, browsers, etc.)
const EXCLUDED_PROCESSES = new Set([
  'Spotify',
  'spotify',
  'Google',
  'Chrome',
  'Firefox',
  'Safari',
  'Arc',
  'Brave',
  'Edge',
  'Opera',
  'Slack',
  'Discord',
  'Zoom',
  'zoom.us',
  'Teams',
  'Electron',  // Generic Electron apps (if name is just "Electron")
  'Dropbox',
  'OneDrive',
  'iCloud',
  'CloudApp',
  'Notion',
  'Figma',
  'FigmaAgent',
  'Creative',  // Adobe Creative Cloud
  'Adobe',
  'Finder',
  'Mail',
  'Messages',
  'FaceTime',
  'Music',
  'TV',
  'Podcasts',
  'Photos',
  'Preview',
  'Notes',
  'Reminders',
  'Calendar',
  'rapportd',   // macOS system
  'identitys',  // macOS system
  'sharingd',   // macOS system
  'AMPDevices', // Apple services
  'ControlCe',  // Control Center
  'SystemUI',   // System UI
  'coreautha',  // Core auth
  'accessori',  // Accessories
  'Siri',
  '1Password',
  'Bitwarden',
  'LastPass',
  'mDNSRespo',  // mDNS Responder
  'CrashRepo',  // Crash Reporter
  'SystemPre',  // System Preferences
  'Keychain',
  'loginwind',  // Login window
]);

// Development-related process names to always include
const DEV_PROCESSES = new Set([
  'node',
  'npm',
  'npx',
  'yarn',
  'pnpm',
  'bun',
  'deno',
  'vite',
  'esbuild',
  'webpack',
  'next',
  'nuxt',
  'python',
  'python3',
  'ruby',
  'rails',
  'go',
  'rust',
  'cargo',
  'java',
  'gradle',
  'maven',
  'docker',
  'postgres',
  'mysql',
  'mongo',
  'redis',
  'nginx',
  'apache',
  'http-serv',
  'live-serv',
  'tsx',
  'ts-node',
  'nodemon',
  'PM2',
  'claude',
  'cursor',
  'code',  // VS Code
  'Code',
]);

// Common development port ranges
const DEV_PORT_RANGES = [
  { min: 3000, max: 3999 },  // React, Express, etc.
  { min: 4000, max: 4999 },  // Various dev servers
  { min: 5000, max: 5999 },  // Flask, Vite, etc.
  { min: 6000, max: 6999 },  // Various
  { min: 8000, max: 8999 },  // Django, various servers
  { min: 9000, max: 9999 },  // Various
  { min: 5432, max: 5432 },  // PostgreSQL
  { min: 3306, max: 3306 },  // MySQL
  { min: 27017, max: 27017 }, // MongoDB
  { min: 6379, max: 6379 },  // Redis
];

/**
 * Check if a port is in common development ranges
 */
function isDevPort(port: number): boolean {
  return DEV_PORT_RANGES.some(range => port >= range.min && port <= range.max);
}

/**
 * Check if a process name looks like a development process
 */
function isDevProcess(name: string): boolean {
  const lowerName = name.toLowerCase();
  
  // Check if explicitly excluded
  for (const excluded of EXCLUDED_PROCESSES) {
    if (lowerName.includes(excluded.toLowerCase())) {
      return false;
    }
  }
  
  // Check if it's a known dev process
  for (const devProc of DEV_PROCESSES) {
    if (lowerName.includes(devProc.toLowerCase())) {
      return true;
    }
  }
  
  return true; // Default to including if not excluded
}

/**
 * Scan system for development-related processes using network ports
 * Uses lsof on macOS/Linux
 * Filters out consumer applications like Spotify, Chrome, etc.
 */
export async function scanPorts(): Promise<PortProcess[]> {
  try {
    // lsof flags:
    // -i: Select Internet addresses
    // -P: Inhibit conversion of port numbers to port names
    // -n: Inhibit conversion of network numbers to host names
    const { stdout } = await execAsync('lsof -i -P -n 2>/dev/null || true');
    
    const lines = stdout.trim().split('\n');
    if (lines.length <= 1) {
      return [];
    }

    const processes: PortProcess[] = [];
    const seen = new Set<string>(); // Dedupe by pid+port

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/\s+/);
      
      if (parts.length < 9) continue;

      const [name, pidStr, user, , , , , , namePort] = parts;
      const pid = parseInt(pidStr, 10);
      
      if (isNaN(pid)) continue;

      // Parse the NAME column (e.g., "*:3001", "localhost:5173", "127.0.0.1:3001->127.0.0.1:54321")
      // Extract the local port
      const portMatch = namePort.match(/:(\d+)(?:->|$|\s)/);
      if (!portMatch) continue;

      const port = parseInt(portMatch[1], 10);
      if (isNaN(port)) continue;

      // Skip privileged ports
      if (port < 1024) continue;

      // Filter: only include if it's a dev port OR a dev process
      // This filters out random high ports used by consumer apps
      if (!isDevPort(port) && !isDevProcess(name)) {
        continue;
      }

      // Double-check: skip explicitly excluded processes even on dev ports
      if (!isDevProcess(name)) {
        continue;
      }

      // Determine protocol from the TYPE column (usually index 4)
      const typeCol = parts[4] || '';
      const protocol: 'TCP' | 'UDP' = typeCol.includes('UDP') ? 'UDP' : 'TCP';

      // Get state from the last column if it's a state indicator
      const lastPart = parts[parts.length - 1];
      let state = 'UNKNOWN';
      if (lastPart.includes('LISTEN')) {
        state = 'LISTEN';
      } else if (lastPart.includes('ESTABLISHED')) {
        state = 'ESTABLISHED';
      } else if (lastPart.includes('CLOSE_WAIT')) {
        state = 'CLOSE_WAIT';
      } else if (lastPart.includes('TIME_WAIT')) {
        state = 'TIME_WAIT';
      }

      // Dedupe
      const key = `${pid}:${port}`;
      if (seen.has(key)) continue;
      seen.add(key);

      processes.push({
        pid,
        name: name.substring(0, 20), // Truncate long names
        port,
        protocol,
        state,
        user: user.substring(0, 15), // Truncate long usernames
      });
    }

    // Sort by port number
    processes.sort((a, b) => a.port - b.port);

    return processes;
  } catch (error) {
    logger.error('Failed to scan ports', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Kill a process by PID
 * Returns true if successful, false otherwise
 */
export async function killProcess(pid: number): Promise<{ success: boolean; error?: string }> {
  // Validate PID
  if (!Number.isInteger(pid) || pid <= 0) {
    return { success: false, error: 'Invalid PID' };
  }

  // Don't allow killing PID 1 or very low PIDs (system processes)
  if (pid < 100) {
    return { success: false, error: 'Cannot kill system processes' };
  }

  try {
    // First try SIGTERM (graceful shutdown)
    await execAsync(`kill -15 ${pid}`);
    
    // Wait a moment and check if it's still running
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      // Check if process is still running
      await execAsync(`kill -0 ${pid} 2>/dev/null`);
      // If we get here, process is still running - try SIGKILL
      await execAsync(`kill -9 ${pid}`);
    } catch {
      // Process already terminated - good
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's a "no such process" error (already dead)
    if (errorMessage.includes('No such process')) {
      return { success: true }; // Already dead is fine
    }
    
    // Check for permission errors
    if (errorMessage.includes('Operation not permitted')) {
      return { success: false, error: 'Permission denied - cannot kill this process' };
    }

    return { success: false, error: errorMessage };
  }
}
