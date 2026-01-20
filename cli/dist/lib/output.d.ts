/**
 * Output utilities for CLI
 *
 * Provides styled output functions using chalk and ora.
 */
import chalk from 'chalk';
import { type Ora } from 'ora';
/**
 * Color constants for consistent styling
 */
export declare const colors: {
    success: import("chalk").ChalkInstance;
    error: import("chalk").ChalkInstance;
    warning: import("chalk").ChalkInstance;
    info: import("chalk").ChalkInstance;
    dim: import("chalk").ChalkInstance;
    bold: import("chalk").ChalkInstance;
    running: import("chalk").ChalkInstance;
    stopped: import("chalk").ChalkInstance;
    dead: import("chalk").ChalkInstance;
};
/**
 * Print a success message
 */
export declare function success(message: string): void;
/**
 * Print an error message
 */
export declare function error(message: string): void;
/**
 * Print a warning message
 */
export declare function warn(message: string): void;
/**
 * Print an info message
 */
export declare function info(message: string): void;
/**
 * Create a spinner for long-running operations
 */
export declare function spinner(message: string): Ora;
/**
 * Print a table header row
 */
export declare function tableHeader(...columns: Array<{
    text: string;
    width: number;
}>): void;
/**
 * Print a table row
 */
export declare function tableRow(...columns: Array<{
    text: string;
    width: number;
    color?: typeof chalk;
}>): void;
/**
 * Print an empty state message
 */
export declare function emptyState(message: string, hint?: string): void;
//# sourceMappingURL=output.d.ts.map