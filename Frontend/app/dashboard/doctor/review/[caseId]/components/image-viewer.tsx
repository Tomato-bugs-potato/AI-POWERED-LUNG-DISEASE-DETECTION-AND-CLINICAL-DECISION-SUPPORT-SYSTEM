"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ZoomIn, ZoomOut, Eye } from "lucide-react"
import { useState } from "react"

interface Finding {
  id: number
  disease: string
  confidence: number
  location: string
  coordinates: { x: number; y: number; width: number; height: number }
}

export default function ImageViewer({
  original,
  annotated,
  findings,
}: {
  original: string
  annotated: string
  findings: Finding[]
}) {
  const [zoomLevel, setZoomLevel] = useState(100)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [viewMode, setViewMode] = useState<"original" | "annotated" | "comparison">("annotated")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medical Imaging</CardTitle>
        <CardDescription>Original and radiologist-annotated images</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="annotated">Annotated</TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="mt-4">
            <div
              className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center"
              style={{ height: "500px" }}
            >
              <img
                src={original || "/placeholder.svg"}
                alt="Original X-ray"
                className="object-contain"
                style={{ maxHeight: "100%", maxWidth: "100%" }}
              />
            </div>
          </TabsContent>

          <TabsContent value="annotated" className="mt-4">
            <div
              className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center"
              style={{ height: "500px" }}
            >
              <img
                src={annotated || "/placeholder.svg"}
                alt="Annotated X-ray"
                className="object-contain"
                style={{ maxHeight: "100%", maxWidth: "100%" }}
              />
              {showAnnotations && (
                <div className="absolute inset-0 pointer-events-none">
                  {findings.map((finding) => (
                    <div
                      key={finding.id}
                      className="absolute border-2 border-red-500"
                      style={{
                        left: `${(finding.coordinates.x / 600) * 100}%`,
                        top: `${(finding.coordinates.y / 500) * 100}%`,
                        width: `${(finding.coordinates.width / 600) * 100}%`,
                        height: `${(finding.coordinates.height / 500) * 100}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {finding.disease} ({finding.confidence}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">{zoomLevel}%</span>
            <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant={showAnnotations ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAnnotations(!showAnnotations)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Annotations
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
