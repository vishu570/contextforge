#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const update_notifier_1 = __importDefault(require("update-notifier"));
const config_1 = require("../lib/config");
const config_2 = require("../commands/config");
const items_1 = require("../commands/items");
const folders_1 = require("../commands/folders");
const search_1 = require("../commands/search");
const import_1 = require("../commands/import");
const export_1 = require("../commands/export");
const optimize_1 = require("../commands/optimize");
const classify_1 = require("../commands/classify");
const health_1 = require("../commands/health");
const pkg = require('../../package.json');
const notifier = (0, update_notifier_1.default)({ pkg });
notifier.notify();
const program = new commander_1.Command();
program
    .name('contextforge')
    .description('ContextForge CLI - AI-powered context management for developers')
    .version(pkg.version)
    .option('-v, --verbose', 'enable verbose logging')
    .option('--api-url <url>', 'override API URL')
    .option('--api-key <key>', 'override API key')
    .option('--format <format>', 'output format (json|yaml|table)', 'table')
    .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.apiUrl) {
        config_1.ConfigManager.set('apiUrl', opts.apiUrl);
    }
    if (opts.apiKey) {
        config_1.ConfigManager.set('apiKey', opts.apiKey);
    }
    if (opts.format) {
        config_1.ConfigManager.set('defaultFormat', opts.format);
    }
    if (opts.verbose) {
        process.env.VERBOSE = 'true';
    }
});
program.addCommand(config_2.configCommand);
program.addCommand(items_1.itemsCommand);
program.addCommand(folders_1.foldersCommand);
program.addCommand(search_1.searchCommand);
program.addCommand(import_1.importCommand);
program.addCommand(export_1.exportCommand);
program.addCommand(optimize_1.optimizeCommand);
program.addCommand(classify_1.classifyCommand);
program.addCommand(health_1.healthCommand);
program.action(() => {
    console.log(chalk_1.default.blue.bold('ContextForge CLI'));
    console.log(chalk_1.default.gray('AI-powered context management for developers\n'));
    console.log('Quick start:');
    console.log(`  ${chalk_1.default.cyan('contextforge config set apiUrl <url>')}    Set API URL`);
    console.log(`  ${chalk_1.default.cyan('contextforge config set apiKey <key>')}    Set API key`);
    console.log(`  ${chalk_1.default.cyan('contextforge items list')}                 List all items`);
    console.log(`  ${chalk_1.default.cyan('contextforge search "your query"')}        Search items`);
    console.log(`  ${chalk_1.default.cyan('contextforge import ./prompts')}           Import directory`);
    console.log();
    console.log('Need help? Run:');
    console.log(`  ${chalk_1.default.cyan('contextforge --help')}                     Show all commands`);
    console.log(`  ${chalk_1.default.cyan('contextforge <command> --help')}           Show command help`);
    console.log();
    const config = config_1.ConfigManager.getConfig();
    if (!config.apiUrl || !config.apiKey) {
        console.log(chalk_1.default.yellow('⚠️  Configuration needed:'));
        if (!config.apiUrl) {
            console.log(`   Run: ${chalk_1.default.cyan('contextforge config set apiUrl <url>')}`);
        }
        if (!config.apiKey) {
            console.log(`   Run: ${chalk_1.default.cyan('contextforge config set apiKey <key>')}`);
        }
    }
    else {
        console.log(chalk_1.default.green('✅ Configuration looks good!'));
    }
});
program.exitOverride();
try {
    program.parse();
}
catch (err) {
    if (err.code === 'commander.helpDisplayed') {
        process.exit(0);
    }
    else if (err.code === 'commander.version') {
        process.exit(0);
    }
    else {
        console.error(chalk_1.default.red('Error:'), err.message);
        process.exit(1);
    }
}
process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk_1.default.red('Unhandled Rejection at:'), promise, chalk_1.default.red('reason:'), reason);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error(chalk_1.default.red('Uncaught Exception:'), error);
    process.exit(1);
});
//# sourceMappingURL=contextforge.js.map