import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BizLens — Business Intelligence Analyzer",
  description:
    "Analyze URLs, social media posts, mobile apps, and business content. Simple input, detailed insights with scores and actionable recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950">
        <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="font-semibold text-white">BizLens</span>
            </div>
            <span className="text-xs text-slate-500">Business Intelligence Analyzer</span>
          </div>
        </header>
        {children}
        <footer className="border-t border-white/5 py-6 mt-auto">
          <div className="max-w-4xl mx-auto px-6 text-center text-xs text-slate-600">
            BizLens — Analyze anything business-related with one paste
          </div>
        </footer>
      </body>
    </html>
  );
}
