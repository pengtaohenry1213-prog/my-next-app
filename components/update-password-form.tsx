"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
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
      <h1 className="text-2xl font-bold text-white mb-2 text-center">设置新密码</h1>
      <p className="text-white/70 text-sm mb-6 text-center">
        请在下方输入您的新密码。
      </p>

      <form onSubmit={handleUpdatePassword}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <label htmlFor="password" className="text-white text-sm font-medium">
              新密码
            </label>
            <Input
              id="password"
              type="password"
              placeholder="请输入新密码"
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
            {isLoading ? "保存中..." : "保存新密码"}
          </Button>
        </div>
      </form>
    </div>
  );
}
