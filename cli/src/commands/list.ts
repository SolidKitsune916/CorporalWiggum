/**
 * List command - Show all registered projects
 */

import { Command } from 'commander';

export const listCommand = new Command('list')
  .description('Show all registered projects')
  .action(async () => {
    console.log('List command - to be implemented');
  });
