/**
 * JSON output utilities for CLI commands
 *
 * Provides structured JSON output for machine-readable responses.
 * All JSON output goes to stdout for consistent parsing.
 */

/**
 * Standard JSON output envelope
 */
export interface JsonOutput<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    timestamp: string;
    version: string;
  };
}

/**
 * CLI version (should match package.json)
 */
const CLI_VERSION = '3.0.0';

/**
 * Output successful JSON response to stdout
 */
export function outputJson<T>(data: T): void {
  const output: JsonOutput<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      version: CLI_VERSION,
    },
  };
  console.log(JSON.stringify(output, null, 2));
}

/**
 * Output error JSON response to stdout
 * Note: Goes to stdout (not stderr) for consistent parsing by scripts
 */
export function outputJsonError(error: string): void {
  const output: JsonOutput<never> = {
    success: false,
    error,
    metadata: {
      timestamp: new Date().toISOString(),
      version: CLI_VERSION,
    },
  };
  console.log(JSON.stringify(output, null, 2));
}
