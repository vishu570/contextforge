'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, CheckCircle, FileText, Github, Link2, Loader2, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ImportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('files');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // File Upload State
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // GitHub Import State
  const [githubUrl, setGithubUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [pathGlob, setPathGlob] = useState('**/*.md,**/*.json,**/*.yaml,**/*.yml,**/*.xml,**/*.prompt,**/*.agent,**/*.af,**/*.mdc');

  // URL Import State
  const [webUrl, setWebUrl] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileImport = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to import');
      return;
    }

    setIsImporting(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/import/files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const responseData = await response.json();
      setSuccess(`Successfully imported ${responseData.imported} items from ${files.length} files`);
      setFiles([]);

      setTimeout(() => {
        router.push(`/dashboard/import/review?importId=${responseData.importId}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Progress state
  const [importProgress, setImportProgress] = useState({
    progress: 0,
    message: '',
    totalFiles: 0,
    processedFiles: 0,
    currentFile: ''
  });

  const handleGitHubImport = async () => {
    if (!githubUrl) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    setIsImporting(true);
    setError('');
    setSuccess('');
    setImportProgress({ progress: 0, message: 'Starting import...', totalFiles: 0, processedFiles: 0, currentFile: '' });

    try {
      const response = await fetch('/api/import/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: githubUrl,
          branch,
          filters: {
            fileExtensions: pathGlob ? pathGlob.split(',').map(p => p.trim().replace('**/*', '').replace('*', '')).filter(ext => ext.startsWith('.')) : undefined
          },
          pathGlob, // Keep for backward compatibility
        }),
      });

      if (!response.ok) {
        const errorResponseData = await response.json();
        throw new Error(errorResponseData.error || errorResponseData.message || 'GitHub import failed');
      }

      const responseData = await response.json();

      // Start listening to progress events
      if (responseData.importId) {
        console.log(`Starting EventSource for importId: ${responseData.importId}`);

        // Wait a short moment to ensure the backend has started processing
        setTimeout(() => {
          const eventSource = new EventSource(`/api/import/github/progress?importId=${responseData.importId}`);
          let retryCount = 0;
          const maxRetries = 3;

          eventSource.onopen = () => {
            console.log('EventSource connection opened');
            retryCount = 0; // Reset retry count on successful connection
          };

          eventSource.onmessage = (event) => {
            console.log('Received progress event:', event.data);

            // Skip heartbeat messages
            if (event.data.trim() === '') return;

            try {
              const progress = JSON.parse(event.data);
              setImportProgress(progress);

              if (progress.status === 'completed') {
                console.log('Import completed, closing EventSource');
                eventSource.close();
                setIsImporting(false);

                // Show success message
                let successMessage = `Successfully imported ${progress.processedFiles} items`;
                if (progress.totalFiles > 0) {
                  successMessage += ` from ${progress.totalFiles} files found`;
                }
                setSuccess(successMessage);
                setGithubUrl('');

                setTimeout(() => {
                  router.push(`/dashboard/import/review?importId=${responseData.importId}`);
                }, 2000);
              } else if (progress.status === 'failed') {
                console.log('Import failed, closing EventSource');
                eventSource.close();
                setIsImporting(false);
                setError(progress.message || 'Import failed');
              }
            } catch (parseError) {
              console.error('Error parsing progress data:', parseError, 'Raw data:', event.data);
            }
          };

          eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            retryCount++;

            if (retryCount >= maxRetries) {
              eventSource.close();
              setIsImporting(false);
              setError('Connection to import progress lost after multiple retries');
            } else {
              console.log(`EventSource error, retry ${retryCount}/${maxRetries}`);
              // EventSource will automatically retry
            }
          };

          // Safety timeout to prevent infinite imports
          setTimeout(() => {
            if (eventSource.readyState !== EventSource.CLOSED) {
              console.warn('Import taking too long, closing EventSource');
              eventSource.close();
              setIsImporting(false);
              setError('Import timed out - please check the import history for results');
            }
          }, 5 * 60 * 1000); // 5 minute timeout
        }, 100); // Wait 100ms before starting EventSource
      } else {
        // Fallback if no progress tracking
        setIsImporting(false);
        setSuccess(`Import completed`);
        setGithubUrl('');

        setTimeout(() => {
          router.push(`/dashboard/import/review?importId=${responseData.importId}`);
        }, 2000);
      }
    } catch (err) {
      setIsImporting(false);
      setError(err instanceof Error ? err.message : 'GitHub import failed');
    }
  };

  const handleUrlImport = async () => {
    if (!webUrl) {
      setError('Please enter a URL to import from');
      return;
    }

    setIsImporting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/import/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: webUrl }),
      });

      if (!response.ok) {
        throw new Error('URL import failed');
      }

      const responseData = await response.json();
      setSuccess(`Successfully imported content from URL`);
      setWebUrl('');

      setTimeout(() => {
        router.push(`/dashboard/import/review?importId=${responseData.importId}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'URL import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Context</h1>
          <p className="text-muted-foreground">
            Import prompts, agents, rules, and templates from various sources
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {isImporting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {importProgress.message || 'Importing...'}
                  </p>
                  {importProgress.currentFile && (
                    <p className="text-xs text-muted-foreground">
                      Current: {importProgress.currentFile}
                    </p>
                  )}
                  {importProgress.totalFiles > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Progress: {importProgress.processedFiles}/{importProgress.totalFiles} files
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{importProgress.progress}%</p>
                </div>
              </div>
              <Progress value={importProgress.progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="files">
            <Upload className="mr-2 h-4 w-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="github">
            <Github className="mr-2 h-4 w-4" />
            GitHub
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link2 className="mr-2 h-4 w-4" />
            URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Upload Files</CardTitle>
              <CardDescription>
                Upload prompt files, agent definitions, and configuration files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${dragActive ? 'border-primary bg-accent' : 'border-border'
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop files here, or click to select
                </p>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept=".md,.json,.yaml,.yml,.xml,.prompt,.agent,.af,.mdc,.txt"
                />
                <Label htmlFor="file-upload">
                  <Button variant="outline" asChild>
                    <span>Choose Files</span>
                  </Button>
                </Label>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported: .md, .json, .yaml, .xml, .prompt, .agent, .af, .mdc
                </p>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Files:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{file.name}</span>
                          <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleFileImport}
                disabled={files.length === 0 || isImporting}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import {files.length} File{files.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github">
          <Card>
            <CardHeader>
              <CardTitle>Import from GitHub</CardTitle>
              <CardDescription>
                Import files directly from a GitHub repository
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-url">Repository URL</Label>
                <Input
                  id="github-url"
                  type="url"
                  placeholder="https://github.com/owner/repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  disabled={isImporting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  type="text"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  disabled={isImporting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="path-glob">Path Pattern (glob)</Label>
                <Input
                  id="path-glob"
                  type="text"
                  placeholder="**/*.md,**/*.json,**/*.yaml"
                  value={pathGlob}
                  onChange={(e) => setPathGlob(e.target.value)}
                  disabled={isImporting}
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Use glob patterns to filter files. Common patterns:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li><code>**/*.md</code> - All Markdown files</li>
                    <li><code>prompts/**/*</code> - Files in prompts directory</li>
                    <li><code>{`*.{json,yaml}`}</code> - JSON and YAML in root</li>
                    <li><code>**/*.prompt</code> - All .prompt files</li>
                  </ul>
                  <p className="mt-2">Leave empty to import all supported file types.</p>
                </div>
              </div>

              <Button
                onClick={handleGitHubImport}
                disabled={!githubUrl || isImporting}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Github className="mr-2 h-4 w-4" />
                    Import from GitHub
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="url">
          <Card>
            <CardHeader>
              <CardTitle>Import from URL</CardTitle>
              <CardDescription>
                Extract and import content from a website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="web-url">Website URL</Label>
                <Input
                  id="web-url"
                  type="url"
                  placeholder="https://example.com/prompts"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  disabled={isImporting}
                />
                <p className="text-xs text-muted-foreground">
                  The page will be scraped for prompts and code blocks
                </p>
              </div>

              <Button
                onClick={handleUrlImport}
                disabled={!webUrl || isImporting}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Import from URL
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}