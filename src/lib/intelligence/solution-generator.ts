import type { CopySolution } from "@/lib/types";
import type { AuditContext } from "@/lib/intelligence/criteria";
import type { AuditCheckResult } from "@/lib/intelligence/audit";
import type { ContentProfile } from "@/lib/intelligence/content-profile";
import { type DeepContent, featurePhrase, primaryPain } from "@/lib/intelligence/deep-extract";

interface SolutionContext {
  profile: ContentProfile;
  deep: DeepContent;
  failed: AuditCheckResult[];
  context: AuditContext;
  rawText: string;
}

export function generateConcreteSolutions(ctx: SolutionContext): CopySolution[] {
  const failedIds = new Set(ctx.failed.map((f) => f.id));
  const solutions: CopySolution[] = [];

  const nicheHandlers: Record<string, () => CopySolution[]> = {
    "Fitness Coach Platform (B2B)": () => coachPlatformSolutions(ctx, failedIds),
    "Fitness & Nutrition Coaching (B2C)": () => b2cCoachingSolutions(ctx, failedIds),
    "Marketing Agency": () => agencySolutions(ctx, failedIds),
    "Fitness App": () => fitnessAppSolutions(ctx, failedIds),
    "SaaS / Technology": () => saasSolutions(ctx, failedIds),
  };

  const handler = nicheHandlers[ctx.profile.niche] ?? (() => generalSolutions(ctx, failedIds));
  solutions.push(...handler());

  if (ctx.context === "social_post") {
    solutions.unshift(...socialPostRewrite(ctx));
  }

  if (ctx.context === "instagram_profile" && failedIds.has("bio_dm_funnel")) {
    solutions.unshift({
      label: "Bio DM keyword",
      priority: "high",
      problem: `${ctx.profile.brandName}'s bio has no comment-to-DM trigger.`,
      placement: "Instagram → Edit profile → Bio (last line)",
      copy: `👇 Comment COACH for my free starter plan`,
    });
  }

  if (ctx.context === "instagram_profile" && failedIds.has("bio_outcome")) {
    solutions.unshift({
      label: "Bio outcome line",
      priority: "high",
      problem: `${ctx.profile.brandName}'s bio doesn't state who you help or what they get.`,
      placement: "Instagram → Edit profile → Bio (line 1)",
      copy: `I help busy adults lose fat & build muscle without giving up their social life`,
    });
  }

  if (ctx.context === "landing_page" && failedIds.has("objection_handling")) {
    solutions.push(...faqBlock(ctx));
  }

  if (!ctx.profile.metaDescription && ctx.context === "landing_page") {
    solutions.push(metaDescriptionSolution(ctx));
  }

  // Deduplicate by label
  const seen = new Set<string>();
  return solutions.filter((s) => {
    if (seen.has(s.label)) return false;
    seen.add(s.label);
    return true;
  }).slice(0, 10);
}

function coachPlatformSolutions(ctx: SolutionContext, failed: Set<string>): CopySolution[] {
  const { profile, deep } = ctx;
  const brand = profile.brandName;
  const features = featurePhrase(deep.features, profile.keyTopics, [
    "client check-ins",
    "macro tracking",
    "workout programs",
    "branded client app",
  ]);
  const pain = primaryPain(deep, profile.niche);
  const solutions: CopySolution[] = [];

  if (failed.has("specific_outcome") || failed.has("hero_outcome")) {
    solutions.push({
      label: "Hero headline + subheadline",
      priority: "high",
      problem: `Current hero "${profile.heroLine}" names a category, not what coaches gain.`,
      placement: "Homepage hero — replace H1 and the line directly below it",
      copy: `H1: Retain more clients and cut admin time in half — on one branded platform

Subheadline: ${brand} gives online coaches ${features} in one place. No Google Sheets. No patchwork of apps. Your clients get a premium app with your logo on it.`,
    });
  }

  if (failed.has("target_avatar")) {
    solutions.push({
      label: "Audience callout strip",
      priority: "high",
      problem: "Page doesn't say who this is built for.",
      placement: "Directly above or below the hero CTA",
      copy: `Built for online fitness coaches, personal trainers, and nutrition coaches running 10–200+ clients who are done managing programs in spreadsheets and DMs.`,
    });
  }

  if (failed.has("risk_reversal")) {
    solutions.push({
      label: "Risk reversal block",
      priority: "high",
      problem: "No trial or guarantee — coaches won't switch platforms without one.",
      placement: "Under the primary CTA button",
      copy: `14-day free trial — set up your branded portal, import your first 5 clients, and cancel anytime. No credit card required for trial.

Or: "Migrate free — we'll help you move your first 10 clients from spreadsheets at no extra cost."`,
    });
  }

  if (failed.has("proof_volume") || failed.has("proof_likelihood")) {
    solutions.push({
      label: "Social proof bar",
      priority: "high",
      problem: "No volume proof visible — coaches need to see others trust this.",
      placement: "Between hero and features section",
      copy: deep.proofSignals[0]
        ? `Expand this proof: "${deep.proofSignals[0]}" → add specifics: "[X] coaches · [Y] client check-ins completed · [Z] countries"`
        : `Trusted by 500+ online coaches · 50,000+ client check-ins completed · Average coach saves 6 hours/week on admin

(Add your real numbers — even "127 coaches" beats no number.)`,
    });
  }

  if (failed.has("strong_cta") || failed.has("cta_repeated")) {
    const weak = profile.ctasFound.find((c) => /learn more|contact|submit/i.test(c));
    solutions.push({
      label: "Primary CTA button",
      priority: "high",
      problem: weak
        ? `Current CTA "${weak}" is passive — coaches don't know what happens next.`
        : "No clear CTA on the page.",
      placement: "Hero section + sticky header + bottom of page (same text all 3)",
      copy: `Start free 14-day trial

Secondary link below button: "Or book a 15-min platform walkthrough →"`,
    });
  }

  if (failed.has("application_qualify")) {
    solutions.push({
      label: "Demo booking qualifier",
      priority: "medium",
      problem: "Demo requests attract unqualified leads.",
      placement: "Replace generic contact form with Typeform/Tally before Calendly",
      copy: `Before booking a demo, ask:
1. How many active clients do you coach? (1–10 / 11–50 / 51–200 / 200+)
2. What do you use today? (Google Sheets / Trainerize / TrueCoach / Other / Nothing)
3. Biggest headache right now? (Check-ins / Meal plans / Payments / Branding / All of the above)
4. Monthly coaching revenue? (Under $5K / $5–20K / $20K+)

Only show calendar link after Q1 = 11+ clients.`,
    });
  }

  if (failed.has("value_stack")) {
    solutions.push({
      label: "Pricing page value stack",
      priority: "medium",
      problem: "Price shown without anchored value.",
      placement: "Pricing section — above the monthly price",
      copy: `What's included in ${brand}:
✓ Branded client mobile app — $199/mo value
✓ Automated check-in reminders — $49/mo value
✓ Macro & meal plan builder — $79/mo value
✓ Workout program delivery — $69/mo value
✓ Client progress dashboard — $49/mo value
✓ Payment collection — $39/mo value
Total value: $484/mo → Your price: $[XX]/mo`,
    });
  }

  if (pain.includes("sheet") || deep.competitorMentions.some((c) => /sheet/i.test(c))) {
    solutions.push({
      label: "Competitive pain section",
      priority: "medium",
      problem: "You're not hammering the spreadsheet pain coaches feel daily.",
      placement: 'New section below hero — H2: "Still running your coaching business in Google Sheets?"',
      copy: `H2: Still running your coaching business in Google Sheets?

Body: Your clients compare you to every premium app they've ever used. When check-ins live in a shared spreadsheet and programs arrive as PDF attachments, you look like a side hustle — even if your coaching is elite.

${brand} replaces:
• Shared Google Sheets → Branded client app
• Manual check-in reminders → Automated push notifications
• Scattered PDF programs → Structured workout + nutrition delivery
• "DM me your weight" → In-app progress tracking

CTA: See what your branded portal looks like → [Start free trial]`,
    });
  }

  return solutions;
}

function b2cCoachingSolutions(ctx: SolutionContext, failed: Set<string>): CopySolution[] {
  const { profile, deep } = ctx;
  const brand = profile.brandName;
  const pain = primaryPain(deep, profile.niche);
  const topic = profile.keyTopics[0] ?? "nutrition and training";
  const solutions: CopySolution[] = [];

  if (failed.has("specific_outcome") || failed.has("hero_outcome")) {
    solutions.push({
      label: "Hero headline + subheadline",
      priority: "high",
      problem: `"${profile.heroLine}" doesn't promise a specific body outcome with a timeline.`,
      placement: "Landing page or bio link page hero",
      copy: `H1: Lose your first 8–12kg in 12 weeks — without cutting out the foods you love

Subheadline: ${brand} is 1:1 ${topic} coaching for busy adults who've tried generic plans and failed. Custom macros, weekly check-ins, and adjustments when life gets in the way.`,
    });
  }

  if (failed.has("risk_reversal")) {
    solutions.push({
      label: "Guarantee",
      priority: "high",
      problem: "No guarantee — biggest conversion lever missing in AU coaching market.",
      placement: "Directly under the main CTA",
      copy: `30-day "Love It or Leave It" Guarantee

Follow your plan for 30 days. If you're not seeing changes you love — on the scale, in the mirror, or in how your clothes fit — email us and we'll refund every cent. No hoops. No guilt trips.`,
    });
  }

  if (failed.has("proof_volume")) {
    solutions.push({
      label: "Results proof section",
      priority: "high",
      problem: "No specific client results on page.",
      placement: "Below hero — 3 testimonial cards minimum",
      copy: `Card 1: "Sarah, 34 — down 14kg in 16 weeks. Finally stuck to a routine without missing family dinners."
Card 2: "Marcus, 41 — training 5 days/week consistently for the first time in 2 years."
Card 3: "Jess, 28 — lost 6kg and gained definition in chest and arms while travelling for work."

Header above cards: "Real ${brand} clients. Real timelines. No stock photos."`,
    });
  }

  if (failed.has("strong_cta")) {
    solutions.push({
      label: "Primary CTA",
      priority: "high",
      problem: "Weak or missing call-to-action.",
      placement: "Hero + end of page",
      copy: `Book your free 20-minute discovery call

Subtext: "We'll review your history, goals, and whether ${brand} is the right fit. No pressure to sign up on the call."`,
    });
  }

  if (failed.has("value_stack")) {
    solutions.push({
      label: "Offer stack",
      priority: "medium",
      problem: "Price feels expensive without stacked value.",
      placement: "Above pricing or on application page",
      copy: `${brand} Coaching includes:
✓ Custom macro targets updated weekly — $197 value
✓ Personalised training program — $170 value
✓ Weekly check-in + voice note feedback — $150 value
✓ Recipe pack matched to your macros — $97 value
✓ WhatsApp support between check-ins — priceless
Total: $614+/mo → Your investment: $[XX]/week`,
    });
  }

  return solutions;
}

function agencySolutions(ctx: SolutionContext, failed: Set<string>): CopySolution[] {
  const { profile, deep } = ctx;
  const brand = profile.brandName;
  const solutions: CopySolution[] = [];

  if (failed.has("hero_outcome") || failed.has("specific_outcome")) {
    solutions.push({
      label: "Hero headline",
      priority: "high",
      problem: `"${profile.heroLine}" doesn't promise a lead outcome.`,
      placement: "Homepage hero",
      copy: `H1: Get consistent qualified leads from Meta & Google — even when ad costs rise

Subheadline: ${brand} builds your ads, landing pages, and follow-up system in a 2-day workshop. You leave with campaigns live and a 6-month support line to fix what's not working.`,
    });
  }

  if (failed.has("application_qualify")) {
    solutions.push({
      label: "Application funnel",
      priority: "high",
      problem: "No qualification before booking.",
      placement: "Replace 'Contact us' with application form",
      copy: `Q1: Where do most of your leads come from today?
○ Content/organic  ○ Word of mouth  ○ Running ads (not working)  ○ Running ads (want better)

Q2: What service do you sell? [text]
Q3: Average monthly revenue? ○ Pre-revenue  ○ Under $20K  ○ $20–50K  ○ $50–200K  ○ $200K+
Q4: Website URL + Name + Email + Phone → then show workshop dates`,
    });
  }

  if (failed.has("objection_handling")) {
    solutions.push({
      label: "FAQ block",
      priority: "medium",
      problem: "Common objections not handled on page.",
      placement: "Above footer",
      copy: `Q: Can't you just run the ads for me?
A: No one knows your customer better than you. We sit at your screen for 2 days and show you exactly what to click — so you're never dependent on an agency retainer.

Q: How much should I spend on ads to start?
A: $30–50/day is enough to collect data and get leads in most service businesses. We'll set this up on day 1.

Q: How fast will I see results?
A: Same or next day in a lot of cases once campaigns are live.`,
    });
  }

  return solutions;
}

function fitnessAppSolutions(ctx: SolutionContext, failed: Set<string>): CopySolution[] {
  const { profile, deep } = ctx;
  const brand = profile.brandName;
  const features = featurePhrase(deep.features, profile.keyTopics, ["workouts", "meal plans", "progress tracking"]);
  const solutions: CopySolution[] = [];

  if (failed.has("specific_outcome") || failed.has("hero_outcome")) {
    solutions.push({
      label: "App Store subtitle + description opener",
      priority: "high",
      problem: `"${profile.heroLine}" doesn't lead with user outcome.`,
      placement: "First 3 lines of App Store / Google Play description",
      copy: `${brand}: Build muscle and lose fat with a plan that adapts to your schedule — not the other way around.

Get ${features} in one app. New workouts every month. Meals you'll actually cook.

First 7 days free. Then $14/week — less than one coffee a day.`,
    });
  }

  if (failed.has("risk_reversal")) {
    solutions.push({
      label: "App guarantee copy",
      priority: "high",
      problem: "No trial or refund language in listing.",
      placement: "Description + screenshot caption #1",
      copy: `30-day love-it-or-leave-it: Try the full program risk-free. If you're not seeing changes you love in the first 30 days, cancel for a full refund. No strings attached.`,
    });
  }

  return solutions;
}

function saasSolutions(ctx: SolutionContext, failed: Set<string>): CopySolution[] {
  const { profile, deep } = ctx;
  const brand = profile.brandName;
  const features = featurePhrase(deep.features, profile.keyTopics, ["automation", "reporting", "integrations"]);
  const solutions: CopySolution[] = [];

  if (failed.has("hero_outcome") || failed.has("specific_outcome")) {
    solutions.push({
      label: "Hero rewrite",
      priority: "high",
      problem: `Hero "${profile.heroLine}" leads with product, not outcome.`,
      placement: "Homepage H1 + subhead",
      copy: `H1: [Cut X hours / Increase Y by Z%] in [30 days] with ${brand}

Subheadline: ${brand} helps ${profile.audience} ${features} — without adding headcount or switching your entire stack.`,
    });
  }

  return solutions;
}

function generalSolutions(ctx: SolutionContext, failed: Set<string>): CopySolution[] {
  const { profile, deep } = ctx;
  const brand = profile.brandName;
  const pain = primaryPain(deep, profile.niche);
  const solutions: CopySolution[] = [];

  if (failed.has("specific_outcome") || failed.has("hero_outcome")) {
    solutions.push({
      label: "Hero rewrite",
      priority: "high",
      problem: `"${profile.heroLine}" doesn't state a measurable outcome.`,
      placement: "Main headline above the fold",
      copy: `H1: [Specific result your customer wants] in [timeframe] — without [their biggest fear]

Subheadline: ${brand} helps ${profile.audience} who are dealing with ${pain.slice(0, 80)}.`,
    });
  }

  if (failed.has("strong_cta")) {
    solutions.push({
      label: "Primary CTA",
      priority: "high",
      problem: "No clear next step for visitors.",
      placement: "Hero section",
      copy: `Get started free — see ${brand} in action in under 5 minutes`,
    });
  }

  return solutions;
}

function socialPostRewrite(ctx: SolutionContext): CopySolution[] {
  const { profile, deep, rawText } = ctx;
  const brand = profile.brandName;
  const topic = profile.keyTopics[0] ?? "your niche";
  const pain = primaryPain(deep, profile.niche);
  const keyword = topic.split(" ")[0]?.toUpperCase() ?? "READY";
  const platform = profile.platform ?? "Instagram";

  const currentOpen = profile.openingLine.slice(0, 100);

  return [{
    label: "Full post rewrite (copy-paste ready)",
    priority: "high",
    problem: `Current opening "${currentOpen}${currentOpen.length >= 100 ? "…" : ""}" won't stop the scroll or trigger DMs.`,
    placement: `${platform} caption — replace your current post text`,
    copy: /B2B|platform|coach platform/i.test(profile.niche)
      ? `If you're still sending client check-ins through Google Sheets and WhatsApp…

Your coaching might be elite. But your backend makes you look like a beginner.

I built ${brand} so online coaches can deliver ${featurePhrase(deep.features, profile.keyTopics, ["check-ins", "programs", "nutrition"])} from one branded app — without the admin headache.

Comment "${keyword}" below and I'll send you a 2-min walkthrough of what your client portal could look like.

#onlinecoach #fitnessbusiness #personaltrainer`
      : `If you've been consistent for 3 months and the scale hasn't moved — you're not lazy.

You're running a plan that wasn't built for ${pain.includes("cortisol") ? "someone managing stress and a desk job" : "your life"}.

At ${brand}, we fix the plan — not just yell "eat less."

Comment "${keyword}" and I'll send you my free [5-day macro guide / check-in template / meal prep list].

What's been your biggest blocker — nutrition, training, or consistency? 👇`,
  }];
}

function faqBlock(ctx: SolutionContext): CopySolution[] {
  const { profile, deep } = ctx;
  const brand = profile.brandName;
  const alt = deep.competitorMentions[0] ?? "spreadsheets or other tools";

  if (/coach platform|B2B/i.test(profile.niche)) {
    return [{
      label: "FAQ section (3 objections)",
      priority: "medium",
      problem: "Prospects leave with unanswered objections.",
      placement: "New FAQ section above footer",
      copy: `Q: How is ${brand} different from ${alt}?
A: ${brand} gives your clients a branded app experience — check-ins, programs, and progress in one place. No shared spreadsheets, no "check my email for your plan."

Q: How long does setup take?
A: Most coaches are live with their first 5 clients within 48 hours. We include migration help on all plans.

Q: Will my clients actually use the app?
A: Clients engage 3x more with push-notification check-ins vs email PDFs. You get a demo client login to show them before they commit.`,
    }];
  }

  return [{
    label: "FAQ section",
    priority: "medium",
    problem: "Common buying objections not addressed.",
    placement: "Above footer on landing page",
    copy: `Q: How is ${brand} different from a generic online program?
A: Every plan is built for your macros, schedule, and equipment — updated weekly based on your check-in, not a PDF that never changes.

Q: What if I've failed before?
A: That's exactly who we built this for. We start with habits you can stick to, not a 6-day bro split from day one.

Q: Do I need to track every meal?
A: No — we set flexible targets and teach you protein-first eating. Most clients spend 5 min/day on tracking.`,
  }];
}

function metaDescriptionSolution(ctx: SolutionContext): CopySolution {
  const { profile, deep } = ctx;
  const brand = profile.brandName;
  const features = featurePhrase(deep.features, profile.keyTopics, ["coaching tools"]);

  let copy: string;
  if (/coach platform|B2B/i.test(profile.niche)) {
    copy = `${brand} — Branded client app for online coaches. ${features}. 14-day free trial. Replace spreadsheets with a premium coaching experience.`;
  } else if (/B2C|nutrition|coaching/i.test(profile.niche)) {
    copy = `${brand} — 1:1 coaching for ${profile.audience.toLowerCase()}. Custom macros, weekly check-ins, real results in 12 weeks. Book a free discovery call.`;
  } else {
    copy = `${brand} helps ${profile.audience.toLowerCase()} with ${features}. Start free today.`;
  }

  // Trim to 155 chars with note
  const trimmed = copy.length > 155 ? copy.slice(0, 152) + "…" : copy;

  return {
    label: "Meta description (SEO + Google)",
    priority: "medium",
    problem: `No meta description — Google shows random page text for ${profile.url ?? brand}.`,
    placement: `<meta name="description"> in page <head>`,
    copy: trimmed + (copy.length > 155 ? `\n\n(${trimmed.length} chars — aim for 120–155)` : `\n\n(${trimmed.length} chars)`),
  };
}

export function solutionsToActionItems(solutions: CopySolution[]): { priority: "high" | "medium" | "low"; action: string }[] {
  return solutions.map((s) => ({
    priority: s.priority,
    action: `${s.label}: ${s.problem} → See ready-to-use copy in the audit section below.`,
  }));
}
