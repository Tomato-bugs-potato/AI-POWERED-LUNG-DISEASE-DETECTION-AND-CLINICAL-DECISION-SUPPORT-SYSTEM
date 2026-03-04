import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react"

export default function SystemLogsPage() {
  const systemLogs = [
    {
      timestamp: "2024-01-15 10:35:22",
      level: "error",
      component: "AI Inference Service",
      message: "Model inference timeout for CASE-2024-0568",
      stackTrace: "Error at inference.py:245\n  at ModelService.predict()\n  Timeout after 30s",
    },
    {
      timestamp: "2024-01-15 10:30:15",
      level: "info",
      component: "Backend API",
      message: "User U-1001 uploaded new scan SCAN-2024-0567",
      stackTrace: null,
    },
    {
      timestamp: "2024-01-15 10:15:32",
      level: "warning",
      component: "Database",
      message: "Slow query detected: SELECT * FROM cases (2.4s)",
      stackTrace: null,
    },
    {
      timestamp: "2024-01-15 10:00:00",
      level: "info",
      component: "System",
      message: "Automated backup completed successfully",
      stackTrace: null,
    },
    {
      timestamp: "2024-01-15 09:45:20",
      level: "error",
      component: "Authentication Service",
      message: "Failed login attempt from IP 203.45.123.89",
      stackTrace: null,
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Logs Monitoring</h1>
        <p className="text-muted-foreground">Real-time system health and error tracking</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>System Status</CardDescription>
            <CardTitle className="text-2xl text-green-600">Operational</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>All services running</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Errors (24h)</CardDescription>
            <CardTitle className="text-2xl text-red-600">12</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="w-4 h-4 text-red-600" />
              <span>Critical issues</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Warnings (24h)</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">28</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span>Needs attention</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Uptime</CardDescription>
            <CardTitle className="text-2xl">99.8%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>Last 30 days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Real-Time System Logs</CardTitle>
              <CardDescription>Live feed of system events and errors</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600">
                Live
              </Badge>
              <Button variant="outline" size="sm">
                Pause
              </Button>
              <Button variant="outline" size="sm">
                Download Logs
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 font-mono text-sm bg-muted/30 rounded-lg p-4 max-h-[600px] overflow-y-auto">
            {systemLogs.map((log, idx) => (
              <div
                key={idx}
                className={`border-l-4 pl-3 py-2 ${
                  log.level === "error"
                    ? "border-red-500 bg-red-500/5"
                    : log.level === "warning"
                      ? "border-yellow-500 bg-yellow-500/5"
                      : "border-blue-500 bg-blue-500/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{log.timestamp}</span>
                  <Badge
                    variant={log.level === "error" ? "destructive" : log.level === "warning" ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {log.level.toUpperCase()}
                  </Badge>
                  <span className="text-xs font-semibold">[{log.component}]</span>
                </div>
                <p className="mt-1 text-sm">{log.message}</p>
                {log.stackTrace && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      View stack trace
                    </summary>
                    <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap bg-background/50 p-2 rounded">
                      {log.stackTrace}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
