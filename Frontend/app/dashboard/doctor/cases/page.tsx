import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"


export default function DoctorCasesPage() {
  const cases = [
    {
      id: "CASE-2024-0234",
      patient: "John Anderson",
      patientId: "P-1045",
      scanType: "Chest X-Ray",
      aiConfidence: "94%",
      findings: "Possible pneumonia, right lower lobe",
      status: "pending",
      priority: "urgent",
      uploaded: "2024-01-15 09:30",
    },
    {
      id: "CASE-2024-0233",
      patient: "Maria Garcia",
      patientId: "P-1044",
      scanType: "Brain CT",
      aiConfidence: "89%",
      findings: "No acute abnormalities detected",
      status: "pending",
      priority: "routine",
      uploaded: "2024-01-15 08:15",
    },
    {
      id: "CASE-2024-0232",
      patient: "David Kim",
      patientId: "P-1043",
      scanType: "Chest CT",
      aiConfidence: "91%",
      findings: "Small nodule detected, 4mm, right upper lobe",
      status: "pending",
      priority: "urgent",
      uploaded: "2024-01-15 07:45",
    },
    {
      id: "CASE-2024-0231",
      patient: "Sarah Johnson",
      patientId: "P-1042",
      scanType: "Abdominal CT",
      aiConfidence: "87%",
      findings: "Normal abdomen, no acute findings",
      status: "reviewed",
      priority: "routine",
      uploaded: "2024-01-14 16:20",
    },
    {
      id: "CASE-2024-0230",
      patient: "Michael Brown",
      patientId: "P-1041",
      scanType: "Chest X-Ray",
      aiConfidence: "96%",
      findings: "Cardiomegaly, possible heart failure",
      status: "reviewed",
      priority: "urgent",
      uploaded: "2024-01-14 15:10",
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Case Review Queue</h1>
        <p className="text-muted-foreground">Review AI-analyzed scans and submit diagnostic reports</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Cases</CardTitle>
              <CardDescription>AI-analyzed scans awaiting doctor review</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search cases..." className="pl-8 w-64" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Scan Type</TableHead>
                <TableHead>AI Findings</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((caseItem) => (
                <TableRow key={caseItem.id}>
                  <Link href={`/dashboard/doctor/review/${caseItem.id}`}>
                  <TableCell className="font-medium">{caseItem.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{caseItem.patient}</p>
                      <p className="text-xs text-muted-foreground">{caseItem.patientId}</p>
                    </div>
                  </TableCell>
                  <TableCell>{caseItem.scanType}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate">{caseItem.findings}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={Number.parseInt(caseItem.aiConfidence) > 90 ? "default" : "secondary"}>
                      {caseItem.aiConfidence}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={caseItem.priority === "urgent" ? "destructive" : "outline"}>
                      {caseItem.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={caseItem.status === "pending" ? "secondary" : "default"}>{caseItem.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{caseItem.uploaded}</TableCell>
                  <TableCell>
                    <Button size="sm" variant={caseItem.status === "pending" ? "default" : "outline"}>
                      {caseItem.status === "pending" ? "Review" : "View"}
                    </Button>
                  </TableCell>
                  </Link>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
