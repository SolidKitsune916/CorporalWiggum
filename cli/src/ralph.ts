#!/usr/bin/env node
/**
 * Ralph CLI - Control Ralph Wiggum loops from the terminal
 *
 * Usage:
 *   ralph status    Show all running loops system-wide
 *   ralph list      Show all registered projects
 */

import { Command } from 'commander';
import { statusCommand } from './commands/status.js';
import { listCommand } from './commands/list.js';

const program = new Command();

program
  .name('ralph')
  .description('Control Ralph Wiggum loops from the terminal')
  .version('3.0.0');

program.addCommand(statusCommand);
program.addCommand(listCommand);

program.parseAsync(process.argv);
