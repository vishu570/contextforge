import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../lib/config';
import { api } from '../lib/api';

export const configCommand = new Command('config')
  .description('Manage CLI configuration')
  .addCommand(
    new Command('set')
      .description('Set a configuration value')
      .argument('<key>', 'configuration key')
      .argument('<value>', 'configuration value')
      .action(async (key, value) => {
        try {
          // Validate key
          const validKeys = ['apiUrl', 'apiKey', 'defaultFormat', 'editor', 'autoOptimize', 'batchSize'];
          if (!validKeys.includes(key)) {
            console.error(chalk.red(`Invalid key: ${key}`));
            console.log(chalk.yellow('Valid keys:'), validKeys.join(', '));
            process.exit(1);
          }

          // Type conversion
          if (key === 'autoOptimize') {
            value = value.toLowerCase() === 'true';
          } else if (key === 'batchSize') {
            value = parseInt(value, 10);
            if (isNaN(value) || value < 1) {
              console.error(chalk.red('batchSize must be a positive number'));
              process.exit(1);
            }
          }

          ConfigManager.set(key as any, value);
          console.log(chalk.green(`✓ Set ${key} = ${key === 'apiKey' ? '***hidden***' : value}`));

          // Test connection if setting API configuration
          if (key === 'apiUrl' || key === 'apiKey') {
            console.log(chalk.blue('Testing connection...'));
            const result = await api.health();
            if (result.error) {
              console.log(chalk.yellow('⚠️  Could not connect to API'));
            } else {
              console.log(chalk.green('✓ API connection successful'));
            }
          }
        } catch (error) {
          console.error(chalk.red('Error setting configuration:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('get')
      .description('Get a configuration value')
      .argument('[key]', 'configuration key (optional)')
      .action((key) => {
        if (key) {
          const value = ConfigManager.get(key);
          if (value === undefined) {
            console.log(chalk.yellow(`${key} is not set`));
          } else {
            console.log(key === 'apiKey' && value ? '***hidden***' : value);
          }
        } else {
          ConfigManager.displayConfig();
        }
      })
  )
  .addCommand(
    new Command('reset')
      .description('Reset configuration to defaults')
      .option('-y, --yes', 'skip confirmation')
      .action(async (options) => {
        if (!options.yes) {
          const { confirmed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmed',
              message: 'Are you sure you want to reset all configuration to defaults?',
              default: false,
            },
          ]);

          if (!confirmed) {
            console.log(chalk.blue('Configuration reset cancelled'));
            return;
          }
        }

        ConfigManager.resetToDefaults();
      })
  )
  .addCommand(
    new Command('wizard')
      .description('Interactive configuration setup')
      .action(async () => {
        console.log(chalk.blue.bold('ContextForge Configuration Wizard'));
        console.log(chalk.gray('Let\'s set up your CLI configuration\n'));

        const config = ConfigManager.getConfig();

        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'apiUrl',
            message: 'API URL:',
            default: config.apiUrl,
            validate: (input) => {
              try {
                new URL(input);
                return true;
              } catch {
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

        // Save configuration
        ConfigManager.setConfig(answers);
        
        console.log(chalk.green('\n✓ Configuration saved!'));

        // Test connection
        console.log(chalk.blue('Testing API connection...'));
        const result = await api.health();
        if (result.error) {
          console.log(chalk.yellow('⚠️  Could not connect to API'));
          console.log(chalk.gray('You can update the configuration later with: contextforge config set'));
        } else {
          console.log(chalk.green('✓ API connection successful'));
        }
      })
  );