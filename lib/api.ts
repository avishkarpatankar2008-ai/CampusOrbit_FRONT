// ─── Base URL ─────────────────────────────────────────────────────────────────
// NEXT_PUBLIC_API_URL must be set:
//   • Production (Vercel): Settings → Environment Variables
//   • Local dev: .env.local  →  NEXT_PUBLIC_API_URL=http://localhost:8000
//
// The empty-string fallback is intentional: fetchApi will detect it at runtime
// and return a clear error instead of sending requests to Next.js itself.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "")

if (!API_BASE && typeof window !== "undefined") {
  console.error(
    "[CampusOrbit] NEXT_PUBLIC_API_URL is not set. " +
      "ALL API calls will fail. Add it in Vercel → Settings → Environment Variables " +
      "or in .env.local for local development."
  )
}

// ─── WebSocket URL ─────────────────────────────────────────────────────────────
// Converts http → ws  and  https → wss.
// Used by both the Chat page and the Navbar unread-count hook.
export function getWsBase(): string {
  if (!API_BASE) return ""
  return API_BASE.replace(/^https/, "wss").replace(/^http/, "ws")
}

// ─── Generic response wrapper ─────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data: T | null
  error: string | null
}

// ─── Core fetch helper ────────────────────────────────────────────────────────
//
// FIX 1: Guard against empty API_BASE before any network call.
//         Without this guard, fetch("/api/items") hits Next.js's own server
//         which has no /api routes, returns HTML, and res.json() throws —
//         producing the misleading "request failed" generic error.
//
// FIX 2: Extract real server error detail even when the body is not JSON
//         (e.g. Nginx / Render 502 HTML pages). Surface the HTTP status too.
//
// FIX 3: Authorization header is always "Bearer <token>", matching the backend
//         JWT dependency (app/deps.py → OAuth2PasswordBearer).
//
export async function fetchApi<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Guard: misconfigured environment → immediate, clear error
  if (!API_BASE) {
    return {
      data: null,
      error:
        "API URL is not configured. Set NEXT_PUBLIC_API_URL in your environment variables.",
    }
  }

  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      // FIX: Always "Bearer" — FastAPI's OAuth2PasswordBearer expects this exact scheme.
      headers["Authorization"] = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    // FIX: Handle 401 explicitly — clear stale token so the auth guard redirects.
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token")
      }
      return { data: null, error: "Session expired. Please log in again." }
    }

    // FIX: Try to parse JSON; gracefully handle non-JSON bodies (HTML error pages).
    let json: Record<string, unknown> = {}
    const contentType = res.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      try {
        json = await res.json()
      } catch {
        // Malformed JSON from server
        json = {}
      }
    } else {
      // Non-JSON body (HTML 502/503 from proxy, plain text, etc.)
      // Don't try to parse — just use the status code for the error message.
    }

    if (!res.ok) {
      // FIX: FastAPI returns errors as { "detail": "..." } (string or object).
      //      Some custom routes use "message" or "error". Check all three.
      //      Never silently swallow the real reason with "Request failed".
      let errorMsg: string

      const detail = json?.detail
      if (typeof detail === "string") {
        errorMsg = detail
      } else if (Array.isArray(detail) && detail.length > 0) {
        // FastAPI validation errors: [{loc, msg, type}, ...]
        errorMsg = detail
          .map((d) => (typeof d?.msg === "string" ? d.msg : JSON.stringify(d)))
          .join("; ")
      } else if (typeof json?.message === "string") {
        errorMsg = json.message
      } else if (typeof json?.error === "string") {
        errorMsg = json.error
      } else {
        errorMsg = `Server error ${res.status} (${res.statusText || "unknown"})`
      }

      return { data: null, error: errorMsg }
    }

    return { data: json as T, error: null }
  } catch (err) {
    // Network-level failure (no internet, CORS preflight blocked, DNS failure).
    console.error("[fetchApi] Network error:", err)
    return {
      data: null,
      error:
        "Network error. Check your internet connection and verify the API server is running.",
    }
  }
}

// ─── Items ────────────────────────────────────────────────────────────────────

export interface Item {
  id: string
  owner_id: string
  owner_name: string
  owner_avg_rating: number
  owner_hostel_block?: string
  owner_trust_score: number
  title: string
  description?: string
  category: string
  condition: string
  images: string[]
  price_per_day: number
  security_deposit: number
  max_rental_days: number
  is_available: boolean
  instant_booking: boolean
  barter_ok: boolean
  location_name: string
  avg_rating: number
  views: number
  tags: string[]
  created_at: string
  // Legacy aliases kept for backwards compatibility
  ownerId?: string
  price?: number
  location?: string
}

export interface ItemFilters {
  search?: string
  category?: string
  // Must match backend ItemCondition enum exactly (underscores, not hyphens)
  condition?: string
  sort?: string
  page?: number
  limit?: number
  max_price?: number
  instant_booking?: boolean
  barter_ok?: boolean
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface Booking {
  id: string
  item_id: string
  item_title: string
  renter_id: string
  renter_name: string
  owner_id: string
  owner_name: string
  start_date: string
  end_date: string
  total_days: number
  total_cost: number
  status: "pending" | "approved" | "active" | "returned" | "cancelled"
  created_at: string
  // Legacy aliases
  ownerId?: string
  borrowerId?: string
  itemId?: string
  itemTitle?: string
}

// ─── Lost & Found ─────────────────────────────────────────────────────────────

export interface LostFoundItem {
  id: string
  reported_by_id: string
  reported_by_name: string
  type: "lost" | "found"
  title: string
  description: string
  category?: string
  images: string[]
  location: string
  status: string
  reward: number
  date_lost_found?: string
  contact_email?: string
  created_at: string
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  booking_id?: string | null
  read_at?: string | null
  created_at: string
  // Legacy aliases
  senderId?: string
  senderName?: string
  timestamp?: string
  read?: boolean
}

export interface ChatConversation {
  id: string
  participantId: string
  participantName: string
  participantAvatar?: string
  participantCollege?: string
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
  online?: boolean
}

// ─── Item API ─────────────────────────────────────────────────────────────────

export async function getItems(filters: ItemFilters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  // FIX: Only send category when it's a non-empty real value (not "__all" sentinel).
  if (filters.category && filters.category !== "__all") {
    params.set("category", filters.category)
  }
  // FIX: Condition values must match backend ItemCondition enum: like_new (underscore, not hyphen).
  if (filters.condition && filters.condition !== "all") {
    params.set("condition", filters.condition)
  }
  if (filters.sort) params.set("sort", filters.sort)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  if (filters.max_price) params.set("max_price", String(filters.max_price))
  if (filters.instant_booking) params.set("instant_booking", "true")
  if (filters.barter_ok) params.set("barter_ok", "true")
  const query = params.toString()
  return fetchApi<{ items: Item[]; total: number; pages: number }>(
    `/api/items${query ? `?${query}` : ""}`
  )
}

export async function getItem(id: string) {
  return fetchApi<{ success: boolean; item: Item }>(`/api/items/${id}`)
}

export async function createItem(data: Record<string, unknown>) {
  return fetchApi<{ success: boolean; item_id: string }>("/api/items", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateItem(id: string, data: Partial<Item>) {
  return fetchApi<{ success: boolean }>(`/api/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteItem(id: string) {
  return fetchApi(`/api/items/${id}`, { method: "DELETE" })
}

export async function getMyListings() {
  return fetchApi<{ success: boolean; items: Item[] }>("/api/items/my/listings")
}

// FIX: Image upload must use multipart/form-data — fetchApi sets Content-Type: application/json
//      which would break the upload. Use raw fetch with manual token injection so the browser
//      can set the correct multipart boundary automatically.
export async function uploadItemImages(itemId: string, files: File[]) {
  if (!API_BASE) {
    return {
      data: null,
      error:
        "API URL is not configured. Set NEXT_PUBLIC_API_URL in your environment variables.",
    }
  }

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  const form = new FormData()
  files.forEach((f) => form.append("files", f))

  try {
    const res = await fetch(`${API_BASE}/api/items/${itemId}/images`, {
      method: "POST",
      // FIX: Do NOT set Content-Type manually — browser sets it with boundary for FormData.
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })

    let json: Record<string, unknown> = {}
    try {
      json = await res.json()
    } catch {
      json = {}
    }

    if (!res.ok) {
      return {
        data: null,
        error:
          (json?.detail as string) ||
          (json?.message as string) ||
          `Upload failed (${res.status})`,
      }
    }
    return { data: json as { success: boolean; urls: string[] }, error: null }
  } catch (err) {
    return { data: null, error: "Network error during image upload." }
  }
}

// ─── Booking API ──────────────────────────────────────────────────────────────

export async function getBookings() {
  return fetchApi<{ success: boolean; bookings: Booking[] }>("/api/bookings")
}

export async function getLentBookings() {
  return fetchApi<{ success: boolean; bookings: Booking[] }>(
    "/api/bookings/lent"
  )
}

export async function createBooking(data: {
  item_id: string
  start_date: string
  end_date: string
}) {
  return fetchApi<{ success: boolean; booking_id: string; status: string }>(
    "/api/bookings",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  )
}

export async function approveBooking(id: string) {
  return fetchApi<{ success: boolean }>(`/api/bookings/${id}/approve`, {
    method: "PATCH",
  })
}

export async function returnBooking(id: string) {
  return fetchApi<{ success: boolean }>(`/api/bookings/${id}/return`, {
    method: "PATCH",
  })
}

export async function cancelBooking(id: string) {
  return fetchApi<{ success: boolean }>(`/api/bookings/${id}/cancel`, {
    method: "PATCH",
  })
}

export async function updateBookingStatus(
  id: string,
  status: Booking["status"]
) {
  switch (status) {
    case "approved":
      return approveBooking(id)
    case "returned":
      return returnBooking(id)
    case "cancelled":
      return cancelBooking(id)
    default:
      return cancelBooking(id)
  }
}

// ─── Lost & Found API ─────────────────────────────────────────────────────────

export async function getLostFoundItems(
  type?: "lost" | "found",
  status?: string
) {
  const params = new URLSearchParams()
  if (type) params.set("type", type)
  if (status) params.set("status", status)
  const query = params.toString()
  return fetchApi<{ success: boolean; reports: LostFoundItem[] }>(
    `/api/lost-found${query ? `?${query}` : ""}`
  )
}

export async function getMyLostFoundReports() {
  return fetchApi<{ success: boolean; reports: LostFoundItem[] }>(
    "/api/lost-found/my"
  )
}

export async function createLostFoundItem(data: Record<string, unknown>) {
  return fetchApi<{ success: boolean; report_id: string }>("/api/lost-found", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function resolveLostFoundItem(id: string) {
  return fetchApi<{ success: boolean }>(`/api/lost-found/${id}/resolve`, {
    method: "PATCH",
  })
}

export async function deleteLostFoundItem(id: string) {
  return fetchApi<{ success: boolean }>(`/api/lost-found/${id}`, {
    method: "DELETE",
  })
}

// ─── Chat API ─────────────────────────────────────────────────────────────────

export async function getConversations() {
  return fetchApi<{ success: boolean; conversations: ChatConversation[] }>(
    "/api/chat/conversations"
  )
}

export async function getConversationMessages(otherUserId: string) {
  return fetchApi<{
    success: boolean
    messages: ChatMessage[]
    participant?: {
      id: string
      name: string
      avatar?: string
      college?: string
    }
  }>(`/api/chat/messages/${otherUserId}`)
}

export async function getUnreadCount() {
  return fetchApi<{ success: boolean; count: number }>("/api/chat/unread-count")
}

export async function searchUsers(query: string) {
  const params = new URLSearchParams({ q: query })
  return fetchApi<{
    success: boolean
    users: Array<{
      id: string
      name: string
      email: string
      college: string
      avatar: string
      online: boolean
    }>
  }>(`/api/chat/users/search?${params}`)
}
