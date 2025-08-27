import { ContextForgeConfig } from '../types';
export declare class ConfigManager {
    static get(key?: keyof ContextForgeConfig): any;
    static set(key: keyof ContextForgeConfig, value: any): void;
    static delete(key: keyof ContextForgeConfig): void;
    static clear(): void;
    static getConfig(): ContextForgeConfig;
    static setConfig(config: Partial<ContextForgeConfig>): void;
    static validateConfig(): boolean;
    static displayConfig(): void;
    static resetToDefaults(): void;
}
export declare function ensureConfig(): ContextForgeConfig;
//# sourceMappingURL=config.d.ts.map