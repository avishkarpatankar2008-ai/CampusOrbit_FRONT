"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getItem, createBooking, type Item } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Calendar,
  MessageCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Star,
  Shield,
} from "lucide-react"
import { formatDistanceToNow, format, addDays } from "date-fns"
import { toast } from "sonner"

const conditionLabels: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  "like-new": "Like New",
  good: "Good",
  fair: "Fair",
  acceptable: "Acceptable",
}

const conditionColors: Record<string, string> = {
  new: "bg-green-500/10 text-green-600 dark:text-green-400",
  like_new: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "like-new": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  good: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  fair: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  acceptable: "bg-red-500/10 text-red-600 dark:text-red-400",
}

const fetcher = async (id: string): Promise<Item | null> => {
  const result = await getItem(id)
  if (result.error || !result.data) return null
  return result.data.item ?? null
}

export default function ItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const itemId = params.id as string

  const {
    data: item,
    isLoading,
    error,
  } = useSWR<Item | null>(itemId ? `item-${itemId}` : null, () =>
    fetcher(itemId)
  )

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingError, setBookingError] = useState("")
  const [bookingData, setBookingData] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
  })

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setBookingError("")

    if (
      new Date(bookingData.startDate) >= new Date(bookingData.endDate)
    ) {
      setBookingError("End date must be after start date")
      return
    }

    setIsBooking(true)

    const result = await createBooking({
      item_id: itemId,
      start_date: new Date(bookingData.startDate).toISOString(),
      end_date: new Date(bookingData.endDate).toISOString(),
    })

    if (result.data?.success) {
      setBookingSuccess(true)
      setShowBookingForm(false)
      toast.success(
        result.data.status === "approved"
          ? "Booking confirmed instantly!"
          : "Booking request sent! Awaiting owner approval."
      )
    } else {
      setBookingError(result.error || "Booking failed. Please try again.")
    }
    setIsBooking(false)
  }

  const handleMessageOwner = () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    if (!item) return
    const ownerId = item.owner_id || item.ownerId
    const ownerName = encodeURIComponent(item.owner_name)
    router.push(`/chat?user=${ownerId}&name=${ownerName}`)
  }

  const nextImage = () => {
    if (item?.images?.length) {
      setCurrentImageIndex((prev) => (prev + 1) % item.images.length)
    }
  }

  const prevImage = () => {
    if (item?.images?.length) {
      setCurrentImageIndex(
        (prev) => (prev - 1 + item.images.length) % item.images.length
      )
    }
  }

  // Cost preview
  const previewDays = Math.max(
    1,
    Math.ceil(
      (new Date(bookingData.endDate).getTime() -
        new Date(bookingData.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  )
  const previewCost = item
    ? previewDays * item.price_per_day + (item.security_deposit || 0)
    : 0

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Item not found</h1>
          <p className="mt-2 text-muted-foreground">
            This item may have been removed or is no longer available.
          </p>
          <Button asChild className="mt-6">
            <Link href="/items">Browse Items</Link>
          </Button>
        </div>
      </div>
    )
  }

  const isOwner =
    user && (item.owner_id === user.id || item.ownerId === user.id)
  const condition = item.condition || "good"
  const images = item.images?.length ? item.images : []
  const locationName = item.location_name || item.location || ""

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-xl bg-muted aspect-video">
              {images.length > 0 ? (
                <>
                  <img
                    src={images[currentImageIndex]}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-md hover:bg-background"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-md hover:bg-background"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImageIndex(i)}
                            className={`h-2 w-2 rounded-full transition-colors ${
                              i === currentImageIndex
                                ? "bg-white"
                                : "bg-white/50"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No images available
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      i === currentImageIndex
                        ? "border-primary"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${item.title} ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex flex-wrap items-start gap-2">
                <Badge
                  className={
                    conditionColors[condition] || "bg-muted text-muted-foreground"
                  }
                >
                  {conditionLabels[condition] || condition}
                </Badge>
                {item.instant_booking && (
                  <Badge className="bg-primary/10 text-primary">
                    Instant Booking
                  </Badge>
                )}
                {!item.is_available && (
                  <Badge className="bg-destructive/10 text-destructive">
                    Unavailable
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                {item.title}
              </h1>
              <p className="mt-1 text-sm capitalize text-muted-foreground">
                {item.category?.replace(/_/g, " ")}
              </p>
            </div>

            {/* Price */}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-3xl font-bold text-primary">
                ₹{item.price_per_day ?? item.price}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  / day
                </span>
              </p>
              {item.security_deposit > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  + ₹{item.security_deposit} security deposit
                </p>
              )}
              {item.max_rental_days && (
                <p className="text-sm text-muted-foreground">
                  Max {item.max_rental_days} days
                </p>
              )}
            </div>

            {/* Meta info */}
            <div className="space-y-2 text-sm text-muted-foreground">
              {locationName && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{locationName}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  Listed{" "}
                  {formatDistanceToNow(new Date(item.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0" />
                <span>
                  {item.owner_name}
                  {item.owner_avg_rating > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {item.owner_avg_rating.toFixed(1)}
                    </span>
                  )}
                </span>
              </div>
              {item.owner_trust_score > 0 && (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 shrink-0" />
                  <span>Trust Score: {item.owner_trust_score}/100</span>
                </div>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <div>
                <h2 className="mb-2 font-semibold text-foreground">
                  Description
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {item.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {bookingSuccess ? (
              <div className="flex items-center gap-2 rounded-xl bg-green-500/10 p-4 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p className="font-medium text-sm">
                  Booking request sent! The owner will review your request.
                </p>
              </div>
            ) : isOwner ? (
              <p className="text-sm text-muted-foreground">
                This is your listing.
              </p>
            ) : !isAuthenticated ? (
              <div className="flex gap-3">
                <Button asChild className="flex-1">
                  <Link href="/login">Sign in to Book</Link>
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/login">Message Owner</Link>
                </Button>
              </div>
            ) : !item.is_available ? (
              <div className="space-y-3">
                <Button disabled className="w-full">
                  Currently Unavailable
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleMessageOwner}
                >
                  <MessageCircle className="h-4 w-4" />
                  Message Owner
                </Button>
              </div>
            ) : !showBookingForm ? (
              <div className="flex gap-3">
                <Button
                  className="flex-1 btn-glow"
                  onClick={() => setShowBookingForm(true)}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Book Now
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleMessageOwner}
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </Button>
              </div>
            ) : (
              <Card className="border-border">
                <CardContent className="p-4">
                  <h3 className="mb-4 font-semibold text-foreground">
                    Book this item
                  </h3>
                  <form onSubmit={handleBooking} className="space-y-4">
                    {bookingError && (
                      <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        {bookingError}
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={bookingData.startDate}
                          min={format(new Date(), "yyyy-MM-dd")}
                          onChange={(e) =>
                            setBookingData((prev) => ({
                              ...prev,
                              startDate: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={bookingData.endDate}
                          min={
                            bookingData.startDate ||
                            format(addDays(new Date(), 1), "yyyy-MM-dd")
                          }
                          onChange={(e) =>
                            setBookingData((prev) => ({
                              ...prev,
                              endDate: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Cost Preview */}
                    {item && (
                      <div className="rounded-lg bg-muted p-3 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>
                            ₹{item.price_per_day} × {previewDays} day
                            {previewDays !== 1 ? "s" : ""}
                          </span>
                          <span>₹{previewDays * item.price_per_day}</span>
                        </div>
                        {item.security_deposit > 0 && (
                          <div className="flex justify-between text-muted-foreground mt-1">
                            <span>Security deposit</span>
                            <span>₹{item.security_deposit}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-foreground mt-2 pt-2 border-t border-border">
                          <span>Total</span>
                          <span>₹{previewCost}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowBookingForm(false)
                          setBookingError("")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={isBooking}
                      >
                        {isBooking ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Booking...
                          </>
                        ) : (
                          "Confirm Booking"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
