import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { RealtimeMetrics } from '@/components/realtime-metrics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Activity, 
  TrendingUp, 
  Settings, 
  Download,
  Bell,
  RefreshCw,
  Info
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

async function getInitialAnalytics(userId: string) {
  try {
    // In a real app, you'd fetch from your API here
    // For now, we'll let the component handle the initial fetch
    return null;
  } catch (error) {
    console.error('Failed to fetch initial analytics:', error);
    return null;
  }
}

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const user = await getUserFromToken(token);
  if (!user) {
    redirect('/login');
  }

  const initialData = await getInitialAnalytics(user.id);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Monitor your AI context management performance and insights
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button variant="outline">
            <Bell className="h-4 w-4 mr-2" />
            Alerts
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This analytics dashboard provides real-time insights into your AI context management usage, 
          performance metrics, and optimization opportunities. Data is updated automatically every 30 seconds.
        </AlertDescription>
      </Alert>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="realtime" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Real-time</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Insights</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          }>
            <AnalyticsDashboard 
              userId={user.id}
              initialData={initialData}
              realtime={false}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          }>
            <RealtimeMetrics 
              userId={user.id}
              autoUpdate={true}
              updateInterval={5}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Performance Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      AI Processing Efficiency
                    </span>
                    <Badge variant="default">Good</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Cost Optimization Potential
                    </span>
                    <Badge variant="secondary">Medium</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Content Quality Trend
                    </span>
                    <Badge variant="default">Improving</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      User Engagement
                    </span>
                    <Badge variant="default">High</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900">Optimization Opportunity</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Consider enabling auto-optimization for prompts with low quality scores 
                      to improve performance by an estimated 15%.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900">Cost Savings</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Implement semantic deduplication to reduce token usage by up to 25% 
                      while maintaining content quality.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-900">Content Organization</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      Your content clustering shows 3 underutilized folders. 
                      Consider reorganizing content for better discoverability.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Patterns */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Peak Usage Hours</span>
                      <span className="font-medium">9 AM - 11 AM</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Most active during morning hours with 40% of daily requests
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Most Used Features</span>
                      <span className="font-medium">Optimization, Search</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      80% of activity focuses on content optimization and semantic search
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Content Type Preference</span>
                      <span className="font-medium">Prompts (65%)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Prompts are your primary content type, followed by agents (25%)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export & Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export Monthly Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Alerts
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Optimization Suggestions
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Bell className="h-4 w-4 mr-2" />
                    Set Performance Goals
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}