"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Navbar } from "@/components/navbar"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getLostFoundItems,
  createLostFoundItem,
  resolveLostFoundItem,
  deleteLostFoundItem,
  type LostFoundItem,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import {
  Search,
  MapPin,
  Calendar,
  User,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Package,
  Phone,
  Mail,
  X,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { toast } from "sonner"

const categories = [
  "Electronics",
  "Documents",
  "Keys",
  "Wallet",
  "Clothing",
  "Accessories",
  "Books",
  "Others",
]

const fetcher = async (type: "lost" | "found") => {
  const result = await getLostFoundItems(type)
  return result.data?.reports || []
}

export default function LostFoundPage() {
  const { isAuthenticated, user } = useAuth()
  const [activeTab, setActiveTab] = useState<"lost" | "found">("lost")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedItem, setSelectedItem] = useState<LostFoundItem | null>(null)
  const [formData, setFormData] = useState({
    type: "lost" as "lost" | "found",
    title: "",
    description: "",
    category: "",
    location: "",
    date: format(new Date(), "yyyy-MM-dd"),
    contactInfo: "",
    reward: "",
  })

  const { data: items, isLoading } = useSWR<LostFoundItem[]>(
    ["lost-found", activeTab],
    () => fetcher(activeTab)
  )

  const filteredItems = items?.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error("Please sign in to report an item")
      return
    }
    if (!formData.title || !formData.location || !formData.description) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)

    const result = await createLostFoundItem({
      type: formData.type,
      title: formData.title,
      description: formData.description,
      category: formData.category || undefined,
      location: formData.location,
      date_lost_found: formData.date
        ? new Date(formData.date).toISOString()
        : undefined,
      contact_email: formData.contactInfo || undefined,
      reward: formData.reward ? parseFloat(formData.reward) : 0,
    })

    if (result.data?.success) {
      setIsDialogOpen(false)
      setFormData({
        type: "lost",
        title: "",
        description: "",
        category: "",
        location: "",
        date: format(new Date(), "yyyy-MM-dd"),
        contactInfo: "",
        reward: "",
      })
      mutate(["lost-found", activeTab])
      mutate(["lost-found", formData.type === "lost" ? "lost" : "found"])
      toast.success("Report submitted successfully!")
    } else {
      toast.error(result.error || "Failed to submit report")
    }

    setIsSubmitting(false)
  }

  const handleResolve = async (item: LostFoundItem) => {
    const result = await resolveLostFoundItem(item.id)
    if (result.data?.success) {
      mutate(["lost-found", activeTab])
      setSelectedItem(null)
      toast.success("Item marked as resolved")
    } else {
      toast.error(result.error || "Failed to resolve")
    }
  }

  const handleDelete = async (item: LostFoundItem) => {
    const result = await deleteLostFoundItem(item.id)
    if (result.data?.success) {
      mutate(["lost-found", activeTab])
      setSelectedItem(null)
      toast.success("Report deleted")
    } else {
      toast.error(result.error || "Failed to delete")
    }
  }

  // Get display date: prefer date_lost_found, fall back to created_at
  const getDisplayDate = (item: LostFoundItem) => {
    const dateStr = item.date_lost_found || item.created_at
    if (!dateStr) return null
    try {
      return new Date(dateStr)
    } catch {
      return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="page-transition">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                Lost & Found
              </h1>
              <p className="mt-1 text-muted-foreground">
                Help your campus community find their belongings
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-glow">
                  <Plus className="mr-2 h-4 w-4" />
                  Report Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Report Lost or Found Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Type Selection */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={formData.type === "lost" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, type: "lost" }))
                      }
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      I Lost Something
                    </Button>
                    <Button
                      type="button"
                      variant={
                        formData.type === "found" ? "default" : "outline"
                      }
                      className="flex-1"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, type: "found" }))
                      }
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      I Found Something
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Item Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Blue Backpack, iPhone 13"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">
                        {formData.type === "lost" ? "When lost?" : "When found?"}
                        <span className="text-destructive"> *</span>
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            date: e.target.value,
                          }))
                        }
                        max={format(new Date(), "yyyy-MM-dd")}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">
                      {formData.type === "lost"
                        ? "Last seen location"
                        : "Where found?"}
                      <span className="text-destructive"> *</span>
                    </Label>
                    <Input
                      id="location"
                      placeholder="e.g., Library 2nd Floor, Cafeteria"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Description <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the item in detail (color, size, brand, distinctive marks...)"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contact">Contact (email/phone)</Label>
                      <Input
                        id="contact"
                        placeholder="your@email.com or phone"
                        value={formData.contactInfo}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            contactInfo: e.target.value,
                          }))
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                    {formData.type === "lost" && (
                      <div className="space-y-2">
                        <Label htmlFor="reward">Reward (₹)</Label>
                        <Input
                          id="reward"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.reward}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              reward: e.target.value,
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-glow"
                    disabled={isSubmitting || !isAuthenticated}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : !isAuthenticated ? (
                      "Sign in to report"
                    ) : (
                      "Submit Report"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Tabs */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, description, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "lost" | "found")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="lost" className="gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Lost Items
                </TabsTrigger>
                <TabsTrigger value="found" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Found Items
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="mb-3 flex gap-3">
                      <div className="h-20 w-20 animate-pulse rounded-lg bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !filteredItems || filteredItems.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="py-12">
                <EmptyState
                  icon={<Package className="h-8 w-8 text-muted-foreground" />}
                  title={
                    searchQuery
                      ? "No matching items"
                      : `No ${activeTab} items reported`
                  }
                  description={
                    searchQuery
                      ? "Try adjusting your search terms."
                      : `Be the first to report a ${activeTab} item.`
                  }
                  action={
                    !searchQuery
                      ? {
                          label: "Report an item",
                          onClick: () => setIsDialogOpen(true),
                        }
                      : undefined
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
                const displayDate = getDisplayDate(item)
                const isOwner = user?.id === item.reported_by_id
                const firstImage = item.images?.[0]

                return (
                  <Card
                    key={item.id}
                    className={`card-hover overflow-hidden border-border bg-card transition-all cursor-pointer ${
                      item.status === "resolved" ? "opacity-60" : ""
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start gap-3">
                        {firstImage ? (
                          <img
                            src={firstImage}
                            alt={item.title}
                            className="h-20 w-20 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={
                                item.type === "lost" ? "destructive" : "default"
                              }
                              className="text-xs"
                            >
                              {item.type === "lost" ? "Lost" : "Found"}
                            </Badge>
                            {item.status === "resolved" && (
                              <Badge variant="secondary" className="text-xs">
                                Resolved
                              </Badge>
                            )}
                            {item.reward > 0 && (
                              <Badge variant="outline" className="text-xs text-amber-600">
                                ₹{item.reward} reward
                              </Badge>
                            )}
                          </div>
                          <h3 className="line-clamp-1 font-semibold text-foreground text-sm">
                            {item.title}
                          </h3>
                          {item.category && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>

                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="line-clamp-1">{item.location}</span>
                        </div>
                        {displayDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>
                              {format(displayDate, "MMM d, yyyy")}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="line-clamp-1">
                            {item.reported_by_name}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-border pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedItem(item)
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Item Detail Modal */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        {selectedItem && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={
                      selectedItem.type === "lost" ? "destructive" : "default"
                    }
                  >
                    {selectedItem.type === "lost" ? "Lost" : "Found"}
                  </Badge>
                  {selectedItem.status === "resolved" && (
                    <Badge variant="secondary">Resolved</Badge>
                  )}
                  {selectedItem.reward > 0 && (
                    <Badge variant="outline" className="text-amber-600">
                      ₹{selectedItem.reward} reward
                    </Badge>
                  )}
                </div>
              </div>
              <DialogTitle className="mt-2">{selectedItem.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Images */}
              {selectedItem.images?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {selectedItem.images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`${selectedItem.title} ${i + 1}`}
                      className="h-32 w-32 shrink-0 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Description
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedItem.description}
                </p>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {selectedItem.category && (
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Category:</span>
                    <span>{selectedItem.category}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Location:</span>
                  <span>{selectedItem.location}</span>
                </div>
                {getDisplayDate(selectedItem) && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Date:</span>
                    <span>
                      {format(getDisplayDate(selectedItem)!, "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Reported by:</span>
                  <span>{selectedItem.reported_by_name}</span>
                </div>
              </div>

              {/* Contact Info */}
              {selectedItem.contact_email && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium mb-1">Contact Reporter</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${selectedItem.contact_email}`}
                      className="text-primary hover:underline"
                    >
                      {selectedItem.contact_email}
                    </a>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {!selectedItem.contact_email && (
                  <Button variant="outline" className="flex-1" asChild>
                    <a href={`mailto:?subject=About your ${selectedItem.type} item: ${selectedItem.title}`}>
                      <Mail className="mr-2 h-4 w-4" />
                      Contact
                    </a>
                  </Button>
                )}
                {user?.id === selectedItem.reported_by_id &&
                  selectedItem.status !== "resolved" && (
                    <Button
                      className="flex-1"
                      onClick={() => handleResolve(selectedItem)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark Resolved
                    </Button>
                  )}
                {user?.id === selectedItem.reported_by_id && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(selectedItem)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
