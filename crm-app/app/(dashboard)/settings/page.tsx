'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { User, Bell, Shield, Webhook, Palette, Moon, Sun, Monitor, SidebarClose, SidebarOpen, HardDrive, Mail } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'
import Link from 'next/link'

export default function SettingsPage() {
  const { toast } = useToast()
  const { theme, setTheme, toggleTheme, compactMode, toggleCompactMode } = useTheme()
  const [profileData, setProfileData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 234 567 8900'
  })

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    toast({
      title: 'Success',
      description: 'Profile updated successfully',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-black dark:text-white">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your Link CRM preferences and configuration</p>
      </div>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList className="bg-cream dark:bg-gray-800">
          <TabsTrigger value="appearance" className="data-[state=active]:bg-coral data-[state=active]:text-white">
            Appearance
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-coral data-[state=active]:text-white">
            Integrations
          </TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-coral data-[state=active]:text-white">
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-coral data-[state=active]:text-white">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-coral data-[state=active]:text-white">
            Security
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="data-[state=active]:bg-coral data-[state=active]:text-white">
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4">
          <Card className="border-cream-dark dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-coral" />
                Appearance
              </CardTitle>
              <CardDescription>Customize the look and feel of Link CRM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose between light and dark mode
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {theme} mode
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    onClick={() => setTheme('light')}
                    className="justify-start h-auto py-3"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Sun className="h-5 w-5" />
                      <span className="text-xs">Light</span>
                    </div>
                  </Button>
                  
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    onClick={() => setTheme('dark')}
                    className="justify-start h-auto py-3"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Moon className="h-5 w-5" />
                      <span className="text-xs">Dark</span>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    disabled
                    className="justify-start h-auto py-3 opacity-50"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      <span className="text-xs">System</span>
                    </div>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Quick Theme Toggle</Label>
                  <p className="text-xs text-muted-foreground">
                    Toggle between light and dark mode
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  className="gap-2"
                >
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  Switch to {theme === 'light' ? 'Dark' : 'Light'}
                </Button>
              </div>

              <div className="flex items-center justify-between py-3 border-t">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Sidebar Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Toggle between compact and expanded sidebar
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {compactMode ? 'Compact' : 'Expanded'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleCompactMode}
                    className="gap-2"
                  >
                    {compactMode ? <SidebarOpen className="h-4 w-4" /> : <SidebarClose className="h-4 w-4" />}
                    {compactMode ? 'Expand' : 'Compact'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card className="border-cream-dark dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-coral" />
                Google Services
              </CardTitle>
              <CardDescription>Connect your Google services for seamless integration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-cream-dark dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-black dark:text-white">Google Drive</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Access and manage documents</p>
                    </div>
                  </div>
                  <Button className="w-full bg-coral hover:bg-coral-dark">
                    Connect to Google Drive
                  </Button>
                </div>

                <div className="border border-cream-dark dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <Mail className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-black dark:text-white">Gmail</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email integration and automation</p>
                    </div>
                  </div>
                  <Button className="w-full bg-coral hover:bg-coral-dark">
                    Connect to Gmail
                  </Button>
                </div>
              </div>

              <div className="bg-cream-light dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-black dark:text-white mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-coral" />
                  Security & Privacy
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your Google account credentials are securely encrypted and only used for the specific integrations you authorize. You can disconnect at any time.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card className="border-cream-dark">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-coral" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      className="bg-cream-light border-cream-dark"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      className="bg-cream-light border-cream-dark"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="bg-cream-light border-cream-dark"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="bg-cream-light border-cream-dark"
                  />
                </div>
                <Button type="submit" className="bg-coral hover:bg-coral-dark">
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="border-cream-dark">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-coral" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive email updates about your CRM activities</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Deal Updates</p>
                    <p className="text-sm text-gray-600">Get notified when deals move stages</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Contact Activity</p>
                    <p className="text-sm text-gray-600">Alerts for new contact interactions</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="border-cream-dark">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-coral" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Change Password</Label>
                  <Button variant="outline" className="w-full justify-start">
                    Update Password
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Two-Factor Authentication</Label>
                  <Button variant="outline" className="w-full justify-start">
                    Enable 2FA
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Session Management</Label>
                  <Button variant="outline" className="w-full justify-start">
                    View Active Sessions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card className="border-cream-dark">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-coral" />
                n8n Integration
              </CardTitle>
              <CardDescription>Configure webhooks and automation with n8n</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Set up webhook integration with n8n to automate workflows and sync data with external systems.
                </p>
                <Link href="/settings/webhooks">
                  <Button className="bg-coral hover:bg-coral-dark">
                    <Webhook className="mr-2 h-4 w-4" />
                    Configure Webhooks
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}