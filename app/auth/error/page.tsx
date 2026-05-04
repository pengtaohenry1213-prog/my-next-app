import { Suspense } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      {params?.error ? (
        <p className="text-red-300 text-sm">错误代码: {params.error}</p>
      ) : (
        <p className="text-red-300 text-sm">发生了未知错误。</p>
      )}
    </>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <div className="text-center">
      <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-white mb-2">
        抱歉，发生了错误。
      </h1>
      <div className="mb-6">
        <Suspense>
          <ErrorContent searchParams={searchParams} />
        </Suspense>
      </div>
      <Link
        href="/auth/login"
        className="text-white font-medium underline underline-offset-4 hover:text-white/80"
      >
        返回登录
      </Link>
    </div>
  );
}
