"use client"

import type React from "react"

import { Activity, FileText, LayoutDashboard, Search, Settings, Upload, UserCog, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Suspense } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const radiologistNav = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard/radiologist" },
  { title: "Upload Scans", icon: Upload, href: "/dashboard/radiologist/upload" },
  { title: "Review Queue", icon: FileText, href: "/dashboard/radiologist/queue" },
]

const doctorNav = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard/doctor" },
  { title: "Case Review", icon: FileText, href: "/dashboard/doctor/cases" },
  { title: "Patient Search", icon: Search, href: "/dashboard/doctor/patients" },
]

const adminNav = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard/admin" },
  { title: "User Management", icon: Users, href: "/dashboard/admin/users" },
  { title: "System Settings", icon: Settings, href: "/dashboard/admin/settings" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const role = pathname?.includes("/radiologist") ? "radiologist" : pathname?.includes("/doctor") ? "doctor" : "admin"

  const navigation = role === "radiologist" ? radiologistNav : role === "doctor" ? doctorNav : adminNav

  return (
    <SidebarProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <Sidebar>
          <SidebarHeader className="border-b">
            <div className="flex items-center gap-3 px-2 py-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">MedAI Radiology</h2>
                <p className="text-xs text-muted-foreground capitalize">{role} Portal</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname === item.href}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Switch Role</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={role === "radiologist"}>
                      <Link href="/dashboard/radiologist">
                        <UserCog />
                        <span>Radiologist</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={role === "doctor"}>
                      <Link href="/dashboard/doctor">
                        <Users />
                        <span>Doctor</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={role === "admin"}>
                      <Link href="/dashboard/admin">
                        <Settings />
                        <span>Administrator</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="w-full">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">DR</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start flex-1 text-left">
                        <span className="text-sm font-medium">Dr. Sarah Chen</span>
                        <span className="text-xs text-muted-foreground capitalize">{role}</span>
                      </div>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                    <DropdownMenuItem>Security</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => (window.location.href = "/login")}>
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </Suspense>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 bg-background/95 backdrop-blur border-b border-border px-4">
          <SidebarTrigger />
          <div className="flex-1" />
          <Button variant="ghost" size="icon">
            <Search className="w-4 h-4" />
          </Button>
        </header>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
