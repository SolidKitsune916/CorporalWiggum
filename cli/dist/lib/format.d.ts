/**
 * Formatting utilities for CLI output
 */
/**
 * Format a duration from ISO date string to human-readable format
 *
 * @param startedAt - ISO date string
 * @returns Human-readable duration like "2h 15m" or "45s"
 */
export declare function formatDuration(startedAt: string): string;
/**
 * Format a cost value to currency string
 *
 * @param cost - Cost in USD
 * @returns Formatted string like "$1.23" or "$0.00"
 */
export declare function formatCost(cost: number): string;
/**
 * Format process status with color
 *
 * @param isAlive - Whether the process is alive
 * @returns Colored status string
 */
export declare function formatStatus(isAlive: boolean): string;
/**
 * Pad a column to a specific width, truncating if necessary
 *
 * @param text - Text to pad
 * @param width - Target width
 * @returns Padded/truncated string
 */
export declare function padColumn(text: string, width: number): string;
/**
 * Truncate path for display, showing first and last parts
 *
 * @param filepath - Full path
 * @param maxLength - Maximum length
 * @returns Truncated path like "/Users/.../project"
 */
export declare function truncatePath(filepath: string, maxLength: number): string;
//# sourceMappingURL=format.d.ts.map