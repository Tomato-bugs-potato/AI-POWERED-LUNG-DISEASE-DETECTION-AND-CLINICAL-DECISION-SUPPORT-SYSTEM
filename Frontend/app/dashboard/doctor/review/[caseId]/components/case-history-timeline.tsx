"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Visit {
  date: string
  diagnosis: string
  provider: string
}

export default function CaseHistoryTimeline({ visits }: { visits: Visit[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Case History Timeline</CardTitle>
        <CardDescription>Previous visits and diagnoses in chronological order</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {visits.map((visit, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 bg-primary rounded-full" />
                {idx !== visits.length - 1 && <div className="w-1 h-12 bg-border mt-2" />}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-foreground">{visit.diagnosis}</p>
                  <Badge variant="outline">{visit.date}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Provider: {visit.provider}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
