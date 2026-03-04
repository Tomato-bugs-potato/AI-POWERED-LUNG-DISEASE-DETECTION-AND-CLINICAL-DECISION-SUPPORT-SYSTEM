"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Finding {
  id: number
  disease: string
  confidence: number
  location: string
  coordinates: { x: number; y: number; width: number; height: number }
}

interface RadiologistReview {
  notes: string
  modifications: {
    added: string[]
    removed: string[]
    adjusted: string[]
  }
  name: string
  timestamp: string
  confidence: string
}

export default function AnalysisPanel({
  aiFindings,
  radiologistReview,
}: {
  aiFindings: Finding[]
  radiologistReview: RadiologistReview
}) {
  return (
    <Tabs defaultValue="ai" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="ai">AI Findings</TabsTrigger>
        <TabsTrigger value="radiologist">Radiologist</TabsTrigger>
      </TabsList>

      <TabsContent value="ai" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Model Findings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiFindings.map((finding) => (
              <div key={finding.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{finding.disease}</span>
                  <Badge variant={finding.confidence > 85 ? "default" : "secondary"}>{finding.confidence}%</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Location: {finding.location}</p>
                  <p>
                    Coordinates: ({finding.coordinates.x}, {finding.coordinates.y})
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="radiologist" className="mt-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-lg">Radiologist Review</CardTitle>
              <CardDescription className="text-xs">
                {radiologistReview.name} • {radiologistReview.timestamp}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <p className="font-medium mb-1">Assessment: {radiologistReview.confidence} Confidence</p>
                <p className="text-sm">{radiologistReview.notes}</p>
              </AlertDescription>
            </Alert>

            {radiologistReview.modifications.added.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-2">Added Detections</h4>
                <ul className="text-sm space-y-1">
                  {radiologistReview.modifications.added.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">
                      + {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {radiologistReview.modifications.adjusted.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-blue-700 mb-2">Adjusted Classifications</h4>
                <ul className="text-sm space-y-1">
                  {radiologistReview.modifications.adjusted.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">
                      ~ {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
