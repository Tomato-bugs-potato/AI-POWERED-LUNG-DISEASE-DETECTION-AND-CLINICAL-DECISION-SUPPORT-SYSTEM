"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, ChevronLeft, Download, Send } from "lucide-react"
import PatientInfoCard from "./components/patient-info-card"
import ImageViewer from "./components/image-viewer"
import AnalysisPanel from "./components/analysis-panel"
import DiagnosisForm from "./components/diagnosis-form"
import CaseHistoryTimeline from "./components/case-history-timeline"

// Mock data - replace with actual API calls
const mockCaseData = {
  caseId: "CASE-2024-0234",
  patient: {
    id: "P-1045",
    name: "John Anderson",
    age: 62,
    sex: "M",
    medicalHistory: ["Hypertension", "Type 2 Diabetes"],
    previousDiagnoses: ["Chronic bronchitis (2023)"],
  },
  scanType: "Chest X-Ray",
  uploadedDate: "2024-01-15 09:30",
  images: {
    original: "/chest-xray-original.png",
    annotated: "/chest-xray-original.png",
  },
  aiFindings: [
    {
      id: 1,
      disease: "Pneumonia",
      confidence: 94,
      location: "Right lower lobe",
      coordinates: { x: 400, y: 350, width: 80, height: 100 },
    },
    {
      id: 2,
      disease: "Cardiomegaly",
      confidence: 78,
      location: "Cardiac silhouette",
      coordinates: { x: 300, y: 250, width: 120, height: 140 },
    },
  ],
  radiologistReview: {
    notes:
      "Confirmed pneumonia in right lower lobe. Cardiomegaly appears consistent with previous studies. No acute findings suggest intervention.",
    modifications: {
      added: ["Mild pleural effusion - right side"],
      removed: [],
      adjusted: ["Cardiomegaly confidence increased to 85%"],
    },
    name: "Dr. Sarah Mitchell",
    timestamp: "2024-01-15 11:45",
    confidence: "High",
  },
  previousVisits: [
    {
      date: "2024-01-10",
      diagnosis: "Upper respiratory infection",
      provider: "Dr. James Wilson",
    },
    {
      date: "2023-12-20",
      diagnosis: "Routine checkup - Normal",
      provider: "Dr. James Wilson",
    },
  ],
}

export default function DoctorReviewPage({ params }: { params: { caseId: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [formData, setFormData] = useState({
    primaryDiagnosis: "",
    secondaryDiagnosis: "",
    icd10Code: "",
    detailedNotes: "",
    urgencyLevel: "routine",
    treatment: "",
    doctorNotes: "",
  })

  const handleSubmit = () => {
    console.log("[v0] Submitting diagnosis:", formData)
    // In a real app, this would call an API
  }

  const handleGenerateReport = () => {
    router.push(`/doctor/report/${params.caseId}`)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Case Review & Diagnosis</h1>
            <p className="text-muted-foreground">{mockCaseData.caseId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateReport}>
            <Download className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Case History</TabsTrigger>
          <TabsTrigger value="diagnosis">Diagnosis Form</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Patient Info */}
          <PatientInfoCard patient={mockCaseData.patient} />

          {/* Alert if case is urgent */}
          {mockCaseData.aiFindings.some((f) => f.confidence > 90) && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">High Confidence Findings Detected</p>
                  <p className="text-sm text-amber-700">
                    {"Multiple detections with confidence > 90%. Review recommended."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Image Viewer Section */}
            <div className="lg:col-span-2">
              <ImageViewer
                original={mockCaseData.images.original}
                annotated={mockCaseData.images.annotated}
                findings={mockCaseData.aiFindings}
              />
            </div>

            {/* Analysis Panel */}
            <div className="lg:col-span-1">
              <AnalysisPanel aiFindings={mockCaseData.aiFindings} radiologistReview={mockCaseData.radiologistReview} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <CaseHistoryTimeline visits={mockCaseData.previousVisits} />
        </TabsContent>

        <TabsContent value="diagnosis">
          <DiagnosisForm formData={formData} setFormData={setFormData} />
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline">Save as Draft</Button>
        <Button variant="outline">Request Additional Review</Button>
        <Button onClick={handleSubmit}>
          <Send className="h-4 w-4 mr-2" />
          Submit Diagnosis
        </Button>
      </div>
    </div>
  )
}
