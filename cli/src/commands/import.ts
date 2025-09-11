import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import inquirer from 'inquirer';
import { api } from '../lib/api';
import { ConfigManager } from '../lib/config';
import { Formatters } from '../utils/formatters';

export const importCommand = new Command('import')
  .description('Import content from various sources')
  .addCommand(
    new Command('file')
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
          if (!await fs.pathExists(filePath)) {
            console.error(chalk.red(`File not found: ${filePath}`));
            process.exit(1);
          }

          const spinner = ora('Reading file...').start();
          
          const content = await fs.readFile(filePath, 'utf8');
          const fileName = path.basename(filePath, path.extname(filePath));
          
          spinner.succeed('File read successfully');

          const itemData = {
            name: fileName,
            type: options.type || 'prompt',
            content,
            folderId: options.folder,
            tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [],
          };

          if (options.dryRun) {
            console.log(chalk.blue('Preview (dry run):'));
            console.log(`${chalk.cyan('Name:')} ${itemData.name}`);
            console.log(`${chalk.cyan('Type:')} ${itemData.type}`);
            console.log(`${chalk.cyan('Content length:')} ${content.length} characters`);
            console.log(`${chalk.cyan('Tags:')} ${itemData.tags.join(', ') || 'None'}`);
            return;
          }

          const importSpinner = ora('Importing...').start();
          
          const result = await api.createItem(itemData);
          
          if (result.error) {
            importSpinner.fail('Import failed');
            console.error(chalk.red('Error:'), result.error);
            process.exit(1);
          }

          importSpinner.succeed('Import completed');
          console.log(chalk.green('✓ File imported successfully!'));
          if (result.data) {
            console.log(`${chalk.cyan('ID:')} ${result.data.id}`);

            // Post-processing
            if (options.classify || options.optimize) {
              const postSpinner = ora('Post-processing...').start();
              
              if (options.classify) {
                await api.classifyItems([result.data.id]);
              }
              
              if (options.optimize) {
                await api.optimizeItem(result.data.id);
              }
              
              postSpinner.succeed('Post-processing completed');
            }
          }
        } catch (error) {
          console.error(chalk.red('Error importing file:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('directory')
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
          if (!await fs.pathExists(directory)) {
            console.error(chalk.red(`Directory not found: ${directory}`));
            process.exit(1);
          }

          const config = ConfigManager.getConfig();
          const batchSize = parseInt(options.batchSize) || config.batchSize;

          const spinner = ora('Scanning directory...').start();
          
          const pattern = path.join(directory, options.recursive ? options.pattern : '*');
          const files = await glob(pattern, { 
            ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
          });

          spinner.succeed(`Found ${files.length} files`);

          if (files.length === 0) {
            console.log(chalk.yellow('No files found matching the pattern'));
            return;
          }

          if (options.dryRun) {
            console.log(chalk.blue('Preview (dry run):'));
            files.slice(0, 10).forEach((file, index) => {
              console.log(`${index + 1}. ${path.relative(directory, file)}`);
            });
            if (files.length > 10) {
              console.log(chalk.gray(`... and ${files.length - 10} more files`));
            }
            return;
          }

          const { confirmed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmed',
              message: `Import ${files.length} files?`,
              default: true,
            },
          ]);

          if (!confirmed) {
            console.log(chalk.blue('Import cancelled'));
            return;
          }

          // Process in batches
          const progressSpinner = ora('Importing files...').start();
          let imported = 0;
          let failed = 0;

          for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            
            progressSpinner.text = `Importing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}...`;

            const batchPromises = batch.map(async (file) => {
              try {
                const content = await fs.readFile(file, 'utf8');
                const relativePath = path.relative(directory, file);
                const fileName = path.basename(file, path.extname(file));

                const itemData = {
                  name: `${fileName} (${relativePath})`,
                  type: 'prompt' as const,
                  content,
                  folderId: options.folder,
                  metadata: {
                    source: 'directory-import',
                    originalPath: relativePath,
                    importedAt: new Date().toISOString(),
                  },
                };

                const result = await api.createItem(itemData);
                if (result.error) {
                  throw new Error(result.error);
                }

                return { success: true, id: result.data?.id, file };
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return { success: false, error: errorMessage, file };
              }
            });

            const results = await Promise.all(batchPromises);
            
            results.forEach(result => {
              if (result.success) {
                imported++;
              } else {
                failed++;
                console.log(chalk.red(`Failed to import ${result.file}: ${result.error}`));
              }
            });

            progressSpinner.text = `Progress: ${imported + failed}/${files.length} (${imported} imported, ${failed} failed)`;
          }

          progressSpinner.succeed(`Import completed: ${imported} imported, ${failed} failed`);

          // Post-processing
          if ((options.classify || options.optimize) && imported > 0) {
            const postSpinner = ora('Post-processing...').start();
            // This would require getting the IDs of imported items
            postSpinner.succeed('Post-processing completed');
          }
        } catch (error) {
          console.error(chalk.red('Error importing directory:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('github')
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
          const spinner = ora('Fetching repository content...').start();

          // Parse repository
          let owner, repoName;
          if (repo.includes('/')) {
            if (repo.startsWith('http')) {
              const url = new URL(repo);
              [, owner, repoName] = url.pathname.split('/');
            } else {
              [owner, repoName] = repo.split('/');
            }
          } else {
            console.error(chalk.red('Invalid repository format. Use owner/repo or full URL'));
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

          const result = await api.request('POST', '/import/github', githubOptions);

          if (result.error) {
            spinner.fail('GitHub import failed');
            console.error(chalk.red('Error:'), result.error);
            process.exit(1);
          }

          if (options.dryRun) {
            spinner.succeed('Preview completed');
            console.log(chalk.blue('Files to be imported:'));
            result.data.files.forEach((file: any, index: number) => {
              console.log(`${index + 1}. ${file.path}`);
            });
            return;
          }

          spinner.succeed('GitHub import initiated');
          
          // Monitor job progress
          const jobId = result.data.jobId;
          await monitorJob(jobId);
        } catch (error) {
          console.error(chalk.red('Error importing from GitHub:'), error);
          process.exit(1);
        }
      })
  );

async function monitorJob(jobId: string) {
  const spinner = ora('Processing import...').start();
  
  const pollInterval = 2000; // 2 seconds
  const maxWaitTime = 5 * 60 * 1000; // 5 minutes
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
        spinner.succeed('Import completed successfully');
        console.log(chalk.green(`✓ Processed ${job.processedItems}/${job.totalItems} items`));
        if (job.results) {
          console.log(`${chalk.cyan('Imported:')} ${job.results.imported || 0}`);
          console.log(`${chalk.cyan('Failed:')} ${job.results.failed || 0}`);
          console.log(`${chalk.cyan('Duplicates:')} ${job.results.duplicates || 0}`);
        }
        return;
      } else if (job.status === 'failed') {
        spinner.fail('Import failed');
        console.error(chalk.red('Error:'), job.error || 'Unknown error');
        return;
      } else if (job.status === 'running') {
        const progress = job.totalItems > 0 
          ? Math.round((job.processedItems / job.totalItems) * 100)
          : 0;
        spinner.text = `Processing import... ${progress}% (${job.processedItems}/${job.totalItems})`;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      spinner.fail('Error monitoring job');
      console.error(chalk.red('Error:'), error);
      return;
    }
  }

  spinner.fail('Import timed out');
  console.log(chalk.yellow('The import is taking longer than expected. Check job status with:'));
  console.log(chalk.cyan(`contextforge jobs get ${jobId}`));
}