"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { useState } from "react"
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Edit2,
  Trash2,
  Plus,
  CheckCircle,
  Send,
  Download,
  ArrowLeft,
} from "lucide-react"
import ImageViewer from "./components/image-viewer"
import DetectionEditor from "./components/detection-editor"

interface Detection {
  id: string
  class: "pneumonia" | "tuberculosis" | "tumor"
  confidence: number
  bbox: { x: number; y: number; width: number; height: number }
  notes?: string
  modified?: boolean
}

const mockDetections: Detection[] = [
  {
    id: "det-001",
    class: "pneumonia",
    confidence: 92,
    bbox: { x: 150, y: 100, width: 200, height: 250 },
  },
  {
    id: "det-002",
    class: "tuberculosis",
    confidence: 78,
    bbox: { x: 400, y: 150, width: 180, height: 200 },
  },
  {
    id: "det-003",
    class: "tumor",
    confidence: 65,
    bbox: { x: 300, y: 350, width: 150, height: 160 },
  },
]

export default function ReviewAIPredictionsPage({ params }: { params: { caseId: string } }) {
  const [detections, setDetections] = useState<Detection[]>(mockDetections)
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null)
  const [editingDetection, setEditingDetection] = useState<Detection | null>(null)
  const [confidenceFilter, setConfidenceFilter] = useState([0])
  const [zoom, setZoom] = useState(100)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [showConfidenceScores, setShowConfidenceScores] = useState(true)
  const [radiologistNotes, setRadiologistNotes] = useState("")
  const [compareMode, setCompareMode] = useState(false)

  const filteredDetections = detections.filter((d) => d.confidence >= confidenceFilter[0])

  const handleEditDetection = (detection: Detection) => {
    setEditingDetection(detection)
    setSelectedDetection(detection)
  }

  const handleSaveDetectionChanges = (updatedDetection: Detection) => {
    setDetections(detections.map((d) => (d.id === updatedDetection.id ? { ...updatedDetection, modified: true } : d)))
    setEditingDetection(null)
  }

  const handleRemoveDetection = (id: string) => {
    setDetections(detections.filter((d) => d.id !== id))
    setSelectedDetection(null)
  }

  const handleAddDetection = (newDetection: Detection) => {
    setDetections([...detections, newDetection])
  }

  const classColors = {
    pneumonia: "bg-red-500",
    tuberculosis: "bg-yellow-500",
    tumor: "bg-orange-500",
  }

  const classColorsBorder = {
    pneumonia: "border-red-500",
    tuberculosis: "border-yellow-500",
    tumor: "border-orange-500",
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Queue
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Review AI Analysis</h1>
            <p className="text-muted-foreground">Case ID: {params.caseId}</p>
          </div>
        </div>
        <Badge variant="outline" className="h-fit">
          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
          Pending Review
        </Badge>
      </div>

      {/* Patient Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Patient ID</p>
              <p className="font-medium">PAT-2024-001523</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Age</p>
              <p className="font-medium">52</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sex</p>
              <p className="font-medium">Male</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upload Date</p>
              <p className="font-medium">Dec 20, 2024</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6 flex-1">
        {/* Image Viewer Section */}
        <div className="col-span-2 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Medical Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Image Display */}
                <div
                  className={`relative bg-slate-900 rounded-lg overflow-auto border-2 ${selectedDetection ? classColorsBorder[selectedDetection.class] : "border-border"}`}
                  style={{
                    height: "500px",
                    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  }}
                >
                  <ImageViewer
                    detections={showAnnotations ? filteredDetections : []}
                    showConfidenceScores={showConfidenceScores}
                    zoom={zoom}
                    selectedDetection={selectedDetection}
                    onSelectDetection={setSelectedDetection}
                  />
                </div>

                {/* Image Controls */}
                <div className="space-y-4">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(50, zoom - 10))}>
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium w-16 text-center">{zoom}%</span>
                    <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(200, zoom + 10))}>
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setZoom(100)}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setZoom(100)} className="ml-auto">
                      <Maximize className="w-4 h-4" />
                      Fit
                    </Button>
                  </div>

                  {/* Toggle Controls */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={showAnnotations ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowAnnotations(!showAnnotations)}
                    >
                      {showAnnotations ? "Hide" : "Show"} Annotations
                    </Button>
                    <Button
                      variant={showConfidenceScores ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowConfidenceScores(!showConfidenceScores)}
                    >
                      {showConfidenceScores ? "Hide" : "Show"} Scores
                    </Button>
                    <Button
                      variant={compareMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCompareMode(!compareMode)}
                    >
                      Compare Mode
                    </Button>
                  </div>

                  {/* Image Adjustment */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Brightness</label>
                      <Slider
                        value={[brightness]}
                        onValueChange={(val) => setBrightness(val[0])}
                        min={50}
                        max={150}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Contrast</label>
                      <Slider
                        value={[contrast]}
                        onValueChange={(val) => setContrast(val[0])}
                        min={50}
                        max={150}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBrightness(100)
                        setContrast(100)
                      }}
                    >
                      Reset Adjustments
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Predictions Panel */}
        <div className="space-y-4">
          <Card className="overflow-auto max-h-96">
            <CardHeader>
              <CardTitle className="text-lg">AI Predictions</CardTitle>
              <CardDescription>
                {filteredDetections.length} detection{filteredDetections.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Confidence Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Confidence Filter: {confidenceFilter[0]}%</label>
                <Slider
                  value={confidenceFilter}
                  onValueChange={setConfidenceFilter}
                  min={0}
                  max={100}
                  step={1}
                  className="mt-1"
                />
                <Button variant="outline" size="sm" onClick={() => setConfidenceFilter([0])}>
                  Reset Filter
                </Button>
              </div>

              {/* Detections List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredDetections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No detections match the confidence filter</p>
                ) : (
                  filteredDetections.map((detection) => (
                    <div
                      key={detection.id}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedDetection?.id === detection.id
                          ? `${classColorsBorder[detection.class]} bg-opacity-10`
                          : "border-border"
                      }`}
                      onClick={() => setSelectedDetection(detection)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${classColors[detection.class]}`} />
                          <span className="font-medium capitalize text-sm">{detection.class}</span>
                        </div>
                        {detection.modified && (
                          <Badge variant="secondary" className="text-xs">
                            Modified
                          </Badge>
                        )}
                      </div>
                      <div className="mb-2">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Confidence</span>
                          <span className="text-xs font-medium">{detection.confidence}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${classColors[detection.class]}`}
                            style={{ width: `${detection.confidence}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditDetection(detection)
                          }}
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveDetection(detection.id)
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add Detection Button */}
          <Button
            className="w-full"
            onClick={() =>
              setEditingDetection({
                id: `det-${Date.now()}`,
                class: "pneumonia",
                confidence: 85,
                bbox: { x: 0, y: 0, width: 100, height: 100 },
              })
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Missed Detection
          </Button>
        </div>
      </div>

      {/* Bottom Section - Notes & Actions */}
      <div className="grid grid-cols-3 gap-6">
        {/* Radiologist Notes */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Radiologist Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter your clinical assessment and findings..."
                value={radiologistNotes}
                onChange={(e) => setRadiologistNotes(e.target.value)}
                className="min-h-32 resize-none"
              />
              <div className="mt-3 flex justify-between items-center text-sm text-muted-foreground">
                <span>{radiologistNotes.length} characters</span>
                <span className="text-green-600">Auto-saving...</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full bg-green-600 hover:bg-green-700">
              <Send className="w-4 h-4 mr-2" />
              Send to Doctor
            </Button>
            <Button variant="outline" className="w-full bg-transparent">
              <RotateCcw className="w-4 h-4 mr-2" />
              Request Re-analysis
            </Button>
            <Button variant="outline" className="w-full bg-transparent">
              <Download className="w-4 h-4 mr-2" />
              Print/Export
            </Button>
            <Button variant="outline" className="w-full bg-transparent">
              <CheckCircle className="w-4 h-4 mr-2" />
              Save Progress
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Detection Editor Modal */}
      {editingDetection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <DetectionEditor
            detection={editingDetection}
            onSave={handleSaveDetectionChanges}
            onCancel={() => setEditingDetection(null)}
            isNew={!detections.find((d) => d.id === editingDetection.id)}
          />
        </div>
      )}
    </div>
  )
}
