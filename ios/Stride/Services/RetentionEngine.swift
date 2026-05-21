import Foundation

/// Pure helpers ported from `expo/constants/retention.ts` so both apps agree on
/// schedule + multipliers without a backend.
nonisolated enum RetentionEngine {

    // ── PRNG ────────────────────────────────────────────────────────────────
    static func hashStr(_ s: String) -> UInt32 {
        var h: UInt32 = 2_166_136_261
        for b in s.utf8 {
            h ^= UInt32(b)
            h = h &* 16_777_619
        }
        return h
    }

    struct Mulberry32 {
        var a: UInt32
        mutating func next() -> Double {
            a = a &+ 0x6d2b79f5
            var t = a
            t = (t ^ (t >> 15)) &* (t | 1)
            t ^= t &+ ((t ^ (t >> 7)) &* (t | 61))
            return Double((t ^ (t >> 14))) / 4_294_967_296.0
        }
    }

    static func dayKey(_ date: Date = Date()) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return "\(c.year ?? 0)-\(c.month ?? 0)-\(c.day ?? 0)"
    }

    // ── POWER HOURS ─────────────────────────────────────────────────────────
    struct PowerHour: Hashable, Sendable {
        let startsAt: Date
        let endsAt: Date
        /// 2 or 3.
        let multiplier: Int
    }

    static func powerHoursForDay(_ now: Date = Date()) -> [PowerHour] {
        let cal = Calendar.current
        let dayStart = cal.startOfDay(for: now)
        let weekday = cal.component(.weekday, from: dayStart) // 1=Sun, 7=Sat
        let isWeekend = (weekday == 1 || weekday == 7)
        let count = isWeekend ? 3 : 2

        var rng = Mulberry32(a: hashStr("powerhour:" + dayKey(now)))
        var pool: [(hour: Int, weight: Double)] = isWeekend
            ? [(9, 1), (11, 2), (13, 2), (15, 1.5), (17, 2), (19, 1.5)]
            : [(8, 1), (12, 3), (13, 2), (17, 3), (18, 2), (20, 1.5)]

        var picks: [Int] = []
        for _ in 0..<count where !pool.isEmpty {
            let total = pool.reduce(0.0) { $0 + $1.weight }
            var roll = rng.next() * total
            var idx = 0
            for j in 0..<pool.count {
                roll -= pool[j].weight
                if roll <= 0 { idx = j; break }
            }
            let h = pool[idx].hour
            picks.append(h)
            pool.removeAll { abs($0.hour - h) < 2 }
        }
        picks.sort()
        // v3 (raffles-only era): Power Hour capped at 2× — retired the 3× mega-window.
        _ = rng
        return picks.map { hour in
            let start = dayStart.addingTimeInterval(TimeInterval(hour) * 3600)
            return PowerHour(
                startsAt: start,
                endsAt: start.addingTimeInterval(3600),
                multiplier: 2
            )
        }
    }

    static func activePowerHour(_ now: Date = Date()) -> PowerHour? {
        powerHoursForDay(now).first(where: { now >= $0.startsAt && now < $0.endsAt })
    }

    static func nextPowerHour(_ now: Date = Date()) -> PowerHour? {
        if let ph = powerHoursForDay(now).first(where: { $0.startsAt > now }) { return ph }
        return powerHoursForDay(now.addingTimeInterval(86400)).first
    }

    // ── STREAK ──────────────────────────────────────────────────────────────
    struct StreakTier: Hashable, Sendable {
        let days: Int
        let multiplier: Double
        let label: String
    }

    static let streakTiers: [StreakTier] = [
        .init(days: 0,  multiplier: 1.0,  label: "Start your streak"),
        .init(days: 3,  multiplier: 1.1,  label: "Spark"),
        .init(days: 7,  multiplier: 1.25, label: "Heat"),
        .init(days: 14, multiplier: 1.4,  label: "Blaze"),
        .init(days: 30, multiplier: 1.6,  label: "Inferno"),
        .init(days: 60, multiplier: 1.75, label: "Wildfire"),
    ]

    /// Free streak ceiling — Plus removes the cap.
    static let freeStreakCeiling: Double = 1.25
    static let plusStreakCeiling: Double = 1.75

    static func streakMultiplier(days: Int, isPlus: Bool) -> Double {
        var m = 1.0
        for t in streakTiers where days >= t.days { m = t.multiplier }
        return min(m, isPlus ? plusStreakCeiling : freeStreakCeiling)
    }

    static func currentStreakTier(_ days: Int) -> StreakTier {
        var cur = streakTiers[0]
        for t in streakTiers where days >= t.days { cur = t }
        return cur
    }

    static func nextStreakTier(_ days: Int) -> StreakTier? {
        streakTiers.first(where: { $0.days > days })
    }

    static let streakFreezeCost: Int = 300
    static let streakFreezeFreeIntervalDays: Int = 14

    // ── HOT VAULTS ──────────────────────────────────────────────────────────
    static let hotVaultCount: Int = 5
    /// v3 (raffles-only era): tightened from 5× to 3×.
    static let hotVaultMultiplier: Double = 3
    static let hotVaultResetHour: Int = 6

    static func hotVaultWindowStart(_ now: Date = Date()) -> Date {
        let cal = Calendar.current
        var comps = cal.dateComponents([.year, .month, .day], from: now)
        comps.hour = hotVaultResetHour
        var start = cal.date(from: comps) ?? now
        if start > now { start = cal.date(byAdding: .day, value: -1, to: start) ?? start }
        return start
    }

    static func hotVaultWindowEnd(_ now: Date = Date()) -> Date {
        hotVaultWindowStart(now).addingTimeInterval(86400)
    }

    static func hotVaultIdsForWindow(_ vaultIds: [String], now: Date = Date()) -> [String] {
        guard !vaultIds.isEmpty else { return [] }
        let key = String(Int(hotVaultWindowStart(now).timeIntervalSince1970 * 1000))
        var rng = Mulberry32(a: hashStr("hot:" + key))
        var pool = vaultIds
        var out: [String] = []
        let n = min(hotVaultCount, pool.count)
        for _ in 0..<n {
            let idx = Int(rng.next() * Double(pool.count))
            out.append(pool.remove(at: idx))
        }
        return out
    }

    // ── COMEBACK ────────────────────────────────────────────────────────────
    static let comebackDropThresholdDays: Int = 3
    static let comebackBoostClaims: Int = 3
    static let comebackMultiplier: Double = 1.5

    // ── FINAL HOUR ──────────────────────────────────────────────────────────
    static let finalHourSeconds: TimeInterval = 3600
    static let finalHourMultiplier: Double = 2

    static func weekEnd(_ now: Date = Date()) -> Date {
        // ISO week, end at next Monday 00:00 local.
        var cal = Calendar(identifier: .iso8601)
        cal.firstWeekday = 2
        let comps = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now)
        guard let start = cal.date(from: comps) else { return now.addingTimeInterval(7 * 86400) }
        return cal.date(byAdding: .day, value: 7, to: start) ?? now
    }

    static func inFinalHour(_ now: Date = Date()) -> Bool {
        let end = weekEnd(now)
        return now >= end.addingTimeInterval(-finalHourSeconds) && now < end
    }

    // ── PREDICTION MARKET ───────────────────────────────────────────────────
    static let predictMinStake: Int = 50
    static let predictMaxStake: Int = 500
    static let predictRakePct: Double = 0.05

    static func currentPredictionMarketId(_ now: Date = Date()) -> String {
        var cal = Calendar(identifier: .iso8601)
        cal.firstWeekday = 2
        let comps = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now)
        let start = cal.date(from: comps) ?? now
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone.current
        return "pm_" + f.string(from: start)
    }

    static func predictionMarketEndsAt(_ now: Date = Date()) -> Date {
        weekEnd(now)
    }

    // ── DERBY ───────────────────────────────────────────────────────────────
    static let tribeWinBonus: Int = 200

    static func derbyTribesThisWeek(_ tribeIds: [String], now: Date = Date()) -> (String, String)? {
        var cal = Calendar(identifier: .iso8601)
        cal.firstWeekday = 2
        let comps = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now)
        let start = cal.date(from: comps) ?? now
        let wk = String(Int(start.timeIntervalSince1970 * 1000))
        var rng = Mulberry32(a: hashStr("derby:" + wk))
        if rng.next() > 0.25 { return nil }
        guard !tribeIds.isEmpty else { return nil }
        let a = tribeIds[Int(rng.next() * Double(tribeIds.count))]
        var b = tribeIds[Int(rng.next() * Double(tribeIds.count))]
        if b == a {
            let idx = (tribeIds.firstIndex(of: b) ?? 0) + 1
            b = tribeIds[idx % tribeIds.count]
        }
        return (a, b)
    }

    // ── DAILY CLAIM TIERS ───────────────────────────────────────────────────
    /// Mirror `expo/providers/GameProvider.tsx → DAILY_CLAIM_TIERS`.
    static let freeDailyCap: Int = 10
    static let plusDailyCap: Int = 14

    static func dailyClaimMultiplier(claimsTodayBefore: Int, isPlus: Bool) -> Double {
        let n = claimsTodayBefore + 1
        if isPlus {
            if n <= 3 { return 1.0 }
            if n <= 6 { return 0.7 }
            if n <= 10 { return 0.4 }
            if n <= plusDailyCap { return 0.25 }
            return 0
        } else {
            if n <= 3 { return 1.0 }
            if n <= 6 { return 0.7 }
            if n <= 10 { return 0.4 }
            return 0
        }
    }

    // ── COMBINED MULTIPLIER ─────────────────────────────────────────────────
    /// v3 (raffles-only era): tightened from 20× to 10×.
    static let maxTotalMultiplier: Double = 10

    struct MultiplierBreakdown: Sendable {
        let base: Double
        let tier: Double
        let daily: Double
        let plus: Double
        let streak: Double
        let hot: Double
        let power: Double
        let comeback: Double
        let tribe: Double
        let total: Double
        let capped: Bool
    }

    static func combine(base: Double = 1, tier: Double = 1, daily: Double = 1,
                        plus: Double = 1, streak: Double = 1, hot: Double = 1,
                        power: Double = 1, comeback: Double = 1, tribe: Double = 1)
        -> MultiplierBreakdown
    {
        let raw = base * tier * daily * plus * streak * hot * power * comeback * tribe
        let capped = raw > maxTotalMultiplier
        return .init(
            base: base, tier: tier, daily: daily, plus: plus, streak: streak,
            hot: hot, power: power, comeback: comeback, tribe: tribe,
            total: min(maxTotalMultiplier, raw),
            capped: capped
        )
    }

    // ── ISO WEEK KEY (matches Expo `isoWeek`) ───────────────────────────────
    static func isoWeek(_ now: Date = Date()) -> String {
        var cal = Calendar(identifier: .iso8601)
        cal.firstWeekday = 2
        let c = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now)
        return "\(c.yearForWeekOfYear ?? 0)-W\(String(format: "%02d", c.weekOfYear ?? 0))"
    }
}
