"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"

interface Detection {
  id: string
  class: "pneumonia" | "tuberculosis" | "tumor"
  confidence: number
  bbox: { x: number; y: number; width: number; height: number }
  notes?: string
}

interface DetectionEditorProps {
  detection: Detection
  onSave: (detection: Detection) => void
  onCancel: () => void
  isNew: boolean
}

export default function DetectionEditor({ detection, onSave, onCancel, isNew }: DetectionEditorProps) {
  const [editedDetection, setEditedDetection] = useState(detection)

  const handleSave = () => {
    onSave(editedDetection)
  }

  return (
    <Card className="w-full bg-white max-w-md">
      <CardHeader>
        <CardTitle>{isNew ? "Add New Detection" : "Edit Detection"}</CardTitle>
        <CardDescription>Modify detection details and confidence score</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="class">Disease Class</Label>
          <Select
            value={editedDetection.class}
            onValueChange={(value: any) => setEditedDetection({ ...editedDetection, class: value })}
          >
            <SelectTrigger id="class">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pneumonia">Pneumonia</SelectItem>
              <SelectItem value="tuberculosis">Tuberculosis</SelectItem>
              <SelectItem value="tumor">Lung Tumor</SelectItem>
              <SelectItem value="normal">Normal (False Positive)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="confidence">Confidence Score: {editedDetection.confidence}%</Label>
          <Slider
            id="confidence"
            value={[editedDetection.confidence]}
            onValueChange={(val) => setEditedDetection({ ...editedDetection, confidence: val[0] })}
            min={0}
            max={100}
            step={1}
            className="mt-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="x">X Coordinate</Label>
            <Input
              id="x"
              type="number"
              value={editedDetection.bbox.x}
              onChange={(e) =>
                setEditedDetection({
                  ...editedDetection,
                  bbox: { ...editedDetection.bbox, x: Number(e.target.value) },
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="y">Y Coordinate</Label>
            <Input
              id="y"
              type="number"
              value={editedDetection.bbox.y}
              onChange={(e) =>
                setEditedDetection({
                  ...editedDetection,
                  bbox: { ...editedDetection.bbox, y: Number(e.target.value) },
                })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="width">Width</Label>
            <Input
              id="width"
              type="number"
              value={editedDetection.bbox.width}
              onChange={(e) =>
                setEditedDetection({
                  ...editedDetection,
                  bbox: { ...editedDetection.bbox, width: Number(e.target.value) },
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="height">Height</Label>
            <Input
              id="height"
              type="number"
              value={editedDetection.bbox.height}
              onChange={(e) =>
                setEditedDetection({
                  ...editedDetection,
                  bbox: { ...editedDetection.bbox, height: Number(e.target.value) },
                })
              }
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Add any additional notes about this detection..."
            value={editedDetection.notes || ""}
            onChange={(e) => setEditedDetection({ ...editedDetection, notes: e.target.value })}
            className="min-h-24"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSave}>
            Save Changes
          </Button>
          <Button className="flex-1 bg-transparent" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
