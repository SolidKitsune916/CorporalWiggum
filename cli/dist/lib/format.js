/**
 * Formatting utilities for CLI output
 */
import chalk from 'chalk';
/**
 * Format a duration from ISO date string to human-readable format
 *
 * @param startedAt - ISO date string
 * @returns Human-readable duration like "2h 15m" or "45s"
 */
export function formatDuration(startedAt) {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}
/**
 * Format a cost value to currency string
 *
 * @param cost - Cost in USD
 * @returns Formatted string like "$1.23" or "$0.00"
 */
export function formatCost(cost) {
    return `$${cost.toFixed(2)}`;
}
/**
 * Format process status with color
 *
 * @param isAlive - Whether the process is alive
 * @returns Colored status string
 */
export function formatStatus(isAlive) {
    return isAlive ? chalk.green('running') : chalk.red('dead');
}
/**
 * Pad a column to a specific width, truncating if necessary
 *
 * @param text - Text to pad
 * @param width - Target width
 * @returns Padded/truncated string
 */
export function padColumn(text, width) {
    if (text.length >= width) {
        return text.slice(0, width - 1) + ' ';
    }
    return text.padEnd(width);
}
/**
 * Truncate path for display, showing first and last parts
 *
 * @param filepath - Full path
 * @param maxLength - Maximum length
 * @returns Truncated path like "/Users/.../project"
 */
export function truncatePath(filepath, maxLength) {
    if (filepath.length <= maxLength) {
        return filepath;
    }
    const parts = filepath.split('/').filter(Boolean);
    if (parts.length <= 2) {
        return filepath.slice(0, maxLength - 3) + '...';
    }
    // Keep first and last two parts
    const first = parts[0];
    const last = parts.slice(-2).join('/');
    // Calculate how much space we have
    const prefix = first.startsWith('~') || filepath.startsWith('/') ? '/' : '';
    const truncated = `${prefix}${first}/.../${last}`;
    if (truncated.length <= maxLength) {
        return truncated;
    }
    return filepath.slice(0, maxLength - 3) + '...';
}
//# sourceMappingURL=format.js.map