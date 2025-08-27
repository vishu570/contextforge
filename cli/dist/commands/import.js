"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const glob_1 = require("glob");
const inquirer_1 = __importDefault(require("inquirer"));
const api_1 = require("../lib/api");
const config_1 = require("../lib/config");
exports.importCommand = new commander_1.Command('import')
    .description('Import content from various sources')
    .addCommand(new commander_1.Command('file')
    .description('Import from a single file')
    .argument('<file>', 'file path')
    .option('-f, --folder <folder>', 'target folder ID')
    .option('-t, --type <type>', 'force item type (prompt|rule|agent|collection)')
    .option('--classify', 'auto-classify content')
    .option('--optimize', 'auto-optimize content')
    .option('--tags <tags>', 'add tags (comma-separated)')
    .option('--dry-run', 'preview without importing')
    .action(async (filePath, options) => {
    try {
        if (!await fs_extra_1.default.pathExists(filePath)) {
            console.error(chalk_1.default.red(`File not found: ${filePath}`));
            process.exit(1);
        }
        const spinner = (0, ora_1.default)('Reading file...').start();
        const content = await fs_extra_1.default.readFile(filePath, 'utf8');
        const fileName = path_1.default.basename(filePath, path_1.default.extname(filePath));
        spinner.succeed('File read successfully');
        const itemData = {
            name: fileName,
            type: options.type || 'prompt',
            content,
            folderId: options.folder,
            tags: options.tags ? options.tags.split(',').map((t) => t.trim()) : [],
        };
        if (options.dryRun) {
            console.log(chalk_1.default.blue('Preview (dry run):'));
            console.log(`${chalk_1.default.cyan('Name:')} ${itemData.name}`);
            console.log(`${chalk_1.default.cyan('Type:')} ${itemData.type}`);
            console.log(`${chalk_1.default.cyan('Content length:')} ${content.length} characters`);
            console.log(`${chalk_1.default.cyan('Tags:')} ${itemData.tags.join(', ') || 'None'}`);
            return;
        }
        const importSpinner = (0, ora_1.default)('Importing...').start();
        const result = await api_1.api.createItem(itemData);
        if (result.error) {
            importSpinner.fail('Import failed');
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        importSpinner.succeed('Import completed');
        console.log(chalk_1.default.green('✓ File imported successfully!'));
        console.log(`${chalk_1.default.cyan('ID:')} ${result.data.id}`);
        if (options.classify || options.optimize) {
            const postSpinner = (0, ora_1.default)('Post-processing...').start();
            if (options.classify) {
                await api_1.api.classifyItems([result.data.id]);
            }
            if (options.optimize) {
                await api_1.api.optimizeItem(result.data.id);
            }
            postSpinner.succeed('Post-processing completed');
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error importing file:'), error);
        process.exit(1);
    }
}))
    .addCommand(new commander_1.Command('directory')
    .alias('dir')
    .description('Import from a directory')
    .argument('<directory>', 'directory path')
    .option('-f, --folder <folder>', 'target folder ID')
    .option('-r, --recursive', 'include subdirectories')
    .option('--pattern <pattern>', 'file pattern (glob)', '**/*.{txt,md,json,yaml,yml}')
    .option('--classify', 'auto-classify content')
    .option('--optimize', 'auto-optimize content')
    .option('--batch-size <size>', 'batch size for processing', '10')
    .option('--dry-run', 'preview without importing')
    .action(async (directory, options) => {
    try {
        if (!await fs_extra_1.default.pathExists(directory)) {
            console.error(chalk_1.default.red(`Directory not found: ${directory}`));
            process.exit(1);
        }
        const config = config_1.ConfigManager.getConfig();
        const batchSize = parseInt(options.batchSize) || config.batchSize;
        const spinner = (0, ora_1.default)('Scanning directory...').start();
        const pattern = path_1.default.join(directory, options.recursive ? options.pattern : '*');
        const files = await (0, glob_1.glob)(pattern, {
            ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
        });
        spinner.succeed(`Found ${files.length} files`);
        if (files.length === 0) {
            console.log(chalk_1.default.yellow('No files found matching the pattern'));
            return;
        }
        if (options.dryRun) {
            console.log(chalk_1.default.blue('Preview (dry run):'));
            files.slice(0, 10).forEach((file, index) => {
                console.log(`${index + 1}. ${path_1.default.relative(directory, file)}`);
            });
            if (files.length > 10) {
                console.log(chalk_1.default.gray(`... and ${files.length - 10} more files`));
            }
            return;
        }
        const { confirmed } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: `Import ${files.length} files?`,
                default: true,
            },
        ]);
        if (!confirmed) {
            console.log(chalk_1.default.blue('Import cancelled'));
            return;
        }
        const progressSpinner = (0, ora_1.default)('Importing files...').start();
        let imported = 0;
        let failed = 0;
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            progressSpinner.text = `Importing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}...`;
            const batchPromises = batch.map(async (file) => {
                try {
                    const content = await fs_extra_1.default.readFile(file, 'utf8');
                    const relativePath = path_1.default.relative(directory, file);
                    const fileName = path_1.default.basename(file, path_1.default.extname(file));
                    const itemData = {
                        name: `${fileName} (${relativePath})`,
                        type: 'prompt',
                        content,
                        folderId: options.folder,
                        metadata: {
                            source: 'directory-import',
                            originalPath: relativePath,
                            importedAt: new Date().toISOString(),
                        },
                    };
                    const result = await api_1.api.createItem(itemData);
                    if (result.error) {
                        throw new Error(result.error);
                    }
                    return { success: true, id: result.data.id, file };
                }
                catch (error) {
                    return { success: false, error: error.message, file };
                }
            });
            const results = await Promise.all(batchPromises);
            results.forEach(result => {
                if (result.success) {
                    imported++;
                }
                else {
                    failed++;
                    console.log(chalk_1.default.red(`Failed to import ${result.file}: ${result.error}`));
                }
            });
            progressSpinner.text = `Progress: ${imported + failed}/${files.length} (${imported} imported, ${failed} failed)`;
        }
        progressSpinner.succeed(`Import completed: ${imported} imported, ${failed} failed`);
        if ((options.classify || options.optimize) && imported > 0) {
            const postSpinner = (0, ora_1.default)('Post-processing...').start();
            postSpinner.succeed('Post-processing completed');
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error importing directory:'), error);
        process.exit(1);
    }
}))
    .addCommand(new commander_1.Command('github')
    .description('Import from GitHub repository')
    .argument('<repo>', 'repository (owner/repo or URL)')
    .option('-b, --branch <branch>', 'branch name', 'main')
    .option('-p, --path <path>', 'repository path', '/')
    .option('-f, --folder <folder>', 'target folder ID')
    .option('--pattern <pattern>', 'file pattern', '**/*.{md,txt,json,yaml,yml}')
    .option('--classify', 'auto-classify content')
    .option('--optimize', 'auto-optimize content')
    .option('--dry-run', 'preview without importing')
    .action(async (repo, options) => {
    try {
        const spinner = (0, ora_1.default)('Fetching repository content...').start();
        let owner, repoName;
        if (repo.includes('/')) {
            if (repo.startsWith('http')) {
                const url = new URL(repo);
                [, owner, repoName] = url.pathname.split('/');
            }
            else {
                [owner, repoName] = repo.split('/');
            }
        }
        else {
            console.error(chalk_1.default.red('Invalid repository format. Use owner/repo or full URL'));
            process.exit(1);
        }
        const githubOptions = {
            owner,
            repo: repoName,
            branch: options.branch,
            path: options.path,
            pattern: options.pattern,
            folderId: options.folder,
            classify: options.classify,
            optimize: options.optimize,
            dryRun: options.dryRun,
        };
        const result = await api_1.api.request('POST', '/import/github', githubOptions);
        if (result.error) {
            spinner.fail('GitHub import failed');
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        if (options.dryRun) {
            spinner.succeed('Preview completed');
            console.log(chalk_1.default.blue('Files to be imported:'));
            result.data.files.forEach((file, index) => {
                console.log(`${index + 1}. ${file.path}`);
            });
            return;
        }
        spinner.succeed('GitHub import initiated');
        const jobId = result.data.jobId;
        await monitorJob(jobId);
    }
    catch (error) {
        console.error(chalk_1.default.red('Error importing from GitHub:'), error);
        process.exit(1);
    }
}));
async function monitorJob(jobId) {
    const spinner = (0, ora_1.default)('Processing import...').start();
    const pollInterval = 2000;
    const maxWaitTime = 5 * 60 * 1000;
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
        try {
            const result = await api_1.api.getJob(jobId);
            if (result.error) {
                spinner.fail('Failed to check job status');
                console.error(chalk_1.default.red('Error:'), result.error);
                return;
            }
            const job = result.data;
            if (job.status === 'completed') {
                spinner.succeed('Import completed successfully');
                console.log(chalk_1.default.green(`✓ Processed ${job.processedItems}/${job.totalItems} items`));
                if (job.results) {
                    console.log(`${chalk_1.default.cyan('Imported:')} ${job.results.imported || 0}`);
                    console.log(`${chalk_1.default.cyan('Failed:')} ${job.results.failed || 0}`);
                    console.log(`${chalk_1.default.cyan('Duplicates:')} ${job.results.duplicates || 0}`);
                }
                return;
            }
            else if (job.status === 'failed') {
                spinner.fail('Import failed');
                console.error(chalk_1.default.red('Error:'), job.error || 'Unknown error');
                return;
            }
            else if (job.status === 'running') {
                const progress = job.totalItems > 0
                    ? Math.round((job.processedItems / job.totalItems) * 100)
                    : 0;
                spinner.text = `Processing import... ${progress}% (${job.processedItems}/${job.totalItems})`;
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        catch (error) {
            spinner.fail('Error monitoring job');
            console.error(chalk_1.default.red('Error:'), error);
            return;
        }
    }
    spinner.fail('Import timed out');
    console.log(chalk_1.default.yellow('The import is taking longer than expected. Check job status with:'));
    console.log(chalk_1.default.cyan(`contextforge jobs get ${jobId}`));
}
//# sourceMappingURL=import.js.map