import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download, Eye } from "lucide-react"

export default function AdminLogsPage() {
  const logs = [
    {
      id: "LOG-20240115-001",
      timestamp: "2024-01-15 10:30:15",
      user: "Dr. Sarah Chen",
      userId: "U-1001",
      role: "Radiologist",
      action: "Image Upload",
      caseId: "CASE-2024-0567",
      ipAddress: "192.168.1.45",
      status: "success",
      details: "Uploaded chest X-ray image",
    },
    {
      id: "LOG-20240115-002",
      timestamp: "2024-01-15 10:15:32",
      user: "Dr. Michael Torres",
      userId: "U-1002",
      role: "Doctor",
      action: "Diagnosis Submitted",
      caseId: "CASE-2024-0566",
      ipAddress: "192.168.1.67",
      status: "success",
      details: "Submitted diagnosis for brain CT scan",
    },
    {
      id: "LOG-20240115-003",
      timestamp: "2024-01-15 09:45:20",
      user: "admin@medai.com",
      userId: "U-1004",
      role: "Administrator",
      action: "Failed Login Attempt",
      caseId: "-",
      ipAddress: "203.45.123.89",
      status: "failed",
      details: "Invalid password - 3rd attempt",
    },
    {
      id: "LOG-20240115-004",
      timestamp: "2024-01-15 09:30:10",
      user: "Dr. Emily Watson",
      userId: "U-1003",
      role: "Doctor",
      action: "Report Generated",
      caseId: "CASE-2024-0565",
      ipAddress: "192.168.1.92",
      status: "success",
      details: "Generated PDF diagnostic report",
    },
    {
      id: "LOG-20240115-005",
      timestamp: "2024-01-15 09:00:45",
      user: "System",
      userId: "SYSTEM",
      role: "System",
      action: "Automatic Backup",
      caseId: "-",
      ipAddress: "127.0.0.1",
      status: "warning",
      details: "Backup completed with warnings (2 files skipped)",
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Access Logs</h1>
        <p className="text-muted-foreground">Monitor all system activities and user actions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Real-time system audit trail with HIPAA compliance tracking</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search logs..." className="pl-8 w-64" />
              </div>
              <Button variant="outline">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Log ID</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Case ID</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-xs">{log.id}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{log.timestamp}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{log.user}</p>
                      <p className="text-xs text-muted-foreground">{log.userId}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {log.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.caseId}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.ipAddress}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"
                      }
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                      View
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
