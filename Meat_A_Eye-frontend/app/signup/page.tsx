"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Beef, Mail, Lock, User, Loader2 } from "lucide-react";
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
import { signup, setIsGuest } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { BackButton } from "@/components/shared/BackButton";

const signupSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  nickname: z
    .string()
    .min(1, "닉네임을 입력해주세요")
    .max(50, "닉네임은 50자 이하여야 합니다"),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { login: setAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setSignupError(null);
    try {
      const response = await signup(data);
      setIsGuest(false);
      setAuth(response.token, data.nickname);
      toast({
        title: "회원가입 성공! 🎉",
        description: `${data.nickname}님, 환영합니다!`,
      });
      router.push("/dashboard");
    } catch (error: any) {
      const msg = error.message || "";
      let description = "회원가입에 실패했습니다. 다시 시도해주세요.";
      if (msg.includes("중복된 이메일") || msg.includes("409")) {
        description = "이미 등록된 이메일입니다. 다른 이메일을 사용해주세요.";
      } else if (msg) {
        description = msg;
      }
      setSignupError(description);
      toast({
        title: "회원가입 실패",
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
            <CardTitle className="text-xl font-bold">회원가입</CardTitle>
            <CardDescription>Meat-A-Eye 계정을 만들어보세요</CardDescription>
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
                <Label htmlFor="nickname">닉네임</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nickname"
                    type="text"
                    placeholder="닉네임을 입력하세요"
                    className="pl-10"
                    {...register("nickname")}
                  />
                </div>
                {errors.nickname && (
                  <p className="text-sm text-destructive">
                    {errors.nickname.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    {...register("password")}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {signupError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2">
                  <p className="text-sm text-destructive font-medium">
                    {signupError}
                  </p>
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
                    가입 중...
                  </>
                ) : (
                  "회원가입"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                이미 계정이 있으신가요?{" "}
              </span>
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                로그인
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
