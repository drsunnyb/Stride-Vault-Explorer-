# Raffles-only burn economy + tightened earn rate + full admin raffle controls

## Goal

Lock spending to **raffles only** for the initial rollout. Coins are easier to model against a real £ outlay because every burn goes to a known prize pool. The rest of the catalogue stays visible (so users see what's coming) but can't be redeemed. Earn rate is trimmed so raffles feel meaningful rather than instant.

## What users will see

**Rewards tab (Expo + iOS)**
- New hero card at the top: **"🎟️ Raffles — the only way to spend your coins right now"** with a one-tap shortcut into the raffle list.
- Below it, the existing vouchers/brand perks render as **"COMING SOON" preview cards** — dimmed, gold "Coming soon" chip, redeem button replaced with "Notify me when live", no tap-through to a redeem flow.
- A small explainer line: *"We're starting with raffles so every coin you spend goes straight into the prize pool. Vouchers and brand perks unlock as we onboard partners."*

**Brand coins (Nike Coins, Apple Credit)**
- Branded vaults now mint **Stride Coins only** (the brand-coin payout is auto-converted at the current exchange rate at claim time).
- Existing brand-coin balances are auto-converted to Stride Coins on first launch and a one-time toast confirms it.
- Brand-coin wallet pills hidden from the wallet card; brand chips on vault cards still show which partner the vault belongs to (just stops minting brand currency).

**Earn rate (tightened)**
- Base vault coin yields cut ~25% across rarity tiers.
- Multiplier stack hard-capped at **10×** total (was 20×).
- Power Hour cap reduced from 3× to 2×.
- Hot Vault multiplier cap reduced from 5× to 3×.
- Streak multiplier cap stays (×1.75 at day 14) — streaks are a retention lever.
- Daily soft-cap on coins-from-claims (e.g. ~3,000/day for free users, ~5,000 for Stride+) with a friendly "Daily cap reached — come back tomorrow for fresh vaults" notice.

**Raffle pricing reworked around £500–£1,500/week outlay**
- Headline raffles (AirPods, Vaporfly, Westfield voucher) priced so ~80% of weekly coin supply gets absorbed before draw.
- Tiered prize ladder: 1 hero prize (~£500), 2–3 mid prizes (~£100–£200), 5–10 small prizes (~£20–£50).
- Per-user entry caps to stop whales sweeping a draw.
- Free weekly raffle ticket for Stride+ stays.

## Admin dashboard — new raffle controls

A revamped **Raffles** page in the web admin with full CRUD:
- **Create new raffle** — title, prize description, prize £ value, hero emoji/image, end date & time, number of winners, ticket cost in coins, max tickets per user, Stride+ only toggle, partner brand tag (optional).
- **Edit live raffles** — change any field on the fly; mobile apps pick up changes within ~60s.
- **Weekly budget meter** at the top — shows total £ value of prizes ending in the next 7 days vs your £500–£1,500 target band, with green/amber/red status.
- **Coin sink forecast** — estimated coins-burned per raffle (entries × cost) with a running total, so you can see if pricing absorbs the week's earn supply.
- **Draw winner** — one-tap "Draw now" button on ended raffles: picks N winners weighted by entries, locks the result, shows the chosen user IDs, marks the raffle settled.
- **Soft-delete / archive** old raffles without breaking historical entries.

## Pages affected

- **Rewards tab** — new "Coming soon" treatment for non-raffle items, raffles hero card.
- **Vault claim flow** — brand-coin auto-conversion + new earn caps applied silently.
- **Wallet card** — brand-coin pills removed for now.
- **Admin → Raffles** — full create/edit/draw UI replacing the read-only table.
- **Admin → Live Events** — unchanged.
- **Admin → Memberships** — unchanged (Stride+ still gives extra weekly free raffle entry).

## Notes

- All numbers (earn caps, multipliers, raffle pricing) become **admin-editable** under the existing Config page, so you can re-tune without a redeploy.
- A small "Economy preview" panel in the admin will show, per week: estimated coins minted vs coins burned vs £ outlay, so the burn loop stays balanced.
