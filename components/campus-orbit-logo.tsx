"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface CampusOrbitLogoProps {
  className?: string
  showText?: boolean
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeMap = {
  sm: { icon: 32, text: "text-lg" },
  md: { icon: 40, text: "text-xl" },
  lg: { icon: 48, text: "text-2xl" },
  xl: { icon: 64, text: "text-3xl" },
}

export function CampusOrbitLogo({
  className,
  showText = true,
  size = "md",
}: CampusOrbitLogoProps) {
  const { text } = sizeMap[size]

  return (
    <div
      className={cn(
        "flex items-center gap-2 transition-transform duration-200 hover:scale-105",
        className
      )}
    >
      <CampusOrbitIcon size={size} />
      {showText && (
        <span className={cn("font-semibold tracking-tight leading-none", text)}>
          <span className="text-foreground">Campus</span>
          <span className="text-primary">Orbit</span>
        </span>
      )}
    </div>
  )
}

export function CampusOrbitLogoWithTagline({
  className,
  size = "lg",
}: Omit<CampusOrbitLogoProps, "showText">) {
  const { text } = sizeMap[size]

  return (
    <div
      className={cn(
        "flex items-center gap-3 transition-transform duration-200 hover:scale-105",
        className
      )}
    >
      <CampusOrbitIcon size={size} />
      <div className="flex flex-col">
        <span className={cn("font-semibold tracking-tight leading-none", text)}>
          <span className="text-foreground">Campus</span>
          <span className="text-primary">Orbit</span>
        </span>
        <span className="mt-1 text-[0.55em] font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Share <span className="text-primary">•</span> Connect{" "}
          <span className="text-primary">•</span> Thrive
        </span>
      </div>
    </div>
  )
}

interface CampusOrbitIconProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

/**
 * Icon-only version — switches between light/dark logo variants.
 * Light mode: /logo-light.png (dark orbit ring, visible on white/light bg)
 * Dark mode:  /logo-dark.png  (silver orbit ring, visible on dark bg)
 *
 * Uses `resolvedTheme` so SSR doesn't cause a flash — defaults to
 * light until hydration is complete.
 */
export function CampusOrbitIcon({ size = "md", className }: CampusOrbitIconProps) {
  const { icon } = sizeMap[size]
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Before hydration, always show the light logo to avoid layout shift
  const src = mounted && resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="CampusOrbit"
      width={icon}
      height={icon}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: icon, height: icon }}
    />
  )
}

/**
 * App icon version — uses the orange rounded-square variant.
 */
export function CampusOrbitAppIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/apple-icon.png"
      alt="CampusOrbit"
      className={cn("rounded-xl object-contain", className)}
      style={{ width: 48, height: 48 }}
    />
  )
}
