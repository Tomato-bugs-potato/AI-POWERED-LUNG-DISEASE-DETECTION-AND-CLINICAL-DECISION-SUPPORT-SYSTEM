import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, AlertCircle, Clock, CheckCircle } from "lucide-react"

export default function DoctorDashboard() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Doctor Dashboard</h1>
        <p className="text-muted-foreground">Review AI-analyzed cases and submit diagnostic reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Pending Reviews</CardDescription>
            <CardTitle className="text-3xl">12</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Awaiting diagnosis</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Urgent Cases</CardDescription>
            <CardTitle className="text-3xl text-destructive">3</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span>High priority</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Completed Today</CardDescription>
            <CardTitle className="text-3xl">8</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4" />
              <span>Reports submitted</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Total This Week</CardDescription>
            <CardTitle className="text-3xl">47</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>Cases reviewed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Cases</CardTitle>
          <CardDescription>AI-analyzed scans awaiting your review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                id: "CASE-2024-0234",
                patient: "John Anderson",
                scanType: "Chest X-Ray",
                aiFindings: "Possible pneumonia, right lower lobe",
                priority: "urgent",
                timestamp: "15 minutes ago",
              },
              {
                id: "CASE-2024-0233",
                patient: "Maria Garcia",
                scanType: "Brain CT",
                aiFindings: "No acute abnormalities detected",
                priority: "routine",
                timestamp: "1 hour ago",
              },
              {
                id: "CASE-2024-0232",
                patient: "David Kim",
                scanType: "Chest CT",
                aiFindings: "Small nodule detected, 4mm, right upper lobe",
                priority: "urgent",
                timestamp: "2 hours ago",
              },
            ].map((caseItem) => (
              <div
                key={caseItem.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{caseItem.id}</p>
                    <Badge variant={caseItem.priority === "urgent" ? "destructive" : "outline"}>
                      {caseItem.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Patient: {caseItem.patient}</p>
                  <p className="text-sm">
                    <span className="font-medium">{caseItem.scanType}:</span> {caseItem.aiFindings}
                  </p>
                  <p className="text-xs text-muted-foreground">{caseItem.timestamp}</p>
                </div>
                <Button>Review Case</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
