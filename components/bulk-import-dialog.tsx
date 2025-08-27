'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ImportJob {
  id: string;
  fileName: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  validItems: number;
  errorItems: number;
  duplicates: number;
  createdAt: string;
  completedAt?: string;
  message: string;
}

interface ValidationResult {
  totalItems: number;
  validItems: number;
  errors: Array<{ index: number; error: string; item: any }>;
  duplicates: Array<{ index: number; item: any; reason: string }>;
}

export function BulkImportDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  
  // Import configuration
  const [format, setFormat] = useState<'csv' | 'json' | 'yaml'>('csv');
  const [itemType, setItemType] = useState<string>('');
  const [autoDetect, setAutoDetect] = useState(true);
  const [skipFirstRow, setSkipFirstRow] = useState(true);
  const [validateOnly, setValidateOnly] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationResults(null);
      setCurrentJob(null);
      
      // Auto-detect format from file extension
      if (autoDetect) {
        if (selectedFile.name.endsWith('.json')) {
          setFormat('json');
        } else if (selectedFile.name.endsWith('.yaml') || selectedFile.name.endsWith('.yml')) {
          setFormat('yaml');
        } else {
          setFormat('csv');
        }
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setValidationResults(null);
    setCurrentJob(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('config', JSON.stringify({
        format,
        itemType: itemType || undefined,
        autoDetect,
        skipFirstRow,
        validateOnly,
        batchSize: 100
      }));

      const response = await fetch('/api/import/files', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      if (validateOnly) {
        setValidationResults(result.validation);
        toast({
          title: 'Validation Complete',
          description: `${result.validItems} valid items, ${result.errors?.length || 0} errors found`
        });
      } else {
        setCurrentJob({
          id: result.jobId,
          fileName: file.name,
          format,
          status: 'pending',
          progress: 0,
          totalItems: result.totalItems,
          validItems: result.validItems,
          errorItems: result.errors?.length || 0,
          duplicates: result.duplicates?.length || 0,
          createdAt: new Date().toISOString(),
          message: 'Import job started'
        });

        // Start polling for job status
        pollJobStatus(result.jobId);
        
        toast({
          title: 'Import Started',
          description: `Processing ${result.totalItems} items...`
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/import/${jobId}/status`);
      const result = await response.json();

      if (response.ok) {
        setCurrentJob(result.job);

        if (result.job.status === 'processing') {
          // Continue polling
          setTimeout(() => pollJobStatus(jobId), 2000);
        } else if (result.job.status === 'completed') {
          toast({
            title: 'Import Complete',
            description: `Successfully imported ${result.job.validItems} items`
          });
        } else if (result.job.status === 'failed') {
          toast({
            title: 'Import Failed',
            description: 'Import job failed. Please try again.',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Status polling error:', error);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setValidationResults(null);
    setCurrentJob(null);
    setValidateOnly(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Items
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".csv,.json,.yaml,.yml"
                onChange={handleFileSelect}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supports CSV, JSON, and YAML formats. Max size: 10MB
              </p>
            </div>

            {file && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="ml-auto h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Configuration Section */}
          {file && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Import Configuration</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="format">File Format</Label>
                  <Select value={format} onValueChange={(value: any) => setFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="yaml">YAML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="item-type">Item Type (Optional)</Label>
                  <Select value={itemType} onValueChange={setItemType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detect" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Auto-detect</SelectItem>
                      <SelectItem value="prompt">Prompt</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="rule">Rule</SelectItem>
                      <SelectItem value="template">Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-detect"
                    checked={autoDetect}
                    onCheckedChange={setAutoDetect}
                  />
                  <Label htmlFor="auto-detect" className="text-sm">
                    Auto-detect format and types
                  </Label>
                </div>

                {format === 'csv' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="skip-first-row"
                      checked={skipFirstRow}
                      onCheckedChange={setSkipFirstRow}
                    />
                    <Label htmlFor="skip-first-row" className="text-sm">
                      Skip first row (headers)
                    </Label>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="validate-only"
                  checked={validateOnly}
                  onCheckedChange={setValidateOnly}
                />
                <Label htmlFor="validate-only" className="text-sm">
                  Validate only (don't import)
                </Label>
              </div>
            </div>
          )}

          {/* Validation Results */}
          {validationResults && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Validation Results</h4>
              
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {validationResults.totalItems}
                  </div>
                  <div className="text-xs text-blue-600">Total Items</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {validationResults.validItems}
                  </div>
                  <div className="text-xs text-green-600">Valid Items</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {validationResults.errors.length}
                  </div>
                  <div className="text-xs text-red-600">Errors</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {validationResults.duplicates.length}
                  </div>
                  <div className="text-xs text-yellow-600">Duplicates</div>
                </div>
              </div>

              {validationResults.errors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Found {validationResults.errors.length} validation errors. 
                    Review your data and fix issues before importing.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Job Progress */}
          {currentJob && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Import Progress</h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{currentJob.message}</span>
                  <span>{currentJob.progress}%</span>
                </div>
                <Progress 
                  value={currentJob.progress} 
                  className={`h-2 ${getProgressColor(currentJob.status)}`}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="font-medium">{currentJob.validItems}</div>
                  <div className="text-muted-foreground">Valid</div>
                </div>
                <div>
                  <div className="font-medium">{currentJob.errorItems}</div>
                  <div className="text-muted-foreground">Errors</div>
                </div>
                <div>
                  <div className="font-medium">{currentJob.duplicates}</div>
                  <div className="text-muted-foreground">Duplicates</div>
                </div>
              </div>

              {currentJob.status === 'completed' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Import completed successfully! {currentJob.validItems} items have been added to your library.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={resetDialog}>
              Reset
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              
              {file && !currentJob && (
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="min-w-24"
                >
                  {isUploading ? 'Processing...' : validateOnly ? 'Validate' : 'Import'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}