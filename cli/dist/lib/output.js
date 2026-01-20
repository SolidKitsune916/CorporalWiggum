/**
 * Output utilities for CLI
 *
 * Provides styled output functions using chalk and ora.
 */
import chalk from 'chalk';
import ora from 'ora';
/**
 * Color constants for consistent styling
 */
export const colors = {
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
    dim: chalk.dim,
    bold: chalk.bold,
    running: chalk.green,
    stopped: chalk.dim,
    dead: chalk.red,
};
/**
 * Print a success message
 */
export function success(message) {
    console.log(colors.success(message));
}
/**
 * Print an error message
 */
export function error(message) {
    console.error(colors.error(message));
}
/**
 * Print a warning message
 */
export function warn(message) {
    console.log(colors.warning(message));
}
/**
 * Print an info message
 */
export function info(message) {
    console.log(colors.info(message));
}
/**
 * Create a spinner for long-running operations
 */
export function spinner(message) {
    return ora(message);
}
/**
 * Print a table header row
 */
export function tableHeader(...columns) {
    const row = columns.map(col => col.text.padEnd(col.width)).join('');
    console.log(colors.dim(row));
    console.log(colors.dim('-'.repeat(columns.reduce((sum, col) => sum + col.width, 0))));
}
/**
 * Print a table row
 */
export function tableRow(...columns) {
    const row = columns
        .map(col => {
        const text = col.text.slice(0, col.width - 1).padEnd(col.width);
        return col.color ? col.color(text) : text;
    })
        .join('');
    console.log(row);
}
/**
 * Print an empty state message
 */
export function emptyState(message, hint) {
    console.log(colors.dim(message));
    if (hint) {
        console.log(colors.dim(`Hint: ${hint}`));
    }
}
//# sourceMappingURL=output.js.map