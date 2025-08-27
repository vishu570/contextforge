"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const api_1 = require("../lib/api");
const config_1 = require("../lib/config");
exports.healthCommand = new commander_1.Command('health')
    .description('Check API health and connectivity')
    .option('--verbose', 'show detailed information')
    .action(async (options) => {
    try {
        const config = config_1.ConfigManager.getConfig();
        console.log(chalk_1.default.blue.bold('ContextForge Health Check'));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`${chalk_1.default.cyan('API URL:')} ${config.apiUrl}`);
        console.log(`${chalk_1.default.cyan('API Key:')} ${config.apiKey ? '✓ Set' : '✗ Not set'}`);
        if (options.verbose) {
            console.log(`${chalk_1.default.cyan('Default Format:')} ${config.defaultFormat}`);
            console.log(`${chalk_1.default.cyan('Auto Optimize:')} ${config.autoOptimize}`);
            console.log(`${chalk_1.default.cyan('Batch Size:')} ${config.batchSize}`);
        }
        console.log('');
        console.log(chalk_1.default.blue('Testing API connectivity...'));
        const startTime = Date.now();
        const result = await api_1.api.health();
        const responseTime = Date.now() - startTime;
        if (result.error) {
            console.log(chalk_1.default.red('✗ API connection failed'));
            console.log(chalk_1.default.red(`  Error: ${result.error}`));
            console.log('');
            console.log(chalk_1.default.yellow('Troubleshooting:'));
            console.log('  1. Check if the API URL is correct');
            console.log('  2. Ensure the ContextForge server is running');
            console.log('  3. Check your network connection');
            console.log('  4. Verify firewall settings');
            process.exit(1);
        }
        else {
            console.log(chalk_1.default.green('✓ API connection successful'));
            console.log(chalk_1.default.gray(`  Response time: ${responseTime}ms`));
            if (options.verbose && result.data) {
                console.log(chalk_1.default.gray(`  Server version: ${result.data.version || 'Unknown'}`));
                console.log(chalk_1.default.gray(`  Server status: ${result.data.status || 'OK'}`));
                if (result.data.uptime) {
                    console.log(chalk_1.default.gray(`  Server uptime: ${Math.round(result.data.uptime / 1000)}s`));
                }
            }
        }
        console.log('');
        if (config.apiKey) {
            console.log(chalk_1.default.blue('Testing authentication...'));
            try {
                const authTest = await api_1.api.getFolders();
                if (authTest.error && authTest.status === 401) {
                    console.log(chalk_1.default.red('✗ Authentication failed'));
                    console.log(chalk_1.default.yellow('  Your API key may be invalid or expired'));
                }
                else if (authTest.error) {
                    console.log(chalk_1.default.yellow('⚠ Authentication unclear'));
                    console.log(chalk_1.default.gray(`  API responded with: ${authTest.error}`));
                }
                else {
                    console.log(chalk_1.default.green('✓ Authentication successful'));
                }
            }
            catch (error) {
                console.log(chalk_1.default.yellow('⚠ Could not test authentication'));
                if (options.verbose) {
                    console.log(chalk_1.default.gray(`  Error: ${error}`));
                }
            }
        }
        else {
            console.log(chalk_1.default.yellow('⚠ No API key configured'));
            console.log(chalk_1.default.gray('  Some features may not be available'));
        }
        console.log('');
        if (responseTime > 2000) {
            console.log(chalk_1.default.yellow('Performance Notice:'));
            console.log(`  API response time is ${responseTime}ms (>2s)`);
            console.log('  Consider checking your network connection or server load');
        }
        else if (responseTime > 1000) {
            console.log(chalk_1.default.blue('Performance Info:'));
            console.log(`  API response time is ${responseTime}ms (>1s but acceptable)`);
        }
        const isHealthy = !result.error && (!config.apiKey || authTest?.status !== 401);
        console.log(chalk_1.default.blue.bold('Overall Status:'), isHealthy ? chalk_1.default.green('✓ Healthy') : chalk_1.default.red('✗ Issues detected'));
        if (!isHealthy) {
            process.exit(1);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Health check failed:'), error);
        process.exit(1);
    }
});
//# sourceMappingURL=health.js.map