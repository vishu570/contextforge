import Configstore from 'configstore';
import { ContextForgeConfig } from '../types';
import chalk from 'chalk';

const pkg = require('../../package.json');
const conf = new Configstore(pkg.name);

const DEFAULT_CONFIG: ContextForgeConfig = {
  apiUrl: 'http://localhost:3000/api',
  defaultFormat: 'table',
  autoOptimize: false,
  batchSize: 50,
};

export class ConfigManager {
  static get(key?: keyof ContextForgeConfig): any {
    if (key) {
      return conf.get(key) ?? DEFAULT_CONFIG[key];
    }
    return { ...DEFAULT_CONFIG, ...conf.all };
  }

  static set(key: keyof ContextForgeConfig, value: any): void {
    conf.set(key, value);
  }

  static delete(key: keyof ContextForgeConfig): void {
    conf.delete(key);
  }

  static clear(): void {
    conf.clear();
  }

  static getConfig(): ContextForgeConfig {
    return this.get() as ContextForgeConfig;
  }

  static setConfig(config: Partial<ContextForgeConfig>): void {
    Object.entries(config).forEach(([key, value]) => {
      if (value !== undefined) {
        this.set(key as keyof ContextForgeConfig, value);
      }
    });
  }

  static validateConfig(): boolean {
    const config = this.getConfig();
    
    if (!config.apiUrl) {
      console.error(chalk.red('Error: API URL is not configured. Run "contextforge config set apiUrl <url>"'));
      return false;
    }

    if (!config.apiKey) {
      console.warn(chalk.yellow('Warning: API key is not configured. Some operations may require authentication.'));
    }

    return true;
  }

  static displayConfig(): void {
    const config = this.getConfig();
    console.log(chalk.blue('Current Configuration:'));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    Object.entries(config).forEach(([key, value]) => {
      if (key === 'apiKey' && value) {
        console.log(`${chalk.cyan(key)}: ${chalk.gray('***hidden***')}`);
      } else {
        console.log(`${chalk.cyan(key)}: ${chalk.white(value)}`);
      }
    });
  }

  static resetToDefaults(): void {
    this.clear();
    console.log(chalk.green('Configuration reset to defaults'));
  }
}

export function ensureConfig(): ContextForgeConfig {
  const config = ConfigManager.getConfig();
  
  if (!ConfigManager.validateConfig()) {
    process.exit(1);
  }
  
  return config;
}