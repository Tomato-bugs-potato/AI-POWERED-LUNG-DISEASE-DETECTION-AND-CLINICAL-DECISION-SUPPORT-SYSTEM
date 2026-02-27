"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface DiagnosisFormData {
  primaryDiagnosis: string
  secondaryDiagnosis: string
  icd10Code: string
  detailedNotes: string
  urgencyLevel: string
  treatment: string
  doctorNotes: string
}

export default function DiagnosisForm({
  formData,
  setFormData,
}: {
  formData: DiagnosisFormData
  setFormData: (data: DiagnosisFormData) => void
}) {
  const diagnoses = ["Normal", "Pneumonia", "Tuberculosis", "Lung Tumor", "Other"]

  return (
    <div className="space-y-6">
      {/* Primary Diagnosis */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnosis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primary">Primary Diagnosis *</Label>
            <Select
              value={formData.primaryDiagnosis}
              onValueChange={(v) => setFormData({ ...formData, primaryDiagnosis: v })}
            >
              <SelectTrigger id="primary">
                <SelectValue placeholder="Select primary diagnosis" />
              </SelectTrigger>
              <SelectContent>
                {diagnoses.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary">Secondary Diagnosis (Optional)</Label>
            <Select
              value={formData.secondaryDiagnosis}
              onValueChange={(v) => setFormData({ ...formData, secondaryDiagnosis: v })}
            >
              <SelectTrigger id="secondary">
                <SelectValue placeholder="Select secondary diagnosis" />
              </SelectTrigger>
              <SelectContent>
                {diagnoses.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="icd10">ICD-10 Code (Optional)</Label>
            <Input
              id="icd10"
              placeholder="e.g., J15.9"
              value={formData.icd10Code}
              onChange={(e) => setFormData({ ...formData, icd10Code: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Detailed Diagnosis Notes *</Label>
            <Textarea
              id="notes"
              placeholder="Enter your detailed diagnosis notes, clinical findings, and observations..."
              rows={5}
              value={formData.detailedNotes}
              onChange={(e) => setFormData({ ...formData, detailedNotes: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Urgency Level */}
      <Card>
        <CardHeader>
          <CardTitle>Urgency Level</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.urgencyLevel}
            onValueChange={(v) => setFormData({ ...formData, urgencyLevel: v })}
          >
            <div className="flex items-center space-x-2 mb-4">
              <RadioGroupItem value="critical" id="critical" />
              <Label htmlFor="critical" className="cursor-pointer">
                🔴 Critical (Immediate action required)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="routine" id="routine" />
              <Label htmlFor="routine" className="cursor-pointer">
                🟡 Non-Critical (Routine follow-up)
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Treatment & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Treatment Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="treatment">Recommended Treatment</Label>
            <Textarea
              id="treatment"
              placeholder="Enter treatment recommendations, medications, therapy, etc..."
              rows={4}
              value={formData.treatment}
              onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Doctor Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Doctor Notes</CardTitle>
          <CardDescription>Private clinical observations and differential diagnoses</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter private notes, differential diagnoses, clinical observations..."
            rows={4}
            value={formData.doctorNotes}
            onChange={(e) => setFormData({ ...formData, doctorNotes: e.target.value })}
          />
        </CardContent>
      </Card>
    </div>
  )
}
