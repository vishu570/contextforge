"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.itemsCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const child_process_1 = require("child_process");
const api_1 = require("../lib/api");
const config_1 = require("../lib/config");
const formatters_1 = require("../utils/formatters");
exports.itemsCommand = new commander_1.Command('items')
    .alias('item')
    .description('Manage context items (prompts, rules, agents, collections)')
    .addCommand(new commander_1.Command('list')
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
        const config = config_1.ConfigManager.getConfig();
        const format = options.format || config.defaultFormat;
        const searchOptions = {
            type: options.type ? [options.type] : undefined,
            folderId: options.folder,
            tags: options.tags ? options.tags.split(',').map((t) => t.trim()) : undefined,
            limit: parseInt(options.limit),
            offset: parseInt(options.offset),
            sortBy: options.sort,
            sortOrder: options.order,
        };
        const result = await api_1.api.getItems(searchOptions);
        if (result.error) {
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        console.log(formatters_1.Formatters.formatItems(result.data || [], format));
    }
    catch (error) {
        console.error(chalk_1.default.red('Error listing items:'), error);
        process.exit(1);
    }
}))
    .addCommand(new commander_1.Command('get')
    .alias('show')
    .description('Get details of a specific item')
    .argument('<id>', 'item ID')
    .option('--format <format>', 'output format (full|json|yaml)')
    .action(async (id, options) => {
    try {
        const config = config_1.ConfigManager.getConfig();
        const format = options.format || 'full';
        const result = await api_1.api.getItem(id);
        if (result.error) {
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        console.log(formatters_1.Formatters.formatSingleItem(result.data, format));
    }
    catch (error) {
        console.error(chalk_1.default.red('Error getting item:'), error);
        process.exit(1);
    }
}))
    .addCommand(new commander_1.Command('create')
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
        let itemData = {
            type: options.type,
            name: options.name,
            description: options.description,
            folderId: options.folder,
            tags: options.tags ? options.tags.split(',').map((t) => t.trim()) : [],
        };
        if (options.interactive || !options.name) {
            const answers = await inquirer_1.default.prompt([
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
                tags: answers.tags ? answers.tags.split(',').map((t) => t.trim()) : [],
            };
        }
        let content = '';
        if (options.file) {
            if (await fs_extra_1.default.pathExists(options.file)) {
                content = await fs_extra_1.default.readFile(options.file, 'utf8');
            }
            else {
                console.error(chalk_1.default.red(`File not found: ${options.file}`));
                process.exit(1);
            }
        }
        else {
            const config = config_1.ConfigManager.getConfig();
            const editor = config.editor || process.env.EDITOR || 'nano';
            const tempFile = `/tmp/contextforge-${Date.now()}.txt`;
            await fs_extra_1.default.writeFile(tempFile, '# Enter your content here\n# Lines starting with # will be ignored\n\n');
            const child = (0, child_process_1.spawn)(editor, [tempFile], { stdio: 'inherit' });
            await new Promise((resolve) => child.on('close', resolve));
            const rawContent = await fs_extra_1.default.readFile(tempFile, 'utf8');
            content = rawContent
                .split('\n')
                .filter(line => !line.trim().startsWith('#'))
                .join('\n')
                .trim();
            await fs_extra_1.default.remove(tempFile);
            if (!content) {
                console.log(chalk_1.default.yellow('No content provided, cancelling...'));
                process.exit(0);
            }
        }
        itemData.content = content;
        const result = await api_1.api.createItem(itemData);
        if (result.error) {
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        console.log(chalk_1.default.green('✓ Item created successfully!'));
        console.log(formatters_1.Formatters.formatSingleItem(result.data));
    }
    catch (error) {
        console.error(chalk_1.default.red('Error creating item:'), error);
        process.exit(1);
    }
}))
    .addCommand(new commander_1.Command('edit')
    .description('Edit an existing item')
    .argument('<id>', 'item ID')
    .option('--name <name>', 'update name')
    .option('--description <description>', 'update description')
    .option('--tags <tags>', 'update tags (comma-separated)')
    .option('--folder <folder>', 'move to folder')
    .option('--content', 'edit content in editor')
    .action(async (id, options) => {
    try {
        const currentResult = await api_1.api.getItem(id);
        if (currentResult.error) {
            console.error(chalk_1.default.red('Error:'), currentResult.error);
            process.exit(1);
        }
        const currentItem = currentResult.data;
        const updates = {};
        if (options.name)
            updates.name = options.name;
        if (options.description)
            updates.description = options.description;
        if (options.folder)
            updates.folderId = options.folder;
        if (options.tags) {
            updates.tags = options.tags.split(',').map((t) => t.trim());
        }
        if (options.content) {
            const config = config_1.ConfigManager.getConfig();
            const editor = config.editor || process.env.EDITOR || 'nano';
            const tempFile = `/tmp/contextforge-edit-${Date.now()}.txt`;
            await fs_extra_1.default.writeFile(tempFile, currentItem.content);
            const child = (0, child_process_1.spawn)(editor, [tempFile], { stdio: 'inherit' });
            await new Promise((resolve) => child.on('close', resolve));
            const newContent = await fs_extra_1.default.readFile(tempFile, 'utf8');
            updates.content = newContent.trim();
            await fs_extra_1.default.remove(tempFile);
        }
        if (Object.keys(updates).length === 0) {
            console.log(chalk_1.default.yellow('No updates specified'));
            process.exit(0);
        }
        const result = await api_1.api.updateItem(id, updates);
        if (result.error) {
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        console.log(chalk_1.default.green('✓ Item updated successfully!'));
        console.log(formatters_1.Formatters.formatSingleItem(result.data));
    }
    catch (error) {
        console.error(chalk_1.default.red('Error editing item:'), error);
        process.exit(1);
    }
}))
    .addCommand(new commander_1.Command('delete')
    .alias('rm')
    .description('Delete an item')
    .argument('<id>', 'item ID')
    .option('-y, --yes', 'skip confirmation')
    .action(async (id, options) => {
    try {
        if (!options.yes) {
            const itemResult = await api_1.api.getItem(id);
            if (itemResult.error) {
                console.error(chalk_1.default.red('Error:'), itemResult.error);
                process.exit(1);
            }
            const { confirmed } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirmed',
                    message: `Are you sure you want to delete "${itemResult.data.name}"?`,
                    default: false,
                },
            ]);
            if (!confirmed) {
                console.log(chalk_1.default.blue('Delete cancelled'));
                return;
            }
        }
        const result = await api_1.api.deleteItem(id);
        if (result.error) {
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        console.log(chalk_1.default.green('✓ Item deleted successfully'));
    }
    catch (error) {
        console.error(chalk_1.default.red('Error deleting item:'), error);
        process.exit(1);
    }
}));
//# sourceMappingURL=items.js.map