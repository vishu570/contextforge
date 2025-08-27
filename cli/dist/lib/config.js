"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
exports.ensureConfig = ensureConfig;
const configstore_1 = __importDefault(require("configstore"));
const chalk_1 = __importDefault(require("chalk"));
const pkg = require('../../package.json');
const conf = new configstore_1.default(pkg.name);
const DEFAULT_CONFIG = {
    apiUrl: 'http://localhost:3000/api',
    defaultFormat: 'table',
    autoOptimize: false,
    batchSize: 50,
};
class ConfigManager {
    static get(key) {
        if (key) {
            return conf.get(key) ?? DEFAULT_CONFIG[key];
        }
        return { ...DEFAULT_CONFIG, ...conf.all };
    }
    static set(key, value) {
        conf.set(key, value);
    }
    static delete(key) {
        conf.delete(key);
    }
    static clear() {
        conf.clear();
    }
    static getConfig() {
        return this.get();
    }
    static setConfig(config) {
        Object.entries(config).forEach(([key, value]) => {
            if (value !== undefined) {
                this.set(key, value);
            }
        });
    }
    static validateConfig() {
        const config = this.getConfig();
        if (!config.apiUrl) {
            console.error(chalk_1.default.red('Error: API URL is not configured. Run "contextforge config set apiUrl <url>"'));
            return false;
        }
        if (!config.apiKey) {
            console.warn(chalk_1.default.yellow('Warning: API key is not configured. Some operations may require authentication.'));
        }
        return true;
    }
    static displayConfig() {
        const config = this.getConfig();
        console.log(chalk_1.default.blue('Current Configuration:'));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        Object.entries(config).forEach(([key, value]) => {
            if (key === 'apiKey' && value) {
                console.log(`${chalk_1.default.cyan(key)}: ${chalk_1.default.gray('***hidden***')}`);
            }
            else {
                console.log(`${chalk_1.default.cyan(key)}: ${chalk_1.default.white(value)}`);
            }
        });
    }
    static resetToDefaults() {
        this.clear();
        console.log(chalk_1.default.green('Configuration reset to defaults'));
    }
}
exports.ConfigManager = ConfigManager;
function ensureConfig() {
    const config = ConfigManager.getConfig();
    if (!ConfigManager.validateConfig()) {
        process.exit(1);
    }
    return config;
}
//# sourceMappingURL=config.js.map