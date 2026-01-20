/**
 * GracefulShutdown - Reliable process termination with verification
 *
 * Provides verified process termination with graceful shutdown escalation:
 * SIGTERM -> wait -> SIGKILL -> verify
 *
 * Ensures the process is actually dead before reporting success, preventing
 * "phantom running" states where UI shows stopped but process is still alive.
 */

import { execSync } from 'child_process';

/**
 * Result of a stop operation
 */
export interface StopResult {
  /** Whether the process was successfully terminated */
  success: boolean;
  /** Method that achieved termination */
  method: 'sigterm' | 'sigkill' | 'already_dead' | 'failed';
  /** How long the termination took in milliseconds */
  durationMs: number;
}

/**
 * Handles graceful process termination with verification
 */
export class GracefulShutdown {
  /**
   * Check if a process is alive using signal 0
   *
   * Signal 0 doesn't send any signal but checks if the process exists.
   * - Returns true if process exists and we have permission
   * - Returns true if EPERM (process exists but no permission)
   * - Returns false if ESRCH (no such process)
   */
  isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      // EPERM means process exists but no permission - still alive
      return error.code === 'EPERM';
    }
  }

  /**
   * Stop a process and verify it's actually dead
   *
   * @param pid - Process ID to terminate
   * @param timeoutMs - How long to wait for graceful shutdown before SIGKILL (default 5000ms)
   * @returns StopResult indicating success, method used, and duration
   */
  async stopAndVerify(pid: number, timeoutMs: number = 5000): Promise<StopResult> {
    const startTime = Date.now();

    // Check if already dead
    if (!this.isProcessAlive(pid)) {
      return { success: true, method: 'already_dead', durationMs: 0 };
    }

    // Send SIGTERM to process group
    this.killProcessGroup(pid, 'SIGTERM');

    // Poll until dead or timeout
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await this.sleep(100);
      if (!this.isProcessAlive(pid)) {
        return {
          success: true,
          method: 'sigterm',
          durationMs: Date.now() - startTime,
        };
      }
    }

    // Escalate to SIGKILL
    this.killProcessGroup(pid, 'SIGKILL');
    await this.sleep(200);

    const stillAlive = this.isProcessAlive(pid);
    return {
      success: !stillAlive,
      method: stillAlive ? 'failed' : 'sigkill',
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Kill a process group (or individual process as fallback)
   *
   * On Unix: Sends signal to process group (-pid) to kill all children
   * On Windows: Uses taskkill /T to kill process tree
   *
   * @param pid - Process ID (positive)
   * @param signal - Signal name ('SIGTERM' or 'SIGKILL')
   */
  killProcessGroup(pid: number, signal: 'SIGTERM' | 'SIGKILL'): void {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      // On Windows, use taskkill to kill the process tree
      // /T = kill process tree, /F = force
      const forceFlag = signal === 'SIGKILL' ? '/F' : '';
      try {
        execSync(`taskkill /pid ${pid} /T ${forceFlag}`, { stdio: 'ignore' });
      } catch {
        // taskkill may fail if process already dead - that's fine
      }
    } else {
      // On Unix, try process group first (negative PID)
      try {
        process.kill(-pid, signal);
      } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException;
        // ESRCH means no process group - try direct kill
        if (error.code === 'ESRCH' || error.code === 'EPERM') {
          try {
            process.kill(pid, signal);
          } catch {
            // Process may already be dead - that's fine
          }
        }
      }
    }
  }

  /**
   * Sleep helper for async/await
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
