import type { AnalysisReport, AnalysisSection, ScoreMetric, CopySolution } from "@/lib/types";
import {
  type AuditContext,
  getCriteriaForContext,
} from "@/lib/intelligence/criteria";
import {
  buildContentProfile,
  type ContentProfile,
} from "@/lib/intelligence/content-profile";
import { extractDeepContent, type DeepContent } from "@/lib/intelligence/deep-extract";
import {
  generateConcreteSolutions,
  solutionsToActionItems,
} from "@/lib/intelligence/solution-generator";
import {
  buildContextualSummary,
  buildPassedInsights,
} from "@/lib/intelligence/contextual-recommendations";

export interface AuditCheckResult {
  id: string;
  label: string;
  framework: string;
  passed: boolean;
  message: string;
  recommendation: string;
  weight: number;
}

export interface AuditOptions {
  url?: string;
  title?: string;
  description?: string;
  headings?: string[];
  ctas?: string[];
  platform?: string;
  features?: string[];
  listItems?: string[];
}

export interface MarketingAuditResult {
  context: AuditContext;
  profile: ContentProfile;
  deep: DeepContent;
  overallScore: number;
  checks: AuditCheckResult[];
  passedCount: number;
  totalCount: number;
  solutions: CopySolution[];
  scores: ScoreMetric[];
  section: AnalysisSection;
  actionItems: { priority: "high" | "medium" | "low"; action: string }[];
}

export function runMarketingAudit(
  text: string,
  context: AuditContext,
  options?: AuditOptions
): MarketingAuditResult {
  const criteria = getCriteriaForContext(context);
  const normalized = text.trim();
  const profile = buildContentProfile({ text: normalized, ...options });
  const deep = extractDeepContent(
    normalized,
    options?.headings ?? profile.headings,
    options?.listItems ?? options?.features ?? []
  );

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
  const passedChecks = checks.filter((c) => c.passed);
  const passedCount = passedChecks.length;

  const solutions = generateConcreteSolutions({
    profile,
    deep,
    failed,
    context,
    rawText: normalized,
  });

  const categoryScores = computeCategoryScores(checks);
  const section = buildAuditSection(
    profile,
    deep,
    context,
    overallScore,
    passedChecks,
    solutions,
    passedCount,
    checks.length
  );
  const actionItems = solutionsToActionItems(solutions);

  return {
    context,
    profile,
    deep,
    overallScore,
    checks,
    passedCount,
    totalCount: checks.length,
    solutions,
    scores: categoryScores,
    section,
    actionItems,
  };
}

function computeCategoryScores(checks: AuditCheckResult[]): ScoreMetric[] {
  const groups: Record<string, { earned: number; total: number; label: string }> = {
    offer: { earned: 0, total: 0, label: "Offer Clarity" },
    value: { earned: 0, total: 0, label: "Proof & Trust" },
    conversion: { earned: 0, total: 0, label: "Conversion Path" },
    hooks: { earned: 0, total: 0, label: "Hooks & Copy" },
  };

  const categoryMap: Record<string, keyof typeof groups> = {
    specific_outcome: "offer",
    target_avatar: "offer",
    risk_reversal: "offer",
    value_stack: "offer",
    coach_platform_pain: "offer",
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
    free_to_workshop_ladder: "conversion",
    hook_strength: "hooks",
    problem_hook: "hooks",
    credibility_signal: "hooks",
    specificity: "hooks",
    hero_outcome: "hooks",
    engagement_question: "hooks",
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
      description: `${g.label} for ${profileLabel(checks)}`,
    }));
}

function profileLabel(_checks: AuditCheckResult[]): string {
  return "this product";
}

function buildAuditSection(
  profile: ContentProfile,
  deep: DeepContent,
  context: AuditContext,
  score: number,
  passedChecks: AuditCheckResult[],
  solutions: CopySolution[],
  passed: number,
  total: number
): AnalysisSection {
  const passedInsights = buildPassedInsights(profile, passedChecks);

  const featureList = deep.features.length > 0
    ? deep.features.slice(0, 5).join(" · ")
    : profile.keyTopics.join(" · ") || "Not detected from page";

  return {
    id: "marketing-intelligence-audit",
    title: `${profile.brandName} — Fixes & Ready-to-Use Copy`,
    category: "marketing",
    summary: buildContextualSummary(profile, score, passed, total, context),
    details: [
      `Product: ${profile.subject}`,
      `Audience: ${profile.audience}`,
      `Features detected on page: ${featureList}`,
      ...(deep.painSignals.length > 0 ? [`Pain points in copy: ${deep.painSignals[0]}`] : []),
      ...(passedInsights.length > 0 ? ["", "Already working:", ...passedInsights.map((p) => `✓ ${p}`)] : []),
    ],
    metrics: [
      { label: "Benchmark Score", value: `${score}/100` },
      { label: "Solutions", value: String(solutions.length) },
      { label: "Niche", value: profile.niche },
      { label: "Current Hero", value: profile.heroLine.slice(0, 45) + (profile.heroLine.length > 45 ? "…" : "") },
    ],
    highlights: [
      ...(score >= 70
        ? [{ type: "positive" as const, text: `${profile.brandName} has solid foundations — use the copy below to optimise conversion` }]
        : [{ type: "negative" as const, text: `${profile.brandName} needs sharper offer copy — paste the solutions below directly into your site` }]),
    ],
    solutions,
  };
}

export function enrichReportWithAudit(
  report: AnalysisReport,
  audit: MarketingAuditResult
): AnalysisReport {
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
    sections: [
      ...report.sections.filter((s) => s.id !== "marketing-intelligence-audit"),
      audit.section,
    ],
    solutions: audit.solutions,
    actionItems: audit.solutions.map((s) => ({
      priority: s.priority,
      action: `${s.label} (${s.placement}): ${s.problem}`,
    })).slice(0, 8),
    subtitle: `${audit.profile.brandName} · ${audit.solutions.length} ready-to-use fixes`,
  };
}
