import type { AnalysisReport, AnalysisSection, ScoreMetric } from "@/lib/types";
import { clamp } from "@/lib/utils";
import {
  type AuditContext,
  type AuditCriterion,
  BENCHMARK_SOURCES,
  GENERIC_OFFER_PHRASES,
  getCriteriaForContext,
} from "@/lib/intelligence/criteria";

export interface AuditCheckResult {
  id: string;
  label: string;
  framework: string;
  passed: boolean;
  message: string;
  recommendation: string;
  weight: number;
}

export interface MarketingAuditResult {
  context: AuditContext;
  overallScore: number;
  checks: AuditCheckResult[];
  passedCount: number;
  totalCount: number;
  criticalGaps: string[];
  vitalEdgeGaps: string[];
  scores: ScoreMetric[];
  section: AnalysisSection;
  actionItems: { priority: "high" | "medium" | "low"; action: string }[];
}

export function runMarketingAudit(text: string, context: AuditContext): MarketingAuditResult {
  const criteria = getCriteriaForContext(context);
  const normalized = text.trim();

  const checks: AuditCheckResult[] = criteria.map((c) => {
    const passed = c.test(normalized);
    return {
      id: c.id,
      label: c.label,
      framework: c.framework,
      passed,
      message: passed ? c.passMessage : c.failMessage,
      recommendation: c.recommendation,
      weight: c.weight,
    };
  });

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earnedWeight = checks.filter((c) => c.passed).reduce((s, c) => s + c.weight, 0);
  const overallScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  const failed = checks.filter((c) => !c.passed);
  const passedCount = checks.length - failed.length;

  const criticalGaps = identifyCriticalGaps(normalized, failed);
  const vitalEdgeGaps = identifyVitalEdgeGaps(normalized, context, failed);

  const categoryScores = computeCategoryScores(checks);

  const section = buildAuditSection(
    context,
    overallScore,
    checks,
    criticalGaps,
    vitalEdgeGaps,
    passedCount,
    checks.length
  );

  const actionItems = buildAuditActionItems(failed, vitalEdgeGaps, context);

  return {
    context,
    overallScore,
    checks,
    passedCount,
    totalCount: checks.length,
    criticalGaps,
    vitalEdgeGaps,
    scores: categoryScores,
    section,
    actionItems,
  };
}

function computeCategoryScores(checks: AuditCheckResult[]): ScoreMetric[] {
  const groups: Record<string, { earned: number; total: number; label: string }> = {
    offer: { earned: 0, total: 0, label: "Grand Slam Offer" },
    value: { earned: 0, total: 0, label: "Value Equation" },
    conversion: { earned: 0, total: 0, label: "Conversion Architecture" },
    hooks: { earned: 0, total: 0, label: "Hooks & Copy" },
  };

  const categoryMap: Record<string, keyof typeof groups> = {
    specific_outcome: "offer",
    target_avatar: "offer",
    risk_reversal: "offer",
    value_stack: "offer",
    proof_likelihood: "value",
    time_delay: "value",
    effort_reduction: "value",
    proof_volume: "value",
    strong_cta: "conversion",
    dm_funnel_cta: "conversion",
    single_cta: "conversion",
    application_qualify: "conversion",
    cta_repeated: "conversion",
    objection_handling: "conversion",
    urgency_real: "conversion",
    hook_strength: "hooks",
    problem_hook: "hooks",
    credibility_signal: "hooks",
    specificity: "hooks",
    hero_outcome: "hooks",
    engagement_question: "hooks",
    coach_platform_pain: "offer",
    free_to_workshop_ladder: "conversion",
  };

  for (const check of checks) {
    const cat = categoryMap[check.id] ?? "hooks";
    groups[cat].total += check.weight;
    if (check.passed) groups[cat].earned += check.weight;
  }

  return Object.values(groups)
    .filter((g) => g.total > 0)
    .map((g) => ({
      label: g.label,
      score: Math.round((g.earned / g.total) * 100),
      description: `Benchmark score vs ${g.label} frameworks`,
    }));
}

function identifyCriticalGaps(text: string, failed: AuditCheckResult[]): string[] {
  const gaps: string[] = [];

  if (GENERIC_OFFER_PHRASES.some((p) => p.test(text))) {
    gaps.push(
      "Offer clarity: 'Online coaching' / 'transform your body' is NOT a Grand Slam Offer — needs specific outcome + avatar + timeline (Hormozi)"
    );
  }

  const priorityIds = [
    "specific_outcome",
    "risk_reversal",
    "dm_funnel_cta",
    "hook_strength",
    "problem_hook",
    "application_qualify",
    "proof_volume",
  ];

  for (const check of failed) {
    if (priorityIds.includes(check.id)) {
      gaps.push(`${check.label}: ${check.message}`);
    }
  }

  return [...new Set(gaps)].slice(0, 6);
}

function identifyVitalEdgeGaps(
  text: string,
  context: AuditContext,
  failed: AuditCheckResult[]
): string[] {
  const gaps: string[] = [];
  const isCoachB2B = /\b(coach|trainer|platform|SaaS|VitalEdge|Skool|client management)\b/i.test(text);
  const isConsumerB2C = /\b(physique|weight|nutrition|workout|transformation|personal training client)\b/i.test(text);

  if (isCoachB2B || context === "landing_page") {
    if (!/\b(google sheets|losing clients|platform|spreadsheet|check.?in)\b/i.test(text)) {
      gaps.push(
        "VitalEdge B2B: Missing coach-specific pain — e.g. 'Stop losing clients because your platform looks like Google Sheets'"
      );
    }
    if (failed.some((c) => c.id === "free_to_workshop_ladder")) {
      gaps.push(
        "VitalEdge B2B: No free course → workshop funnel (Hormozi template for converting cold coaches)"
      );
    }
    if (failed.some((c) => c.id === "application_qualify")) {
      gaps.push(
        "VitalEdge B2B: Add application funnel to qualify coaches before demo — filters better leads (Brandon With U model)"
      );
    }
  }

  if (isConsumerB2C || context === "social_post") {
    if (failed.some((c) => c.id === "dm_funnel_cta")) {
      gaps.push(
        "Pinnacle B2C: Comment-to-DM automation is highest-converting channel (12–25%) — add keyword trigger to content"
      );
    }
    if (failed.some((c) => c.id === "risk_reversal")) {
      gaps.push(
        "Pinnacle B2C: Guarantee is underused in AU coaching market — can increase conversions 3–5x (Hormozi)"
      );
    }
    if (failed.some((c) => c.id === "problem_hook")) {
      gaps.push(
        "Pinnacle B2C: Use mirror/myth-bust hooks → DM funnel → qualify → discovery call → close"
      );
    }
  }

  if (failed.some((c) => c.id === "proof_volume")) {
    gaps.push("Need more than 3 testimonials — show wall, numbers, specifics (Zac Perna: '13,000 physiques transformed')");
  }

  return [...new Set(gaps)].slice(0, 5);
}

function buildAuditSection(
  context: AuditContext,
  score: number,
  checks: AuditCheckResult[],
  criticalGaps: string[],
  vitalEdgeGaps: string[],
  passed: number,
  total: number
): AnalysisSection {
  const contextLabel =
    context === "landing_page"
      ? "Landing Page"
      : context === "social_post"
        ? "Social Content"
        : context === "business_copy"
          ? "Business Copy"
          : "App Listing";

  const passedChecks = checks.filter((c) => c.passed);
  const failedChecks = checks.filter((c) => !c.passed);

  return {
    id: "marketing-intelligence-audit",
    title: "Marketing Intelligence Audit",
    category: "marketing",
    summary: `${contextLabel} scored ${score}/100 against VitalEdge Hub / Pinnacle Coaching benchmarks (${passed}/${total} criteria passed). Sources: Hormozi, Brandon Willington, Zac Perna, fitness industry 2026 data.`,
    details: [
      ...criticalGaps.map((g) => `⚠ Critical gap: ${g}`),
      ...vitalEdgeGaps.map((g) => `→ VitalEdge/Pinnacle: ${g}`),
      "",
      "Passed benchmarks:",
      ...(passedChecks.length > 0
        ? passedChecks.map((c) => `✓ ${c.label} (${c.framework}): ${c.message}`)
        : ["None — significant gaps vs industry leaders"]),
      "",
      "Failed benchmarks:",
      ...failedChecks.slice(0, 8).map((c) => `✗ ${c.label} (${c.framework}): ${c.recommendation}`),
      "",
      `Benchmark sources: ${BENCHMARK_SOURCES.slice(0, 4).join("; ")}…`,
    ],
    metrics: [
      { label: "Benchmark Score", value: `${score}/100` },
      { label: "Criteria Passed", value: `${passed}/${total}` },
      { label: "Context", value: contextLabel },
      { label: "Intelligence Base", value: "July 2026" },
    ],
    highlights: [
      ...(score >= 70
        ? [{ type: "positive" as const, text: "Meets majority of elite marketer benchmarks" }]
        : [{ type: "negative" as const, text: "Below benchmark — significant gaps vs Hormozi/Brandon/Zac Perna playbooks" }]),
      ...(passedChecks.some((c) => c.id === "specific_outcome")
        ? [{ type: "positive" as const, text: "Grand Slam Offer structure partially present" }]
        : [{ type: "negative" as const, text: "Generic offer language — not a Grand Slam Offer" }]),
      ...(passedChecks.some((c) => c.id === "dm_funnel_cta")
        ? [{ type: "positive" as const, text: "DM funnel CTA aligned with 2026 Instagram best practice" }]
        : context === "social_post"
          ? [{ type: "negative" as const, text: "Missing comment-to-DM trigger (12–25% vs 1.5–3% link-in-bio)" }]
          : []),
    ],
  };
}

function buildAuditActionItems(
  failed: AuditCheckResult[],
  vitalEdgeGaps: string[],
  context: AuditContext
): { priority: "high" | "medium" | "low"; action: string }[] {
  const items: { priority: "high" | "medium" | "low"; action: string }[] = [];

  const highPriorityIds = new Set([
    "specific_outcome",
    "risk_reversal",
    "dm_funnel_cta",
    "hook_strength",
    "problem_hook",
    "strong_cta",
    "application_qualify",
  ]);

  for (const check of failed) {
    if (highPriorityIds.has(check.id)) {
      items.push({
        priority: "high",
        action: `[${check.framework}] ${check.recommendation}`,
      });
    }
  }

  for (const gap of vitalEdgeGaps.slice(0, 2)) {
    items.push({ priority: "high", action: gap });
  }

  for (const check of failed) {
    if (!highPriorityIds.has(check.id) && items.length < 8) {
      items.push({
        priority: "medium",
        action: `[${check.framework}] ${check.recommendation}`,
      });
    }
  }

  if (context === "social_post" && failed.some((c) => c.id === "dm_funnel_cta")) {
    items.unshift({
      priority: "high",
      action:
        "Add comment-to-DM CTA: 'DM me [KEYWORD]' — benchmark 12–25% conversion vs 1.5–3% link-in-bio (Pinnacle B2C priority)",
    });
  }

  if (items.length === 0) {
    items.push({
      priority: "low",
      action: "A/B test against Hormozi Value Equation levers — dream outcome, proof, speed, effort reduction",
    });
  }

  return items.slice(0, 8);
}

export function enrichReportWithAudit(
  report: AnalysisReport,
  audit: MarketingAuditResult
): AnalysisReport {
  const existingIds = new Set(report.actionItems.map((a) => a.action));
  const newActions = audit.actionItems.filter((a) => !existingIds.has(a.action));

  const mergedScores = [...report.scores];
  for (const score of audit.scores) {
    if (!mergedScores.some((s) => s.label === score.label)) {
      mergedScores.push(score);
    }
  }

  const marketingScoreWeight = 0.35;
  const existingWeight = 1 - marketingScoreWeight;
  const overallScore = Math.round(
    report.overallScore * existingWeight + audit.overallScore * marketingScoreWeight
  );

  return {
    ...report,
    overallScore,
    scores: mergedScores,
    sections: [...report.sections, audit.section],
    actionItems: [
      ...newActions.slice(0, 4),
      ...report.actionItems,
      ...newActions.slice(4),
    ].slice(0, 12),
    subtitle: `${report.subtitle} · Benchmark ${audit.overallScore}/100`,
  };
}
