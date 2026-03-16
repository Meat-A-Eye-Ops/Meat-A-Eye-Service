"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Beef, Mail, Lock, Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { login, setIsGuest, changePassword } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { BackButton } from "@/components/shared/BackButton";

const loginSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login: setAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  // 임시 비밀번호 -> 비밀번호 재설정 모달
  const [showResetModal, setShowResetModal] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const response = await login(data);
      setIsGuest(false);
      setAuth(response.token, response.nickname, response.mustResetPassword);

      if (response.mustResetPassword) {
        // 임시 비밀번호로 로그인 -> 비밀번호 재설정 페이지로 이동
        toast({
          title: "비밀번호 재설정 필요",
          description:
            "임시 비밀번호로 로그인되었습니다. 새 비밀번호를 설정해주세요.",
        });
        router.push("/change-password");
        return;
      }

      toast({
        title: "로그인 성공! 🎉",
        description: `${response.nickname}님, 환영합니다!`,
      });
      router.push("/dashboard");
    } catch (error: any) {
      const msg = error.message || "";
      let description = "이메일 또는 비밀번호를 확인해주세요.";
      if (msg.includes("계정 없음") || msg.includes("404")) {
        description = "등록되지 않은 이메일입니다. 이메일을 확인해주세요.";
      } else if (msg.includes("비밀번호 불일치") || msg.includes("401")) {
        description = "비밀번호가 일치하지 않습니다. 다시 입력해주세요.";
      } else if (msg) {
        description = msg;
      }
      setLoginError(description);
      toast({
        title: "로그인 실패",
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 pt-16">
        <Card className="w-full max-w-md shadow-lg border-border/80">
          <CardHeader className="space-y-1 text-center pb-2">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-2xl bg-[#800000] flex items-center justify-center">
                <Beef className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold">로그인</CardTitle>
            <CardDescription>Meat-A-Eye에 오신 것을 환영합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* 로그인 실패 시 인라인 에러 메시지 */}
              {loginError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    로그인 중...
                  </>
                ) : (
                  "로그인"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">계정이 없으신가요? </span>
              <Link
                href="/signup"
                className="font-medium text-primary hover:underline"
              >
                회원가입
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 임시 비밀번호 -> 비밀번호 재설정 모달 */}
      <Dialog
        open={showResetModal}
        onOpenChange={(open) => {
          if (!open) {
            // 모달 닫으면 대시보드로 이동 (이미 로그인된 상태)
            router.push("/dashboard");
          }
          setShowResetModal(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <KeyRound className="w-5 h-5" />
              비밀번호 재설정
            </DialogTitle>
            <DialogDescription>
              임시 비밀번호로 로그인되었습니다. 보안을 위해 새 비밀번호를
              설정해주세요.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (newPassword.length < 6) {
                toast({
                  title: "비밀번호 오류",
                  description: "새 비밀번호는 최소 6자 이상이어야 합니다.",
                  variant: "destructive",
                });
                return;
              }
              if (newPassword !== confirmPassword) {
                toast({
                  title: "비밀번호 불일치",
                  description:
                    "새 비밀번호와 확인 비밀번호가 일치하지 않습니다.",
                  variant: "destructive",
                });
                return;
              }
              setIsResetting(true);
              try {
                await changePassword(tempPassword, newPassword);
                toast({
                  title: "비밀번호 변경 완료! 🎉",
                  description: "새 비밀번호로 설정되었습니다.",
                });
                setShowResetModal(false);
                router.push("/dashboard");
              } catch (error: any) {
                toast({
                  title: "비밀번호 변경 실패",
                  description: error.message || "다시 시도해주세요.",
                  variant: "destructive",
                });
              } finally {
                setIsResetting(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="새 비밀번호 (6자 이상)"
                  className="pl-10 pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">비밀번호 확인</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="새 비밀번호 확인"
                  className="pl-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">
                  비밀번호가 일치하지 않습니다
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowResetModal(false);
                  router.push("/dashboard");
                }}
              >
                나중에 변경
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#800000] hover:bg-[#800000]/90 text-white"
                disabled={isResetting || !newPassword || !confirmPassword}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    변경 중...
                  </>
                ) : (
                  "비밀번호 변경"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
