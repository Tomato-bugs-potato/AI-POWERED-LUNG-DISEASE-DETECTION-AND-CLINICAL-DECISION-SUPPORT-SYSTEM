import { redirect } from "next/navigation"

export default function DashboardPage() {
  // Default redirect to radiologist dashboard
  // In a real app, this would check user role and redirect accordingly
  redirect("/dashboard/radiologist")
}
