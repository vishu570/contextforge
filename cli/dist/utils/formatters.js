"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Formatters = void 0;
const table_1 = require("table");
const chalk_1 = __importDefault(require("chalk"));
const yaml_1 = __importDefault(require("yaml"));
class Formatters {
    static formatItems(items, format = 'table') {
        switch (format) {
            case 'json':
                return JSON.stringify(items, null, 2);
            case 'yaml':
                return yaml_1.default.stringify(items, { indent: 2 });
            case 'table':
            default:
                if (items.length === 0) {
                    return chalk_1.default.yellow('No items found');
                }
                const data = [
                    [
                        chalk_1.default.cyan('ID'),
                        chalk_1.default.cyan('Name'),
                        chalk_1.default.cyan('Type'),
                        chalk_1.default.cyan('Folder'),
                        chalk_1.default.cyan('Tags'),
                        chalk_1.default.cyan('Updated')
                    ],
                    ...items.map(item => [
                        item.id.substring(0, 8) + '...',
                        item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name,
                        this.colorizeType(item.type),
                        item.folderPath || '-',
                        item.tags?.join(', ') || '-',
                        new Date(item.updatedAt).toLocaleDateString()
                    ])
                ];
                return (0, table_1.table)(data, {
                    border: {
                        topBody: '─',
                        topJoin: '┬',
                        topLeft: '┌',
                        topRight: '┐',
                        bottomBody: '─',
                        bottomJoin: '┴',
                        bottomLeft: '└',
                        bottomRight: '┘',
                        bodyLeft: '│',
                        bodyRight: '│',
                        bodyJoin: '│',
                        joinBody: '─',
                        joinLeft: '├',
                        joinRight: '┤',
                        joinJoin: '┼'
                    }
                });
        }
    }
    static formatFolders(folders, format = 'table') {
        switch (format) {
            case 'json':
                return JSON.stringify(folders, null, 2);
            case 'yaml':
                return yaml_1.default.stringify(folders, { indent: 2 });
            case 'table':
            default:
                if (folders.length === 0) {
                    return chalk_1.default.yellow('No folders found');
                }
                const data = [
                    [
                        chalk_1.default.cyan('Name'),
                        chalk_1.default.cyan('Path'),
                        chalk_1.default.cyan('Items'),
                        chalk_1.default.cyan('Children'),
                        chalk_1.default.cyan('Created')
                    ],
                    ...folders.map(folder => [
                        '  '.repeat(folder.level) + (folder.icon || '📁') + ' ' + folder.name,
                        folder.path,
                        folder.itemCount.toString(),
                        folder.childCount.toString(),
                        new Date(folder.createdAt).toLocaleDateString()
                    ])
                ];
                return (0, table_1.table)(data, {
                    border: {
                        topBody: '─',
                        topJoin: '┬',
                        topLeft: '┌',
                        topRight: '┐',
                        bottomBody: '─',
                        bottomJoin: '┴',
                        bottomLeft: '└',
                        bottomRight: '┘',
                        bodyLeft: '│',
                        bodyRight: '│',
                        bodyJoin: '│',
                        joinBody: '─',
                        joinLeft: '├',
                        joinRight: '┤',
                        joinJoin: '┼'
                    }
                });
        }
    }
    static formatSingleItem(item, format = 'full') {
        switch (format) {
            case 'json':
                return JSON.stringify(item, null, 2);
            case 'yaml':
                return yaml_1.default.stringify(item, { indent: 2 });
            case 'full':
            default:
                let output = '';
                output += chalk_1.default.blue.bold(`${item.name}\n`);
                output += chalk_1.default.gray('─'.repeat(Math.min(item.name.length, 50)) + '\n');
                output += `${chalk_1.default.cyan('ID:')} ${item.id}\n`;
                output += `${chalk_1.default.cyan('Type:')} ${this.colorizeType(item.type)}\n`;
                if (item.description) {
                    output += `${chalk_1.default.cyan('Description:')} ${item.description}\n`;
                }
                if (item.folderPath) {
                    output += `${chalk_1.default.cyan('Folder:')} ${item.folderPath}\n`;
                }
                if (item.tags && item.tags.length > 0) {
                    output += `${chalk_1.default.cyan('Tags:')} ${item.tags.join(', ')}\n`;
                }
                output += `${chalk_1.default.cyan('Created:')} ${new Date(item.createdAt).toLocaleString()}\n`;
                output += `${chalk_1.default.cyan('Updated:')} ${new Date(item.updatedAt).toLocaleString()}\n`;
                if (item.quality) {
                    output += `${chalk_1.default.cyan('Quality Score:')} ${this.colorizeQuality(item.quality.score)}\n`;
                }
                output += '\n' + chalk_1.default.cyan('Content:') + '\n';
                output += chalk_1.default.gray('─'.repeat(50) + '\n');
                output += item.content + '\n';
                if (item.metadata && Object.keys(item.metadata).length > 0) {
                    output += '\n' + chalk_1.default.cyan('Metadata:') + '\n';
                    output += yaml_1.default.stringify(item.metadata, { indent: 2 });
                }
                return output;
        }
    }
    static colorizeType(type) {
        const colors = {
            prompt: chalk_1.default.green,
            rule: chalk_1.default.blue,
            agent: chalk_1.default.magenta,
            collection: chalk_1.default.yellow,
        };
        return (colors[type] || chalk_1.default.white)(type);
    }
    static colorizeQuality(score) {
        if (score >= 0.8)
            return chalk_1.default.green(score.toFixed(2));
        if (score >= 0.6)
            return chalk_1.default.yellow(score.toFixed(2));
        return chalk_1.default.red(score.toFixed(2));
    }
    static colorizeStatus(status) {
        const colors = {
            pending: chalk_1.default.yellow,
            running: chalk_1.default.blue,
            completed: chalk_1.default.green,
            failed: chalk_1.default.red,
        };
        return (colors[status] || chalk_1.default.white)(status);
    }
    static formatProgress(current, total) {
        const percentage = Math.round((current / total) * 100);
        const filled = Math.round((current / total) * 20);
        const empty = 20 - filled;
        const bar = chalk_1.default.green('█'.repeat(filled)) + chalk_1.default.gray('░'.repeat(empty));
        return `${bar} ${percentage}% (${current}/${total})`;
    }
    static formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0)
            return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    static formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        }
        else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        else {
            return `${seconds}s`;
        }
    }
}
exports.Formatters = Formatters;
//# sourceMappingURL=formatters.js.map