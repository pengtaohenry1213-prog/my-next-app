import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header with back link */}
      <div className="max-w-md mx-auto mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <Home className="w-5 h-5" />
          <span>返回首页</span>
        </Link>
      </div>

      {/* Auth Card */}
      <div className="max-w-md mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
