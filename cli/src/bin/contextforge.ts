#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';
import { ConfigManager } from '../lib/config';

// Import command modules
import { configCommand } from '../commands/config';
import { itemsCommand } from '../commands/items';
import { foldersCommand } from '../commands/folders';
import { searchCommand } from '../commands/search';
import { importCommand } from '../commands/import';
import { exportCommand } from '../commands/export';
import { optimizeCommand } from '../commands/optimize';
import { classifyCommand } from '../commands/classify';
import { healthCommand } from '../commands/health';

const pkg = require('../../package.json');

// Check for updates
const notifier = updateNotifier({ pkg });
notifier.notify();

const program = new Command();

program
  .name('contextforge')
  .description('ContextForge CLI - AI-powered context management for developers')
  .version(pkg.version)
  .option('-v, --verbose', 'enable verbose logging')
  .option('--api-url <url>', 'override API URL')
  .option('--api-key <key>', 'override API key')
  .option('--format <format>', 'output format (json|yaml|table)', 'table')
  .hook('preAction', (thisCommand) => {
    // Set global options
    const opts = thisCommand.opts();
    
    if (opts.apiUrl) {
      ConfigManager.set('apiUrl', opts.apiUrl);
    }
    
    if (opts.apiKey) {
      ConfigManager.set('apiKey', opts.apiKey);
    }
    
    if (opts.format) {
      ConfigManager.set('defaultFormat', opts.format);
    }
    
    if (opts.verbose) {
      process.env.VERBOSE = 'true';
    }
  });

// Add commands
program.addCommand(configCommand);
program.addCommand(itemsCommand);
program.addCommand(foldersCommand);
program.addCommand(searchCommand);
program.addCommand(importCommand);
program.addCommand(exportCommand);
program.addCommand(optimizeCommand);
program.addCommand(classifyCommand);
program.addCommand(healthCommand);

// Default action
program.action(() => {
  console.log(chalk.blue.bold('ContextForge CLI'));
  console.log(chalk.gray('AI-powered context management for developers\n'));
  
  console.log('Quick start:');
  console.log(`  ${chalk.cyan('contextforge config set apiUrl <url>')}    Set API URL`);
  console.log(`  ${chalk.cyan('contextforge config set apiKey <key>')}    Set API key`);
  console.log(`  ${chalk.cyan('contextforge items list')}                 List all items`);
  console.log(`  ${chalk.cyan('contextforge search "your query"')}        Search items`);
  console.log(`  ${chalk.cyan('contextforge import ./prompts')}           Import directory`);
  console.log();
  
  console.log('Need help? Run:');
  console.log(`  ${chalk.cyan('contextforge --help')}                     Show all commands`);
  console.log(`  ${chalk.cyan('contextforge <command> --help')}           Show command help`);
  console.log();
  
  const config = ConfigManager.getConfig();
  if (!config.apiUrl || !config.apiKey) {
    console.log(chalk.yellow('⚠️  Configuration needed:'));
    if (!config.apiUrl) {
      console.log(`   Run: ${chalk.cyan('contextforge config set apiUrl <url>')}`);
    }
    if (!config.apiKey) {
      console.log(`   Run: ${chalk.cyan('contextforge config set apiKey <key>')}`);
    }
  } else {
    console.log(chalk.green('✅ Configuration looks good!'));
  }
});

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (err: any) {
  if (err.code === 'commander.helpDisplayed') {
    process.exit(0);
  } else if (err.code === 'commander.version') {
    process.exit(0);
  } else {
    console.error(chalk.red('Error:'), err.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});