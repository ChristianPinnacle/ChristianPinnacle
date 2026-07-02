import type { AnalysisReport, AnalysisSection, ScoreMetric } from "@/lib/types";
import {
  type AuditContext,
  GENERIC_OFFER_PHRASES,
  getCriteriaForContext,
} from "@/lib/intelligence/criteria";
import {
  buildContentProfile,
  type ContentProfile,
} from "@/lib/intelligence/content-profile";
import {
  buildContextualActionItems,
  buildContextualGaps,
  buildContextualSummary,
  buildFailedFixes,
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
}

export interface MarketingAuditResult {
  context: AuditContext;
  profile: ContentProfile;
  overallScore: number;
  checks: AuditCheckResult[];
  passedCount: number;
  totalCount: number;
  criticalGaps: string[];
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

  const criticalGaps = buildContextualGaps(profile, failed, normalized);
  const categoryScores = computeCategoryScores(checks);
  const section = buildAuditSection(profile, context, overallScore, passedChecks, failed, criticalGaps, passedCount, checks.length);
  const actionItems = buildContextualActionItems(profile, failed, normalized, context);

  return {
    context,
    profile,
    overallScore,
    checks,
    passedCount,
    totalCount: checks.length,
    criticalGaps,
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
      description: `${g.label} for this specific content`,
    }));
}

function buildAuditSection(
  profile: ContentProfile,
  context: AuditContext,
  score: number,
  passedChecks: AuditCheckResult[],
  failedChecks: AuditCheckResult[],
  criticalGaps: string[],
  passed: number,
  total: number
): AnalysisSection {
  const passedInsights = buildPassedInsights(profile, passedChecks);
  const failedFixes = buildFailedFixes(profile, failedChecks);

  return {
    id: "marketing-intelligence-audit",
    title: `${profile.brandName} — Marketing Audit`,
    category: "marketing",
    summary: buildContextualSummary(profile, score, passed, total, context),
    details: [
      `About: ${profile.subject}`,
      `Audience: ${profile.audience}`,
      `Detected focus: ${profile.keyTopics.length > 0 ? profile.keyTopics.join(", ") : profile.offering}`,
      profile.ctasFound.length > 0 ? `CTAs found: ${profile.ctasFound.join(" · ")}` : "No CTAs detected",
      "",
      "Priority fixes for this content:",
      ...criticalGaps.map((g) => `→ ${g}`),
      "",
      ...(passedInsights.length > 0
        ? ["What's working:", ...passedInsights.map((p) => `✓ ${p}`), ""]
        : []),
      ...(failedFixes.length > 0
        ? ["Specific rewrites needed:", ...failedFixes.map((f) => `✗ ${f}`)]
        : []),
    ],
    metrics: [
      { label: "Benchmark Score", value: `${score}/100` },
      { label: "Criteria Passed", value: `${passed}/${total}` },
      { label: "Niche", value: profile.niche },
      { label: "Hero / Opening", value: profile.heroLine.slice(0, 40) + (profile.heroLine.length > 40 ? "…" : "") },
    ],
    highlights: [
      ...(score >= 70
        ? [{ type: "positive" as const, text: `${profile.brandName}'s ${profile.keyTopics[0] ?? "messaging"} aligns with top performer patterns` }]
        : [{ type: "negative" as const, text: `${profile.brandName}'s hero doesn't yet sell a specific outcome to ${profile.audience}` }]),
      ...(GENERIC_OFFER_PHRASES.some((p) => p.test(profile.heroLine + profile.offering))
        ? [{ type: "negative" as const, text: `Generic offer language detected — sharpen for ${profile.niche}` }]
        : []),
      ...(passedChecks.some((c) => c.id === "proof_volume")
        ? [{ type: "positive" as const, text: `Proof elements present — add ${profile.audience}-specific results` }]
        : [{ type: "negative" as const, text: `No proof volume for ${profile.brandName} — add client numbers or case results` }]),
    ],
  };
}

export function enrichReportWithAudit(
  report: AnalysisReport,
  audit: MarketingAuditResult
): AnalysisReport {
  const existingActions = new Set(report.actionItems.map((a) => a.action));
  const newActions = audit.actionItems.filter((a) => !existingActions.has(a.action));

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

  const contextualActionItems = [
    ...newActions,
    ...report.actionItems.filter((a) => !newActions.some((n) => n.action === a.action)),
  ].slice(0, 10);

  return {
    ...report,
    overallScore,
    scores: mergedScores,
    sections: [
      ...report.sections.filter((s) => s.id !== "marketing-intelligence-audit"),
      audit.section,
    ],
    actionItems: contextualActionItems,
    subtitle: `${audit.profile.brandName} · ${audit.profile.niche} · Benchmark ${audit.overallScore}/100`,
  };
}
