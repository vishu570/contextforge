import { ContextItem, Folder } from '../types';
export declare class Formatters {
    static formatItems(items: ContextItem[], format?: 'json' | 'yaml' | 'table'): string;
    static formatFolders(folders: Folder[], format?: 'json' | 'yaml' | 'table'): string;
    static formatSingleItem(item: ContextItem, format?: 'json' | 'yaml' | 'full'): string;
    static colorizeType(type: string): string;
    static colorizeQuality(score: number): string;
    static colorizeStatus(status: string): string;
    static formatProgress(current: number, total: number): string;
    static formatFileSize(bytes: number): string;
    static formatDuration(milliseconds: number): string;
}
//# sourceMappingURL=formatters.d.ts.map