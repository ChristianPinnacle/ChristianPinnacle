# BizLens

**Simple input. Detailed insights.**

BizLens is a business intelligence analyzer that turns URLs, social media posts, app store links, and business descriptions into comprehensive reports with scores, detailed breakdowns, and prioritized action items.

## What it analyzes

| Input | What you get |
|-------|-------------|
| **Website URL** | SEO score, technical health, content quality, marketing signals |
| **Social post** | Engagement potential, hashtag strategy, platform-specific tips |
| **App store link** | ASO analysis, listing quality, growth recommendations |
| **Business text** | Value proposition clarity, audience fit, messaging improvements |

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and paste any input — BizLens auto-detects the type, or you can pick a mode manually.

## How it works

1. **Paste** a URL, social post, app link, or business description
2. **Choose** auto-detect or a specific analysis mode
3. **Get** an overall score, category breakdowns, detailed sections, and priority actions

## Tech stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS 4**
- **Cheerio** for HTML parsing and metadata extraction

Every analysis includes a **Marketing Intelligence Audit** scored against VitalEdge Hub / Pinnacle Coaching benchmarks:

- **Alex Hormozi** — Grand Slam Offer, Value Equation, free→workshop funnel
- **Brandon Willington** — With U application funnel, specificity, FAQ objection handling
- **Zac Perna** — Value stack, guarantee, price anchoring
- **Tony Robbins** — Assessment/quiz funnel, segmented CTAs
- **Fitness industry 2026** — Mirror/myth-bust hooks, comment-to-DM funnel, landing page anatomy
- **VitalEdge/Pinnacle gaps** — B2B coach platform pain, B2C DM funnel priorities

Audit criteria live in `src/lib/intelligence/criteria.ts`.

```
src/
├── app/
│   ├── api/analyze/     # Analysis API endpoint
│   ├── page.tsx         # Main UI
│   └── layout.tsx
├── components/          # Input panel, report view, score gauges
└── lib/
    └── analyzers/       # URL, social, app, and business engines
```

## API

```bash
POST /api/analyze
Content-Type: application/json

{
  "input": "https://example.com",
  "type": "auto"  // auto | url | social | app | business
}
```

Returns a structured `AnalysisReport` with scores, sections, and action items.

## License

MIT
