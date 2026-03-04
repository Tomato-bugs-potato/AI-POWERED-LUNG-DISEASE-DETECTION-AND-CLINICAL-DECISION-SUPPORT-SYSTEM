import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Eye } from "lucide-react"
import Link from "next/link"

function PatientTableContent() {
  const patients = [
    {
      id: "P-1045",
      name: "John Anderson",
      age: 62,
      gender: "Male",
      lastVisit: "2024-01-15",
      totalScans: 8,
      pendingCases: 1,
      conditions: ["Hypertension", "Type 2 Diabetes"],
    },
    {
      id: "P-1044",
      name: "Maria Garcia",
      age: 45,
      gender: "Female",
      lastVisit: "2024-01-15",
      totalScans: 3,
      pendingCases: 1,
      conditions: ["Migraine"],
    },
    {
      id: "P-1043",
      name: "David Kim",
      age: 58,
      gender: "Male",
      lastVisit: "2024-01-15",
      totalScans: 12,
      pendingCases: 1,
      conditions: ["COPD", "Former smoker"],
    },
    {
      id: "P-1042",
      name: "Sarah Johnson",
      age: 34,
      gender: "Female",
      lastVisit: "2024-01-14",
      totalScans: 2,
      pendingCases: 0,
      conditions: [],
    },
    {
      id: "P-1041",
      name: "Michael Brown",
      age: 71,
      gender: "Male",
      lastVisit: "2024-01-14",
      totalScans: 15,
      pendingCases: 0,
      conditions: ["Heart Failure", "Hypertension", "Atrial Fibrillation"],
    },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Patient Records</CardTitle>
            <CardDescription>Complete patient database with imaging history</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or ID..." className="pl-8 w-64" />
            </div>
            <Button>Advanced Search</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Age / Gender</TableHead>
              <TableHead>Medical Conditions</TableHead>
              <TableHead>Total Scans</TableHead>
              <TableHead>Pending Cases</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium">{patient.id}</TableCell>
                <TableCell>
                  <p className="font-medium">{patient.name}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm">
                    {patient.age} yrs / {patient.gender}
                  </p>
                </TableCell>
                <TableCell>
                  {patient.conditions.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {patient.conditions.map((condition, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">None recorded</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{patient.totalScans}</Badge>
                </TableCell>
                <TableCell>
                  {patient.pendingCases > 0 ? (
                    <Badge variant="destructive">{patient.pendingCases}</Badge>
                  ) : (
                    <Badge variant="outline">0</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{patient.lastVisit}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link href={`/doctor/patients/${patient.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                        View Records
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default function DoctorPatientsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Patient Directory</h1>
        <p className="text-muted-foreground">Search and view patient medical records and imaging history</p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <PatientTableContent />
      </Suspense>
    </div>
  )
}
