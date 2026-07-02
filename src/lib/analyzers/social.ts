import type { AnalysisReport, AnalysisSection, ScoreMetric } from "@/lib/types";
import { clamp, countWords, generateId } from "@/lib/utils";
import { runMarketingAudit, enrichReportWithAudit } from "@/lib/intelligence/audit";

type SocialPlatform = "twitter" | "linkedin" | "instagram" | "facebook" | "tiktok" | "youtube" | "threads" | "unknown";

interface ParsedPost {
  platform: SocialPlatform;
  text: string;
  hashtags: string[];
  mentions: string[];
  urls: string[];
  emojis: string[];
}

export function analyzeSocial(input: string): AnalysisReport {
  const analyzedAt = new Date().toISOString();
  const parsed = parseSocialInput(input);
  const platform = parsed.platform;
  const text = parsed.text;
  const wordCount = countWords(text);
  const charCount = text.length;
  const limits = getPlatformLimits(platform);

  const engagementScore = computeEngagementScore(parsed, limits);
  const clarityScore = computeClarityScore(text, parsed);
  const hashtagScore = computeHashtagScore(parsed, platform);
  const ctaScore = computeCtaScore(text);
  const overallScore = Math.round((engagementScore + clarityScore + hashtagScore + ctaScore) / 4);

  const sentiment = analyzeSentiment(text);
  const readability = analyzeReadability(text);

  const scores: ScoreMetric[] = [
    { label: "Engagement Potential", score: engagementScore, description: "Likelihood to drive interactions" },
    { label: "Message Clarity", score: clarityScore, description: "How clear and compelling the message is" },
    { label: "Hashtag Strategy", score: hashtagScore, description: "Hashtag usage effectiveness" },
    { label: "Call-to-Action", score: ctaScore, description: "Strength of conversion prompts" },
  ];

  const sections: AnalysisSection[] = [
    {
      id: "overview",
      title: "Post Overview",
      category: "overview",
      summary: `${platformLabel(platform)} post analysis — ${overallScore}/100 overall engagement readiness.`,
      details: [
        `Platform: ${platformLabel(platform)}${platform === "unknown" ? " (detected from content patterns)" : ""}`,
        `Length: ${charCount} characters, ${wordCount} words`,
        `Optimal range for ${platformLabel(platform)}: ${limits.minChars}–${limits.maxChars} characters`,
        `Sentiment: ${sentiment.label} (${sentiment.score > 0 ? "+" : ""}${sentiment.score} polarity)`,
        `Reading level: ${readability.grade}`,
      ],
      metrics: [
        { label: "Hashtags", value: String(parsed.hashtags.length) },
        { label: "Mentions", value: String(parsed.mentions.length) },
        { label: "Links", value: String(parsed.urls.length) },
        { label: "Emojis", value: String(parsed.emojis.length) },
      ],
    },
    {
      id: "content",
      title: "Content Breakdown",
      category: "content",
      summary: getContentSummary(text, parsed, limits),
      details: [
        `Full text: "${text.length > 200 ? text.slice(0, 200) + "…" : text}"`,
        parsed.hashtags.length > 0
          ? `Hashtags: ${parsed.hashtags.map((h) => `#${h}`).join(", ")}`
          : "No hashtags — consider adding 2-5 relevant tags for discoverability",
        parsed.mentions.length > 0
          ? `Mentions: ${parsed.mentions.map((m) => `@${m}`).join(", ")}`
          : "No @mentions — tag relevant accounts to expand reach",
        parsed.urls.length > 0 ? `Links: ${parsed.urls.join(", ")}` : "No links — add a URL to drive traffic",
        parsed.emojis.length > 0 ? `Emojis used: ${parsed.emojis.join(" ")}` : "No emojis — strategic emoji use can boost engagement 10-15%",
      ],
      highlights: buildContentHighlights(parsed, limits, charCount),
    },
    {
      id: "engagement",
      title: "Engagement Optimization",
      category: "engagement",
      summary: engagementScore >= 70
        ? "This post has strong engagement signals. Fine-tune timing and visuals for maximum impact."
        : "Several engagement levers can be pulled to improve performance.",
      details: [
        `Hook strength: ${analyzeHook(text)}`,
        `Question present: ${/\?/.test(text) ? "Yes ✓ — questions drive 2x more comments" : "No — consider ending with a question"}`,
        `Personal pronouns (I/you/we): ${countPersonalPronouns(text)} — ${countPersonalPronouns(text) >= 2 ? "good conversational tone" : "add more direct address to readers"}`,
        `Power words: ${detectPowerWords(text).join(", ") || "None detected — add urgency or emotion words"}`,
        `Best posting times for ${platformLabel(platform)}: ${limits.bestTimes}`,
      ],
    },
    {
      id: "strategy",
      title: "Platform Strategy",
      category: "strategy",
      summary: getPlatformStrategy(platform, parsed),
      details: getPlatformTips(platform),
    },
    {
      id: "marketing",
      title: "Brand & Conversion",
      category: "marketing",
      summary: ctaScore >= 60
        ? "Clear conversion intent detected in the post."
        : "The post lacks a strong call-to-action — add one to convert engagement into action.",
      details: [
        `CTA detected: ${detectCTA(text) ?? "None — add 'Link in bio', 'Comment below', or 'Learn more' type CTA"}`,
        `Value proposition: ${detectValueProp(text)}`,
        `Shareability: ${assessShareability(text, parsed)}`,
      ],
    },
  ];

  const actionItems = buildSocialActionItems(parsed, platform, charCount, limits, ctaScore, hashtagScore);

  const baseReport: AnalysisReport = {
    id: generateId(),
    inputType: "social",
    detectedType: "social",
    title: `${platformLabel(platform)} Post Analysis`,
    subtitle: `${charCount} characters · ${parsed.hashtags.length} hashtags`,
    analyzedAt,
    input,
    overallScore,
    scores,
    sections,
    actionItems,
  };

  const audit = runMarketingAudit(text, "social_post");
  return enrichReportWithAudit(baseReport, audit);
}

function parseSocialInput(input: string): ParsedPost {
  const trimmed = input.trim();
  let platform: SocialPlatform = "unknown";
  let text = trimmed;

  const urlPlatform = detectPlatformFromUrl(trimmed);
  if (urlPlatform) {
    platform = urlPlatform;
    text = extractTextFromSocialUrl(trimmed) ?? trimmed;
  }

  if (platform === "unknown") {
    platform = guessPlatformFromContent(trimmed);
  }

  return {
    platform,
    text,
    hashtags: extractHashtags(text),
    mentions: extractMentions(text),
    urls: extractUrls(text),
    emojis: extractEmojis(text),
  };
}

function detectPlatformFromUrl(input: string): SocialPlatform | null {
  if (/twitter\.com|x\.com/i.test(input)) return "twitter";
  if (/linkedin\.com/i.test(input)) return "linkedin";
  if (/instagram\.com/i.test(input)) return "instagram";
  if (/facebook\.com|fb\.com/i.test(input)) return "facebook";
  if (/tiktok\.com/i.test(input)) return "tiktok";
  if (/youtube\.com/i.test(input)) return "youtube";
  if (/threads\.net/i.test(input)) return "threads";
  return null;
}

function extractTextFromSocialUrl(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = decodeURIComponent(parsed.pathname);
    const statusMatch = path.match(/\/status\/(\d+)/);
    if (statusMatch) return `Social post (ID: ${statusMatch[1]}) — paste post text for deeper analysis`;
    return null;
  } catch {
    return null;
  }
}

function guessPlatformFromContent(text: string): SocialPlatform {
  if (text.length <= 280 && (/#\w+/.test(text) || /@\w+/.test(text))) return "twitter";
  if (text.length > 500 || /#\w+/.test(text)) return "instagram";
  if (/linkedin|professional|hiring|we're/i.test(text)) return "linkedin";
  return "unknown";
}

function extractHashtags(text: string): string[] {
  return [...text.matchAll(/#(\w+)/g)].map((m) => m[1]);
}

function extractMentions(text: string): string[] {
  return [...text.matchAll(/@(\w+)/g)].map((m) => m[1]);
}

function extractUrls(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s]+/g)].map((m) => m[0]);
}

function extractEmojis(text: string): string[] {
  return [...text.matchAll(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu)].map((m) => m[0]);
}

function getPlatformLimits(platform: SocialPlatform) {
  const limits: Record<SocialPlatform, { minChars: number; maxChars: number; idealHashtags: number; bestTimes: string }> = {
    twitter: { minChars: 71, maxChars: 280, idealHashtags: 2, bestTimes: "Tue-Thu 9am-12pm" },
    linkedin: { minChars: 150, maxChars: 3000, idealHashtags: 3, bestTimes: "Tue-Thu 8-10am" },
    instagram: { minChars: 138, maxChars: 2200, idealHashtags: 5, bestTimes: "Mon-Fri 11am-1pm, evenings" },
    facebook: { minChars: 40, maxChars: 63206, idealHashtags: 2, bestTimes: "Wed-Fri 1-4pm" },
    tiktok: { minChars: 100, maxChars: 4000, idealHashtags: 4, bestTimes: "Tue-Thu 7-9pm" },
    youtube: { minChars: 50, maxChars: 5000, idealHashtags: 3, bestTimes: "Varies — test Fri-Sat afternoons" },
    threads: { minChars: 50, maxChars: 500, idealHashtags: 3, bestTimes: "Similar to Instagram" },
    unknown: { minChars: 1, maxChars: 5000, idealHashtags: 3, bestTimes: "Varies by platform" },
  };
  return limits[platform];
}

function platformLabel(p: SocialPlatform): string {
  const labels: Record<SocialPlatform, string> = {
    twitter: "X (Twitter)",
    linkedin: "LinkedIn",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    youtube: "YouTube",
    threads: "Threads",
    unknown: "Social",
  };
  return labels[p];
}

function computeEngagementScore(parsed: ParsedPost, limits: ReturnType<typeof getPlatformLimits>): number {
  let score = 0;
  const len = parsed.text.length;
  if (len >= limits.minChars && len <= limits.maxChars) score += 30;
  else if (len > 0) score += 15;
  if (parsed.hashtags.length > 0) score += 15;
  if (parsed.hashtags.length <= limits.idealHashtags + 2) score += 10;
  if (parsed.mentions.length > 0) score += 10;
  if (parsed.urls.length > 0) score += 10;
  if (parsed.emojis.length > 0 && parsed.emojis.length <= 5) score += 15;
  if (/\?/.test(parsed.text)) score += 10;
  if (detectCTA(parsed.text)) score += 15;
  return clamp(score, 0, 100);
}

function computeClarityScore(text: string, parsed: ParsedPost): number {
  let score = 20;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 5) score += 20;
  if (words.length >= 15) score += 15;
  if (parsed.urls.length <= 2) score += 10;
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / (words.length || 1);
  if (avgWordLen <= 7) score += 20;
  else if (avgWordLen <= 10) score += 10;
  if (!/!!!|\?{3,}|capslock/i.test(text) && !/[A-Z]{5,}/.test(text)) score += 15;
  return clamp(score, 0, 100);
}

function computeHashtagScore(parsed: ParsedPost, platform: SocialPlatform): number {
  const limits = getPlatformLimits(platform);
  const count = parsed.hashtags.length;
  if (count === 0) return 20;
  if (count >= 1 && count <= limits.idealHashtags) return 90;
  if (count <= limits.idealHashtags + 3) return 70;
  return 40;
}

function computeCtaScore(text: string): number {
  if (detectCTA(text)) return 85;
  if (/click|visit|check out|learn|sign up|download|shop|buy|subscribe|join|register/i.test(text)) return 60;
  return 25;
}

function analyzeSentiment(text: string): { label: string; score: number } {
  const positive = /\b(amazing|great|love|excited|happy|best|awesome|incredible|win|success|growth|launch|proud|grateful)\b/gi;
  const negative = /\b(bad|worst|hate|fail|problem|issue|sorry|disappointed|struggle|delay|cancel)\b/gi;
  const pos = (text.match(positive) ?? []).length;
  const neg = (text.match(negative) ?? []).length;
  const score = pos - neg;
  if (score > 1) return { label: "Positive", score };
  if (score < -1) return { label: "Negative", score };
  return { label: "Neutral", score };
}

function analyzeReadability(text: string): { grade: string } {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  if (words.length < 5) return { grade: "Too short to assess" };
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  if (avgWordsPerSentence <= 12) return { grade: "Easy — highly scannable" };
  if (avgWordsPerSentence <= 20) return { grade: "Moderate — good for professional content" };
  return { grade: "Dense — consider shorter sentences for social" };
}

function getContentSummary(text: string, parsed: ParsedPost, limits: ReturnType<typeof getPlatformLimits>): string {
  const len = text.length;
  if (len < limits.minChars) return `Post is shorter than the ${limits.minChars}-character sweet spot for this platform. Add context or a hook.`;
  if (len > limits.maxChars) return "Post exceeds platform character limit — trim before publishing.";
  return "Post length is within platform guidelines. Focus on hook and CTA for best results.";
}

function buildContentHighlights(parsed: ParsedPost, limits: ReturnType<typeof getPlatformLimits>, charCount: number) {
  const highlights: { type: "positive" | "negative" | "neutral"; text: string }[] = [];
  if (charCount >= limits.minChars && charCount <= limits.maxChars) {
    highlights.push({ type: "positive", text: "Character count within optimal range" });
  } else if (charCount < limits.minChars) {
    highlights.push({ type: "negative", text: "Post may be too short to drive engagement" });
  }
  if (parsed.hashtags.length >= 1 && parsed.hashtags.length <= limits.idealHashtags + 2) {
    highlights.push({ type: "positive", text: "Hashtag count is reasonable" });
  }
  if (parsed.emojis.length > 8) highlights.push({ type: "negative", text: "Too many emojis — can appear unprofessional" });
  return highlights;
}

function analyzeHook(text: string): string {
  const firstLine = text.split(/[\n.!?]/)[0]?.trim() ?? "";
  if (firstLine.length < 10) return "Weak — open with a bold statement, stat, or question";
  if (/^\d|how to|why|what if|did you|breaking|just|new|introducing/i.test(firstLine)) return "Strong — uses proven hook patterns";
  return "Moderate — consider leading with value or curiosity";
}

function countPersonalPronouns(text: string): number {
  return (text.match(/\b(I|you|we|your|our|us)\b/gi) ?? []).length;
}

function detectPowerWords(text: string): string[] {
  const powerWords = ["free", "new", "exclusive", "limited", "secret", "proven", "guaranteed", "instant", "save", "discover", "unlock", "transform"];
  return powerWords.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(text));
}

function detectCTA(text: string): string | null {
  const match = text.match(/\b(click the link|link in bio|sign up|learn more|shop now|download|subscribe|comment below|share this|tag a friend|DM me|book now|get started|try free)\b[^.!?]*/i);
  return match ? match[0].trim() : null;
}

function detectValueProp(text: string): string {
  if (/\b(save|help|solve|grow|increase|reduce|improve|boost|automate|streamline)\b/i.test(text)) {
    return "Benefit-oriented language detected ✓";
  }
  return "Lead with a clear benefit — what does the reader gain?";
}

function assessShareability(text: string, parsed: ParsedPost): string {
  let score = 0;
  if (/\?/.test(text)) score++;
  if (parsed.hashtags.length >= 2) score++;
  if (detectPowerWords(text).length >= 1) score++;
  if (parsed.emojis.length >= 1) score++;
  if (score >= 3) return "High — likely to be shared or saved";
  if (score >= 1) return "Moderate — add a question or bold claim to boost shares";
  return "Low — inject emotion, urgency, or social proof";
}

function getPlatformStrategy(platform: SocialPlatform, parsed: ParsedPost): string {
  const strategies: Record<SocialPlatform, string> = {
    twitter: "Optimize for conversation — threads perform 3x better for long-form. Reply to comments within 30 minutes.",
    linkedin: "Lead with a story or insight in the first 2 lines (before 'see more'). Document-style posts outperform promotional content.",
    instagram: "Pair with strong visuals or carousel. First line is the hook — rest goes below the fold.",
    facebook: "Native video and community-focused content outperform link posts. Ask questions to boost comments.",
    tiktok: "Hook in first 1-3 seconds of video. Use trending sounds and niche hashtags for discovery.",
    youtube: "Front-load keywords in title and description. Pin a comment with CTA and links.",
    threads: "Conversational, authentic tone works best. Cross-post from Instagram but adapt the copy.",
    unknown: "Identify your primary platform and tailor length, hashtags, and tone accordingly.",
  };
  return strategies[platform];
}

function getPlatformTips(platform: SocialPlatform): string[] {
  const tips: Record<SocialPlatform, string[]> = {
    twitter: ["Use 1-2 hashtags max", "Tag relevant accounts for amplification", "Post threads for complex topics"],
    linkedin: ["Use line breaks for readability", "Tag people mentioned in the post", "Post Tue-Thu mornings for B2B"],
    instagram: ["Put hashtags in first comment or at end", "Use 3-5 niche + 2 broad hashtags", "Include a visual CTA in the image"],
    facebook: ["Keep promotional posts under 80 characters for best reach", "Use Facebook-native video when possible", "Boost top-performing organic posts"],
    tiktok: ["Use 3-5 trending + niche hashtags", "Respond to comments with video replies", "Post consistently 1-3x daily"],
    youtube: ["Include timestamps in description", "Add 3-5 relevant tags", "Custom thumbnail increases CTR 30%+"],
    threads: ["Keep under 500 characters", "Engage in replies to boost visibility", "Cross-promote on Instagram Stories"],
    unknown: ["Define your target audience first", "Test posting times and track engagement", "Repurpose content across platforms"],
  };
  return tips[platform];
}

function buildSocialActionItems(
  parsed: ParsedPost,
  platform: SocialPlatform,
  charCount: number,
  limits: ReturnType<typeof getPlatformLimits>,
  ctaScore: number,
  hashtagScore: number
) {
  const items: { priority: "high" | "medium" | "low"; action: string }[] = [];
  if (charCount < limits.minChars) {
    items.push({ priority: "high", action: `Expand post to at least ${limits.minChars} characters with a hook and context` });
  }
  if (hashtagScore < 50) {
    items.push({ priority: "medium", action: `Add ${limits.idealHashtags} relevant hashtags for ${platformLabel(platform)} discoverability` });
  }
  if (ctaScore < 60) {
    items.push({ priority: "high", action: "Add a clear call-to-action (link, comment prompt, or next step)" });
  }
  if (parsed.mentions.length === 0) {
    items.push({ priority: "low", action: "Tag 1-2 relevant accounts or collaborators to expand reach" });
  }
  if (!/\?/.test(parsed.text)) {
    items.push({ priority: "medium", action: "End with a question to drive comments and algorithm boost" });
  }
  if (items.length === 0) {
    items.push({ priority: "low", action: "A/B test posting times and track engagement metrics for 2 weeks" });
  }
  return items;
}
