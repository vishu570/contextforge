"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const api_1 = require("../lib/api");
const config_1 = require("../lib/config");
const formatters_1 = require("../utils/formatters");
exports.searchCommand = new commander_1.Command('search')
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
        const config = config_1.ConfigManager.getConfig();
        const format = options.format || config.defaultFormat;
        console.log(chalk_1.default.blue(`Searching for: "${query}"`));
        const searchOptions = {
            query,
            types: options.type ? options.type.split(',').map((t) => t.trim()) : undefined,
            folderId: options.folder,
            tags: options.tags ? options.tags.split(',').map((t) => t.trim()) : undefined,
            limit: parseInt(options.limit),
            threshold: parseFloat(options.threshold),
        };
        const result = await api_1.api.searchSemantic(query, searchOptions);
        if (result.error) {
            console.error(chalk_1.default.red('Error:'), result.error);
            process.exit(1);
        }
        const items = result.data || [];
        if (items.length === 0) {
            console.log(chalk_1.default.yellow('No items found matching your query'));
            console.log(chalk_1.default.gray('Try:'));
            console.log(chalk_1.default.gray('  - Using different keywords'));
            console.log(chalk_1.default.gray('  - Reducing the similarity threshold with --threshold'));
            console.log(chalk_1.default.gray('  - Expanding the search with broader terms'));
            return;
        }
        if (options.detailed) {
            items.forEach((item, index) => {
                console.log(chalk_1.default.blue.bold(`\n${index + 1}. ${item.name}`));
                console.log(chalk_1.default.gray('─'.repeat(50)));
                console.log(`${chalk_1.default.cyan('Type:')} ${formatters_1.Formatters.colorizeType(item.type)}`);
                console.log(`${chalk_1.default.cyan('Folder:')} ${item.folderPath || 'Root'}`);
                if (item.similarity) {
                    console.log(`${chalk_1.default.cyan('Similarity:')} ${chalk_1.default.green((item.similarity * 100).toFixed(1))}%`);
                }
                if (item.tags && item.tags.length > 0) {
                    console.log(`${chalk_1.default.cyan('Tags:')} ${item.tags.join(', ')}`);
                }
                const preview = item.content.length > 200
                    ? item.content.substring(0, 200) + '...'
                    : item.content;
                console.log(`${chalk_1.default.cyan('Preview:')}\n${chalk_1.default.gray(preview)}`);
            });
            console.log(chalk_1.default.blue(`\nFound ${items.length} items`));
        }
        else {
            console.log(formatters_1.Formatters.formatItems(items, format));
            if (items.length >= parseInt(options.limit)) {
                console.log(chalk_1.default.yellow(`\nShowing first ${options.limit} results. Use --limit to see more.`));
            }
        }
        if (items.length < 3) {
            console.log(chalk_1.default.gray('\nSearch tips:'));
            console.log(chalk_1.default.gray('  - Try broader terms or synonyms'));
            console.log(chalk_1.default.gray('  - Use --threshold 0.3 for more lenient matching'));
            console.log(chalk_1.default.gray('  - Search within specific folders with --folder'));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error searching:'), error);
        process.exit(1);
    }
});
//# sourceMappingURL=search.js.map