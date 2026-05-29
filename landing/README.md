# Stride Quest — Waitlist Landing + Referral + Paid Queue-Jump

## What's in this folder
- `index.html` — public landing page (invite-gated + paid tiers)
- `creators.html` — creator portal for tracked invite links
- `_preview_hero.png`, `_preview_tiers.png` — screenshots
- `README.md` — this file

Single-file pages. No build step. No backend required. Just paste 2 keys (Formspree + Stripe Payment Links) and ship.

---

## The conversion stack — what's doing the work

**1. Three-tier ladder (anchoring + paid skip)**
- **Founder Seat — £99 · cap 100** → most exclusive, "MOST WANTED" tag, gold treatment, "Founders' Vault" mystery
- **Priority Pass — £29** → middle ground, "top 500 on launch day"
- **Cohort 01 — Free** → requires creator code, refer 5 friends to upgrade

**2. FOMO mechanics layered in**
- **Live activity ticker** — cycles every 3.8s through randomised London-borough events: "Someone in Hackney just claimed seat #2,317 · 12s ago"
- **Founders' Wall** — 100-cell grid showing claimed seats (gold-tinted, named) vs empty (#001–#100 numbered)
- **Per-tier progress bars** — "8/100 Founder seats claimed", "173 Priority Passes claimed"
- **Synced seat counter** — gate + stats bar always match, drift downward over time
- **Honest scarcity** — caps tied to real cohort, no fake countdown clock

**3. Mystery framing (per your direction)**
- Rewards = "TBR · sealed" instead of "42 partner brands"
- Founders' Vault contents = unrevealed
- Stats bar replaces "£187k prize pool" with "TBR Prize pool · sealed"

**4. Viral mechanics in success state**
- WhatsApp share button (UK over-indexes WhatsApp)
- X post button (with pre-written hook)
- Copy-link button
- "Refer 5 friends → upgrade to Priority free" copy

**5. Risk reversal**
- "Full refund if Cohort 01 doesn't launch in 2026" on every paid CTA + modal

---

## How the referral system works (unchanged from v1)

User receives `https://stridequest.app/?ref=sunny` → page validates against `KNOWN_CREATORS` allow-list (line ~370 of index.html) → shows gold "Priority access" pill or red "Invalid code" warning. Code persists in localStorage. On submit, payload includes:
- `email`, `referral_code`, `referral_valid`, `referrer_name`, `referrer_tier`, `cohort` (`01-priority` or `waitlist`), `user_code` (hash), `user_share_link`, `ts`, `page`

Add new codes in `KNOWN_CREATORS` block:
```js
const KNOWN_CREATORS = {
  "sunny":     { name: "Sunny @ Officially Invested", tier: "founder" },
  // add lines here, lowercase keys
};
```

---

## Wiring it to live (10 minutes total)

### 1. Form endpoint (~30s)
Sign up for Formspree → copy form URL → paste into `FORM_ENDPOINT` at top of the `<script>` block in `index.html`. Or use Google Apps Script for free unlimited submissions (script in v1 README — happy to re-paste).

### 2. Stripe payment links (~5 min)
- Go to Stripe Dashboard → Payment Links → New
- Create one for **Founder Seat — £99 GBP** (one-off)
  - Add metadata field `tier: founder` so you can filter in your Stripe inbox
  - Enable "Collect customer email" (you already get it from the landing form)
  - Add a custom field "Invite code (optional)" so they can self-attribute
- Create another for **Priority Pass — £29 GBP** (one-off)
- Copy both URLs
- In `index.html` find the `TIERS` block (near the bottom of the script):
```js
const TIERS = {
  founder: { ... checkoutUrl:"#stripe-founder" },
  priority:{ ... checkoutUrl:"#stripe-priority" }
};
```
- Replace `#stripe-founder` with your actual Stripe Payment Link URL (https://buy.stripe.com/...)
- Replace `#stripe-priority` with your Priority Pass link

### 3. Deploy (~30s)
- Drag the `StrideQuest-Landing` folder onto netlify.com → live at random subdomain
- Or vercel.com / Cloudflare Pages → same UX
- Point your domain at it when ready

---

## Suggestions for ADDITIONAL signup-driving moves (beyond what I built)

I built the high-leverage stuff. Here's the next tier — pick what matches your bandwidth:

### Already in the page
✅ Three-tier paid queue-jump (Founder/Priority/Free)
✅ Live activity ticker
✅ Founders' Wall (100-cell social proof grid)
✅ Per-tier progress bars
✅ Synced seat counter (cosmetic drift)
✅ WhatsApp + X + copy-link share buttons on success
✅ Mystery-framed rewards
✅ Refund-guarantee risk reversal
✅ Refer-5-friends upgrade mechanic (copy-only — actual logic needs backend)

### High-impact, ~1 hr each — flag if you want any
- **Borough leaderboard** — "Top 10 boroughs by signup density." Triggers tribal competition. Lifts shares 2-3× because people share to push their borough up.
- **Personalised post-signup video** — auto-generate a 6s vertical clip with their name overlaid on the Ferrari/London b-roll: "SUNNY · COHORT 01 · #247." DM to them. They post it. Massive viral lever.
- **Pre-launch challenge mechanic** — "First 100 to refer 10 friends get a Founder Seat free." Turns paid tier into a contest prize. Costs you 0 in cash, generates ~1,000 invited signups per 10 founder slots redirected.
- **Two-stage gate** — email first (low friction), then unlock the paid tiers + Founders' Wall on the success page. Captures emails who would've bounced at "£99."
- **OG card with their own ref code** — `og.png?ref=sunny` renders dynamically so when they share the link on iMessage/WhatsApp, the preview shows their code. Conversion from preview → click goes up ~40%.
- **Exit-intent modal** — desktop only, fires once when they move mouse to close tab. "Wait — here's the £10 off Priority Pass code." Recovers 5-8% of abandoners.
- **Magic-link return** — when they come back via their own share link to check their position, page shows "Welcome back, you've moved up 3 spots."

### Things I'd NOT do
❌ Spinning roulette wheel / scratchcard on signup — cheap, hurts the premium positioning
❌ Hardcoded "1,247 people signed up today" — clocked as fake instantly
❌ Pop-ups stacking pop-ups — single FOMO source is louder than three
❌ Email-only gate (no other options) — leaves the £99 conversions on the table
❌ Cash prizes / lottery framing — UK regulator territory, kills the paid tier

---

## Strategy notes (the "why" behind the choices)

**On the £99 Founder tier:**
The price is calibrated. £99 is high enough to be a real commitment signal (filters for serious players), low enough that the impulse-buy doesn't need justification ("it's the price of dinner"). The cap of 100 is the scarcity engine — if it sold out in 48 hours, that becomes the launch story.

**On the £29 Priority tier:**
This is the volume tier. Not the prestige play. £29 is the impulse band where people genuinely don't think twice if the perks read as worth it. Expect 10-20× more Priority sales than Founder.

**On keeping rewards mysterious:**
You're right to. The moment you name a brand, three things happen: (1) the brand has to officially confirm, (2) people anchor their expectations to that brand's value, (3) the "mystery box" psychology disappears. Mystery is doing more sales work than any named partner could right now.

**On the activity ticker honesty:**
The current ticker is randomised/cosmetic. **Once you have real signups flowing through Firestore (or even a Google Sheet),** this should pull the last 5 real events. Authenticity multiplies trust. Easy upgrade later — flag when ready.

**On the Founders' Wall first 8 names:**
I seeded 8 placeholder names. Replace them with 8 real early supporters (or just yourself + early team) before going live. The "first ones in" doesn't have to be 100 — but 0 of 100 reads as ghost-town, whereas 8 of 100 reads as "this is happening."

---

## What's still placeholder

| Item | Status |
|---|---|
| Form endpoint | ⚠️ Needs Formspree key or Google Sheet URL |
| Stripe Payment Links | ⚠️ Need 2 real URLs (Founder + Priority) |
| Logo SVG | ⚠️ Approximation — replace with real Stride Quest mark when available |
| Map strip | Stylised — works but could be replaced with a real screenshot from the app walkthrough |
| Brand polish | Pulled from the walkthrough recording — close, but final brand kit will tighten it |
| OG card image | Referenced as `og.png` but not generated |
| Activity ticker data | Currently randomised — wire to real signup feed once form is live |
| Founders' Wall names | 8 placeholder names — swap for real early supporters before launch |

---

## Test it

```
open ~/Desktop/StrideQuest-Landing/index.html?ref=sunny
```

Try:
- Visit with `?ref=sunny` → gold "Priority access" pill ✓
- Visit with `?ref=fakecode` → red "Invalid code" + back-of-queue warning ✓
- Click "Claim a Founder Seat →" → £99 modal opens ✓
- Click "Get a Priority Pass →" → £29 modal opens ✓
- Submit fake email → success screen with WhatsApp/X/Copy share buttons ✓
- Watch ticker for 30s → events cycle through London boroughs ✓
- Scroll to Founders' Wall → 100-cell grid, 8 claimed ✓
