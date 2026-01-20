#!/usr/bin/env node
/**
 * Ralph CLI - Control Ralph Wiggum loops from the terminal
 *
 * Usage:
 *   ralph status           Show all running loops system-wide
 *   ralph list             Show all registered projects
 *   ralph start <project>  Start a loop for a project
 *   ralph stop <project>   Stop a running loop
 *   ralph stop --all       Stop all running loops
 */

import { Command } from 'commander';
import { statusCommand } from './commands/status.js';
import { listCommand } from './commands/list.js';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';

const program = new Command();

program
  .name('ralph')
  .description('Control Ralph Wiggum loops from the terminal')
  .version('3.0.0');

program.addCommand(statusCommand);
program.addCommand(listCommand);
program.addCommand(startCommand);
program.addCommand(stopCommand);

program.parseAsync(process.argv);
