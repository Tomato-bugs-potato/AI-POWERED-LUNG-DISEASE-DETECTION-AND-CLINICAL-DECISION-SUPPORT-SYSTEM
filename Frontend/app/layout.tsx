import type React from "react"
import type { Metadata } from "next"
import { Nunito, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
})
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MedAI Radiology | AI-Powered Medical Imaging Analysis",
  description: "Advanced AI-powered X-ray and CT scan analysis system for medical professionals",
  icons: {
    icon: [
      {
        url: "/image.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/image.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/image.png",
  },
}

import { QueryProvider } from "@/components/providers/QueryProvider"
import { Toaster } from "sonner"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunito.variable} font-sans antialiased text-foreground`}>
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors />
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  )
}
