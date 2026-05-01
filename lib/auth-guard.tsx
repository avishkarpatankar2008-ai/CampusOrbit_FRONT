"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

// FIX: /lost-found is publicly readable (no login needed to browse).
// /items/[id] dynamic routes are covered by pathname.startsWith("/items/") below.
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/verify-otp",
  "/items",
  "/lost-found",
  "/forgot-password",
]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, hasPendingOtp } = useAuth()

  useEffect(() => {
    // Never redirect while auth is still resolving — this is the main cause
    // of the OTP redirect loop. hasPendingOtp starts false and only becomes
    // true after the effect in AuthProvider runs. Acting before that sends
    // users back to /login incorrectly.
    if (isLoading) return

    // FIX: A path is public if it matches the static list OR starts with /items/
    // (covers /items/[id] detail pages which are world-readable).
    const isPublic =
      PUBLIC_ROUTES.includes(pathname) ||
      pathname.startsWith("/items/") ||
      pathname.startsWith("/lost-found/")

    // Already authenticated — redirect away from pure auth pages
    if (isAuthenticated) {
      if (
        pathname === "/verify-otp" ||
        pathname === "/login" ||
        pathname === "/register"
      ) {
        router.replace("/dashboard")
      }
      return
    }

    // Pending OTP — only redirect if not already on the OTP page
    if (hasPendingOtp && pathname !== "/verify-otp") {
      router.replace("/verify-otp")
      return
    }

    // Unauthenticated, no pending OTP — redirect protected routes to login
    if (!isAuthenticated && !hasPendingOtp && !isPublic) {
      router.replace("/login")
    }
  }, [isAuthenticated, isLoading, hasPendingOtp, pathname, router])

  return <>{children}</>
}
