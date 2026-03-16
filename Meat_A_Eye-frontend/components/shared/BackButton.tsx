"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BackButtonProps {
  className?: string
  variant?: "default" | "ghost" | "outline"
  onClick?: () => void
}

export function BackButton({ className, variant = "ghost", onClick }: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.back()
    }
  }

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={handleClick}
      className={cn("h-9 w-9 rounded-full", className)}
      aria-label="뒤로 가기"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  )
}

