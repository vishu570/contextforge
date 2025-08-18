import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../lib/api';
import { ConfigManager } from '../lib/config';

export const healthCommand = new Command('health')
  .description('Check API health and connectivity')
  .option('--verbose', 'show detailed information')
  .action(async (options) => {
    try {
      const config = ConfigManager.getConfig();
      
      console.log(chalk.blue.bold('ContextForge Health Check'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Configuration check
      console.log(`${chalk.cyan('API URL:')} ${config.apiUrl}`);
      console.log(`${chalk.cyan('API Key:')} ${config.apiKey ? '✓ Set' : '✗ Not set'}`);
      
      if (options.verbose) {
        console.log(`${chalk.cyan('Default Format:')} ${config.defaultFormat}`);
        console.log(`${chalk.cyan('Auto Optimize:')} ${config.autoOptimize}`);
        console.log(`${chalk.cyan('Batch Size:')} ${config.batchSize}`);
      }
      
      console.log('');
      
      // API connectivity test
      console.log(chalk.blue('Testing API connectivity...'));
      
      const startTime = Date.now();
      const result = await api.health();
      const responseTime = Date.now() - startTime;
      
      if (result.error) {
        console.log(chalk.red('✗ API connection failed'));
        console.log(chalk.red(`  Error: ${result.error}`));
        console.log('');
        console.log(chalk.yellow('Troubleshooting:'));
        console.log('  1. Check if the API URL is correct');
        console.log('  2. Ensure the ContextForge server is running');
        console.log('  3. Check your network connection');
        console.log('  4. Verify firewall settings');
        process.exit(1);
      } else {
        console.log(chalk.green('✓ API connection successful'));
        console.log(chalk.gray(`  Response time: ${responseTime}ms`));
        
        if (options.verbose && result.data) {
          console.log(chalk.gray(`  Server version: ${result.data.version || 'Unknown'}`));
          console.log(chalk.gray(`  Server status: ${result.data.status || 'OK'}`));
          if (result.data.uptime) {
            console.log(chalk.gray(`  Server uptime: ${Math.round(result.data.uptime / 1000)}s`));
          }
        }
      }
      
      console.log('');
      
      // Authentication test
      if (config.apiKey) {
        console.log(chalk.blue('Testing authentication...'));
        
        try {
          const authTest = await api.getFolders();
          if (authTest.error && authTest.status === 401) {
            console.log(chalk.red('✗ Authentication failed'));
            console.log(chalk.yellow('  Your API key may be invalid or expired'));
          } else if (authTest.error) {
            console.log(chalk.yellow('⚠ Authentication unclear'));
            console.log(chalk.gray(`  API responded with: ${authTest.error}`));
          } else {
            console.log(chalk.green('✓ Authentication successful'));
          }
        } catch (error) {
          console.log(chalk.yellow('⚠ Could not test authentication'));
          if (options.verbose) {
            console.log(chalk.gray(`  Error: ${error}`));
          }
        }
      } else {
        console.log(chalk.yellow('⚠ No API key configured'));
        console.log(chalk.gray('  Some features may not be available'));
      }
      
      console.log('');
      
      // Performance recommendations
      if (responseTime > 2000) {
        console.log(chalk.yellow('Performance Notice:'));
        console.log(`  API response time is ${responseTime}ms (>2s)`);
        console.log('  Consider checking your network connection or server load');
      } else if (responseTime > 1000) {
        console.log(chalk.blue('Performance Info:'));
        console.log(`  API response time is ${responseTime}ms (>1s but acceptable)`);
      }
      
      // Overall status
      const isHealthy = !result.error && (!config.apiKey || authTest?.status !== 401);
      
      console.log(chalk.blue.bold('Overall Status:'), 
        isHealthy ? chalk.green('✓ Healthy') : chalk.red('✗ Issues detected'));
      
      if (!isHealthy) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Health check failed:'), error);
      process.exit(1);
    }
  });