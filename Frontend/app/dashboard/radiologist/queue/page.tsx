import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export default function RadiologistQueuePage() {
  const scans = [
    {
      id: "SCAN-2024-0567",
      patient: "John Anderson",
      patientId: "P-1045",
      scanType: "Chest X-Ray",
      bodyPart: "Chest",
      uploadedBy: "Dr. Sarah Chen",
      status: "processing",
      priority: "urgent",
      uploaded: "2024-01-15 10:30",
      aiProgress: "87%",
    },
    {
      id: "SCAN-2024-0566",
      patient: "Maria Garcia",
      patientId: "P-1044",
      scanType: "Brain CT",
      bodyPart: "Head",
      uploadedBy: "Dr. Michael Torres",
      status: "ready",
      priority: "routine",
      uploaded: "2024-01-15 09:15",
      aiProgress: "100%",
    },
    {
      id: "SCAN-2024-0565",
      patient: "David Kim",
      patientId: "P-1043",
      scanType: "Chest CT",
      bodyPart: "Chest",
      uploadedBy: "Dr. Sarah Chen",
      status: "ready",
      priority: "urgent",
      uploaded: "2024-01-15 08:45",
      aiProgress: "100%",
    },
    {
      id: "SCAN-2024-0564",
      patient: "Sarah Johnson",
      patientId: "P-1042",
      scanType: "Abdominal CT",
      bodyPart: "Abdomen",
      uploadedBy: "Dr. Emily Watson",
      status: "reviewed",
      priority: "routine",
      uploaded: "2024-01-14 16:20",
      aiProgress: "100%",
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Review Queue</h1>
        <p className="text-muted-foreground">AI-processed scans awaiting radiologist review</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scan Queue</CardTitle>
              <CardDescription>All uploaded scans with AI analysis status</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search scans..." className="pl-8 w-64" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scan ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Scan Type</TableHead>
                <TableHead>Body Part</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>AI Progress</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scans.map((scan) => (
                <TableRow key={scan.id}>
                  <TableCell className="font-medium">{scan.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{scan.patient}</p>
                      <p className="text-xs text-muted-foreground">{scan.patientId}</p>
                    </div>
                  </TableCell>
                  <TableCell>{scan.scanType}</TableCell>
                  <TableCell>{scan.bodyPart}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{scan.uploadedBy}</TableCell>
                  <TableCell>
                    <Badge variant={scan.aiProgress === "100%" ? "default" : "secondary"}>{scan.aiProgress}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={scan.priority === "urgent" ? "destructive" : "outline"}>{scan.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        scan.status === "ready" ? "default" : scan.status === "processing" ? "secondary" : "outline"
                      }
                    >
                      {scan.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{scan.uploaded}</TableCell>
                  <TableCell>
                    <Button size="sm" disabled={scan.status !== "ready"}>
                      {scan.status === "ready"
                        ? "Review"
                        : scan.status === "processing"
                          ? "Processing..."
                          : "Completed"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
