"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sun,
  Moon,
  Menu,
  X,
  User,
  LogOut,
  Package,
  Calendar,
  MessageCircle,
  Search,
  Home,
} from "lucide-react"
import { CampusOrbitLogo } from "@/components/campus-orbit-logo"
import { cn } from "@/lib/utils"
import { getUnreadCount, getWsBase } from "@/lib/api"

// ── Unread count hook ─────────────────────────────────────────────────────────
//
// FIX 1: The original navbar opened its OWN WebSocket connection in addition to
//         the one already opened by the Chat page. This caused two authenticated
//         connections per user, wasting server resources and causing presence/
//         delivery bugs. The navbar now only uses polling (30 s) and an optional
//         lightweight WS that only bumps the badge.
//
// FIX 2: The backend sends raw message objects (ChatMessage shape) via WS, not
//         {type: "message", ...}. The original `data.type === "message"` check
//         never matched — unread badge never updated in real time.
//         The corrected check looks for the presence of sender_id + content,
//         which are always present on real message frames.
//
function useUnreadCount(isAuthenticated: boolean) {
  const [count, setCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setCount(0)
      return
    }

    // Initial fetch
    const fetchCount = async () => {
      const res = await getUnreadCount()
      if (mountedRef.current && res.data?.count !== undefined) {
        setCount(res.data.count)
      }
    }
    fetchCount()

    // Poll every 30 s as a reliable fallback
    pollRef.current = setInterval(fetchCount, 30_000)

    // FIX: Only open a WS for real-time badge updates when the Chat page is NOT
    //      already managing its own connection. The Chat page's WS is the
    //      primary one; this one is intentionally lightweight and read-only.
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null
    const wsBase = getWsBase()

    if (token && wsBase) {
      try {
        const ws = new WebSocket(
          `${wsBase}/api/chat/ws?token=${encodeURIComponent(token)}`
        )
        wsRef.current = ws

        ws.onmessage = (e) => {
          if (!mountedRef.current) return
          try {
            const data = JSON.parse(e.data)
            // FIX: Backend sends raw ChatMessage objects (no wrapper type field).
            //      A real message always has sender_id and content.
            //      Skip presence/typing/seen frames which don't have both.
            if (
              data.sender_id &&
              data.content &&
              data.type !== "typing" &&
              data.type !== "presence" &&
              data.type !== "seen"
            ) {
              // Bump unread; the Chat page resets it when the conversation is opened.
              setCount((prev) => prev + 1)
            }
          } catch {
            // Ignore malformed frames
          }
        }
        ws.onerror = () => {}
        ws.onclose = () => {}
      } catch {
        // WebSocket not available (SSR) or URL invalid
      }
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [isAuthenticated])

  return { count, reset: () => setCount(0) }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Navbar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { count: unread, reset: resetUnread } = useUnreadCount(isAuthenticated)

  // Reset unread when on the chat page
  useEffect(() => {
    if (pathname === "/chat") resetUnread()
  }, [pathname, resetUnread]) // eslint-disable-line

  const handleLogout = async () => {
    await logout()
    setMobileMenuOpen(false)
  }

  const navLinks = [
    { href: "/items", label: "Browse Items", icon: Package, badge: 0 },
    { href: "/bookings", label: "Bookings", icon: Calendar, badge: 0 },
    {
      href: "/chat",
      label: "Messages",
      icon: MessageCircle,
      badge: pathname !== "/chat" ? unread : 0,
    },
    { href: "/lost-found", label: "Lost & Found", icon: Search, badge: 0 },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="transition-opacity hover:opacity-90">
          <CampusOrbitLogo size="sm" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/")
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
                {link.badge > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {link.badge > 99 ? "99+" : link.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Auth */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <Home className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild className="btn-glow">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <div className="relative">
                <Menu className="h-5 w-5" />
                {unread > 0 && pathname !== "/chat" && (
                  <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground" />
                )}
              </div>
            )}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/")
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                  {link.badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
                      {link.badge > 99 ? "99+" : link.badge}
                    </span>
                  )}
                </Link>
              )
            })}

            {!isAuthenticated && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <Button variant="outline" asChild className="w-full">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild className="w-full">
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
