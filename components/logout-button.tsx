"use client";

import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  isLoading?: boolean;
  onLogout?: () => void;
}

export function LogoutButton({ isLoading = false, onLogout }: LogoutButtonProps) {
  const handleLogout = async () => {
    if (isLoading) return;
    
    console.log("LogoutButton: 开始退出...");
    
    onLogout?.();
    
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("LogoutButton: signOut 失败", error);
    } else {
      console.log("LogoutButton: signOut 成功，跳转到登录页");
    }
    
    // 使用 window.location 确保跳转
    window.location.href = "/auth/login";
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm transition-colors disabled:opacity-50"
    >
      <LogOut className="w-4 h-4" />
      {isLoading ? "退出中..." : "退出登录"}
    </button>
  );
}
