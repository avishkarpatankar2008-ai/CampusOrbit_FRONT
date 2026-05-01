"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { fetchApi } from "./api"

interface User {
  id: string
  name: string
  email: string
  phone?: string
  college?: string
  avatar?: string
  is_verified?: boolean
  trust_score?: number
  avg_rating?: number
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  hasPendingOtp: boolean
  pendingEmail: string | null
  pendingSource: "login" | "register" | null
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; userId?: string }>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresOtp?: boolean }>
  verifyOtp: (otp: string) => Promise<{ success: boolean; error?: string }>
  resendOtp: () => Promise<{ success: boolean; error?: string }>
  cancelOtp: () => void
  logout: () => void
  refreshUser: () => Promise<void>
}

interface RegisterData {
  name: string
  email: string
  password: string
  college?: string
  phone?: string
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasPendingOtp, setHasPendingOtp] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [pendingSource, setPendingSource] = useState<"login" | "register" | null>(null)

  // ── Initialize auth state on mount ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token")
    const pendingUserId = localStorage.getItem("pending_user_id")
    const storedEmail = localStorage.getItem("pending_email")
    const storedSource = localStorage.getItem("pending_source") as "login" | "register" | null

    // Case 1: No token AND no pending session — completely clean
    if (!token && !pendingUserId && !storedEmail) {
      setHasPendingOtp(false)
      setIsLoading(false)
      return
    }

    // Case 2: No token BUT there is a pending session — OTP is genuinely pending
    // This happens right after register/login-with-unverified-email before verify
    if (!token && (pendingUserId || storedEmail)) {
      setPendingEmail(storedEmail)
      setPendingSource(storedSource)
      setHasPendingOtp(true)
      setIsLoading(false)
      return
    }

    // Case 3: Token exists — verify it with /me
    // If valid: clear any stale OTP state, user is fully authenticated
    // If invalid: clear everything
    fetchApi<{ user: User }>("/api/auth/me")
      .then((result) => {
        if (result.data?.user) {
          setUser(result.data.user)
          // Clear any leftover pending state — user is verified
          localStorage.removeItem("pending_user_id")
          localStorage.removeItem("pending_email")
          localStorage.removeItem("pending_source")
          setHasPendingOtp(false)
          setPendingEmail(null)
          setPendingSource(null)
        } else {
          // Token is invalid/expired — full reset
          localStorage.removeItem("token")
          localStorage.removeItem("pending_user_id")
          localStorage.removeItem("pending_email")
          localStorage.removeItem("pending_source")
          setHasPendingOtp(false)
          setPendingEmail(null)
          setPendingSource(null)
        }
      })
      .catch(() => {
        localStorage.removeItem("token")
        localStorage.removeItem("pending_user_id")
        localStorage.removeItem("pending_email")
        localStorage.removeItem("pending_source")
        setHasPendingOtp(false)
        setPendingEmail(null)
        setPendingSource(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  // ── Register ─────────────────────────────────────────────────────────────────
  const register = useCallback(async (data: RegisterData) => {
    try {
      const result = await fetchApi<{
        success: boolean
        user_id?: string
        requires_otp?: boolean
        token?: string
        access_token?: string
        user?: User
        message?: string
      }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      })

      if (result.error) {
        return { success: false, error: result.error }
      }

      const respData = result.data

      // Edge case: backend returned a token directly (already verified)
      const token = respData?.access_token ?? respData?.token
      if (token) {
        localStorage.setItem("token", token)
        localStorage.removeItem("pending_user_id")
        localStorage.removeItem("pending_email")
        localStorage.removeItem("pending_source")
        setHasPendingOtp(false)
        setPendingEmail(null)
        setPendingSource(null)
        if (respData?.user) setUser(respData.user)
        return { success: true }
      }

      // Normal case: OTP required
      const userId = respData?.user_id
      if (userId) {
        localStorage.setItem("pending_user_id", String(userId))
      }
      localStorage.setItem("pending_email", data.email)
      localStorage.setItem("pending_source", "register")
      setHasPendingOtp(true)
      setPendingEmail(data.email)
      setPendingSource("register")

      return { success: true, userId: userId ?? undefined }
    } catch {
      return { success: false, error: "Network error. Please try again." }
    }
  }, [])

  // ── Login ─────────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await fetchApi<{
        success: boolean
        requires_otp?: boolean
        user_id?: string
        token?: string
        access_token?: string
        user?: User
        message?: string
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })

      if (result.error) {
        return { success: false, error: result.error }
      }

      const respData = result.data

      // Case 1: Verified user — got a token
      const token = respData?.access_token ?? respData?.token
      if (token) {
        localStorage.setItem("token", token)
        localStorage.removeItem("pending_user_id")
        localStorage.removeItem("pending_email")
        localStorage.removeItem("pending_source")
        setHasPendingOtp(false)
        setPendingEmail(null)
        setPendingSource(null)

        if (respData?.user) {
          setUser(respData.user)
        } else {
          const meResult = await fetchApi<{ user: User }>("/api/auth/me")
          if (meResult.data?.user) setUser(meResult.data.user)
        }
        return { success: true, requiresOtp: false }
      }

      // Case 2: Unverified — OTP required
      if (respData?.requires_otp) {
        const userId = respData?.user_id
        if (userId) {
          localStorage.setItem("pending_user_id", String(userId))
        }
        localStorage.setItem("pending_email", email)
        localStorage.setItem("pending_source", "login")
        setHasPendingOtp(true)
        setPendingEmail(email)
        setPendingSource("login")
        return { success: true, requiresOtp: true }
      }

      return { success: false, error: "Unexpected response from server." }
    } catch {
      return { success: false, error: "Network error. Please try again." }
    }
  }, [])

  // ── Verify OTP ───────────────────────────────────────────────────────────────
  const verifyOtp = useCallback(async (otp: string) => {
    try {
      const userId = localStorage.getItem("pending_user_id")
      const email = localStorage.getItem("pending_email")

      const payload: Record<string, string> = { otp }
      if (userId) payload.user_id = userId
      else if (email) payload.email = email
      else return { success: false, error: "No pending verification session. Please register or log in again." }

      const result = await fetchApi<{
        success: boolean
        token?: string
        access_token?: string
        user?: User
      }>("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify(payload),
      })

      if (result.error) {
        return { success: false, error: result.error }
      }

      const token = result.data?.access_token ?? result.data?.token
      if (!token) {
        return { success: false, error: "Verification failed — no token received." }
      }

      localStorage.setItem("token", token)
      localStorage.removeItem("pending_user_id")
      localStorage.removeItem("pending_email")
      localStorage.removeItem("pending_source")
      setHasPendingOtp(false)
      setPendingEmail(null)
      setPendingSource(null)

      if (result.data?.user) {
        setUser(result.data.user)
      } else {
        const meResult = await fetchApi<{ user: User }>("/api/auth/me")
        if (meResult.data?.user) setUser(meResult.data.user)
      }

      return { success: true }
    } catch {
      return { success: false, error: "Network error. Please try again." }
    }
  }, [])

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const resendOtp = useCallback(async () => {
    try {
      const userId = localStorage.getItem("pending_user_id")
      const email = localStorage.getItem("pending_email")

      const payload: Record<string, string> = {}
      if (userId) payload.user_id = userId
      else if (email) payload.email = email
      else return { success: false, error: "No pending verification session." }

      const result = await fetchApi<{ success: boolean; message?: string }>(
        "/api/auth/resend-otp",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      )

      if (result.error) return { success: false, error: result.error }
      return { success: true }
    } catch {
      return { success: false, error: "Network error. Please try again." }
    }
  }, [])

  // ── Cancel OTP (go back to login/register) ────────────────────────────────
  const cancelOtp = useCallback(() => {
    localStorage.removeItem("pending_user_id")
    localStorage.removeItem("pending_email")
    localStorage.removeItem("pending_source")
    setHasPendingOtp(false)
    setPendingEmail(null)
    setPendingSource(null)
  }, [])

  // ── Logout ────────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("pending_user_id")
    localStorage.removeItem("pending_email")
    localStorage.removeItem("pending_source")
    setUser(null)
    setHasPendingOtp(false)
    setPendingEmail(null)
    setPendingSource(null)
  }, [])

  // ── Refresh user ──────────────────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    const result = await fetchApi<{ user: User }>("/api/auth/me")
    if (result.data?.user) setUser(result.data.user)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        hasPendingOtp,
        pendingEmail,
        pendingSource,
        register,
        login,
        verifyOtp,
        resendOtp,
        cancelOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
