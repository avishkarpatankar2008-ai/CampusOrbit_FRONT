"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navbar } from "@/components/navbar"
import { AppSidebar } from "@/components/app-sidebar"
import { BookingCard, BookingCardSkeleton } from "@/components/booking-card"
import { EmptyState } from "@/components/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getBookings,
  getLentBookings,
  updateBookingStatus,
  type Booking,
} from "@/lib/api"
import { Calendar, Loader2, ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function BookingsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [myBookings, setMyBookings] = useState<Booking[]>([]) // as renter
  const [lentBookings, setLentBookings] = useState<Booking[]>([]) // as owner
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const loadBookings = useCallback(async () => {
    if (!isAuthenticated) return
    setIsLoading(true)

    const [renterResult, ownerResult] = await Promise.all([
      getBookings(),
      getLentBookings(),
    ])

    if (renterResult.data?.bookings) {
      setMyBookings(renterResult.data.bookings)
    }
    if (ownerResult.data?.bookings) {
      setLentBookings(ownerResult.data.bookings)
    }

    setIsLoading(false)
  }, [isAuthenticated])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const handleStatusChange = async (id: string, status: Booking["status"]) => {
    setUpdatingId(id)
    const result = await updateBookingStatus(id, status)
    if (result.data?.success) {
      // Refresh both lists
      await loadBookings()
    }
    setUpdatingId(null)
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  const pendingIncoming = lentBookings.filter(
    (b) => b.status === "pending"
  ).length

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex">
        <AppSidebar />

        <main className="flex-1 p-4 lg:p-8">
          <div className="page-transition mx-auto max-w-4xl">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                  My Bookings
                </h1>
                <p className="mt-1 text-muted-foreground">
                  Manage your rental requests and reservations
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadBookings}
                disabled={isLoading}
                className="shrink-0 gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            <Tabs defaultValue="incoming" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="incoming" className="gap-2">
                  <ArrowDownLeft className="h-4 w-4" />
                  Incoming
                  {pendingIncoming > 0 && (
                    <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {pendingIncoming}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="outgoing" className="gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Outgoing
                </TabsTrigger>
              </TabsList>

              {/* Incoming: bookings where current user is the owner */}
              <TabsContent value="incoming" className="space-y-4">
                {isLoading ? (
                  <>
                    <BookingCardSkeleton />
                    <BookingCardSkeleton />
                    <BookingCardSkeleton />
                  </>
                ) : lentBookings.length === 0 ? (
                  <Card className="border-border bg-card">
                    <CardContent className="py-12">
                      <EmptyState
                        icon={
                          <Calendar className="h-8 w-8 text-muted-foreground" />
                        }
                        title="No incoming requests"
                        description="When someone wants to rent your items, their requests will appear here."
                        action={{ label: "List an item", href: "/items/new" }}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  lentBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      type="incoming"
                      onStatusChange={handleStatusChange}
                      isUpdating={updatingId === booking.id}
                    />
                  ))
                )}
              </TabsContent>

              {/* Outgoing: bookings where current user is the renter */}
              <TabsContent value="outgoing" className="space-y-4">
                {isLoading ? (
                  <>
                    <BookingCardSkeleton />
                    <BookingCardSkeleton />
                    <BookingCardSkeleton />
                  </>
                ) : myBookings.length === 0 ? (
                  <Card className="border-border bg-card">
                    <CardContent className="py-12">
                      <EmptyState
                        icon={
                          <Calendar className="h-8 w-8 text-muted-foreground" />
                        }
                        title="No bookings yet"
                        description="Your rental requests will appear here."
                        action={{ label: "Browse Items", href: "/items" }}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  myBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      type="outgoing"
                      onStatusChange={handleStatusChange}
                      isUpdating={updatingId === booking.id}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
