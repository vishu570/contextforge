"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.foldersCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const api_1 = require("../lib/api");
const config_1 = require("../lib/config");
const formatters_1 = require("../utils/formatters");
exports.foldersCommand = new commander_1.Command('folders')
    .alias('folder')
    .description('Manage folders/collections')
    .addCommand(new commander_1.Command('list')
    .alias('ls')
    .description('List folders')
    .option('--flat', 'show flat list instead of hierarchy')
    .option('--format <format>', 'output format (table|json|yaml)')
    .action(async (options) => {
    try {
        const config = config_1.ConfigManager.getConfig();
        const format = options.format || config.defaultFormat;
        const result = await api_1.api.getFolders(options.flat);
        if (result.error) {
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        console.log(formatters_1.Formatters.formatFolders(result.data || [], format));
    }
    catch (error) {
        console.error(chalk_1.default.red('Error listing folders:'), error);
        process.exit(1);
    }
}))
    .addCommand(new commander_1.Command('create')
    .alias('new')
    .description('Create a new folder')
    .option('-n, --name <name>', 'folder name')
    .option('-d, --description <description>', 'folder description')
    .option('-p, --parent <parent>', 'parent folder ID')
    .option('--color <color>', 'folder color')
    .option('--icon <icon>', 'folder icon')
    .option('--template', 'create as template')
    .option('--auto-organize', 'enable auto-organization')
    .option('--interactive', 'interactive mode')
    .action(async (options) => {
    try {
        let folderData = {
            name: options.name,
            description: options.description,
            parentId: options.parent,
            color: options.color,
            icon: options.icon,
            isTemplate: options.template || false,
            autoOrganize: options.autoOrganize || false,
        };
        if (options.interactive || !options.name) {
            const answers = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'Folder name:',
                    default: folderData.name,
                    validate: (input) => input.trim().length > 0 || 'Name is required',
                },
                {
                    type: 'input',
                    name: 'description',
                    message: 'Description (optional):',
                    default: folderData.description,
                },
                {
                    type: 'input',
                    name: 'icon',
                    message: 'Icon (emoji, optional):',
                    default: folderData.icon || '📁',
                },
                {
                    type: 'list',
                    name: 'color',
                    message: 'Color:',
                    choices: [
                        { name: 'Blue', value: 'blue' },
                        { name: 'Green', value: 'green' },
                        { name: 'Purple', value: 'purple' },
                        { name: 'Red', value: 'red' },
                        { name: 'Yellow', value: 'yellow' },
                        { name: 'Gray', value: 'gray' },
                    ],
                    default: folderData.color || 'blue',
                },
                {
                    type: 'confirm',
                    name: 'isTemplate',
                    message: 'Create as template?',
                    default: folderData.isTemplate,
                },
                {
                    type: 'confirm',
                    name: 'autoOrganize',
                    message: 'Enable auto-organization?',
                    default: folderData.autoOrganize,
                },
            ]);
            folderData = { ...folderData, ...answers };
        }
        const result = await api_1.api.createFolder(folderData);
        if (result.error) {
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        console.log(chalk_1.default.green('✓ Folder created successfully!'));
        console.log(`${chalk_1.default.cyan('ID:')} ${result.data.id}`);
        console.log(`${chalk_1.default.cyan('Name:')} ${result.data.name}`);
        console.log(`${chalk_1.default.cyan('Path:')} ${result.data.path}`);
    }
    catch (error) {
        console.error(chalk_1.default.red('Error creating folder:'), error);
        process.exit(1);
    }
}))
    .addCommand(new commander_1.Command('tree')
    .description('Show folder hierarchy as a tree')
    .option('--icons', 'show folder icons')
    .action(async (options) => {
    try {
        const result = await api_1.api.getFolders(false);
        if (result.error) {
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        const folders = result.data || [];
        if (folders.length === 0) {
            console.log(chalk_1.default.yellow('No folders found'));
            return;
        }
        const renderTree = (folder, depth = 0, isLast = true, prefix = '') => {
            const connector = isLast ? '└── ' : '├── ';
            const icon = options.icons && folder.icon ? folder.icon + ' ' : '';
            const nameColor = folder.color ? chalk_1.default.keyword(folder.color) : chalk_1.default.white;
            console.log(prefix + connector + icon + nameColor(folder.name) +
                chalk_1.default.gray(` (${folder.itemCount} items, ${folder.childCount} children)`));
            if (folder.children && folder.children.length > 0) {
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                folder.children.forEach((child, index) => {
                    const isChildLast = index === folder.children.length - 1;
                    renderTree(child, depth + 1, isChildLast, newPrefix);
                });
            }
        };
        const rootFolders = folders.filter(f => !f.parentId);
        console.log(chalk_1.default.blue.bold('Folder Tree:'));
        console.log('');
        rootFolders.forEach((folder, index) => {
            const isLast = index === rootFolders.length - 1;
            renderTree(folder, 0, isLast);
        });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error showing tree:'), error);
        process.exit(1);
    }
}));
//# sourceMappingURL=folders.js.map