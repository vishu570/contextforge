import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { api } from '../lib/api';
import { ConfigManager } from '../lib/config';
import { Formatters } from '../utils/formatters';

export const optimizeCommand = new Command('optimize')
  .description('AI-powered content optimization')
  .addCommand(
    new Command('item')
      .description('Optimize a single item')
      .argument('<id>', 'item ID')
      .option('-m, --model <model>', 'AI model to use (gpt-4|claude|gemini)')
      .option('-c, --creativity <level>', 'creativity level (0-1)', '0.7')
      .option('--focus <areas>', 'focus areas (clarity,structure,engagement,etc)', 'clarity,structure')
      .option('--preserve-structure', 'preserve original structure')
      .option('--preview', 'preview changes without applying')
      .action(async (id, options) => {
        try {
          const spinner = ora('Fetching item...').start();

          // Get the item first
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

          console.log(chalk.blue('Original content preview:'));
          console.log(chalk.gray('─'.repeat(50)));
          console.log(item.content.substring(0, 200) + (item.content.length > 200 ? '...' : ''));
          console.log(chalk.gray('─'.repeat(50)));

          if (!options.preview) {
            const { confirmed } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirmed',
                message: 'Proceed with optimization?',
                default: true,
              },
            ]);

            if (!confirmed) {
              console.log(chalk.blue('Optimization cancelled'));
              return;
            }
          }

          const optimizeSpinner = ora('Optimizing content...').start();

          const optimizationOptions = {
            model: options.model,
            creativity: parseFloat(options.creativity),
            focusAreas: options.focus.split(',').map((area: string) => area.trim()),
            preserveStructure: options.preserveStructure,
            preview: options.preview,
          };

          const result = await api.optimizeItem(id, optimizationOptions);

          if (result.error) {
            optimizeSpinner.fail('Optimization failed');
            console.error(chalk.red('Error:'), result.error);
            process.exit(1);
          }

          optimizeSpinner.succeed('Optimization completed');

          if (options.preview) {
            console.log(chalk.blue('\nOptimized content preview:'));
            console.log(chalk.gray('─'.repeat(50)));
            console.log(result.data.optimizedContent);
            console.log(chalk.gray('─'.repeat(50)));

            if (result.data.suggestions) {
              console.log(chalk.blue('\nOptimization suggestions:'));
              result.data.suggestions.forEach((suggestion: string, index: number) => {
                console.log(`${index + 1}. ${suggestion}`);
              });
            }

            const { applyChanges } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'applyChanges',
                message: 'Apply these optimizations?',
                default: true,
              },
            ]);

            if (applyChanges) {
              const applySpinner = ora('Applying optimizations...').start();
              const updateResult = await api.updateItem(id, {
                content: result.data.optimizedContent,
                metadata: {
                  ...(item?.metadata || {}),
                  optimized: true,
                  optimizedAt: new Date().toISOString(),
                  optimizationModel: options.model,
                  optimizationFocus: options.focus,
                },
              });

              if (updateResult.error) {
                applySpinner.fail('Failed to apply optimizations');
                console.error(chalk.red('Error:'), updateResult.error);
                process.exit(1);
              }

              applySpinner.succeed('Optimizations applied successfully');
            }
          } else {
            console.log(chalk.green('✓ Item optimized successfully!'));
            console.log(`${chalk.cyan('Quality improvement:')} ${result.data.improvement || 'N/A'}`);
            
            if (result.data.changes) {
              console.log(chalk.blue('\nChanges made:'));
              result.data.changes.forEach((change: string, index: number) => {
                console.log(`${index + 1}. ${change}`);
              });
            }
          }
        } catch (error) {
          console.error(chalk.red('Error optimizing item:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('batch')
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
          const config = ConfigManager.getConfig();
          const batchSize = parseInt(options.batchSize) || 5;

          const spinner = ora('Fetching items to optimize...').start();

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
            spinner.fail('No items found to optimize');
            return;
          }

          spinner.succeed(`Found ${items.length} items to optimize`);

          if (options.dryRun) {
            console.log(chalk.blue('Items that would be optimized:'));
            items.forEach((item: any, index: number) => {
              console.log(`${index + 1}. ${item.name} (${item.type})`);
            });
            return;
          }

          const { confirmed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmed',
              message: `Optimize ${items.length} items?`,
              default: true,
            },
          ]);

          if (!confirmed) {
            console.log(chalk.blue('Batch optimization cancelled'));
            return;
          }

          // Start batch optimization
          const optimizationOptions = {
            model: options.model,
            creativity: parseFloat(options.creativity),
            focusAreas: options.focus.split(',').map((area: string) => area.trim()),
            batchSize,
          };

          const batchSpinner = ora('Starting batch optimization...').start();

          const batchResult = await api.request('POST', '/intelligence/batch', {
            itemIds: items.map((item: any) => item.id),
            operation: 'optimize',
            options: optimizationOptions,
          });

          if (batchResult.error) {
            batchSpinner.fail('Failed to start batch optimization');
            console.error(chalk.red('Error:'), batchResult.error);
            process.exit(1);
          }

          batchSpinner.succeed('Batch optimization started');

          // Monitor progress
          const jobId = batchResult.data.jobId;
          await monitorOptimizationJob(jobId);
        } catch (error) {
          console.error(chalk.red('Error in batch optimization:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('analyze')
      .description('Analyze content quality without optimizing')
      .argument('<id>', 'item ID')
      .option('--detailed', 'show detailed analysis')
      .action(async (id, options) => {
        try {
          const spinner = ora('Analyzing content...').start();

          const result = await api.request('POST', '/intelligence/analysis', {
            itemId: id,
            detailed: options.detailed,
          });

          if (result.error) {
            spinner.fail('Analysis failed');
            console.error(chalk.red('Error:'), result.error);
            process.exit(1);
          }

          spinner.succeed('Analysis completed');

          const analysis = result.data;

          console.log(chalk.blue.bold('\nContent Quality Analysis'));
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          console.log(`${chalk.cyan('Overall Score:')} ${Formatters.colorizeQuality(analysis.score)}`);
          console.log(`${chalk.cyan('Readability:')} ${Formatters.colorizeQuality(analysis.readability)}`);
          console.log(`${chalk.cyan('Structure:')} ${Formatters.colorizeQuality(analysis.structure)}`);
          console.log(`${chalk.cyan('Clarity:')} ${Formatters.colorizeQuality(analysis.clarity)}`);

          if (analysis.issues && analysis.issues.length > 0) {
            console.log(chalk.red('\nIssues Found:'));
            analysis.issues.forEach((issue: string, index: number) => {
              console.log(`${index + 1}. ${issue}`);
            });
          }

          if (analysis.suggestions && analysis.suggestions.length > 0) {
            console.log(chalk.blue('\nSuggestions:'));
            analysis.suggestions.forEach((suggestion: string, index: number) => {
              console.log(`${index + 1}. ${suggestion}`);
            });
          }

          if (options.detailed && analysis.details) {
            console.log(chalk.blue('\nDetailed Analysis:'));
            console.log(`${chalk.cyan('Word Count:')} ${analysis.details.wordCount}`);
            console.log(`${chalk.cyan('Sentence Count:')} ${analysis.details.sentenceCount}`);
            console.log(`${chalk.cyan('Avg Sentence Length:')} ${analysis.details.avgSentenceLength}`);
            console.log(`${chalk.cyan('Reading Level:')} ${analysis.details.readingLevel}`);
            
            if (analysis.details.keywords) {
              console.log(`${chalk.cyan('Key Topics:')} ${analysis.details.keywords.join(', ')}`);
            }
          }

          console.log(chalk.blue('\nRecommendation:'));
          if (analysis.score < 0.6) {
            console.log(chalk.red('⚠️  This content would benefit from optimization'));
            console.log(chalk.gray('Run: contextforge optimize item ' + id));
          } else if (analysis.score < 0.8) {
            console.log(chalk.yellow('💡 This content could be improved with minor optimizations'));
          } else {
            console.log(chalk.green('✅ This content is well-optimized'));
          }
        } catch (error) {
          console.error(chalk.red('Error analyzing content:'), error);
          process.exit(1);
        }
      })
  );

async function monitorOptimizationJob(jobId: string) {
  const spinner = ora('Processing optimizations...').start();
  
  const pollInterval = 3000; // 3 seconds
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
        spinner.succeed('Batch optimization completed');
        
        if (job.results) {
          console.log(chalk.green(`✓ Optimized ${job.results.optimized || 0} items`));
          console.log(`${chalk.cyan('Failed:')} ${job.results.failed || 0}`);
          console.log(`${chalk.cyan('Skipped:')} ${job.results.skipped || 0}`);
          
          if (job.results.averageImprovement) {
            console.log(`${chalk.cyan('Average Quality Improvement:')} ${job.results.averageImprovement}%`);
          }
        }
        return;
      } else if (job.status === 'failed') {
        spinner.fail('Batch optimization failed');
        console.error(chalk.red('Error:'), job.error || 'Unknown error');
        return;
      } else if (job.status === 'running') {
        const progress = job.totalItems > 0 
          ? Math.round((job.processedItems / job.totalItems) * 100)
          : 0;
        spinner.text = `Optimizing... ${progress}% (${job.processedItems}/${job.totalItems})`;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      spinner.fail('Error monitoring optimization job');
      console.error(chalk.red('Error:'), error);
      return;
    }
  }

  spinner.fail('Optimization timed out');
  console.log(chalk.yellow('The optimization is taking longer than expected. Check job status with:'));
  console.log(chalk.cyan(`contextforge jobs get ${jobId}`));
}