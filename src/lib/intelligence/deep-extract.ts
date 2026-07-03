/**
 * Deep extraction from page/post text — features, pains, and proof signals
 * used to generate product-specific copy solutions.
 */

export interface DeepContent {
  features: string[];
  subheadlines: string[];
  painSignals: string[];
  proofSignals: string[];
  pricingSignals: string[];
  competitorMentions: string[];
  /** Short verbatim snippets from body for context */
  snippets: string[];
}

export function extractDeepContent(
  text: string,
  headings: string[] = [],
  listItems: string[] = []
): DeepContent {
  const combined = text.slice(0, 15000);

  const features = [
    ...listItems.filter(isFeatureLike),
    ...headings.filter((h, i) => i > 0 && isFeatureLike(h)),
    ...extractPatternLines(combined, /\b(includes?|features?|you get|we offer|built-?in|automated)\b[^.!?\n]{5,80}/gi),
    ...extractPatternLines(combined, /\b(client portal|check-?in|macro|meal plan|workout|program|dashboard|analytics|branding|white-?label|payment|subscription)\b[^.!?\n]{0,40}/gi),
  ];

  const painSignals = extractPatternLines(combined, /\b(struggle|frustrated|tired of|without|stop losing|chaos|manual|spreadsheet|google sheet|scattered|overwhelm|hard to|difficult to)\b[^.!?\n]{5,100}/gi);

  const proofSignals = extractPatternLines(combined, /\b(\d+[+,]?\d*\s*(coaches?|clients?|users?|businesses?|transformed|reviews?)|trusted by|used by|\d+%|\d+k\+?)\b[^.!?\n]{0,60}/gi);

  const pricingSignals = extractPatternLines(combined, /\b(\$\d+|free trial|\d+ day|per month|per week|starting at|pricing)\b[^.!?\n]{0,50}/gi);

  const competitorMentions = extractPatternLines(
    combined,
    /\b(google sheets?|excel|trainerize|truecoach|myfitnesspal|spreadsheet|whatsapp|instagram dm)\b[^.!?\n]{0,40}/gi
  );

  const subheadlines = headings.slice(1, 6);

  const snippets = combined
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 200)
    .slice(0, 8);

  return {
    features: dedupe(features).slice(0, 10),
    subheadlines: dedupe(subheadlines).slice(0, 6),
    painSignals: dedupe(painSignals).slice(0, 6),
    proofSignals: dedupe(proofSignals).slice(0, 4),
    pricingSignals: dedupe(pricingSignals).slice(0, 3),
    competitorMentions: dedupe(competitorMentions).slice(0, 4),
    snippets,
  };
}

function isFeatureLike(s: string): boolean {
  const t = s.trim();
  if (t.length < 8 || t.length > 100) return false;
  if (/^(home|about|contact|login|sign up|menu|privacy|terms)$/i.test(t)) return false;
  return true;
}

function extractPatternLines(text: string, pattern: RegExp): string[] {
  const results: string[] = [];
  let match;
  const re = new RegExp(pattern.source, pattern.flags);
  while ((match = re.exec(text)) !== null) {
    const line = match[0].trim().replace(/\s+/g, " ");
    if (line.length > 10) results.push(line);
  }
  return results;
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const key = item.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function featurePhrase(features: string[], topics: string[], fallback: string[]): string {
  const fromPage = features.slice(0, 3);
  if (fromPage.length >= 2) return fromPage.join(", ");
  if (topics.length >= 2) return topics.join(", ");
  return fallback.join(", ");
}

export function primaryPain(deep: DeepContent, niche: string): string {
  if (deep.painSignals[0]) return deep.painSignals[0];
  if (deep.competitorMentions.some((c) => /sheet|excel/i.test(c))) {
    return "coaches juggling client programs across Google Sheets and DMs";
  }
  if (/coach platform|B2B/i.test(niche)) {
    return "online coaches losing clients because their backend looks unprofessional";
  }
  if (/B2C|nutrition|coaching/i.test(niche)) {
    return "people who've been consistent for months but the scale won't move";
  }
  if (/agency/i.test(niche)) return "business owners burning money on ads that don't convert";
  if (/app/i.test(niche)) return "users who download fitness apps and quit within two weeks";
  return "prospects who visit your page and leave without understanding why you're different";
}
