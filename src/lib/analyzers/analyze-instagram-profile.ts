import type { AnalysisReport, AnalysisSection, ScoreMetric, CopySolution } from "@/lib/types";
import { clamp, generateId } from "@/lib/utils";
import {
  parseInstagramInput,
  fetchInstagramProfile,
  formatFollowerCount,
  type InstagramProfileData,
} from "@/lib/analyzers/instagram-profile";
import { runMarketingAudit, enrichReportWithAudit } from "@/lib/intelligence/audit";

export async function analyzeInstagramProfile(input: string): Promise<AnalysisReport> {
  const analyzedAt = new Date().toISOString();
  const parsed = parseInstagramInput(input);

  if (!parsed) {
    return buildInvalidInputReport(input, analyzedAt);
  }

  const profile = await fetchInstagramProfile(parsed);
  const auditText = buildAuditText(profile);
  const niche = detectProfileNiche(profile);

  const bioScore = scoreBio(profile);
  const ctaScore = scoreBioCTA(profile.biography);
  const nicheScore = scoreNicheClarity(profile);
  const linkScore = scoreLinkStrategy(profile);
  const usernameScore = scoreUsername(profile.username);
  const overallScore = Math.round((bioScore + ctaScore + nicheScore + linkScore + usernameScore) / 5);

  const scores: ScoreMetric[] = [
    { label: "Bio & Offer", score: bioScore, description: "Clarity of bio and value proposition" },
    { label: "CTA & DM Funnel", score: ctaScore, description: "Comment-to-DM or clear next step in bio" },
    { label: "Niche Clarity", score: nicheScore, description: "Topic clarity for 2026 algorithm" },
    { label: "Link Strategy", score: linkScore, description: "Link in bio vs DM-first strategy" },
    { label: "Username", score: usernameScore, description: "Handle professionalism and searchability" },
  ];

  const solutions = generateProfileSolutions(profile, niche, { bioScore, ctaScore, linkScore });

  const sections: AnalysisSection[] = [
    {
      id: "overview",
      title: `@${profile.username} — Profile Overview`,
      category: "overview",
      summary: `@${profile.username} (${profile.displayName}) — ${overallScore}/100 profile score. ${niche.label}. ${profile.fetchNote}`,
      details: [
        `Profile: ${profile.profileUrl}`,
        `Display name: ${profile.displayName}`,
        profile.biography
          ? `Bio: "${profile.biography}"`
          : "Bio: not detected — paste it after the URL: instagram.com/username | Your bio",
        `Followers: ${formatFollowerCount(profile.followers)} · Following: ${formatFollowerCount(profile.following)} · Posts: ${profile.posts ?? "?"}`,
        profile.externalUrl ? `Link in bio: ${profile.externalUrl}` : "No external link detected",
        profile.isBusiness ? "Account: Business/Creator ✓" : "Account: Switch to Creator for insights + contact buttons",
      ],
      metrics: [
        { label: "Followers", value: formatFollowerCount(profile.followers) },
        { label: "Posts", value: profile.posts != null ? String(profile.posts) : "?" },
        { label: "Bio Chars", value: `${profile.biography.length}/150` },
        { label: "Data", value: profile.fetchStatus },
      ],
    },
    {
      id: "bio",
      title: "Bio Analysis",
      category: "content",
      summary: bioScore >= 70
        ? `@${profile.username}'s bio communicates value — sharpen the DM CTA next.`
        : `@${profile.username}'s bio is the #1 fix — add outcome + DM keyword.`,
      details: analyzeBioDetails(profile),
      highlights: buildBioHighlights(profile, bioScore, ctaScore),
    },
    {
      id: "engagement",
      title: "Growth & Algorithm (2026)",
      category: "engagement",
      summary: getAlgorithmSummary(profile, niche),
      details: [
        `Niche: ${niche.label} — keep 70%+ of posts in this topic`,
        "Saves + DM shares beat likes for reach in 2026",
        "Comment-to-DM: 12–25% conversion vs 1.5–3% link-in-bio",
        "Reply to DMs within 5 minutes for max conversion",
        profile.followers != null && profile.following != null && profile.following > 0
          ? `Follow ratio: ${(profile.followers / profile.following).toFixed(1)}:1`
          : "",
      ].filter(Boolean),
    },
    {
      id: "strategy",
      title: "Profile Optimisation Plan",
      category: "strategy",
      summary: `For @${profile.username}: (1) Bio + DM keyword, (2) Highlights, (3) Pin 3 posts, (4) Content mix.`,
      details: [
        "Name field: add searchable keywords (e.g. '| Online Coach')",
        "Highlights: Results · How it works · Free guide · FAQ · About",
        "Pin 3: Best result · How to work with me · Top Reel with DM CTA",
      ],
    },
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
    actionItems: solutions.map((s) => ({ priority: s.priority, action: `${s.label}: ${s.problem}` })),
    solutions,
  };

  const audit = runMarketingAudit(auditText, "instagram_profile", {
    url: profile.profileUrl,
    title: `@${profile.username} — ${profile.displayName}`,
    description: profile.biography,
    platform: "Instagram",
  });

  const enriched = enrichReportWithAudit(baseReport, audit);
  return {
    ...enriched,
    solutions: dedupeSolutions([...solutions, ...(enriched.solutions ?? [])]).slice(0, 12),
  };
}

function dedupeSolutions(solutions: CopySolution[]): CopySolution[] {
  const seen = new Set<string>();
  return solutions.filter((s) => {
    if (seen.has(s.label)) return false;
    seen.add(s.label);
    return true;
  });
}

function buildAuditText(profile: InstagramProfileData): string {
  return [profile.displayName, profile.biography, profile.externalUrl, profile.username].join("\n");
}

function detectProfileNiche(profile: InstagramProfileData): { label: string; keyword: string } {
  const text = `${profile.biography} ${profile.displayName} ${profile.username}`.toLowerCase();
  if (/\b(coach|coaching|trainer|online coach|fitness business)\b/.test(text)) {
    return { label: "Fitness coach / trainer", keyword: "COACH" };
  }
  if (/\b(nutrition|macro|diet|meal)\b/.test(text)) {
    return { label: "Nutrition coaching", keyword: "MACROS" };
  }
  if (/\b(PT|personal trainer|strength|hypertrophy|gym)\b/.test(text)) {
    return { label: "Personal training", keyword: "TRAIN" };
  }
  if (/\b(agency|ads|marketing|leads)\b/.test(text)) {
    return { label: "Marketing / agency", keyword: "LEADS" };
  }
  return { label: "Fitness / wellness", keyword: "READY" };
}

function scoreBio(profile: InstagramProfileData): number {
  const bio = profile.biography;
  if (!bio) return 10;
  let score = 20;
  if (bio.length >= 50) score += 20;
  if (bio.length <= 150) score += 10;
  if (/\b(help|coach|transform|build|lose|gain|scale|online)\b/i.test(bio)) score += 15;
  if (/\b(I|my|we)\b/i.test(bio)) score += 10;
  if (/\b(\d+|%|kg|lbs|weeks?|clients?)\b/i.test(bio)) score += 15;
  if (!/\b(online coaching|fitness journey|living my best)\b/i.test(bio)) score += 10;
  return clamp(score, 0, 100);
}

function scoreBioCTA(bio: string): number {
  if (!bio) return 0;
  if (/\b(DM me|comment|message me|link below|👇|⬇️)\b/i.test(bio)) return 90;
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

function analyzeBioDetails(profile: InstagramProfileData): string[] {
  const bio = profile.biography;
  if (!bio) {
    return [`No bio detected for @${profile.username} — paste bio after URL: instagram.com/${profile.username} | Your bio text`];
  }
  const lines = [
    `Current bio (${bio.length}/150 chars): "${bio}"`,
    `Lines: ${bio.split(/\n/).length} — use line breaks every 1–2 sentences`,
  ];
  if (bio.length > 150) lines.push("⚠ Exceeds 150 characters — Instagram will truncate");
  if (!/\b(DM|comment|message|👇|link)\b/i.test(bio)) lines.push("Missing CTA — add DM keyword");
  if (/link in bio/i.test(bio) && !/\b(DM|comment \w+)\b/i.test(bio)) {
    lines.push("Only 'link in bio' — add comment-to-DM (12–25% vs 1.5–3% for coaches)");
  }
  return lines;
}

function buildBioHighlights(profile: InstagramProfileData, bioScore: number, ctaScore: number) {
  return [
    bioScore >= 70
      ? { type: "positive" as const, text: "Bio has value language" }
      : { type: "negative" as const, text: `@${profile.username}'s bio needs a specific outcome` },
    ctaScore >= 70
      ? { type: "positive" as const, text: "CTA in bio ✓" }
      : { type: "negative" as const, text: "No DM keyword — biggest profile conversion gap" },
  ];
}

function getAlgorithmSummary(profile: InstagramProfileData, niche: { label: string }): string {
  const posts = profile.posts ?? 0;
  if (posts < 9) {
    return `@${profile.username}: ${posts} posts — grid looks thin. Post 9–12 before scaling Reels. Topic: ${niche.label}.`;
  }
  return `@${profile.username}: Stay focused on "${niche.label}" — saves + DM shares drive reach in 2026.`;
}

function generateProfileSolutions(
  profile: InstagramProfileData,
  niche: { label: string; keyword: string },
  scores: { bioScore: number; ctaScore: number; linkScore: number }
): CopySolution[] {
  const solutions: CopySolution[] = [];
  const brand = profile.displayName;
  const keyword = niche.keyword;
  const isCoach = /coach|trainer/i.test(niche.label);

  if (scores.bioScore < 80 || scores.ctaScore < 70) {
    solutions.push({
      label: "Bio rewrite",
      priority: "high",
      problem: profile.biography
        ? `Bio "${profile.biography.slice(0, 55)}…" missing outcome + DM trigger.`
        : `@${profile.username} — no bio detected. Use template below.`,
      placement: "Instagram → Edit profile → Bio",
      copy: isCoach
        ? `I help online coaches & PT clients hit their goals ⬇️

🏋️ Custom programs · Macro coaching · Weekly check-ins

👇 Comment "${keyword}" for my free starter plan`
        : `Fat loss & muscle building for busy adults 🎯

Custom nutrition + training that fits your life

👇 DM "${keyword}" for my free 5-day plan`,
    });
  }

  solutions.push({
    label: "Name field",
    priority: "high",
    problem: `"${brand}" missing search keywords.`,
    placement: "Edit profile → Name (30 chars max)",
    copy: isCoach ? `${brand.split("|")[0].trim().slice(0, 14)} | Online Coach` : `${brand.slice(0, 16)} | Fat Loss Coach`,
  });

  if (scores.linkScore < 70) {
    solutions.push({
      label: "Link / DM strategy",
      priority: "high",
      problem: profile.externalUrl ? `Link: ${profile.externalUrl} — DM funnel converts better for coaches.` : "No conversion path in bio.",
      placement: "Bio + ManyChat or link page",
      copy: `Recommended: "👇 Comment ${keyword} for my free guide"
Set ManyChat to auto-DM when someone comments.

If using a link: one page only → Free guide OR Book call. No Linktree clutter.`,
    });
  }

  solutions.push({
    label: "Story Highlights",
    priority: "medium",
    problem: `@${profile.username} needs Highlights as a mini sales page.`,
    placement: "Profile → Story Highlights",
    copy: `RESULTS · HOW IT WORKS · FREE GUIDE · FAQ · ABOUT`,
  });

  solutions.push({
    label: "Pinned posts",
    priority: "medium",
    problem: "First impression controlled by last 3 posts only.",
    placement: "Pin 3 posts on grid",
    copy: `1. Best client result (specific numbers)
2. "How to work with me" carousel
3. Top Reel — caption ends with "Comment ${keyword}"`,
  });

  solutions.push({
    label: "Weekly content mix",
    priority: "medium",
    problem: `Topic clarity for ${niche.label}.`,
    placement: "4–5 posts/week",
    copy: `2 carousels (myth-bust / save-this-workout)
2 Reels (30–60s, hook in 3s, CTA: Comment ${keyword})
Daily Stories: proof → tip → DM invite`,
  });

  if (!profile.isBusiness) {
    solutions.push({
      label: "Creator account",
      priority: "medium",
      problem: "Personal account — no insights or contact button.",
      placement: "Settings → Professional account → Creator",
      copy: `Category: Coach or Fitness Trainer. Enable contact email + Insights.`,
    });
  }

  return solutions;
}

function buildInvalidInputReport(input: string, analyzedAt: string): AnalysisReport {
  return {
    id: generateId(),
    inputType: "instagram_profile",
    detectedType: "instagram_profile",
    title: "Invalid Instagram Profile",
    subtitle: "Could not parse input",
    analyzedAt,
    input,
    overallScore: 0,
    scores: [],
    sections: [{
      id: "error",
      title: "Invalid Input",
      category: "overview",
      summary: "Use a profile URL, not a post or reel.",
      details: [
        "✓ instagram.com/username",
        "✓ @username",
        "✓ instagram.com/username | Your bio text here",
        "✗ instagram.com/p/… (post)",
        "✗ instagram.com/reel/… (reel)",
      ],
    }],
    actionItems: [{ priority: "high", action: "Enter instagram.com/yourhandle or @yourhandle" }],
  };
}
