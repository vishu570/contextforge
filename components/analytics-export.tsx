'use client';

import React, { useState } from 'react';
import {
  Download,
  FileText,
  BarChart3,
  Calendar,
  Settings,
  CheckCircle,
  Clock,
  Mail,
  Printer,
  Share2,
  Filter,
  Database,
  Archive,
  FileImage,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AnalyticsExportProps {
  userId: string;
  timeRange: string;
  className?: string;
}

interface ExportConfig {
  format: 'pdf' | 'csv' | 'json' | 'xlsx' | 'png';
  reportType: 'summary' | 'detailed' | 'custom';
  timeRange: string;
  sections: string[];
  includeCharts: boolean;
  includeRawData: boolean;
  scheduledExport: boolean;
  recipients: string[];
  customTitle?: string;
  customDescription?: string;
}

const EXPORT_FORMATS = [
  { value: 'pdf', label: 'PDF Report', icon: FileText, description: 'Complete formatted report with charts' },
  { value: 'csv', label: 'CSV Data', icon: FileSpreadsheet, description: 'Raw data for analysis' },
  { value: 'json', label: 'JSON Data', icon: FileJson, description: 'Structured data format' },
  { value: 'xlsx', label: 'Excel Workbook', icon: FileSpreadsheet, description: 'Spreadsheet with multiple sheets' },
  { value: 'png', label: 'Chart Images', icon: FileImage, description: 'High-resolution chart images' }
];

const REPORT_SECTIONS = [
  { id: 'overview', label: 'Executive Summary', description: 'High-level metrics and KPIs' },
  { id: 'performance', label: 'AI Performance', description: 'Model performance and metrics' },
  { id: 'costs', label: 'Cost Analysis', description: 'Cost breakdown and savings' },
  { id: 'productivity', label: 'Productivity Metrics', description: 'User productivity and efficiency' },
  { id: 'quality', label: 'Quality Metrics', description: 'Content quality and improvements' },
  { id: 'trends', label: 'Trends & Insights', description: 'Historical trends and patterns' },
  { id: 'recommendations', label: 'Recommendations', description: 'AI-generated insights and suggestions' },
  { id: 'benchmarks', label: 'Benchmarks', description: 'Industry comparisons' }
];

const TIME_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'custom', label: 'Custom range' }
];

export function AnalyticsExport({
  userId,
  timeRange,
  className
}: AnalyticsExportProps) {
  const [config, setConfig] = useState<ExportConfig>({
    format: 'pdf',
    reportType: 'summary',
    timeRange,
    sections: ['overview', 'performance', 'costs'],
    includeCharts: true,
    includeRawData: false,
    scheduledExport: false,
    recipients: []
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [newRecipient, setNewRecipient] = useState('');

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus('exporting');
      setExportProgress(0);

      // Simulate export progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const params = new URLSearchParams({
        format: config.format,
        type: config.reportType,
        range: config.timeRange,
        sections: config.sections.join(','),
        includeCharts: config.includeCharts.toString(),
        includeRawData: config.includeRawData.toString(),
        ...(config.customTitle && { title: config.customTitle }),
        ...(config.customDescription && { description: config.customDescription })
      });

      const response = await fetch(`/api/analytics/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Complete progress
      clearInterval(progressInterval);
      setExportProgress(100);

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `contextforge-analytics-${config.reportType}-${timestamp}.${config.format}`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportStatus('success');
      
      // If scheduled export, save the configuration
      if (config.scheduledExport && config.recipients.length > 0) {
        await scheduleExport();
      }

    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('error');
    } finally {
      setIsExporting(false);
      setTimeout(() => {
        setExportStatus('idle');
        setExportProgress(0);
      }, 3000);
    }
  };

  const scheduleExport = async () => {
    try {
      const response = await fetch('/api/analytics/schedule-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config,
          userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to schedule export');
      }
    } catch (error) {
      console.error('Schedule export error:', error);
    }
  };

  const addRecipient = () => {
    if (newRecipient && !config.recipients.includes(newRecipient)) {
      setConfig(prev => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient]
      }));
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setConfig(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email)
    }));
  };

  const updateSections = (sectionId: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      sections: checked 
        ? [...prev.sections, sectionId]
        : prev.sections.filter(s => s !== sectionId)
    }));
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Export Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Generate and download comprehensive analytics reports
          </p>
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="schedule">Scheduling</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Export Format */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Export Format
                </CardTitle>
                <CardDescription>
                  Choose your preferred output format
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {EXPORT_FORMATS.map((format) => {
                    const IconComponent = format.icon;
                    return (
                      <div
                        key={format.value}
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          config.format === format.value 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:bg-muted"
                        )}
                        onClick={() => setConfig(prev => ({ ...prev, format: format.value as any }))}
                      >
                        <IconComponent className="h-5 w-5" />
                        <div className="flex-1">
                          <div className="font-medium">{format.label}</div>
                          <div className="text-sm text-muted-foreground">{format.description}</div>
                        </div>
                        {config.format === format.value && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Report Sections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Report Sections
                </CardTitle>
                <CardDescription>
                  Select which sections to include
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {REPORT_SECTIONS.map((section) => (
                    <div key={section.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={section.id}
                        checked={config.sections.includes(section.id)}
                        onCheckedChange={(checked) => updateSections(section.id, checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor={section.id} className="text-sm font-medium">
                          {section.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Export Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="report-type">Report Type</Label>
                    <Select 
                      value={config.reportType} 
                      onValueChange={(value) => setConfig(prev => ({ ...prev, reportType: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="summary">Executive Summary</SelectItem>
                        <SelectItem value="detailed">Detailed Report</SelectItem>
                        <SelectItem value="custom">Custom Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="time-range">Time Range</Label>
                    <Select 
                      value={config.timeRange} 
                      onValueChange={(value) => setConfig(prev => ({ ...prev, timeRange: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_RANGES.map(range => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-charts"
                      checked={config.includeCharts}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeCharts: checked }))}
                    />
                    <Label htmlFor="include-charts">Include Charts</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-raw-data"
                      checked={config.includeRawData}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeRawData: checked }))}
                    />
                    <Label htmlFor="include-raw-data">Include Raw Data</Label>
                  </div>
                </div>
              </div>

              {config.reportType === 'custom' && (
                <div className="grid gap-4 md:grid-cols-2 mt-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="custom-title">Custom Title</Label>
                    <Input
                      id="custom-title"
                      placeholder="Report title"
                      value={config.customTitle || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, customTitle: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-description">Description</Label>
                    <Textarea
                      id="custom-description"
                      placeholder="Report description"
                      value={config.customDescription || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, customDescription: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Action */}
          <Card>
            <CardContent className="pt-6">
              {isExporting && (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Generating report...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} />
                </div>
              )}

              {exportStatus === 'success' && (
                <Alert className="mb-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Report exported successfully! The file has been downloaded.
                  </AlertDescription>
                </Alert>
              )}

              {exportStatus === 'error' && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    Export failed. Please try again or contact support.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {config.sections.length} sections selected • {config.format.toUpperCase()} format
                </div>
                <Button 
                  onClick={handleExport} 
                  disabled={isExporting || config.sections.length === 0}
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export Report'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Scheduled Exports
              </CardTitle>
              <CardDescription>
                Set up automatic report generation and delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="scheduled-export"
                  checked={config.scheduledExport}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, scheduledExport: checked }))}
                />
                <Label htmlFor="scheduled-export">Enable scheduled exports</Label>
              </div>

              {config.scheduledExport && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Frequency</Label>
                      <Select defaultValue="weekly">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Time</Label>
                      <Input type="time" defaultValue="09:00" />
                    </div>
                  </div>

                  <div>
                    <Label>Email Recipients</Label>
                    <div className="flex space-x-2 mt-1">
                      <Input
                        placeholder="Email address"
                        value={newRecipient}
                        onChange={(e) => setNewRecipient(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                      />
                      <Button onClick={addRecipient} variant="outline">Add</Button>
                    </div>
                    {config.recipients.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {config.recipients.map((email) => (
                          <Badge key={email} variant="secondary" className="cursor-pointer">
                            {email}
                            <button
                              onClick={() => removeRecipient(email)}
                              className="ml-1 text-xs"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduled Reports List */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Scheduled Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Weekly Executive Summary</div>
                    <div className="text-sm text-muted-foreground">
                      PDF • Every Monday at 9:00 AM • 3 recipients
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">Active</Badge>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Monthly Cost Analysis</div>
                    <div className="text-sm text-muted-foreground">
                      Excel • First of month at 8:00 AM • 2 recipients
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Paused</Badge>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Archive className="h-5 w-5 mr-2" />
                Report Templates
              </CardTitle>
              <CardDescription>
                Pre-configured report templates for common use cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div 
                  className="p-4 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setConfig(prev => ({
                    ...prev,
                    reportType: 'summary',
                    sections: ['overview', 'performance', 'costs'],
                    includeCharts: true,
                    includeRawData: false
                  }))}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Executive Dashboard</h4>
                      <p className="text-sm text-muted-foreground">High-level KPIs and trends</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Includes: Overview, Performance, Costs
                  </div>
                </div>

                <div 
                  className="p-4 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setConfig(prev => ({
                    ...prev,
                    reportType: 'detailed',
                    sections: ['overview', 'performance', 'costs', 'productivity', 'quality'],
                    includeCharts: true,
                    includeRawData: true
                  }))}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Database className="h-8 w-8 text-green-600" />
                    <div>
                      <h4 className="font-medium">Technical Analysis</h4>
                      <p className="text-sm text-muted-foreground">Detailed metrics and data</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Includes: All sections with raw data
                  </div>
                </div>

                <div 
                  className="p-4 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setConfig(prev => ({
                    ...prev,
                    reportType: 'summary',
                    sections: ['costs', 'productivity', 'benchmarks'],
                    includeCharts: true,
                    includeRawData: false
                  }))}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Clock className="h-8 w-8 text-purple-600" />
                    <div>
                      <h4 className="font-medium">ROI Report</h4>
                      <p className="text-sm text-muted-foreground">Cost savings and efficiency</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Includes: Costs, Productivity, Benchmarks
                  </div>
                </div>

                <div 
                  className="p-4 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setConfig(prev => ({
                    ...prev,
                    reportType: 'detailed',
                    sections: ['quality', 'trends', 'recommendations'],
                    includeCharts: true,
                    includeRawData: false
                  }))}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Share2 className="h-8 w-8 text-orange-600" />
                    <div>
                      <h4 className="font-medium">Quality Insights</h4>
                      <p className="text-sm text-muted-foreground">AI quality and recommendations</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Includes: Quality, Trends, Recommendations
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save as Template */}
          <Card>
            <CardHeader>
              <CardTitle>Save Current Configuration</CardTitle>
              <CardDescription>
                Save your current export settings as a reusable template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input placeholder="Template name" />
                <Button variant="outline">
                  <Archive className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}