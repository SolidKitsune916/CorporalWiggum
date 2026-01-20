/**
 * Standard exit codes for CLI commands
 *
 * Using consistent exit codes enables scriptability and CI/CD integration.
 * Based on sysexits.h conventions where applicable.
 */

export const EXIT_CODES = {
  /** Command succeeded */
  SUCCESS: 0,
  /** General error (catch-all) */
  GENERAL_ERROR: 1,
  /** Invalid arguments or options */
  INVALID_USAGE: 2,
  /** Resource not found (project, session, file) */
  NOT_FOUND: 64,
  /** Resource conflict (e.g., loop already running) */
  ALREADY_EXISTS: 65,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
