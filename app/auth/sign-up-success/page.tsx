import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function Page() {
  return (
    <div className="text-center">
      <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-white mb-2">
        感谢您的注册！
      </h1>
      <p className="text-white/70 text-sm mb-6">
        请查收邮件以确认您的账户。
      </p>
      <p className="text-white/60 text-sm">
        请先查收邮件确认您的账户，然后再进行登录。
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
