import type { AnalysisReport, AnalysisSection, ScoreMetric } from "@/lib/types";
import { clamp, countWords, generateId, readingTimeMinutes } from "@/lib/utils";

export function analyzeBusiness(input: string): AnalysisReport {
  const analyzedAt = new Date().toISOString();
  const text = input.trim();
  const wordCount = countWords(text);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  const clarityScore = computeClarityScore(text, sentences);
  const valuePropScore = computeValuePropScore(text);
  const audienceScore = computeAudienceScore(text);
  const professionalismScore = computeProfessionalismScore(text);
  const overallScore = Math.round((clarityScore + valuePropScore + audienceScore + professionalismScore) / 4);

  const businessType = detectBusinessType(text);
  const keywords = extractBusinessKeywords(text);

  const scores: ScoreMetric[] = [
    { label: "Clarity", score: clarityScore, description: "How clearly the business is communicated" },
    { label: "Value Proposition", score: valuePropScore, description: "Strength of unique value offered" },
    { label: "Audience Fit", score: audienceScore, description: "How well target market is addressed" },
    { label: "Professionalism", score: professionalismScore, description: "Tone, structure, and credibility signals" },
  ];

  const sections: AnalysisSection[] = [
    {
      id: "overview",
      title: "Business Overview",
      category: "overview",
      summary: `${businessType} analysis — ${overallScore}/100 business communication score.`,
      details: [
        `Detected type: ${businessType}`,
        `Content length: ${wordCount} words (${readingTimeMinutes(text)} min read)`,
        `Key themes: ${keywords.length > 0 ? keywords.join(", ") : "No dominant themes detected"}`,
        `Sentence count: ${sentences.length}`,
      ],
      metrics: [
        { label: "Words", value: String(wordCount) },
        { label: "Avg Sentence Length", value: `${Math.round(wordCount / Math.max(sentences.length, 1))} words` },
        { label: "Business Type", value: businessType },
      ],
    },
    {
      id: "value",
      title: "Value Proposition Analysis",
      category: "marketing",
      summary: valuePropScore >= 70
        ? "Strong value proposition with clear differentiation signals."
        : "Value proposition needs sharpening — lead with outcomes, not features.",
      details: [
        `Problem statement: ${detectProblemStatement(text)}`,
        `Solution clarity: ${detectSolution(text)}`,
        `Differentiation: ${detectDifferentiation(text)}`,
        `Proof points: ${detectProofPoints(text)}`,
      ],
      highlights: buildValueHighlights(text, valuePropScore),
    },
    {
      id: "audience",
      title: "Target Audience",
      category: "strategy",
      summary: audienceScore >= 60
        ? "Target audience signals are present in the copy."
        : "Define and speak directly to your ideal customer profile (ICP).",
      details: [
        `Audience indicators: ${detectAudience(text)}`,
        `Industry signals: ${detectIndustry(text)}`,
        `Tone: ${detectTone(text)}`,
        `Pain points addressed: ${detectPainPoints(text)}`,
      ],
    },
    {
      id: "content",
      title: "Content & Messaging",
      category: "content",
      summary: clarityScore >= 70
        ? "Message is clear and well-structured."
        : "Simplify language and structure for faster comprehension.",
      details: [
        `Opening hook: ${analyzeOpening(text)}`,
        `Jargon level: ${detectJargonLevel(text)}`,
        `Action orientation: ${detectActionOrientation(text)}`,
        `Emotional appeal: ${detectEmotionalAppeal(text)}`,
      ],
    },
    {
      id: "recommendations",
      title: "Strategic Recommendations",
      category: "recommendations",
      summary: getBusinessRecommendationsSummary(businessType, overallScore),
      details: getBusinessRecommendations(businessType),
    },
  ];

  const actionItems = buildBusinessActionItems(text, valuePropScore, audienceScore, clarityScore);

  return {
    id: generateId(),
    inputType: "business",
    detectedType: "business",
    title: extractTitle(text) || "Business Analysis",
    subtitle: `${businessType} · ${wordCount} words`,
    analyzedAt,
    input,
    overallScore,
    scores,
    sections,
    actionItems,
  };
}

function computeClarityScore(text: string, sentences: string[]): number {
  let score = 0;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 20) score += 20;
  if (words.length >= 50) score += 15;
  const avgLen = words.length / Math.max(sentences.length, 1);
  if (avgLen <= 20) score += 25;
  else if (avgLen <= 30) score += 15;
  if (sentences.length >= 2) score += 15;
  if (!/[A-Z]{4,}/.test(text.replace(/\b[A-Z]{2,}\b/g, ""))) score += 15;
  if (/\b(we|our|you|your)\b/i.test(text)) score += 10;
  return clamp(score, 0, 100);
}

function computeValuePropScore(text: string): number {
  let score = 0;
  const benefitWords = /\b(save|help|solve|grow|increase|reduce|improve|boost|enable|transform|streamline|automate|eliminate)\b/gi;
  if ((text.match(benefitWords) ?? []).length >= 1) score += 25;
  if ((text.match(benefitWords) ?? []).length >= 3) score += 15;
  if (/\b(only|first|unique|leading|#1|best|unlike|versus|vs\.|compared to)\b/i.test(text)) score += 20;
  if (/\b(free trial|demo|guarantee|money.back|no risk)\b/i.test(text)) score += 15;
  if (/\d+%|\$\d+|x faster|\d+x/i.test(text)) score += 15;
  if (/\b(because|so that|which means|as a result)\b/i.test(text)) score += 10;
  return clamp(score, 0, 100);
}

function computeAudienceScore(text: string): number {
  let score = 0;
  if (/\b(for|designed for|built for|perfect for|ideal for)\b/i.test(text)) score += 25;
  if (/\b(teams|businesses|startups|enterprises|freelancers|developers|marketers|founders|SMB|SMBs)\b/i.test(text)) score += 25;
  if (/\b(you|your)\b/i.test(text)) score += 20;
  if (/\b(who|struggle|challenge|pain|frustrated|tired of)\b/i.test(text)) score += 20;
  if (/\b(industry|sector|market|vertical)\b/i.test(text)) score += 10;
  return clamp(score, 0, 100);
}

function computeProfessionalismScore(text: string): number {
  let score = 50;
  if (text.length >= 100) score += 15;
  if (!/!!!|lol|omg|wtf/i.test(text)) score += 15;
  if (/[.!?]/.test(text)) score += 10;
  if (/\b(inc\.|llc|ltd|corp|company|platform|solution|service)\b/i.test(text)) score += 10;
  if (/https?:\/\//.test(text)) score += 5;
  return clamp(score, 0, 100);
}

function detectBusinessType(text: string): string {
  if (/\b(SaaS|software|platform|app|API|cloud)\b/i.test(text)) return "SaaS / Technology";
  if (/\b(ecommerce|e-commerce|shop|store|retail|product)\b/i.test(text)) return "E-commerce / Retail";
  if (/\b(agency|consulting|services|consultant)\b/i.test(text)) return "Professional Services";
  if (/\b(restaurant|food|menu|cafe|delivery)\b/i.test(text)) return "Food & Beverage";
  if (/\b(fitness|health|wellness|medical|clinic)\b/i.test(text)) return "Health & Wellness";
  if (/\b(course|education|training|learn|tutorial)\b/i.test(text)) return "Education / EdTech";
  if (/\b(fintech|finance|banking|invest|payment)\b/i.test(text)) return "FinTech / Finance";
  return "General Business";
}

function extractBusinessKeywords(text: string): string[] {
  const keywords = ["AI", "automation", "analytics", "marketing", "sales", "growth", "productivity", "security", "collaboration", "customer", "revenue", "scale", "innovation", "digital", "data"];
  return keywords.filter((k) => new RegExp(`\\b${k}\\b`, "i").test(text)).slice(0, 6);
}

function extractTitle(text: string): string | null {
  const firstLine = text.split(/[\n.!?]/)[0]?.trim();
  if (firstLine && firstLine.length <= 80) return firstLine;
  return null;
}

function detectProblemStatement(text: string): string {
  if (/\b(problem|challenge|struggle|pain|frustrat|difficult|hard to|waste|lose|costly)\b/i.test(text)) {
    return "Problem/pain point language detected ✓";
  }
  return "Missing — start with the problem your customer faces";
}

function detectSolution(text: string): string {
  if (/\b(solution|solve|fix|help|enable|allow|provide|deliver|offer)\b/i.test(text)) {
    return "Solution-oriented language present ✓";
  }
  return "Unclear — explicitly state what you do and how it helps";
}

function detectDifferentiation(text: string): string {
  if (/\b(only|unique|first|unlike|different|better|faster|cheaper|vs\.|compared)\b/i.test(text)) {
    return "Differentiation signals found ✓";
  }
  return "Missing — explain why choose you over alternatives";
}

function detectProofPoints(text: string): string {
  const proofs: string[] = [];
  if (/\d+[+%]|\d+,\d+|\$\d+/i.test(text)) proofs.push("statistics/numbers");
  if (/\b(client|customer|user|company|brand)s?\b/i.test(text) && /\b(trust|use|love|choose)\b/i.test(text)) proofs.push("social proof language");
  if (/\b(award|certified|featured|partnership|backed by)\b/i.test(text)) proofs.push("credibility markers");
  return proofs.length > 0 ? proofs.join(", ") + " ✓" : "None — add testimonials, metrics, or logos";
}

function buildValueHighlights(text: string, score: number) {
  const highlights: { type: "positive" | "negative" | "neutral"; text: string }[] = [];
  if (/\d+%|\$\d+/i.test(text)) highlights.push({ type: "positive", text: "Quantified benefits strengthen credibility" });
  if (score >= 70) highlights.push({ type: "positive", text: "Value proposition is well-articulated" });
  else highlights.push({ type: "negative", text: "Value proposition needs more specificity and proof" });
  return highlights;
}

function detectAudience(text: string): string {
  const audiences: string[] = [];
  const patterns: [RegExp, string][] = [
    [/\b(startup|founder|entrepreneur)s?\b/i, "Startups/Founders"],
    [/\b(enterprise|fortune|large org)\b/i, "Enterprise"],
    [/\b(SMB|small business|local business)\b/i, "Small Business"],
    [/\b(developer|engineer|technical)\b/i, "Developers"],
    [/\b(marketer|marketing team)\b/i, "Marketers"],
    [/\b(HR|human resources|recruiting)\b/i, "HR/Recruiting"],
    [/\b(consumer|individual|personal)\b/i, "Consumers"],
  ];
  for (const [pattern, label] of patterns) {
    if (pattern.test(text)) audiences.push(label);
  }
  return audiences.length > 0 ? audiences.join(", ") : "Not clearly defined — specify who you serve";
}

function detectIndustry(text: string): string {
  const industries = ["technology", "healthcare", "finance", "retail", "education", "real estate", "manufacturing", "media", "legal", "nonprofit"];
  const found = industries.filter((i) => new RegExp(`\\b${i}\\b`, "i").test(text));
  return found.length > 0 ? found.join(", ") : "Industry not specified";
}

function detectTone(text: string): string {
  if (/\b(revolutionary|disrupt|game.?chang|cutting.?edge|innovative)\b/i.test(text)) return "Bold / Innovative";
  if (/\b(trusted|reliable|proven|established|professional)\b/i.test(text)) return "Professional / Trustworthy";
  if (/\b(simple|easy|friendly|fun|delightful)\b/i.test(text)) return "Approachable / Friendly";
  return "Neutral — consider aligning tone with brand personality";
}

function detectPainPoints(text: string): string {
  const pains: string[] = [];
  if (/\b(time|hours|slow|manual| tedious)\b/i.test(text)) pains.push("time waste");
  if (/\b(cost|expensive|budget|money|save)\b/i.test(text)) pains.push("cost concerns");
  if (/\b(complex|complicated|confusing|overwhelm)\b/i.test(text)) pains.push("complexity");
  if (/\b(error|mistake|risk|security|compliance)\b/i.test(text)) pains.push("risk/errors");
  return pains.length > 0 ? pains.join(", ") : "None explicitly addressed";
}

function analyzeOpening(text: string): string {
  const opening = text.slice(0, 100);
  if (/^\d|how|why|what if|imagine|did you know/i.test(opening)) return "Strong — uses attention-grabbing opener";
  if (/\b(we are|our company|welcome to|introducing)\b/i.test(opening)) return "Weak — avoid starting with 'We are...' — lead with customer benefit";
  return "Moderate — test benefit-first opening lines";
}

function detectJargonLevel(text: string): string {
  const jargon = (text.match(/\b(synergy|leverage|paradigm|scalable|ecosystem|disruptive|blockchain|AI-powered|ML|KPI|ROI|B2B|B2C|SaaS)\b/gi) ?? []).length;
  if (jargon <= 2) return "Low — accessible language ✓";
  if (jargon <= 5) return "Moderate — ensure audience understands terms";
  return "High — simplify or define technical terms";
}

function detectActionOrientation(text: string): string {
  if (/\b(get started|sign up|contact|book|schedule|try|demo|download|learn more|call)\b/i.test(text)) {
    return "CTA present ✓";
  }
  return "No clear next step — add a call-to-action";
}

function detectEmotionalAppeal(text: string): string {
  if (/\b(feel|love|trust|confidence|peace of mind|excited|proud|relief|freedom)\b/i.test(text)) {
    return "Emotional triggers present ✓";
  }
  return "Purely functional — add emotional benefits for stronger connection";
}

function getBusinessRecommendationsSummary(type: string, score: number): string {
  if (score >= 80) return `Strong ${type} positioning. Focus on distribution and conversion optimization.`;
  if (score >= 50) return `Solid foundation with room to sharpen messaging for ${type} audiences.`;
  return `Significant opportunity to clarify value proposition and target market for ${type}.`;
}

function getBusinessRecommendations(type: string): string[] {
  const base = [
    "Lead with the outcome, not the feature — 'Save 10 hours/week' beats 'AI-powered automation'",
    "Add 2-3 proof points: customer validation metrics, or testimonials",
    "Define your ICP in one sentence: who, what problem, why you",
    "Create a one-liner elevator pitch: [Product] helps [audience] [achieve outcome] by [unique approach]",
  ];
  const typeSpecific: Record<string, string[]> = {
    "SaaS / Technology": ["Highlight integrations and time-to-value", "Offer free trial or freemium to reduce friction", "Show product screenshots or demo video"],
    "E-commerce / Retail": ["Emphasize shipping, returns, and social proof", "Use urgency/scarcity ethically for conversions", "Optimize product descriptions for SEO keywords"],
    "Professional Services": ["Lead with case studies and results", "Offer free consultation or audit as lead magnet", "Show team credentials and certifications"],
  };
  return [...base, ...(typeSpecific[type] ?? ["Research top 3 competitors and articulate your differentiation"])];
}

function buildBusinessActionItems(text: string, valueScore: number, audienceScore: number, clarityScore: number) {
  const items: { priority: "high" | "medium" | "low"; action: string }[] = [];
  if (valueScore < 60) items.push({ priority: "high", action: "Rewrite opening with a quantified customer benefit" });
  if (audienceScore < 50) items.push({ priority: "high", action: "Add a clear 'built for [audience]' statement" });
  if (clarityScore < 60) items.push({ priority: "medium", action: "Shorten sentences and remove jargon" });
  if (!/\b(get started|contact|sign up|book|try)\b/i.test(text)) {
    items.push({ priority: "high", action: "Add a specific call-to-action with next step" });
  }
  if (!/\d+%|\$\d+|\d+ (customers|users|companies)/i.test(text)) {
    items.push({ priority: "medium", action: "Add quantified proof points (metrics, customer count, savings)" });
  }
  if (items.length === 0) {
    items.push({ priority: "low", action: "A/B test messaging with target customers and iterate based on feedback" });
  }
  return items;
}
