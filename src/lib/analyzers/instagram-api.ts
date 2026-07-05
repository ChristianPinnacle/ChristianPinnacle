import type { InstagramProfileData } from "@/lib/analyzers/instagram-profile";
import { decodeHtmlEntities } from "@/lib/utils";

const IG_APP_ID = "936619743392459";

/** Chrome 119 UA — newer UAs can trigger "useragent mismatch" from Instagram */
const IG_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";

interface IgApiUser {
  username?: string;
  full_name?: string;
  biography?: string;
  external_url?: string;
  profile_pic_url_hd?: string;
  profile_pic_url?: string;
  is_verified?: boolean;
  is_business_account?: boolean;
  is_professional_account?: boolean;
  is_private?: boolean;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  edge_followed_by?: { count?: number };
  edge_follow?: { count?: number };
  edge_owner_to_timeline_media?: { count?: number };
  bio_links?: { url?: string }[];
  category_name?: string;
}

const API_HOSTS = ["i.instagram.com", "www.instagram.com"] as const;

export async function fetchInstagramViaWebApi(
  username: string
): Promise<Partial<InstagramProfileData> | null> {
  for (const host of API_HOSTS) {
    const result = await fetchFromHost(host, username);
    if (result) return result;
  }
  return null;
}

async function fetchFromHost(
  host: string,
  username: string
): Promise<Partial<InstagramProfileData> | null> {
  const profileUrl = `https://www.instagram.com/${username}/`;
  const apiUrl = `https://${host}/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(1500);

    try {
      const response = await fetch(apiUrl, {
        headers: {
          "User-Agent": IG_USER_AGENT,
          "X-IG-App-ID": IG_APP_ID,
          "X-Requested-With": "XMLHttpRequest",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: profileUrl,
          Origin: "https://www.instagram.com",
        },
        redirect: "follow",
      });

      if (response.status === 429) continue;
      if (response.status === 404) return null;
      if (!response.ok) continue;

      const json = (await response.json()) as { data?: { user?: IgApiUser | null } };
      const user = json?.data?.user;
      if (!user) return null;

      return mapApiUser(user, username);
    } catch {
      continue;
    }
  }

  return null;
}

function mapApiUser(user: IgApiUser, username: string): Partial<InstagramProfileData> {
  const followers = user.follower_count ?? user.edge_followed_by?.count ?? null;
  const following = user.following_count ?? user.edge_follow?.count ?? null;
  const posts = user.media_count ?? user.edge_owner_to_timeline_media?.count ?? null;

  const externalUrl =
    user.external_url ||
    user.bio_links?.find((l) => l.url)?.url ||
    "";

  return {
    username,
    profileUrl: `https://www.instagram.com/${username}/`,
    displayName: cleanDisplayName(user.full_name || "", username),
    biography: user.biography?.trim() || "",
    externalUrl,
    followers,
    following,
    posts,
    isVerified: user.is_verified ?? false,
    isBusiness: user.is_business_account ?? user.is_professional_account ?? false,
    profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url || "",
  };
}

function cleanDisplayName(raw: string, username: string): string {
  let name = decodeHtmlEntities(raw).trim();
  name = name.replace(/\s*\(@[^)]+\).*/i, "");
  name = name.replace(/\s*[•·|]\s*Instagram photos and videos.*$/i, "");
  name = name.replace(/\s+on Instagram.*$/i, "");
  name = name.trim();
  if (!name || /^instagram$/i.test(name)) {
    return username.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name.length > 50 ? name.slice(0, 50).trim() : name;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
