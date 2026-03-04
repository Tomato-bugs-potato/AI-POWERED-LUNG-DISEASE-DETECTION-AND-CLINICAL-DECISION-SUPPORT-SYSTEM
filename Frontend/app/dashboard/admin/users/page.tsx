import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, UserPlus, Settings } from "lucide-react"

export default function AdminUsersPage() {
  const users = [
    {
      id: "U-1001",
      name: "Dr. Sarah Chen",
      email: "sarah.chen@medai.com",
      role: "Radiologist",
      status: "active",
      lastLogin: "2024-01-15 10:30",
      casesReviewed: 156,
    },
    {
      id: "U-1002",
      name: "Dr. Michael Torres",
      email: "michael.torres@medai.com",
      role: "Doctor",
      status: "active",
      lastLogin: "2024-01-15 09:15",
      casesReviewed: 284,
    },
    {
      id: "U-1003",
      name: "Dr. Emily Watson",
      email: "emily.watson@medai.com",
      role: "Doctor",
      status: "active",
      lastLogin: "2024-01-15 08:45",
      casesReviewed: 192,
    },
    {
      id: "U-1004",
      name: "John Smith",
      email: "john.smith@medai.com",
      role: "Administrator",
      status: "active",
      lastLogin: "2024-01-15 07:20",
      casesReviewed: 0,
    },
    {
      id: "U-1005",
      name: "Dr. Lisa Park",
      email: "lisa.park@medai.com",
      role: "Radiologist",
      status: "inactive",
      lastLogin: "2024-01-10 14:30",
      casesReviewed: 98,
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground">Manage system users, roles, and permissions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Complete list of system users and their roles</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." className="pl-8 w-64" />
              </div>
              <Button>
                <UserPlus className="w-4 h-4" />
                Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cases Reviewed</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.id}</TableCell>
                  <TableCell>
                    <p className="font-medium">{user.name}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === "Administrator"
                          ? "destructive"
                          : user.role === "Radiologist"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "default" : "outline"}>{user.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{user.casesReviewed}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.lastLogin}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      <Settings className="w-4 h-4" />
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
