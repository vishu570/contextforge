import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import { api } from '../lib/api';
import { ConfigManager } from '../lib/config';
import { Formatters } from '../utils/formatters';
import { ContextItem } from '../types';

export const itemsCommand = new Command('items')
  .alias('item')
  .description('Manage context items (prompts, rules, agents, collections)')
  .addCommand(
    new Command('list')
      .alias('ls')
      .description('List context items')
      .option('-t, --type <type>', 'filter by type (prompt|rule|agent|collection)')
      .option('-f, --folder <folder>', 'filter by folder path')
      .option('--tags <tags>', 'filter by tags (comma-separated)')
      .option('-l, --limit <limit>', 'limit number of results', '50')
      .option('--offset <offset>', 'offset for pagination', '0')
      .option('--sort <field>', 'sort by field (name|createdAt|updatedAt)', 'updatedAt')
      .option('--order <order>', 'sort order (asc|desc)', 'desc')
      .option('--format <format>', 'output format (table|json|yaml)')
      .action(async (options) => {
        try {
          const config = ConfigManager.getConfig();
          const format = options.format || config.defaultFormat;

          const searchOptions = {
            type: options.type ? [options.type] : undefined,
            folderId: options.folder,
            tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined,
            limit: parseInt(options.limit),
            offset: parseInt(options.offset),
            sortBy: options.sort,
            sortOrder: options.order,
          };

          const result = await api.getItems(searchOptions);
          
          if (result.error) {
            console.error(chalk.red('Error:'), result.error);
            process.exit(1);
          }

          console.log(Formatters.formatItems(result.data || [], format));
        } catch (error) {
          console.error(chalk.red('Error listing items:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('get')
      .alias('show')
      .description('Get details of a specific item')
      .argument('<id>', 'item ID')
      .option('--format <format>', 'output format (full|json|yaml)')
      .action(async (id, options) => {
        try {
          const config = ConfigManager.getConfig();
          const format = options.format || 'full';

          const result = await api.getItem(id);
          
          if (result.error) {
            console.error(chalk.red('Error:'), result.error);
            process.exit(1);
          }

          console.log(Formatters.formatSingleItem(result.data, format));
        } catch (error) {
          console.error(chalk.red('Error getting item:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('create')
      .alias('new')
      .description('Create a new context item')
      .option('-t, --type <type>', 'item type (prompt|rule|agent|collection)', 'prompt')
      .option('-n, --name <name>', 'item name')
      .option('-d, --description <description>', 'item description')
      .option('-f, --folder <folder>', 'folder ID or path')
      .option('--tags <tags>', 'tags (comma-separated)')
      .option('--file <file>', 'read content from file')
      .option('--template <template>', 'use a template')
      .option('--interactive', 'interactive mode')
      .action(async (options) => {
        try {
          let itemData: Partial<ContextItem> = {
            type: options.type,
            name: options.name,
            description: options.description,
            folderId: options.folder,
            tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [],
          };

          if (options.interactive || !options.name) {
            const answers = await inquirer.prompt([
              {
                type: 'input',
                name: 'name',
                message: 'Item name:',
                default: itemData.name,
                validate: (input) => input.trim().length > 0 || 'Name is required',
              },
              {
                type: 'list',
                name: 'type',
                message: 'Item type:',
                choices: ['prompt', 'rule', 'agent', 'collection'],
                default: itemData.type,
              },
              {
                type: 'input',
                name: 'description',
                message: 'Description (optional):',
                default: itemData.description,
              },
              {
                type: 'input',
                name: 'tags',
                message: 'Tags (comma-separated, optional):',
                default: itemData.tags?.join(', '),
              },
            ]);

            itemData = {
              ...itemData,
              ...answers,
              tags: answers.tags ? answers.tags.split(',').map((t: string) => t.trim()) : [],
            };
          }

          // Get content
          let content = '';
          if (options.file) {
            if (await fs.pathExists(options.file)) {
              content = await fs.readFile(options.file, 'utf8');
            } else {
              console.error(chalk.red(`File not found: ${options.file}`));
              process.exit(1);
            }
          } else {
            const config = ConfigManager.getConfig();
            const editor = config.editor || process.env.EDITOR || 'nano';
            
            const tempFile = `/tmp/contextforge-${Date.now()}.txt`;
            await fs.writeFile(tempFile, '# Enter your content here\n# Lines starting with # will be ignored\n\n');
            
            const child = spawn(editor, [tempFile], { stdio: 'inherit' });
            await new Promise((resolve) => child.on('close', resolve));
            
            const rawContent = await fs.readFile(tempFile, 'utf8');
            content = rawContent
              .split('\n')
              .filter(line => !line.trim().startsWith('#'))
              .join('\n')
              .trim();
            
            await fs.remove(tempFile);
            
            if (!content) {
              console.log(chalk.yellow('No content provided, cancelling...'));
              process.exit(0);
            }
          }

          itemData.content = content;

          const result = await api.createItem(itemData);
          
          if (result.error) {
            console.error(chalk.red('Error:'), result.error);
            process.exit(1);
          }

          console.log(chalk.green('✓ Item created successfully!'));
          console.log(Formatters.formatSingleItem(result.data));
        } catch (error) {
          console.error(chalk.red('Error creating item:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('edit')
      .description('Edit an existing item')
      .argument('<id>', 'item ID')
      .option('--name <name>', 'update name')
      .option('--description <description>', 'update description')
      .option('--tags <tags>', 'update tags (comma-separated)')
      .option('--folder <folder>', 'move to folder')
      .option('--content', 'edit content in editor')
      .action(async (id, options) => {
        try {
          // Get current item
          const currentResult = await api.getItem(id);
          if (currentResult.error) {
            console.error(chalk.red('Error:'), currentResult.error);
            process.exit(1);
          }

          const currentItem = currentResult.data;
          const updates: Partial<ContextItem> = {};

          // Update basic fields
          if (options.name) updates.name = options.name;
          if (options.description) updates.description = options.description;
          if (options.folder) updates.folderId = options.folder;
          if (options.tags) {
            updates.tags = options.tags.split(',').map((t: string) => t.trim());
          }

          // Edit content if requested
          if (options.content) {
            const config = ConfigManager.getConfig();
            const editor = config.editor || process.env.EDITOR || 'nano';
            
            const tempFile = `/tmp/contextforge-edit-${Date.now()}.txt`;
            await fs.writeFile(tempFile, currentItem.content);
            
            const child = spawn(editor, [tempFile], { stdio: 'inherit' });
            await new Promise((resolve) => child.on('close', resolve));
            
            const newContent = await fs.readFile(tempFile, 'utf8');
            updates.content = newContent.trim();
            
            await fs.remove(tempFile);
          }

          if (Object.keys(updates).length === 0) {
            console.log(chalk.yellow('No updates specified'));
            process.exit(0);
          }

          const result = await api.updateItem(id, updates);
          
          if (result.error) {
            console.error(chalk.red('Error:'), result.error);
            process.exit(1);
          }

          console.log(chalk.green('✓ Item updated successfully!'));
          console.log(Formatters.formatSingleItem(result.data));
        } catch (error) {
          console.error(chalk.red('Error editing item:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('delete')
      .alias('rm')
      .description('Delete an item')
      .argument('<id>', 'item ID')
      .option('-y, --yes', 'skip confirmation')
      .action(async (id, options) => {
        try {
          if (!options.yes) {
            // Get item details for confirmation
            const itemResult = await api.getItem(id);
            if (itemResult.error) {
              console.error(chalk.red('Error:'), itemResult.error);
              process.exit(1);
            }

            const { confirmed } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirmed',
                message: `Are you sure you want to delete "${itemResult.data.name}"?`,
                default: false,
              },
            ]);

            if (!confirmed) {
              console.log(chalk.blue('Delete cancelled'));
              return;
            }
          }

          const result = await api.deleteItem(id);
          
          if (result.error) {
            console.error(chalk.red('Error:'), result.error);
            process.exit(1);
          }

          console.log(chalk.green('✓ Item deleted successfully'));
        } catch (error) {
          console.error(chalk.red('Error deleting item:'), error);
          process.exit(1);
        }
      })
  );