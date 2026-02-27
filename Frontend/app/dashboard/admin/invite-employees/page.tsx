"use client"

import { useState } from "react"
import { Mail, Users, CheckCircle2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface InvitedEmployee {
  id: string
  fullName: string
  email: string
  role: "doctor" | "radiologist" | "admin"
  invitationLink: string
  invitedAt: string
  status: "pending" | "accepted" | "expired"
}

export default function InviteEmployeesPage() {
  const [newEmployee, setNewEmployee] = useState({ fullName: "", email: "", role: "doctor" as const })
  const [invitedEmployees, setInvitedEmployees] = useState<InvitedEmployee[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [invitationSearch, setInvitationSearch] = useState("")

  const generateInvitationLink = () => {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    return `${window.location.origin}/join/employees/${token}`
  }

  const handleAddEmployee = () => {
    if (newEmployee.fullName && newEmployee.email) {
      const invitationLink = generateInvitationLink()
      const employee: InvitedEmployee = {
        id: Math.random().toString(36).substring(7),
        fullName: newEmployee.fullName,
        email: newEmployee.email,
        role: newEmployee.role,
        invitationLink,
        invitedAt: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        status: "pending",
      }
      setInvitedEmployees((prev) => [employee, ...prev])
      setNewEmployee({ fullName: "", email: "", role: "doctor" })
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRemoveEmployee = (id: string) => {
    setInvitedEmployees((prev) => prev.filter((emp) => emp.id !== id))
  }

  const handleResendInvitation = (id: string) => {
    setInvitedEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? {
              ...emp,
              invitedAt: new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
            }
          : emp,
      ),
    )
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const filteredEmployees = invitedEmployees.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(invitationSearch.toLowerCase()) ||
      emp.email.toLowerCase().includes(invitationSearch.toLowerCase()),
  )

  const getRoleColor = (role: string) => {
    switch (role) {
      case "doctor":
        return "bg-blue-100 text-blue-700"
      case "radiologist":
        return "bg-purple-100 text-purple-700"
      case "admin":
        return "bg-indigo-100 text-indigo-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700"
      case "accepted":
        return "bg-green-100 text-green-700"
      case "expired":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            Invite Team Members
          </h1>
          <p className="text-gray-600 mt-2">Add doctors, radiologists, and administrators to your hospital</p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm font-medium text-green-800">Invitation sent successfully!</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invitation Form */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Add New Employee</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <Input
                    placeholder="John Smith"
                    value={newEmployee.fullName}
                    onChange={(e) => setNewEmployee((prev) => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <Input
                    type="email"
                    placeholder="john@hospital.com"
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
                      <SelectItem value="doctor">
                        <span>👨‍⚕️ Doctor</span>
                      </SelectItem>
                      <SelectItem value="radiologist">
                        <span>🔬 Radiologist</span>
                      </SelectItem>
                      <SelectItem value="admin">
                        <span>⚙️ Administrator</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddEmployee}
                  className="w-full"
                  disabled={!newEmployee.fullName || !newEmployee.email}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  An invitation link will be generated and can be shared with the employee
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Invitations List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            {invitedEmployees.length > 0 && (
              <div>
                <Input
                  placeholder="Search by name or email..."
                  value={invitationSearch}
                  onChange={(e) => setInvitationSearch(e.target.value)}
                  className="mb-4"
                />
              </div>
            )}

            {invitedEmployees.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-gray-900">{invitedEmployees.length}</p>
                    <p className="text-sm text-gray-600">Total Invited</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {invitedEmployees.filter((e) => e.status === "accepted").length}
                    </p>
                    <p className="text-sm text-gray-600">Accepted</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {invitedEmployees.filter((e) => e.status === "pending").length}
                    </p>
                    <p className="text-sm text-gray-600">Pending</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Invited Employees List */}
            {filteredEmployees.length > 0 ? (
              <div className="space-y-3">
                {filteredEmployees.map((emp) => (
                  <Card key={emp.id}>
                    <CardContent className="pt-6 space-y-4">
                      {/* Employee Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{emp.fullName}</h3>
                          <p className="text-sm text-gray-600">{emp.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(emp.role)}`}>
                            {emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(emp.status)}`}
                          >
                            {emp.status}
                          </span>
                        </div>
                      </div>

                      {/* Invitation Link */}
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-2">Invitation Link</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-gray-700 font-mono truncate flex-1 bg-white px-2 py-1 rounded border border-gray-200">
                            {emp.invitationLink.substring(0, 50)}...
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(emp.invitationLink, emp.id)}
                          >
                            {copiedId === emp.id ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="text-xs text-gray-500 flex items-center justify-between">
                        <span>Invited: {emp.invitedAt}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResendInvitation(emp.id)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => handleRemoveEmployee(emp.id)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : invitedEmployees.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No employees invited yet</p>
                  <p className="text-sm text-gray-400 mt-1">Add your first team member to get started</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <p className="text-gray-500">No matching results</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
