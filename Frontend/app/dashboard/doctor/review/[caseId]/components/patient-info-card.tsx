"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronDown } from "lucide-react"
import { useState } from "react"

interface Patient {
  id: string
  name: string
  age: number
  sex: string
  medicalHistory: string[]
  previousDiagnoses: string[]
}

export default function PatientInfoCard({ patient }: { patient: Patient }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {patient.name}
              <Badge variant="secondary">
                {patient.age}y {patient.sex}
              </Badge>
            </CardTitle>
            <CardDescription>Patient ID: {patient.id}</CardDescription>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Medical History</h4>
            <div className="flex flex-wrap gap-2">
              {patient.medicalHistory.map((item, idx) => (
                <Badge key={idx} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Previous Diagnoses</h4>
            <ul className="text-sm space-y-1">
              {patient.previousDiagnoses.map((diagnosis, idx) => (
                <li key={idx} className="text-muted-foreground">
                  • {diagnosis}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
