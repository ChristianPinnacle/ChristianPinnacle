/**
 * Marketing intelligence benchmark for VitalEdge Hub / Pinnacle Coaching.
 * Sourced from public frameworks: Hormozi, Brandon Willington, Zac Perna,
 * Tony Robbins, fitness industry 2026 data, and podcast intelligence (July 2026).
 */

export type AuditContext = "landing_page" | "social_post" | "business_copy" | "app_listing";

export interface AuditCriterion {
  id: string;
  label: string;
  framework: string;
  weight: number;
  /** Returns true if the criterion passes */
  test: (text: string) => boolean;
  failMessage: string;
  passMessage: string;
  recommendation: string;
}

export const GENERIC_OFFER_PHRASES = [
  /\bonline coaching\b/i,
  /\bonline nutrition coaching\b/i,
  /\btransform your body\b/i,
  /\btransform your life\b/i,
  /\blose weight\b/i,
  /\bget fit\b/i,
  /\befficient strength training\b/i,
  /\bhealth and wellness\b/i,
  /\bpersonal training services\b/i,
  /\bwork with me\b/i,
];

export const STRONG_CTA_PATTERNS = [
  /\bDM me\b/i,
  /\bcomment\s+["']?\w+["']?\s+(below|for)/i,
  /\bbook a free (call|session|consultation|discovery)/i,
  /\bclaim your free session\b/i,
  /\bmessage me\b/i,
  /\bdownload the \d/i,
  /\bapply now\b/i,
  /\bi'm ready to scale\b/i,
  /\bclient application\b/i,
  /\bjoin now\b/i,
  /\btake (our |the )?free (assessment|quiz)/i,
];

export const WEAK_CTA_PATTERNS = [
  /\bclick here\b/i,
  /\blearn more\b/i,
  /\bsubmit\b/i,
  /\bread more\b/i,
];

export const HOOK_PATTERNS = {
  mirror: /if you('ve| have) (tried|lost|been|done).{10,80}(problem isn't|it's not your|the (real )?reason)/i,
  mythBust: /\b(stop doing|#1 mistake|myth|fact|don't do this if)\b/i,
  pov: /\bPOV:/i,
  problemSpecific: /(consistent for \d|scale hasn't moved|failed every|three months|same \d+ pounds)/i,
  credibility: /\b(dropped|lost|gained|in \d+ weeks?|\d+kg|\d+ lbs?)\b/i,
  identity: /if you're (a |an )?\w+.{5,40}(this is for you|who)/i,
  contrarian: /\b(not because|the problem isn't|everyone thinks|most people\b)/i,
};

export const VALUE_EQUATION_SIGNALS = {
  dreamOutcome: /\b(achieve|build|lose|gain|grow|scale|double|triple|\$\d+[km]?|\d+%)\b/i,
  proof: /\b(\d+[+,]?\d* (clients?|customers?|people|physiques|transformed|reviews?)|case stud|testimonial|guarantee|money.?back|risk.?free|proof)\b/i,
  speed: /\b(\d+ (day|week|month)s?|same day|next day|quick win|fast results|in \d+)\b/i,
  effortReduction: /\b(without|no more|done.?for.?you|DFY|simple|easy|step.?by.?step|we (do|handle|build))\b/i,
};

export const LANDING_PAGE_SIGNALS = {
  guarantee: /\b(guarantee|money.?back|risk.?free|love it or leave|refund|no strings)\b/i,
  valueStack: /\b(included|you get|value|worth \$|\$\d+ value|bonus|stack)\b/i,
  urgency: /\b(\d+ spots? left|sold out|limited|deadline|closing|last chance|only \d+)\b/i,
  faq: /\b(FAQ|frequently asked|common questions|objections?)\b/i,
  applicationFunnel: /\b(application|qualify|qualification|where do (most of )?your leads|monthly revenue|what kind of business)\b/i,
  socialProofVolume: /\b(\d{3,}[+,]?\d*|\d+k\+?)\s*(clients?|customers?|businesses|transformed|reviews?|people)/i,
};

export const VITALEDGE_B2B_PAIN = [
  /google sheets/i,
  /losing clients/i,
  /platform looks/i,
  /spreadsheet/i,
  /manual check.?ins/i,
];

export const UNIVERSAL_CRITERIA: AuditCriterion[] = [
  {
    id: "specific_outcome",
    label: "Specific Dream Outcome",
    framework: "Hormozi — Grand Slam Offer",
    weight: 12,
    test: (t) =>
      !GENERIC_OFFER_PHRASES.some((p) => p.test(t)) &&
      (/\b(in \d+ (weeks?|months?|days?))\b/i.test(t) ||
        /\b(without (cutting|sacrificing|giving up))\b/i.test(t) ||
        /\b(\d+kg|\d+ lbs?|\$\d+[km]?|\d+%)\b/i.test(t)),
    failMessage: "Offer uses generic language ('online coaching', 'transform your body') without specific outcome + timeline",
    passMessage: "Specific outcome with timeframe or measurable result detected",
    recommendation:
      "Rewrite using: [Dream Outcome] + [Timeframe] + [Avatar] + [Without Sacrifice]. Example: 'Build a lean physique in 12 weeks — without cutting foods you love'",
  },
  {
    id: "target_avatar",
    label: "Target Avatar Defined",
    framework: "Hormozi / Fitness Hooks",
    weight: 10,
    test: (t) =>
      /\b(for (busy|working|mums?|moms?|dads?|coaches?|business owners?|professionals?|men|women))\b/i.test(t) ||
      /\b(if you're (a |an )?\w+)/i.test(t) ||
      /\bwho (want|need|struggle|are)\b/i.test(t),
    failMessage: "No clear target avatar — copy speaks to everyone",
    passMessage: "Specific avatar or identity targeting detected",
    recommendation: "Name your avatar explicitly: 'For busy business owners who...' or 'If you've failed every diet...'",
  },
  {
    id: "risk_reversal",
    label: "Risk Reversal / Guarantee",
    framework: "Hormozi / Zac Perna",
    weight: 10,
    test: (t) => LANDING_PAGE_SIGNALS.guarantee.test(t),
    failMessage: "No guarantee or risk reversal — underused lever in AU coaching market (can 3–5x conversions)",
    passMessage: "Risk reversal or guarantee language present",
    recommendation: "Add guarantee: '30-day love it or leave it' or outcome-based guarantee with clear terms",
  },
  {
    id: "proof_volume",
    label: "Social Proof Volume",
    framework: "Brandon Willington / Zac Perna",
    weight: 10,
    test: (t) =>
      LANDING_PAGE_SIGNALS.socialProofVolume.test(t) ||
      (/\b(testimonial|client (said|result)|before.?after)\b/i.test(t) &&
        /\b(\d+kg|\d+ lbs?|\d+ weeks?|specific)\b/i.test(t)),
    failMessage: "Weak social proof — need volume (numbers) or specific client results, not vague praise",
    passMessage: "Volume proof or specific result testimonials detected",
    recommendation: "Show wall of proof: '13,000 physiques transformed' or 'Sarah lost 14kg in 16 weeks' with specifics",
  },
  {
    id: "value_stack",
    label: "Value Stack vs Price",
    framework: "Zac Perna / Hormozi",
    weight: 8,
    test: (t) => LANDING_PAGE_SIGNALS.valueStack.test(t) && /\$\d+/i.test(t),
    failMessage: "No value stack — price feels arbitrary without anchored total value",
    passMessage: "Value stack with dollar amounts detected",
    recommendation: "Stack inclusions with RRP: 'Personalised program ($170) + Meal plan ($197) + Community = $5,500 value → $14/week'",
  },
  {
    id: "strong_cta",
    label: "High-Converting CTA",
    framework: "Fitness 2026 / Brandon With U",
    weight: 10,
    test: (t) => STRONG_CTA_PATTERNS.some((p) => p.test(t)) && !WEAK_CTA_PATTERNS.some((p) => p.test(t)),
    failMessage: "Weak or missing CTA — avoid 'Click here', 'Learn more', generic 'Submit'",
    passMessage: "Strong conversion CTA detected (DM keyword, book call, apply, join)",
    recommendation: "Use one CTA: 'DM me PLAN for free workout' or 'Book a free 20-minute call' or 'CLIENT APPLICATION'",
  },
  {
    id: "hook_strength",
    label: "Scroll-Stopping Hook",
    framework: "Fitness Hooks Matrix 2026",
    weight: 10,
    test: (t) => Object.values(HOOK_PATTERNS).some((p) => p.test(t)),
    failMessage: "No proven hook pattern — generic copy won't stop the scroll",
    passMessage: "Proven hook pattern detected (mirror, myth-bust, POV, or problem-specific)",
    recommendation:
      "Mirror hook: 'If you've lost the same 15 pounds three times, the problem isn't willpower, it's your plan'",
  },
  {
    id: "proof_likelihood",
    label: "Perceived Likelihood (Proof)",
    framework: "Hormozi — Value Equation",
    weight: 8,
    test: (t) => VALUE_EQUATION_SIGNALS.proof.test(t),
    failMessage: "Low perceived likelihood — missing proof, case studies, or credibility signals",
    passMessage: "Proof elements increase perceived likelihood of achievement",
    recommendation: "Add case studies, client count, credentials, or 'damaging admission' transparency (Hormozi Ep 927)",
  },
  {
    id: "time_delay",
    label: "Decreased Time Delay",
    framework: "Hormozi — Value Equation",
    weight: 6,
    test: (t) => VALUE_EQUATION_SIGNALS.speed.test(t),
    failMessage: "No speed/quick-win language — outcome feels distant",
    passMessage: "Time-bound results or quick wins mentioned",
    recommendation: "Add timeframe: 'Same or next day results' (Brandon) or 'first 10kg in 90 days'",
  },
  {
    id: "effort_reduction",
    label: "Decreased Effort & Sacrifice",
    framework: "Hormozi — Value Equation",
    weight: 6,
    test: (t) => VALUE_EQUATION_SIGNALS.effortReduction.test(t),
    failMessage: "Doesn't address effort/sacrifice — avatar assumes hard work required",
    passMessage: "Effort reduction or sacrifice removal addressed",
    recommendation: "Add 'without' clause: 'without 2-hour gym sessions' or done-for-you elements",
  },
  {
    id: "objection_handling",
    label: "FAQ / Objection Handling",
    framework: "Brandon Willington / Hormozi",
    weight: 8,
    test: (t) => LANDING_PAGE_SIGNALS.faq.test(t) || /\b(can't you just|is this another|how quickly|how much)\b/i.test(t),
    failMessage: "No FAQ or objection handling — price/time/skepticism unaddressed",
    passMessage: "Objection handling or FAQ section detected",
    recommendation: "Add FAQ in verbatim style: 'Can't you just do it for me?' → honest answer (Brandon With U model)",
  },
  {
    id: "specificity",
    label: "Copy Specificity",
    framework: "Brandon Willington",
    weight: 8,
    test: (t) =>
      /\b(\d+ (support calls?|spots?|days?|weeks?)|up to \d+|15 support calls|\$\d+-\$?\d+ a day)\b/i.test(t) ||
      (t.match(/\d+/g)?.length ?? 0) >= 3,
    failMessage: "Vague copy — specificity beats vagueness ('up to 15 support calls/day' not 'lots of support')",
    passMessage: "Specific numbers and concrete details in copy",
    recommendation: "Replace vague claims with numbers: support frequency, spots left, ad spend ($30-50/day), timelines",
  },
];

export const SOCIAL_CRITERIA: AuditCriterion[] = [
  {
    id: "dm_funnel_cta",
    label: "Comment-to-DM Funnel CTA",
    framework: "Instagram 2026 — 12–25% conversion vs 1.5–3% link-in-bio",
    weight: 15,
    test: (t) => /\b(DM me|comment\s+["']?\w+["']?|message me)\b/i.test(t),
    failMessage: "No DM funnel trigger — missing highest-converting fitness acquisition channel",
    passMessage: "Comment-to-DM CTA present",
    recommendation: "Add keyword trigger: 'DM me PLAN' or 'Comment READY below' — converts 12–25% vs 1.5–3% for link-in-bio",
  },
  {
    id: "single_cta",
    label: "Single CTA Rule",
    framework: "Fitness Ad Copy Structure 2026",
    weight: 10,
    test: (t) => {
      const ctaCount = STRONG_CTA_PATTERNS.filter((p) => p.test(t)).length;
      return ctaCount === 1 || (ctaCount === 0 && t.length < 200);
    },
    failMessage: "Multiple competing CTAs — fitness ads need ONE action only",
    passMessage: "Single clear CTA or appropriate for short-form",
    recommendation: "One action only: DM keyword OR book call — never both in same post",
  },
  {
    id: "engagement_question",
    label: "Engagement Question",
    framework: "Instagram Algorithm 2026 — Comments trigger DM automation",
    weight: 8,
    test: (t) => /\?/.test(t),
    failMessage: "No question — questions drive 2x comments and keyword triggers",
    passMessage: "Question present for engagement",
    recommendation: "End with qualifying question to boost comments and enable DM automation",
  },
  {
    id: "problem_hook",
    label: "Problem-Specific Hook (not generic)",
    framework: "Fitness Hooks — Mirror / Problem-Agitate",
    weight: 12,
    test: (t) =>
      !/\b(transform your body|get fit|online coaching)\b/i.test(t.slice(0, 120)) &&
      (HOOK_PATTERNS.problemSpecific.test(t) ||
        HOOK_PATTERNS.mirror.test(t) ||
        HOOK_PATTERNS.mythBust.test(t)),
    failMessage: "Generic hook in opening — saturated market requires specificity",
    passMessage: "Problem-specific or pattern-interrupt hook in copy",
    recommendation: "Open with exact frustration: 'You've been consistent 3 months. Scale hasn't moved. You're not eating junk.'",
  },
  {
    id: "credibility_signal",
    label: "Credibility-by-Results",
    framework: "Fitness Ad Copy — Step 3",
    weight: 10,
    test: (t) => HOOK_PATTERNS.credibility.test(t) || VALUE_EQUATION_SIGNALS.proof.test(t),
    failMessage: "Credentials over results — client outcomes outperform certificates",
    passMessage: "Client result or credibility signal present",
    recommendation: "Lead proof with: 'Sarah dropped 14kg in 16 weeks' not 'Certified PT with 10 years experience'",
  },
];

export const LANDING_PAGE_CRITERIA: AuditCriterion[] = [
  {
    id: "hero_outcome",
    label: "Outcome-Focused Hero",
    framework: "Landing Page Anatomy — Fitness/Coaching",
    weight: 12,
    test: (t) => {
      const hero = t.slice(0, 500);
      return (
        !/\b(efficient strength training|online coaching|transform your life)\b/i.test(hero) &&
        (/\b(without|even if|for \w+ who)\b/i.test(hero) || VALUE_EQUATION_SIGNALS.dreamOutcome.test(hero))
      );
    },
    failMessage: "Hero is feature-focused or generic — needs outcome + avatar pain",
    passMessage: "Hero speaks to outcome and avatar",
    recommendation: "BAD: 'Efficient strength training in 30 min' → GOOD: 'Get stronger without sacrificing your schedule'",
  },
  {
    id: "application_qualify",
    label: "Application / Qualification Funnel",
    framework: "Brandon With U / Rhys Livingstone",
    weight: 10,
    test: (t) => LANDING_PAGE_SIGNALS.applicationFunnel.test(t),
    failMessage: "No qualification funnel — 'book a demo' alone attracts unqualified leads",
    passMessage: "Application or qualification questions detected",
    recommendation: "Add application funnel: revenue tier, lead source, business type BEFORE booking (Brandon/Rhys model)",
  },
  {
    id: "urgency_real",
    label: "Genuine Urgency / Scarcity",
    framework: "Brandon With U — city-by-city spots",
    weight: 8,
    test: (t) => LANDING_PAGE_SIGNALS.urgency.test(t),
    failMessage: "No urgency — real scarcity (spots, dates) outperforms fake countdowns",
    passMessage: "Real scarcity or deadline language present",
    recommendation: "City-by-city spots: '26 Spots Left — Brisbane' (must be genuine)",
  },
  {
    id: "cta_repeated",
    label: "Primary CTA Presence",
    framework: "Landing Page Anatomy — repeat 3x",
    weight: 8,
    test: (t) => STRONG_CTA_PATTERNS.filter((p) => p.test(t)).length >= 1,
    failMessage: "No clear primary CTA above the fold",
    passMessage: "Primary CTA detected",
    recommendation: "One primary action repeated at each section break — 'I'M READY TO SCALE' or 'JOIN NOW'",
  },
];

export const VITALEDGE_CRITERIA: AuditCriterion[] = [
  {
    id: "coach_platform_pain",
    label: "Coach Platform Pain (B2B)",
    framework: "VitalEdge Hub — Coach Acquisition",
    weight: 10,
    test: (t) =>
      VITALEDGE_B2B_PAIN.some((p) => p.test(t)) ||
      /\b(coach(es)?|trainer(s)?|online fitness business)\b/i.test(t),
    failMessage: "Missing B2B coach pain — 'Stop losing clients because your platform looks like Google Sheets'",
    passMessage: "Coach/trainer targeting or platform pain addressed",
    recommendation: "For VitalEdge B2B: lead with coach-specific pain, not generic SaaS features",
  },
  {
    id: "free_to_workshop_ladder",
    label: "Free Content → Application Ladder",
    framework: "Hormozi Acquisition.com",
    weight: 8,
    test: (t) =>
      /\b(free (course|guide|blueprint|assessment|challenge)|workshop|application)\b/i.test(t),
    failMessage: "No free value ladder — Hormozi converts cold coaches via free courses → workshop → partner",
    passMessage: "Free content laddering to application/workshop detected",
    recommendation: "Ladder: Free course/guide → Workshop application → High-ticket (Hormozi model for VitalEdge)",
  },
];

export function getCriteriaForContext(context: AuditContext): AuditCriterion[] {
  const base = [...UNIVERSAL_CRITERIA];
  if (context === "social_post") {
    return [...base, ...SOCIAL_CRITERIA];
  }
  if (context === "landing_page") {
    return [...base, ...LANDING_PAGE_CRITERIA, ...VITALEDGE_CRITERIA];
  }
  if (context === "business_copy") {
    return [...base, ...VITALEDGE_CRITERIA];
  }
  return base;
}

export const BENCHMARK_SOURCES = [
  "Alex Hormozi — Acquisition.com / $100M Offers",
  "Brandon Willington — Where U? With U Workshop",
  "Zac Perna — zacperna.com",
  "Tony Robbins — Assessment funnel",
  "Rhys Livingstone — Application model",
  "Fitness Industry Hooks & CTAs 2026",
  "Instagram Algorithm & Conversion Data 2026",
];
