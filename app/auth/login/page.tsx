"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2 text-center">登录</h1>
      <p className="text-white/70 text-sm mb-6 text-center">
        输入您的邮箱地址以登录账户
      </p>

      <form onSubmit={handleLogin}>
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
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-white text-sm font-medium">
                密码
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-white/70 hover:text-white underline-offset-4 hover:underline"
              >
                忘记密码？
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/20 border-white/30 text-white placeholder-white/50 focus:ring-white/50"
            />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
            disabled={isLoading}
          >
            {isLoading ? "登录中..." : "登录"}
          </Button>
        </div>
        <div className="mt-6 text-center text-sm">
          还没有账户？{" "}
          <Link
            href="/auth/sign-up"
            className="text-white font-medium underline underline-offset-4 hover:text-white/80"
          >
            立即注册
          </Link>
        </div>
      </form>
    </div>
  );
}
