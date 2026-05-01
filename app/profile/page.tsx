"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navbar } from "@/components/navbar"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fetchApi } from "@/lib/api"
import { User, Mail, Phone, GraduationCap, Loader2, Save, Camera } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    college: "",
  })

 useEffect(() => {
  if (!authLoading && !isAuthenticated) {
    router.replace("/login")
  }
}, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        college: user.college || "",
      })
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      phone: user?.phone || "",
      college: user?.college || "",
    })
    setSaveError("")
    setIsEditing(false)
  }

  const handleSave = async () => {
    setSaveError("")
    setIsSaving(true)

    const result = await fetchApi("/api/auth/me", {
      method: "PUT",
      body: JSON.stringify({
        name: formData.name,
        phone: formData.phone,
        college: formData.college,
      }),
    })

    if (result.error) {
      setSaveError(result.error)
    } else {
      await refreshUser()
      setIsEditing(false)
    }

    setIsSaving(false)
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex">
        <AppSidebar />

        <main className="flex-1 p-4 lg:p-8">
          <div className="page-transition mx-auto max-w-2xl">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">My Profile</h1>
              <p className="mt-1 text-muted-foreground">Manage your account information</p>
            </div>

            {/* Avatar + name card */}
            <Card className="mb-6 border-border bg-card">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <div className="relative">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-24 w-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                    <button
                      type="button"
                      className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label="Change avatar"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-xl font-semibold text-foreground">{user?.name}</h2>
                    <p className="text-muted-foreground">{user?.email}</p>
                    {user?.college && (
                      <p className="mt-1 text-sm text-muted-foreground">{user.college}</p>
                    )}
                  </div>

                  <Button
                    variant={isEditing ? "outline" : "default"}
                    onClick={isEditing ? handleCancel : () => setIsEditing(true)}
                  >
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account info */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {saveError && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {saveError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Full Name
                  </Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={isSaving}
                    />
                  ) : (
                    <p className="rounded-lg bg-muted/50 px-3 py-2 text-foreground">
                      {user?.name || "Not set"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Address
                  </Label>
                  <p className="rounded-lg bg-muted/50 px-3 py-2 text-muted-foreground">
                    {user?.email}
                    <span className="ml-2 text-xs">(Cannot be changed)</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Phone Number
                  </Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      disabled={isSaving}
                    />
                  ) : (
                    <p className="rounded-lg bg-muted/50 px-3 py-2 text-foreground">
                      {user?.phone || "Not set"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="college" className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    College
                  </Label>
                  {isEditing ? (
                    <Input
                      id="college"
                      name="college"
                      value={formData.college}
                      onChange={handleChange}
                      placeholder="Your College Name"
                      disabled={isSaving}
                    />
                  ) : (
                    <p className="rounded-lg bg-muted/50 px-3 py-2 text-foreground">
                      {user?.college || "Not set"}
                    </p>
                  )}
                </div>

                {isEditing && (
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} disabled={isSaving} className="btn-glow">
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6 border-destructive/20 bg-card">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
