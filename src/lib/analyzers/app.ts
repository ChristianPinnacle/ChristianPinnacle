import * as cheerio from "cheerio";
import type { AnalysisReport, AnalysisSection, ScoreMetric } from "@/lib/types";
import { clamp, generateId, fetchWithTimeout } from "@/lib/utils";
import { normalizeUrl } from "@/lib/analyzers/detect";
import { runMarketingAudit, enrichReportWithAudit } from "@/lib/intelligence/audit";

type AppStore = "apple" | "google" | "unknown";

interface AppInfo {
  store: AppStore;
  name: string;
  developer: string;
  category: string;
  description: string;
  rating: string;
  ratingCount: string;
  price: string;
  version: string;
  size: string;
  lastUpdated: string;
  url: string;
}

export async function analyzeApp(input: string): Promise<AnalysisReport> {
  const analyzedAt = new Date().toISOString();
  const url = normalizeUrl(input);
  const store = detectStore(url);

  let appInfo: AppInfo;
  try {
    appInfo = await fetchAppInfo(url, store);
  } catch {
    appInfo = buildFallbackAppInfo(url, store);
  }

  const asoScore = computeAsoScore(appInfo);
  const listingScore = computeListingScore(appInfo);
  const competitiveScore = computeCompetitiveScore(appInfo);
  const conversionScore = computeConversionScore(appInfo);
  const overallScore = Math.round((asoScore + listingScore + competitiveScore + conversionScore) / 4);

  const scores: ScoreMetric[] = [
    { label: "ASO", score: asoScore, description: "App Store Optimization readiness" },
    { label: "Listing Quality", score: listingScore, description: "Title, description, and metadata strength" },
    { label: "Market Position", score: competitiveScore, description: "Ratings and competitive signals" },
    { label: "Conversion", score: conversionScore, description: "Likelihood to convert browsers to installs" },
  ];

  const sections: AnalysisSection[] = [
    {
      id: "overview",
      title: "App Overview",
      category: "overview",
      summary: `${appInfo.name} on ${storeLabel(store)} — overall store presence score: ${overallScore}/100.`,
      details: [
        `App name: ${appInfo.name}`,
        `Developer: ${appInfo.developer || "Unknown"}`,
        `Category: ${appInfo.category || "Not detected"}`,
        `Store: ${storeLabel(store)}`,
        appInfo.rating ? `Rating: ${appInfo.rating}${appInfo.ratingCount ? ` (${appInfo.ratingCount} ratings)` : ""}` : "Rating: Not available",
        appInfo.price ? `Price: ${appInfo.price}` : "",
      ].filter(Boolean),
      metrics: [
        { label: "Version", value: appInfo.version || "N/A" },
        { label: "Size", value: appInfo.size || "N/A" },
        { label: "Updated", value: appInfo.lastUpdated || "N/A" },
      ],
    },
    {
      id: "aso",
      title: "App Store Optimization (ASO)",
      category: "aso",
      summary: asoScore >= 70
        ? "Solid ASO foundation. Focus on keyword refinement and screenshot optimization."
        : "Significant ASO opportunities to improve discoverability and conversion.",
      details: [
        `Title length: ${appInfo.name.length} chars ${appInfo.name.length <= 30 ? "✓" : "— keep under 30 for full visibility"}`,
        `Description: ${appInfo.description ? `${appInfo.description.length} chars` : "Not fetched"} ${appInfo.description && appInfo.description.length >= 200 ? "✓" : "— aim for 200+ chars with keywords in first 3 lines"}`,
        `Keyword strategy: ${analyzeKeywords(appInfo)}`,
        `Subtitle/promo: ${store === "apple" ? "Ensure subtitle uses high-volume keywords (30 char limit)" : "Use short description (80 chars) with primary keyword"}`,
      ],
      highlights: buildAsoHighlights(appInfo),
    },
    {
      id: "listing",
      title: "Listing Quality",
      category: "content",
      summary: listingScore >= 70
        ? "Listing elements are well-structured for conversion."
        : "Listing needs stronger value communication and social proof.",
      details: [
        `App description preview: "${appInfo.description ? appInfo.description.slice(0, 150) + "…" : "Not available"}"`,
        `Rating signal: ${appInfo.rating ? `${appInfo.rating}/5 — ${parseFloat(appInfo.rating) >= 4.0 ? "strong social proof" : "below 4.0 hurts conversion ~20%"}` : "No rating data — focus on early user reviews"}`,
        `Update cadence: ${appInfo.lastUpdated ? `Last updated ${appInfo.lastUpdated}` : "Unknown — regular updates signal active development"}`,
      ],
    },
    {
      id: "strategy",
      title: "Growth Strategy",
      category: "strategy",
      summary: getAppGrowthSummary(appInfo),
      details: getAppGrowthTips(store),
    },
    {
      id: "recommendations",
      title: "Competitive Intelligence",
      category: "recommendations",
      summary: "Benchmark against top apps in your category using these metrics.",
      details: [
        "Top apps typically have 4.5+ star ratings with 1,000+ reviews",
        "Conversion rate from page view to install: 25-35% for optimized listings",
        "Screenshot sets with captions convert 15-25% better than plain screenshots",
        "Apps updating monthly see 2x better retention signals to store algorithms",
        store === "apple"
          ? "Apple Search Ads and Today tab features drive 40% of discovery for new apps"
          : "Google Play Instant and pre-registration can reduce friction for user acquisition",
      ],
    },
  ];

  const actionItems = buildAppActionItems(appInfo, store, asoScore, listingScore);

  const auditText = [appInfo.name, appInfo.description, appInfo.category, appInfo.price].join("\n");

  const baseReport: AnalysisReport = {
    id: generateId(),
    inputType: "app",
    detectedType: "app",
    title: appInfo.name,
    subtitle: `${storeLabel(store)} · ${appInfo.category || "Mobile App"}`,
    analyzedAt,
    input,
    overallScore,
    scores,
    sections,
    actionItems,
  };

  const audit = runMarketingAudit(auditText, "app_listing");
  return enrichReportWithAudit(baseReport, audit);
}

function detectStore(url: string): AppStore {
  if (/apps\.apple\.com/i.test(url)) return "apple";
  if (/play\.google\.com/i.test(url)) return "google";
  return "unknown";
}

function storeLabel(store: AppStore): string {
  return store === "apple" ? "Apple App Store" : store === "google" ? "Google Play" : "App Store";
}

async function fetchAppInfo(url: string, store: AppStore): Promise<AppInfo> {
  const { html, finalUrl } = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  if (store === "apple") return parseAppleStore($, finalUrl);
  if (store === "google") return parseGooglePlay($, finalUrl);
  return buildFallbackAppInfo(url, store);
}

function parseAppleStore($: cheerio.CheerioAPI, url: string): AppInfo {
  const name =
    $("h1.app-header__title, h1.product-header__title, h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.replace(/ on the App Store$/, "") ||
    "Unknown App";
  const developer =
    $(".app-header__list__item--artist, .product-header__identity a").first().text().trim() ||
    $('meta[name="apple:developer"]').attr("content") ||
    "";
  const description =
    $(".section__description .we-clamp, .product-review p").first().text().trim() ||
    $('meta[name="description"]').attr("content") ||
    "";
  const category = $(".app-header__list__item--category, .inline-list__item a").first().text().trim() || "";
  const rating = $(".we-rating-count-star-rating__rating, .rating-count").first().text().trim() || "";
  const ratingCount = $(".we-rating-count-star-rating__count, .rating-count__text").first().text().trim() || "";
  const price = $(".app-header__list__item--price, .product-header__list__item--price").first().text().trim() || "Free";

  return { store: "apple", name, developer, category, description, rating: rating.replace(/[^\d.]/g, "").slice(0, 3) || rating, ratingCount, price, version: "", size: "", lastUpdated: "", url };
}

function parseGooglePlay($: cheerio.CheerioAPI, url: string): AppInfo {
  const name = $("h1").first().text().trim() || $('meta[property="og:title"]').attr("content") || "Unknown App";
  const developer = $('a[href*="dev?id="]').first().text().trim() || "";
  const description = $('meta[name="description"]').attr("content") || $('[data-g-id="description"]').text().trim() || "";
  const category = $('a[href*="category/"]').first().text().trim() || "";
  const rating = $('div[itemprop="starRating"] meta[itemprop="ratingValue"]').attr("content") || "";
  const ratingCount = $('div[itemprop="starRating"] meta[itemprop="ratingCount"]').attr("content") || "";
  const price = $("[itemprop='price']").first().text().trim() || "Free";

  return { store: "google", name, developer, category, description, rating, ratingCount, price, version: "", size: "", lastUpdated: "", url };
}

function buildFallbackAppInfo(url: string, store: AppStore): AppInfo {
  let name = "Unknown App";
  try {
    const parsed = new URL(url);
    const idMatch = parsed.pathname.match(/id(\d+)/);
    if (idMatch) name = `App ID ${idMatch[1]}`;
    else name = parsed.pathname.split("/").filter(Boolean).pop() ?? name;
  } catch {
    // keep default
  }
  return { store, name: decodeURIComponent(name.replace(/-/g, " ")), developer: "", category: "", description: "", rating: "", ratingCount: "", price: "", version: "", size: "", lastUpdated: "", url };
}

function computeAsoScore(info: AppInfo): number {
  let score = 0;
  if (info.name && info.name.length >= 5) score += 20;
  if (info.name.length <= 30) score += 10;
  if (info.description.length >= 100) score += 25;
  if (info.description.length >= 300) score += 15;
  if (info.category) score += 15;
  if (info.developer) score += 10;
  return clamp(score, 0, 100);
}

function computeListingScore(info: AppInfo): number {
  let score = 0;
  const ratingNum = parseFloat(info.rating);
  if (!isNaN(ratingNum)) {
    if (ratingNum >= 4.5) score += 35;
    else if (ratingNum >= 4.0) score += 25;
    else if (ratingNum >= 3.5) score += 15;
    else score += 5;
  }
  if (info.ratingCount) score += 15;
  if (info.description.length >= 200) score += 25;
  if (info.price) score += 10;
  if (info.developer) score += 15;
  return clamp(score, 0, 100);
}

function computeCompetitiveScore(info: AppInfo): number {
  const ratingNum = parseFloat(info.rating);
  if (isNaN(ratingNum)) return 40;
  if (ratingNum >= 4.7) return 90;
  if (ratingNum >= 4.3) return 75;
  if (ratingNum >= 4.0) return 60;
  if (ratingNum >= 3.5) return 45;
  return 30;
}

function computeConversionScore(info: AppInfo): number {
  let score = 30;
  if (info.description.length >= 150) score += 25;
  if (info.description.length >= 400) score += 15;
  const ratingNum = parseFloat(info.rating);
  if (!isNaN(ratingNum) && ratingNum >= 4.0) score += 20;
  if (info.category) score += 10;
  return clamp(score, 0, 100);
}

function analyzeKeywords(info: AppInfo): string {
  const text = `${info.name} ${info.description}`.toLowerCase();
  const commonKeywords = ["productivity", "business", "finance", "health", "fitness", "social", "game", "education", "shopping", "travel"];
  const found = commonKeywords.filter((k) => text.includes(k));
  return found.length > 0 ? `Category keywords detected: ${found.join(", ")}` : "Add category-relevant keywords to title and description";
}

function buildAsoHighlights(info: AppInfo) {
  const highlights: { type: "positive" | "negative" | "neutral"; text: string }[] = [];
  if (info.name.length <= 30) highlights.push({ type: "positive", text: "App title fits store display limits" });
  if (info.description.length >= 200) highlights.push({ type: "positive", text: "Description has sufficient length for keyword indexing" });
  else highlights.push({ type: "negative", text: "Description too short for effective keyword ranking" });
  return highlights;
}

function getAppGrowthSummary(info: AppInfo): string {
  const ratingNum = parseFloat(info.rating);
  if (!isNaN(ratingNum) && ratingNum >= 4.5) {
    return "Strong rating profile supports organic growth. Focus on featured placement and paid UA.";
  }
  return "Prioritize review generation, listing A/B tests, and localized store pages for growth.";
}

function getAppGrowthTips(store: AppStore): string[] {
  if (store === "apple") {
    return [
      "Run Apple Search Ads on brand + category keywords",
      "Localize for top 5 markets — can increase downloads 30%+",
      "Apply for App Store editorial featuring with a compelling story",
      "Use custom product pages for different audience segments",
      "Implement in-app review prompts after positive user moments",
    ];
  }
  if (store === "google") {
    return [
      "Optimize short description (80 chars) with primary keyword first",
      "Use Google Play A/B tests for icon, screenshots, and descriptions",
      "Enable Pre-registration for upcoming launches",
      "Respond to all reviews — boosts ranking signals",
      "Create a feature graphic that communicates value in 2 seconds",
    ];
  }
  return ["Submit a valid App Store or Google Play URL for detailed analysis"];
}

function buildAppActionItems(info: AppInfo, store: AppStore, asoScore: number, listingScore: number) {
  const items: { priority: "high" | "medium" | "low"; action: string }[] = [];
  if (info.description.length < 200) {
    items.push({ priority: "high", action: "Expand app description with benefits, features, and keywords in the first 3 lines" });
  }
  if (asoScore < 60) {
    items.push({ priority: "high", action: "Optimize app title with primary keyword (keep under 30 characters)" });
  }
  const ratingNum = parseFloat(info.rating);
  if (!isNaN(ratingNum) && ratingNum < 4.0) {
    items.push({ priority: "high", action: "Address negative reviews and improve rating above 4.0 — critical for conversion" });
  }
  items.push({ priority: "medium", action: "Add screenshot captions highlighting key features (5-8 screenshots)" });
  items.push({
    priority: "medium",
    action: store === "apple" ? "Write a compelling subtitle with secondary keywords" : "Optimize the 80-character short description",
  });
  if (listingScore >= 70) {
    items.push({ priority: "low", action: "Test Apple Search Ads or Google App Campaigns for scaled acquisition" });
  }
  return items;
}
