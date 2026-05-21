import Foundation

nonisolated enum PlusPlan: String, Codable, Sendable {
    case monthly, yearly
}

/// Mirrors the Expo `PlusSubscription` shape so both apps share semantics.
nonisolated struct PlusSubscription: Codable, Hashable, Sendable {
    var plan: PlusPlan
    var active: Bool
    var startedAt: Date
    var renewsAt: Date
    var trialEndsAt: Date?
    var welcomeClaimed: Bool
    /// ISO week of last free raffle-entry grant ("2026-W21").
    var lastFreeEntryWeek: String?
    /// ISO week of last free streak-freeze grant.
    var lastStreakFreezeWeek: String?

    static func new(plan: PlusPlan, now: Date = Date()) -> PlusSubscription {
        let cal = Calendar.current
        let renews: Date
        let trial: Date?
        switch plan {
        case .yearly:
            renews = cal.date(byAdding: .year, value: 1, to: now) ?? now
            trial = cal.date(byAdding: .day, value: 7, to: now)
        case .monthly:
            renews = cal.date(byAdding: .month, value: 1, to: now) ?? now
            trial = nil
        }
        return .init(plan: plan, active: true, startedAt: now, renewsAt: renews,
                     trialEndsAt: trial, welcomeClaimed: false,
                     lastFreeEntryWeek: nil, lastStreakFreezeWeek: nil)
    }

    func isActive(_ now: Date = Date()) -> Bool {
        active && renewsAt > now
    }
}

/// Plus economy constants (mirror `expo/constants/plus.ts` 1:1).
nonisolated enum PlusConfig {
    static let monthlyPriceGbp: Double = 4.99
    static let yearlyPriceGbp: Double = 39.0
    static let annualSavingsPct: Int = 35
    /// One-time welcome bonus paid on first Plus subscribe.
    static let welcomeCoins: Int = 1_000
    /// Stacks on top of tier payout multiplier. 0.25 → ×1.25 plus bump.
    static let payoutBonus: Double = 0.25
    /// Respawn cooldown multiplier for Plus (0.75 = 25% faster).
    static let plusRespawnMultiplier: Double = 0.75
    /// Brand-coin grant fraction off each branded claim.
    static let freeBrandCoinFraction: Double = 0.35
    static let plusBrandCoinFraction: Double = 0.5
    static let weeklyFreeRaffleEntries: Int = 1
    static let weeklyStreakFreezes: Int = 1
    static let earlyAccessHours: Int = 48
}
