/**
 * Status command - Show all running loops system-wide
 */

import { Command } from 'commander';

export const statusCommand = new Command('status')
  .description('Show all running loops system-wide')
  .action(async () => {
    console.log('Status command - to be implemented');
  });
