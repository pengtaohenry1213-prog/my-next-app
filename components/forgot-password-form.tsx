"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";
import { Mail } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <Mail className="w-16 h-16 text-green-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">请查收邮件</h1>
        <p className="text-white/70 text-sm mb-6">
          密码重置链接已发送到您的邮箱。
        </p>
        <p className="text-white/60 text-sm">
          如果您使用邮箱和密码注册了账户，您将收到一封密码重置邮件。
        </p>
        <div className="mt-6">
          <Link
            href="/auth/login"
            className="text-white font-medium underline underline-offset-4 hover:text-white/80"
          >
            返回登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2 text-center">重置密码</h1>
      <p className="text-white/70 text-sm mb-6 text-center">
        输入您的邮箱地址，我们将发送密码重置链接
      </p>

      <form onSubmit={handleForgotPassword}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <label htmlFor="email" className="text-white text-sm font-medium">
              邮箱
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/20 border-white/30 text-white placeholder-white/50 focus:ring-white/50"
            />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
            disabled={isLoading}
          >
            {isLoading ? "发送中..." : "发送重置链接"}
          </Button>
        </div>
        <div className="mt-6 text-center text-sm">
          已有账户？{" "}
          <Link
            href="/auth/login"
            className="text-white font-medium underline underline-offset-4 hover:text-white/80"
          >
            立即登录
          </Link>
        </div>
      </form>
    </div>
  );
}
