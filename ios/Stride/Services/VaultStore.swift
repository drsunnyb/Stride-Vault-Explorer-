import Foundation
import Observation
import SwiftUI
import CoreLocation

/// Single source of truth for the player. Mirrors `expo/providers/GameProvider`
/// so both apps share economy mechanics — persistence, multiplier stack,
/// retention engine, steps, notifications, settlement.
@Observable
final class VaultStore {
    // ── Catalogue ───────────────────────────────────────────────────────────
    var vaults: [Vault] = VaultCatalog.all

    // ── Persisted state ─────────────────────────────────────────────────────
    private var state: PersistedPlayer = PlayerPersistence.load()

    // ── Step service ────────────────────────────────────────────────────────
    private let stepService = StepService()

    // ── Demo mode ───────────────────────────────────────────────────────────
    /// Demo mode lets the user "virtually walk" to a vault so the simulator
    /// experience matches the Expo build. Real GPS still drives the geofence.
    var demoMode: Bool = true

    /// Live wall-clock — used for retention timers. Bumped by `tick()`.
    private(set) var now: Date = Date()

    init() {
        wireSteps()
        settleOverdue()
    }

    // ── Catalogue helpers ───────────────────────────────────────────────────
    private static let dailyStepGoal: Int = 5_000
    private static let dailyStepBonusCoins: Int = 50
    private static let minStepsBetweenClaims: Int = 80
    private static let shareRewardCoins: Int = 30
    private static let maxDailyShares: Int = 3
    private static let referralBonusCoins: Int = 500
    /// Welcome bonus paid the first time onboarding completes.
    static let onboardingWelcomeCoins: Int = 100

    // MARK: - Persisted accessors

    var claimedIDs: Set<String> {
        get { Set(state.claimedIDs) }
        set { state.claimedIDs = Array(newValue); save() }
    }
    var coins: Int { get { state.coins } set { state.coins = newValue; save() } }
    var xp: Int { get { state.xp } set { state.xp = newValue; save() } }
    var level: Int { get { state.level } set { state.level = newValue; save() } }
    var streak: Int { get { state.streak } set { state.streak = newValue; save() } }
    var streakFreezes: Int { get { state.streakFreezes } set { state.streakFreezes = newValue; save() } }
    var todaySteps: Int { get { state.stepsToday } set { state.stepsToday = newValue; save() } }
    var stepGoal: Int = 5_000
    var lifetimeSteps: Int { get { state.stepsLifetime } set { state.stepsLifetime = newValue; save() } }
    var brandCoins: [String: Int] { get { state.brandCoins } set { state.brandCoins = newValue; save() } }

    var userCoordinate: CLLocationCoordinate2D {
        get { state.userCoordinate }
        set { state.userCoordinate = newValue; save() }
    }

    var weeklyStakeJoined: Bool { get { state.weeklyStakeJoined } set { state.weeklyStakeJoined = newValue; save() } }

    var handle: String { get { state.handle } set { state.handle = newValue; save() } }
    var displayName: String { get { state.displayName } set { state.displayName = newValue; save() } }
    var avatarSeed: Int { get { state.avatarSeed } set { state.avatarSeed = newValue; save() } }
    var tribeId: String? { get { state.tribeId } set { state.tribeId = newValue; save() } }

    // ── City waitlist ───────────────────────────────────────────────────────
    var homeCityId: String? { state.homeCityId }
    var homeCity: City? { state.homeCityId.flatMap { Cities.byId[$0] } }
    var cityVotes: [String: Int] { state.cityVotes }

    /// Picks the player's home city. Seeds a starter vote so the leaderboard
    /// reflects their choice immediately. Resets the step-credit baseline so
    /// already-walked steps don't dump into the new city in one go.
    func setHomeCity(_ cityId: String) {
        let prev = state.homeCityId
        state.homeCityId = cityId
        if cityId != Cities.liveId, (state.cityVotes[cityId] ?? 0) == 0 {
            state.cityVotes[cityId] = 1
        }
        if prev != cityId {
            state.cityVoteStepsCredited = state.stepsLifetime + state.stepsToday
        }
        save()
    }

    /// Adds `n` votes to the home city (no-op when London is picked).
    func addCityVotes(_ n: Int) {
        guard n > 0, let cityId = state.homeCityId, cityId != Cities.liveId else { return }
        state.cityVotes[cityId, default: 0] += n
        save()
    }

    /// Mints city votes from accumulated steps. Called from the step service
    /// every time the live step count updates.
    func creditCityVotesFromSteps() {
        guard let cityId = state.homeCityId, cityId != Cities.liveId else { return }
        let total = state.stepsLifetime + state.stepsToday
        let pending = total - state.cityVoteStepsCredited
        let newVotes = pending / CityWaitlistConfig.stepsPerVote
        guard newVotes > 0 else { return }
        state.cityVotes[cityId, default: 0] += newVotes
        state.cityVoteStepsCredited += newVotes * CityWaitlistConfig.stepsPerVote
        save()
    }

    /// Leaderboard rows for the waitlist (seeded base + this player's votes).
    struct CityLeaderboardRow: Identifiable, Hashable {
        let city: City
        let base: Int
        let mine: Int
        var total: Int { base + mine }
        var isHome: Bool
        var id: String { city.id }
    }

    func cityLeaderboard() -> [CityLeaderboardRow] {
        let my = state.cityVotes
        let homeId = state.homeCityId
        return Cities.all
            .filter { $0.status == .waitlist }
            .map { c in
                CityLeaderboardRow(
                    city: c,
                    base: Cities.seededVotes(c, now: now),
                    mine: my[c.id] ?? 0,
                    isHome: c.id == homeId
                )
            }
            .sorted { $0.total > $1.total }
    }

    var homeCityRank: Int {
        guard let id = state.homeCityId, id != Cities.liveId else { return 0 }
        let board = cityLeaderboard()
        return (board.firstIndex { $0.city.id == id } ?? -1) + 1
    }

    /// Steps remaining until the next city vote is minted.
    var stepsToNextCityVote: Int {
        guard let id = state.homeCityId, id != Cities.liveId else { return 0 }
        _ = id
        let total = state.stepsLifetime + state.stepsToday
        let pending = max(0, total - state.cityVoteStepsCredited)
        return CityWaitlistConfig.stepsPerVote - (pending % CityWaitlistConfig.stepsPerVote)
    }

    var ownedRewards: [String] { get { state.ownedRewards } set { state.ownedRewards = newValue; save() } }
    var redemptionHistory: [Redemption] { state.redemptionHistory }
    var raffleEntries: [String: Int] { get { state.raffleEntries } set { state.raffleEntries = newValue; save() } }
    var joinedChallenges: Set<String> {
        get { Set(state.joinedChallenges) }
        set { state.joinedChallenges = Array(newValue); save() }
    }
    var predictions: [Prediction] {
        get {
            state.predictions.map {
                Prediction(id: $0.id, pickPlayerId: $0.pickPlayerId, pickName: $0.pickName,
                           stake: $0.stake, placedAt: $0.placedAt,
                           result: Prediction.Result(rawValue: $0.result) ?? .pending)
            }
        }
    }

    var hasCompletedOnboarding: Bool {
        get { state.hasCompletedOnboarding }
        set { state.hasCompletedOnboarding = newValue; save() }
    }

    var paywallLastShown: Date? = nil

    /// Set by any view to request the soft paywall. RootView observes this and
    /// presents the sheet once the trigger passes `shouldShowPaywall`.
    var pendingPaywallTrigger: PaywallTrigger? = nil

    /// Convenience: request the paywall for `trigger`. No-op for Plus users or
    /// when this trigger has already fired this ISO week.
    func requestPaywall(_ trigger: PaywallTrigger) {
        guard shouldShowPaywall(trigger: trigger) else { return }
        pendingPaywallTrigger = trigger
    }

    // ── Plus subscription ───────────────────────────────────────────────────
    var plus: PlusSubscription? { state.plus }
    var isPlus: Bool {
        get { plus?.isActive(now) == true }
        set { /* compat: keep old setter for any caller, ignored when subscription model active */
            if newValue, state.plus == nil { state.plus = .new(plan: .monthly, now: now); save() }
            else if !newValue { state.plus?.active = false; save() }
        }
    }

    // MARK: - Vault rewards

    /// Deterministic *base* reward — same numbers across runs. Multipliers
    /// apply on top when actually claimed via `claim(_:)`.
    func reward(for vault: Vault) -> VaultReward {
        var rng = SeededRandom(seed: vault.id.hashValue)
        let coins = rng.int(in: vault.tier.rewardRange)
        let xp = rng.int(in: vault.tier.xpRange)
        if let brandId = vault.brandId {
            let brandCoins = Int(Double(coins) * 1.5)
            return VaultReward(coins: coins, xp: xp, brandId: brandId, brandCoins: brandCoins)
        }
        return VaultReward(coins: coins, xp: xp)
    }

    /// Full multiplier breakdown for the next claim of `vault`.
    func multiplierBreakdown(for vault: Vault) -> RetentionEngine.MultiplierBreakdown {
        let plusActive = isPlus
        let claimsTodayBefore = claimsTodayCount()
        let dayKey = RetentionEngine.dayKey(now)

        let daily = RetentionEngine.dailyClaimMultiplier(claimsTodayBefore: claimsTodayBefore, isPlus: plusActive)
        let streakMult = RetentionEngine.streakMultiplier(days: state.streak, isPlus: plusActive)
        let tierMult = tierPayoutMultiplier(for: state.claimedIDs.count)
        let plusMult = plusActive ? 1 + PlusConfig.payoutBonus : 1

        let hotIds = RetentionEngine.hotVaultIdsForWindow(vaults.map(\.id), now: now)
        let lockedHotId = state.hotVaultClaims[dayKey]
        let isHot = hotIds.contains(vault.id) && (lockedHotId == nil || lockedHotId == vault.id)
        let hotMult: Double = isHot ? RetentionEngine.hotVaultMultiplier : 1

        let ph = RetentionEngine.activePowerHour(now)
        let powerMult: Double = ph.map { Double($0.multiplier) } ?? 1
        let finalMult: Double = RetentionEngine.inFinalHour(now) ? RetentionEngine.finalHourMultiplier : 1
        let comebackActive = state.comebackClaimsRemaining > 0
        let comebackMult: Double = comebackActive ? RetentionEngine.comebackMultiplier : 1
        // Tribe boost: both winners and losers of the prior derby get +10%
        // this week. The "Redemption" arc keeps loss soft.
        let wkKey = RetentionEngine.isoWeek(now)
        let tribeMult: Double =
            (state.lastTribeWinWeek == wkKey || state.lastTribeLossWeek == wkKey) ? 1.1 : 1

        return RetentionEngine.combine(
            base: 1,
            tier: tierMult,
            daily: daily,
            plus: plusMult,
            streak: streakMult,
            hot: hotMult,
            power: powerMult * finalMult,
            comeback: comebackMult,
            tribe: tribeMult
        )
    }

    /// Stride Status passive payout multiplier — small bump per claimed tier band.
    private func tierPayoutMultiplier(for totalClaimed: Int) -> Double {
        switch totalClaimed {
        case ..<10:   return 1.0
        case ..<25:   return 1.05
        case ..<60:   return 1.1
        case ..<150:  return 1.15
        default:      return 1.2
        }
    }

    @discardableResult
    func claim(_ vault: Vault) -> VaultReward {
        // Respawn gate.
        if let lastMs = state.lastClaimAt[vault.id] {
            let respawn = respawnSeconds(for: vault)
            if now.timeIntervalSince1970 - lastMs < respawn { return reward(for: vault) }
        }
        // Anti-cab-hop: require N steps between claims (skip if first ever).
        let stepsSince = state.stepsLifetime + state.stepsToday - state.stepsAtLastClaim
        if !state.claimedIDs.isEmpty && stepsSince < Self.minStepsBetweenClaims {
            // Demo mode: bypass so the simulator preview stays usable.
            if !demoMode { return reward(for: vault) }
        }

        // Branded-vault Plus gate (free users get reduced brand-coin share, can still claim).
        let base = reward(for: vault)
        let breakdown = multiplierBreakdown(for: vault)
        if breakdown.total <= 0 { return base }  // hard daily cap reached

        let coinsPaid = max(1, Int((Double(base.coins) * breakdown.total).rounded()))
        let xpPaid = max(1, Int((Double(base.xp) * breakdown.daily).rounded()))

        // Apply economy effects.
        state.coins += coinsPaid
        var newXp = state.xp + xpPaid
        var newLevel = state.level
        var need = xpForLevel(newLevel)
        while newXp >= need {
            newXp -= need
            newLevel += 1
            need = xpForLevel(newLevel)
        }
        state.xp = newXp
        state.level = newLevel

        // Brand coins (Plus boosts the share).
        if let brandId = vault.brandId {
            let frac = isPlus ? PlusConfig.plusBrandCoinFraction : PlusConfig.freeBrandCoinFraction
            let grant = max(1, Int((Double(coinsPaid) * frac).rounded()))
            state.brandCoins[brandId, default: 0] += grant
        }

        // Claim records.
        if !state.claimedIDs.contains(vault.id) { state.claimedIDs.append(vault.id) }
        state.lastClaimAt[vault.id] = now.timeIntervalSince1970
        state.stepsAtLastClaim = state.stepsLifetime + state.stepsToday

        // Daily claim counter.
        let todayKey = RetentionEngine.dayKey(now)
        if state.lastActiveDay != todayKey {
            // Streak update (consecutive day check).
            updateStreak(forNewDay: todayKey)
            state.lastActiveDay = todayKey
        }

        // Hot vault lock-in.
        let hotIds = RetentionEngine.hotVaultIdsForWindow(vaults.map(\.id), now: now)
        if hotIds.contains(vault.id), state.hotVaultClaims[todayKey] == nil {
            state.hotVaultClaims[todayKey] = vault.id
        }

        // Comeback boost decrement.
        if state.comebackClaimsRemaining > 0 {
            state.comebackClaimsRemaining -= 1
        }

        save()

        // Schedule respawn notification.
        if state.notificationsEnabled {
            let fire = now.addingTimeInterval(respawnSeconds(for: vault))
            Task {
                await NotificationService.scheduleVaultRespawn(
                    vaultId: vault.id, vaultName: vault.name, at: fire
                )
            }
        }

        return VaultReward(coins: coinsPaid, xp: xpPaid,
                           brandId: vault.brandId,
                           brandCoins: vault.brandId == nil ? 0 : Int(Double(coinsPaid) *
                            (isPlus ? PlusConfig.plusBrandCoinFraction : PlusConfig.freeBrandCoinFraction)))
    }

    func isClaimed(_ vault: Vault) -> Bool { state.claimedIDs.contains(vault.id) }

    /// Approximate respawn window — Diamond/Platinum take longest. Plus halves it.
    func respawnSeconds(for vault: Vault) -> TimeInterval {
        let base: TimeInterval
        switch vault.tier {
        case .bronze: base = 60 * 60          // 1h
        case .silver: base = 4 * 60 * 60      // 4h
        case .gold:   base = 8 * 60 * 60      // 8h
        case .platinum: base = 16 * 60 * 60   // 16h
        }
        return isPlus ? base * PlusConfig.plusRespawnMultiplier : base
    }

    /// Whether the vault is currently in respawn cooldown.
    func isRespawning(_ vault: Vault) -> Bool {
        guard let last = state.lastClaimAt[vault.id] else { return false }
        return now.timeIntervalSince1970 - last < respawnSeconds(for: vault)
    }

    private func claimsTodayCount() -> Int {
        let todayKey = RetentionEngine.dayKey(now)
        return state.lastClaimAt
            .filter { _, ms in RetentionEngine.dayKey(Date(timeIntervalSince1970: ms)) == todayKey }
            .count
    }

    private func updateStreak(forNewDay todayKey: String) {
        guard let last = state.lastClaimDayKey else {
            state.streak = max(1, state.streak)
            state.lastClaimDayKey = todayKey
            return
        }
        if last == todayKey { return }
        let cal = Calendar.current
        let yest = cal.date(byAdding: .day, value: -1, to: now) ?? now
        let yestKey = RetentionEngine.dayKey(yest)
        if last == yestKey {
            state.streak += 1
        } else if state.streakFreezes > 0 {
            state.streakFreezes -= 1
            state.streak += 1
        } else {
            // Broken — but check comeback eligibility (3+ day drop).
            let lostDays = streakDropDays(lastKey: last, newKey: todayKey)
            if lostDays >= RetentionEngine.comebackDropThresholdDays {
                state.comebackClaimsRemaining = RetentionEngine.comebackBoostClaims
            }
            state.streak = 1
        }
        state.lastClaimDayKey = todayKey
    }

    private func streakDropDays(lastKey: String, newKey: String) -> Int {
        // Best-effort — parse YYYY-M-D, compute diff.
        let f: (String) -> Date? = { key in
            let parts = key.split(separator: "-").compactMap { Int($0) }
            guard parts.count == 3 else { return nil }
            var c = DateComponents(); c.year = parts[0]; c.month = parts[1]; c.day = parts[2]
            return Calendar.current.date(from: c)
        }
        guard let a = f(lastKey), let b = f(newKey) else { return 0 }
        return Calendar.current.dateComponents([.day], from: a, to: b).day ?? 0
    }

    // ── XP curve ────────────────────────────────────────────────────────────
    func xpForLevel(_ level: Int) -> Int { 200 + (level - 1) * 150 }

    // MARK: - Geofencing
    static let landmarkClaimRadiusMeters: Double = 50
    static let brandedClaimRadiusMeters: Double = 25

    func claimRadius(for vault: Vault) -> Double {
        vault.brandId == nil ? Self.landmarkClaimRadiusMeters : Self.brandedClaimRadiusMeters
    }

    func canOpen(_ vault: Vault) -> Bool {
        guard !isClaimed(vault) else { return false }
        guard !isRespawning(vault) else { return false }
        return vault.distanceMeters(from: userCoordinate) <= claimRadius(for: vault)
    }

    func metersToEnter(_ vault: Vault) -> Double {
        max(0, vault.distanceMeters(from: userCoordinate) - claimRadius(for: vault))
    }

    func demoWalk(to vault: Vault) {
        guard demoMode else { return }
        userCoordinate = CLLocationCoordinate2D(latitude: vault.lat, longitude: vault.lng)
        Haptics.tap()
    }

    // MARK: - Search / nearby
    func search(_ query: String, brand: String? = nil) -> [Vault] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return vaults.filter { v in
            if let brand, v.brandId != brand { return false }
            if q.isEmpty { return true }
            return v.name.lowercased().contains(q)
                || v.area.lowercased().contains(q)
                || (v.brandId.map { AppData.brand($0)?.name.lowercased() ?? "" } ?? "").contains(q)
        }
    }

    func nearbyVaults(limit: Int = 5) -> [Vault] {
        let origin = userCoordinate
        return vaults
            .filter { !isClaimed($0) }
            .map { ($0, $0.distanceMeters(from: origin)) }
            .sorted { $0.1 < $1.1 }
            .prefix(limit)
            .map(\.0)
    }

    func distanceLabel(to vault: Vault) -> String {
        let m = vault.distanceMeters(from: userCoordinate)
        if m < 1000 { return "\(Int(m))m" }
        return String(format: "%.1fkm", m / 1000)
    }

    // MARK: - Brand coin exchange
    /// Per-brand Stride→Brand rates (mirror `expo/constants/rewards.ts`).
    /// Default 5:1 — brand coins are 5× more valuable because they unlock
    /// partner-locked rewards. Backend rows can override per-brand at runtime.
    static let defaultExchangeRate: Int = 5
    static let exchangeRates: [String: Int] = ["nike": 5, "apple": 5, "lulu": 5]
    /// Legacy global default — kept so older view code keeps compiling.
    static let exchangeRateStrideToBrand: Int = 5
    /// Daily cap on **brand coins received** per brand per day (mirrors
    /// `EXCHANGE_DAILY_CAP` in Expo — anti-grind so Plus can't farm rewards).
    static let exchangeDailyCap: Int = 200

    func exchangeRate(for brandId: String) -> Int {
        Self.exchangeRates[brandId] ?? Self.defaultExchangeRate
    }

    func exchangedTodayBy(_ brandId: String) -> Int {
        let todayKey = RetentionEngine.dayKey(now)
        if state.brandExchangedDay != todayKey { return 0 }
        return state.brandExchangedTodayBy[brandId] ?? 0
    }

    func exchangeDailyRemaining(for brandId: String) -> Int {
        max(0, Self.exchangeDailyCap - exchangedTodayBy(brandId))
    }

    @discardableResult
    func exchangeStrideToBrand(_ brandId: String, strideAmount: Int) -> Bool {
        guard strideAmount > 0, state.coins >= strideAmount else { return false }
        let todayKey = RetentionEngine.dayKey(now)
        if state.brandExchangedDay != todayKey {
            state.brandExchangedDay = todayKey
            state.brandExchangedTodayBy = [:]
        }
        let rate = exchangeRate(for: brandId)
        let credit = strideAmount / rate
        guard credit > 0 else { return false }
        // Cap is on brand coins **received** today, matching Expo semantics.
        let usedToday = state.brandExchangedTodayBy[brandId] ?? 0
        guard usedToday + credit <= Self.exchangeDailyCap else { return false }
        state.coins -= strideAmount
        state.brandCoins[brandId, default: 0] += credit
        state.brandExchangedTodayBy[brandId] = usedToday + credit
        save()
        Haptics.success()
        return true
    }

    // MARK: - Inventory ops
    func canAfford(_ reward: Reward) -> Bool {
        if let brandId = reward.brandId {
            return (state.brandCoins[brandId] ?? 0) >= reward.cost
        }
        return state.coins >= reward.cost
    }

    @discardableResult
    func purchase(reward: Reward) -> Bool {
        if let brandId = reward.brandId {
            guard let bal = state.brandCoins[brandId], bal >= reward.cost else { return false }
            state.brandCoins[brandId] = bal - reward.cost
            state.ownedRewards.append(reward.id)
            state.redemptionHistory.insert(
                Redemption(id: "r_\(Int(now.timeIntervalSince1970 * 1000))",
                           rewardId: reward.id, redeemedAt: now,
                           code: RedemptionCode.make(),
                           paidWith: brandId, paidAmount: reward.cost),
                at: 0
            )
            save(); Haptics.success(); return true
        }
        guard state.coins >= reward.cost else { return false }
        state.coins -= reward.cost
        state.ownedRewards.append(reward.id)
        state.redemptionHistory.insert(
            Redemption(id: "r_\(Int(now.timeIntervalSince1970 * 1000))",
                       rewardId: reward.id, redeemedAt: now,
                       code: RedemptionCode.make(),
                       paidWith: "stride", paidAmount: reward.cost),
            at: 0
        )
        save(); Haptics.success(); return true
    }

    @discardableResult
    func enterRaffle(_ raffle: Raffle, entries: Int) -> Bool {
        let cost = raffle.entryCost * entries
        guard state.coins >= cost, entries > 0 else { return false }
        state.coins -= cost
        state.raffleEntries[raffle.id, default: 0] += entries
        save(); Haptics.success(); return true
    }

    @discardableResult
    func joinChallenge(_ challenge: Challenge) -> Bool {
        guard state.coins >= challenge.stake,
              !state.joinedChallenges.contains(challenge.id) else { return false }
        state.coins -= challenge.stake
        state.joinedChallenges.append(challenge.id)
        save(); Haptics.tap(); return true
    }

    @discardableResult
    func joinWeeklyStake(_ stake: Int) -> Bool {
        let wk = RetentionEngine.isoWeek(now)
        if state.weeklyStakeJoinedWeek != wk {
            state.weeklyStakeJoined = false
            state.weeklyStakeJoinedWeek = wk
        }
        guard !state.weeklyStakeJoined, state.coins >= stake else { return false }
        state.coins -= stake
        state.weeklyStakeJoined = true
        save(); Haptics.success(); return true
    }

    @discardableResult
    func placePrediction(pickPlayerId: String, pickName: String, stake: Int) -> Bool {
        guard state.coins >= stake,
              stake >= RetentionEngine.predictMinStake,
              stake <= RetentionEngine.predictMaxStake else { return false }
        // Refund any active pending prediction for this market.
        let market = RetentionEngine.currentPredictionMarketId(now)
        if let idx = state.predictions.firstIndex(where: { $0.marketId == market && $0.result == "pending" }) {
            state.coins += state.predictions[idx].stake
            state.predictions.remove(at: idx)
        }
        state.coins -= stake
        state.predictions.append(
            .init(id: UUID().uuidString, pickPlayerId: pickPlayerId, pickName: pickName,
                  stake: stake, placedAt: now, marketId: market,
                  result: "pending", payout: nil)
        )
        save(); return true
    }

    /// Settle every prediction whose market has ended. Pays back 95% of pool
    /// share for winners; losers forfeit their stake. Deterministic winner so
    /// the demo always resolves to the leaderboard top spot.
    private func settleOverdue() {
        var changed = false
        for i in state.predictions.indices {
            var p = state.predictions[i]
            guard p.result == "pending" else { continue }
            let endsAt = RetentionEngine.predictionMarketEndsAt(p.placedAt)
            guard now >= endsAt else { continue }
            // Winner = deterministic from market id, take leaderboard top by default.
            let winnerId = AppData.globalLadder.first?.id ?? "p1"
            let won = p.pickPlayerId == winnerId
            if won {
                let gross = Int(Double(p.stake * 2) * (1 - RetentionEngine.predictRakePct))
                p.payout = gross
                p.result = "won"
                state.coins += gross
            } else {
                p.payout = 0
                p.result = "lost"
            }
            state.predictions[i] = p
            state.predictionHistory.insert(p, at: 0)
            changed = true
        }
        // Move settled markets out of `predictions` into history.
        state.predictions.removeAll { $0.result != "pending" }
        if changed { save() }
    }

    // MARK: - Shares & referrals
    @discardableResult
    func recordShare() -> (paid: Int, capped: Bool) {
        let todayKey = RetentionEngine.dayKey(now)
        if state.sharesTodayDay != todayKey { state.sharesToday = 0; state.sharesTodayDay = todayKey }
        let withinCap = state.sharesToday < Self.maxDailyShares
        // Anti-leak: only pay if user has claimed a vault today.
        let claimedToday = state.lastClaimAt.values.contains { ms in
            RetentionEngine.dayKey(Date(timeIntervalSince1970: ms)) == todayKey
        }
        let willPay = withinCap && claimedToday
        let payout = willPay ? Self.shareRewardCoins : 0
        state.sharesToday += 1
        state.lifetimeShares += 1
        state.shareCoinsEarned += payout
        state.coins += payout
        // Each share also rallies the home city in the waitlist — capped
        // share-coin payouts don't block the city vote ladder.
        if let homeId = state.homeCityId, homeId != Cities.liveId {
            state.cityVotes[homeId, default: 0] += CityWaitlistConfig.sharePerVote
        }
        save()
        return (payout, !withinCap)
    }

    @discardableResult
    func claimReferral() -> Bool {
        guard !state.hasUsedReferral else { return false }
        state.hasUsedReferral = true
        state.referralSignups += 1
        state.coins += Self.referralBonusCoins
        if let homeId = state.homeCityId, homeId != Cities.liveId {
            state.cityVotes[homeId, default: 0] += CityWaitlistConfig.referralPerVote
        }
        save()
        Haptics.success()
        return true
    }

    // MARK: - Plus subscription
    @discardableResult
    func subscribePlus(plan: PlusPlan) -> Int {
        let wasSubbed = state.plus != nil
        var sub = PlusSubscription.new(plan: plan, now: now)
        sub.welcomeClaimed = true
        sub.lastFreeEntryWeek = state.plus?.lastFreeEntryWeek
        sub.lastStreakFreezeWeek = state.plus?.lastStreakFreezeWeek
        let paysWelcome = !wasSubbed || state.plus?.welcomeClaimed != true
        let bonus = paysWelcome ? PlusConfig.welcomeCoins : 0
        state.plus = sub
        state.coins += bonus
        save()
        return bonus
    }

    func cancelPlus() {
        guard var p = state.plus else { return }
        p.active = false
        state.plus = p
        save()
    }

    // MARK: - Streak freeze
    @discardableResult
    func buyStreakFreeze() -> Bool {
        guard state.coins >= RetentionEngine.streakFreezeCost else { return false }
        state.coins -= RetentionEngine.streakFreezeCost
        state.streakFreezes += 1
        save()
        Haptics.success()
        return true
    }

    // MARK: - Paywall gate
    /// Mirrors `shouldShowPaywall` — capped to once per ISO week per user.
    func shouldShowPaywall(trigger: PaywallTrigger) -> Bool {
        if isPlus { return false }
        let wk = RetentionEngine.isoWeek(now)
        if state.paywallLastWeek == wk { return false }
        switch trigger {
        case .firstClaim:    return !state.seenSoftPaywall && !state.claimedIDs.isEmpty
        case .streakThree:   return state.streak >= 3
        case .topFifty:      return true  // ladder rank checked in view layer
        case .brandedVault:  return true
        case .plusRaffle:    return true
        }
    }

    func markPaywallShown() {
        state.seenSoftPaywall = true
        state.paywallLastWeek = RetentionEngine.isoWeek(now)
        save()
    }

    enum PaywallTrigger { case firstClaim, streakThree, topFifty, brandedVault, plusRaffle }

    // MARK: - Notifications
    func enableNotifications() async -> Bool {
        let granted = await NotificationService.requestPermission()
        if granted {
            state.notificationsEnabled = true
            save()
            await scheduleAllNotifications()
        }
        return granted
    }

    /// Schedule the full Stride notification fleet — daily, hot vault drop, streak
    /// warning, power hour heads-ups, final hour, raffle endings, prediction
    /// settle. Mirrors `expo/lib/notifications.ts`.
    func scheduleAllNotifications() async {
        guard state.notificationsEnabled else { return }
        await NotificationService.scheduleDailyReminder()
        await NotificationService.scheduleHotVaultDrop()
        await NotificationService.scheduleStreakWarning()
        // Final-Hour push (1h before weekly ladder closes).
        let weekEnd = RetentionEngine.weekEnd(now)
        await NotificationService.scheduleFinalHourAlert(periodEndsAt: weekEnd, label: "Weekly Ladder")
        // Today + tomorrow's power hours.
        let phs = RetentionEngine.powerHoursForDay(now) + RetentionEngine.powerHoursForDay(now.addingTimeInterval(86400))
        for ph in phs where ph.startsAt > now {
            await NotificationService.schedulePowerHourAlert(startsAt: ph.startsAt, multiplier: ph.multiplier)
        }
        // Raffle ending alerts for active raffles.
        for raffle in AppData.raffles where raffle.endsAt > now {
            await NotificationService.scheduleRaffleEndAlert(
                raffleId: raffle.id, title: raffle.title, endsAt: raffle.endsAt
            )
        }
        // Prediction-market settles every Mon 00:00.
        await NotificationService.schedulePredictionSettleAlert(endsAt: RetentionEngine.predictionMarketEndsAt(now))
    }

    func disableNotifications() {
        NotificationService.cancelAll()
        state.notificationsEnabled = false
        save()
    }

    var notificationsEnabled: Bool { state.notificationsEnabled }

    // MARK: - Sign out
    /// Soft sign-out: cancel notifications and reset the onboarding flag so the
    /// auth screen re-appears. Coins/vaults/streak are preserved so a quick
    /// re-sign-in is non-destructive.
    func signOut() {
        NotificationService.cancelAll()
        state.notificationsEnabled = false
        state.hasCompletedOnboarding = false
        save()
    }

    /// Update the player's daily step goal.
    func setStepGoal(_ value: Int) {
        stepGoal = max(1000, min(30_000, value))
    }

    // MARK: - Onboarding completion
    /// Apply onboarding profile + welcome bonus (paid only first time).
    func completeOnboarding(handle: String, displayName: String, avatarSeed: Int,
                            stepGoal: Int, tribeId: String?) -> Int {
        let alreadyPaid = state.hasCompletedOnboarding
        state.handle = handle
        state.displayName = displayName
        state.avatarSeed = avatarSeed
        state.tribeId = tribeId
        if !alreadyPaid { state.coins += Self.onboardingWelcomeCoins }
        state.hasCompletedOnboarding = true
        save()
        self.stepGoal = stepGoal
        return alreadyPaid ? 0 : Self.onboardingWelcomeCoins
    }

    // MARK: - Steps
    private func wireSteps() {
        stepService.onUpdate = { [weak self] today, added in
            guard let self else { return }
            let todayKey = RetentionEngine.dayKey(Date())
            if state.stepsTodayDay != todayKey {
                state.stepsTodayDay = todayKey
                state.stepsToday = 0
            }
            // Use `today` as authoritative count for today (pedometer is cumulative).
            state.stepsToday = today
            if added > 0 { state.stepsLifetime += added }
            // Daily step bonus — fire once per day.
            if state.stepsToday >= Self.dailyStepGoal && state.lastStepBonusDay != todayKey {
                state.coins += Self.dailyStepBonusCoins
                state.lastStepBonusDay = todayKey
            }
            save()
            // Credit city-waitlist votes for every threshold of steps walked.
            creditCityVotesFromSteps()
        }
        stepService.start()
    }

    // MARK: - Tick
    /// Drive retention timers from the view layer (e.g. `.task` on root).
    func tick() {
        now = Date()
        settleOverdue()
        settleTribeDerby()
    }

    /// Auto-settle the prior week's derby for this player's tribe. Mirrors
    /// the Expo `useEffect` in `GameProvider` so both platforms produce the
    /// same `lastTribeWinWeek` / `lastTribeLossWeek` markers.
    private func settleTribeDerby() {
        guard let myTribeId = state.tribeId else { return }
        let curWk = RetentionEngine.isoWeek(now)
        if state.lastTribeWinWeek == curWk || state.lastTribeLossWeek == curWk { return }
        let prev = now.addingTimeInterval(-7 * 86400)
        guard let derby = RetentionEngine.derbyTribesThisWeek(AppData.tribes.map(\.id), now: prev) else { return }
        guard derby.0 == myTribeId || derby.1 == myTribeId else { return }
        let prevWkKey = String(Int(RetentionEngine.weekEnd(prev).addingTimeInterval(-7 * 86400).timeIntervalSince1970))
        let aCoins = pseudoTribeCoins(tribeId: derby.0, weekKey: prevWkKey)
        let bCoins = pseudoTribeCoins(tribeId: derby.1, weekKey: prevWkKey)
        let winnerId = aCoins >= bCoins ? derby.0 : derby.1
        if winnerId == myTribeId {
            state.lastTribeWinWeek = curWk
        } else {
            state.lastTribeLossWeek = curWk
        }
        save()
    }

    // MARK: - Tribe derby settlement
    /// Pay out this week's tribe-win reward to the player if their tribe topped
    /// last week's derby. Mirrors `expo/providers/GameProvider.tsx → claimTribeBonus`.
    enum TribeClaimResult: Equatable {
        case ok(TribeWinReward)
        case noTribe
        case alreadyClaimed
        case didntWin
    }

    @discardableResult
    func claimTribeBonus() -> TribeClaimResult {
        guard let id = state.tribeId, let myTribe = AppData.tribe(id) else { return .noTribe }
        let wk = RetentionEngine.isoWeek(now)
        if state.lastTribeWinWeek == wk { return .alreadyClaimed }
        // Pseudo previous-week ranking — winning tribe is whichever sits #1.
        let prev = now.addingTimeInterval(-7 * 86400)
        let prevWk = String(Int(RetentionEngine.weekEnd(prev).addingTimeInterval(-7 * 86400).timeIntervalSince1970))
        let ranking = AppData.tribes
            .map { ($0.id, pseudoTribeCoins(tribeId: $0.id, weekKey: prevWk)) }
            .sorted { $0.1 > $1.1 }
        guard ranking.first?.0 == id else { return .didntWin }
        let reward = myTribe.winReward
        state.coins += reward.coins
        if let brandId = reward.brandId, reward.brandCoins > 0 {
            state.brandCoins[brandId, default: 0] += reward.brandCoins
        }
        if reward.perk == .streakFreeze { state.streakFreezes += 1 }
        state.lastTribeWinWeek = wk
        save()
        Haptics.success()
        return .ok(reward)
    }

    /// Live tribe board for the current week. Your tribe's row is your real
    /// weekly coin total; others use a deterministic pseudo number.
    func tribeBoard() -> [(tribe: Tribe, coins: Int, isYours: Bool)] {
        let wk = String(Int(RetentionEngine.weekEnd(now).addingTimeInterval(-7 * 86400).timeIntervalSince1970))
        return AppData.tribes.map { t in
            let isYours = t.id == state.tribeId
            let base = pseudoTribeCoins(tribeId: t.id, weekKey: wk)
            return (t, isYours ? base + max(0, coins) % 5_000 : base, isYours)
        }.sorted { $0.coins > $1.coins }
    }

    private func pseudoTribeCoins(tribeId: String, weekKey: String) -> Int {
        let s = "tribe::\(tribeId)::\(weekKey)"
        var h: UInt32 = 0
        for b in s.utf8 { h = (h &* 31) &+ UInt32(b) }
        return 12_000 + Int(h % 60_000)
    }

    /// Active derby pair for this week (or nil).
    func derbyPair() -> (String, String)? {
        RetentionEngine.derbyTribesThisWeek(AppData.tribes.map(\.id), now: now)
    }

    // MARK: - Computed helpers
    var totalCoinsEarned: Int {
        state.claimedIDs.compactMap { id in vaults.first(where: { $0.id == id }) }
            .map { reward(for: $0).coins }.reduce(0, +)
    }

    var totalXpEarned: Int {
        state.claimedIDs.compactMap { id in vaults.first(where: { $0.id == id }) }
            .map { reward(for: $0).xp }.reduce(0, +)
    }

    var tribe: Tribe? {
        guard let id = state.tribeId else { return nil }
        return AppData.tribes.first(where: { $0.id == id })
    }

    /// True if the player was on the losing side of last week's derby and the
    /// +10% Redemption multiplier is still applying this week.
    var tribeLossRedemptionActive: Bool {
        state.lastTribeLossWeek == RetentionEngine.isoWeek(now)
    }

    /// True if the player's tribe won last week's derby (cosmetic badge).
    var tribeWinActive: Bool {
        state.lastTribeWinWeek == RetentionEngine.isoWeek(now)
    }

    func claimedCount(forBrand brandId: String) -> Int {
        state.claimedIDs.compactMap { id in vaults.first(where: { $0.id == id }) }
            .filter { $0.brandId == brandId }.count
    }

    // ── Persistence helper ──────────────────────────────────────────────────
    private func save() { PlayerPersistence.save(state) }
}
