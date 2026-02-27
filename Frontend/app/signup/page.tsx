"use client"

import { useState } from "react"
import { Mail, Shield, Users, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type SignupStep = "hospital-info" | "admin-account" | "captcha" | "otp" | "invite-employees" | "success"

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState<SignupStep>("hospital-info")
  const [formData, setFormData] = useState({
    hospitalName: "",
    hospitalEmail: "",
    hospitalPhone: "",
    city: "",
    country: "",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
    adminConfirmPassword: "",
    employees: [] as Array<{ fullName: string; email: string; role: "doctor" | "radiologist" | "admin" }>,
  })
  const [newEmployee, setNewEmployee] = useState({ fullName: "", email: "", role: "doctor" as const })
  const [otpCode, setOtpCode] = useState("")
  const [captchaChecked, setCaptchaChecked] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddEmployee = () => {
    if (newEmployee.fullName && newEmployee.email) {
      setFormData((prev) => ({
        ...prev,
        employees: [...prev.employees, newEmployee],
      }))
      setNewEmployee({ fullName: "", email: "", role: "doctor" })
    }
  }

  const handleRemoveEmployee = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      employees: prev.employees.filter((_, i) => i !== index),
    }))
  }

  const handleNext = () => {
    const steps: SignupStep[] = ["hospital-info", "admin-account", "captcha", "otp", "invite-employees", "success"]
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handlePrev = () => {
    const steps: SignupStep[] = ["hospital-info", "admin-account", "captcha", "otp", "invite-employees", "success"]
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const stepNumber = {
    "hospital-info": 1,
    "admin-account": 2,
    captcha: 3,
    otp: 4,
    "invite-employees": 5,
    success: 6,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">MediAI CAD</h1>
          </div>
          <p className="text-gray-600">Hospital Registration & Onboarding</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div key={step} className="flex flex-col items-center flex-1">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold mb-2 transition-colors ${
                    step <= stepNumber[currentStep] ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step}
                </div>
                <span className="text-xs text-gray-600 text-center">
                  {["Hospital Info", "Admin", "CAPTCHA", "OTP", "Invite", "Done"][step - 1]}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(stepNumber[currentStep] / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Cards */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Step {stepNumber[currentStep]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Hospital Information */}
            {currentStep === "hospital-info" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
                  <Input
                    placeholder="Enter hospital name"
                    value={formData.hospitalName}
                    onChange={(e) => handleInputChange("hospitalName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Email</label>
                  <Input
                    type="email"
                    placeholder="hospital@example.com"
                    value={formData.hospitalEmail}
                    onChange={(e) => handleInputChange("hospitalEmail", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Phone</label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.hospitalPhone}
                    onChange={(e) => handleInputChange("hospitalPhone", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <Input
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <Input
                      placeholder="Country"
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Admin Account */}
            {currentStep === "admin-account" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Full Name</label>
                  <Input
                    placeholder="Full Name"
                    value={formData.adminFullName}
                    onChange={(e) => handleInputChange("adminFullName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                  <Input
                    type="email"
                    placeholder="admin@hospital.com"
                    value={formData.adminEmail}
                    onChange={(e) => handleInputChange("adminEmail", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <Input
                    type="password"
                    placeholder="Enter a strong password"
                    value={formData.adminPassword}
                    onChange={(e) => handleInputChange("adminPassword", e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Min 8 characters, include uppercase, lowercase, number, and symbol
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    value={formData.adminConfirmPassword}
                    onChange={(e) => handleInputChange("adminConfirmPassword", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 3: CAPTCHA */}
            {currentStep === "captcha" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Verify You're Human</h3>
                <div className="border-2 border-gray-300 rounded-lg p-6">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="captcha"
                      checked={captchaChecked}
                      onChange={(e) => setCaptchaChecked(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 cursor-pointer"
                    />
                    <label htmlFor="captcha" className="flex-1 cursor-pointer">
                      <p className="font-medium text-gray-900">I'm not a robot</p>
                      <p className="text-xs text-gray-500">reCAPTCHA</p>
                    </label>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Privacy - Terms</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  This helps protect MediAI CAD from spam and abuse. We keep your data secure and private.
                </p>
              </div>
            )}

            {/* Step 4: OTP Verification */}
            {currentStep === "otp" && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    A verification code has been sent to <strong>{formData.adminEmail || "your email"}</strong>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                  <Input
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.slice(0, 6))}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Didn't receive the code? <span className="text-blue-600 cursor-pointer">Resend</span>
                </p>
              </div>
            )}

            {/* Step 5: Invite Employees */}
            {currentStep === "invite-employees" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Invite Team Members
                  </h3>
                  <p className="text-sm text-gray-600">
                    Invite doctors, radiologists, and other administrators to join your hospital
                  </p>

                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <Input
                        placeholder="Employee full name"
                        value={newEmployee.fullName}
                        onChange={(e) => setNewEmployee((prev) => ({ ...prev, fullName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <Input
                        type="email"
                        placeholder="employee@example.com"
                        value={newEmployee.email}
                        onChange={(e) => setNewEmployee((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <Select
                        value={newEmployee.role}
                        onValueChange={(value: any) => setNewEmployee((prev) => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="radiologist">Radiologist</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddEmployee} className="w-full">
                      Add Employee
                    </Button>
                  </div>
                </div>

                {/* Added Employees List */}
                {formData.employees.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900">Invited Employees ({formData.employees.length})</h4>
                    <div className="space-y-2">
                      {formData.employees.map((emp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{emp.fullName}</p>
                            <p className="text-sm text-gray-600">{emp.email}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium capitalize">
                              {emp.role}
                            </span>
                            <button
                              onClick={() => handleRemoveEmployee(idx)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Invitation emails will be sent to all employees with secure signup links
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Success */}
            {currentStep === "success" && (
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
                <h3 className="text-2xl font-bold text-gray-900">Registration Successful!</h3>
                <p className="text-gray-600">
                  Your hospital account has been created successfully. Invitation emails have been sent to all team
                  members.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left space-y-2">
                  <p className="text-sm font-medium text-green-900">✓ Hospital account created</p>
                  <p className="text-sm font-medium text-green-900">✓ Admin account registered</p>
                  <p className="text-sm font-medium text-green-900">✓ Email verified</p>
                  <p className="text-sm font-medium text-green-900">✓ {formData.employees.length} invitations sent</p>
                </div>
                <Button className="w-full mt-4">Go to Dashboard</Button>
              </div>
            )}
          </CardContent>

          {/* Navigation Buttons */}
          {currentStep !== "success" && (
            <div className="border-t border-gray-200 p-6 flex gap-3 justify-between">
              <Button variant="outline" onClick={handlePrev} disabled={currentStep === "hospital-info"}>
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === "hospital-info" && !formData.hospitalName) ||
                  (currentStep === "admin-account" && !formData.adminFullName) ||
                  (currentStep === "captcha" && !captchaChecked) ||
                  (currentStep === "otp" && otpCode.length !== 6) ||
                  (currentStep === "invite-employees" && formData.employees.length === 0)
                }
              >
                {currentStep === "invite-employees" ? "Complete Registration" : "Next"}
              </Button>
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          Already have an account? <span className="text-blue-600 cursor-pointer font-medium">Sign In</span>
        </div>
      </div>
    </div>
  )
}
