"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { fetchApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Loader2,
  Mail,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react"
import { CampusOrbitLogo } from "@/components/campus-orbit-logo"

type Step = "email" | "otp" | "password" | "done"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // ── Step 1: request OTP ────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    const result = await fetchApi<{ success: boolean }>(
      "/api/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }
    )
    setIsLoading(false)
    // FIX: Always surface the real server error, not a silent failure.
    if (result.error) {
      setError(result.error)
      return
    }
    setStep("otp")
    startResendTimer()
  }

  const startResendTimer = () => {
    setResendTimer(60)
    const id = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // ── OTP input helpers ──────────────────────────────────────
  const handleOtpChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return
    const next = [...otp]
    next[i] = v.slice(-1)
    setOtp(next)
    if (v && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handleOtpKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[i] && i > 0)
      inputRefs.current[i - 1]?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(""))
      inputRefs.current[5]?.focus()
    }
  }

  // ── Step 2: confirm OTP ────────────────────────────────────
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (otp.join("").length !== 6) {
      setError("Enter the complete 6-digit code")
      return
    }
    setStep("password")
  }

  // FIX: Surface errors from the resend call instead of silently ignoring them.
  const handleResend = async () => {
    setError("")
    setIsLoading(true)
    const result = await fetchApi("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })
    setIsLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setOtp(["", "", "", "", "", ""])
    inputRefs.current[0]?.focus()
    startResendTimer()
  }

  // ── Step 3: new password ───────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    setIsLoading(true)
    const result = await fetchApi<{
      success: boolean
      token?: string
      access_token?: string
    }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        otp: otp.join(""),
        new_password: newPassword,
      }),
    })
    setIsLoading(false)

    // FIX: Show the real server error (e.g. "OTP expired", "Invalid OTP").
    if (result.error) {
      setError(result.error)
      // If the OTP was invalid/expired, go back to the OTP step.
      const lower = result.error.toLowerCase()
      if (lower.includes("invalid") || lower.includes("expired")) {
        setStep("otp")
        setOtp(["", "", "", "", "", ""])
      }
      return
    }

    const token = result.data?.access_token ?? result.data?.token
    if (token) localStorage.setItem("token", token)
    setStep("done")
    setTimeout(() => router.replace("/dashboard"), 1500)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/">
            <CampusOrbitLogo size="sm" />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md border-border bg-card">
          {/* Step 1 – email */}
          {step === "email" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Forgot password?</CardTitle>
                <CardDescription>
                  Enter your college email and we&apos;ll send a reset code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive text-center">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="fp-email">College Email</Label>
                    <Input
                      id="fp-email"
                      type="email"
                      placeholder="you@college.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Send reset code"
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {/* Step 2 – OTP */}
          {step === "otp" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Enter reset code</CardTitle>
                <CardDescription>
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive text-center">
                      {error}
                    </div>
                  )}
                  <div
                    className="flex justify-center gap-2"
                    onPaste={handleOtpPaste}
                  >
                    {otp.map((digit, i) => (
                      <Input
                        key={i}
                        ref={(el) => {
                          inputRefs.current[i] = el
                        }}
                        value={digit}
                        maxLength={1}
                        inputMode="numeric"
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-11 h-12 text-center text-lg font-semibold"
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={otp.join("").length !== 6}
                  >
                    Continue
                  </Button>
                  <div className="text-center text-sm text-muted-foreground">
                    {resendTimer > 0 ? (
                      <span>Resend in {resendTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={handleResend}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Resending…
                          </span>
                        ) : (
                          "Resend code"
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {/* Step 3 – new password */}
          {step === "password" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Set new password</CardTitle>
                <CardDescription>
                  Choose a strong password for your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive text-center">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="new-pwd">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-pwd"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-pwd">Confirm Password</Label>
                    <Input
                      id="confirm-pwd"
                      type="password"
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting…
                      </>
                    ) : (
                      "Reset password"
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {/* Step 4 – done */}
          {step === "done" && (
            <CardHeader className="text-center py-12">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Password reset!</CardTitle>
              <CardDescription>
                Redirecting you to your dashboard…
              </CardDescription>
            </CardHeader>
          )}
        </Card>
      </main>
    </div>
  )
}
