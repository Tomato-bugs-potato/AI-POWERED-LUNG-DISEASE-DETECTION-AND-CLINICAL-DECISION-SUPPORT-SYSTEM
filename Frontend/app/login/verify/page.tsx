"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Activity, ArrowLeft, Shield } from "lucide-react"
import Link from "next/link"

export default function VerifyPage() {
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleVerify = async () => {
    if (otp.length !== 6) return

    setIsLoading(true)

    // Simulate 2FA verification
    setTimeout(() => {
      // Navigate to role selection or dashboard
      window.location.href = "/dashboard"
    }, 1000)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Medical Logo */}
        <Link href="/login" className="flex flex-col items-center gap-3 text-center group">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-lg group-hover:scale-105 transition-transform">
            <Activity className="w-8 h-8" />
          </div>
        </Link>

        {/* Verification Card */}
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                <Shield className="w-7 h-7 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
            <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OTP Input */}
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Verify Button */}
            <Button onClick={handleVerify} className="w-full" disabled={otp.length !== 6 || isLoading}>
              {isLoading ? "Verifying..." : "Verify and Sign In"}
            </Button>

            {/* Alternative Options */}
            <div className="space-y-3 pt-4 border-t">
              <Button variant="ghost" size="sm" className="w-full text-sm">
                Resend code
              </Button>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          Can't access your authenticator app? Contact your system administrator for account recovery.
        </p>
      </div>
    </div>
  )
}
