import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Key, User, Palette, Shield } from 'lucide-react';
import { ThemeSettings } from '@/components/theme-settings';

async function getUserSettings(userId: string) {
  const [user, apiKeys] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
    }),
    prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        provider: true,
        lastUsedAt: true,
        createdAt: true,
      },
    }),
  ]);

  return { user, apiKeys };
}

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const user = await getUserFromToken(token);
  if (!user) {
    redirect('/login');
  }

  const { user: userSettings, apiKeys } = await getUserSettings(user.id);

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your account, API keys, and application preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="api-keys">
              <Key className="mr-2 h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Settings className="mr-2 h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="mr-2 h-4 w-4" />
              Appearance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your account details and personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" defaultValue={userSettings?.name || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={userSettings?.email || ''} />
                </div>
                <Separator />
                <div className="flex justify-end">
                  <Button>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Manage your API keys for OpenAI, Anthropic, and Gemini
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* OpenAI */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">OpenAI API Key</h4>
                      <p className="text-xs text-muted-foreground">
                        Used for GPT models and embeddings
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      {apiKeys.some(key => key.provider === 'openai') ? 'Update' : 'Add'}
                    </Button>
                  </div>
                  {apiKeys.some(key => key.provider === 'openai') && (
                    <div className="text-xs text-muted-foreground">
                      Last used: {apiKeys.find(key => key.provider === 'openai')?.lastUsedAt ? 
                        new Date(apiKeys.find(key => key.provider === 'openai')!.lastUsedAt!).toLocaleDateString() :
                        'Never'
                      }
                    </div>
                  )}
                </div>

                <Separator />

                {/* Anthropic */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Anthropic API Key</h4>
                      <p className="text-xs text-muted-foreground">
                        Used for Claude models
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      {apiKeys.some(key => key.provider === 'anthropic') ? 'Update' : 'Add'}
                    </Button>
                  </div>
                  {apiKeys.some(key => key.provider === 'anthropic') && (
                    <div className="text-xs text-muted-foreground">
                      Last used: {apiKeys.find(key => key.provider === 'anthropic')?.lastUsedAt ? 
                        new Date(apiKeys.find(key => key.provider === 'anthropic')!.lastUsedAt!).toLocaleDateString() :
                        'Never'
                      }
                    </div>
                  )}
                </div>

                <Separator />

                {/* Gemini */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Google Generative AI Key</h4>
                      <p className="text-xs text-muted-foreground">
                        Used for Gemini models
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      {apiKeys.some(key => key.provider === 'gemini') ? 'Update' : 'Add'}
                    </Button>
                  </div>
                  {apiKeys.some(key => key.provider === 'gemini') && (
                    <div className="text-xs text-muted-foreground">
                      Last used: {apiKeys.find(key => key.provider === 'gemini')?.lastUsedAt ? 
                        new Date(apiKeys.find(key => key.provider === 'gemini')!.lastUsedAt!).toLocaleDateString() :
                        'Never'
                      }
                    </div>
                  )}
                </div>

                <Separator />

                {/* GitHub */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">GitHub Token (Optional)</h4>
                      <p className="text-xs text-muted-foreground">
                        For importing from private repositories
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      {apiKeys.some(key => key.provider === 'github') ? 'Update' : 'Add'}
                    </Button>
                  </div>
                  {apiKeys.some(key => key.provider === 'github') && (
                    <div className="text-xs text-muted-foreground">
                      Last used: {apiKeys.find(key => key.provider === 'github')?.lastUsedAt ? 
                        new Date(apiKeys.find(key => key.provider === 'github')!.lastUsedAt!).toLocaleDateString() :
                        'Never'
                      }
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Import & Automation</CardTitle>
                <CardDescription>
                  Configure how the system handles imports and AI-powered features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Automation Level</Label>
                      <p className="text-xs text-muted-foreground">
                        How much AI automation to apply during imports
                      </p>
                    </div>
                    <Select defaultValue={userSettings?.automationLevel || 'auto-suggest'}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto-apply">Auto-apply</SelectItem>
                        <SelectItem value="auto-suggest">Auto-suggest</SelectItem>
                        <SelectItem value="manual-only">Manual-only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-classify imports</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically detect item types during import
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Duplicate detection</Label>
                      <p className="text-xs text-muted-foreground">
                        Flag potential duplicates during import
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Generate optimizations</Label>
                      <p className="text-xs text-muted-foreground">
                        Create model-specific versions of prompts
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <ThemeSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}