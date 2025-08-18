import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../lib/api';
import { ConfigManager } from '../lib/config';
import { Formatters } from '../utils/formatters';

export const searchCommand = new Command('search')
  .description('Search context items using semantic search')
  .argument('<query>', 'search query')
  .option('-t, --type <types>', 'filter by types (comma-separated)')
  .option('-f, --folder <folder>', 'search within specific folder')
  .option('--tags <tags>', 'filter by tags (comma-separated)')
  .option('-l, --limit <limit>', 'limit number of results', '10')
  .option('--threshold <threshold>', 'similarity threshold (0-1)', '0.5')
  .option('--format <format>', 'output format (table|json|yaml)')
  .option('--detailed', 'show detailed results with content preview')
  .action(async (query, options) => {
    try {
      const config = ConfigManager.getConfig();
      const format = options.format || config.defaultFormat;

      console.log(chalk.blue(`Searching for: "${query}"`));
      
      const searchOptions = {
        query,
        types: options.type ? options.type.split(',').map((t: string) => t.trim()) : undefined,
        folderId: options.folder,
        tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined,
        limit: parseInt(options.limit),
        threshold: parseFloat(options.threshold),
      };

      const result = await api.searchSemantic(query, searchOptions);
      
      if (result.error) {
        console.error(chalk.red('Error:'), result.error);
        process.exit(1);
      }

      const items = result.data || [];
      
      if (items.length === 0) {
        console.log(chalk.yellow('No items found matching your query'));
        console.log(chalk.gray('Try:'));
        console.log(chalk.gray('  - Using different keywords'));
        console.log(chalk.gray('  - Reducing the similarity threshold with --threshold'));
        console.log(chalk.gray('  - Expanding the search with broader terms'));
        return;
      }

      if (options.detailed) {
        // Show detailed results with content preview
        items.forEach((item: any, index: number) => {
          console.log(chalk.blue.bold(`\n${index + 1}. ${item.name}`));
          console.log(chalk.gray('─'.repeat(50)));
          console.log(`${chalk.cyan('Type:')} ${Formatters.colorizeType(item.type)}`);
          console.log(`${chalk.cyan('Folder:')} ${item.folderPath || 'Root'}`);
          if (item.similarity) {
            console.log(`${chalk.cyan('Similarity:')} ${chalk.green((item.similarity * 100).toFixed(1))}%`);
          }
          if (item.tags && item.tags.length > 0) {
            console.log(`${chalk.cyan('Tags:')} ${item.tags.join(', ')}`);
          }
          
          // Content preview
          const preview = item.content.length > 200 
            ? item.content.substring(0, 200) + '...'
            : item.content;
          console.log(`${chalk.cyan('Preview:')}\n${chalk.gray(preview)}`);
        });
        
        console.log(chalk.blue(`\nFound ${items.length} items`));
      } else {
        // Standard table format
        console.log(Formatters.formatItems(items, format));
        
        if (items.length >= parseInt(options.limit)) {
          console.log(chalk.yellow(`\nShowing first ${options.limit} results. Use --limit to see more.`));
        }
      }

      // Search suggestions
      if (items.length < 3) {
        console.log(chalk.gray('\nSearch tips:'));
        console.log(chalk.gray('  - Try broader terms or synonyms'));
        console.log(chalk.gray('  - Use --threshold 0.3 for more lenient matching'));
        console.log(chalk.gray('  - Search within specific folders with --folder'));
      }
    } catch (error) {
      console.error(chalk.red('Error searching:'), error);
      process.exit(1);
    }
  });