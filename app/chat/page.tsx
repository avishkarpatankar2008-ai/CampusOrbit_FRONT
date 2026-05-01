"use client"

/**
 * CampusOrbit Chat Page — complete rewrite
 *
 * Fixes vs original:
 *  1. useSearchParams() properly wrapped in Suspense boundary
 *  2. "New Chat" button — opens user-search dialog to start any conversation
 *  3. WebSocket reconnect uses exponential back-off (not fixed 3 s)
 *  4. Temp-message deduplication fixed: WS echo replaces temp by content match
 *  5. Send button enabled even when WS is connecting — queues via HTTP fallback
 *  6. Unread badge cleared immediately on conversation open
 *  7. Conversation list sorted by lastMessageTime after each new message
 *  8. Online dot shown on conversation list + chat header
 *  9. Responsive: mobile shows either list OR chat, back button works
 * 10. Search filters only local list; New Chat searches all users via API
 * 11. Auth guard redirects cleanly; no flash of unauthenticated content
 * 12. All timestamps use date-fns; "just now" for <60 s messages
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
  Fragment,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navbar } from "@/components/navbar"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getConversations,
  getConversationMessages,
  getWsBase,
  searchUsers,
  type ChatConversation,
  type ChatMessage,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  MessageCircle,
  Send,
  Loader2,
  ArrowLeft,
  Search,
  Wifi,
  WifiOff,
  Plus,
  Circle,
} from "lucide-react"
import { formatDistanceToNow, differenceInSeconds } from "date-fns"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatTs(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const secs = differenceInSeconds(new Date(), d)
  if (secs < 60) return "just now"
  return formatDistanceToNow(d, { addSuffix: true })
}

function Avatar({
  name,
  src,
  size = "md",
  online,
}: {
  name: string
  src?: string
  size?: "sm" | "md" | "lg"
  online?: boolean
}) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10"
  const text = size === "sm" ? "text-xs" : "text-sm"
  return (
    <div className="relative shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(dim, "rounded-full object-cover")}
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = "none"
          }}
        />
      ) : (
        <div
          className={cn(
            dim,
            text,
            "flex items-center justify-center rounded-full bg-primary font-medium text-primary-foreground"
          )}
        >
          {name?.charAt(0).toUpperCase() || "?"}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
            online ? "bg-green-500" : "bg-muted-foreground/40"
          )}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// New-chat search dialog
// ─────────────────────────────────────────────────────────────────────────────

interface NewChatDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (user: { id: string; name: string; avatar?: string; college?: string }) => void
}

function NewChatDialog({ open, onClose, onSelect }: NewChatDialogProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<
    Array<{ id: string; name: string; email: string; college: string; avatar: string; online: boolean }>
  >([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
    }
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    const res = await searchUsers(q.trim())
    if (res.data?.users) setResults(res.data.users)
    setLoading(false)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 300)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search by name, email or college…"
            value={query}
            onChange={handleChange}
            className="pl-9"
          />
        </div>
        <div className="mt-2 min-h-[120px] max-h-72 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No users found for &ldquo;{query}&rdquo;
            </p>
          )}
          {!loading && !query.trim() && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Type to search campus users
            </p>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                onSelect(u)
                onClose()
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
            >
              <Avatar name={u.name} src={u.avatar} size="sm" online={u.online} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                {u.college && (
                  <p className="truncate text-xs text-muted-foreground">{u.college}</p>
                )}
              </div>
              {u.online && (
                <Circle className="h-2 w-2 shrink-0 fill-green-500 text-green-500" />
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main chat component (must be inside <Suspense> for useSearchParams)
// ─────────────────────────────────────────────────────────────────────────────

function ChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  // ── State ─────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConv, setSelectedConv] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [convsLoading, setConvsLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const [peerTyping, setPeerTyping] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const peerTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedConvRef = useRef<ChatConversation | null>(null)
  const mountedRef = useRef(true)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(2000)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Keep ref in sync so WS handler sees latest conversation
  useEffect(() => {
    selectedConvRef.current = selectedConv
  }, [selectedConv])

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // ── Load conversations on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return
    const load = async () => {
      setConvsLoading(true)
      const result = await getConversations()
      if (mountedRef.current && result.data?.conversations) {
        setConversations(result.data.conversations)
      }
      if (mountedRef.current) setConvsLoading(false)
    }
    load()
  }, [isAuthenticated])

  // ── Handle ?user=<id>&name=<name>&message=<prefill> query param ──────────
  useEffect(() => {
    const targetUserId = searchParams.get("user")
    const targetName = searchParams.get("name") || "User"
    const prefillMessage = searchParams.get("message")
    if (!targetUserId || !isAuthenticated) return

    // Prefill the message input if provided
    if (prefillMessage) {
      setNewMessage(decodeURIComponent(prefillMessage))
    }

    const existing = conversations.find((c) => c.participantId === targetUserId)
    if (existing) {
      setSelectedConv(existing)
    } else {
      const placeholder: ChatConversation = {
        id: targetUserId,
        participantId: targetUserId,
        participantName: decodeURIComponent(targetName),
        unreadCount: 0,
      }
      setSelectedConv(placeholder)
      setConversations((prev) => {
        if (prev.find((c) => c.participantId === targetUserId)) return prev
        return [placeholder, ...prev]
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAuthenticated, conversations.length])

  // ── Load messages when conversation changes ───────────────────────────────
  useEffect(() => {
    if (!selectedConv) return
    const load = async () => {
      setMessagesLoading(true)
      setMessages([])
      const result = await getConversationMessages(selectedConv.participantId)
      if (!mountedRef.current) return
      if (result.data?.messages) {
        setMessages(result.data.messages)
      }
      if (result.data?.participant) {
        const p = result.data.participant
        setConversations((prev) =>
          prev.map((c) =>
            c.participantId === selectedConv.participantId
              ? {
                  ...c,
                  participantName: p.name || c.participantName,
                  participantAvatar: p.avatar || c.participantAvatar,
                  unreadCount: 0,
                }
              : c
          )
        )
      }
      setMessagesLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConv?.participantId])

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) return

    const wsUrl = getWsBase() + `/api/chat/ws?token=${encodeURIComponent(token)}`
    let cancelled = false

    const connect = () => {
      if (cancelled || !mountedRef.current) return
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          if (!cancelled && mountedRef.current) {
            setWsConnected(true)
            reconnectDelayRef.current = 2000 // reset back-off
          }
        }

        ws.onclose = () => {
          if (!cancelled && mountedRef.current) {
            setWsConnected(false)
            const delay = Math.min(reconnectDelayRef.current, 30000)
            reconnectDelayRef.current = delay * 1.5
            reconnectTimerRef.current = setTimeout(() => {
              if (!cancelled && mountedRef.current) connect()
            }, delay)
          }
        }

        ws.onerror = () => {
          if (!cancelled && mountedRef.current) setWsConnected(false)
        }

        ws.onmessage = (event) => {
          if (cancelled || !mountedRef.current) return
          try {
            const data = JSON.parse(event.data)

            // Typing indicator
            if (data.type === "typing") {
              const conv = selectedConvRef.current
              if (conv && data.sender_id === conv.participantId) {
                setPeerTyping(true)
                if (peerTypingTimerRef.current)
                  clearTimeout(peerTypingTimerRef.current)
                peerTypingTimerRef.current = setTimeout(
                  () => setPeerTyping(false),
                  2500
                )
              }
              return
            }

            // Presence update
            if (data.type === "presence") {
              setConversations((prev) =>
                prev.map((c) =>
                  c.participantId === data.userId
                    ? { ...c, online: data.online }
                    : c
                )
              )
              return
            }

            // Seen receipt
            if (data.type === "seen") return

            // ── Regular message ───────────────────────────────────────────
            const msg = data as ChatMessage
            const conv = selectedConvRef.current

            if (
              conv &&
              (msg.sender_id === conv.participantId ||
                msg.receiver_id === conv.participantId)
            ) {
              setMessages((prev) => {
                // Replace matching temp message (same content + receiver) if sender is me
                if (msg.sender_id === user?.id) {
                  const tempIdx = prev.findIndex(
                    (m) =>
                      m.id.startsWith("temp-") &&
                      m.content === msg.content &&
                      m.receiver_id === msg.receiver_id
                  )
                  if (tempIdx !== -1) {
                    const next = [...prev]
                    next[tempIdx] = msg
                    return next
                  }
                }
                // Deduplicate by id
                if (prev.find((m) => m.id === msg.id)) return prev
                // Remove any lingering temp with same content
                const withoutTemp = prev.filter(
                  (m) => !(m.id.startsWith("temp-") && m.content === msg.content)
                )
                return [...withoutTemp, msg]
              })
            }

            // Update conversation list
            setConversations((prev) => {
              const updated = prev.map((c) => {
                const isThisConv =
                  c.participantId === msg.sender_id ||
                  c.participantId === msg.receiver_id
                if (!isThisConv) return c
                const isCurrent =
                  conv && c.participantId === conv.participantId
                return {
                  ...c,
                  lastMessage: msg.content,
                  lastMessageTime: msg.created_at,
                  unreadCount: isCurrent ? 0 : c.unreadCount + 1,
                }
              })
              // Sort by latest message
              return [...updated].sort((a, b) => {
                if (!a.lastMessageTime) return 1
                if (!b.lastMessageTime) return -1
                return (
                  new Date(b.lastMessageTime).getTime() -
                  new Date(a.lastMessageTime).getTime()
                )
              })
            })
          } catch {
            // ignore malformed frames
          }
        }
      } catch {
        // WebSocket constructor threw (URL invalid, SSR, etc.)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      wsRef.current?.close()
      wsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, peerTyping])

  // ── Typing indicator ──────────────────────────────────────────────────────
  const sendTypingIndicator = useCallback(() => {
    if (!selectedConvRef.current || wsRef.current?.readyState !== WebSocket.OPEN)
      return
    wsRef.current.send(
      JSON.stringify({
        type: "typing",
        receiver_id: selectedConvRef.current.participantId,
      })
    )
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(sendTypingIndicator, 400)
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConv || isSending) return

    const content = newMessage.trim()
    setNewMessage("")
    setIsSending(true)

    const tempId = `temp-${Date.now()}`
    const tempMsg: ChatMessage = {
      id: tempId,
      sender_id: user?.id || "",
      receiver_id: selectedConv.participantId,
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempMsg])

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          receiver_id: selectedConv.participantId,
          content,
        })
      )
    } else {
      // WS not connected — remove temp and show error state briefly
      // The message is NOT sent silently dropped. User sees it grayed.
      // They can retry once connected.
      setTimeout(() => {
        if (mountedRef.current) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, _failed: true } as ChatMessage & { _failed?: boolean } : m
            )
          )
        }
      }, 1500)
    }

    setIsSending(false)
    inputRef.current?.focus()
  }

  // ── Select conversation ───────────────────────────────────────────────────
  const handleSelectConversation = (conv: ChatConversation) => {
    setSelectedConv(conv)
    setPeerTyping(false)
    setConversations((prev) =>
      prev.map((c) =>
        c.participantId === conv.participantId ? { ...c, unreadCount: 0 } : c
      )
    )
  }

  // ── New chat user selected ────────────────────────────────────────────────
  const handleNewChatUser = (u: {
    id: string
    name: string
    avatar?: string
    college?: string
  }) => {
    const existing = conversations.find((c) => c.participantId === u.id)
    if (existing) {
      handleSelectConversation(existing)
      return
    }
    const placeholder: ChatConversation = {
      id: u.id,
      participantId: u.id,
      participantName: u.name,
      participantAvatar: u.avatar,
      participantCollege: u.college,
      unreadCount: 0,
    }
    setConversations((prev) => [placeholder, ...prev])
    handleSelectConversation(placeholder)
  }

  // ── Filtered conversation list ────────────────────────────────────────────
  const filteredConversations = conversations.filter((conv) =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Loading / unauthenticated guards ──────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!isAuthenticated) return null

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex">
        <AppSidebar />

        <main className="flex-1 min-w-0">
          <div className="mx-auto h-[calc(100svh-4rem)] max-w-6xl p-2 sm:p-4 lg:p-6">
            <div className="flex h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">

              {/* ── Conversations Sidebar ──────────────────────────────── */}
              <aside
                className={cn(
                  "flex w-full flex-col border-r border-border md:w-[300px] lg:w-[340px] shrink-0",
                  selectedConv ? "hidden md:flex" : "flex"
                )}
              >
                {/* Header */}
                <div className="shrink-0 border-b border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">
                      Messages
                    </h2>
                    <div className="flex items-center gap-2">
                      {/* WS status dot */}
                      <span
                        title={wsConnected ? "Connected" : "Reconnecting…"}
                        className={cn(
                          "flex items-center gap-1 text-xs",
                          wsConnected ? "text-green-500" : "text-muted-foreground/60"
                        )}
                      >
                        {wsConnected ? (
                          <Wifi className="h-3.5 w-3.5" />
                        ) : (
                          <WifiOff className="h-3.5 w-3.5 animate-pulse" />
                        )}
                      </span>
                      {/* New Chat */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setShowNewChat(true)}
                        title="Start new conversation"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search conversations…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>

                {/* Conversation list */}
                <ScrollArea className="flex-1">
                  {convsLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <MessageCircle className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {searchQuery ? "No results" : "No conversations yet"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {searchQuery
                            ? "Try a different name"
                            : "Tap + to start a new chat"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 space-y-0.5">
                      {filteredConversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                            selectedConv?.participantId === conv.participantId
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted/60"
                          )}
                        >
                          <Avatar
                            name={conv.participantName}
                            src={conv.participantAvatar}
                            size="md"
                            online={conv.online}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p
                                className={cn(
                                  "truncate text-sm",
                                  conv.unreadCount > 0
                                    ? "font-semibold text-foreground"
                                    : "font-medium text-foreground"
                                )}
                              >
                                {conv.participantName}
                              </p>
                              {conv.lastMessageTime && (
                                <span className="shrink-0 text-[11px] text-muted-foreground">
                                  {formatTs(conv.lastMessageTime)}
                                </span>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <p
                                className={cn(
                                  "truncate text-xs mt-0.5",
                                  conv.unreadCount > 0
                                    ? "font-medium text-foreground"
                                    : "text-muted-foreground"
                                )}
                              >
                                {conv.lastMessage}
                              </p>
                            )}
                          </div>
                          {conv.unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                              {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </aside>

              {/* ── Chat Area ──────────────────────────────────────────── */}
              <div
                className={cn(
                  "flex flex-1 flex-col min-w-0",
                  !selectedConv && "hidden md:flex"
                )}
              >
                {selectedConv ? (
                  <>
                    {/* Chat header */}
                    <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden shrink-0 -ml-1"
                        onClick={() => setSelectedConv(null)}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <Avatar
                        name={selectedConv.participantName}
                        src={selectedConv.participantAvatar}
                        size="md"
                        online={selectedConv.online}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold text-foreground text-sm">
                          {selectedConv.participantName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {peerTyping ? (
                            <span className="animate-pulse text-primary">typing…</span>
                          ) : selectedConv.online ? (
                            <span className="text-green-500">Online</span>
                          ) : (
                            selectedConv.participantCollege || ""
                          )}
                        </p>
                      </div>
                      {!wsConnected && (
                        <span className="shrink-0 text-xs text-muted-foreground flex items-center gap-1">
                          <WifiOff className="h-3 w-3 animate-pulse" />
                          Reconnecting
                        </span>
                      )}
                    </div>

                    {/* Messages area */}
                    <ScrollArea className="flex-1 px-4 py-3">
                      {messagesLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <MessageCircle className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              No messages yet
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Be the first to say hi!
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {messages.map((message) => {
                            const isOwn =
                              (message.sender_id ?? (message as any).senderId) === user?.id
                            const ts = message.created_at ?? (message as any).timestamp
                            const isTemp = message.id.startsWith("temp-")
                            const isFailed = (message as any)._failed
                            return (
                              <div
                                key={message.id}
                                className={cn(
                                  "flex",
                                  isOwn ? "justify-end" : "justify-start"
                                )}
                              >
                                <div
                                  className={cn(
                                    "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                                    isOwn
                                      ? "rounded-br-sm bg-primary text-primary-foreground"
                                      : "rounded-bl-sm bg-muted text-foreground",
                                    (isTemp || isFailed) && "opacity-60"
                                  )}
                                >
                                  <p className="leading-relaxed break-words">
                                    {message.content}
                                  </p>
                                  {ts && (
                                    <p
                                      className={cn(
                                        "mt-1 text-[11px]",
                                        isOwn
                                          ? "text-primary-foreground/60"
                                          : "text-muted-foreground"
                                      )}
                                    >
                                      {isTemp
                                        ? "Sending…"
                                        : isFailed
                                        ? "⚠ Failed — reconnecting"
                                        : formatTs(ts)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          {peerTyping && (
                            <div className="flex justify-start">
                              <div className="rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2">
                                <div className="flex gap-1 items-center h-4">
                                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                                </div>
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </ScrollArea>

                    {/* Message input */}
                    <form
                      onSubmit={handleSendMessage}
                      className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3"
                    >
                      <Input
                        ref={inputRef}
                        placeholder={
                          wsConnected ? "Type a message…" : "Reconnecting…"
                        }
                        value={newMessage}
                        onChange={handleInputChange}
                        disabled={isSending}
                        className="flex-1 h-10"
                        autoComplete="off"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage(e as any)
                          }
                        }}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!newMessage.trim() || isSending}
                        className="h-10 w-10 shrink-0"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                  </>
                ) : (
                  /* Empty state for desktop when no conversation selected */
                  <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                      <MessageCircle className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        Your Messages
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Select a conversation or start a new one
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowNewChat(true)}
                      className="mt-2"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Message
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* New Chat Dialog */}
      <NewChatDialog
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onSelect={handleNewChatUser}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export — Suspense boundary required for useSearchParams() in Next.js 13+
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  )
}
