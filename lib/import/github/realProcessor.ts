import { Octokit } from '@octokit/rest';

export interface GitHubFile {
  name: string;
  path: string;
  content: string;
  size: number;
  type: string;
  downloadUrl: string;
}

export interface GitHubImportOptions {
  url: string;
  branch?: string;
  pathGlob?: string;
  fileExtensions?: string[];
  excludePaths?: string[];
}

export class GitHubProcessor {
  private octokit: Octokit;

  constructor(githubToken?: string) {
    this.octokit = new Octokit({
      auth: githubToken || process.env.GITHUB_TOKEN,
      request: {
        fetch,
      },
    });
  }

  /**
   * Parse GitHub URL to extract owner and repo
   */
  parseGitHubUrl(url: string): { owner: string; repo: string } {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathParts.length < 2) {
        throw new Error('Invalid GitHub repository URL');
      }

      return {
        owner: pathParts[0],
        repo: pathParts[1].replace(/\.git$/, ''),
      };
    } catch (error) {
      throw new Error('Invalid GitHub URL format');
    }
  }

  /**
   * Check if file should be included based on filters
   */
  private shouldIncludeFile(
    path: string,
    options: GitHubImportOptions
  ): boolean {
    // Check excluded paths
    if (options.excludePaths) {
      for (const excludePath of options.excludePaths) {
        if (path.includes(excludePath)) {
          return false;
        }
      }
    }

    // Check file extensions
    if (options.fileExtensions && options.fileExtensions.length > 0) {
      const fileExt = '.' + path.split('.').pop()?.toLowerCase();
      return options.fileExtensions.some(ext => 
        ext.toLowerCase() === fileExt || ext === '*'
      );
    }

    // Default: include common AI/prompt file types
    const commonExtensions = ['.md', '.txt', '.json', '.yaml', '.yml', '.prompt', '.agent', '.af', '.mdc'];
    const fileExt = '.' + path.split('.').pop()?.toLowerCase();
    return commonExtensions.includes(fileExt);
  }

  /**
   * Classify file type based on content and filename
   */
  private classifyFileType(filename: string, content: string): {
    type: 'prompt' | 'agent' | 'rule' | 'template' | 'snippet' | 'other';
    confidence: number;
  } {
    const lowerFilename = filename.toLowerCase();
    const lowerContent = content.toLowerCase();

    // Agent patterns
    if (
      lowerFilename.includes('agent') ||
      lowerFilename.includes('bot') ||
      lowerContent.includes('system:') ||
      lowerContent.includes('role:') ||
      lowerContent.includes('you are a') ||
      lowerContent.includes('as an ai assistant')
    ) {
      return { type: 'agent', confidence: 0.8 };
    }

    // Prompt patterns
    if (
      lowerFilename.includes('prompt') ||
      lowerFilename.includes('instruction') ||
      lowerContent.includes('prompt:') ||
      lowerContent.includes('instruction:') ||
      lowerContent.includes('generate') ||
      lowerContent.includes('create a')
    ) {
      return { type: 'prompt', confidence: 0.8 };
    }

    // Rule patterns
    if (
      lowerFilename.includes('rule') ||
      lowerFilename.includes('guideline') ||
      lowerFilename.includes('policy') ||
      lowerContent.includes('must ') ||
      lowerContent.includes('should ') ||
      lowerContent.includes('never ')
    ) {
      return { type: 'rule', confidence: 0.7 };
    }

    // Template patterns
    if (
      lowerFilename.includes('template') ||
      lowerFilename.includes('scaffold') ||
      lowerContent.includes('{{') ||
      lowerContent.includes('${') ||
      lowerContent.includes('[placeholder]')
    ) {
      return { type: 'template', confidence: 0.8 };
    }

    // Code snippet patterns
    if (
      lowerContent.includes('```') ||
      lowerContent.includes('function ') ||
      lowerContent.includes('class ') ||
      lowerContent.includes('import ') ||
      lowerContent.includes('def ')
    ) {
      return { type: 'snippet', confidence: 0.6 };
    }

    return { type: 'other', confidence: 0.3 };
  }

  /**
   * Fetch repository contents recursively
   */
  async fetchRepositoryContents(
    owner: string,
    repo: string,
    path: string = '',
    branch: string = 'main'
  ): Promise<any[]> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      let contents = Array.isArray(response.data) ? response.data : [response.data];
      let allFiles: any[] = [];

      for (const item of contents) {
        if (item.type === 'file') {
          allFiles.push(item);
        } else if (item.type === 'dir') {
          // Recursively fetch directory contents
          const subContents = await this.fetchRepositoryContents(
            owner,
            repo,
            item.path,
            branch
          );
          allFiles = allFiles.concat(subContents);
        }
      }

      return allFiles;
    } catch (error) {
      console.error(`Error fetching contents for ${path}:`, error);
      throw error;
    }
  }

  /**
   * Download file content
   */
  async downloadFileContent(downloadUrl: string): Promise<string> {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Error downloading file content:', error);
      throw error;
    }
  }

  /**
   * Import files from GitHub repository
   */
  async importRepository(
    options: GitHubImportOptions,
    onProgress?: (progress: {
      total: number;
      processed: number;
      message: string;
      currentFile?: string;
    }) => void
  ): Promise<{
    files: GitHubFile[];
    total: number;
    imported: number;
    failed: number;
    errors: string[];
  }> {
    const { owner, repo } = this.parseGitHubUrl(options.url);
    const branch = options.branch || 'main';
    const errors: string[] = [];
    let imported = 0;
    let failed = 0;

    try {
      // First, check if repository exists and is accessible
      await this.octokit.rest.repos.get({ owner, repo });

      console.log(`Fetching repository contents from ${owner}/${repo} on branch ${branch}...`);
      onProgress?.({
        total: 0,
        processed: 0,
        message: `Scanning repository ${owner}/${repo}...`
      });
      
      // Fetch all repository contents
      const allContents = await this.fetchRepositoryContents(owner, repo, '', branch);
      
      console.log(`Found ${allContents.length} files in repository`);

      // Filter files based on criteria
      const filteredFiles = allContents.filter(file => 
        file.type === 'file' && this.shouldIncludeFile(file.path, options)
      );

      console.log(`Filtered to ${filteredFiles.length} relevant files`);

      onProgress?.({
        total: filteredFiles.length,
        processed: 0,
        message: `Found ${filteredFiles.length} files to import`
      });

      const files: GitHubFile[] = [];

      // Process each file
      for (let i = 0; i < filteredFiles.length; i++) {
        const file = filteredFiles[i];
        try {
          console.log(`Processing file: ${file.path}`);
          
          // Update progress BEFORE processing each file
          onProgress?.({
            total: filteredFiles.length,
            processed: i,
            message: `Processing ${file.name} (${i + 1}/${filteredFiles.length})`,
            currentFile: file.name
          });
          
          // Download file content
          let content = '';
          if (file.download_url) {
            onProgress?.({
              total: filteredFiles.length,
              processed: i,
              message: `Downloading ${file.name}...`,
              currentFile: file.name
            });
            content = await this.downloadFileContent(file.download_url);
          }

          // Update progress after download
          onProgress?.({
            total: filteredFiles.length,
            processed: i,
            message: `Classifying ${file.name}...`,
            currentFile: file.name
          });

          // Classify file type
          const classification = this.classifyFileType(file.name, content);

          files.push({
            name: file.name,
            path: file.path,
            content,
            size: file.size,
            type: classification.type,
            downloadUrl: file.download_url || '',
          });

          imported++;
          
          // Update progress AFTER processing each file
          onProgress?.({
            total: filteredFiles.length,
            processed: i + 1,
            message: `Completed ${file.name} (${i + 1}/${filteredFiles.length})`,
            currentFile: file.name
          });
        } catch (error) {
          failed++;
          const errorMsg = `Failed to process ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
          
          // Update progress even on failure
          onProgress?.({
            total: filteredFiles.length,
            processed: i + 1,
            message: `Failed ${file.name} (${i + 1}/${filteredFiles.length})`,
            currentFile: file.name
          });
        }
      }

      // Final progress update
      onProgress?.({
        total: filteredFiles.length,
        processed: filteredFiles.length,
        message: `Completed processing ${imported} files`
      });

      return {
        files,
        total: filteredFiles.length,
        imported,
        failed,
        errors,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Handle specific GitHub API errors
      if (error && typeof error === 'object' && 'status' in error) {
        switch (error.status) {
          case 404:
            throw new Error('Repository not found or not accessible');
          case 403:
            throw new Error('Access forbidden. Repository may be private or rate limited.');
          case 401:
            throw new Error('Authentication required. Please check your GitHub token.');
          default:
            throw new Error(`GitHub API error (${error.status}): ${errorMsg}`);
        }
      }

      throw new Error(`Failed to import repository: ${errorMsg}`);
    }
  }
}