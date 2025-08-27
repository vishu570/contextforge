"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const api_1 = require("../lib/api");
const config_1 = require("../lib/config");
const formatters_1 = require("../utils/formatters");
exports.optimizeCommand = new commander_1.Command('optimize')
    .description('AI-powered content optimization')
    .addCommand(new commander_1.Command('item')
    .description('Optimize a single item')
    .argument('<id>', 'item ID')
    .option('-m, --model <model>', 'AI model to use (gpt-4|claude|gemini)')
    .option('-c, --creativity <level>', 'creativity level (0-1)', '0.7')
    .option('--focus <areas>', 'focus areas (clarity,structure,engagement,etc)', 'clarity,structure')
    .option('--preserve-structure', 'preserve original structure')
    .option('--preview', 'preview changes without applying')
    .action(async (id, options) => {
    try {
        const spinner = (0, ora_1.default)('Fetching item...').start();
        const itemResult = await api_1.api.getItem(id);
        if (itemResult.error) {
            spinner.fail('Failed to fetch item');
            console.error(chalk_1.default.red('Error:'), itemResult.error);
            process.exit(1);
        }
        const item = itemResult.data;
        spinner.succeed(`Found item: ${item.name}`);
        console.log(chalk_1.default.blue('Original content preview:'));
        console.log(chalk_1.default.gray('─'.repeat(50)));
        console.log(item.content.substring(0, 200) + (item.content.length > 200 ? '...' : ''));
        console.log(chalk_1.default.gray('─'.repeat(50)));
        if (!options.preview) {
            const { confirmed } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirmed',
                    message: 'Proceed with optimization?',
                    default: true,
                },
            ]);
            if (!confirmed) {
                console.log(chalk_1.default.blue('Optimization cancelled'));
                return;
            }
        }
        const optimizeSpinner = (0, ora_1.default)('Optimizing content...').start();
        const optimizationOptions = {
            model: options.model,
            creativity: parseFloat(options.creativity),
            focusAreas: options.focus.split(',').map((area) => area.trim()),
            preserveStructure: options.preserveStructure,
            preview: options.preview,
        };
        const result = await api_1.api.optimizeItem(id, optimizationOptions);
        if (result.error) {
            optimizeSpinner.fail('Optimization failed');
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        optimizeSpinner.succeed('Optimization completed');
        if (options.preview) {
            console.log(chalk_1.default.blue('\nOptimized content preview:'));
            console.log(chalk_1.default.gray('─'.repeat(50)));
            console.log(result.data.optimizedContent);
            console.log(chalk_1.default.gray('─'.repeat(50)));
            if (result.data.suggestions) {
                console.log(chalk_1.default.blue('\nOptimization suggestions:'));
                result.data.suggestions.forEach((suggestion, index) => {
                    console.log(`${index + 1}. ${suggestion}`);
                });
            }
            const { applyChanges } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'applyChanges',
                    message: 'Apply these optimizations?',
                    default: true,
                },
            ]);
            if (applyChanges) {
                const applySpinner = (0, ora_1.default)('Applying optimizations...').start();
                const updateResult = await api_1.api.updateItem(id, {
                    content: result.data.optimizedContent,
                    metadata: {
                        ...item.metadata,
                        optimized: true,
                        optimizedAt: new Date().toISOString(),
                        optimizationModel: options.model,
                        optimizationFocus: options.focus,
                    },
                });
                if (updateResult.error) {
                    applySpinner.fail('Failed to apply optimizations');
                    console.error(chalk_1.default.red('Error:'), updateResult.error);
                    process.exit(1);
                }
                applySpinner.succeed('Optimizations applied successfully');
            }
        }
        else {
            console.log(chalk_1.default.green('✓ Item optimized successfully!'));
            console.log(`${chalk_1.default.cyan('Quality improvement:')} ${result.data.improvement || 'N/A'}`);
            if (result.data.changes) {
                console.log(chalk_1.default.blue('\nChanges made:'));
                result.data.changes.forEach((change, index) => {
                    console.log(`${index + 1}. ${change}`);
                });
            }
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error optimizing item:'), error);
        process.exit(1);
    }
}))
    .addCommand(new commander_1.Command('batch')
    .description('Optimize multiple items')
    .option('-t, --type <types>', 'filter by types (comma-separated)')
    .option('-f, --folder <folder>', 'optimize items in folder')
    .option('--tags <tags>', 'filter by tags (comma-separated)')
    .option('-l, --limit <limit>', 'limit number of items', '50')
    .option('-m, --model <model>', 'AI model to use')
    .option('-c, --creativity <level>', 'creativity level (0-1)', '0.7')
    .option('--focus <areas>', 'focus areas', 'clarity,structure')
    .option('--batch-size <size>', 'processing batch size', '5')
    .option('--dry-run', 'preview without applying')
    .action(async (options) => {
    try {
        const config = config_1.ConfigManager.getConfig();
        const batchSize = parseInt(options.batchSize) || 5;
        const spinner = (0, ora_1.default)('Fetching items to optimize...').start();
        const searchOptions = {
            type: options.type ? options.type.split(',').map((t) => t.trim()) : undefined,
            folderId: options.folder,
            tags: options.tags ? options.tags.split(',').map((t) => t.trim()) : undefined,
            limit: parseInt(options.limit),
        };
        const result = await api_1.api.getItems(searchOptions);
        if (result.error) {
            spinner.fail('Failed to fetch items');
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        const items = result.data || [];
        if (items.length === 0) {
            spinner.fail('No items found to optimize');
            return;
        }
        spinner.succeed(`Found ${items.length} items to optimize`);
        if (options.dryRun) {
            console.log(chalk_1.default.blue('Items that would be optimized:'));
            items.forEach((item, index) => {
                console.log(`${index + 1}. ${item.name} (${item.type})`);
            });
            return;
        }
        const { confirmed } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: `Optimize ${items.length} items?`,
                default: true,
            },
        ]);
        if (!confirmed) {
            console.log(chalk_1.default.blue('Batch optimization cancelled'));
            return;
        }
        const optimizationOptions = {
            model: options.model,
            creativity: parseFloat(options.creativity),
            focusAreas: options.focus.split(',').map((area) => area.trim()),
            batchSize,
        };
        const batchSpinner = (0, ora_1.default)('Starting batch optimization...').start();
        const batchResult = await api_1.api.request('POST', '/intelligence/batch', {
            itemIds: items.map((item) => item.id),
            operation: 'optimize',
            options: optimizationOptions,
        });
        if (batchResult.error) {
            batchSpinner.fail('Failed to start batch optimization');
            console.error(chalk_1.default.red('Error:'), batchResult.error);
            process.exit(1);
        }
        batchSpinner.succeed('Batch optimization started');
        const jobId = batchResult.data.jobId;
        await monitorOptimizationJob(jobId);
    }
    catch (error) {
        console.error(chalk_1.default.red('Error in batch optimization:'), error);
        process.exit(1);
    }
}))
    .addCommand(new commander_1.Command('analyze')
    .description('Analyze content quality without optimizing')
    .argument('<id>', 'item ID')
    .option('--detailed', 'show detailed analysis')
    .action(async (id, options) => {
    try {
        const spinner = (0, ora_1.default)('Analyzing content...').start();
        const result = await api_1.api.request('POST', '/intelligence/analysis', {
            itemId: id,
            detailed: options.detailed,
        });
        if (result.error) {
            spinner.fail('Analysis failed');
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        spinner.succeed('Analysis completed');
        const analysis = result.data;
        console.log(chalk_1.default.blue.bold('\nContent Quality Analysis'));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`${chalk_1.default.cyan('Overall Score:')} ${formatters_1.Formatters.colorizeQuality(analysis.score)}`);
        console.log(`${chalk_1.default.cyan('Readability:')} ${formatters_1.Formatters.colorizeQuality(analysis.readability)}`);
        console.log(`${chalk_1.default.cyan('Structure:')} ${formatters_1.Formatters.colorizeQuality(analysis.structure)}`);
        console.log(`${chalk_1.default.cyan('Clarity:')} ${formatters_1.Formatters.colorizeQuality(analysis.clarity)}`);
        if (analysis.issues && analysis.issues.length > 0) {
            console.log(chalk_1.default.red('\nIssues Found:'));
            analysis.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });
        }
        if (analysis.suggestions && analysis.suggestions.length > 0) {
            console.log(chalk_1.default.blue('\nSuggestions:'));
            analysis.suggestions.forEach((suggestion, index) => {
                console.log(`${index + 1}. ${suggestion}`);
            });
        }
        if (options.detailed && analysis.details) {
            console.log(chalk_1.default.blue('\nDetailed Analysis:'));
            console.log(`${chalk_1.default.cyan('Word Count:')} ${analysis.details.wordCount}`);
            console.log(`${chalk_1.default.cyan('Sentence Count:')} ${analysis.details.sentenceCount}`);
            console.log(`${chalk_1.default.cyan('Avg Sentence Length:')} ${analysis.details.avgSentenceLength}`);
            console.log(`${chalk_1.default.cyan('Reading Level:')} ${analysis.details.readingLevel}`);
            if (analysis.details.keywords) {
                console.log(`${chalk_1.default.cyan('Key Topics:')} ${analysis.details.keywords.join(', ')}`);
            }
        }
        console.log(chalk_1.default.blue('\nRecommendation:'));
        if (analysis.score < 0.6) {
            console.log(chalk_1.default.red('⚠️  This content would benefit from optimization'));
            console.log(chalk_1.default.gray('Run: contextforge optimize item ' + id));
        }
        else if (analysis.score < 0.8) {
            console.log(chalk_1.default.yellow('💡 This content could be improved with minor optimizations'));
        }
        else {
            console.log(chalk_1.default.green('✅ This content is well-optimized'));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error analyzing content:'), error);
        process.exit(1);
    }
}));
async function monitorOptimizationJob(jobId) {
    const spinner = (0, ora_1.default)('Processing optimizations...').start();
    const pollInterval = 3000;
    const maxWaitTime = 10 * 60 * 1000;
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
                spinner.succeed('Batch optimization completed');
                if (job.results) {
                    console.log(chalk_1.default.green(`✓ Optimized ${job.results.optimized || 0} items`));
                    console.log(`${chalk_1.default.cyan('Failed:')} ${job.results.failed || 0}`);
                    console.log(`${chalk_1.default.cyan('Skipped:')} ${job.results.skipped || 0}`);
                    if (job.results.averageImprovement) {
                        console.log(`${chalk_1.default.cyan('Average Quality Improvement:')} ${job.results.averageImprovement}%`);
                    }
                }
                return;
            }
            else if (job.status === 'failed') {
                spinner.fail('Batch optimization failed');
                console.error(chalk_1.default.red('Error:'), job.error || 'Unknown error');
                return;
            }
            else if (job.status === 'running') {
                const progress = job.totalItems > 0
                    ? Math.round((job.processedItems / job.totalItems) * 100)
                    : 0;
                spinner.text = `Optimizing... ${progress}% (${job.processedItems}/${job.totalItems})`;
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        catch (error) {
            spinner.fail('Error monitoring optimization job');
            console.error(chalk_1.default.red('Error:'), error);
            return;
        }
    }
    spinner.fail('Optimization timed out');
    console.log(chalk_1.default.yellow('The optimization is taking longer than expected. Check job status with:'));
    console.log(chalk_1.default.cyan(`contextforge jobs get ${jobId}`));
}
//# sourceMappingURL=optimize.js.map