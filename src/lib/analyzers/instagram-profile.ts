/** Instagram profile fetcher.
 *
 * Primary path: i.instagram.com/api/v1/users/web_profile_info/ — Instagram's
 * own internal JSON endpoint, same one the website calls. Works from home IPs.
 * Returns profile fields + up to 12 recent posts in edge_owner_to_timeline_media.
 *
 * Fallback: HTML scraping / og:meta (partial data only).
 */

export interface ParsedInstagramInput {
  username: string;
  profileUrl: string;
  bioOverride?: string;
}

export interface InstagramPost {
  id: string;
  shortcode: string;
  isVideo: boolean;
  caption: string;
  likes: number | null;
  comments: number | null;
  views: number | null;   // video only
  timestamp: number | null;
  url: string;
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
  recentPosts: InstagramPost[];
  fetchStatus: "full" | "partial" | "blocked";
  fetchNote: string;
}

const RESERVED = new Set([
  "p","reel","reels","stories","explore","accounts","direct","tv",
  "about","legal","privacy","terms","api","developer","nametag",
]);

/** Accept: handle, @handle, instagram.com/handle, or full URL */
export function parseInstagramInput(input: string): ParsedInstagramInput | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // multi-line: first line = handle/URL, rest = bio override
  const lines = trimmed.split(/\n/).map(l => l.trim()).filter(Boolean);
  const firstLine = lines[0];
  const bioOverride = lines.length > 1 ? lines.slice(1).join("\n") : undefined;

  const parsed = parseSingleLine(firstLine);
  if (!parsed) return null;
  return bioOverride ? { ...parsed, bioOverride } : parsed;
}

function parseSingleLine(raw: string): ParsedInstagramInput | null {
  let text = raw.trim();

  // strip inline bio after | — —
  let bioOverride: string | undefined;
  const pipeSplit = text.match(/^(.+?)\s*[|—–]\s*(.+)$/);
  if (pipeSplit) {
    text = pipeSplit[1].trim();
    bioOverride = pipeSplit[2].trim();
  }

  // bare @handle
  const atMatch = text.match(/^@([a-zA-Z0-9._]{1,30})$/);
  if (atMatch) {
    const username = atMatch[1].toLowerCase();
    return { username, profileUrl: profileUrl(username), bioOverride };
  }

  // bare handle (no @ no URL) — letters/numbers/dots/underscores, no spaces
  if (/^[a-zA-Z0-9][a-zA-Z0-9._]{0,29}$/.test(text) && !text.includes(".com")) {
    const username = text.toLowerCase();
    return { username, profileUrl: profileUrl(username), bioOverride };
  }

  // instagram URL
  if (/instagram\.com/i.test(text)) {
    try {
      const url = new URL(text.startsWith("http") ? text : `https://${text}`);
      const parts = url.pathname.split("/").filter(Boolean);
      if (!parts.length) return null;
      if (RESERVED.has(parts[0].toLowerCase())) return null;
      if (parts[0] === "p" || parts[0] === "reel" || parts[0] === "reels") return null;
      const username = parts[0].toLowerCase().replace(/^@/, "");
      if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) return null;
      return { username, profileUrl: profileUrl(username), bioOverride };
    } catch { return null; }
  }

  return null;
}

function profileUrl(username: string) {
  return `https://www.instagram.com/${username}/`;
}

export function isInstagramProfileInput(input: string): boolean {
  return parseInstagramInput(input) !== null;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

const IG_APP_ID = "936619743392459";

/** User-agents that Instagram accepts. Chrome 119 avoids "useragent mismatch". */
const UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
];

export async function fetchInstagramProfile(parsed: ParsedInstagramInput): Promise<InstagramProfileData> {
  const { username, bioOverride } = parsed;

  const base: InstagramProfileData = {
    username,
    profileUrl: profileUrl(username),
    displayName: fmtDisplayName(username),
    biography: bioOverride ?? "",
    externalUrl: "",
    followers: null,
    following: null,
    posts: null,
    isVerified: false,
    isBusiness: false,
    profilePicUrl: "",
    recentPosts: [],
    fetchStatus: "blocked",
    fetchNote: "Instagram blocked this request. Run the app locally on your home network for best results.",
  };

  // Try the web_profile_info API on both hosts with multiple UAs
  const hosts = ["i.instagram.com", "www.instagram.com"];

  for (const host of hosts) {
    for (const ua of UAS) {
      const result = await tryApiEndpoint(host, username, ua, parsed.profileUrl);
      if (result) {
        const biography = bioOverride || result.biography || "";
        const hasBio = biography.length > 0;
        const hasStats = result.followers != null;
        const hasPosts = (result.recentPosts?.length ?? 0) > 0;

        return {
          ...base,
          ...result,
          biography,
          fetchStatus: hasBio && hasStats ? "full" : hasBio || hasStats ? "partial" : "blocked",
          fetchNote: hasBio && hasStats && hasPosts
            ? `Loaded: bio, ${formatFollowerCount(result.followers ?? null)} followers, ${result.recentPosts?.length ?? 0} recent posts.`
            : hasBio && hasStats
            ? `Loaded: bio and follower count. Recent posts unavailable.`
            : hasBio
            ? "Loaded bio. Follower stats unavailable."
            : hasStats
            ? "Loaded stats. Bio unavailable — Instagram may be rate-limiting. Try again in 60 seconds."
            : bioOverride
            ? "Using pasted bio. Instagram API was blocked — try again in 60s from your home network."
            : "Instagram blocked the request. Try again in 60 seconds, or paste your bio after the handle: @handle | bio text",
        };
      }
      // small delay between attempts
      await sleep(300);
    }
  }

  // Fallback: HTML og:meta
  const htmlResult = await tryHtmlFallback(username);
  if (htmlResult) {
    const biography = bioOverride || htmlResult.biography || "";
    return {
      ...base,
      ...htmlResult,
      biography,
      fetchStatus: biography ? "partial" : "blocked",
      fetchNote: biography
        ? "Partial data from public metadata."
        : "Instagram is blocking automated requests from this server. Run locally on your home network.",
    };
  }

  if (bioOverride) {
    base.biography = bioOverride;
    base.fetchStatus = "partial";
    base.fetchNote = "Using pasted bio. Run the app locally for full profile + post data.";
  }

  return base;
}

async function tryApiEndpoint(
  host: string,
  username: string,
  ua: string,
  referer: string,
): Promise<Partial<InstagramProfileData> | null> {
  const url = `https://${host}/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  try {
    const res = await fetchTimeout(url, 12000, {
      "User-Agent": ua,
      "X-IG-App-ID": IG_APP_ID,
      "X-Requested-With": "XMLHttpRequest",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: referer,
      Origin: "https://www.instagram.com",
    });

    if (res.status === 429 || res.status === 401 || res.status === 403) return null;
    if (res.status === 404) return null;
    if (!res.ok || !res.body) return null;

    const json = JSON.parse(res.body) as {
      data?: { user?: Record<string, unknown> | null };
    };
    const user = json?.data?.user;
    if (!user || typeof user !== "object") return null;

    return parseApiUser(user, username);
  } catch {
    return null;
  }
}

function parseApiUser(u: Record<string, unknown>, username: string): Partial<InstagramProfileData> {
  const get = <T>(k: string) => u[k] as T | undefined;
  const getNum = (k: string): number | null => {
    const v = u[k];
    if (typeof v === "number") return v;
    return null;
  };

  const followers = getNum("follower_count")
    ?? (u["edge_followed_by"] as {count?:number}|undefined)?.count
    ?? null;
  const following = getNum("following_count")
    ?? (u["edge_follow"] as {count?:number}|undefined)?.count
    ?? null;
  const mediaCount = getNum("media_count")
    ?? (u["edge_owner_to_timeline_media"] as {count?:number}|undefined)?.count
    ?? null;

  const bioLinks = u["bio_links"] as {url?:string}[] | undefined;
  const externalUrl = get<string>("external_url")
    || bioLinks?.find(l => l.url)?.url
    || "";

  const timeline = u["edge_owner_to_timeline_media"] as {
    edges?: { node: Record<string, unknown> }[]
  } | undefined;

  const recentPosts: InstagramPost[] = (timeline?.edges ?? []).map(e => parsePostNode(e.node));

  const biography = (get<string>("biography") ?? "").trim();
  const fullName = (get<string>("full_name") ?? "").trim();

  return {
    username,
    profileUrl: profileUrl(username),
    displayName: cleanDisplayName(fullName, username),
    biography,
    externalUrl,
    followers,
    following,
    posts: mediaCount,
    isVerified: get<boolean>("is_verified") ?? false,
    isBusiness: (get<boolean>("is_business_account") ?? get<boolean>("is_professional_account") ?? false),
    profilePicUrl: get<string>("profile_pic_url_hd") || get<string>("profile_pic_url") || "",
    recentPosts,
  };
}

function parsePostNode(node: Record<string, unknown>): InstagramPost {
  const get = <T>(k: string) => node[k] as T | undefined;
  const captionEdges = (node["edge_media_to_caption"] as {edges?:{node:{text?:string}}[]}|undefined)?.edges ?? [];
  const caption = captionEdges[0]?.node?.text ?? get<string>("accessibility_caption") ?? "";
  const shortcode = get<string>("shortcode") ?? String(get<string>("id") ?? "");
  return {
    id: get<string>("id") ?? "",
    shortcode,
    isVideo: get<boolean>("is_video") ?? false,
    caption: caption.trim(),
    likes: (node["edge_liked_by"] as {count?:number}|undefined)?.count ?? null,
    comments: (node["edge_media_to_comment"] as {count?:number}|undefined)?.count ?? null,
    views: get<number>("video_view_count") ?? null,
    timestamp: get<number>("taken_at_timestamp") ?? null,
    url: shortcode ? `https://www.instagram.com/p/${shortcode}/` : "",
  };
}

async function tryHtmlFallback(username: string): Promise<Partial<InstagramProfileData> | null> {
  const url = `https://www.instagram.com/${username}/`;
  try {
    const res = await fetchTimeout(url, 10000, {
      "User-Agent": UAS[0],
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    });
    if (!res.ok || !res.body) return null;
    const html = res.body;

    const bio = html.match(/"biography"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1];
    const name = html.match(/"full_name"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1];
    const followers = html.match(/"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/)?.[1];
    const posts = html.match(/"edge_owner_to_timeline_media"\s*:\s*\{\s*"count"\s*:\s*(\d+)/)?.[1];

    if (!bio && !name) return null;
    return {
      biography: bio ? decodeJsonStr(bio) : "",
      displayName: name ? cleanDisplayName(decodeJsonStr(name), username) : fmtDisplayName(username),
      followers: followers ? parseInt(followers, 10) : null,
      posts: posts ? parseInt(posts, 10) : null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

async function fetchTimeout(
  url: string,
  ms: number,
  headers: Record<string, string>,
): Promise<{ ok: boolean; status: number; body: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers, redirect: "follow" });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: "" };
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function cleanDisplayName(raw: string, username: string): string {
  let n = raw.trim()
    .replace(/\s*\(@[^)]+\).*/i, "")
    .replace(/\s*[•·]\s*Instagram.*/i, "")
    .replace(/\s+on Instagram.*/i, "")
    .trim();
  if (!n || /^instagram$/i.test(n)) return fmtDisplayName(username);
  return n.length > 50 ? n.slice(0, 50).trim() : n;
}

function fmtDisplayName(username: string) {
  return username.replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function decodeJsonStr(s: string) {
  return s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\").trim();
}

export function formatFollowerCount(n: number | null): string {
  if (n == null) return "Unknown";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
