"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { User, Sparkles, LogIn, UserPlus } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createGuestSession, getGuestNickname, setGuestNickname, getAuthToken, getIsGuest } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

interface GuestModeModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onComplete: (nickname: string) => void
}

export function GuestModeModal({ open: controlledOpen, onOpenChange, onComplete }: GuestModeModalProps) {
  const router = useRouter()
  const { login: setAuth } = useAuth()
  const [internalOpen, setInternalOpen] = useState(false)
  const [nickname, setNickname] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (v: boolean) => onOpenChange?.(v) : setInternalOpen

  useEffect(() => {
    if (!isControlled) {
      const existingNickname = getGuestNickname()
      if (!existingNickname) setTimeout(() => setInternalOpen(true), 400)
      else onComplete(existingNickname)
    }
  }, [isControlled])

  const enterAsGuest = async () => {
    if (getAuthToken() && getIsGuest()) {
      setOpen(false)
      onComplete(getGuestNickname() || "게스트")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await createGuestSession("게스트")
      setGuestNickname("게스트")
      setAuth(result.token, result.nickname)
      setOpen(false)
      onComplete("게스트")
    } catch (err: any) {
      console.error("Failed to create guest session:", err)
      setError(err.message || "세션 생성에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setLoading(false)
    }
  }

  const goToLogin = () => {
    setOpen(false)
    router.push("/login")
  }

  const goToSignup = () => {
    setOpen(false)
    router.push("/signup")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요")
      return
    }

    if (nickname.length < 2) {
      setError("닉네임은 2자 이상이어야 합니다")
      return
    }

    if (nickname.length > 10) {
      setError("닉네임은 10자 이하여야 합니다")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await createGuestSession(nickname.trim())
      setGuestNickname(nickname.trim())
      setAuth(result.token, result.nickname)
      setOpen(false)
      onComplete(nickname.trim())
    } catch (err: any) {
      console.error("Failed to create guest session:", err)
      setError(err.message || "세션 생성에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !loading && setOpen(newOpen)}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-primary">
            <Sparkles className="w-5 h-5" />
            Meat-A-Eye에 오신 것을 환영합니다!
          </DialogTitle>
          <DialogDescription>
            시작하기 전에 닉네임을 설정해주세요
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="space-y-6 mt-4"
        >
          {/* 게스트로 입장 - 1클릭 */}
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              type="button"
              onClick={enterAsGuest}
              disabled={loading}
              variant="default"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  접속 중...
                </span>
              ) : (
                <>
                  <User className="w-5 h-5 mr-2" />
                  게스트로 입장
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              닉네임 없이 바로 이용 (게스트)
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative flex justify-center text-xs text-muted-foreground">
              또는
            </span>
          </div>

          {/* 로그인 / 회원가입 */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 border-border"
              onClick={goToLogin}
              disabled={loading}
            >
              <LogIn className="w-4 h-4 mr-2" />
              로그인
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 border-border"
              onClick={goToSignup}
              disabled={loading}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              회원가입
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative flex justify-center text-xs text-muted-foreground">
              또는 닉네임 설정
            </span>
          </div>

          {/* Welcome Card + Nickname Form */}
          <div className="bg-secondary rounded-lg p-4 border border-border space-y-4">
            <h3 className="font-semibold text-sm text-foreground">닉네임을 정하고 시작하기</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                AI 고기 부위 판별 · 냉장고 관리 · 레시피 추천
              </li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-base">
                닉네임 *
              </Label>
              <Input
                id="nickname"
                placeholder="육류박사"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value)
                  setError(null)
                }}
                disabled={loading}
                className="text-base h-12"
                maxLength={10}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                2~10자 이내로 입력해주세요
              </p>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600"
                >
                  {error}
                </motion.p>
              )}
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                    />
                    설정 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    시작하기
                  </>
                )}
              </Button>
            </motion.div>
          </form>

          {/* Privacy Notice */}
          <p className="text-xs text-center text-muted-foreground">
            입력하신 정보는 브라우저에만 저장되며,
            <br />
            언제든지 변경하실 수 있습니다.
          </p>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

