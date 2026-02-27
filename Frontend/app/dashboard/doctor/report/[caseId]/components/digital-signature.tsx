"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRef, useState } from "react"
import { Trash2 } from "lucide-react"

export default function DigitalSignature({ signature, setSignature }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const handleStartDrawing = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext("2d")
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setIsDrawing(true)
  }

  const handleDrawing = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext("2d")
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const handleStopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current
      if (canvas) {
        setSignature((prev) => ({
          ...prev,
          signatureData: canvas.toDataURL(),
        }))
      }
    }
    setIsDrawing(false)
  }

  const handleClearSignature = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setSignature((prev) => ({
        ...prev,
        signatureData: "",
      }))
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Digital Signature</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Physician Name</label>
          <Input
            value={signature.doctorName}
            onChange={(e) => setSignature((prev) => ({ ...prev, doctorName: e.target.value }))}
            placeholder="Enter full name"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">License Number</label>
          <Input
            value={signature.licenseNumber}
            onChange={(e) => setSignature((prev) => ({ ...prev, licenseNumber: e.target.value }))}
            placeholder="Enter license number"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Date</label>
          <Input
            type="date"
            value={signature.date}
            onChange={(e) => setSignature((prev) => ({ ...prev, date: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Digital Signature</label>
          <canvas
            ref={canvasRef}
            width={300}
            height={100}
            onMouseDown={handleStartDrawing}
            onMouseMove={handleDrawing}
            onMouseUp={handleStopDrawing}
            onMouseLeave={handleStopDrawing}
            className="border border-gray-300 rounded w-full cursor-crosshair bg-white"
          />
          <Button variant="outline" size="sm" onClick={handleClearSignature} className="mt-2 w-full bg-transparent">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Signature
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
