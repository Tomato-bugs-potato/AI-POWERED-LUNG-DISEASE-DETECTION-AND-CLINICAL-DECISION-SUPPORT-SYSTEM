"use client"

export default function ReportPreview({ caseData, config, signature }) {
  return (
    <div className="bg-white text-black rounded-lg shadow-lg p-8 max-w-2xl mx-auto space-y-6">
      {/* Letterhead */}
      {config.includeLetterhead && (
        <div className="border-b-2 border-gray-300 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-center">Medical Imaging Report</h1>
          <p className="text-center text-sm text-gray-600">Computer-Assisted Diagnosis (CAD)</p>
          <p className="text-center text-xs text-gray-500 mt-2">Advanced Medical Center</p>
        </div>
      )}

      {/* Patient Information */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold text-gray-700">Patient Name</p>
          <p>{config.anonymizeData ? "***" : caseData.patient.name}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Patient ID</p>
          <p>{config.anonymizeData ? "***" : caseData.patient.id}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Age / Sex</p>
          <p>{config.anonymizeData ? "***" : `${caseData.patient.age} / ${caseData.patient.sex}`}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Study Date</p>
          <p>{caseData.uploadedDate}</p>
        </div>
      </div>

      <hr className="border-gray-300" />

      {/* Images Section */}
      <div>
        <h2 className="text-lg font-bold mb-3">Radiographic Images</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Original Image</p>
            <div className="relative w-full h-64 bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
              <p className="text-gray-500">[Original X-Ray Image]</p>
            </div>
          </div>
          {config.includeBoundingBox && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Annotated Image with Findings</p>
              <div className="relative w-full h-64 bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
                <p className="text-gray-500">[Annotated X-Ray with AI Markings]</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <hr className="border-gray-300" />

      {/* AI Findings */}
      {config.includeAI && (
        <div>
          <h2 className="text-lg font-bold mb-3 text-blue-900">AI Model Findings</h2>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
            {caseData.aiFindings.map((finding, idx) => (
              <div key={idx} className="text-sm">
                <p className="font-semibold">{finding.disease}</p>
                <p className="text-gray-700">
                  Location: {finding.location} | Confidence: {finding.confidence}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Radiologist Review */}
      {config.includeRadiologist && (
        <div>
          <h2 className="text-lg font-bold mb-3 text-purple-900">Radiologist Review</h2>
          <div className="bg-purple-50 border border-purple-200 rounded p-3">
            <p className="text-sm text-gray-700 mb-2">{caseData.radiologistReview.notes}</p>
            <p className="text-xs text-gray-600">
              Reviewed by: {caseData.radiologistReview.name} | {caseData.radiologistReview.timestamp}
            </p>
          </div>
        </div>
      )}

      {/* Doctor Diagnosis */}
      <div>
        <h2 className="text-lg font-bold mb-3 text-green-900">Final Diagnosis</h2>
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="text-sm font-semibold text-gray-700 mb-2">Primary Diagnosis</p>
          <p className="text-sm text-gray-700 mb-3">{caseData.doctorDiagnosis}</p>
          <p className="text-sm font-semibold text-gray-700 mb-2">Clinical Notes</p>
          <p className="text-sm text-gray-700">{caseData.doctorNotes}</p>
        </div>
      </div>

      {/* Treatment Recommendations */}
      {config.includeTreatment && (
        <div>
          <h2 className="text-lg font-bold mb-3">Treatment Recommendations</h2>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Antibiotic therapy for pneumonia</li>
            <li>Follow-up chest X-ray in 2 weeks</li>
            <li>Monitor cardiac function</li>
          </ul>
        </div>
      )}

      {/* Patient History */}
      {config.includeHistory && (
        <div>
          <h2 className="text-lg font-bold mb-3">Patient Medical History</h2>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• Hypertension</p>
            <p>• Type 2 Diabetes</p>
          </div>
        </div>
      )}

      <hr className="border-gray-300" />

      {/* Doctor Signature */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Physician Signature</p>
          <div className="h-16 border border-gray-300 rounded flex items-center justify-center bg-gray-50">
            {signature.signatureData ? (
              <p className="text-gray-500 text-sm">Digital Signature Present</p>
            ) : (
              <p className="text-gray-400 text-sm">Signature Area</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-gray-700">Physician Name</p>
            <p>{signature.doctorName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Date</p>
            <p>{signature.date}</p>
          </div>
        </div>
        {signature.licenseNumber && (
          <div className="text-sm">
            <p className="font-semibold text-gray-700">License Number</p>
            <p>{signature.licenseNumber}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-300 pt-4 text-center text-xs text-gray-500 mt-6">
        <p>This is a confidential medical document. Unauthorized distribution is prohibited.</p>
        <p>Generated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  )
}
