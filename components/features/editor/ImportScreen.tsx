'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, FileText, Github, Link2, Loader2, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export function ImportScreen() {
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
    const [excludeDocFiles, setExcludeDocFiles] = useState(true);

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
        // Don't reset progress to 0 - let the backend drive the progress updates
        setImportProgress({ progress: 0, message: 'Connecting to GitHub...', totalFiles: 0, processedFiles: 0, currentFile: '' });


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
                        fileExtensions: pathGlob ? pathGlob.split(',').map(p => p.trim().replace('**/*', '').replace('*', '')).filter(ext => ext.startsWith('.')) : undefined,
                        excludeDocFiles
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

                // Update UI immediately to show we have an import ID
                setImportProgress(prev => ({
                    ...prev,
                    progress: 5,
                    message: 'Initializing import process...'
                }));

                // Wait a short moment to ensure the backend has started processing
                setTimeout(() => {
                    const sseUrl = `/api/import/github/progress?importId=${responseData.importId}`;
                    try {
                        const eventSource = new EventSource(sseUrl);
                        let retryCount = 0;
                        const maxRetries = 3;

                    eventSource.onopen = () => {
                        retryCount = 0; // Reset retry count on successful connection
                    };

                    eventSource.onmessage = (event) => {

                        // Skip heartbeat messages
                        if (event.data.trim() === '' || event.data.includes('heartbeat')) {
                            return;
                        }

                        try {
                            const progress = JSON.parse(event.data);

                            // Handle connection confirmation
                            if (progress.status === 'connected') {
                                setImportProgress(prev => ({
                                    ...prev,
                                    progress: 10,
                                    message: 'Connection established, starting import...'
                                }));
                                return;
                            }

                            setImportProgress(prev => ({
                                ...prev,
                                ...progress,
                                // Ensure we always show meaningful progress that moves forward
                                progress: Math.max(progress.progress || 0, prev.progress || 0)
                            }));

                            if (progress.status === 'completed') {
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
                                eventSource.close();
                                setIsImporting(false);
                                setError(progress.message || 'Import failed');
                            }
                        } catch (parseError) {
                            console.error('Error parsing progress data:', parseError, 'Raw data:', event.data);
                        }
                    };

                    eventSource.onerror = (error) => {
                        console.error('🚨 EventSource error:', error);
                        console.error('🚨 EventSource readyState:', eventSource.readyState);
                        console.error('🚨 EventSource url:', eventSource.url);
                        console.error('🚨 Full error object:', JSON.stringify(error, null, 2));

                        // EventSource states: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
                        const stateNames = ['CONNECTING', 'OPEN', 'CLOSED'];
                        console.log('🚨 EventSource state:', stateNames[eventSource.readyState] || 'UNKNOWN');

                        retryCount++;

                        if (retryCount >= maxRetries) {
                            eventSource.close();
                            setIsImporting(false);
                            setError(`Connection to import progress lost after multiple retries. State: ${stateNames[eventSource.readyState]}`);
                        } else {
                            console.log(`🔄 EventSource error, retry ${retryCount}/${maxRetries}`);
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

                    } catch (sseError) {
                        console.error('🚨 Failed to create EventSource:', sseError);
                        setError(`Failed to establish progress connection: ${sseError.message}`);
                        setIsImporting(false);
                    }
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
        <div className="h-full bg-[#0F1117] overflow-auto">
            <div className="max-w-4xl mx-auto p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Import Context</h1>
                    <p className="text-gray-400">
                        Import prompts, agents, rules, and templates from various sources
                    </p>
                </div>

                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="mb-6 bg-green-900/20 border-green-700">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription className="text-green-100">{success}</AlertDescription>
                    </Alert>
                )}

                {isImporting && (
                    <Card className="mb-6 bg-[#161B22] border-gray-700">
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-white">
                                            {importProgress.message || 'Importing...'}
                                        </p>
                                        {importProgress.currentFile && (
                                            <p className="text-xs text-gray-400">
                                                Current: {importProgress.currentFile}
                                            </p>
                                        )}
                                        {importProgress.totalFiles > 0 && (
                                            <p className="text-xs text-gray-400">
                                                Progress: {importProgress.processedFiles}/{importProgress.totalFiles} files
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-white">{importProgress.progress}%</p>
                                    </div>
                                </div>
                                <Progress
                                    value={importProgress.progress}
                                    className="w-full"
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3 bg-[#161B22] border-gray-700">
                        <TabsTrigger value="files" className="data-[state=active]:bg-[#21262D]">
                            <Upload className="mr-2 h-4 w-4" />
                            Files
                        </TabsTrigger>
                        <TabsTrigger value="github" className="data-[state=active]:bg-[#21262D]">
                            <Github className="mr-2 h-4 w-4" />
                            GitHub
                        </TabsTrigger>
                        <TabsTrigger value="url" className="data-[state=active]:bg-[#21262D]">
                            <Link2 className="mr-2 h-4 w-4" />
                            URL
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="files">
                        <Card className="bg-[#161B22] border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Upload Files</CardTitle>
                                <CardDescription className="text-gray-400">
                                    Upload prompt files, agent definitions, and configuration files
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div
                                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'
                                        }`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                    <p className="text-sm text-gray-400 mb-2">
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
                                        <Button variant="outline" asChild className="border-gray-600 text-white hover:bg-gray-700">
                                            <span>Choose Files</span>
                                        </Button>
                                    </Label>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Supported: .md, .json, .yaml, .xml, .prompt, .agent, .af, .mdc
                                    </p>
                                </div>

                                {files.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-white">Selected Files:</p>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {files.map((file, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-2 border border-gray-600 rounded-lg bg-[#21262D]"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <FileText className="h-4 w-4 text-gray-400" />
                                                        <span className="text-sm text-white">{file.name}</span>
                                                        <Badge variant="outline" className="border-gray-600 text-gray-300">
                                                            {(file.size / 1024).toFixed(1)} KB
                                                        </Badge>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeFile(index)}
                                                        className="text-gray-400 hover:text-white hover:bg-gray-700"
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
                                    className="w-full bg-blue-600 hover:bg-blue-700"
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
                        <Card className="bg-[#161B22] border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Import from GitHub</CardTitle>
                                <CardDescription className="text-gray-400">
                                    Import files directly from a GitHub repository
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="github-url" className="text-white">Repository URL</Label>
                                    <Input
                                        id="github-url"
                                        type="url"
                                        placeholder="https://github.com/owner/repo"
                                        value={githubUrl}
                                        onChange={(e) => setGithubUrl(e.target.value)}
                                        disabled={isImporting}
                                        className="bg-[#21262D] border-gray-600 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="branch" className="text-white">Branch</Label>
                                    <Input
                                        id="branch"
                                        type="text"
                                        placeholder="main"
                                        value={branch}
                                        onChange={(e) => setBranch(e.target.value)}
                                        disabled={isImporting}
                                        className="bg-[#21262D] border-gray-600 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="path-glob" className="text-white">Path Pattern (glob)</Label>
                                    <Input
                                        id="path-glob"
                                        type="text"
                                        placeholder="**/*.md,**/*.json,**/*.yaml"
                                        value={pathGlob}
                                        onChange={(e) => setPathGlob(e.target.value)}
                                        disabled={isImporting}
                                        className="bg-[#21262D] border-gray-600 text-white"
                                    />
                                    <div className="text-xs text-gray-400 space-y-1">
                                        <p>Use glob patterns to filter files. Common patterns:</p>
                                        <ul className="list-disc list-inside ml-2 space-y-1">
                                            <li><code className="bg-gray-800 px-1 rounded">**/*.md</code> - All Markdown files</li>
                                            <li><code className="bg-gray-800 px-1 rounded">prompts/**/*</code> - Files in prompts directory</li>
                                            <li><code className="bg-gray-800 px-1 rounded">{`*.{json,yaml}`}</code> - JSON and YAML in root</li>
                                            <li><code className="bg-gray-800 px-1 rounded">**/*.prompt</code> - All .prompt files</li>
                                        </ul>
                                        <p className="mt-2">Leave empty to import all supported file types.</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            id="exclude-docs"
                                            type="checkbox"
                                            checked={excludeDocFiles}
                                            onChange={(e) => setExcludeDocFiles(e.target.checked)}
                                            disabled={isImporting}
                                            className="rounded border-gray-600 bg-[#21262D] text-green-600 focus:ring-green-600"
                                        />
                                        <Label htmlFor="exclude-docs" className="text-white text-sm">
                                            Skip documentation files
                                        </Label>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        Excludes README.md, CONTRIBUTING.md, LICENSE, CHANGELOG.md, etc.
                                    </p>
                                </div>

                                <Button
                                    onClick={handleGitHubImport}
                                    disabled={!githubUrl || isImporting}
                                    className="w-full bg-green-600 hover:bg-green-700"
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
                        <Card className="bg-[#161B22] border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Import from URL</CardTitle>
                                <CardDescription className="text-gray-400">
                                    Extract and import content from a website
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="web-url" className="text-white">Website URL</Label>
                                    <Input
                                        id="web-url"
                                        type="url"
                                        placeholder="https://example.com/prompts"
                                        value={webUrl}
                                        onChange={(e) => setWebUrl(e.target.value)}
                                        disabled={isImporting}
                                        className="bg-[#21262D] border-gray-600 text-white"
                                    />
                                    <p className="text-xs text-gray-400">
                                        The page will be scraped for prompts and code blocks
                                    </p>
                                </div>

                                <Button
                                    onClick={handleUrlImport}
                                    disabled={!webUrl || isImporting}
                                    className="w-full bg-orange-600 hover:bg-orange-700"
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
        </div>
    );
}
