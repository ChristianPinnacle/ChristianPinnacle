import type { AnalysisReport, AnalysisSection, ScoreMetric, CopySolution } from "@/lib/types";
import { clamp, generateId } from "@/lib/utils";
import {
  parseInstagramInput,
  fetchInstagramProfile,
  formatFollowerCount,
  type InstagramProfileData,
  type InstagramPost,
} from "@/lib/analyzers/instagram-profile";
import { runMarketingAudit, enrichReportWithAudit } from "@/lib/intelligence/audit";

export async function analyzeInstagramProfile(input: string): Promise<AnalysisReport> {
  const analyzedAt = new Date().toISOString();
  const parsed = parseInstagramInput(input);

  if (!parsed) {
    return buildInvalidInputReport(input, analyzedAt);
  }

  const profile = await fetchInstagramProfile(parsed);
  const niche = detectProfileNiche(profile);

  const bioScore = scoreBio(profile);
  const ctaScore = scoreBioCTA(profile.biography);
  const nicheScore = scoreNicheClarity(profile);
  const linkScore = scoreLinkStrategy(profile);
  const usernameScore = scoreUsername(profile.username);
  const postScore = scorePostContent(profile.recentPosts);
  const overallScore = Math.round(
    (bioScore * 1.5 + ctaScore * 1.5 + nicheScore + linkScore + usernameScore + postScore) / 6.5
  );

  const scores: ScoreMetric[] = [
    { label: "Bio & Offer", score: bioScore, description: "Clarity of bio and value proposition" },
    { label: "CTA & DM Funnel", score: ctaScore, description: "Comment-to-DM or clear next step in bio" },
    { label: "Niche Clarity", score: nicheScore, description: "Topic clarity for 2026 algorithm" },
    { label: "Link Strategy", score: linkScore, description: "Link in bio vs DM-first strategy" },
    { label: "Post Content", score: postScore, description: "Hook quality, CTA usage, content mix" },
    { label: "Username", score: usernameScore, description: "Handle professionalism and searchability" },
  ];

  const solutions = generateProfileSolutions(profile, niche, { bioScore, ctaScore, linkScore });

  const sections: AnalysisSection[] = [
    buildOverviewSection(profile, niche, overallScore),
    buildBioSection(profile, bioScore, ctaScore),
    buildPostsSection(profile, niche),
    buildAlgorithmSection(profile, niche),
    buildStrategySection(profile, niche),
  ];

  const baseReport: AnalysisReport = {
    id: generateId(),
    inputType: "instagram_profile",
    detectedType: "instagram_profile",
    title: `@${profile.username}`,
    subtitle: `${profile.displayName} · ${formatFollowerCount(profile.followers)} followers`,
    analyzedAt,
    input,
    overallScore,
    scores,
    sections,
    actionItems: solutions.map(s => ({ priority: s.priority, action: `${s.label}: ${s.problem}` })),
    solutions,
  };

  const auditText = [
    profile.displayName,
    profile.biography,
    profile.externalUrl,
    ...profile.recentPosts.map(p => p.caption),
  ].join("\n");

  const audit = runMarketingAudit(auditText, "instagram_profile", {
    url: profile.profileUrl,
    title: `@${profile.username} — ${profile.displayName}`,
    description: profile.biography,
    platform: "Instagram",
  });

  const enriched = enrichReportWithAudit(baseReport, audit);
  return {
    ...enriched,
    solutions: dedupe([...solutions, ...(enriched.solutions ?? [])]).slice(0, 12),
  };
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function buildOverviewSection(
  profile: InstagramProfileData,
  niche: { label: string; keyword: string },
  overallScore: number,
): AnalysisSection {
  return {
    id: "overview",
    title: `@${profile.username} — Profile Overview`,
    category: "overview",
    summary: `@${profile.username} (${profile.displayName}) — ${overallScore}/100. ${niche.label}. ${profile.fetchNote}`,
    details: [
      `Handle: @${profile.username}`,
      `Display name: ${profile.displayName}`,
      profile.biography ? `Bio: "${profile.biography}"` : "Bio: not loaded",
      `Followers: ${formatFollowerCount(profile.followers)} · Following: ${formatFollowerCount(profile.following)} · Posts: ${profile.posts ?? "?"}`,
      profile.externalUrl ? `Link in bio: ${profile.externalUrl}` : "No external link detected",
      profile.isBusiness ? "Account type: Business/Creator ✓" : "Account type: Personal — switch to Creator for insights",
      profile.recentPosts.length > 0
        ? `Recent posts analysed: ${profile.recentPosts.length}`
        : "Recent posts: unavailable",
    ],
    metrics: [
      { label: "Followers", value: formatFollowerCount(profile.followers) },
      { label: "Posts", value: profile.posts != null ? String(profile.posts) : "?" },
      { label: "Bio chars", value: `${profile.biography.length}/150` },
      { label: "Posts loaded", value: String(profile.recentPosts.length) },
    ],
  };
}

function buildBioSection(
  profile: InstagramProfileData,
  bioScore: number,
  ctaScore: number,
): AnalysisSection {
  const bio = profile.biography;
  const details: string[] = bio
    ? [
        `Current bio (${bio.length}/150 chars): "${bio}"`,
        `Line breaks: ${bio.split(/\n/).length} — aim for 3 short lines`,
        bio.length > 150 ? "⚠ Over 150 chars — Instagram will truncate" : "Length is within limit ✓",
        !/\b(DM|comment|message|👇|link)\b/i.test(bio)
          ? "⚠ No CTA — add a DM keyword as the last line"
          : "CTA detected ✓",
        /link in bio/i.test(bio) && !/\b(DM|comment \w+)\b/i.test(bio)
          ? "Only 'link in bio' — add comment-to-DM (converts 12–25% vs 1.5–3%)"
          : "",
      ].filter(Boolean)
    : [
        "Bio not loaded — Instagram may be rate-limiting.",
        "Wait 60 seconds and retry, or append your bio: @handle | your bio text",
      ];

  return {
    id: "bio",
    title: "Bio Analysis",
    category: "content",
    summary: bioScore >= 70
      ? `@${profile.username}'s bio communicates value — sharpen the DM CTA next.`
      : `@${profile.username}'s bio is the #1 fix — add a specific outcome + DM keyword.`,
    details,
    highlights: [
      bioScore >= 70
        ? { type: "positive" as const, text: "Bio has value language" }
        : { type: "negative" as const, text: "Bio needs a specific outcome (e.g. '12 weeks', 'busy adults')" },
      ctaScore >= 70
        ? { type: "positive" as const, text: "CTA present in bio ✓" }
        : { type: "negative" as const, text: "No DM keyword — add 'Comment COACH below' as last bio line" },
    ],
  };
}

function buildPostsSection(
  profile: InstagramProfileData,
  niche: { label: string; keyword: string },
): AnalysisSection {
  const posts = profile.recentPosts;

  if (posts.length === 0) {
    return {
      id: "posts",
      title: "Recent Posts",
      category: "content",
      summary: "No recent posts could be loaded from Instagram's API.",
      details: [
        "Instagram's API returns up to 12 recent posts.",
        "If running from a cloud/shared IP, Instagram may block this request.",
        "Run the app locally on your home network for full post analysis.",
      ],
    };
  }

  const reels = posts.filter(p => p.isVideo);
  const images = posts.filter(p => !p.isVideo);
  const withCTA = posts.filter(p => /\b(DM|comment|link in bio|👇|⬇️)\b/i.test(p.caption));
  const withHook = posts.filter(p => hasStrongHook(p.caption));
  const withHashtags = posts.filter(p => /#\w+/.test(p.caption));
  const avgLikes = avg(posts.map(p => p.likes));
  const avgComments = avg(posts.map(p => p.comments));

  const postDetails: string[] = [
    `Posts analysed: ${posts.length} most recent`,
    `Content mix: ${reels.length} Reels / ${images.length} photos & carousels`,
    `Posts with DM/CTA: ${withCTA.length}/${posts.length} — ${withCTA.length < posts.length * 0.6 ? "⚠ add CTA to more posts" : "✓ good"}`,
    `Posts with strong hook: ${withHook.length}/${posts.length}`,
    `Posts with hashtags: ${withHashtags.length}/${posts.length}`,
    avgLikes != null ? `Avg likes: ${Math.round(avgLikes).toLocaleString()}` : "",
    avgComments != null ? `Avg comments: ${Math.round(avgComments).toLocaleString()}` : "",
    reels.length < images.length
      ? `⚠ Only ${reels.length} Reels — 2026 algorithm rewards Reels 3–5× more than static posts`
      : "Reels-heavy content mix ✓",
  ].filter(Boolean);

  // Top and bottom performing posts
  const sorted = [...posts]
    .filter(p => p.likes != null)
    .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));

  if (sorted.length > 0) {
    const top = sorted[0];
    postDetails.push(`Best post: ${top.likes?.toLocaleString()} likes — ${top.url}`);
    if (top.caption) postDetails.push(`Caption: "${top.caption.slice(0, 100)}${top.caption.length > 100 ? "…" : ""}"`);
  }

  // Hooks audit — show captions that are missing hooks
  const noHook = posts.filter(p => p.caption && !hasStrongHook(p.caption)).slice(0, 3);
  if (noHook.length > 0) {
    postDetails.push("Posts missing scroll-stopping hook (first line):");
    noHook.forEach(p => {
      const first = p.caption.split("\n")[0].slice(0, 80);
      postDetails.push(`  • "${first}…" — rewrite with mirror/myth-bust/POV hook`);
    });
  }

  const highlights = [
    withCTA.length >= posts.length * 0.7
      ? { type: "positive" as const, text: `${withCTA.length}/${posts.length} posts have a CTA ✓` }
      : { type: "negative" as const, text: `Only ${withCTA.length}/${posts.length} posts have a CTA — add "Comment ${niche.keyword}" to each` },
    reels.length >= 2
      ? { type: "positive" as const, text: `${reels.length} Reels in recent posts ✓` }
      : { type: "negative" as const, text: "Low Reels count — Reels drive 3–5× more reach in 2026" },
    withHook.length >= posts.length * 0.5
      ? { type: "positive" as const, text: `${withHook.length}/${posts.length} posts have a strong opening hook ✓` }
      : { type: "negative" as const, text: `${posts.length - withHook.length} posts lack a scroll-stopping first line` },
  ];

  return {
    id: "posts",
    title: `Recent Posts Audit (${posts.length} posts)`,
    category: "content",
    summary: `${reels.length} Reels, ${images.length} static. ${withCTA.length}/${posts.length} have a CTA. ${withHook.length}/${posts.length} have a strong hook.`,
    details: postDetails,
    highlights,
  };
}

function buildAlgorithmSection(
  profile: InstagramProfileData,
  niche: { label: string },
): AnalysisSection {
  const posts = profile.recentPosts;
  const reelRatio = posts.length > 0 ? posts.filter(p => p.isVideo).length / posts.length : 0;

  return {
    id: "engagement",
    title: "Growth & Algorithm (2026)",
    category: "engagement",
    summary: getAlgorithmSummary(profile, niche),
    details: [
      `Niche: "${niche.label}" — keep 70%+ of posts in this topic`,
      `Reels ratio: ${Math.round(reelRatio * 100)}% — target 50%+ for max reach`,
      "Saves + DM shares beat likes for 2026 reach",
      "Comment-to-DM converts 12–25% vs 1.5–3% for link-in-bio",
      "Reply to DMs within 5 min — Instagram shows your account to more people",
      "Post daily Stories: proof → tip → DM invite",
      profile.followers != null && profile.following != null && profile.following > 0
        ? `Follow ratio: ${(profile.followers / (profile.following || 1)).toFixed(1)}:1 — above 3:1 signals authority`
        : "",
    ].filter(Boolean),
  };
}

function buildStrategySection(
  profile: InstagramProfileData,
  niche: { label: string; keyword: string },
): AnalysisSection {
  return {
    id: "strategy",
    title: "Profile Optimisation Plan",
    category: "strategy",
    summary: `For @${profile.username}: Bio → Posts → Highlights → DM system.`,
    details: [
      `Name field: add "| ${niche.label.split(" ")[0]} Coach" for search (e.g. "Chris | Fitness Coach")`,
      "Highlights: RESULTS · HOW IT WORKS · FREE GUIDE · FAQ · ABOUT ME",
      `Pin 3 posts: (1) Best client result with numbers  (2) 'Work with me' carousel  (3) Top Reel with "Comment ${niche.keyword}"`,
      "Weekly target: 2 carousels + 2 Reels + daily Stories",
      "Use ManyChat to auto-DM when someone comments your keyword",
    ],
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scorePostContent(posts: InstagramPost[]): number {
  if (posts.length === 0) return 40; // neutral if no data
  let score = 40;
  const reels = posts.filter(p => p.isVideo).length;
  const withCTA = posts.filter(p => /\b(DM|comment|link|👇|⬇️)\b/i.test(p.caption)).length;
  const withHook = posts.filter(p => hasStrongHook(p.caption)).length;

  score += Math.min(20, Math.round((reels / posts.length) * 20));
  score += Math.min(25, Math.round((withCTA / posts.length) * 25));
  score += Math.min(15, Math.round((withHook / posts.length) * 15));
  return clamp(score, 0, 100);
}

function hasStrongHook(caption: string): boolean {
  if (!caption) return false;
  const first = caption.split("\n")[0];
  return (
    /\?/.test(first) ||
    /\b(stop|mistake|secret|truth|nobody|most people|you've been|POV:|if you)\b/i.test(first) ||
    /\b(\d+ (ways|tips|mistakes|reasons|things))\b/i.test(first) ||
    /\b(dropped|lost|gained|in \d+ weeks?)\b/i.test(first)
  );
}

function scoreBio(profile: InstagramProfileData): number {
  const bio = profile.biography;
  if (!bio) return 10;
  let score = 20;
  if (bio.length >= 50) score += 20;
  if (bio.length <= 150) score += 10;
  if (/\b(help|coach|transform|build|lose|gain|scale|online)\b/i.test(bio)) score += 15;
  if (/\b(\d+|%|kg|lbs|weeks?|clients?)\b/i.test(bio)) score += 15;
  if (!/\b(online coaching|fitness journey|living my best)\b/i.test(bio)) score += 10;
  return clamp(score, 0, 100);
}

function scoreBioCTA(bio: string): number {
  if (!bio) return 0;
  if (/\b(DM me|comment|message me|👇|⬇️)\b/i.test(bio)) return 90;
  if (/\b(book|apply|join|free|download|link in bio)\b/i.test(bio)) return 70;
  return 15;
}

function scoreNicheClarity(profile: InstagramProfileData): number {
  const text = `${profile.biography} ${profile.displayName}`.toLowerCase();
  let score = 20;
  if (/\b(coach|trainer|nutrition|macro|PT|online)\b/i.test(text)) score += 30;
  if (/\b(for|helping|specializ)\b/i.test(text)) score += 20;
  if (/\b(fitness|transformation|strength|fat loss|muscle)\b/i.test(text)) score += 20;
  if (profile.biography.split(/\n/).length <= 3) score += 10;
  return clamp(score, 0, 100);
}

function scoreLinkStrategy(profile: InstagramProfileData): number {
  if (/\b(DM me|comment \w+|message me)\b/i.test(profile.biography)) return 85;
  if (profile.externalUrl && !/linktr\.ee|beacons\.ai|stan\.store/i.test(profile.externalUrl)) return 70;
  if (profile.externalUrl) return 55;
  return 30;
}

function scoreUsername(username: string): number {
  let score = 50;
  if (username.length <= 20) score += 15;
  if (!/\d{4,}/.test(username)) score += 10;
  if (!/^(the|real|official|its)/i.test(username)) score += 10;
  if (/[._].*[._]/.test(username)) score -= 10;
  if (/\b(coach|fit|pt|nutrition|train|gym|health)/i.test(username)) score += 15;
  return clamp(score, 0, 100);
}

// ---------------------------------------------------------------------------
// Niche detection
// ---------------------------------------------------------------------------

function detectProfileNiche(profile: InstagramProfileData): { label: string; keyword: string } {
  const text = [
    profile.biography,
    profile.displayName,
    profile.username,
    ...profile.recentPosts.map(p => p.caption),
  ].join(" ").toLowerCase();

  if (/\b(coach|coaching|trainer|online coach)\b/.test(text))
    return { label: "Fitness coach / trainer", keyword: "COACH" };
  if (/\b(nutrition|macro|diet|meal prep)\b/.test(text))
    return { label: "Nutrition coaching", keyword: "MACROS" };
  if (/\b(PT|personal trainer|strength|hypertrophy|gym)\b/.test(text))
    return { label: "Personal training", keyword: "TRAIN" };
  if (/\b(agency|ads|marketing|leads|funnels)\b/.test(text))
    return { label: "Marketing / agency", keyword: "LEADS" };
  return { label: "Fitness / wellness", keyword: "READY" };
}

// ---------------------------------------------------------------------------
// Solutions
// ---------------------------------------------------------------------------

function generateProfileSolutions(
  profile: InstagramProfileData,
  niche: { label: string; keyword: string },
  scores: { bioScore: number; ctaScore: number; linkScore: number },
): CopySolution[] {
  const solutions: CopySolution[] = [];
  const brand = profile.displayName.split("|")[0].trim();
  const keyword = niche.keyword;
  const isCoach = /coach|trainer/i.test(niche.label);

  if (scores.bioScore < 80 || scores.ctaScore < 70) {
    solutions.push({
      label: "Bio rewrite",
      priority: "high",
      problem: profile.biography
        ? `Bio "${profile.biography.slice(0, 55)}${profile.biography.length > 55 ? "…" : ""}" is missing a specific outcome + DM trigger.`
        : `@${profile.username} bio not loaded — use the template below.`,
      placement: "Instagram → Edit profile → Bio",
      copy: isCoach
        ? `I help ${niche.label.toLowerCase()} clients get real results ⬇️\n\n🏋️ Custom programs · Macro coaching · Weekly check-ins\n\n👇 Comment "${keyword}" for my free starter plan`
        : `Fat loss & muscle for busy adults 🎯\n\nCustom nutrition + training that fits your life\n\n👇 DM "${keyword}" for my free 5-day plan`,
    });
  }

  solutions.push({
    label: "Name field",
    priority: "high",
    problem: `Name field missing search keywords — people search "fitness coach" not handles.`,
    placement: "Edit profile → Name (30 chars max)",
    copy: isCoach
      ? `${brand.slice(0, 14)} | Online Coach`
      : `${brand.slice(0, 14)} | Fat Loss Coach`,
  });

  if (scores.linkScore < 70) {
    solutions.push({
      label: "Link / DM strategy",
      priority: "high",
      problem: profile.externalUrl
        ? `${profile.externalUrl} — DM funnel converts 12–25% vs 1.5% for link clicks.`
        : "No conversion path in bio.",
      placement: "Bio last line + ManyChat automation",
      copy: `Add to bio: "👇 Comment ${keyword} for my free guide"\nSet ManyChat to auto-DM any comment containing "${keyword}".\n\nIf using a link: one destination only — free guide OR book a call. No Linktrees with 10 links.`,
    });
  }

  // Post-specific solutions based on what we found
  const posts = profile.recentPosts;
  if (posts.length > 0) {
    const noCtaPosts = posts.filter(p => !/\b(DM|comment|👇|link)\b/i.test(p.caption));
    if (noCtaPosts.length > posts.length * 0.4) {
      solutions.push({
        label: "Add CTA to posts",
        priority: "high",
        problem: `${noCtaPosts.length}/${posts.length} recent posts have no CTA — views don't convert to clients.`,
        placement: "Last line of every caption",
        copy: `End every caption with:\n\n"💬 Comment ${keyword} below and I'll DM you my free [guide/plan/resource]"\n\nor for Reels:\n"Comment ${keyword} for the full breakdown 👇"`,
      });
    }

    const noHookPosts = posts.filter(p => !hasStrongHook(p.caption));
    if (noHookPosts.length > posts.length * 0.5) {
      solutions.push({
        label: "Rewrite post hooks",
        priority: "high",
        problem: `${noHookPosts.length}/${posts.length} posts start with a weak first line — people scroll past before reading.`,
        placement: "First line of caption (before any line breaks)",
        copy: `Strong hook templates:\n• "Stop doing this if you want to [outcome]"\n• "You've been [action] for [time]. The scale hasn't moved. It's not your fault."\n• "3 reasons your [goal] isn't working (and it's not your diet)"\n• "POV: You finally stopped [mistake] and started [solution]"`,
      });
    }

    const reels = posts.filter(p => p.isVideo);
    if (reels.length < posts.length * 0.3) {
      solutions.push({
        label: "Post more Reels",
        priority: "medium",
        problem: `Only ${reels.length}/${posts.length} recent posts are Reels — Reels get 3–5× more reach.`,
        placement: "Aim for 2+ Reels per week",
        copy: `Reels formula:\n• 0–3s: hook on screen as text (mirror/problem)\n• 3–20s: show the contrast (before → after, wrong vs right)\n• 20–30s: give value or tease the result\n• End: "Comment ${keyword} for [resource]"\n\nRepurpose carousels as Reels — read slide 1 aloud as the hook.`,
      });
    }
  }

  solutions.push({
    label: "Story Highlights",
    priority: "medium",
    problem: `@${profile.username}'s Highlights should act as a silent sales page.`,
    placement: "Profile → Story Highlights",
    copy: `Create 5 Highlights:\n1. RESULTS — client before/afters with numbers\n2. HOW IT WORKS — your process in 3 steps\n3. FREE GUIDE — link or DM CTA\n4. FAQ — answer top 5 objections\n5. ABOUT — your story, credibility, proof`,
  });

  solutions.push({
    label: "Pinned posts (3)",
    priority: "medium",
    problem: "First 3 grid posts control first impressions — most accounts waste this.",
    placement: "Long press post → Pin",
    copy: `Pin these 3:\n1. Best client result with specific numbers (e.g. "Jake lost 14kg in 12 weeks")\n2. "How to work with me" carousel\n3. Your best Reel — ends with "Comment ${keyword}"`,
  });

  if (!profile.isBusiness) {
    solutions.push({
      label: "Switch to Creator account",
      priority: "medium",
      problem: "Personal account has no Insights, no contact button, and lower conversion.",
      placement: "Settings → Account → Switch to Professional Account → Creator",
      copy: `Category: Coach or Fitness Trainer.\nEnable: Contact email + Insights + Branded content.`,
    });
  }

  return solutions;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function avg(nums: (number | null)[]): number | null {
  const valid = nums.filter((n): n is number => n != null);
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

function dedupe(solutions: CopySolution[]): CopySolution[] {
  const seen = new Set<string>();
  return solutions.filter(s => {
    if (seen.has(s.label)) return false;
    seen.add(s.label);
    return true;
  });
}

function getAlgorithmSummary(profile: InstagramProfileData, niche: { label: string }): string {
  const postCount = profile.posts ?? 0;
  if (postCount < 9) {
    return `@${profile.username}: only ${postCount} posts — build grid to 9–12 before scaling Reels. Niche: ${niche.label}.`;
  }
  return `@${profile.username}: focus on "${niche.label}" — saves + DM shares drive reach in 2026.`;
}

function buildInvalidInputReport(input: string, analyzedAt: string): AnalysisReport {
  return {
    id: generateId(),
    inputType: "instagram_profile",
    detectedType: "instagram_profile",
    title: "Invalid Instagram input",
    subtitle: "Could not parse as a profile",
    analyzedAt,
    input,
    overallScore: 0,
    scores: [],
    sections: [{
      id: "error",
      title: "How to enter an Instagram profile",
      category: "overview",
      summary: "Enter just the handle — no URL or @ needed.",
      details: [
        "✓  coach_christianwilson",
        "✓  @coach_christianwilson",
        "✓  instagram.com/coach_christianwilson",
        "✗  instagram.com/p/…  (that's a post, not a profile)",
        "✗  instagram.com/reel/…",
      ],
    }],
    actionItems: [{ priority: "high", action: "Enter your Instagram handle and click Analyze" }],
  };
}
