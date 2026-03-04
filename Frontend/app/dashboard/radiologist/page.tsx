import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, AlertCircle, CheckCircle2, Clock, Upload } from "lucide-react"
import Link from "next/link"

export default function RadiologistDashboard() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Radiologist Dashboard</h1>
        <p className="text-muted-foreground mt-1">AI-assisted medical imaging analysis and review</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">4 high priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Alerts</CardTitle>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Scans</CardTitle>
            <Activity className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145</div>
            <p className="text-xs text-muted-foreground">In database</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and workflows</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard/radiologist/upload">
              <Upload className="w-4 h-4" />
              Upload New Scan
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/radiologist/queue">View Review Queue</Link>
          </Button>
          <Button variant="outline">AI Analysis Report</Button>
        </CardContent>
      </Card>

      {/* Recent Scans */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scans Requiring Review</CardTitle>
          <CardDescription>Prioritized by AI confidence and urgency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                id: "SCN-2024-001",
                patient: "John Doe",
                type: "Chest X-Ray",
                priority: "high",
                aiConfidence: 92,
                findings: "Potential mass detected",
              },
              {
                id: "SCN-2024-002",
                patient: "Jane Smith",
                type: "CT Scan - Abdomen",
                priority: "medium",
                aiConfidence: 78,
                findings: "Normal scan",
              },
              {
                id: "SCN-2024-003",
                patient: "Robert Johnson",
                type: "X-Ray - Leg",
                priority: "low",
                aiConfidence: 95,
                findings: "Fracture detected",
              },
            ].map((scan) => (
              <div key={scan.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{scan.patient}</p>
                    <Badge
                      variant={
                        scan.priority === "high" ? "destructive" : scan.priority === "medium" ? "outline" : "secondary"
                      }
                    >
                      {scan.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{scan.type}</p>
                  <p className="text-sm mt-1">AI Findings: {scan.findings}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{scan.aiConfidence}%</p>
                    <p className="text-xs text-muted-foreground">AI Confidence</p>
                  </div>
                  <Button size="sm">Review</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
