"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const config_1 = require("../lib/config");
const api_1 = require("../lib/api");
exports.configCommand = new commander_1.Command('config')
    .description('Manage CLI configuration')
    .addCommand(new commander_1.Command('set')
    .description('Set a configuration value')
    .argument('<key>', 'configuration key')
    .argument('<value>', 'configuration value')
    .action(async (key, value) => {
    try {
        const validKeys = ['apiUrl', 'apiKey', 'defaultFormat', 'editor', 'autoOptimize', 'batchSize'];
        if (!validKeys.includes(key)) {
            console.error(chalk_1.default.red(`Invalid key: ${key}`));
            console.log(chalk_1.default.yellow('Valid keys:'), validKeys.join(', '));
            process.exit(1);
        }
        if (key === 'autoOptimize') {
            value = value.toLowerCase() === 'true';
        }
        else if (key === 'batchSize') {
            value = parseInt(value, 10);
            if (isNaN(value) || value < 1) {
                console.error(chalk_1.default.red('batchSize must be a positive number'));
                process.exit(1);
            }
        }
        config_1.ConfigManager.set(key, value);
        console.log(chalk_1.default.green(`✓ Set ${key} = ${key === 'apiKey' ? '***hidden***' : value}`));
        if (key === 'apiUrl' || key === 'apiKey') {
            console.log(chalk_1.default.blue('Testing connection...'));
            const result = await api_1.api.health();
            if (result.error) {
                console.log(chalk_1.default.yellow('⚠️  Could not connect to API'));
            }
            else {
                console.log(chalk_1.default.green('✓ API connection successful'));
            }
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error setting configuration:'), error);
        process.exit(1);
    }
}))
    .addCommand(new commander_1.Command('get')
    .description('Get a configuration value')
    .argument('[key]', 'configuration key (optional)')
    .action((key) => {
    if (key) {
        const value = config_1.ConfigManager.get(key);
        if (value === undefined) {
            console.log(chalk_1.default.yellow(`${key} is not set`));
        }
        else {
            console.log(key === 'apiKey' && value ? '***hidden***' : value);
        }
    }
    else {
        config_1.ConfigManager.displayConfig();
    }
}))
    .addCommand(new commander_1.Command('reset')
    .description('Reset configuration to defaults')
    .option('-y, --yes', 'skip confirmation')
    .action(async (options) => {
    if (!options.yes) {
        const { confirmed } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: 'Are you sure you want to reset all configuration to defaults?',
                default: false,
            },
        ]);
        if (!confirmed) {
            console.log(chalk_1.default.blue('Configuration reset cancelled'));
            return;
        }
    }
    config_1.ConfigManager.resetToDefaults();
}))
    .addCommand(new commander_1.Command('wizard')
    .description('Interactive configuration setup')
    .action(async () => {
    console.log(chalk_1.default.blue.bold('ContextForge Configuration Wizard'));
    console.log(chalk_1.default.gray('Let\'s set up your CLI configuration\n'));
    const config = config_1.ConfigManager.getConfig();
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'apiUrl',
            message: 'API URL:',
            default: config.apiUrl,
            validate: (input) => {
                try {
                    new URL(input);
                    return true;
                }
                catch {
                    return 'Please enter a valid URL';
                }
            },
        },
        {
            type: 'password',
            name: 'apiKey',
            message: 'API Key (optional):',
            mask: '*',
        },
        {
            type: 'list',
            name: 'defaultFormat',
            message: 'Default output format:',
            choices: ['table', 'json', 'yaml'],
            default: config.defaultFormat,
        },
        {
            type: 'input',
            name: 'editor',
            message: 'Preferred editor (optional):',
            default: config.editor || process.env.EDITOR || 'nano',
        },
        {
            type: 'confirm',
            name: 'autoOptimize',
            message: 'Auto-optimize imported content?',
            default: config.autoOptimize,
        },
        {
            type: 'number',
            name: 'batchSize',
            message: 'Batch size for bulk operations:',
            default: config.batchSize,
            validate: (input) => input > 0 || 'Must be a positive number',
        },
    ]);
    config_1.ConfigManager.setConfig(answers);
    console.log(chalk_1.default.green('\n✓ Configuration saved!'));
    console.log(chalk_1.default.blue('Testing API connection...'));
    const result = await api_1.api.health();
    if (result.error) {
        console.log(chalk_1.default.yellow('⚠️  Could not connect to API'));
        console.log(chalk_1.default.gray('You can update the configuration later with: contextforge config set'));
    }
    else {
        console.log(chalk_1.default.green('✓ API connection successful'));
    }
}));
//# sourceMappingURL=config.js.map