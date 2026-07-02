import type { InputType } from "@/lib/types";

const APP_PATTERNS = [
  /apps\.apple\.com/i,
  /play\.google\.com\/store\/apps/i,
  /appstore\.com/i,
];

const SOCIAL_PATTERNS = [
  /twitter\.com/i,
  /x\.com/i,
  /linkedin\.com/i,
  /instagram\.com/i,
  /facebook\.com/i,
  /fb\.com/i,
  /tiktok\.com/i,
  /youtube\.com/i,
  /threads\.net/i,
  /pinterest\.com/i,
];

export function detectInputType(input: string): InputType {
  const trimmed = input.trim();

  if (APP_PATTERNS.some((p) => p.test(trimmed))) return "app";
  if (SOCIAL_PATTERNS.some((p) => p.test(trimmed))) return "social";

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (APP_PATTERNS.some((p) => p.test(url.href))) return "app";
    if (SOCIAL_PATTERNS.some((p) => p.test(url.href))) return "social";
    return "url";
  } catch {
    // Not a URL — treat as business text or social post content
    if (looksLikeSocialPost(trimmed)) return "social";
    return "business";
  }
}

function looksLikeSocialPost(text: string): boolean {
  const hasHashtags = /#\w+/.test(text);
  const hasMentions = /@\w+/.test(text);
  const isShort = text.length < 500;
  const hasEmojis = /[\u{1F300}-\u{1FAFF}]/u.test(text);
  return (hasHashtags || hasMentions) && (isShort || hasEmojis);
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
