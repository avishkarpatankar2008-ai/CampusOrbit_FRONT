"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react"
import { CampusOrbitLogo } from "@/components/campus-orbit-logo"
import Link from "next/link"

const RESEND_COOLDOWN = 60

export default function VerifyOtpPage() {
  const router = useRouter()
  const {
    verifyOtp,
    resendOtp,
    cancelOtp,
    isAuthenticated,
    isLoading: authLoading,
    hasPendingOtp,
    pendingEmail,
    pendingSource,
  } = useAuth()

  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN)
  const [verified, setVerified] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // ── Guard: redirect if auth state resolves in a way that means we shouldn't be here
  useEffect(() => {
    if (authLoading) return

    // Already fully authenticated — go to dashboard
    if (isAuthenticated) {
      router.replace("/dashboard")
      return
    }

    // No pending OTP and not authenticated — missing session, go back to login
    if (!hasPendingOtp && !isAuthenticated) {
      router.replace("/login")
      return
    }

    // Happy path: we have a pending OTP, focus first input
    inputRefs.current[0]?.focus()
  }, [authLoading, isAuthenticated, hasPendingOtp, router])

  // ── Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return
    const id = setInterval(() => setResendTimer((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [resendTimer])

  // ── OTP input handlers
  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    setError("")
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(""))
      inputRefs.current[5]?.focus()
    }
  }

  // ── Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    const otpString = otp.join("")
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit OTP.")
      return
    }

    setIsVerifying(true)
    const result = await verifyOtp(otpString)

    if (result.success) {
      setVerified(true)
      setSuccess("Email verified! Taking you to your dashboard…")
      // Small delay so user sees the success state before redirect
      setTimeout(() => router.replace("/dashboard"), 1200)
    } else {
      setError(result.error || "Invalid OTP. Please try again.")
      // Clear input so user can retype easily
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
      setIsVerifying(false)
    }
  }

  // ── Resend
  const handleResend = async () => {
    setIsResending(true)
    setError("")
    setSuccess("")
    const result = await resendOtp()
    if (result.success) {
      setSuccess("A new OTP has been sent to your email.")
      setResendTimer(RESEND_COOLDOWN)
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } else {
      setError(result.error || "Failed to resend OTP. Please try again.")
    }
    setIsResending(false)
  }

  // ── Back / Cancel — clears pending state so guard doesn't redirect back here
  const handleBack = () => {
    cancelOtp()
    router.replace(pendingSource === "login" ? "/login" : "/register")
  }

  // While auth is still loading, show a minimal spinner to avoid flash
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If there's no pending OTP after loading, we're about to redirect — show nothing
  if (!hasPendingOtp && !isAuthenticated) return null

  const backLabel = pendingSource === "login" ? "Back to login" : "Back to register"
  const backHref  = pendingSource === "login" ? "/login" : "/register"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/">
            <CampusOrbitLogo size="sm" />
          </Link>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {verified ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <Mail className="h-6 w-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {verified ? "Email verified!" : "Verify your email"}
            </CardTitle>
            <CardDescription>
              {pendingEmail
                ? `We sent a 6-digit code to ${pendingEmail}`
                : "Enter the 6-digit code sent to your email"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error state */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success state */}
              {success && (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {success}
                </div>
              )}

              {/* OTP inputs */}
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el }}
                    value={digit}
                    maxLength={1}
                    inputMode="numeric"
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-11 h-12 text-center text-lg font-semibold"
                    disabled={isVerifying || verified}
                    aria-label={`OTP digit ${index + 1}`}
                  />
                ))}
              </div>

              {/* Verify button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isVerifying || verified || otp.join("").length !== 6}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : verified ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verified!
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>

              {/* Resend + cancel row */}
              {!verified && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div>
                    {resendTimer > 0 ? (
                      <span>Resend in {resendTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        className="text-primary hover:underline disabled:opacity-50"
                        onClick={handleResend}
                        disabled={isResending || isVerifying}
                      >
                        {isResending ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Resending…
                          </span>
                        ) : (
                          "Resend OTP"
                        )}
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground hover:underline"
                    onClick={handleBack}
                    disabled={isVerifying}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Hint */}
              {!verified && (
                <p className="text-center text-xs text-muted-foreground">
                  Check your spam folder if you don&apos;t see it within a minute.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
