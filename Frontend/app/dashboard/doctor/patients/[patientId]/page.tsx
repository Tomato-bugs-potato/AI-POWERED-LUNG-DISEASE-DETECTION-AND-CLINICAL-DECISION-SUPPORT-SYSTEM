"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, FileText, AlertCircle, Brain } from "lucide-react"

export default function PatientDetailPage() {
  const params = useParams()
  const patientId = params.patientId as string

  // Mock patient data - in a real app, this would be fetched from an API
  const patientData: Record<
    string,
    {
      id: string
      name: string
      age: number
      gender: string
      dob: string
      conditions: string[]
      contactNumber: string
      email: string
      insurance: string
    }
  > = {
    "P-1045": {
      id: "P-1045",
      name: "John Anderson",
      age: 62,
      gender: "Male",
      dob: "1961-05-20",
      conditions: ["Hypertension", "Type 2 Diabetes"],
      contactNumber: "+1 (555) 123-4567",
      email: "john.anderson@example.com",
      insurance: "BlueCross BlueShield",
    },
    "P-1044": {
      id: "P-1044",
      name: "Maria Garcia",
      age: 45,
      gender: "Female",
      dob: "1978-10-15",
      conditions: ["Migraine"],
      contactNumber: "+1 (555) 234-5678",
      email: "maria.garcia@example.com",
      insurance: "Aetna",
    },
    "P-1043": {
      id: "P-1043",
      name: "David Kim",
      age: 58,
      gender: "Male",
      dob: "1965-08-10",
      conditions: ["COPD", "Former smoker"],
      contactNumber: "+1 (555) 345-6789",
      email: "david.kim@example.com",
      insurance: "UnitedHealthcare",
    },
    "P-1042": {
      id: "P-1042",
      name: "Sarah Johnson",
      age: 34,
      gender: "Female",
      dob: "1989-12-03",
      conditions: [],
      contactNumber: "+1 (555) 456-7890",
      email: "sarah.johnson@example.com",
      insurance: "Anthem",
    },
    "P-1041": {
      id: "P-1041",
      name: "Michael Brown",
      age: 71,
      gender: "Male",
      dob: "1952-03-18",
      conditions: ["Heart Failure", "Hypertension", "Atrial Fibrillation"],
      contactNumber: "+1 (555) 567-8901",
      email: "michael.brown@example.com",
      insurance: "Medicare",
    },
  }

  // Mock cases data - in a real app, this would be fetched from an API
  const casesData: Record<
    string,
    Array<{
      id: string
      caseId: string
      date: string
      scanType: string
      diagnosis: string
      status: "completed" | "pending" | "review"
      radiologist: string
      findings: string
      aiPredictions: string
      radiologistNotes: string
      doctorDiagnosis: string
      doctorNotes: string
      annotatedImageUrl: string
    }>
  > = {
    "P-1045": [
      {
        id: "1",
        caseId: "CASE-2024-001",
        date: "2024-01-15",
        scanType: "Chest X-Ray",
        diagnosis: "No acute findings",
        status: "completed",
        radiologist: "Dr. Smith",
        findings: "Lungs clear, no pneumonia detected",
        aiPredictions: "No pneumonia detected (confidence: 98%)",
        radiologistNotes: "AI prediction confirmed. Lungs appear clear with normal vasculature.",
        doctorDiagnosis: "Normal chest radiograph",
        doctorNotes: "Patient presents with clear lungs. No acute respiratory findings. Continue current management.",
        annotatedImageUrl: "/chest-xray-original.png",
      },
      {
        id: "2",
        caseId: "CASE-2024-002",
        date: "2024-01-10",
        scanType: "CT Chest",
        diagnosis: "Mild emphysema",
        status: "completed",
        radiologist: "Dr. Johnson",
        findings: "Mild emphysematous changes consistent with smoking history",
        aiPredictions: "Emphysema detected (confidence: 85%)",
        radiologistNotes:
          "AI correctly identified emphysematous changes. Findings consistent with smoking history. Recommend pulmonary function testing.",
        doctorDiagnosis: "COPD Stage 1 (Mild)",
        doctorNotes: "Confirmed mild emphysema. Advised smoking cessation. Prescribed bronchodilators.",
        annotatedImageUrl: "/chest-xray-original.png",
      },
      {
        id: "3",
        caseId: "CASE-2024-003",
        date: "2024-01-05",
        scanType: "Chest X-Ray",
        diagnosis: "Pending review",
        status: "pending",
        radiologist: "Dr. Lee",
        findings: "Awaiting radiologist review",
        aiPredictions: "Possible infiltrate in right lower lobe (confidence: 72%)",
        radiologistNotes: "Reviewing AI findings. Need clinical correlation.",
        doctorDiagnosis: "Pending",
        doctorNotes: "Awaiting radiologist confirmation.",
        annotatedImageUrl: "/chest-xray-original.png",
      },
    ],
    "P-1044": [
      {
        id: "1",
        caseId: "CASE-2024-004",
        date: "2024-01-15",
        scanType: "Brain MRI",
        diagnosis: "No structural abnormalities",
        status: "completed",
        radiologist: "Dr. Patel",
        findings: "Normal brain MRI, migraine likely primary",
        aiPredictions: "No abnormalities detected (confidence: 96%)",
        radiologistNotes: "AI analysis confirms normal MRI. No structural lesions or signal abnormalities.",
        doctorDiagnosis: "Primary migraine without aura",
        doctorNotes: "Normal neuroimaging supports primary migraine diagnosis. Initiated preventive therapy.",
    annotatedImageUrl: "/chest-xray-original.png",
      },
      {
        id: "2",
        caseId: "CASE-2024-005",
        date: "2024-01-08",
        scanType: "Brain MRI",
        diagnosis: "Normal",
        status: "completed",
        radiologist: "Dr. Martinez",
        findings: "No abnormal signal intensities",
        aiPredictions: "No pathology detected (confidence: 94%)",
        radiologistNotes: "Follow-up MRI confirms stable normal findings.",
        doctorDiagnosis: "No acute intracranial pathology",
        doctorNotes: "Imaging surveillance shows stability. Continue current treatment.",
        annotatedImageUrl: "/chest-xray-original.png",
      },
    ],
    "P-1043": [
      {
        id: "1",
        caseId: "CASE-2024-006",
        date: "2024-01-15",
        scanType: "Chest X-Ray",
        diagnosis: "COPD with bronchiectasis",
        status: "review",
        radiologist: "Dr. Smith",
        findings: "Significant COPD changes with bronchiectasis",
        aiPredictions: "COPD and bronchiectasis detected (confidence: 89%)",
        radiologistNotes: "AI findings validated. Significant COPD changes noted with bronchial dilatation patterns.",
        doctorDiagnosis: "COPD Stage 3 (Severe) with bronchiectasis",
        doctorNotes: "Severe COPD with bronchiectasis. Escalated inhaler therapy. Referred to pulmonary specialist.",
        annotatedImageUrl: "/chest-xray-original.png",
      },
      {
        id: "2",
        caseId: "CASE-2024-007",
        date: "2024-01-12",
        scanType: "CT Chest",
        diagnosis: "COPD exacerbation",
        status: "completed",
        radiologist: "Dr. Johnson",
        findings: "Acute exacerbation of COPD",
        aiPredictions: "Acute exacerbation pattern detected (confidence: 91%)",
        radiologistNotes:
          "AI correctly identified acute exacerbation signs. New consolidations in bilateral lower lobes.",
        doctorDiagnosis: "Acute COPD exacerbation with possible pneumonia",
        doctorNotes: "Started on antibiotics and systemic corticosteroids. Admitted for monitoring.",
        annotatedImageUrl: "/chest-xray-original.png",
      },
      {
        id: "3",
        caseId: "CASE-2024-008",
        date: "2024-01-08",
        scanType: "Chest X-Ray",
        diagnosis: "Chronic changes",
        status: "completed",
        radiologist: "Dr. Lee",
        findings: "Chronic COPD changes",
        aiPredictions: "Chronic COPD pattern (confidence: 87%)",
        radiologistNotes: "Stable chronic findings compared to prior studies.",
        doctorDiagnosis: "Stable COPD",
        doctorNotes: "No acute changes. Continue current management plan.",
        annotatedImageUrl: "/chest-xray-original.png",
      },
    ],
    "P-1042": [
      {
        id: "1",
        caseId: "CASE-2024-009",
        date: "2024-01-14",
        scanType: "Abdomen Ultrasound",
        diagnosis: "Normal study",
        status: "completed",
        radiologist: "Dr. Chen",
        findings: "No abnormalities detected",
        aiPredictions: "No pathology detected (confidence: 99%)",
        radiologistNotes: "AI analysis confirms normal ultrasound. All organs appear normal in size and echotexture.",
        doctorDiagnosis: "Normal abdominal imaging",
        doctorNotes: "Normal imaging study. No findings to report.",
    annotatedImageUrl: "/chest-xray-original.png",
      },
      {
        id: "2",
        caseId: "CASE-2024-010",
        date: "2024-01-07",
        scanType: "Chest X-Ray",
        diagnosis: "Normal",
        status: "completed",
        radiologist: "Dr. Patel",
        findings: "Normal chest radiograph",
        aiPredictions: "No abnormalities detected (confidence: 97%)",
        radiologistNotes: "AI screening confirms normal chest radiograph.",
        doctorDiagnosis: "Normal chest X-ray",
        doctorNotes: "Clear lungs. No acute cardiopulmonary process.",
        annotatedImageUrl: "/chest-xray-original.png",
      },
    ],
    "P-1041": [
      {
        id: "1",
        caseId: "CASE-2024-011",
        date: "2024-01-14",
        scanType: "Chest X-Ray",
        diagnosis: "Cardiomegaly",
        status: "completed",
        radiologist: "Dr. Smith",
        findings: "Enlarged heart consistent with heart failure",
        aiPredictions: "Cardiomegaly detected (confidence: 93%)",
        radiologistNotes: "AI correctly identified cardiac enlargement. Cardiothoracic ratio elevated at 0.58.",
        doctorDiagnosis: "Heart failure with reduced ejection fraction",
        doctorNotes: "Confirmed cardiomegaly. Escalated diuretic therapy. Referral to cardiology.",
        annotatedImageUrl: "/chest-xray-original.png",
      },
      {
        id: "2",
        caseId: "CASE-2024-012",
        date: "2024-01-10",
        scanType: "Chest CT",
        diagnosis: "Pulmonary edema",
        status: "completed",
        radiologist: "Dr. Johnson",
        findings: "Bilateral pulmonary edema",
        aiPredictions: "Pulmonary edema detected (confidence: 96%)",
        radiologistNotes: "AI findings confirmed. Extensive bilateral interstitial and alveolar opacities.",
        doctorDiagnosis: "Acute decompensated heart failure",
        doctorNotes: "Acute pulmonary edema. Admitted for IV diuretics and hemodynamic monitoring.",
        annotatedImageUrl: "/chest-xray-original.png",
      },
      {
        id: "3",
        caseId: "CASE-2024-013",
        date: "2024-01-05",
        scanType: "Chest X-Ray",
        diagnosis: "Cardiomegaly",
        status: "completed",
        radiologist: "Dr. Martinez",
        findings: "Persistent cardiomegaly",
        aiPredictions: "Persistent cardiomegaly (confidence: 91%)",
        radiologistNotes: "Cardiomegaly unchanged from prior studies.",
        doctorDiagnosis: "Stable cardiomegaly",
        doctorNotes: "Chronic cardiomegaly. Continue current HF regimen.",
        annotatedImageUrl: "/chest-xray-original.png",
      },
      {
        id: "4",
        caseId: "CASE-2024-014",
        date: "2023-12-28",
        scanType: "Cardiac Echo",
        diagnosis: "EF 25%",
        status: "completed",
        radiologist: "Dr. Lee",
        findings: "Ejection fraction severely reduced",
        aiPredictions: "Severely reduced ejection fraction (confidence: 94%)",
        radiologistNotes: "AI analysis confirms significantly reduced systolic function.",
        doctorDiagnosis: "Heart failure, EF 25%",
        doctorNotes: "Severe systolic dysfunction. Initiated advanced HF therapies.",
        annotatedImageUrl: "/chest-xray-original.png",
      },
    ],
  }

  const patient = patientData[patientId]
  const cases = casesData[patientId] || []

  if (!patient) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Patient not found</h1>
          <p className="text-muted-foreground mt-2">The patient you're looking for doesn't exist.</p>
          <Link href="/doctor/patients" className="mt-4">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Patients
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Sort cases by date in descending order (newest first)
  const sortedCases = [...cases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "review":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed"
      case "pending":
        return "Pending"
      case "review":
        return "Under Review"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/doctor/patients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{patient.name}</h1>
            <p className="text-muted-foreground">Patient ID: {patient.id}</p>
          </div>
        </div>
      </div>

      {/* Patient Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Age</p>
              <p className="text-lg font-semibold">{patient.age} years</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="text-lg font-semibold">{patient.gender}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="text-lg font-semibold">{patient.dob}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Number</p>
              <p className="text-lg font-semibold">{patient.contactNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-lg font-semibold">{patient.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Insurance</p>
              <p className="text-lg font-semibold">{patient.insurance}</p>
            </div>
            <div className="md:col-span-3">
              <p className="text-sm text-muted-foreground">Medical Conditions</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {patient.conditions.length > 0 ? (
                  patient.conditions.map((condition, idx) => (
                    <Badge key={idx} variant="secondary">
                      {condition}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None recorded</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            CAD Case History
          </CardTitle>
          <CardDescription>
            All cases with AI predictions, radiologist and doctor reviews (newest first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {sortedCases.length > 0 ? (
              sortedCases.map((caseItem, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  {/* Case Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{caseItem.caseId}</h3>
                        <Badge className={getStatusColor(caseItem.status)}>{getStatusLabel(caseItem.status)}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-muted-foreground">Scan Date</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(caseItem.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Scan Type</p>
                          <p className="font-medium">{caseItem.scanType}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Radiologist</p>
                          <p className="font-medium">{caseItem.radiologist}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Overall Diagnosis</p>
                          <p className="font-medium">{caseItem.diagnosis}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Link href={`/dashboard/doctor/review/${caseItem.caseId}`}>
                        <Button size="sm" variant="outline">
                          <FileText className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Annotated Image Thumbnail */}
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Annotated Imaging</p>
                    <div className="relative w-full h-32 bg-black rounded">
                      <Image
                        src={caseItem.annotatedImageUrl || "/placeholder.svg"}
                        alt={`${caseItem.caseId} annotated scan`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>

                  {/* AI Predictions Section */}
                  <div className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50/50 rounded-r">
                    <p className="text-xs font-semibold text-blue-900 mb-1">AI PREDICTIONS</p>
                    <p className="text-sm text-foreground">{caseItem.aiPredictions}</p>
                  </div>

                  {/* Radiologist Review Section */}
                  <div className="border-l-4 border-purple-500 pl-3 py-2 bg-purple-50/50 rounded-r">
                    <p className="text-xs font-semibold text-purple-900 mb-1">RADIOLOGIST REVIEW</p>
                    <p className="text-sm text-foreground">{caseItem.radiologistNotes}</p>
                  </div>

                  {/* Doctor Diagnosis Section */}
                  <div className="border-l-4 border-green-500 pl-3 py-2 bg-green-50/50 rounded-r">
                    <p className="text-xs font-semibold text-green-900 mb-1">DOCTOR DIAGNOSIS & NOTES</p>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{caseItem.doctorDiagnosis}</p>
                      <p className="text-sm text-foreground">{caseItem.doctorNotes}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No cases found for this patient</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
