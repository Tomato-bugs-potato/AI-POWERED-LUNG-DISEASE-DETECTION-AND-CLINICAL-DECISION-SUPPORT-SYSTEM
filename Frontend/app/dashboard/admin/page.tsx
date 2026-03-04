import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Activity, AlertTriangle, CheckCircle } from "lucide-react"

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Administrator Dashboard</h1>
        <p className="text-muted-foreground">System overview and user management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">127</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>Active accounts</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>System Health</CardDescription>
            <CardTitle className="text-3xl text-green-600">98%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>All systems operational</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Active Sessions</CardDescription>
            <CardTitle className="text-3xl">43</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>Currently online</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Security Alerts</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">2</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span>Requires attention</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>Active users by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { role: "Radiologists", count: 24, color: "bg-blue-500" },
                { role: "Doctors", count: 68, color: "bg-green-500" },
                { role: "Administrators", count: 8, color: "bg-purple-500" },
                { role: "Technicians", count: 27, color: "bg-orange-500" },
              ].map((item) => (
                <div key={item.role} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm font-medium">{item.role}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{item.count}</span>
                    <span className="text-xs text-muted-foreground">users</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent System Activity</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "New user registered", user: "Dr. Emily Watson", time: "5 minutes ago", type: "info" },
                {
                  action: "Failed login attempt",
                  user: "admin@medai.com",
                  time: "1 hour ago",
                  type: "warning",
                },
                {
                  action: "System backup completed",
                  user: "System",
                  time: "3 hours ago",
                  type: "success",
                },
                {
                  action: "User role updated",
                  user: "Dr. Michael Chen",
                  time: "5 hours ago",
                  type: "info",
                },
              ].map((activity, idx) => (
                <div key={idx} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.user}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={
                        activity.type === "warning"
                          ? "destructive"
                          : activity.type === "success"
                            ? "default"
                            : "outline"
                      }
                    >
                      {activity.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
