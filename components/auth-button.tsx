"use client";

import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { createClient } from "@/lib/supabase/client";
import { LogIn } from "lucide-react";
import { useEffect, useState } from "react";

export function AuthButton() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    // 获取初始状态
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    // 监听状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="w-20 h-8 bg-white/10 rounded-lg animate-pulse" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-white text-sm">
          已登录 <strong>{user.email}</strong>
        </span>
        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Link
        href="/auth/login"
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm transition-colors"
      >
        <LogIn className="w-4 h-4" />
        登录
      </Link>
      <Link
        href="/auth/sign-up"
        className="px-3 py-1.5 rounded-lg bg-white hover:bg-white/90 text-purple-600 text-sm font-medium transition-colors"
      >
        注册
      </Link>
    </div>
  );
}
