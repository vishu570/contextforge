import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { api } from '../lib/api';
import { ConfigManager } from '../lib/config';
import { ContextItem, SearchOptions } from '../types';

export const exportCommand = new Command('export')
  .description('Export context items to various formats')
  .argument('<destination>', 'export destination path')
  .option('-f, --format <format>', 'export format (json|yaml|markdown|files)', 'json')
  .option('-t, --type <types>', 'filter by types (comma-separated)')
  .option('--folder <folder>', 'export from specific folder')
  .option('--tags <tags>', 'filter by tags (comma-separated)')
  .option('--include-metadata', 'include metadata in export')
  .option('--flat', 'flat structure (no folders)')
  .option('--template', 'create export template')
  .option('--compress', 'create compressed archive')
  .action(async (destination, options) => {
    try {
      const config = ConfigManager.getConfig();
      const spinner = ora('Fetching items to export...').start();

      // Build search options
      const searchOptions: SearchOptions = {
        type: options.type ? options.type.split(',').map((t: string) => t.trim()) : undefined,
        folderId: options.folder,
        tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined,
        limit: 1000, // Large limit for export
      };

      const result = await api.getItems(searchOptions);

      if (result.error) {
        spinner.fail('Failed to fetch items');
        console.error(chalk.red('Error:'), result.error);
        process.exit(1);
      }

      const items = result.data || [];
      
      if (items.length === 0) {
        spinner.fail('No items found to export');
        console.log(chalk.yellow('No items match the specified criteria'));
        return;
      }

      spinner.text = `Exporting ${items.length} items...`;

      // Ensure destination directory exists
      await fs.ensureDir(path.dirname(destination));

      switch (options.format) {
        case 'json':
          await exportJson(items, destination, options);
          break;
        case 'yaml':
          await exportYaml(items, destination, options);
          break;
        case 'markdown':
          await exportMarkdown(items, destination, options);
          break;
        case 'files':
          await exportFiles(items, destination, options);
          break;
        default:
          spinner.fail('Invalid format');
          console.error(chalk.red(`Unsupported format: ${options.format}`));
          process.exit(1);
      }

      spinner.succeed(`Exported ${items.length} items to ${destination}`);

      // Show export summary
      console.log(chalk.blue('\nExport Summary:'));
      console.log(`${chalk.cyan('Items exported:')} ${items.length}`);
      console.log(`${chalk.cyan('Format:')} ${options.format}`);
      console.log(`${chalk.cyan('Destination:')} ${destination}`);
      
      const stats = await fs.stat(destination);
      if (stats.isFile()) {
        console.log(`${chalk.cyan('File size:')} ${formatFileSize(stats.size)}`);
      } else if (stats.isDirectory()) {
        // Count files in directory
        const files = await getAllFiles(destination);
        console.log(`${chalk.cyan('Files created:')} ${files.length}`);
      }
    } catch (error) {
      console.error(chalk.red('Error exporting:'), error);
      process.exit(1);
    }
  });

async function exportJson(items: ContextItem[], destination: string, options: any) {
  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      itemCount: items.length,
      includeMetadata: options.includeMetadata,
    },
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      description: item.description,
      content: item.content,
      tags: item.tags,
      folderId: item.folderId,
      folderPath: item.folderPath,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      ...(options.includeMetadata && { metadata: item.metadata }),
    })),
  };

  await fs.writeFile(destination, JSON.stringify(exportData, null, 2));
}

async function exportYaml(items: ContextItem[], destination: string, options: any) {
  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      itemCount: items.length,
      includeMetadata: options.includeMetadata,
    },
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      description: item.description,
      content: item.content,
      tags: item.tags,
      folderId: item.folderId,
      folderPath: item.folderPath,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      ...(options.includeMetadata && { metadata: item.metadata }),
    })),
  };

  await fs.writeFile(destination, yaml.stringify(exportData, { indent: 2 }));
}

async function exportMarkdown(items: ContextItem[], destination: string, options: any) {
  let markdown = '# ContextForge Export\n\n';
  markdown += `Generated on: ${new Date().toLocaleString()}\n`;
  markdown += `Items: ${items.length}\n\n`;

  // Group by type
  const itemsByType = items.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, ContextItem[]>);

  Object.entries(itemsByType).forEach(([type, typeItems]) => {
    markdown += `## ${type.charAt(0).toUpperCase() + type.slice(1)}s\n\n`;
    
    typeItems.forEach((item, index) => {
      markdown += `### ${index + 1}. ${item.name}\n\n`;
      
      if (item.description) {
        markdown += `**Description:** ${item.description}\n\n`;
      }
      
      if (item.tags && item.tags.length > 0) {
        markdown += `**Tags:** ${item.tags.join(', ')}\n\n`;
      }
      
      if (item.folderPath) {
        markdown += `**Folder:** ${item.folderPath}\n\n`;
      }
      
      markdown += '**Content:**\n\n';
      markdown += '```\n';
      markdown += item.content;
      markdown += '\n```\n\n';
      
      if (options.includeMetadata && item.metadata) {
        markdown += '**Metadata:**\n\n';
        markdown += '```json\n';
        markdown += JSON.stringify(item.metadata, null, 2);
        markdown += '\n```\n\n';
      }
      
      markdown += '---\n\n';
    });
  });

  await fs.writeFile(destination, markdown);
}

async function exportFiles(items: ContextItem[], destination: string, options: any) {
  await fs.ensureDir(destination);

  // Create folder structure if not flat
  if (!options.flat) {
    const folders = new Set(items.map(item => item.folderPath).filter(Boolean));
    for (const folderPath of folders) {
      await fs.ensureDir(path.join(destination, folderPath!));
    }
  }

  // Export each item as a separate file
  for (const item of items) {
    const sanitizedName = item.name.replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '-');
    const fileName = `${sanitizedName}.md`;
    
    let filePath;
    if (options.flat || !item.folderPath) {
      filePath = path.join(destination, fileName);
    } else {
      filePath = path.join(destination, item.folderPath, fileName);
    }

    let content = `# ${item.name}\n\n`;
    
    if (item.description) {
      content += `${item.description}\n\n`;
    }
    
    content += `**Type:** ${item.type}\n`;
    
    if (item.tags && item.tags.length > 0) {
      content += `**Tags:** ${item.tags.join(', ')}\n`;
    }
    
    content += `**Created:** ${new Date(item.createdAt).toLocaleString()}\n`;
    content += `**Updated:** ${new Date(item.updatedAt).toLocaleString()}\n\n`;
    content += '---\n\n';
    content += item.content;
    
    if (options.includeMetadata && item.metadata) {
      content += '\n\n## Metadata\n\n';
      content += '```json\n';
      content += JSON.stringify(item.metadata, null, 2);
      content += '\n```\n';
    }

    await fs.writeFile(filePath, content);
  }

  // Create an index file
  let indexContent = '# ContextForge Export Index\n\n';
  indexContent += `Export Date: ${new Date().toLocaleString()}\n`;
  indexContent += `Total Items: ${items.length}\n\n`;

  const itemsByType = items.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, ContextItem[]>);

  Object.entries(itemsByType).forEach(([type, typeItems]) => {
    indexContent += `## ${type.charAt(0).toUpperCase() + type.slice(1)}s (${typeItems.length})\n\n`;
    
    typeItems.forEach(item => {
      const sanitizedName = item.name.replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '-');
      const fileName = `${sanitizedName}.md`;
      
      let relativePath;
      if (options.flat || !item.folderPath) {
        relativePath = fileName;
      } else {
        relativePath = path.join(item.folderPath, fileName);
      }
      
      indexContent += `- [${item.name}](${relativePath})\n`;
    });
    
    indexContent += '\n';
  });

  await fs.writeFile(path.join(destination, 'INDEX.md'), indexContent);
}

function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...await getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
}