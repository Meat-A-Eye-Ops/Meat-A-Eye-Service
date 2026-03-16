"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
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
import { toast } from "@/components/ui/use-toast";
import { changePassword } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { isAuthenticated, mustResetPassword, clearMustResetPassword } =
    useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 비밀번호 유효성 검사
  const isMinLength = newPassword.length >= 6;
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    isMinLength &&
    passwordsMatch &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMinLength) {
      toast({
        title: "비밀번호 오류",
        description: "새 비밀번호는 최소 6자 이상이어야 합니다.",
        variant: "destructive",
      });
      return;
    }
    if (!passwordsMatch) {
      toast({
        title: "비밀번호 불일치",
        description: "새 비밀번호와 확인 비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      clearMustResetPassword();
      toast({
        title: "비밀번호 변경 완료! 🎉",
        description: "새 비밀번호로 성공적으로 변경되었습니다.",
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "비밀번호 변경 실패",
        description:
          error.message || "현재 비밀번호를 확인하고 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      {/* 뒤로가기 버튼 */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 pt-16">
        <Card className="w-full max-w-md shadow-lg border-border/80">
          <CardHeader className="space-y-1 text-center pb-2">
            <div className="flex justify-center mb-2">
              <div className="p-3 rounded-full bg-primary/10">
                <KeyRound className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">비밀번호 변경</CardTitle>
            <CardDescription>
              {mustResetPassword
                ? "임시 비밀번호로 로그인하셨습니다. 보안을 위해 새 비밀번호를 설정해주세요."
                : "현재 비밀번호를 확인한 후 새 비밀번호를 설정합니다."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {mustResetPassword && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
                <KeyRound className="h-4 w-4 mt-0.5 shrink-0" />
                <span>임시 비밀번호를 현재 비밀번호란에 입력해주세요.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 현재 비밀번호 */}
              <div className="space-y-2">
                <Label htmlFor="current-password">
                  {mustResetPassword ? "임시 비밀번호" : "현재 비밀번호"}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder={
                      mustResetPassword
                        ? "이메일로 받은 임시 비밀번호"
                        : "현재 비밀번호 입력"
                    }
                    className="pl-10 pr-10"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 새 비밀번호 */}
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
                {newPassword.length > 0 && (
                  <p
                    className={`text-xs flex items-center gap-1 ${isMinLength ? "text-emerald-600" : "text-muted-foreground"}`}
                  >
                    <CheckCircle2
                      className={`h-3 w-3 ${isMinLength ? "text-emerald-600" : "text-muted-foreground/50"}`}
                    />
                    6자 이상 {isMinLength ? "✓" : ""}
                  </p>
                )}
              </div>

              {/* 비밀번호 확인 */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="새 비밀번호 확인"
                    className="pl-10 pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p
                    className={`text-xs flex items-center gap-1 ${passwordsMatch ? "text-emerald-600" : "text-destructive"}`}
                  >
                    {passwordsMatch
                      ? "비밀번호가 일치합니다 ✓"
                      : "비밀번호가 일치하지 않습니다"}
                  </p>
                )}
              </div>

              {/* 버튼 영역 */}
              <div className="flex gap-2 pt-2">
                {!mustResetPassword && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.back()}
                  >
                    취소
                  </Button>
                )}
                <Button
                  type="submit"
                  className="flex-1 bg-[#800000] hover:bg-[#800000]/90 text-white"
                  disabled={!canSubmit}
                >
                  {isSubmitting ? (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
