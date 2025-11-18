'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase'
import { WebhookService } from '@/lib/webhooks/service'
import { WebhookSecurity } from '@/lib/webhooks/security'
import { WebhookEventType, WebhookLog } from '@/types/webhooks'
import { 
  Webhook, 
  Settings, 
  Activity, 
  RefreshCw, 
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react'

interface WebhookSettings {
  id?: string
  n8n_webhook_url: string
  n8n_api_key: string
  webhook_secret: string
  is_enabled: boolean
  retry_attempts: number
  retry_delay_seconds: number
  enabled_events: WebhookEventType[]
}

const WEBHOOK_EVENTS: { value: WebhookEventType; label: string; description: string }[] = [
  { value: 'contact.created', label: 'Contact Created', description: 'When a new contact is added' },
  { value: 'contact.updated', label: 'Contact Updated', description: 'When a contact is modified' },
  { value: 'contact.deleted', label: 'Contact Deleted', description: 'When a contact is removed' },
  { value: 'deal.created', label: 'Deal Created', description: 'When a new deal is created' },
  { value: 'deal.updated', label: 'Deal Updated', description: 'When a deal is modified' },
  { value: 'deal.stage_changed', label: 'Deal Stage Changed', description: 'When a deal moves between stages' },
  { value: 'company.created', label: 'Company Created', description: 'When a new company is added' },
  { value: 'company.updated', label: 'Company Updated', description: 'When a company is modified' },
  { value: 'note.created', label: 'Note Created', description: 'When a note is added' },
  { value: 'file.uploaded', label: 'File Uploaded', description: 'When a file is uploaded' },
  { value: 'activity.logged', label: 'Activity Logged', description: 'When an activity is recorded' },
]

export default function WebhooksPage() {
  const [settings, setSettings] = useState<WebhookSettings>({
    n8n_webhook_url: '',
    n8n_api_key: '',
    webhook_secret: '',
    is_enabled: false,
    retry_attempts: 3,
    retry_delay_seconds: 60,
    enabled_events: []
  })
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([])
  const [stats, setStats] = useState({
    totalEvents: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    pendingDeliveries: 0
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testing, setTesting] = useState(false)
  
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadWebhookData()
  }, [])

  const loadWebhookData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load webhook settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('webhook_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Failed to load webhook settings:', settingsError)
      } else if (settingsData) {
        setSettings({
          id: settingsData.id,
          n8n_webhook_url: settingsData.n8n_webhook_url || '',
          n8n_api_key: settingsData.n8n_api_key || '',
          webhook_secret: settingsData.webhook_secret || '',
          is_enabled: settingsData.is_enabled,
          retry_attempts: settingsData.retry_attempts,
          retry_delay_seconds: settingsData.retry_delay_seconds,
          enabled_events: settingsData.enabled_events || []
        })
      }

      // Load webhook logs and stats
      const webhookService = new WebhookService(supabase)
      const [logs, statsData] = await Promise.all([
        webhookService.getWebhookLogs(user.id, 20),
        webhookService.getWebhookStats(user.id)
      ])

      setWebhookLogs(logs)
      setStats(statsData)

    } catch (error) {
      console.error('Failed to load webhook data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load webhook data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('webhook_settings')
        .upsert({
          user_id: user.id,
          n8n_webhook_url: settings.n8n_webhook_url,
          n8n_api_key: settings.n8n_api_key,
          webhook_secret: settings.webhook_secret,
          is_enabled: settings.is_enabled,
          retry_attempts: settings.retry_attempts,
          retry_delay_seconds: settings.retry_delay_seconds,
          enabled_events: settings.enabled_events
        })

      if (error) {
        throw error
      }

      toast({
        title: 'Success',
        description: 'Webhook settings saved successfully',
      })

    } catch (error) {
      console.error('Failed to save webhook settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save webhook settings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTestWebhook = async () => {
    setTesting(true)
    try {
      const response = await fetch('/api/webhooks/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'contact.created',
          data: {
            test: true,
            message: 'This is a test webhook from your CRM',
            timestamp: new Date().toISOString()
          }
        })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Test webhook sent successfully',
        })
        // Reload logs to show the test webhook
        await loadWebhookData()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send test webhook')
      }

    } catch (error) {
      console.error('Failed to send test webhook:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send test webhook',
        variant: 'destructive',
      })
    } finally {
      setTesting(false)
      setTestDialogOpen(false)
    }
  }

  const generateNewSecret = () => {
    const newSecret = WebhookSecurity.generateWebhookSecret()
    setSettings(prev => ({ ...prev, webhook_secret: newSecret }))
  }

  const generateNewApiKey = () => {
    const newApiKey = WebhookSecurity.generateApiKey()
    setSettings(prev => ({ ...prev, n8n_api_key: newApiKey }))
  }

  const toggleEvent = (event: WebhookEventType) => {
    setSettings(prev => ({
      ...prev,
      enabled_events: prev.enabled_events.includes(event)
        ? prev.enabled_events.filter(e => e !== event)
        : [...prev.enabled_events, event]
    }))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'retrying':
        return <RefreshCw className="h-4 w-4 text-blue-700 dark:text-blue-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      delivered: 'default',
      failed: 'destructive',
      pending: 'secondary',
      retrying: 'secondary'
    }
    return variants[status] || 'secondary'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-coral" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black flex items-center gap-2">
            <Webhook className="h-8 w-8 text-coral" />
            Webhook Settings
          </h1>
          <p className="text-muted-foreground mt-2">Configure n8n integration and webhook events</p>
        </div>
        <Button 
          onClick={() => setTestDialogOpen(true)}
          disabled={!settings.is_enabled || !settings.n8n_webhook_url}
          className="bg-coral hover:bg-coral-dark"
        >
          <TestTube className="mr-2 h-4 w-4" />
          Test Webhook
        </Button>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="bg-cream">
          <TabsTrigger value="settings" className="data-[state=active]:bg-coral data-[state=active]:text-white">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-coral data-[state=active]:text-white">
            <Activity className="mr-2 h-4 w-4" />
            Logs & Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Configuration Card */}
          <Card className="border-cream-dark">
            <CardHeader>
              <CardTitle>n8n Configuration</CardTitle>
              <CardDescription>
                Configure your n8n webhook endpoint and authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.is_enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_enabled: checked }))}
                />
                <Label>Enable Webhooks</Label>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://your-n8n-instance.com/webhook/your-webhook-id"
                    value={settings.n8n_webhook_url}
                    onChange={(e) => setSettings(prev => ({ ...prev, n8n_webhook_url: e.target.value }))}
                    className="bg-cream-light border-cream-dark"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Your n8n API key"
                      value={settings.n8n_api_key}
                      onChange={(e) => setSettings(prev => ({ ...prev, n8n_api_key: e.target.value }))}
                      className="bg-cream-light border-cream-dark"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={generateNewApiKey}
                      className="whitespace-nowrap"
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook-secret">Webhook Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      id="webhook-secret"
                      type="password"
                      placeholder="Webhook signing secret"
                      value={settings.webhook_secret}
                      onChange={(e) => setSettings(prev => ({ ...prev, webhook_secret: e.target.value }))}
                      className="bg-cream-light border-cream-dark"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={generateNewSecret}
                      className="whitespace-nowrap"
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="retry-attempts">Retry Attempts</Label>
                    <Input
                      id="retry-attempts"
                      type="number"
                      min="1"
                      max="10"
                      value={settings.retry_attempts}
                      onChange={(e) => setSettings(prev => ({ ...prev, retry_attempts: parseInt(e.target.value) || 3 }))}
                      className="bg-cream-light border-cream-dark"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retry-delay">Retry Delay (seconds)</Label>
                    <Input
                      id="retry-delay"
                      type="number"
                      min="30"
                      max="3600"
                      value={settings.retry_delay_seconds}
                      onChange={(e) => setSettings(prev => ({ ...prev, retry_delay_seconds: parseInt(e.target.value) || 60 }))}
                      className="bg-cream-light border-cream-dark"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSaveSettings} 
                disabled={saving}
                className="bg-coral hover:bg-coral-dark"
              >
                {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Configuration
              </Button>
            </CardContent>
          </Card>

          {/* Events Card */}
          <Card className="border-cream-dark">
            <CardHeader>
              <CardTitle>Webhook Events</CardTitle>
              <CardDescription>
                Select which events should trigger webhooks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {WEBHOOK_EVENTS.map((event) => (
                  <div key={event.value} className="flex items-start space-x-3 p-3 rounded-lg border border-cream-dark">
                    <Switch
                      checked={settings.enabled_events.includes(event.value)}
                      onCheckedChange={() => toggleEvent(event.value)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{event.label}</div>
                      <div className="text-sm text-muted-foreground">{event.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-cream-dark">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.totalEvents}</div>
                <div className="text-sm text-muted-foreground">Total Events</div>
              </CardContent>
            </Card>
            <Card className="border-cream-dark">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.successfulDeliveries}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </CardContent>
            </Card>
            <Card className="border-cream-dark">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats.failedDeliveries}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </CardContent>
            </Card>
            <Card className="border-cream-dark">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingDeliveries}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Webhook Logs */}
          <Card className="border-cream-dark">
            <CardHeader>
              <CardTitle>Recent Webhook Deliveries</CardTitle>
              <CardDescription>
                Latest webhook delivery attempts and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhookLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.event_type}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <Badge variant={getStatusBadge(log.status)}>
                            {log.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{log.attempts}</TableCell>
                      <TableCell>
                        {log.response_status ? (
                          <Badge variant={log.response_status >= 200 && log.response_status < 300 ? 'default' : 'destructive'}>
                            {log.response_status}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {webhookLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No webhook deliveries yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Webhook Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Test Webhook</DialogTitle>
            <DialogDescription>
              Send a test webhook to verify your n8n integration is working correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will send a test <code>contact.created</code> event to your configured webhook URL.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTestWebhook} 
              disabled={testing}
              className="bg-coral hover:bg-coral-dark"
            >
              {testing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <TestTube className="mr-2 h-4 w-4" />}
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}