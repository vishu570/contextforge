import { table } from 'table';
import chalk from 'chalk';
import yaml from 'yaml';
import { ContextItem, Folder } from '../types';

export class Formatters {
  static formatItems(items: ContextItem[], format: 'json' | 'yaml' | 'table' = 'table'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(items, null, 2);
      
      case 'yaml':
        return yaml.stringify(items, { indent: 2 });
      
      case 'table':
      default:
        if (items.length === 0) {
          return chalk.yellow('No items found');
        }

        const data = [
          [
            chalk.cyan('ID'),
            chalk.cyan('Name'),
            chalk.cyan('Type'),
            chalk.cyan('Folder'),
            chalk.cyan('Tags'),
            chalk.cyan('Updated')
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

        return table(data, {
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

  static formatFolders(folders: Folder[], format: 'json' | 'yaml' | 'table' = 'table'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(folders, null, 2);
      
      case 'yaml':
        return yaml.stringify(folders, { indent: 2 });
      
      case 'table':
      default:
        if (folders.length === 0) {
          return chalk.yellow('No folders found');
        }

        const data = [
          [
            chalk.cyan('Name'),
            chalk.cyan('Path'),
            chalk.cyan('Items'),
            chalk.cyan('Children'),
            chalk.cyan('Created')
          ],
          ...folders.map(folder => [
            '  '.repeat(folder.level) + (folder.icon || '📁') + ' ' + folder.name,
            folder.path,
            folder.itemCount.toString(),
            folder.childCount.toString(),
            new Date(folder.createdAt).toLocaleDateString()
          ])
        ];

        return table(data, {
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

  static formatSingleItem(item: ContextItem, format: 'json' | 'yaml' | 'full' = 'full'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(item, null, 2);
      
      case 'yaml':
        return yaml.stringify(item, { indent: 2 });
      
      case 'full':
      default:
        let output = '';
        output += chalk.blue.bold(`${item.name}\n`);
        output += chalk.gray('─'.repeat(Math.min(item.name.length, 50)) + '\n');
        output += `${chalk.cyan('ID:')} ${item.id}\n`;
        output += `${chalk.cyan('Type:')} ${this.colorizeType(item.type)}\n`;
        
        if (item.description) {
          output += `${chalk.cyan('Description:')} ${item.description}\n`;
        }
        
        if (item.folderPath) {
          output += `${chalk.cyan('Folder:')} ${item.folderPath}\n`;
        }
        
        if (item.tags && item.tags.length > 0) {
          output += `${chalk.cyan('Tags:')} ${item.tags.join(', ')}\n`;
        }
        
        output += `${chalk.cyan('Created:')} ${new Date(item.createdAt).toLocaleString()}\n`;
        output += `${chalk.cyan('Updated:')} ${new Date(item.updatedAt).toLocaleString()}\n`;
        
        if (item.quality) {
          output += `${chalk.cyan('Quality Score:')} ${this.colorizeQuality(item.quality.score)}\n`;
        }
        
        output += '\n' + chalk.cyan('Content:') + '\n';
        output += chalk.gray('─'.repeat(50) + '\n');
        output += item.content + '\n';
        
        if (item.metadata && Object.keys(item.metadata).length > 0) {
          output += '\n' + chalk.cyan('Metadata:') + '\n';
          output += yaml.stringify(item.metadata, { indent: 2 });
        }
        
        return output;
    }
  }

  static colorizeType(type: string): string {
    const colors: Record<string, (text: string) => string> = {
      prompt: chalk.green,
      rule: chalk.blue,
      agent: chalk.magenta,
      collection: chalk.yellow,
    };
    
    return (colors[type] || chalk.white)(type);
  }

  static colorizeQuality(score: number): string {
    if (score >= 0.8) return chalk.green(score.toFixed(2));
    if (score >= 0.6) return chalk.yellow(score.toFixed(2));
    return chalk.red(score.toFixed(2));
  }

  static colorizeStatus(status: string): string {
    const colors: Record<string, (text: string) => string> = {
      pending: chalk.yellow,
      running: chalk.blue,
      completed: chalk.green,
      failed: chalk.red,
    };
    
    return (colors[status] || chalk.white)(status);
  }

  static formatProgress(current: number, total: number): string {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * 20);
    const empty = 20 - filled;
    
    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    return `${bar} ${percentage}% (${current}/${total})`;
  }

  static formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}