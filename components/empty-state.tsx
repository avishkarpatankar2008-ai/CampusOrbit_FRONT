import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  hindiText?: string
  marathiText?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({
  icon,
  title,
  description,
  hindiText,
  marathiText,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mb-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      
      {/* Subtle Hindi/Marathi text */}
      {(hindiText || marathiText) && (
        <div className="mb-4 space-y-0.5">
          {hindiText && (
            <p className="text-xs text-muted-foreground/70">{hindiText}</p>
          )}
          {marathiText && (
            <p className="text-xs text-muted-foreground/70">{marathiText}</p>
          )}
        </div>
      )}

      {action && (
        <div className="mt-4">
          {action.href ? (
            <Button asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  )
}
