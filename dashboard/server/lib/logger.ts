/**
 * Structured Logger for WIGGUM
 *
 * A simple structured logging implementation that follows pino-like patterns.
 * Can be easily upgraded to pino by changing the transport.
 *
 * Usage:
 *   import { logger } from './lib/logger.js';
 *   logger.info('Server started', { port: 3001 });
 *   logger.error('Failed to connect', { error: err.message });
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  level: LogLevel;
  time: string;
  msg: string;
  [key: string]: unknown;
}

interface LoggerOptions {
  level?: LogLevel;
  name?: string;
  prettyPrint?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: '\x1b[90m',    // gray
  debug: '\x1b[36m',    // cyan
  info: '\x1b[32m',     // green
  warn: '\x1b[33m',     // yellow
  error: '\x1b[31m',    // red
  fatal: '\x1b[35m',    // magenta
};

const RESET = '\x1b[0m';

class Logger {
  private minLevel: number;
  private name: string;
  private prettyPrint: boolean;

  constructor(options: LoggerOptions = {}) {
    this.minLevel = LOG_LEVELS[options.level || 'info'];
    this.name = options.name || 'wiggum';
    this.prettyPrint = options.prettyPrint ?? (process.env.NODE_ENV !== 'production');
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private formatEntry(entry: LogEntry): string {
    if (this.prettyPrint) {
      const color = LEVEL_COLORS[entry.level];
      const { level, time, msg, ...rest } = entry;
      const timestamp = new Date(time).toLocaleTimeString();
      const extras = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
      return `${color}[${timestamp}] ${level.toUpperCase().padEnd(5)}${RESET} ${msg}${extras}`;
    }
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      time: new Date().toISOString(),
      msg,
      name: this.name,
      ...data,
    };

    const output = this.formatEntry(entry);

    if (level === 'error' || level === 'fatal') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  trace(msg: string, data?: Record<string, unknown>): void {
    this.log('trace', msg, data);
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    this.log('debug', msg, data);
  }

  info(msg: string, data?: Record<string, unknown>): void {
    this.log('info', msg, data);
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    this.log('warn', msg, data);
  }

  error(msg: string, data?: Record<string, unknown>): void {
    this.log('error', msg, data);
  }

  fatal(msg: string, data?: Record<string, unknown>): void {
    this.log('fatal', msg, data);
  }

  child(_bindings: Record<string, unknown>): Logger {
    const child = new Logger({
      level: Object.keys(LOG_LEVELS).find(
        (k) => LOG_LEVELS[k as LogLevel] === this.minLevel
      ) as LogLevel,
      name: this.name,
      prettyPrint: this.prettyPrint,
    });
    // Store bindings for child logger (would be added to each log entry in full implementation)
    return child;
  }
}

// Default logger instance
export const logger = new Logger({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  name: 'wiggum',
});

// Factory function for creating child loggers
export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options);
}

export default logger;
