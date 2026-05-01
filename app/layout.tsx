import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import "./globals.css"
import { AuthGuard } from "@/lib/auth-guard"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "CampusOrbit - Campus Rental Platform",
  description:
    "Share, connect, and grow with your campus community. Rent items from fellow students easily and affordably.",
  keywords: ["campus", "rental", "students", "share", "borrow", "college"],
  authors: [{ name: "CampusOrbit" }],
  icons: {
    // Browser tab favicon — Next.js also auto-picks up app/icon.png
    icon: [
      { url: "/icon-light-32x32.png", sizes: "32x32", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png",  sizes: "32x32", type: "image/png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon-512.png",         sizes: "512x512", type: "image/png" },
    ],
    // iOS home screen icon
    apple: [
      { url: "/apple-icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon-light-32x32.png",
  },
  openGraph: {
    title: "CampusOrbit - Campus Rental Platform",
    description: "Share, connect, and grow with your campus community.",
    type: "website",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "CampusOrbit" }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF8F2" },
    { media: "(prefers-color-scheme: dark)", color: "#161711" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-background">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <AuthProvider>
            <AuthGuard>{children}</AuthGuard>
          </AuthProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
