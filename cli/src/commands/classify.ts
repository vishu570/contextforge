import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { api } from '../lib/api';
import { ConfigManager } from '../lib/config';

export const classifyCommand = new Command('classify')
  .description('AI-powered content classification and organization')
  .addCommand(
    new Command('item')
      .description('Classify a single item')
      .argument('<id>', 'item ID')
      .option('-m, --model <model>', 'AI model to use')
      .option('--categories <categories>', 'custom categories (comma-separated)')
      .option('--confidence <threshold>', 'confidence threshold (0-1)', '0.7')
      .option('--auto-folder', 'automatically create and move to folders')
      .option('--preview', 'preview classification without applying')
      .action(async (id, options) => {
        try {
          const spinner = ora('Fetching item...').start();

          const itemResult = await api.getItem(id);
          if (itemResult.error) {
            spinner.fail('Failed to fetch item');
            console.error(chalk.red('Error:'), itemResult.error);
            process.exit(1);
          }

          const item = itemResult.data;
          if (!item) {
            spinner.fail('Item not found');
            process.exit(1);
          }
          spinner.succeed(`Found item: ${item.name}`);

          console.log(chalk.blue('Content preview:'));
          console.log(chalk.gray('─'.repeat(50)));
          console.log(item.content.substring(0, 300) + (item.content.length > 300 ? '...' : ''));
          console.log(chalk.gray('─'.repeat(50)));

          const classifySpinner = ora('Classifying content...').start();

          const classificationOptions = {
            model: options.model,
            categories: options.categories ? options.categories.split(',').map((c: string) => c.trim()) : undefined,
            confidence: parseFloat(options.confidence),
            autoCreateFolders: options.autoFolder,
            preview: options.preview,
          };

          const result = await api.request('POST', '/intelligence/classify', {
            itemIds: [id],
            options: classificationOptions,
          });

          if (result.error) {
            classifySpinner.fail('Classification failed');
            console.error(chalk.red('Error:'), result.error);
            process.exit(1);
          }

          classifySpinner.succeed('Classification completed');

          const classification = result.data.results[0];

          console.log(chalk.blue.bold('\nClassification Results'));
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          console.log(`${chalk.cyan('Primary Category:')} ${chalk.green(classification.primaryCategory)}`);
          console.log(`${chalk.cyan('Confidence:')} ${classification.confidence.toFixed(2)}`);

          if (classification.secondaryCategories && classification.secondaryCategories.length > 0) {
            console.log(`${chalk.cyan('Secondary Categories:')}`);
            classification.secondaryCategories.forEach((cat: any) => {
              console.log(`  - ${cat.name} (${(cat.confidence * 100).toFixed(1)}%)`);
            });
          }

          if (classification.suggestedTags && classification.suggestedTags.length > 0) {
            console.log(`${chalk.cyan('Suggested Tags:')} ${classification.suggestedTags.join(', ')}`);
          }

          if (classification.suggestedFolder) {
            console.log(`${chalk.cyan('Suggested Folder:')} ${classification.suggestedFolder}`);
          }

          if (classification.reasoning) {
            console.log(chalk.blue('\nReasoning:'));
            console.log(chalk.gray(classification.reasoning));
          }

          if (!options.preview) {
            const actions = [];
            
            if (classification.suggestedTags && classification.suggestedTags.length > 0) {
              actions.push('Add suggested tags');
            }
            
            if (classification.suggestedFolder) {
              actions.push('Move to suggested folder');
            }
            
            if (item && classification.primaryCategory !== item.type) {
              actions.push(`Change type to ${classification.primaryCategory}`);
            }

            if (actions.length > 0) {
              const { selectedActions } = await inquirer.prompt([
                {
                  type: 'checkbox',
                  name: 'selectedActions',
                  message: 'Which actions would you like to apply?',
                  choices: actions,
                  default: actions,
                },
              ]);

              if (selectedActions.length > 0) {
                const updateSpinner = ora('Applying classification results...').start();

                const updates: any = {};

                if (selectedActions.includes('Add suggested tags') && item) {
                  const existingTags = item.tags || [];
                  const newTags = [...new Set([...existingTags, ...classification.suggestedTags])];
                  updates.tags = newTags;
                }

                if (selectedActions.includes('Move to suggested folder')) {
                  // Find or create folder
                  if (options.autoFolder) {
                    const folderResult = await api.createFolder({
                      name: classification.suggestedFolder,
                      description: `Auto-created for ${classification.primaryCategory} items`,
                    });
                    if (!folderResult.error && folderResult.data) {
                      updates.folderId = folderResult.data.id;
                    }
                  }
                }

                if (selectedActions.includes(`Change type to ${classification.primaryCategory}`)) {
                  updates.type = classification.primaryCategory;
                }

                const updateResult = await api.updateItem(id, updates);

                if (updateResult.error) {
                  updateSpinner.fail('Failed to apply classification');
                  console.error(chalk.red('Error:'), updateResult.error);
                  process.exit(1);
                }

                updateSpinner.succeed('Classification applied successfully');
              }
            }
          }
        } catch (error) {
          console.error(chalk.red('Error classifying item:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('batch')
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
          const config = ConfigManager.getConfig();
          const batchSize = parseInt(options.batchSize) || 10;

          const spinner = ora('Fetching items to classify...').start();

          const searchOptions = {
            type: options.type ? options.type.split(',').map((t: string) => t.trim()) : undefined,
            folderId: options.folder,
            tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined,
            limit: parseInt(options.limit),
          };

          const result = await api.getItems(searchOptions);

          if (result.error) {
            spinner.fail('Failed to fetch items');
            console.error(chalk.red('Error:'), result.error);
            process.exit(1);
          }

          const items = result.data || [];
          
          if (items.length === 0) {
            spinner.fail('No items found to classify');
            return;
          }

          spinner.succeed(`Found ${items.length} items to classify`);

          if (options.dryRun) {
            console.log(chalk.blue('Items that would be classified:'));
            items.forEach((item: any, index: number) => {
              console.log(`${index + 1}. ${item.name} (${item.type})`);
            });
            return;
          }

          const { confirmed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmed',
              message: `Classify ${items.length} items?`,
              default: true,
            },
          ]);

          if (!confirmed) {
            console.log(chalk.blue('Batch classification cancelled'));
            return;
          }

          const classificationOptions = {
            model: options.model,
            categories: options.categories ? options.categories.split(',').map((c: string) => c.trim()) : undefined,
            confidence: parseFloat(options.confidence),
            autoCreateFolders: options.autoFolder,
            batchSize,
          };

          const batchSpinner = ora('Starting batch classification...').start();

          const batchResult = await api.classifyItems(
            items.map((item: any) => item.id),
            classificationOptions
          );

          if (batchResult.error) {
            batchSpinner.fail('Failed to start batch classification');
            console.error(chalk.red('Error:'), batchResult.error);
            process.exit(1);
          }

          batchSpinner.succeed('Batch classification started');

          // Monitor progress
          const jobId = batchResult.data.jobId;
          await monitorClassificationJob(jobId);
        } catch (error) {
          console.error(chalk.red('Error in batch classification:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('suggest')
      .description('Get classification suggestions for organizing content')
      .option('-t, --type <types>', 'analyze specific types')
      .option('--sample-size <size>', 'number of items to analyze', '50')
      .action(async (options) => {
        try {
          const spinner = ora('Analyzing content patterns...').start();

          const analysisOptions = {
            types: options.type ? options.type.split(',').map((t: string) => t.trim()) : undefined,
            sampleSize: parseInt(options.sampleSize),
          };

          const result = await api.request('POST', '/intelligence/analysis/patterns', analysisOptions);

          if (result.error) {
            spinner.fail('Analysis failed');
            console.error(chalk.red('Error:'), result.error);
            process.exit(1);
          }

          spinner.succeed('Pattern analysis completed');

          const suggestions = result.data;

          console.log(chalk.blue.bold('\nOrganization Suggestions'));
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          if (suggestions.recommendedCategories && suggestions.recommendedCategories.length > 0) {
            console.log(chalk.cyan('\nRecommended Categories:'));
            suggestions.recommendedCategories.forEach((category: any, index: number) => {
              console.log(`${index + 1}. ${chalk.green(category.name)} (${category.itemCount} items)`);
              if (category.description) {
                console.log(`   ${chalk.gray(category.description)}`);
              }
            });
          }

          if (suggestions.folderStructure && suggestions.folderStructure.length > 0) {
            console.log(chalk.cyan('\nSuggested Folder Structure:'));
            suggestions.folderStructure.forEach((folder: any) => {
              console.log(`📁 ${folder.name} (${folder.estimatedItems} items)`);
              if (folder.subfolders) {
                folder.subfolders.forEach((subfolder: any) => {
                  console.log(`  📁 ${subfolder.name} (${subfolder.estimatedItems} items)`);
                });
              }
            });
          }

          if (suggestions.commonTags && suggestions.commonTags.length > 0) {
            console.log(chalk.cyan('\nCommonly Used Tags:'));
            suggestions.commonTags.forEach((tag: any, index: number) => {
              console.log(`${index + 1}. ${tag.name} (${tag.frequency} items)`);
            });
          }

          if (suggestions.recommendations && suggestions.recommendations.length > 0) {
            console.log(chalk.cyan('\nRecommendations:'));
            suggestions.recommendations.forEach((rec: string, index: number) => {
              console.log(`${index + 1}. ${rec}`);
            });
          }

          console.log(chalk.blue('\nNext Steps:'));
          console.log('• Use these suggestions to create a folder structure');
          console.log('• Run batch classification to organize existing content');
          console.log('• Set up auto-organization rules for future imports');
        } catch (error) {
          console.error(chalk.red('Error getting suggestions:'), error);
          process.exit(1);
        }
      })
  );

async function monitorClassificationJob(jobId: string) {
  const spinner = ora('Processing classifications...').start();
  
  const pollInterval = 2000; // 2 seconds
  const maxWaitTime = 10 * 60 * 1000; // 10 minutes
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const result = await api.getJob(jobId);
      
      if (result.error) {
        spinner.fail('Failed to check job status');
        console.error(chalk.red('Error:'), result.error);
        return;
      }

      const job = result.data;
      if (!job) {
        spinner.fail('Job not found');
        return;
      }
      
      if (job.status === 'completed') {
        spinner.succeed('Batch classification completed');
        
        if (job.results) {
          console.log(chalk.green(`✓ Classified ${job.results.classified || 0} items`));
          console.log(`${chalk.cyan('Failed:')} ${job.results.failed || 0}`);
          console.log(`${chalk.cyan('Low Confidence:')} ${job.results.lowConfidence || 0}`);
          
          if (job.results.newFolders) {
            console.log(`${chalk.cyan('Folders Created:')} ${job.results.newFolders}`);
          }
          
          if (job.results.categoryBreakdown) {
            console.log(chalk.blue('\nCategory Breakdown:'));
            Object.entries(job.results.categoryBreakdown).forEach(([category, count]: [string, any]) => {
              console.log(`  ${category}: ${count} items`);
            });
          }
        }
        return;
      } else if (job.status === 'failed') {
        spinner.fail('Batch classification failed');
        console.error(chalk.red('Error:'), job.error || 'Unknown error');
        return;
      } else if (job.status === 'running') {
        const progress = job.totalItems > 0 
          ? Math.round((job.processedItems / job.totalItems) * 100)
          : 0;
        spinner.text = `Classifying... ${progress}% (${job.processedItems}/${job.totalItems})`;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      spinner.fail('Error monitoring classification job');
      console.error(chalk.red('Error:'), error);
      return;
    }
  }

  spinner.fail('Classification timed out');
  console.log(chalk.yellow('The classification is taking longer than expected. Check job status with:'));
  console.log(chalk.cyan(`contextforge jobs get ${jobId}`));
}