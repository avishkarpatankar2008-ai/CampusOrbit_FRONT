"use client"

import type { Booking } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

interface BookingCardProps {
  booking: Booking
  type: "incoming" | "outgoing"
  onStatusChange?: (id: string, status: Booking["status"]) => void
  isUpdating?: boolean
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  approved: {
    label: "Approved",
    className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  active: {
    label: "Active",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  returned: {
    label: "Returned",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
}

export function BookingCard({ booking, type, onStatusChange, isUpdating }: BookingCardProps) {
  // Support both snake_case (backend) and camelCase (legacy)
  const itemTitle = booking.item_title ?? (booking as any).itemTitle ?? "Unknown Item"
  const ownerName = booking.owner_name ?? (booking as any).ownerName ?? ""
  const renterName = booking.renter_name ?? (booking as any).renterName ?? (booking as any).borrowerName ?? ""
  const startDate = booking.start_date ?? (booking as any).startDate ?? ""
  const endDate = booking.end_date ?? (booking as any).endDate ?? ""
  const totalCost = booking.total_cost ?? (booking as any).totalPrice ?? (booking as any).totalCost ?? 0
  const createdAt = booking.created_at ?? (booking as any).createdAt ?? new Date().toISOString()

  const status = statusConfig[booking.status] ?? {
    label: booking.status,
    className: "bg-muted text-muted-foreground",
  }

  const canApprove = type === "incoming" && booking.status === "pending"
  const canCancel = (booking.status === "pending" || booking.status === "approved") && type === "outgoing"
  const canMarkReturned = type === "incoming" && booking.status === "active"

  return (
    <Card className="overflow-hidden border-border bg-card transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{itemTitle}</h3>
              <Badge className={status.className}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {type === "incoming" ? `Requested by: ${renterName}` : `Owner: ${ownerName}`}
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
              {startDate && endDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    {format(new Date(startDate), "MMM d")} –{" "}
                    {format(new Date(endDate), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-lg font-bold text-primary">₹{totalCost}</span>

              {onStatusChange && (
                <div className="flex gap-2">
                  {canApprove && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStatusChange(booking.id, "cancelled")}
                        disabled={isUpdating}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onStatusChange(booking.id, "approved")}
                        disabled={isUpdating}
                      >
                        Approve
                      </Button>
                    </>
                  )}
                  {canMarkReturned && (
                    <Button
                      size="sm"
                      onClick={() => onStatusChange(booking.id, "returned")}
                      disabled={isUpdating}
                    >
                      Mark Returned
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStatusChange(booking.id, "cancelled")}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function BookingCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border bg-card">
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <div className="mb-1 h-5 w-40 animate-skeleton rounded bg-muted" />
            <div className="h-4 w-24 animate-skeleton rounded bg-muted" />
          </div>
          <div className="h-6 w-20 animate-skeleton rounded-full bg-muted" />
        </div>
        <div className="mb-3 flex gap-4">
          <div className="h-4 w-32 animate-skeleton rounded bg-muted" />
          <div className="h-4 w-24 animate-skeleton rounded bg-muted" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-6 w-16 animate-skeleton rounded bg-muted" />
          <div className="h-9 w-24 animate-skeleton rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}
