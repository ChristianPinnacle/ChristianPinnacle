"use client";

import { useState } from "react";
import { BarChart3, Shield, Zap, Layers, UserRound } from "lucide-react";
import { InputPanel } from "@/components/InputPanel";
import { AnalysisReportView } from "@/components/AnalysisReport";
import type { AnalysisReport, InputType } from "@/lib/types";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Deep URL Analysis",
    description: "SEO, technical health, content quality, and marketing signals from any website.",
  },
  {
    icon: Zap,
    title: "Social Media Intelligence",
    description: "Platform-specific engagement tips, hashtag strategy, and conversion optimization.",
  },
  {
    icon: UserRound,
    title: "Instagram Profile Audit",
    description: "Bio rewrite, DM funnel, Highlights plan, and 2026 algorithm strategy for any @handle.",
  },
  {
    icon: Layers,
    title: "App Store Optimization",
    description: "ASO scoring, listing quality, and growth recommendations for iOS and Android.",
  },
  {
    icon: Shield,
    title: "Business Messaging",
    description: "Value proposition clarity, audience fit, and actionable messaging improvements.",
  },
];

export default function Home() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(input: string, type: InputType) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, type: type === "auto" ? "auto" : type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Analysis failed");
      }

      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            Business Intelligence Analyzer
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4">
            Simple input.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              Detailed insights.
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Paste a URL, social post, Instagram profile, app link, or business description. Every analysis is audited
            against VitalEdge Hub / Pinnacle Coaching marketing intelligence — Hormozi, Brandon
            Willington, Zac Perna, and 2026 fitness industry benchmarks.
          </p>
        </div>
      </section>

      {/* Input */}
      <section className="relative max-w-4xl mx-auto px-6 -mt-4 pb-8">
        <InputPanel onAnalyze={handleAnalyze} isLoading={isLoading} />
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}
      </section>

      {/* Report or Features */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        {report ? (
          <AnalysisReportView report={report} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
