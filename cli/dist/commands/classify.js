"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const api_1 = require("../lib/api");
const config_1 = require("../lib/config");
exports.classifyCommand = new commander_1.Command('classify')
    .description('AI-powered content classification and organization')
    .addCommand(new commander_1.Command('item')
    .description('Classify a single item')
    .argument('<id>', 'item ID')
    .option('-m, --model <model>', 'AI model to use')
    .option('--categories <categories>', 'custom categories (comma-separated)')
    .option('--confidence <threshold>', 'confidence threshold (0-1)', '0.7')
    .option('--auto-folder', 'automatically create and move to folders')
    .option('--preview', 'preview classification without applying')
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
        console.log(chalk_1.default.blue('Content preview:'));
        console.log(chalk_1.default.gray('─'.repeat(50)));
        console.log(item.content.substring(0, 300) + (item.content.length > 300 ? '...' : ''));
        console.log(chalk_1.default.gray('─'.repeat(50)));
        const classifySpinner = (0, ora_1.default)('Classifying content...').start();
        const classificationOptions = {
            model: options.model,
            categories: options.categories ? options.categories.split(',').map((c) => c.trim()) : undefined,
            confidence: parseFloat(options.confidence),
            autoCreateFolders: options.autoFolder,
            preview: options.preview,
        };
        const result = await api_1.api.request('POST', '/intelligence/classify', {
            itemIds: [id],
            options: classificationOptions,
        });
        if (result.error) {
            classifySpinner.fail('Classification failed');
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        classifySpinner.succeed('Classification completed');
        const classification = result.data.results[0];
        console.log(chalk_1.default.blue.bold('\nClassification Results'));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`${chalk_1.default.cyan('Primary Category:')} ${chalk_1.default.green(classification.primaryCategory)}`);
        console.log(`${chalk_1.default.cyan('Confidence:')} ${classification.confidence.toFixed(2)}`);
        if (classification.secondaryCategories && classification.secondaryCategories.length > 0) {
            console.log(`${chalk_1.default.cyan('Secondary Categories:')}`);
            classification.secondaryCategories.forEach((cat) => {
                console.log(`  - ${cat.name} (${(cat.confidence * 100).toFixed(1)}%)`);
            });
        }
        if (classification.suggestedTags && classification.suggestedTags.length > 0) {
            console.log(`${chalk_1.default.cyan('Suggested Tags:')} ${classification.suggestedTags.join(', ')}`);
        }
        if (classification.suggestedFolder) {
            console.log(`${chalk_1.default.cyan('Suggested Folder:')} ${classification.suggestedFolder}`);
        }
        if (classification.reasoning) {
            console.log(chalk_1.default.blue('\nReasoning:'));
            console.log(chalk_1.default.gray(classification.reasoning));
        }
        if (!options.preview) {
            const actions = [];
            if (classification.suggestedTags && classification.suggestedTags.length > 0) {
                actions.push('Add suggested tags');
            }
            if (classification.suggestedFolder) {
                actions.push('Move to suggested folder');
            }
            if (classification.primaryCategory !== item.type) {
                actions.push(`Change type to ${classification.primaryCategory}`);
            }
            if (actions.length > 0) {
                const { selectedActions } = await inquirer_1.default.prompt([
                    {
                        type: 'checkbox',
                        name: 'selectedActions',
                        message: 'Which actions would you like to apply?',
                        choices: actions,
                        default: actions,
                    },
                ]);
                if (selectedActions.length > 0) {
                    const updateSpinner = (0, ora_1.default)('Applying classification results...').start();
                    const updates = {};
                    if (selectedActions.includes('Add suggested tags')) {
                        const existingTags = item.tags || [];
                        const newTags = [...new Set([...existingTags, ...classification.suggestedTags])];
                        updates.tags = newTags;
                    }
                    if (selectedActions.includes('Move to suggested folder')) {
                        if (options.autoFolder) {
                            const folderResult = await api_1.api.createFolder({
                                name: classification.suggestedFolder,
                                description: `Auto-created for ${classification.primaryCategory} items`,
                            });
                            if (!folderResult.error) {
                                updates.folderId = folderResult.data.id;
                            }
                        }
                    }
                    if (selectedActions.includes(`Change type to ${classification.primaryCategory}`)) {
                        updates.type = classification.primaryCategory;
                    }
                    const updateResult = await api_1.api.updateItem(id, updates);
                    if (updateResult.error) {
                        updateSpinner.fail('Failed to apply classification');
                        console.error(chalk_1.default.red('Error:'), updateResult.error);
                        process.exit(1);
                    }
                    updateSpinner.succeed('Classification applied successfully');
                }
            }
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error classifying item:'), error);
        process.exit(1);
    }
}))
    .addCommand(new commander_1.Command('batch')
    .description('Classify multiple items')
    .option('-t, --type <types>', 'filter by types (comma-separated)')
    .option('-f, --folder <folder>', 'classify items in folder')
    .option('--tags <tags>', 'filter by tags (comma-separated)')
    .option('-l, --limit <limit>', 'limit number of items', '100')
    .option('-m, --model <model>', 'AI model to use')
    .option('--categories <categories>', 'custom categories')
    .option('--confidence <threshold>', 'confidence threshold', '0.7')
    .option('--auto-folder', 'automatically create folders')
    .option('--batch-size <size>', 'processing batch size', '10')
    .option('--dry-run', 'preview without applying')
    .action(async (options) => {
    try {
        const config = config_1.ConfigManager.getConfig();
        const batchSize = parseInt(options.batchSize) || 10;
        const spinner = (0, ora_1.default)('Fetching items to classify...').start();
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
            spinner.fail('No items found to classify');
            return;
        }
        spinner.succeed(`Found ${items.length} items to classify`);
        if (options.dryRun) {
            console.log(chalk_1.default.blue('Items that would be classified:'));
            items.forEach((item, index) => {
                console.log(`${index + 1}. ${item.name} (${item.type})`);
            });
            return;
        }
        const { confirmed } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: `Classify ${items.length} items?`,
                default: true,
            },
        ]);
        if (!confirmed) {
            console.log(chalk_1.default.blue('Batch classification cancelled'));
            return;
        }
        const classificationOptions = {
            model: options.model,
            categories: options.categories ? options.categories.split(',').map((c) => c.trim()) : undefined,
            confidence: parseFloat(options.confidence),
            autoCreateFolders: options.autoFolder,
            batchSize,
        };
        const batchSpinner = (0, ora_1.default)('Starting batch classification...').start();
        const batchResult = await api_1.api.classifyItems(items.map((item) => item.id), classificationOptions);
        if (batchResult.error) {
            batchSpinner.fail('Failed to start batch classification');
            console.error(chalk_1.default.red('Error:'), batchResult.error);
            process.exit(1);
        }
        batchSpinner.succeed('Batch classification started');
        const jobId = batchResult.data.jobId;
        await monitorClassificationJob(jobId);
    }
    catch (error) {
        console.error(chalk_1.default.red('Error in batch classification:'), error);
        process.exit(1);
    }
}))
    .addCommand(new commander_1.Command('suggest')
    .description('Get classification suggestions for organizing content')
    .option('-t, --type <types>', 'analyze specific types')
    .option('--sample-size <size>', 'number of items to analyze', '50')
    .action(async (options) => {
    try {
        const spinner = (0, ora_1.default)('Analyzing content patterns...').start();
        const analysisOptions = {
            types: options.type ? options.type.split(',').map((t) => t.trim()) : undefined,
            sampleSize: parseInt(options.sampleSize),
        };
        const result = await api_1.api.request('POST', '/intelligence/analysis/patterns', analysisOptions);
        if (result.error) {
            spinner.fail('Analysis failed');
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        spinner.succeed('Pattern analysis completed');
        const suggestions = result.data;
        console.log(chalk_1.default.blue.bold('\nOrganization Suggestions'));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        if (suggestions.recommendedCategories && suggestions.recommendedCategories.length > 0) {
            console.log(chalk_1.default.cyan('\nRecommended Categories:'));
            suggestions.recommendedCategories.forEach((category, index) => {
                console.log(`${index + 1}. ${chalk_1.default.green(category.name)} (${category.itemCount} items)`);
                if (category.description) {
                    console.log(`   ${chalk_1.default.gray(category.description)}`);
                }
            });
        }
        if (suggestions.folderStructure && suggestions.folderStructure.length > 0) {
            console.log(chalk_1.default.cyan('\nSuggested Folder Structure:'));
            suggestions.folderStructure.forEach((folder) => {
                console.log(`📁 ${folder.name} (${folder.estimatedItems} items)`);
                if (folder.subfolders) {
                    folder.subfolders.forEach((subfolder) => {
                        console.log(`  📁 ${subfolder.name} (${subfolder.estimatedItems} items)`);
                    });
                }
            });
        }
        if (suggestions.commonTags && suggestions.commonTags.length > 0) {
            console.log(chalk_1.default.cyan('\nCommonly Used Tags:'));
            suggestions.commonTags.forEach((tag, index) => {
                console.log(`${index + 1}. ${tag.name} (${tag.frequency} items)`);
            });
        }
        if (suggestions.recommendations && suggestions.recommendations.length > 0) {
            console.log(chalk_1.default.cyan('\nRecommendations:'));
            suggestions.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        }
        console.log(chalk_1.default.blue('\nNext Steps:'));
        console.log('• Use these suggestions to create a folder structure');
        console.log('• Run batch classification to organize existing content');
        console.log('• Set up auto-organization rules for future imports');
    }
    catch (error) {
        console.error(chalk_1.default.red('Error getting suggestions:'), error);
        process.exit(1);
    }
}));
async function monitorClassificationJob(jobId) {
    const spinner = (0, ora_1.default)('Processing classifications...').start();
    const pollInterval = 2000;
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
                spinner.succeed('Batch classification completed');
                if (job.results) {
                    console.log(chalk_1.default.green(`✓ Classified ${job.results.classified || 0} items`));
                    console.log(`${chalk_1.default.cyan('Failed:')} ${job.results.failed || 0}`);
                    console.log(`${chalk_1.default.cyan('Low Confidence:')} ${job.results.lowConfidence || 0}`);
                    if (job.results.newFolders) {
                        console.log(`${chalk_1.default.cyan('Folders Created:')} ${job.results.newFolders}`);
                    }
                    if (job.results.categoryBreakdown) {
                        console.log(chalk_1.default.blue('\nCategory Breakdown:'));
                        Object.entries(job.results.categoryBreakdown).forEach(([category, count]) => {
                            console.log(`  ${category}: ${count} items`);
                        });
                    }
                }
                return;
            }
            else if (job.status === 'failed') {
                spinner.fail('Batch classification failed');
                console.error(chalk_1.default.red('Error:'), job.error || 'Unknown error');
                return;
            }
            else if (job.status === 'running') {
                const progress = job.totalItems > 0
                    ? Math.round((job.processedItems / job.totalItems) * 100)
                    : 0;
                spinner.text = `Classifying... ${progress}% (${job.processedItems}/${job.totalItems})`;
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        catch (error) {
            spinner.fail('Error monitoring classification job');
            console.error(chalk_1.default.red('Error:'), error);
            return;
        }
    }
    spinner.fail('Classification timed out');
    console.log(chalk_1.default.yellow('The classification is taking longer than expected. Check job status with:'));
    console.log(chalk_1.default.cyan(`contextforge jobs get ${jobId}`));
}
//# sourceMappingURL=classify.js.map