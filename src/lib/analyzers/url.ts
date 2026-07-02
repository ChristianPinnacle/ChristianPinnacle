import * as cheerio from "cheerio";
import type { AnalysisReport, AnalysisSection, ScoreMetric } from "@/lib/types";
import {
  clamp,
  countWords,
  extractHeadings,
  extractLinks,
  extractMetaContent,
  extractTitle,
  fetchWithTimeout,
  generateId,
  readingTimeMinutes,
  stripHtml,
} from "@/lib/utils";
import { normalizeUrl } from "@/lib/analyzers/detect";

export async function analyzeUrl(input: string): Promise<AnalysisReport> {
  const url = normalizeUrl(input);
  const analyzedAt = new Date().toISOString();

  let html = "";
  let status = 0;
  let responseTimeMs = 0;
  let finalUrl = url;
  let fetchError: string | null = null;

  try {
    const result = await fetchWithTimeout(url);
    html = result.html;
    status = result.status;
    responseTimeMs = result.responseTimeMs;
    finalUrl = result.finalUrl;
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to fetch URL";
  }

  if (fetchError || status >= 400) {
    return buildErrorReport(input, url, analyzedAt, fetchError ?? `HTTP ${status}`);
  }

  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || extractTitle(html) || "Untitled Page";
  const description =
    $('meta[name="description"]').attr("content") ||
    extractMetaContent(html, "description") ||
    extractMetaContent(html, "og:description") ||
    "";
  const ogTitle = extractMetaContent(html, "og:title") || title;
  const ogImage = extractMetaContent(html, "og:image");
  const canonical = $('link[rel="canonical"]').attr("href") || extractMetaContent(html, "canonical");
  const robots = $('meta[name="robots"]').attr("content") || "";
  const viewport = $('meta[name="viewport"]').attr("content") || "";
  const lang = $("html").attr("lang") || "";
  const headings = extractHeadings(html);
  const links = extractLinks(html);
  const bodyText = stripHtml($("body").html() || html);
  const wordCount = countWords(bodyText);
  const h1Count = headings.filter((h) => h.level === 1).length;
  const images = $("img").length;
  const imagesWithAlt = $("img[alt]").filter((_, el) => !!$(el).attr("alt")?.trim()).length;
  const hasSchema = /application\/ld\+json/i.test(html);
  const hasFavicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
  const hasHttps = finalUrl.startsWith("https://");
  const socialLinks = detectSocialLinks(links);
  const ctaTexts = detectCTAs($);
  const internalLinks = links.filter((l) => isInternalLink(l.href, finalUrl)).length;
  const externalLinks = links.length - internalLinks;

  const seoScore = computeSeoScore({
    title,
    description,
    h1Count,
    headings: headings.length,
    canonical: !!canonical,
    ogTitle: !!ogTitle,
    ogImage: !!ogImage,
    lang: !!lang,
    robots,
    hasSchema,
    images,
    imagesWithAlt,
  });

  const contentScore = computeContentScore({ wordCount, headings: headings.length, ctaCount: ctaTexts.length });
  const technicalScore = computeTechnicalScore({
    hasHttps,
    status,
    responseTimeMs,
    viewport: !!viewport,
    hasFavicon,
  });
  const marketingScore = computeMarketingScore({
    description,
    ogImage: !!ogImage,
    ctaCount: ctaTexts.length,
    socialLinks: socialLinks.length,
  });

  const overallScore = Math.round((seoScore + contentScore + technicalScore + marketingScore) / 4);

  const scores: ScoreMetric[] = [
    { label: "SEO", score: seoScore, description: "Search engine optimization readiness" },
    { label: "Content", score: contentScore, description: "Content depth and structure quality" },
    { label: "Technical", score: technicalScore, description: "Performance and technical health" },
    { label: "Marketing", score: marketingScore, description: "Conversion and brand presence signals" },
  ];

  const sections: AnalysisSection[] = [
    {
      id: "overview",
      title: "Executive Summary",
      category: "overview",
      summary: `${ogTitle} is a ${wordCount > 500 ? "content-rich" : "lightweight"} web presence with an overall health score of ${overallScore}/100.`,
      details: [
        `Page title: "${title}"`,
        description ? `Meta description present (${description.length} characters)` : "No meta description detected — search engines will auto-generate snippets",
        `${headings.length} headings structure the page content`,
        `${links.length} total links (${internalLinks} internal, ${externalLinks} external)`,
        `Estimated reading time: ${readingTimeMinutes(bodyText)} min (${wordCount.toLocaleString()} words)`,
      ],
      metrics: [
        { label: "HTTP Status", value: String(status) },
        { label: "Response Time", value: `${responseTimeMs}ms` },
        { label: "Final URL", value: finalUrl },
        { label: "Language", value: lang || "Not specified" },
      ],
    },
    {
      id: "seo",
      title: "SEO Analysis",
      category: "seo",
      summary: getSeoSummary(seoScore, { title, description, h1Count, hasSchema, canonical: !!canonical }),
      details: [
        `Title tag: ${title.length} chars ${title.length >= 30 && title.length <= 60 ? "✓ optimal length" : "— aim for 30-60 characters"}`,
        `Meta description: ${description ? `${description.length} chars` : "Missing"} ${description && description.length >= 120 && description.length <= 160 ? "✓ optimal" : description ? "— aim for 120-160 characters" : ""}`,
        `H1 headings: ${h1Count} ${h1Count === 1 ? "✓ ideal" : h1Count === 0 ? "— add exactly one H1" : "— use only one H1 per page"}`,
        `Heading hierarchy: ${headings.length} total (H1-H6)`,
        `Canonical URL: ${canonical ? canonical : "Not set — may cause duplicate content issues"}`,
        `Structured data: ${hasSchema ? "Schema.org JSON-LD detected ✓" : "Not detected — add structured data for rich results"}`,
        `Open Graph: ${ogTitle ? "Title ✓" : "Missing"} | ${ogImage ? "Image ✓" : "Image missing"}`,
        `Robots directive: ${robots || "None specified (default: index, follow)"}`,
      ],
      highlights: buildSeoHighlights({ title, description, h1Count, hasSchema, ogImage: !!ogImage, canonical: !!canonical, images, imagesWithAlt }),
    },
    {
      id: "content",
      title: "Content & Messaging",
      category: "content",
      summary: wordCount > 300
        ? "The page has substantial content. Review messaging clarity and call-to-action placement."
        : "Content is thin. Consider expanding with value-driven copy, FAQs, and social proof.",
      details: [
        `Primary headings: ${headings.slice(0, 5).map((h) => `H${h.level}: ${h.text}`).join(" | ") || "None detected"}`,
        `Call-to-action elements found: ${ctaTexts.length > 0 ? ctaTexts.slice(0, 5).join(", ") : "None clearly identified"}`,
        `Image assets: ${images} total, ${imagesWithAlt} with alt text (${images > 0 ? Math.round((imagesWithAlt / images) * 100) : 0}% coverage)`,
      ],
      metrics: [
        { label: "Word Count", value: wordCount.toLocaleString() },
        { label: "Headings", value: String(headings.length) },
        { label: "Images", value: String(images) },
      ],
    },
    {
      id: "technical",
      title: "Technical Health",
      category: "technical",
      summary: getTechnicalSummary(technicalScore, { hasHttps, responseTimeMs, viewport: !!viewport }),
      details: [
        `HTTPS: ${hasHttps ? "Enabled ✓" : "Not enabled — critical for trust and SEO"}`,
        `Mobile viewport: ${viewport ? "Configured ✓" : "Missing — page may not render well on mobile"}`,
        `Favicon: ${hasFavicon ? "Present ✓" : "Missing — affects brand recognition in browser tabs"}`,
        `Server response: ${responseTimeMs}ms ${responseTimeMs < 800 ? "✓ fast" : responseTimeMs < 2000 ? "— acceptable" : "— slow, optimize loading"}`,
      ],
      highlights: [
        ...(hasHttps ? [{ type: "positive" as const, text: "Secure HTTPS connection" }] : [{ type: "negative" as const, text: "Site not served over HTTPS" }]),
        ...(responseTimeMs < 1000 ? [{ type: "positive" as const, text: "Good server response time" }] : [{ type: "negative" as const, text: "Slow server response — investigate hosting/CDN" }]),
      ],
    },
    {
      id: "marketing",
      title: "Marketing & Brand Signals",
      category: "marketing",
      summary: marketingScore >= 70
        ? "Strong marketing foundations with social presence and conversion elements."
        : "Opportunities to strengthen brand presence and conversion paths.",
      details: [
        `Social media links: ${socialLinks.length > 0 ? socialLinks.join(", ") : "None detected on page"}`,
        `Open Graph image: ${ogImage ? "Set for social sharing ✓" : "Missing — shared links won't show preview images"}`,
        `CTA density: ${ctaTexts.length} action elements ${ctaTexts.length >= 2 ? "✓" : "— add clear CTAs above the fold"}`,
      ],
    },
  ];

  const actionItems = buildUrlActionItems({
    description,
    h1Count,
    hasSchema,
    ogImage: !!ogImage,
    hasHttps,
    viewport: !!viewport,
    images,
    imagesWithAlt,
    responseTimeMs,
    ctaCount: ctaTexts.length,
  });

  return {
    id: generateId(),
    inputType: "url",
    detectedType: "url",
    title: ogTitle,
    subtitle: finalUrl,
    analyzedAt,
    input,
    overallScore,
    scores,
    sections,
    actionItems,
  };
}

function buildErrorReport(input: string, url: string, analyzedAt: string, error: string): AnalysisReport {
  return {
    id: generateId(),
    inputType: "url",
    detectedType: "url",
    title: "Analysis Failed",
    subtitle: url,
    analyzedAt,
    input,
    overallScore: 0,
    scores: [],
    sections: [
      {
        id: "error",
        title: "Unable to Analyze",
        category: "overview",
        summary: `Could not fetch or analyze the URL: ${error}`,
        details: [
          "Verify the URL is correct and publicly accessible",
          "Some sites block automated requests — try a different page",
          "Ensure the site is online and not behind a login wall",
        ],
      },
    ],
    actionItems: [
      { priority: "high", action: "Check that the URL is valid and publicly accessible" },
    ],
  };
}

function computeSeoScore(factors: {
  title: string;
  description: string;
  h1Count: number;
  headings: number;
  canonical: boolean;
  ogTitle: boolean;
  ogImage: boolean;
  lang: boolean;
  robots: string;
  hasSchema: boolean;
  images: number;
  imagesWithAlt: number;
}): number {
  let score = 0;
  if (factors.title.length >= 20) score += 15;
  if (factors.title.length >= 30 && factors.title.length <= 60) score += 10;
  if (factors.description.length >= 80) score += 15;
  if (factors.description.length >= 120 && factors.description.length <= 160) score += 10;
  if (factors.h1Count === 1) score += 15;
  if (factors.headings >= 3) score += 5;
  if (factors.canonical) score += 10;
  if (factors.ogTitle) score += 5;
  if (factors.ogImage) score += 5;
  if (factors.lang) score += 5;
  if (factors.hasSchema) score += 10;
  if (!factors.robots.includes("noindex")) score += 5;
  if (factors.images === 0 || factors.imagesWithAlt / factors.images >= 0.8) score += 5;
  return clamp(score, 0, 100);
}

function computeContentScore(factors: { wordCount: number; headings: number; ctaCount: number }): number {
  let score = 0;
  if (factors.wordCount >= 300) score += 30;
  else if (factors.wordCount >= 100) score += 15;
  if (factors.wordCount >= 800) score += 15;
  if (factors.headings >= 3) score += 20;
  if (factors.headings >= 6) score += 10;
  if (factors.ctaCount >= 1) score += 15;
  if (factors.ctaCount >= 2) score += 10;
  return clamp(score, 0, 100);
}

function computeTechnicalScore(factors: {
  hasHttps: boolean;
  status: number;
  responseTimeMs: number;
  viewport: boolean;
  hasFavicon: boolean;
}): number {
  let score = 0;
  if (factors.hasHttps) score += 30;
  if (factors.status === 200) score += 20;
  if (factors.responseTimeMs < 500) score += 25;
  else if (factors.responseTimeMs < 1500) score += 15;
  else if (factors.responseTimeMs < 3000) score += 5;
  if (factors.viewport) score += 15;
  if (factors.hasFavicon) score += 10;
  return clamp(score, 0, 100);
}

function computeMarketingScore(factors: {
  description: string;
  ogImage: boolean;
  ctaCount: number;
  socialLinks: number;
}): number {
  let score = 0;
  if (factors.description.length > 50) score += 25;
  if (factors.ogImage) score += 25;
  if (factors.ctaCount >= 1) score += 25;
  if (factors.socialLinks >= 1) score += 15;
  if (factors.socialLinks >= 3) score += 10;
  return clamp(score, 0, 100);
}

function getSeoSummary(score: number, ctx: { title: string; description: string; h1Count: number; hasSchema: boolean; canonical: boolean }): string {
  if (score >= 80) return "Strong SEO foundation. Minor optimizations could push rankings further.";
  if (score >= 50) return "Moderate SEO health with clear improvement opportunities in metadata and structure.";
  const issues: string[] = [];
  if (!ctx.description) issues.push("missing meta description");
  if (ctx.h1Count !== 1) issues.push("heading structure needs work");
  if (!ctx.hasSchema) issues.push("no structured data");
  return `SEO needs attention: ${issues.join(", ") || "multiple factors below benchmark"}.`;
}

function getTechnicalSummary(score: number, ctx: { hasHttps: boolean; responseTimeMs: number; viewport: boolean }): string {
  if (score >= 80) return "Solid technical foundation supporting good user experience.";
  const issues: string[] = [];
  if (!ctx.hasHttps) issues.push("no HTTPS");
  if (!ctx.viewport) issues.push("missing mobile viewport");
  if (ctx.responseTimeMs > 2000) issues.push("slow response time");
  return issues.length ? `Technical issues detected: ${issues.join(", ")}.` : "Some technical improvements recommended.";
}

function buildSeoHighlights(ctx: {
  title: string;
  description: string;
  h1Count: number;
  hasSchema: boolean;
  ogImage: boolean;
  canonical: boolean;
  images: number;
  imagesWithAlt: number;
}) {
  const highlights: { type: "positive" | "negative" | "neutral"; text: string }[] = [];
  if (ctx.title.length >= 30 && ctx.title.length <= 60) highlights.push({ type: "positive", text: "Title length is SEO-optimal" });
  else highlights.push({ type: "negative", text: "Title length outside optimal 30-60 character range" });
  if (ctx.description) highlights.push({ type: "positive", text: "Meta description present" });
  else highlights.push({ type: "negative", text: "Missing meta description" });
  if (ctx.h1Count === 1) highlights.push({ type: "positive", text: "Single H1 tag — correct structure" });
  if (ctx.hasSchema) highlights.push({ type: "positive", text: "Structured data implemented" });
  if (ctx.ogImage) highlights.push({ type: "positive", text: "Social sharing image configured" });
  if (ctx.images > 0 && ctx.imagesWithAlt / ctx.images < 0.5) {
    highlights.push({ type: "negative", text: "Many images missing alt text — accessibility and SEO impact" });
  }
  return highlights;
}

function buildUrlActionItems(ctx: {
  description: string;
  h1Count: number;
  hasSchema: boolean;
  ogImage: boolean;
  hasHttps: boolean;
  viewport: boolean;
  images: number;
  imagesWithAlt: number;
  responseTimeMs: number;
  ctaCount: number;
}) {
  const items: { priority: "high" | "medium" | "low"; action: string }[] = [];
  if (!ctx.hasHttps) items.push({ priority: "high", action: "Enable HTTPS with a valid SSL certificate" });
  if (!ctx.description) items.push({ priority: "high", action: "Write a compelling meta description (120-160 characters)" });
  if (ctx.h1Count !== 1) items.push({ priority: "high", action: "Ensure exactly one H1 tag per page with primary keyword" });
  if (!ctx.ogImage) items.push({ priority: "medium", action: "Add an Open Graph image for better social media previews" });
  if (!ctx.hasSchema) items.push({ priority: "medium", action: "Implement Schema.org structured data (Organization, Product, or Article)" });
  if (!ctx.viewport) items.push({ priority: "high", action: "Add viewport meta tag for mobile responsiveness" });
  if (ctx.images > 0 && ctx.imagesWithAlt / ctx.images < 0.8) {
    items.push({ priority: "medium", action: "Add descriptive alt text to all images" });
  }
  if (ctx.responseTimeMs > 2000) items.push({ priority: "medium", action: "Optimize page load speed — consider CDN, image compression, and caching" });
  if (ctx.ctaCount < 1) items.push({ priority: "medium", action: "Add clear call-to-action buttons above the fold" });
  if (items.length === 0) items.push({ priority: "low", action: "Monitor Core Web Vitals and run periodic SEO audits" });
  return items;
}

function detectSocialLinks(links: { href: string; text: string }[]): string[] {
  const platforms = ["twitter", "x.com", "linkedin", "instagram", "facebook", "youtube", "tiktok"];
  const found = new Set<string>();
  for (const link of links) {
    for (const platform of platforms) {
      if (link.href.toLowerCase().includes(platform)) {
        found.add(platform === "x.com" ? "X/Twitter" : platform.charAt(0).toUpperCase() + platform.slice(1));
      }
    }
  }
  return Array.from(found);
}

function detectCTAs($: cheerio.CheerioAPI): string[] {
  const ctaPatterns = /get started|sign up|subscribe|buy now|learn more|contact us|try free|download|book a demo|start free|join now|shop now|register/i;
  const ctas: string[] = [];
  $("a, button, [role='button']").each((_, el) => {
    const text = $(el).text().trim();
    if (text && ctaPatterns.test(text) && text.length < 40) {
      ctas.push(text);
    }
  });
  return [...new Set(ctas)];
}

function isInternalLink(href: string, baseUrl: string): boolean {
  try {
    const base = new URL(baseUrl);
    if (href.startsWith("/") || href.startsWith("#")) return true;
    const link = new URL(href, baseUrl);
    return link.hostname === base.hostname;
  } catch {
    return false;
  }
}
