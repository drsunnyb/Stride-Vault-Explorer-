# Expo ↔ Swift feature parity audit

Scope: business logic, data models, mechanics and platform integrations. UI/UX styling is intentionally excluded — the Swift app uses native iOS design and is allowed to diverge there.

Legend: ✅ parity · 🟡 partial / simplified · ❌ missing in Swift · ➕ Swift-only

---

## 1. Vault catalogue & geo

| Area | Expo | Swift | Status |
|---|---|---|---|
| Catalogue size | ~1,100 (curated + procedural, FNV-1a + Mulberry32) | ~1,100 (ported, byte-identical IDs/coords) | ✅ |
| Map clustering & brand priority | Yes | Yes | ✅ |
| Geofence radius (landmark / branded) | `CLAIM_RADIUS_METERS` (single) | 50 m / 25 m split | 🟡 *(Swift is actually stricter — Expo uses one radius)* |
| Distance display | metres / km | metres / km | ✅ |
| Demo "walk to vault" teleport | `teleportTo()` | `demoWalk(to:)` | ✅ |
| Vault respawn timer (`respawnMs`) | Plus shortens respawn | ❌ not implemented | ❌ |
| `MIN_STEPS_BETWEEN_CLAIMS` anti-cab-hop gate | 80 steps between claims | ❌ not enforced | ❌ |

## 2. Claim payout / multiplier stack

Expo's `claimMutation` applies a multi-source multiplier; Swift only applies the base reward + a flat brand bonus.

| Multiplier | Expo | Swift |
|---|---|---|
| Base coins/XP from vault tier | ✅ | ✅ |
| Branded bonus | 1.5× brand coins | 1.5× brand coins ✅ |
| Daily-claim tier curve (`DAILY_CLAIM_TIERS` / `_PLUS`) | ✅ | ❌ |
| Daily hard cap (free vs Plus) | ✅ | ❌ |
| Plus payout bonus (`PLUS.payoutBonus`, 2×) | ✅ | ❌ |
| Streak multiplier (`streakMultiplier`, capped at 1.25× free / 1.75× Plus) | ✅ | ❌ (streak is a display number only) |
| Hot Vault 5× (`HOT_VAULT_MULTIPLIER`) | ✅ | ❌ |
| Power Hour multiplier (`activePowerHour`) | ✅ | ❌ |
| Final-hour 2× (`FINAL_HOUR_MULTIPLIER`) | ✅ | ❌ |
| Comeback 1.5× (`COMEBACK_MULTIPLIER`) | ✅ | ❌ |
| Tribe Derby win bonus | ✅ | ❌ |
| Global multiplier cap (`MAX_TOTAL_MULTIPLIER = 20`) | ✅ | n/a |

> Impact: a Swift claim almost always pays out the flat tier value, so Plus / streak / events have no economic effect.

## 3. Steps & pedometer

| Feature | Expo | Swift |
|---|---|---|
| Live step tracking | `expo-sensors` pedometer + `watchSteps`, session baseline, midnight rollover | ❌ static `todaySteps = 4_812` mock |
| `DAILY_STEP_GOAL` (5,000) | ✅ | uses 8,000 ➕ different value |
| `DAILY_STEP_BONUS_COINS` (50) one-shot | ✅ | ❌ |
| Lifetime steps | derived | static mock `246_802` |

## 4. Retention / live ops

| System | Expo | Swift |
|---|---|---|
| Power Hours (deterministic per-day schedule, 3× / sometimes 4×) | ✅ `powerHoursForDay`, `activePowerHour`, `nextPowerHour` | ❌ |
| Hot Vaults (5 per window, 5×, locks once claimed) | ✅ | ❌ |
| Streaks + `streakDays` + freeze item (`STREAK_FREEZE_COST` 300, free every 14 days) | ✅ `buyStreakFreeze` | ❌ (display number only) |
| Comeback boost (after 3-day drop, next 3 claims at 1.5×) | ✅ | ❌ |
| Final Hour of week/month | ✅ | ❌ |
| Tribe Derby (weekly, deterministic pair) | ✅ `derbyTribesThisWeek`, `claimTribeBonus`, `TRIBE_WIN_BONUS` 200 | ❌ |
| Prediction market (`PREDICT_MIN/MAX_STAKE`, 5% rake, weekly market id) | ✅ resolves & pays | 🟡 stake/pick only — no resolution, no rake |
| Weekly stake / Champions Pool (2% rake on stake challenges) | ✅ | 🟡 `joinWeeklyStake` exists, no settlement |
| Stake challenges (6 participants max, accept/decline, settlement) | ✅ | 🟡 `joinChallenge` flag only, no pot / settlement |

## 5. Economy & rewards

| Item | Expo | Swift |
|---|---|---|
| Reward catalogue source | `fetchRewards()` backend + `REWARDS` fallback | hard-coded in `AppData` |
| Brand registry / dynamic brands | `fetchBrands()` + `registerBrands` | hard-coded (`nike` / `apple` / `lulu`) |
| Exchange rate | per-brand (`EXCHANGE_RATES`, default 5:1) + daily cap (`EXCHANGE_DAILY_CAP`) | global 2:1, no daily cap |
| Exchange direction | Stride → brand only ✅ | Stride → brand only ✅ |
| Branded rewards require brand coins | ✅ | ✅ |
| Redemption codes (`makeRedemptionCode`, stored history) | ✅ | ❌ no redemption history persisted |
| Raffles (`RAFFLES`, `findRaffle`, countdown, entries) | ✅ + backend `fetchRaffles` | 🟡 local data, `enterRaffle` works, no draw |
| Prize ladders per period (`PRIZE_LADDERS`, `prizeForRank`, `claimLadderRewards`) | ✅ | ❌ |

## 6. Social / friends / leaderboards

| Feature | Expo | Swift |
|---|---|---|
| Friends list (`SEED_FRIENDS`, `addFriend`, `removeFriend`) | ✅ | 🟡 read-only seed list |
| Global player pool (`GLOBAL_PLAYERS`, `ALL_KNOWN_USERS`) | ✅ | ✅ via `AppData` |
| Deterministic period coin pseudo-stats (`pseudoPeriodCoins`) | ✅ | ✅ (ported) |
| Leaderboards: friends / global / brand, per-period (week/month/year) | ✅ `leaderboardFor`, `brandLeaderboardFor`, `myRankFor` | ✅ |
| Tribe leaderboard / weekly tribe coins | ✅ | 🟡 displays but no claim flow |
| Share reward (`SHARE_REWARD_COINS` 30, `MAX_DAILY_SHARES` 3) | ✅ `recordShare` | ❌ |
| Referrals (`REFERRAL_BONUS_COINS` 500, both sides) | ✅ `claimReferral` | ❌ |

## 7. Plus / paywall

| Item | Expo | Swift |
|---|---|---|
| Subscription state (`player.plus`, plans, renewal, trial, `isPlusActive`) | ✅ `subscribeMutation`, `cancelPlus`, `isoWeek` welcome bonus | 🟡 `isPlus: Bool` flag only |
| Paywall re-trigger rules (`shouldShowPaywall`, weekly cap, multiple triggers) | ✅ | ❌ paywall is manual-open only |
| Plus payout bonus / streak ceiling / hot-vault priority / branded-vault access gate | ✅ enforced in claim path | ❌ no enforcement |
| `markPlusOnboardingSeen` / welcome bonus delivery | ✅ | ❌ |

## 8. Onboarding & first-run

| Item | Expo | Swift |
|---|---|---|
| Multi-step onboarding (handle, avatar, goal, tribe, referral, permissions) | ✅ (`app/onboarding.tsx`, 1,322 LOC) | 🟡 single screen, captures handle/name only |
| Sign-in (Apple / Google / Email) | scaffold in `lib/auth` | ❌ no auth UI |
| Permission primers (Motion, Notifications, Location) | ✅ | 🟡 only Location prompt fires (via `LocationService.start`) |
| "Welcome 100 coins" bonus animation | ✅ | ❌ |
| `hasCompletedOnboarding` gate | ✅ | ✅ |
| Resume-where-you-left-off (per-step persistence) | ✅ | ❌ all-or-nothing |

## 9. Notifications

| Feature | Expo | Swift |
|---|---|---|
| Permission request | `requestNotificationPermission` | ❌ |
| Daily reminder (`scheduleDailyReminder`) | ✅ | ❌ |
| Vault respawn notification (`scheduleVaultRespawn`) | ✅ | ❌ |
| Cancel-all (`cancelAllStrideNotifications`) | ✅ | ❌ |

## 10. Persistence

| Item | Expo | Swift |
|---|---|---|
| Storage layer | AsyncStorage `stridequest.player.v7` (full `PlayerState` blob) | ❌ in-memory only — relaunching the app wipes coins, claims, predictions, exchanges, ownedRewards, prefs |
| React Query cache for backend (rewards / raffles / brands) | ✅ | n/a (no backend) |
| Schema migration (versioned key) | ✅ | n/a |

## 11. Backend / network

| Endpoint | Expo | Swift |
|---|---|---|
| `fetchRewards`, `fetchRaffles`, `fetchBrands` | ✅ via `lib/backend.ts` | ❌ no networking layer |
| Analytics (`lib/analytics`) | ✅ | ❌ |
| Logger (`lib/logger`) with sanitization | ✅ | ❌ uses raw `print` if anywhere |
| Auth (`lib/auth.tsx`) | scaffold | ❌ |

## 12. Platform / device APIs

| API | Expo | Swift |
|---|---|---|
| Step counter | `expo-sensors` Pedometer | ❌ (HealthKit / CMPedometer not wired) |
| Location | `expo-location` indirectly via map | ✅ `CoreLocation` (`LocationService`) ➕ better than Expo here |
| Haptics | `expo-haptics` | ✅ `Haptics` |
| Notifications | `expo-notifications` | ❌ |

## 13. Identity & profile

| Field | Expo `PlayerState` | Swift `VaultStore` |
|---|---|---|
| `username` | ✅ | `handle` ✅ |
| `displayName` | ✅ (`username`) | ✅ |
| `avatarSeed` | string | int |
| `level` / `xp` / `xpForLevel` curve | ✅ | xp only, no level/curve |
| `streakDays` | ✅ + freeze + comeback counters | display only |
| `hotVaultClaims` per day | ✅ | ❌ |
| `comebackClaimsRemaining` | ✅ | ❌ |
| `plus` subscription object | ✅ | `isPlus: Bool` |
| `tribeId` + bonuses | ✅ | id only |

---

## Recommended next steps (priority order)

1. **Persistence** — add an `AsyncStorage`-equivalent via `Codable` + `UserDefaults` / a JSON file in `Application Support` so progress survives relaunch. Highest user-visible gap.
2. **Multiplier stack in `claim()`** — port `combineMultipliers`, `streakMultiplier`, `dailyClaimMultiplier`, hot-vault/power-hour/final-hour/comeback checks. Everything else (Plus, streaks, events) is dead weight without this.
3. **Step tracking** — wire `CoreMotion CMPedometer` (or `HKHealthStore`) behind a `StepService` so `todaySteps` / `lifetimeSteps` are real.
4. **Retention schedule helpers** — port `powerHoursForDay`, `hotVaultIdsForWindow`, `inFinalHour`, `derbyTribesThisWeek` (all pure functions, mechanical port).
5. **Plus enforcement** — gate branded-vault claims, apply 2× payout, expand streak ceiling. `shouldShowPaywall` re-trigger rules.
6. **Notifications** — `UNUserNotificationCenter` parity for daily reminder + vault respawn.
7. **Prediction / challenge settlement** — resolve markets, distribute pots minus rake.
8. **Backend layer** — share the rewards/raffles/brands fetches so the catalogues stay in sync.
9. **Onboarding parity** — multi-step flow + sign-in (matches PLAN.md).
10. **Referrals + share rewards** — small but visible economy taps.
