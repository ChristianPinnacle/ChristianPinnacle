import { fetchWithTimeout } from "@/lib/utils";

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

/** Profile URL or @handle, optional bio after | or — */
export function parseInstagramInput(input: string): ParsedInstagramInput | null {
  const trimmed = input.trim();

  // @username with optional bio
  const atMatch = trimmed.match(/^@([a-zA-Z0-9._]{1,30})(?:\s*[|—–-]\s*(.+))?$/);
  if (atMatch) {
    const username = atMatch[1].toLowerCase();
    return {
      username,
      profileUrl: `https://www.instagram.com/${username}/`,
      bioOverride: atMatch[2]?.trim(),
    };
  }

  // URL with optional bio appended
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
    fetchNote: "",
  };

  if (parsed.bioOverride) {
    base.fetchStatus = "partial";
    base.fetchNote = "Bio provided in input — add stats after | for deeper analysis: followers, link, etc.";
  }

  const endpoints = [
    parsed.profileUrl,
    `${parsed.profileUrl}?__a=1&__d=dis`,
    `https://www.instagram.com/${parsed.username}/embed/`,
  ];

  for (const endpoint of endpoints) {
    try {
      const { html, status } = await fetchWithTimeout(endpoint, 12000);
      if (status >= 400 || html.length < 100) continue;

      const extracted = extractFromHtml(html, parsed.username);
      if (extracted.biography || extracted.displayName !== formatDisplayName(parsed.username)) {
        return {
          ...base,
          ...extracted,
          biography: parsed.bioOverride || extracted.biography || base.biography,
          fetchStatus: extracted.biography ? "full" : "partial",
          fetchNote: extracted.biography
            ? "Profile data extracted from public page metadata."
            : "Limited data — paste your bio after the URL separated by | for a full audit.",
        };
      }
    } catch {
      continue;
    }
  }

  if (!parsed.bioOverride) {
    base.fetchNote =
      "Instagram blocked automated fetch. Paste your bio after the URL: instagram.com/username | Your bio text here";
  }

  return base;
}

function extractFromHtml(html: string, username: string): Partial<InstagramProfileData> {
  const result: Partial<InstagramProfileData> = {};

  // Open Graph
  result.displayName = extractMeta(html, "og:title")?.replace(/ \(@.*\).*$/i, "").replace(/ on Instagram.*$/i, "").trim()
    || extractMeta(html, "twitter:title")?.replace(/ \(@.*\).*$/i, "").trim()
    || formatDisplayName(username);

  const ogDesc = extractMeta(html, "og:description") || extractMeta(html, "description") || "";
  const parsed = parseInstagramMetaDescription(ogDesc, username);
  if (parsed.biography) result.biography = parsed.biography;
  if (parsed.followers != null) result.followers = parsed.followers;
  if (parsed.following != null) result.following = parsed.following;
  if (parsed.posts != null) result.posts = parsed.posts;

  result.profilePicUrl = extractMeta(html, "og:image") || "";

  // JSON embedded in script tags
  const jsonBio = html.match(/"biography"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1];
  if (jsonBio) result.biography = decodeJsonString(jsonBio);

  const jsonName = html.match(/"full_name"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1];
  if (jsonName) result.displayName = decodeJsonString(jsonName);

  const followerMatch = html.match(/"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
  if (followerMatch) result.followers = parseInt(followerMatch[1], 10);

  const followingMatch = html.match(/"edge_follow"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
  if (followingMatch) result.following = parseInt(followingMatch[1], 10);

  const postsMatch = html.match(/"edge_owner_to_timeline_media"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
  if (postsMatch) result.posts = parseInt(postsMatch[1], 10);

  const externalMatch = html.match(/"external_url"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1];
  if (externalMatch) result.externalUrl = decodeJsonString(externalMatch);

  result.isVerified = /"is_verified"\s*:\s*true/.test(html);
  result.isBusiness = /"is_business_account"\s*:\s*true/.test(html) || /"is_professional_account"\s*:\s*true/.test(html);

  return result;
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

  // "1,234 Followers, 567 Following, 89 Posts - See Instagram photos and videos from Name (@user)"
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

  if (bioFromDesc && bioFromDesc.length > 3 && !/^see instagram/i.test(bioFromDesc)) {
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
  return s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function formatFollowerCount(n: number | null): string {
  if (n == null) return "Unknown";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}
