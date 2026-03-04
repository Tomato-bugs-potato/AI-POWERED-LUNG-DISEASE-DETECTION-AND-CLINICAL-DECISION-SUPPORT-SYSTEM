"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, Download, Mail, Printer, Eye } from "lucide-react"
import ReportPreview from "./components/report-preview"
import DigitalSignature from "./components/digital-signature"

// Mock data
const mockCaseData = {
  caseId: "CASE-2024-0234",
  patient: {
    id: "P-1045",
    name: "John Anderson",
    age: 62,
    sex: "M",
    medicalHistory: ["Hypertension", "Type 2 Diabetes"],
  },
  scanType: "Chest X-Ray",
  uploadedDate: "2024-01-15 09:30",
  images: {
    original: "/chest-xray-original.jpg",
    annotated: "/chest-xray-annotated.jpg",
  },
  aiFindings: [
    {
      id: 1,
      disease: "Pneumonia",
      confidence: 94,
      location: "Right lower lobe",
    },
    {
      id: 2,
      disease: "Cardiomegaly",
      confidence: 85,
      location: "Cardiac silhouette",
    },
  ],
  radiologistReview: {
    notes: "Confirmed pneumonia in right lower lobe. Cardiomegaly appears consistent with previous studies.",
    name: "Dr. Sarah Mitchell",
    timestamp: "2024-01-15 11:45",
  },
  doctorDiagnosis: "Pneumonia with mild cardiomegaly. Recommend antibiotic therapy.",
  doctorNotes:
    "Patient presents with respiratory symptoms. AI and radiologist findings align well. Recommend follow-up in 2 weeks.",
}

export default function GenerateReportPage({ params }: { params: { caseId: string } }) {
  const [config, setConfig] = useState({
    includeAI: true,
    includeRadiologist: true,
    includeBoundingBox: true,
    includeTreatment: true,
    includeHistory: true,
    anonymizeData: false,
    template: "standard",
    language: "en",
    paperSize: "a4",
    includeLetterhead: true,
  })

  const [signature, setSignature] = useState({
    doctorName: "Dr. James Wilson",
    licenseNumber: "",
    signatureData: "",
    date: new Date().toISOString().split("T")[0],
  })

  const [generatingReport, setGeneratingReport] = useState(false)

  const handleConfigChange = (key: string, value: boolean | string) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleGenerateReport = () => {
    setGeneratingReport(true)
    // Simulate report generation
    setTimeout(() => {
      setGeneratingReport(false)
      console.log("[v0] Report generated with config:", config)
    }, 2000)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel - Report Preview */}
      <div className="flex-1 overflow-y-auto border-r border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Medical Report</h1>
            <p className="text-sm text-muted-foreground">{mockCaseData.caseId}</p>
          </div>
        </div>

        <ReportPreview caseData={mockCaseData} config={config} signature={signature} />
      </div>

      {/* Right Panel - Configuration */}
      <div className="w-96 overflow-y-auto bg-card border-l border-border p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Report Configuration</h2>
        </div>

        {/* Content Options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Content Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeAI"
                checked={config.includeAI}
                onCheckedChange={(checked) => handleConfigChange("includeAI", checked)}
              />
              <label htmlFor="includeAI" className="text-sm cursor-pointer">
                Include AI Predictions
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeRadiologist"
                checked={config.includeRadiologist}
                onCheckedChange={(checked) => handleConfigChange("includeRadiologist", checked)}
              />
              <label htmlFor="includeRadiologist" className="text-sm cursor-pointer">
                Include Radiologist Notes
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeBoundingBox"
                checked={config.includeBoundingBox}
                onCheckedChange={(checked) => handleConfigChange("includeBoundingBox", checked)}
              />
              <label htmlFor="includeBoundingBox" className="text-sm cursor-pointer">
                Include Bounding Box Images
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeTreatment"
                checked={config.includeTreatment}
                onCheckedChange={(checked) => handleConfigChange("includeTreatment", checked)}
              />
              <label htmlFor="includeTreatment" className="text-sm cursor-pointer">
                Include Treatment Recommendations
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeHistory"
                checked={config.includeHistory}
                onCheckedChange={(checked) => handleConfigChange("includeHistory", checked)}
              />
              <label htmlFor="includeHistory" className="text-sm cursor-pointer">
                Include Patient History
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="anonymizeData"
                checked={config.anonymizeData}
                onCheckedChange={(checked) => handleConfigChange("anonymizeData", checked)}
              />
              <label htmlFor="anonymizeData" className="text-sm cursor-pointer">
                Anonymize Patient Data
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Format Options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Format Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Report Template</label>
              <Select value={config.template} onValueChange={(value) => handleConfigChange("template", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="summary">Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Language</label>
              <Select value={config.language} onValueChange={(value) => handleConfigChange("language", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="am">Amharic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Paper Size</label>
              <Select value={config.paperSize} onValueChange={(value) => handleConfigChange("paperSize", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeLetterhead"
                checked={config.includeLetterhead}
                onCheckedChange={(checked) => handleConfigChange("includeLetterhead", checked)}
              />
              <label htmlFor="includeLetterhead" className="text-sm cursor-pointer">
                Include Letterhead
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Digital Signature */}
        <DigitalSignature signature={signature} setSignature={setSignature} />

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button onClick={handleGenerateReport} className="w-full" disabled={generatingReport}>
            {generatingReport ? "Generating..." : "Generate Report"}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
          <Button variant="outline" className="w-full bg-transparent">
            Save & Close
          </Button>
        </div>
      </div>
    </div>
  )
}
