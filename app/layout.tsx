import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AuthButton } from "@/components/auth-button";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Header with Auth */}
          <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 py-4 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-lg font-bold transition-colors"
              >
                Todo App
              </Link>
              <AuthButton />
            </div>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
