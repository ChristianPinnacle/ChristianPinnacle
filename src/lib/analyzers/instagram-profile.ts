import { decodeHtmlEntities, fetchWithTimeout } from "@/lib/utils";
import { fetchInstagramViaWebApi } from "@/lib/analyzers/instagram-api";

export interface ParsedInstagramInput {
  username: string;
  profileUrl: string;
  bioOverride?: string;
  displayNameOverride?: string;
}

const RESERVED_PATHS = new Set([
  "p", "reel", "reels", "stories", "explore", "accounts", "direct", "tv",
  "about", "legal", "privacy", "terms", "api", "developer", "nametag",
]);

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Profile URL or @handle, optional bio after |, —, or on following lines */
export function parseInstagramInput(input: string): ParsedInstagramInput | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lines = trimmed.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    const first = parseInstagramSingleLine(lines[0]);
    if (first) {
      const extraBio = lines.slice(1).join("\n");
      return {
        ...first,
        bioOverride: first.bioOverride ? `${first.bioOverride}\n${extraBio}` : extraBio,
      };
    }
  }

  return parseInstagramSingleLine(trimmed);
}

function parseInstagramSingleLine(input: string): ParsedInstagramInput | null {
  const trimmed = input.trim();

  const atMatch = trimmed.match(/^@([a-zA-Z0-9._]{1,30})(?:\s*[|—–-]\s*(.+))?$/);
  if (atMatch) {
    const username = atMatch[1].toLowerCase();
    return {
      username,
      profileUrl: `https://www.instagram.com/${username}/`,
      bioOverride: atMatch[2]?.trim(),
    };
  }

  let urlPart = trimmed;
  let bioOverride: string | undefined;
  const bioSplit = trimmed.match(/^(.+?instagram\.com\/[^\s|—–-]+)\s*[|—–-]\s*(.+)$/i);
  if (bioSplit) {
    urlPart = bioSplit[1].trim();
    bioOverride = bioSplit[2].trim();
  }

  if (!/instagram\.com/i.test(urlPart)) return null;

  try {
    const url = new URL(urlPart.startsWith("http") ? urlPart : `https://${urlPart}`);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    if (RESERVED_PATHS.has(parts[0].toLowerCase())) return null;
    if (parts[0] === "p" || parts[0] === "reel" || parts[0] === "reels") return null;

    const username = parts[0].toLowerCase().replace("@", "");
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) return null;

    return {
      username,
      profileUrl: `https://www.instagram.com/${username}/`,
      bioOverride,
    };
  } catch {
    return null;
  }
}

export function isInstagramProfileInput(input: string): boolean {
  return parseInstagramInput(input) !== null;
}

export interface InstagramProfileData {
  username: string;
  profileUrl: string;
  displayName: string;
  biography: string;
  externalUrl: string;
  followers: number | null;
  following: number | null;
  posts: number | null;
  isVerified: boolean;
  isBusiness: boolean;
  profilePicUrl: string;
  fetchStatus: "full" | "partial" | "blocked";
  fetchNote: string;
}

export async function fetchInstagramProfile(parsed: ParsedInstagramInput): Promise<InstagramProfileData> {
  const base: InstagramProfileData = {
    username: parsed.username,
    profileUrl: parsed.profileUrl,
    displayName: parsed.displayNameOverride ?? formatDisplayName(parsed.username),
    biography: parsed.bioOverride ?? "",
    externalUrl: "",
    followers: null,
    following: null,
    posts: null,
    isVerified: false,
    isBusiness: false,
    profilePicUrl: "",
    fetchStatus: "blocked",
    fetchNote: "Fetching profile from Instagram…",
  };

  // Primary: Instagram's own web_profile_info API (same endpoint the website uses)
  let bestExtract: Partial<InstagramProfileData> = {};
  try {
    const apiData = await fetchInstagramViaWebApi(parsed.username);
    if (apiData) bestExtract = apiData;
  } catch {
    // fall through to HTML scraping
  }

  // Fallback: scrape public HTML / embed metadata
  if (!bestExtract.biography) {
    const htmlExtract = await fetchFromHtmlEndpoints(parsed.username);
    bestExtract = mergeExtract(bestExtract, htmlExtract);
  }

  const biography = parsed.bioOverride || bestExtract.biography || "";
  const displayName = cleanInstagramDisplayName(
    bestExtract.displayName ?? base.displayName,
    parsed.username
  );

  const hasBio = biography.length > 0;
  const hasStats = hasUsefulStats(bestExtract);

  let fetchStatus: InstagramProfileData["fetchStatus"] = "blocked";
  let fetchNote = "Could not load profile from Instagram. Check the username or try again in a minute.";

  if (hasBio && hasStats) {
    fetchStatus = "full";
    fetchNote = parsed.bioOverride
      ? "Bio from your input + stats from Instagram."
      : "Full profile loaded — bio, stats, and link from Instagram.";
  } else if (hasBio) {
    fetchStatus = "partial";
    fetchNote = parsed.bioOverride
      ? "Bio from your input — follower stats unavailable."
      : "Bio loaded from Instagram — follower stats unavailable.";
  } else if (hasStats || displayName !== formatDisplayName(parsed.username)) {
    fetchStatus = "partial";
    fetchNote =
      "Partial data only — Instagram may be rate-limiting this request. Wait 60 seconds and try again.";
  }

  return {
    ...base,
    ...bestExtract,
    displayName,
    biography,
    fetchStatus,
    fetchNote,
  };
}

async function fetchFromHtmlEndpoints(username: string): Promise<Partial<InstagramProfileData>> {
  const profileUrl = `https://www.instagram.com/${username}/`;
  const endpoints = [
    profileUrl,
    `https://www.instagram.com/${username}/embed/`,
    `${profileUrl}?__a=1&__d=dis`,
  ];

  let bestExtract: Partial<InstagramProfileData> = {};

  for (const endpoint of endpoints) {
    try {
      const { html, status } = await fetchWithTimeout(endpoint, 12000, BROWSER_HEADERS);
      if (status >= 400 || html.length < 100) continue;
      if (/accounts\/login/i.test(html) && !/"biography"/.test(html)) continue;

      const extracted = extractFromHtml(html, username);
      bestExtract = mergeExtract(bestExtract, extracted);

      if (extracted.biography) break;
    } catch {
      continue;
    }
  }

  return bestExtract;
}

function mergeExtract(
  a: Partial<InstagramProfileData>,
  b: Partial<InstagramProfileData>
): Partial<InstagramProfileData> {
  return {
    displayName: b.displayName || a.displayName,
    biography: b.biography || a.biography,
    externalUrl: b.externalUrl || a.externalUrl,
    followers: b.followers ?? a.followers,
    following: b.following ?? a.following,
    posts: b.posts ?? a.posts,
    profilePicUrl: b.profilePicUrl || a.profilePicUrl,
    isVerified: b.isVerified ?? a.isVerified,
    isBusiness: b.isBusiness ?? a.isBusiness,
  };
}

function hasUsefulStats(data: Partial<InstagramProfileData>): boolean {
  return data.followers != null || data.posts != null;
}

function extractFromHtml(html: string, username: string): Partial<InstagramProfileData> {
  const result: Partial<InstagramProfileData> = {};

  const rawTitle =
    extractMeta(html, "og:title") ||
    extractMeta(html, "twitter:title") ||
    extractHtmlTitle(html) ||
    "";

  if (rawTitle) {
    result.displayName = cleanInstagramDisplayName(rawTitle, username);
  }

  const ogDesc = extractMeta(html, "og:description") || extractMeta(html, "description") || "";
  const parsedDesc = parseInstagramMetaDescription(ogDesc, username);
  if (parsedDesc.biography) result.biography = parsedDesc.biography;
  if (parsedDesc.followers != null) result.followers = parsedDesc.followers;
  if (parsedDesc.following != null) result.following = parsedDesc.following;
  if (parsedDesc.posts != null) result.posts = parsedDesc.posts;

  result.profilePicUrl = extractMeta(html, "og:image") || "";

  const jsonBio = html.match(/"biography"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1];
  if (jsonBio) {
    const decoded = decodeJsonString(jsonBio);
    if (decoded.trim()) result.biography = decoded;
  }

  const jsonName = html.match(/"full_name"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1];
  if (jsonName) {
    const decoded = decodeJsonString(jsonName);
    if (decoded.trim()) result.displayName = cleanInstagramDisplayName(decoded, username);
  }

  const followerMatch = html.match(/"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
  if (followerMatch) result.followers = parseInt(followerMatch[1], 10);

  const followingMatch = html.match(/"edge_follow"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
  if (followingMatch) result.following = parseInt(followingMatch[1], 10);

  const postsMatch = html.match(/"edge_owner_to_timeline_media"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
  if (postsMatch) result.posts = parseInt(postsMatch[1], 10);

  const externalMatch = html.match(/"external_url"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1];
  if (externalMatch) result.externalUrl = decodeJsonString(externalMatch);

  result.isVerified = /"is_verified"\s*:\s*true/.test(html);
  result.isBusiness =
    /"is_business_account"\s*:\s*true/.test(html) ||
    /"is_professional_account"\s*:\s*true/.test(html);

  return result;
}

export function cleanInstagramDisplayName(raw: string, username: string): string {
  let name = decodeHtmlEntities(raw).trim();

  name = name.replace(/\s*\(@[^)]+\).*/i, "");
  name = name.replace(/\s*[•·|]\s*Instagram photos and videos.*$/i, "");
  name = name.replace(/\s+on Instagram.*$/i, "");
  name = name.replace(/\s*[\u2022\u00b7•]\s*Instagram.*$/i, "");
  name = name.replace(/\s*-\s*Instagram.*$/i, "");
  name = name.trim();

  if (!name || /^instagram$/i.test(name) || /instagram photos and videos/i.test(name)) {
    return formatDisplayName(username);
  }

  if (name.length > 50) {
    const pipe = name.indexOf("|");
    if (pipe > 0 && pipe < 40) name = name.slice(0, pipe).trim();
    else name = name.slice(0, 40).trim();
  }

  return name;
}

function extractHtmlTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decodeHtmlEntities(m[1]);
  }
  return null;
}

function parseInstagramMetaDescription(desc: string, username: string): Partial<InstagramProfileData> {
  if (!desc) return {};

  const statsMatch = desc.match(
    /([\d,.]+[KkMm]?)\s+Followers,\s*([\d,.]+[KkMm]?)\s+Following,\s*([\d,.]+[KkMm]?)\s+Posts/i
  );

  const result: Partial<InstagramProfileData> = {};

  if (statsMatch) {
    result.followers = parseCount(statsMatch[1]);
    result.following = parseCount(statsMatch[2]);
    result.posts = parseCount(statsMatch[3]);
  }

  const bioFromDesc = desc
    .replace(/^[\d,.]+[KkMm]?\s+Followers.*?Posts\s*[-–—]\s*/i, "")
    .replace(/See Instagram photos and videos from .+$/i, "")
    .replace(new RegExp(`\\(@${username}\\)`, "i"), "")
    .trim();

  if (
    bioFromDesc &&
    bioFromDesc.length > 3 &&
    !/^see instagram/i.test(bioFromDesc) &&
    !/^\d+[KkMm]?\s+Followers/i.test(bioFromDesc)
  ) {
    result.biography = bioFromDesc;
  }

  return result;
}

function parseCount(s: string): number {
  const cleaned = s.replace(/,/g, "").trim();
  if (/k/i.test(cleaned)) return Math.round(parseFloat(cleaned) * 1000);
  if (/m/i.test(cleaned)) return Math.round(parseFloat(cleaned) * 1000000);
  return parseInt(cleaned, 10) || 0;
}

function formatDisplayName(username: string): string {
  return username.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function decodeJsonString(s: string): string {
  return decodeHtmlEntities(s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
}

export function formatFollowerCount(n: number | null): string {
  if (n == null) return "Unknown";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function profileBrandName(profile: InstagramProfileData): string {
  const name = profile.displayName.split("|")[0].trim();
  return name || formatDisplayName(profile.username);
}
