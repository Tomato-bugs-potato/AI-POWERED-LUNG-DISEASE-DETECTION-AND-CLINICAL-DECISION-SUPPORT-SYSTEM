"use client"

import { Card } from "@/components/ui/card"

interface Detection {
  id: string
  class: string
  confidence: number
  bbox: { x: number; y: number; width: number; height: number }
}

interface PredictionsPanelProps {
  detections: Detection[]
}

export default function PredictionsPanel({ detections }: PredictionsPanelProps) {
  const averageConfidence = Math.round(detections.reduce((sum, d) => sum + d.confidence, 0) / (detections.length || 1))

  return (
    <Card>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Detections</p>
          <p className="text-2xl font-bold">{detections.length}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Average Confidence</p>
          <p className="text-2xl font-bold">{averageConfidence}%</p>
        </div>
      </div>
    </Card>
  )
}
