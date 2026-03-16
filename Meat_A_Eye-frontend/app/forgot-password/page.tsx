"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Beef, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
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
import { requestPasswordReset } from "@/lib/api";
import { BackButton } from "@/components/shared/BackButton";

const resetSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요"),
});

type ResetFormData = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    setIsLoading(true);
    try {
      await requestPasswordReset(data.email);
      setIsSent(true);
      setSentEmail(data.email);
      toast({
        title: "이메일 발송 완료 ✉️",
        description: "임시 비밀번호가 이메일로 발송되었습니다.",
      });
    } catch (error: any) {
      const msg = error.message || "";
      let description = "비밀번호 재설정에 실패했습니다. 다시 시도해주세요.";
      if (msg.includes("등록되지 않은") || msg.includes("404")) {
        description = "등록되지 않은 이메일입니다. 이메일을 확인해주세요.";
      } else if (msg.includes("게스트")) {
        description = "게스트 계정은 비밀번호 재설정을 할 수 없습니다.";
      } else if (msg.includes("이메일 발송") || msg.includes("503")) {
        description = "이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.";
      } else if (msg) {
        description = msg;
      }
      toast({
        title: "요청 실패",
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
            <CardTitle className="text-xl font-bold">비밀번호 찾기</CardTitle>
            <CardDescription>
              가입한 이메일로 임시 비밀번호를 보내드립니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSent ? (
              <>
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

                  <Button
                    type="submit"
                    className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        발송 중...
                      </>
                    ) : (
                      "임시 비밀번호 발송"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                  <Link
                    href="/login"
                    className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    로그인으로 돌아가기
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    이메일 발송 완료
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">{sentEmail}</strong>
                    <br />
                    위 주소로 임시 비밀번호를 발송했습니다.
                    <br />
                    이메일을 확인해주세요.
                  </p>
                </div>
                <div className="pt-2 space-y-2">
                  <Link href="/login" className="block">
                    <Button className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white">
                      로그인하러 가기
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => {
                      setIsSent(false);
                      setSentEmail("");
                    }}
                  >
                    다시 시도하기
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
