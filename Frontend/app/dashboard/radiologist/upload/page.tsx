"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileImage, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function UploadScanPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    setUploading(true)
    // Simulate upload
    setTimeout(() => {
      setUploading(false)
      alert("Scan uploaded successfully! AI analysis in progress...")
    }, 2000)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Medical Scan</h1>
        <p className="text-muted-foreground mt-1">Upload X-ray or CT scan images for AI analysis</p>
      </div>

      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          All uploaded scans are encrypted and stored securely. AI analysis typically completes within 2-3 minutes.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle>Scan Information</CardTitle>
            <CardDescription>Enter patient and scan details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient-id">Patient ID</Label>
              <Input id="patient-id" placeholder="Enter patient ID" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scan-type">Scan Type</Label>
              <Select>
                <SelectTrigger id="scan-type">
                  <SelectValue placeholder="Select scan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xray-chest">X-Ray - Chest</SelectItem>
                  <SelectItem value="xray-leg">X-Ray - Leg/Arm</SelectItem>
                  <SelectItem value="xray-spine">X-Ray - Spine</SelectItem>
                  <SelectItem value="ct-head">CT Scan - Head</SelectItem>
                  <SelectItem value="ct-chest">CT Scan - Chest</SelectItem>
                  <SelectItem value="ct-abdomen">CT Scan - Abdomen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Routine</SelectItem>
                  <SelectItem value="medium">Medium - Standard</SelectItem>
                  <SelectItem value="high">High - Urgent</SelectItem>
                  <SelectItem value="critical">Critical - Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Clinical Notes</Label>
              <Textarea id="notes" placeholder="Enter any relevant clinical information..." rows={4} />
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>Drag and drop or click to upload DICOM, PNG, or JPEG files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <input
                type="file"
                multiple
                accept=".dcm,.png,.jpg,.jpeg"
                className="hidden"
                id="file-upload"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-sm text-muted-foreground mt-1">DICOM, PNG, JPEG up to 50MB each</p>
                </div>
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({files.length})</Label>
                <div className="space-y-2">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded">
                      <FileImage className="w-4 h-4 text-primary" />
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleUpload} disabled={files.length === 0 || uploading} className="w-full" size="lg">
              {uploading ? "Uploading..." : "Upload and Analyze"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
