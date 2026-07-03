"use client";

import {
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  Target,
  Zap,
  Clock,
  BookOpen,
  Copy,
} from "lucide-react";
import type { AnalysisReport, CopySolution } from "@/lib/types";
import { ScoreGauge } from "@/components/ScoreGauge";
import { cn, scoreColor, scoreBarColor } from "@/lib/utils";
import { useState } from "react";

interface AnalysisReportViewProps {
  report: AnalysisReport;
}

const PRIORITY_STYLES = {
  high: "border-red-500/30 bg-red-500/10 text-red-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  low: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

export function AnalysisReportView({ report }: AnalysisReportViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(report.sections.map((s) => s.id))
  );

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const analyzedDate = new Date(report.analyzedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-8 p-6 lg:p-8 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm">
        <ScoreGauge score={report.overallScore} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 capitalize">
              {report.detectedType === "auto" ? "Auto" : report.detectedType}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              {analyzedDate}
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-1 truncate">{report.title}</h2>
          <p className="text-slate-400 text-sm truncate">{report.subtitle}</p>
        </div>
      </div>

      {/* Score cards */}
      {report.scores.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {report.scores.map((score) => (
            <div
              key={score.label}
              className="p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">{score.label}</span>
                <span className={cn("text-lg font-bold tabular-nums", scoreColor(score.score))}>
                  {score.score}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000", scoreBarColor(score.score))}
                  style={{ width: `${score.score}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">{score.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ready-to-use copy solutions */}
      {report.solutions && report.solutions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-violet-400" />
            <h3 className="text-lg font-semibold text-white">Ready-to-Use Copy — Paste Directly</h3>
          </div>
          {report.solutions.map((solution, i) => (
            <SolutionCard key={i} solution={solution} />
          ))}
        </div>
      )}

      {/* Action items */}
      {report.actionItems.length > 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/50 to-slate-900/50 border border-indigo-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Priority Actions</h3>
          </div>
          <ul className="space-y-3">
            {report.actionItems.map((item, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border",
                  PRIORITY_STYLES[item.priority]
                )}
              >
                <Zap className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
                    {item.priority}
                  </span>
                  <p className="text-sm leading-relaxed mt-0.5">{item.action}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Detailed Analysis</h3>
        {report.sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const isBenchmark = section.id === "marketing-intelligence-audit";
          return (
            <div
              key={section.id}
              className={cn(
                "rounded-xl overflow-hidden",
                isBenchmark
                  ? "bg-gradient-to-br from-violet-950/40 to-slate-900/40 border border-violet-500/30"
                  : "bg-slate-900/40 border border-white/5"
              )}
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    {isBenchmark && <BookOpen className="w-4 h-4 text-violet-400" />}
                    <span className={cn(
                      "text-xs font-medium uppercase tracking-wider",
                      isBenchmark ? "text-violet-400" : "text-indigo-400"
                    )}>
                      {isBenchmark ? "VitalEdge / Pinnacle Benchmark" : section.category}
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-white mt-0.5">{section.title}</h4>
                  <p className="text-sm text-slate-400 mt-1 line-clamp-1">{section.summary}</p>
                </div>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-slate-500 shrink-0 ml-4 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">{section.summary}</p>

                  {section.metrics && section.metrics.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {section.metrics.map((m) => (
                        <div key={m.label} className="p-3 rounded-lg bg-white/5">
                          <div className="text-xs text-slate-500">{m.label}</div>
                          <div className="text-sm font-medium text-white mt-0.5 truncate">{m.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.highlights && section.highlights.length > 0 && (
                    <div className="space-y-2">
                      {section.highlights.map((h, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-start gap-2 text-sm",
                            h.type === "positive" && "text-emerald-400",
                            h.type === "negative" && "text-red-400",
                            h.type === "neutral" && "text-slate-400"
                          )}
                        >
                          {h.type === "positive" && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                          {h.type === "negative" && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                          {h.type === "neutral" && <Info className="w-4 h-4 shrink-0 mt-0.5" />}
                          {h.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {section.solutions && section.solutions.length > 0 && (
                    <div className="space-y-3">
                      {section.solutions.map((solution, i) => (
                        <SolutionCard key={i} solution={solution} compact />
                      ))}
                    </div>
                  )}

                  <ul className="space-y-2">
                    {section.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-400 leading-relaxed">
                        <span className="text-indigo-500 mt-1.5 shrink-0">•</span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SolutionCard({ solution, compact = false }: { solution: CopySolution; compact?: boolean }) {
  const priorityStyle = PRIORITY_STYLES[solution.priority];

  return (
    <div className={cn("rounded-xl border p-4", priorityStyle, compact ? "text-sm" : "")}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
            {solution.priority} · {solution.label}
          </span>
          <p className="text-sm mt-1 opacity-90">{solution.problem}</p>
          <p className="text-xs mt-1 opacity-60">Where: {solution.placement}</p>
        </div>
      </div>
      <div className="mt-3 p-3 rounded-lg bg-black/30 border border-white/10">
        <p className="text-xs text-violet-300 mb-2 font-medium">Copy & paste this:</p>
        <pre className="text-sm text-slate-100 whitespace-pre-wrap font-sans leading-relaxed">
          {solution.copy}
        </pre>
      </div>
    </div>
  );
}
