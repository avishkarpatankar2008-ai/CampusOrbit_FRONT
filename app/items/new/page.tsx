"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navbar } from "@/components/navbar"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { createItem, uploadItemImages } from "@/lib/api"
import { Loader2, Upload, X, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const CATEGORIES = [
  { value: "books", label: "Books" },
  { value: "electronics", label: "Electronics" },
  { value: "lab_equipment", label: "Lab Equipment" },
  { value: "instruments", label: "Instruments" },
  { value: "sports", label: "Sports" },
  { value: "stationery", label: "Stationery" },
  { value: "other", label: "Other" },
]

const CONDITIONS = [
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "acceptable", label: "Acceptable" },
]

export default function NewItemPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    condition: "",
    price_per_day: "",
    security_deposit: "0",
    max_rental_days: "30",
    location_name: "",
    instant_booking: false,
    barter_ok: false,
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4)
    setImageFiles(files)
    const previews = files.map((f) => URL.createObjectURL(f))
    setImagePreviews(previews)
  }

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.category || !formData.condition) {
      toast.error("Please select a category and condition")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createItem({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        price_per_day: parseFloat(formData.price_per_day),
        security_deposit: parseFloat(formData.security_deposit) || 0,
        max_rental_days: parseInt(formData.max_rental_days) || 30,
        location_name: formData.location_name,
        instant_booking: formData.instant_booking,
        barter_ok: formData.barter_ok,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      const itemId = result.data?.item_id
      if (!itemId) {
        toast.error("Item created but no ID returned")
        return
      }

      // FIX: use uploadItemImages from api.ts which correctly sends multipart/form-data
      if (imageFiles.length > 0) {
        const uploadResult = await uploadItemImages(itemId, imageFiles)
        if (uploadResult.error) {
          toast.warning(
            "Item created but image upload failed: " + uploadResult.error
          )
        }
      }

      toast.success("Item listed successfully!")
      router.push("/items")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <AppSidebar />
        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-2xl">
            <div className="mb-6 flex items-center gap-4">
              <Link href="/items">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-foreground">
                List an Item
              </h1>
            </div>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Item Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g. Calculus textbook 4th edition"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Describe your item's condition, any accessories included, etc."
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(v) =>
                          setFormData((p) => ({ ...p, category: v }))
                        }
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Condition *</Label>
                      <Select
                        value={formData.condition}
                        onValueChange={(v) =>
                          setFormData((p) => ({ ...p, condition: v }))
                        }
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="price_per_day">Price/day (₹) *</Label>
                      <Input
                        id="price_per_day"
                        name="price_per_day"
                        type="number"
                        min="1"
                        step="0.50"
                        placeholder="50"
                        value={formData.price_per_day}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="security_deposit">Deposit (₹)</Label>
                      <Input
                        id="security_deposit"
                        name="security_deposit"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.security_deposit}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_rental_days">Max days</Label>
                      <Input
                        id="max_rental_days"
                        name="max_rental_days"
                        type="number"
                        min="1"
                        placeholder="30"
                        value={formData.max_rental_days}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location_name">Location / Hostel Block *</Label>
                    <Input
                      id="location_name"
                      name="location_name"
                      placeholder="e.g. Block A, Boys Hostel"
                      value={formData.location_name}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Images */}
                  <div className="space-y-2">
                    <Label>Photos (up to 4)</Label>
                    <div className="flex flex-wrap gap-3">
                      {imagePreviews.map((src, i) => (
                        <div key={i} className="relative">
                          <img
                            src={src}
                            alt={`Preview ${i + 1}`}
                            className="h-24 w-24 rounded-lg object-cover border border-border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {imagePreviews.length < 4 && (
                        <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleImageChange}
                            disabled={isSubmitting}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Instant Booking</p>
                        <p className="text-xs text-muted-foreground">
                          Auto-approve booking requests
                        </p>
                      </div>
                      <Switch
                        checked={formData.instant_booking}
                        onCheckedChange={(v) =>
                          setFormData((p) => ({ ...p, instant_booking: v }))
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Open to Barter</p>
                        <p className="text-xs text-muted-foreground">
                          Accept item exchanges instead of cash
                        </p>
                      </div>
                      <Switch
                        checked={formData.barter_ok}
                        onCheckedChange={(v) =>
                          setFormData((p) => ({ ...p, barter_ok: v }))
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Listing…
                        </>
                      ) : (
                        "List Item"
                      )}
                    </Button>
                    <Link href="/items">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
