"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2 text-center">注册</h1>
      <p className="text-white/70 text-sm mb-6 text-center">创建新账户</p>

      <form onSubmit={handleSignUp}>
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
            <label htmlFor="password" className="text-white text-sm font-medium">
              密码
            </label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/20 border-white/30 text-white placeholder-white/50 focus:ring-white/50"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="repeat-password" className="text-white text-sm font-medium">
              确认密码
            </label>
            <Input
              id="repeat-password"
              type="password"
              required
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              className="bg-white/20 border-white/30 text-white placeholder-white/50 focus:ring-white/50"
            />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
            disabled={isLoading}
          >
            {isLoading ? "创建账户中..." : "注册"}
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
