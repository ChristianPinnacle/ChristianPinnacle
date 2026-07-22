---
title: Coach Methodologies
folder: resources
tags: [coaching, methodology, product]
created: 2026-07-22
updated: 2026-07-22
source: import
summary: "Research master file on coach training philosophies feeding the AI program generator."
---
# Coach Methodologies — Research Master File
*Merged July 2026 from the Comprehensive Coach Profiles Report and the Programming & Methodology Deep Dive. This file supersedes both PDFs. It is the human-readable source behind `coach-methodologies.json` and the `promptBuilder.ts` / `methodologySelector.ts` injection pipeline.*

## Selector quick-reference

| Coach | Niche key (json) | Best-fit client | Signature mechanism |
|---|---|---|---|
| Kuba Sylvester-Cielen | structured hypertrophy | Committed physique athletes wanting regimented structure | 6-wk mesocycle, S:F-ranked exercises, strict tempo, reps-first progression; frequency-aware volume (see his programming-principles section) |
| Joe Bennett | execution-first hypertrophy | Muscle-growth clients, form-quality focus | Execution gates progression; 2–4 hard sets to 0–2 RIR; anatomy-driven selection |
| Tyson Morrissy | strongman ⚠️ *parked — profile insufficient, needs Christian's authorship* | Strongman / hybrid strength | 4–5 day splits + event day, cluster sets, Zone 2 base |
| Chris Wilson | functional barbell strength | Active adults, working professionals, holistic | Compound barbell focus, 5 essential lifts, NS priming warm-ups |
| Jordan Shallow / Pre-Script | rehab_biomechanics (overlay for injury history) | Anyone with injury history or movement limitations | Applied biomechanics, external-stability loading, manage-load-no-deloads |
| Kaleb Singh | powerlifting / strength | Strength-total chasers | Individualised macrocycles, standard 5×5 / 4×6 schemes (limited public detail) |
| Joe Bennett alt / Matthew Coates | — (not in json) | Prep/lifestyle physique clients | Private methodology; "Productivity Window" concept |

*Rule already locked in the app: coach names never appear in client-facing UI; `rehab_biomechanics` is applied as an overlay wherever injury history exists.*

---

## 1. Jordan Shallow (The Muscle Doc) & Pre-Script

**Background.** Dr. Jordan Shallow D.C. — chiropractor, S&C coach, powerlifter. Founder of Pre-Script®, former Medical Director at House of Athlete, former Head Rugby S&C at Stanford. Doctorate of Chiropractic (Palmer College), Exercise Science & Health Promotion (Sheridan). NASM Corrective Exercise Specialist, ART certified.

**Philosophy.** Individualised human performance built on the interconnected **Mobility → Stability → Strength®** paradigm — maximise output by working with the body's natural mechanics. Makes bodybuilding simple; emphasises muscular *function* vs *action*, nervous-system adaptation, and case-study approaches to stability.

**Programming & periodization.** No rigid fixed templates. **Intent-based programming**: a fluid macrocycle (e.g. 16 weeks) that adapts to ongoing assessments and life events rather than jumping between block types. Eliminates redundancies and overlapping stimuli to maximise productive training capacity. Sample high-frequency split: 5+ sessions/week (e.g. "Lower Session B"); sample push day: Incline DB Press, Chest Fly, Y Raise, Cable Lateral, Incline Cable Skull Crusher.

**Exercise selection.** Dictated by length-tension relationships, strength curves, resistance profiles. **High external stability** (machines, farmer's carries) for primary load and hypertrophy — reduces neurological fatigue from stabilisation. High *internal*-stability exercises are motor-learning tools, not load drivers.
- Favoured: Leg press, seated hamstring curl, incline DB press, KB windmill (thoracic rotation / ribcage function).
- Avoided/re-evaluated: Sumo deadlift as a "glute exercise", universal back-squat bar positions (anatomy-dependent), unloaded correctives (replaced with meaningfully-loaded bodybuilding movements).

**Volume / intensity / progression.** Intensity kept "SUPER HIGH" in abbreviated sessions; RPE/RIR targets of 1–2 RIR on top sets of key movements. Signature: **"Managing load, eliminating deloads"** — no scheduled deload weeks; continuous progress through strategic exercise selection and range overloading; progress/regress by altering centre of mass and base of support. Progressive mechanisms target lasting mobility and strength output in end ranges.

**Frameworks.** Pre-Script® certification; Mobility-Stability-Strength®; Function & Indexing; Muscle Loading Mechanics.
**Audience.** Elite athletes, teams, corporations; coaches/clinicians (DC, PT, RMT) seeking applied-biomechanics education.
**Sources.** themuscledoc.com · pre-script.com · @the_muscle_doc · @pre_script · RX'd Radio podcast.

---

## 2. Joe Bennett (Hypertrophy Coach)

**Background.** 20+ years developing trainers and clients from weight-loss to Mr./Ms. Olympia champions. BSc Exercise Science (Florida). RTS, BioPrint, PICP, MAT, FRC, NASM-PES, USAW. Former competitive bodybuilder (two overall titles).

**Philosophy.** Efficiency — "as little as possible to produce maximal results." Execution and movement quality are paramount; understand the *why*. Maximise hypertrophic stimulus while minimising systemic fatigue.

**Programming & periodization.** 100+ structured programs on TrainHeroic, typically **8-week mesocycles**, 3–6 sessions/week. Examples: Pec Specialization (2–3×/wk), Anti-Flamingo Leg Specialization, BroPertrophy, Ben Pollack Power Building. Beginners: full-body → upper/lower progression. Body-part specialization phases; 3–5 required strength days/week in coached programs.

**Exercise selection.** No "must-do" exercises — anatomy and execution ability decide. Modifies equipment to optimise resistance profiles. Advanced competitors: rotate exercises session-to-session by stimulus-to-fatigue ratio to attack weak points.

**Volume / intensity / progression.** Quality over quantity — no junk volume. **2–4 hard sets at 0–2 RIR or true failure** beats 6–8 mediocre sets. Progression = systematic load/rep/set increases across a mesocycle, but **only counts if execution stays pristine** — same form, tempo, tension on the target muscle.

**Frameworks.** Applied Hypertrophy Biomechanics; Applied Cueing & Execution; Hypertrophy Coach University.
**Audience.** Serious muscle-growth clients, competitive bodybuilders, coaches.
**Sources.** hypertrophycoach.com · hypertrophycoachuniversity.com · TrainHeroic · @hypertrophycoach · YouTube: Hypertrophy Coach.

**Applied ROM & exercise-selection doctrine (from the Jordan Peters review, 2026):**
- **Load the lengthened-through-mid-range, not the squeeze.** The high-value ROM is *not* the last ~6 inches of perceived lengthening, and it is *not* the shortened "squeezy" zone where a movement feels best — it's biasing from lengthened through the mid-range. Common error is getting stuck in the shortened position because that's where the pump is felt.
- **Peak joint torque is the selection filter.** For any pressing movement, find where peak joint torque sits (upper arm position relative to the line of force), own that range under control, progress load over time — that alone builds the pressing musculature. Machines/stable variations are preferred: "the more stable something is, the better the output" — don't chase a free-weight or standing variation for manliness when a supported version overloads the target range better.
- **Rib position on presses.** Let ribs drop and you lose length at the bottom; the muscles crossing from sternum to shoulder need the ribcage held up (chest extended) to reach true lengthened tension. Keep ribs in a fixed position through the press rather than caving.
- **Back thickness = maximal scapular ROM.** Rows build thickness when the shoulder blade travels through its full range (protracted stretch → retracted, changing shape) opposing the load, with the spine held still. A bare-bones complete back: one deadlift variation (spine ~parallel to ground, RDL-ish, ~90° moment arm at hip/spine for max torque) + chest-supported row + pulldown. Chest-supported over bent-over — a free bent-over row does two jobs (erector isometric + row) worse than doing them separately.
- **Legs = full available knee flexion + hip length.** Take knee flexion to where hamstring meets calf; on a leg press, deep hip flexion loads glutes in the lengthened range as well as quads. Not married to the barbell back squat — a hack squat or leg press that taxes the legs (not everything between bar and legs) is the point.

**Strong-lifter form principle (the key coaching heuristic):** for an *already strong* athlete, don't drop the weight dramatically to fix form. Keep load near the top set and add a form/control cue — same or slightly better stimulus *plus* reduced injury risk. Only beginners have large margins in both load and form; advanced lifters progress mostly on load (small plates: "biscuits"), so the trade is "make the movement harder on myself" via execution, not "go back to the 40s." This is the bodybuilder-vs-weightlifter distinction: constantly asking "how could I make this harder" during warm-ups.

**Priority & frequency nuance:** putting on muscle is *simple* (get stronger in the big movements for you, eat in a real surplus, track it) — it gets complicated only near the genetic limit and when keeping joints intact. Full-body/half-body/push-pull-lower all fine; higher frequency is better if recoverable. But whatever trains *last* every session (often arms, calves, delts) can lag — a dedicated priority day for a lagging part, trained first and fresh, is legitimate and not a violation of frequency dogma.

*App note:* this doctrine is what a Bennett-profile or `execution-first hypertrophy` prompt should emit — bias cues toward lengthened/mid-range and peak-torque positions, prefer stable/supported variations, and gate progression on execution. The strong-lifter heuristic (hold load, add control cue) is a good universal rule for `betaTester` clients logging advanced loads.

---

## 3. Kuba Sylvester-Cielen ("The Kuba Method")

**Background.** 15+ years in bodybuilding as coach and athlete. Preaches brutal honesty and a no-excuse work ethic; aims to teach athletes to be their own coach. Emphasises bloodwork and health monitoring in bodybuilding.

**Programming & periodization.** Strict **6-week mesocycle**:
- **Weeks 1–3 (Accumulation):** progressive volume tolerance, technique refinement, rep progression.
- **Weeks 4–5 (Intensification):** push to RIR 0, introduce advanced techniques (Myo-Reps, drop sets, rest-pause).
- **Week 6 (Deload):** ~50% volume reduction, submaximal intensity (RIR 3–4).
Phases structured for mini-cut, reverse diet, offseason, prep. Sample push day: Incline DB Press, Machine Chest Press, Cable Flyes, Seated DB Shoulder Press, Machine Lateral Raises, Overhead Tricep Extension (~60–75 min).

**Exercise selection.** Ranked by **stimulus-to-fatigue (S:F) ratio**:
- High S:F (prioritised): machine chest press, leg extensions, cable flyes.
- Moderate: DB presses, RDLs, leg press.
- Low (limited): heavy deadlifts, heavy back squats.
Roughly **60% compound / 40% isolation**; prioritise lengthened-position loading (deficit RDLs, incline curls).

**Volume / intensity / progression.** ~3 working sets per exercise after 2–3 ramped warm-ups. Weekly sets managed by **MEV/MAV/MRV landmarks** (e.g. chest MEV 8 / MAV 14 / MRV 20; back MEV 10 / MAV 16 / MRV 22). Non-negotiable **3-1-1-0 tempo** (3s eccentric, 1s bottom pause, 1s concentric, no top pause). **Reps-first progression**: start at the bottom of the range (e.g. 6–10 compounds); hit the top for two consecutive sessions → add 2.5–5kg.

**Frequency-aware volume.** See the dedicated *Kuba — programming principles* section further below for his live reasoning on effective volume vs frequency, the quad volume-sensitivity exception, A/B lower splits, and recovery-gated frequency.

**Audience.** Committed athletes chasing high-level physique development.
**Sources.** teammkcoaching.com/kuba · @kuba_sylvester_cielen · YouTube: Kuba Cielen (Kilo Culture).

---

## 4. Tyson Morrissy (The Strongman Way) ⚠️ *parked in-app pending Christian's authorship*

**Background.** 5× Australia's Strongest Man (U105kg), SCL World Champion (2019). Powerlifting records: 320kg squat, 202.5kg bench, 340kg deadlift, 860kg total. Owner of Strong Geelong Gym and The Strongman Way Coaching.

**Philosophy.** "Train Smarter. Get Stronger. Perform Better." Strength is continuity with movement and consistency with effort. Cardiovascular health and a fitness base are integrated, not optional.

**Programming & periodization.** Highly individualised. Current powerlifting split — 4 lifting days + 2 cardio days:
- Mon: wrapped squats, DB lunges, trunk/lower accessories · Tue: bench + push/pull accessories · Wed: Zone 2 (40–60 min) · Thu: deadlifts + lower/trunk accessories · Fri: function + upper accessories · Sat: active recovery (Zone 2).
Strongman programs: typically 4 sessions/week (Squat, Push, Pull + event day). Phases rebuild skill and exposure on key lifts; competition deload protocols.

**Exercise selection & intensity.** Foundational strongman/powerlifting movements; heavy unilateral work (DB lunges) for lower-limb function; **cluster sets** to maximise reps while staying explosive and holding position. Video movement analysis is core to coaching delivery; "everything but the lifting" holistic support.

**Frameworks.** The Strongman Way; Strong Like Dad initiative.
**Sources.** thestrongmanway.com · @thestrongmanway · The Strongman Say podcast.
**App note:** public detail is insufficient for a generation-grade profile — strongman methodology stays parked until Christian authors the ruleset.

---

## 5. Chris Wilson (Game Changing Strength)

**Background.** Certified fitness professional, 20+ years across Australia, UK and America. Owner/operator of Game Changing Strength & Performance; has worked with the Ospreys and Welsh Rugby Union.

**Philosophy.** Strength training as a life-changing practice for active adults. Client-first: find and remove existing obstacles, sustainable solutions, holistic development (physical, mental, stylistic).

**Programming.** Individualised monthly programming via Teambuildr (tracking, in-app comms, video demos). Strongly favours **compound barbell movements** (squat, deadlift, overhead press, bent-over row) for forced stabilisation and coordination over fixed-path machines. Beginners: a "5 Essential Barbell Exercises" framework. Diverse implements: KBs, DBs, barbells, bodyweight, strongman.

**Volume / intensity / progression.** General guide 3–5 sets/exercise, each muscle 2–3×/week. "Strength & Sets" classes: more sets, fewer reps (~5×5). Heavy lifts use **nervous-system priming warm-ups** (e.g. bench: bar × explosive → 60 × explosive → 80 × 3 → 100 × 2 → target). Advanced progression = tighter jumps (singles at 90% and 95–97%) over grinding volume — "explosive intent, minimal fatigue, maximum confidence."

**Sources.** gamechangingstrength.com · @coach_christianwilson · YouTube: ChristianWilson · Critical Bench articles.

---

## 6. Kaleb Singh (Mass Coaching)

**Background.** Powerlifter (~800kg total). Operates Mass Coaching.
**Approach.** Structured, individualised programs with technical/scientific input; personalised periodization and volume/intensity management; addresses specific issues (e.g. Bulgarian split squats for hypertrophy + knee pain). Testimonials indicate standard schemes (5×5 squat, 4×6 bench) inside individualised macrocycles.
**Public availability:** granular periodization models, volume landmarks and progression frameworks are **not publicly published** — profile depth is limited by design.
**Sources.** @kaleb.masscoaching · Facebook: Kaleb Alexander-Singh · Oneflare.

---

## 7. Matthew Coates (IFBB Pro)

**Background.** IFBB Pro, online prep & lifestyle coach, 10+ years. Associated with Bodyworks Massage, Bull Nutrition, Iiron Legacy, Luxara Labs, 1CC Athletics.
**Approach.** Structured, education-first prep and lifestyle coaching — clients understand the *why* behind training, nutrition, recovery. Notable concept: the **"Productivity Window"** — optimise training and recovery around individual productivity cycles.
**Public availability:** splits, set/rep schemes, MEV/MAV/MRV and periodization models are **private to paying clients**; public content covers discipline and lifestyle integration.
**Sources.** @mcphysiques_ifbbpro · linktr.ee/mcphysiques.

---

## Kuba — programming principles (frequency, volume & recovery)
*Source: Kuba Cielen (Kilo Culture channel) upper-lower vs push-pull-legs breakdown, transcribed July 2026. This is Kuba's own contest-prep self-programming — it extends §3 above with his live volume/frequency reasoning and maps directly onto VitalEdge's block/RIR/frequency logic.*

**Core thesis: program what you can *recover from and repeat*, not what you can do.** An effective program prescribes *enough* work to drive a response and progress, at a level you can sustain and progress consistently — not maximum work. "Bodybuilding is simple until it isn't" — a bro split needs little programming knowledge; higher-frequency splits (upper/lower, PPL) demand real understanding of exercise selection, frequency, execution and resistance profiles.

**Effective volume ≠ counted sets.** The same set becomes *more effective* as frequency rises, so **direct volume must come down when frequency goes up**. His own mistake, shown as a worked example: he matched set-for-set volume from a PPL split when moving to upper/lower, progressed at first, then stalled — because higher frequency raised the effective stimulus per set. Weekly volume also shifts with exercise selection and resistance profile, and: **when you're stronger, train more precisely, use fuller ROM and better execution, your required number of working sets goes *down*.** (Direct tie-in to VitalEdge's RIR logging: the "same" logged set is not the same dose across frequencies.)

**Frequency is only king if recoverable.** Upper/lower (2 on/1 off) vs PPL (3 on/1 off) differ by ~1 day of frequency — not huge. "Frequency is only beneficial if you can repeat high-quality sets." Going into sessions with excessive soreness and failing to progress or even retain lifts = too much: too much volume, too much stretch loading, or too high frequency for the set volume. **The body won't adapt to a novel stimulus if it's too fatigued/sore to drive that stimulus.** Slogan: *"not all volume is created equal."*

**Don't chase pain/fatigue/sensation.** His logged auto-regulation notes ("legs wrecked, sleep broken… what's the point in sustaining this if I'm just wrecking myself?") — an extra back-off set that costs quality reps and progression adds nothing. Chasing the wrecked feeling ticks a mental box but isn't productive if it breaks sustainable progression.

**Quads are the volume-sensitivity exception.** Quads tolerate less volume/frequency than other body parts for many people (genetic fibre-type variability). Practical fix he uses with clients: pull quad volume back to essentially one hard session/week — a designated **quad-focus day** — with only light hamstring/calf work, plus a lighter top-up of quad isolation elsewhere. Key limiter is **frequency of deep knee-flexion stretch under load** (hack squat, loaded leg press), which drives connective-tissue and knee issues even with perfect execution.

**A/B lower split to sustain frequency without wrecking quads:**
- **Lower A (quad-dominant):** hack squat / leg press / leg extension with real quad volume; deep-stretch loading present.
- **Lower B (hip-dominant):** hamstring curl, hip thrust, hyperextension, leg extensions biased to the *shortened* range (less muscle damage), minimal leg press on a machine that *drops off in the stretch* (e.g. Cybex) rather than loads it.
- Result: every body part hit every ~4 days for quality stimulus, but true heavy quad-stretch exposure only every ~8 days.

**Exercise ordering & priority (consistent with Bennett above):** most demanding / priority movement goes first while fresh — to bring up a lagging part, open the session with it (arms first on an upper day; a quad-focus day for lagging legs). Stagger antagonists so movements complement rather than interfere (e.g. single-arm pulldown between press sets doesn't tax the press). Compounds before isolations.

**Diet-phase goal shifts to retention.** In a cut/prep, the goal is performance *retention* (stay strong → stay big), not progression — and *don't* inflate volume in prep. Excess prep volume is what makes lifters "fade, get flat and get small"; manage fatigue, prioritise higher-effort sets, don't do sets for the sake of sets.

**Session duration as the real limiter at size.** As he got bigger/stronger, frequency wasn't the thing that smashed him — *workout duration* was. He can sustain frequency; the constraint is keeping volume and exercise selection appropriate so sessions stay ~75–90 min.

*App note (VitalEdge):* this is the clearest external validation of the app's **6+1 block, RIR-based, logging-only** design and its **frequency-aware** ambitions. Concrete rules worth encoding in `promptBuilder.ts`: (1) when a client's frequency for a muscle increases, reduce prescribed direct sets rather than holding them constant; (2) flag quads for lower volume/frequency ceilings and offer an A/B lower structure; (3) treat "excessive soreness + stalled/declining logged loads" as an over-reach signal in coach review, not a reason to add volume; (4) in a client's declared diet phase, target retention and cap volume growth. None of this requires load-computation — it's all selection/frequency/volume guidance, which stays inside the app's logging-only boundary.

## Cross-coach synthesis (for prompt design)

**Where they converge** — useful as universal defaults in `promptBuilder.ts`:
- Execution quality gates progression (Bennett, Kuba, Shallow all agree: load only counts with pristine form).
- Individual anatomy over "must-do" exercises (Bennett, Shallow).
- Fatigue is the budget: S:F ratios (Kuba/Bennett), external-stability loading (Shallow).
- RIR/RPE as the intensity language across all hypertrophy and strength profiles — matches VitalEdge's RIR-based logging.

**Where they diverge** — these are the switches the methodology selector actually flips:
- **Deloads:** Kuba schedules week 6 at 50%; Shallow eliminates them via load management. VitalEdge's 6+1 block default is Kuba-shaped; a Shallow-overlay client should see exercise rotation instead of a volume cliff.
- **Machines vs barbells:** Shallow/Kuba lean machine-heavy for hypertrophy; Wilson barbell-first for function/strength.
- **Progression trigger:** reps-first double-progression (Kuba) vs execution-gated load (Bennett).
- **Tempo:** prescribed and non-negotiable (Kuba 3-1-1-0) vs cue-driven (Bennett) — the prompt should only emit tempo notation for Kuba-profile clients.
- **Volume vs frequency:** see Kuba's programming-principles section above — effective volume falls as frequency rises, quads are the sensitivity exception, and recoverability gates the whole thing. This is the app's frequency-aware logic in prose.

## Related
- [[Coach Program Library]]
- [[Injury Adaptation Research]]
- [[VitalEdge Hub]]
