import type { AuditContext } from "@/lib/intelligence/criteria";
import type { AuditCheckResult } from "@/lib/intelligence/audit";
import { type ContentProfile, quote } from "@/lib/intelligence/content-profile";
import { GENERIC_OFFER_PHRASES } from "@/lib/intelligence/criteria";

export function buildContextualGaps(
  profile: ContentProfile,
  failed: AuditCheckResult[],
  text: string
): string[] {
  const gaps: string[] = [];
  const failedIds = new Set(failed.map((f) => f.id));
  const brand = profile.brandName;
  const isB2B = /B2B|platform|SaaS|coach platform/i.test(profile.niche);
  const isB2C = /B2C|nutrition coaching|personal training/i.test(profile.niche);

  if (GENERIC_OFFER_PHRASES.some((p) => p.test(text))) {
    const match = text.match(GENERIC_OFFER_PHRASES.find((p) => p.test(text))!)?.[0];
    gaps.push(
      `${brand}'s copy uses "${match}" — that's a category, not an offer. Name a specific outcome for ${profile.audience} with a timeline.`
    );
  }

  if (failedIds.has("specific_outcome")) {
    gaps.push(
      `${brand} doesn't state a measurable result. Your hero ${quote(profile.heroLine)} needs a number + timeframe (e.g. "Cut client check-in time 50% in 30 days").`
    );
  }

  if (failedIds.has("target_avatar")) {
    gaps.push(
      `No clear ICP for ${brand}. You're in ${profile.niche} — call out ${profile.audience} by name in the hero or first paragraph.`
    );
  }

  if (failedIds.has("risk_reversal")) {
    if (isB2B) {
      gaps.push(
        `${brand}: Add a trial or guarantee for coaches evaluating your platform — e.g. "14-day free trial, cancel anytime" or "Migrate 10 clients free."`
      );
    } else if (isB2C) {
      gaps.push(
        `${brand}: No guarantee on ${profile.offering}. Add something like "30-day results guarantee or full refund" under your main CTA.`
      );
    } else {
      gaps.push(`${brand}: No risk reversal detected — add a guarantee tied to ${profile.offering}.`);
    }
  }

  if (failedIds.has("proof_volume")) {
    gaps.push(
      `${brand} lacks volume proof. Add a number tied to ${profile.keyTopics[0] ?? profile.offering} — e.g. "500+ coaches" or "12,000 clients tracked."`
    );
  }

  if (failedIds.has("strong_cta")) {
    const current = profile.ctasFound[0];
    if (current) {
      gaps.push(
        `${brand}'s CTA ${quote(current)} is weak. Replace with one action: ${isB2B ? '"Book a 15-min demo"' : '"DM me PLAN" or "Book free discovery call"'}.`
      );
    } else {
      gaps.push(
        `${brand} has no clear CTA on this ${profile.niche} page. Add one button above the fold for ${profile.audience}.`
      );
    }
  }

  if (failedIds.has("dm_funnel_cta")) {
    gaps.push(
      `${brand} post has no DM keyword trigger. End with: "Comment ${profile.keyTopics[0]?.toUpperCase() ?? "READY"} below and I'll send you [specific resource]."`
    );
  }

  if (failedIds.has("problem_hook") || failedIds.has("hook_strength")) {
    gaps.push(
      `Opening ${quote(profile.openingLine)} won't stop the scroll. Rewrite line 1 around a ${profile.keyTopics[0] ?? "specific"} frustration your ${profile.audience} actually feels.`
    );
  }

  if (failedIds.has("hero_outcome")) {
    gaps.push(
      `${brand} hero ${quote(profile.heroLine)} is feature-led. Lead with what ${profile.audience} get — outcome first, product second.`
    );
  }

  if (failedIds.has("application_qualify") && isB2B) {
    gaps.push(
      `${brand} jumps straight to contact/demo. Add 3–4 qualification questions (revenue, client count, current tools) before booking.`
    );
  }

  if (failedIds.has("objection_handling")) {
    gaps.push(
      `${brand} doesn't address objections about ${profile.keyTopics.slice(0, 2).join(" or ") || "price/time"}. Add FAQ answering the #1 reason ${profile.audience} don't buy.`
    );
  }

  if (failedIds.has("value_stack")) {
    gaps.push(
      `${brand} shows price without stacked value. List what's included in ${profile.offering} with dollar values before the price.`
    );
  }

  if (isB2B && profile.keyTopics.includes("spreadsheet workaround")) {
    gaps.push(
      `${brand} already references spreadsheets — lean harder into that pain in the hero: "Your clients deserve more than a Google Sheet."`
    );
  }

  return [...new Set(gaps)].slice(0, 6);
}

export function buildContextualActionItems(
  profile: ContentProfile,
  failed: AuditCheckResult[],
  text: string,
  context: AuditContext
): { priority: "high" | "medium" | "low"; action: string }[] {
  const items: { priority: "high" | "medium" | "low"; action: string }[] = [];
  const failedIds = new Set(failed.map((f) => f.id));
  const brand = profile.brandName;

  if (failedIds.has("specific_outcome")) {
    const topic = profile.keyTopics[0] ?? "results";
    items.push({
      priority: "high",
      action: `Rewrite ${brand}'s hero: "[Specific outcome] in [X weeks] for [${profile.audience}] — without [sacrifice]" — currently focused on ${topic} without a promise.`,
    });
  }

  if (failedIds.has("risk_reversal")) {
    items.push({
      priority: "high",
      action: `Add guarantee to ${brand}'s main offer (${profile.offering}): tie it to the #1 fear ${profile.audience} have before buying.`,
    });
  }

  if (failedIds.has("dm_funnel_cta") && context === "social_post") {
    items.push({
      priority: "high",
      action: `Add to this ${brand} post: "Comment [KEYWORD] below" — your post about ${profile.keyTopics.join(", ") || profile.offering} needs a DM trigger, not link-in-bio.`,
    });
  }

  if (failedIds.has("strong_cta")) {
    const weak = profile.ctasFound.find((c) => /learn more|click here|submit/i.test(c));
    items.push({
      priority: "high",
      action: weak
        ? `Replace ${quote(weak)} on ${brand} with a single action verb + outcome for ${profile.audience}.`
        : `Add one primary CTA to ${brand}'s page — ${profile.audience} have no clear next step.`,
    });
  }

  if (failedIds.has("proof_volume")) {
    items.push({
      priority: "high",
      action: `Add 1 proof line to ${brand}: "[Number] ${profile.audience} achieved [specific result] using ${profile.keyTopics[0] ?? "your product"}."`,
    });
  }

  if (failedIds.has("hero_outcome") && context === "landing_page") {
    items.push({
      priority: "high",
      action: `Change ${brand} H1 from ${quote(profile.heroLine)} to an outcome ${profile.audience} want in plain language.`,
    });
  }

  if (failedIds.has("application_qualify")) {
    items.push({
      priority: "medium",
      action: `Before ${brand}'s demo/booking, ask: client count, current tool, monthly revenue — filters tire-kickers.`,
    });
  }

  if (failedIds.has("objection_handling")) {
    items.push({
      priority: "medium",
      action: `Add FAQ to ${brand} answering: "How is this different from [spreadsheet/other tool]?" — your audience cares about ${profile.keyTopics.slice(0, 2).join(", ") || "switching cost"}.`,
    });
  }

  if (failedIds.has("engagement_question") && context === "social_post") {
    items.push({
      priority: "medium",
      action: `End ${brand}'s post with a question about ${profile.keyTopics[0] ?? "their biggest struggle"} — drives comments for DM automation.`,
    });
  }

  if (profile.metaDescription === undefined && context === "landing_page" && profile.url) {
    items.push({
      priority: "medium",
      action: `Write meta description for ${profile.url}: "${brand} helps ${profile.audience} [outcome] via ${profile.keyTopics[0] ?? profile.offering}" — 120–155 chars.`,
    });
  }

  if (items.length === 0) {
    items.push({
      priority: "low",
      action: `${brand} passes core benchmarks. Test hero ${quote(profile.heroLine)} against a problem-specific hook with ${profile.audience}.`,
    });
  }

  return items.slice(0, 8);
}

export function buildContextualSummary(
  profile: ContentProfile,
  score: number,
  passed: number,
  total: number,
  context: AuditContext
): string {
  const type =
    context === "landing_page" ? "site" : context === "social_post" ? "post" : context === "app_listing" ? "app listing" : "copy";

  const topicStr = profile.keyTopics.length > 0 ? profile.keyTopics.join(", ") : profile.offering;

  if (score >= 70) {
    return `${profile.brandName}'s ${type} (${topicStr}) scores ${score}/100 — ${passed}/${total} benchmarks met. Main opportunity: sharpen proof and CTA for ${profile.audience}.`;
  }

  return `${profile.brandName}'s ${type} about ${topicStr} scores ${score}/100. Hero ${quote(profile.heroLine)} doesn't yet match elite ${profile.niche} playbooks — see fixes below.`;
}

export function buildPassedInsights(
  profile: ContentProfile,
  passed: AuditCheckResult[]
): string[] {
  return passed.map((c) => {
    switch (c.id) {
      case "specific_outcome":
        return `${profile.brandName}: Clear outcome language found — keep tying it to ${profile.keyTopics[0] ?? "your core offer"}.`;
      case "risk_reversal":
        return `${profile.brandName}: Guarantee present — make sure it addresses ${profile.audience}'s top fear.`;
      case "proof_volume":
        return `${profile.brandName}: Social proof detected — push specific client results, not just numbers.`;
      case "strong_cta":
        return `${profile.brandName}: CTA ${quote(profile.ctasFound[0] ?? "")} is on the right track — use only this one action per page/post.`;
      case "dm_funnel_cta":
        return `${profile.brandName}: DM trigger set up — qualify in DMs before pitching ${profile.offering}.`;
      default:
        return `${profile.brandName}: ${c.label} — ${c.message}`;
    }
  });
}

export function buildFailedFixes(
  profile: ContentProfile,
  failed: AuditCheckResult[]
): string[] {
  return failed.slice(0, 6).map((c) => {
    const brand = profile.brandName;
    switch (c.id) {
      case "specific_outcome":
        return `${brand}: Replace generic pitch with "[Result] in [timeframe] for ${profile.audience}".`;
      case "target_avatar":
        return `${brand}: Add "Built for ${profile.audience}" near ${quote(profile.heroLine)}.`;
      case "hook_strength":
      case "problem_hook":
        return `${brand}: Rewrite opening — mirror a real ${profile.keyTopics[0] ?? "pain"} your audience mentions.`;
      default:
        return `${brand}: ${c.label} — ${c.recommendation.split(".")[0]}.`;
    }
  });
}
