'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle,
  Clock,
  DollarSign,
  Mail,
  Settings,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Zap,
  Target,
  Activity,
  Gauge,
  AlertCircle,
  Info,
  X,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'greater' | 'less' | 'equals' | 'change';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  notifications: {
    email: boolean;
    push: boolean;
    webhooks: string[];
  };
  cooldown: number; // Minutes between alerts
  lastTriggered?: string;
  triggerCount: number;
  createdAt: string;
}

interface ActiveAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

interface AnalyticsAlertsProps {
  userId: string;
  className?: string;
}

const METRIC_OPTIONS = [
  { value: 'error_rate', label: 'Error Rate', unit: '%', description: 'Percentage of failed requests' },
  { value: 'response_time', label: 'Response Time', unit: 'ms', description: 'Average response time' },
  { value: 'cost_per_hour', label: 'Cost per Hour', unit: '$', description: 'Hourly AI usage cost' },
  { value: 'success_rate', label: 'Success Rate', unit: '%', description: 'Percentage of successful requests' },
  { value: 'queue_size', label: 'Queue Size', unit: 'jobs', description: 'Number of pending jobs' },
  { value: 'quality_score', label: 'Quality Score', unit: '/10', description: 'Average content quality' },
  { value: 'optimization_rate', label: 'Optimization Rate', unit: '%', description: 'Rate of successful optimizations' },
  { value: 'token_usage', label: 'Token Usage', unit: 'tokens', description: 'Total tokens consumed' }
];

const SEVERITY_COLORS = {
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200'
};

const SEVERITY_ICONS = {
  low: Info,
  medium: AlertTriangle,
  high: AlertCircle,
  critical: AlertTriangle
};

export function AnalyticsAlerts({ userId, className }: AnalyticsAlertsProps) {
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalSettings, setGlobalSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    maxAlertsPerHour: 10
  });

  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    name: '',
    description: '',
    metric: 'error_rate',
    condition: 'greater',
    threshold: 5,
    severity: 'medium',
    isActive: true,
    notifications: {
      email: true,
      push: false,
      webhooks: []
    },
    cooldown: 30
  });

  useEffect(() => {
    fetchAlertData();
    // Set up real-time updates
    const interval = setInterval(fetchActiveAlerts, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [userId]);

  const fetchAlertData = async () => {
    try {
      setLoading(true);
      const [rulesResponse, alertsResponse] = await Promise.all([
        fetch('/api/analytics/alerts/rules'),
        fetch('/api/analytics/alerts')
      ]);

      if (rulesResponse.ok) {
        const rulesData = await rulesResponse.json();
        setAlertRules(rulesData.rules || []);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setActiveAlerts(alertsData.alerts?.active || []);
      }
    } catch (error) {
      console.error('Error fetching alert data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveAlerts = async () => {
    try {
      const response = await fetch('/api/analytics/alerts');
      if (response.ok) {
        const alertsData = await response.json();
        setActiveAlerts(alertsData.alerts?.active || []);
      }
    } catch (error) {
      console.error('Error fetching active alerts:', error);
    }
  };

  const createAlertRule = async () => {
    try {
      const response = await fetch('/api/analytics/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });

      if (response.ok) {
        const rule = await response.json();
        setAlertRules(prev => [...prev, rule]);
        setIsCreateDialogOpen(false);
        setNewRule({
          name: '',
          description: '',
          metric: 'error_rate',
          condition: 'greater',
          threshold: 5,
          severity: 'medium',
          isActive: true,
          notifications: {
            email: true,
            push: false,
            webhooks: []
          },
          cooldown: 30
        });
      }
    } catch (error) {
      console.error('Error creating alert rule:', error);
    }
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/analytics/alerts/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });

      if (response.ok) {
        setAlertRules(prev => prev.map(rule => 
          rule.id === ruleId ? { ...rule, isActive } : rule
        ));
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/analytics/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });

      if (response.ok) {
        setActiveAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'acknowledged', acknowledgedAt: new Date().toISOString() }
            : alert
        ));
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/analytics/alerts/${alertId}/resolve`, {
        method: 'POST'
      });

      if (response.ok) {
        setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getMetricInfo = (metricKey: string) => {
    return METRIC_OPTIONS.find(m => m.value === metricKey) || METRIC_OPTIONS[0];
  };

  const formatMetricValue = (value: number, metric: string) => {
    const metricInfo = getMetricInfo(metric);
    switch (metricInfo.unit) {
      case '%':
        return `${value.toFixed(1)}%`;
      case '$':
        return `$${value.toFixed(2)}`;
      case 'ms':
        return `${Math.round(value)}ms`;
      default:
        return value.toString();
    }
  };

  const getSeverityClass = (severity: string) => {
    return SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.medium;
  };

  const getSeverityIcon = (severity: string) => {
    const IconComponent = SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS] || Info;
    return <IconComponent className="h-4 w-4" />;
  };

  const AlertHistoryList = ({ userId, getSeverityIcon, getSeverityClass }: {
    userId: string;
    getSeverityIcon: (severity: string) => React.ReactElement;
    getSeverityClass: (severity: string) => string;
  }) => {
    const [alertHistory, setAlertHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchAlertHistory = async () => {
        try {
          const response = await fetch('/api/analytics/alerts/history');
          if (response.ok) {
            const data = await response.json();
            setAlertHistory(data.alerts || []);
          }
        } catch (error) {
          console.error('Error fetching alert history:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchAlertHistory();
    }, [userId]);

    if (loading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-2">Loading alert history...</p>
        </div>
      );
    }

    if (alertHistory.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <p>No alert history available</p>
          <p className="text-sm">Past alerts will appear here once they occur</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {alertHistory.map(alert => (
          <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              {getSeverityIcon(alert.severity)}
              <div>
                <h4 className="font-medium">{alert.title}</h4>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>Created: {new Date(alert.createdAt).toLocaleString()}</span>
                  {alert.resolvedAt && (
                    <span>Resolved: {new Date(alert.resolvedAt).toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant={alert.status === 'resolved' ? 'default' : 'secondary'}>
                {alert.status}
              </Badge>
              <Badge variant="outline" className={getSeverityClass(alert.severity)}>
                {alert.severity}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Alerts & Monitoring</h3>
          <p className="text-muted-foreground">
            Set up proactive monitoring and get notified of performance issues
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Alert Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Alert Rule</DialogTitle>
                <DialogDescription>
                  Set up automated monitoring for your analytics metrics
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="rule-name">Rule Name</Label>
                    <Input
                      id="rule-name"
                      placeholder="High error rate alert"
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="metric">Metric</Label>
                    <Select 
                      value={newRule.metric} 
                      onValueChange={(value) => setNewRule(prev => ({ ...prev, metric: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METRIC_OPTIONS.map(metric => (
                          <SelectItem key={metric.value} value={metric.value}>
                            {metric.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Alert when error rate exceeds acceptable threshold"
                    value={newRule.description}
                    onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select 
                      value={newRule.condition} 
                      onValueChange={(value) => setNewRule(prev => ({ ...prev, condition: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="greater">Greater than</SelectItem>
                        <SelectItem value="less">Less than</SelectItem>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="change">% Change</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="threshold">Threshold</Label>
                    <Input
                      id="threshold"
                      type="number"
                      value={newRule.threshold}
                      onChange={(e) => setNewRule(prev => ({ ...prev, threshold: parseFloat(e.target.value) }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="severity">Severity</Label>
                    <Select 
                      value={newRule.severity} 
                      onValueChange={(value) => setNewRule(prev => ({ ...prev, severity: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Notifications</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newRule.notifications?.email}
                        onCheckedChange={(checked) => setNewRule(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications!, email: checked }
                        }))}
                      />
                      <Label>Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newRule.notifications?.push}
                        onCheckedChange={(checked) => setNewRule(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications!, push: checked }
                        }))}
                      />
                      <Label>Push</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="cooldown">Cooldown (minutes)</Label>
                  <Input
                    id="cooldown"
                    type="number"
                    value={newRule.cooldown}
                    onChange={(e) => setNewRule(prev => ({ ...prev, cooldown: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAlertRule}>
                    Create Rule
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              Active Alerts ({activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    getSeverityClass(alert.severity)
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getSeverityIcon(alert.severity)}
                      <div>
                        <h4 className="font-medium">{alert.title}</h4>
                        <p className="text-sm opacity-90">{alert.message}</p>
                        <div className="flex items-center space-x-4 text-xs opacity-75 mt-2">
                          <span>Metric: {getMetricInfo(alert.metric).label}</span>
                          <span>
                            Current: {formatMetricValue(alert.currentValue, alert.metric)}
                          </span>
                          <span>
                            Threshold: {formatMetricValue(alert.threshold, alert.metric)}
                          </span>
                          <span>{new Date(alert.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {alert.status === 'active' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        </>
                      )}
                      {alert.status === 'acknowledged' && (
                        <Button 
                          size="sm"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="history">Alert History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Rules</CardTitle>
              <CardDescription>
                Manage your monitoring rules and thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertRules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No alert rules configured</p>
                  <p className="text-sm">Create your first alert rule to start monitoring</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alertRules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{rule.name}</h4>
                            <Badge variant={rule.isActive ? "default" : "secondary"}>
                              {rule.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline" className={getSeverityClass(rule.severity)}>
                              {rule.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                            <span>
                              {getMetricInfo(rule.metric).label} {rule.condition} {formatMetricValue(rule.threshold, rule.metric)}
                            </span>
                            <span>Triggered {rule.triggerCount} times</span>
                            {rule.lastTriggered && (
                              <span>Last: {new Date(rule.lastTriggered).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert History</CardTitle>
              <CardDescription>
                View past alerts and their resolution status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertHistoryList userId={userId} getSeverityIcon={getSeverityIcon} getSeverityClass={getSeverityClass} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how and when you receive alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                  </div>
                  <Switch
                    checked={globalSettings.emailNotifications}
                    onCheckedChange={(checked) => setGlobalSettings(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Browser push notifications</p>
                  </div>
                  <Switch
                    checked={globalSettings.pushNotifications}
                    onCheckedChange={(checked) => setGlobalSettings(prev => ({ ...prev, pushNotifications: checked }))}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Quiet Hours</Label>
                      <p className="text-sm text-muted-foreground">Suppress non-critical alerts during specified hours</p>
                    </div>
                    <Switch
                      checked={globalSettings.quietHours.enabled}
                      onCheckedChange={(checked) => setGlobalSettings(prev => ({
                        ...prev,
                        quietHours: { ...prev.quietHours, enabled: checked }
                      }))}
                    />
                  </div>
                  
                  {globalSettings.quietHours.enabled && (
                    <div className="grid gap-4 md:grid-cols-2 pl-4">
                      <div>
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={globalSettings.quietHours.start}
                          onChange={(e) => setGlobalSettings(prev => ({
                            ...prev,
                            quietHours: { ...prev.quietHours, start: e.target.value }
                          }))}
                        />
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={globalSettings.quietHours.end}
                          onChange={(e) => setGlobalSettings(prev => ({
                            ...prev,
                            quietHours: { ...prev.quietHours, end: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Alert Rate Limit</Label>
                  <p className="text-sm text-muted-foreground mb-2">Maximum alerts per hour</p>
                  <Input
                    type="number"
                    value={globalSettings.maxAlertsPerHour}
                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, maxAlertsPerHour: parseInt(e.target.value) }))}
                    className="w-32"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>
                Connect with external monitoring and notification services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Slack</h4>
                      <p className="text-sm text-muted-foreground">Send alerts to Slack channels</p>
                    </div>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-8 w-8 text-purple-600" />
                    <div>
                      <h4 className="font-medium">Microsoft Teams</h4>
                      <p className="text-sm text-muted-foreground">Integration with Teams channels</p>
                    </div>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-8 w-8 text-yellow-600" />
                    <div>
                      <h4 className="font-medium">Webhook</h4>
                      <p className="text-sm text-muted-foreground">Custom webhook integrations</p>
                    </div>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}