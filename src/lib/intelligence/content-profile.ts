import { GENERIC_OFFER_PHRASES } from "@/lib/intelligence/criteria";

export interface ContentProfile {
  brandName: string;
  subject: string;
  niche: string;
  audience: string;
  heroLine: string;
  offering: string;
  openingLine: string;
  ctasFound: string[];
  headings: string[];
  keyTopics: string[];
  url?: string;
  platform?: string;
  metaDescription?: string;
}

interface ProfileInput {
  text: string;
  url?: string;
  title?: string;
  description?: string;
  headings?: string[];
  ctas?: string[];
  platform?: string;
}

const NICHE_PATTERNS: { pattern: RegExp; niche: string; audience: string }[] = [
  { pattern: /\b(vitaledge|coach(ing)? platform|client (portal|management)|trainer (software|platform)|health & performance)\b/i, niche: "Fitness Coach Platform (B2B)", audience: "Online fitness coaches and personal trainers" },
  { pattern: /\b(pinnacle|personal training|nutrition coaching|weight loss|macro|meal plan)\b/i, niche: "Fitness & Nutrition Coaching (B2C)", audience: "People seeking body transformation or nutrition help" },
  { pattern: /\b(saas|software|platform|app|api|dashboard)\b/i, niche: "SaaS / Technology", audience: "Business buyers evaluating software" },
  { pattern: /\b(agency|marketing|ads|meta|google ads|lead gen)\b/i, niche: "Marketing Agency", audience: "Business owners needing leads" },
  { pattern: /\b(supplement|protein|phorm|nutrition brand)\b/i, niche: "Supplements / DTC", audience: "Fitness consumers" },
  { pattern: /\b(workshop|mentorship|mentor|scale|business coaching)\b/i, niche: "Business Coaching", audience: "Entrepreneurs and business owners" },
  { pattern: /\b(gym|fitness app|workout app|training app)\b/i, niche: "Fitness App", audience: "Gym-goers and home fitness users" },
  { pattern: /\b(ecommerce|shop|store|buy now|cart)\b/i, niche: "E-commerce", audience: "Online shoppers" },
];

const TOPIC_PATTERNS: { pattern: RegExp; topic: string }[] = [
  { pattern: /\b(macro|calorie|nutrition|meal)\b/i, topic: "nutrition tracking" },
  { pattern: /\b(check.?in|client portal|progress track)\b/i, topic: "client check-ins" },
  { pattern: /\b(workout|program|training plan)\b/i, topic: "workout programming" },
  { pattern: /\b(lead|funnel|conversion|ads)\b/i, topic: "lead generation" },
  { pattern: /\b(community|skool|group)\b/i, topic: "community" },
  { pattern: /\b(payment|subscription|billing)\b/i, topic: "payments" },
  { pattern: /\b(brand|white.?label)\b/i, topic: "branding" },
  { pattern: /\b(transformation|before.?after|results)\b/i, topic: "client results" },
  { pattern: /\b(google sheets|spreadsheet|excel)\b/i, topic: "spreadsheet workaround" },
  { pattern: /\b(habit|accountability)\b/i, topic: "habit accountability" },
];

export function buildContentProfile(input: ProfileInput): ContentProfile {
  const text = input.text.trim();
  const title = input.title?.trim() || "";
  const description = input.description?.trim() || "";
  const headings = input.headings ?? extractHeadingsFromText(text);
  const ctas = input.ctas ?? extractCTAsFromText(text);

  const brandName = extractBrandName(text, input.url, title, headings);
  const heroLine = headings[0] || title || firstSentence(text);
  const nicheMatch = detectNiche(`${text} ${title} ${description}`);
  const keyTopics = extractTopics(`${text} ${title} ${description}`);
  const offering = inferOffering(text, title, description, keyTopics, nicheMatch.niche, brandName);
  const openingLine = firstSentence(text) || heroLine;

  return {
    brandName,
    subject: `${brandName} — ${offering}`,
    niche: nicheMatch.niche,
    audience: nicheMatch.audience,
    heroLine: truncate(heroLine, 120),
    offering,
    openingLine: truncate(openingLine, 150),
    ctasFound: ctas.slice(0, 6),
    headings: headings.slice(0, 8),
    keyTopics,
    url: input.url,
    platform: input.platform,
    metaDescription: description || undefined,
  };
}

function extractBrandName(text: string, url?: string, title?: string, headings?: string[]): string {
  const vitalEdge = text.match(/\b(VitalEdge\s*Hub?|Pinnacle\s*Coaching)\b/i);
  if (vitalEdge) return vitalEdge[0].replace(/hub?$/i, (m) => m.toLowerCase() === "hub" ? "Hub" : m);

  if (title) {
    const pipeParts = title.split(/[|\-–—]/).map((p) => p.trim());
    const namedPart = pipeParts.find((p) => /vitaledge|pinnacle/i.test(p));
    if (namedPart) return formatBrandName(namedPart.replace(/\s*hub\s*/i, " ").trim()) || namedPart;
    if (pipeParts.length > 1) {
      const last = pipeParts[pipeParts.length - 1];
      if (last.length > 2 && last.length < 40) return last;
    }
  }

  if (url) {
    try {
      const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
      const base = hostname.replace(/^www\./, "").split(".")[0];
      if (base && base.length > 2) {
        return formatBrandName(base);
      }
    } catch {
      // fall through
    }
  }

  const titleBrand = title?.split(/[|\-–—:]/)[0]?.trim();
  if (titleBrand && titleBrand.length > 2 && titleBrand.length < 40 && !/platform|performance|health/i.test(titleBrand)) {
    return titleBrand;
  }

  const heading = headings?.[0];
  if (heading && heading.length < 50) return heading;

  return "This brand";
}

function formatBrandName(slug: string): string {
  if (/vitaledge/i.test(slug)) return "VitalEdge Hub";
  if (/pinnacle/i.test(slug)) return "Pinnacle Coaching";
  return slug
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function detectNiche(combined: string): { niche: string; audience: string } {
  for (const { pattern, niche, audience } of NICHE_PATTERNS) {
    if (pattern.test(combined)) return { niche, audience };
  }
  return { niche: "General Business", audience: "Prospective customers" };
}

function extractTopics(text: string): string[] {
  const found = TOPIC_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ topic }) => topic);
  return [...new Set(found)].slice(0, 6);
}

function inferOffering(
  text: string,
  title: string,
  description: string,
  topics: string[],
  niche: string,
  brandName: string
): string {
  const combined = `${title} ${description} ${text}`.slice(0, 2000);

  if (topics.length > 0) {
    const topicStr = topics.slice(0, 3).join(", ");
    if (/platform|software|saas/i.test(niche)) {
      return `platform for ${topicStr}`;
    }
    if (/coaching/i.test(niche)) {
      return `coaching focused on ${topicStr}`;
    }
    return `offering around ${topicStr}`;
  }

  const generic = GENERIC_OFFER_PHRASES.find((p) => p.test(combined));
  if (generic) {
    const match = combined.match(generic);
    return `generic pitch ("${match?.[0] ?? "unspecified"}") — needs sharpening`;
  }

  if (description) return truncate(description, 100);

  const titleWithoutBrand = title
    .replace(new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "")
    .replace(/[|\-–—]/g, " ")
    .trim();
  if (titleWithoutBrand.length > 10) return truncate(titleWithoutBrand, 100);
  if (title) return truncate(title, 100);
  return "unclear value proposition";
}

function extractHeadingsFromText(text: string): string[] {
  const lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 10 && l.length < 120);
  return lines.slice(0, 5);
}

function extractCTAsFromText(text: string): string[] {
  const ctaRegex = /\b(get started|sign up|book (a )?demo|book (a )?call|join now|apply now|download|contact us|try free|start free trial|DM me|message me|learn more|subscribe)\b[^.!?\n]*/gi;
  return [...text.matchAll(ctaRegex)].map((m) => m[0].trim()).slice(0, 5);
}

function firstSentence(text: string): string {
  const match = text.trim().match(/^[^.!?\n]+[.!?]?/);
  return match?.[0]?.trim() ?? text.slice(0, 120).trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trim() + "…";
}

export function quote(s: string): string {
  const cleaned = s.replace(/"/g, "'").trim();
  return cleaned ? `"${truncate(cleaned, 80)}"` : "(not found)";
}
