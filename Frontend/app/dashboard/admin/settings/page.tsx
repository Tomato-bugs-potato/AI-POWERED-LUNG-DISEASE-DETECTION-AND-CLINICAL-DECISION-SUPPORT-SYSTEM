import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground">Configure system preferences and security settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis Settings</CardTitle>
            <CardDescription>Configure AI model parameters and thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confidence">Minimum Confidence Threshold</Label>
              <div className="flex items-center gap-4">
                <Input id="confidence" type="number" defaultValue="85" min="0" max="100" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                AI findings below this threshold will be flagged for manual review
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">AI Model Version</Label>
              <div className="flex items-center gap-2">
                <Input id="model" defaultValue="MedAI v3.2.1" disabled />
                <Badge variant="default">Latest</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-flag High Risk Cases</Label>
                <p className="text-xs text-muted-foreground">Automatically prioritize urgent findings</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Batch Processing</Label>
                <p className="text-xs text-muted-foreground">Process multiple scans simultaneously</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>Manage authentication and access controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Two-Factor Authentication</Label>
                <p className="text-xs text-muted-foreground">All users must enable 2FA</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Session Timeout</Label>
                <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Session Duration (minutes)</Label>
              <Input id="timeout" type="number" defaultValue="30" min="5" max="120" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Audit Logging</Label>
                <p className="text-xs text-muted-foreground">Record all system access and changes</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>HIPAA Compliance Mode</Label>
                <p className="text-xs text-muted-foreground">Enforce strict data protection rules</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Maintenance</CardTitle>
            <CardDescription>Database and backup configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Last Database Backup</Label>
              <div className="flex items-center gap-2">
                <Input defaultValue="2024-01-15 03:00 AM" disabled />
                <Badge variant="default">Success</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Automatic Daily Backups</Label>
                <p className="text-xs text-muted-foreground">Scheduled at 3:00 AM</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retention">Backup Retention (days)</Label>
              <Input id="retention" type="number" defaultValue="30" min="7" max="365" />
            </div>

            <Button variant="outline" className="w-full bg-transparent">
              Run Manual Backup Now
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Configure system alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Send alerts via email</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Critical Alert Notifications</Label>
                <p className="text-xs text-muted-foreground">Notify admins of urgent system issues</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>User Activity Alerts</Label>
                <p className="text-xs text-muted-foreground">Track unusual user behavior</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Notification Email</Label>
              <Input id="admin-email" type="email" defaultValue="admin@medai.com" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Reset to Defaults</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
