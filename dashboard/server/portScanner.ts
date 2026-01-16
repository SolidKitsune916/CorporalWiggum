import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PortProcess {
  pid: number;
  name: string;
  port: number;
  protocol: 'TCP' | 'UDP';
  state: string;
  user: string;
}

/**
 * Scan system for all processes using network ports
 * Uses lsof on macOS/Linux
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

      // Filter to common dev port ranges (1024-65535, focus on 3000-9999)
      // But include all ports for completeness
      if (port < 1024) continue; // Skip privileged ports

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
    console.error('Failed to scan ports:', error);
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
