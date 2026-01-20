/**
 * Output utilities for CLI
 *
 * Provides styled output functions using chalk and ora.
 */

import chalk from 'chalk';
import ora, { type Ora } from 'ora';

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
export function success(message: string): void {
  console.log(colors.success(message));
}

/**
 * Print an error message
 */
export function error(message: string): void {
  console.error(colors.error(message));
}

/**
 * Print a warning message
 */
export function warn(message: string): void {
  console.log(colors.warning(message));
}

/**
 * Print an info message
 */
export function info(message: string): void {
  console.log(colors.info(message));
}

/**
 * Create a spinner for long-running operations
 */
export function spinner(message: string): Ora {
  return ora(message);
}

/**
 * Print a table header row
 */
export function tableHeader(...columns: Array<{ text: string; width: number }>): void {
  const row = columns.map(col => col.text.padEnd(col.width)).join('');
  console.log(colors.dim(row));
  console.log(colors.dim('-'.repeat(columns.reduce((sum, col) => sum + col.width, 0))));
}

/**
 * Print a table row
 */
export function tableRow(...columns: Array<{ text: string; width: number; color?: typeof chalk }>): void {
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
export function emptyState(message: string, hint?: string): void {
  console.log(colors.dim(message));
  if (hint) {
    console.log(colors.dim(`Hint: ${hint}`));
  }
}
